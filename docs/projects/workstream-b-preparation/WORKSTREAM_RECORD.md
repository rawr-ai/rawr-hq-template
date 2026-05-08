# Workstream B Preparation

Status: `review-repaired`.
Branch: `codex/workstream-b-preparation`.
PR: `none`.
Reviewed base commit: `0bbc3079fec4fab84210d7b6e5441612ff8571e8`.
DRA: `Codex`.
Dates: `2026-05-07 -> 2026-05-07`.

This record preserves state and handoff context for one bounded preparation
workstream. It is not architecture authority by itself, and it is not an
execution plan for the code migrations.

## Workstream State

Workstream record path:
`docs/projects/workstream-b-preparation/WORKSTREAM_RECORD.md`

Status: preparation artifacts were produced, then reopened for reviewer-backed
repair after the first closure packet overclaimed readiness and omitted
auditable agent provenance.

DRA: Codex, acting as the directly responsible agent for this preparation
slice.

Branch/stack:

```text
◯    align-arch-spec-with-runtime-realization (frozen)
│ ◉  codex/workstream-b-preparation
◯─┘  main
```

Current phase: review-repaired closure packet. Future sessions should consume
the lane packets and `REVIEW_LEDGER.md` before planning implementation, then
follow the execution sequence in `NEXT_PACKET.md` to minimize coordination
cost.

Selected skills:

- `habitat:workstream-runner` for bounded workstream records, packet shape,
  authority typing, and closure expectations.
- `habitat:workstream-review-loops` for reviewer finding format, DRA
  dispositions, accepted finding repair, and closure impact.
- `cognition:team-design` for pair structure, Mapper/Verifier interfaces, and
  singular DRA accountability.

Selected agents:

| Pair | Lane | Mapper | Verifier |
| --- | --- | --- | --- |
| Pair 0 | Workstream setup | Raman (`019e011c-1251-7c02-b674-74252e0508f6`) | Harvey (`019e011c-12da-76f3-af18-be3e5d2f6520`) |
| Pair 1 | Session tools | Aquinas (`019e011c-1318-7b02-9bfe-7246369946d4`) | Meitner (`019e011c-13d1-7e11-8b92-8dbbf9fd3200`) |
| Pair 2 | Undo | Mencius (`019e011c-1513-7d52-ab77-30518676825a`) | Laplace (`019e011c-15fd-7153-b763-ec4cc97e1a46`) |
| Pair 3 | DevOps | Rawls (`019e0121-a8af-7ed2-8bed-8f503a0e4d65`) | Hegel (`019e0121-a916-7050-a23c-db7bae3b8c44`) |
| Pair 4 | Plugin sync | Kuhn (`019e0121-a9b9-7c02-ae7a-6d5004b456ca`) | Pasteur (`019e0121-aa45-78d3-b192-c31c50c32896`) |
| Pair 5 | Upstream fallout | Parfit (`019e0121-abac-7de0-a10e-2b4eb88b7981`) | Schrodinger (`019e0121-acd5-7931-a347-68577d055f6a`) |

Selected hooks: none.

## Frame

Objective: prepare Workstream B up to the point immediately before
implementation planning and execution. The output is a set of verified lane
packets for migration/reconciliation work that will move shared RAWR HQ
behavior upstream into `RAWR HQ-Template` and then sunset duplicate downstream
authority.

Containment boundary:

- Write planning artifacts only under
  `docs/projects/workstream-b-preparation/`.
- Inspect `RAWR HQ-Template` as the future authority.
- Inspect downstream `RAWR HQ` only as behavior/content evidence after
  Workstream A.
- Do not migrate code, remove packages, run global plugin sync, run link repair,
  or decide future Inngest platform architecture.

Primitive boundary: this is one preparation workstream with internal lanes. The
lanes are handoff containers for later workstreams, not a continuing program
governance layer.

Non-goals:

- No implementation of session-tools parity.
- No implementation of `rawr undo`.
- No DevOps package/plugin migration.
- No plugin sync cleanup or downstream duplicate removal.
- No removal of `plugins/web/mfe-demo` in this branch.
- No global `rawr plugins sync`, `plugins doctor links --repair`, generated
  link repair, or codegen.
- No redesign of coordination or Inngest runtime architecture.

Done means:

