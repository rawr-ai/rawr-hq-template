# Phase Two Spine-Composition Program Workstream

Status: `closed; completion marker is workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`.
Branch: `codex/runtime-phase-two-program-workstream`.
Latest active branch checkpoint: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.

This document defines the top-level Phase Two program workstream. It is a
coordination artifact for the active DRA run. It is not runtime architecture
authority, not proof authority, not an implementation report for Phase Two, and
not authorization for Parent-Repo Migration.

Completion note:

- Phase Two closed through child workstream 8,
  `workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`.
- The closeout artifact, not any single child proof, is the Phase Two program
  completion marker.
- Phase Two produces contained-lab migration-decision evidence only. It does
  not authorize Parent-Repo Migration and does not implement Phase Three final
  structure, Nx enforcement, generators, generator idempotency, or ratchet/lock.
- Post-closeout realignment lives in
  `tools/runtime-realization-type-env/phases/phase-two/handoffs/handoff-2026-05-01-post-phase-two-runtime-reframe.md`. It reframes the
  likely next program as live-runtime-passage investigation before any
  structure/Nx/generator ratchet.

## Frame

Objective:

- Define Phase Two as the all-encompassing production-critical contained proof
  workstream inside `tools/runtime-realization-type-env/**`.
- Specify the child workstream sequence, recursive opening rule, review loops,
  stop conditions, and closeout criteria that the DRA uses to run the
  program.
- Preserve the distinction between earned evidence, forward assumptions,
  revision candidates, child workstreams, and phase-three-only topology/Nx work.

Terminology:

| Term | Meaning here |
| --- | --- |
| Program | A structured higher-level workstream that contains child workstreams. |
| Program workstream | The all-encompassing Phase Two container described by this document. |
| Program workstream document | This durable artifact that defines the Phase Two program workstream. |
| Child workstream | A discrete Phase Two proof slice opened later with its own recursive planning and execution loop. |
| Plan | A concrete implementation approach inside an opened workstream, not the generic name for every coordination artifact. |

Levels:

| Level | Scope | Status |
| --- | --- | --- |
| 0 | DRA-over-program operating workflow | Closed in `../workflow-phase-two-level-zero.md`. |
| 1 | This composition workstream | Closed; this document is now the Level 2 sequence anchor. |
| 2 | Phase Two program workstream | Closed by child workstream 8 closeout. |
| 3 | Phase Two child workstreams | Closed; each child opened recursively when reached. |
| 4 | Phase-local implementation, verification, and review loops | Closed with each child workstream. |

Containment boundary:

- All Phase Two work stays inside `tools/runtime-realization-type-env/**`
  unless the user explicitly changes scope.
- Parent repo `apps/*`, `packages/*`, `resources/*`, `services/*`,
  `plugins/*`, root workspace/package exports, root Nx generators, and
  production-facing topology are read-only during Phase Two.
- Phase Two may model production-shaped semantics inside the Lab, but it must
  not change parent repo packages or claim Parent-Repo Migration authorization.
- Phase Two did not earn Lab-Production Proof. It earned contained spine
  composition evidence that later Lab-Production Proof and Parent-Repo
  Migration planning can use.

Non-goals:

- Do not run Phase Two from this document-writing workstream.
- Do not pre-plan the internal implementation of every child workstream.
- Do not start phase-three topology, generator, or Nx ratchet work.
- Do not promote vendor proof or simulation proof into Parent-Repo Migration
  readiness.
- Do not copy runtime-prod stack code, generated syntax, package topology,
  Effect version pins, or branch claims into the lab as authority.

## Authority Map

Runtime/proof authority:

1. Canonical runtime realization spec pinned by
   `tools/runtime-realization-type-env/evidence/proof-manifest.json`:
   `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
2. Lab operating authority:
   `tools/runtime-realization-type-env/RUNBOOK.md`,
   `tools/runtime-realization-type-env/AGENTS.md`, and
   `tools/runtime-realization-type-env/guidance/guardrails-design.md`
3. Proof/status authority:
   `tools/runtime-realization-type-env/evidence/proof-manifest.json`,
   `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`,
   `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`,
   and `tools/runtime-realization-type-env/evidence/current-lab-state.md`
4. Coordination inputs:
   `tools/runtime-realization-type-env/phases/phase-one/_archive/default-research-program-2026-04-30/ref-runtime-realization-research-program.md`,
   `tools/runtime-realization-type-env/phases/phase-one/_archive/default-research-program-2026-04-30/workflow-runtime-research-program-dra.md`,
   `tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md`,
   this document, and completed workstream reports
5. Provenance only:
   quarantined docs, stale migration inputs, source-mining outputs, and agent
   reports when they conflict with current authority

Architecture authority:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

The architecture spec is authoritative for system vocabulary, ownership laws,
semantic boundaries, and phase-three structural direction. The runtime
realization spec wins for runtime mechanics, lifecycle, proof targets, and
runtime-specific detail.

Known authority facts observed while composing this document:

- Manifest-pinned runtime spec hash:
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`
- The same hash was observed for the local runtime spec file during preflight.
- The Nx project `runtime-realization-type-env` has focused and composed
  targets for structural, report, typecheck, negative, vendor-effect,
  vendor-boundaries, oracle, middle-spine, simulate, and gate.

## Current Baseline

The prior bounded runtime-realization research program is closed as contained
lab proof and coordination continuity. It produced useful evidence but did not
make the runtime production-ready.

Earned evidence:

- `proof`: accepted type/authoring-shape laws such as discriminated descriptor
  refs, Effect-only terminals, refs-only portable artifacts, and provider-not-
  execution-plan separation.
- `vendor-proof`: real Effect `3.21.2`, TypeBox, native oRPC shape, and
  Inngest handoff shape, with vendor behavior not promoted to RAWR runtime
  integration.
- `simulation-proof`: oracle derivation, registry identity, real Effect
  execution through runtime-owned paths, provider acquire/release lowering,
  config validation/redaction, bootgraph rollback/finalization, runtime
  access and service-binding DAG behavior, adapter delegation, contained
  server/async harnesses, deployment handoff, telemetry export, HyperDX/OTLP
  ingest smoke, and migration/control-plane observation packets.

Still not proven:

- Production SDK extraction from real declarations.
- Final public `ProviderEffectPlan` shape.
- Final `RuntimeAccess` method law.
- Final dispatcher access policy.
- Final async membership authoring syntax.
- Final route import-safety law and native oRPC/Elysia request path.
- Native Inngest FunctionBundle/worker/serve path and durable semantics.
- Product observability/query/retention/alerting policy.
- RuntimeCatalog storage/indexing/retention/rehydration.
- Production config precedence and platform secret-store integration.
- Deployment placement, orchestration, and control-plane topology.
- Phase-three final structure, root Nx generators, or enforcement ratchet.

Proof-strength rule:

- `vendor-proof` remains vendor behavior only.
- `simulation-proof` remains contained lab behavior only.
- Phase Two may strengthen `vendor-proof` and `simulation-proof` entries by
  crossing narrower real boundaries inside the lab, but it does not create a
  new proof category unless `guardrails-design.md`, manifest/report tooling,
  and diagnostic wording are explicitly revised.
- No Phase Two result may claim Parent-Repo Migration authorization without a later
  migration workstream.

## Revision Checks Before Phase Two Runs

The first child workstream must recertify whether any authority or evidence
artifact needs revision before deeper proof work begins.

Required revision checks:

| Check | Question | Disposition rule |
| --- | --- | --- |
| Manifest recertification | Do entries, statuses, gates, or fixtures overstate current proof? | Repair before opening vendor/live-boundary work. |
| Diagnostic/spine recertification | Does the red/yellow/green map reflect current proof strength and residuals? | Update diagnostic/spine map before using it as workstream input. |
| Gate adequacy | Do existing gates actually fail on the claims Phase Two needs to prove? | Add or revise gate targets only inside the lab. |
| Runtime spec completeness | Did prior closeout miss a runtime obligation around Effect, server, async, telemetry, catalog, config, or lifecycle? | Add a gap entry or decision packet before proof promotion. |
| Architecture overlap | Does the architecture spec contradict or underspecify a runtime detail? | Runtime spec wins on runtime mechanics; architecture-level contradiction gets a decision packet. |
| Contamination exclusion | Did abandoned runtime-prod material leak names, topology, generated syntax, or claims into current thinking? | Treat as stale contamination; re-derive from spec and lab authority. |

