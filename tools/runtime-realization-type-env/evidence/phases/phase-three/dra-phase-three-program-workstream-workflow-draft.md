# Phase Three DRA Workflow Reference

Status: DRA operating reference for the proposed Phase Three program.
Owner: DRA for Phase Three runtime-realization program workstream.
Program: `../../workstreams/2026-05-01-phase-three-program-workstream.md`.

This document is my day-to-day operating sheet for running the Phase Three
program workstream. It is not runtime architecture authority, not proof
authority, not a child workstream report, and not authorization to migrate
production code.

## Fast Resume Card

Use this card first after compaction, interruption, or handoff.

State gate:

| Current control state | Allowed next action | Artifact to update |
| --- | --- | --- |
| Program proposed or awaiting review | Re-anchor, answer review feedback, or wait for explicit user control input. Do not open child 1. | This workflow, the program workstream, or review notes as applicable. |
| Program approved/open and no active child exists | Open child 1: `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`. | New child workstream report. |
| Active child open | Resume from the child packet/report, not from chat memory. | Active child report and its scratch disposition. |
| Review repair pending | Apply or reject the repair with a recorded DRA disposition, then rerun affected loops. | Active child report or this workflow if process-level. |
| Proof promotion pending | Verify gates, review proof honesty, then promote or fence. | Proof manifest, diagnostic, focus log, maps, and child report. |
| Program closing | Reconcile all children, residuals, proof promotions, and next phase. | Phase Three closeout and next-program packet. |
| Program paused/retargeted/closed | Stop at the current control decision and ask only if the next action is not recoverable from artifacts. | Control decision home. |

Tiny frame:

- Phase Three is live-runtime-passage investigation in the contained lab.
- Phase Two proved contained spine composition, not production readiness.
- The runtime spec pinned by the manifest is runtime authority.
- Architecture spec is larger-shape context.
- DRA owns sequence and proof promotion.
- Child reports recommend; DRA decides.
- No proof claim crosses its earned category.
- Child 1 opens only after explicit program approval/open state is recorded.

## Compact Frame

Phase Three is a contained live-runtime-passage investigation program inside
`tools/runtime-realization-type-env/**`.

Phase Two proved contained spine composition, mostly as `simulation-proof`. It
did not prove production runtime passage, production migration readiness, real
Elysia production serving, durable Inngest semantics, HyperDX product
observability, RuntimeCatalog persistence, production config/secrets policy,
control-plane topology, final public API/DX law, or the final Nx/generator
ratchet.

Phase Three should make the runtime spine feel materially less speculative by
creating migration-decision evidence that a toy-contained app/runtime story can
be selected, derived, compiled, provisioned, mounted, invoked, and observed in
the lab, with falsifiers and stop/finalization represented as proof and
observation records. The earned claim remains lab-contained.

The DRA decision rule is:

- do everything necessary to get maximum proof and leverage for the overall
  objective;
- do not pull in unprepared or non-core risk;
- do not defer work just to create later tracking;
- defer only when the boundary is clean, the reason is explicit, and the
  re-entry trigger is named.

## Current State

Phase Three is not production migration and does not mutate production
`apps/*`, `packages/*`, `services/*`, `resources/*`, `plugins/*`, root package
exports, production deployment topology, or root Nx generator ratchets unless
the user explicitly changes scope.

The expected first executable action after this workflow is accepted is to open
the first child workstream:

`2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`

That child does not implement Elysia, Inngest, HyperDX, or Nx structure first.
It decides what live-runtime passage Phase Three should prove, then recommends
exactly one first executable proof slice with claim, falsifier, focused gate,
residuals, and stop conditions. I must accept, reject, or revise that
recommendation before another child opens.

## Authority Stack

Runtime authority:

- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- It is authoritative only after the manifest path and hash validate.

Larger-shape architecture authority:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- It supplies ontology and architecture shape, but it does not override runtime
  realization mechanics.

Proof ledger and category authority:

- `../../proof-manifest.json`

Status terrain and derived maps:

- `../../runtime-spine-verification-diagnostic.md`
- `../../spine-audit-map.md`
- `../../effect-integration-map.md`
- `../../vendor-fidelity.md`
- `../../focus-log.md`

Process and lab continuity authority:

- `../../../RUNBOOK.md`
- `../../design-guardrails.md`
- `../../phased-agent-verification-workflow.md`

Continuity inputs:

- `../../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`
- `../../workstreams/2026-04-30-phase-two-closeout-phase-three-handoff.md`
- `../../workstreams/2026-05-01-phase-three-program-workstream.md`
- child workstream reports and next packets
- agent reports, only after DRA disposition

