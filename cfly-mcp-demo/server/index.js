/**
 * cfly-mcp-demo — Official reference MCP Server (stdio).
 * Validates: install → API Key config → tool call end-to-end (doc 22 / §1.1.4).
 *
 * Startup policy (§1.1.4.2): missing Key does **not** exit, so "Test connection" listTools succeeds;
 * Key validation happens at tool call time. Runtime env is injected by the client via bindings.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const VERSION = '1.1.0';
const apiKey = process.env.CFLY_DEMO_API_KEY ?? '';
const nickname = process.env.CFLY_DEMO_NICKNAME ?? 'demo-user';
const verbosity = process.env.CFLY_DEMO_VERBOSITY ?? 'basic';

function keyValid() {
  return apiKey.length >= 8;
}

function maskKey() {
  if (!apiKey) return '';
  return apiKey.length <= 4 ? '****' : `${apiKey.slice(0, 4)}***`;
}

const server = new McpServer({ name: 'cfly-mcp-demo', version: VERSION });

server.tool(
  'ping',
  'Health check; returns ok, timestamp and plugin version.',
  {},
  async () => {
    const body = {
      ok: true,
      at: new Date().toISOString(),
      pluginVersion: VERSION,
      ...(verbosity === 'verbose' ? { pid: process.pid } : {}),
    };
    return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] };
  },
);

server.tool(
  'verify_config',
  'Report whether the API key is configured (key shown masked).',
  {},
  async () => {
    const body = {
      configured: keyValid(),
      nickname,
      verbosity,
      apiKeyPreview: maskKey(),
    };
    return { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] };
  },
);

server.tool(
  'verify_api_key',
  'Probe tool: verify that the API key is configured and valid. Returns { ok, summary }.',
  {},
  async () => {
    const started = Date.now();
    const valid = keyValid();
    const body = {
      ok: valid,
      latencyMs: Date.now() - started,
      ...(valid
        ? { summary: `API Key verified (${maskKey()})` }
        : { message: 'API Key not configured or too short (min 8 chars).' }),
    };
    if (!valid) {
      return { content: [{ type: 'text', text: JSON.stringify(body) }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(body) }] };
  },
);

server.tool(
  'echo',
  'Echo a message prefixed with the configured nickname. Requires a valid API key.',
  { message: z.string().describe('Text to echo back') },
  async ({ message }) => {
    if (!keyValid()) {
      return {
        content: [
          { type: 'text', text: 'Error: API Key not configured or too short (min 8 chars).' },
        ],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: `[${nickname}] ${message}` }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
