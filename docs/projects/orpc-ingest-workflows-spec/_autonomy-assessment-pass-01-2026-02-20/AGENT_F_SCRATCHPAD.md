# Agent F Scratchpad

## 2026-02-20T18:40:12Z
- Initialized scratchpad.
- Protocol acknowledged: only 3 output files in artifact root.
- Next: read required skills and packet/runtime anchors; log evidence with path+line anchors.

## 2026-02-20T18:40:46Z
- Read required skill files and captured governing heuristics:
  - solution-design: require explicit reframing, reversibility calibration, and at least 3 fundamentally different alternatives before convergence.
  - system-design: prioritize loops/second-order effects, boundary choice, incentive mapping, and leverage points above parameter tweaks.
  - domain-design: enforce single-owner authority per domain and seams based on weak interaction/language divergence, not technical layers.
  - api-design: consumer/task-first contract design; explicit contracts and consistency rules across the API surface.
  - team-design: evaluate whether multi-agent shape is justified vs single-agent; define interfaces/accountability and coordination overhead.
  - typescript: keep runtime/type-time honesty, parse unknown at boundaries, and preserve explicit boundary rigidity.
- Next: inventory packet docs and runtime anchor files with line-anchored evidence.

## 2026-02-20T18:46:54Z
- Packet core coverage pass completed across top-level docs (`README.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CANONICAL_EXPANSION_NAV.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`) plus all axes (01..12), with deep focus on axes 03/07/08/10/11/12 and example E2E-04 harness blueprint.
- Key target-state locks extracted:
  - Manifest-first composition via `rawr.hq.ts` + capability-first `/api/workflows/<capability>/*` + runtime-only `/api/inngest`.
  - Runtime identity must be `rawr.kind` + `rawr.capability`; `templateRole/channel/publishTier/published` are non-runtime.
  - D-015 test harness matrix requires route-aware suites + mandatory negative-route assertions + package-first helper ownership.
- Runtime-anchor findings (current state):
  - `apps/server/src/rawr.ts` mounts `/api/inngest` and delegates to `registerOrpcRoutes`; no workflow-boundary mount.
  - `apps/server/src/orpc.ts` mounts `/rpc` + `/api/orpc` only and serves coordination/state contracts; no `/api/workflows/*` surface.
  - `packages/core/src/orpc/hq-router.ts` aggregates only `coordination` + `state` contracts.
  - Metadata/runtime tooling in `packages/hq/src/workspace/plugins.ts` and `plugins/cli/plugins/src/lib/workspace-plugins.ts` still parse and gate on `templateRole/channel/publishTier`.
  - Channel-specific behavior in install/enable flows remains tied to legacy `channel` field.
- Preliminary delta interpretation:
  - Spec packet is target-state policy; runtime code is earlier-stage implementation with partial alignment (split `/rpc` + `/api/orpc` + `/api/inngest` exists) but without manifest-driven capability workflow surfaces and without D-013 runtime-key migration.
  - D-015 blast radius is broad: tests currently emphasize `/rpc` + `/api/orpc` + `/api/inngest` but do not implement the full route/persona matrix expected for `/api/workflows/<capability>/*` and negative-route coverage.

## 2026-02-20T18:48:36Z
- Runtime/testing deep-dive evidence:
  - `apps/server/src/rawr.ts` currently mounts only `/api/inngest` + delegates to ORPC mount registration; no explicit `/api/workflows/*` mount.
  - `apps/server/src/orpc.ts` currently registers `/rpc` and `/api/orpc` surfaces and OpenAPI generation, with no capability workflow boundary router namespace.
  - `packages/core/src/orpc/hq-router.ts` root contract aggregates only `coordination` and `state`.
  - `packages/coordination/src/orpc/contract.ts` route paths are coordination-scoped (`/coordination/*`) rather than capability workflow surface paths.
  - Test suites (`apps/server/test/rawr.test.ts`, `apps/server/test/orpc-handlers.test.ts`, `apps/server/test/orpc-openapi.test.ts`, `packages/coordination-inngest/test/inngest-adapter.test.ts`) validate current `/rpc`/`/api/orpc`/`/api/inngest` behavior but do not implement the full Axis-12 persona matrix or `/api/workflows/<capability>/*` negative-route profile.
- Metadata migration pressure (D-013):
  - `packages/hq/src/workspace/plugins.ts` and `plugins/cli/plugins/src/lib/workspace-plugins.ts` parse `rawr.templateRole/channel/publishTier` and filter behavior by those fields.
  - Install/enable flows in `packages/hq/src/install/state.ts`, `plugins/cli/plugins/src/lib/install-state.ts`, `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts`, `plugins/cli/plugins/src/commands/plugins/web/enable.ts`, and `plugins/cli/plugins/src/commands/plugins/web/enable/all.ts` still key behavior on legacy channel/role semantics.
- Working hypothesis for alternatives:
  - Conservative option keeps current coordination-centric ORPC+Inngest stack and performs metadata/test hardening first.
  - Bridge option introduces manifest + capability workflow surfaces as additive parallel path with migration shims.
  - Robust option targets packet topology directly (manifest-first, plugin-owned capability boundaries, route/harness matrix enforced as release gate).

## 2026-02-20T18:51:13Z
- Completed final alternatives document: `AGENT_F_FINAL_ALTERNATIVES_AND_RECOMMENDATION.md`.
- Recommendation selected: Balanced bridge (additive manifest/capability convergence with explicit D-013 and D-015 gates).
- Evidence map populated with absolute path + line anchors across skills, packet policy docs, runtime anchors, and tests.
