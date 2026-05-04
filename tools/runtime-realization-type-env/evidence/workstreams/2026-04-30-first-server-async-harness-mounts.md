# First Server + Async Harness Mounts

Status: `closed`.
Branch: `codex/runtime-first-server-async-harness-mounts`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/266.
Commit: submitted branch tip after PR metadata amend.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove the first contained server and async harness mounts by consuming the
  adapter lowering payloads from PR #265 and returning started harness records
  without using raw authoring declarations, SDK graphs, or compiler plans
  directly.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Harness helpers are lab-local mini-runtime proof surfaces unless the user
  accepts a production host API, package topology, deployment sequence, boundary
  policy, route import-safety law, or durable async semantics change.

Non-goals:

- Do not claim production Elysia/oRPC/Inngest readiness.
- Do not open real HTTP sockets, publish OpenAPI, or run real workers.
- Do not decide durable scheduling, retry, idempotency, cron/event delivery,
  cancellation, workflow status, telemetry/export, or final boundary policy.
- Do not decide public authoring API/DX, production package topology, provider
  strategy, or migration sequence.
- Do not treat harness constructibility as production runtime readiness.

## Opening Packet

Opening input:

- DRA continuation after PR #265 (`Real Adapter Callback + Async Bridge
  Lowering`).
- User control input: the DRA workflow is the research program workflow; keep
  going until the full program is complete and keep the HyperDX observation
  cycle in the sequence.
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 7 is
  `First Real Harness Mounts`.

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

- `2026-04-30-real-adapter-callback-async-bridge-lowering.md`
- `2026-04-30-server-route-derivation.md`
- `2026-04-30-dispatcher-access-async-step-membership.md`
- `../../src/spine/artifacts.ts`
- `../../src/spine/compiler.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/middle-spine-derivation.test.ts`
- `../../src/vendor/boundaries/orpc.ts`
- `../../src/vendor/boundaries/inngest.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`

Excluded or stale inputs:

- Vendor oRPC/Inngest shape probes as proof of production harness behavior.
- Adapter payload proof as harness proof. It is the prerequisite, not the mount
  result.
- Explicit async membership, dispatcher operation inventory, and server route
  descriptors as durable async or real HTTP proof.
- Quarantined or archived runtime docs if they conflict with the pinned spec.

Control inputs:

- User control signal on production host API shape, package topology, route
  import-safety law, boundary policy, durable async semantics, telemetry/export
  policy, vendor strategy, or migration sequence.
- Spec hash drift.
- Failed focused or composed gate.
- Parent review invalidation.
- Graphite/PR blocker.
- Discovered dependency inversion that requires boundary policy before a
  contained harness mount can be stated honestly.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `architecture`: harness lifecycle and ownership boundaries.
- `testing-design`: focused harness oracles and anti-theater checks.
- `typescript`: payload/harness types and widened invalid input checks.
- `information-design`: evidence wording that keeps harness simulation distinct
  from production readiness.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes through DRA workflow and current template.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-real-adapter-callback-async-bridge-lowering.md`

Prior final output accepted or rejected:

- Accepted as prerequisite proof: native-shaped server callback and async bridge
  payloads can be emitted from pre-derived route/owner refs, validate identity,
  reject wrong-boundary or mismatched widened inputs, avoid executable
  descriptors, and delegate through `ProcessExecutionRuntime`.
- Rejected as overclaim: real harness mounting, Elysia/oRPC/Inngest production
  behavior, durable async semantics, real HTTP/worker paths, OpenAPI, and final
  boundary policy remain unresolved.

Deferred items consumed:

- production native server harness mounting;
- native async harness mounting;
- residual `audit.p2.adapter-effect-callback-lowering`;
- residual `audit.p2.async-effect-bridge-lowering`.

Deferred items explicitly left fenced:

- `audit.p1.effect-boundary-policy-matrix`;
- final public dispatcher access policy;
- final public async membership syntax;
- final route import-safety law;
- durable scheduling/retry/idempotency semantics;
- HyperDX telemetry/export and catalog persistence.

Repair demands consumed:

- Keep semantic JSDoc/comment trailing review for TypeScript/runtime harness
  seams.

Next packet changes:

- None at opening.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A lab-local `StartedHarness` or equivalent started-harness artifact for server
  payloads that consumes `ServerAdapterCallbackPayload` and
  `ProcessExecutionRuntime`.
- A lab-local started-harness artifact for async bridge payloads that consumes
  `AsyncStepBridgePayload` and `ProcessExecutionRuntime`.
- Focused tests proving harnesses consume adapter payloads, expose invocation
  callbacks, delegate through `ProcessExecutionRuntime`, preserve full ref
  identity, record start/stop diagnostics or events, and reject raw authoring
  declarations or compiler plans.
- Evidence updates that promote only earned contained `simulation-proof`.

Optional outputs:

- Shared started-harness lifecycle helper if it reduces duplication without
  creating a production abstraction.
