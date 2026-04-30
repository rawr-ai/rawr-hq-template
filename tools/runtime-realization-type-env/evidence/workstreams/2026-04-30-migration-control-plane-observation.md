# Migration/Control-Plane Observation

Status: `closed and submitted`.
Branch: `codex/runtime-migration-control-plane-observation`.
PR: #271, https://github.com/rawr-ai/rawr-hq-template/pull/271
Commit: branch tip after PR metadata amend.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove a contained migration/control-plane observation handoff after telemetry
  export exists: deployment handoff identity, redacted runtime catalog records,
  and telemetry export references can be correlated into a portable observation
  packet for migration/control-plane readers.
- Keep the packet as a lab-local handoff artifact. It must not choose runtime
  catalog storage backend, indexing, retention, control-plane placement policy,
  dashboard/query semantics, production OpenTelemetry bootstrap, durable async
  history, or deployment orchestration.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Any new helper must consume already-safe lab artifacts:
  `DeploymentRuntimeHandoff`, `InMemoryRuntimeCatalog`, and redacted telemetry
  records/export results.
- The packet may record placement candidates, correlation ids, and artifact
  references as observation facts only. It may not make placement decisions or
  persist anything.
- No live handles, descriptor tables, executable closures, runtime access
  objects, raw provider values, raw keyed secrets, OTLP payload bodies, or native host
  handles may enter the packet.

Non-goals:

- Do not implement production catalog persistence, storage schemas, indexes, or
  retention.
- Do not choose control-plane service/package topology or deployment placement.
- Do not wire a real deployment control plane, server host, worker host, or
  HyperDX query/dashboard surface.
- Do not promote local OTLP ingest, comments, or in-memory records to production
  observability readiness.
- Do not solve durable async run history, native Elysia/oRPC/Inngest host
  telemetry, production config precedence, or platform secret-store semantics.

## Opening Packet

Opening input:

- Program sequence item 11: Migration/Control-Plane Observation.
- Prior workstream: Runtime Telemetry + HyperDX Observation, PR #270.
- HyperDX proof moved the observation frontier from "can we export redacted lab
  records?" to "can migration/control-plane touchpoints consume correlated
  runtime evidence without treating lab records as production authority?"

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

- `2026-04-30-runtime-telemetry-hyperdx-observation.md`
- `2026-04-30-boundary-policy-matrix.md`
- `2026-04-30-first-server-async-harness-mounts.md`
- `../../src/mini-runtime/deployment-handoff.ts`
- `../../src/mini-runtime/catalog.ts`
- `../../src/mini-runtime/telemetry-export.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../test/mini-runtime/telemetry-export.test.ts`

Excluded or stale inputs:

- Stale migration plans are sequencing provenance only.
- The local HyperDX container is supporting infrastructure only.
- Existing `RuntimeCatalog` interfaces in the spec provide minimum sections;
  storage backend, indexing, retention, and exact persistence format are
  reserved.

Control inputs:

- Escalate if the work must choose production control-plane/package topology,
  deployment placement policy, persistent catalog storage, storage/indexing
  format, retention, dashboard/query/product observability policy, production
  OpenTelemetry bootstrap, durable async semantics, platform secret-store
  precedence, or migration sequence.
- Stop on spec hash drift, failed focused/composed gate, parent-review
  invalidation, Graphite/PR blocker, or any evidence that packet construction
  requires live handles, descriptor tables, executable closures, runtime access
  objects, raw provider values, or raw keyed secrets.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `testing-design`: falsification around live-handle leakage, storage claims,
  and placement-policy overreach.
- `architecture`: separation of runtime observation from control-plane
  authority and production placement decisions.
