# XML Workflow Patterns (Commands)

Use XML+Markdown workflow structure when a command needs phases, branching, or explicit confirmation gates.

## When to use workflow structure

- Multiple phases ("discover -> plan -> execute -> verify")
- Conditional branches ("if X then Y else Z")
- Explicit user confirmation checkpoints
- Quality gates that must pass before continuing

## Canonical skeleton

```markdown
---
description: Short help text shown in command list
argument-hint: "(optional) hint about expected arguments"
allowed-tools: ["Read", "Grep", "Bash"]
---

# Command Title

<core_rule>
State the most important behavioral guardrail here.
Example: never proceed without explicit confirmation when inputs are ambiguous.
</core_rule>

<inputs>
- $1: required input
- $ARGUMENTS: optional freeform notes
</inputs>

<workflow>

<step name="triage">
1. Restate the user goal in one sentence.
2. If required inputs are missing, ask and stop.
</step>

<step name="confirm" condition="risky or ambiguous">
1. Present what you will do and what could go wrong.
2. Ask for explicit confirmation.
3. Stop here until confirmed.
</step>

<step name="execute" condition="confirmed">
1. Do the work.
</step>

<step name="verify">
1. Run the smallest relevant verification steps.
2. Report pass/fail and next actions.
</step>

</workflow>
```

## Common patterns

- Add `condition="..."` on steps rather than inlining branching prose.
- Put irreversible operations behind a `confirm` step.
- Keep tool restrictions tight; add `Bash` only if needed.

