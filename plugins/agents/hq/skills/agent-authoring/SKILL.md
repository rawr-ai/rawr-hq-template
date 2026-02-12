---
name: agent-authoring
description: |
  This skill should be used when the user asks to create or edit a Claude Code sub-agent, fix agent frontmatter, improve agent triggering, design an agent system prompt, or troubleshoot why an agent is not discoverable.
---

<skill-usage-tracking>

# Agent Authoring (Claude Code Sub-Agents)

Sub-agents are best when the work is multi-step and benefits from a specialized role. To ship a reliable agent, get three things right:

1. Discovery: the plugin is registered and the agent file is in the correct directory.
2. Triggering: the `description` acts like a classifier with concrete `<example>` blocks.
3. Operation: the system prompt is structured, bounded, and output-format driven.

## Reference map

| Reference | Path | Purpose |
|---|---|---|
| System prompt design | `references/system-prompt-design.md` | Prompt structure, quality gates, bounded autonomy |
| Triggering patterns | `references/triggering-patterns.md` | `description` patterns, `<example>` blocks, YAML formatting |
| Marketplace registration | `references/marketplace-registration.md` | Why agents are invisible, registration + manifests |

## Core invariants

<invariants>
<invariant name="registered-first">If the plugin is not registered, the agent will not be discoverable.</invariant>
<invariant name="valid-frontmatter">Use supported `model`/`color` values and correct YAML types.</invariant>
<invariant name="examples-required">Triggering relies on concrete `<example>` blocks.</invariant>
<invariant name="bounded-autonomy">System prompts must include boundaries and stop conditions.</invariant>
</invariants>

## Minimal agent template

```markdown
---
name: your-agent-name
description: |
  Use this agent when [trigger conditions]. Examples:

  <example>
  Context: [situation]
  user: "[user message]"
  assistant: "[assistant message]"
  <commentary>[why to trigger]</commentary>
  </example>
model: inherit
color: blue
tools: ["Glob", "Grep", "Read"]
---

[system prompt]
```

## Frontmatter audit gotchas

- `description` should use `|` for multi-line content (avoid literal `\\n` sequences).
- `tools` must be a YAML array, not a comma-separated string.
- Only use supported values:
  - `model`: `inherit`, `sonnet`, `haiku`
  - `color`: `blue`, `cyan`, `green`, `yellow`, `red`, `magenta`

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: agent-authoring" with optional rationale. Omit if no skills invoked. -->

