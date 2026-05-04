# ProviderEffectPlan -> Bootgraph/Provisioning Lowering

Status: closed.
Branch: `codex/runtime-research-program-dra-stewardship`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/260.
Commit: Graphite branch tip for this workstream.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority. This draft opens the nested workstream under the DRA
runtime research program workflow.

## Frame

Objective: replace fake provider lifecycle proof with minimal provider
acquire/release lowering through RAWR-owned mini bootgraph/provisioning and real
Effect-backed execution.

Containment boundary:

- All implementation must stay under `tools/runtime-realization-type-env/**`.
- Evidence changes must stay under `tools/runtime-realization-type-env/evidence/**`.
- No production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code may be
  imported or promoted.
- Simulation proof and vendor proof must not be treated as production runtime
  readiness.

Non-goals:

- Do not decide the final public `ProviderEffectPlan` producer/consumer API.
- Do not decide retry, refresh, timeout, interruption, error taxonomy, or the
  full boundary policy matrix.
- Do not decide typed runtime config binding, config source precedence, platform
  secret stores, or redacted config snapshots.
- Do not prove telemetry export, catalog persistence, production providers,
  real harness mounting, durable async semantics, package topology, or migration
  implementation.
- Do not promote final `RuntimeResourceAccess` method law.

## Opening Packet

Opening input:

- User control input: implement the DRA runtime-realization research program
  plan.
- DRA workflow document:
  `../dra-runtime-research-program-workflow.md`.
- Program recommendation: make `ProviderEffectPlan -> Bootgraph/Provisioning
  Lowering` the next domino after middle-spine verification.

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`
- canonical runtime spec pinned by `../proof-manifest.json`:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Coordination inputs:

- `../runtime-realization-research-program.md`
- `../phased-agent-verification-workflow.md`
- `../dra-runtime-research-program-workflow.md`

Evidence inputs:

- `2026-04-30-middle-spine-verification.md`
- `../../src/spine/artifacts.ts`
- `../../src/spine/compiler.ts`
- `../../src/spine/derive.ts`
- `../../src/mini-runtime/bootgraph.ts`
- `../../src/mini-runtime/managed-runtime.ts`
- `../../src/mini-runtime/provider-lowering.ts`
- `../../src/sdk/runtime/providers.ts`
- `../../fixtures/todo/provider-effect-plan-shape.todo.ts`
- `../../fixtures/todo/provider-effect-plan-lowering.todo.ts`
- `../../fixtures/todo/effect-managed-runtime-substrate.todo.ts`
- `../../test/mini-runtime/process-runtime.test.ts`

Excluded or stale inputs:

- Quarantined migration plans are provenance only.
- Vendor proof is useful only for installed dependency behavior, not RAWR
  runtime proof.
- Existing `lowerOpaqueProviderPlan(...)` is an explicit experiment and must not
  be treated as proof.

Control inputs:

- Sequence may change only through accepted architecture decision, failed proof
  gate, parent-review invalidation, spec hash drift, Graphite/PR blocker,
  discovered dependency inversion, or user control input.

Selected skill lenses:

- `graphite`: branch and stack hygiene.
- `nx-workspace`: project/target truth.
- `target-authority-migration`: target spec wins over current lab substrate.
- `architecture`: lifecycle separation and decision-packet triggers.
- `testing-design`: falsifiable acquire/release/rollback/finalization oracles.
- `team-design`: phase-scoped agent lanes and host accountability.
- `system-design`: feedback loops, invalidation, and second-order effects.
- `typescript`: public-surface opacity and type/runtime alignment.
- `information-design`: report and compaction recovery shape.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-middle-spine-verification.md`.

Prior final output accepted:

- Middle-spine derivation/compiler, fake bootgraph/catalog/finalization,
  runtime access/cache, adapter delegation, and deployment handoff earned
  contained simulation-level confidence only.

Deferred items consumed:

