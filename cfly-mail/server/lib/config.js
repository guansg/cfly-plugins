/** @typedef {'ssl' | 'starttls' | 'none'} EncryptionMode */

const DEFAULT_SMTP_PORT = 465;
const DEFAULT_IMAP_PORT = 993;
const DEFAULT_MAX_LIST = 30;
const DEFAULT_MAX_BODY_CHARS = 12_000;
const MAX_LIST_CAP = 100;
const MAX_BODY_CAP = 50_000;

/** @type {Record<string, { smtp: { host: string; port: number; encryption: EncryptionMode }; imap: { host: string; port: number; encryption: EncryptionMode } }>} */
export const PROVIDER_PRESETS = {
  qq: {
    smtp: { host: 'smtp.qq.com', port: 465, encryption: 'ssl' },
    imap: { host: 'imap.qq.com', port: 993, encryption: 'ssl' },
  },
  163: {
    smtp: { host: 'smtp.163.com', port: 465, encryption: 'ssl' },
    imap: { host: 'imap.163.com', port: 993, encryption: 'ssl' },
  },
  gmail: {
    smtp: { host: 'smtp.gmail.com', port: 465, encryption: 'ssl' },
    imap: { host: 'imap.gmail.com', port: 993, encryption: 'ssl' },
  },
  outlook: {
    smtp: { host: 'smtp.office365.com', port: 587, encryption: 'starttls' },
    imap: { host: 'outlook.office365.com', port: 993, encryption: 'ssl' },
  },
};

/**
 * @returns {{
 *   email: string;
 *   password: string;
 *   provider: string;
 *   smtpHost: string;
 *   smtpPort: number;
 *   smtpEncryption: EncryptionMode;
 *   imapHost: string;
 *   imapPort: number;
 *   imapEncryption: EncryptionMode;
 *   fromName: string;
 *   defaultMailbox: string;
 *   maxListMessages: number;
 *   maxBodyChars: number;
 * }}
 */
export function loadConfig() {
  const email = (process.env.CFLY_MAIL_EMAIL ?? '').trim();
  const password = process.env.CFLY_MAIL_PASSWORD ?? '';
  const provider = (process.env.CFLY_MAIL_PROVIDER ?? 'custom').trim() || 'custom';
  const preset = PROVIDER_PRESETS[provider];

  const smtpHostRaw = (process.env.CFLY_MAIL_SMTP_HOST ?? '').trim();
  const imapHostRaw = (process.env.CFLY_MAIL_IMAP_HOST ?? '').trim();

  const smtpPortRaw = Number(process.env.CFLY_MAIL_SMTP_PORT);
  const imapPortRaw = Number(process.env.CFLY_MAIL_IMAP_PORT);

  const smtpEncryption = parseEncryption(process.env.CFLY_MAIL_SMTP_ENCRYPTION, 'ssl');
  const imapEncryption = parseEncryption(process.env.CFLY_MAIL_IMAP_ENCRYPTION, 'ssl');

  const smtpHost = smtpHostRaw || preset?.smtp.host || '';
  const imapHost = imapHostRaw || preset?.imap.host || '';

  const smtpPort = Number.isFinite(smtpPortRaw) && smtpPortRaw > 0
    ? smtpPortRaw
    : (preset?.smtp.port ?? DEFAULT_SMTP_PORT);

  const imapPort = Number.isFinite(imapPortRaw) && imapPortRaw > 0
    ? imapPortRaw
    : (preset?.imap.port ?? DEFAULT_IMAP_PORT);

  const resolvedSmtpEncryption = smtpHostRaw
    ? smtpEncryption
    : (preset?.smtp.encryption ?? smtpEncryption);

  const resolvedImapEncryption = imapHostRaw
    ? imapEncryption
    : (preset?.imap.encryption ?? imapEncryption);

  const maxListRaw = Number(process.env.CFLY_MAIL_MAX_LIST);
  const maxBodyRaw = Number(process.env.CFLY_MAIL_MAX_BODY_CHARS);

  return {
    email,
    password,
    provider,
    smtpHost,
    smtpPort,
    smtpEncryption: resolvedSmtpEncryption,
    imapHost,
    imapPort,
    imapEncryption: resolvedImapEncryption,
    fromName: (process.env.CFLY_MAIL_FROM_NAME ?? '').trim(),
    defaultMailbox: (process.env.CFLY_MAIL_DEFAULT_MAILBOX ?? 'INBOX').trim() || 'INBOX',
    maxListMessages: clampMaxList(Number.isFinite(maxListRaw) ? maxListRaw : DEFAULT_MAX_LIST),
    maxBodyChars: clampMaxBody(Number.isFinite(maxBodyRaw) ? maxBodyRaw : DEFAULT_MAX_BODY_CHARS),
  };
}

/** @param {unknown} value @param {EncryptionMode} fallback */
function parseEncryption(value, fallback) {
  const v = String(value ?? fallback).toLowerCase();
  if (v === 'ssl' || v === 'starttls' || v === 'none') return v;
  return fallback;
}

/** @param {number} value */
export function clampMaxList(value) {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_MAX_LIST;
  return Math.min(MAX_LIST_CAP, Math.floor(value));
}

/** @param {number} value */
export function clampMaxBody(value) {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_MAX_BODY_CHARS;
  return Math.min(MAX_BODY_CAP, Math.floor(value));
}

/** @param {ReturnType<typeof loadConfig>} config */
export function hasRequiredConfig(config) {
  return Boolean(config.email && config.password.trim());
}

/** @param {ReturnType<typeof loadConfig>} config */
export function passwordConfigured(config) {
  return typeof config.password === 'string' && config.password.trim().length > 0;
}

/** @param {ReturnType<typeof loadConfig>} config */
export function hasResolvedImap(config) {
  return Boolean(config.imapHost);
}

/** @param {ReturnType<typeof loadConfig>} config */
export function hasResolvedSmtp(config) {
  return Boolean(config.smtpHost);
}

/** @param {string | null | undefined} mailbox */
export function isValidMailboxName(mailbox) {
  if (typeof mailbox !== 'string' || !mailbox.trim()) return false;
  if (mailbox.includes('..')) return false;
  return /^[\w\u0080-\uFFFF./&-]+$/.test(mailbox);
}

/** @param {ReturnType<typeof loadConfig>} config @param {string | undefined} mailbox */
export function resolveMailbox(config, mailbox) {
  const name = (mailbox ?? '').trim() || config.defaultMailbox;
  if (!isValidMailboxName(name)) return null;
  return name;
}

/** @param {EncryptionMode} encryption @param {number} port */
export function toImapFlowTls(encryption, port) {
  if (encryption === 'ssl') return { secure: true, port };
  if (encryption === 'starttls') return { secure: false, requireTLS: true, port };
  return { secure: false, tls: { rejectUnauthorized: false }, port };
}

/** @param {EncryptionMode} encryption */
export function toNodemailerTls(encryption) {
  if (encryption === 'ssl') return { secure: true };
  if (encryption === 'starttls') return { secure: false, requireTLS: true };
  return { secure: false, tls: { rejectUnauthorized: false } };
}
