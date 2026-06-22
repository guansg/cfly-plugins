const SNIPPET_MAX = 120;

/**
 * @param {unknown} body
 */
export function toJsonContent(body) {
  return { content: [{ type: 'text', text: JSON.stringify(body) }] };
}

/**
 * @param {unknown} body
 */
export function toErrorContent(body) {
  return {
    content: [{ type: 'text', text: JSON.stringify(body) }],
    isError: true,
  };
}

/**
 * @param {unknown} err
 */
export function safeErrorMessage(err) {
  const message = err instanceof Error ? err.message : String(err);
  return message
    .replace(/password[=:]\S+/gi, 'password=***')
    .replace(/AUTH[^\s]*/gi, 'AUTH ***')
    .slice(0, 300);
}

/**
 * @param {string} text
 */
export function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} html
 */
export function stripHtml(html) {
  return normalizeWhitespace(html.replace(/<[^>]+>/g, ' '));
}

/**
 * @param {string | null | undefined} plain
 * @param {string | null | undefined} html
 */
export function makeSnippet(plain, html) {
  let source = '';
  if (plain && plain.trim()) {
    source = plain;
  } else if (html && html.trim()) {
    source = stripHtml(html);
  }
  if (!source) return '';
  const normalized = normalizeWhitespace(source);
  if (normalized.length <= SNIPPET_MAX) return normalized;
  return `${normalized.slice(0, SNIPPET_MAX)}…`;
}

/**
 * @param {Buffer | string | null | undefined} raw
 */
export function snippetFromRawSource(raw) {
  if (!raw) return '';
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  const plainMatch = text.match(/Content-Type:\s*text\/plain[^\r\n]*[\r\n]+(?:[^\r\n]*[\r\n]+)*?([\s\S]*?)(?:\r?\n--|\r?\n\r?\nContent-Type:|$)/i);
  if (plainMatch?.[1]) {
    return makeSnippet(decodeQuotedPrintable(plainMatch[1]), null);
  }
  const htmlMatch = text.match(/Content-Type:\s*text\/html[^\r\n]*[\r\n]+(?:[^\r\n]*[\r\n]+)*?([\s\S]*?)(?:\r?\n--|\r?\n\r?\nContent-Type:|$)/i);
  if (htmlMatch?.[1]) {
    return makeSnippet(null, decodeQuotedPrintable(htmlMatch[1]));
  }
  const bodyStart = text.indexOf('\r\n\r\n');
  if (bodyStart >= 0) {
    return makeSnippet(text.slice(bodyStart + 4).slice(0, 500), null);
  }
  return '';
}

/** @param {string} value */
function decodeQuotedPrintable(value) {
  return value
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * @param {string | null | undefined} text
 * @param {string | null | undefined} html
 * @param {number} maxChars
 */
export function truncateBody(text, html, maxChars) {
  const plainLen = text?.length ?? 0;
  const htmlLen = html?.length ?? 0;
  const total = plainLen + htmlLen;
  if (total <= maxChars) {
    return { text: text ?? null, html: html ?? null, bodyTruncated: false, originalBodyLength: total };
  }

  let outText = text ?? null;
  let outHtml = html ?? null;
  let budget = maxChars;

  if (outText) {
    if (outText.length <= budget) {
      budget -= outText.length;
    } else {
      outText = `${outText.slice(0, budget)}…`;
      budget = 0;
      outHtml = null;
    }
  }

  if (budget > 0 && outHtml) {
    if (outHtml.length > budget) {
      outHtml = `${outHtml.slice(0, budget)}…`;
    }
  } else if (budget === 0) {
    outHtml = null;
  }

  return { text: outText, html: outHtml, bodyTruncated: true, originalBodyLength: total };
}

/**
 * @param {import('imapflow').Envelope | undefined} envelope
 */
export function formatAddressList(envelope) {
  if (!envelope) return { from: '', to: [] };
  const from = envelope.from?.[0]
    ? formatAddress(envelope.from[0])
    : '';
  const to = (envelope.to ?? []).map(formatAddress);
  return { from, to };
}

/** @param {{ name?: string; address?: string }} addr */
function formatAddress(addr) {
  if (addr.name && addr.address) return `${addr.name} <${addr.address}>`;
  return addr.address ?? addr.name ?? '';
}

/**
 * @param {Array<{ uid: number; date: string | null }>} messages
 */
export function sortMessagesByDateDesc(messages) {
  return [...messages].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });
}

/**
 * @param {import('imapflow').Envelope | undefined} envelope
 * @param {number} uid
 * @param {Set<string> | undefined} flags
 * @param {string} snippet
 */
export function envelopeToListItem(envelope, uid, flags, snippet) {
  const { from } = formatAddressList(envelope);
  const subject = envelope?.subject ?? '';
  const date = envelope?.date ? new Date(envelope.date).toISOString() : null;
  const seen = flags?.has('\\Seen') ?? false;
  return { uid, from, subject, date, seen, snippet };
}
