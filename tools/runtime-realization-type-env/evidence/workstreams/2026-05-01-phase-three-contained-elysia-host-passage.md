# Phase Three Contained Elysia Host Passage

Status: `closed as contained simulation-proof`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `925c1932`.

This report is the closed child-5 workstream for Phase Three. It is not runtime
architecture authority, final public API/DX authority, production HTTP proof,
production migration authorization, or permission to mutate production app code.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three closed after child 7. |
| Child state | Child 5 closed as contained `simulation-proof`; child 6 superseded its listener residual and child 7 composed it into Phase Three closeout. |
| Workstream type | Executable contained proof slice. |
| Proof target | Contained `simulation-proof` for a real Elysia app/request route-forwarding host around the mini-runtime server boundary. |
| Active question | Answered: the lab can mount a real Elysia app/route around the contained server runtime boundary, send a real request through that host layer, preserve lifecycle/error/observation records, and still avoid production HTTP readiness claims. |
| Blocked claims | Production HTTP serving, production host lifecycle, OpenAPI/product API policy, auth/logging policy, native host telemetry/error mapping, production migration readiness, durable async semantics, live HyperDX product visibility, RuntimeCatalog persistence, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Cross the server-host gap that remains after contained oRPC Fetch and
  layer-disagreement proofs.
- Determine how much of a real Elysia host/mount/request lifecycle can be
  proven inside the mini-runtime lab without touching production `apps/*`.
- Keep oRPC, RAWR runtime, Elysia host, telemetry, and control-plane evidence
  in separate proof layers.

Containment boundary:

- Source/test edits must stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root exports, deployment topology, and final Nx/generator
  ratchets remain out of scope.

Non-goals:

- Do not claim production HTTP readiness or production Elysia lifecycle.
- Do not settle final public API/DX, OpenAPI publication, auth/logging,
  product API policy, native host telemetry/error mapping, or deployment
  topology.
- Do not open durable Inngest, HyperDX product visibility, RuntimeCatalog
  persistence, or Nx/generator work.

## Opening Packet

Prior stages consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`

Authority inputs:

- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- architecture context:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- active DRA workflow reference:
  `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
- `2026-05-01-phase-three-program-workstream.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../vendor-fidelity.md`
- `../phased-agent-verification-workflow.md`

Selected skill lenses:

- `team-design`: non-overlapping review and verification lanes.
- `target-authority-migration`: proof ceilings and residual routing.
- `architecture`: host/runtime/vendor/product boundary separation.
- `testing-design`: falsifier-first executable oracle.
- `elysia`: Elysia host, route, mount, request, and error idioms.
- `orpc`: only if the child routes oRPC through Elysia rather than a minimal
  host adapter probe.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: Elysia directly; oRPC if the proof mounts an oRPC Fetch/RPCHandler path under Elysia; telemetry/control-plane only as observation. |
| Required skill introspection | `elysia`; `orpc` if oRPC is crossed; Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required before source/test edits and before any Elysia-related proof promotion. The lane must start broad-to-deep from Elysia docs/navigation before selecting exact pages. |
| Golden integration exemplar | Reference-only if author-facing integration shape or vendor-native surface design becomes relevant. Runtime spec wins boundary/lifecycle/proof authority. |
| Durable report disposition | If this child discovers useful Elysia integration rules for later runtime design, update `vendor-fidelity.md` or create a labeled reference report. Otherwise keep findings inside this child report. |

## Output Contract

Required executable proof outputs:

- A focused mini-runtime test or test cluster that proves the selected Elysia
  host passage.
- Any required lab-contained source changes for Elysia host/mount adaptation.
- Clear separation of:
  - Elysia host/request status;
  - oRPC/RPCHandler status if crossed;
  - RAWR runtime invocation result;
  - harness and boundary records;
  - telemetry projection/export observations;
  - control-plane summary/correlation.
- Updated proof manifest/focus log/diagnostic/vendor maps as applicable.
- Layered review result with an overall-program-health lane.

Candidate proof cases:

- Real Elysia app handles a real `Request` through its fetch interface.
- Elysia route or mounted handler delegates into the existing contained server
  boundary instead of executing descriptors directly.
- Runtime failure and host-level status/error behavior remain distinct.
- Missing route or invalid method rejects before runtime delegation.
- Redaction prevents request/resource/execution secrets and live handles from
  leaking into responses, telemetry, or packet summaries.

