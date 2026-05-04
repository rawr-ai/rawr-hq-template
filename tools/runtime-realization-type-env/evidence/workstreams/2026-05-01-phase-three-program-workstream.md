# Phase Three Program Workstream

Status: `closed; Phase Three integrated live-passage rehearsal complete`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: final closeout commit on this branch; exact hash recorded in the final
DRA handoff because embedding a self-referential commit hash would churn the
artifact.

This document defines the Phase Three program workstream. It is a
durable coordination object for the runtime-realization lab. It is not runtime
architecture authority, not proof authority, not an implementation report, and
not authorization to migrate production code.

Phase Three opened after explicit user approval on 2026-05-01. Child
workstreams remain governed by the DRA workflow and by DRA accept/reject/revise
control decisions before the next child opens.

## Current State

| Field | Value |
| --- | --- |
| State | Phase Three closed. Child 1 is closed as scope/claim-ledger coordination. Child 2 is closed as contained `simulation-proof`. Child 3 is closed as ledger-only coordination. Child 4 is closed as contained `simulation-proof`. Child 5 is closed as contained `simulation-proof`. Child 6 is closed as contained `simulation-proof`. Child 7 is closed as contained integrated live-passage `simulation-proof` plus program closeout. |
| Allowed next action | Open the next program from the child-7 next-program packet: externality/design residual scoping before final structure/Nx/generator ratchet or production migration. |
| Blocked actions | Production migration, final Nx/generator ratchet, or proof promotion beyond earned lab category. |
| Opening control input | User approved implementation of the Phase Three DRA mission workflow on 2026-05-01. |
| Child 1 control decision | DRA accepted the started process assembly plus stop/finalization passage as the first executable proof slice. |
| Child 2 control decision | DRA accepted contained `simulation-proof` for started process assembly plus stop/finalization passage and accepted the native boundary observation/failure semantics ledger as the next child. |
| Child 3 control decision | DRA accepted the native boundary observation/failure semantics ledger as ledger-only coordination and accepted the layer-disagreement failure observation proof as the next executable child. |
| Child 4 control decision | DRA accepted contained `simulation-proof` for layer-disagreement failure observation and accepted contained Elysia host passage as the next executable child. |
| Child 5 control decision | DRA accepted contained `simulation-proof` for Elysia `app.handle` route-forwarding host passage and accepted a narrow contained Elysia listen/lifecycle passage as the next executable child. |
| Child 6 control decision | DRA accepted contained `simulation-proof` for local Elysia/Bun listen/request/stop lifecycle and accepted integrated live-passage rehearsal/closeout as the next child. |
| Child 7 control decision | DRA accepted contained `simulation-proof` for the integrated toy-contained live-passage rehearsal and closed Phase Three with residuals routed. |
| Active child | None. |

## Frame

Objective:

- Define Phase Three as the recursive program for live-runtime-passage
  investigation inside the contained mini-runtime lab.
- Preserve the Phase Two boundary correction: Phase Two proved contained spine
  composition, not production readiness or live production runtime passage.
- Establish the program-level boundaries, proof target, child-workstream loop,
  artifact flow, verification layers, review lanes, escalation rules, and
  closeout criteria needed to keep the work moving without dropping context.
- Produce, by program closeout, migration-decision evidence that a selected
  app/runtime story can be started, invoked, observed, falsified, stopped, and
  explained inside the lab, with every remaining production-only uncertainty
  explicitly fenced.

Program claim:

- Phase Three should make the runtime spine feel materially less speculative:
  an operator can inspect a toy-contained runtime passage from selected
  declarations through derivation, compilation, provisioning, mounting, and
  observation, including mounted-runtime invocation, failure handling, and
  deterministic stop/finalization records.
- The earned claim remains lab-contained. Passing Phase Three means the live
  passage is meaningful migration-decision evidence, not that production is
  ready.

Containment boundary:

- Work stays inside `tools/runtime-realization-type-env/**` unless the user
  explicitly changes scope.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root package/workspace exports, production deployment topology,
  and root Nx generator ratchets remain out of scope for this program.
- Phase Three may use real installed vendor packages only through lab-contained
  probes, adapters, and mini-runtime tests whose proof categories stay honest.
- Workstream reports, handoffs, phase containers, and agent outputs are
  continuity inputs. They do not override runtime/proof authority.

Non-goals:

- Do not claim production migration readiness.
- Do not migrate the real parent app.
- Do not jump to final structure/Nx/generator ratchet before the live-passage
  proof terrain is mapped.
- Do not decide final public `ProviderEffectPlan`, `RuntimeAccess`,
  dispatcher access, async membership, route import-safety, policy, telemetry,
  config/secret, or product observability laws unless a child workstream proves
  that a decision blocks its scoped proof target.
- Do not predefine every child workstream's internal implementation loop. The
  program defines the recursive contract; each child discovers, plans, and
  executes its own scoped proof question when opened.

## Program Map

| Step | What Happens | DRA decision |
| --- | --- | --- |
| Opening approval | User approved this program structure on 2026-05-01. | Control input recorded; Phase Three opened. |
| Phase 0 | Fill the DRA workflow from the approved structure. | Confirm the level map, recovery gate, and stop rules are runnable. |
| Child 1 | Open live-runtime-passage scope and claim ledger. | Accept, reject, or revise the recommended first executable proof slice. |
| Focused children | Execute the accepted proof slices recursively. | Promote only earned proof; route residuals to authority homes. |
| Integrated rehearsal | Compose earned slices if the focused gates support it. | Decide whether the integrated claim is valid or must stay fenced. |
| Closeout | Reconcile proof, non-proof, residuals, and next phase. | Classify residuals into externality/design, structure/Nx/generator, and production migration buckets. |

## Opening Packet

Opening input:

- User request to implement the meta workstream that produces the Phase Three
  Program Workstream document.