- `audit.p1.provider-effect-plan-shape`
- `audit.p1.provider-effect-plan-lowering`
- `audit.p1.effect-managed-runtime-substrate`

Deferred items explicitly left fenced:

- Runtime profile config redaction.
- Effect boundary policy matrix.
- Safe Effect composition surface.
- RuntimeResourceAccess method law.
- Dispatcher access.
- Async step membership.
- Server route derivation.
- Real adapter callback and async bridge lowering.
- First resource provider cut.
- Telemetry export, catalog persistence, deployment placement.

Repair demands consumed:

- Provider identity must retain resource, lifetime, role, and instance.
- Adapter/runtime proof must not collapse lifecycle phases.
- Proof language must not overpromote vendor or simulation evidence.

Next packet changes:

- The DRA workflow document is now the compaction-safe program frame.
- This workstream narrows only provider acquire/release lowering.

Invalidations from prior assumptions:

- Existing provider-lowering experiment is invalid as proof because it injects a
  value rather than lowering provider acquire/release hooks through bootgraph and
  managed Effect runtime.

## Output Contract

Required outputs:

- Contained provider provisioning/lowering behavior under
  `tools/runtime-realization-type-env/**`.
- Public `ProviderEffectPlan` remains opaque to normal SDK consumers.
- Any acquire/release payload storage or reader is lab-internal and non-public.
- Provider modules are bootgraph/provisioning modules, not
  `CompiledExecutionPlan` or `ProcessExecutionRuntime` work.
- Full provider identity is preserved: resource id, provider id, lifetime, role,
  and instance.
- Provider dependency order, acquire success, rollback/release on failure,
  reverse finalization, release-failure recording, and redacted diagnostics are
  proved by tests.
- Manifest, diagnostic, spine map, focus log, and report are updated only to
  earned proof strength.

Optional outputs:

- Dedicated focused provider provisioning test file if it reduces risk better
  than expanding `process-runtime.test.ts`.
- Structural guard update if a new focused test target or required evidence
  artifact is added.

Target proof strength:

- `simulation-proof` for `audit.p1.provider-effect-plan-lowering` only if the
  RAWR-owned mini-runtime path consumes provider acquire/release hooks through
  bootgraph/provisioning with real Effect execution.
- `audit.p1.provider-effect-plan-shape` remains `xfail` unless only a private
  lab-internal shape is recorded as implementation detail and the final public
  shape remains explicitly unresolved.
