import {
  effectiveMaxRows,
  hasRequiredConfig,
  isValidIdentifier,
  loadConfig,
  resolveDatabase,
} from './config.js';
import {
  formatDescribeTable,
  formatDmlResult,
  formatSelectRows,
  formatVersionSummary,
  toErrorContent,
  toJsonContent,
} from './format-result.js';
import { getPool } from './pool.js';
import {
  applySelectLimit,
  guardError,
  isGuardError,
  validateRunQuery,
} from './sql-guard.js';

/**
 * @param {unknown} err
 */
export function mapConnectionError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const safe = message.replace(/password[=:]\S+/gi, 'password=***');
  return toErrorContent({
    ok: false,
    error: 'connection_failed',
    message: safe.slice(0, 300),
  });
}

export function missingConfigResponse() {
  return toErrorContent({
    ok: false,
    error: 'connection_failed',
    message: 'MySQL host and username are required. Configure the plugin in Settings.',
  });
}

/**
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {string} database
 */
async function useDatabase(connection, database) {
  if (!isValidIdentifier(database)) {
    throw guardError('invalid_identifier', `Invalid database name: ${database}`);
  }
  await connection.query('USE ??', [database]);
}

/**
 * @param {string | null} database
 * @param {boolean} required
 */
function requireDatabase(database, required) {
  if (!database) {
    if (required) {
      return toErrorContent({
        ok: false,
        error: 'database_required',
        message: 'Database is required. Set a default database in config or pass the database parameter.',
      });
    }
    return null;
  }
  if (!isValidIdentifier(database)) {
    return toErrorContent({
      ok: false,
      error: 'invalid_identifier',
      message: `Invalid database name: ${database}`,
    });
  }
  return null;
}

/**
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<import('./format-result.js').toJsonContent>} fn
 * @param {{ database?: string | null; requireDatabase?: boolean }} [opts]
 */
async function withConnection(fn, opts = {}) {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) {
    return missingConfigResponse();
  }

  const dbName = opts.database ?? null;
  const dbErr = requireDatabase(dbName, Boolean(opts.requireDatabase));
  if (dbErr) return dbErr;

  let connection;
  try {
    const pool = getPool();
    connection = await pool.getConnection();
    if (dbName) {
      await useDatabase(connection, dbName);
    }
    return await fn(connection);
  } catch (err) {
    if (isGuardError(err)) {
      return toErrorContent({
        ok: false,
        error: err.code,
        message: err.message,
      });
    }
    return mapConnectionError(err);
  } finally {
    if (connection) connection.release();
  }
}

export async function testConnection() {
  const config = loadConfig();
  if (!hasRequiredConfig(config)) {
    return missingConfigResponse();
  }

  const started = Date.now();
  return withConnection(async (connection) => {
    await connection.query('SELECT 1');
    const [versionRows] = await connection.query('SELECT VERSION() AS v');
    const version = versionRows?.[0]?.v ?? 'unknown';
    const latencyMs = Date.now() - started;
    return toJsonContent({
      ok: true,
      summary: formatVersionSummary(version, config.host, config.port),
      latencyMs,
    });
  });
}

export async function listDatabases() {
  return withConnection(async (connection) => {
    const [rows] = await connection.query('SHOW DATABASES');
    const databases = rows.map((r) => r.Database);
    return toJsonContent({ ok: true, databases });
  });
}

/** @param {string | undefined} database */
export async function listTables(database) {
  const config = loadConfig();
  const db = resolveDatabase(config, database);
  return withConnection(
    async (connection) => {
      const [rows] = await connection.query('SHOW FULL TABLES');
      const key = Object.keys(rows[0] ?? {}).find((k) => k.startsWith('Tables_in_')) ?? 'Tables_in_db';
      const tables = rows.map((r) => ({
        name: r[key],
        type: r.Table_type ?? 'BASE TABLE',
      }));
      return toJsonContent({ ok: true, database: db, tables });
    },
    { database: db, requireDatabase: true },
  );
}

/**
 * @param {string} table
 * @param {string | undefined} database
 */
export async function describeTable(table, database) {
  const config = loadConfig();
  const db = resolveDatabase(config, database);

  if (!isValidIdentifier(table)) {
    return toErrorContent({
      ok: false,
      error: 'invalid_identifier',
      message: `Invalid table name: ${table}`,
    });
  }

  return withConnection(
    async (connection) => {
      const [columns] = await connection.query('SHOW FULL COLUMNS FROM ??', [table]);
      const [indexes] = await connection.query('SHOW INDEX FROM ??', [table]);
      const body = formatDescribeTable(db, table, columns, indexes);
      return toJsonContent(body);
    },
    { database: db, requireDatabase: true },
  );
}

/**
 * @param {string} sql
 * @param {unknown[] | undefined} params
 * @param {string | undefined} database
 * @param {number | undefined} maxRowsArg
 */
export async function runQuery(sql, params, database, maxRowsArg) {
  const config = loadConfig();
  const db = resolveDatabase(config, database);
  const maxRows = effectiveMaxRows(config, maxRowsArg);

  let guarded;
  try {
    guarded = validateRunQuery(sql, config.readonly);
  } catch (err) {
    if (isGuardError(err)) {
      return toErrorContent({ ok: false, error: err.code, message: err.message });
    }
    return toErrorContent({
      ok: false,
      error: 'sql_parse_error',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  let execSql = guarded.sql;
  if (guarded.types.includes('select')) {
    execSql = applySelectLimit(execSql, guarded.ast, maxRows);
  }

  const queryParams = Array.isArray(params) ? params : [];

  return withConnection(
    async (connection) => {
      if (config.readonly) {
        await connection.query('SET SESSION TRANSACTION READ ONLY');
        await connection.beginTransaction();
        try {
          const [result] = await connection.query(execSql, queryParams);
          await connection.rollback();
          await connection.query('SET SESSION TRANSACTION READ WRITE');
          return formatQueryResult(result, guarded.types, maxRows);
        } catch (err) {
          await connection.rollback().catch(() => {});
          await connection.query('SET SESSION TRANSACTION READ WRITE').catch(() => {});
          throw err;
        }
      }

      await connection.beginTransaction();
      try {
        const [result] = await connection.query(execSql, queryParams);
        await connection.commit();
        return formatQueryResult(result, guarded.types, maxRows);
      } catch (err) {
        await connection.rollback().catch(() => {});
        throw err;
      }
    },
    { database: db || null, requireDatabase: false },
  );
}

/**
 * @param {unknown} result
 * @param {string[]} types
 * @param {number} maxRows
 */
function formatQueryResult(result, types, maxRows) {
  const primaryType = types.find((t) => t !== 'with') ?? types[0];

  if (Array.isArray(result)) {
    const body = formatSelectRows(result, maxRows);
    return toJsonContent({ ok: true, ...body });
  }

  if (primaryType === 'insert' || primaryType === 'update' || primaryType === 'delete') {
    return toJsonContent(formatDmlResult(result, primaryType));
  }

  return toJsonContent({ ok: true, result: result });
}
