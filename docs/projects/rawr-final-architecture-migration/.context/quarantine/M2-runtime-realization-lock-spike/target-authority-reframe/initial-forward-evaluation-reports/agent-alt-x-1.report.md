# Alt-X-1 Runtime Realization Evaluation

## Verdict

Alt-X-1 is a strong synthesis source and likely close to the right runtime-substrate shape, but it should not be adopted as the canonical spec verbatim. Its runtime engineering core is stable: compiler, bootgraph, Effect provisioning kernel, managed runtime root, process runtime, live runtime access, diagnostics catalog, and harness handoff are coherent and aligned with the M2 target. The unstable pieces are mostly public-facing grammar and repo topology: `core/*`/`@rawr/sdk` versus the current M2 `packages/runtime/*`/`packages/hq-sdk` authority, flattened manifest selection versus explicit `role -> surface -> plugin membership`, and `startApp(...)` versus `startAppRole(...)`.

For M2-U00/M2-U01, Alt-X-1 gives enough confidence to start laying the runtime-system dominos immediately, as long as implementation follows the M2 package/API authority and treats Alt-X-1's broader resource/profile/plugin catalog as future synthesis material rather than first-slice scope.

## Stable Components

The runtime chain is stable. Alt-X-1 defines runtime realization as `entrypoint -> runtime compiler -> bootgraph -> Effect provisioning kernel -> process runtime -> harness -> process` and explicitly keeps platform-service mapping outside the semantic model (`RAWR_Runtime_Realization_System-Alt-X-1.md:18-30`). This matches M2's goal to boot through `defineApp`, entrypoints, runtime compiler, bootgraph, process runtime, and harnesses (`RAWR_Architecture_Migration_Plan.md:43-50`) and the M2 package target for bootgraph/compiler/substrate/harnesses (`M2-minimal-canonical-runtime-shell.md:47-58`).

The ownership laws are stable and useful as canonical language. Alt-X-1's thesis says topology classifies, services own truth, plugins project, apps select, resources provision substrate, SDK derives, frameworks execute inside their boundary, runtime realizes, and diagnostics observe (`Alt-X-1:81-97`). Its boundary section says runtime owns process-local realization, resource/provider lowering, Effect composition, managed runtime ownership, service binding caches, surface assembly, harness handoff, catalog emission, and shutdown, but not service semantics, app authority, durable async semantics, CLI semantics, or deployment semantics (`Alt-X-1:131-182`). That directly supports M2's non-negotiables that bootgraph remains process-local, the runtime subsystem is hidden, harnesses remain downstream, and Effect stays hidden below RAWR-shaped public seams (`RAWR_Architecture_Migration_Plan.md:931-941`).

The Effect boundary is stable. Alt-X-1 makes Effect mandatory inside provider/kernel implementation but not a public service/plugin/app authoring language (`Alt-X-1:2310-2340`), with one root managed runtime per started process (`Alt-X-1:2342-2356`). That matches the existing runtime realization spec's "Effect is public to runtime / private to semantic architecture" rule (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:119-127`) and M2's requirement that `packages/runtime/substrate` owns one root `ManagedRuntime` per process without exposing raw Effect vocabulary (`M2-minimal-canonical-runtime-shell.md:47-58`).

Process/role lifetime semantics are stable. Alt-X-1 recognizes only `process` and `role` as acquisition lifetimes, with invocation and call-local values outside runtime-resource acquisition (`Alt-X-1:690-704`; `Alt-X-1:2296-2308`). This aligns with the integrated spec's process/role resource split and service-boundary lane ownership (`RAWR_Canonical_Architecture_Spec.md:1746-1778`).