- Top-level workstream record, authority map, review ledger, lesson capture,
  lane packet template, verbatim repair plan, and Next Packet exist.
- Every lane has discovery, spec, rough plan, and readiness artifacts.
- Every accepted P1/P2 reviewer finding is reflected in the relevant lane
  packet.
- Every lane uses current repo evidence rather than transcript memory alone.
- Future agents can start lane-specific planning without debating
  upstream/downstream authority.

## Opening Packet

Opening input:

- User-provided Workstream B Preparation Plan.
- User-provided Workstream B Preparation Repair Plan, captured verbatim in
  `REPAIR_PLAN_VERBATIM.md`.
- User-stated locked direction: `RAWR HQ-Template` becomes architecture and
  implementation authority; downstream `RAWR HQ` is a source to mine/import
  from, not a continuing architecture authority.
- Workstream A is complete downstream.

Authority inputs:

- Current user decisions in the implementation and repair requests.
- Current `RAWR HQ-Template` code on `main`, inspected on `2026-05-07`.
- Current downstream `RAWR HQ` code on `main` after Workstream A, inspected on
  `2026-05-07`.
- Actual mapper/verifier findings recorded in `REVIEW_LEDGER.md`.

Authority order:

1. Current user decisions in this request.
2. Current upstream `RAWR HQ-Template` code on `main`.
3. Current downstream `RAWR HQ` code on `main` after Workstream A.
4. Accepted reviewer findings in `REVIEW_LEDGER.md`, only where grounded in
   current repo evidence.
5. Prior session findings only when revalidated.
6. Old docs only as stale/evidence inputs unless explicitly accepted.

Coordination inputs:

- Future sessions may be lane-specific.
- The team model is six pairs plus DRA, with each pair producing or reviewing a
  lane packet that the DRA accepts before closure.
- Workstream A is no longer running in parallel for this purpose; it landed
  downstream in commit `408f9d69`.

Evidence inputs:

- `git status --short --branch` and `gt ls` in both repos.
- `git log --oneline` in both repos.
- `bunx nx show projects` in `RAWR HQ-Template`.
- Targeted `rg`, `find`, and numbered file reads for each lane.
- Agent pair reviews recorded in `REVIEW_LEDGER.md`.

Excluded or stale inputs:

- Split-model docs that claim `packages/dev/**` and `plugins/cli/devops/**`
  remain personal-owned are stale for DevOps.
- Coordination canvas runbooks and references are stale when they advertise
  `/coordination`, `/rpc/coordination/*`, or `rawr workflow coord ...`.
- Quarantined or archived docs are provenance only.

Control inputs:

- Graphite is required.
- Trunk remains `main`.
- Use `codex/...` branch names.
- Do not leave the repo dirty.
- Keep downstream read-only during this preparation branch.
- Keep downstream implementations and content in place during the first upstream
  lane implementation pass. Downstream sunset is a later end-phase after all
  relevant upstream parity is proven and DRA approval is explicit.
- Preserve removal lessons in `LESSONS.md` before later implementation deletes
  material that contains hard-won operational or design knowledge.

Stop/escalation conditions:

- A future lane discovers current code contradicts a locked user decision in a
  way that cannot be resolved by doc cleanup.
- A future lane requires global sync/link repair before evidence can be trusted.
- A future lane needs to choose Inngest platform architecture instead of simply
  preserving current hooks.

## Output Contract

Required top-level outputs:

- `AUTHORITY_MAP.md`
- `LANE_PACKET_TEMPLATE.md`
- `LESSONS.md`
- `NEXT_PACKET.md`
- `REPAIR_PLAN_VERBATIM.md`
- `REVIEW_LEDGER.md`
- `WORKSTREAM_RECORD.md`

Required lane outputs:

