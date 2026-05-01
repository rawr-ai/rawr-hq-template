# Mini-Runtime Salvage To Reference Runtime Report

Status: `closed`.
Branch: `codex/runtime-mini-runtime-salvage-report`.
PR: `none`.
Commit: `branch HEAD after commit`.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority, proof authority, production readiness, or an
implementation plan for the future reference runtime.

No public APIs, runtime code, proof categories, manifest entries, or vendor
claims change in this step. The report only tells the next DRA what can be
copied, adapted, mined, or retired when the future full runtime-in-a-folder
opens.

## Table Of Contents

- [What To Copy, Adapt, Mine, Or Retire](#what-to-copy-adapt-mine-or-retire)
- [Classification Rules](#classification-rules)
- [Direct-Copy Candidates](#direct-copy-candidates)
- [Internal-Only Copy Candidates](#internal-only-copy-candidates)
- [High-Value Salvage Clusters](#high-value-salvage-clusters)
- [Reference-Only Learning](#reference-only-learning)
- [Do Not Carry Forward](#do-not-carry-forward)
- [Test-Oracle Migration Map](#test-oracle-migration-map): [Keep As Fast Conformance](#keep-as-fast-conformance), [Adapt As Reference-Runtime Oracles](#adapt-as-reference-runtime-oracles), [Mine As Failure Oracles Or Reference Only](#mine-as-failure-oracles-or-reference-only)
- [Coverage Gaps For The Next Phase](#coverage-gaps-for-the-next-phase)
- [Deferred Inventory](#deferred-inventory)
- [Review Result](#review-result)
- [Artifact And Verification Status](#artifact-and-verification-status)
- [Next Workstream Packet](#next-workstream-packet)
- [Appendix](#appendix): [Inputs Used For This Inventory](#inputs-used-for-this-inventory), [Source-Tree Lookup](#source-tree-lookup)

## What To Copy, Adapt, Mine, Or Retire

The future full runtime-in-a-folder should not copy the mini-runtime as a
folder. It should copy a narrow set of stable contracts and fixtures, keep a
small set of internal helpers, adapt the high-value runtime clusters, mine
reference-only lessons, and retire lab scaffolding once the reference runtime
has real coverage.

| Use this way | Best candidates | Decision |
| --- | --- | --- |
| Copy directly after spec re-check | `src/mini-runtime/diagnostics.ts`; core refs/artifacts in `src/spine/artifacts.ts`; selected inline negative fixtures | Very narrow direct-copy set. |
| Copy as private substrate | `src/mini-runtime/catalog.ts`; `src/mini-runtime/managed-runtime.ts`; `src/sdk/runtime/provider-plan-internals.ts`; selected authoring fixtures | Useful internals, not public API. |
| Adapt into the reference runtime | Provider/provisioning spine, process execution spine, service binding, server path, async path, telemetry projection | Highest-value implementation substrate. |
| Mine as reference only | `src/mini-runtime/harnesses.ts`; `src/mini-runtime/runtime-access.ts`; `src/sdk/app.ts`; `src/spine/compiler.ts`; vendor shape probes | Learn from these, but do not paste them as runtime law. |
| Retire or supersede | `src/mini-runtime/process-resources.ts`; `src/mini-runtime/index.ts`; `src/spine/simulate.ts`; duplicated integrated rehearsals; toy names/events | Replace with full runtime-in-a-folder implementation and focused oracles. |

## Classification Rules

| Classification | Meaning | Required gate before future use |
| --- | --- | --- |
| `COPY-AS-IS` | Exact copy is viable, with only import/path relocation if unavoidable. | Re-check against the manifest-pinned runtime spec; path existence alone is not enough. |
| `COPY-INTERNAL-ONLY` | Copy is viable only as private substrate, test support, or internal implementation detail. | Keep behind runtime internals or conformance fixtures. |
| `SALVAGE-WITH-ADAPTATION` | Valuable logic exists, but names, ownership, semantics, or contracts must change. | Adapt deliberately and name the authority that owns the final shape. |
| `REFERENCE-ONLY` | Useful behavior, oracle, or integration lesson; code should not be copied. | Mine before implementation; write new runtime code or tests. |
| `RETIRE/SUPERSEDE` | Replace with the full reference-runtime implementation or remove once covered. | Do not carry forward except as provenance. |

`COPY-AS-IS` is not a claim that the lab file is architecture authority.
Selected spine DTOs and negative fixtures are copyable only while the
manifest-pinned runtime spec still owns the same semantics.

## Direct-Copy Candidates

| Candidate | Classification | Why it can move | Guardrail |
| --- | --- | --- | --- |
| `src/mini-runtime/diagnostics.ts` `validateProviderClosure` | `COPY-AS-IS` | Small semantic check that required provider resources are selected before boot. | Re-check imports if `RuntimeProfile` or resource types move. |
| `src/spine/artifacts.ts` core identity/artifact types: `ExecutionDescriptorRef`, async owner identity, portable artifact, service binding plan, surface runtime plan, server route descriptor, dispatcher descriptor | `COPY-AS-IS` / narrow `SALVAGE-WITH-ADAPTATION` | Strongest durable spine contract: refs are portable; executable bodies are runtime-owned. | Keep placeholder/harness/access types separate; unresolved access comments are not final law. |
| `fixtures/inline-negative/descriptor-refs.ts` | `COPY-AS-IS` | Strong type guard for discriminated refs and async owner exclusivity. | Keep as conformance fixture, not runtime code. |
| `fixtures/inline-negative/effect-public-surface.ts` | `COPY-AS-IS` | Guards against leaking raw Effect runtime constructors into authoring. | Re-run against final public facade names. |
| `fixtures/inline-negative/service-client-boundaries.ts` | `COPY-AS-IS` | Guards construction-bound versus invocation-bound service clients. | Keep as contract test for the reference runtime surface. |

## Internal-Only Copy Candidates

| Candidate | Classification | Use | Do not use as |
| --- | --- | --- | --- |
| `src/mini-runtime/catalog.ts` redaction helpers and in-memory recorder | `COPY-INTERNAL-ONLY` | Private observation/redaction base for runtime tests and local records. | Product RuntimeCatalog persistence or HyperDX visibility. |
| `src/mini-runtime/managed-runtime.ts` `EffectRuntimeAccess`, `createManagedEffectRuntimeAccess`, `runRawrEffectExit` | `COPY-INTERNAL-ONLY` | Internal Effect execution substrate. | Public runtime handle contract. |
| `src/sdk/runtime/provider-plan-internals.ts` | `COPY-INTERNAL-ONLY` | Opaque provider plan lowering bridge. | Public provider API. |
| `src/sdk/index.ts` | `COPY-INTERNAL-ONLY` | Barrel only after final module boundaries are known. | Independent API decision. |
| `fixtures/positive/work-items-service.ts` | `COPY-INTERNAL-ONLY` | Golden SDK authoring fixture. | Domain runtime code. |
| `fixtures/positive/server-api-plugin.ts` | `COPY-INTERNAL-ONLY` | Server plugin/service invocation fixture. | Product plugin implementation. |
| `fixtures/positive/async-workflow.ts` | `COPY-INTERNAL-ONLY` | Async authoring fixture. | Real durable workflow behavior. |
| `fixtures/positive/resource-provider-profile.ts` | `COPY-INTERNAL-ONLY` | Provider/profile fixture. | Real provider catalog or production resources. |
| `fixtures/inline-negative/authoring-contracts.ts` | `COPY-INTERNAL-ONLY` | SDK boundary negatives. | Final API law until facade is accepted. |
| `fixtures/inline-negative/vendor-boundaries.ts` | `COPY-INTERNAL-ONLY` | Adapter-boundary guard. | Vendor product proof. |
| `fixtures/fail/*.fail.ts` | `COPY-INTERNAL-ONLY` | Failure fixtures for compiled mode, deployment live handles, portable closures, and provider resource coverage. | Runtime implementation code. |

## High-Value Salvage Clusters

Move these as functional clusters. Do not copy isolated files and hope the
runtime meaning survives.

| Cluster | Candidates | Classification | Required adaptation |
| --- | --- | --- | --- |
| Provider/provisioning spine | `src/mini-runtime/provider-lowering.ts`, `src/mini-runtime/bootgraph.ts`, `src/mini-runtime/managed-runtime.ts`, `src/mini-runtime/catalog.ts`, `src/mini-runtime/boundary-policy.ts`, `src/mini-runtime/diagnostics.ts` | `SALVAGE-WITH-ADAPTATION` plus internal copies | Rename `Mini*` surfaces, define final provider API shape, settle config source/secret precedence, decide which policies enforce versus record intent. |
| Process execution spine | `src/mini-runtime/process-runtime.ts`, `src/mini-runtime/managed-runtime.ts`, `src/mini-runtime/boundary-policy.ts`, `src/mini-runtime/catalog.ts`, core refs from `src/spine/artifacts.ts` | `SALVAGE-WITH-ADAPTATION` | Rename `RuntimeSimulationEvent`, define production/reference event and error contracts, repair duplicated `registry` input wart, keep descriptor-table separation. |
| Service binding and invocation access | `src/mini-runtime/service-binding-cache.ts`, `src/sdk/service.ts`, invocation-bound client negatives; mine `src/mini-runtime/runtime-access.ts` as reference only | `SALVAGE-WITH-ADAPTATION` with reference-only access probe | Finalize service ownership/cache key law, distinguish runtime resource access from in-process probes, keep invocation-bound clients strict. |
| Server request path | `src/mini-runtime/adapters/server.ts`, `src/mini-runtime/adapters/orpc-server.ts`, `src/mini-runtime/adapters/elysia-host.ts`, selected server route SDK/spine declarations | `SALVAGE-WITH-ADAPTATION` | Keep Elysia as raw request forwarding, oRPC as RPC parsing, and RAWR runtime as execution owner; run current oRPC/Elysia docs and exact version review before reuse. Prefer a supported `RPCLink`, OpenAPI, or client fixture over a hand-authored oRPC wire envelope unless the manual envelope is deliberately pinned as a failure oracle. |
| Local listener lifecycle | `src/mini-runtime/adapters/elysia-listener.ts`, listener lifecycle tests | `REFERENCE-ONLY` / targeted adaptation | Useful for local dev/reference process lifecycle; not a production host contract. |
| Async handoff path | `src/mini-runtime/adapters/async.ts`, `src/mini-runtime/adapters/inngest-async.ts`, async plugin facade, async owner/step refs | `SALVAGE-WITH-ADAPTATION` | Keep protocol-body failure inspection; replace pseudo `stepEffect`; do not claim durable Inngest semantics without a real durable/dev-server gate. |
| Telemetry and observation | `src/mini-runtime/telemetry-export.ts`, `test/mini-runtime/phase-two-observation-spine.test.ts`, `test/mini-runtime/telemetry-export.test.ts`, `src/mini-runtime/catalog.ts` | `SALVAGE-WITH-ADAPTATION` | Preserve redaction and OTLP shape as local observation support; require live HyperDX/backend visibility for product observability claims. |
| Control-plane summary | `src/mini-runtime/deployment-handoff.ts`, `src/mini-runtime/migration-control-plane-observation.ts`, related tests | Handoff guard `SALVAGE-WITH-ADAPTATION`; packet shape `REFERENCE-ONLY` | Keep live-handle/leakage/app-run identity negatives; do not copy placement/control-plane packet shape as topology or persistence authority. |
| RuntimeSchema adapter | `src/sdk/runtime/schema.ts`, `src/vendor/boundaries/typebox.ts` | `SALVAGE-WITH-ADAPTATION` | Re-check TypeBox docs and target package version; raw TypeBox values only become RAWR `RuntimeSchema` through the adapter. |

## Reference-Only Learning

Use these as behavior/context to mine before implementation. Do not paste them
into the reference runtime as authority.

| Candidate | Classification | What to mine | Why not copy |
| --- | --- | --- | --- |
| `src/sdk/app.ts` | `REFERENCE-ONLY` | App declaration ergonomics and how fixtures assembled the toy app. | Final app/plugin/service ownership is still a runtime authority decision. |
| `src/spine/compiler.ts` | `REFERENCE-ONLY` | Compilation inputs, artifact shape, and diagnostic expectations. | The full runtime should own compiler boundaries directly instead of preserving the lab shim. |
| `src/mini-runtime/runtime-access.ts` | `REFERENCE-ONLY` | Runtime-access narrowing and negative access behavior. | It is an in-process probe, not the final runtime access surface. |
| `src/mini-runtime/harnesses.ts` | `REFERENCE-ONLY` | Harness invocation ergonomics and failure observation. | Harness shape should follow the reference runtime, not define it. |
| `src/vendor/boundaries/orpc.ts` | `REFERENCE-ONLY` | Vendor constructibility assumptions and boundary vocabulary. | Reuse requires current official oRPC docs/version review and supported client/link path confirmation. |
| `src/vendor/boundaries/inngest.ts` | `REFERENCE-ONLY` | Event/function/step constructibility assumptions. | It does not prove durable Inngest scheduling/retry/replay/idempotency/run history. |
| `src/vendor/effect/runtime.ts` | `REFERENCE-ONLY` | Effect runtime conformance support. | It is vendor-assumption support, not a RAWR runtime API. |
| `fixtures/positive/app-and-plan-artifacts.ts` | `REFERENCE-ONLY` | Declaration-to-plan/artifact acceptance story. | The full reference runtime should create its own target-shaped smoke and plan artifacts. |
| `fixtures/inline-negative/runtime-access-boundaries.ts` | `REFERENCE-ONLY` | Runtime access boundary failures. | Final access law is still tied to the reference runtime surface and manifest-pinned spec. |

## Do Not Carry Forward

- Do not copy `src/mini-runtime/index.ts`; it mixes core, adapters, telemetry,
  and control-plane surfaces that need explicit public/internal barrels.
- Do not copy `src/spine/simulate.ts`; it is only a re-export shim.
- Do not copy `src/mini-runtime/process-resources.ts` as runtime core; it is a
  vendor Effect capability probe/test fixture.
- Do not promote `src/mini-runtime/telemetry-export.ts` into HyperDX proof.
- Do not promote `src/mini-runtime/adapters/inngest-async.ts` into durable
  scheduling/retry/replay/idempotency/run-history proof.
- Do not preserve toy fixture names, exact synthetic event names, hand-authored
  artifact files, or local pseudo-SDK aliases as final API truth.
- Do not keep multiple broad integrated rehearsals once one reference-runtime
  smoke plus focused conformance/failure tests cover the same risk.

## Test-Oracle Migration Map

Future-use labels here are instructions for the next runtime-in-a-folder phase.
They do not promote the current tests into live/vendor/product proof. A migrated
oracle earns new proof only after it runs against the full reference runtime and
any required vendor-local/live gates.

### Keep As Fast Conformance

| Test cluster | Current oracle | Future use |
| --- | --- | --- |
| `test/vendor-effect/effect-runtime.test.ts` | Pinned Effect assumptions: `gen`, `pipe`, `Exit/Cause`, interruption, scoped finalizers, managed runtime wrapper. | `KEEP-CONFORMANCE`; do not count as runtime e2e except through RAWR runtime access. |
| `test/vendor-boundaries/boundary-shapes.test.ts` | TypeBox/oRPC/Inngest constructibility and handoff shape smoke. | `KEEP-CONFORMANCE` / `REFERENCE-ONLY`; keep TypeBox adapter check, downgrade oRPC/Inngest shape probes once real adapters exist. |
| `test/middle-spine-derivation.test.ts` | Normalized graph, refs, portable artifacts, compiler inputs, cold route derivation, diagnostics. | `KEEP-CONFORMANCE`; adapt selected declaration-to-plan path after reference runtime exists. |
| `test/spine-simulation.test.ts` | Descriptor table/registry identity, invalid assembly rejection, invocation-bound clients, portable artifact, provider closure. | `KEEP-CONFORMANCE` / `ADAPT-AS-FAILURE-ORACLE`. |
| `test/mini-runtime/process-runtime.test.ts` conformance slices | Cache identity, runtime-access narrowing, handoff portability, registry identity, stopped harness behavior. | `KEEP-CONFORMANCE`; port only full invocation stories after rewrite. |
| `test/mini-runtime/provider-provisioning.test.ts` conformance slices | Provider dependency ordering, config redaction, rollback, finalization, release failure. | `KEEP-CONFORMANCE`; adapt invalid config, missing dependency, release failure as failure oracles. |
| `fixtures/fail/*.fail.ts` | Compiled-mode, deployment live-handle, portable closure, and provider resource negative fixtures. | `KEEP-CONFORMANCE` as failure fixtures. |

### Adapt As Reference-Runtime Oracles

| Test cluster | Current oracle | Future use |
| --- | --- | --- |
| `test/mini-runtime/process-runtime.test.ts` lifecycle stories | Registry invocation, adapter delegation, boot/finalize, service DAG, handoff rejection. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE` after rewrite. |
| `test/mini-runtime/provider-provisioning.test.ts` lifecycle stories | Provider graph closure, config validation, dependency ordering, rollback/finalization, policy records. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE` after rewrite. |
| `test/mini-runtime/provider-effect-spine-scenario.test.ts` | Provider-started values enter runtime-owned Effect invocation access without leaking secrets. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`. |
| `test/mini-runtime/server-orpc-boundary.test.ts` | Real oRPC Fetch request delegates through server harness/runtime; unmatched paths reject before invocation; redaction. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`; run current oRPC docs/version review and avoid relying on manual wire shape unless intentionally pinned. |
| `test/mini-runtime/inngest-async-boundary.test.ts` | Inngest Bun serve/function/step handoff delegates through async harness/runtime; unknown function rejects. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`; no durable scheduling/idempotency claim. |
| `test/mini-runtime/telemetry-export.test.ts` | Runtime/provider/catalog records project to redacted OTLP with injected fetcher. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`; replace toy event names with reference runtime taxonomy. |
| `test/mini-runtime/phase-two-observation-spine.test.ts` | Provider/server/async/catalog records project into redacted observation evidence. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE` after event schema is owned by the reference runtime. |
| `test/mini-runtime/phase-three-contained-elysia-host-passage.test.ts` | Elysia app request forwards through oRPC/runtime; unmatched route and runtime failure separation. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE` / failure oracle. |
| `test/mini-runtime/phase-three-contained-elysia-listen-lifecycle-passage.test.ts` | Local listener start/request/stop and post-stop non-delegation. | `REFERENCE-ONLY` / `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`; seeds local-dev gate only, not production deployment/supervision/TLS/proxy/auth/native telemetry. |
| `test/mini-runtime/phase-three-started-process-assembly-stop-finalization-passage.test.ts` | Started process invokes server+async, observes, stops, finalizes, rejects post-stop. | `ADAPT-AS-REFERENCE-RUNTIME-ORACLE`. |
| `test/mini-runtime/phase-three-integrated-live-passage-rehearsal.test.ts` | Full toy passage composition with listener, async, provider, telemetry, stop/finalize. | Seed at most one reference smoke, then retire duplicated lower-level assertions. |

### Mine As Failure Oracles Or Reference Only

| Test cluster | Current oracle | Future use |
| --- | --- | --- |
| `test/mini-runtime/phase-three-layer-disagreement-failure-observation.test.ts` | HTTP/vendor/runtime/adapter/harness/telemetry/control-plane statuses remain distinct on failure. | `ADAPT-AS-FAILURE-ORACLE`; preserve as a top failure oracle. |
| `test/mini-runtime/migration-control-plane-observation.test.ts` | Safe handoff/catalog/telemetry summaries, app/run correlation, no payload/body leakage. | `REFERENCE-ONLY` / `ADAPT-AS-FAILURE-ORACLE`; do not promote placement packet shape. |
| `test/mini-runtime/phase-two-integrated-runtime-spine-rehearsal.test.ts` | End-to-end contained derivation -> compile -> provision -> mount -> execute -> observe. | `REFERENCE-ONLY` / `ADAPT-AS-REFERENCE-RUNTIME-ORACLE` / `RETIRE/SUPERSEDE`; mine acceptance story and falsifier matrix, seed at most one smoke if needed, then retire duplicated assertions. |

## Coverage Gaps For The Next Phase

| Gap | Why it matters | Suggested owner |
| --- | --- | --- |
| Real SDK derivation from production-style declarations | Current derivation often starts from explicit lab inputs. | Reference runtime DRA. |
| Real app/plugin/service path | Fixtures prove shape, not a production-like slice. | Reference runtime DRA. |
| Durable Inngest semantics | Current proof is handoff shape, not scheduling/retry/replay/idempotency/run history. | Async vendor proof owner. |
| HyperDX product visibility | OTLP-shaped payloads are not query/dashboard/retention proof. | Observability proof owner. |
| Config and secret-store precedence | Current config is fake/lab-local. | Runtime config/secrets decision owner. |
| RuntimeCatalog persistence and control-plane topology | Current packet is non-persistent and candidate-only. | Control-plane/persistence owner. |
| Native host error/status mapping and layer-disagreement taxonomy | Current tests preserve HTTP/protocol/body/runtime disagreement inside the lab, but do not decide production error envelopes, native host telemetry, public status mapping, or product API error policy. | Boundary/host policy design owner. |
| Production-shaped host lifecycle | Local loopback listener is not deployment/process supervision. | Production-like layer owner. |
| Final public API/DX and Nx/generator ratchet | The reference runtime should inform these, not inherit lab aliases blindly. | Final structure/ratchet DRA. |

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Owner | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exact reference-runtime directory/package shape | `todo` | This report inventories salvage, not implementation topology. | `../handoffs/2026-05-01-post-phase-three-live-proof-reframe.md`; future reference-runtime workstream. | Reference runtime DRA. | Next phase opens design for full runtime-in-a-folder. | A workstream starts copying or moving files. | Reference runtime phase. | `lab/spec` |
| Vendor official-doc review for copied adapters | `todo` | Reuse requires current vendor docs and target version confirmation. | `../vendor-fidelity.md`; vendor skills and official docs. | Vendor-fidelity DRA. | Adapter implementation opens. | oRPC/Elysia/Inngest/TypeBox/OTLP code is copied or rewritten. | Vendor-local/live proof lanes. | `lab/spec` |
| HyperDX product visibility | `xfail` | Current telemetry is payload/export-shape proof only. | `../proof-manifest.json` entry `audit.telemetry.hyperdx-observation.residual`; `../runtime-spine-verification-diagnostic.md`. | Observability proof owner. | Product/backend gate is accepted. | Any claim says telemetry is visible/queryable in HyperDX. | Observability proof phase. | `spec/migration` |
| Durable Inngest semantics | `xfail` | Current Inngest proof is local handoff shape. | `../proof-manifest.json` entries `audit.p2.async-inngest-function-step-boundary`, `audit.p2.async-effect-bridge-lowering`; `../vendor-fidelity.md`. | Async vendor proof owner. | Durable/dev-server semantics are scoped and gated. | Runtime migration depends on retry/replay/idempotency/run history. | Async vendor proof phase. | `spec/migration` |
| RuntimeCatalog/control-plane persistence | `xfail` | Current packet is non-persistent candidate-only observation. | `../proof-manifest.json` entry `audit.migration.control-plane-observation.residual`. | Control-plane/persistence owner. | Storage/topology/index/retention decisions open. | Reference runtime needs durable status or placement authority. | Control-plane phase. | `spec/migration` |

## Review Result

Leaf loops:

- Mechanical/source integrity: repaired. Added missing source rows, added
  `fixtures/fail/**`, removed pending placeholders, qualified shorthand paths,
  and aligned mixed classifications.
- Vendor fidelity: passed with P3 repairs. Added oRPC manual wire-shape fence
  and TypeBox adapter-only reuse language. Report still requires official docs
  and exact version review before vendor-facing reuse.
- Test-oracle: repaired. Recast e2e labels as reference-runtime adaptation,
  split conformance from lifecycle stories, fenced local listener scope, and
  added native error/status mapping gap.

Parent loops:

- Architecture/proof honesty: repaired. Added spec-authority re-check before
  `COPY-AS-IS`, softened future test labels, and kept production/vendor/product
  claims fenced.
- Information design: repaired. Moved the decision map to the top, added a
  first-class do-not-carry-forward section, grouped test oracles by future use,
  and demoted source-tree lookup to the appendix.
- Program/coordination: repaired. Deferred inventory now has owners and exact
  authority homes; next packet is executable and centered on the reference
  runtime smoke rather than another broad modeling pass.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| No full `gate` run | Report-only change uses structural/report/diff checks. | Workstream output contract. | No runtime source, manifest, fixture, or test changed. | This report only. | Run full gate if later implementation changes source/tests. |

Invalidations:

- Any future implementation that copies `src/mini-runtime/process-runtime.ts`
  unchanged inherits lab naming and the duplicated `registry` input wart.
- Any future implementation that copies `src/mini-runtime/index.ts` unchanged
  inherits a bad boundary that mixes core, adapters, telemetry, and
  control-plane surfaces.
- Any future implementation that treats `src/mini-runtime/telemetry-export.ts`
  as HyperDX proof repeats the Phase Three proof-category error.

Repair demands for the next phase:

- Before copying vendor-facing adapters, run official-doc review and exact
  version checks.
- Before creating the reference runtime barrel, design explicit public/internal
  module boundaries.
- Before reusing integrated rehearsal tests, collapse duplicated assertions into
  one reference-runtime smoke plus focused failure oracles.

## Artifact And Verification Status

Artifacts:

- This report:
  `tools/runtime-realization-type-env/evidence/workstreams/2026-05-01-mini-runtime-salvage-to-reference-runtime-report.md`.

Verification run:

- `bunx nx show project runtime-realization-type-env --json` passed and
  confirmed the project root, source root, tags, and targets used by this
  report.
- `bunx nx run runtime-realization-type-env:structural` passed, including the
  `sync` dependency.
- `bunx nx run runtime-realization-type-env:report` passed and printed the
  manifest-pinned runtime spec hash
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `git diff --check` passed after the report file was added to the index for
  whitespace inspection.
- `git status --short --branch` and `gt status --short` showed only this report
  file pending on `codex/runtime-mini-runtime-salvage-report` before commit.

Repo/Graphite state:

- Branch: `codex/runtime-mini-runtime-salvage-report`.
- Expected commit artifact: this report as a docs-only Graphite commit stacked
  on the current runtime reframe branch.
- Final clean status is recorded in the assistant closeout after the commit.

## Next Workstream Packet

Recommended next workstream:

- Design the first full runtime-in-a-folder reference-smoke phase.

Why this is next:

- The salvage inventory shows enough reusable substrate to stop broad modeling.
- The post-Phase-Three reframe says the next proof target should be a working
  reference runtime, not another micro-lab simulation pass.
- A first smoke target will reveal which salvage clusters really compose under
  a target-shaped runtime folder.

Required first reads:

- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../vendor-fidelity.md`
- `../design-guardrails.md`
- `../handoffs/2026-05-01-post-phase-three-live-proof-reframe.md`
- This report.

First commands:

- `git status --short --branch`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- `jq -r '.spec.path, .spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `shasum -a 256 docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

First proof target:

- One target-shaped reference-runtime smoke inside
  `tools/runtime-realization-type-env` that starts from copied/adapted spine
  substrate, runs a real reference app/plugin/service/provider path through
  server request and async handoff candidates, records local observation, stops
  cleanly, and rejects post-stop delegation.

Required stop conditions:

- Stop if implementation needs production `apps/*`, `packages/*`, `services/*`,
  or `plugins/*` mutation before the containment decision is accepted.
- Stop if HyperDX, Inngest durability, RuntimeCatalog persistence, or production
  host lifecycle claims appear without accepted live/product gates.
- Stop if a direct copy candidate fails the manifest-pinned spec re-check.
- Stop if broad modeling begins before the first reference-runtime smoke target
  is named.

Deferred rows to consume first:

- Exact reference-runtime directory/package shape.
- Vendor official-doc review for copied adapters.
- HyperDX product visibility.
- Durable Inngest semantics.
- RuntimeCatalog/control-plane persistence.

## Appendix

### Inputs Used For This Inventory

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../vendor-fidelity.md`
- `../handoffs/2026-05-01-post-phase-three-live-proof-reframe.md`

Coordination inputs:

- `../phased-agent-verification-workflow.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- `src/mini-runtime/**`
- `src/sdk/**`
- `src/spine/**`
- `src/vendor/**`
- `fixtures/positive/**`
- `fixtures/inline-negative/**`
- `fixtures/fail/**`
- `test/**`
- Prior fact-lane agent outputs for runtime core, vendor/native boundaries,
  SDK/spine/fixtures, and test oracles.

Excluded or stale inputs:

- `fixtures/todo/**`: useful for unresolved design inventory, but not a copy
  target for this report.
- Production `apps/*`, `packages/*`, `services/*`, and `plugins/*`: out of
  scope for this report except as later migration substrate to be mined by a
  future phase.

Selected skill lenses:

- `team-design`: non-overlapping lanes, singular DRA synthesis, layered review.
- `information-design`: functional grouping before source-tree appendix.
- `architecture`: spine/boundary/domain ordering and no hybrid soup.
- `target-authority-migration`: current lab code is substrate to copy, mine,
  adapt, or retire; it is not authority by default.
- `testing-design`: distinguish conformance tests, reference-runtime oracles,
  failure oracles, and coverage gaps.

### Source-Tree Lookup

| Source area | Classification summary |
| --- | --- |
| `src/mini-runtime/diagnostics.ts` | `COPY-AS-IS` |
| `src/mini-runtime/catalog.ts` | `COPY-INTERNAL-ONLY` |
| `src/mini-runtime/managed-runtime.ts` | `COPY-INTERNAL-ONLY` |
| `src/mini-runtime/bootgraph.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/boundary-policy.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/deployment-handoff.ts` | `SALVAGE-WITH-ADAPTATION` for serializability/live-handle guard; control-plane topology remains reference-only |
| `src/mini-runtime/process-runtime.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/provider-lowering.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/service-binding-cache.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/runtime-access.ts` | `REFERENCE-ONLY` |
| `src/mini-runtime/harnesses.ts` | `REFERENCE-ONLY` |
| `src/mini-runtime/process-resources.ts` | `RETIRE/SUPERSEDE` |
| `src/mini-runtime/index.ts` | `RETIRE/SUPERSEDE` |
| `src/mini-runtime/adapters/server.ts` | `COPY-INTERNAL-ONLY` as helper, otherwise cluster-bound |
| `src/mini-runtime/adapters/async.ts` | `COPY-INTERNAL-ONLY` as helper, otherwise cluster-bound |
| `src/mini-runtime/adapters/delegation.ts` | `COPY-INTERNAL-ONLY` |
| `src/mini-runtime/adapters/orpc-server.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/adapters/elysia-host.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/adapters/elysia-listener.ts` | `REFERENCE-ONLY` / targeted adaptation |
| `src/mini-runtime/adapters/inngest-async.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/telemetry-export.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/mini-runtime/migration-control-plane-observation.ts` | `REFERENCE-ONLY` / failure-oracle adaptation |
| `src/sdk/effect.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/service.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/app.ts` | `REFERENCE-ONLY` |
| `src/sdk/index.ts` | `COPY-INTERNAL-ONLY` after final module boundaries are known |
| `src/sdk/runtime/resources.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/runtime/providers.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/runtime/profiles.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/runtime/provider-plan-internals.ts` | `COPY-INTERNAL-ONLY` |
| `src/sdk/runtime/schema.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/plugins/server.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/sdk/plugins/async.ts` | Mixed: salvage declarations, supersede `stepEffect` pseudo-execution |
| `src/spine/artifacts.ts` | Core refs/artifacts `COPY-AS-IS`; placeholder/access surfaces require adaptation |
| `src/spine/derive.ts` | `SALVAGE-WITH-ADAPTATION` |
| `src/spine/compiler.ts` | `REFERENCE-ONLY` |
| `src/spine/simulate.ts` | `RETIRE/SUPERSEDE` |
| `src/vendor/boundaries/typebox.ts` | `SALVAGE-WITH-ADAPTATION` as `RuntimeSchema` adapter only |
| `src/vendor/boundaries/orpc.ts` | `REFERENCE-ONLY` |
| `src/vendor/boundaries/inngest.ts` | `REFERENCE-ONLY` |
| `src/vendor/effect/runtime.ts` | `REFERENCE-ONLY` / vendor conformance support |