No child workstream may promote proof until these revision checks either pass
or record a bounded repair demand.

## Gap Ledger

The DRA running Phase Two must maintain a living gap ledger, but no gap may live
only in this document or chat. Every active yellow/red item must also have an
authority home in the manifest, diagnostic, todo fixture, spec patch proposal,
or child workstream report.

Initial gap groups:

| Group | Current evidence | Phase Two needs to learn |
| --- | --- | --- |
| Effect/provider/config/secret | Real Effect vendor proof plus contained provider provisioning/config redaction proof. | Whether representative provider/resource/config/secret behavior can cross runtime-owned Effect/provisioning/boundary-policy paths with repeatable gates and safe observation. |
| Server oRPC/Elysia | Native oRPC shape plus contained callback payload/harness delegation. | Whether a contained real request path can delegate through `ProcessExecutionRuntime`, preserve route/import-safety laws, and emit safe telemetry. |
| Async/Inngest | Inngest client/function/serve shape plus contained async bridge and harness simulation. | Whether a contained real function/serve/step path can be exercised, and exactly where durable retry/idempotency/run-history claims remain fenced. |
| Telemetry/logging/HyperDX | Redacted OTLP projection/export and local HyperDX ingest smoke. | Whether observation is repeatable enough for migration decision packets and which product/query/persistence semantics remain policy decisions. |
| Catalog/control-plane observation | Non-persistent migration/control-plane packet proof. | Whether Phase Two can produce production-critical contained evidence without choosing storage, placement, or orchestration. |
| Cross-spine readiness | Separate contained proofs across middle-spine, provider, adapter, harness, telemetry, and observation. | Whether an integrated rehearsal composes the spine end to end without hidden Parent-Repo Migration or false green labels. |

## Child Workstream Sequence

Each child workstream below is intentionally high-level. When opened, it must
become its own workstream with a fresh opening packet, authority refresh, claim
ledger, phase-local agent topology, design lock, implementation plan,
verification loop, layered review, proof-status update, and closeout packet.

### 1. Program Re-grounding And Evidence Recertification

Objective:

- Re-open the Phase Two program workstream from this document, recertify
  authority, and decide whether manifest, diagnostic, spine map, focus log,
  or gates need repair before live-boundary proof starts.

Proof ceiling:

- Coordination and evidence recertification only. No runtime proof promotion
  unless a repair actually adds or reruns a valid gate.

Required first reads:

- This document.
- `workstream-2026-04-30-phase-two-grounding-frame.md`.
- `proof-manifest.json`, `runtime-spine-verification-diagnostic.md`,
  `systems/runtime-spine-evidence-map.md`, `current-lab-state.md`.
- Runtime spec lock/stale-source section.
- Runtime-prod contamination lessons, read last.

Likely gates:

- Spec hash check.
- `runtime-realization-type-env:structural`.
- `runtime-realization-type-env:report`.
- Focused checks only if authority repair touches executable evidence.

Closeout must answer:

- What is currently earned evidence?
- What is forward assumption?
- What needs revision before the next child workstream?
- What cannot be revised without a real architecture decision?

### 2. Contained Production-Critical Scenario And Proof Ledger

Objective:

- Define the representative lab-contained runtime spine scenario that Phase Two
  will use to test live vendor and observability seams without migrating
  production code.
- Treat the scenario as contained production-critical migration evidence, not
  Lab-Production Proof or production application readiness.

Proof ceiling:

- Claim-ledger and scenario definition. No runtime proof by scenario wording.

Required first reads:

- Runtime spec sections for lifecycle, component contracts, acceptance gates,
  server flow, async flow, telemetry, config/secrets, and reserved detail
  boundaries.
- Current diagnostic component matrix.
- Vendor fidelity notes.

Likely gates:

- `runtime-realization-type-env:structural`.
- `runtime-realization-type-env:report`.
- A claim-ledger review rather than a runtime behavior gate.

Closeout must produce:

- A single representative scenario or tightly related scenario pair.
- Claim ledger with lifecycle phase, authority source, proof category, oracle,
  likely gate, and non-proof boundary for every Phase Two target.
- Explicit ordering constraints for the remaining child workstreams.

