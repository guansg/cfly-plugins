---
name: cfly-mysql
description: >-
  Guide the assistant when using the CflyEdit MySQL MCP plugin: list schema first,
  then run guarded SQL with params. Use when the user asks about database tables,
  SQL queries, or MySQL data in CflyEdit chat.
---

# MySQL Plugin (Assistant)

When the user has enabled the **MySQL Query** (`cfly-mysql`) plugin:

## Recommended Flow

1. `list_databases` — see available databases (may skip `information_schema` etc.)
2. `list_tables` — pass `database` or use the user's default database
3. `describe_table` — confirm column names and types before writing SQL
4. `run_query` — **single** SQL statement; use `params` + `?` for values, never concatenate user input

## Constraints

- **Read-only by default**; `DELETE`/`UPDATE` may be rejected
- Do not try to change connection config; there is no `connect_db` tool
- Large result sets are limited by Server `LIMIT` and client ~12k char truncation; paginate for full data
- Without a default database, pass `database` to `list_tables` / `describe_table` / `run_query`

## Example

```text
list_tables database=myapp
describe_table table=users database=myapp
run_query sql="SELECT id, name FROM users WHERE status = ? LIMIT 10" params=["active"] database=myapp
```
