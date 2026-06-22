import mysql from 'mysql2/promise';
import { loadConfig, toPoolOptions } from './config.js';

/** @type {import('mysql2/promise').Pool | null} */
let pool = null;

export function getPool() {
  if (!pool) {
    const config = loadConfig();
    pool = mysql.createPool(toPoolOptions(config));
  }
  return pool;
}

export async function endPool() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}

export function resetPoolForTests() {
  pool = null;
}