Never promote handoff language, explorer output, scratch notes, or program
coordination text into runtime proof.

Proof promotion anchors on the manifest entry, proof category, oracle, and
gates. Diagnostics, maps, and the focus log describe status terrain; they do
not independently promote proof.

## Level Map

Program level:

- I own the Phase Three boundary, objective, sequencing, proof ceiling,
  child-workstream opening and closeout, review topology, proof promotion,
  residual routing, and repo/Graphite cleanliness.
- Child reports recommend; I record accept/reject/revise control decisions.
- Program closeout must classify residuals into externality/design, final
  structure/Nx/generator, production migration, or deliberately abandoned
  buckets with entry conditions.

Child workstream level:

- When I dive into a child, I am DRA for that child too.
- Each child begins by gathering information, analyzing it, assimilating the
  prior stage, deciding what the child should be, laying down the plan and
  structure, then executing.
- No child starts implementation without a plan, gates, artifacts, review
  axes, stop conditions, and closeout criteria.

Lane/agent level:

- Agents are evidence, implementation, or review lanes. They do not own final
  judgment.
- Explorer agents are for fact-finding and retrieval. Their conclusions are
  not trusted as architecture judgment.
- Default/strategy agents are appropriate for judgment review when available.
- Workers may edit only disjoint, assigned write scopes.
- I integrate, verify, and disposition every material lane output.

## Opening Preflight

Run this before opening a child, after compaction, after long interruption, and
before proof promotion:

```sh
git status --short --branch
git branch --show-current
gt status --short
gt ls
gt log --all
bunx nx show project runtime-realization-type-env --json
spec_path=$(jq -r '.spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json)
actual=$(shasum -a 256 "$spec_path" | awk '{print $1}')
expected=$(jq -r '.spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json)
printf 'actual=%s\nexpected=%s\npath=%s\n' "$actual" "$expected" "$spec_path"
test "$actual" = "$expected"
```

Then reload:

- this DRA workflow;
- the Phase Three program workstream;
- the current or previous child packet;
- `proof-manifest.json`;
- `runtime-spine-verification-diagnostic.md`;
- the post-Phase-Two reframe;
- the Phase Two closeout handoff;
- `phased-agent-verification-workflow.md`.

If the worktree is dirty, classify every change as DRA work, user work,
generated/cache output, or blocker before editing.

Dirty worktree preservation:

```sh
git diff --name-status
git diff -- <path>
git status --short --branch
```

Stage only DRA-owned paths by exact path. Do not stage, revert, format, or
rewrite unrelated/user-owned changes. If unrelated/user-owned changes remain,
record them in the closeout repo state.

## Program Loop

1. Confirm current state: proposed, opening, active child, paused, closing, or
   closed.
2. Load authority and prior packet.
3. Decide the immediate level: program decision, child opening, child
   execution, review repair, proof promotion, closeout, or handoff.
4. Keep work inside the lab containment boundary.
5. Use agents only when their lanes are independent enough to justify the
   coordination cost.
6. Record control decisions explicitly.
7. Promote proof only after gates and review support the claimed proof
   category.
8. Keep residuals authority-homed with unblock condition and re-entry trigger.
9. Before accepting a child recommendation or opening the next child, rerun the
   leverage check: does this next slice still provide the highest contained
   proof leverage toward the Phase Three claim against current residuals and
   newly learned constraints?
10. Leave the repo clean, or explicitly report why it cannot be clean.
11. Close every phase with a next packet that a zero-context agent can run.

## Child Loop

Every child follows this shape:

1. Open from packet.
2. Gather and analyze current evidence.
3. Assimilate previous child/program output.
4. Decide the child proof question.
5. Lay down plan, agents, artifacts, gates, stop rules, and closeout criteria.
6. Execute only the scoped proof slice.
7. Verify focused gates.
8. Run leaf review loops before parent judgment loops.
9. Promote or fence each claim.
10. Update manifest/diagnostic/focus/vendor maps only when earned.
11. Close with report, residual inventory, scratch disposition, repo/Graphite
    state, and next packet.

If a child discovers that its proof question is wrong, return to scoping before
implementation.

## Control Decisions I Must Record

- user approval/revision/pause/resume/retarget/abandon/close;
- opening a child workstream;
- accepting, rejecting, or revising a child's recommended next sequence;
- accepting a first executable proof slice;
- changing Phase Three sequence from the program hypothesis;
- promoting a proof category;
- not promoting a proof claim despite passing some gates;
- routing a design wall to a decision packet or externality lane;
- waiving a gate or accepting a known risk;
- classifying a residual bucket at program closeout.

