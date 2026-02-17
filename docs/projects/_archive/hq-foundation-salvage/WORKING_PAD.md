# Working Pad

## Current Branch Context
- Branch: `codex/hq-template-promotion-phase2-full-hq-port`
- Parent branch: `codex/hq-foundation-salvage-template`
- Scope lock: plugin/HQ domain only for this run.

## Ownership Locks Applied
- Full template-managed: `plugins/agents/hq/**`
- Template-managed plugin core: `plugins/cli/plugins/**`
- Personal-owned carve-out: `packages/dev/**` remains personal-only.
- Guard manifest must be narrowed from broad `packages/**` to explicit package roots.

## Immediate Notes
- Plan scratch updated first before further execution.
- Worker agent must maintain its own dedicated scratch artifacts while implementing.
- Coordination canvas stack must remain untouched and not restacked during this run.

## Worker Scratch Requirement
- Worker will maintain:
  - `docs/projects/hq-foundation-salvage/agent-phase2-plan.md`
  - `docs/projects/hq-foundation-salvage/agent-phase2-working-pad.md`
