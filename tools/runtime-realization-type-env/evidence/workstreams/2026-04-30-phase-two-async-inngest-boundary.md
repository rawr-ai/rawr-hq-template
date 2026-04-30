# Phase Two Async Inngest Boundary

Status: `closed`.
Branch: `codex/runtime-phase-two-async-inngest-boundary`.
PR: `none`.
Commit: branch head after closeout commit.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority.

## Frame

Objective:

- Prove the strongest honest Phase Two async boundary slice available inside
  the lab: a contained Inngest-facing function/serve/step path that delegates
  through the async adapter bridge, mini async harness, and
  `ProcessExecutionRuntime`.
- Keep durable scheduling, retry, replay, idempotency, run history, production
  worker topology, final async membership syntax, and dispatcher public DX
  explicitly fenced unless they are actually exercised and accepted.

Containment boundary:

- Changes stay inside `tools/runtime-realization-type-env/**`.
- No production packages, root workspace wiring, production topology, root
  dependency changes, or Phase Three Nx/generator work is in scope.

Non-goals:

- Do not claim production async migration readiness.
- Do not decide final async membership public syntax, dispatcher public DX,
  production Inngest worker/serve deployment topology, durable semantics, or
  product async policy.
- Do not promote an Inngest constructibility smoke test as RAWR runtime
  integration.

## Opening Packet

Opening input:

- Child workstream 4 closed with contained oRPC Fetch request-boundary proof.
- Child workstream 5 consumes claim rows `p2.async.inngest-handoff`,
  `p2.async.callback-step`, and `p2.async.durable-residual`.