Durable homes:

- user control input and program-level sequence decisions: program workstream
  report, Phase Three closeout, or the next child opening packet;
- child-local accept/reject/revise decisions: active child report `Control
  Decisions` section;
- proof promotion/non-promotion: proof manifest plus child report;
- design walls: decision packet plus child report;
- current experiment or active focus: focus log and manifest current
  experiment only when the active focus actually changes.

Waived gates cannot support proof promotion for any claim that depends on
them. A waiver forces non-promotion, downgrade, or an accepted-risk note outside
the proof manifest.

## Agent Team Rules

Use no more than 6 active agents in one phase. Fewer is better when lanes are
not genuinely independent.

Review axes must be non-overlapping unless I explicitly record why overlap is
needed. Before launching reviewers, name the axis owner, exclusion boundary,
and any intentional gap or overlap. The default review set for program-level
documents is:

- operational posture and recovery;
- architectural coherence and authority order;
- leverage and future compounding value;
- information design and usability;
- coordination/accountability.

For implementation children, choose axes from the actual proof risk:

- mechanical/repo/Nx/Graphite;
- containment;
- type/negative;
- mini-runtime behavior;
- vendor fidelity;
- evidence honesty;
- architecture/migration derivability;
- DX/API only when the child opens a public law.

Lane handoff contract:

| Lane | Output I expect | What it cannot prove |
| --- | --- | --- |
| Explorer | Evidence pointers, confidence, proposed disposition, and explicit "must not prove" note. | Architecture truth or proof promotion. |
| Default/strategy reviewer | Findings by assigned axis, severity, confidence, and repair recommendation. | Facts it did not inspect. |
| Worker | Changed paths, patch summary, focused verification, and residuals. | Scope expansion outside its write set. |
| Mechanical verifier | Commands run, pass/fail, repo/Graphite state, and repair demands. | Behavior beyond the command oracle. |
| Adversarial reviewer | False-green risks, missing residuals, invalidations, and required reruns. | Final authority without DRA disposition. |

Material lane findings must receive DRA accept/reject/revise disposition before
the next child opens or proof is promoted.

## Artifact Rules

Durable artifacts:

- This file's name still contains `draft` because it began as the preserved
  Phase Three DRA anchor. Treat its contents as the DRA workflow reference
  unless a later control input supersedes it.
- program workstream document;
- this DRA workflow;
- child workstream reports;
- proof manifest;
- runtime-spine diagnostic;
- focus log;
- spine/effect/vendor maps when earned;
- running residual/deferred inventory, maintained in active child reports and
  reconciled at program closeout;
- decision packets for real design walls;
- final closeout and next handoff.

Scratch artifacts:

- use only for heavy research/evaluation lanes;
- preferred path:
  `tools/runtime-realization-type-env/evidence/phases/phase-three/_scratch/<YYYY-MM-DD>-<child-slug>/<lane>.md`;
- required header:
  `Status: scratch / non-authoritative / not proof`;
- closeout disposition must be deleted, archived under
  `tools/runtime-realization-type-env/evidence/_archive/phase-three-scratch/`,
  or quarantined with a re-entry reason.

Do not leave scratch beside completed artifacts where future agents can mistake
it for authority.

Scratch cleanup check before closeout:

```sh
find tools/runtime-realization-type-env/evidence/phases/phase-three/_scratch -mindepth 1 -print 2>/dev/null || true
find tools/runtime-realization-type-env/evidence/_archive/phase-three-scratch -mindepth 1 -print 2>/dev/null || true
git status --short -- tools/runtime-realization-type-env/evidence/phases/phase-three/_scratch tools/runtime-realization-type-env/evidence/_archive/phase-three-scratch
```

## Proof Rules

Proof categories stay honest:

- `proof`: accepted static/type/shape law with named gates.
- `vendor-proof`: real installed vendor behavior or shape only.
- `simulation-proof`: crossed RAWR-owned contained lab behavior with falsifier
  gates.
- `xfail`: unresolved architecture/design/policy or unproven runtime
  externality.
- `todo`: planned but not yet proven work.
- `out-of-scope`: coordination, handoff, provenance, or deliberately fenced
  work.

No Phase Three result may claim production readiness. Passing a lab gate means
the claim earned its lab proof category, not that production has crossed.

