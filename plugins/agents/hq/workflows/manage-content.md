---
description: Use this when operating on and evolving local AI plugin content (commands, skills, agents, scripts) with strict parity
argument-hint: "(optional) multi-line description of what to add/update/rename"
---

# Plugin Content Ops Workflow

You are working on the local AI plugin system. Your job is to create, update, rename, or audit **plugin content** (commands, skills, agents, and scripts) safely within the plugin-based structure. In RAWR HQ, the workspace plugin tree is canonical; provider homes are synced via `rawr plugins sync`.

<core_rule>
**Never overwrite or delete** existing content unless the user explicitly says to replace/remove it. When in doubt, ask before making destructive changes.
</core_rule>

<output_verbosity_spec>
- Start with a brief effort estimate (complexity × parallelism).
- Keep scope confirmations concise: bullet the items you'll touch.
- During authoring, show file paths and key structural decisions.
- Final report: clickable file paths + one-line summaries.
</output_verbosity_spec>

<inputs>

**Request:** `$ARGUMENTS` (optional freeform, multi-line description of what to add/update/rename/audit)

If `$ARGUMENTS` is present, treat it as the starting scope to restate and clarify. If empty or ambiguous, ask a concise clarifying question about:
- What content to add/update/rename/audit
- Which content type(s) are in scope (command, skill, agent, script)
- Which plugin it belongs to

Wait for the user's reply before making filesystem changes.

</inputs>

<plugin_context>

**Canonical source (workspace plugins):**
```
plugins/agents/<plugin-name>/
├── workflows/*.md               # Slash commands (user-invoked; sync to Claude `commands/`)
├── skills/<skill-name>/SKILL.md # Skills (model-invoked)
├── agents/*.md                  # Agents (subagents via Task tool)
├── scripts/                     # Helper scripts
└── README.md                    # Plugin docs
```

**Critical: Marketplace registration**
Plugins MUST be listed in `~/.claude/plugins/local/.claude-plugin/marketplace.json` for their agents to be discovered. If creating a new plugin or adding agents to an existing plugin, verify the plugin entry exists in marketplace.json.

**Sync targets (Codex CLI):**
```
${CODEX_HOME:-~/.codex-rawr}/
├── prompts/*.md                 # Flattened commands from all plugins
├── skills/<name>/               # Skill directories by name
│   ├── SKILL.md                 # Required
│   ├── scripts/                 # Optional
│   ├── references/              # Optional
│   └── assets/                  # Optional
├── scripts/*                    # Scripts (prefixed by plugin name)
└── plugins/registry.json        # Declarative index of synced content

# Optional upstream mirror target (pass via --mirror-home or CODEX_MIRROR_HOME)
${CODEX_MIRROR_HOME:-~/.codex}/

# Optional explicit fork target (legacy alias; usually same as CODEX_HOME)
${CODEX_FORK_HOME:-~/.codex-rawr}/
```

**Sync command (canonical):**
- Preview: `bun run rawr -- plugins sync <plugin-ref> --dry-run --json`
- Apply: `bun run rawr -- plugins sync <plugin-ref> --json`
- GC managed orphans: `bun run rawr -- plugins sync <plugin-ref> --json --gc`

**Key principle:** Author in the workspace plugin tree (`plugins/agents/*`) and sync outward. Never edit provider homes directly.

</plugin_context>

<content_types>

### Commands (`commands/*.md`)

Slash commands are **user-invoked** prompts that expand into full instructions when triggered.

```markdown
---
description: Brief description shown in command list
argument-hint: "(optional) hint about expected arguments"
allowed-tools: [Bash, Read, ...]  # Optional: restrict available tools
---
# Command content here
```

**When to create:** Repeatable, explicitly-triggered workflows; tasks requiring arguments or context injection; structured agent guidance.

**Best practices:**
- Keep self-contained: mission, assumptions, allowed/forbidden actions
- Use `$ARGUMENTS` for freeform input or `$1`, `$2` for positional arguments
- For multi-step workflows with branching, use the XML+markdown pattern from `command-authoring` -> `references/xml-workflow-patterns.md`

### Skills (`skills/<skill-name>/SKILL.md`)

Skills are **model-invoked**—Claude autonomously decides when to use them based on the description.

```markdown
---
name: skill-name
description: |
  Detailed description of what this skill does and when Claude should use it.
allowed-tools: [Read, Glob, ...]  # Optional
---
# Skill content here
```

**Required frontmatter:**
- `name`: Lowercase, hyphens, max 64 chars
- `description`: Critical for discovery—Claude uses this to decide when to invoke (max 1024 chars)
  - Use a block scalar (`|`) if the text includes `:` or quotes to keep YAML valid.

**When to create:** Cross-command guidance; automatic domain knowledge; reusable patterns/templates/reference.

