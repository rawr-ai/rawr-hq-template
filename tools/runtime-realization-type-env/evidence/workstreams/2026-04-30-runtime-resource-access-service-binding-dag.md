# RuntimeResourceAccess Law + Service Binding DAG

Status: `closed`.
Branch: `codex/runtime-resource-access-service-dag`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/262.
Commit: Graphite branch tip for this workstream.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove, inside the contained runtime-realization lab, that sanctioned
  runtime/resource access is narrow enough for service execution while service
  binding dependency inputs are validated as a dependency graph before cache
  construction.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Any helper that tightens access or validates service dependency graphs is
  lab-local unless the user explicitly accepts a final public
  `RuntimeResourceAccess` law.

Non-goals:

- Do not decide final production `RuntimeResourceAccess` method law.
- Do not introduce public authoring API changes.
- Do not decide dispatcher access policy, async step membership, server route
  import-safety, boundary policy, durable semantics, telemetry export, catalog
  persistence, package topology, or migration sequence.
- Do not claim production service binding, provider catalog, or deployment
  readiness.

## Opening Packet

Opening input:

- DRA continuation after PR #261
  (`Provider Diagnostics + Runtime Profile Config Redaction`).
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 3 is
  `RuntimeResourceAccess Law + Service Binding DAG`.

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

- `2026-04-30-provider-effect-plan-bootgraph-provisioning-lowering.md`
- `2026-04-30-provider-diagnostics-runtime-profile-config-redaction.md`
- `../../src/mini-runtime/runtime-access.ts`
- `../../src/mini-runtime/service-binding-cache.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/spine/derive.ts`
- `../../src/spine/artifacts.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../fixtures/inline-negative/runtime-access-boundaries.ts`
- `../../fixtures/todo/runtime-resource-access.todo.ts`
- `../../fixtures/todo/process-local-coordination-resources.todo.ts`

Excluded or stale inputs:

- Migration plans that imply production service binding topology before the lab
  has proven derivability.
- Any stale runtime-access wording that treats the current mini-runtime probe as
  final architecture.
- Provider/config proof from PR #261 beyond its contained simulation boundary.

Control inputs:

- Continue autonomously through the next nested workstream.
- Escalate only if implementation requires a final public
  `RuntimeResourceAccess` method law, service ownership boundary, dispatcher
  access policy, async membership law, or migration/package topology decision.

Selected skill lenses:

- `graphite`: Graphite is required for stack mutation and submission.
- `nx-workspace`: Nx project targets and gates are workspace truth.
- `target-authority-migration`: keep target architecture authority separate
  from migration/provenance inputs.
- `architecture`: review runtime ownership and access boundaries.
- `testing-design`: define proof oracles that catch false green service DAG and
  resource-access claims.
- `typescript`: preserve narrow static access and negative fixture coverage.
- `information-design`: keep deferred design as explicit negative space.

Refresher:

- Research program refreshed: `yes`.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-provider-diagnostics-runtime-profile-config-redaction.md`.

Prior final output accepted or rejected:

- Accepted as contained `simulation-proof`: provider config validation through
  `RuntimeSchema`, diagnostic-safe invalid config failures, redacted config
  snapshots, redacted trace attributes, and no secret/live-handle leakage inside
  provider acquire/release traces.
- Not accepted as production config source precedence, secret-store binding,
  telemetry export, catalog persistence, public provider API, or final boundary
  policy.

Deferred items consumed:

- `audit.p1.runtime-resource-access`
- `audit.p1.process-local-coordination-resources`
- current `simulation.service-binding-cache-runtime-access` proof boundary

Deferred items explicitly left fenced:

- dispatcher access policy;
- async step membership;
- cold route derivation/import-safety;
- durable async semantics;
- final timeout/retry/interruption/error/telemetry/redaction boundary policy;
- production telemetry export/catalog persistence/deployment placement.

Repair demands consumed:

- Semantic comments must trail TypeScript/runtime edits where the work introduces
  new lifecycle, authority, or proof-only seams.

Next packet changes:

- The workstream must either promote a bounded lab proof for service dependency
  graph validation and sanctioned runtime access or leave
  `audit.p1.runtime-resource-access` fenced with a sharper next unblock.

Invalidations from prior assumptions:

- None yet.

## Output Contract

Required outputs:

- Claim ledger for runtime access and service binding graph behavior.
- Lab-contained implementation, if proof is viable, that validates service
  binding dependency graph shape before binding cache construction.
- Focused tests for dependency ordering, missing dependency rejection, cycle
  rejection, deterministic dependency identity, sanctioned access preservation,
  and forbidden access rejection.
- Manifest, diagnostic, spine map, focus log, and research program updates only
  for proof actually earned.
- Semantic JSDoc/comment trailing review over touched TypeScript/runtime files.
- Closed workstream report with deferred inventory and next packet.

Optional outputs:

- Narrower helper names or local types if needed to make proof boundaries
  explicit without public API changes.

Target proof strength:

- Prefer contained `simulation-proof` for service binding dependency graph
  validation and the current mini-runtime sanctioned access facade.
- Do not promote final `RuntimeResourceAccess` method law without user
  architecture approval.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused target: `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- A final public `RuntimeResourceAccess` method law is required to proceed.
