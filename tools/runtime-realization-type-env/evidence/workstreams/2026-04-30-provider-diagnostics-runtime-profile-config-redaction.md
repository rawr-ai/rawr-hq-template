# Provider Diagnostics + Runtime Profile Config Redaction

Status: `closed`.
Branch: `codex/runtime-provider-diagnostics-config-redaction`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/261.
Commit: Graphite branch tip for this workstream.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove, inside the contained runtime-realization lab, that provider acquisition
  can consume runtime-profile config, validate config shape, emit provider
  lifecycle diagnostics safely, and preserve redacted observation records without
  leaking raw secrets or live handles.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Config/redaction helpers are lab-local and must not become production config
  binding, platform secret-store integration, telemetry export, or public
  provider API authority.

Non-goals:

- Do not decide final runtime profile config source precedence.
- Do not integrate platform secret stores, deployment config, durable catalog
  persistence, or telemetry export.
- Do not change public `ProviderEffectPlan` producer/consumer shape.
- Do not lock timeout, retry, refresh, interruption, or error/exit policy.
- Do not promote production provider readiness or production bootgraph mounting.

## Opening Packet

Opening input:

- User control input to continue the DRA research program after PR #260.
- Previous workstream next packet:
  `2026-04-30-provider-effect-plan-bootgraph-provisioning-lowering.md`.

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

Evidence inputs:

- Provider lowering implementation from PR #260.
- Provider provisioning focused tests from PR #260.

Excluded or stale inputs:

- Any stale migration/provider catalog inventory that suggests production config
  precedence or standard provider ids.
- Vendor behavior not directly exercised by the contained lab gates.
- Chat-only assumptions about secret stores, telemetry export, or deployment
  placement.

Control inputs:

- Continue autonomously through the next nested workstream.
- Escalate only if a final public provider/config API, production secret-store
  strategy, boundary policy, or migration sequence must be chosen.

Selected skill lenses:

- `graphite`: Graphite branch/stack mutation and submit hygiene.
- `nx-workspace`: project truth and target/gate discovery.
- `target-authority-migration`: keep canonical runtime spec above lab substrate.
- `testing-design`: falsifiable config validation and no-leakage oracles.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes.
- DRA workflow refreshed: yes.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-provider-effect-plan-bootgraph-provisioning-lowering.md`.

Prior final output accepted:

- Provider acquire/release lowering earned contained `simulation-proof` through
  RAWR-owned mini bootgraph/provisioning modules with real Effect execution.
- Final public `ProviderEffectPlan` shape, typed config binding, boundary
  policy, production providers, telemetry export, catalog persistence, and
  harness integration remain fenced.

Deferred items consumed:

- `audit.p2.runtime-profile-config-redaction`
- `audit.p2.first-resource-provider-cut`
- typed provider error residuals only if diagnostic payloads need error shape
  handling
- private provider internals process-tension note only if public shape pressure
  appears

Deferred items explicitly left fenced:

- Final public `ProviderEffectPlan` shape.
- Effect boundary policy matrix.
- RuntimeResourceAccess method law.
- Runtime profile config source precedence.
- Platform secret stores and production deployment config.
- Telemetry export and catalog persistence.
- Production provider bootgraph integration.

Repair demands consumed:

- Private provider internals must stay lab-internal and not become public API.
- Provider diagnostics/redaction must not leak raw config secrets, raw live
  handles, or provider release functions into catalog/diagnostic snapshots.
- Semantic JSDoc/comment trailing review is required if this workstream adds new
  TypeScript/runtime seams.

Next packet changes:

- This workstream narrows from full config binding to lab-contained runtime
  profile config validation, provider diagnostic safety, and redacted
  observation records.

Invalidations from prior assumptions:

- Existing catalog redaction only proves current metadata is safe; it does not
  prove provider config validation or redacted config diagnostic snapshots.

## Output Contract

Required outputs:

- A lab-local runtime profile config representation or adapter sufficient to
  feed provider acquisition without deciding final production config topology.
- Provider config validation that can fail closed before or during acquisition
  with diagnostic-safe errors.
- Redacted provider lifecycle diagnostic/config snapshots that preserve useful
  identity and validation context without raw secrets, live handles, release
  functions, or executable values.
- Focused tests for valid config, invalid config, raw secret redaction,
  provider-emitted diagnostic redaction, live-handle leakage rejection, and
  catalog/trace observation safety.
- Manifest, diagnostic, focus log, research program, and this report updated
  only to earned proof strength.

Optional outputs:

- A representative fixture resource/provider cut if it materially improves
  redaction proof without asserting final standard provider ids.
- Semantic JSDoc comments for new lab-only config/redaction seams.

Target proof strength:

- Promote `audit.p2.runtime-profile-config-redaction` from `todo` only to
  contained `simulation-proof` if the mini-runtime/provisioning path validates
  provider config and records redacted diagnostics/config snapshots with a
  regression gate that fails on secret/live-handle leakage.
- Keep `audit.p2.first-resource-provider-cut` as `todo` unless a representative
  fixture set is added as planning input only.
- Keep final config source precedence, platform secret stores, typed public
  config API, telemetry export, catalog persistence, and production providers
  fenced.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused provider diagnostics/config redaction test
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- Choosing final public config authoring API, config source precedence, or
  provider config schema language.
- Deciding production secret-store integration, deployment config mapping, or
  telemetry export/correlation semantics.
- Changing public `ProviderEffectPlan`, `RuntimeProvider`, or
  `RuntimeResourceAccess` contracts for production consumers.
- Choosing timeout, retry, interruption, error/exit, or redaction policy beyond
  the minimum lab-safe default needed for this proof.
- Importing production `apps/*`, `packages/*`, `services/*`, or `plugins/*`.
- Treating simulation proof as production runtime readiness.

## Acceptance / Closure Criteria

This workstream may close only when:

- required outputs are present;
- proof/non-proof status is reflected in manifest and diagnostic where needed;
- every deferred item has an authority home, unblock condition, and re-entry
  trigger;
- semantic JSDoc/comment review runs if new TypeScript/runtime seams are added;
- leaf review loops and parent review loops are recorded;
- focused and composed gates are recorded;
- repo and Graphite state are recorded;
- the next workstream packet is usable by a zero-context agent.

## Workflow

Preflight:

- Verified clean branch state on `codex/runtime-research-program-dra-stewardship`.
- Verified PR #260 remains open and Graphite mergeability check is in progress.
- Created `codex/runtime-provider-diagnostics-config-redaction` above PR #260
  with Graphite.
- Verified Nx project truth and canonical spec hash.

Investigation lanes:

- Authority cartographer: spec config/diagnostic/redaction authority,
  manifest/diagnostic status, and prior report fences.
- Implementation seam reviewer: provider provisioning config path, catalog
  redaction, diagnostic trace shape, and private provider internals pressure.
- Testing/evidence auditor: no-leakage oracle quality and failure-mode coverage.
- Mechanical verifier: Nx target coverage, structural guard, forbidden imports,
  and report/manifest consistency.

Phase teams:

- Opening: host-only after DRA reboot and authority refresh.
- Investigation/review: use fresh default agents where independent evidence
  improves confidence.

Design lock:

- Use the existing `RuntimeProvider.configSchema` hook as the schema boundary.
- Keep source selection lab-local: module id config overrides provider id config,
  with `{}` as the default fixture input. This is not production config
  precedence.
- Validate config in the mini bootgraph module `start(...)` before
  `provider.build(...)` or provider acquire.
- Sanitize validation failure messages and provisioning trace attributes before
  they can enter boot failure records, trace diagnostics, or catalog snapshots.
- Do not add public provider/config APIs or structured provider diagnostic API
  in this workstream.

Implementation summary:

- Added lab-local provider config selection and validation helpers in
  `src/mini-runtime/provider-lowering.ts`.
- Provider modules now carry redacted `configSnapshot`, `configSchemaId`,
  `configSource`, and `configSourceKey` metadata instead of raw config metadata.
- Provider config validates through `RuntimeSchema` before provider build/acquire;
  invalid config fails closed with a safe `provider.config.invalid` error and
  redacted trace diagnostic.
- Provisioning trace event/diagnostic attributes now pass through the same
  redaction helper used by catalog/runtime access records.
- Provider acquire/release failure messages are reduced to diagnostic-safe
  classification in this lab path, leaving final Exit/Cause payload policy to
  the boundary matrix.
- Focused provider-provisioning tests now cover schema parse/normalization,
  module-id config override, invalid config fail-closed before provider build,
  redacted config snapshots, trace no-leakage, rollback no-leakage, and release
  failure no-leakage.
- Manifest, focus log, diagnostic, spine audit map, and research program ledger
  now promote `audit.p2.runtime-profile-config-redaction` only to contained
  `simulation-proof`.

Semantic JSDoc/comment trailing pass:

- Passed by host before final review. Semantic comments were added for lab-only
  config source selection, lab-only validation, and diagnostic-safe provider
  failure classification. No public-provider comments were added because public
  provider/config API remains unchanged.

Verification:

- Passed: `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`.
- Passed: `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Passed: `bunx nx run runtime-realization-type-env:mini-runtime`.
- Passed: `bunx nx run runtime-realization-type-env:negative`.
- Passed after stale todo-fixture repair:
  `bunx nx run runtime-realization-type-env:structural`.
- Passed: `bunx nx run runtime-realization-type-env:report`.
- Passed: `bunx nx run runtime-realization-type-env:gate`.
- Passed: `bun run runtime-realization:type-env`.
- Passed: `git diff --check`.
- Passed after submit: final Git and Graphite status were clean; the only
  remote PR status still running was Graphite mergeability.

Review loops:

- Authority cartographer found `audit.p2.runtime-profile-config-redaction` is
  eligible only for contained `simulation-proof`; production config precedence,
  platform stores, telemetry export, catalog persistence, and public provider
  contracts must stay fenced.
- Implementation seam reviewer found the smallest safe implementation is inside
  `provider-lowering.ts` plus focused tests, using existing `configSchema` and
  avoiding public API changes.
- Testing/evidence auditor required schema parse, invalid fail-closed behavior,
  diagnostic-safe validation errors, module-id override, trace/catalog
  no-leakage, and explicit non-proof boundaries.
- Host accepted the lane outputs and kept structured provider diagnostics and
  negative type fixtures out of scope because they would choose public or
  pseudo-public shape not required for this runtime proof.

## Claim Ledger

| Claim | Lifecycle phase | Authority source | Proof category | Oracle | Gate | Non-proof boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Provider acquisition can consume runtime-profile config through the contained provisioning path. | provisioning | canonical spec, manifest todo, prior workstream report | target `simulation-proof` | provider acquire sees validated config and invalid config fails closed | focused provider diagnostics/config test | not final config API or source precedence |
| Provider diagnostics/config snapshots are redacted. | observation | canonical spec, diagnostic, manifest todo | target `simulation-proof` | raw secret sentinels or live handles in trace/catalog fail tests | focused provider diagnostics/config test, mini-runtime | not telemetry export or catalog persistence |
| Config validation failures remain diagnostic-safe. | provisioning/observation | canonical spec and design guardrails | target `simulation-proof` | invalid config reports useful identity/error context without raw secret values | focused provider diagnostics/config test | not boundary policy matrix |
| Final public provider/config shape remains unresolved. | definition | manifest xfail/todo | `xfail/todo` | proof cannot require final public fields or platform secret stores | type/structural review | no public API decision |

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Existing provider config path passed raw fixture config directly into provider build. | `src/mini-runtime/provider-lowering.ts` previous `configFor(...)` use. | Replaced with lab-local source selection plus schema validation before provider build/acquire. | high |
| Parser errors and provider failure messages could leak raw secret-bearing values if forwarded directly. | Review of `providerFailureMessage(...)` and schema parse failure path. | Validation errors now emit safe `provider.config.invalid`; provider failure classification is sanitized in the lab path. | high |
| Catalog redaction alone was insufficient as config proof. | Testing/evidence review and prior diagnostic `todo`. | Added focused tests that inspect catalog, provisioning trace, error messages, side-effect counters, and live handles. | high |
| Public provider/config API did not need to change for contained proof. | Existing `RuntimeProvider.configSchema` and `ProviderBuildContext.config`. | Kept public provider and profile contracts unchanged. | high |

## Report

Proof promotions:

- `audit.p2.runtime-profile-config-redaction` moved from `todo` to
  `simulation-proof` after focused provider provisioning tests proved
  `RuntimeSchema` validation before provider build/acquire, invalid config
  fail-closed behavior, redacted config snapshots, redacted provisioning trace
  attributes, and no secret/live-handle leakage in acquire/release failure
  records.

Proof non-promotions:

- `audit.p2.first-resource-provider-cut` remains `todo`; no representative
  provider/resource catalog was promoted.
- Final runtime profile config source precedence remains fenced.
- Platform secret stores, production deployment config mapping, telemetry export,
  and catalog persistence remain out of scope.
- Final public provider/config authoring API and structured provider diagnostic
  API remain unchosen.
- Boundary policy matrix remains `xfail`; safe lab error classification is not
  final public Exit/Cause/error payload policy.

Diagnostic changes:

- `runtime-spine-verification-diagnostic.md` now records contained
  RuntimeSchema-backed provider config validation/redaction evidence while
  keeping production config source precedence, persisted diagnostics, telemetry
  export, and catalog persistence yellow/fenced.
- `spine-audit-map.md`, `focus-log.md`, `runtime-realization-research-program.md`,
  and `proof-manifest.json` now agree on the contained proof boundary.

Spec feedback:

- The existing `RuntimeSchema` facade was sufficient for contained provider
  config validation proof. The spec still needs production config source
  precedence, platform secret binding, persisted observation, and free-form
  provider diagnostic string policy before migration-ready claims.

Test-theater removals or downgrades:

- Did not claim arbitrary free-form diagnostic string redaction. The proof covers
  structured trace/catalog attributes and safe validation failures; provider
  `diagnostics.report(message)` remains a string channel that providers must not
  use for secret-bearing payloads until a structured diagnostic policy is chosen.
- Did not add negative type fixtures because no new public/static config API was
  introduced. Runtime tests carry the proof.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Final runtime profile config source precedence | `xfail/todo` | Multi-source precedence is production/runtime policy, not necessary for contained provider redaction proof. | Manifest, diagnostic, research program. | Production config binding or deployment mapping needs source ordering. | Provider/harness work would otherwise infer precedence from fixtures. | Boundary Policy Matrix or Migration/Control-Plane Observation | spec/migration |
| Platform secret-store integration | `out-of-scope` | This workstream can prove no-leakage using lab sentinels without choosing platform stores. | Diagnostic, research program. | Migration work selects production secret-store provider strategy. | Production provider or deployment config needs real secret source. | Migration/Control-Plane Observation | migration |
| Telemetry export and catalog persistence | `out-of-scope` | In-memory redacted records prove local observation only. | Diagnostic, spine map, research program. | Runtime observation work chooses export/persistence/correlation boundaries. | Runtime observation needs durable storage or product export. | Migration/Control-Plane Observation | migration |
| Free-form provider diagnostic string policy | `xfail/todo` | This proof redacts structured trace/catalog attributes and safe validation failures, not arbitrary provider-written diagnostic strings. | Diagnostic, research program, Boundary Policy Matrix. | Public/runtime diagnostics policy chooses structured attributes, message discipline, or message redaction rules. | A provider/harness workstream needs provider-authored diagnostics with secret-bearing context. | Boundary Policy Matrix | spec |

## Review Result

Leaf loops:

- Containment: passed. All edits are under
  `tools/runtime-realization-type-env/**`; no production app/package/service or
  plugin imports were added.
- Mechanical: passed. The implementation changed only provider lowering,
  focused tests, and evidence ledgers; structural and full gate passed after the
  stale todo fixture was removed.
- Type/negative: passed by typecheck. Negative fixtures were not expanded because
  no public/static provider config API was added.
- Semantic JSDoc/comments: passed after repair. New comments mark config source
  selection, config validation, provider failure classification, and trace
  diagnostic attribute redaction as lab-only proof seams rather than final public
  policy or arbitrary message redaction.
- Vendor: passed. This workstream used the existing `RuntimeSchema` facade and
  did not add or alter vendor claims.
- Mini-runtime: passed by focused provider-provisioning test and the full
  mini-runtime target.
- Manifest/report: passed after evidence updates. Manifest, focus log,
  diagnostic, spine audit map, research program ledger, and this report agree on
  contained `simulation-proof` only.

Parent loops:

- Architecture: passed. The proof stays in provisioning/observation, does not
  change public provider/profile APIs, and keeps production config strategy
  fenced.
- Migration derivability: passed. The result de-risks config validation and
  no-leakage around provider acquisition, but leaves production config sources,
  stores, and persistence explicit negative space.
- DX/API/TypeScript: passed with non-promotion. Existing `configSchema` and
  `ProviderBuildContext.config` were enough; no public type/API decision was
  taken.
- Workstream lifecycle/process: passed. The workstream was opened on a new
  Graphite branch, staffed with authority/seam/testing lanes, implemented,
  reviewed, and closed with a next packet.
- Adversarial evidence honesty: passed. The report names the limits around
  arbitrary free-form diagnostic strings, production config precedence, platform
  stores, and boundary policy.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None. |  |  |  |  |  |

Invalidations:

- The assumption that generic catalog redaction was enough for
  `audit.p2.runtime-profile-config-redaction` was invalidated. The workstream
  added schema validation and trace/catalog no-leakage tests before promotion.

Repair demands:

- Fixed: validation errors cannot forward raw parser messages into boot failure
  records.
- Fixed: provisioning trace event/diagnostic attributes are redacted.
- Fixed after semantic review: trace diagnostic attribute redaction is documented
  as structured-attribute-only; arbitrary provider-authored diagnostic strings
  remain fenced.
- Fixed: module-id config override is tested and recorded as lab fixture
  selection, not production source precedence.
- Fenced: arbitrary free-form provider diagnostic string redaction remains a
  boundary-policy/diagnostics decision.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| `RuntimeDiagnosticSink.report(message)` is string-only. | Future work could accidentally claim provider-authored diagnostic string redaction when only structured attributes are safe. | Keep this report's non-promotion explicit; revisit with structured diagnostics or message policy in the Boundary Policy Matrix. | Boundary Policy Matrix |

## Final Output

Artifacts:

- `evidence/workstreams/2026-04-30-provider-diagnostics-runtime-profile-config-redaction.md`
- `src/mini-runtime/provider-lowering.ts`
- `test/mini-runtime/provider-provisioning.test.ts`
- `evidence/proof-manifest.json`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/focus-log.md`
- `evidence/runtime-realization-research-program.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`

Repo/Graphite state:

- Current branch: `codex/runtime-provider-diagnostics-config-redaction`.
- Submitted through Graphite as PR #261 on
  `codex/runtime-provider-diagnostics-config-redaction`; final local status was
  clean and GitHub reported only `Graphite / mergeability_check` in progress.

## Next Workstream Packet

Recommended next workstream:

- RuntimeResourceAccess Law + Service Binding DAG, unless this workstream
  discovers a provider/config redaction blocker that requires a decision packet.

Why this is next:

- Once provider values and redacted config/diagnostics exist in the contained
  lab, service/resource access can be tightened against real provisioned values
  and service binding dependency graph behavior.

Required first reads:

- `../dra-runtime-research-program-workflow.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- this report after closeout
- provider provisioning implementation and tests after this workstream

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.p1.runtime-resource-access`
- `audit.p1.process-local-coordination-resources`
- any provider diagnostics/config redaction residuals from this workstream
