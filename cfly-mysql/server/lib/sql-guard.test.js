import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySelectLimit,
  guardError,
  parseStatements,
  validateRunQuery,
} from './sql-guard.js';

test('parseStatements rejects multi-statement', () => {
  assert.throws(
    () => parseStatements('SELECT 1; SELECT 2'),
    (err) => err.code === 'multi_statement_forbidden',
  );
});

test('parseStatements rejects USE in SQL', () => {
  assert.throws(
    () => parseStatements('USE mydb'),
    (err) => err.code === 'sql_parse_error',
  );
});

test('parseStatements rejects INTO OUTFILE', () => {
  assert.throws(
    () => parseStatements('SELECT * FROM t INTO OUTFILE "/tmp/x"'),
    (err) => err.code === 'sql_parse_error',
  );
});

test('validateRunQuery allows SELECT in readonly mode', () => {
  const result = validateRunQuery('SELECT * FROM users WHERE id = ?', true);
  assert.equal(result.types.includes('select'), true);
});

test('validateRunQuery rejects DELETE in readonly mode', () => {
  assert.throws(
    () => validateRunQuery('DELETE FROM users WHERE id = 1', true),
    (err) => err.code === 'readonly_violation',
  );
});

test('validateRunQuery allows INSERT when not readonly', () => {
  const result = validateRunQuery('INSERT INTO users (name) VALUES ("a")', false);
  assert.equal(result.types.includes('insert'), true);
});

test('validateRunQuery rejects DROP TABLE when not readonly', () => {
  assert.throws(
    () => validateRunQuery('DROP TABLE users', false),
    (err) => err.code === 'ddl_forbidden',
  );
});

test('validateRunQuery rejects SET', () => {
  assert.throws(
    () => validateRunQuery('SET @x = 1', false),
    (err) => err.code === 'sql_parse_error',
  );
});

test('applySelectLimit appends LIMIT when missing', () => {
  const { ast } = parseStatements('SELECT * FROM users');
  const sql = applySelectLimit('SELECT * FROM users', ast, 50);
  assert.match(sql, /LIMIT 50$/);
});

test('applySelectLimit clamps existing LIMIT', () => {
  const { ast } = parseStatements('SELECT * FROM users LIMIT 500');
  const sql = applySelectLimit('SELECT * FROM users LIMIT 500', ast, 100);
  assert.match(sql, /LIMIT 100$/);
});

test('guardError sets code', () => {
  const err = guardError('test_code', 'msg');
  assert.equal(err.code, 'test_code');
});
