/**
 * cfly-mail — Official mail MCP Server (stdio).
 * Config is injected via client bindings into env; missing email/password does not exit, so listTools stays available.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  hasRequiredConfig,
  loadConfig,
  passwordConfigured,
} from './lib/config.js';
import {
  getMessage,
  listMailboxes,
  listMessages,
  searchMessages,
  verifyImap,
} from './lib/imap.js';
import { toErrorContent, toJsonContent } from './lib/message-format.js';
import { closeSmtp, sendEmail, verifySmtp } from './lib/smtp.js';

const VERSION = '1.0.2';

const criteriaSchema = z.object({
  unseen: z.boolean().optional(),
  seen: z.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  subjectContains: z.string().optional(),
  since: z.string().optional(),
  before: z.string().optional(),
}).strict();

const server = new McpServer({ name: 'cfly-mail', version: VERSION });

server.tool(
  'ping',
  'Health check only; do not call before reading mail. Returns plugin version and config summary (no secrets).',
  {},
  async () => {
    const config = loadConfig();
    return toJsonContent({
      ok: true,
      pluginVersion: VERSION,
      email: config.email || null,
      provider: config.provider,
      defaultMailbox: config.defaultMailbox,
      maxListMessages: config.maxListMessages,
      maxBodyChars: config.maxBodyChars,
      passwordConfigured: passwordConfigured(config),
      configured: hasRequiredConfig(config),
    });
  },
);

server.tool(
  'verify_mail',
  'Verify SMTP and IMAP connectivity; returns summary and latency.',
  {},
  async () => verifyMail(),
);

server.tool(
  'list_mailboxes',
  'List IMAP folder names. Use only when the user asks for folders; default mailbox is INBOX.',
  {},
  { annotations: { readOnlyHint: true } },
  async () => listMailboxes(),
);

server.tool(
  'list_messages',
  'List recent message summaries in a mailbox, newest-first by Date (not UID). Default: INBOX, last 90 days. For new/unread mail use unreadOnly=true.',
  {
    mailbox: z.string().optional().describe('Mailbox path; defaults to configured INBOX'),
    limit: z.number().int().positive().optional().describe('Max messages to return (capped by config)'),
    unreadOnly: z.boolean().optional().describe('If true, only unread messages (recommended for "any new mail?")'),
    since: z.string().optional().describe('YYYY-MM-DD; only messages on/after this date. Omitted with unreadOnly=false defaults to last 90 days'),
  },
  { annotations: { readOnlyHint: true } },
  async ({ mailbox, limit, unreadOnly, since }) => listMessages(mailbox, limit, unreadOnly, since),
);

server.tool(
  'get_message',
  'Fetch one message by UID; returns headers and truncated text/html body.',
  {
    uid: z.number().int().positive().describe('Message UID'),
    mailbox: z.string().optional().describe('Mailbox path; uses configured default if omitted'),
    includeBody: z.boolean().optional().describe('Include message body (default true)'),
  },
  { annotations: { readOnlyHint: true } },
  async ({ uid, mailbox, includeBody }) => getMessage(uid, mailbox, includeBody ?? true),
);

server.tool(
  'search_messages',
  'Search messages with structured criteria; results are newest-first by Date. Example: { unseen: true } for unread.',
  {
    criteria: criteriaSchema.describe('Structured search, e.g. { unseen: true } or { subjectContains: "invoice", since: "2026-01-01" }'),
    mailbox: z.string().optional().describe('Mailbox path; uses configured default if omitted'),
    limit: z.number().int().positive().optional().describe('Max messages to return'),
  },
  { annotations: { readOnlyHint: true } },
  async ({ criteria, mailbox, limit }) => searchMessages(criteria, mailbox, limit),
);

server.tool(
  'send_email',
  'Send an email; From address is fixed to the configured account.',
  {
    to: z.string().describe('Recipient address or comma-separated list'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Plain text body'),
    html: z.string().optional().describe('Optional HTML body'),
    cc: z.string().optional().describe('CC recipients'),
    replyTo: z.string().optional().describe('Reply-To address'),
    inReplyTo: z.string().optional().describe('In-Reply-To message ID for threading'),
  },
  { annotations: { destructiveHint: true } },
  async ({ to, subject, body, html, cc, replyTo, inReplyTo }) =>
    sendEmail({ to, subject, body, html, cc, replyTo, inReplyTo }),
);

async function verifyMail() {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) {
    return toErrorContent({
      ok: false,
      error: 'not_configured',
      message: 'Email and app password are required. Configure the plugin in Settings.',
    });
  }

  const started = Date.now();
  const [smtpResult, imapResult] = await Promise.all([verifySmtp(), verifyImap()]);
  const latencyMs = Date.now() - started;

  const smtpOk = smtpResult.ok === true;
  const imapOk = imapResult.ok === true;

  if (smtpOk && imapOk) {
    return toJsonContent({
      ok: true,
      summary: `${config.email} · SMTP OK · IMAP OK`,
      latencyMs,
      smtpOk: true,
      imapOk: true,
    });
  }

  const smtpLabel = smtpOk ? 'SMTP OK' : 'SMTP FAIL';
  const imapLabel = imapOk ? 'IMAP OK' : 'IMAP FAIL';
  const error = !smtpOk ? 'smtp_verify_failed' : 'imap_connect_failed';
  const message = !smtpOk
    ? (smtpResult.message ?? 'SMTP verification failed.')
    : (imapResult.message ?? 'IMAP connection failed.');

  return toErrorContent({
    ok: false,
    error,
    summary: `${config.email} · ${smtpLabel} · ${imapLabel}`,
    message,
    latencyMs,
    smtpOk,
    imapOk,
  });
}

async function shutdown() {
  await closeSmtp();
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
