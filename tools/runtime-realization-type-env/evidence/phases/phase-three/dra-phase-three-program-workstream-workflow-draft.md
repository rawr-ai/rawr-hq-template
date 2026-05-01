# Phase Three DRA Workflow Reference

Status: DRA operating reference for the open Phase Three program.
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
| Program open, child 1 closed, child 2 not opened, and no active child exists | Open the accepted first proof slice: `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`. | New child workstream report. |
| Program open, child 2 closed, and no active child exists | Open the accepted native boundary observation/failure semantics ledger: `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`. | New child workstream report. |
| Program open, child 3 closed, and no active child exists | Open the accepted layer-disagreement failure observation proof: `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`. | New child workstream report. |
| Program open, child 4 closed, and no active child exists | Open the accepted contained Elysia host passage: `2026-05-01-phase-three-contained-elysia-host-passage.md`. | New child workstream report. |
| Program open, child 5 closed, and no active child exists | Open the accepted contained Elysia listen/lifecycle passage: `2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`. | New child workstream report. |
| Program open, child 6 closed, and no active child exists | Open the accepted integrated live-passage rehearsal and closeout child: `2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`. | New child workstream report. |
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
- Phase Three opened by explicit user control input on 2026-05-01.
- Child 1 closed with DRA acceptance of the first proof slice.
- Child 2 closed as contained `simulation-proof`; DRA accepted the native
  boundary observation/failure semantics ledger as next child.
- Child 3 closed as ledger-only coordination; DRA accepted the layer-
  disagreement failure observation proof as next child.
- Child 4 closed as contained `simulation-proof`; DRA accepted the contained
  Elysia host passage as next child.
- Child 5 closed as contained `simulation-proof`; DRA accepted the contained
  Elysia listen/lifecycle passage as next child.
- Child 6 closed as contained `simulation-proof`; DRA accepted the integrated
  live-passage rehearsal and closeout child as next child.

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

Phase Three is open and is not production migration. It does not mutate production
`apps/*`, `packages/*`, `services/*`, `resources/*`, `plugins/*`, root package
exports, production deployment topology, or root Nx generator ratchets unless
the user explicitly changes scope.

Child 1 is:

`2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`

It is closed as coordination only. It does not implement Elysia, Inngest,
HyperDX, or Nx structure. The DRA accepted its recommendation and opened the
first executable proof slice:

`2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`

That proof slice is closed as contained `simulation-proof`. It proved a
lab-contained started process assembly plus stop/finalization passage, including
post-stop rejection before runtime delegation. The DRA accepted and opened the
next child:

`2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`

That ledger is closed as coordination only. It selected the next executable
proof slice:

`2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`

That proof slice is closed as contained `simulation-proof`. It proved scoped
layer-disagreement preservation across oRPC/Inngest envelopes, RAWR runtime
outcomes, harness/boundary records, telemetry projection, export failure, and
control-plane summary correlation. The DRA accepted and opened the next child:

`2026-05-01-phase-three-contained-elysia-host-passage.md`

That proof slice is closed as contained `simulation-proof`. It proved a real
contained Elysia app/request route-forwarding host around the mini-runtime
server boundary using `Elysia.handle(new Request(...))`, `.all('/rpc*', ...)`,
raw `context.request` forwarding, and `{ parse: "none" }`, without claiming
production HTTP readiness. The DRA accepted and opened the next child:

`2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`

That proof slice is closed as contained `simulation-proof`. It proved a real
local Elysia/Bun listener can start on `127.0.0.1:0`, receive a direct network
request into the contained Elysia -> oRPC -> runtime path, stop with
`app.stop(true)`, clear `app.server`, and reject post-stop network passage
without additional host/oRPC/harness/runtime delegation. The DRA accepted and
opened the next child:

`2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`

Child 7 is active. It must first decide whether the focused Phase Three slices
can compose into one executable integrated rehearsal or whether the honest
program result is closeout-only with focused proofs and an explicit fenced
integration residual.

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
- coordination/accountability;
- overall program health and direction.

The overall-program-health reviewer is mandatory for every child closeout
before the next child opens. That lane reviews whether the local child result
keeps Phase Three pointed at the live-runtime-passage objective, whether the
next recommended slice still compounds the program, and whether residuals or
repairs threaten the overall sequence. It excludes local mechanical correctness,
implementation detail, and prose polish unless they distort program direction.

Every review lane recorded in a child closeout must name:

- axis owner;
- exclusion boundary;
- verdict;
- material findings;
- DRA disposition.

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

Pattern capture:

- Reviewers should identify repeated correction patterns, not just local
  defects. A pattern is a failure mode that has appeared more than once or is
  likely to recur across child workstreams.
- Each patterned finding needs a recommended structural remediation: template
  field, opening packet requirement, review axis, stop rule, checklist row,
  artifact shape, or next-packet clause.
- I disposition the structural remediation separately from the local fix:
  accept, revise, defer with authority home, or reject.
- When accepted, bake the remediation into the child loop, review loop,
  artifact rules, or next-packet shape so future children inherit it passively.
  Do not rely on memory, chat reminders, or a growing pile of ad hoc rules.
- Agents may propose the remediation wording or patch scope, but I keep the DRA
  focus on mission execution and only update process docs when the pattern
  materially reduces future drift or dropped context.

Every child closeout must include a `Pattern Decisions` table:

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |

Rows may say `None`, but the table must exist so repeated failures have a
durable decision home.

Every child opening packet must include a `Vendor / Integration Inheritance`
field:

- `Vendor touched?`: `yes`, `no`, or `unknown until discovery`.
- `Required skill introspection`: named local skills or explicit `none found`.
- `Official-docs lane`: `required`, `not applicable`, or
  `reuse existing report with DRA disposition`.
- `Golden integration exemplar`: read
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
  when the child designs or judges a vendor integration surface, author DX,
  service package internal shape, middleware/context model, or under-the-hood
  operational split.
- `Durable report disposition`: create/update report, reuse with reason, or
  explicit no-op reason.
- `Integration Exemplar Reconciliation`: required when the golden integration
  exemplar is used; it records authority label, principle extracted,
  runtime-spec conflict check, stale details rejected, vendor evidence lane, and
  proof ceiling.

Every child closeout must include `Current focus after closeout`:

- active child id;
- no active child plus accepted next child; or
- program closed/paused/abandoned.

Deferred inventory rule:

- `Unblock condition` is evidence or control state.
- `Next eligible workstream` is the task/container home.
- `Routing owner / DRA decision home` names who carries the residual until a
  later DRA accepts it.

## Vendor And Telemetry Research Rules

Any child that investigates a vendor boundary, vendor idiom, grammar, host
adapter, telemetry/export path, or vendor-owned lifecycle must run a layered
research loop before implementation or proof promotion.

Required vendor loop:

1. Introspect every relevant local skill that exists before assigning the lane
   or writing the plan. Use skill output as navigation and caution, not as
   proof authority.
2. Assign at least one dedicated official-docs lane. That lane must go
   broad-to-deep: start from the vendor docs hub, navigation tree, sitemap, or
   equivalent source map before choosing specific pages or search paths.
3. Separate local installed-package behavior from official vendor guidance and
   from RAWR-owned runtime integration. A vendor constructibility result is
   `vendor-proof`; it becomes runtime passage only when a RAWR-owned contained
   adapter/wrapper path consumes it under a falsifiable gate.
4. Mine local integration docs from multiple angles. Treat them as evidence and
   encoded intent, not as uncontested authority. Promote only after DRA
   disposition against the manifest-pinned runtime spec.
5. When the vendor question is scoped enough to matter later, create or update a
   durable research/integration report with an explicit authority label:
   `canonical`, `normative after DRA acceptance`, `reference only`, or
   `scratch/non-authoritative`.
6. Preserve useful source-vendor and integration findings through the
   workstream handoff when they will affect later runtime design, and delete or
   archive non-useful scratch before closeout.

Telemetry-specific rule:

- Before any oRPC, HyperDX, OTLP, OpenTelemetry, or Effect telemetry child
  claims behavior, mine:
  `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`,
  `docs/system/quarantine/TELEMETRY.md`, and discovered related docs such as
  `docs/system/quarantine/telemetry/orpc.md`,
  `docs/system/quarantine/telemetry/hyperdx.md`, and
  `docs/system/quarantine/telemetry/hq-runtime.md`.
- Keep existing parent-app telemetry and mini-runtime lab telemetry distinct.
  Existing telemetry docs may encode subtle intended behavior, but they do not
  automatically carry over as mini-runtime architecture.
- The Phase Two oRPC telemetry path was correct for oRPC-only integration. Phase
  Three telemetry must account for the Effect x oRPC x OTEL composition it
  actually opens.

Golden integration exemplar rule:

- Mine
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
  as a reference-only example of native-fit vendor integration. It is strongest
  for service-package internals, native oRPC authoring posture, native Effect
  authoring posture, handler/effect terminals, middleware/context/provided
  rules, service semantic errors, observability posture, analytics posture, and
  author/agent DX constraints.
- Do not use that snapshot as authority over runtime boundary definitions,
  runtime lifecycle, public runtime SDK names, adapter lowering, provider
  acquisition/finalization, import law, proof categories, or migration
  readiness. The manifest-pinned runtime-realization spec wins those conflicts.
- When applying the snapshot to Inngest, telemetry, or another vendor, extract
  the principle first: native author-facing grammar, RAWR-owned lifecycle and
  operational seams, and explicit separation of surface DX from runtime reality.
  Then re-validate against official vendor docs, installed behavior, and
  contained gates before making any claim.
- Known stale detail: the snapshot's older `.handler(...)` / `.effect(...)`
  terminal split is not current runtime law. Current runtime-realization
  authority keeps RAWR `.effect(...)` as the execution terminal and rejects
  public `.handler(...)` / Promise branches for canonical service/plugin
  authoring. Preserve the principle; reject the stale terminal split.

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
- residual routing owner or DRA decision home for every deferred item;
- `Pattern Decisions` table with local fix, structural remediation, passive
  absorption target, and DRA disposition;
- stale-state sweep across metadata, current-state card, startup contract,
  review result, final output, and next packet;
- `Current focus after closeout`;
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
   re-anchor or user review; do not open a child.
4. Read the active or most recent child report/packet. If Phase Three is open,
   child 6 is closed, and no active child exists, open the accepted integrated
   live-passage rehearsal and closeout child:
   `2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`.
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
- The active/default child is the accepted integrated live-passage rehearsal
  and closeout workstream.

## Skills To Reach For

- `team-design` for agent topology, accountability, handoffs, and review loops.
- `information-design` for durable artifact usability.
- `architecture` for lifecycle, authority, and decision packets.
- `target-authority-migration` for proof boundaries, domino sequencing,
  negative space, and clean deferrals.
- `testing-design` when choosing falsifiers and proof gates.
- `graphite` and `nx-workspace` when branch/stack or target truth matters.
