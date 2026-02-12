---
description: Merge a published stack only when two-pass no-policy judgment passes after comment wait window
argument-hint: "WAIT_MINUTES=20"
---

# Merge No-Policy Stack

## HQ Authoring Routing

- If a held/fix-first decision requires net-new authored content, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Preconditions

- Stack is published (`gt submit --stack --ai`).
- Lifecycle check passed.
- Scope is plugin-system only.

## Steps

1. Wait for review comments window:
```bash
sleep "$(( ${WAIT_MINUTES:-20} * 60 ))"
```

2. Collect PR comments + stack context.

3. Run independent Judge A + Judge B using:
- `plugins/agents/hq/skills/agent-plugin-management/references/judge-template-pass-a.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/judge-template-pass-b.md`

4. Decision rules:
- both `auto_merge`: run `gt merge`
- any `fix_first`: hold + create fix slice
- any `policy_escalation`: hold for human/human+agent review
- disagreement/low confidence: hold

5. After successful merge:
```bash
gt sync --no-restack
```

## Done

- Merge only completed for strict two-pass no-policy consensus.
