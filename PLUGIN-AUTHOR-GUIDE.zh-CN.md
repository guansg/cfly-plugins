[English](./PLUGIN-AUTHOR-GUIDE.md) | 中文（本文）

# CflyEdit 插件开发指南

本文档面向 **插件作者**（官方与第三方），定义 CflyEdit 插件平台的 **契约与约定**。  
开发时以 **本文 + [cfly-mcp-demo](./cfly-mcp-demo/) 参考实现** 为准即可；本文已包含所需的全部平台约定。

---

## 1. 插件是什么

**[CflyEdit](https://cflyedit.com)** 是插件的运行宿主。CflyEdit 插件 = **一份 `cfly-plugin.json` 清单** + **一个 MCP Server**（通常为本地 stdio 子进程），由客户端安装、配置、启停，并在 **助手对话** 中通过 MCP 工具暴露能力。

```
用户安装 zip
  → 客户端解压到用户数据目录
  → 设置页配置表单 → bindings 注入 env / headers
  → [可选] 配置区「验证服务连接」（探针）
  → 保存 → 卡片「测试连接」（MCP listTools）
  → 用户启用 → 助手 callTool
```

**插件作者负责**：manifest、MCP Server 业务逻辑、Release zip（含 `node_modules`）。  
**客户端负责**：安装、配置 UI、secrets 加密存储、stdio 拉起（内置 Node）、探针/MCP 测试 IPC、工具名映射与结果截断。

---

## 2. 包结构

### 2.1 源码目录（建议）

```
<pluginId>/
├── cfly-plugin.json      # 清单（必填）
├── assets/
│   └── icon.svg          # 推荐 128×128
├── server/
│   ├── index.js          # MCP 入口（ESM，package.json 须 "type": "module"）
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/     # Release 前 npm ci --omit=dev 产出
└── README.md
```

### 2.2 Release zip 约定

- 文件名：`<pluginId>-<version>.cfly-plugin.zip`
- zip 内 **单层根目录** = `manifest.id`（例如 `cfly-mysql/`）
- **必须**含 `server/node_modules/`（stdio 插件）；客户端 **不会**为用户执行 `npm install`
- **禁止** zip 内含 `.env`、符号链接、路径穿越（`..`）

在本仓库打包：

```bash
cd <pluginId>/server && npm ci --omit=dev
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

---

## 3. `cfly-plugin.json` 字段参考

`schemaVersion` 当前仅支持 **1**。

### 3.1 顶层字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 稳定插件 ID（slug），与 zip 根目录名、Hub catalog `slug` 一致 |
| `name` | 是 | 展示名称 |
| `version` | 是 | semver |
| `description` | 建议 | i18n：`{ "zh-CN": "...", "en-US": "..." }` |
| `icon` | 否 | 相对路径，如 `assets/icon.svg` |
| `transport` | 是 | `stdio` 或 `streamableHttp` |
| `runtime` | stdio 必填 | 见下表 |
| `http` | HTTP 必填 | `{ "urlTemplate": "https://...{{key}}..." }` |
| `config` | 视插件 | 用户配置表单 |
| `permissions` | 建议 | 安装前向用户展示，见 §8 |
| `mcp` | 否 | 超时、探针、工具白名单，见 §7 |

### 3.2 `runtime`（stdio）

| 字段 | 说明 |
|------|------|
| `entry` | 相对插件根，如 `server/index.js` |
| `args` | 追加参数，默认 `[]` |
| `requires.node` | 建议 `">=22"`，与客户端内置 Node 主版本对齐 |
| `bundleDependencies` | 建议 `true` |

**不要**在 manifest 写 `"command": "node"`。客户端使用 **内置 Node** 启动子进程。

### 3.3 `config` 表单

| 字段 | 说明 |
|------|------|
| `fields[]` | 每个用户可填项一条；`type`: `string` \| `number` \| `boolean` \| `secret` \| `select` |
| `required[]` | 必填 field 的 `key` 列表，须为 `fields[].key` 的子集 |
| `bindings` | 映射到 `env`（stdio）和/或 `headers`（HTTP） |
| `presets` | 可选；`select` 变更时客户端联动填充其它字段（见 §3.3.1） |

**官方约定**：

1. 有几个输入就在 `fields` 里声明几个。
2. `bindings` 中每个 `{{key}}` 必须在 `fields` 中存在。
3. 密码、API Key 等用 `type: "secret"`；客户端加密存储，**不回显明文**。
4. `fields[].default` 仅作表单默认值；**不算**「用户已填写」。

### 3.3.1 `config.presets`（select 联动填充）

当某 `select` 字段（如 `providerPreset`）切换选项时，客户端自动把关联字段写入配置表单：

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

- 键名须为 `fields` 中 `type: "select"` 的 `key`。
- 内层键须为该 select 的 `options[].value`。
- 值对象中的 key 须在 `fields` 中声明。
- Server 仍可保留运行时兜底（表单留空也能连）；`presets` 负责 **UI 可见填充**。

参考实现：`cfly-mail`。

### 3.4 bindings 与 env 注入

占位符 `{{fieldKey}}` 在运行时替换为配置值（number/boolean 会转为 **字符串** 写入 env）。

```json
"bindings": {
  "env": {
    "CFLY_MYSQL_HOST": "{{host}}",
    "CFLY_MYSQL_READONLY": "{{readonly}}"
  }
}
```

Server 侧须自行解析：`"true"` / `"false"` → boolean，`"3306"` → number。

**禁止**在插件包内使用 `.env` 文件；配置 **仅**来自客户端注入。

---

## 4. MCP Server 开发约定

### 4.1 协议与 SDK

按 [Model Context Protocol](https://modelcontextprotocol.io/) 实现。推荐 `@modelcontextprotocol/sdk` + `McpServer` + `StdioServerTransport`（见 `cfly-mcp-demo/server/index.js`）。

### 4.2 启动策略（重要）

**缺必填配置时，进程不要 `exit(1)`。**

- 「待配置」阶段客户端仍会 **测试连接**（`listTools`），进程必须能起来并列出工具。
- 业务校验（连数据库、验密码等）放在 **工具调用时** 或 **探针 tool** 中，返回结构化 JSON 错误，**不要 throw 导致进程退出**。

### 4.3 工具命名（助手侧）

MCP 原生工具名由你在 Server 注册（如 `run_query`）。  
助手对话中映射为：

```text
cfly_mcp_<serverId>__<toolName>
```

`serverId` 由 `manifest.id` 规范化得到（非法字符变 `_`，最长约 40 字符，**连字符保留**）。  
例：`pluginId` `cfly-mcp-demo` → `cfly_mcp_cfly-mcp-demo__ping`。

### 4.4 工具返回格式

- 推荐：`content: [{ type: "text", text: "<JSON 字符串>" }]`
- 业务失败：JSON 内 `{ "ok": false, "message": "..." }`，必要时 `isError: true`
- **单次结果**在客户端约 **12,000 字符**处截断（所有 MCP 插件共用）。大结果集请在 Server 内 `LIMIT`、分页或摘要，并标注 `truncated: true`。

### 4.5 依赖选型

- **优先纯 JS** 依赖（如 `mysql2`），便于打 **universal** 单包 zip。
- 避免 native 模块；否则须按 OS/架构分包，装错平台时测试连接会失败。

---

## 5. 双层测试：MCP 测试 vs 服务探针

客户端将「管线健康」与「外部服务可达」分为两层，**插件作者须理解，勿混用**。

| 层 | 用户看到的按钮 | 验证什么 | 插件要做什么 |
|----|----------------|----------|--------------|
| **MCP 层** | 卡片「测试连接」 | 子进程启动、MCP 握手、`listTools` | 缺配置也能 `listTools`；**不要**在 listTools 时连外部服务 |
| **服务层** | 配置区「验证服务连接」 | `callTool(probeTool)` 验凭据/连通性 | manifest 声明 `mcp.probeTool`，Server 实现同名 tool |

### 5.1 声明探针

```json
{
  "mcp": {
    "probeTool": "test_connection"
  }
}
```

| 插件 | probeTool | 行为示例 |
|------|-----------|----------|
| `cfly-mcp-demo` | `verify_api_key` | 本地 Key 长度 ≥8 |
| `cfly-mysql` | `test_connection` | 建连 + `SELECT 1` |
| `cfly-mail` | `verify_mail` | SMTP/IMAP 握手 |

规则：

1. `probeTool` 必须与 Server 注册的 tool 名 **完全一致**。
2. 探针逻辑 **全部在插件 Server**；客户端不写 MySQL/邮件等业务代码。
3. 探针 tool 可在助手对话中复用（与配置区同一实现）。
4. 探针 **不参与**「已就绪」角标与启用开关；仅 MCP 测试成功才可启用。
5. **密码错时**：探针可失败，MCP 测试仍可能成功（刻意设计）；助手调 DB 工具时才会暴露凭据问题。

### 5.2 探针 tool 返回格式（契约）

客户端解析探针结果为 **裸 JSON text**（不要 markdown 代码块包裹）：

**成功**：

```json
{ "ok": true, "summary": "MySQL 8.0 @ 127.0.0.1:3306", "latencyMs": 42 }
```

**失败**（业务层，如密码错）：

```json
{ "ok": false, "message": "Access denied for user 'root'@'localhost'" }
```

可选机器码字段 `error`（如 `connection_failed`）；无 `message` 时客户端会 fallback 到 `error`。

业务失败 **勿 throw**；可用 `isError: true` + 上述 JSON（参考 demo `verify_api_key`）。

---

## 6. 用户配置与保存流程

1. 用户打开「配置」→ 填写表单 → [可选] **验证服务连接**（可用 **未保存** 的草稿）
2. **保存** → secrets 加密落盘，非 secret 写入 `pluginUserConfig`
3. 保存成功后客户端自动 **MCP 测试连接**
4. 测试成功 → 角标「已就绪」；用户 **手动** 开启用开关

探针 in-flight 时客户端会禁用保存（避免竞态）；插件作者无需处理。

---

## 7. `mcp` 段可选字段

| 字段 | 用途 |
|------|------|
| `connectTimeoutMs` | 建连超时 |
| `listToolsTimeoutMs` | listTools 超时 |
| `callToolIdleTimeoutMs` | callTool 单次空闲等待 |
| `callToolMaxTotalTimeoutMs` | callTool 总时长硬顶 |
| `toolTimeoutOverrides` | 按 tool 名覆盖；值为 `{ "idleMs"?, "maxTotalMs"? }`（**勿**写 `callToolMaxTotalTimeoutMs` 作 override 键） |
| `allowedToolNames` | 仅 `listTools` 过滤；**不**限制探针 `callTool` |
| `probeTool` | 服务探针工具名 |

长查询类插件（如 SQL）建议在 manifest 声明较大 `callToolMaxTotalTimeoutMs` 及对 `run_query` 的 `maxTotalMs` override。

---

## 8. 权限 `permissions`

安装 stdio 插件前，客户端展示权限摘要并要求用户确认。

| 值 | 含义 |
|----|------|
| `localProcess` | 启动本地 Node 子进程（stdio **必填**） |
| `network` | 访问网络（连远程 MySQL、SMTP、HTTP API 等） |

示例：数据库插件 `["localProcess", "network"]`。

---

## 9. transport 模式

### 9.1 stdio（模式 A，推荐复杂插件）

- 包内 **必须有** `server/` + `node_modules`
- 配置经 `bindings.env` 注入
- 客户端 spawn 内置 Node 执行 `runtime.entry`

### 9.2 streamableHttp（模式 B，HTTP Preset）

- 包内 **可无** `server/`
- `http.urlTemplate` + `bindings.headers` 由用户配置解析
- 探针同样走 `mcp.probeTool`（远端 MCP 实现 tool）
- 适用已有企业 MCP 网关的场景

---

## 10. 本地调试

开发者本机可用 **系统 Node**（建议 **22.x** 与客户端内置版本对齐）：

```bash
cd <pluginId>/server
npm install
export CFLY_DEMO_API_KEY=cfly-demo-2026   # 按你的 env 名设置
node index.js
# 另开终端：npx @modelcontextprotocol/inspector 连接 stdio
```

调试通过后，务必用 **§2.2** 流程打含 `node_modules` 的 Release zip 再导入客户端验收。

---

## 11. 上架前检查清单

1. Release zip **已含** `server/node_modules`（`npm ci --omit=dev` 后再 pack）。
2. `config.fields` 只含连接参数与安全开关；业务交互走 MCP 工具。
3. `bindings` 占位符与 `fields` 一致；敏感项 `type: secret`。
4. 缺 env 时进程仍可 `listTools`（§4.2）。
5. 大结果分页/摘要；知晓 §4.4 的 12k 字符截断。
6. 长任务在 manifest 声明合适超时。
7. README 写明权限与数据访问范围；`permissions` 准确。
8. 有外部依赖时声明 `mcp.probeTool` 并实现探针 tool（§5）。
9. zip 根目录名 = `manifest.id`；版本与 catalog 一致。
10. 错误信息 **不含** 密码、完整连接串；日志不写 secret。

---

## 12. 参考实现与业务插件

| 资源 | 路径 |
|------|------|
| **官方参考插件** | [cfly-mcp-demo/](./cfly-mcp-demo/)（manifest + 探针 `verify_api_key`） |
| **业务插件** | 各插件目录下的 `README.md`（如 [cfly-mysql/README.md](./cfly-mysql/README.md)） |
| **探针约定** | 见本文 §5（无需另读其他文档） |

新插件建议：**复制 `cfly-mcp-demo` 目录结构**，改 `id`、字段、Server 逻辑与工具列表；业务细节写入本插件目录的 `README.md`。

---

## 13. 交流与讨论

开发插件过程中如有问题，欢迎加入 QQ 群交流：

- **群名称**：Cfly插件讨论
- **群号**：1019597508

![Cfly插件讨论群](./qqcord.png)

---

## 14. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-22 | 初版：平台契约自给自足，供插件作者使用 |
| 2026-06-22 | 移除对 monorepo 内部文档的引用，业务规格改指各插件 README |