Proof ceiling:

- Passing this child can promote only contained `simulation-proof`.
- It cannot prove production HTTP serving, production host lifecycle,
  OpenAPI/product policy, auth/logging, native host telemetry/error mapping, or
  production migration readiness.

Focused gates:

- targeted Elysia host passage test selected during the plan step;
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Plan

1. Gather current server boundary, harness, oRPC, and Elysia package evidence.
2. Assimilate child 4's layer-disagreement proof and residual routing.
3. Decide the exact Elysia host proof question before source edits.
4. Run dedicated Elysia official-docs lane and installed-package/source
   inspection.
5. Lock the executable oracle and stop rules.
6. Implement only the lab-contained host passage needed for the oracle.
7. Run leaf verification first, then parent/judgment review across proof
   honesty, architecture/authority, vendor fidelity, testing/oracle,
   telemetry/control-plane, coordination/program health, and mechanical
   information design.
8. Promote only earned `simulation-proof`; fence residuals.
9. Close with next packet and clean repo/Graphite state.

Stop conditions:

- Stop if proof requires production `apps/*` mutation.
- Stop if Elysia evidence starts implying production HTTP readiness.
- Stop if final public API/DX, OpenAPI publication, auth/logging, host-native
  error mapping, product observability, or deployment topology becomes required
  to make the proof green.
- Stop if a green assertion can pass without crossing a real Elysia host layer.

## Discovery Log

Opening verification:

- Child 4 accepted this child as the next live-runtime-passage domino.
- `git status --short --branch`: clean at opening.
- `gt status --short`: clean at opening.
- `bun pm ls 'elysia' '@elysiajs/openapi' '@elysiajs/eden'
  '@elysiajs/node'`: root list did not expose `elysia` before the dependency
  repair.
- `bun --print "const m = await import('elysia'); ..."` from repo root failed
  before the dependency repair, proving the Phase Two non-promotion remained
  current.
- `bun --cwd apps/server --print "const m = await import('elysia'); ..."`:
  succeeded, proving the package was available only through the production
  server app dependency graph.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Elysia official docs | complete | DRA disposition: accepted as vendor evidence only. The lane read local `elysia` skill, Elysia docs hub/navigation/`llms.txt`, route, handler, lifecycle, plugin, mount, error handling, unit-test, Node integration, and official oRPC Elysia adapter docs. |
| Installed package/source evidence | complete | DRA disposition: accepted. `elysia@1.4.24` existed in `bun.lock` and `apps/server/node_modules`, but root/lab import failed. The contained repair was to add `elysia` as an explicit root/lab dependency, not to import through `apps/server`. |
| Runtime/source evidence | complete | DRA disposition: accepted. The least invasive adapter home is `tools/runtime-realization-type-env/src/mini-runtime/adapters/`, beside `orpc-server.ts`, wrapping `StartedRuntimeOrpcServerBoundary` and leaving production `apps/*` untouched. |
| Testing/oracle design | complete | DRA disposition: accepted. The oracle must fail if the test calls the oRPC boundary directly, if Elysia consumes the body before oRPC, if unmatched Elysia routes invoke oRPC/runtime, or if host status collapses RAWR runtime failure. |
| Program health | complete | DRA disposition: accepted after parent review. Child 5 closed the app/request host passage, routed actual listener lifecycle to child 6, and left production/deployed host lifecycle fenced. |

Official-docs evidence accepted for the proof:

- Elysia is Web `Request`/`Response` oriented and can be tested by
  `app.handle(new Request(fullUrl, ...))`.
- Elysia route handlers expose the raw Web `Request` as `context.request`.
- Elysia supports `.all(path, handler, hooks)` for method-agnostic forwarding.
- Official oRPC Elysia adapter guidance uses `.all('/rpc*', async
  ({ request }) => handler.handle(request, { prefix: '/rpc' }), { parse:
  'none' })`, with `parse: 'none'` explicitly preventing body-preparser
  consumption.
- `.mount('/prefix', fetchFn)` is useful Fetch interop evidence, but the
  official mount page does not carry the same body-preservation oracle as the
  oRPC adapter page. The child therefore uses the `.all(..., { parse: 'none'
  })` route-forwarding shape as the stronger proof mechanism.

Installed-package evidence accepted for the proof:

- Before the repair, root/lab `import("elysia")` failed while
  `apps/server` import succeeded.
- `apps/server/package.json` declares `elysia: ^1.3.12`; `bun.lock` resolves
  `elysia@1.4.24`.
- `bun install --frozen-lockfile` after adding root `elysia: ^1.3.12` created
  a root `node_modules/elysia` symlink without changing `bun.lock`.
- The dependency is recorded as a root/lab dependency for this contained proof;
  it does not promote production server dependency shape.

## Scope Decision

DRA decision:

- Child 5 proves a contained Elysia app/request host passage using real
  `Elysia`, `app.handle(new Request(...))`, `.all('/rpc*', ...)`,
  `context.request`, and `{ parse: 'none' }`.
- The Elysia host delegates to the existing contained
  `StartedRuntimeOrpcServerBoundary`, which then crosses real
  `@orpc/server/fetch` `RPCHandler`, the mini server harness, adapter
  lowering, and `ProcessExecutionRuntime`.
- The host adapter records Elysia host events as their own layer. It does not
  execute descriptors, parse oRPC bodies, choose production host lifecycle
  policy, publish OpenAPI, settle auth/logging, or define public API/DX law.
- Actual network listen/port lifecycle remains outside this child. It is
  eligible as a later contained proof if the DRA accepts it as the next highest
  leverage host-lifecycle domino.

Rejected alternatives:

| Alternative | Reason rejected |
| --- | --- |
| Import `elysia` through `apps/server/node_modules` | Would couple the lab proof to a production app dependency path and weaken the containment boundary. |
| Move the proof into `apps/server` | Would stop being a contained mini-runtime lab proof and risk incidental production surface changes. |
| Add `tools/runtime-realization-type-env/package.json` | Disallowed by the tool-local `AGENTS.md`. |
| Use `.mount('/rpc', fetchFn)` as the main oracle | Valid Fetch interop evidence, but weaker for body-sensitive oRPC forwarding because official oRPC/Elysia guidance explicitly requires `{ parse: 'none' }` on `.all('/rpc*', ...)`. |
| Treat Elysia `app.handle` as production HTTP lifecycle proof | Overclaims the official unit-test/simulated-request path and would violate the proof ceiling. |

## Implementation

Changed files:

- `package.json`
  - Adds root/lab `elysia: ^1.3.12` so the mini-runtime lab can import the
    real vendor package honestly.
- `tools/runtime-realization-type-env/src/mini-runtime/adapters/elysia-host.ts`
  - Adds `mountRuntimeElysiaHostBoundary(...)`, a lab-only adapter that creates
    a real Elysia app, installs `.all('/rpc*', ...)` with `{ parse: 'none' }`,
    forwards raw `Request` objects into `StartedRuntimeOrpcServerBoundary`, and
    records host-layer events separately.
- `tools/runtime-realization-type-env/src/mini-runtime/index.ts`
  - Exports the lab-only Elysia host adapter.
- `tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts`
  - Adds the focused child-5 proof cluster.

Executable oracle:

- Success path:
  - a real Elysia app handles a full Web `Request`;
  - Elysia host records `received`, `delegate.start`, `delegate.finished`, and
    `responded`;
  - the route forwards raw `context.request` into the contained oRPC boundary;
  - the test also calls `host.app.handle(new Request(...))` directly, so the
    oracle cannot be satisfied by only a same-shape non-Elysia wrapper behind
    `host.handle(...)`;
  - oRPC records `fetch.received`, `handler.enter`, `handler.finished`, and
    `fetch.matched`;
  - the mini server harness delegates into `ProcessExecutionRuntime`;
  - response body preserves RAWR runtime success output;
  - host/oRPC/runtime/adapter/harness events are projected as separate
    telemetry sources;
  - OTLP export uses injected fetch and the control-plane packet summarizes
    sources/names/export only.
- Host-unmatched path:
  - a request outside `/rpc*` receives Elysia `404`;
  - Elysia records `received` and `responded`;
  - oRPC boundary records remain empty;
  - the server harness records only `harness.start`.
- Runtime-failure path:
  - Elysia host delegation succeeds at host/HTTP level;
  - oRPC HTTP status remains `200`;
  - RAWR body/runtime/adapter/harness/oRPC records carry failure;
  - host records do not collapse runtime failure into host failure.