### 3. Effect + Provider/Resource/Config/Secret Spine

Objective:

- Prove representative provider/resource/config/secret behavior through
  runtime-owned Effect provisioning, boundary policy, rollback/finalization,
  safe diagnostics, and redacted catalog/telemetry output.

Proof ceiling:

- Contained production-critical lab proof. Not production provider migration.

Do not pre-decide:

- Final public `ProviderEffectPlan` shape.
- Production config precedence.
- Platform secret-store policy.
- Provider refresh/retry scheduling.

Likely evidence:

- Focused provider/provisioning tests.
- Negative fixtures for forbidden live handles, raw secrets, raw Effect leaks,
  and provider-as-execution-plan collapse.
- Explicit proof labels showing that lab memory/env/test config sources and
  redaction checks prove only contained config validation/redaction paths.
  Platform secret-store integration remains yellow/xfail unless a real
  secret-store boundary is installed, adapted, and gated.
- Manifest/diagnostic updates only to earned proof strength.

Stop if:

- The work requires final public provider API/DX law or production secret-store
  policy instead of a lab-contained representative proof.

### 4. Server oRPC/Elysia Live Boundary

Objective:

- Move from oRPC shape smoke and fake harness delegation toward a contained
  real request path that enters through the server boundary and delegates
  through `ProcessExecutionRuntime`.

Proof ceiling:

- Contained live-boundary proof for server/oRPC/Elysia behavior. Not
  production server migration or public OpenAPI/product API policy.

Do not pre-decide:

- Final production route module topology.
- Final public route import-safety law beyond what the runtime spec already
  accepts.
- Product API publication policy.

Likely evidence:

- A lab-contained oRPC/Elysia harness or equivalent real request path, if
  feasible.
- A hard label rule: if Elysia is not installed and exercised through a real
  mount/request lifecycle, the promoted claim must narrow to oRPC/native
  callback evidence and Elysia remains explicit `xfail`. Any Elysia promotion
  requires a corresponding `vendors/README.md` update.
- Tests that fail if route bodies execute during derivation or if native
  callbacks bypass runtime delegation.
- Telemetry/diagnostic checks for request boundary identity and redaction.

Stop if:

- Native host behavior cannot be exercised honestly in the lab.
- The only available proof would be another constructibility smoke test.

### 5. Async/Inngest Live Boundary

Objective:

- Move from Inngest handoff shape and contained async bridge proof toward a
  contained real function/serve/step boundary, while keeping durable semantics
  honest.

Proof ceiling:

- Contained live-boundary proof for RAWR adapter/harness wiring and
  vendor-boundary fidelity against an Inngest-facing path. Durable scheduling,
  retry, replay, idempotency, and run history remain Inngest-owned semantics;
  Phase Two may observe the boundary it actually exercises, but it must not
  recast those semantics as RAWR-owned or production-ready.

Do not pre-decide:

- Final async membership public syntax.
- Final dispatcher access public DX.
- Production worker/serve deployment topology.

Likely evidence:

- A lab-contained Inngest function/serve/step path, if feasible.
- Author-facing examples or negative fixtures around the async public surface
  such as async/effect imports, `defineAsyncStepEffect`, descriptor execution,
  and no manual native-client or FunctionBundle assembly in author code.
- Tests that fail if async executable bodies are hidden inside workflow run
  functions instead of pre-derived descriptors.
- Explicit residuals for durable semantics not exercised by the lab.

Stop if:

- Proving the claim requires a production Inngest deployment or accepting a
  durable semantics policy not already in the runtime spec.

### 6. Telemetry, Logging, HyperDX, Catalog Observation

Objective:

- Make redacted runtime observation repeatable across provider, server, async,
  execution, finalization, and catalog records, using local OTLP/HyperDX where
  it provides honest contained evidence.

Proof ceiling:

- Contained observability proof for emitted records and local ingest/query lanes
  that are actually exercised. Not product observability policy.

Do not pre-decide:

- Dashboards, alerts, retention, product query semantics, production
  OpenTelemetry bootstrap, RuntimeCatalog persistence backend, or control-plane
  topology.

Likely evidence:

- Repeatable OTLP export tests with injected fetch.
- Optional local HyperDX ingest/query smoke only if stable and scoped.
- Redaction tests for secrets, provider values, live handles, descriptor
  bodies, runtime access objects, and arbitrary diagnostic-string residuals.
- Separate closeout subsections and proof labels for telemetry/export/ingest
  evidence versus catalog/control-plane observation evidence. Local OTLP or
  HyperDX success cannot green RuntimeCatalog persistence, queryability,
  control-plane topology, deployment placement, or durable observation
  semantics.

Stop if:

- Product/query/persistence semantics become necessary to make the proof
  meaningful.

### 7. Integrated Runtime-Spine Rehearsal

Objective:

- Compose the earned Phase Two proofs into one end-to-end lab-contained
  rehearsal that demonstrates the production-critical spine coherently across
  definition, selection, derivation, compilation, provisioning, mounting, and
  observation.

Proof ceiling:

- Integrated contained proof and Parent-Repo Migration-decision evidence. Not
  Parent-Repo Migration authorization.

Required inputs:

- Closeout reports from child workstreams 1-6.
- Updated manifest/diagnostic/spine map.
- All residual decision packets produced so far.

Likely evidence:

- Focused integrated gate or gate bundle.
- A falsification matrix with at least one representative failure/rejection
  path per promoted child boundary.
- Regression check that child workstream claims remain individually falsifiable
  and are not hidden inside a monolithic happy-path demo.
- A rule that the integrated rehearsal cannot promote any child claim whose
  focused oracle/gate is missing, waived, or invalidated.
- Migration derivability review.

Stop if:

- A child proof was invalidated or a parent review finds a false green.

### 8. Closeout And Phase Three Handoff

Objective:

- Close the Phase Two program workstream with honest proof categories,
  residual packets, migration decision inputs, and a clear phase-three handoff.

Proof ceiling:

- Coordination closeout plus any previously earned Phase Two proof. Closeout
  itself adds no new runtime behavior proof.

Closeout must include:

- Proof promotions, non-promotions, and invalidations.
- Residual ledger with authority home, unblock condition, re-entry trigger,
  next eligible workstream, and lane.
- Phase-three entry criteria for final structure, Nx enforcement boundaries,
  Nx generators, and ratchet/lock mechanics.
- Explicit list of lab-only helpers and evidence that must not become
  production authority.
- Verification, review, repo/Graphite state, and compaction-safe handoff.

## Recursive Workstream Rule

No child workstream may start from this document alone. It must open with its
own workstream packet that includes:

- current repo/Graphite/Nx/spec-hash preflight;
- authority files and excluded stale inputs;
- prior child workstream assimilation;
- claim ledger and proof target;
- expected focused and composed gates;
- phase-local agent topology;
- stop/escalation conditions;
- decision packet triggers;
- closeout criteria and next packet shape.

The DRA may refine child workstream order when evidence, failed gates, parent
review, or accepted user control input proves the current order wrong. Any
reorder must be recorded as a control input in the active child workstream
report and reflected in the program workstream closeout.

## Agent And Review Topology

The host/DRA is accountable for scope, authority order, synthesis, proof
promotion, document edits, repo state, and closeout.

Use phase-local agents only when they add independent evidence or review value.
Keep no more than 6 agents active in one phase; 1-4 is preferred.

Default lanes:

| Lane | Use when | Output contract |
| --- | --- | --- |
| Authority/proof cartographer | Every child workstream. | Authority map, stale inputs, proof/status baseline, conflict rules. |
| Revision auditor | Recertification and after failed gates. | Required repairs to manifest, diagnostic, spine map, gates, or focus log. |
| Vendor fidelity reviewer | Effect, oRPC/Elysia, Inngest, TypeBox, Bun, HyperDX/OTLP claims. | Real behavior checked, vendor-vs-RAWR boundary preserved, overclaim risks. |
| Testing/evidence reviewer | Every proof target. | Falsifiable oracle, regression gate, anti-theater critique, adequacy finding. |
| Architecture/DX reviewer | Runtime lifecycle, public/pseudo-public shape, ergonomics, ownership. | Hidden second-model risks, DX drift, decision packet triggers. |
| Migration/phase-three boundary reviewer | Before closeout and when topology/Nx/generator pressure appears. | Migration decision value and phase-three-only boundary preservation. |
| Adversarial reviewer | Before proof promotion or program closeout. | False green, domino order, missing residual, and stale-authority findings. |

