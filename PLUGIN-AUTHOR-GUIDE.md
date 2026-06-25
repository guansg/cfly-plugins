[English (this page)](./PLUGIN-AUTHOR-GUIDE.md) | [中文](./PLUGIN-AUTHOR-GUIDE.zh-CN.md)

# CflyEdit Plugin Author Guide

This document is for **plugin authors** (official and third-party). It defines the **contract and conventions** of the CflyEdit plugin platform.  
When developing, use **this guide + the [cfly-mcp-demo](./cfly-mcp-demo/) reference implementation** as your source of truth; this document already contains all platform conventions you need.

---

## 1. What Is a Plugin

**[CflyEdit](https://cflyedit.com)** is the runtime host for plugins (AI editor + MCP plugin host). A CflyEdit plugin = **a `cfly-plugin.json` manifest** + **an MCP Server** (typically a local stdio child process), installed, configured, started/stopped by the client, and exposed in **assistant chat** via MCP tools.

```
User installs zip
  → Client extracts to user data directory
  → Settings form → bindings inject env / headers
  → [Optional] Settings area "Verify service connection" (probe)
  → Save → Card "Test connection" (MCP listTools)
  → User enables → Assistant callTool
```

**Plugin authors are responsible for**: manifest, MCP Server business logic, Release zip (including `node_modules`).  
**The client is responsible for**: installation, configuration UI, encrypted secret storage, stdio launch (built-in Node), probe/MCP test IPC, tool name mapping, and result truncation.

---

## 2. Package Structure

### 2.1 Source Directory (Recommended)

```
<pluginId>/
├── cfly-plugin.json      # Manifest (required)
├── assets/
│   └── icon.svg          # Recommended 128×128
├── server/
│   ├── index.js          # MCP entry (ESM; package.json must have "type": "module")
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/     # Produced before release via npm ci --omit=dev
└── README.md
```

### 2.2 Release Zip Conventions

- Filename: `<pluginId>-<version>.cfly-plugin.zip`
- Zip must have a **single root directory** = `manifest.id` (e.g. `cfly-mysql/`)
- **Must** include `server/node_modules/` (stdio plugins); the client **will not** run `npm install` for users
- **Do not** include `.env`, symbolic links, or path traversal (`..`) in the zip

Packaging in this repository:

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
|------|------|------|
| `id` | Yes | Stable plugin ID (slug); must match zip root directory name and Hub catalog `slug` |
| `name` | Yes | Display name |
| `version` | Yes | semver |
| `minClientVersion` | No | Minimum client version; validated by Hub and **zip import** |
| `description` | Recommended | i18n: `{ "zh-CN": "...", "en-US": "..." }` |
| `icon` | No | Relative path, e.g. `assets/icon.svg` |
| `transport` | Yes | `stdio` or `streamableHttp` |
| `runtime` | Required for stdio | See table below |
| `http` | Required for HTTP | `{ "urlTemplate": "https://...{{key}}..." }` |
| `config` | As needed | User configuration form |
| `permissions` | Recommended | Shown to users before install; see §8 |
| `mcp` | No | Timeouts, probe, tool allowlist; see §7 |

### 3.2 `runtime` (stdio)

| Field | Description |
|------|------|
| `entry` | Relative to plugin root, e.g. `server/index.js` |
| `args` | Extra arguments; default `[]` |
| `requires.node` | Recommended `">=22"` to align with the client's built-in Node major version |
| `bundleDependencies` | Recommended `true` |

**Do not** put `"command": "node"` in the manifest. The client uses **built-in Node** to start the child process.

### 3.3 `config` Form

| Field | Description |
|------|------|
| `fields[]` | One entry per user-fillable item; `type`: `string` \| `number` \| `boolean` \| `secret` \| `select` |
| `required[]` | List of required field `key`s; must be a subset of `fields[].key` |
| `bindings` | Maps to `env` (stdio) and/or `headers` (HTTP) |
| `presets` | Optional; when a `select` changes, the client auto-fills related fields (see §3.3.1) |

**Official conventions**:

1. Declare as many entries in `fields` as there are inputs.
2. Every `{{key}}` in `bindings` must exist in `fields`, **or** be the platform placeholder `{{pluginMcpOutputDir}}` (§3.4.1).
3. Use `type: "secret"` for passwords, API keys, etc.; the client stores them encrypted and **does not show plaintext**.
4. `fields[].default` is only a form default; it **does not** count as "user has filled in".

### 3.3.1 `config.presets` (Select-Linked Prefill)

When a `select` field (e.g. `providerPreset`) changes option, the client automatically writes related fields into the configuration form:

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

- Keys must be `key`s of `type: "select"` fields in `fields`.
- Inner keys must be `options[].value` of that select.
- Keys in the value object must be declared in `fields`.
- The server may still keep runtime fallbacks (empty form fields can still connect); `presets` handles **visible UI prefill**.

Reference implementation: `cfly-mail`.

### 3.4 Bindings and env Injection

Placeholder `{{fieldKey}}` is replaced at runtime with the configured value (numbers/booleans are converted to **strings** when written to env).

```json
"bindings": {
  "env": {
    "CFLY_MYSQL_HOST": "{{host}}",
    "CFLY_MYSQL_READONLY": "{{readonly}}"
  }
}
```

The server must parse these itself: `"true"` / `"false"` → boolean, `"3306"` → number.

**Do not** use `.env` files inside the plugin package; configuration **only** comes from client injection.

### 3.4.1 Platform env and Working Directory (Client Auto-Injection)

When the client starts a **stdio plugin**, in addition to resolved `bindings`, it also **automatically** configures:

| Item | Value | Description |
|----|-----|------|
| `CFLY_PLUGIN_MCP_OUTPUT_DIR` | `<userData>/plugin-mcp-output/<pluginId>` | Writable on-disk directory env; **no** manifest declaration needed |
| **stdio `cwd`** | Same as above | Child process relative paths (e.g. `./shot.png`) default to this directory |
| **`args[0]`** | Absolute path `<installPath>/<runtime.entry>` | Entry script; **do not** rely on `cwd` to locate `server/index.js` |

Server-side read example:

```js
const outputDir = process.env.CFLY_PLUGIN_MCP_OUTPUT_DIR;
// process.cwd() equals outputDir (stdio plugins)
```

**Do not** ask users to fill in this path in the config form; the client injects it at resolve / install time, and **bindings cannot override** `CFLY_PLUGIN_MCP_OUTPUT_DIR`.

The client **`mkdir`s the output directory** at resolve / install time (`recursive: true`); the server may still ensure the directory exists before first write.

**Do not** write runtime files to the plugin install directory (`pluginInstallPath`); the install directory is read-only for code and `node_modules`.

Optional advanced usage: to map to your own env name, use platform placeholder `{{pluginMcpOutputDir}}` in `bindings` (**not** a `fields` key). For normal file writes, read `CFLY_PLUGIN_MCP_OUTPUT_DIR` directly or use paths relative to `cwd`.

> **stdio plugins only**: `streamableHttp` has no local child-process env and does not inject this variable; remote MCP manages its own on-disk storage.

### 3.4.2 stdio Environment Allowlist

The plugin child process **does not inherit** the full `process.env`. Besides `bindings` and the platform env above, the client only forwards an OS allowlist (for Playwright etc. to resolve browser paths):

- **Windows**: `SystemRoot`, `TEMP`, `TMP`, `USERPROFILE`, `COMSPEC`, `ProgramFiles`, `ProgramFiles(x86)`, `ProgramW6432`, `LOCALAPPDATA`, `APPDATA`, `PROGRAMDATA`, `SystemDrive`
- **Unix**: `HOME`, `TMPDIR`, `LANG`

The built-in Node directory is also **prepended** to `PATH`.

For local debugging (§10), you must `export` / `set` to simulate the variables above.

---

## 4. MCP Server Development Conventions

### 4.1 Protocol and SDK

Implement per the [Model Context Protocol](https://modelcontextprotocol.io/). Recommended: `@modelcontextprotocol/sdk` + `McpServer` + `StdioServerTransport` (see `cfly-mcp-demo/server/index.js`).

### 4.2 Startup Strategy (Important)

**When required configuration is missing, do not `exit(1)`.**

- During the "pending configuration" phase, the client still **tests connection** (`listTools`); the process must start and list tools.
- Put business validation (connect to DB, verify password, etc.) in **tool invocations** or the **probe tool**, returning structured JSON errors; **do not throw and crash the process**.

### 4.3 Tool Naming (Assistant Side)

MCP native tool names are registered by you in the server (e.g. `run_query`).  
In assistant chat they are mapped to:

```text
cfly_mcp_<serverId>__<toolName>
```

`serverId` is normalized from `manifest.id` (invalid characters become `_`, max ~40 chars, **hyphens preserved**).  
Example: `pluginId` `cfly-mcp-demo` → `cfly_mcp_cfly-mcp-demo__ping`.

### 4.4 Tool Return Format (`callTool` Output)

#### 4.4.1 Text and JSON

- Recommended: `content: [{ type: "text", text: "<JSON string>" }]`
- Business failure: JSON with `{ "ok": false, "message": "..." }`; use `isError: true` when needed
- **Single results** are truncated at roughly **12,000 characters** on the client (shared by all MCP plugins). For large result sets, use `LIMIT`, pagination, or summaries in the server, and mark `truncated: true`.

#### 4.4.2 Media Preview (Image / Audio / Video)

The client uniformly handles MCP standard `content` types:

| `type` | Plugin returns | Client behavior |
|--------|----------|------------|
| `text` | `{ type: "text", text: "..." }` | Passes raw text to the model; scans `](path)` media paths in text → copies to workspace `cfly-captures` for preview |
| `image` / `audio` / `video` | `{ type, mimeType, data: "<base64>" }` | Decodes, writes to `cfly-captures`, previews in chat |
| `resource` | `{ type: "resource", resource: { mimeType, blob } }` | Routed by mime |

**Do not** insert `[[CFLY_MCP_IMAGE]]` or similar markers in text yourself (the client generates them).

Text path resolution order: `stdio.cwd` (= `plugin-mcp-output/<pluginId>`) → `CFLY_PLUGIN_MCP_OUTPUT_DIR` (usually same as cwd) → current workspace root. Supported extensions: `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg`, common audio (`.mp3` `.wav` …), video (`.mp4` `.webm` …).

When resolution succeeds and the file is within allowed bounds, the client **copies** it to the current workspace `cfly-captures/` (or `userData/cfly-captures/` if no workspace is open), **preserving the source filename** (auto `-2`, `-3` … on collision); then appends `[MCP image]` (or audio/video) and `[[CFLY_MCP_*]]` markers at the end of the tool result for chat preview and later tool references. Plugins only need to write files under `plugin-mcp-output` and reference them with Markdown links in text; use meaningful, low-collision filenames.

For screenshots, prefer returning `type: "image"` + base64; if already written to disk, use a Markdown link in text pointing to a path relative to `cwd` (e.g. `./shot.png`).

#### 4.4.3 `listTools` Input Schema

- Root type should be `object` + `properties`
- Do not rely on `$schema` / `$id` (the client strips them)
- For nullable fields use `anyOf` + `null` or `type: ["string","null"]` and other common patterns

### 4.5 Dependency Choices

- **Prefer pure JS** dependencies (e.g. `mysql2`) for a single **universal** zip package.
- Avoid native modules; otherwise package per OS/arch—wrong platform will fail connection tests.

---

## 5. Two-Layer Testing: MCP Test vs Service Probe

The client separates "pipeline health" from "external service reachability" in two layers. **Plugin authors must understand this and not mix them up.**

| Layer | User-facing button | What it verifies | What the plugin must do |
|----|----------------|----------|--------------|
| **MCP layer** | Card "Test connection" | Child process start, MCP handshake, `listTools` | `listTools` even when config is missing; **do not** connect to external services during listTools |
| **Service layer** | Settings "Verify service connection" | `callTool(probeTool)` validates credentials/connectivity | Declare `mcp.probeTool` in manifest; implement same-named tool in server |

### 5.1 Declaring a Probe

```json
{
  "mcp": {
    "probeTool": "test_connection"
  }
}
```

| Plugin | probeTool | Example behavior |
|------|-----------|----------|
| `cfly-mcp-demo` | `verify_api_key` | Local key length ≥8 |
| `cfly-mysql` | `test_connection` | Connect + `SELECT 1` |
| `cfly-mail` | `verify_mail` | SMTP/IMAP handshake |

Rules:

1. `probeTool` must **exactly match** the tool name registered in the server.
2. All probe logic lives **in the plugin server**; the client does not contain MySQL/mail etc. business code.
3. The probe tool can be reused in assistant chat (same implementation as settings).
4. The probe **does not** affect the "Ready" badge or enable switch; only MCP test success enables the plugin.
5. **Wrong password**: probe may fail while MCP test still succeeds (by design); credential issues surface when the assistant calls DB tools.

### 5.2 Probe Tool Return Format (Contract)

The client parses probe results as **bare JSON text** (no markdown code fence):

**Success**:

```json
{ "ok": true, "summary": "MySQL 8.0 @ 127.0.0.1:3306", "latencyMs": 42 }
```

**Failure** (business layer, e.g. wrong password):

```json
{ "ok": false, "message": "Access denied for user 'root'@'localhost'" }
```

Optional machine code field `error` (e.g. `connection_failed`); if `message` is absent the client falls back to `error`.

For business failures **do not throw**; use `isError: true` + the JSON above (see demo `verify_api_key`).

---

## 6. User Configuration and Save Flow

1. User opens "Configure" → fills form → [Optional] **Verify service connection** (may use **unsaved** draft)
2. **Save** → secrets encrypted to disk; non-secrets written to `pluginUserConfig`
3. After successful save, client automatically runs **MCP test connection**
4. On test success → "Ready" badge; user **manually** turns on the enable switch

While a probe is in flight the client disables save (avoids races); plugin authors need not handle this.

---

## 7. Optional `mcp` Section Fields

| Field | Purpose |
|------|------|
| `connectTimeoutMs` | Connection timeout |
| `listToolsTimeoutMs` | listTools timeout |
| `callToolIdleTimeoutMs` | Per-call idle wait for callTool |
| `callToolMaxTotalTimeoutMs` | Hard cap on total callTool duration |
| `toolTimeoutOverrides` | Per-tool overrides; value `{ "idleMs"?, "maxTotalMs"? }` (**do not** use `callToolMaxTotalTimeoutMs` as override key) |
| `allowedToolNames` | Filters `listTools` only; **does not** limit probe `callTool` |
| `probeTool` | Service probe tool name |

Long-running plugins (e.g. SQL) should declare larger `callToolMaxTotalTimeoutMs` and `maxTotalMs` overrides for tools like `run_query`.

---

## 8. Permissions `permissions`

Before installing a stdio plugin, the client shows a permission summary and requires user confirmation.

| Value | Meaning |
|----|------|
| `localProcess` | Start local Node child process (required for stdio) |
| `network` | Network access (remote MySQL, SMTP, HTTP API, etc.) |

Example for a database plugin: `["localProcess", "network"]`.

---

## 9. Transport Modes

### 9.1 stdio (Mode A, Recommended for Complex Plugins)

- Package **must** include `server/` + `node_modules`
- Config injected via `bindings.env`
- Client spawns built-in Node to run `runtime.entry`

### 9.2 streamableHttp (Mode B, HTTP Preset)

- Package **may omit** `server/`
- `http.urlTemplate` + `bindings.headers` resolved from user config
- Probe still uses `mcp.probeTool` (remote MCP implements the tool)
- For existing enterprise MCP gateway scenarios

---

## 10. Local Debugging

On your machine you can use **system Node** (recommended **22.x** to match the client's built-in version):

```bash
cd <pluginId>/server
npm install
export CFLY_DEMO_API_KEY=cfly-demo-2026   # Set per your env names
node index.js
# In another terminal: npx @modelcontextprotocol/inspector connect stdio
```

After debugging, always build a Release zip with `node_modules` per **§2.2** before importing into the client for acceptance.

---

## 11. Pre-Release Checklist

1. Release zip **includes** `server/node_modules` (`npm ci --omit=dev` before pack).
2. `config.fields` only contains connection parameters and safety switches; business interaction goes through MCP tools.
3. `bindings` placeholders match `fields` (or `{{pluginMcpOutputDir}}`); sensitive items use `type: secret`.
4. Process can still `listTools` when env is missing (§4.2).
5. Paginate/summarize large results; be aware of §4.4's 12k character truncation.
6. Declare appropriate timeouts in manifest for long tasks.
7. README documents permissions and data access scope; `permissions` is accurate.
8. When external dependencies exist, declare `mcp.probeTool` and implement the probe tool (§5).
9. Zip root directory name = `manifest.id`; version matches catalog.
10. Error messages **must not** contain passwords or full connection strings; logs must not write secrets.
11. Write runtime files to `CFLY_PLUGIN_MCP_OUTPUT_DIR` (§3.4.1); **do not** write to the install directory.
12. Screenshots/media: prefer `type: image` + base64, or Markdown relative to `cwd` in text; **do not** invent `[[CFLY_MCP_*]]` markers (§4.4.2).
13. When debugging locally, simulate §3.4.2 allowlist env.

---

## 12. Reference Implementations and Business Plugins

| Resource | Path |
|------|------|
| **Official reference plugin** | [cfly-mcp-demo/](./cfly-mcp-demo/) (manifest + probe `verify_api_key`) |
| **Browser automation** | CflyEdit plugin hub `cfly-playwright` (CFLY_PLUGIN_MCP_OUTPUT_DIR + screenshot preview; source not in this repo) |
| **Business plugins** | Each plugin's `README.md` (e.g. [cfly-mysql/README.md](./cfly-mysql/README.md)) |
| **Probe conventions** | See §5 in this guide (no other doc required) |

For new plugins: **copy the `cfly-mcp-demo` directory structure**, change `id`, fields, server logic, and tool list; put business details in that plugin's `README.md`.

---

## 13. Revision History

| Date | Notes |
|------|------|
| 2026-06-22 | Initial release: self-contained platform contract for plugin authors |
| 2026-06-22 | Removed references to monorepo internal docs; business specs point to per-plugin READMEs |
| 2026-06-25 | stdio `cwd` = `plugin-mcp-output`, absolute entry; §3.4.1 platform env/cwd; §4.4 media output |
| 2026-06-25 | §4.4.2: text media paths copied to workspace `cfly-captures` with source basename preserved |
