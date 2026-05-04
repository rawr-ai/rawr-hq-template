# Phase Three Started Process Assembly Stop Finalization Passage

Status: `closed; contained simulation-proof accepted`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is the closed child-2 workstream for Phase Three. It is not
architecture authority, final public API authority, production migration
authorization, or product observability proof.

## Current State

| Field | Value |
| --- | --- |
| Program state | Phase Three open. |
| Child state | Closed after layered review and gate repair. |
| Proof target | contained `simulation-proof`, accepted. |
| Active claim | A selected toy-contained app/runtime story can be started, invoked, observed, stopped, finalized, and post-stop rejected inside the mini-runtime lab. |
| Blocked claims | Production migration readiness, production host lifecycle, durable Inngest semantics, HyperDX product visibility, RuntimeCatalog persistence, native host telemetry/error mapping, final public API/DX law, and final Nx/generator ratchet. |

## Frame

Objective:

- Execute the first accepted Phase Three proof slice from child 1.
- Prove more than a repackaged Phase Two integrated rehearsal by adding a
  distinct started/stopped passage oracle.
- Keep the earned claim lab-contained and falsifiable.

Claim under test:

- A toy-contained runtime passage can derive and compile its runtime spine,
  provision providers through the mini bootgraph, assemble one
  `ProcessExecutionRuntime`, mount contained server and async harnesses, cross
  real oRPC Fetch and Inngest Bun ingress paths into that runtime, project safe
  observation/control-plane evidence, stop mounted harnesses, finalize providers
  and runtime, and reject post-stop server/async invocation before runtime
  delegation.

Containment boundary:

- Source/test edits stay inside `tools/runtime-realization-type-env/**`.
- Production `apps/*`, `packages/*`, `services/*`, `resources/*`, `plugins/*`,
  root exports, production deployment topology, and final Nx/generator ratchets
  remain out of scope.

## Opening Packet

Opening input:

- Phase Three child 1 closed as a live-runtime-passage scope and claim ledger.
- DRA accepted this child as the first executable proof slice.
- User correction requires vendor work to use relevant skills, broad-to-deep
  official-docs research, local integration-doc mining, and durable labeled
  reports when findings should survive handoff.

Authority inputs:

- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- architecture context:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- active DRA workflow reference:
  `../phases/phase-three/dra-phase-three-program-workstream-workflow-draft.md`
  (filename still contains `draft`; contents are the active operating reference)
- `2026-05-01-phase-three-program-workstream.md`
- `2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../effect-integration-map.md`
- `../vendor-fidelity.md`
- `../handoffs/2026-05-01-post-phase-two-runtime-reframe.md`

Local telemetry/integration docs to mine:

- `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`
- `docs/system/quarantine/TELEMETRY.md`
- `docs/system/quarantine/telemetry/orpc.md`
- `docs/system/quarantine/telemetry/hyperdx.md`
- `docs/system/quarantine/telemetry/hq-runtime.md`

Selected skill lenses:

- `team-design`: review topology, non-overlapping lanes, and accountability.
- `testing-design`: falsifier-first proof oracle and stop rules.
- `architecture`: target/current/transition separation and decision packet
  triggers.
- `target-authority-migration`: proof boundaries and clean deferrals.
- `orpc`: oRPC Fetch/RPCHandler vendor boundary.
- `inngest`: Inngest Bun serve/function/step boundary.
- No dedicated local Effect, OpenTelemetry, or HyperDX skill was found during
  opening skill introspection.

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: oRPC Fetch, Inngest Bun, Effect runtime/finalization, OpenTelemetry/OTLP-shaped telemetry, and HyperDX-adjacent ingest shape. |
| Required skill introspection | `orpc`, `inngest`; Effect/OTEL/HyperDX skills recorded as `none found` unless later discovery finds them. |
| Official-docs lane | Required. Dedicated docs lane must start from docs hubs/navigation/sitemaps before narrow pages. |
| Local integration mining | Required. Mine the telemetry docs above as evidence, not authority. |
| Golden integration exemplar | `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md` added during execution as reference-only service-package/native-fit pattern input. This child does not use it to promote runtime-boundary or public-DX claims. |
| Integration Exemplar Reconciliation | Authority label: `reference-only`; principle extracted: native vendor feel at author-facing surfaces with RAWR-owned lifecycle/runtime seams; runtime-spec conflict check: manifest-pinned runtime spec wins; stale detail rejected: old `.handler(...)` / `.effect(...)` terminal split; vendor evidence lane: official docs plus installed mini-runtime gate; proof ceiling: contained `simulation-proof` for this child. |
| Durable report disposition | Required: create or update a reference-labeled vendor/integration research artifact if new findings should survive later children; otherwise record explicit no-op reason at closeout. |

