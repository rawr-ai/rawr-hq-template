# Phase Two Server oRPC Elysia Boundary

Status: `closed`.
Branch: `codex/runtime-phase-two-server-orpc-elysia-boundary`.
PR: `none`.
Commit: branch head after closeout commit.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority.

## Frame

Objective:

- Prove the strongest honest Phase Two server boundary slice available inside
  the lab: a real oRPC Fetch request path that enters through
  `@orpc/server/fetch`, delegates through the server adapter payload and Oracle
  server harness, and reaches `ProcessExecutionRuntime`.
- Keep Elysia explicitly fenced because it is not root-resolvable from the lab
  and Phase Two must not mutate root dependencies or production packages to
  manufacture a mount proof.

Containment boundary:

- Changes stay inside `tools/runtime-realization-type-env/**`.
- No production packages, root workspace wiring, production topology, or Phase
  Three Nx/generator work is in scope.

Non-goals:

- Do not claim Parent-Repo Migration authorization for server behavior.
- Do not decide final public route import-safety law, route module topology,
  OpenAPI/product API publication, auth/logging policy, or native host error
  mapping.
- Do not add `elysia` as a root/lab dependency during this child workstream.

## Opening Packet

Opening input:

- Child workstream 3 closed with provider/config/Effect backing evidence.
- Child workstream 4 consumed claim rows `p2.server.orpc-live-boundary` and
  `p2.server.elysia-mount`.
- User control input requires the DRA loop to continue through the whole Phase
  Two program, not stop after a single child.

Runtime/proof authority inputs:

- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/guidance/guardrails-design.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/current-lab-state.md`

Coordination inputs:

- `../workflow-phase-two-level-zero.md`
- `workstream-2026-04-30-phase-two-spine-composition-program-workstream.md`
- `workstream-2026-04-30-phase-two-provider-config-effect-spine.md`
- `../ref-2026-04-30-phase-two-production-critical-claim-ledger.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- Canonical runtime spec pinned by the manifest.
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- `../../src/vendor/boundaries/orpc.ts`
- `../../src/oracle/adapters/server.ts`
- `../../src/oracle/harnesses.ts`
- `../../test/oracle/process-runtime.test.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`
- `package.json` and `bun.lock` for dependency reality only.

Excluded or stale inputs:

- Production `apps/server/**` behavior remains out of scope.
- Runtime-prod stack syntax, generated route topology, package topology, and
  branch claims remain non-authority.
- Lockfile-only `elysia` entries cannot be treated as lab proof because
  `import("elysia")` is not root-resolvable from the lab.

Control inputs:

- Continue autonomously unless a documented Level Zero stop condition fires.

Selected skill lenses:

- `orpc`: checked `RPCHandler` Fetch request/testing patterns.
- `elysia`: checked the Elysia/oRPC integration shape and body-consumption
  warning; used only to fence non-promotion.

Refresher:

- Research program refreshed: `skipped`; Phase Two anchors are the active
  sequence authority.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `workstream-2026-04-30-phase-two-provider-config-effect-spine.md`

Prior final output accepted or rejected:

- Accepted: `audit.p2.provider-effect-process-spine` supplies contained
  provider/runtime backing evidence for representative server resources.
- Rejected as overclaim: provider/config/Effect proof does not prove oRPC,
  Elysia, OpenAPI, product route policy, or production server mounting.

Deferred items consumed:

- `p2.server.orpc-live-boundary`
- `p2.server.elysia-mount`

Deferred items explicitly left fenced:

- Elysia mount/request lifecycle.
- Production oRPC adapter lifecycle and production HTTP serving.
- Final public route import-safety law and production route module topology.
- OpenAPI/product API publication policy.
- Auth/logging semantics and native host error mapping.

Repair demands consumed:

- None from child workstream 3.

Next packet changes:

- Child workstream 5 may consume `audit.p2.server-orpc-fetch-boundary` only as
  server request-boundary evidence. It must not use it to prove async/Inngest
  behavior or durable semantics.

