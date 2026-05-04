# Dispatcher Access + Async Step Membership

Status: `closed`.
Branch: `codex/runtime-dispatcher-async-membership`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/263.
Commit: Graphite branch tip for this workstream.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove, inside the contained runtime-realization lab, the narrowest acceptable
  dispatcher access and async step membership behavior before any real async
  bridge or harness mounting claim.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Any dispatcher access or async membership helper is lab-local unless the user
  accepts a public dispatcher policy or final async membership law.

Non-goals:

- Do not decide durable async semantics, retry/idempotency policy, schedule
  semantics, Inngest function bundle lowering, real worker/serve behavior, or
  production harness mounting.
- Do not decide server route derivation/import-safety or real Elysia/oRPC
  mounting.
- Do not change public authoring API/DX unless escalated and accepted.
- Do not widen `RuntimeResourceAccess`, `WorkflowDispatcher`, or public async
  descriptor shapes as production law.

## Opening Packet

Opening input:

- DRA continuation after PR #262
  (`RuntimeResourceAccess Law + Service Binding DAG`).
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 4 is
  `Dispatcher Access + Async Step Membership`.

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

- `2026-04-30-runtime-resource-access-service-binding-dag.md`
- `../../src/spine/artifacts.ts`
- `../../src/spine/derive.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../src/mini-runtime/process-runtime.ts`
- `../../test/middle-spine-derivation.test.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../fixtures/inline-negative/descriptor-refs.ts`
- `../../fixtures/todo/async-step-membership.todo.ts`
- `../../fixtures/todo/dispatcher-access.todo.ts`
- `../../fixtures/todo/async-effect-bridge-lowering.todo.ts`

Excluded or stale inputs:

- Any current diagnostic string that says dispatcher access or async membership
  remains unresolved is an input to be retired only by proof, not a blocker by
  itself.
- Vendor Inngest shape probes prove package construction only; they do not prove
  durable scheduling, retry, idempotency, or step membership.
- Fake adapter callback delegation proves delegation mechanics only; it does not
  decide which async steps belong to which workflow/schedule/consumer owner.

Control inputs:

- Continue autonomously through the next nested workstream.
- Escalate only if proof requires a final public dispatcher access policy,
  authoring API/DX change, durable async semantics, async membership law beyond
  explicit lab artifacts, or production harness/package topology.

Selected skill lenses:

- `graphite`: Graphite is required for stack mutation and submission.
- `nx-workspace`: Nx project targets and gates are workspace truth.
- `target-authority-migration`: keep canonical spec and migration-readiness
  claims separate.
- `architecture`: review dispatcher/async ownership boundaries.
- `testing-design`: define proof oracles that catch inferred membership and fake
  dispatcher access.
- `typescript`: preserve descriptor discriminants and negative fixtures.
- `information-design`: keep unresolved dispatcher/durable semantics explicit.

Refresher:

