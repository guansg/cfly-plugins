# CflyEdit Plugin Development — Cursor Skill

For **plugin authors** to install on their local Cursor to guide the Agent when developing MCP plugins in this repository.

This folder is **not** auto-loaded by Cursor. **Copy it to your machine** using the steps below.

## Language

| File | Language |
|------|----------|
| [SKILL.md](./SKILL.md) | English (default — install as `SKILL.md`) |
| [SKILL.zh-CN.md](./SKILL.zh-CN.md) | 中文 — copy/rename to `SKILL.md` when installing |

## Install

### Option A: Global (recommended)

Copy the skill file to `cflyedit-plugin` under Cursor user skills.

**English skill (default)**

**macOS / Linux**

```bash
mkdir -p ~/.cursor/skills/cflyedit-plugin
cp /path/to/cfly-plugins/skill/SKILL.md ~/.cursor/skills/cflyedit-plugin/
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills\cflyedit-plugin"
Copy-Item -Force "D:\path\to\cfly-plugins\skill\SKILL.md" "$env:USERPROFILE\.cursor\skills\cflyedit-plugin\SKILL.md"
```

**Chinese skill**

Use `SKILL.zh-CN.md` instead and save as `SKILL.md` in the destination:

```bash
cp /path/to/cfly-plugins/skill/SKILL.zh-CN.md ~/.cursor/skills/cflyedit-plugin/SKILL.md
```

### Option B: Project-only (optional)

From this repository root:

```bash
mkdir -p .cursor/skills/cflyedit-plugin
cp skill/SKILL.md .cursor/skills/cflyedit-plugin/
# or for Chinese:
# cp skill/SKILL.zh-CN.md .cursor/skills/cflyedit-plugin/SKILL.md
```

Result:

```text
~/.cursor/skills/cflyedit-plugin/SKILL.md
```

## When it applies

After install, when you edit plugin source, write `cfly-plugin.json`, implement probe tools, or package release zips, the Agent should follow the rules in `SKILL.md`.

## Related docs

| Doc | Role |
|-----|------|
| [../PLUGIN-AUTHOR-GUIDE.md](../PLUGIN-AUTHOR-GUIDE.md) | Full platform contract |
| `SKILL.md` / `SKILL.zh-CN.md` | Short Agent rules and workflow |
| [../cfly-mcp-demo/](../cfly-mcp-demo/) | Runnable reference plugin |

Read **PLUGIN-AUTHOR-GUIDE.md** first, then install this skill.

## Updating

When the repo updates `skill/`, copy the chosen `SKILL.md` or `SKILL.zh-CN.md` again to `~/.cursor/skills/cflyedit-plugin/SKILL.md`.

[中文说明](./README.zh-CN.md)
