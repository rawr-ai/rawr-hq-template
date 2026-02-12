# Triggering Patterns (description + examples)

Treat an agent's `description` like a small classifier: it should be explicit and come with examples.

## Requirements

<quality-gates>
<gate name="lead-in">Start with "Use this agent when ...".</gate>
<gate name="examples">Include 2-4 `<example>` blocks with varied phrasing.</gate>
<gate name="yaml-format">Use `description: |` for multi-line content.</gate>
</quality-gates>

## Example template

```markdown
description: |
  Use this agent when [conditions]. Examples:

  <example>
  Context: [situation]
  user: "[user message]"
  assistant: "[assistant message]"
  <commentary>[why to trigger]</commentary>
  </example>
```

## Common failure modes

<failure-modes>
<failure name="keyword-only">
Symptom: triggers inconsistently.
Fix: keep keywords, but add 2-4 concrete examples.
</failure>
<failure name="escaped-newlines">
Symptom: `\\n` appears literally in UI/help.
Fix: switch to YAML block scalar (`|`).
</failure>
</failure-modes>