## Output Contract

Required outputs:

- A focused mini-runtime proof that adds a started/stopped passage oracle.
- Explicit post-stop server and async rejection checks before runtime delegation.
- Observation evidence for start, invocation, stop, finalization, and post-stop
  rejection.
- Manifest/focus/diagnostic/spine/vendor map updates only to earned strength.
- Vendor/integration research disposition.
- Review loops with non-overlapping axes, including overall-program-health.
- Closeout with `Pattern Decisions`, residual routing owners, current focus
  after closeout, stale-state sweep, and next packet.

Proof ceiling:

- Maximum earned claim for this child is contained `simulation-proof`.
- Vendor docs and installed package behavior may support `vendor-proof` only.
- No product HyperDX, durable Inngest, Elysia production host, RuntimeCatalog
  persistence, or production migration claim is possible here.

Focused gates:

- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:middle-spine` if derivation/compiler
  artifacts are touched
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate` before proof promotion
- `git diff --check`
- final `git status --short --branch`
- final `gt status --short`

## Plan

1. Complete discovery lanes:
   - official vendor docs;
   - local telemetry/integration docs;
   - source/test surface inspection.
2. Decide implementation shape from evidence.
3. Write the focused proof slice inside the mini-runtime lab.
4. Run focused gates and repair failures.
5. Update manifest/focus/diagnostic/maps only if the proof is earned.
6. Run layered review:
   - mechanical/repo/Nx/Graphite;
   - architecture/proof honesty;
   - vendor fidelity;
   - overall program health;
   - information design/coordination if handoff or residuals grow.
7. Close with pattern decisions, residual routing owners, current focus after
   closeout, stale-state sweep, and next packet.

Stop conditions:

- Stop if the proof requires production mutation.
- Stop if the proof cannot distinguish new started/stopped passage evidence
  from Phase Two's integrated rehearsal.
- Stop if post-stop rejection reaches runtime delegation.
- Stop if vendor docs or local telemetry docs are being promoted into runtime
  authority without DRA disposition.
- Stop if a green claim would sound production-ready.

## Discovery Log

Opening verification:

- Branch verified: `codex/runtime-phase-two-closeout-handoff`.
- Nx project metadata resolved for `runtime-realization-type-env`.
- Manifest-pinned runtime spec hash matched
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- Worktree contains DRA-owned Phase Three evidence edits from opening and child
  1 repair; no unrelated/user-owned changes were identified.

Official docs checked by DRA during opening:

- oRPC docs hub/navigation and `RPCHandler`.
- oRPC OpenTelemetry integration.
- Inngest docs hub/navigation, durable execution, serving, and `step.run`.
- Effect docs navigation, resource management, scope, and runtime pages.
- OpenTelemetry JavaScript docs navigation and OTLP exporter configuration.
- HyperDX docs navigation and OpenTelemetry ingest page.

Agent lanes:

| Lane | Status | Output |
| --- | --- | --- |
| Official vendor docs | complete | Vendor docs support oRPC Fetch/RPCHandler, Inngest Bun serve/function/step, Effect runtime/finalization, OTLP exporter shape, and HyperDX OTLP destination as vendor-shape evidence only. Inngest evidence is pinned to installed v3 behavior for this lab. |
| Local telemetry mining | complete | Existing parent-app telemetry is host/runtime-owned OTel and active-span enrichment evidence. Mini-runtime telemetry is separate: redacted in-memory records, deterministic OTLP-shaped payloads, injected fetch export, run-id correlation, and candidate-only packets. |
| Source/test surface | complete | Existing mini-runtime source supports a focused Phase Three test: wrap `ProcessExecutionRuntime.invoke`, mount current oRPC/Inngest boundaries, stop harnesses, finalize providers/runtime, then assert post-stop boundaries reject before runtime delegation. |