- Research program refreshed: `yes`.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-runtime-resource-access-service-binding-dag.md`.

Prior final output accepted or rejected:

- Accepted as contained `simulation-proof`: explicit lab `ServiceBindingPlan`
  dependency inputs validate as an acyclic graph before cache construction;
  missing/ambiguous/cyclic dependency refs fail before client construction;
  dependencies materialize before dependents; construction-time identity and
  invocation exclusion are preserved.
- Not accepted as final public `RuntimeResourceAccess` method law, production
  service binding compiler topology, dispatcher materialization, plugin
  projection, process-local coordination resource contracts, or durable async
  semantics.

Deferred items consumed:

- `audit.p0.async-step-membership`
- `audit.p1.dispatcher-access`
- `audit.p2.async-effect-bridge-lowering` as next-phase dependency only

Deferred items explicitly left fenced:

- durable async execution semantics;
- real Inngest function bundle lowering and serve/mount path;
- retry/idempotency/schedule policy;
- server route derivation/import-safety;
- final boundary policy;
- production telemetry/catalog/deployment behavior.

Repair demands consumed:

- Semantic comments must trail TypeScript/runtime edits where dispatcher or
  membership helpers introduce lifecycle, authority, or proof-only seams.

Next packet changes:

- If this workstream earns proof, the next real adapter/async bridge workstream
  may consume explicit membership/access artifacts instead of inferring them from
  executable bodies.

Invalidations from prior assumptions:

- None yet.

## Output Contract

Required outputs:

- Claim ledger for dispatcher access and async step membership.
- Narrow proof design that either:
  - promotes contained dispatcher/membership behavior to `simulation-proof`; or
  - leaves both entries fenced with sharper unblock conditions.
- Focused tests for accepted dispatcher operation declaration and forbidden
  inferred/default dispatcher access.
- Focused tests for async step membership: exactly one owner kind,
  membership-by-declaration rather than execution, missing step/member
  rejection, and no body execution during derivation.
- Manifest, diagnostic, spine map, focus log, and research program updates only
  for proof actually earned.
- Semantic JSDoc/comment trailing review over touched TypeScript/runtime files.
- Closed workstream report with deferred inventory and next packet.

Optional outputs:

- Lab-local descriptor or helper types if needed to express dispatcher access or
  async membership without changing public SDK authoring shapes.

Target proof strength:

- Prefer contained `simulation-proof` for explicit lab dispatcher access
  declaration and async owner-to-step membership artifacts.
- Do not promote durable async semantics, real bridge lowering, or public
  dispatcher authoring API without user approval.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused targets:
  - `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
  - `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- A final public dispatcher access API or authoring DX change is required.
- Async membership cannot be represented without deciding production workflow,
  schedule, or consumer authoring law.
- Any implementation would infer membership by executing user bodies.
- Durable scheduling/retry/idempotency semantics become necessary.
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
  `git status --short --branch`, `gt status --short`, PR #262 view, and clean
  branch creation.

Investigation lanes:

- Authority cartographer: completed. The safe proof is two narrow contained
  simulation proofs: dispatcher operation inventory and async owner-to-step
  membership artifacts.
- Implementation seam reviewer: completed. The smallest seam is
  `src/spine/derive.ts` plus middle-spine tests; mini-runtime and public
  authoring APIs stay unchanged.
- Testing/evidence auditor: completed. Required oracles are explicit dispatcher
  operation preservation, workflow refs inert without operations, unlisted
  workflow operation diagnostics, one-owner async membership, duplicate/widened
  membership diagnostics, and no descriptor body execution during derivation.

Phase teams:

- Opening: host-only, because the branch had to start with the workstream packet
  and the first content mutation is this report.
- Investigation/design: three read-only agents, because authority, seam, and
  evidence questions were independent.
- Implementation: host-owned, because the accepted write surface was a narrow
  derivation seam plus focused fixtures/tests.
- Semantic comment review: one trailing reviewer after TypeScript edits.

Design lock:

- Locked to explicit lab derivation artifacts only:
  - non-empty `WorkflowDispatcherDerivationInput.operations` is explicit
    dispatcher operation inventory;
  - dispatcher workflow refs without operations remain inert inventory and keep
    the reserved-access diagnostic;
  - dispatcher operations that target undeclared workflow refs emit a diagnostic;
  - async step refs carry owner membership through exactly one of
    `workflowId`, `scheduleId`, or `consumerId` plus `stepId`;
  - widened invalid owner sets and duplicate owner/step memberships emit
    diagnostics;
  - descriptor bodies are not executed during derivation.
- No public dispatcher API, async authoring metadata channel, durable semantics,
  or mini-runtime dispatch materialization was chosen.

Implementation summary:

- Added widened async owner extraction and membership diagnostics in
  `src/spine/derive.ts`.
- Changed dispatcher derivation so operations are preserved when explicitly
  declared, workflow refs alone do not imply dispatcher access, and operations
  targeting undeclared workflows are diagnosed.
- Added semantic comments on widened membership validation, inert workflow refs,
  and proof-only membership checking.
- Added focused middle-spine tests for dispatcher operation inventory, inert
  workflow refs, unlisted workflow diagnostics, no async body execution during
  membership derivation, duplicate async memberships, and widened invalid async
  owner inputs.
- Added a negative descriptor-ref fixture for a missing async owner.
- Updated manifest, focus log, diagnostic, spine audit map, and research program
  wording with two narrow `simulation-proof` entries while leaving public-law
  audit entries fenced.

Semantic JSDoc/comment trailing pass:

- Failed first pass: reviewer requested comments at the widened async owner
  seam, dispatcher operation/inventory seam, and proof-only membership check.
- Repaired: added all three comments before evidence promotion.

Verification:

- Passed: `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`.
- Passed: `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Passed: `bunx nx run runtime-realization-type-env:negative`.
- Passed: `bunx nx run runtime-realization-type-env:middle-spine`.
- Passed: `bunx nx run runtime-realization-type-env:structural`.
- Passed: `bunx nx run runtime-realization-type-env:report`.
- Passed: `bunx nx run runtime-realization-type-env:gate`.
- Passed: `bun run runtime-realization:type-env`.
- Passed: `git diff --check`.