Agent output is evidence, not authority. The DRA must verify and synthesize it
before any manifest, diagnostic, or program workstream status changes.

## Review And Validation Loops

Every child workstream must run leaf loops before parent loops.

Leaf loops:

- Containment: no Parent-Repo Migration, workspace promotion, root export drift,
  or hidden authority expansion.
- Mechanical: paths, Nx targets, imports, generated outputs, Graphite branch
  state, and structural guard.
- Type/negative: TypeScript proof, expected failures, public surface
  boundaries, and forbidden patterns.
- Vendor fidelity: real dependency behavior only where the claim depends on
  vendor behavior.
- Oracle/live-boundary behavior: RAWR-owned delegation, no fake-host
  overclaim, and runtime-owned execution.
- Manifest/report consistency: proof entries, gates, diagnostics, focus log,
  and report output agree.

Parent loops:

- Architecture: lifecycle boundaries, ownership, no hidden second runtime
  model, no semantic drift.
- Migration derivability: whether the result reduces Parent-Repo Migration risk
  without claiming Parent-Repo Migration authorization.
- DX/API/TypeScript: whether the proof preserves RAWR's authoring posture,
  idiomatic vendor use, inference quality, and capability.
- Workstream lifecycle/process: whether the recursive workstream actually
  opened, planned, implemented, reviewed, promoted, and closed correctly.
- Adversarial evidence honesty: false green, overfit fixture, self-approval,
  missing residual, and stale authority check.

Parent failure invalidates affected leaf greens. The child workstream must
record what was invalidated, why, and which loops reran.

## Stop And Escalation Conditions

Stop or escalate before proof promotion when a choice affects:

- public authoring API or DX contract;
- final `ProviderEffectPlan` producer/consumer shape;
- final `RuntimeAccess` method law;
- dispatcher access policy;
- async step membership policy;
- cold route derivation/import-safety law;
- timeout, retry, interruption, telemetry, redaction, error/exit, or native
  host error-mapping policy;
- durable versus process-local semantics;
- vendor strategy or dependency posture;
- product observability/query/dashboard/retention/alerting policy;
- RuntimeCatalog persistence, control-plane topology, deployment placement, or
  orchestration;
- production package topology, root Nx generators, or migration sequence.

If the issue can be fenced honestly without weakening downstream proof, park it
as a residual with authority home, unblock condition, re-entry trigger, and
next eligible workstream. If it blocks the proof target, emit a decision packet
before continuing.

## Phase Three Boundary

Phase Three starts only after Phase Two closeout says the runtime-critical spine
is strong enough to guide structure work.

Phase Three owns:

- final production-shaped file structure inside the lab;
- Nx enforcement boundaries;
- Nx generators and generator idempotency proof;
- ratchet/lock mechanics;
- phase-three handoff into Parent-Repo Migration sequencing.

Phase Two may mention these as future consumers of evidence. It must not
implement them, make root Nx changes, create production generators, or treat
lab-local topology helpers as production authority.

Phase Three remains a future lab/proof phase until a separate production
migration workstream explicitly opens production code or production topology.

## Program Workstream Closeout Criteria

The Phase Two program workstream is complete only when:

- every child workstream has a closed or abandoned report;
- focused and composed gates are recorded for every promoted claim;
- manifest, diagnostic, spine map, focus log, and workstream reports agree;
- every yellow/red/deferred item has an authority home, unblock condition,
  re-entry trigger, next eligible workstream, and lane;
- vendor and observability claims are labeled by the boundary actually crossed;
- production code remained out of scope unless the user explicitly changed
  scope;
- phase-three entry criteria and handoff are explicit;
- repo and Graphite state are clean or blocked with a named reason.

## Verification For This Composition Artifact

This document-writing workstream should verify only the document and lab
structure, not Phase Two behavior.

Required checks:

- `git status --short --branch`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash check
- `bunx nx run runtime-realization-type-env:structural`
- `git diff --check`

Optional checks:

- `bunx nx run runtime-realization-type-env:report` if the document changes
  manifest/report-consumed state or if structural review requests it.

Do not run the full Phase Two program from this artifact.
