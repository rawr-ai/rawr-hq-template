# Phase Three Contained Elysia Listen Lifecycle Passage

Status: `closed as contained simulation-proof`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending local commit`.

This report is the closed child-6 workstream for Phase Three. It is not runtime
architecture authority, final public API/DX authority, production HTTP proof,
production migration authorization, or permission to mutate production app code.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Child 6 closed. |
| Workstream type | Executable contained proof slice. |
| Proof target | `simulation-proof` only if source/tests/gates prove a real local Elysia listener lifecycle around the contained Elysia -> oRPC -> runtime path. |
| Active question | Can the lab start a real local Elysia listener on an ephemeral port, send a real network request through it into the contained Elysia -> oRPC -> runtime path, record start/request/stop/finalization behavior, and prove post-stop requests do not delegate into runtime without claiming production HTTP readiness? |
| Blocked claims | Production HTTP serving, deployment topology, auth/logging policy, OpenAPI/product API policy, native host telemetry/error mapping, production migration readiness, durable async semantics, live HyperDX product visibility, RuntimeCatalog persistence, public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Cross the remaining server-host lifecycle gap after child 5's
  `Elysia.handle(new Request(...))` proof.
- Determine how much of a real local listener start/request/stop passage can be
  proven inside the mini-runtime lab without touching production `apps/*`.
- Preserve separate Elysia listener, Elysia route-forwarding host, oRPC,
  RAWR runtime, harness, telemetry, and control-plane evidence layers.

Containment boundary:

- Source/test edits must stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`,
  `plugins/*`, root exports, deployment topology, and final Nx/generator
  ratchets remain out of scope.
- Root/lab dependency changes are allowed only if discovery proves they are
  necessary for contained listener proof and do not add the tool to workspaces.

Non-goals:

- Do not claim production HTTP readiness or production server lifecycle.
- Do not settle final public API/DX, OpenAPI publication, auth/logging,
  product API policy, native host telemetry/error mapping, or deployment
  topology.
- Do not open durable Inngest, HyperDX product visibility, RuntimeCatalog
  persistence, or Nx/generator work.

## Opening Packet

Opening input:

- DRA accepted child 5 as contained `simulation-proof` and accepted this
  narrow listen/lifecycle proof as the next executable child.

Prior stages consumed:

- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`
- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`
- `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`
- `2026-05-01-phase-three-contained-elysia-host-passage.md`

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
- `architecture`: listener/runtime/vendor/product boundary separation.
- `testing-design`: falsifier-first executable oracle.
- `elysia`: Elysia listen/server lifecycle, request, and stop idioms.
- `orpc`: only because the listener must route through the existing contained
  oRPC Fetch boundary.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: Elysia listener lifecycle directly; oRPC remains crossed through the existing Fetch boundary; telemetry/control-plane only as observation. |
| Required skill introspection | `elysia`, `orpc`; Effect/OTEL/HyperDX skills are `none found` unless later discovery finds them. |
| Official-docs lane | Required before source/test edits and before any Elysia listen/lifecycle proof promotion. The lane must start broad-to-deep from Elysia docs/navigation before selecting listen/server lifecycle pages. |
| Golden integration exemplar | Reference-only if author-facing integration shape or vendor-native surface design becomes relevant. Runtime spec wins boundary/lifecycle/proof authority. |
| Durable report disposition | If this child discovers useful Elysia listener integration rules for later runtime design, update `vendor-fidelity.md` or create a labeled reference report. Otherwise keep findings inside this child report. |

## Output Contract

Required executable proof outputs:

- A focused mini-runtime test or test cluster that proves the selected local
  listener lifecycle passage.
- Any required lab-contained source changes for Elysia listener start/stop
  adaptation.
- Clear separation of:
  - listener start/stop status;
  - Elysia route-forwarding host status;
  - oRPC/RPCHandler status;
  - RAWR runtime invocation result;
  - harness and boundary records;
  - telemetry projection/export observations;
  - control-plane summary/correlation.
- Updated proof manifest/focus log/diagnostic/vendor maps as applicable.
- Layered review result with an overall-program-health lane.

Candidate proof cases:

- Real Elysia listener starts on an ephemeral or local port.
- A real network request crosses the listener into the existing contained
  Elysia route-forwarding host, oRPC boundary, server harness, and process
  runtime.
- Listener stop/finalization is recorded.
- Post-stop network request behavior does not delegate into oRPC/runtime.
- Redaction prevents request/resource/execution secrets and live handles from
  leaking into responses, telemetry, or packet summaries.

Proof ceiling:

- Passing this child can promote only contained `simulation-proof`.
- It cannot prove production HTTP serving, deployment lifecycle, OpenAPI/product
  policy, auth/logging, native host telemetry/error mapping, or production
  migration readiness.

Focused gates:

- targeted Elysia listen/lifecycle passage test selected during the plan step;
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Plan

1. Gather current child5 host adapter/test evidence and Elysia package/listen
   evidence.
2. Assimilate child 5's review repairs and proof boundaries.
3. Decide the exact listener lifecycle proof question before source edits.
4. Run dedicated Elysia official-docs lane and installed-package/source
   inspection for listen/stop behavior.
5. Lock the executable oracle and stop rules.
6. Implement only the lab-contained listener lifecycle needed for the oracle.
7. Run leaf verification first, then parent/judgment review across proof
   honesty, architecture/authority, vendor fidelity, testing/oracle,
   telemetry/control-plane, coordination/program health, and mechanical
   information design.
8. Promote only earned `simulation-proof`; fence residuals.
9. Close with next packet and clean repo/Graphite state.

Stop conditions:

- Stop if proof requires production `apps/*` mutation.
- Stop if Elysia listen semantics require deployment/auth/logging/API policy
  decisions to make the contained proof green.
- Stop if a green test can pass without a real local listener.
- Stop if production readiness wording appears before production migration.

## Discovery Log

Opening verification:

- Child 5 accepted this child as the next live-runtime-passage domino.
- Child 6 starts from a clean repo/Graphite state after commit
  `925c1932` (`test(runtime): prove contained Elysia host passage`).
- Opening baseline before implementation: no child-6 runtime behavior existed.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Elysia official docs | complete | Local `elysia` skill plus official Elysia/Bun/oRPC docs support `.listen(...)`, handler `request` forwarding, `parse: "none"` for third-party/oRPC handlers, Elysia config over Bun serve options, and Bun `server.stop(...)`. The lane recommends loopback network `fetch` as the listener oracle and keeps production host/deploy/TLS/proxy/process-supervision claims fenced. |
| Installed package/source evidence | complete | Installed `elysia@1.4.24` resolves at the repo root. Source/probes show `.listen(...)` returns the app, assigns `app.server`, runs `onStart` before callback, `app.stop(true)` clears `app.server` and runs `onStop`, and `listen({ port: 0, hostname: "127.0.0.1" })` accepts a real network request under Bun. |
| Runtime/source evidence | complete | Listener lifecycle should be a sibling adapter around the existing child-5 `StartedRuntimeElysiaHostBoundary`, not a replacement. The main oracle must use real network `fetch(new URL("/rpc/invoke", listener.url))`; `app.handle`, `app.fetch`, and `server.fetch` remain support/control only. |
| Testing/oracle design | accepted | The executable proof will start a real local listener, send a network request through Elysia -> oRPC -> harness -> runtime, stop the listener, attempt a post-stop network request, and assert no additional host/oRPC/harness/runtime delegation after stop. |
| Program health | reviewed with closeout repair demands | This child remains bounded to contained listener lifecycle and must not settle production server lifecycle, deployment topology, auth/logging, OpenAPI/product policy, native host telemetry/error mapping, public API/DX law, or migration readiness. The program-health review required report closeout, review disposition, gate recording, and next-packet cleanup before proof promotion. |

## Locked Proof Question

Can a lab-contained Elysia app that already forwards `/rpc*` into the contained
oRPC Fetch boundary be started as a real local Bun/Elysia listener on
`127.0.0.1:0`, receive a real network request, delegate through the existing
mini-runtime path, stop deterministically, and reject post-stop network passage
without further runtime delegation?

Accepted oracle:

- source adapter:
  `src/mini-runtime/adapters/elysia-listener.ts`;
- test:
  `test/mini-runtime/phase-three-contained-elysia-listen-lifecycle-passage.test.ts`;
- start with `host.app.listen({ hostname: "127.0.0.1", port: 0 })`;
- derive the request URL from `host.app.server.url`;
- use direct real network `globalThis.fetch(new URL("/rpc/invoke",
  listener.url), ...)` for the main request;
- stop with `await host.app.stop(true)`;
- after stop, attempt another direct network `globalThis.fetch(...)` and assert
  rejection plus unchanged Elysia-host, oRPC, harness, and runtime delegation
  counts;
- project listener, host, oRPC, harness, adapter, and runtime records into
  separate telemetry sources as observation only.

Falsifiers:

- the test must fail if the listener adapter bypasses real `.listen(...)`;
- the test must fail if the main proof path calls only `app.handle`,
  `app.fetch`, `server.fetch`, or a listener-owned fetch wrapper instead of
  direct `globalThis.fetch(...)` against the bound listener URL;
- the test must fail if post-stop request behavior delegates into oRPC, the
  harness, or `ProcessExecutionRuntime`;
- the test must fail if listener records are collapsed into Elysia host or oRPC
  records;
- the test must fail if production-readiness claims appear in promoted evidence.

## Implementation Log

Implemented files:

- `src/mini-runtime/adapters/elysia-listener.ts`
- `src/mini-runtime/index.ts`
- `test/mini-runtime/phase-three-contained-elysia-listen-lifecycle-passage.test.ts`

Behavior implemented:

- starts the existing child-5 Elysia host with real
  `app.listen({ hostname: "127.0.0.1", port: 0 })`;
- records listener `starting`, vendor `onStart`, and started URL/host/port
  facts without copying the live server object;
- sends the main proof request through direct real network
  `globalThis.fetch(...)` to `/rpc/invoke`;
- records listener request entry through Elysia `onRequest`, not through a
  RAWR-owned fetch wrapper;
- preserves the existing Elysia host, oRPC Fetch, mini server harness, adapter,
  and process-runtime layers;
- stops with `await app.stop(true)`;
- verifies `app.server === null`;
- attempts a post-stop direct network request and asserts rejection while
  proving host/oRPC/harness/runtime delegation counts do not increase.

Important implementation distinction:

- `elysia.host.responded` is emitted only by the child-5 wrapper
  `host.handle(...)`. It is not expected in the child-6 network listener path,
  because the listener enters the real `host.app` route table directly. This is
  an intentional layer distinction, not a missing record.

Focused verification run so far:

- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-listen-lifecycle-passage.test.ts`:
  passed, 1 test / 70 assertions.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `git diff --check`: passed after initial implementation.

## Review Result

Layered review:

| Lane | Verdict | DRA disposition |
| --- | --- | --- |
| Official Elysia/oRPC/Bun docs | pass | Accepted as vendor evidence for contained local listener behavior only. The lane read broad-to-deep from local skills and official docs before selecting listen/server lifecycle pages. |
| Installed package/source behavior | pass | Accepted for `elysia@1.4.24`/Bun local behavior: `.listen(...)` assigns `app.server`, `onStart`/`onStop` fire, `app.stop(true)` clears `app.server`, and loopback requests are accepted under Bun. |
| Runtime/oracle design | pass | Accepted after requiring a sibling listener adapter around the child-5 host and direct network fetch as the oracle. |
| Telemetry/control-plane | pass | Accepted. The proof keeps telemetry, OTLP payload, export summary, and control-plane packet evidence local and non-persistent; it does not claim HyperDX product visibility or control-plane topology. |
| Vendor fidelity | pass with wording repair | Accepted after recording in `vendor-fidelity.md` that this proves contained Bun/Elysia local listener lifecycle only, not production serving, supervision, TLS/proxy, Node parity, OpenAPI/Eden behavior, auth/logging, deployment topology, or migration readiness. |
| Architecture/proof honesty | repaired | Initial fail was process-level: manifest promotion was present before the report had review/closeout evidence. Repaired by recording review disposition, deferred inventory, final output, and gate requirements before keeping the manifest promotion. |
| Testing/oracle | repaired | Initial fail correctly rejected a helper-style `listener.fetch` oracle. Repaired by removing the listener fetch helper and asserting direct `globalThis.fetch(new URL(...listener.url), ...)` before and after stop. |
| Program health/coordination | repaired | Initial fail correctly found pre-accepted program-health text and missing closeout artifacts. Repaired by adding review disposition, pattern decisions, current focus, deferred inventory, next packet, and closeout standard. |
| Mechanical/information design | repaired | Initial fail found stale diagnostic language and incomplete report closeout. Repaired by normalizing diagnostic language, aligning the harness row with child 6, and recording verification requirements. |

Accepted proof:

- Child 6 earns contained `simulation-proof` for local Elysia/Bun
  listen/request/stop lifecycle around the existing contained Elysia -> oRPC ->
  server harness -> `ProcessExecutionRuntime` path.

Non-promotions:

- No production HTTP serving proof.
- No deployment/process-supervision lifecycle proof.
- No TLS, proxy, load-balancer, auth/logging, OpenAPI/product policy, Node
  adapter parity, native host telemetry/error mapping, or production migration
  readiness.
- No durable async semantics, live HyperDX product visibility, RuntimeCatalog
  persistence, public API/DX law, or final structure/Nx/generator ratchet.

Pattern Decisions:

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |
| Network listener proof can accidentally become wrapper proof. | Removed the listener fetch helper from the oracle and used direct `globalThis.fetch(...)` against the listener URL. | Future listener/network children must name whether the primary oracle is direct network, simulated request, or helper-level control. | Child opening packet and testing/oracle review lane. | Accepted. |
| Vendor lifecycle records can be conflated with RAWR wrapper records. | Listener request observation comes from Elysia `onRequest`; host `elysia.host.responded` remains limited to child-5 `host.handle(...)`. | Future vendor-host children must identify which records are vendor-hook-native, RAWR wrapper records, and runtime delegation records. | Output contract and proof-honesty review lane. | Accepted. |
| Proof promotion can race ahead of report closeout. | Completed review disposition, deferred inventory, final output, and gate record before keeping the manifest entry at `simulation-proof`. | Future child closeouts must finish review/final-output artifacts before proof-promotion acceptance. | DRA workflow closeout checklist. | Accepted. |
| Stale residual wording can make a new proof look unacknowledged. | Reworded diagnostic and map language to distinguish contained local listen proof from production deployed lifecycle. | Future evidence updates must sweep component matrix, residual rows, focus log, and current-state cards for stale "still open" language. | Mechanical/information-design review lane. | Accepted. |

Deferred Inventory:

| Residual | Why deferred | Authority home | Re-entry trigger | Next eligible workstream |
| --- | --- | --- | --- | --- |
| Production HTTP serving under deployment/process supervision | Requires production host/process topology and deployment lifecycle decisions outside the mini-runtime lab. | Runtime spec plus later production migration/control-plane workstream. | A migration workstream opens production `apps/*` or deployment topology explicitly. | Production migration or deployment/control-plane phase. |
| TLS/proxy/load-balancer behavior | Requires deployment edge infrastructure and product hosting choices. | Deployment/control-plane authority. | Deployment placement and edge topology are in scope. | Deployment/control-plane phase. |
| Auth/logging/OpenAPI/product policy | Requires public product API/DX and security policy decisions. | Runtime spec plus future API/product policy decision packets. | Public API/DX or product policy becomes a blocker for a scoped proof/migration. | Externality/design phase or production migration phase. |
| Native host telemetry/error mapping | Requires production host semantics and product observability policy. | Telemetry/error mapping decision packet; runtime spec remains boundary authority. | Production host integration or product telemetry policy opens. | Externality/design or production migration phase. |
| Durable async semantics | This child is server/Elysia-only; Inngest durable scheduling/retry/replay/idempotency/run history remain outside this proof. | Runtime spec and future Inngest/durable async workstream. | A child explicitly opens durable Inngest semantics or production async host behavior. | Externality/design phase or production migration phase. |
| Live HyperDX product visibility and RuntimeCatalog persistence | Child 6 only projects local telemetry/control-plane summaries. | Telemetry/product observability and RuntimeCatalog decision packets. | Product query/dashboard/retention or catalog storage becomes scoped. | Externality/design phase. |
| Final public API/DX law and Nx/generator ratchet | Phase Three live passage precedes final structure ratchet. | Runtime spec, architecture spec context, and later structure/Nx/generator phase. | Phase Three closeout decides the remaining uncertainty is small enough for structure ratchet. | Final structure/Nx/generator phase. |

Final verification after review repairs:

- `jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json`:
  pass.
- `bun test
  tools/runtime-realization-type-env/test/mini-runtime/phase-three-contained-elysia-listen-lifecycle-passage.test.ts
  tools/runtime-realization-type-env/test/mini-runtime/migration-control-plane-observation.test.ts`:
  pass.
- `bunx nx run runtime-realization-type-env:typecheck`: pass.
- `bunx nx run runtime-realization-type-env:mini-runtime`: pass.
- `bunx nx run runtime-realization-type-env:structural`: pass.
- `bunx nx run runtime-realization-type-env:report`: pass.
- `bunx nx run runtime-realization-type-env:gate`: pass.
- `bun run runtime-realization:type-env`: pass; invokes the same
  `runtime-realization-type-env:gate`.
- `git diff --check`: pass.
- Final `git status --short --branch` and `gt status --short`: DRA worktree
  dirty only with this child-6 closeout and next-packet commit surface until
  the local commit lands.

## Final Output

Child 6 is closed as contained `simulation-proof`.

It proves:

- a real local Elysia/Bun listener can start on `127.0.0.1` with an ephemeral
  port around the existing contained Elysia -> oRPC -> mini-runtime path;
- a direct network `globalThis.fetch(...)` request reaches `/rpc/invoke` and
  delegates through Elysia host, oRPC Fetch, mini server harness, adapter, and
  `ProcessExecutionRuntime`;
- listener, host, oRPC, harness, adapter, runtime, telemetry, OTLP export, and
  control-plane observations remain separated;
- `app.stop(true)` clears `app.server`; and
- a post-stop direct network request rejects without increasing host, oRPC,
  harness, or runtime delegation counts.

It does not prove production HTTP readiness or any production migration claim.

Current focus after closeout:

- DRA accepts the program-health recommendation to open an integrated
  live-passage rehearsal and closeout child next.
- The next child should compose the earned Phase Three slices if evidence
  supports it, or record exactly why an integrated rehearsal cannot honestly
  close.

Next packet:

- Active next workstream:
  `2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md`
- Required first reads:
  - this report;
  - `2026-05-01-phase-three-program-workstream.md`;
  - `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`;
  - `2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`;
  - `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`;
  - `2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md`;
  - `2026-05-01-phase-three-contained-elysia-host-passage.md`;
  - manifest, diagnostic, spine map, vendor notes, focus log, and DRA
    workflow reference.
- First action:
  open with authority/proof reconciliation, decide whether the integrated
  rehearsal can be executable or must be closeout-only, then plan before any
  implementation.
