# Runtime Telemetry + HyperDX Observation

Status: closed and submitted as PR #270.
Branch: `codex/runtime-hyperdx-observation`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/270
Commit: submitted branch tip after PR metadata amend.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Use the available local Docker HyperDX stack as a contained observation cycle
  for runtime-emitted records after boundary policy, harness, provider, and
  semantic-comment workstreams made the record shape explicit.
- Prove only what the lab can honestly observe: redacted runtime records can be
  projected into a telemetry/export shape and, where the local stack is
  reachable, emitted to the local OTLP/HyperDX support container without
  claiming product observability policy, catalog persistence, deployment
  placement, or durable async semantics.

Containment boundary:

- All repo edits stay under `tools/runtime-realization-type-env/**`.
- HyperDX/Docker usage is local test infrastructure only. It is not production
  provisioning, product observability policy, or an accepted deployment shape.
- Any exporter added here must consume already-redacted mini-runtime records and
  must not introduce live handles, raw secrets, descriptor bodies, provider
  values, or runtime access objects into telemetry payloads.

Non-goals:

- Do not choose final product observability policy or dashboards.
- Do not persist a runtime catalog or implement migration/control-plane storage.
- Do not wire production OpenTelemetry bootstrap, service package exporters, or
  host runtime instrumentation.
- Do not prove real Elysia/oRPC/Inngest host behavior or durable async
  telemetry.
- Do not treat quarantined telemetry docs as authority if they conflict with
  the pinned runtime spec or current proof manifest.

## Opening Packet

Opening input:

- User control input: Docker is up with HyperDX, the usual telemetry store/query
  engine, and should be added as a dedicated research-program workstream.
- Prior workstream: Semantic Runtime Documentation Harvest, PR #268.
- Program sequence: this workstream follows Boundary Policy Matrix and Semantic
  Runtime Documentation Harvest.

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

- `2026-04-30-boundary-policy-matrix.md`
- `2026-04-30-semantic-runtime-documentation-harvest.md`
- `2026-04-30-first-server-async-harness-mounts.md`
- `2026-04-30-provider-diagnostics-runtime-profile-config-redaction.md`
- `../../src/mini-runtime/boundary-policy.ts`
- `../../src/mini-runtime/catalog.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/mini-runtime/harnesses.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/mini-runtime/provider-provisioning.test.ts`

Local infrastructure observed at opening:

- `docker ps` showed `rawr-hq-hyperdx`
  (`docker.hyperdx.io/hyperdx/hyperdx-local`) exposing `4318` and `8080`.

Excluded or stale inputs:

- Quarantined telemetry docs are mining material only, not runtime authority.
- HyperDX container availability is not telemetry-proof by itself.
- OTLP emission is not production observability policy.
- In-memory mini-runtime records are not persisted runtime catalog authority.

Control inputs:

- Escalate if the work must choose production OpenTelemetry bootstrap,
  dashboard/product observability policy, catalog persistence, deployment
  placement, durable async telemetry, native host route/worker instrumentation,
  package topology, or migration sequence.
- Stop on spec hash drift, failed focused/composed gate, parent review
  invalidation, Graphite/PR blocker, unavailable local HyperDX container if a
  live emission claim depends on it, or discovered redaction leak.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `testing-design`: redaction/export/queryability oracles and anti-theater
  checks.
- `architecture`: telemetry ownership, catalog/persistence separation, and
  production negative space.
