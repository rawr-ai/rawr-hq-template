# Agent F: ORPC + Inngest Autonomy Alternatives and Recommendation

## Executive Summary
The current runtime is partially aligned with packet policy (explicit `/rpc`, `/api/orpc`, `/api/inngest` split) but does not yet implement the manifest-first capability workflow surface model (`/api/workflows/<capability>/*`) or D-013 metadata-key simplification. The highest-leverage path is a **balanced bridge**: preserve current coordination behavior while introducing manifest/capability surfaces additively, then cut over behind hard D-013 and D-015 gates.

## Skills Introspected
- **solution-design**: used to force multiple fundamentally different alternatives, calibrate by reversibility, and avoid premature convergence.
  - `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:55`
  - `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:99`
  - `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:158`
- **system-design**: used to evaluate second-order effects, leverage points, and boundary choices instead of parameter tweaks.
  - `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:91`
  - `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:119`
  - `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:135`
- **domain-design**: used to evaluate authority/boundary ownership and avoid overlap ambiguity.
  - `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:93`
  - `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:95`
  - `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:134`
- **api-design**: used to preserve consumer-route contract clarity and consistency constraints.
  - `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:53`
  - `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:124`
  - `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:185`
- **team-design**: used to test whether a more complex architecture is justified vs simpler single-path operation.
  - `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:50`
  - `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:101`
  - `/Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md:123`