- `typescript`: typed packet shape and narrow lab-only helper boundaries.
- `information-design`: report wording that preserves migration usefulness
  without promoting unresolved storage/placement design.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-runtime-telemetry-hyperdx-observation.md`

Prior final output accepted or rejected:

- Accepted: redacted process/provider/catalog records can be projected into
  stable OTLP trace payloads, and explicit local export can be accepted by the
  available HyperDX/OTLP endpoint.
- Rejected as proof: local Docker availability, OTLP ingest acceptance,
  deterministic trace ids, and comments do not prove product observability,
  queryability, catalog persistence, or deployment placement.

Deferred items consumed:

- runtime catalog persistence residuals;
- product observability/query policy residuals;
- deployment/control-plane placement residuals;
- `audit.source-hygiene` as migration-readiness pressure if stale inputs begin
  steering implementation.

Deferred items explicitly left fenced:

- production catalog persistence backend/index/retention;
- product observability/query/dashboard policy;
- production OpenTelemetry bootstrap;
- deployment/control-plane placement policy;
- production harness mounting and native host telemetry;
- durable async run history;
- platform secret-store precedence;
- arbitrary provider-authored diagnostic string DLP.

Repair demands consumed:

- None at opening.

Next packet changes:

- This is the last default domino in the current DRA research-program sequence.
  Its closeout must either close the program with an honest residual ledger or
  emit a clearly scoped follow-up decision packet/workstream.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A lab-local migration/control-plane observation packet helper that correlates
  deployment handoff identity, catalog snapshot summary, and telemetry/export
  references without persisting or placing anything.
- Focused tests proving packet creation:
  - accepts only already-safe handoff/catalog/telemetry inputs;
  - preserves app/run/trace/correlation identity useful to migration readers;
  - records placement candidates as candidates, not decisions;
  - rejects or redacts live handles, descriptor tables, executable closures,
    runtime access objects, raw keyed secrets, provider values, and OTLP payload
    bodies.
- Manifest, focus log, diagnostic, research-program ledger, and this report
  updated to promote only earned contained proof and keep storage/placement
  residuals explicit.

Optional outputs:

- A small summary/projection function that emits counts and stable artifact
  references for catalog and telemetry records.
- A new residual manifest entry if production storage/placement/query policy
  needs a sharper authority home than existing residuals.

Target proof strength:

- At most contained `simulation-proof` for a portable observation handoff packet.
- No production runtime readiness, storage readiness, placement readiness,
  dashboard/query readiness, or durable async readiness.

Expected gates:

- `git status --short --branch`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- focused packet test
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:gate --skip-nx-cache`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- A production control-plane API, storage backend, deployment placement law, or
  package topology must be chosen.
- Packet creation requires live values, descriptor tables, executable closures,
  runtime access objects, raw keyed secrets, provider values, or OTLP payload bodies.
- A test would pass only by treating local in-memory records as durable
  production authority.

## Acceptance / Closure Criteria

This workstream may close only when:

- required outputs are present;
- proof/non-proof status is reflected in manifest and diagnostic where needed;
- every deferred item has an authority home, unblock condition, and re-entry
  trigger;
- leaf review loops and parent review loops are recorded;
- focused and composed gates are recorded;
- repo and Graphite state are recorded;
- the next packet is either a program closeout packet or a specific follow-up
  decision/workstream packet.

## Workflow

Preflight:

- `git status --short --branch`: clean on submitted
  `codex/runtime-hyperdx-observation`, then clean on new child
  `codex/runtime-migration-control-plane-observation`.
- `gt status --short`: clean before branch creation.
- `bunx nx show project runtime-realization-type-env --json`: project targets
  available for this workstream.

Investigation lanes:

- Authority/control-plane cartographer: confirmed the proof ceiling is a
  contained `simulation-proof` for a lab-local portable observation packet, with
  storage, indexing, retention, placement, orchestration, product query policy,
  production OpenTelemetry, native host telemetry, durable async, and secret
  precedence fenced.
- Implementation seam reviewer: recommended a new lab helper and focused test
  rather than widening deployment handoff or telemetry export. This lane added
  the run/trace identity requirement, telemetry run mismatch fail-closed check,
  and export-body stripping oracle.
- Adversarial evidence reviewer: rejected control-plane readiness, persistence,
  arbitrary DLP, real query/correlation proof, and deployment semantics as
  overclaims. This lane also required tighter program wording for item 11.
- Trailing semantic JSDoc reviewer: added concise comments on lab-only packet
  boundary, candidate-not-decision placement, summary-not-persistence telemetry,
  and rejection/redaction constraints.

Phase teams:

- Opening: host/DRA.
- Phase agents: authority/control-plane cartographer, implementation seam
  reviewer, adversarial evidence auditor, and trailing semantic JSDoc reviewer.
- Host/DRA integrated the implementation, corrected the helper name to
  migration/control-plane, tightened docs against overclaim, and verified agent
  recommendations through focused tests and manifest/diagnostic wording.

Design lock:

- Add `migration-control-plane-observation.ts` as a lab-only mini-runtime
  helper.
- The packet summarizes and correlates safe artifacts only:
  deployment handoff counts/identity, catalog counts/phases/subjects,
  telemetry run/trace/source/name counts, export endpoint/status/http status,
  and candidate-only placement hints.
- The packet does not contain OTLP payload bodies, export response bodies,
  descriptor tables, executable closures, runtime access objects, live handles,
  provider values, raw keyed secrets, storage refs, host refs, query names, dashboards,
  selected placements, or durable async history.
- Placement candidates are always marked `candidate-only`.
- Telemetry records must match the packet run id when they carry
  `telemetryRunId`; mismatches fail closed.