- User control input requires the DRA loop to continue through the whole Phase
  Two program, not stop after this child.

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`

Coordination inputs:

- `../dra-phase-two-level-zero-workflow.md`
- `2026-04-30-phase-two-production-readiness-program-workstream.md`
- `2026-04-30-phase-two-server-orpc-elysia-boundary.md`
- `../phase-two-production-critical-claim-ledger.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- Canonical runtime spec pinned by the manifest.
- `../vendor-fidelity.md`
- `../../src/vendor/boundaries/inngest.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../src/mini-runtime/harnesses.ts`
- `../../fixtures/positive/async-workflow.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- Installed `inngest` package declarations and runtime source for API reality
  only.

Excluded or stale inputs:

- Production `apps/*`, `packages/*`, `services/*`, and worker deployment
  behavior remain out of scope.
- Runtime-prod stack syntax, generated topology, package topology, and branch
  claims remain non-authority.
- Inngest durable scheduling/retry/idempotency semantics remain vendor-owned
  unless a real durable boundary is exercised; local callback tests cannot
  green them.

Control inputs:

- Continue autonomously unless a documented Level Zero stop condition fires.

Selected skill lenses:

- `inngest`: checked the Inngest function/serve/step model and local testing
  caveats.
- `graphite`: branch/stack workflow in this Graphite-owned repo.
- `nx-run-tasks`: focused and composed verification through Nx targets.

Refresher:

- Research program refreshed: `skipped`; Phase Two anchors are the active
  sequence authority.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-phase-two-server-orpc-elysia-boundary.md`

Prior final output accepted or rejected:

- Accepted: `audit.p2.server-orpc-fetch-boundary` supplies server-side
  live-boundary precedent for JSON request data entering a real vendor handler
  and receiving runtime context assembled inside the boundary.
- Rejected as async proof: the server/oRPC result does not prove Inngest,
  async step execution, durable semantics, or worker topology.

Deferred items consumed:

- `p2.async.inngest-handoff`
- `p2.async.callback-step`
- `p2.async.durable-residual`

Deferred items explicitly left fenced at opening:

- Durable scheduling, retry, replay, idempotency, run history, production
  worker deployment, and hosted Inngest behavior.
- Final async membership authoring syntax.
- Final dispatcher public DX and async host policy.
- Product async policy and production migration readiness.

Repair demands consumed:

- None from child workstream 4.

Next packet changes:

- Child workstream 6 may consume this work only as async boundary/observation
  evidence labeled by the boundary actually crossed.

Invalidations from prior assumptions:

- None at opening. The workstream must still reject any approach that carries
  live runtime context through serialized Inngest event data.

## Output Contract

Required outputs:

- A focused contained Inngest-facing proof that crosses `inngest/bun`
  `serve(...)`, a real `Inngest.createFunction(...)` handler, and `step.run`,
  then delegates through the mini async harness into `ProcessExecutionRuntime`.
- A failure oracle proving wrong function routing does not invoke the async
  harness.
- Manifest/focus/diagnostic/spine/vendor-fidelity updates that promote only
  the earned contained Inngest-facing boundary proof and keep durable semantics
  fenced.
- Workstream closeout and next packet for telemetry/logging/HyperDX/catalog
  observation.

Optional outputs:

- A lab helper for mounting a contained Inngest async boundary over an existing
  started mini async harness.

Target proof strength:

- `simulation-proof` for the contained Inngest-facing function/serve/step
  boundary when it delegates through RAWR runtime-owned async harnessing.
- Existing Inngest constructibility remains `vendor-proof`.
- Durable semantics remain `xfail`/non-promotion.

Expected gates:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check
- `bun test tools/runtime-realization-type-env/test/mini-runtime/inngest-async-boundary.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:vendor-boundaries`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`

Stop/escalation conditions:

- Stop only if honest async proof requires production Inngest deployment,
  root/package mutation, final public async membership law, dispatcher public
  DX, durable semantics policy, production worker topology, or product async
  policy. Fenceable residuals stay host-owned.

## Acceptance / Closure Criteria

This workstream may close only when:

- focused Inngest-facing boundary proof passes or is honestly fenced;
- durable semantics are explicitly non-promoted unless actually exercised;
- proof/non-proof status is reflected in manifest, diagnostic, spine map,
  focus log, and vendor-fidelity notes;
- leaf and parent reviews are recorded;
- focused and composed gates are recorded;
- scratch documents are absent or disposed;
- repo/Graphite state is clean or explicitly blocked;
- child workstream 6 has a usable next packet.

## Workflow

Preflight:

- Continued on `codex/runtime-phase-two-async-inngest-boundary`.
- Verified clean repo/Graphite state, Nx project truth, and manifest-pinned
  spec hash.

Investigation lanes:

- Host read Level Zero, Phase Two program workstream, child 4 report, claim
  ledger, vendor fidelity notes, Inngest skill references, manifest,
  diagnostic, spine map, focus log, async adapter/harness/runtime source, and
  installed Inngest package source/declarations.

Phase teams:

- `package-inventory`: one Explorer agent for Inngest package API and lab async
  file-surface facts.
- `proof-review`: one default reasoning agent for proof adequacy, false-green
  risks, required oracles, and durable residual fencing.

Agent scratch documents:

- Not used at opening. The lanes are bounded; if either lane becomes deep
  enough to need scratch, it must be integrated and disposed before closeout.

Design lock:

- The honest child-5 proof is a contained Inngest-facing Bun serve/function/step
  boundary. A synthetic local executor-shaped Fetch request enters
  `inngest/bun` `serve(...)`, routes by absolute Inngest function id into a
  real `Inngest.createFunction(...)` handler, crosses `step.run(...)` using the
  stable async step id, and delegates the step body through the started mini
  async harness into `ProcessExecutionRuntime`.
- The proof is deliberately not a public Inngest protocol guarantee and not
  durable host proof. Durable scheduling, retry, replay, idempotency, run
  history, worker deployment, and product async policy remain fenced.

Implementation summary:

- Added `src/mini-runtime/adapters/inngest-async.ts`, a lab-contained Inngest
  async boundary over a started mini async harness.
- Exported the helper from `src/mini-runtime/index.ts`.
- Added `test/mini-runtime/inngest-async-boundary.test.ts`.
- Added manifest entry `audit.p2.async-inngest-function-step-boundary`.
- Updated focus log, diagnostic, spine audit map, vendor fidelity notes, claim
  ledger rows, and residual TODO wording.
- Added a negative fixture assertion that native Inngest functions are not
  already-lowered RAWR async bridge payloads.

Semantic JSDoc/comment trailing pass:

- `passed`: reviewed `src/mini-runtime/adapters/inngest-async.ts` and added a
  concise comment marking the helper as real Inngest Bun serve/function/step
  handling plus lab-contained runtime delegation, not durable scheduling,
  hosted worker topology, replay/idempotency proof, or public async DX law. The
  focused test did not need extra comments beyond names and assertions.

Verification:

- Recorded in `Final Output`.

Review loops:

- Recorded in `Review Result`.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| A contained Inngest-facing function/step boundary is feasible without production deployment or root dependency mutation. | Host scratch run and Explorer report both exercised `inngest/bun` `serve(...)` with a synthetic executor-shaped Fetch request, absolute function id, and `step.run(...)`; focused test now records this path. | Added contained boundary helper and focused test. | High |
| The proof must be labeled as lab-contained simulation plus vendor-boundary evidence, not durable Inngest proof. | Inngest owns scheduling, retries, replay, history, queues, and durable semantics; both agents flagged false-green risk. | Manifest/diagnostic/report wording fences durable semantics and production worker topology. | High |
| Runtime context must be assembled inside the boundary, not smuggled through event data. | Child 4 invalidated JSON context smuggling for server requests; async test includes event/resource/execution secret checks. | Boundary passes only event data through the Inngest request and calls `createInvocationContext(...)` inside the function handler. | High |
| Unknown function ids must fail before harness invocation. | Focused test sends `fnId=missing-function` and asserts the fake harness invocation count stays zero. | Added failure oracle. | High |

## Report

Proof promotions:

- Added `audit.p2.async-inngest-function-step-boundary` as
  `simulation-proof`.

Proof non-promotions:

- Durable Inngest scheduling/retry/replay/idempotency/run history and
  production worker topology are non-promotions unless this workstream records
  a stronger exercised boundary.
- Did not promote production Inngest worker deployment, hosted registration,
  queue/event delivery, public Inngest protocol stability, final async
  membership syntax, dispatcher public DX, product async policy, native host
  telemetry/error mapping, or production migration readiness.

Diagnostic changes:

- Updated async/adapter/harness rows to mention the contained Inngest
  Bun serve/function/step boundary while preserving yellow status and
  production/durable residuals.

Spec feedback:

- None. The work fits the existing runtime spec as a lab-contained boundary
  proof and does not require a public async API/DX decision.

Test-theater removals or downgrades:

- None. The proof crosses real Inngest `serve(...)`, `createFunction(...)`, and
  `step.run(...)` before RAWR adapter/harness/runtime delegation; durable
  behavior remains fenced instead of implied.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Durable Inngest scheduling/retry/replay/idempotency/run history | `xfail` | Local function/step proof cannot establish hosted durable behavior. | `p2.async.durable-residual`; `audit.p2.async-effect-bridge-lowering`; diagnostic async row. | Real durable Inngest runtime/host behavior is explicitly opened, exercised, and scoped. | Any green claim depends on durable async semantics. | Later vendor/host policy workstream or production migration workstream | `lab/vendor` |
| Production Inngest worker/serve deployment topology | `xfail` | Current proof uses in-process Bun serve handler invocation, not production worker deployment, endpoint registration, public routing, or host lifecycle. | `audit.p2.production-harness-mounting`; diagnostic harness row. | Production async host topology is intentionally opened. | Any migration packet treats contained Inngest proof as production worker readiness. | Phase Three or production migration workstream | `migration-only` |
| Final async membership syntax and dispatcher public DX | `xfail` | Child 5 consumes existing explicit refs and dispatcher inventory; it does not decide the final authoring channel. | `audit.p0.async-step-membership`; `audit.p1.dispatcher-access`; diagnostic async row. | Public async membership and dispatcher law is accepted or revised. | Any implementation needs final workflow/schedule/consumer membership syntax or public dispatcher access law. | Phase Three or explicit API/DX decision packet | `spec` |
| Native host telemetry/error mapping | `xfail` | Boundary records lab response/adapter/harness/runtime events only, not native host telemetry or error payload mapping. | `audit.p1.effect-boundary-policy-matrix.residual`; telemetry residuals. | Native host telemetry/error policy is accepted and gated. | Telemetry or integrated proof depends on native async host logs/errors. | Telemetry/logging/HyperDX or integrated rehearsal if needed | `spec/lab` |

## Review Result

Leaf loops:

- Containment: passed; all changes are inside
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed; `inngest` dependency was already root-resolvable, no
  root/package/workspace files changed, and no production files were touched.
- Type/negative: passed with focused test, typecheck, and negative gate.
- Semantic JSDoc/comments: passed; one exported proof seam comment added in
  `inngest-async.ts`.
- Vendor: passed with honest labeling; real `inngest/bun` serve,
  `Inngest.createFunction`, and `step.run` are exercised, while durable
  semantics remain non-promoted.
- Mini-runtime: passed; focused and composed mini-runtime gates recorded.
- Manifest/report: passed; manifest/focus/diagnostic/spine/report agree on
  `audit.p2.async-inngest-function-step-boundary`.

Parent loops:

- Architecture: passed; lifecycle remains Inngest-facing request boundary ->
  function/step callback -> async bridge payload -> harness -> process runtime
  -> observation.
- Migration derivability: passed; the result reduces async-boundary migration
  uncertainty without claiming production async readiness.
- DX/API/TypeScript: passed; no public membership syntax or dispatcher law was
  invented, and native Inngest functions remain rejected as RAWR descriptors or
  async bridge payloads.
- Workstream lifecycle/process: passed; child opened, implemented, reviewed,
  promoted narrowly, and hands a packet to child 6.
- Adversarial evidence honesty: passed; local synthetic executor POST is
  labeled as contained Inngest-facing boundary proof, not public protocol or
  durable-host proof.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- None.

Repair demands:

- None.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
|  |  |  |  |

## Final Output

Artifacts:

- `../../src/mini-runtime/adapters/inngest-async.ts`
- `../../src/mini-runtime/index.ts`
- `../../test/mini-runtime/inngest-async-boundary.test.ts`
- `../proof-manifest.json`
- `../focus-log.md`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../vendor-fidelity.md`
- `../phase-two-production-critical-claim-ledger.md`
- `../../fixtures/inline-negative/vendor-boundaries.ts`
- `../../fixtures/todo/async-effect-bridge-lowering.todo.ts`
- `../../fixtures/todo/first-server-async-harness-mounting.todo.ts`

Verification run:

- `git status --short --branch`: dirty only with this workstream's files before
  commit.
- `git branch --show-current`: `codex/runtime-phase-two-async-inngest-boundary`
- `gt status --short`: dirty only with this workstream's files before commit.
- `gt ls`: current branch at top of Phase Two stack.
- `bunx nx show project runtime-realization-type-env --json`: passed.
- Manifest spec hash actual-vs-expected: matched
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `bun test tools/runtime-realization-type-env/test/mini-runtime/inngest-async-boundary.test.ts`: 2 pass, 0 fail.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:negative`: passed.
- `bunx nx run runtime-realization-type-env:vendor-boundaries`: passed.
- `bunx nx run runtime-realization-type-env:mini-runtime`: 59 pass, 0 fail.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed.
- `git diff --check`: passed.

Repo/Graphite state:

- Clean after closeout commit.

## Next Workstream Packet

Recommended next workstream:

- Phase Two child workstream 6: Telemetry, Logging, HyperDX, Catalog
  Observation.

Why this is next:

- Provider/config/Effect, server/oRPC, and async/Inngest contained boundary
  proofs are now strong enough for the observability workstream to test
  redacted records across provider, server, async, execution, finalization, and
  catalog surfaces without borrowing unearned durable or production-host
  claims.

Required first reads:

- `../dra-phase-two-level-zero-workflow.md`
- `2026-04-30-phase-two-production-readiness-program-workstream.md`
- This report.
- `../phase-two-production-critical-claim-ledger.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`
- `../vendor-fidelity.md`
- `../../src/mini-runtime/telemetry-export.ts`
- `../../src/mini-runtime/migration-control-plane-observation.ts`
- `../../test/mini-runtime/telemetry-export.test.ts`
- `../../test/mini-runtime/migration-control-plane-observation.test.ts`
- Child workstream 3, 4, and 5 reports for provider/server/async records.

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check

Deferred items to consume:

- `p2.telemetry.redacted-records`
- `p2.hyperdx.provider-proof`
- `p2.catalog.control-plane`
- Use `audit.p2.async-inngest-function-step-boundary` only as contained async
  observation evidence. Do not consume it as durable async run history,
  production Inngest telemetry, product dashboard/query policy, or
  RuntimeCatalog persistence proof.
