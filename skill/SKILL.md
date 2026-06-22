---
name: cflyedit-plugin
description: >-
  Guide Cursor when developing CflyEdit MCP plugins on the author's machine
  (cfly-plugin.json, stdio server, probe tools, pack to .cfly-plugin.zip).
  Use when creating cfly-mysql or other plugins, editing manifest,
  implementing mcp.probeTool, or packaging release zips.
---

# CflyEdit Plugin Development (Cursor Skill)

This skill is for **plugin authors** to install on their local Cursor instance while working in this repository.  
The full platform contract lives in [PLUGIN-AUTHOR-GUIDE.md](../PLUGIN-AUTHOR-GUIDE.md); this file only constrains Agent behavior.

## Read first (in order)

1. `PLUGIN-AUTHOR-GUIDE.md` — platform contract (**single source of truth**)
2. `cfly-mcp-demo/` — reference implementation (manifest + Server + probe)
3. Business plugins (if any): `<pluginId>/README.md` (e.g. `cfly-mysql/README.md`)

**Scope**: change only plugin directories in this repo. Put business logic in the plugin MCP Server; do not assume the CflyEdit client will special-case your `pluginId`.

## New plugin workflow

1. **Copy** `cfly-mcp-demo/` to `<pluginId>/`
2. Edit `cfly-plugin.json`: `id`, `version`, `config`, `permissions`, `mcp.probeTool`
3. Implement `server/index.js` (and `server/lib/*` if needed)
4. `cd <pluginId>/server && npm ci --omit=dev`
5. From repo root: `zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/`

## Hard rules (acceptance fails if violated)

| Rule | Detail |
|------|--------|
| zip includes `node_modules` | **Required** for stdio Release; CflyEdit client does not run npm for users |
| Single root folder | Zip root folder name = `manifest.id` |
| Missing config → no exit | Process must stay up so **Test connection** (`listTools`) can succeed |
| No `.env` | Config only via `bindings` → env injection |
| `secret` fields | `type: "secret"`; Server reads env; never log plaintext |
| Two-layer testing | Card test = MCP pipeline; `mcp.probeTool` = external service; **do not** hit external services in `listTools` |
| Probe JSON | `{ ok, summary?, latencyMs? }` or `{ ok:false, message? }` as raw JSON text |
| 12k truncation | Assistant truncates callTool text at ~12,000 chars; Server should limit rows/summary |
| `toolTimeoutOverrides` | Keys must be `idleMs` / `maxTotalMs` only |

## Startup strategy template

```javascript
// Read env; do not process.exit(1) when required fields are missing
// listTools must always work
// In tools: incomplete config → return JSON { ok: false, message: '...' }
// Probe tool: same pattern as verify_api_key (cfly-mcp-demo/server/index.js)
```

## Probe tool reference

See `cfly-mcp-demo/server/index.js` → `verify_api_key`:

- Success: `{ ok: true, summary: '...', latencyMs: N }`
- Failure: `{ ok: false, message: '...' }` + optional `isError: true`
- **Do not throw** for business failures

## Pack commands

From repository root:

```bash
cd <pluginId>/server && npm ci --omit=dev
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

## Business plugins

- Read `<pluginId>/README.md`
- Platform rules: `PLUGIN-AUTHOR-GUIDE.md` + this skill

## Output checklist

- [ ] `cfly-plugin.json` aligns with `fields` / `bindings` / `required`
- [ ] `permissions` includes `localProcess` (stdio) and `network` if needed
- [ ] If external deps exist, `mcp.probeTool` tool is implemented with the same name
- [ ] Plugin README has connection examples and security notes
- [ ] Release zip contains `server/node_modules`

See `PLUGIN-AUTHOR-GUIDE.md` for full details.
