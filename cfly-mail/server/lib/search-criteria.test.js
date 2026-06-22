import test from 'node:test';
import assert from 'node:assert/strict';
import { buildListSearchQuery, mapSearchCriteria } from './search-criteria.js';

test('mapSearchCriteria rejects empty object', () => {
  const result = mapSearchCriteria({});
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'search_syntax_error');
});

test('mapSearchCriteria rejects unknown fields', () => {
  const result = mapSearchCriteria({ foo: 'bar' });
  assert.equal(result.ok, false);
});

test('mapSearchCriteria maps unseen and subjectContains', () => {
  const result = mapSearchCriteria({ unseen: true, subjectContains: 'invoice' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.query.seen, false);
    assert.equal(result.query.subject, 'invoice');
  }
});

test('mapSearchCriteria maps since date', () => {
  const result = mapSearchCriteria({ since: '2026-06-01' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.query.since instanceof Date);
  }
});

test('buildListSearchQuery supports unreadOnly', () => {
  const query = buildListSearchQuery(true, undefined);
  assert.equal(query.seen, false);
  assert.equal(query.all, true);
});
