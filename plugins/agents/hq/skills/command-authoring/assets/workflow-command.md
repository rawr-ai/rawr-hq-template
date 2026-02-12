---
description: TEMPLATE: workflow-style command with phases and confirmation gate
argument-hint: "[primary-input]"
---

# {{Command Title}}

<core_rule>
Do not proceed past `confirm` if the input is ambiguous or the plan is risky. Ask and stop.
</core_rule>

<inputs>
- `$1`: primary input (required)
</inputs>

<workflow>

<step name="triage">
1. Restate the goal.
2. Validate `$1`. If missing, ask and stop.
3. Propose a short plan and list decision points.
</step>

<step name="confirm" condition="risky or ambiguous">
1. Present what you will do and what could go wrong.
2. Ask for explicit confirmation.
3. Stop.
</step>

<step name="execute" condition="confirmed">
1. Execute the plan.
2. If new ambiguity appears, return to `confirm`.
</step>

<step name="verify">
1. Run the smallest relevant verification.
2. Summarize results and follow-ups.
</step>

</workflow>

Begin with `triage`.