- `typescript`: typed telemetry payload shape and no-live-handle boundaries.
- `information-design`: evidence wording that separates local HyperDX
  observation from production observability claims.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-semantic-runtime-documentation-harvest.md`

Prior final output accepted or rejected:

- Accepted: semantic comments now clarify runtime record boundaries, redaction
  scope, policy record-only behavior, and non-HyperDX/non-persistence negative
  space.
- Rejected as proof: comments do not prove telemetry export/queryability.

Deferred items consumed:

- `audit.telemetry.hyperdx-observation`
- boundary-policy residuals affecting telemetry/export wording;
- mini-runtime record redaction and boundary policy records.

Deferred items explicitly left fenced:

- product observability policy;
- runtime catalog persistence;
- deployment placement;
- production OpenTelemetry host bootstrap;
- durable async telemetry semantics;
- native Elysia/oRPC/Inngest instrumentation;
- migration/control-plane implementation.

Repair demands consumed:

- None at opening.

Next packet changes:

- The next workstream after this should be Migration/Control-Plane Observation
  unless HyperDX proves that a production telemetry/correlation decision packet
  must happen first.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A lab-local telemetry projection/export path for already-redacted runtime
  records, with no live handles or raw secrets.
- Focused tests proving runtime records project into stable telemetry payloads,
  preserve useful boundary/provider/harness identity, and keep redaction intact.
- A local HyperDX/OTLP smoke path if the container is reachable; if not
  reachable, record the failed live lane as non-proof and keep the projection
  proof separate.
- Manifest/focus/diagnostic/report updates that promote only earned contained
  observation proof.

Optional outputs:

- A tiny local exporter adapter using `fetch` against OTLP HTTP if it can remain
  dependency-light and contained.
- A query/smoke helper if HyperDX exposes a stable local query endpoint without
  requiring product policy.

Target proof strength:

- At most contained `simulation-proof` for telemetry projection/export smoke.
- Live HyperDX availability may support local observation evidence, but it does
  not become production telemetry readiness.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused target(s):
  - `bun test tools/runtime-realization-type-env/test/mini-runtime`
  - any new telemetry-focused test file
- `docker ps`
- optional local live smoke against `http://localhost:4318` or `http://localhost:8080`
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- A production telemetry API, dashboard policy, or package topology must be
  chosen.
- Export requires unredacted provider config, provider values, descriptor
  bodies, or live runtime handles.
- HyperDX container behavior differs from the local observation assumptions and
  cannot be fenced as an environment limitation.
- Queryability requires relying on stale quarantined docs as authority.

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
  `codex/runtime-semantic-jsdoc-harvest`, then clean on new child
  `codex/runtime-hyperdx-observation`.
- `gt status --short`: clean before branch creation.
- `docker ps`: local `rawr-hq-hyperdx` container exposed `4318` and `8080`.

Investigation lanes:

- Live HyperDX smoke reviewer: confirmed local `rawr-hq-hyperdx` health, UI
  reachability, OTLP root method shape, and `POST /v1/traces` acceptance. The
  lane explicitly rejected dashboard/queryability as proof because no stable
  query path was exercised.
- Implementation seam reviewer: recommended a pure helper under
  `src/mini-runtime/telemetry-export.ts`, index export, and focused tests only.
  The lane rejected production dirs, package wiring, and changes to process or
  provider execution unless a defect appeared.
- Evidence/redaction reviewer: recommended promotion only to narrowed
  `simulation-proof` and a residual `xfail` for product observability, query
  policy, persistence, host bootstrap, and durable async history.

Phase teams:

- Opening: host/DRA.
- Phase agents: live HyperDX smoke reviewer, implementation seam reviewer,
  evidence/redaction reviewer, and trailing semantic JSDoc reviewer.
- Host/DRA verified agent outputs against implementation, focused tests,
  manifest/diagnostic wording, and the live smoke result before promotion.

Design lock:

- Add a lab-only telemetry helper that projects already-redacted
  mini-runtime records into a minimal OTLP trace payload.
- Keep the public/runtime execution path side-effect-free. Network export is an
  explicit opt-in helper with injected `fetch` support.
- Preserve useful identity fields (`telemetryRunId`, source, sequence,
  boundary/provider/catalog identity) while reusing existing catalog redaction
  for attributes, response bodies, and thrown export errors.
- Treat deterministic trace/span identifiers as reproducibility aids for the
  contained lab, not trace authority or durable async run history.
- Do not choose product dashboard/query policy, retention, production
  OpenTelemetry bootstrap, catalog persistence, or native host telemetry.

Implementation summary:

- Added `src/mini-runtime/telemetry-export.ts`.
  - `projectRuntimeEventsToTelemetryRecords(...)` projects process/provider
    event streams after the mini-runtime redaction boundary.
  - `projectRuntimeCatalogToTelemetryRecords(...)` projects in-memory
    bootgraph/catalog facts without copying started module values or release
    handles.
  - `buildRuntimeTelemetryOtlpTracePayload(...)` builds stable OTLP HTTP trace
    JSON from redacted records.
  - `exportRuntimeTelemetryOtlpTraces(...)` posts prepared payloads to an
    explicit OTLP endpoint and records only endpoint/status/body metadata.