Implementation summary:

- Added `src/mini-runtime/migration-control-plane-observation.ts`.
  - `createMigrationControlPlaneObservationPacket(...)` produces the contained
    packet.
  - The helper validates deployment handoff app identity and forbidden
    authority-bearing keys.
  - It summarizes telemetry export status without echoing submitted payloads or
    response bodies.
  - It redacts candidate/packet attributes while leaving production DLP fenced.
- Exported the helper from `src/mini-runtime/index.ts`.
- Added `test/mini-runtime/migration-control-plane-observation.test.ts` with
  four focused tests.
- Updated manifest, focus log, diagnostic, spine audit map, DRA workflow, and
  research program ledger.

Semantic JSDoc/comment trailing pass:

- Completed.
- Comments clarify lab-only packet boundary, non-persistence/non-control-plane
  API status, placement candidates as review hints, telemetry observations as
  run-correlated summaries, and rejection/redaction constraints.
- Proof boundary: comments are review/migration substrate only; proof promotion
  still requires an executable oracle and named gate.

Verification:

- Focused packet test passed:
  `bun test tools/runtime-realization-type-env/test/mini-runtime/migration-control-plane-observation.test.ts`.
- Typecheck passed:
  `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Report passed:
  `bunx nx run runtime-realization-type-env:report --skip-nx-cache`.
- Negative fixture pass passed:
  `bunx nx run runtime-realization-type-env:negative --skip-nx-cache`.
- Mini-runtime replay passed:
  `bunx nx run runtime-realization-type-env:mini-runtime --skip-nx-cache`.
- Composed gate passed:
  `bunx nx run runtime-realization-type-env:gate --skip-nx-cache`.
- Root script passed:
  `bun run runtime-realization:type-env`.
- Diff whitespace check passed:
  `git diff --check`.

Review loops:

- Leaf review covered containment, mechanical placement, type/negative surface,
  semantic comments, mini-runtime behavior, and manifest/report consistency.
- Parent review covered architecture containment, migration derivability,
  DX/API/TypeScript non-promotion, workstream lifecycle/process, and
  adversarial evidence honesty.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| RuntimeCatalog has normative minimum sections, but storage backend, indexing, retention, and exact persistence format are reserved. | Canonical spec section 22.3. | A lab packet may preserve portable observation facts but cannot claim persistence readiness. | High |
| Deployment handoff is already compile-only and rejects descriptor tables/live values. | `deployment-handoff.ts` and existing mini-runtime tests. | Consume it as an input to observation, do not widen it into deployment orchestration. | High |
| HyperDX proof is export-only. | PR #270 report and manifest entry `audit.telemetry.hyperdx-observation`. | Carry export references forward, not query/dashboard/product observability claims. | High |
| Control-plane observation is a migration review packet, not a control-plane API. | Focused helper/test plus canonical reserved-boundary language. | Use `MigrationControlPlane...` names and candidate-only placement markers; keep production topology fenced. | High |

## Report

Proof promotions:

- `audit.migration.control-plane-observation` promoted to
  `simulation-proof`.
- Scope of the promotion:
  - already-safe deployment handoff, in-memory catalog, redacted telemetry
    records, and telemetry export status can be summarized into one packet;
  - app/run/trace/correlation identity is preserved;
  - placement hints remain candidate-only;
  - widened descriptor tables, executable closures, live handles, runtime
    access objects, provider values, app id drift, and telemetry run id drift
    are rejected; raw keyed secrets in reportable attributes are stripped from
    the packet;
  - OTLP payload bodies and export response bodies are not copied.

Proof non-promotions:

- The packet is not `RuntimeCatalog` persistence.
- The packet is not control-plane storage, placement policy, deployment
  orchestration, or package topology.
- The packet is not product observability/query/dashboard readiness.
- The packet is not production OpenTelemetry bootstrap, native host telemetry,
  durable async history, arbitrary DLP, or production migration readiness.

Diagnostic changes:

- Observation row now includes non-persistent migration packet summaries while
  persistence/query policy remains open.
- Deployment/control-plane row now includes candidate-only packet hints while
  placement policy, orchestration, topology, storage, and stale deployment-plan
  alignment remain open.
- Verdict now points to program closeout plus residual decision packets rather
  than another contained migration/control-plane iteration.

Spec feedback:

- No spec patch proposed by this workstream.
- The spec was sufficient to prove a contained packet and sufficient to keep
  `RuntimeCatalog` persistence, telemetry backend/export policy, and
  multi-process placement as reserved boundaries.

Test-theater removals or downgrades:

- Did not treat packet JSON serializability as persistence proof.
- Did not treat placement `targetId` or `reason` as placement law.
- Did not treat local OTLP acceptance as query/dashboard proof.
- Did not claim arbitrary string DLP; keyed redaction and forbidden-field
  rejection remain a lab guard only.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Production RuntimeCatalog persistence | `xfail` | The lab can build portable observation packets, but storage backend, indexing, retention, rehydration, and exact persistence format are reserved. | Canonical spec section 22.3 and manifest residuals. | Architecture accepts storage/index/retention policy or a migration implementation needs durable catalog storage. | Control-plane implementation attempts to persist or query lab packets as durable authority. | Decision packet or production migration implementation | spec/migration |
| Deployment/control-plane placement policy | `xfail` | Runtime observation can name candidate placement facts but cannot choose where processes, stores, or control-plane services live. | Canonical ownership/placement sections and diagnostic deployment row. | Architecture accepts placement law or deployment/control-plane implementation begins. | A future workstream turns observation records into placement/orchestration decisions. | Decision packet or production deployment/control-plane workstream | spec/migration |
| Product observability/query policy | `xfail` | Telemetry export and observation packet references do not choose dashboards, queries, retention, or product-facing semantics. | Telemetry residual manifest entry and canonical telemetry sections. | Architecture accepts product observability/query policy. | Host or migration code needs query semantics beyond export references. | Decision packet or production observability workstream | spec/migration |

## Review Result

Leaf loops:

- Containment: passed. Edits remain under
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed. New helper and test are lab-local and exported only from
  the mini-runtime barrel.
- Type/negative: passed. Typecheck and negative fixtures both passed, including
  the composed gate replay.
- Semantic JSDoc/comments: passed after trailing review.
- Vendor: not applicable beyond consuming prior OTLP export status as a summary
  reference; no new vendor behavior is claimed.
- Mini-runtime: passed. Focused packet tests passed; full mini-runtime replay
  passed with 54 tests and 276 assertions.
- Manifest/report: manifest, focus log, diagnostic, spine audit map, research
  program, DRA workflow, and this report agree on proof strength and residuals.

Parent loops:

- Architecture: passed. The helper remains a lab-contained packet, not
  production control-plane architecture.
- Migration derivability: passed. Future migration can mine packet shape,
  comments, and residuals without treating the packet as storage or placement.
- DX/API/TypeScript: passed. No public API change is introduced.
- Workstream lifecycle/process: passed after agent lanes, deferred inventory,
  and next closeout packet were recorded.
- Adversarial evidence honesty: passed. The report explicitly rejects
  readiness claims for persistence, placement, query, production telemetry,
  durable async, arbitrary DLP, and migration completion.

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
| This is the last default domino, but the program still has residual production decisions. | A naive closeout could imply the research program proved production readiness. | Close with explicit residual authority homes or a follow-up decision packet rather than declaring green production readiness. | Host/DRA closeout |

## Final Output

Artifacts:

- `src/mini-runtime/migration-control-plane-observation.ts`
- `src/mini-runtime/index.ts`
- `test/mini-runtime/migration-control-plane-observation.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/runtime-realization-research-program.md`
- `evidence/dra-runtime-research-program-workflow.md`
- `evidence/spine-audit-map.md`
- `evidence/workstreams/2026-04-30-migration-control-plane-observation.md`

Verification run:

- Focused packet test: passed, 4 tests and 32 assertions.
- `runtime-realization-type-env:report`: passed.
- `runtime-realization-type-env:typecheck`: passed.
- `runtime-realization-type-env:negative`: passed, 4 negative fixtures.
- `runtime-realization-type-env:mini-runtime`: passed, 54 tests and 276
  assertions.
- `runtime-realization-type-env:gate`: passed.
- `bun run runtime-realization:type-env`: passed.
- `git diff --check`: passed.

Repo/Graphite state:

- Initial Graphite commit `a42fa299` created.
- PR #271 opened as non-draft from
  `codex/runtime-migration-control-plane-observation`.
- Graphite mergeability check was still in progress and reported `UNSTABLE`
  when inspected immediately after PR creation.
- Final branch tip includes this PR metadata amend.

## Next Workstream Packet

Recommended next workstream:

- Program closeout and residual decision packet, unless this workstream uncovers
  a specific implementation dependency that requires another contained lab
  cycle first.

Why this is next:

- This is the final default domino. Closure must preserve what is proven,
  what remains intentionally unresolved, and what future migration or
  architecture decisions must own.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- production catalog persistence residuals
- deployment/control-plane placement residuals
- product observability/query residuals
- durable async/native host residuals if closeout wording touches them
