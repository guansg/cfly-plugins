import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSnippet, sortMessagesByDateDesc, truncateBody } from './message-format.js';

test('makeSnippet truncates to 120 chars with ellipsis', () => {
  const long = 'a'.repeat(200);
  const snippet = makeSnippet(long, null);
  assert.equal(snippet.length, 121);
  assert.ok(snippet.endsWith('…'));
});

test('makeSnippet prefers plain text over html', () => {
  assert.equal(makeSnippet('hello', '<p>world</p>'), 'hello');
});

test('truncateBody marks bodyTruncated when over limit', () => {
  const result = truncateBody('abcdef', null, 3);
  assert.equal(result.bodyTruncated, true);
  assert.equal(result.text, 'abc…');
});

test('sortMessagesByDateDesc orders newest first', () => {
  const sorted = sortMessagesByDateDesc([
    { uid: 1, date: '2020-01-01T00:00:00.000Z' },
    { uid: 2, date: '2026-06-01T00:00:00.000Z' },
    { uid: 3, date: null },
  ]);
  assert.equal(sorted[0].uid, 2);
  assert.equal(sorted[1].uid, 1);
});
