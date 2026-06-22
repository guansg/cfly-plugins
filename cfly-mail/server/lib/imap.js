import { ImapFlow } from 'imapflow';
import {
  hasRequiredConfig,
  hasResolvedImap,
  loadConfig,
  resolveMailbox,
  toImapFlowTls,
} from './config.js';
import { effectiveListLimit } from './limits.js';
import { parseMessageSource } from './mail-parse.js';
import {
  envelopeToListItem,
  formatAddressList,
  safeErrorMessage,
  snippetFromRawSource,
  sortMessagesByDateDesc,
  toErrorContent,
  toJsonContent,
} from './message-format.js';
import { buildListSearchQuery, defaultSinceIso, mapSearchCriteria } from './search-criteria.js';
import { missingConfigResponse } from './smtp.js';

/**
 * @param {ReturnType<typeof loadConfig>} config
 */
function createImapClient(config) {
  const tls = toImapFlowTls(config.imapEncryption, config.imapPort);
  return new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    ...tls,
    auth: {
      user: config.email,
      pass: config.password,
    },
    logger: false,
  });
}

/**
 * @param {(client: ImapFlow) => Promise<ReturnType<typeof toJsonContent> | ReturnType<typeof toErrorContent>>} fn
 */
async function withImap(fn) {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) return missingConfigResponse();
  if (!hasResolvedImap(config)) {
    return toErrorContent({
      ok: false,
      error: 'imap_connect_failed',
      message: 'IMAP host is required. Select a provider preset or enter IMAP host.',
    });
  }

  const client = createImapClient(config);
  try {
    await client.connect();
    return await fn(client);
  } catch (err) {
    return toErrorContent({
      ok: false,
      error: 'imap_connect_failed',
      message: safeErrorMessage(err),
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore logout errors
    }
  }
}

export async function verifyImap() {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) {
    return { ok: false, error: 'not_configured', message: 'Email and app password are required.' };
  }
  if (!hasResolvedImap(config)) {
    return {
      ok: false,
      error: 'imap_connect_failed',
      message: 'IMAP host is required.',
    };
  }

  const client = createImapClient(config);
  try {
    await client.connect();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: 'imap_connect_failed',
      message: safeErrorMessage(err),
    };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

export async function listMailboxes() {
  return withImap(async (client) => {
    const mailboxes = [];
    const list = await client.list();
    for (const mailbox of list) {
      mailboxes.push({
        name: mailbox.path,
        specialUse: mailbox.specialUse || null,
        flags: [...(mailbox.flags ?? [])],
      });
    }
    return toJsonContent({ ok: true, mailboxes });
  });
}

/**
 * Rank UIDs by envelope Date (desc). UID order is NOT reliable for recency on all providers.
 * @param {ImapFlow} client
 * @param {number[]} uids
 * @param {number} limit
 */
async function rankUidsByDateDesc(client, uids, limit) {
  if (uids.length === 0) {
    return { selected: [], total: 0 };
  }

  /** @type {{ uid: number; t: number }[]} */
  const dated = [];
  for await (const msg of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
    const t = msg.envelope?.date ? new Date(msg.envelope.date).getTime() : 0;
    dated.push({ uid: msg.uid, t });
  }
  dated.sort((a, b) => b.t - a.t);
  return {
    selected: dated.slice(0, limit).map((item) => item.uid),
    total: uids.length,
  };
}

/**
 * @param {ImapFlow} client
 * @param {number[]} uids
 */
async function fetchMessageSummaries(client, uids) {
  const messages = [];
  for (const uid of uids) {
    const msg = await client.fetchOne(String(uid), {
      uid: true,
      envelope: true,
      flags: true,
      source: { start: 0, maxLength: 2048 },
    }, { uid: true });

    if (!msg) continue;

    const snippet = snippetFromRawSource(msg.source);
    messages.push(envelopeToListItem(msg.envelope, msg.uid, msg.flags, snippet));
  }
  return sortMessagesByDateDesc(messages);
}

/**
 * @param {string | undefined} mailbox
 * @param {number | undefined} limit
 * @param {boolean | undefined} unreadOnly
 * @param {string | undefined} since
 */