- Redaction:
  - request/resource/execution/telemetry/control-plane secrets and live handles
    do not leak into response JSON, telemetry records, OTLP payload, export
    result, or control-plane packet.

Focused verification already run:

- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts`:
  passed; 3 tests, 66 assertions after the direct `host.app.handle(...)`
  oracle repair.
- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/migration-control-plane-observation.test.ts
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts`:
  passed; 7 tests, 99 assertions after the telemetry run-id repair.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:mini-runtime`: passed; 67 tests.

## Review Result

Layered review:

| Axis | Reviewer | Verdict | Material findings | DRA disposition |
| --- | --- | --- | --- | --- |
| Vendor fidelity | Franklin `019de1d9-ee45-7ad2-9e0b-72454630123b` | Pass | Implementation uses real `Elysia`, `.all('/rpc*', ...)`, raw `context.request`, `{ parse: "none" }`, and `app.handle(new Request(...))`. Wording must not imply adoption of a dedicated oRPC Elysia adapter package. | Accepted. Report/vendor notes clarify this is Elysia route forwarding into the existing oRPC Fetch boundary. |
| Telemetry/control-plane | Einstein `019de1da-5aca-7b92-b4fb-2ccc8690d3a9` | Yellow pass with repair | Control-plane packets accepted manually constructed telemetry records without `telemetryRunId`, which could pollute run summaries. | Accepted and repaired in `migration-control-plane-observation.ts`; regression added to `migration-control-plane-observation.test.ts`. |
| Architecture/proof honesty | Bacon `019de1da-03de-7873-80fe-8953c5caa80a` | Approve with closeout repair | No architecture/proof blocker. Child report needed non-pending review/final-output closeout. | Accepted. This closeout replaces `Pending`; proof category remains `simulation-proof` only. |
| Mechanical/repo/Nx | Leibniz `019de1d9-cde0-7680-b588-a6db8ac97744` | Mechanical fail for closure, pass for implementation shape | Manifest/vendor-fidelity were stale and manifest gates must use known target names, not raw commands or aggregate `gate`. | Accepted and repaired. Manifest promoted with valid gates: `typecheck`, `mini-runtime`, `structural`, `report`; vendor-fidelity updated. |
| Testing/oracle | Darwin `019de1da-433d-7071-bcd4-19fbbb9a56d5` | Mostly adequate with repair | `host.handle(...)` alone could be mimicked by a non-Elysia wrapper; add direct `host.app.handle(...)` assertion. Redaction oracle is scoped, not arbitrary DLP. | Accepted and repaired with direct `host.app.handle(...)` success path. Redaction wording remains fixture/boundary evidence, not complete DLP. |
| Program health/coordination | Raman `019de1da-7295-7f81-b690-5ff63f446012` | Pass | Child 5 closes real Elysia app/request route-forwarding. Program should next try a narrow contained `listen(...)`/port/stop lifecycle child before externality ledger or closeout. | Accepted. Next packet opens contained Elysia listen/lifecycle proof with production-readiness fence. |

Leaf verification after accepted repairs:

- `jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json`:
  passed.
- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts
  tools/runtime-realization-type-env/test/mini-runtime/migration-control-plane-observation.test.ts`:
  passed; 7 tests, 99 assertions.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.

Pattern Decisions:

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |
| Vendor proof can be mimicked if tests only call a RAWR wrapper. | Added direct `host.app.handle(new Request(...))` assertion to the child5 proof. | Future vendor-host children must include at least one direct vendor entrypoint assertion when wrapper methods are also exposed. | Child opening packet oracle/falsifier section. | Accepted. |
| Control-plane telemetry summaries trusted optional run identity. | Required every telemetry record summarized by control-plane packet to carry matching `telemetryRunId`. | Future observation children must test both mismatched and missing correlation identity. | Telemetry/control-plane review axis. | Accepted. |
| Manifest promotion can use raw commands instead of known gate names. | Manifest uses only accepted target names and reports focused commands in the workstream artifact. | Future proof promotions must keep raw focused commands in report verification logs, not manifest `gates`. | Mechanical review lane. | Accepted. |
| Dependency evidence can lag behind repaired package resolution. | Updated `vendor-fidelity.md` after adding root/lab `elysia`. | Vendor dependency repairs must update vendor-fidelity in the same child closeout. | Vendor/integration inheritance and mechanical review. | Accepted. |