Invalidations from prior assumptions:

- The initial local implementation attempted to carry live invocation context
  through the oRPC JSON request. Review invalidated that approach because RPC
  payloads must be JSON-shaped request data; runtime invocation context must be
  assembled server-side before harness delegation.

## Output Contract

Required outputs:

- A focused contained oRPC Fetch request proof that crosses
  `RPCHandler.handle(...)`, matches `/rpc`, and delegates through the server
  harness into `ProcessExecutionRuntime`.
- A failure oracle proving unmatched paths do not invoke the harness.
- Manifest/focus/diagnostic/spine/vendor-fidelity updates that promote only the
  earned oRPC request-boundary proof and keep Elysia fenced.
- Workstream closeout and next packet for Async/Inngest.

Optional outputs:

- A lab helper for mounting a contained oRPC Fetch boundary over an existing
  started Oracle server harness.

Target proof strength:

- `simulation-proof` for the contained oRPC Fetch request boundary.
- Elysia remains `xfail`/non-promotion.

Expected gates:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check
- `bun test tools/runtime-realization-type-env/test/oracle/server-orpc-boundary.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:vendor-boundaries`
- `bunx nx run runtime-realization-type-env:oracle`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`

Stop/escalation conditions:

- Stop only if honest server proof requires adding root dependencies, mutating
  production packages, deciding final public route/API law, or claiming
  production host behavior. No such stop was reached because oRPC proof could
  be narrowed and Elysia could be fenced.

## Acceptance / Closure Criteria

This workstream may close only when:

- focused oRPC request proof passes;
- Elysia is either honestly proven through a real mount or explicitly
  non-promoted;
- proof/non-proof status is reflected in manifest, diagnostic, spine map,
  focus log, and vendor-fidelity notes;
- leaf and parent reviews are recorded;
- focused and composed gates are recorded;
- repo/Graphite state is clean or explicitly blocked;
- child workstream 5 has a usable next packet.

## Workflow

Preflight:

- Continued on `codex/runtime-phase-two-server-orpc-elysia-boundary`.
- Verified clean repo/Graphite state, Nx project truth, and manifest-pinned
  spec hash.

Investigation lanes:

- Host read Level Zero, Phase Two program workstream, child 3 report, claim
  ledger, vendor fidelity notes, oRPC/Elysia reference skills, manifest,
  diagnostic, spine map, focus log, server adapter/harness/runtime source, and
  package dependency reality.

Phase teams:

- `inventory`: one Explorer agent for oRPC/Elysia dependency and file-surface
  inventory.
- `proof-review`: one default reasoning agent for proof adequacy,
  false-green risks, required oracles, and Elysia fencing.
- No agents edited files; all reports were internal DRA evidence.

Agent scratch documents:

- Not used. The lanes were bounded and their internal reports were integrated
  here.

Design lock:

- The honest child-4 proof is a contained oRPC Fetch request boundary. The
  request enters through `RPCHandler.handle(...)`, carries JSON-shaped request
  data only, and receives runtime invocation context assembled server-side by
  the lab boundary before delegation to `mountOracleServerHarness`.

Implementation summary:

- Added `src/oracle/adapters/orpc-server.ts`, a lab-contained oRPC
  boundary over a started Oracle server harness.
- Exported the helper from `src/oracle/index.ts`.
- Added `test/oracle/server-orpc-boundary.test.ts`.
- Added manifest entry `audit.p2.server-orpc-fetch-boundary`.
- Updated focus log, diagnostic, spine audit map, vendor fidelity notes, and
  residual TODO wording.

Semantic JSDoc/comment trailing pass:

- `passed`: reviewed `src/oracle/adapters/orpc-server.ts` and added a
  concise comment marking the helper as real oRPC Fetch request handling plus
  lab-contained runtime delegation, not Elysia/OpenAPI/production route
  authority. The focused test did not need extra comments beyond names and
  assertions.

Verification:

- Recorded in `Final Output`.

Review loops:

- Recorded in `Review Result`.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| oRPC Fetch request proof is feasible without network or dependency mutation. | Host and Explorer both exercised `@orpc/server/fetch` `RPCHandler` with a real `Request`; focused test now records this path. | Added contained boundary helper and focused test. | High |
| Elysia is not lab-resolvable from the current root context. | `import("elysia")` fails from repo root/lab even though lockfile contains transitive workspace entries. | Kept Elysia explicit non-promotion and recorded it in `vendors/README.md`. | High |
| Live invocation context must not travel through RPC JSON. | Initial focused test failed; review identified the context-smuggling design issue. | Reworked boundary so request carries JSON-shaped input and the handler calls `createInvocationContext(...)` server-side. | High |
| Server proof must delegate through existing adapter/harness/runtime layers. | Claim ledger and process-runtime source require adapter delegation and `ProcessExecutionRuntime`; agent review named direct descriptor execution as a false-green risk. | Test asserts adapter events, harness records, runtime events, and unmatched path no-invocation. | High |

## Report

Proof promotions:

- Added `audit.p2.server-orpc-fetch-boundary` as `simulation-proof`.

Proof non-promotions:

- Did not promote Elysia.
- Did not promote production oRPC adapter lifecycle, OpenAPI/product API
  publication, production HTTP serving, route topology/import-safety law,
  auth/logging policy, native host error mapping, or Parent-Repo Migration
  readiness.

Diagnostic changes:

- Updated server/oRPC row to mention contained Fetch request proof while
  preserving yellow status and production residuals.
- Updated adapter/harness rows to say the oRPC boundary reaches the existing
  Oracle server harness but production host lifecycle remains open.

Spec feedback:

- None. The work fits the existing runtime spec as a lab-contained boundary
  proof and does not require a public API decision.

Test-theater removals or downgrades:

- None. The proof crosses a real oRPC Fetch handler and then the RAWR
  adapter/harness/runtime path; Elysia remains fenced instead of being implied
  by lockfile presence.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Elysia mount/request lifecycle | `xfail` | `elysia` is not root-resolvable from the lab and adding a dependency/root mutation is outside this child. | `p2.server.elysia-mount`; `vendors/README.md`; diagnostic server/oRPC row. | Lab-contained Elysia dependency/mount lifecycle is intentionally opened and exercised through real request handling. | Any claim mentions Elysia as green or depends on Elysia lifecycle behavior. | Later explicit Elysia/live-host workstream or Phase Three if scope changes | `lab/vendor` |
| Production oRPC adapter/HTTP serving lifecycle | `xfail` | Current proof uses in-process Fetch `Request` and Oracle harness, not production host serving. | `audit.p2.production-harness-mounting`; diagnostic harness row. | Production host lifecycle/topology policy is opened. | Any Parent-Repo Migration packet treats contained Fetch proof as server authorization. | Phase Three or Parent-Repo Migration workstream | `parent-repo-migration` |
| Final route import-safety law and route topology | `xfail` | Child 4 consumed existing route descriptors but did not decide public law/topology. | `audit.p2.server-route-derivation`; claim row `p2.derivation.no-body-execution`. | Public route declaration/import law is accepted or revised. | Any implementation needs final route module shape or public import rules. | Phase Three or explicit API/DX decision packet | `spec` |
| OpenAPI/product API publication policy | `xfail` | oRPC RPC transport was tested; OpenAPI was not installed/exercised. | `p2.server.orpc-live-boundary`; diagnostic server/oRPC row. | Product publication surface and OpenAPI policy are intentionally opened. | Any claim requires external REST/OpenAPI consumer proof. | Later product/API policy workstream | `spec/migration` |
| Native host telemetry/error mapping | `xfail` | The proof records lab response/boundary/runtime records only, not native host mapping. | `audit.p1.effect-boundary-policy-matrix.residual`; telemetry residuals. | Native host error/telemetry policy is accepted and gated. | Any server/async proof depends on host error payload mapping or logging semantics. | Telemetry/logging/HyperDX or integrated rehearsal if needed | `spec/lab` |

## Review Result

Leaf loops:

- Containment: passed; all changes are inside
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed; oRPC dependency was already root-resolvable, Elysia was
  not used, and no root/package/workspace files changed.
- Type/negative: passed with focused test and typecheck; negative gate recorded
  in final verification.
- Semantic JSDoc/comments: passed; one exported proof seam comment added in
  `orpc-server.ts`.
- Vendor: passed with honest labeling; `@orpc/server/fetch` is exercised, and
  Elysia is explicitly non-promoted.
- Oracle: passed; focused and composed oracle gates recorded.
- Manifest/report: passed; manifest/focus/diagnostic/spine/report agree on
  `audit.p2.server-orpc-fetch-boundary`.

Parent loops:

- Architecture: passed; the lifecycle remains request boundary -> adapter
  payload -> harness -> process runtime -> observation.
- Migration derivability: passed; the result reduces server-boundary migration
  uncertainty without claiming Parent-Repo Migration authorization for server
  behavior.
- DX/API/TypeScript: passed; no public API/DX law was invented, and the request
  payload stays JSON-shaped while live runtime context is server-owned.
- Workstream lifecycle/process: passed; child opened, implemented, reviewed,
  promoted narrowly, and hands a packet to child 5.
- Adversarial evidence honesty: passed after invalidating the initial
  request-context-smuggling approach; Elysia stays fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- Initial local approach invalidated: live invocation context cannot be carried
  through oRPC JSON request input.

Repair demands:

- Repaired by adding server-side `createInvocationContext(...)` assembly in
  the oRPC boundary and adding a secret-smuggling regression assertion.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None |  |  |  |

## Final Output

Artifacts:

- `../../src/oracle/adapters/orpc-server.ts`
- `../../test/oracle/server-orpc-boundary.test.ts`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/current-lab-state.md`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- `../../fixtures/todo/adapter-effect-callback-lowering.todo.ts`
- `../../fixtures/todo/first-server-async-harness-mounting.todo.ts`

