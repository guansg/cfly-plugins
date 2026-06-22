import nodemailer from 'nodemailer';
import {
  hasRequiredConfig,
  hasResolvedSmtp,
  loadConfig,
  toNodemailerTls,
} from './config.js';
import {
  checkSendRateLimit,
  validateBodySize,
  validateRecipients,
} from './limits.js';
import { safeErrorMessage, toErrorContent, toJsonContent } from './message-format.js';

/** @type {import('nodemailer').Transporter | null} */
let cachedTransporter = null;

export function resetSmtpTransporter() {
  cachedTransporter = null;
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 */
function createTransporter(config) {
  const tls = toNodemailerTls(config.smtpEncryption);
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    ...tls,
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 */
function getTransporter(config) {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter(config);
  }
  return cachedTransporter;
}

export function missingConfigResponse() {
  return toErrorContent({
    ok: false,
    error: 'not_configured',
    message: 'Email and app password are required. Configure the plugin in Settings.',
  });
}

export async function verifySmtp() {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) {
    return { ok: false, error: 'not_configured', message: 'Email and app password are required.' };
  }
  if (!hasResolvedSmtp(config)) {
    return {
      ok: false,
      error: 'smtp_verify_failed',
      message: 'SMTP host is required. Select a provider preset or enter SMTP host.',
    };
  }

  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: 'smtp_verify_failed',
      message: safeErrorMessage(err),
    };
  }
}

/**
 * @param {{
 *   to: string;
 *   subject: string;
 *   body: string;
 *   html?: string;
 *   cc?: string;
 *   replyTo?: string;
 *   inReplyTo?: string;
 * }} params
 */
export async function sendEmail(params) {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) return missingConfigResponse();
  if (!hasResolvedSmtp(config)) {
    return toErrorContent({
      ok: false,
      error: 'not_configured',
      message: 'SMTP host is required.',
    });
  }

  const recipientCheck = validateRecipients(params.to, params.cc);
  if (!recipientCheck.ok) {
    return toErrorContent(recipientCheck);
  }

  const bodyCheck = validateBodySize(params.body, params.html, config.maxBodyChars);
  if (!bodyCheck.ok) {
    return toErrorContent(bodyCheck);
  }

  const rateCheck = checkSendRateLimit();
  if (!rateCheck.ok) {
    return toErrorContent(rateCheck);
  }

  const from = config.fromName
    ? `"${config.fromName.replace(/"/g, '\\"')}" <${config.email}>`
    : config.email;

  /** @type {import('nodemailer').SendMailOptions} */
  const mail = {
    from,
    to: params.to,
    subject: params.subject,
    text: params.body,
    cc: params.cc || undefined,
    replyTo: params.replyTo || undefined,
    inReplyTo: params.inReplyTo || undefined,
  };

  if (params.html) {
    mail.html = params.html;
  }

  try {
    const transporter = getTransporter(config);
    const info = await transporter.sendMail(mail);
    const accepted = (info.accepted ?? []).map(String);
    return toJsonContent({
      ok: true,
      messageId: info.messageId ?? null,
      accepted,
    });
  } catch (err) {
    return toErrorContent({
      ok: false,
      error: 'send_failed',
      message: safeErrorMessage(err),
    });
  }
}

export async function closeSmtp() {
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
  }
}
