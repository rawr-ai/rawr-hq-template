# Boundary Policy Matrix

Status: `closed`.
Branch: `codex/runtime-boundary-policy-matrix`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/267
Commit: submitted branch tip after PR metadata amend.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove a contained runtime boundary policy matrix for executable/provider
  boundaries after first server/async harnesses are available: timeout,
  retry-attempt declaration, interruption signal propagation, Exit/Cause error
  classification, redacted diagnostic/telemetry metadata, and lifecycle policy
  records.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Policy helpers are lab-local runtime proof surfaces. They do not choose the
  final public authoring API, production package topology, native host
  integration contract, telemetry exporter, or durable async semantics.

Non-goals:

- Do not choose final public boundary policy syntax or API/DX.
- Do not implement production retry schedulers, durable retry/idempotency,
  queues, cron/event delivery, or workflow status semantics.
- Do not export telemetry to HyperDX or any production store in this
  workstream.
- Do not claim production Elysia/oRPC/Inngest readiness, OpenAPI publication,
  real HTTP behavior, or worker mounting.
- Do not treat provider refresh/retry policy, typed config precedence, or
  platform secret stores as solved.

## Opening Packet

Opening input:

- DRA continuation after PR #266 (`First Server + Async Harness Mounts`).
- User control input: complete the entire research program without stopping,
  keep the DRA continuity anchor visible, and include Docker HyperDX as a later
  dedicated telemetry/query observation cycle.
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 8 is
  `Boundary Policy Matrix`.

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`
- canonical runtime spec pinned by `../proof-manifest.json`:
  `../../../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Coordination inputs:

- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../phased-agent-verification-workflow.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- `2026-04-30-first-server-async-harness-mounts.md`
- `2026-04-30-real-adapter-callback-async-bridge-lowering.md`
- `2026-04-30-provider-diagnostics-runtime-profile-config-redaction.md`
- `../../src/mini-runtime/harnesses.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/runtime-access.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/mini-runtime/catalog.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/mini-runtime/provider-provisioning.test.ts`

Excluded or stale inputs:

- Vendor Effect interruption proof as final RAWR boundary policy.
- HyperDX availability as proof of runtime telemetry/export policy.
- Provider config redaction proof as arbitrary free-form diagnostic string
  redaction.
- First mini harness mounting as production native host policy.
- Quarantined or archived runtime docs if they conflict with the pinned spec.

Control inputs:

- User control signal on final public boundary API/DX, retry strategy,
  interruption semantics, durable async retry/idempotency, telemetry exporter,
  product observability policy, package topology, vendor strategy, or migration
  sequence.
- Spec hash drift.
- Failed focused or composed gate.
- Parent review invalidation.
- Graphite/PR blocker.
- Discovered dependency inversion that requires HyperDX observation or durable
  async semantics before the contained policy matrix can be stated honestly.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `architecture`: lifecycle and ownership boundaries for runtime policy.
- `testing-design`: matrix oracles and anti-theater checks for timeout,
  retry-attempt, interruption, redaction, and error classification.