- `lanes/workstream-setup/DISCOVERY.md`
- `lanes/workstream-setup/SPEC.md`
- `lanes/workstream-setup/ROUGH_PLAN.md`
- `lanes/workstream-setup/READINESS.md`
- `lanes/session-tools/DISCOVERY.md`
- `lanes/session-tools/SPEC.md`
- `lanes/session-tools/ROUGH_PLAN.md`
- `lanes/session-tools/READINESS.md`
- `lanes/undo/DISCOVERY.md`
- `lanes/undo/SPEC.md`
- `lanes/undo/ROUGH_PLAN.md`
- `lanes/undo/READINESS.md`
- `lanes/devops/DISCOVERY.md`
- `lanes/devops/SPEC.md`
- `lanes/devops/ROUGH_PLAN.md`
- `lanes/devops/READINESS.md`
- `lanes/plugin-sync/DISCOVERY.md`
- `lanes/plugin-sync/SPEC.md`
- `lanes/plugin-sync/ROUGH_PLAN.md`
- `lanes/plugin-sync/READINESS.md`
- `lanes/upstream-fallout/DISCOVERY.md`
- `lanes/upstream-fallout/SPEC.md`
- `lanes/upstream-fallout/ROUGH_PLAN.md`
- `lanes/upstream-fallout/READINESS.md`

Claim strength / evidence class:

- Current repo facts are verified by direct file reads and commands.
- Target-state statements are derived from the current user request and marked
  as locked where the user locked them.
- Reviewer findings are accepted, rejected, or deferred in `REVIEW_LEDGER.md`.
- Old docs are not treated as authority when they conflict with the locked
  direction.

Surfaces touched:

- Documentation only: `docs/projects/workstream-b-preparation/**`.

Expected gates:

- `git status --short --branch`
- `gt ls`
- `find docs/projects/workstream-b-preparation -type f | sort`
- artifact hygiene scan for rejected stale phrases.
- targeted `rg` checks proving accepted P1/P2 findings are represented.

Skipped checks:

- No build, typecheck, or test gates. This branch changes documentation only
  and the user explicitly constrained this repair to prep-safe checks.
- No global plugin sync.
- No link repair.
- No formatters.
- No codegen.
- No migration tests.

## Workflow

Preflight:

- Confirmed downstream `RAWR HQ` clean on `main`.
- Confirmed upstream `RAWR HQ-Template` on
  `codex/workstream-b-preparation`.
- Confirmed downstream Workstream A commit `408f9d69` is present.
- Confirmed Graphite stack shape with `gt ls`.

Investigation lanes:

- Lane 0: Workstream Setup And Authority.
- Lane 1: Session Tools.
- Lane 2: Root Undo.
- Lane 3: DevOps.
- Lane 4: Plugin Sync / Tooling Substrate.
- Lane 5: Upstream Fallout From Workstream A.

Phase teams:

- Pair 0: Opening Pair.
- Pair 1: Session Tools Pair.
- Pair 2: Undo Pair.
- Pair 3: DevOps Pair.
- Pair 4: Plugin Sync Pair.
- Pair 5: Upstream Fallout Pair.

Design lock:

- Upstream becomes the sole architecture/implementation authority.
- Downstream may supply content and behavior evidence until imported/sunset.
- DevOps migration upstream is locked.
- MFE demo removal upstream is allowed and expected.
- Inngest preservation is locked; do not remove it as cleanup fallout.
- Removal/sunset work must preserve important lessons in `LESSONS.md`.

Agent packets:

- Actual review provenance is in `REVIEW_LEDGER.md`.
- Future lane execution packets are encoded in each lane's `READINESS.md`.

Wave packets:

- Encoded in `NEXT_PACKET.md`.

Scratch policy:

- No scratch files were added. Future implementation workstreams should use
  their lane artifacts as the durable starting context and create separate
  branch/worktree scratch only if their lane requires it.

## Findings

Reviewer findings are recorded in `REVIEW_LEDGER.md`.

DRA disposition summary:

- Accepted P1: missing review provenance, stale closure status, session-tools
  facet-only mode, undo lifecycle export decision, DevOps safety invariants,
  plugin-sync downstream inventory, upstream-fallout MFE evidence expansion.
- Accepted P2: Next Packet first reads, session-tools CLI proof gap, undo
  failure/dry-run contract, DevOps template-safe defaults, plugin-sync bounded
  `--source-workspace` proof, upstream-fallout coordination/Inngest split
  gates.
- Deferred P3: mixed oclif/dependency ownership risk stays recorded for the
  downstream sunset lane.

Closure impact:

- The original closure claim was downgraded.
- The packet closes only after the review ledger and lane packet repairs are
  represented and the repair verification checks pass.

## Outcome Record

Objective outcome: `review-repaired preparation packet`.

