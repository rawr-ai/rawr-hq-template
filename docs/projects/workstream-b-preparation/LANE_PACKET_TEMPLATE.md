# Lane Packet Template

Each Workstream B lane uses four files:

- `DISCOVERY.md`
- `SPEC.md`
- `ROUGH_PLAN.md`
- `READINESS.md`

The Mapper drafts the packet. The Verifier checks evidence, stale-doc traps,
proof gaps, non-goals, and handoff quality. The DRA accepts or rejects the lane.

## DISCOVERY.md

Required sections:

- `# <Lane Name> Discovery`
- `## Frame`
- `## Current Upstream State`
- `## Current Downstream State`
- `## Evidence`
- `## Mismatches`
- `## Risks`
- `## Unknowns`
- `## DRA Disposition`

Discovery rules:

- Use current file references and commands, not transcript memory alone.
- Distinguish code, docs, tests, generated output, and archived/quarantined
  material.
- Do not classify docs as authority when they contradict locked user decisions
  or current code.
- Record unknowns as implementation-planning inputs, not blockers to this prep
  workstream unless the lane cannot state a target.

## SPEC.md

Required sections:

- `# <Lane Name> Spec`
- `## Ownership`
- `## Target State`
- `## Public Surface`
- `## Internal Boundaries`
- `## Bring / Preserve / Remove / Ignore`
- `## Test And Evidence Contract`
- `## Non-Goals`
- `## DRA Disposition`
- `## Review Repair Addendum` when reviewer findings changed the lane packet.

Spec rules:

- State which repo/package owns future authority.
- State which downstream behavior is evidence to import.
- State what must not be brought forward.
- Use service-owned logic and projection-owned logic where the architecture
  already has that split.

## ROUGH_PLAN.md

Required sections:

- `# <Lane Name> Rough Plan`
- `## Implementation Slices`
- `## Likely Touch Surfaces`
- `## Validation`
- `## Sequencing Notes`
- `## Stop Conditions`
- `## DRA Disposition`

Rough plan rules:

- Name implementation slices, not line-by-line tasks.
- Include likely first branch/worktree.
- Include expected tests and checks.
- Do not perform implementation in the preparation branch.

## READINESS.md

Required sections:

- `# <Lane Name> Readiness`
- `## Readiness Verdict`
- `## Pair Packet`
- `## First Reads`
- `## First Commands`
- `## Ready-To-Plan Checklist`
- `## Deferred Risks`
- `## DRA Acceptance`
- `## Review Repair Addendum` when reviewer findings changed the lane packet.

Pair packet format:

- Mapper:
- Verifier:
- Objective:
- Allowed edit surfaces:
- Forbidden scope:
- Evidence paths:
- Required output:
- Required gates:
- Lane done condition:
- DRA decision point:

Readiness rules:

- A future session should be able to paste the lane packet into a new thread and
  begin implementation planning.
- Any unresolved issue must have an owner, authority home, and trigger.
- If the future agent needs to ask an architecture/ownership question before
  planning, the lane is not ready.
- If a lane removes or sunsets material with important hard-won lessons, preserve
  those lessons in `LESSONS.md` or a lane-local lesson artifact before deletion.