- Exported the helper from `src/mini-runtime/index.ts`.
- Added `test/mini-runtime/telemetry-export.test.ts` for process runtime
  events, provider provisioning traces, bootgraph catalog records, and injected
  fetch export serialization.
- Updated manifest, focus log, diagnostic, and research program ledger for the
  narrowed proof claim and residual negative space.

Semantic JSDoc/comment trailing pass:

- Completed by a trailing semantic JSDoc reviewer.
- Added/verified comments that clarify:
  - lab-only/redacted projection boundary;
  - minimal OTLP subset, not a general OTLP model;
  - deterministic identifiers are review aids, not durable authority;
  - export is opt-in and not hidden runtime execution behavior.

Verification:

- Focused telemetry test passed:
  `bun test tools/runtime-realization-type-env/test/mini-runtime/telemetry-export.test.ts`.
- Typecheck passed after narrowing the redacted object cast:
  `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Live local OTLP smoke accepted a generated payload through
  `exportRuntimeTelemetryOtlpTraces(...)`:
  - run id: `hyperdx-live-smoke-1777537068711`
  - endpoint: `http://127.0.0.1:4318/v1/traces`
  - HTTP status: `200`
  - response body: `{"partialSuccess":{}}`
- Full closeout gate replay passed:
  - `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`
  - `bunx nx run runtime-realization-type-env:report --skip-nx-cache`
  - `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
  - `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`
  - `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`
  - `bunx nx run runtime-realization-type-env:gate --skip-nx-cache`
  - `bun run runtime-realization:type-env`

Review loops:

- Leaf review covered containment, mechanical placement, type/negative surface,
  semantic comments, vendor/HyperDX fidelity, mini-runtime behavior, and
  manifest/report consistency.
- Parent review covered architecture containment, migration derivability,
  DX/API/TypeScript non-promotion, workstream lifecycle/process, and
  adversarial evidence honesty.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Local HyperDX is available as infrastructure, not authority. | `docker ps` shows `rawr-hq-hyperdx` exposing `4318` and `8080`. | Use it for contained smoke only; keep production observability fenced. | High |
| OTLP ingest acceptance is enough for contained export proof, but not queryability. | `POST http://127.0.0.1:4318/v1/traces` returned `200` with `{"partialSuccess":{}}`; no stable query endpoint was exercised. | Promote export/ingest smoke only; keep dashboard/query policy residual. | High |
| Existing mini-runtime records are a suitable export source only after redaction. | Focused tests project process events, provider traces, and catalog records while rejecting sentinel secrets and live handles. | Build the helper around already-redacted records; do not export raw provider values or runtime access objects. | High |
| The canonical spec authority refresh was a control input before this proof could close. | PR #269 replaced the stale repo-pinned canonical spec with the external April 29 snapshot and updated the manifest hash. | Keep HyperDX proof based on the refreshed repo-pinned spec hash. | High |

## Report

Proof promotions:

- `audit.telemetry.hyperdx-observation` promoted to `simulation-proof`.
- Scope of the promotion:
  - already-redacted process/provider/catalog records can be projected into
    stable OTLP trace payloads;
  - useful runtime identity survives the projection;
  - live handles, raw secrets, descriptor bodies, provider values, and runtime
    access objects do not appear in the telemetry payload;
  - explicit local OTLP export can be accepted by the available HyperDX stack.

Proof non-promotions:

- Local Docker availability is not proof.
- OTLP ingest acceptance is not dashboard/queryability proof.
- Deterministic trace/span ids are not durable async run history.
- The helper is not production OpenTelemetry bootstrap or product
  observability policy.
- In-memory catalog projection is not persisted `RuntimeCatalog` storage.

Diagnostic changes:

- Observation spine node now says contained OTLP export exists while
  persistence/query policy remains open.
- Diagnostics/telemetry/catalog row now includes projection of
  already-redacted records, injected-fetch export serialization, and local
  HyperDX OTLP ingest smoke.
- Open gaps now name persisted catalog storage, production correlation/query
  policy, product observability policy, production OpenTelemetry bootstrap,
  production diagnostic classes, native host telemetry/error mapping, durable
  async run history, and arbitrary free-form provider diagnostic strings.

Spec feedback:

- No spec change proposed by this workstream.
- Runtime spec sections 22, 23.3, and 29 were sufficient for contained
  telemetry projection/export, with sections 23.5 and 29 keeping persistence,
  platform placement, and production observability fenced.

