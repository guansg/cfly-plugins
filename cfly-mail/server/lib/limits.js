const MAX_RECIPIENTS = 20;
const SEND_RATE_LIMIT = 10;
const SEND_WINDOW_MS = 60_000;

/** @type {number[]} */
const sendTimestamps = [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} address
 */
export function isValidEmail(address) {
  const trimmed = address.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}

/**
 * @param {string | string[]} to
 * @param {string | string[] | undefined} cc
 */
export function parseRecipients(to, cc) {
  const all = [];
  for (const field of [to, cc]) {
    if (!field) continue;
    const items = Array.isArray(field) ? field : String(field).split(/[,;]/);
    for (const item of items) {
      const addr = item.trim();
      if (addr) all.push(addr);
    }
  }
  return all;
}

/**
 * @param {string | string[]} to
 * @param {string | string[] | undefined} cc
 */
export function validateRecipients(to, cc) {
  const recipients = parseRecipients(to, cc);
  if (recipients.length === 0) {
    return { ok: false, error: 'recipient_limit_exceeded', message: 'At least one recipient is required.' };
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return {
      ok: false,
      error: 'recipient_limit_exceeded',
      message: `Too many recipients (max ${MAX_RECIPIENTS}).`,
    };
  }
  for (const addr of recipients) {
    if (!isValidEmail(addr)) {
      return { ok: false, error: 'recipient_limit_exceeded', message: `Invalid email address: ${addr}` };
    }
  }
  return { ok: true, recipients };
}

/**
 * @param {string} body
 * @param {string | undefined} html
 * @param {number} maxBodyChars
 */
export function validateBodySize(body, html, maxBodyChars) {
  const total = (body?.length ?? 0) + (html?.length ?? 0);
  if (total > maxBodyChars) {
    return {
      ok: false,
      error: 'body_too_large',
      message: `Body exceeds max length (${maxBodyChars} characters).`,
    };
  }
  return { ok: true };
}

export function checkSendRateLimit() {
  const now = Date.now();
  while (sendTimestamps.length > 0 && now - sendTimestamps[0] >= SEND_WINDOW_MS) {
    sendTimestamps.shift();
  }
  if (sendTimestamps.length >= SEND_RATE_LIMIT) {
    return {
      ok: false,
      error: 'send_failed',
      message: `Send rate limit exceeded (max ${SEND_RATE_LIMIT} per minute).`,
    };
  }
  sendTimestamps.push(now);
  return { ok: true };
}

/**
 * @param {number | undefined} limit
 * @param {number} configMax
 */
export function effectiveListLimit(limit, configMax) {
  if (limit === undefined) return configMax;
  if (!Number.isFinite(limit) || limit < 1) return configMax;
  return Math.min(Math.floor(limit), configMax);
}
