# Middle-Spine Verification Burn-Down

Status: closed and submitted as PR #258.
Branch: `codex/runtime-middle-spine-verification`.
Commit: `6cef86bc`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/258

This report is informative. It captures the completed lab workstream so the next
burn-down can start from the earned evidence instead of reconstructing the
session from chat history.

## Frame

Objective: prove the already-specified middle runtime spine inside the contained
runtime-realization lab, while keeping unresolved runtime design explicitly
fenced as negative space.

Containment boundary:

- All implementation stayed under `tools/runtime-realization-type-env/**`.
- Evidence changes stayed in `tools/runtime-realization-type-env/evidence/**`.
- No production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code was
  imported or promoted.
- Simulation proof and vendor proof were not treated as production runtime
  readiness.

Non-goals:

- Do not decide `ProviderEffectPlan` shape/lowering.
- Do not decide async step membership or dispatcher access declaration.
- Do not prove cold server route derivation.
- Do not mount real Elysia, Inngest, OCLIF, web, agent, or desktop harnesses.
- Do not prove durable scheduling, telemetry export, catalog persistence, or
  deployment placement.

## Opening Packet

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
- `../middle-spine-verification-work-plan.md`
- `../phased-agent-verification-workflow.md`

Inputs treated as non-authority or limited evidence:

- vendor proof: useful dependency-shape evidence, not RAWR runtime proof;
- simulation proof: contained mini-runtime evidence, not production readiness;
- quarantined migration plans: directional provenance only;
- positive fixtures: proof only when backed by gates and manifest entries.

Control inputs:

- User-approved implementation plan for the middle-spine verification
  burn-down.
- User correction that default peer agents should be used for judgment/review
  and that host review must reason about agent output rather than accepting
  shape-only work.

Selected skill lenses:

- `architecture`: lifecycle separation, authority order, and negative-space
  preservation.
- `testing-design`: falsifiable oracles and test-theater checks.
- `team-design`: peer-agent review roles and host accountability.
- `nx-workspace` and `graphite`: project truth and branch/stack hygiene.

## Prior Workstream Assimilation

Previous report consumed: none. This was the first durable workstream report
for the runtime-realization lab.

Prior final output accepted or rejected: none.

Deferred items consumed: none.

Deferred items explicitly left fenced: the negative-space items listed below in
the deferred inventory.

Repair demands consumed: none from a prior durable report.

Next packet changes: none from a prior durable report.

Invalidations from prior assumptions: none from a prior durable report.

## Output Contract

Required outputs:

- persisted middle-spine work plan;
- contained SDK derivation/compiler simulation;
- bootgraph/catalog/finalization simulation;
- runtime access and service binding cache proof;
- adapter delegation proof;
- deployment handoff boundary proof;
- evidence docs updated only to earned proof strength;
- focused tests and full lab gate passing;
- PR submitted through Graphite.

Optional outputs:

- review findings and accepted residual risks captured for the next workstream.

Target proof strength:

- `simulation-proof` for middle-spine derivation/compiler, bootgraph/catalog,
  runtime access/cache, adapter delegation, and deployment handoff;
- no production runtime readiness claim.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bun tools/runtime-realization-type-env/scripts/assert-negative-types.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

## Acceptance / Closure Criteria

The workstream could close only when:

- required outputs existed inside `tools/runtime-realization-type-env/**`;
- no production imports, workspace promotion, or root gate drift were introduced;
- proof entries named gates and matched diagnostic language;
- negative space remained fenced in the manifest/diagnostic/todo fixtures with
  authority homes, unblock conditions, and re-entry triggers;
- focused gates and the composed lab gate passed;
- peer review findings were addressed or recorded as residual risk;
- PR and Graphite state were recorded;
- the next workstream packet identified one highest-leverage next action.

## Workflow

Preflight:

- Verified Graphite branch/worktree state.
- Verified Nx project surface with
  `bunx nx show project runtime-realization-type-env --json`.
- Verified pinned spec authority hash through the structural gate.

Implementation order:

1. Added the persisted work plan.
2. Added explicit lab derivation and compiler slices.
3. Added fake bootgraph, lifecycle catalog, runtime access, service binding
   cache, adapter delegation, and deployment handoff validation.
4. Added positive and negative tests around the accepted shapes.
5. Updated manifest, focus log, spine map, diagnostic, and structural target
   wiring only to the proof strength earned.

Review lenses:

- mechanical: paths, imports, Nx target wiring, structural guard;
- architecture: lifecycle phase separation and no hidden second execution model;
- testing: falsifiable oracles rather than constructibility theater;
- evidence honesty: manifest, diagnostic color, report text, and gates agree;
- containment: no production imports, workspace promotion, or root gate drift.

Fresh default review agents and host review were used to find deeper issues than
shape checks alone.

## Findings