Residual objective gaps:

- This branch does not implement code migrations.
- Future implementation lanes must re-run their first-read evidence commands
  before changing files.

Implementation summary:

- Added the Workstream B preparation artifact tree under
  `docs/projects/workstream-b-preparation/`.
- Added `REVIEW_LEDGER.md` with actual mapper/verifier provenance and DRA
  dispositions.
- Added `REPAIR_PLAN_VERBATIM.md` as the exact repair request capture.
- Added `LESSONS.md` for concrete removal lesson candidates carried by
  soon-to-be-removed code/docs, not generic project wisdom.
- Repaired top-level and lane packets so accepted findings are visible to
  future lane sessions.

Decisions:

- Added a `workstream-setup` lane packet even though the user plan also defines
  top-level setup outputs, because the output contract says one packet per lane.
- Treated DevOps split-model docs as stale inputs.
- Treated coordination canvas docs as stale inputs.
- Treated Inngest runtime routes/scripts/tests as preservation inputs.
- Treated `LESSONS.md` as the default preservation target for specific
  reusable capabilities, test patterns, safety invariants, and design
  constraints carried by removed/sunset surfaces.

Evidence:

- `AUTHORITY_MAP.md`
- `REVIEW_LEDGER.md`
- lane `DISCOVERY.md` files

Verification:

- `git status --short --branch`: branch
  `codex/workstream-b-preparation`; docs-only changes under
  `docs/projects/workstream-b-preparation/**`.
- `gt ls`: branch remains stacked on `main` beside frozen
  `align-arch-spec-with-runtime-realization`.
- `find docs/projects/workstream-b-preparation -type f | sort`: top-level
  artifacts and all six lane packets are present.
- Raw repair-plan phrase scan: remaining matches are only in
  `REPAIR_PLAN_VERBATIM.md`, which intentionally captures the user's repair
  request verbatim.
- Live artifact hygiene scan excluding `REPAIR_PLAN_VERBATIM.md`: no matches for
  stale closure phrases.
- Targeted accepted-finding scans: reviewer IDs, `F-00` through `F-05`
  findings, lane addenda, `AGENTS_SPLIT.md`, `LESSONS.md`, facet-only search,
  undo lifecycle export, DevOps opt-in defaults, plugin-sync
  `--source-workspace`, and upstream-fallout MFE/coordination evidence are
  represented.
- `git diff --check -- docs/projects/workstream-b-preparation`: passed.

## Deferred Inventory

Deferred items live in lane `READINESS.md` files. All deferred items are
implementation work, not preparation work.

## Review Result

Leaf loops: actual mapper/verifier pair findings are recorded in
`REVIEW_LEDGER.md`.

Composed loops: DRA consistency pass across lane packets and accepted reviewer
findings.

Waivers: full build/typecheck/test gates are not run because this is docs-only
preparation and the workstream explicitly forbids implementation work.

Invalidations: old DevOps split-model docs and active coordination canvas docs
are invalidated for future target-state planning where they conflict with the
locked user decisions.

Repair demands:

- All accepted P1/P2 findings must be represented in the ledger, lane packets,
  and Next Packet before closure.
- Any future deletion target with important lessons must preserve those lessons
  in `LESSONS.md` or a lane-local lesson artifact before deletion.

Closure steward result: review-repaired with a zero-context Next Packet.

## Final Output

Artifacts:

- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/LANE_PACKET_TEMPLATE.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/REPAIR_PLAN_VERBATIM.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/WORKSTREAM_RECORD.md`
- `docs/projects/workstream-b-preparation/lanes/**`

Verification run:

- `git status --short --branch`
- `gt ls`
- `find docs/projects/workstream-b-preparation -type f | sort`
- raw artifact hygiene scan for stale closure phrases; remaining matches are
  only in `REPAIR_PLAN_VERBATIM.md`.
- live artifact hygiene scan excluding `REPAIR_PLAN_VERBATIM.md`; no stale
  closure phrase matches.
- targeted `rg` checks for accepted reviewer findings.
- `git diff --check -- docs/projects/workstream-b-preparation`

Repo/Graphite state:

- Branch: `codex/workstream-b-preparation`.
- Stack: branch stacked on `main`.

## Next Packet

Use `NEXT_PACKET.md`.
