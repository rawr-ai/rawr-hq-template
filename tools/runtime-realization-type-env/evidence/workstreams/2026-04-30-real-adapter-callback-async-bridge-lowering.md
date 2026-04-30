# Real Adapter Callback + Async Bridge Lowering

Status: `closed`.
Branch: `codex/runtime-adapter-async-bridge-lowering`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/265.
Commit: branch tip in PR #265; initial submitted commit was `147b9b0a`.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove, inside the contained runtime-realization lab, the narrowest acceptable
  native-shaped server callback and async bridge lowering artifacts that resolve
  pre-derived refs through `ProcessExecutionRuntime` instead of executing
  descriptors in adapters.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Adapter and async bridge helpers remain lab-local unless the user accepts a
  production host adapter API, dispatcher policy, async membership law, durable
  semantics, or package topology change.

Non-goals:

- Do not mount real Elysia, oRPC, Inngest, HTTP, OpenAPI, or workers.
- Do not decide durable scheduling, retries, idempotency, cron/event delivery,
  or Inngest production semantics.
- Do not decide final public dispatcher access, async membership syntax, route
  import-safety law, boundary policy matrix, or production package topology.
- Do not treat fake adapter callbacks, vendor shape probes, or simulation
  bridges as production runtime readiness.

## Opening Packet

Opening input:

- DRA continuation after PR #264 (`Server Route Derivation`).
- User control input: anchor the DRA role in the research program workflow,
  continue through the entire program, and add Docker HyperDX as a dedicated
  telemetry/observation cycle if it belongs in the sequence.
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 6 is
  `Real Adapter Callback + Async Bridge Lowering`.

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

- `2026-04-30-server-route-derivation.md`
- `2026-04-30-dispatcher-access-async-step-membership.md`
- `../../src/spine/artifacts.ts`
- `../../src/spine/derive.ts`
- `../../src/spine/compiler.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/adapters/delegation.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/middle-spine-derivation.test.ts`
- `../../fixtures/todo/adapter-effect-callback-lowering.todo.ts`
- `../../fixtures/todo/async-effect-bridge-lowering.todo.ts`
- `../../src/vendor/boundaries/orpc.ts`
- `../../src/vendor/boundaries/inngest.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`

Excluded or stale inputs:

- Vendor oRPC/Inngest shape probes as proof of RAWR adapter lowering or durable
  async semantics.
- Prior fake delegation proof as production proof. It can be consumed only as
  the baseline behavior to harden into native-shaped payload lowering.
- Explicit async membership and route descriptor proofs as host mounting proof.
  They are prerequisites, not the adapter/harness path itself.
- Quarantined or archived runtime docs if they conflict with the pinned spec.

Control inputs:

- User control signal on native host adapter API shape, dispatcher policy,
  async membership syntax, durable semantics, route import-safety law, boundary
  policy, production package topology, or migration sequence.
- Spec hash drift.
- Failed focused or composed gate.
- Parent review invalidation.
- Graphite/PR blocker.
- Discovered dependency inversion that requires first harness mounting or
  boundary policy before callback/bridge lowering can be stated honestly.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `architecture`: lifecycle boundary between adapter lowering, process runtime,
  and harness mounting.
- `testing-design`: focused proof oracle, negative coverage, and anti-theater
  gates.
- `typescript`: discriminated boundary payloads, widened invalid input checks,
  and proof-only adapter types.