Verification run:

- `git status --short --branch`: dirty only with this workstream's files before
  commit.
- `git branch --show-current`: `codex/runtime-phase-two-server-orpc-elysia-boundary`
- `gt status --short`: dirty only with this workstream's files before commit.
- `gt ls`: current branch at top of Phase Two stack.
- `bunx nx show project runtime-realization-type-env --json`: passed.
- Manifest spec hash actual-vs-expected: matched
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `bun test tools/runtime-realization-type-env/test/oracle/server-orpc-boundary.test.ts`: 2 pass, 0 fail.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:oracle`: 57 pass, 0 fail.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed after report authoring.
- `git diff --check`: passed.

Repo/Graphite state:

- Clean after closeout commit.

## Next Workstream Packet

Recommended next workstream:

- Phase Two child workstream 5: Async/Inngest Live Boundary.

Why this is next:

- Provider/config/Effect and server/oRPC request-boundary proofs are now
  strong enough for the async workstream to focus on Inngest-facing function,
  serve, step, and dispatcher boundaries without borrowing server proof.

Required first reads:

- `../workflow-phase-two-level-zero.md`
- `workstream-2026-04-30-phase-two-spine-composition-program-workstream.md`
- This report.
- `../ref-2026-04-30-phase-two-production-critical-claim-ledger.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/current-lab-state.md`
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- `../../src/vendor/boundaries/inngest.ts`
- `../../src/oracle/adapters/async.ts`
- `../../src/oracle/harnesses.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`
- `../../test/oracle/process-runtime.test.ts`

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check

Deferred items to consume:

- `p2.async.inngest-handoff`
- `p2.async.callback-step`
- `p2.async.durable-residual`
- Do not consume `audit.p2.server-orpc-fetch-boundary` as async proof; use it
  only as evidence that the server request side can emit/observe a contained
  runtime-owned boundary before the integrated rehearsal.