Review loops:

- Leaf loops completed before closeout.
- Parent loops completed after evidence updates and composed gates.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Dispatcher workflow refs were previously always reported as unresolved access. | `deriveWorkflowDispatcherDescriptors` emitted `runtime.dispatcher-access.reserved` even when operations were explicitly declared. | Treat non-empty operations as explicit lab operation inventory; keep refs inert when operations are absent. | High |
| Async membership was previously only implied by explicit async refs plus a reserved diagnostic. | `deriveNegativeSpaceDiagnostics` emitted `runtime.async-step-membership.reserved` for every async ref. | Validate exactly one owner and duplicate owner/step membership without executing bodies. | High |
| The final public laws are still larger than the contained proof. | Canonical spec leaves public dispatcher/membership details and durable semantics outside the lab seam. | Added narrow simulation entries and kept `audit.p0.async-step-membership` and `audit.p1.dispatcher-access` as `xfail`. | High |

## Report

Proof promotions:

- Added `simulation.dispatcher-descriptor-operation-inventory` as contained
  `simulation-proof`.
- Added `simulation.async-step-owner-membership-artifacts` as contained
  `simulation-proof`.

Proof non-promotions:

- Durable async semantics, real Inngest lowering, production dispatcher policy,
  and public authoring API remain fenced unless explicitly accepted.
- `audit.p0.async-step-membership` remains `xfail` for final public membership
  metadata syntax.
- `audit.p1.dispatcher-access` remains `xfail` for final explicit-vs-ambient
  policy and SDK/DX shape.
- `audit.p2.async-effect-bridge-lowering` remains `xfail`; this workstream did
  not lower native async host callbacks or prove durable semantics.

Diagnostic changes:

- `proof-manifest.json`: current experiment updated; two new simulation entries
  added; public-law audit oracles narrowed to final-law negative space.
- `focus-log.md`: updated to dispatcher/access async membership experiment.
- `runtime-spine-verification-diagnostic.md`: SDK derivation and Async/Inngest
  rows now record dispatcher operation inventory and explicit membership
  artifacts while fencing final policy/syntax/durable behavior.
- `spine-audit-map.md`: middle-spine row and P0/P1 rows updated to distinguish
  contained proof from public-law `xfail`.
- `runtime-realization-research-program.md`: negative-space ledger updated for
  consumed proof and remaining public-law blockers.

Spec feedback:

- The spec already distinguishes dispatcher descriptors, live dispatcher
  materialization, and async `FunctionBundle` lowering. This workstream verified
  the descriptor/membership precursor only.
