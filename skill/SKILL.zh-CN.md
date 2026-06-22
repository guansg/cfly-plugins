---
name: cflyedit-plugin
description: >-
  Guide Cursor when developing CflyEdit MCP plugins on the author's machine
  (cfly-plugin.json, stdio server, probe tools, pack to .cfly-plugin.zip).
  Use when creating cfly-mysql or other plugins, editing manifest,
  implementing mcp.probeTool, or packaging release zips.
---

# CflyEdit 插件开发（Cursor Skill）

本 skill 供**插件作者**安装到本机 Cursor，在本仓库内开发插件时使用。  
完整契约以 [PLUGIN-AUTHOR-GUIDE.zh-CN.md](../PLUGIN-AUTHOR-GUIDE.zh-CN.md) 为准，本文件仅约束 Agent 行为要点。

## 必读（按顺序）

1. `PLUGIN-AUTHOR-GUIDE.zh-CN.md` — 平台契约（**单一真相**）
2. `cfly-mcp-demo/` — 参考实现（manifest + Server + 探针）
3. 业务插件（若适用）：`<pluginId>/README.md`（如 `cfly-mysql/README.md`）

**工作范围**：仅在本仓库的插件目录内修改；业务逻辑写在插件 MCP Server，不假设客户端会对特定 `pluginId` 做定制。

## 新插件工作流

1. **复制** `cfly-mcp-demo/` 为 `<pluginId>/`
2. 修改 `cfly-plugin.json`：`id`、`version`、`config`、`permissions`、`mcp.probeTool`
3. 实现 `server/index.js`（及 `server/lib/*` 若业务复杂）
4. `cd <pluginId>/server && npm ci --omit=dev`
5. 在仓库根目录：`zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/`

## 硬规则（违反会导致验收失败）

| 规则 | 说明 |
|------|------|
| zip 含 `node_modules` | stdio 插件 Release **必须**；CflyEdit 客户端不帮用户跑 npm |
| 单层根目录 | zip 内根文件夹名 = `manifest.id` |
| 缺配置不 exit | 保证 `listTools` / 卡片「测试连接」可成功 |
| 无 `.env` | 配置仅来自 `bindings` 注入的 env |
| secret 字段 | `type: "secret"`；Server 从 env 读，日志不写明文 |
| 双层测试 | 卡片测试 = MCP 管线；`mcp.probeTool` = 外部服务；**勿**在 listTools 连外部服务 |
| 探针 JSON | `{ ok, summary?, latencyMs? }` 或 `{ ok:false, message? }` 裸 JSON text |
| 12k 截断 | 助手侧单次 callTool 结果约 12000 字符；Server 控行数/摘要 |
| `toolTimeoutOverrides` | 仅 `idleMs` / `maxTotalMs` 键名 |

## 启动策略模板

```javascript
// 读 env；缺必填时不 process.exit(1)
// listTools 始终可用
// 工具内：配置不全 → 返回 JSON { ok: false, message: '...' }
// 探针 tool：同 verify_api_key 模式（cfly-mcp-demo/server/index.js）
```

## 探针 tool 参考

见 `cfly-mcp-demo/server/index.js` → `verify_api_key`：

- 成功：`{ ok: true, summary: '...', latencyMs: N }`
- 失败：`{ ok: false, message: '...' }` + 可选 `isError: true`
- **勿 throw** 表业务失败

## 打包命令

在**仓库根目录**：

```bash
cd <pluginId>/server && npm ci --omit=dev
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

## 业务插件

- 阅读 `<pluginId>/README.md`
- 平台硬规则以 `PLUGIN-AUTHOR-GUIDE.zh-CN.md` 与本 skill 为准

## 输出检查

- [ ] `cfly-plugin.json` 与 `fields` / `bindings` / `required` 一致
- [ ] `permissions` 含 `localProcess`（stdio）及所需 `network`
- [ ] 有外部依赖时已实现 `mcp.probeTool` 同名 tool
- [ ] 插件 README 含连接示例与安全说明
- [ ] Release zip 含 `server/node_modules`

详细说明见 `PLUGIN-AUTHOR-GUIDE.zh-CN.md`。
