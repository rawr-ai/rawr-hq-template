---
name: command-authoring
description: |
  This skill should be used when the user asks to create or refactor a Claude Code slash command, including YAML frontmatter, arguments, XML+Markdown workflow structure, tool restrictions, and safety/confirmation gates.
---

<skill-usage-tracking>

# Command Authoring (Slash Commands)

Commands are user-invoked. Treat command text as instructions for an agent, not end-user documentation.

## Quick routing

- Use **simple Markdown** when the command is a single, linear action with no branching.
- Use **XML workflow structure** when there are phases, conditions, confirmation gates, or multiple decision points.

## Authoring workflow (recommended)

1. Define the interface:
   - command name (verb-first, kebab-case)
   - `description` (help text)
   - argument model (`$ARGUMENTS` vs `$1`, `$2`)
2. Choose structure (simple vs workflow).
3. Write frontmatter:
   - keep `allowed-tools` minimal (least privilege)
   - only pin `model` when there is a concrete reason
4. Write the body (agent-facing):
   - success criteria
   - stop-and-ask rules for ambiguity
   - explicit confirmation before destructive operations
5. Add verification steps (tests/checks) when relevant.

## Reference map

| Reference | Path | Open when |
|---|---|---|
| XML workflow patterns | `references/xml-workflow-patterns.md` | You need phases, branching, or confirmation gates |
| Frontmatter reference | `references/frontmatter-reference.md` | You need a specific frontmatter field definition |
| Advanced patterns | `references/advanced-patterns.md` | You need args, file refs, bash captures, portability patterns |

## Asset map

| Asset | Path | Use for |
|---|---|---|
| Simple command template | `assets/simple-command.md` | One-shot command skeleton |
| Workflow command template | `assets/workflow-command.md` | Multi-phase XML workflow skeleton |

## Core invariants

<invariants>
<invariant name="agent-facing">Command content is instructions for an agent.</invariant>
<invariant name="least-privilege">Use the narrowest `allowed-tools` that still works.</invariant>
<invariant name="confirmation-gates">Risky actions require an explicit stop-and-confirm gate.</invariant>
<invariant name="workflow-start">Workflow commands must say which step to begin with.</invariant>
</invariants>

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: command-authoring" with optional rationale. Omit if no skills invoked. -->