- Service dependency graph validation would require production service ownership
  topology rather than lab-local graph validation.
- Existing proof is invalidated by the canonical spec, manifest, or diagnostic.
- Gates expose a dependency inversion requiring sequence change.

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

- Passed before opening packet:
  `git status --short --branch`, `gt status --short`, PR #261 view, and clean
  branch creation.

Investigation lanes:

- Authority cartographer: completed. The narrow proof is contained
  `simulation-proof` expansion for explicit lab `ServiceBindingPlan` dependency
  graph validation; final `RuntimeResourceAccess` law stays fenced.
- Implementation seam reviewer: completed. Smallest viable seam is
  `src/mini-runtime/service-binding-cache.ts`, with no public spine artifact or
  runtime access widening.
- Testing/evidence auditor: completed. Required oracles are dependency ordering,
  missing dependency rejection, cycle rejection, ambiguity rejection, structural
  cache identity, sanctioned access preservation, and negative forbidden-access
  coverage.

Phase teams:

- Opening: host-only, because the branch had to start with the workstream packet
  and authority context was local.
- Investigation/design: three read-only agents, because authority, implementation
  seam, and evidence/testing questions were independent.
- Implementation: host-owned, because the accepted write surface was one
  mini-runtime seam plus focused tests.
- Semantic comment review: one trailing reviewer after TypeScript edits.

Design lock:

- Locked to a lab-local service binding dependency graph validator and
  dependency-first cache construction path.
- Dependency refs are existing `ServiceBindingPlan.dependencyInstances` strings,
  resolved against `serviceInstance ?? serviceId` inside the contained lab.
- Missing, ambiguous, and cyclic dependency refs fail before any client
  construction.
- Public `ServiceBindingPlan`, `RuntimeResourceAccess`, and spine artifact
  shapes were not changed.

Implementation summary:

- Added service binding instance indexing, dependency resolution, cycle
  validation, and dependency-first construction inside
  `src/mini-runtime/service-binding-cache.ts`.
- Preserved existing construction identity and cache-key semantics, including
  invocation exclusion.
- Added focused mini-runtime tests for dependency-before-dependent construction,
  missing dependency fail-closed behavior, cycle fail-closed behavior, ambiguous
  dependency fail-closed behavior, and colon-heavy structured identities.
- Updated manifest, focus log, diagnostic, spine audit map, and research program
  wording to expand only the existing contained simulation proof.

Semantic JSDoc/comment trailing pass:

- Failed first pass: reviewer found the graph-validation comment sufficient but
  requested a lifecycle comment before the recursive construction seam.
- Repaired: added a comment explaining that the mini cache is the lab proof
  point for binding lifecycle order and that dependents materialize only after
  service-instance prerequisites have construction identities in the process.

Verification:

- Passed: `bunx nx show project runtime-realization-type-env --json`.
- Passed: `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`.
- Passed: `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Passed: `bunx nx run runtime-realization-type-env:negative`.
- Passed: `bunx nx run runtime-realization-type-env:mini-runtime`.
- Passed: `bunx nx run runtime-realization-type-env:structural`.
- Passed: `bunx nx run runtime-realization-type-env:report`.
- Passed: `bunx nx run runtime-realization-type-env:gate`.
- Passed: `bun run runtime-realization:type-env`.
- Passed: `git diff --check`.

Review loops:

- Leaf loops completed before parent synthesis.
- Parent loops completed after evidence updates and composed gates.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| The current cache proof did not yet validate service binding dependencies as a graph. | Existing tests only covered cache reuse, structural key encoding, and invocation exclusion. | Implemented lab-local dependency graph validation and dependency-first construction. | High |
| `RuntimeResourceAccess` must remain final-law negative space. | Canonical spec treats runtime access surfaces as normative, while manifest entry `audit.p1.runtime-resource-access` remains `xfail`. | Left `audit.p1.runtime-resource-access` fenced and promoted no public API. | High |
| Workstream/focus consistency is mostly a human oracle today. | `report-results.ts` prints manifest focus but does not validate current workstream filename/status against the manifest focus. | Recorded as process tension; no structural change in this workstream. | Medium |

## Report

Proof promotions:

- Expanded `simulation.service-binding-cache-runtime-access` within its existing
  `simulation-proof` category.
- New earned claim: the mini-runtime cache validates explicit lab
  `ServiceBindingPlan` dependency inputs as an acyclic graph before cache
  construction, rejects missing/ambiguous/cyclic dependency refs before client
  construction, materializes dependencies before dependents, preserves
  construction-time cache identity, excludes invocation, and keeps the sanctioned
  access facade boundary.

Proof non-promotions:

- Final public `RuntimeResourceAccess` method law remains fenced unless accepted
  by the user.
- Production service binding compiler topology, resource/semantic dependency
  closure, service ownership topology, dispatcher materialization, plugin
  projection, process-local coordination resource contracts, and durable async
  semantics remain unproven.

Diagnostic changes:

- `proof-manifest.json`: current experiment changed to
  `lab-v2.runtime-resource-access-service-binding-dag`; the
  `simulation.service-binding-cache-runtime-access` oracle was expanded.
- `focus-log.md`: updated to the active experiment and related
  `audit.p1.runtime-resource-access` entry.
- `runtime-spine-verification-diagnostic.md`: service dependency and process
  runtime rows now record lab service DAG validation while fencing production
  compiler/law work.
- `spine-audit-map.md`: runtime access/service binding cache row now records
  missing/ambiguous/cyclic dependency rejection and dependency-first
  materialization.
- `runtime-realization-research-program.md`: current baseline and negative-space
  ledger updated for the earned proof and residual `RuntimeResourceAccess`
  fence.

Spec feedback:

- The canonical spec already states that runtime compiler validates an acyclic
  service binding DAG and that the process runtime binds sibling services before
  dependents. This workstream made the lab exercise that path for explicit lab
  plans only.
- No spec change was made. Final `RuntimeResourceAccess` method law still needs
  explicit architecture acceptance or revision.

Test-theater removals or downgrades:

- No existing proof was downgraded.
- Avoided the false promotion of `audit.p1.runtime-resource-access`; the lab
  facade remains evidence, not final public method law.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Final `RuntimeResourceAccess` method law | `xfail` | This workstream may prove the lab facade and graph behavior, but final public access law is user-owned architecture. | Canonical runtime spec plus `proof-manifest.json` entry `audit.p1.runtime-resource-access`. | User accepts final access surface or an architecture workstream narrows it without public API risk. | Adapter/dispatcher/server work requires a method not covered by the lab facade. | RuntimeResourceAccess Law + Service Binding DAG or Dispatcher Access + Async Step Membership. | spec |
| Process-local coordination resource contracts | `xfail` | Queue/pubsub/cache/concurrency resources need sanctioned runtime contracts without implying durable semantics. | `proof-manifest.json` entry `audit.p1.process-local-coordination-resources`. | A workstream chooses which process-local values are runtime resources and how access is mediated. | Dispatcher/async bridge needs process-local coordination values. | RuntimeResourceAccess Law + Service Binding DAG or Dispatcher Access + Async Step Membership. | lab/spec |

## Review Result

Leaf loops:

- Containment: passed; all edits stayed under
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed; Nx project shape and structural target passed.
- Type/negative: passed; typecheck and negative fixtures preserved forbidden raw
  access/readback behavior.
- Semantic JSDoc/comments: passed after repair.
- Vendor: no new vendor claim; vendor gates passed as part of composed gate.
- Mini-runtime: passed; focused and full mini-runtime tests exercise the new DAG
  behavior.
- Manifest/report: passed; report target prints the new focus and expanded
  oracle.

Parent loops:

- Architecture: passed with final `RuntimeResourceAccess` method law fenced.
- Migration derivability: passed as contained service binding DAG evidence; not
  production topology readiness.
- DX/API/TypeScript: passed; no public artifact or authoring API shape changed.
- Workstream lifecycle/process: passed; packet opened first, phase team ran,
  proof/evidence updated, gates recorded, next packet retained.
- Adversarial evidence honesty: passed; final-law, dispatcher, async, harness,
  durable, telemetry, catalog, and production service compiler claims remain
  non-proof.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None. |  |  |  |  |  |

Invalidations:

- None yet.

Repair demands:

- Semantic reviewer required a lifecycle-order comment before
  `getOrCreateAllowedPlan`; repaired.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Focus/workstream consistency is not structurally checked. | A future branch could update a manifest focus while leaving an active workstream packet stale, or close a workstream without focus alignment. | Extend `report` or `structural` to optionally validate current experiment/workstream report consistency once the report naming convention is stable. | DRA stewardship or next evidence-infrastructure pass. |

## Final Output

Artifacts:

- `src/mini-runtime/service-binding-cache.ts`
- `test/mini-runtime/process-runtime.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/runtime-realization-research-program.md`
- `evidence/workstreams/2026-04-30-runtime-resource-access-service-binding-dag.md`

Verification run:

- `bunx nx show project runtime-realization-type-env --json`
- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`

Repo/Graphite state:

- Current branch: `codex/runtime-resource-access-service-dag`.
- Submitted through Graphite as PR #262 on
  `codex/runtime-resource-access-service-dag`; final local status was clean and
  GitHub reported only `Graphite / mergeability_check` in progress.

## Next Workstream Packet

Recommended next workstream:

- Dispatcher Access + Async Step Membership, unless runtime access/service DAG
  proof discovers a dependency inversion.

Why this is next:

- Dispatcher and async callback work need a sanctioned resource/access surface
  and explicit dependency graph behavior before they can safely delegate through
  `ProcessExecutionRuntime`.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../../src/mini-runtime/process-runtime.ts`
- `../../src/mini-runtime/runtime-access.ts`
- `../../src/mini-runtime/service-binding-cache.ts`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.p0.async-step-membership`
- `audit.p1.dispatcher-access`
- any residual runtime access or process-local resource fences from this
  workstream