Vendor constructibility is not RAWR runtime passage. Lab simulation is not
production host lifecycle. Local OTLP/HyperDX-shaped export is not product
observability. Contained Inngest request handling is not durable scheduling,
retry, replay, idempotency, or run history.

## Verification Stack

Opening/light gates:

```sh
jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json
git diff --check
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:report
```

Full program or promotion gate:

```sh
bunx nx run runtime-realization-type-env:gate
bun run runtime-realization:type-env
git status --short --branch
gt status --short
```

Each child also chooses focused gates before implementation. A focused gate is
valid only if it would fail on the regression the child claims to prevent.

## Failure Routing

If a leaf or parent review fails:

1. name the repair demand;
2. decide whether to repair, replan, route a decision packet, abandon the
   child, or accept a waiver;
3. rerun affected loops after repair;
4. do not open the next child while parent review is failed or
   undispositioned.

Operational recovery table:

| Condition | Commands | Allowed disposition |
| --- | --- | --- |
| Dirty worktree | `git diff --name-status`; `git diff -- <path>`; `git status --short --branch` | Classify as DRA, user, generated/cache, or blocker. Stage only DRA-owned exact paths. |
| Branch/stack mismatch | `git branch --show-current`; `gt status --short`; `gt ls`; `gt log --all` | Stop branch/commit operations until stack/worktree ownership is understood. |
| Stale worktree ownership | `git worktree list --porcelain`; inspect `.git/worktrees` if Graphite reports a deleted owner | Do not force-delete active worktrees; prune only stale registrations when proven stale. |
| Missing Nx project/target | `bunx nx show project runtime-realization-type-env --json` | Stop and repair project structure before planning or proof promotion. |
| Spec hash mismatch | Manifest hash command from Opening Preflight | Stop and repair runtime authority before using proof surfaces. |
| Gate failure | Rerun the focused failing gate after inspecting output | Record repair demand; repair or downgrade; rerun affected loops only. |
| Interrupted child state | Read active child report, next packet, scratch disposition, and repo state | Resume from durable artifact or close/abandon with report before opening another child. |

Stop and escalate when:

- production code mutation is required;
- a green claim would rely on vendor-only or simulation-only evidence while
  sounding production-ready;
- a residual lacks authority home or re-entry trigger;
- explorer conclusions are being used as judgment;
- spec hash, Nx target, or Graphite state is inconsistent;
- a proposed child needs an unaccepted public API/DX, durable async, topology,
  config/secret, product observability, or control-plane law and cannot
  proceed without a decision packet.

## Closeout Requirements

Every child closeout records:

- objective and scoped proof question;
- what was proven, not proven, and invalidated;
- gates and review loops;
- manifest/diagnostic/focus/vendor map deltas or explicit no-op;
- deferred inventory with authority homes, unblock conditions, re-entry
  triggers, next eligible workstreams, and lanes;
- scratch disposition;
- repo/Graphite state;
- next packet.

Program closeout additionally records:

- whether an integrated live-passage rehearsal closed honestly;
- every proof promotion and non-promotion;
- residual bucket classification:
  externality/design, final structure/Nx/generator, production migration, or
  deliberately abandoned;
- next program or phase with first reads, first commands, and proof boundaries.

## Compaction Recovery

After compaction, read this section first.

1. Run opening preflight.
2. Read the Phase Three program workstream.
3. Confirm recorded control state. If Phase Three is not approved/open, stop at
   re-anchor or user review; do not open child 1.
4. Read the active child report/packet. If Phase Three is approved/open and no
   active child exists, open child 1:
   `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`.
5. Re-check proof manifest counts and current experiment.
6. State the current level: program, child, review repair, proof promotion, or
   closeout.
7. Continue from the last durable artifact, not from chat memory.

Detailed frame to carry:

- Phase Three is live-runtime-passage investigation in the contained lab.
- Phase Two proved contained spine composition, not production readiness.
- The runtime spec pinned by the manifest is runtime authority.
- Architecture spec is larger-shape context.
- DRA owns sequence and proof promotion.
- Child reports recommend; DRA decides.
- No proof claim crosses its earned category.
- The next default child is live-runtime-passage scope and claim ledger.

## Skills To Reach For

- `team-design` for agent topology, accountability, handoffs, and review loops.
- `information-design` for durable artifact usability.
- `architecture` for lifecycle, authority, and decision packets.
- `target-authority-migration` for proof boundaries, domino sequencing,
  negative space, and clean deferrals.
- `testing-design` when choosing falsifiers and proof gates.
- `graphite` and `nx-workspace` when branch/stack or target truth matters.