User-added integration input during execution:

- Copied
  `/Users/mateicanavra/Downloads/RAWR_Service_Package_Effect_Spec.md` into
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
  with an authority ceiling and golden integration pattern header.
- DRA disposition: reference-only input for service-package/internal vendor
  integration design and author-DX separation. It does not override the
  manifest-pinned runtime spec or this child's proof ceiling.

Implementation decision:

- Add a focused Phase Three mini-runtime test rather than broad helper
  extraction or Phase Two rehearsal expansion.
- Keep the assembly local to the proof test for now. A reusable started-process
  assembly helper can be extracted later only if another child needs the shape
  as runtime lab infrastructure.
- Use an instrumented `ProcessExecutionRuntime` wrapper as the oracle for
  "post-stop did not delegate to runtime."
- Assert explicit runtime disposal before post-stop boundary attempts and
  project a `runtime.dispose.finished` observation record.
- Treat Inngest post-stop rejection in vendor-native terms. Installed Inngest
  returns a `StepError` operation inside a `206` step response for the stopped
  harness error; the proof checks that body plus stopped harness records plus
  unchanged runtime invocation count instead of assuming HTTP status alone.
  The mini-runtime Inngest boundary now classifies that StepError response as a
  failure observation even though the HTTP status is `206`.

Implementation output:

- Added
  `tools/runtime-realization-type-env/test/mini-runtime/phase-three-started-process-assembly-stop-finalization-passage.test.ts`.
- Added
  `tools/runtime-realization-type-env/evidence/workstreams/2026-05-01-phase-three-started-passage-vendor-integration-reference.md`.
- Copied the service-package Effect/oRPC integration snapshot into
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
  with a reference-only authority header and reconciliation guard.
- Updated `proof-manifest.json`, `runtime-spine-verification-diagnostic.md`,
  `spine-audit-map.md`, `effect-integration-map.md`, and
  `vendor-fidelity.md` to record the earned Phase Three proof and the new
  residuals without promoting production readiness.

Verification:

| Gate | Result |
| --- | --- |
| Focused test: `bun test tools/runtime-realization-type-env/test/mini-runtime/phase-three-started-process-assembly-stop-finalization-passage.test.ts` | Pass after review repair: 1 test, 57 assertions. |
| `bunx nx run runtime-realization-type-env:mini-runtime` | Pass after review repair inside full gate: 63 tests, 498 assertions. |
| `bunx nx run runtime-realization-type-env:typecheck` | Pass. |
| `bunx nx run runtime-realization-type-env:structural` | Pass after manifest gate-name repair. |
| `bunx nx run runtime-realization-type-env:report` | Pass; reports `simulation-proof: 24`, `todo: 1`, `out-of-scope: 7`. |
| `bunx nx run runtime-realization-type-env:gate` | Pass after review repairs. |
| `git diff --check` | Pass before final stale-state sweep; rerun required before commit. |

Proof result:

- Earned contained `simulation-proof` for the started process assembly plus
  stop/finalization passage.
- The proof crosses the existing mini-runtime lab path only: derivation,
  compilation, provider provisioning, one process runtime, contained oRPC Fetch,
  contained Inngest Bun serve/function/step, safe observation/control-plane
  projection, harness stop, provider/runtime finalization, and post-stop
  rejection before runtime delegation.
- Provider resources are provisioned and safely projected through observation;
  this child does not claim the server/async fixture descriptors materially
  consume shared provider resources during invocation.
- It does not prove production host lifecycle, production migration readiness,
  durable Inngest semantics, product HyperDX visibility, RuntimeCatalog
  persistence, native host telemetry/error mapping, public API/DX law, or final
  Nx/generator ratchet.

