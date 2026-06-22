[English (this page)](./PLUGIN-AUTHOR-GUIDE.md) | [中文](./PLUGIN-AUTHOR-GUIDE.zh-CN.md)

# CflyEdit Plugin Author Guide

This document is for **plugin authors** (official and third-party). It defines the **contract and conventions** of the CflyEdit plugin platform.  
When developing, use **this guide + the [cfly-mcp-demo](./cfly-mcp-demo/) reference implementation** as the single source of truth.

---

## 1. What Is a Plugin

A CflyEdit plugin = **a `cfly-plugin.json` manifest** + **an MCP Server** (typically a local stdio subprocess), installed, configured, and started/stopped by the client, exposing capabilities via MCP tools in **assistant chat**.

```
User installs zip
  → Client extracts to user data directory
  → Settings form → bindings inject env / headers
  → [Optional] "Verify service connection" in config (probe)
  → Save → Card "Test connection" (MCP listTools)
  → User enables → Assistant callTool
```

**Plugin author provides**: manifest, MCP Server business logic, Release zip (including `node_modules`).  
**Client provides**: install, config UI, encrypted secret storage, stdio spawn (bundled Node), probe/MCP test IPC, tool name mapping, and result truncation.

---

## 2. Package Structure

### 2.1 Source Layout (Recommended)

```
<pluginId>/
├── cfly-plugin.json      # Manifest (required)
├── assets/
│   └── icon.svg          # Recommended 128×128
├── server/
│   ├── index.js          # MCP entry (ESM; package.json must have "type": "module")
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/     # Produced before Release via npm ci --omit=dev
└── README.md
```

### 2.2 Release Zip Conventions

- Filename: `<pluginId>-<version>.cfly-plugin.zip`
- Zip must have a **single root folder** = `manifest.id` (e.g. `cfly-mysql/`)
- **Must** include `server/node_modules/` (stdio plugins); the client **does not** run `npm install` for users
- **Forbidden** in zip: `.env`, symlinks, path traversal (`..`)

Pack in this repository:

```bash
cd <pluginId>/server && npm ci --omit=dev
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

---

## 3. `cfly-plugin.json` Field Reference

`schemaVersion` currently supports **1** only.

### 3.1 Top-Level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Stable plugin ID (slug); matches zip root folder and Hub catalog `slug` |
| `name` | Yes | Display name |
| `version` | Yes | semver |
| `description` | Recommended | i18n: `{ "zh-CN": "...", "en-US": "..." }` |
| `icon` | No | Relative path, e.g. `assets/icon.svg` |
| `transport` | Yes | `stdio` or `streamableHttp` |
| `runtime` | Required for stdio | See table below |
| `http` | Required for HTTP | `{ "urlTemplate": "https://...{{key}}..." }` |
| `config` | As needed | User config form |
| `permissions` | Recommended | Shown before install; see §8 |
| `mcp` | No | Timeouts, probe, tool whitelist; see §7 |

### 3.2 `runtime` (stdio)

| Field | Description |
|-------|-------------|
| `entry` | Relative to plugin root, e.g. `server/index.js` |
| `args` | Extra args; default `[]` |
| `requires.node` | Recommended `">=22"` to align with client bundled Node |
| `bundleDependencies` | Recommended `true` |

**Do not** put `"command": "node"` in the manifest. The client spawns the subprocess with **bundled Node**.

### 3.3 `config` Form

| Field | Description |
|-------|-------------|
| `fields[]` | One entry per user input; `type`: `string` \| `number` \| `boolean` \| `secret` \| `select` |
| `required[]` | Required field `key` list; must be subset of `fields[].key` |
| `bindings` | Maps to `env` (stdio) and/or `headers` (HTTP) |
| `presets` | Optional; client auto-fills related fields when a `select` changes (see §3.3.1) |

**Official conventions**:

1. Declare every input in `fields`.
2. Every `{{key}}` in `bindings` must exist in `fields`.
3. Passwords, API keys, etc. use `type: "secret"`; client stores encrypted, **never shows plaintext**.
4. `fields[].default` is form default only; **does not count** as "user filled in".

### 3.3.1 `config.presets` (Select Auto-Fill)

When a `select` field (e.g. `providerPreset`) changes, the client writes related fields into the config form:

```json
"presets": {
  "providerPreset": {
    "qq": {
      "smtpHost": "smtp.qq.com",
      "smtpPort": 465,
      "smtpEncryption": "ssl"
    },
    "custom": {}
  }
}
```

- Outer key must be a `type: "select"` field `key`.
- Inner keys must be that select's `options[].value`.
- Value object keys must be declared in `fields`.
- Server may still fallback at runtime (empty form still works); `presets` handle **visible UI fill**.

Reference: `cfly-mail`.

### 3.4 Bindings and Env Injection

Placeholder `{{fieldKey}}` is replaced at runtime (numbers/booleans become **strings** in env).

```json
"bindings": {
  "env": {
    "CFLY_MYSQL_HOST": "{{host}}",
    "CFLY_MYSQL_READONLY": "{{readonly}}"
  }
}
```

Server must parse: `"true"` / `"false"` → boolean, `"3306"` → number.

**Forbidden**: `.env` files inside the plugin package; config **only** from client injection.

---

## 4. MCP Server Development Conventions

### 4.1 Protocol and SDK

Implement per [Model Context Protocol](https://modelcontextprotocol.io/). Recommended: `@modelcontextprotocol/sdk` + `McpServer` + `StdioServerTransport` (see `cfly-mcp-demo/server/index.js`).

### 4.2 Startup Policy (Important)

**When required config is missing, do not `exit(1)`.**

- During "pending config", the client still runs **Test connection** (`listTools`); the process must start and list tools.
- Business validation (DB connect, password check, etc.) belongs in **tool calls** or the **probe tool**; return structured JSON errors, **do not throw** and crash the process.

### 4.3 Tool Naming (Assistant Side)

You register MCP tool names in the Server (e.g. `run_query`).  
In assistant chat they map to:

```text
cfly_mcp_<serverId>__<toolName>
```

`serverId` is normalized from `manifest.id` (invalid chars → `_`, max ~40 chars, **hyphens kept**).  
Example: `pluginId` `cfly-mcp-demo` → `cfly_mcp_cfly-mcp-demo__ping`.

### 4.4 Tool Return Format

- Recommended: `content: [{ type: "text", text: "<JSON string>" }]`
- Business failure: JSON `{ "ok": false, "message": "..." }`, optionally `isError: true`
- **Single result** truncated at ~**12,000 characters** on the client (all MCP plugins). Use `LIMIT`, pagination, or summary in Server; set `truncated: true` when needed.

### 4.5 Dependency Choices

- **Prefer pure JS** deps (e.g. `mysql2`) for a single **universal** zip.
- Avoid native modules; otherwise pack per OS/arch — wrong platform breaks Test connection.

---

## 5. Two-Layer Testing: MCP Test vs Service Probe

The client separates "pipeline health" from "external service reachable". **Authors must not mix them.**

| Layer | User action | Validates | Plugin responsibility |
|-------|-------------|-----------|------------------------|
| **MCP** | Card "Test connection" | Subprocess start, MCP handshake, `listTools` | `listTools` works without config; **do not** hit external services in listTools |
| **Service** | Config "Verify service connection" | `callTool(probeTool)` checks credentials/connectivity | Declare `mcp.probeTool` in manifest; implement same-named tool in Server |

### 5.1 Declaring a Probe

```json
{
  "mcp": {
    "probeTool": "test_connection"
  }
}
```

| Plugin | probeTool | Example behavior |
|--------|-----------|-------------------|
| `cfly-mcp-demo` | `verify_api_key` | Local key length ≥8 |
| `cfly-mysql` | `test_connection` | Connect + `SELECT 1` |
| `cfly-mail` | `verify_mail` | SMTP/IMAP handshake |

Rules:

1. `probeTool` must **exactly match** a registered Server tool name.
2. Probe logic lives **entirely in the plugin Server**; the client has no MySQL/mail business code.
3. Probe tool may be reused in assistant chat (same implementation as config area).
4. Probe **does not** affect "Ready" badge or enable switch; only MCP test success enables the plugin.
5. **Wrong password**: probe may fail while MCP test still succeeds (by design); credential issues surface when assistant calls DB tools.

### 5.2 Probe Tool Return Format (Contract)

Client parses probe result as **raw JSON text** (no markdown code fence):

**Success**:

```json
{ "ok": true, "summary": "MySQL 8.0 @ 127.0.0.1:3306", "latencyMs": 42 }
```

**Failure** (business layer, e.g. wrong password):

```json
{ "ok": false, "message": "Access denied for user 'root'@'localhost'" }
```

Optional machine code field `error` (e.g. `connection_failed`); client falls back to `error` if no `message`.

**Do not throw** for business failure; use `isError: true` + JSON above (see demo `verify_api_key`).

---

## 6. User Config and Save Flow

1. User opens "Configure" → fills form → [Optional] **Verify service connection** (may use **unsaved** draft)
2. **Save** → secrets encrypted on disk; non-secrets in `pluginUserConfig`
3. After save, client auto-runs **MCP Test connection**
4. Test success → "Ready" badge; user **manually** toggles enable

Client disables Save while probe is in-flight (race avoidance); authors need not handle this.

---

## 7. Optional `mcp` Fields

| Field | Purpose |
|-------|---------|
| `connectTimeoutMs` | Connect timeout |
| `listToolsTimeoutMs` | listTools timeout |
| `callToolIdleTimeoutMs` | callTool idle wait per chunk |
| `callToolMaxTotalTimeoutMs` | callTool hard total cap |
| `toolTimeoutOverrides` | Per-tool override; values `{ "idleMs"?, "maxTotalMs"? }` (**do not** use `callToolMaxTotalTimeoutMs` as override key) |
| `allowedToolNames` | Filters `listTools` only; **does not** limit probe `callTool` |
| `probeTool` | Service probe tool name |

Long-running plugins (e.g. SQL) should declare larger `callToolMaxTotalTimeoutMs` and `maxTotalMs` override for `run_query`.

---

## 8. Permissions `permissions`

Before installing a stdio plugin, the client shows a permission summary and requires confirmation.

| Value | Meaning |
|-------|---------|
| `localProcess` | Start local Node subprocess (stdio **required**) |
| `network` | Network access (remote MySQL, SMTP, HTTP APIs, etc.) |

Example for database plugin: `["localProcess", "network"]`.

---

## 9. Transport Modes

### 9.1 stdio (Mode A — Recommended for Complex Plugins)

- Package **must** have `server/` + `node_modules`
- Config via `bindings.env`
- Client spawns bundled Node on `runtime.entry`

### 9.2 streamableHttp (Mode B — HTTP Preset)

- Package **may omit** `server/`
- `http.urlTemplate` + `bindings.headers` resolved from user config
- Probe still uses `mcp.probeTool` (remote MCP implements tool)
- For existing enterprise MCP gateways

---

## 10. Local Debugging

Developers may use **system Node** locally (recommended **22.x** to match client bundled version):

```bash
cd <pluginId>/server
npm install
export CFLY_DEMO_API_KEY=cfly-demo-2026   # Use your env var names
node index.js
# In another terminal: npx @modelcontextprotocol/inspector connect stdio
```

After debugging, build Release zip with `node_modules` per **§2.2** and validate in the client.

---

## 11. Pre-Release Checklist

1. Release zip **includes** `server/node_modules` (`npm ci --omit=dev` before pack).
2. `config.fields` only connection params and safety switches; business via MCP tools.
3. `bindings` placeholders match `fields`; secrets use `type: secret`.
4. Process still `listTools` when env is missing (§4.2).
5. Paginate/summarize large results; know §4.4 12k char truncation.
6. Declare appropriate timeouts in manifest for long tasks.
7. README documents permissions and data access; `permissions` accurate.
8. External deps: declare `mcp.probeTool` and implement probe tool (§5).
9. Zip root folder name = `manifest.id`; version matches catalog.
10. Error messages **exclude** passwords and full connection strings; never log secrets.

---

## 12. Reference Implementations

| Resource | Path |
|----------|------|
| **Official reference plugin** | [cfly-mcp-demo/](./cfly-mcp-demo/) (manifest + probe `verify_api_key`) |
| **Business plugins** | Each plugin's `README.md` (e.g. [cfly-mysql/README.md](./cfly-mysql/README.md)) |
| **Probe contract** | This guide §5 |

For new plugins: **copy `cfly-mcp-demo` layout**, change `id`, fields, Server logic, and tools; put business details in that plugin's `README.md`.

---

## 13. Revision History

| Date | Notes |
|------|-------|
| 2026-06-22 | Initial release: self-contained platform contract for plugin authors |
| 2026-06-22 | Removed internal monorepo doc references; business specs point to per-plugin READMEs |
