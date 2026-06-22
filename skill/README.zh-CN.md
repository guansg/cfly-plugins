# CflyEdit 插件开发 — AI Agent Skill

供 **插件作者** 安装到 AI 编程工具，在本仓库内开发 MCP 插件时约束 Agent 行为。

支持的工具：**[CflyEdit](https://cflyedit.com)**（编辑器 + 插件宿主）、**Cursor**、**Claude Code**、**Codex**。

本目录 **不是** 任何工具的自动加载路径；需要按下面步骤**复制到你本机**后才会生效。

## 术语说明

| 名称 | 在本工作流中的角色 |
|------|-------------------|
| **CflyEdit** | AI 编辑器 + 插件宿主 [cflyedit.com](https://cflyedit.com) —— 在本仓库**开发**插件（可安装本 skill），并在插件广场**安装/测试** `.cfly-plugin.zip` |
| **Cursor** | AI IDE —— 从 `~/.cursor/skills/` 或 `.cursor/skills/` 加载 skill |
| **Claude Code** | Anthropic CLI / IDE Agent —— 从 `CLAUDE.md` 或 `.claude/` 项目说明加载规则 |
| **Codex** | OpenAI 编程 Agent —— 从 `AGENTS.md` 或项目 Agent 说明加载规则 |
| **本 skill** | 供**开发者**在本仓库编写插件（manifest、MCP Server、探针、zip）的 Agent 短规则 |

## 语言 / Languages

| 文件 | 说明 |
|------|------|
| [SKILL.md](./SKILL.md) | English（默认，安装时复制为对应工具的规则文件） |
| [SKILL.zh-CN.md](./SKILL.zh-CN.md) | 中文 — 安装时复制并重命名 |
| [README.md](./README.md) | English install instructions |

## 安装

可选**一种或多种**工具。源文件用 `SKILL.md`（英文）或 `SKILL.zh-CN.md`（中文）。

### CflyEdit（编辑器 + 插件宿主）

在 **[CflyEdit](https://cflyedit.com)** 中打开本仓库作为开发编辑器，并在项目级安装 skill：

```bash
# 在本仓库根目录
mkdir -p .cursor/skills/cflyedit-plugin
cp skill/SKILL.zh-CN.md .cursor/skills/cflyedit-plugin/SKILL.md
```

CflyEdit 也是**测试与发布**插件的地方：在设置 → 插件广场安装打包好的 `.cfly-plugin.zip`，配置后在助手对话中调用 MCP 工具。条件允许时，可在同一应用内完成开发与验收。

### Cursor

**全局**

macOS / Linux:

```bash
mkdir -p ~/.cursor/skills/cflyedit-plugin
cp /path/to/cfly-plugins/skill/SKILL.zh-CN.md ~/.cursor/skills/cflyedit-plugin/SKILL.md
```

Windows（PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills\cflyedit-plugin"
Copy-Item -Force "D:\path\to\cfly-plugins\skill\SKILL.zh-CN.md" "$env:USERPROFILE\.cursor\skills\cflyedit-plugin\SKILL.md"
```

**仅当前仓库**（在本仓库根目录）:

```bash
mkdir -p .cursor/skills/cflyedit-plugin
cp skill/SKILL.zh-CN.md .cursor/skills/cflyedit-plugin/SKILL.md
```

### Claude Code

将 skill 内容并入 Claude Code 读取的项目说明:

```bash
# 方式 A：追加到项目 CLAUDE.md（在仓库根目录）
cat skill/SKILL.zh-CN.md >> CLAUDE.md

# 方式 B：在 CLAUDE.md 中引用
# 添加："编辑插件时遵循 skill/SKILL.zh-CN.md。"
```

若支持 `.claude/` 项目规则:

```bash
mkdir -p .claude
cp skill/SKILL.zh-CN.md .claude/cflyedit-plugin.md
```

### Codex

Codex 读取仓库根目录的 **`AGENTS.md`**。追加或引用本 skill:

```bash
# 方式 A：追加到 AGENTS.md（在仓库根目录）
cat skill/SKILL.zh-CN.md >> AGENTS.md

# 方式 B：在 AGENTS.md 中引用
# 添加："开发 CflyEdit 插件时遵循 skill/SKILL.zh-CN.md。"
```

## 何时会用到

安装后，在 AI 工具中编辑插件源码、编写 `cfly-plugin.json`、实现探针 tool、打包 Release zip 等任务时，Agent 会优先遵循 skill 中的硬规则。

## 与文档的关系

| 文档 | 作用 |
|------|------|
| [../PLUGIN-AUTHOR-GUIDE.zh-CN.md](../PLUGIN-AUTHOR-GUIDE.zh-CN.md) | **完整平台契约**（人读为主） |
| `SKILL.md` / `SKILL.zh-CN.md` | Agent 短规则与工作流 |
| [../cfly-mcp-demo/](../cfly-mcp-demo/) | 可运行参考实现 |

请先阅读 **插件开发指南**，再在 CflyEdit / Cursor / Claude Code / Codex 中安装本 skill。

## 更新 skill

仓库更新 `skill/` 后，重新复制到对应工具的配置路径即可。

[English](./README.md)