## Final Output

Child 5 final result:

- `audit.p3.contained-elysia-host-passage` promoted to
  `simulation-proof`.
- The lab now proves a real contained Elysia app/request route-forwarding
  passage into the existing contained oRPC Fetch boundary and mini-runtime
  server path.
- The proof crosses:
  - explicit root/lab `elysia@1.4.24` dependency;
  - real `Elysia`;
  - `Elysia.handle(new Request(...))`;
  - `.all('/rpc*', ...)` with `{ parse: 'none' }`;
  - raw `context.request` forwarding;
  - existing `@orpc/server/fetch` `RPCHandler`;
  - mini server harness;
  - adapter lowering;
  - `ProcessExecutionRuntime`;
  - telemetry projection/export;
  - control-plane summary correlation.
- The proof does not prove production `listen(...)`, production port/server
  lifecycle, deployment topology, auth/logging, OpenAPI/product API policy,
  native host telemetry/error mapping, public API/DX law, production migration
  readiness, durable async semantics, live HyperDX product visibility,
  RuntimeCatalog persistence, or the final Nx/generator ratchet.

Deferred inventory:

| Residual | Status | Current evidence | Why not green | Promotion condition | Re-entry trigger | Next eligible workstream | Routing owner / DRA decision home |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contained Elysia listen/port/stop lifecycle | `todo` | Child 5 proves `app.handle` request passage only. | No real listener, local port, server start/stop, or post-stop network behavior has been exercised. | A contained listener starts on an ephemeral/local port, real fetch crosses it into the same Elysia -> oRPC -> runtime path, stop/finalization is recorded, and post-stop requests do not delegate to runtime. | Child 5 closeout accepted by DRA. | `2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md` | Phase Three DRA |
| Production HTTP serving / host lifecycle | `xfail` | Child 5 proves contained Elysia `app.handle` only. | Production process, deployment, middleware, auth/logging, host telemetry/error mapping, and public API policy remain unaccepted. | Later production migration or explicit production-host workstream opens and gates those policies. | Any claim attempts production readiness from child5. | Production migration / externality phase | Phase Three DRA until routed |
| OpenAPI/product API policy | `xfail` | No OpenAPI/Eden/plugin publication is touched. | Product API exposure and public contract law remain outside this proof. | Accepted public API/DX law and publication gate. | Future API/product workstream opens. | Externality/design decision packet | Phase Three DRA |
| Native host telemetry/error mapping | `xfail` | Host records project to lab telemetry only. | No production host mapping, middleware taxonomy, or product observability semantics are accepted. | Accepted host telemetry/error taxonomy and product observability gate. | Observability child tries to green native host telemetry. | Externality/observability workstream | Phase Three DRA |

DRA control decision:

- Accept child5 as contained `simulation-proof`.
- Open the next child as a narrow contained Elysia listen/lifecycle proof before
  program closeout or a broad externality ledger.

Next packet:

- Workstream:
  `2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`
- Active question:
  Can the mini-runtime lab start a real local Elysia listener around the same
  contained Elysia -> oRPC -> runtime path, send a real request through the
  listener, record start/request/stop/finalization behavior, prove post-stop
  requests do not delegate into runtime, and still avoid production HTTP
  readiness claims?
- Required first reads:
  - this report;
  - `../vendor-fidelity.md`;
  - `../runtime-spine-verification-diagnostic.md`;
  - `../spine-audit-map.md`;
  - `../proof-manifest.json`;
  - active DRA workflow reference;
  - local `elysia` skill;
  - official Elysia listen/server lifecycle docs broad-to-deep;
  - `src/mini-runtime/adapters/elysia-host.ts`;
  - `test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts`.
- Initial stop rules:
  - stop if listener proof requires production `apps/*` mutation;
  - stop if Elysia listen semantics require deployment/auth/logging/API policy
    decisions to make the contained proof green;
  - stop if a green test can pass without a real local listener;
  - stop if production readiness wording appears before production migration.

Current focus after closeout:

- Historical handoff from child 5:
  `phase-three.contained-elysia-listen-lifecycle-passage`.
- Superseded by:
  child 6 contained Elysia listen/lifecycle proof and child 7 integrated
  live-passage closeout. Phase Three is now closed below production readiness.
