/**
 * @typedef {{
 *   unseen?: boolean;
 *   seen?: boolean;
 *   from?: string;
 *   to?: string;
 *   subjectContains?: string;
 *   since?: string;
 *   before?: string;
 * }} SearchCriteriaInput
 */

const ALLOWED_KEYS = new Set([
  'unseen',
  'seen',
  'from',
  'to',
  'subjectContains',
  'since',
  'before',
]);

/**
 * @param {unknown} criteria
 * @returns {{ ok: true; query: Record<string, unknown> } | { ok: false; error: string; message: string }}
 */
export function mapSearchCriteria(criteria) {
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    return {
      ok: false,
      error: 'search_syntax_error',
      message: 'criteria must be a non-empty object.',
    };
  }

  const input = /** @type {Record<string, unknown>} */ (criteria);
  const keys = Object.keys(input);
  if (keys.length === 0) {
    return {
      ok: false,
      error: 'search_syntax_error',
      message: 'criteria must not be empty.',
    };
  }

  for (const key of keys) {
    if (!ALLOWED_KEYS.has(key)) {
      return {
        ok: false,
        error: 'search_syntax_error',
        message: `Unknown criteria field: ${key}`,
      };
    }
  }

  /** @type {SearchCriteriaInput} */
  const c = input;

  if (c.unseen === true && c.seen === true) {
    return {
      ok: false,
      error: 'search_syntax_error',
      message: 'criteria cannot set both unseen and seen to true.',
    };
  }

  /** @type {Record<string, unknown>} */
  const query = {};

  if (c.unseen === true) query.seen = false;
  if (c.seen === true) query.seen = true;

  if (typeof c.from === 'string' && c.from.trim()) query.from = c.from.trim();
  if (typeof c.to === 'string' && c.to.trim()) query.to = c.to.trim();
  if (typeof c.subjectContains === 'string' && c.subjectContains.trim()) {
    query.subject = c.subjectContains.trim();
  }

  if (typeof c.since === 'string' && c.since.trim()) {
    const sinceDate = parseIsoDate(c.since.trim());
    if (!sinceDate) {
      return {
        ok: false,
        error: 'search_syntax_error',
        message: 'since must be YYYY-MM-DD.',
      };
    }
    query.since = sinceDate;
  }

  if (typeof c.before === 'string' && c.before.trim()) {
    const beforeDate = parseIsoDate(c.before.trim());
    if (!beforeDate) {
      return {
        ok: false,
        error: 'search_syntax_error',
        message: 'before must be YYYY-MM-DD.',
      };
    }
    query.before = beforeDate;
  }

  if (Object.keys(query).length === 0) {
    return {
      ok: false,
      error: 'search_syntax_error',
      message: 'criteria contains no valid search fields.',
    };
  }

  return { ok: true, query };
}

/**
 * @param {boolean | undefined} unreadOnly
 * @param {string | undefined} since
 */
export function buildListSearchQuery(unreadOnly, since) {
  /** @type {Record<string, unknown>} */
  const query = { all: true };
  if (unreadOnly) query.seen = false;
  if (since) {
    const sinceDate = parseIsoDate(since);
    if (sinceDate) query.since = sinceDate;
  }
  return query;
}

/** @param {number} days */
export function defaultSinceIso(days = 90) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** @param {string} value */
function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
