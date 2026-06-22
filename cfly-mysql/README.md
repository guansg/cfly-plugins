# cfly-mysql

> Requires **[CflyEdit](https://cflyedit.com)** — install the plugin from the in-app plugin hub.

Official **MySQL query plugin** for CflyEdit (stdio / bundled Node). Connects to user-configured MySQL/MariaDB, browses schema, and runs guarded SQL. **Read-only by default**.

Platform contract: **[Plugin Author Guide](../PLUGIN-AUTHOR-GUIDE.md)** ([中文](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)).

## Tools

| Tool | Params | Behavior |
|------|--------|----------|
| `ping` | none | Plugin version and config summary (no password) |
| `test_connection` | none | **Probe tool**: connect + `SELECT 1` → `{ ok, summary, latencyMs }` |
| `list_databases` | none | `SHOW DATABASES` |
| `list_tables` | `database?` | Tables in given or default database |
| `describe_table` | `table`, `database?` | Column and index summary |
| `run_query` | `sql`, `params?`, `database?`, `maxRows?` | Single guarded SQL; `params` bind `?` |

## Config (`cfly-plugin.json`)

| key | required | notes |
|-----|----------|-------|
| `host` | ✅ | IP, hostname, or Unix socket path |
| `username` | ✅ | |
| `password` | ❌ | Empty for local no-password DB |
| `port` | ❌ | Default 3306 |
| `database` | ❌ | Default database; may be empty |
| `readonly` | ❌ | Default `true` |
| `maxRows` | ❌ | Default 200, cap 1000 |
| `ssl` | ❌ | v1: system CA only, no custom CA path |

## Security Recommendations

- **Production**: read replica + `readonly=true` + minimal-privilege MySQL user (`SELECT` / `SHOW VIEW` only).
- **Dev writes**: separate schema + non-root user; disable readonly only when necessary.
- With readonly off, assistant may run `INSERT`/`UPDATE`/`DELETE`; DDL rejected by default in v1.

## Local Development

### Debug MCP Server

```bash
cd server
npm install
export CFLY_MYSQL_HOST=127.0.0.1
export CFLY_MYSQL_PORT=3306
export CFLY_MYSQL_USER=root
export CFLY_MYSQL_PASSWORD=root
export CFLY_MYSQL_DATABASE=appdb
node index.js
# In another terminal: npx @modelcontextprotocol/inspector
```

### Unit Tests

```bash
cd server && npm test
```

## Packaging

From repository root:

```bash
cd cfly-mysql/server && npm ci --omit=dev
cd ..
zip -r cfly-mysql-1.0.0.cfly-plugin.zip cfly-mysql/
```

---

# cfly-mysql

> 需配合 **[CflyEdit](https://cflyedit.com)** 使用 —— 在客户端插件广场安装本插件。

CflyEdit **官方 MySQL 查询插件**（stdio / 内置 Node）。连接用户配置的 MySQL/MariaDB，浏览库表并执行受控 SQL。**默认只读**。

平台契约见 **[插件开发指南](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)**（[English](../PLUGIN-AUTHOR-GUIDE.md)）。

## 工具

| 工具 | 参数 | 行为 |
|------|------|------|
| `ping` | 无 | 插件版本与配置摘要（不含密码） |
| `test_connection` | 无 | **探针 tool**：建连 + `SELECT 1` → `{ ok, summary, latencyMs }` |
| `list_databases` | 无 | `SHOW DATABASES` |
| `list_tables` | `database?` | 指定库或默认库下的表列表 |
| `describe_table` | `table`, `database?` | 列与索引摘要 |
| `run_query` | `sql`, `params?`, `database?`, `maxRows?` | 单条受控 SQL；`params` 绑定 `?` |

## 配置（`cfly-plugin.json`）

| key | 必填 | 说明 |
|-----|------|------|
| `host` | ✅ | IP、域名或 Unix socket 路径 |
| `username` | ✅ | |
| `password` | ❌ | 无密码本地库可留空 |
| `port` | ❌ | 默认 3306 |
| `database` | ❌ | 默认库，可留空 |
| `readonly` | ❌ | 默认 `true` |
| `maxRows` | ❌ | 默认 200，上限 1000 |
| `ssl` | ❌ | v1 无自定义 CA |

## 安全建议

- **生产**：只读从库 + `readonly=true` + 最小权限 MySQL 账号（仅 `SELECT` / `SHOW VIEW`）。
- **开发写操作**：独立 schema + 非 root；仅在必要时关闭只读。
- 关闭只读后助手可能执行 `INSERT`/`UPDATE`/`DELETE`；DDL 在 v1 默认拒绝。

## 本地开发

### 调试 MCP Server

```bash
cd server
npm install
export CFLY_MYSQL_HOST=127.0.0.1
export CFLY_MYSQL_PORT=3306
export CFLY_MYSQL_USER=root
export CFLY_MYSQL_PASSWORD=root
export CFLY_MYSQL_DATABASE=appdb
node index.js
# 另开终端：npx @modelcontextprotocol/inspector
```

### 单元测试

```bash
cd server && npm test
```

## 打包

在**仓库根目录**：

```bash
cd cfly-mysql/server && npm ci --omit=dev
cd ..
zip -r cfly-mysql-1.0.0.cfly-plugin.zip cfly-mysql/
```
