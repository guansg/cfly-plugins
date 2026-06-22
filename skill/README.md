# CflyEdit Plugin Development — AI Agent Skill

For **plugin authors** to install in their AI coding tool to guide the Agent when developing MCP plugins in this repository.

Supported tools: **[CflyEdit](https://cflyedit.com)** (plugin host), **Cursor**, **Claude Code**, **Codex**.

This folder is **not** auto-loaded. **Copy the skill to your tool** using the steps below.

## Terminology

| Name | Role in this workflow |
|------|------------------------|
| **CflyEdit** | Host app at [cflyedit.com](https://cflyedit.com) — installs, configures, and runs MCP plugins in assistant chat. **Not** where you install this skill. |
| **Cursor** | AI IDE — load skill from `~/.cursor/skills/` or `.cursor/skills/` |
| **Claude Code** | Anthropic CLI / IDE agent — load rules from `CLAUDE.md` or `.claude/` project instructions |
| **Codex** | OpenAI coding agent — load rules from `AGENTS.md` or project agent instructions |
| **This skill** | Short Agent rules for **developing** plugins in this repo (manifest, MCP Server, probe, zip) |

## Language

| File | Language |
|------|----------|
| [SKILL.md](./SKILL.md) | English (default — copy content to your tool) |
| [SKILL.zh-CN.md](./SKILL.zh-CN.md) | 中文 — copy/rename when installing |

## Install

Pick **one** tool below. Use `SKILL.md` (English) or `SKILL.zh-CN.md` (中文) as the source file.

### Cursor (recommended)

**Global**

macOS / Linux:

```bash
mkdir -p ~/.cursor/skills/cflyedit-plugin
cp /path/to/cfly-plugins/skill/SKILL.md ~/.cursor/skills/cflyedit-plugin/
```

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills\cflyedit-plugin"
Copy-Item -Force "D:\path\to\cfly-plugins\skill\SKILL.md" "$env:USERPROFILE\.cursor\skills\cflyedit-plugin\SKILL.md"
```

**Project-only** (from this repo root):

```bash
mkdir -p .cursor/skills/cflyedit-plugin
cp skill/SKILL.md .cursor/skills/cflyedit-plugin/
```

### Claude Code

Append or symlink the skill into project instructions Claude Code reads:

```bash
# Option A: include in project CLAUDE.md (from repo root)
cat skill/SKILL.md >> CLAUDE.md

# Option B: reference file (if your setup supports @ imports)
# Add to CLAUDE.md: "Follow skill/SKILL.md when editing plugins."
```

For a dedicated file under `.claude/` (if your Claude Code version supports project rules):

```bash
mkdir -p .claude
cp skill/SKILL.md .claude/cflyedit-plugin.md
```

### Codex

Codex reads **`AGENTS.md`** at the repository root. Append or reference this skill:

```bash
# Option A: append rules to AGENTS.md (from repo root)
cat skill/SKILL.md >> AGENTS.md

# Option B: reference in AGENTS.md
# Add: "When working on CflyEdit plugins, follow skill/SKILL.md."
```

### CflyEdit (runtime, not skill install)

End users install packaged `.cfly-plugin.zip` files **inside CflyEdit** (Settings → Plugin hub).  
This `skill/` folder is for **authors** using Cursor / Claude Code / Codex to **write** plugin source — not for CflyEdit itself.

## When it applies

After install, when you edit plugin source, write `cfly-plugin.json`, implement probe tools, or package release zips, the Agent should follow the rules in the skill file.

## Related docs

| Doc | Role |
|-----|------|
| [../PLUGIN-AUTHOR-GUIDE.md](../PLUGIN-AUTHOR-GUIDE.md) | Full platform contract |
| `SKILL.md` / `SKILL.zh-CN.md` | Short Agent rules and workflow |
| [../cfly-mcp-demo/](../cfly-mcp-demo/) | Runnable reference plugin |

Read **PLUGIN-AUTHOR-GUIDE.md** first, then install this skill in your AI tool.

## Updating

When the repo updates `skill/`, re-copy the chosen file into Cursor / Claude Code / Codex instructions.

[中文说明](./README.zh-CN.md)
