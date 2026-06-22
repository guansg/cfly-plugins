# CflyEdit Official Plugin Source

## About CflyEdit

**[CflyEdit](https://cflyedit.com)** is the host application for these plugins — an AI-powered editor that lets you install, configure, and use MCP plugins directly in assistant chat.

- **Website**: https://cflyedit.com
- **This repo**: Official plugin source for the CflyEdit plugin hub

This repository contains **CflyEdit MCP plugin** source code. Develop and package plugins from this directory.
## Getting Started

1. Read the **[Plugin Author Guide](./PLUGIN-AUTHOR-GUIDE.md)** (platform contract — single source of truth)
2. Study the reference implementation **[cfly-mcp-demo](./cfly-mcp-demo/)** (manifest + stdio Server + probe tool)
3. For business plugins, read each plugin's **README** (e.g. [cfly-mysql/README.md](./cfly-mysql/README.md))
4. (Optional) Install the **[AI Agent Skill](./skill/)** (Cursor / Claude Code / Codex) — see [skill/README.md](./skill/README.md)

## Directory

| Path | Description |
|------|-------------|
| [PLUGIN-AUTHOR-GUIDE.md](./PLUGIN-AUTHOR-GUIDE.md) | **Plugin author guide** ([中文](./PLUGIN-AUTHOR-GUIDE.zh-CN.md)) |
| [cfly-mcp-demo/](./cfly-mcp-demo/) | Official reference plugin |
| [cfly-mail/](./cfly-mail/) | Official mail plugin (SMTP/IMAP) |
| [cfly-mysql/](./cfly-mysql/) | Official MySQL query plugin |
| [skill/](./skill/) | AI Agent Skill for plugin development (Cursor / Claude Code / Codex) |

## Packaging a Release Zip

```bash
# 1. Install server dependencies (required for stdio plugins)
cd <pluginId>/server && npm ci --omit=dev

# 2. Create the zip from repository root
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

Output: `<pluginId>-<version>.cfly-plugin.zip` with a single root folder matching `manifest.id` and `server/node_modules/` inside.

---

# CflyEdit 官方插件源码

## 关于 CflyEdit

**[CflyEdit](https://cflyedit.com)** 是这些插件的运行宿主 —— 一款 AI 编辑器，支持在助手对话中安装、配置并使用 MCP 插件。

- **官网**：https://cflyedit.com
- **本仓库**：CflyEdit 插件广场官方插件源码

本目录存放 **CflyEdit MCP 插件** 的源码与 Release 打包入口。在本目录即可完成开发与打包。
## 开始之前

1. 阅读 **[插件开发指南](./PLUGIN-AUTHOR-GUIDE.zh-CN.md)**（平台契约，单一真相；[English](./PLUGIN-AUTHOR-GUIDE.md)）
2. 对照参考实现 **[cfly-mcp-demo](./cfly-mcp-demo/)**（manifest + stdio Server + 探针 tool）
3. 业务插件阅读对应目录下的 **README**（如 [cfly-mysql/README.md](./cfly-mysql/README.md)）
4. （可选）安装 **[ Skill](./skill/)** 到本机，见 [skill/README.zh-CN.md](./skill/README.zh-CN.md)

## 目录

| 路径 | 说明 |
|------|------|
| [PLUGIN-AUTHOR-GUIDE.zh-CN.md](./PLUGIN-AUTHOR-GUIDE.zh-CN.md) | **插件作者通用开发指南** |
| [cfly-mcp-demo/](./cfly-mcp-demo/) | 官方参考插件 |
| [cfly-mail/](./cfly-mail/) | 官方邮件插件（SMTP/IMAP） |
| [cfly-mysql/](./cfly-mysql/) | 官方 MySQL 查询插件 |
| [skill/](./skill/) | Skill（插件开发辅助） |

## 打包 Release zip

```bash
# 1. 安装 server 依赖（stdio 插件必选）
cd <pluginId>/server && npm ci --omit=dev

# 2. 在仓库根目录打 zip
cd ..
zip -r <pluginId>-<version>.cfly-plugin.zip <pluginId>/
```

产物：`<pluginId>-<version>.cfly-plugin.zip`，zip 内单层根目录 = `manifest.id`，且含 `server/node_modules/`。
