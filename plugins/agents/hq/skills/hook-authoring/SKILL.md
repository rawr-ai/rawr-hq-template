---
name: hook-authoring
description: |
  This skill should be used when the user asks to design, implement, validate, or troubleshoot Claude Code hooks (hook events, matchers, prompt vs command hooks, and local testing scripts).
---

<skill-usage-tracking>

# Hook Authoring (Claude Code)

Hooks attach automation to Claude Code lifecycle events. They are best for guardrails, quality gates, and lightweight bootstrapping.

## When to use

- Adding or updating a `hooks.json` for a plugin
- Choosing hook events and matcher scope
- Deciding between prompt hooks (judgment) and command hooks (deterministic checks)
- Validating that a hooks file is structurally sane

## Hook shapes

### Prompt hook

Use when you need context-aware judgment (policy decisions, nuanced gating).

### Command hook

Use when you need deterministic behavior (fast checks, filesystem queries).

## Common events (practical set)

- `PreToolUse`: gate a tool call before it executes
- `PostToolUse`: react after a tool finishes
- `Stop` / `SubagentStop`: block "done" if requirements are unmet
- `SessionStart`: bootstrap environment (`$CLAUDE_ENV_FILE`)
- `UserPromptSubmit`: intercept prompts for guardrails
- `PreCompact`: capture/validate before compaction
- `Notification`: lightweight notifications/logging
- `SessionEnd`: cleanup

## Reference map

| Reference | Path | Open when |
|---|---|---|
| Patterns | `references/patterns.md` | You want starter patterns and narrow-to-broaden guidance |
| Advanced | `references/advanced.md` | You need multi-stage gating, state, or performance guidance |

## Scripts

| Script | Path | Purpose |
|---|---|---|
| Validate hooks JSON | `scripts/validate-hook-schema.sh` | Sanity checks for event keys and basic structure |
| Test hook script | `scripts/test-hook.sh` | Run a hook script locally with sample JSON |

## Core invariants

<invariants>
<invariant name="narrow-first">Start with a narrow matcher; broaden only after it proves useful.</invariant>
<invariant name="fast-path">Hooks must be fast; keep hot-path checks under a few seconds.</invariant>
<invariant name="side-effect-light">Command hooks should avoid destructive side effects.</invariant>
<invariant name="portable-paths">Avoid absolute paths; prefer runtime-provided env vars.</invariant>
</invariants>

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: hook-authoring" with optional rationale. Omit if no skills invoked. -->

