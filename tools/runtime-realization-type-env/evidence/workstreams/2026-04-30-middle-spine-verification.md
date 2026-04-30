# Middle-Spine Verification Burn-Down

Status: closed and submitted as PR #258.
Branch: `codex/runtime-middle-spine-verification`.
Commit: `f9ee1eaf`.
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

## Input Packet

Authority and operating inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`
- `../middle-spine-verification-work-plan.md`
- `../phased-agent-verification-workflow.md`
- canonical runtime spec pinned by `../proof-manifest.json`:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Inputs treated as non-authority or limited evidence:

- vendor proof: useful dependency-shape evidence, not RAWR runtime proof;
- simulation proof: contained mini-runtime evidence, not production readiness;
- quarantined migration plans: directional provenance only;
- positive fixtures: proof only when backed by gates and manifest entries.

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

## Final Output

Submitted output:

- PR #258: https://github.com/rawr-ai/rawr-hq-template/pull/258
- Branch: `codex/runtime-middle-spine-verification`
- Commit: `f9ee1eaf`

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

## Continuity

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
- Prove dependency order, rollback, reverse release, provider diagnostics, and
  redacted config snapshots.
- Promote `audit.p1.provider-effect-plan-shape` only as far as the type shape is
  truly locked.
- Promote `audit.p1.provider-effect-plan-lowering` only to contained
  `simulation-proof`.

Negative space to preserve next:

- provider retry/refresh policy;
- full Effect boundary policy matrix;
- production provider integrations;
- real platform config source precedence;
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