| Finding | Outcome | Proof effect |
| --- | --- | --- |
| Provider identity originally risked collapsing lifetime/role/instance scope. | Provider and bootgraph identities now preserve resource, lifetime, role, and instance distinctions. | Strengthens provider graph and bootgraph simulation without deciding provider lowering. |
| Dispatcher descriptors risked implying default access operations. | Derivation now preserves explicit operations only; positive fixtures do not claim dispatcher access proof. | Keeps dispatcher access as `xfail`. |
| Async adapter proof was too close to hand-authored direct callback proof. | Added explicit async descriptors/plans and runtime tests that delegate through compiled registry artifacts. | Improves adapter delegation simulation while keeping real async bridge lowering open. |
| Runtime access overclaimed by exposing probe/readback behavior through the runtime facade. | Split sanctioned runtime access from mini-runtime probe readbacks. | Keeps final `RuntimeAccess` method law open. |
| Service binding cache keys could collide if encoded as delimited strings. | Cache identity now uses structural construction-time inputs and excludes invocation. | Earns service-binding cache simulation proof. |
| Deployment handoff needed runtime validation, not only TypeScript checks. | Runtime validation rejects app-id mismatch, widened descriptor tables, runtime access, live handles, executable closures, and raw secrets. | Strengthens deployment handoff simulation proof. |
| Bootgraph lifecycle needed finalizer-failure behavior. | Finalization now records failed finalizers while continuing reverse finalization. | Strengthens lifecycle/catalog simulation proof. |
| Test-theater risk remained around vendor/package smoke checks. | Diagnostic language keeps vendor evidence separate from RAWR runtime proof. | Avoids overpromotion. |

Residual accepted risk:

- Deployment handoff validation returns the validated input by reference. That is
  acceptable for this simulation proof; it is not a production immutability or
  serialization proof.

## Report

Proof entries promoted or added:

- `simulation.middle-spine-derivation-compiler`
- `simulation.bootgraph-catalog-finalization`
- `simulation.service-binding-cache-runtime-access`
- `simulation.adapter-callback-delegation`
- `simulation.deployment-handoff`

Red/yellow/green status:

- `Descriptor refs / table / registry` remains green for refs-only artifacts
  and registry identity checks.
- `Effect execution assumptions` remains green for the installed Effect
  behavior the lab directly verifies.
- SDK derivation, compiler, resource/provider/profile, bootgraph/provisioning,
  process runtime/access/binding, adapter lowering, observation, and deployment
  handoff remain yellow because the earned evidence is simulation-level or
  partial.
- Real harness mounting remains red.

Files changed by the PR included:

- derivation/compiler spine files under `src/spine/**`;
- mini-runtime bootgraph, catalog, runtime access, service binding cache,
  adapter delegation, and deployment handoff files under `src/mini-runtime/**`;
- focused tests under `test/middle-spine-derivation.test.ts` and
  `test/mini-runtime/process-runtime.test.ts`;