- `typescript`: policy type shape, discriminants, and widened invalid inputs.
- `information-design`: evidence wording that separates contained policy proof
  from final API or production host behavior.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes through DRA workflow and current template.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-first-server-async-harness-mounts.md`

Prior final output accepted or rejected:

- Accepted as prerequisite proof: lab-local server and async started harnesses
  consume adapter lowering payloads, expose invocation callbacks, preserve full
  payload ref identity, reject raw descriptors/compiler plans, reject stopped
  invocations before adapter delegation, record lifecycle events, and delegate
  through `ProcessExecutionRuntime`.
- Rejected as overclaim: production Elysia/oRPC/Inngest mounting, real HTTP or
  worker paths, durable async behavior, deployment wiring, final boundary
  policy, and telemetry/export remain unresolved.

Deferred items consumed:

- `audit.p1.effect-boundary-policy-matrix`;
- boundary timeout, retry, interruption, telemetry, redaction, and error/exit
  policy from prior provider/adapter/harness workstreams;
- free-form provider diagnostic string policy pressure from provider diagnostics;
- HyperDX observation only as a later consumer of policy-shaped records.

Deferred items explicitly left fenced:

- final public boundary policy API/DX;
- production retry/backoff/scheduler implementation;
- durable async retry/idempotency/status semantics;
- HyperDX telemetry export/query proof;
- catalog persistence and control-plane placement;
- production native host mounting and package topology.

Repair demands consumed:

- Keep semantic JSDoc/comment trailing review for new TypeScript/runtime policy
  seams.

Next packet changes:

- User added a control input to insert a dedicated Semantic Runtime
  Documentation Harvest workstream after Boundary Policy Matrix and before
  HyperDX. The DRA workflow, research program, and manifest now carry this
  sequence entry.

Invalidations from prior assumptions:

- Initial partial implementation overclaimed interruption by recording only
  metadata. Testing/evidence review invalidated that assumption; the final
  implementation propagates `AbortSignal` through `EffectRuntimeAccess`.

## Output Contract

Required outputs:

- A lab-local boundary policy matrix type/model that records timeout,
  retry-attempt declaration, interruption, error/exit classification,
  redaction/telemetry metadata, and boundary kind without becoming public API.
- Mini-runtime policy application helpers for executable invocations and
  provider acquisition/release records where the lab can observe behavior
  without production host integration.
- Focused tests proving policy records are emitted, secret-bearing metadata is
  redacted, timeout/retry fields are declarative rather than production
  scheduler behavior, interruption signals are propagated/classified, and
  Effect success/failure/defect/interruption outcomes classify consistently.
- Evidence updates that promote only earned contained `simulation-proof`.

Optional outputs:

- Shared redaction/classification helpers if they reduce duplication across
  runtime access, provider provisioning, adapter, and harness records.
- Policy records shaped so the HyperDX workstream can later emit/query them
  without deciding product observability semantics now.

Target proof strength:

- Contained `simulation-proof` for policy record/classification behavior only.
- Keep final public API/DX, production retry scheduling, durable async,
  telemetry export, catalog persistence, and production host behavior as
  `xfail`, `todo`, or downstream non-proof.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused target(s):
  - `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
  - `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- Final public boundary policy syntax or authoring DX must be chosen.
- A production retry/backoff scheduler or durable async retry/idempotency law
  must be implemented.
- HyperDX export/query behavior becomes necessary to prove the matrix.
- Native Elysia/oRPC/Inngest error mapping or real HTTP/worker behavior becomes
  necessary.
- Policy shape forces package topology, vendor strategy, or migration sequence.

## Acceptance / Closure Criteria

This workstream may close only when:

- required outputs are present;
- proof/non-proof status is reflected in manifest and diagnostic where needed;
- every deferred item has an authority home, unblock condition, and re-entry
  trigger;
- leaf review loops and parent review loops are recorded;
- focused and composed gates are recorded;
- repo and Graphite state are recorded;
- the next workstream packet is usable by a zero-context agent.

## Workflow

Preflight:

- `git status --short --branch`: clean on
  `codex/runtime-first-server-async-harness-mounts`, then new Graphite child
  branch `codex/runtime-boundary-policy-matrix`.
- `gt status --short`: clean before branch creation.
- `gt log short`: verified stack ancestry through PR #266 branch.
- Pinned spec hash verified:
  `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`.

Investigation lanes:

- Authority cartographer: completed read-only.
- Implementation seam reviewer: completed read-only.
- Testing/evidence auditor: completed read-only.
- Semantic JSDoc/comment trailing reviewer: completed after implementation
  edits.

Phase teams:

- Opening/investigation: 3 read-only agents for authority, implementation seam,
  and evidence/test oracles.
- Trailing comment pass: 1 semantic JSDoc/comment reviewer for scoped runtime
  files.

Design lock:

- The host/DRA locked a lab-local policy seam: exact-boundary policy records in
  `boundary-policy.ts`, optional process-runtime policy resolution from compiled
  plan or lab resolver, provider acquire/release policy trace records, and
  `EffectRuntimeAccess` signal pass-through. No public policy API, adapter input
  API, production retry scheduler, durable async law, HyperDX exporter, or
  package topology was introduced.

Implementation summary:

- Added `../../src/mini-runtime/boundary-policy.ts` with exact matrix boundary
  kinds, record-only policy snapshots, retry-attempt validation, interruption
  snapshots, signal-bearing resolution, Exit/Cause classification, and redacted
  policy record projection.
- Extended `../../src/mini-runtime/managed-runtime.ts` to pass an optional
  `AbortSignal` into real Effect execution without exposing the live runtime
  handle.
- Extended `../../src/mini-runtime/process-runtime.ts` so executable boundaries
  emit enter/exit policy records from compiled plan policy or a lab-local
  resolver. Signals are propagated to Effect execution but not retained in
  events.
- Extended `../../src/mini-runtime/provider-lowering.ts` so provider acquire and
  release can emit separate policy enter/exit records with redacted attributes
  and Exit/Cause classification.
- Added focused process-runtime tests for classification, invalid policy
  metadata, redaction, no retry scheduling, adapter-inherited runtime policy
  records, and real interruption propagation/finalization.
- Added focused provider provisioning tests for acquire/release policy records,
  acquire failure classification, release failure classification, exact provider
  boundary kinds, and redaction.
- Updated the spine simulation runtime-bound context assertion to expect the
  compiled-plan boundary policy enter/exit records now emitted by
  `ProcessExecutionRuntime`.
- Updated proof manifest, focus log, diagnostic, spine/effect maps, research
  program, residual TODO fixture, and DRA workflow sequence.

Semantic JSDoc/comment trailing pass:

- Completed on `../../src/mini-runtime/boundary-policy.ts`,
  `../../src/mini-runtime/managed-runtime.ts`,
  `../../src/mini-runtime/process-runtime.ts`, and
  `../../src/mini-runtime/provider-lowering.ts`. Comments document exact matrix
  boundary kinds, lab/proof-only policy snapshots, record-only telemetry,
  declarative timeout/retry, handle-free AbortSignal policy records, signal
  pass-through, and provider acquire/release policy scope.

Verification:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`:
  passed, 37 tests / 154 assertions.