The live-access/read-model split is stable. Alt-X-1 cleanly separates `RuntimeAccess` as live access from `RuntimeCatalog` as diagnostic topology (`Alt-X-1:298-304`; `Alt-X-1:2358-2398`; `Alt-X-1:2483-2531`). Current repo code has a weaker pre-Effect version of this shape: `packages/hq-sdk/src/plugins.ts` already binds service clients from `ProcessView`/`RoleView` into `{ deps, scope, config }` and memoizes by context (`packages/hq-sdk/src/plugins.ts:12-120`). This means the concept is compatible with the current direction, though the final naming/API needs synthesis.

Server API, server internal, and durable async boundaries are stable. Alt-X-1 keeps public server API and trusted internal server API as separate topology/builder classifications (`Alt-X-1:1652-1780`), and keeps caller-facing workflow invocation in server API/internal plugins rather than in runtime Inngest ingress (`Alt-X-1:1987-2028`). That matches M2's active lane and the larger architectural goal of avoiding public/internal or route/workflow collapse.

## Minor Discrepancies

The topological names are different but not architecturally disqualifying. Alt-X-1 names system foundation as `core/*`, public SDK as `@rawr/sdk`, and runtime internals under `core/runtime/*` (`Alt-X-1:359-470`; `Alt-X-1:581-610`; `Alt-X-1:631-653`). M2 is explicit that Phase 2 uses `packages/runtime/*` as execution home and `packages/hq-sdk` as public authoring/API home (`RAWR_Architecture_Migration_Plan.md:943-972`). Adopt the Alt-X-1 architecture, not its repo root names, unless the orchestrator intentionally reopens repository topology.

The app start helper name differs. Alt-X-1 examples use `startApp(hqApp, { roles: [...] })` (`Alt-X-1:2171-2211`). M2-U00 and the integrated spec use `startAppRole(...)` / `startAppRoles(...)` as the public app-runtime seam (`M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md:27-33`; `RAWR_Canonical_Architecture_Spec.md:1510-1531`). This is API grammar, not a reason to reject the substrate, but U00 should keep the issue's `startAppRole(...)` acceptance target.

`RuntimeAccess` versus `ProcessView`/`RoleView` is a naming and layering discrepancy if handled carefully. Alt-X-1 presents `RuntimeAccess` as the live access surface (`Alt-X-1:2358-2398`), while the integrated/current code direction exposes RAWR-shaped process and role views to plugins and harnesses (`RAWR_Canonical_Architecture_Spec.md:1810-1854`; `packages/hq-sdk/src/plugins.ts:12-120`). The synthesis should make `RuntimeAccess` the internal aggregate and keep `ProcessView`/`RoleView` as the public plugin binding views, or explicitly rename one layer.

## Unstable / Needs Lock Before Canonicalization

Manifest grammar is the main load-bearing conflict. Alt-X-1 says the manifest should not manually group plugins by role/surface because plugin definitions already declare those facts (`Alt-X-1:2135-2170`). The integrated spec says the manifest explicitly authors `role -> surface -> plugin membership`, and that losing explicit surface membership loses real semantic information (`RAWR_Canonical_Architecture_Spec.md:1317-1366`). Current `apps/hq/rawr.hq.ts` follows the explicit role/surface shape (`apps/hq/rawr.hq.ts:19-37`). This decision should be locked before making Alt-X-1 canonical, but it does not block M2-U00 if U00 keeps the current explicit manifest and only lowers the active `server.api` lane.

Resource/provider/profile public topology is not ready to drive U00. Alt-X-1 gives a rich `resources/*` public import surface, resource families, provider selectors, and app runtime profiles (`Alt-X-1:657-915`; `Alt-X-1:916-975`; `Alt-X-1:2533-2611`). M2-U00 explicitly forbids descriptor-only inventory that is not consumed by the first server runtime path (`M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md:27-33`; `M2-U00:53-63`). The immediate lock should be internal substrate resources sufficient for bridge deletion, not the full authored resource ecosystem.

