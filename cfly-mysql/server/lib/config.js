/** @typedef {import('mysql2/promise').PoolOptions} PoolOptions */

const MAX_ROWS_CAP = 1000;
const DEFAULT_MAX_ROWS = 200;
const DEFAULT_PORT = 3306;
const QUERY_TIMEOUT_MS = 60_000;

/**
 * @returns {{
 *   host: string;
 *   port: number;
 *   database: string;
 *   user: string;
 *   password: string;
 *   readonly: boolean;
 *   maxRows: number;
 *   ssl: boolean;
 *   queryTimeoutMs: number;
 * }}
 */
export function loadConfig() {
  const host = (process.env.CFLY_MYSQL_HOST ?? '').trim();
  const portRaw = Number(process.env.CFLY_MYSQL_PORT);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : DEFAULT_PORT;
  const database = (process.env.CFLY_MYSQL_DATABASE ?? '').trim();
  const user = (process.env.CFLY_MYSQL_USER ?? '').trim();
  const password = process.env.CFLY_MYSQL_PASSWORD ?? '';
  const readonly = (process.env.CFLY_MYSQL_READONLY ?? 'true').toString().toLowerCase() !== 'false';
  const maxRowsRaw = Number(process.env.CFLY_MYSQL_MAX_ROWS);
  const maxRows = clampMaxRows(Number.isFinite(maxRowsRaw) ? maxRowsRaw : DEFAULT_MAX_ROWS);
  const ssl = (process.env.CFLY_MYSQL_SSL ?? 'false').toString().toLowerCase() === 'true';

  return {
    host,
    port,
    database,
    user,
    password,
    readonly,
    maxRows,
    ssl,
    queryTimeoutMs: QUERY_TIMEOUT_MS,
  };
}

/** @param {number} value */
export function clampMaxRows(value) {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_MAX_ROWS;
  return Math.min(MAX_ROWS_CAP, Math.floor(value));
}

/** @param {ReturnType<typeof loadConfig>} config */
export function hasRequiredConfig(config) {
  return Boolean(config.host && config.user);
}

/** @param {ReturnType<typeof loadConfig>} config */
export function passwordConfigured(config) {
  return typeof config.password === 'string' && config.password.length > 0;
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 * @returns {PoolOptions}
 */
export function toPoolOptions(config) {
  /** @type {PoolOptions} */
  const options = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    charset: 'utf8mb4',
    connectionLimit: 2,
    waitForConnections: true,
    queueLimit: 0,
  };
  if (config.database) {
    options.database = config.database;
  }
  if (config.ssl) {
    options.ssl = { rejectUnauthorized: true };
  }
  return options;
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 * @param {string | undefined} toolDatabase
 */
export function resolveDatabase(config, toolDatabase) {
  const db = (toolDatabase ?? '').trim() || config.database;
  return db || null;
}

/** @param {string | null | undefined} name */
export function isValidIdentifier(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9_]+$/.test(name);
}

/**
 * @param {ReturnType<typeof loadConfig>} config
 * @param {number | undefined} toolMaxRows
 */
export function effectiveMaxRows(config, toolMaxRows) {
  const tool = toolMaxRows !== undefined ? clampMaxRows(toolMaxRows) : config.maxRows;
  return Math.min(tool, config.maxRows, MAX_ROWS_CAP);
}