- **typescript**: used to keep migration contracts explicit at boundaries and avoid runtime/type drift.
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:37`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:114`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:185`

## Decision Criteria
1. **Policy alignment** with locked packet decisions, especially D-013 and D-015.
2. **Migration risk** to current runtime and plugin lifecycle tooling.
3. **Testing blast radius** and ability to prove correctness incrementally.
4. **Operational clarity** (route ownership, composition ownership, metadata semantics).
5. **Reversibility** of each step (safe rollback/dual-path period).
6. **Delivery throughput** (time to first value without semantic drift).

## Alternatives

### Alternative A: Conservative Incremental (Simpler/Lower Disruption)
**Shape**
- Keep current coordination-centric surface (`/rpc`, `/api/orpc`, `/api/inngest`) as primary runtime.
- Implement D-013 hardening first inside existing plugin metadata lifecycle paths.
- Add D-015 negative-route and harness layering checks for current surfaces only, defer `/api/workflows/<capability>/*` introduction.

**Pros**
- Lowest near-term execution risk.
- Minimal host/router refactor.
- Fastest path to reducing metadata-policy drift in existing tools.

**Cons**
- Remains structurally short of packet target shape (manifest-first capability workflow surfaces).
- Can create “compliance veneer” without topology convergence.
- Defers core architecture debt (missing manifest/workflow route model).

**D-013 implications**
- Can remove runtime reliance on `templateRole/channel/publishTier` in tooling, but without manifest/capability runtime composition it only partially realizes target semantics.

**D-015 blast radius**
- Medium: adds meaningful harness rigor for current routes, but still misses required workflow-surface matrix depth.

---

### Alternative B: Balanced Bridge (Recommended)
**Shape**
- Keep current coordination paths running.
- Add manifest-first capability workflow surfaces (`/api/workflows/<capability>/*`) as additive path.
- Introduce dual-read metadata period: accept legacy fields for compatibility, but enforce runtime decisions from `rawr.kind` + `rawr.capability` + manifest-owned composition.
- Migrate tests to full Axis-12 matrix incrementally, route family by route family.

**Pros**
- Converges toward packet target without big-bang rewrite.
- Preserves service continuity and observability while shifting topology.
- Creates explicit cutover gates for D-013 and D-015.

**Cons**
- Temporary parallelism increases complexity during migration.
- Requires disciplined gate enforcement to avoid permanent dual-state.

**D-013 implications**
- Strong fit: enables staged retirement of legacy runtime metadata keys and explicit adoption of capability-based identity.

**D-015 blast radius**
- High but manageable: can phase in route/persona matrix and negative-route assertions as each surface lands.

---

### Alternative C: Robust Greenfield-Like (Most Aligned, Highest Risk)
**Shape**
- Rebuild runtime around packet topology directly:
  - manifest-first `rawr.hq.ts` composition,
  - plugin-owned capability boundaries,
  - explicit `/api/workflows/<capability>/*` + `/api/inngest` split,
  - full Axis-12 harness matrix from day one.
- Hard-cut metadata semantics to `rawr.kind` + `rawr.capability` and reject legacy runtime keys immediately.

**Pros**
- Fastest route to full target-state compliance.
- Highest architecture coherence and least long-term ambiguity.

**Cons**
- Highest migration risk and coordination overhead.
- Large test rewrite blast radius immediately.
- Weak reversibility if rollout issues appear mid-cutover.

**D-013 implications**
- Complete and immediate.

**D-015 blast radius**
- Very high: broad test harness replacement and likely temporary productivity hit.

## Recommendation
Choose **Alternative B (Balanced Bridge)**.

Rationale:
- Alternative A is safer short-term but risks prolonged topology mismatch.
- Alternative C is clean architecturally but too aggressive given current metadata/tooling and test posture.
- Alternative B is the best tradeoff: it achieves target-shape convergence with explicit reversibility and measurable gates.

## Phased Plan (0/1/2/3)

### Phase 0: Baseline and Gate Definition
- Freeze target policy contract in implementation backlog terms (D-013, D-015 acceptance gates).
- Define cutover metrics:
  - `% plugin/runtime paths using rawr.kind + rawr.capability`
  - `% required route/persona harness suites implemented`
  - `% forbidden-route negative assertions implemented`
- Add CI placeholders for `manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`.

**Exit criteria**
- Written gate definitions accepted by maintainers.
- Baseline report of current compliance gaps produced.

### Phase 1: Metadata and Tooling Bridge (D-013-first)
- Introduce canonical metadata model in workspace/plugin tooling.
- Migrate behavior gates away from `templateRole/channel/publishTier` runtime semantics.
- Keep compatibility reads for legacy fields temporarily, but mark them non-authoritative for runtime behavior.

**Exit criteria**
- Runtime decisions no longer branch on legacy metadata fields.
- Lifecycle/status and plugin discovery can key on capability identity.

### Phase 2: Additive Topology Convergence
- Introduce manifest composition and capability workflow boundary surface additively.
- Add `/api/workflows/<capability>/*` path with explicit host ownership and context seam.
- Keep existing coordination paths as fallback during migration window.

**Exit criteria**
- Capability workflow routes mounted and exercised.
- No route-policy regressions on `/rpc`, `/api/orpc`, `/api/inngest`.

### Phase 3: Verification and Cutover Hardening (D-015)
- Enforce full Axis-12 route/persona matrix:
  - in-process,
  - first-party `/rpc`,
  - published `/api/orpc/*` + `/api/workflows/<capability>/*`,
  - runtime `/api/inngest`.
- Add mandatory negative-route assertions and one-way import-direction checks.
- Remove compatibility shims and legacy metadata fallback once gates are green.

**Exit criteria**
- D-013 and D-015 gates pass in CI.
- Legacy runtime metadata keys fully retired from behavior.

## Assumptions
- The packet docs represent target-state policy, while current runtime is intentionally pre-convergence.
- It is acceptable to run a temporary dual-path period if bounded by explicit cutover gates.
- Existing coordination routes must remain stable during migration.
- No hidden production dependency currently relies on `/api/inngest` as caller boundary API.

## Risks
- **Permanent bridge risk**: additive paths can become permanent unless decommission milestones are explicit.
- **Metadata drift risk**: legacy fields can remain behavior-bearing if fallback logic is not time-boxed.
- **Test confidence gap**: partial harness adoption may give false confidence if route-persona negatives are missing.
- **Ownership ambiguity**: introducing manifest and capability boundaries without clear authority may increase coordination overhead.

## Unresolved Questions
1. Where will `rawr.hq.ts` generation live operationally, and who owns regeneration guarantees?
2. What is the canonical mapping from existing plugin roots (`cli/agents/web`) to capability-oriented API/workflow surfaces?
3. What is the deprecation schedule for legacy metadata fields in tooling outputs vs runtime behavior checks?
4. Which CI jobs will own `manifest-smoke`, `metadata-contract`, `import-boundary`, and `host-composition-guard` enforcement?
5. Which existing coordination endpoints remain public/internal long-term after capability workflow surfaces are introduced?

## Evidence Map

| Claim | Evidence |
| --- | --- |
| Packet authority hierarchy is explicit and ARCHITECTURE/DECISIONS are canonical. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md:7`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md:8`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md:7` |
| Locked target posture requires split harnesses, capability workflow routes, and runtime-only `/api/inngest`. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:49`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:51`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:78` |
| Canonical caller/auth matrix forbids caller use of `/api/inngest` and external use of `/rpc`. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:66`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:68`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:69` |
| D-013 mandates runtime identity by `rawr.kind` + `rawr.capability` and deprecates legacy runtime metadata keys. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:86`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:87`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:88`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:20` |
| D-013 requires conformance gates (`manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`). | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:93`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:44`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:45`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:46`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:47` |
| D-015 locks Axis 12 as testing authority and requires route-aware harness matrix + downstream doc alignment. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:127`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:128`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:131`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:25`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:27` |
| D-015 downstream contract is detailed and includes exact matrix rows and required targets. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:45`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:52`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:54`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:68` |
| Current host runtime mounts `/api/inngest` and delegates ORPC routes, but does not mount `/api/workflows/*`. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:111`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:113` |
| Current ORPC route registration only includes `/rpc` and `/api/orpc` families. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:339`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:349`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:359`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:369` |
| Current contract root is coordination/state only (no capability workflow surface aggregation). | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:5`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:6`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:7` |
| Current coordination contract routes are `/coordination/*`, not capability-first workflow boundaries. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:26`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:70`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:92` |
| Runtime adapter and Inngest function wiring exist and are explicit. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:123`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:175`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:214`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:221` |
| Existing tests cover `/rpc`, `/api/orpc`, and `/api/inngest` but are not the full Axis-12 route/persona matrix. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:32`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/rawr.test.ts:57`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/rawr.test.ts:158`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-openapi.test.ts:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/test/inngest-adapter.test.ts:96` |
| Packet’s own E2E blueprint expects broader suite matrix and explicit negative-route tests. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md:1077`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md:1084`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md:1095`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md:1149` |
| Workspace/plugin tooling still uses legacy metadata fields for behavior. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:10`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:124`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:127`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:152`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:10`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/lib/workspace-plugins.ts:127` |
| Install/enable flows still key off legacy channel/template role semantics. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/install/state.ts:129`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/install/state.ts:157`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:91`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/web/enable.ts:71`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts:97` |
| New web plugin scaffolding still writes legacy metadata fields by default. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts:107`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts:110`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts:111` |
| Existing plugin package metadata sample includes legacy fields and lacks capability keying. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/package.json:46`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/package.json:49`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/package.json:50` |
| D-015 scope and downstream obligations are explicitly routed through Axis 12 + implementation-adjacent contract. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md:18`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/CANONICAL_EXPANSION_NAV.md:26` |
