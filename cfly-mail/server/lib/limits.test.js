import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  parseRecipients,
  validateBodySize,
  validateRecipients,
} from './limits.js';

test('isValidEmail accepts common addresses', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('validateRecipients enforces max 20', () => {
  const many = Array.from({ length: 21 }, (_, i) => `u${i}@example.com`).join(',');
  const result = validateRecipients(many);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'recipient_limit_exceeded');
});

test('parseRecipients splits comma and semicolon', () => {
  const list = parseRecipients('a@x.com;b@x.com', 'c@x.com');
  assert.deepEqual(list, ['a@x.com', 'b@x.com', 'c@x.com']);
});

test('validateBodySize rejects oversized body', () => {
  const result = validateBodySize('x'.repeat(100), undefined, 50);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'body_too_large');
});
