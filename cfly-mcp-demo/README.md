# cfly-mcp-demo

> Requires **[CflyEdit](https://cflyedit.com)** — install the plugin from the in-app plugin hub.

Official **reference plugin** for the CflyEdit plugin hub (stdio / bundled Node). Validates the full flow: install → configure → [optional] probe → MCP test → assistant call. No external network required.

Platform contract: **[Plugin Author Guide](../PLUGIN-AUTHOR-GUIDE.md)** ([中文](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)).

## Tools

| Tool | Params | Behavior |
|------|--------|----------|
| `ping` | none | Returns `ok`, `at`, `pluginVersion`; includes `pid` when `verbosity=verbose` |
| `verify_config` | none | Returns `configured`, `nickname`, `verbosity`, masked `apiKeyPreview` |
| `verify_api_key` | none | **Probe tool** (`mcp.probeTool`): key length ≥8 → `{ ok, summary, latencyMs }`; else `{ ok:false, message }` |
| `echo` | `message: string` | When key valid: `[{nickname}] {message}`; else error |

## Config Fields (`cfly-plugin.json` → `config.fields`)

| key | type | required | env |
|-----|------|----------|-----|
| `apiKey` | secret | yes | `CFLY_DEMO_API_KEY` |
| `nickname` | string | no | `CFLY_DEMO_NICKNAME` |
| `verbosity` | select | no | `CFLY_DEMO_VERBOSITY` |

> Key validation: length ≥ 8 is valid (for testing, e.g. `cfly-demo-2026`).

## Official Conventions

1. Declare every input in `config.fields`.
2. List required keys in `config.required`; use `type: "secret"` for secrets.
3. Every `{{key}}` in `bindings` must exist in `fields`.
4. **Release zip must include `server/node_modules`** (run `npm ci --omit=dev` before pack); users do not need Node.js installed.
5. stdio plugins: `permissions` must include `localProcess`.
6. Do **not** put `"command": "node"` in manifest; client injects bundled Node at runtime.
7. Missing key must **not** exit the process — "Test connection" `listTools` must succeed; validate in tools / probe.

## Local Debugging (System Node, Optional)

```bash
cd server
npm install
CFLY_DEMO_API_KEY=cfly-demo-2026 CFLY_DEMO_NICKNAME=test node index.js
# In another terminal: npx @modelcontextprotocol/inspector connect stdio
```

## Packaging Release Zip

From repository root:

```bash
cd cfly-mcp-demo/server && npm ci --omit=dev
cd ..
zip -r cfly-mcp-demo-1.1.0.cfly-plugin.zip cfly-mcp-demo/
```

> Zip must have a single root folder `cfly-mcp-demo/` containing `server/node_modules/`.

---

# cfly-mcp-demo

> 需配合 **[CflyEdit](https://cflyedit.com)** 使用 —— 在客户端插件广场安装本插件。

CflyEdit 插件广场的**官方参考插件**（stdio / 内置 Node 运行）。用于验证「安装 → 配置 → [可选] 探针 → MCP 测试 → 助手调用」全链路，无需外网。

平台契约见 **[插件开发指南](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)**（[English](../PLUGIN-AUTHOR-GUIDE.md)）。

## 工具

| 工具 | 参数 | 行为 |
|------|------|------|
| `ping` | 无 | 返回 `ok`、`at`、`pluginVersion`；`verbosity=verbose` 时附带 `pid` |
| `verify_config` | 无 | 返回 `configured`、`nickname`、`verbosity`、`apiKeyPreview`（掩码） |
| `verify_api_key` | 无 | **探针 tool**（`mcp.probeTool`）：Key 长度 ≥8 → `{ ok, summary, latencyMs }`；否则 `{ ok:false, message }` |
| `echo` | `message: string` | Key 有效时返回 `[{nickname}] {message}`；Key 无效返回错误 |

## 配置字段（`cfly-plugin.json` → `config.fields`）

| key | type | 必填 | 注入 env |
|-----|------|------|----------|
| `apiKey` | secret | 是 | `CFLY_DEMO_API_KEY` |
| `nickname` | string | 否 | `CFLY_DEMO_NICKNAME` |
| `verbosity` | select | 否 | `CFLY_DEMO_VERBOSITY` |

> Key 校验规则：长度 ≥ 8 视为有效（测试用，如 `cfly-demo-2026`）。

## 官方约定

1. 有几个输入就在 `config.fields` 声明几个。
2. `config.required` 列出必填 key；secret 用 `type: "secret"`。
3. `bindings` 里每个 `{{key}}` 必须在 `fields` 中存在。
4. **交给客户端的 zip 必须含 `server/node_modules`**（先 `npm ci --omit=dev` 再 pack）；用户无需安装 Node.js。
5. stdio 插件 `permissions` 须含 `localProcess`。
6. manifest **不写** `"command": "node"`，运行时由客户端注入内置 Node。
7. 缺 Key 时进程 **不 exit**，保证「测试连接」`listTools` 可成功；校验放在工具 / 探针内。

## 本地调试（系统 Node，可选）

```bash
cd server
npm install
CFLY_DEMO_API_KEY=cfly-demo-2026 CFLY_DEMO_NICKNAME=test node index.js
# 另开终端：npx @modelcontextprotocol/inspector 连接 stdio
```

## 打包 Release zip

在**仓库根目录**：

```bash
cd cfly-mcp-demo/server && npm ci --omit=dev
cd ..
zip -r cfly-mcp-demo-1.1.0.cfly-plugin.zip cfly-mcp-demo/
```

> zip 内单层根目录必须为 `cfly-mcp-demo/`，且含 `server/node_modules/`。