**Best practices:**
- Write specific descriptions with trigger terms users might mention
- Keep focused on a single capability
- Supporting files (examples, templates) go in the same skill directory

**For comprehensive skill guidance:**
- Load `plugin-dev:skill-development` for structure, progressive disclosure, writing style, trigger phrases
- Load the relevant authoring skills for quality patterns:
  - `skill-authoring`
  - `command-authoring`
- Use `/meta:create-skill` command to create canonical skills with references/assets

### Agents (`agents/*.md`)

Agents are **model-invoked subagents**—autonomous assistants that Claude invokes via the Task tool for complex, multi-step tasks.

```markdown
---
name: agent-name
description: |
  Use this agent when [trigger conditions]. Examples:
  <example>
  Context: [situation]
  user: "[user message]"
  assistant: "[response]"
  <commentary>[why to trigger]</commentary>
  </example>
model: inherit
color: blue
tools: ["Glob", "Grep", "Read"]
---
[System prompt content]
```

**Required frontmatter:**
- `name`: Lowercase, hyphens, 3-50 chars
- `description`: Must include trigger conditions and 2-4 `<example>` blocks

**Optional frontmatter:**
- `model`: `inherit` (default), `sonnet`, or `haiku` — NOT `opus`
- `color`: `blue`, `cyan`, `green`, `yellow`, `red`, `magenta`
- `tools`: Array of tool names to restrict access

**When to create:** Complex multi-step research; autonomous exploration; tasks requiring separate context window.

**Critical requirement:**
- Plugin MUST be in `~/.claude/plugins/local/.claude-plugin/marketplace.json`
- Plugin MUST have `.claude-plugin/plugin.json` manifest
- Agent file MUST be in `<plugin>/agents/` directory

**For comprehensive agent guidance:**
- Load `agent-authoring` and see `references/marketplace-registration.md`

### Scripts (`scripts/*`)

Helper scripts provide reusable logic invoked via bash execution.

**When to create:** Complex logic beyond inline bash; shared utilities across commands; proper error handling needed.

**Best practices:**
- Use `${CLAUDE_PLUGIN_ROOT}` for path resolution within the plugin
- Include header comment with purpose and usage
- Commands invoke scripts by prefixing the path with an exclamation mark:
  ```
  !${CLAUDE_PLUGIN_ROOT}/scripts/my-script.py
  ```

</content_types>

<workflow>

<step name="estimate-effort">

Provide a quick gut-check effort estimate using **complexity × parallelism**:

- **Complexity:** coordination + uncertainty (dependencies, side-effects, ambiguity)
- **Parallelism:** scheduling freedom (independent vs serial, blocking vs non-blocking)

Low-complexity/high-parallelism = fast. High-complexity/low-parallelism = slower.

Optionally include a 1–16 exponential score with a brief note.

</step>

<step name="clarify-scope">

Evaluate the request to determine if scope is clear:

| Request State | Action |
|---------------|--------|
| Empty or ambiguous | Ask clarifying question(s), then **wait for reply** |
| Clear and specific | Proceed to restate scope |

When scope is clear:

1. Identify the content type(s): command, skill, agent, script, or combination
2. Scan `plugins/agents/` to determine which plugin the content belongs to
3. **If creating an agent:** Verify plugin is in `~/.claude/plugins/local/.claude-plugin/marketplace.json`
4. Restate exactly what you will add/update/rename
5. Confirm you will sync outward via `bun run rawr -- plugins sync <plugin-ref> ...` (unless instructed not to)

</step>

<step name="read-baseline">

Before authoring, read existing content to match tone and structure:

<substep name="for-commands">

- Open referenced command(s) to match style
- If "analogous to X," treat X as the template
- Check if workflow-style structure is needed (read `command-authoring` -> `references/xml-workflow-patterns.md` if so)

</substep>

<substep name="for-skills">

- Review existing skills in the target plugin for description style
- Check `skill-authoring` -> `references/validation-checklist.md` for quality gates

</substep>

<substep name="for-agents">

- Review existing agents in the target plugin or marketplace plugins for style
- Check `agent-authoring` -> `references/triggering-patterns.md` for quality patterns
- Verify plugin is listed in marketplace.json

</substep>

<substep name="for-scripts">

- Check existing scripts for language, error handling, and docstring conventions

</substep>

</step>

<step name="author-content">

Create or update content in the appropriate plugin location.

<substep name="author-command" condition="content type is command">

1. Create/edit under `~/.claude/plugins/local/plugins/<plugin-name>/commands/`
2. Include proper frontmatter (`description`, optional `argument-hint`, `allowed-tools`)
3. For workflow-style commands with branching/conditions, use the XML+markdown pattern

</substep>

<substep name="author-skill" condition="content type is skill">

