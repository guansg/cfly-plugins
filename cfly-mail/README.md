# cfly-mail

> Requires **[CflyEdit](https://cflyedit.com)** — install the plugin from the in-app plugin hub.

Official **mail plugin** for CflyEdit (stdio / bundled Node). Send via SMTP, receive via IMAP — list unread, read body, search, and send mail.

Platform contract: **[Plugin Author Guide](../PLUGIN-AUTHOR-GUIDE.md)** ([中文](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)).

## Tools

| Tool | Params | Behavior |
|------|--------|----------|
| `ping` | none | Plugin version and config summary (no password) |
| `verify_mail` | none | **Probe tool**: SMTP verify + IMAP connect → `{ ok, summary, latencyMs }` |
| `list_mailboxes` | none | List IMAP folders |
| `list_messages` | `mailbox?`, `limit?`, `unreadOnly?`, `since?` | Message summaries (**newest first**, default last 90 days) |
| `get_message` | `uid`, `mailbox?`, `includeBody?` | Single message detail (body truncated) |
| `search_messages` | `criteria`, `mailbox?`, `limit?` | Structured search (not raw IMAP syntax) |
| `send_email` | `to`, `subject`, `body`, `html?`, … | Send mail (From fixed to configured email) |

## Config (`cfly-plugin.json`)

| key | required | notes |
|-----|----------|-------|
| `email` | ✅ | Email address |
| `password` | ✅ | SMTP/IMAP app password (not web login password) |
| `providerPreset` | ❌ | `qq` / `163` / `gmail` / `outlook` / `custom` |
| `smtpHost` / `imapHost` | ❌* | Preset can auto-fill |
| `maxListMessages` | ❌ | Default 30 |
| `maxBodyChars` | ❌ | Default 12000 |

## Security Recommendations

- Use a **dedicated mailbox or sub-account**; message bodies enter assistant context.
- QQ/163/Gmail etc. require enabling SMTP/IMAP and generating an **app password**.
- v1: no attachment sending; receive returns attachment metadata only.

## Local Development

```bash
cd server
npm install
export CFLY_MAIL_EMAIL=you@example.com
export CFLY_MAIL_PASSWORD=your-app-password
export CFLY_MAIL_PROVIDER=qq
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
cd cfly-mail/server && npm ci --omit=dev
cd ..
zip -r cfly-mail-1.0.2.cfly-plugin.zip cfly-mail/
```

---

# cfly-mail

> 需配合 **[CflyEdit](https://cflyedit.com)** 使用 —— 在客户端插件广场安装本插件。

CflyEdit **官方邮件插件**（stdio / 内置 Node）。通过 SMTP 发信、IMAP 收信，支持查未读、读正文、搜索与发送。

平台契约见 **[插件开发指南](../PLUGIN-AUTHOR-GUIDE.zh-CN.md)**（[English](../PLUGIN-AUTHOR-GUIDE.md)）。

## 工具

| 工具 | 参数 | 行为 |
|------|------|------|
| `ping` | 无 | 插件版本与配置摘要（不含密码） |
| `verify_mail` | 无 | **探针 tool**：SMTP verify + IMAP connect → `{ ok, summary, latencyMs }` |
| `list_mailboxes` | 无 | 列出 IMAP 文件夹 |
| `list_messages` | `mailbox?`, `limit?`, `unreadOnly?`, `since?` | 邮件摘要列表（**按日期降序**，默认近 90 天） |
| `get_message` | `uid`, `mailbox?`, `includeBody?` | 单封详情（正文截断） |
| `search_messages` | `criteria`, `mailbox?`, `limit?` | 结构化搜索（非 IMAP 原生语法） |
| `send_email` | `to`, `subject`, `body`, `html?`, … | 发送邮件（From 固定为配置邮箱） |

## 配置（`cfly-plugin.json`）

| key | 必填 | 说明 |
|-----|------|------|
| `email` | ✅ | 邮箱地址 |
| `password` | ✅ | SMTP/IMAP 授权码（非网页登录密码） |
| `providerPreset` | ❌ | `qq` / `163` / `gmail` / `outlook` / `custom` |
| `smtpHost` / `imapHost` | ❌* | 预设可自动填充 |
| `maxListMessages` | ❌ | 默认 30 |
| `maxBodyChars` | ❌ | 默认 12000 |

## 安全建议

- 使用 **专用邮箱或子账号**；邮件正文会进入助手上下文。
- QQ/163/Gmail 等须在邮箱设置中开启 SMTP/IMAP 并生成 **授权码**。
- v1 不支持附件发送；收信仅返回附件 metadata。

## 本地开发

```bash
cd server
npm install
export CFLY_MAIL_EMAIL=you@example.com
export CFLY_MAIL_PASSWORD=your-app-password
export CFLY_MAIL_PROVIDER=qq
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
cd cfly-mail/server && npm ci --omit=dev
cd ..
zip -r cfly-mail-1.0.2.cfly-plugin.zip cfly-mail/
```