- Harness observation records that can feed the Boundary Policy Matrix and
  HyperDX workstreams later.

Target proof strength:

- Contained `simulation-proof` for first server/async harness mounting artifacts
  only.
- Keep production host readiness, durable async semantics, OpenAPI, real HTTP
  paths, telemetry export, and final boundary policy as `xfail` or downstream
  non-proof.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused target(s):
  - `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
  - `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- A production native host API or package topology must be chosen.
- Durable async semantics, Inngest retry/idempotency, or scheduling policy must
  be decided.
- Boundary timeout, retry, interruption, telemetry, redaction, or error mapping
  policy becomes necessary to prove the claim.
- Public dispatcher access, async membership, or route import-safety law must
  change.
- Real Elysia/oRPC/Inngest mounting or external network/server behavior is
  required.

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
  `codex/runtime-adapter-async-bridge-lowering`, then new Graphite child branch
  `codex/runtime-first-server-async-harness-mounts`.
- `gt status --short`: clean before branch creation.
- `gt log short`: verified stack ancestry through PR #265 branch.
- Pinned spec hash verified:
  `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`.

Investigation lanes:

- Authority cartographer: completed read-only.
- Implementation seam reviewer: completed read-only.
- Testing/evidence auditor: completed read-only.
- Semantic JSDoc/comment trailing reviewer: completed after implementation edits.

Phase teams:

- Opening/investigation: 3 read-only agents for authority, implementation seam,
  and evidence/test oracles.
- Trailing comment pass: 1 TypeScript semantic-comment reviewer.

Design lock:

- The host/DRA locked the smallest contained seam: a mini-runtime harness layer
  that consumes already-lowered adapter payloads and delegates through
  `ProcessExecutionRuntime`. The compiler, public authoring API, production host
  adapters, durable async semantics, and final boundary policy were not changed.

Implementation summary:

- Added lab-local server and async started harnesses in
  `../../src/mini-runtime/harnesses.ts`.
- Exported the harness helpers from `../../src/mini-runtime/index.ts`.
- Added focused mini-runtime tests for server route invocation, async step
  invocation, raw descriptor/compiler-plan rejection after type erasure,
  duplicate payload rejection, stopped server and async harness rejection before
  adapter delegation, runtime-delegation failure recording, exact ref identity
  preservation, and missing payload failure recording before runtime invocation.
- Added type-negative coverage proving harness mounts accept lowered payloads
  only, not raw descriptors or compiler plans.
- Added `first-server-async-harness-mounting.todo.ts` to preserve the
  production harness negative space after contained proof promotion.
- Updated the manifest, focus log, diagnostic, spine audit map, research program
  ledger, and residual adapter TODO wording.

Semantic JSDoc/comment trailing pass:

- Completed on `../../src/mini-runtime/harnesses.ts`. Comments were added only
  at exported lifecycle/proof seams: harness records, started harness base,
  route/step invocation methods, local stop guard, and server/async mount
  helpers. Mechanical validator/map code was left uncommented.

