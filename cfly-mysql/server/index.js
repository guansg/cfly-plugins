/**
 * cfly-mysql — Official MySQL MCP Server (stdio).
 * Config is injected via client bindings into env; missing host/username does not exit, so listTools stays available.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  hasRequiredConfig,
  loadConfig,
  passwordConfigured,
} from './lib/config.js';
import { toJsonContent } from './lib/format-result.js';
import { endPool } from './lib/pool.js';
import {
  describeTable,
  listDatabases,
  listTables,
  runQuery,
  testConnection,
} from './lib/query-executor.js';

const VERSION = '1.0.0';

const paramSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const server = new McpServer({ name: 'cfly-mysql', version: VERSION });

server.tool(
  'ping',
  'Health check; returns plugin version and config summary (no secrets).',
  {},
  async () => {
    const config = loadConfig();
    return toJsonContent({
      ok: true,
      pluginVersion: VERSION,
      host: config.host || null,
      port: config.port,
      readonly: config.readonly,
      maxRows: config.maxRows,
      passwordConfigured: passwordConfigured(config),
      configured: hasRequiredConfig(config),
    });
  },
);

server.tool(
  'test_connection',
  'Verify MySQL connectivity; returns server version summary and latency.',
  {},
  async () => {
    const result = await testConnection();
    return result;
  },
);

server.tool(
  'list_databases',
  'List all databases (SHOW DATABASES).',
  {},
  async () => listDatabases(),
);

server.tool(
  'list_tables',
  'List tables in database or the configured default database.',
  {
    database: z.string().optional().describe('Database name; uses configured default if omitted'),
  },
  async ({ database }) => listTables(database),
);

server.tool(
  'describe_table',
  'Column and index summary for one table; identifiers are validated server-side.',
  {
    table: z.string().describe('Table name'),
    database: z.string().optional().describe('Database name; uses configured default if omitted'),
  },
  async ({ table, database }) => describeTable(table, database),
);

{
  const config = loadConfig();
  server.tool(
    'run_query',
    'Run a single guarded SQL statement; use params for ? placeholders; read-only unless config allows writes.',
    {
      sql: z.string().describe('Single SQL statement'),
      params: z.array(paramSchema).optional().describe('Values for ? placeholders'),
      database: z.string().optional().describe('Database context before executing SQL'),
      maxRows: z.number().int().positive().optional().describe('Max rows for SELECT (capped by config)'),
    },
    {
      annotations: {
        readOnlyHint: config.readonly,
        destructiveHint: !config.readonly,
        idempotentHint: false,
      },
    },
    async ({ sql, params, database, maxRows }) => runQuery(sql, params, database, maxRows),
  );
}

async function shutdown() {
  await endPool();
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
