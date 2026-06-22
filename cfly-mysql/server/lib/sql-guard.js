import SqlParser from 'node-sql-parser';

const { Parser } = SqlParser;
const parser = new Parser();

const READ_TYPES = new Set(['select', 'with', 'show', 'describe', 'explain']);
const WRITE_TYPES = new Set(['insert', 'update', 'delete']);
const DDL_TYPES = new Set(['create', 'alter', 'drop', 'truncate', 'rename']);
const FORBIDDEN_TYPES = new Set([
  'replace',
  'call',
  'load',
  'set',
  'lock',
  'unlock',
  'grant',
  'revoke',
  'use',
  'merge',
]);

const STRING_BLACKLIST = [
  /\bINTO\s+OUTFILE\b/i,
  /\bINTO\s+DUMPFILE\b/i,
  /\bLOAD\s+DATA\b/i,
  /\bFOR\s+UPDATE\b/i,
  /\bLOCK\s+TABLES\b/i,
  /\bSELECT\b[\s\S]*\bINTO\s+@\w+/i,
  /^\s*USE\s+/i,
  /;\s*USE\s+/i,
];

const HIGH_RISK_DDL = [
  /\bDROP\s+DATABASE\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
];

/**
 * @param {string} sql
 */
export function parseStatements(sql) {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw guardError('sql_parse_error', 'SQL is empty.');
  }
  if (hasMultiStatement(trimmed)) {
    throw guardError('multi_statement_forbidden', 'Multiple SQL statements are not allowed.');
  }
  for (const pattern of STRING_BLACKLIST) {
    if (pattern.test(trimmed)) {
      throw guardError('sql_parse_error', 'SQL contains a forbidden pattern.');
    }
  }

  let astOrArray;
  try {
    astOrArray = parser.astify(trimmed, { database: 'MySQL' });
  } catch (err) {
    throw guardError('sql_parse_error', err instanceof Error ? err.message : 'Failed to parse SQL.');
  }

  const statements = Array.isArray(astOrArray) ? astOrArray : [astOrArray];
  if (statements.length !== 1) {
    throw guardError('multi_statement_forbidden', 'Multiple SQL statements are not allowed.');
  }
  return { sql: trimmed, ast: statements[0] };
}

/**
 * @param {string} sql
 * @param {boolean} readonly
 */
export function validateRunQuery(sql, readonly) {
  const { sql: normalized, ast } = parseStatements(sql);
  const types = collectStatementTypes(ast);

  if (readonly) {
    for (const t of types) {
      if (!READ_TYPES.has(t)) {
        throw guardError(
          'readonly_violation',
          'Only read-only SQL is allowed when readonly mode is enabled.',
        );
      }
    }
    if (types.includes('with') && !isReadOnlyWith(ast)) {
      throw guardError(
        'readonly_violation',
        'Mutating CTE statements are not allowed in readonly mode.',
      );
    }
  } else {
    for (const t of types) {
      if (FORBIDDEN_TYPES.has(t)) {
        throw guardError('sql_parse_error', `Statement type "${t}" is not allowed.`);
      }
      if (DDL_TYPES.has(t)) {
        throw guardError('ddl_forbidden', `DDL statement type "${t}" is not allowed in v1.`);
      }
    }
    for (const pattern of HIGH_RISK_DDL) {
      if (pattern.test(normalized)) {
        throw guardError('ddl_forbidden', 'High-risk DDL statements are not allowed.');
      }
    }
    const hasWrite = types.some((t) => WRITE_TYPES.has(t));
    const hasRead = types.some((t) => READ_TYPES.has(t));
    if (!hasWrite && !hasRead) {
      throw guardError('sql_parse_error', 'Unsupported or unrecognized SQL statement.');
    }
    if (types.includes('with') && !isReadOnlyWith(ast) && !types.some((t) => WRITE_TYPES.has(t))) {
      // WITH ... SELECT only
    }
    if (types.includes('with') && !isReadOnlyWith(ast)) {
      const innerWrite = types.some((t) => WRITE_TYPES.has(t));
      if (!innerWrite) {
        throw guardError('sql_parse_error', 'Unsupported WITH statement.');
      }
    }
  }

  return { sql: normalized, ast, types };
}

/**
 * @param {string} sql
 * @param {unknown} ast
 * @param {number} maxRows
 */
export function applySelectLimit(sql, ast, maxRows) {
  const type = String(ast?.type ?? '').toLowerCase();
  if (type !== 'select') return sql;

  const limit = ast.limit;
  if (!limit) {
    return stripTrailingSemicolon(sql) + ` LIMIT ${maxRows}`;
  }

  const limitValue = extractLimitValue(limit);
  if (limitValue === null) return sql;
  if (limitValue > maxRows) {
    return replaceLimit(sql, maxRows);
  }
  return sql;
}

/**
 * @param {unknown} ast
 * @returns {string[]}
 */
function collectStatementTypes(ast) {
  const types = [];
  const type = String(ast?.type ?? 'unknown').toLowerCase();
  types.push(type);
  if (type === 'with') {
    const inner = ast?.stmt ?? ast?.body;
    if (inner?.type) {
      types.push(String(inner.type).toLowerCase());
    }
  }
  return types;
}

/** @param {unknown} ast */
function isReadOnlyWith(ast) {
  const inner = ast?.stmt ?? ast?.body;
  if (!inner) return true;
  const t = String(inner.type ?? '').toLowerCase();
  return READ_TYPES.has(t) && !WRITE_TYPES.has(t);
}

/** @param {string} sql */
function hasMultiStatement(sql) {
  const withoutTrailing = sql.replace(/;\s*$/, '');
  const parts = withoutTrailing.split(';').filter((p) => p.trim().length > 0);
  return parts.length > 1;
}

/** @param {string} sql */
function stripTrailingSemicolon(sql) {
  return sql.replace(/;\s*$/, '').trimEnd();
}

/** @param {unknown} limit */
function extractLimitValue(limit) {
  try {
    const seps = limit?.seperator ?? limit?.separator;
    const values = limit?.value;
    if (!Array.isArray(values) || values.length === 0) return null;
    const first = values[0];
    const raw = first?.value ?? first;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} sql
 * @param {number} maxRows
 */
function replaceLimit(sql, maxRows) {
  return stripTrailingSemicolon(sql).replace(/\bLIMIT\s+\d+(\s*,\s*\d+)?/i, `LIMIT ${maxRows}`);
}

/**
 * @param {string} code
 * @param {string} message
 */
export function guardError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * @param {unknown} err
 */
export function isGuardError(err) {
  return err instanceof Error && typeof err.code === 'string';
}