Verification:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`:
  passed, 31 tests / 130 assertions.
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`:
  passed, 16 tests / 77 assertions.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`:
  passed, 39 tests / 183 assertions.
- `bunx nx run runtime-realization-type-env:middle-spine --skip-nx-cache`:
  passed, 16 tests / 77 assertions.
- Remaining composed gates are recorded in Final Output after closeout.

Review loops:

- Recorded in Review Result below.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Adapter payloads are prerequisites, not harness proof. | PR #265 report and manifest entry `simulation.adapter-callback-bridge-lowering`. | Consume payloads; prove started harness lifecycle separately. | High |
| Harnesses must not consume raw authoring declarations or compiler internals directly. | Canonical harness boundary language and prior reports. | Tests must assert payload-only input shape. | High |
| Durable async semantics remain host-owned. | Async/Inngest diagnostic row and TODO fixture. | Async harness proof may invoke a step callback but must not claim scheduling/retry/idempotency. | High |

## Report

Proof promotions:

- Added `simulation.first-server-async-harness-mounts` as contained
  `simulation-proof`: lab-local server and async started harnesses consume only
  adapter lowering payloads, expose route/step callbacks, preserve full payload
  ref identity, reject raw descriptors and compiler plans before invocation,
  reject stopped invocations before adapter delegation, record
  start/invoke/stop/failure lifecycle events, and delegate through
  `ProcessExecutionRuntime`.

Proof non-promotions:

- Kept production Elysia/oRPC/Inngest mounting, real HTTP/worker paths, other
  harness kinds, deployment wiring, durable async semantics, OpenAPI
  publication, final boundary policy, package topology, telemetry/export, and
  product observability policy as non-proof.

Diagnostic changes:

- Moved `Harness mounting` from red to yellow in the diagnostic: contained
  server/async mini harnesses are proven, but production hosts and durable async
  remain open.
- Updated the adapter lowering row to remove `StartedHarness` integration as a
  remaining contained-lab gap while retaining production callback lifecycle and
  boundary-policy gaps.

Spec feedback:

- No canonical spec change proposed. The work aligns with the pinned harness
  lifecycle direction while preserving unresolved production host semantics as
  negative space.

Test-theater removals or downgrades:

- None. Vendor probes remain vendor evidence only; adapter payload proof remains
  a prerequisite rather than being promoted as harness proof.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Boundary policy matrix | `xfail` | Started harnesses may prove lifecycle wiring, but timeout, retry, interruption, telemetry, redaction, and error mapping are broader policy. | `audit.p1.effect-boundary-policy-matrix`. | Harness behavior requires default boundary behavior beyond delegation. | A test or implementation would otherwise choose default timeout/retry/error semantics. | Boundary Policy Matrix. | spec |
| Durable async semantics | `xfail` | Async harness mount can expose a callback into the process runtime but cannot prove Inngest durability. | Canonical async/Inngest sections and `audit.p2.async-effect-bridge-lowering`. | Architecture accepts durable semantics or real Inngest harness work owns native behavior. | Async harness proof would otherwise imply scheduling/retry/idempotency. | Boundary Policy Matrix or HyperDX Observation. | spec/migration |
| HyperDX telemetry/export | `todo` | Docker HyperDX is available, but observation should follow explicit boundary policy and first harness signals. | DRA workflow and research program `audit.telemetry.hyperdx-observation`. | Harness records and boundary policy are explicit enough to emit redacted queryable signals. | Observation needs queryable traces/events instead of in-memory records only. | Runtime Telemetry + HyperDX Observation. | lab/migration |

## Review Result

Leaf loops:

- Containment: all edits stayed under `tools/runtime-realization-type-env/**`.
- Mechanical: no compiler/public API/package topology changes were introduced.
- Type/negative: harness mounts reject raw descriptors and compiler plans in
  type-negative fixtures and runtime-erased focused tests.
- Semantic JSDoc/comments: trailing reviewer added semantic comments at harness
  proof seams only.
- Vendor: no vendor Elysia/oRPC/Inngest behavior was claimed.
- Mini-runtime: focused and target-level mini-runtime gates passed.
- Manifest/report: proof promotion and residual xfail/todo entries were updated.

Parent loops:

- Architecture: accepted only a lab-local `StartedHarness`-equivalent proof
  surface; production hosts remain unresolved.
- Migration derivability: added `audit.p2.production-harness-mounting` so
  migration cannot mistake contained harness records for production mounting.
- DX/API/TypeScript: no public API or authoring syntax changed; helpers are
  lab-internal mini-runtime exports.
- Workstream lifecycle/process: report was closed before commit, and the next
  workstream packet is specified.
- Adversarial evidence honesty: production readiness, durable async, boundary
  policy, telemetry/export, and catalog persistence stay fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None at opening. |  |  |  |  |  |

Invalidations:

- None at opening.

Repair demands:

- None at opening.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None at opening. |  |  |  |

## Final Output

Artifacts:

- `../../src/mini-runtime/harnesses.ts`
- `../../src/mini-runtime/index.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../fixtures/inline-negative/runtime-access-boundaries.ts`
- `../../fixtures/todo/first-server-async-harness-mounting.todo.ts`
- `../../fixtures/todo/adapter-effect-callback-lowering.todo.ts`
- `../proof-manifest.json`
- `../focus-log.md`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../runtime-realization-research-program.md`

Verification run:

- `bunx nx show project runtime-realization-type-env --json`: passed.
- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`:
  passed, 31 tests / 130 assertions.
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`:
  passed, 16 tests / 77 assertions.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`:
  passed.
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`:
  passed, 39 tests / 183 assertions.
- `bunx nx run runtime-realization-type-env:middle-spine --skip-nx-cache`:
  passed, 16 tests / 77 assertions.
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed.
- `bun run runtime-realization:type-env`: passed.
- `git diff --check`: passed.

Repo/Graphite state:

- Final submitted snapshot: clean on
  `codex/runtime-first-server-async-harness-mounts...origin/codex/runtime-first-server-async-harness-mounts`.
  `gt status --short` was clean after submission.

## Next Workstream Packet

Recommended next workstream:

- Boundary Policy Matrix, unless harness implementation proves that a
  telemetry/HyperDX observation cycle must move earlier.

Why this is next:

- Once first server and async harnesses are mounted inside the lab, boundary
  behavior becomes observable enough that timeout, retry, interruption,
  telemetry, redaction, and error/exit policy need explicit treatment before
  migration-ready claims.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../test/mini-runtime/process-runtime.test.ts`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- residual harness mount gaps from this workstream
- `audit.p1.effect-boundary-policy-matrix`
- `audit.telemetry.hyperdx-observation` only if boundary policy explicitly
  moves telemetry earlier