- `information-design`: evidence wording that keeps simulation proof distinct
  from production host readiness.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes through DRA workflow and current template.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-server-route-derivation.md`

Prior final output accepted or rejected:

- Accepted as prerequisite proof: cold server route factories can derive route
  descriptors and server refs without executing route bodies.
- Rejected as overclaim: final route import-safety law, native oRPC/Elysia
  lowering, OpenAPI publication, and real HTTP path remain unresolved.

Deferred items consumed:

- `audit.p2.adapter-effect-callback-lowering`
- `audit.p2.async-effect-bridge-lowering`

Deferred items explicitly left fenced:

- `audit.p1.effect-boundary-policy-matrix`
- `audit.p1.dispatcher-access`
- `audit.p0.async-step-membership`
- real Elysia/oRPC/Inngest harness mounting
- durable scheduling/retry/idempotency semantics

Repair demands consumed:

- Run a trailing semantic JSDoc/comment pass after TypeScript/runtime edits that
  add adapter payloads, bridge payloads, lifecycle boundaries, or proof-only
  seams.

Next packet changes:

- The top-level DRA workflow and research program were refreshed to make the
  non-stop DRA continuity anchor explicit and to add a default
  `Runtime Telemetry + HyperDX Observation` workstream after Boundary Policy
  Matrix and before Migration/Control-Plane Observation.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A lab-local native-shaped server adapter payload or callback lowering artifact
  that consumes pre-derived server route descriptors/refs and delegates through
  `ProcessExecutionRuntime`.
- A lab-local async bridge payload or function-bundle-like artifact that consumes
  pre-derived async owner-to-step refs and delegates through
  `ProcessExecutionRuntime`.
- Focused tests proving adapters/bridges do not execute descriptors directly,
  reject wrong boundary refs, preserve full ref identity, and record diagnostic
  or instrumentation events without claiming real host mounting.
- Manifest, focus log, diagnostic, spine map, research program, TODO fixtures,
  and report updates that promote only earned proof strength.
- Semantic JSDoc/comment trailing review after implementation.

Optional outputs:

- Shared adapter payload validation helpers if they reduce duplicated
  boundary/ref checks without creating a production abstraction.
- Route/async bridge diagnostics that can feed the first harness-mount
  workstream.

Target proof strength:

- Contained `simulation-proof` for native-shaped callback and async bridge
  lowering artifacts only.
- Keep production host mounting, durable async semantics, OpenAPI publication,
  real HTTP paths, and final boundary policy as `xfail` or downstream non-proof.

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

- Production native adapter API shape must be chosen.
- Durable async semantics or Inngest retry/idempotency policy must be decided.
- Public dispatcher access or async membership law must change.
- Boundary timeout, retry, interruption, telemetry, redaction, or error mapping
  policy becomes necessary.
- Real Elysia/oRPC/Inngest mounting is required to prove the claim.
- The work requires package topology or migration sequence changes.

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
  `codex/runtime-server-route-derivation`, then new Graphite child branch
  `codex/runtime-adapter-async-bridge-lowering`.
- `gt status --short`: clean before branch creation.
- `gt log short`: verified stack ancestry through PR #264 branch.
- Pinned spec hash verified:
  `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`.

Investigation lanes:

- Authority cartographer: adapter/async proof boundary, stale inputs, stop
  rules.
- Implementation seam reviewer: smallest lab-local callback/bridge lowering
  change.
- Testing/evidence auditor: focused tests, proof ledger, closeout gates.
- Semantic JSDoc/comment trailing reviewer: ran after implementation edits.

Phase teams:

- Opening/investigation: authority cartographer (`Herschel`), implementation
  seam reviewer (`Euler`), testing/evidence auditor (`Jason`).
- Trailing semantic comments: worker reviewer (`Leibniz`) on runtime
  TypeScript seam files only.

Design lock:

- Host synthesis accepted the smallest lab-local proof: compiler-emitted
  native-shaped server callback and async bridge payloads, plus runtime adapter
  helpers that validate boundary/ref identity and delegate through
  `ProcessExecutionRuntime`.

Implementation summary:

- Added `ServerAdapterCallbackPayload`, `AsyncStepBridgePayload`, and
  `RuntimeAdapterLoweringPlan` artifacts.
- Added compiler adapter lowering payload emission from pre-derived server route
  descriptors and async owner-to-step refs.
- Added server/async payload constructors and lowering helpers that validate
  route/ref or owner/step identity before delegation.
- Added adapter boundary validation before runtime lookup for widened
  wrong-boundary calls.
- Added focused mini-runtime and middle-spine tests for payload delegation,
  full-ref preservation, wrong-boundary rejection, route/owner drift, and
  descriptor-free payloads.
- Updated positive/negative fixtures and residual TODO fixtures.
- Updated the DRA workflow and research program with the non-stop DRA anchor and
  dedicated HyperDX observation cycle.

Semantic JSDoc/comment trailing pass:

- Passed: reviewed `src/spine/artifacts.ts`, `src/spine/compiler.ts`,
  `src/mini-runtime/adapters/delegation.ts`,
  `src/mini-runtime/adapters/server.ts`, and
  `src/mini-runtime/adapters/async.ts`.
- Added comments only at semantic seams: lab-only payload status, pre-harness
  proof boundary, runtime-owned invocation, server route/ref identity, and async
  owner/step identity.
- Skipped mechanical helper comments where names and code were sufficient.

Verification:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`: pass, 23 tests / 101 expectations.
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`: pass, 16 tests / 77 expectations.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: pass.
- `bunx nx run runtime-realization-type-env:negative`: pass.
- `bunx nx run runtime-realization-type-env:structural`: pass.
- `bunx nx run runtime-realization-type-env:report`: pass.
- `bunx nx run runtime-realization-type-env:mini-runtime`: pass, 31 tests / 154 expectations.
- `bunx nx run runtime-realization-type-env:middle-spine`: pass, 16 tests / 77 expectations.
- `bunx nx run runtime-realization-type-env:gate`: pass.
- `bun run runtime-realization:type-env`: pass.
- `git diff --check`: pass.
- `git status --short --branch`: clean after initial submit on
  `codex/runtime-adapter-async-bridge-lowering...origin/codex/runtime-adapter-async-bridge-lowering`.
- `gt status --short`: clean after initial submit.
- Graphite submit: PR #265 created.

Review loops:

- Leaf loops completed for containment, mechanical/Nx, type/negative,
  semantic comments, mini-runtime behavior, and manifest/report consistency.
- Parent loops completed for architecture, migration derivability,
  DX/API/TypeScript, lifecycle/process, and adversarial evidence honesty.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Existing fake adapters prove delegation shape, not native-shaped payload lowering. | `src/mini-runtime/adapters/server.ts`, `src/mini-runtime/adapters/async.ts`, manifest entry `simulation.adapter-callback-delegation`. | Harden or split into route/async bridge lowering artifacts without claiming host mounting. | High |
| Server route descriptors and async owner-to-step refs are prerequisites only. | PR #263 and PR #264 workstream reports. | Consume them as inputs; do not promote them to harness proof. | High |
| Vendor oRPC/Inngest probes are shape-only. | `vendor-fidelity.md`, `design-guardrails.md`, and vendor-boundary tests. | Keep out of adapter proof except as downstream host context. | High |
| Native-shaped payloads are enough for this domino, but not for harness proof. | New `RuntimeAdapterLoweringPlan` and adapter payload tests. | Promoted only `simulation.adapter-callback-bridge-lowering`; kept harness and durable async gaps fenced. | High |

## Report

Proof promotions:

- Added `simulation.adapter-callback-bridge-lowering` as contained
  `simulation-proof`.

Proof non-promotions:

- Kept `audit.p2.adapter-effect-callback-lowering` as residual `xfail` for
  production host callback lifecycle, Elysia/oRPC request path,
  `StartedHarness` integration, and final boundary policy.
- Kept `audit.p2.async-effect-bridge-lowering` as residual `xfail` for native
  Inngest FunctionBundle/worker mounting, durable scheduling, retry/idempotency,
  and final async host policy.
- Did not promote real Elysia, oRPC, Inngest, HTTP, OpenAPI, durable async,
  boundary policy, package topology, or production readiness.

Diagnostic changes:

- Diagnostic and spine-audit map now describe adapter lowering as
  native-shaped payload simulation proof while leaving harness mounting red and
  durable host semantics unresolved.

Spec feedback:

- No spec patch required. The work stayed inside the lab-only proof boundary.

Test-theater removals or downgrades:

- None removed. The new tests exercise RAWR-owned lowering and delegation
  behavior, not vendor constructibility.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Production native server harness mounting | `xfail` | This workstream may prove native-shaped lowering artifacts, but not Elysia/oRPC mounting or real HTTP behavior. | Diagnostic harness mounting row, `audit.p2.adapter-effect-callback-lowering`, server route workstream report. | First server harness mount workstream starts with accepted payload shape. | Lowering artifact is insufficient without `StartedHarness` evidence. | First Real Harness Mounts. | migration-only |
| Durable async semantics | `xfail` | Async bridge can delegate pre-derived steps, but durable scheduling/retry/idempotency remains host-owned. | Canonical spec async/Inngest sections and `audit.p2.async-effect-bridge-lowering`. | Architecture accepts durable semantics or Inngest harness work owns the native behavior. | Bridge proof would otherwise imply scheduling semantics. | First Real Harness Mounts or Boundary Policy Matrix. | spec/migration |
| Boundary policy matrix | `xfail` | Timeout, retry, interruption, telemetry, redaction, and error mapping are broader than callback lowering. | `audit.p1.effect-boundary-policy-matrix`. | Adapter/harness work requires default policy metadata. | Native callback behavior exposes policy defaults. | Boundary Policy Matrix. | spec |

## Review Result

Leaf loops:

- Containment: passed; all edits stayed under
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed; Nx project truth and structural guard succeeded.
- Type/negative: passed; typecheck and negative fixtures cover new payload
  boundaries.
- Semantic JSDoc/comments: passed; trailing reviewer added high-signal semantic
  comments and skipped mechanical narration.
- Vendor: passed by non-use; no new vendor proof or vendor API claim was made.
- Mini-runtime: passed; payload helpers delegate through the contained process
  runtime and reject widened invalid refs before invocation.
- Manifest/report: passed; proof manifest, focus log, diagnostic, spine map,
  research program, TODO fixtures, and this report agree on proof strength.

Parent loops:

- Architecture: passed; payloads are lab-local pre-harness artifacts, not public
  runtime API or production host contracts.
- Migration derivability: passed; first harness mounts can now consume
  validated payloads instead of fake callback delegation.
- DX/API/TypeScript: passed; no public API was changed, and widened invalid
  inputs are rejected by both type fixtures and runtime validation.
- Workstream lifecycle/process: passed; opened packet, ran phase agents,
  implementation, semantic trailing review, evidence promotion, and next-packet
  handoff.
- Adversarial evidence honesty: passed; simulation proof is not described as
  production readiness.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None at opening. |  |  |  |  |  |

Invalidations:

- User control input invalidated the assumption that the program sequence ended
  at migration/control-plane observation; the workflow now includes a dedicated
  HyperDX telemetry/observation cycle.

Repair demands:

- None.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| DRA continuity can be lost after compaction or misleading summaries. | The agent may stop after a single PR or treat a completed workstream as the whole research program. | Added a loud continuity anchor to the DRA workflow and research program map. | DRA stewardship, every resume. |
| HyperDX availability creates a real observation opportunity but can also jump ahead of policy. | Telemetry store proof could accidentally choose product observability/export semantics before boundary policy. | Added a dedicated HyperDX observation workstream after Boundary Policy Matrix by default. | Runtime Telemetry + HyperDX Observation. |

## Final Output

Artifacts:

- `src/spine/artifacts.ts`
- `src/spine/compiler.ts`
- `src/mini-runtime/adapters/delegation.ts`
- `src/mini-runtime/adapters/server.ts`
- `src/mini-runtime/adapters/async.ts`
- `fixtures/positive/app-and-plan-artifacts.ts`
- `fixtures/inline-negative/runtime-access-boundaries.ts`
- `fixtures/todo/adapter-effect-callback-lowering.todo.ts`
- `fixtures/todo/async-effect-bridge-lowering.todo.ts`
- `test/mini-runtime/process-runtime.test.ts`
- `test/middle-spine-derivation.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/runtime-realization-research-program.md`
- `evidence/dra-runtime-research-program-workflow.md`
- this report

Verification run:

- Focused gates, composed `gate`, and root convenience gate passed.

Repo/Graphite state:

- PR #265 created; final report metadata amend pending.

## Next Workstream Packet

Recommended next workstream:

- First Real Harness Mounts, unless callback/bridge lowering discovers that
  boundary policy must move earlier.

Why this is next:

- Once native-shaped server and async callback payloads delegate through
  `ProcessExecutionRuntime`, the next runtime domino is mounting the first real
  server and async harnesses.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
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

- any adapter/async bridge lowering residuals from this workstream
- first server and async harness mount prerequisites
