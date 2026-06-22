import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMaxRows, effectiveMaxRows, isValidIdentifier, loadConfig } from './config.js';

test('clampMaxRows enforces cap 1000', () => {
  assert.equal(clampMaxRows(5000), 1000);
  assert.equal(clampMaxRows(0), 200);
});

test('isValidIdentifier', () => {
  assert.equal(isValidIdentifier('users'), true);
  assert.equal(isValidIdentifier('users;drop'), false);
});

test('loadConfig parses env', () => {
  const keys = [
    'CFLY_MYSQL_HOST',
    'CFLY_MYSQL_PORT',
    'CFLY_MYSQL_USER',
    'CFLY_MYSQL_READONLY',
    'CFLY_MYSQL_MAX_ROWS',
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.CFLY_MYSQL_HOST = '10.0.0.1';
  process.env.CFLY_MYSQL_PORT = '3307';
  process.env.CFLY_MYSQL_USER = 'root';
  process.env.CFLY_MYSQL_READONLY = 'false';
  process.env.CFLY_MYSQL_MAX_ROWS = '9999';
  try {
    const cfg = loadConfig();
    assert.equal(cfg.host, '10.0.0.1');
    assert.equal(cfg.port, 3307);
    assert.equal(cfg.readonly, false);
    assert.equal(cfg.maxRows, 1000);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('effectiveMaxRows uses min of tool and config', () => {
  const cfg = { maxRows: 200 };
  assert.equal(effectiveMaxRows(cfg, 50), 50);
  assert.equal(effectiveMaxRows(cfg, 500), 200);
});