Service package topology and service-family rules are broader than runtime realization. Alt-X-1 rejects service-family directories and requires flat service packages (`Alt-X-1:505-529`; `Alt-X-1:976-1081`). The integrated spec allows flat or family-nested namespaces as long as the leaf service owns truth (`RAWR_Canonical_Architecture_Spec.md:594-638`). This is important for the overall architecture but not load-bearing for U00/U01 unless implementation starts moving service roots.

The repo-topology conflict with the current runtime realization spec should be resolved in synthesis. The current spec argues for top-level `runtime/` and says `packages/runtime/` hides a primary authoring location (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:323-340`), while M2 now says `packages/runtime/*` is the Phase 2 execution home (`RAWR_Architecture_Migration_Plan.md:943-972`). Alt-X-1 chooses a third spelling, `core/runtime/*`. This is not a runtime-design failure, but the canonical replacement spec must pick exactly one current authority.

## Contingent Components

Alt-X-1's service internals, async workflow/schedule/consumer builder grammar, CLI/web/agent/desktop plugin topology, standard platform resource wrapper topology, runtime config system, RuntimeCatalog shape, and verification catalog are valuable but should not be allowed to expand M2-U00/M2-U01. They become useful during M2-U02 through M2-U04, when compiler/process-runtime generalization, async harnessing, and builder replacement are actually in scope (`M2-minimal-canonical-runtime-shell.md:233-239`).

## M2-U00 / M2-U01 Implications

Alt-X-1 strengthens the case that M2's domino order is still correct: delete the legacy bridge by creating the minimal server runtime path first, then harden bootgraph. The spec's runtime compiler responsibilities say the compiler emits plans and diagnostics but does not acquire resources or start harnesses (`Alt-X-1:2213-2269`). Its bootgraph section owns dependency ordering, rollback, reverse shutdown, typed context assembly, and process/role lifetimes (`Alt-X-1:2271-2308`). Its Effect kernel owns layer composition, scoped acquisition/release, config, runtime services, errors, and annotations (`Alt-X-1:2310-2340`). That maps cleanly onto U00 minimal substrate/bootgraph/server harness and U01 lifecycle hardening.

Current diagnostics confirm the repo is still at the U00 boundary: legacy cutover imports remain live, `packages/runtime/substrate`, `packages/runtime/bootgraph`, and `packages/runtime/harnesses/elysia` do not exist, and `packages/hq-sdk` lacks `./app` and `./app-runtime` public seams. Therefore Alt-X-1 should not cause a plan reset. It should harden the existing M2 plan by giving the runtime-substrate vocabulary and boundaries more precise names.

## Recommendation

Use Alt-X-1 as a source for synthesis, not as the canonical document as-is.

Adopt immediately:

- The thesis and ownership law language.
- The runtime realization chain.
- Hidden Effect provisioning kernel with one managed runtime per process.
- Process/role acquisition lifetimes.
- Runtime compiler / bootgraph / process runtime / harness separation.
- RuntimeAccess versus RuntimeCatalog split, with a synthesis pass over `ProcessView`/`RoleView` naming.
- Server API versus server internal split and workflow invocation boundaries.

Normalize before canonicalization:

- Replace `core/*` and `@rawr/sdk` with the current M2 `packages/runtime/*` and `packages/hq-sdk` authority, unless repository topology is explicitly reopened.
- Keep `startAppRole(...)` as the U00 public seam; optionally treat `startApp(...)` as later ergonomic sugar.
- Lock manifest grammar. The safest U00 default is the current explicit `role -> surface -> plugin membership` shape because it preserves app-level composition authority and matches existing docs/code.
- Defer rich authored `resources/*`, provider selector, profile, async, CLI, web, agent, desktop, and RuntimeCatalog expansion until the specific M2 slice earns them.

Bottom line: Alt-X-1 confirms the runtime substrate is stable enough to start M2-U00/M2-U01. The only load-bearing locks needed before the canonical replacement spec lands are public topology/API naming and manifest grammar. Neither should block the first server-runtime cut if the implementation follows the M2 issues rather than Alt-X-1's broader examples.
