import { simpleParser } from 'mailparser';
import { truncateBody } from './message-format.js';

/**
 * @param {Buffer | string} source
 * @param {number} maxBodyChars
 */
export async function parseMessageSource(source, maxBodyChars) {
  const buffer = Buffer.isBuffer(source) ? source : Buffer.from(source);
  const parsed = await simpleParser(buffer);

  const text = parsed.text || null;
  const html = typeof parsed.html === 'string' ? parsed.html : null;
  const truncated = truncateBody(text, html, maxBodyChars);

  const attachments = (parsed.attachments ?? []).map((att) => ({
    filename: att.filename ?? 'attachment',
    size: att.size ?? 0,
    contentType: att.contentType ?? 'application/octet-stream',
  }));

  return {
    text: truncated.text,
    html: truncated.html,
    bodyTruncated: truncated.bodyTruncated,
    originalBodyLength: truncated.originalBodyLength,
    attachments,
    date: parsed.date ? parsed.date.toISOString() : null,
    subject: parsed.subject ?? '',
    from: formatParsedAddress(parsed.from),
    to: formatParsedAddressList(parsed.to),
  };
}

/** @param {import('mailparser').AddressObject | import('mailparser').AddressObject[] | undefined} value */
function formatParsedAddress(value) {
  if (!value) return '';
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj) return '';
  if (typeof obj === 'object' && 'text' in obj && obj.text) return String(obj.text);
  return '';
}

/** @param {import('mailparser').AddressObject | import('mailparser').AddressObject[] | undefined} value */
function formatParsedAddressList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => {
    if (typeof item === 'object' && item && 'text' in item && item.text) return String(item.text);
    return '';
  }).filter(Boolean);
}
