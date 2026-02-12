---
description: TEMPLATE: simple one-shot command
argument-hint: "[required-input] [optional-notes]"
---

<!--
Command template (simple).
Replace placeholders and delete sections you do not need.
-->

# {{Command Title}}

Goal:
- {{State the single outcome}}

Inputs:
- `$1` (required): {{meaning}}
- `$ARGUMENTS` (optional): {{notes}}

Rules:
- If `$1` is missing, ask the user and stop.
- If the task is destructive or ambiguous, ask for confirmation and stop.

Steps:
1. Gather minimal context (read exact files or search).
2. Produce the requested output.
3. Report what changed and where.