Test-theater removals or downgrades:

- Downgraded "HyperDX is up" from implied proof to infrastructure context.
- Downgraded "OTLP accepted" from queryable/product telemetry to contained
  export smoke.
- Did not add dashboard or query tests because that would require product
  observability semantics this workstream is not allowed to choose.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product observability policy | `xfail` | Local HyperDX smoke cannot choose dashboards, retention, correlation naming, alerting, or product-facing semantics. | Canonical spec telemetry/policy sections and future decision packet. | Architecture accepts observability policy or migration control-plane needs it. | Production host work needs user-facing telemetry semantics. | Migration/Control-Plane Observation or decision packet | spec/migration |
| Runtime catalog persistence | `xfail` | Exporting or projecting records is not catalog storage. | Runtime catalog/persistence residuals in manifest/diagnostic. | A persistence/control-plane workstream chooses storage, ownership, and rehydration semantics. | Migration work treats in-memory records as durable authority. | Migration/Control-Plane Observation | migration |
| Durable async telemetry | `xfail` | Mini-runtime async records are not Inngest durable run history. | Async residual manifest entries and canonical async sections. | Native async host semantics are implemented or explicitly decided. | Telemetry work needs durable retries/status/idempotency correlation. | Durable async or migration/control-plane workstream | spec |

## Review Result

Leaf loops:

- Containment: passed. All edits remain under
  `tools/runtime-realization-type-env/**`; no production package or workspace
  wiring was added.
- Mechanical: passed after review. The helper is exported from the mini-runtime
  index and covered by focused tests; no root workspace package changes were
  introduced.
- Type/negative: passed.
- Semantic JSDoc/comments: passed after trailing reviewer added concise
  boundary comments.
- Vendor: passed for the narrowed claim. HyperDX/OTLP accepted the trace POST;
  queryability and product policy remain fenced.
- Mini-runtime: passed. Focused telemetry export tests passed, and the full
  target passed with 50 tests across 3 files.
- Manifest/report: manifest, focus log, diagnostic, research program ledger,
  and this report agree on the narrowed proof claim and residual xfail.

Parent loops:

- Architecture: passed. The helper is a contained lab projection/export seam,
  not production telemetry architecture.
- Migration derivability: passed. Future migration can mine the projector and
  comments, but must still decide persistence, query policy, host bootstrap, and
  control-plane placement.
- DX/API/TypeScript: passed. No public API change is introduced; helper types
  are lab-internal and narrow.
- Workstream lifecycle/process: passed after recording agent lanes, deferred
  items, review loops, and next workstream packet.
- Adversarial evidence honesty: passed. The report explicitly rejects Docker
  uptime, OTLP acceptance, and comments as production readiness.

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

- `src/mini-runtime/telemetry-export.ts`
- `src/mini-runtime/index.ts`
- `test/mini-runtime/telemetry-export.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/runtime-realization-research-program.md`
- `evidence/workstreams/2026-04-30-runtime-telemetry-hyperdx-observation.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/telemetry-export.test.ts`: passed, 4 tests and 28 expects.
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`: passed.
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`: passed, 50 tests and 244 expects.
- `bunx nx run runtime-realization-type-env:gate --skip-nx-cache`: passed.
- `bun run runtime-realization:type-env`: passed.
- Local OTLP/HyperDX smoke: passed with HTTP 200 and `{"partialSuccess":{}}`.

Repo/Graphite state:

- Submitted through Graphite as PR #270 on
  `codex/runtime-hyperdx-observation`.
- GitHub PR view after first submit: open, not draft, merge state `UNSTABLE`
  with `Graphite / mergeability_check` in progress.
- Final metadata amend and stack resubmit update this report to point at the
  real PR.

## Next Workstream Packet

Recommended next workstream:

- Migration/Control-Plane Observation.

Why this is next:

- After telemetry/HyperDX observation, the remaining proof gap moves from
  contained lab emission to how migration/control-plane surfaces consume,
  persist, or route runtime evidence without confusing lab records for
  production authority.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `2026-04-30-boundary-policy-matrix.md`
- `2026-04-30-semantic-runtime-documentation-harvest.md`
- any telemetry helper/test added by this workstream

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- product observability policy residuals
- runtime catalog persistence residuals
- migration/control-plane placement residuals
