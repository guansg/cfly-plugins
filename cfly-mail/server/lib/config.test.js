import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampMaxBody,
  clampMaxList,
  hasRequiredConfig,
  isValidMailboxName,
  loadConfig,
  PROVIDER_PRESETS,
} from './config.js';

test('loadConfig applies qq provider preset hosts', () => {
  const keys = [
    'CFLY_MAIL_EMAIL', 'CFLY_MAIL_PASSWORD', 'CFLY_MAIL_PROVIDER',
    'CFLY_MAIL_SMTP_HOST', 'CFLY_MAIL_IMAP_HOST',
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  try {
    process.env.CFLY_MAIL_EMAIL = 'user@qq.com';
    process.env.CFLY_MAIL_PASSWORD = 'secret';
    process.env.CFLY_MAIL_PROVIDER = 'qq';
    delete process.env.CFLY_MAIL_SMTP_HOST;
    delete process.env.CFLY_MAIL_IMAP_HOST;

    const config = loadConfig();
    assert.equal(config.smtpHost, PROVIDER_PRESETS.qq.smtp.host);
    assert.equal(config.imapHost, PROVIDER_PRESETS.qq.imap.host);
    assert.equal(config.smtpPort, 465);
    assert.equal(config.imapPort, 993);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test('hasRequiredConfig requires email and password', () => {
  assert.equal(hasRequiredConfig({ email: 'a@b.com', password: 'x' }), true);
  assert.equal(hasRequiredConfig({ email: '', password: 'x' }), false);
  assert.equal(hasRequiredConfig({ email: 'a@b.com', password: '  ' }), false);
});

test('isValidMailboxName rejects path injection', () => {
  assert.equal(isValidMailboxName('INBOX'), true);
  assert.equal(isValidMailboxName('INBOX/..'), false);
  assert.equal(isValidMailboxName(''), false);
});

test('clampMaxList caps at 100', () => {
  assert.equal(clampMaxList(30), 30);
  assert.equal(clampMaxList(500), 100);
});

test('clampMaxBody caps at 50000', () => {
  assert.equal(clampMaxBody(12000), 12000);
  assert.equal(clampMaxBody(99999), 50000);
});