Deferred inventory:

| Residual | Status | Why deferred | Lane / bucket | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Routing owner / DRA decision home |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Native host failure envelope and error/status taxonomy across oRPC, Inngest, and future Elysia host paths. | Open residual | Child 2 proved one contained rejection oracle and patched StepError classification, but not a complete native failure/status law. | Phase Three live-passage semantics | Runtime spec plus vendor docs; `vendor-fidelity.md` as evidence map. | A child explicitly opens native boundary observation/failure semantics. | A proof claim depends on interpreting protocol status, native error body, host log/telemetry status, or public error payload. | Native boundary observation and failure semantics ledger. | Phase Three DRA. |
| Effect x oRPC x OTEL telemetry integration beyond current OTLP-shaped projection. | Open residual | This child only projects already-redacted records into deterministic OTLP-shaped payloads and does not open runtime-owned OTel bootstrap. | Phase Three telemetry / externality-design bridge | Runtime spec plus telemetry docs and official OTel/oRPC docs. | A telemetry/observability child opens runtime-owned OTel bootstrap/export semantics inside containment. | The program tries to claim more than redacted in-memory records and injected-fetch OTLP shape. | Telemetry/HyperDX live observation child. | Phase Three DRA. |
| Product HyperDX visibility, query, retention, dashboard, and alerting semantics. | Fenced residual | Product visibility needs real product query/dashboard/retention oracle, outside this child. | Externality/design | Future observability/product decision packet. | Local/product HyperDX proof is explicitly opened with real ingest/query/dashboard oracle. | Migration planning needs product-visible telemetry confidence. | Externality/design phase or a later Phase Three observability slice if containment can safely prove it. | Phase Three DRA, then observability owner. |
| Durable Inngest scheduling, retry, replay, idempotency, and run history. | Fenced residual | Child 2 crosses serve/function/step only; durable vendor semantics are not part of this contained gate. | Externality/design unless later containment proof is accepted | Future async durability workstream and official Inngest docs. | A child explicitly opens durable async semantics with a live or sufficiently realistic vendor oracle. | Runtime migration depends on durable async claims, not just boundary passage. | Externality/design phase unless Phase Three evidence shows safe contained proof. | Phase Three DRA. |
| Service-package/internal vendor integration author DX. | Open residual | The service-package snapshot is a golden exemplar only; this child does not decide public/internal authoring shape. | Vendor integration design | Runtime spec plus service-package integration exemplar for reference-only principles. | A child opens public/internal authoring shape or vendor-native grammar. | A future design would otherwise blur native author DX with runtime operational ownership. | Vendor integration design child or later service-package spec. | Phase Three DRA. |

Pattern Decisions:

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |
| Vendor protocols may encode failure in protocol-native envelopes rather than HTTP status alone. | The Inngest post-stop assertion checks `StepError`, stopped harness records, unchanged runtime invocation count, and failure-classified boundary record. | Future vendor-boundary children must define failure oracles in vendor-native terms before implementation. | `Vendor / Integration Inheritance`, vendor fidelity review, and durable vendor/integration reports. | Accept. |
| Integration snapshots can preserve valuable native-fit principles while fossilizing stale details. | Service-package snapshot copied with authority ceiling; stale `.handler(...)` / `.effect(...)` terminal split rejected. | Add `Integration Exemplar Reconciliation` whenever the golden exemplar is used. | DRA workflow, program workstream, child opening packets. | Accept. |
| Heavy vendor/local telemetry findings become load-bearing across later children. | Created a reference-only vendor/integration report for child 2 and later slices. | Require durable research report disposition when vendor findings should survive handoff. | `Vendor / Integration Inheritance` and child closeout. | Already accepted; reinforced. |
| Proof promotion can outrun durable closeout text. | Review/gate statuses were repaired before child closeout. | Treat proof-promotion timing mismatches as stale-state drift and include them in mechanical review. | Child closeout stale-state sweep and mechanical review. | Accept. |

Recommended next workstream:

- `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`

Recommended next proof question:

- What native boundary failure, telemetry, and observation semantics must Phase
  Three understand before it can honestly deepen oRPC, Inngest, Elysia,
  OpenTelemetry, and HyperDX claims?

Why this is the next domino:

- Child 2 proved a started/stopped passage, but it exposed the next live-passage
  ambiguity: protocol-native failure shape and observation meaning. Inngest
  returned a stopped failure as `StepError` in a `206` response. The program
  should not deepen telemetry/HyperDX, Elysia, or durable async claims until the
  boundary between vendor-native envelopes, RAWR runtime failure records,
  telemetry/status projection, and public/native host error mapping is mapped.

Next Workstream Packet:

- Start from runtime authority, this child report, the vendor integration
  reference, `vendor-fidelity.md`, `TELEMETRY_DESIGN.md`,
  `docs/system/quarantine/TELEMETRY.md`, and related telemetry docs.
- Run dedicated official-docs lanes for every vendor touched.
- Include `Integration Exemplar Reconciliation` if author-facing vendor grammar
  or service-package shape is discussed.
- Decide whether the next output should be an executable telemetry/failure proof
  slice, a decision packet, or a clean deferral to the later externality/design
  phase.
- Do not implement public API/DX, product HyperDX, durable async, or Elysia
  production hosting unless the ledger proves those are the right contained
  next move.

Current focus after closeout:

- Child 2 is closed as contained `simulation-proof`.
- DRA accepts the recommended next child:
  `2026-05-01-phase-three-native-boundary-observation-and-failure-semantics-ledger.md`.
- No production migration, product HyperDX, durable async, Elysia production
  host, or Nx/generator ratchet opens from this child.

## Review Result

Layered review complete:

| Axis | Reviewer | Verdict | DRA disposition |
| --- | --- | --- | --- |
| Architecture / proof honesty | Boyle | No material proof-honesty findings; accept as contained `simulation-proof`. | Accept. Proof stays yellow/contained and not production readiness. |
| Vendor fidelity / integration exemplar | Huygens | Two P2 findings: Inngest `StepError`/`206` was being observation-classified as success; service snapshot header still blessed stale terminal rules. | Accept and repair. Boundary now detects `StepError` and marks response record `failure`; snapshot header now marks old terminal split provenance-only. |
| Mechanical / repo / gates | Meitner | Blocking findings: untracked artifacts before submission, proof status ahead of recorded verification, stale parent packet, stale Effect map TODO. | Accept and repair. Artifacts are DRA-owned and will be committed before next child; verification and stale-state records repaired; Effect map status updated. |
| Overall program health | Rawls | Direction is correct; hold closeout until review/gate state reconciles. | Accept and repair. Next child accepted as semantics ledger, not implementation drift. |
| Information design / coordination | Pascal | Blocking stale program packet, missing residual routing fields, split pattern disposition, current-focus ambiguity. | Accept and repair. Deferred inventory expanded; reference disposition aligned; current focus after closeout clarified. |
| Implementation oracle / regression surface | Schrodinger | Conditional accept; runtime disposal needed observable assertion, and provider-resource consumption should not be overclaimed. | Accept and repair. Test asserts disposal, projects runtime disposal record, and report narrows provider-resource consumption claim. |

## Final Output

Closed output:

- New focused test:
  `tools/runtime-realization-type-env/test/mini-runtime/phase-three-started-process-assembly-stop-finalization-passage.test.ts`.
- New reference report:
  `tools/runtime-realization-type-env/evidence/workstreams/2026-05-01-phase-three-started-passage-vendor-integration-reference.md`.
- New service-package/native-fit exemplar:
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`.
- Updated manifest/diagnostic/spine/effect/vendor/focus/program/workflow docs.

Proof promotion:

- `audit.p3.started-process-assembly-stop-finalization-passage` promoted to
  contained `simulation-proof`.
- No production-readiness, durable async, product observability, native host
  mapping, RuntimeCatalog persistence, public API/DX, or Nx/generator claim was
  promoted.

Repo/Graphite state:

- Child 2 DRA-owned artifacts must be included in the Phase Three evidence
  commit before the next child opens.