export async function listMessages(mailbox, limit, unreadOnly, since) {
  const config = loadConfig();
  const resolvedMailbox = resolveMailbox(config, mailbox);
  if (!resolvedMailbox) {
    return toErrorContent({
      ok: false,
      error: 'mailbox_not_found',
      message: 'Invalid mailbox name.',
    });
  }

  const effectiveLimit = effectiveListLimit(limit, config.maxListMessages);
  const defaultSinceApplied = !since && !unreadOnly;
  const effectiveSince = since ?? (unreadOnly ? undefined : defaultSinceIso());

  return withImap(async (client) => {
    const lock = await client.getMailboxLock(resolvedMailbox);
    try {
      const searchQuery = buildListSearchQuery(unreadOnly, effectiveSince);
      const uids = await client.search(searchQuery, { uid: true });
      const { selected, total } = await rankUidsByDateDesc(client, uids, effectiveLimit);
      const messages = await fetchMessageSummaries(client, selected);
      return toJsonContent({
        ok: true,
        mailbox: resolvedMailbox,
        count: messages.length,
        messages,
        sortedBy: 'date',
        newestFirst: true,
        defaultSinceApplied,
        effectiveSince: effectiveSince ?? null,
        totalMatched: total,
        truncated: total > selected.length,
      });
    } finally {
      lock.release();
    }
  });
}

/**
 * @param {unknown} criteria
 * @param {string | undefined} mailbox
 * @param {number | undefined} limit
 */
export async function searchMessages(criteria, mailbox, limit) {
  const mapped = mapSearchCriteria(criteria);
  if (!mapped.ok) {
    return toErrorContent(mapped);
  }

  const config = loadConfig();
  const resolvedMailbox = resolveMailbox(config, mailbox);
  if (!resolvedMailbox) {
    return toErrorContent({
      ok: false,
      error: 'mailbox_not_found',
      message: 'Invalid mailbox name.',
    });
  }

  const effectiveLimit = effectiveListLimit(limit, config.maxListMessages);

  return withImap(async (client) => {
    const lock = await client.getMailboxLock(resolvedMailbox);
    try {
      const uids = await client.search(mapped.query, { uid: true });
      const { selected, total } = await rankUidsByDateDesc(client, uids, effectiveLimit);
      const messages = await fetchMessageSummaries(client, selected);
      return toJsonContent({
        ok: true,
        mailbox: resolvedMailbox,
        count: messages.length,
        messages,
        sortedBy: 'date',
        newestFirst: true,
        totalMatched: total,
        truncated: total > selected.length,
      });
    } finally {
      lock.release();
    }
  });
}

/**
 * @param {number} uid
 * @param {string | undefined} mailbox
 * @param {boolean | undefined} includeBody
 */
export async function getMessage(uid, mailbox, includeBody = true) {
  const config = loadConfig();
  const resolvedMailbox = resolveMailbox(config, mailbox);
  if (!resolvedMailbox) {
    return toErrorContent({
      ok: false,
      error: 'mailbox_not_found',
      message: 'Invalid mailbox name.',
    });
  }

  if (!Number.isFinite(uid) || uid < 1) {
    return toErrorContent({
      ok: false,
      error: 'message_not_found',
      message: 'Invalid message UID.',
    });
  }

  return withImap(async (client) => {
    const lock = await client.getMailboxLock(resolvedMailbox);
    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        flags: true,
        source: true,
      }, { uid: true });

      if (!msg) {
        return toErrorContent({
          ok: false,
          error: 'message_not_found',
          message: `Message uid=${uid} not found in ${resolvedMailbox}.`,
        });
      }

      const { from, to } = formatAddressList(msg.envelope);
      const subject = msg.envelope?.subject ?? '';
      const date = msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null;
      const seen = msg.flags?.has('\\Seen') ?? false;

      if (!includeBody || !msg.source) {
        return toJsonContent({
          ok: true,
          uid: msg.uid,
          mailbox: resolvedMailbox,
          from,
          to,
          subject,
          date,
          seen,
          text: null,
          html: null,
          attachments: [],
          bodyTruncated: false,
        });
      }

      const parsed = await parseMessageSource(msg.source, config.maxBodyChars);
      return toJsonContent({
        ok: true,
        uid: msg.uid,
        mailbox: resolvedMailbox,
        from: parsed.from || from,
        to: parsed.to.length ? parsed.to : to,
        subject: parsed.subject || subject,
        date: parsed.date || date,
        seen,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments,
        bodyTruncated: parsed.bodyTruncated,
        originalBodyLength: parsed.originalBodyLength,
      });
    } finally {
      lock.release();
    }
  });
}
