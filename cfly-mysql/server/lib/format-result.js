/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return '<binary>';
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

/**
 * @param {import('mysql2').RowDataPacket[]} rows
 * @param {number} maxRows
 */
export function formatSelectRows(rows, maxRows) {
  const limited = rows.slice(0, maxRows);
  const truncated = rows.length > limited.length;
  if (limited.length === 0) {
    return { rowCount: 0, truncated: false, columns: [], rows: [] };
  }
  const columns = Object.keys(limited[0]);
  const data = limited.map((row) => columns.map((col) => serializeValue(row[col])));
  return {
    rowCount: data.length,
    truncated,
    columns,
    rows: data,
  };
}

/**
 * @param {import('mysql2').ResultSetHeader} header
 * @param {string} operation
 */
export function formatDmlResult(header, operation) {
  const body = {
    ok: true,
    operation,
    affectedRows: header.affectedRows ?? 0,
  };
  if (operation === 'insert' && header.insertId != null) {
    body.insertId = Number(header.insertId);
  }
  if (operation === 'update' && header.changedRows != null) {
    body.changedRows = header.changedRows;
  }
  return body;
}

/**
 * @param {import('mysql2').RowDataPacket[]} columns
 * @param {import('mysql2').RowDataPacket[]} indexes
 */
export function formatDescribeTable(database, table, columns, indexes) {
  const colRows = columns.map((c) => ({
    name: c.Field,
    type: c.Type,
    nullable: c.Null === 'YES',
    key: c.Key || '',
    default: c.Default ?? null,
    extra: c.Extra || '',
  }));

  const indexMap = new Map();
  for (const idx of indexes) {
    const name = idx.Key_name;
    if (!indexMap.has(name)) {
      indexMap.set(name, {
        name,
        columns: [],
        unique: idx.Non_unique === 0,
      });
    }
    indexMap.get(name).columns.push(idx.Column_name);
  }

  return {
    ok: true,
    database,
    table,
    columns: colRows,
    indexes: [...indexMap.values()],
  };
}

/**
 * @param {string} versionRow
 * @param {string} host
 * @param {number} port
 */
export function formatVersionSummary(versionRow, host, port) {
  const raw = String(versionRow);
  const match = raw.match(/^(\d+\.\d+\.\d+)/);
  const ver = match ? match[1] : raw.split('-')[0].slice(0, 32);
  return `MySQL ${ver} @ ${host}:${port}`;
}

/**
 * @param {unknown} body
 */
export function toJsonContent(body) {
  return { content: [{ type: 'text', text: JSON.stringify(body) }] };
}

/**
 * @param {unknown} body
 */
export function toErrorContent(body) {
  return {
    content: [{ type: 'text', text: JSON.stringify(body) }],
    isError: true,
  };
}
