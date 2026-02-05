# Agent WF scratchpad — Workflow Commands

## Ownership
- `apps/cli/src/commands/workflow/**`
- `apps/cli/test/workflow-*.test.ts`

## Notes / decisions

- Workflow commands are “durable wrappers” around atomic commands with:
  - structured `--json` output
  - `--dry-run` plan mode
  - best-effort journal snippet emission (`kind: workflow`)
- Shipped workflows:
  - `rawr workflow forge-command` (factory proof: generates a demo command + runs tests)
  - `rawr workflow demo-mfe` (enable + build + verify plugin web module serving without binding a port)
  - `rawr workflow harden` (snapshot + security check + posture; optional routine check)
