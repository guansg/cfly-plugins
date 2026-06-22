# CflyEdit 插件开发 Cursor Skill

供 **插件作者** 安装到本机 Cursor，在本仓库内开发 MCP 插件时约束 Agent 行为。

本目录 **不是** Cursor 自动加载路径；需要按下面步骤**复制到你本机**后才会生效。

## 语言 / Languages

| 文件 | 说明 |
|------|------|
| [SKILL.md](./SKILL.md) | English（默认，安装时复制为 `SKILL.md`） |
| [SKILL.zh-CN.md](./SKILL.zh-CN.md) | 中文 — 安装时复制并重命名为 `SKILL.md` |
| [README.md](./README.md) | English install instructions |

## 安装

### 方式 A：全局（推荐，所有项目可用）

**英文 skill（默认）**

**macOS / Linux**

```bash
mkdir -p ~/.cursor/skills/cflyedit-plugin
cp /path/to/cfly-plugins/skill/SKILL.md ~/.cursor/skills/cflyedit-plugin/
```

**Windows（PowerShell）**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills"
Copy-Item -Force "D:\path\to\cfly-plugins\skill\SKILL.md" "$env:USERPROFILE\.cursor\skills\cflyedit-plugin\SKILL.md"
```

**中文 skill**：将 `SKILL.zh-CN.md` 复制为目标路径下的 `SKILL.md`。

### 方式 B：仅当前仓库（团队共享可选）

在本仓库根目录：

```bash
mkdir -p .cursor/skills/cflyedit-plugin
cp skill/SKILL.zh-CN.md .cursor/skills/cflyedit-plugin/SKILL.md
```

复制后目录结构应为：

```text
~/.cursor/skills/cflyedit-plugin/SKILL.md
```

## 何时会用到

安装后，在 Cursor 中编辑插件源码、编写 `cfly-plugin.json`、实现探针 tool、打包 Release zip 等任务时，Agent 会优先遵循 `SKILL.md` 中的硬规则。

## 与文档的关系

| 文档 | 作用 |
|------|------|
| [../PLUGIN-AUTHOR-GUIDE.zh-CN.md](../PLUGIN-AUTHOR-GUIDE.zh-CN.md) | **完整平台契约**（人读为主） |
| `SKILL.md` / `SKILL.zh-CN.md` | Agent 短规则与工作流 |
| [../cfly-mcp-demo/](../cfly-mcp-demo/) | 可运行参考实现 |

请先阅读 **插件开发指南**，再安装本 skill。

## 更新 skill

仓库更新 `skill/` 后，重新执行上述复制命令覆盖本机 `~/.cursor/skills/cflyedit-plugin/SKILL.md` 即可。

[English](./README.md)