- User correction that the program must be recursive: program-level
  boundaries, scope, shape, direction, loops, artifacts, and phase flow must be
  explicit, while child internals remain child-owned.
- User operational note that explorer agents are fact-finding lanes only; the
  DRA must not trust their conclusions as judgment.
- User vendor-research note that vendor-related work requires skill
  introspection, a dedicated official-docs lane that reads broad-to-deep from
  docs navigation or sitemap, and durable vendor/integration reports when the
  findings are useful beyond the current child.
- User service-package integration note that the standalone service-package
  Effect/oRPC snapshot should be preserved as a golden integration example,
  while staying subordinate to the manifest-pinned runtime-realization spec for
  runtime boundaries, SDK, lifecycle, adapter lowering, and proof authority.

Runtime authority input:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

The runtime spec is the runtime authority only when the manifest-pinned path
and hash validate at preflight.

Architecture authority input:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

Lab/proof/status authority inputs:

- `../design-guardrails.md`
- `../../RUNBOOK.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../effect-integration-map.md`
- `../vendor-fidelity.md`
- `../focus-log.md`

Coordination inputs:

- `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`
- `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `2026-04-30-phase-two-closeout-phase-three-handoff.md`
- `2026-04-30-phase-two-production-readiness-program-workstream.md`
- `../phases/phase-two/dra-phase-two-level-zero-workflow.md`
- `../phases/phase-two/phase-two-production-critical-claim-ledger.md`
- `README.md`
- `TEMPLATE.md`
- `../phased-agent-verification-workflow.md`

Reference integration input:

- `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`

This reference input is not proof authority and does not override runtime
realization details. It is the golden example for native-fit vendor integration
questions: let the author-facing surface feel like the vendor and TypeScript,
keep RAWR ownership at lifecycle/runtime/import/telemetry/diagnostic/policy
seams, and separate excellent surface DX from under-the-hood operational
reality.

Evidence inputs:

- Explorer lane reports for authority/proof, live runtime passage,
  domino/leverage, and felt experience. These reports are retrieval and review
  inputs only.
- Current manifest counts at opening, before this coordination entry was added:
  `proof: 4`, `vendor-proof: 6`, `simulation-proof: 23`, `xfail: 14`,
  `todo: 1`, `out-of-scope: 5`.

Excluded or stale inputs:

- Runtime-prod branch topology, generated syntax, helper names, and package
  layout unless re-derived from current authority.
- Archived default research sequencing except as provenance.
- Phase Two "production-readiness" wording when it suggests production
  readiness rather than contained production-critical evidence.
- Semantica or source-mining output as architecture authority.

Control inputs:

- Phase Three opened after explicit user approval on 2026-05-01.
- The DRA workflow under `../phases/phase-three/` was updated from this
  approved structure before child workstream 1 opened.
- Child 1 closed as a coordination-only scope ledger, and the DRA accepted the
  started process assembly plus stop/finalization passage as the next child.

Selected skill lenses:

- `team-design`: agent fleets, accountability, handoff contracts, feedback
  loops, and failure modes.
- `architecture`: current/target/transition separation, lifecycle boundaries,
  and decision-packet triggers.
- `target-authority-migration`: target authority, proof boundaries, domino
  sequencing, negative-space residuals, and clean deferrals.
- `information-design`: durable artifact shape, skim path, source pointers,
  startup packets, and residual grouping.

Refresher:

- Workstream template refreshed: `yes`.
- Workstream README refreshed: `yes`.
- Phased agent verification workflow refreshed: `yes`.
- Runtime and architecture authority refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-phase-two-closeout-phase-three-handoff.md`

Prior final output accepted:

- Phase Two is closed as contained spine-composition proof and
  migration-decision evidence.
- The strongest earned Phase Two entries are contained `simulation-proof`
  around provider/config/Effect, contained oRPC Fetch boundary, contained
  Inngest function/step boundary, telemetry/catalog observation, and integrated
  rehearsal.
- Phase Two closeout itself added no runtime behavior proof and did not
  authorize production migration.

Prior final output rejected or narrowed:

- Any reading that treats Phase Two as production-ready.
- Any reading that treats a local HyperDX/OTLP path as product observability
  proof.
- Any reading that treats contained Inngest step/function proof as durable
  scheduling, retry, replay, idempotency, or run-history proof.
- Any reading that treats a contained oRPC Fetch request as Elysia production
  HTTP proof.
- Any reading that treats historical Phase Three structure/Nx/generator
  guidance as the immediate next phase without live-passage investigation.

Deferred items consumed:

- Production runtime passage.
- Elysia/HTTP host lifecycle.
- Inngest durable semantics and worker lifecycle.
- HyperDX/product observability and query policy.
- RuntimeCatalog persistence and control-plane topology.
- Production config/secret-store policy.
- Native host telemetry/error mapping.
- Final public API/DX laws.
- First production resource/provider catalog.
- Final structure/Nx/generator ratchet.

Deferred items explicitly left fenced at program opening:

- Production migration readiness.
- Production package topology.
- Product/deployment/control-plane ownership decisions.
- Durable async semantics not actually crossed by a child workstream.
- Public API/DX decisions not required to complete a child proof target.

Repair demands consumed:

- Post-Phase-Two reframe demand: correct the Phase Two result to "spine
  composition inside the lab" and orient the next phase toward live runtime
  passage.
- User recursion demand: define the program loop and child-workstream contract
  without pre-implementing each child's internal loop.
- User operational hygiene demand: use explorer agents for retrieval, not
  judgment.

Next packet changes:

- The first child workstream should not be Elysia, Inngest, HyperDX, or Nx
  implementation. It should be a live-runtime-passage scope and claim-ledger
  workstream that decides the first real proof slice.

Invalidations from prior assumptions:

- The historical assumption that the next phase should immediately be the
  structure/Nx/generator ratchet is invalidated by the post-Phase-Two runtime
  reframe and current focus log.