- negative fixtures for runtime access and deployment handoff boundaries;
- `project.json`, structural guard, manifest, focus log, diagnostic, and spine
  map updates.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ProviderEffectPlan` shape | `xfail` | Acquire/release payload, diagnostics, telemetry, error, and lowering fields were intentionally not decided. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Minimal lab acquire/release shape can be locked without changing public architecture. | Provider lowering needs to replace fake boot modules. | ProviderEffectPlan -> Bootgraph/Provisioning Lowering | lab/spec |
| Provider plan lowering | `xfail` | Provider acquisition must lower through bootgraph/provisioning, not process runtime. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Minimal provider plan shape exists. | Bootgraph proof needs real provider acquire/release. | ProviderEffectPlan -> Bootgraph/Provisioning Lowering | lab/spec |
| Async step membership | `xfail` | Step ownership must be declarative before proof. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Dispatcher/access work reaches async bridge. | Async bridge proof would otherwise infer membership. | Dispatcher Access + Async Step Membership | spec |
| Dispatcher access declaration | `xfail` | The lab must not invent ambient or explicit dispatcher policy. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Workflow dispatcher operations become necessary for runtime proof. | Async/server work needs dispatcher operation descriptors. | Dispatcher Access + Async Step Membership | spec |
| Runtime access method law | `xfail` | Mini-runtime sanctioned access exists, but final method law is not locked. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Provider/resource acquisition has real lab values. | Service binding or adapters need final access semantics. | RuntimeResourceAccess Law + Service Binding DAG | spec |
| Server route derivation | `xfail` | Cold route derivation/import-safety mechanics are unresolved. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Server workstream targets real route callback lowering. | Fake server adapter proof becomes insufficient. | Server Route Derivation | spec |
| Real adapter callback lowering | `xfail` | Fake callbacks prove delegation only. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Route derivation and runtime access are stable enough. | Native callbacks are needed for real harness proof. | Real Adapter Callback + Async Bridge Lowering | lab/spec |
| Async bridge lowering | `xfail` | Needs async step membership and dispatcher access decisions first. | `proof-manifest.json`, diagnostic, todo fixture, research program. | Async membership/access accepted. | Async host proof would otherwise be theater. | Real Adapter Callback + Async Bridge Lowering | lab/spec |
| Runtime profile config redaction | `todo` | Config binding and diagnostic-safe secret emission are not locked. | `proof-manifest.json`, diagnostic, spine map, research program. | Provider acquisition emits diagnostics/config snapshots. | Provider lowering exposes secret-bearing config flow. | Provider Diagnostics + Runtime Profile Config Redaction | lab/spec |
| Telemetry export/catalog persistence/deployment placement | migration-only | Requires production/control-plane choices beyond lab proof. | Diagnostic and research program. | Runtime emits stable records worth exporting or placing. | Migration plan needs production observation/control-plane behavior. | Migration/Control-Plane Observation | migration-only |

## Review Result

Leaf loops:

- Containment: passed; work stayed in `tools/runtime-realization-type-env/**`.
- Mechanical: passed after path/import/Nx/structural review.
- Type/negative: passed through typecheck and negative fixtures.
- Vendor: no new vendor production-readiness claim was made.
- Mini-runtime: passed focused derivation and mini-runtime tests.
- Manifest/report: passed after manifest, diagnostic, spine map, focus log, and
  report language were aligned.

Parent loops:

- Architecture: passed for contained simulation; lifecycle phases remained
  separated.
- Migration derivability: passed only as migration-risk reduction, not
  production runtime readiness.
- DX/API/TypeScript: no public API was promoted; dispatcher/runtime/provider
  method laws stayed fenced.
- Adversarial evidence honesty: peer review found and host addressed provider
  identity, dispatcher defaulting, runtime access overclaim, cache identity,
  deployment validation, and fake callback proof weaknesses.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| Deployment handoff validation returns the validated input by reference. | The proof does not establish immutability, clone safety, or serialization safety. | Simulation proof only; manifest/diagnostic remain below production readiness. | Runtime validation now rejects widened unsafe values, which is enough for this contained handoff boundary. | `simulation.deployment-handoff` only. | Boundary Policy Matrix or deployment/control-plane workstream if serialization or persistence becomes a claim. |

Invalidations:

- Dispatcher descriptor proof was narrowed after review invalidated the prior
  default-access implication.
- Runtime access proof was narrowed after review invalidated probe/readback
  exposure through the runtime facade.

Repair demands:

- Provider identity must retain resource, lifetime, role, and instance.
- Adapter delegation must consume compiled/runtime artifacts.
- Deployment handoff must include runtime validation for widened values.

## Final Output

Submitted output:

- PR #258: https://github.com/rawr-ai/rawr-hq-template/pull/258
- Branch: `codex/runtime-middle-spine-verification`
- Commit: `6cef86bc`

Verification run during the workstream:

- `bunx nx show project runtime-realization-type-env --json`
- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bun test tools/runtime-realization-type-env/test/mini-runtime/process-runtime.test.ts`
- `bun tools/runtime-realization-type-env/scripts/assert-negative-types.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:mini-runtime`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

PR follow-up status after submission:

- GitHub PR merge state: `CLEAN`.
- Reviews: none.
- Inline PR comments: none.
- GitHub status checks: none reported.
- Repo Actions workflows: none present.

## Next Workstream Packet

Recommended next workstream:

`ProviderEffectPlan -> Bootgraph/Provisioning Lowering`

Why this is next:

- It sits immediately after the already-proven compiler/provider graph.
- It sits immediately before process runtime binding and adapter/harness
  handoff.
- It replaces the largest fake lifecycle segment with a closer-to-runtime
  provisioning path.
- It does not require solving Elysia, Inngest durability, deployment placement,
  or production package promotion.

Next workstream proof target:

- Lock a minimal lab `ProviderEffectPlan` shape for acquire/release only.
- Lower provider build output into bootgraph/provisioning modules.
- Use real Effect execution/scope/finalizer behavior where possible.
- Prove dependency order, rollback, reverse release, and provider lifecycle
  diagnostics that do not decide runtime profile config binding.
- Promote `audit.p1.provider-effect-plan-shape` only as far as the type shape is
  truly locked.
- Promote `audit.p1.provider-effect-plan-lowering` only to contained
  `simulation-proof`.

Negative space to preserve next:

- provider retry/refresh policy;
- full Effect boundary policy matrix;
- production provider integrations;
- typed config binding, redacted config snapshots, and real platform config
  source precedence;
- telemetry export and catalog persistence;
- process/runtime access method law beyond the provider lowering seam;
- real harness mounting.

First files to read next:

- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../../src/spine/artifacts.ts`
- `../../src/spine/compiler.ts`
- `../../src/mini-runtime/bootgraph.ts`
- `../../src/mini-runtime/managed-runtime.ts`
- `../../src/vendor/effect/runtime.ts`
- `../../fixtures/todo/provider-effect-plan-shape.todo.ts`
- `../../fixtures/todo/provider-effect-plan-lowering.todo.ts`

First commands for the next agent:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```