- `audit.p1.effect-managed-runtime-substrate` remains `xfail` unless the
  workstream proves only a contained process-owned runtime path without locking
  final RAWR substrate API.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused provider provisioning test or `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
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

- Choosing final public `ProviderEffectPlan` fields, names, helper API, or
  consumer contract.
- Changing public authoring API or Effect facade shape.
- Deciding provider retry, refresh, timeout, interruption, error policy, config
  binding, secret source precedence, redaction metadata, managed-runtime handle
  API, or final `RuntimeResourceAccess` law.
- Importing production `apps/*`, `packages/*`, `services/*`, or `plugins/*`.
- Treating vendor proof or mini-runtime proof as production readiness.
- Changing lifecycle order, ownership boundaries, package topology, or migration
  sequence.

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

- Verified clean branch state on `codex/runtime-workstream-coordination-program`.
- Created `codex/runtime-research-program-dra-stewardship` above that branch
  with Graphite.
- Verified PR #259 is open, not draft, and Graphite mergeability remains in
  progress.
- Verified Nx project truth and pinned spec hash.

Investigation lanes:

- Authority cartographer: spec sections 12, 14, 15, 20, 21, 24, 26 plus
  manifest/diagnostic and prior report.
- Implementation seam reviewer: lab-only plan internals, provider keying,
  dependency value flow, managed runtime ownership.
- Mechanical verifier: Nx target coverage, structural guard, forbidden imports,
  no public alias/export leak.
- Testing/evidence auditor: acquire/release, rollback, release-failure,
  redaction, dependency-order oracles.
- DX/API TypeScript reviewer: public opacity and inference quality.
- Adversarial reviewer: hidden final API choices, simulation overclaim,
  config/telemetry overreach, provider identity collapse.

Phase teams:

- Opening: host-only; prior planning agents already provided independent review.
- Implementation: host plus bounded workers only where a code slice is
  independent and can be verified.
- Review: fresh default agents where independent architecture/evidence/DX
  judgment materially improves confidence.

Design lock:

- Use a lab-internal non-public plan payload reader if necessary.
- Normalize acquire/release hooks into `RawrEffect`.
- Lower provider modules into mini bootgraph/provisioning.
- Use test-only config/dependency inputs; do not solve typed config binding.

Implementation summary:

- Added a lab-internal `ProviderEffectPlan` internals store that records
  acquire/release hooks created by `providerFx.acquireRelease(...)` and
  `providerFx.tryAcquire(...)` without adding a public alias or re-export.
- Replaced the previous `lowerOpaqueProviderPlan(...)` experiment with
  provider provisioning modules that preserve full provider identity and lower
  selected providers into mini bootgraph modules.
- Extended provider dependency graph edges with exact source and matched
  provider keys so bootgraph dependencies are driven by graph output rather
  than by provider id/resource id alone.
- Made provisioning fail closed before module construction when provider graph
  diagnostics are present.
- Extended mini bootgraph module context with dependency values so provider
  acquire can receive previously provisioned resource values.
- Added focused provider-provisioning tests for acquire success, dependency
  order, scoped lifetime/role/instance dependency matching, graph diagnostic
  fail-closed behavior, dependency value flow, rollback/release on failed
  acquire, reverse finalization, release-failure recording, full identity
  preservation, redacted catalog records, and unlowerable plan failure.
- Updated the mini-runtime target to run the full focused directory.
- Updated manifest, diagnostic, focus log, spine audit map, integration map,
  and program ledger to promote provider lowering only to contained
  `simulation-proof`.

Semantic JSDoc/comment trailing pass:

- Passed after process repair. A trailing semantic reviewer identified the
  missing lane and reviewed the provider-internals/provisioning seams. Comments
  were added only where they preserve lab-internal status, lifecycle/proof
  boundary, identity-preservation, and dependency-value meaning.

Verification:

- Passed: `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`.
- Passed: `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`.
- Passed: `bunx nx run runtime-realization-type-env:mini-runtime`.
- Passed: `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`.
- Passed: `bunx nx run runtime-realization-type-env:negative`.
- Passed: `bunx nx run runtime-realization-type-env:report`.
- Passed: `bunx nx run runtime-realization-type-env:structural`.
- Passed after graph-handoff repair:
  `bunx nx run runtime-realization-type-env:gate`.
- Passed after graph-handoff repair: `bun run runtime-realization:type-env`.
- Passed after report closeout text only: `git diff --check`.
- Pending: final Git and Graphite status after commit/submit.

Review loops:

- Mechanical/DX peer review found three risks:
  scoped dependency fan-out by provider/resource only, default managed runtime
  disposal, and typed provider error erasure.
- Architecture/evidence peer review found three risks:
  provisioning bypassed graph diagnostics, proof promotion was ahead of report
  closeout, and deferred inventory was incomplete.
- Host accepted and repaired the scoped dependency fan-out, graph diagnostics
  fail-closed behavior, graph-to-bootgraph handoff, default runtime disposal
  risk, report closeout ordering, and deferred inventory completeness.
- Host left typed provider error erasure as a residual non-promotion under final
  `ProviderEffectPlan` shape and boundary policy because fixing it would choose
  public/final provider error API.

## Claim Ledger

| Claim | Lifecycle phase | Authority source | Proof category | Oracle | Gate | Non-proof boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Provider plan lowering belongs to bootgraph/provisioning, not process execution. | provisioning | canonical spec sections 12, 14, 15 | target `simulation-proof` | removing bootgraph/provisioning lowering breaks acquire/release tests | mini-runtime/focused provider test | not production runtime readiness |
| Provider identity preserves resource, provider, lifetime, role, and instance. | compilation/provisioning | prior report repair demand, diagnostic | target `simulation-proof` | collapsing key fields causes dependency/order/catalog assertions to fail | middle-spine/mini-runtime | not final identity string format |
| Provider dependency graph diagnostics and exact matched keys gate provisioning. | compilation/provisioning | canonical spec sections 13, 15, 24 | target `simulation-proof` | graph diagnostics throw before modules and scoped matched keys drive bootgraph dependencies | middle-spine/mini-runtime | not final production compiler or bootgraph integration |
| Provider release runs on rollback and finalization. | provisioning/observation | canonical spec section 15 | target `simulation-proof` | failed acquire rolls back started providers and normal finalize releases in reverse order | mini-runtime | not full Effect boundary policy |
| Provider lifecycle records are redacted and contain no live handles. | observation | canonical spec sections 20 and 21 | target `simulation-proof` | secret/live handle sentinel appears in catalog/diagnostics | mini-runtime/report | not telemetry export or catalog persistence |
| Final public `ProviderEffectPlan` shape remains unresolved. | definition/provisioning | manifest xfail | `xfail` | proof cannot require public fields or API names | structural/type review | no public API decision |

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Existing `lowerOpaqueProviderPlan(...)` is an experiment, not proof. | `src/mini-runtime/provider-lowering.ts`, `test/mini-runtime/process-runtime.test.ts` | Replace or supersede with real lab lowering. | high |
| Compiler currently records provider module refs but says provider lowering is reserved. | `src/spine/compiler.ts` diagnostic `runtime.provider-effect-plan.lowering-reserved` | Update only if earned by new simulation proof. | high |
| Provider plan shape and lowering are separate manifest entries. | `proof-manifest.json` | Promote lowering, keep public shape fenced unless a user-owned decision happens. | high |
| Review found graph handoff and scoped dependency bugs. | peer architecture and mechanical review | Fixed by carrying exact source/matched provider keys in graph edges, consuming graph edges for dependencies, and failing closed on graph diagnostics. | high |

## Report

Proof promotions:

- `audit.p1.provider-effect-plan-lowering` moved from `xfail` to
  `simulation-proof` after focused and composed gates covered graph diagnostics,
  graph-driven dependency ordering, acquire/release, rollback, finalization,
  release-failure recording, identity preservation, and redaction.

Proof non-promotions:

- Final public `ProviderEffectPlan` shape remains `xfail`.
- Typed provider error propagation remains fenced with final public
  `ProviderEffectPlan` shape and boundary policy; the current proof exercises
  failure behavior at runtime but does not lock the public type-level error API.
- `audit.p1.effect-managed-runtime-substrate` remains `xfail`; the workstream
  used internal `EffectRuntimeAccess` but did not lock final substrate API or
  lifecycle ownership names.
- Runtime profile config redaction remains `todo`; the catalog redaction guard
  proves no raw secret/live handle leakage from current metadata, not typed
  config-source binding or redacted config snapshots.
- Production bootgraph, production providers, real harness mounting, telemetry
  export, and catalog persistence remain unproven.

Diagnostic changes:

- `runtime-spine-verification-diagnostic.md` now records provider acquire/release
  lowering as contained mini-runtime evidence while keeping the component
  yellow for final plan shape, config binding, policy, and production
  integration.
- `spine-audit-map.md`, `effect-integration-map.md`, `focus-log.md`, and
  `runtime-realization-research-program.md` were updated to reflect the same
  proof boundary.

Spec feedback:

- The lab could prove acquire/release lowering with private internals, but the
  final public `ProviderEffectPlan` shape still needs an architecture decision
  before production SDK/API promotion.

Test-theater removals or downgrades:

- Removed the old test that proved only `lowerOpaqueProviderPlan(...)` plus an
  injected value. That was an explicit experiment, not provider lifecycle
  lowering proof.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `audit.p1.provider-effect-plan-shape` | `xfail` | Final public acquire/release payload, error, telemetry, policy metadata, and lowering fields are user-owned architecture. | Manifest, diagnostic, todo fixtures, research program. | User accepts final public producer/consumer shape or spec is patched. | Public API or production runtime work needs public fields instead of private internals. | Spec decision packet or Boundary Policy Matrix | spec |
| `audit.p1.effect-managed-runtime-substrate` | `xfail` | Vendor behavior and contained provider execution are proven, but final RAWR-owned substrate contract remains open. | Manifest, spine map, todo fixture, research program. | Harness or boundary policy work needs named runtime-substrate lifecycle/API commitments. | Provider, harness, or policy proof needs substrate names beyond internal `EffectRuntimeAccess`. | Boundary Policy Matrix or First Real Harness Mounts | lab/spec |
| `audit.p1.process-local-coordination-resources` | `xfail` | Vendor primitives are local only; final RAWR resource contracts remain open. | Manifest, spine map, todo fixture, research program. | A workstream chooses which queues/pubsub/cache/concurrency values are sanctioned runtime resources. | Runtime access or provider lowering needs queues/pubsub/cache/concurrency as sanctioned runtime resources. | RuntimeResourceAccess Law + Service Binding DAG | lab/spec |
| `audit.p2.runtime-profile-config-redaction` | `todo` | Typed config binding and diagnostic-safe secret emission are not locked. | Manifest, diagnostic, spine map, research program. | Provider acquisition emits config-bearing diagnostics or snapshots. | Provider acquire/release emits diagnostics or config snapshots. | Provider Diagnostics + Runtime Profile Config Redaction | lab/spec |
| `audit.p1.effect-boundary-policy-matrix` | `xfail` | Timeout, retry, interruption, telemetry, redaction, and error/exit mapping need locked metadata. | Manifest, diagnostic, todo fixture, research program. | Provider/harness proof reaches observable boundary defaults. | Provider proof would otherwise choose default policy. | Boundary Policy Matrix | spec |
| `audit.p1.safe-effect-composition-surface` | `xfail` | Curated helper list and names remain open beyond the proven current facade. | Manifest, spine map, todo fixture, research program. | Public or pseudo-public authoring code needs a stable helper set or DX simplification. | Public/DX review finds Effect authoring ceremony or capability loss. | Boundary Policy Matrix | spec |
| `audit.p1.runtime-resource-access` | `xfail` | Mini runtime proves a narrow facade, but final method law is not locked. | Manifest, diagnostic, todo fixture, research program. | Provisioned resources exist in the lab and service binding needs final access methods. | Service binding or adapters need final access semantics. | RuntimeResourceAccess Law + Service Binding DAG | spec |
| `audit.p1.dispatcher-access` | `xfail` | Dispatcher operation descriptors need explicit access policy. | Manifest, diagnostic, todo fixture, research program. | Async/server work has concrete dispatcher operations to classify as ambient, explicit, or disallowed. | Async or server plan wants workflow dispatcher operations. | Dispatcher Access + Async Step Membership | spec |
| `audit.p0.async-step-membership` | `xfail` | Workflow/schedule/consumer-to-step ownership must be declarative before proof. | Manifest, diagnostic, todo fixture, research program. | Dispatcher/access policy can name declarative step ownership without executing bodies. | Async bridge proof would otherwise infer membership by executing bodies or convention. | Dispatcher Access + Async Step Membership | spec |
| `audit.p2.server-route-derivation` | `xfail` | Cold route factory derivation mechanics need a stated import-safety rule. | Manifest, diagnostic, todo fixture, research program. | Server adapter proof requires route callbacks and can state import-safety without production Elysia mounting. | Server adapter proof would otherwise execute or infer route factories unsafely. | Server Route Derivation | spec |
| `audit.p2.adapter-effect-callback-lowering` | `xfail` | Fake callbacks prove delegation; real native callback lowering remains open. | Manifest, diagnostic, todo fixture, research program. | Server route derivation and runtime access law are stable enough for real callback payloads. | Fake adapter proof becomes insufficient for real harness mounting. | Real Adapter Callback + Async Bridge Lowering | lab/spec |
| `audit.p2.async-effect-bridge-lowering` | `xfail` | Async bridge needs step membership and dispatcher access decisions first. | Manifest, diagnostic, todo fixture, research program. | Async membership/access decisions are accepted. | Async host proof would otherwise be theater. | Real Adapter Callback + Async Bridge Lowering | lab/spec |
| `audit.p2.first-resource-provider-cut` | `todo` | Catalog candidates are planning input, not canonical ids. | Manifest, spine map, research program. | Provider diagnostics need representative standard resources beyond fixture-only ids. | Provider diagnostics need a resource set that is no longer fixture inventory only. | Provider Diagnostics + Runtime Profile Config Redaction | lab/spec |
| Telemetry export and catalog persistence | out-of-scope for this workstream | In-memory records prove hooks and redaction only. | Diagnostic, spine map, research program. | Production observation work chooses export/persistence/correlation boundaries. | Runtime observation needs durable storage or product export. | Migration/Control-Plane Observation | migration |
| Deployment placement/control-plane semantics | out-of-scope for this workstream | Deployment handoff remains compile-only simulation. | Diagnostic, spine map, research program. | Runtime-emitted records are ready to be consumed by deployment/control-plane work. | Migration/control-plane agents need placement semantics. | Migration/Control-Plane Observation | migration |
| Production provider bootgraph integration | out-of-scope for this workstream | The proof target was the contained mini bootgraph path, not production harness or compiler integration. | Diagnostic, spine map, research program. | First real harness/production bootgraph work consumes provider provisioning output. | A production harness tries to mount provider-acquired resources. | First Real Harness Mounts | migration |

## Review Result

Leaf loops:

- Containment: passed. All code/test/evidence changes are under
  `tools/runtime-realization-type-env/**`; no production app/package/service or
  plugin imports were added.
- Mechanical: passed after repair. Nx target now runs the full mini-runtime test
  directory; structural guard whitelists the private plan-internals raw Effect
  use explicitly.
- Type/negative: passed. Typecheck and negative fixtures passed; typed provider
  error API remains fenced rather than promoted.
- Semantic JSDoc/comments: passed after process repair. The private
  `ProviderEffectPlan` internals bridge, provider boot resource identity,
  dependency value context, provider graph gate, and provisioning module lowering
  now carry bounded semantic comments; no comments were added for obvious
  mechanics.
- Vendor: passed. Vendor Effect and boundary gates still pass; this workstream
  did not promote vendor proof to production runtime proof.
- Mini-runtime: passed. Focused provider tests and full mini-runtime target
  passed with acquire/release, graph diagnostics, graph-driven dependencies,
  rollback, finalization, and redaction coverage.
- Manifest/report: passed after repair. Proof manifest, focus log, diagnostic,
  spine map, effect map, program ledger, and this report agree on contained
  `simulation-proof` only.

Parent loops:

- Architecture: passed after repair. Provider lowering stays in provisioning,
  final public plan shape remains fenced, and provider graph diagnostics now
  fail closed before provisioning.
- Migration derivability: passed. The proof de-risks graph-to-bootgraph
  provider lifecycle lowering, but production harness and migration semantics
  remain explicit negative space.
- DX/API/TypeScript: passed with residual risk. No public
  `provider-plan-internals` alias/export was added; typed provider error
  inference remains a final API/boundary-policy question.
- Workstream lifecycle/process: passed after this closeout. The report records
  opening packet, implementation, review invalidations, repairs, verification,
  deferred inventory, and next packet.
- Adversarial evidence honesty: passed after repair. The false-green risks
  identified by review were either fixed or explicitly kept fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None yet. |  |  |  |  |  |

Invalidations:

- Existing `lowerOpaqueProviderPlan(...)` experiment cannot promote provider
  lowering proof by itself.
- Initial provider-lowering proof was invalidated by peer review because it
  recomputed dependencies by provider/resource and bypassed graph diagnostics.
  The fix added exact graph edge keys, graph-driven dependency construction, and
  diagnostic fail-closed behavior, then reran the focused and composed gates.

Repair demands:

- Fixed: scoped provider dependencies cannot fan out across lifetime, role, or
  instance.
- Fixed: provider graph diagnostics stop provisioning before module
  construction.
- Fixed: graph output now carries exact source/matched provider keys and drives
  bootgraph dependency IDs.
- Fixed: default provider lowering runtime no longer allocates a managed
  runtime without an owned disposal path.
- Fixed: deferred inventory now carries the broader negative-space set forward.
- Fenced: typed provider failure inference remains with final public
  `ProviderEffectPlan` shape and boundary policy.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Private provider internals live under `src/sdk/runtime`. | Future agents could mistake this for public SDK shape. | Keep no path alias/barrel export and keep structural guard explicit; revisit only through a provider-plan shape decision packet. | Spec decision packet or Boundary Policy Matrix |
| Substantial TypeScript/runtime edits did not originally have a dedicated semantic-comment lane. | Future agents could miss private seams, proof-only boundaries, or lifecycle invariants that are not obvious from names and types. | Add a trailing semantic JSDoc/comment reviewer to the DRA workflow, phase workflow, and workstream template; record the result in each affected report. | DRA workflow and all future TS/runtime-heavy workstreams |

## Final Output

Artifacts:

- `evidence/dra-runtime-research-program-workflow.md`
- `evidence/phased-agent-verification-workflow.md`
- `evidence/workstreams/README.md`
- `evidence/workstreams/TEMPLATE.md`
- `evidence/workstreams/2026-04-30-provider-effect-plan-bootgraph-provisioning-lowering.md`
- `src/sdk/runtime/provider-plan-internals.ts`
- `src/sdk/runtime/providers.ts`
- `src/spine/artifacts.ts`
- `src/spine/derive.ts`
- `src/spine/compiler.ts`
- `src/mini-runtime/bootgraph.ts`
- `src/mini-runtime/provider-lowering.ts`
- `test/mini-runtime/provider-provisioning.test.ts`
- `test/mini-runtime/process-runtime.test.ts`
- `test/middle-spine-derivation.test.ts`
- evidence updates in manifest, diagnostic, focus log, spine map, effect map,
  and research program ledger.

Verification run:

- `bun test tools/runtime-realization-type-env/test/mini-runtime/provider-provisioning.test.ts`
- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`

Repo/Graphite state:

- Submitted through Graphite as PR #260 on
  `codex/runtime-research-program-dra-stewardship`; final status after submit
  was clean with Graphite mergeability check in progress.

## Next Workstream Packet

Recommended next workstream:

- Provider Diagnostics + Runtime Profile Config Redaction.

Why this is next:

- Provider lowering will expose provider config and lifecycle diagnostics enough
  to test redaction and no-leakage without solving config precedence or
  production secret stores.

Required first reads:

- `../dra-runtime-research-program-workflow.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- this report after closeout
- provider provisioning implementation and tests from this workstream

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.p2.runtime-profile-config-redaction`
- any provider diagnostics/redaction residuals from this workstream
- typed provider error residuals if diagnostics/redaction needs error payloads
- private provider internals process-tension note if public shape pressure
  appears
