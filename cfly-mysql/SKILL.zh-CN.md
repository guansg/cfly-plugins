---
name: cfly-mysql
description: >-
  Guide the assistant when using the CflyEdit MySQL MCP plugin: list schema first,
  then run guarded SQL with params. Use when the user asks about database tables,
  SQL queries, or MySQL data in CflyEdit chat.
---

# MySQL 插件（助手）

用户已启用 **MySQL 查询**（`cfly-mysql`）插件时：

## 推荐流程

1. `list_databases` — 了解有哪些库（可忽略 `information_schema` 等系统库）
2. `list_tables` — 传 `database` 或使用用户配置的默认库
3. `describe_table` — 确认列名与类型后再写 SQL
4. `run_query` — **单条** SQL；条件值用 `params` + `?`，不要拼接用户输入

## 约束

- 默认 **只读**；`DELETE`/`UPDATE` 可能被拒绝
- 不要尝试修改连接配置；无 `connect_db` 工具
- 大结果集已被 Server `LIMIT` 与客户端 ~12k 字符截断；需要全量数据请分页查询
- 无默认库时，`list_tables` / `describe_table` / `run_query` 需传 `database`

## 示例

```text
list_tables database=myapp
describe_table table=users database=myapp
run_query sql="SELECT id, name FROM users WHERE status = ? LIMIT 10" params=["active"] database=myapp
```