1. Create directory `~/.claude/plugins/local/plugins/<plugin-name>/skills/<skill-name>/`
2. Create `SKILL.md` with required frontmatter (`name`, `description`)
3. Write a detailed `description` that helps Claude know when to invoke (use trigger phrases)
4. Add supporting files in subdirectories:
   - `references/` for long-form guidance (with XML structure for workflows/gates)
   - `assets/` for templates/checklists (with instructive HTML comments)
5. For production-ready skills, apply quality patterns from `skill-authoring`

</substep>

<substep name="author-agent" condition="content type is agent">

1. **Check marketplace registration first:**
   - Read `~/.claude/plugins/local/.claude-plugin/marketplace.json`
   - If plugin is NOT listed, add an entry before proceeding:
     ```json
     {
       "name": "<plugin-name>",
       "description": "<brief description>",
       "source": "./plugins/<plugin-name>",
       "category": "productivity"
     }
     ```
2. Ensure plugin has `.claude-plugin/plugin.json` manifest
3. Create `plugins/agents/<plugin-name>/agents/<agent-name>.md`
4. Include required frontmatter:
   - `name`: lowercase, hyphens, 3-50 chars
   - `description`: start with "Use this agent when...", include 2-4 `<example>` blocks
5. Include optional frontmatter:
   - `model`: `inherit` (recommended), `sonnet`, or `haiku` — NOT `opus`
   - `color`: choose based on purpose (blue=analysis, green=creation, etc.)
   - `tools`: restrict if agent shouldn't have full access
6. Write comprehensive system prompt (500-3000 words)
7. Apply quality patterns from `agent-authoring`

</substep>

<substep name="author-script" condition="content type is script">

1. Create under `plugins/agents/<plugin-name>/scripts/`
2. Include header comment with purpose and usage
3. Use `${CLAUDE_PLUGIN_ROOT}` for path resolution if referencing plugin files

</substep>

</step>

<step name="handle-renames" condition="task involves renaming">

1. Rename files/directories in place within the plugin
2. Ensure the new name replaces the old (unless told to keep both)
3. Note: `--gc` only cleans registry-managed orphans; unmanaged Codex-native extras are preserved

</step>

<step name="apply-cross-cutting" condition="task involves broad updates">

For broad guidance (safety rules, estimation, workflow tweaks) that applies across plugins:

1. Identify all relevant content across plugins
2. Apply the update to each piece of content
3. Define new concepts inline in each file so nuance isn't lost

</step>

<step name="sync-plugin">

1. Run dry-run first to preview changes:
   ```bash
   bun run rawr -- plugins sync <plugin-ref> --dry-run --json
   ```

2. If preview looks correct, apply the sync:
   ```bash
   bun run rawr -- plugins sync <plugin-ref> --json
   ```

3. If cleaning up registry-managed orphans:
   ```bash
   bun run rawr -- plugins sync <plugin-ref> --dry-run --json --gc
   bun run rawr -- plugins sync <plugin-ref> --json --gc
   ```

4. Verify status is healthy:
   ```bash
   bun run rawr -- plugins status --checks all
   ```

Notes:
- `<plugin-ref>` is usually the plugin name (e.g. `hq`, `dev`, `docs`) or `all`.
- Author in the workspace plugin tree (`plugins/agents/*`), then sync outward; never edit provider homes directly.

</step>

<step name="commit-and-push">

1. Run git operations in the workspace repo root (the repo you edited under `plugins/agents/*`).
2. If this repo uses Graphite, follow its stack workflow (prefer `gt modify --commit ...` or `gt create ...`).
3. If there are no changes, explicitly note that nothing was committed.

</step>

<step name="report-back">

1. List every file touched (clickable paths)
2. Give a one-line summary per item of what changed and why
3. Confirm sync status

</step>

</workflow>

<safety_principles>

- **No destructive actions without permission:** Don't overwrite, delete, or rename without explicit user consent.
- **No scope creep:** Don't introduce unrelated workflows or broad cross-cutting changes unless explicitly requested. Small, necessary improvements to complete the requested ops are OK (and must be called out).
- **Recovery protocol:** If you accidentally overwrite content, immediately restore the prior version and re-apply the intended change as a separate edit.
- **Provider-neutral content:** Don't mention Codex/Claude/model-specific capabilities inside content unless required. Directory paths are fine.
- **Dynamic discovery:** Scan `plugins/agents/` to find available plugins—don't rely on hardcoded lists.

</safety_principles>

<publishing_note>

**Want to share your plugin with others?**

Once you've authored plugin content using this workflow, you can publish it via GitHub:

1. Ensure `.claude-plugin/plugin.json` is complete
2. Verify the plugin is self-contained (no external path references)
3. Push to a GitHub repo
4. Others install with: `/plugin install github:username/repo`

For detailed guidance, load `plugin-architecture` and see `references/publishing.md`.

</publishing_note>

Now begin with `estimate-effort`: provide a quick effort estimate, then proceed to `clarify-scope` to confirm the task.