- `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`:
  passed, 9 tests / 62 assertions.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:simulate --skip-nx-cache`:
  passed, 6 tests / 18 assertions.
- `git diff --check`: passed.
- Remaining composed gates are recorded in Final Output.

Review loops:

- Recorded in Review Result below.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Boundary policy is the next dependency after harness records. | First harness report and diagnostic next-iteration list. | Consume harness/provisioning/adapter records and prove policy-shaped classification only. | High |
| Telemetry export is not required to prove policy shape. | DRA workflow puts HyperDX after Semantic Runtime Documentation Harvest. | Keep HyperDX fenced until the dedicated observation workstream consumes the harvested policy/documentation seams. | High |
| Retry must remain declarative in the contained lab. | Canonical spec reserves provider-specific refresh/retry strategy and durable async policy. | Record retry-attempt metadata without implementing production scheduler semantics. | High |

## Report

Proof promotions:

- Promoted `audit.p1.effect-boundary-policy-matrix` to contained
  `simulation-proof`: exact executable/provider boundary kinds, timeout
  metadata, retry-attempt declaration without retry scheduling, AbortSignal
  interruption propagation/classification, Effect Exit/Cause
  success/failure/defect/interruption classification, record-only telemetry
  metadata, redacted attributes, adapter-inherited runtime policy records, and
  provider acquire/release policy records.
- Added `audit.semantic-runtime-jsdoc-harvest` as `todo` in the program and
  manifest to carry the user's semantic documentation harvest request.

Proof non-promotions:

- Final public policy API/DX, production retry/backoff, timeout enforcement,
  durable async retry/idempotency/status semantics, native host error mapping,
  HyperDX export/query, product observability policy, catalog persistence,
  provider refresh policy, config precedence, platform secret stores, and
  arbitrary free-form diagnostic string redaction remain non-proof under
  `audit.p1.effect-boundary-policy-matrix.residual`.

Diagnostic changes:

- Updated the diagnostic so process runtime, provider, adapter, and observation
  rows reflect contained policy-record proof while retaining production policy,
  host mapping, telemetry export, and durable gaps.

Spec feedback:

- No spec patch proposed. The lab now proves a record-only policy substrate, but
  final public policy law and production host mappings remain architecture work.

Test-theater removals or downgrades:

- Downgraded the initial metadata-only interruption assumption during
  implementation. Final proof requires and tests real `AbortSignal` propagation
  into Effect execution.
- Repaired the pre-policy spine simulation event assertion after the full gate
  showed it was hiding the newly emitted boundary policy enter/exit records.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Final public boundary policy API/DX | `xfail` | This workstream can prove lab policy records without choosing authoring syntax. | `audit.p1.effect-boundary-policy-matrix.residual` and canonical boundary policy sections. | Architecture accepts final public policy surface. | A production authoring or adapter workstream needs user-facing policy declarations. | Migration/Control-Plane Observation or decision packet. | spec |
| Production retry/backoff scheduler | `xfail` | Contained retry-attempt records are not durable scheduling. | Canonical async/provider reserved policy sections. | Runtime chooses scheduler/retry semantics and host ownership. | A test would otherwise execute delayed retries or durable idempotency. | Migration/Control-Plane Observation or durable async work. | spec/migration |
| HyperDX telemetry/export | `todo` | Docker HyperDX is available, but export/query proof follows explicit policy shape. | DRA workflow and `audit.telemetry.hyperdx-observation`. | Policy records are redacted and stable enough to emit. | Observation needs queryable traces/events/diagnostics instead of in-memory records. | Runtime Telemetry + HyperDX Observation. | lab/migration |
| Semantic runtime JSDoc harvest | `todo` | Comments added during each workstream are useful but should be reviewed holistically before production migration copy/paste. | DRA workflow, research program, `audit.semantic-runtime-jsdoc-harvest`. | Boundary policy comments and enough runtime seams exist to harvest high-signal JSDoc. | Production migration work needs semantic comments that explain lifecycle/authority seams. | Semantic Runtime Documentation Harvest. | documentation/migration |

## Review Result

Leaf loops:

- Containment: all edits stayed under `tools/runtime-realization-type-env/**`.
- Mechanical: no public SDK/authoring API, adapter input API, production package
  topology, or workspace wiring changed.
- Type/negative: typecheck and negative fixtures passed; negative fixture keeps
  live `AbortSignal` handles out of policy snapshots.
- Semantic JSDoc/comments: trailing reviewer added semantic comments only at
  new policy/runtime seams.
- Vendor: Effect interruption remains vendor behavior consumed through a
  RAWR-owned runtime access seam; vendor proof was not promoted as production
  runtime readiness.
- Mini-runtime: focused process-runtime and provider-provisioning tests passed.
- Manifest/report: manifest, focus log, diagnostic, maps, residual TODO, and
  research program were updated to match earned proof strength.

Parent loops:

- Architecture: accepted only record-only lab policy proof; no final public
  policy law or production host mapping was chosen.
- Migration derivability: policy records are now shaped for semantic
  documentation and HyperDX observation work without claiming export/persistence.
- DX/API/TypeScript: policy resolution remains lab-local; adapters inherit
  runtime policy records rather than accepting a new public policy parameter.
- Workstream lifecycle/process: packet opened first, agents reviewed, comments
  trailed edits, report is being closed before commit, next workstream is
  specified.
- Adversarial evidence honesty: metadata-only interruption and coarse boundary
  kinds were corrected before promotion.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None at opening. |  |  |  |  |  |

Invalidations:

- Metadata-only interruption proof was invalidated and replaced with
  `AbortSignal` propagation through `EffectRuntimeAccess`.
- Coarse boundary kinds (`executable`, `provider-acquire`,
  `provider-release`) were invalidated and replaced with exact execution
  boundary kinds plus `provider.acquire`/`provider.release`.

Repair demands:

- None remaining.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None at opening. |  |  |  |

## Final Output

Artifacts:

- `../../src/mini-runtime/boundary-policy.ts`
- `../../src/mini-runtime/managed-runtime.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/mini-runtime/index.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/mini-runtime/provider-provisioning.test.ts`
- `../../test/spine-simulation.test.ts`
- `../../fixtures/inline-negative/runtime-access-boundaries.ts`
- `../../fixtures/todo/effect-boundary-policy-matrix.todo.ts`
- `../proof-manifest.json`
- `../focus-log.md`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../effect-integration-map.md`
- `../runtime-realization-research-program.md`
- `../dra-runtime-research-program-workflow.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`:
  passed, 37 tests / 154 assertions.
- `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`:
  passed, 9 tests / 62 assertions.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:simulate --skip-nx-cache`:
  passed, 6 tests / 18 assertions.
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`:
  passed, 46 tests / 216 assertions.
- `bunx nx run runtime-realization-type-env:gate`: passed.
- `bun run runtime-realization:type-env`: passed.
- `git diff --check`: passed.

Repo/Graphite state:

- Submitted as PR #267 on `codex/runtime-boundary-policy-matrix`.
- `gh pr view 267`: open, non-draft, Graphite mergeability check in
  progress at submission time.
- Repo and Graphite status were clean before the PR metadata amend.

## Next Workstream Packet

Recommended next workstream:

- Semantic Runtime Documentation Harvest, then Runtime Telemetry + HyperDX
  Observation unless semantic-doc review discovers a blocker or stale comment
  that must be repaired first.

Why this is next:

- The user explicitly requested a dedicated semantic documentation cycle before
  the program proceeds into HyperDX. The lab now contains enough runtime seams
  that production migration can benefit from harvested high-signal JSDoc, while
  comments still need a holistic review so they do not become fake proof or
  accidental public API law.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/harnesses.ts`
- `../../src/mini-runtime/boundary-policy.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/mini-runtime/catalog.ts`
- `../../test/mini-runtime/process-runtime.test.ts`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.semantic-runtime-jsdoc-harvest`
- `audit.telemetry.hyperdx-observation`
- any policy matrix residuals from this workstream