## Output Contract

This section is the program contract. It defines what Phase Three must produce
and what the DRA must preserve across recursive child workstreams.

### Program-Level Contract

Required outputs for Phase Three:

- A first child workstream that maps live-runtime-passage dimensions, proof
  targets, gates, residuals, and the recommended next child sequence for DRA
  disposition before implementation begins.
- Child workstream reports for every Phase Three proof slice that opens.
- A running residual/deferred inventory with authority homes, unblock
  conditions, re-entry triggers, next eligible workstreams, lanes, and routing
  owner or DRA decision home.
- Manifest, diagnostic, spine map, vendor notes, and focus-log updates only
  when proof/status or current experiment actually changes.
- A final integrated live-passage rehearsal or explicit closeout finding that
  explains why such a rehearsal cannot honestly close.
- Final Phase Three closeout with proof promotions, non-promotions,
  invalidations, review results, verification, repo/Graphite state, and the
  next-program handoff.

Optional outputs:

- Spec decision packets when a child workstream reaches a real design wall.
- Migration-only notes when a residual cannot be proven in the lab but needs a
  precise future migration hook.
- Scratch artifacts for heavy research lanes, provided they are deleted,
  archived, or quarantined before closeout.

Target proof strength:

- Primary target: contained `simulation-proof` for live-runtime-passage slices
  that cross RAWR-owned mini-runtime boundaries with falsifiable gates.
- Supporting target: `vendor-proof` for real installed vendor behavior or
  shape, without claiming RAWR runtime integration.
- Coordination target: `out-of-scope` for program documents, handoffs, and DRA
  workflow artifacts.
- No Phase Three result may promote to production readiness inside this lab.

Decision rule:

- Do everything necessary to get maximum proof and leverage for the overall
  objective, and nothing more.
- Do not pull in unprepared or non-core risk.
- Do not defer work just to create later tracking; defer only behind a clean
  container with a named reason and re-entry trigger.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash check:

  ```sh
  spec_path=$(jq -r '.spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json)
  actual=$(shasum -a 256 "$spec_path" | awk '{print $1}')
  expected=$(jq -r '.spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json)
  printf 'actual=%s\nexpected=%s\npath=%s\n' "$actual" "$expected" "$spec_path"
  test "$actual" = "$expected"
  ```

- focused target(s) selected by each child workstream
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `gt log --all`

Stop/escalation conditions:

- Stop if a child proof requires production code mutation.
- If a proof target needs an unaccepted public API/DX, vendor/product policy,
  topology, durable async, config/secret, or control-plane decision, emit a
  bounded decision packet or route it to an externality/design lane. Hard-stop
  only when the issue would force production mutation, false-green wording, or
  an unowned residual.
- Stop if a proposed green claim relies only on vendor or simulation evidence
  while wording implies production readiness.
- Stop if a residual cannot be given a clean authority home and re-entry
  trigger.
- Stop if explorer-agent conclusions are being used as judgment rather than
  evidence inputs.

Vendor and telemetry research protocol:

- Any vendor-related child must introspect the relevant local skill before
  planning, use at least one dedicated official-docs lane, and require that
  lane to start broad-to-deep from the docs hub, navigation tree, sitemap, or
  equivalent source map before selecting narrow pages.
- Vendor constructibility, official-docs guidance, installed-package behavior,
  and RAWR runtime integration must remain distinct in reports and proof
  categories.
- Vendor-integration design children must also mine
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
  as the reference example for oRPC x Effect x RAWR native-fit integration. That
  snapshot is strongest for service-package internals and author DX, not
  runtime boundary authority.
- Any child that uses that exemplar must include an Integration Exemplar
  Reconciliation row: authority label, principle extracted, runtime-spec
  conflict check, stale details rejected, official-docs / installed-behavior
  evidence lane, and proof ceiling. The known stale detail is the older
  `.handler(...)` / `.effect(...)` terminal split; current runtime authority
  keeps RAWR `.effect(...)` as the canonical execution terminal.
- When a vendor investigation yields useful future integration knowledge, the
  child must create or update a durable report explicitly labeled as canonical,
  normative after DRA acceptance, reference-only, or scratch/non-authoritative.
- Telemetry-related children must mine
  `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`,
  `docs/system/quarantine/TELEMETRY.md`, and discovered related telemetry docs
  such as `docs/system/quarantine/telemetry/orpc.md`,
  `docs/system/quarantine/telemetry/hyperdx.md`, and
  `docs/system/quarantine/telemetry/hq-runtime.md`.
- Existing parent-app telemetry is evidence to mine, not automatic
  mini-runtime authority. The mini-runtime telemetry proof must name the Effect
  x oRPC x OTEL composition it actually exercises.

### Child Workstream Contract

Every child workstream must:

- start from a packet and declare authority inputs, stale/excluded inputs,
  proof ceiling, non-goals, artifacts, gates, and stop conditions;
- gather and analyze evidence before deciding what the child should be;
- assimilate the prior phase/stage report and deferred inventory;
- lay down a plan before execution;
- execute only the scoped proof question;
- run focused verification plus leaf/parent review loops appropriate to the
  proof target;
- recommend next sequence only as an input to DRA disposition;
- close with proof promotions, non-promotions, residual routing, scratch
  disposition, repo/Graphite state, and next packet.

The DRA must accept, reject, or revise a child's recommended next sequence
before another child opens.

### Historical Child 1 Transition

Child 1 is complete as a coordination-only scope ledger. It produced exactly
one recommended first executable proof slice with claim, falsifier, focused
gate, residuals, and stop conditions.

The DRA accepted that recommendation. The accepted child-1 successor was:

- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`

Future child reports must keep their startup contracts current after they close.
Opening conditions and historical control inputs belong in state-transition
history; live next-action instructions belong in `Current State` and `Next
Workstream Packet`.

## Acceptance / Closure Criteria

Phase Three may close only when:

- every opened child workstream is closed or abandoned with a report;
- every child workstream laid down a plan before execution;
- every child began by gathering information, analyzing it, assimilating the
  prior phase/stage, deciding its own scoped proof question, and then planning
  and executing;
- every promoted proof has an oracle and named gate that would fail on
  regression;
- every non-promotion and residual is authority-homed with unblock condition,
  re-entry trigger, next eligible workstream, and lane;
- scratch artifacts and temporary agent notes are deleted, archived, or
  quarantined with non-authority headers;
- leaf and parent review loops are recorded;
- every child closeout includes an overall-program-health review lane with
  owner, exclusions, verdict, and DRA disposition;
- focused and composed verification gates are recorded;
- stale-state sweep passes across metadata, current-state card, startup
  contract, review result, final output, and next packet;
- manifest, diagnostic, spine map, focus log, vendor notes, and reports agree
  on proof strength;
- every child recommendation that would change sequence has an explicit DRA
  accept/reject/revise control decision;
- closeout residuals are classified into externality/design, final
  structure/Nx/generator, production migration, or deliberately abandoned
  buckets with entry conditions;
- production code remains out of scope unless explicit user control input
  changes the program;
- the final handoff gives one next program or phase with first reads, first
  commands, residuals to consume, and proof boundaries.

## Workflow

Preflight:

- Run repo/Graphite/Nx/status checks:
  `git status --short --branch`, `git branch --show-current`,
  `gt status --short`, `gt ls`, `gt log --all`, and
  `bunx nx show project runtime-realization-type-env --json`.
- Verify the manifest-pinned runtime spec hash with the exact command listed
  in `Expected gates`.
- Re-read the workstream template, workstream README, phased agent workflow,
  current proof/status authority, Phase Two closeout, and post-Phase-Two
  reframe.
- State whether Phase Three is open, proposed, paused, or closing.
- If the worktree is dirty before the child starts, classify changes as DRA
  work, user work, generated/cache output, or blocker before editing.
- If the spec hash drifts, stop and repair authority before using any proof
  surface.
- If the Nx project or target is missing, stop and repair structure before
  planning child work.
- If a gate fails, record a repair demand and rerun only affected loops after
  repair.
- If Graphite stack state is unexpected, inspect the stack/worktree ownership
  before branch or commit operations.
- After compaction or resume, rerun this preflight before trusting memory.

Recovery rules:

| Condition | Required response |
| --- | --- |
| Dirty worktree before child start | Classify each change as DRA work, user work, generated/cache output, or blocker before editing. |
| Spec hash mismatch | Stop and repair runtime authority before using any proof surface. |
| Missing Nx project/target | Stop and repair project structure before planning child work. |
| Gate failure | Record a repair demand, repair the scoped cause, and rerun affected loops only. |
| Graphite stack mismatch | Inspect branch, stack, and worktree ownership before any branch/commit operation. |
| Compaction/resume | Rerun preflight and reload the current program/child packet before relying on chat memory. |

Investigation lanes:

- Authority/proof lane: maps manifest categories, diagnostic status, stale
  inputs, and proof/non-proof boundaries.
- Live-passage lane: maps the passage dimensions that can be crossed inside
  the mini-runtime container.
- Domino/leverage lane: identifies the next best proof container and what must
  remain later.
- Felt-experience lane: defines what should become inspectable for user,
  operator, developer, and reviewer audiences.
- Judgment/review lane: uses the DRA and, when useful, a default or strategy
  agent for conclusions. Explorer agents do not decide architecture truth.

Lane handoff contract:

| Lane kind | Receiver | Required output | Must not be used to prove |
| --- | --- | --- | --- |
| Explorer/retrieval | DRA | Evidence pointers, confidence, proposed disposition, and explicit "must not prove" note. | Architecture truth, proof promotion, or final judgment. |
| Mechanical verifier | DRA | Commands run, pass/fail output, repo/Graphite state, and repair demands. | Runtime behavior beyond the gate's stated oracle. |
| Default/strategy reviewer | DRA | Judgment findings by assigned axis, severity, confidence, and repair recommendation. | File facts not inspected or authority not cited. |
| Worker | DRA | Patch summary, changed paths, focused verification, and known residuals. | Scope changes outside its assigned write set. |
| Adversarial reviewer | DRA | False-green risks, missing residuals, invalidations, and required reruns. | Final authority without DRA disposition. |

The DRA records accept/reject/revise disposition for material lane findings
before opening the next child or promoting proof.

Patterned correction handling:

- Review lanes should distinguish isolated findings from repeated failure
  patterns.
- A repeated pattern must include a recommended passive remediation in the
  workstream structure itself: an opening-packet requirement, next-packet field,
  review axis, stop rule, artifact label, or closeout row.
- The DRA must disposition the structural remediation separately from the local
  repair and integrate accepted patterns into the DRA workflow, child contract,
  review loop, or next packet.
- Do not turn every finding into process. Bake in only remediations that prevent
  future proof drift, stale state, missed authority, missed vendor research,
  residual loss, or coordination failure.
- Every child closeout must include a `Pattern Decisions` table with:
  `Pattern`, `Local fix`, `Structural remediation`,
  `Passive absorption target`, and `DRA disposition`.
- Every child opening packet must include `Vendor / Integration Inheritance`:
  vendor touched yes/no/unknown, required skill introspection, official-docs
  lane status, golden integration exemplar status where integration design is
  in scope, and durable report disposition.
- Every child closeout must record `Current focus after closeout`.
- Deferred inventory must keep `Unblock condition` as evidence/control state and
  `Next eligible workstream` as the task/container home.

Recursive child-workstream lifecycle:

1. **Open from packet.** State objective, authority inputs, excluded stale
   inputs, proof ceiling, non-goals, expected artifacts, and expected gates.
2. **Gather and analyze.** Read the relevant files fully enough to map current
   facts. Do not design from memory alone.
3. **Assimilate prior stage.** Consume the previous child report, deferred
   inventory, repair demands, invalidations, and next packet.
4. **Decide the child proof question.** Name what this child exists to prove or
   decide. If the proof question is wrong, re-scope before implementation.
5. **Lay down the plan and structure.** Record approach, phase-local agents,
   gates, review axes, artifacts, stop conditions, and closeout criteria.
6. **Execute inside containment.** Implement only the scoped proof slice.
7. **Verify and review.** Run focused gates, leaf loops, parent loops,
   adversarial proof-honesty review, and judgment review where needed.
8. **Promote or fence.** Update proof/status authority only to earned strength;
   record every non-promotion explicitly.
9. **Close and clean.** Write the report, next packet, repo/Graphite state, and
   scratch disposition. Delete unneeded artifacts.

Failure routing:

- Failed leaf or parent review creates a named repair demand.
- The DRA either replans, accepts a documented waiver, or routes a decision
  packet.
- Affected loops rerun after repair.
- No next child opens from a failed or undispositioned parent loop.

Phase teams:

| Phase | Team shape | Why |
| --- | --- | --- |
| Program opening and scope | DRA plus explorer lanes for authority, live passage, leverage, and experience; optional default/strategy reviewer for judgment. | The initial scope is broad and evidence-heavy, but synthesis must stay single-owner. |
| Child planning | DRA plus targeted explorers only for unresolved facts. | The child owns its own proof question and should not inherit stale conclusions. |
| Child implementation | DRA plus workers only when write scopes are disjoint and concrete. | Parallelism is useful only after the child plan is decision-complete. |
| Child review | Default/strategy judgment reviewer, focused explorer/mechanical checks as needed, and a required overall-program-health reviewer. | Judgment and proof-honesty review must not be delegated to retrieval lanes alone, and each child must be checked against program direction before the next one opens. |
| Program closeout | DRA plus adversarial/judgment review. | Closeout needs false-green, residual, and handoff pressure. |

Agent scratch documents:

- Used only for heavy research/evaluation lanes.
- Temporary scratch path:
  `tools/runtime-realization-type-env/evidence/phases/phase-three/_scratch/<YYYY-MM-DD>-<child-slug>/<lane>.md`
  when scratch must persist long enough to integrate; otherwise keep notes in
  the agent report and do not write scratch files.
- Required scratch header:
  `Status: scratch / non-authoritative / not proof`.
- Must be marked non-authoritative, tied to one workstream/phase/lane/agent,
  and integrated into the real report before closeout.
- Closeout disposition must be one of: deleted as superseded, archived under
  `tools/runtime-realization-type-env/evidence/_archive/phase-three-scratch/`
  as provenance, or quarantined with a non-authority header and re-entry
  reason. Do not leave scratch beside completed artifacts where future agents
  can mistake it for authority.

Concurrency cap:

- No more than 6 agents may be active in one phase. Use fewer when lanes are
  not independent.

Design lock:

- Phase Three is a live-runtime-passage investigation program inside the
  mini-runtime lab.
- The first child is a scope and claim-ledger workstream, not direct vendor or
  Nx implementation.
- Final structure/Nx/generator ratchet remains a likely later phase unless the
  first child produces evidence and the DRA accepts a control decision that
  changes sequence.

Implementation summary:

- To be recorded by each child workstream and final closeout.

Semantic JSDoc/comment trailing pass:

- Required only for substantial TypeScript or runtime source edits.
- Comments are migration/documentation substrate only; they cannot promote
  manifest or diagnostic status without a falsifiable oracle and named gate.

Verification:

- Each child selects focused gates before implementation.
- Program-level composed verification should include the full lab gate before
  proof promotion or closeout unless explicitly waived with accepted risk.

Review loops:

- Leaf loops and parent loops below apply to every child, but each child
  instantiates only the concrete checks needed for its proof target.

## Program Phase Flow

| Phase | Purpose | Required artifact | Close condition |
| --- | --- | --- | --- |
| 0. Post-approval DRA workflow fill | Convert approved program structure into the persistent DRA operating workflow. | Updated `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`. | DRA can recover level map, authority inputs, current child, gates, and stop conditions after compaction. |
| 1. Live-passage scope and claim ledger | Decide what Phase Three should actually prove before implementation. | Child report with live-passage matrix, proof targets, gates, recommended first implementation slice, and residual routing. | The DRA has accepted, rejected, or revised the first executable proof slice. |
| 2. Focused proof children | Execute the live-passage slices accepted by DRA control decision after phase 1. | One child report per opened slice, plus manifest/diagnostic/vendor/focus updates where earned. | Each opened slice is closed/abandoned with gates, review, residuals, and next packet. |
| 3. Integrated passage rehearsal | Compose earned child proofs into one inspectable passage if evidence supports it. | Integrated rehearsal report and gate or explicit non-closeable finding. | Integrated claim is falsifiable, or the program records why it cannot honestly close. |
| 4. Program closeout | Reconcile all proof, non-proof, residuals, artifacts, gates, and next phase. | Phase Three closeout report and handoff. | Zero-context agent can continue without chat memory. |

## Required Live-Passage Dimensions

The first child workstream recommends exact child sequence, but Phase Three
must account for each dimension below before closeout unless the DRA records an
accepted control decision that changes the program.

| Dimension | Phase Three must determine | Proof ceiling |
| --- | --- | --- |
| Lifecycle passage | How far the lab can go through definition, selection, derivation, compilation, provisioning, mounting, and observation as one started/stopped story, with stop/finalization represented as mounted-runtime and observation behavior. | `simulation-proof` unless production host is explicitly opened later. |
| Provider/config/Effect passage | Whether provider acquire/release, config validation, redaction, rollback, and Effect execution cross runtime-owned paths. | `simulation-proof` plus `vendor-proof` for Effect mechanics. |
| Process runtime/invocation passage | Whether registry, service binding, runtime access, invocation context, and `ProcessExecutionRuntime` stay coherent under live invocation. | `simulation-proof`. |
| Adapter/native callback passage | Whether host-compatible callbacks delegate to runtime without becoming a second execution model. | `simulation-proof`; vendor shape only where applicable. |
| Server boundary | What can be proven for oRPC/Elysia-facing request passage inside the lab. | `simulation-proof` only for crossed lab path; Elysia remains fenced unless real mount is exercised. |
| Async boundary | What can be proven for Inngest-facing serve/function/step passage inside the lab. | `simulation-proof` for boundary crossing; durable semantics remain fenced unless actually crossed. |
| Observation passage | Whether diagnostics, telemetry, catalog, OTLP/HyperDX-shaped export, redaction, and finalization records are inspectable. | `simulation-proof` or `vendor-proof`; no product observability proof. |
| Handoff/control-plane passage | Whether safe packet summaries help migration review without becoming deployment placement or persistence authority. | `simulation-proof`; placement/storage remain fenced. |
| Failure/falsifier passage | Whether representative failures reject wrong paths before false greens appear. | Same as target slice. |

## Child Workstream Sequence Hypothesis

This is a starting sequence, not a locked implementation plan. Child workstream
reports may recommend revisions when evidence proves a better order, but the
DRA owns the control decision that accepts, rejects, or revises the sequence
before the next child opens.

### 1. Live Runtime Passage Scope And Claim Ledger

Proof question:

- What exact live-runtime passage should Phase Three prove inside the lab, and
  which proof dimensions must remain deferred?

Required output:

- Live-passage matrix.
- Candidate proof targets and gates.
- Exactly one recommended first executable proof slice, with claim, falsifier,
  focused gate, residuals, and stop conditions.
- Included/excluded boundary list.
- Decision-packet triggers.
- Recommended next child sequence, pending DRA accept/reject/revise control
  decision.

### 2. First Focused Passage Slice

Proof question:

- Opened after the DRA accepts, rejects, or revises child 1's recommendation.
  It should be the highest-leverage slice that unlocks the most downstream
  proof without taking incidental production risk.

Required output:

- A scoped implementation/report/gate package for the selected slice.

### 3. Remaining Focused Passage Slices

Proof question:

- Recommended recursively by prior child reports and opened only after a DRA
  accept/reject/revise control decision.

Required output:

- One closed report per slice, with proof promotion or non-promotion recorded.

### 4. Integrated Live-Passage Rehearsal

Proof question:

- Do the earned focused proofs compose into an inspectable started, invoked,
  observed, stopped runtime story without hiding missing focused gates?

Required output:

- Integrated gate or explicit evidence-backed reason not to claim an
  integrated rehearsal.

### 5. Closeout And Next-Phase Handoff

Proof question:

- What can the migration program safely plan from after Phase Three, and what
  remains externality/design/structure work?

Required output:

- Phase Three closeout report, deferred inventory, next packet, and handoff.
- Residual classification into:
  externality/design phase, final structure/Nx/generator phase, production
  migration phase, and any deliberately abandoned lane, with entry conditions
  for each.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Phase Two proved contained spine composition, mostly as `simulation-proof`, not production readiness. | `../proof-manifest.json`, `../runtime-spine-verification-diagnostic.md`, `2026-04-30-phase-two-closeout-phase-three-handoff.md`, `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`. | Phase Three starts from live-runtime-passage investigation. | High |
| The next best domino is a live-passage scope and claim-ledger child, not immediate Elysia/Inngest/HyperDX/Nx implementation. | `../focus-log.md`, `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`, `../runtime-spine-verification-diagnostic.md`, DRA-dispositioned domino review. | Make child 1 the scope/claim-ledger workstream. | High |
| The program must be recursive. | User control input, `2026-04-30-phase-two-production-readiness-program-workstream.md`, `../phased-agent-verification-workflow.md`. | Define child entry/exit behavior and artifact flow; leave detailed child internals to children. | High |
| Explorer agents are retrieval lanes, not judgment authority. | User operational note and `../phased-agent-verification-workflow.md` role rules. | Require DRA/default/strategy judgment review for conclusions and proof promotion. | High |
| Final structure/Nx/generator ratchet remains important but later by default. | `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md` and `../focus-log.md`. | Keep as deferred likely later phase unless Phase Three child 1 produces evidence accepted by the DRA as a control decision. | High |

## Report

Proof promotions:

- None. This program document is coordination only.

Proof non-promotions:

- Production runtime readiness.
- Production migration authorization.
- Live production host lifecycle.
- Durable Inngest semantics.
- HyperDX product dashboard/query/retention/alerting semantics.
- RuntimeCatalog persistence.
- Control-plane topology and deployment placement.
- Final public API/DX laws.
- Final structure/Nx/generator ratchet.

Diagnostic changes:

- No runtime-spine diagnostic status changes are earned by this document alone.
  Future children may update the diagnostic only after named gates and review.

Spec feedback:

- No spec patch is accepted by this document. Phase Three children may emit
  decision packets when accepted runtime or architecture authority is
  insufficient to proceed.

Test-theater removals or downgrades:

- None in this document. Children must remove, downgrade, or fence any test
  that proves only vendor constructibility while claiming RAWR runtime passage.

## Deferred Inventory

Grouped residual summary:

- Production-only: production migration readiness, production host lifecycle,
  durable runtime semantics, production config/secret stores, and native host
  telemetry/error mapping.
- Spec/design: final public API/DX law, durable async policy, product
  observability policy, RuntimeCatalog persistence, and control-plane topology.
- Lab-proof: live-passage slices that may become contained `simulation-proof`
  only after child gates.
- Later structure: final structure/Nx/generator ratchet and production
  provider/resource catalog cut.

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Routing owner / DRA decision home | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Production migration readiness | `out-of-scope` | Phase Three remains lab-contained. | Manifest `audit.p2.phase-two-program-closeout`; Phase Two closeout; this report. | A later production migration workstream opens production code/topology explicitly. | Any claim says Phase Three authorizes production migration. | Post-Phase-Three migration planning | Phase Three DRA until production-migration DRA accepts handoff. | `migration-only` |
| Final structure/Nx/generator ratchet | `out-of-scope` | Current sequence says live passage comes first. | Post-Phase-Two reframe; focus log; this report. | Live-passage proof or closeout determines the remaining uncertainty is ready for structure ratchet. | Child 1 or closeout says structure is now the next domino. | Later structure/Nx/generator phase | Phase Three DRA until structure/Nx phase opens. | `lab` |
| Final public API/DX law | `xfail` | Several public laws remain design decisions, not prerequisites for the program container. | Manifest residuals for provider shape, runtime access, dispatcher access, async membership, route derivation. | A child proof target cannot proceed without accepting a public law. | Child workstream hits a blocking public-DX choice. | Decision packet or focused child | Phase Three DRA; decision-packet DRA if opened. | `spec/lab` |
| Production Elysia/HTTP host lifecycle | `xfail` | Phase Three proved contained Elysia app/request handling, local listener lifecycle, and integrated composition, but not deployed production host behavior. | `audit.p3.contained-elysia-host-passage`; `audit.p3.contained-elysia-listen-lifecycle-passage`; `audit.p3.integrated-live-passage-rehearsal-closeout`; vendor notes; diagnostic server row. | A production-host workstream opens deployment/process supervision, TLS/proxy/load-balancer behavior, middleware/auth/logging policy, OpenAPI/product API policy, and native host telemetry/error mapping explicitly. | Any claim says contained Elysia listener proof authorizes production HTTP serving or migration. | Production host workstream or externality/design decision packet | Phase Three DRA until next-program DRA accepts handoff. | `migration/spec` |
| Durable Inngest semantics | `xfail` | Inngest durability belongs to the native durable async owner and was not proven. | `audit.p2.async-inngest-function-step-boundary`; diagnostic async row. | A real durable boundary/policy is opened and gated. | Async child needs retry/replay/idempotency/run-history claim. | Async decision packet or production integration | Phase Three DRA; async decision-packet DRA if opened. | `spec/migration` |
| Product HyperDX/query/dashboard/retention policy | `xfail` | Phase Two proved OTLP-shaped export/local ingest only. | `audit.telemetry.hyperdx-observation.residual`; vendor notes. | Product observability policy and query/dashboard gates are accepted. | Observation child tries to green product visibility. | Observation decision packet or production observability workstream | Phase Three DRA; observability decision-packet DRA if opened. | `spec/migration` |
| RuntimeCatalog persistence and control-plane topology | `xfail` | Current catalog/control-plane packet is non-persistent and candidate-only. | `audit.migration.control-plane-observation.residual`; architecture control-plane boundary. | Storage/index/retention/rehydration/topology decisions are opened and gated. | Child treats packet summaries as durable or placement authority. | Control-plane decision packet or later externality phase | Phase Three DRA; control-plane decision-packet DRA if opened. | `spec/migration` |
| Production config precedence and secret-store policy | `xfail` | Lab config validation/redaction does not settle platform precedence/secrets. | Runtime spec config/secrets sections; manifest config residuals. | Platform source order and secret-store policy are accepted and gated. | Provider/config child needs platform-secret proof. | Config/secret decision packet or production migration | Phase Three DRA; config/secret decision-packet DRA if opened. | `spec/migration` |
| Native host telemetry/error mapping | `xfail` | Contained boundary records do not settle native host error taxonomy. | `audit.p1.effect-boundary-policy-matrix.residual`; diagnostic observation row. | Native host telemetry/error mapping policy is opened and gated. | Server/async child needs native error behavior. | Host passage child or production integration | Phase Three DRA; host-passage child DRA if opened. | `migration-only` |
| First production resource/provider catalog cut | `todo` | Phase Three may use representative resources but does not define final production ids. | Manifest `audit.p2.first-resource-provider-cut`; diagnostic provider row. | Started-passage or Phase Three closeout evidence shows representative resource identity semantics are stable, and a later structure or migration phase explicitly needs production ids. | Production migration or structure ratchet needs real provider catalog. | Later provider catalog or migration workstream | Phase Three DRA until provider-catalog DRA accepts handoff. | `lab/migration` |

## Review Result

Independent axis review disposition:

| Axis | Reviewer role | Disposition |
| --- | --- | --- |
| Operational | Operational reviewer | Repairs accepted: exact preflight, Graphite checks, hash command, scratch path, explorer output contract, concurrency cap, proposal-only status. |
| Architecture | Architectural coherence reviewer | Repairs accepted: authority inputs split by role; lifecycle/finalization wording corrected to keep finalization inside observation. |
| Leverage | Forward leverage reviewer | Repairs accepted: child 1 must name one first executable slice; design walls route to decision packets; closeout buckets residuals by next phase. |
| Information design | Information design reviewer | Repairs accepted: current-state box, early program map, source pointers, grouped deferred summary, split first-read packet. |
| Coordination | Coordination reviewer | Repairs accepted: DRA owns sequencing decisions; lane handoff contracts added; external review no longer self-closed. |

Leaf loops:

- Containment: this program keeps Phase Three inside
  `tools/runtime-realization-type-env/**`.
- Mechanical: document path, workstream template sections, phase-three pointer,
  manifest/focus marker, Graphite state, and gates are recorded below.
- Type/negative: no runtime source or fixture proof is added by this document.
- Semantic JSDoc/comments: not applicable unless later children edit runtime
  source.
- Vendor: vendor claims are framed only as proof of crossed vendor boundaries.
- Mini-runtime: live-passage proof is required from future children; this
  document adds no mini-runtime behavior proof.
- Manifest/report: this document should be represented as `out-of-scope`
  coordination if added to the manifest.

Parent loops:

- Architecture: program artifact reviewed; the program preserves runtime spec
  authority and architecture spec larger-shape authority after wording repair.
- Migration derivability: program artifact reviewed; Phase Three produces
  migration-decision evidence without authorizing migration.
- DX/API/TypeScript: program artifact reviewed; no public authoring law is accepted
  here.
- Workstream lifecycle/process: program artifact reviewed; the program defines
  recursive child opening, DRA-owned transition decisions, planning,
  execution, verification, closeout, and cleanup.
- Adversarial evidence honesty: program artifact reviewed; production-only claims
  remain fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- The earlier sequence that treated structure/Nx/generator ratchet as the
  immediate next phase is invalidated as default sequencing by the
  post-Phase-Two reframe.

Repair demands:

- Axis-separated review found repairs around proposal/open state, early navigation,
  DRA-owned sequencing, lane handoff contracts, preflight specificity,
  decision-packet routing, finalization wording, authority grouping, child 1
  leverage, source pointers, residual grouping, stale-current-state cleanup,
  and vendor/telemetry research protocol. All accepted structural repairs are
  integrated in this program artifact before commit.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Explorer reports can sound conclusive. | Risk of outsourcing judgment to retrieval lanes. | Program requires DRA/default/strategy judgment review before proof promotion or closeout. | Every Phase Three child |
| Recursive workstreams can become task lists if child internals are over-specified. | Risk of stale preplanning and brittle execution. | Program defines child contract and required artifacts, while child workstreams decide their exact proof question after discovery. | Child 1 and all later children |

## Final Output

Artifacts:

- `evidence/workstreams/2026-05-01-phase-three-program-workstream.md`
- `evidence/workstreams/2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`
- `evidence/phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `evidence/phases/phase-three/README.md`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `test/mini-runtime/phase-three-integrated-live-passage-rehearsal.test.ts`

Current verification run after child-7 closeout:

- `jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json`:
  passed.
- manifest spec hash check: passed; actual and expected hash both
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `bunx nx show project runtime-realization-type-env --json`: passed.
- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-integrated-live-passage-rehearsal.test.ts`:
  passed with 1 test and 113 assertions after review repairs.
- `bunx nx run runtime-realization-type-env:mini-runtime`: passed with 69
  tests and 845 assertions after review repairs.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed and reported
  current experiment `phase-three.closed-integrated-live-passage`.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed through the final
  `bun run runtime-realization:type-env` gate.
- `bun run runtime-realization:type-env`: passed.

Repo/Graphite state:

- Final repo/Graphite cleanliness is a closeout gate and is recorded in the
  final DRA handoff after the closeout commit. This artifact intentionally does
  not embed the final commit hash because doing so would require another commit
  that changes the hash again.

Current focus after child-7 closeout:

- Phase Three closed as contained live-runtime-passage `simulation-proof`.

## Next-Program Packet

Next likely program:

- Externality/design residual scoping before final structure/Nx/generator
  ratchet or production migration.

Why this is next:

- Phase Three has now proven the contained live-runtime-passage category as far
  as the lab can honestly take it without production/repo risk.
- The remaining uncertainty is mostly externality/design and production-only:
  durable async semantics, product observability, RuntimeCatalog/control-plane
  persistence/topology, production host lifecycle, public API/DX law, production
  config/secrets policy, and final structure/Nx/generator ratchet sequencing.
- The next program should decide which of those residuals must be resolved
  before the final toy-contained Nx/generator ratchet and before production
  migration.

Required continuation reads:

Must read before opening the next program:

- This program workstream document.
- `2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`
- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-started-passage-vendor-integration-reference.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`
- `2026-05-01-phase-three-contained-elysia-host-passage.md`
- `2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`
- active DRA workflow reference:
  `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
  (filename still contains `draft`; contents preserve the Phase Three operating
  record)
- `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`
- `2026-04-30-phase-two-closeout-phase-three-handoff.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../vendor-fidelity.md`
- local vendor skills and official docs if the next program opens or changes
  vendor behavior, product observability, telemetry, or durable async claims
- `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`
- `docs/system/quarantine/TELEMETRY.md`
- `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
- `TEMPLATE.md`
- `README.md`
- `../phased-agent-verification-workflow.md`

Read when scope touches the boundary:

- `../spine-audit-map.md`
- `../effect-integration-map.md`
- `../vendor-fidelity.md`
- Canonical runtime spec pinned by the manifest.
- Canonical architecture spec.

Reference only unless explicitly reopened:

- Archived/default research program sequencing.
- Phase Two claim ledger and child reports, after closeout synthesis.

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `gt log --all`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash check:

  ```sh
  spec_path=$(jq -r '.spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json)
  actual=$(shasum -a 256 "$spec_path" | awk '{print $1}')
  expected=$(jq -r '.spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json)
  printf 'actual=%s\nexpected=%s\npath=%s\n' "$actual" "$expected" "$spec_path"
  test "$actual" = "$expected"
  ```

- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`

Opening gates:

- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- final `git status --short --branch`
- final `gt status --short`

Deferred items to consume:

- Every row in the deferred inventory above.
- Current manifest `xfail`, `todo`, and `out-of-scope` entries relevant to
  live runtime passage.
- Child-7 residuals around production host lifecycle, durable async,
  HyperDX/product observability, RuntimeCatalog/control-plane persistence and
  topology, public API/DX law, production config/secrets policy, and final
  structure/Nx/generator ratchet.
- The vendor/telemetry research protocol above if the child opens or modifies
  any vendor, oRPC, Inngest, Effect, HyperDX, OTLP, or OpenTelemetry claim.
