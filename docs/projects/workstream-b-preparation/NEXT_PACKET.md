# Workstream B Next Packet

Continuation target: future lane-specific Workstream B implementation design
sessions.

Successor workstream, if any: pick one lane at a time from this packet. Do not
turn all lanes into one giant implementation session unless explicitly directed.

Why this is next: Workstream B preparation is review-repaired. The next step is
lane-specific implementation design for one migration/reconciliation lane using
the lane packet, authority map, review ledger, and lesson capture as the
starting authority.

Current branch/stack: preparation artifacts live on
`codex/workstream-b-preparation` in `RAWR HQ-Template`.

What changed: added durable Workstream B prep artifacts under
`docs/projects/workstream-b-preparation/`, then repaired them with actual
mapper/verifier provenance and accepted reviewer findings.

What is done:

- Authority map is written.
- Review ledger is written.
- Repair plan is captured verbatim.
- Removal/sunset lessons are captured.
- Lane packet template is written.
- Six lane packets are written and repaired.
- Each lane has discovery, spec, rough plan, and readiness.
- Current repo evidence and reviewer dispositions are recorded.

What is not done:

- No code migration.
- No package removal.
- No docs cleanup outside the preparation artifact tree.
- No downstream duplicate removal.
- No global plugin sync/link repair.

What to inspect first:

1. `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
2. `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
3. `docs/projects/workstream-b-preparation/LESSONS.md`
4. The target lane's `READINESS.md`
5. The target lane's `DISCOVERY.md`
6. The target lane's `SPEC.md`
7. The target lane's `ROUGH_PLAN.md`

Exact next action:

Open a lane-specific implementation design session and ask it to design the
implementation workstream for exactly one lane, using that lane's packet, the
authority map, the review ledger, and lesson capture as opening context.

Required first reads:

- `AGENTS.md`
- `AGENTS_SPLIT.md`
- `docs/AGENTS.md`
- `docs/process/GRAPHITE.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/LANE_PACKET_TEMPLATE.md`
- `docs/projects/workstream-b-preparation/lanes/<lane>/READINESS.md`
- `docs/projects/workstream-b-preparation/lanes/<lane>/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/<lane>/SPEC.md`
- `docs/projects/workstream-b-preparation/lanes/<lane>/ROUGH_PLAN.md`

Important authority note: `AGENTS_SPLIT.md` is required for destination and repo
role grounding, but Workstream B's locked authority decision supersedes stale
DevOps split-model text. DevOps architecture migrates upstream; downstream
personal ownership remains content/customization ownership, not shared tooling
architecture authority.

First commands:

```bash
git status --short --branch
gt ls
bunx nx show projects
find docs/projects/workstream-b-preparation -type f | sort
```

Then run the lane-specific commands listed in that lane's `READINESS.md`.

Deferred items to consume:

- `session-tools`: upstream facets, Codex custom payload parsing, extract
  output parity, facet-only bounded search mode, limit/candidate semantics, and
  CLI tests.
- `undo`: root command wiring, narrow
  `@rawr/agent-config-sync/undo` lifecycle export, deterministic human/JSON
  failure behavior, dry-run preservation, and command-expiration tests.
- `devops`: upstream package/plugin migration, Graphite/worktree safety
  invariants, noninteractive behavior, template-safe opt-in convergence/link
  healing, JSON fixture contracts, and stale split docs ignored as authority.
- `plugin-sync`: downstream behavior inventory, bounded non-mutating
  `--source-workspace` drift/dry-run proof, and duplicate sync authority
  removal only after parity and content safety are proven.
- `upstream-fallout`: remove MFE demo and coordination docs/claims; preserve
  Inngest/runtime hooks; use a test-local web plugin fixture; update project
  lists, Vitest references, service tests, and lockfile state.

Agent: future lane DRA plus one Mapper/Verifier pair.

Workstream objective: design and then execute one lane's implementation plan,
depending on user instruction in that future session.

Authority order:

1. Current user decision in that future session.
2. `AUTHORITY_MAP.md`.
3. Current upstream code.
4. Current downstream code after Workstream A.
5. `REVIEW_LEDGER.md` accepted findings.
6. Lane packet evidence.
7. Old docs only as stale/evidence inputs.

Workstream record path: future lane should create its own workstream record on
its implementation branch, not edit this preparation record unless the
preparation packet itself needs correction.

Allowed edit surfaces: lane-specific. Start with the lane `READINESS.md`.

Forbidden files:

- Downstream `RAWR HQ` files unless the future lane explicitly reaches its
  downstream sunset phase.
- Inngest runtime files for the upstream-fallout lane, except preservation docs
  or references that distinguish Inngest from removed coordination canvas.
- Any generated provider home, global plugin install state, or link-repair
  output.

Evidence paths: lane-specific discovery files and accepted ledger findings.

Forbidden scope:

- Do not redesign future coordination.
- Do not remove Inngest.
- Do not preserve MapGen/Civ 7 unless explicitly redirected.
- Do not run global plugin sync/link repair as an incidental validation step.
- Do not delete material with hard-won lessons before preserving those lessons
  in `LESSONS.md` or a lane-local lesson artifact.

Output artifact path: future lane workstream should write a new lane execution
record or update a lane-specific implementation plan as instructed by the user.

Expected diff shape: lane-specific code/docs/test changes only, plus any
workstream record required by the lane.

Required output: implementation plan or implementation, depending on future
user instruction.

Required gates: lane-specific tests plus `git status --short --branch` and
`gt ls`.

Branch/Graphite constraints: Graphite required, `codex/...` branch, trunk
`main`, keep worktree clean at handoff.

Record section target: future lane record should include authority order,
evidence, tests, skipped checks, reviewer finding dispositions, lesson capture,
and downstream sunset conditions.

Lane done condition: defined in the lane `READINESS.md`.

DRA decision point: DRA must approve any deletion/sunset of downstream duplicate
authority only after upstream parity is proven and lessons are preserved.