- The final dispatcher access policy and final async membership metadata channel
  remain architecture decisions.

Test-theater removals or downgrades:

- Removed the broad implication that any async step ref means unresolved
  membership. The lab now proves explicit owner/step artifacts, while public
  authoring syntax remains fenced.
- Avoided promoting fake callback delegation, vendor Inngest shapes, or
  dispatcher operation inventory into durable async or live dispatcher proof.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Async step membership | `xfail` | Workflow/schedule/consumer-to-step ownership must become declarative before proof. | `proof-manifest.json` entry `audit.p0.async-step-membership` and canonical async spec sections. | The lab can represent membership without executing workflow bodies or deciding durable semantics. | Async bridge lowering would otherwise infer membership from executable bodies or conventions. | Dispatcher Access + Async Step Membership. | spec |
| Dispatcher access policy | `xfail` | Dispatcher operation descriptors currently record inventory but do not decide access policy. | `proof-manifest.json` entry `audit.p1.dispatcher-access`. | The lab can state explicit dispatcher access declaration without changing public authoring API or deciding durable semantics. | Server/async work wants workflow dispatcher operations. | Dispatcher Access + Async Step Membership. | spec |
| Async Effect bridge lowering | `xfail` | Bridge lowering depends on accepted membership/access artifacts first. | `proof-manifest.json` entry `audit.p2.async-effect-bridge-lowering`. | Membership and dispatcher access are proven enough for bridge lowering to consume refs. | Real adapter/async bridge work starts. | Real Adapter Callback + Async Bridge Lowering. | lab/spec |

## Review Result

Leaf loops:

- Containment: passed; all edits stayed under
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed; structural/sync and Nx targets passed.
- Type/negative: passed; typecheck and negative fixtures preserve async
  descriptor discriminants.
- Semantic JSDoc/comments: passed after repair.
- Vendor: no new vendor claim; vendor gates passed as part of composed gate.
- Mini-runtime: no implementation change; mini-runtime gate passed as regression
  coverage.
- Manifest/report: passed; report prints new focus and simulation entries.

Parent loops:

- Architecture: passed with final dispatcher policy, public membership syntax,
  durable semantics, and harness mounting fenced.
- Migration derivability: passed as descriptor/membership precursor evidence,
  not production async readiness.
- DX/API/TypeScript: passed; no public authoring API or exported public law was
  changed.
- Workstream lifecycle/process: passed; packet opened first, phase team ran,
  semantic comments trailed edits, gates recorded, next packet retained.
- Adversarial evidence honesty: passed; proof claims are contained and
  simulation-only.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None. |  |  |  |  |  |

Invalidations:

- None yet.

Repair demands:

- Semantic reviewer required three boundary comments in `src/spine/derive.ts`;
  repaired.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None yet. |  |  |  |

## Final Output

Artifacts:

- `src/spine/derive.ts`
- `fixtures/inline-negative/descriptor-refs.ts`
- `test/middle-spine-derivation.test.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/runtime-realization-research-program.md`
- `evidence/workstreams/2026-04-30-dispatcher-access-async-step-membership.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`

Repo/Graphite state:

- Current branch: `codex/runtime-dispatcher-async-membership`.
- Submitted through Graphite as PR #263 on
  `codex/runtime-dispatcher-async-membership`; final local status was clean and
  GitHub reported only `Graphite / mergeability_check` in progress.

## Next Workstream Packet

Recommended next workstream:

- Server Route Derivation, unless dispatcher/async membership proof discovers a
  dependency inversion or opens a required async bridge precursor.

Why this is next:

- Server route derivation is the remaining route-side prerequisite before real
  adapter callback lowering and first server harness mounts.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../../src/spine/derive.ts`
- `../../src/spine/artifacts.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.p2.server-route-derivation`
- any dispatcher/access or async membership residuals from this workstream
