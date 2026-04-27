# M2 Repo Reality Evaluation

This report evaluates the current codebase against M2 and the runtime realization direction. It does not choose between Alt-X-1 and Alt-X-2; it identifies what the repo currently proves, what is still transitional, and which spec decisions must be locked before implementation can start without renegotiating the runtime substrate.

## Bottom Line

M2 is still directionally correct. The current repo reality strongly supports keeping `M2-U00` as the first implementation domino: delete the live legacy cutover by installing the first canonical server runtime path. The repo has a coherent semantic shell now, but it does not yet have a runtime system. `services/`, `plugins/server/api/*`, `apps/hq/rawr.hq.ts`, and `packages/hq-sdk` give enough raw material to start the runtime cut once a few load-bearing spec choices are locked.

The biggest risk is not the M2 order itself. The risk is that the newer runtime specs appear to sharpen or change three foundations that M2 currently treats as already settled: physical runtime topology (`packages/runtime/*` vs a `core/runtime/*` or top-level runtime root), the public SDK import surface (`@rawr/hq-sdk` vs a future `@rawr/sdk`), and whether U00 can consume the current role-grouped app manifest or must first adopt the SDK-derived `defineApp({ plugins })` model.

If those three are locked in favor of the current M2 posture, the team can start laying runtime dominos immediately. If they move, the right next step is a short doc/gate realignment before production implementation, not more broad architecture exploration.

## What Is Currently Real

The Graphite/worktree context is correct for the spike. The checkout is `agent-ORCH-M2-runtime-realization-lock-spike`, stacked above `codex/spike-oclif-cli-composition-20260420`. The worktree already contains shared dirty spike/spec/migration changes, so this report treated non-owned files as read-only evidence.

Nx recognizes the required projects. `bunx nx show projects` includes `@rawr/hq-app`, `@rawr/hq-sdk`, `@rawr/bootgraph`, `@rawr/runtime-context`, `@rawr/server`, `@rawr/example-todo`, and `@rawr/hq-ops`. Targeted `nx show project` confirms that `@rawr/hq-app`, `@rawr/server`, `@rawr/hq-sdk`, `@rawr/bootgraph`, and `@rawr/runtime-context` all have `sync` or structural gates wired where expected.

Phase 1 semantic ownership is mostly real:

- The active app manifest is isolated at `apps/hq/rawr.hq.ts`. It selects two server API plugin registrations, `state` and `exampleTodo`, and leaves async empty for now (`apps/hq/rawr.hq.ts:19-37`).
- Services exist as service packages. `services/example-todo` declares stable construction lanes for `deps`, `scope`, and `config` in its service seam (`services/example-todo/src/service/base.ts:51-65`) and exposes an in-process client factory through `defineServicePackage` (`services/example-todo/src/client.ts:12-34`).
- `services/hq-ops` is a real service package with the expected modules: `config`, `repo-state`, `journal`, `security`, `plugin-catalog`, `plugin-install`, and `plugin-lifecycle`. Its service seam owns `repoRoot` scope and `resources` deps (`services/hq-ops/src/service/base.ts:39-47`) and centralizes package-wide implementer wiring in `service/impl.ts` (`services/hq-ops/src/service/impl.ts:13-33`).
- The active server plugin topology is role-first: `plugins/server/api/example-todo` and `plugins/server/api/state` exist. The async roots also exist, but only as empty `.gitkeep` placeholders under `plugins/async/workflows` and `plugins/async/schedules`.
- `packages/hq-sdk` has real service and projection primitives. It exports service, API, workflow, composition, and boundary helpers (`packages/hq-sdk/src/index.ts:1-38`). Its `bindService(...)` helper already expresses the construction-lane boundary shape of `{ deps, scope, config }` (`packages/hq-sdk/src/plugins.ts:1-10`, `packages/hq-sdk/src/plugins.ts:84-114`).
- Root workspaces already reserve `packages/runtime/*` and `packages/runtime/harnesses/*` (`package.json:6-18`). This means U00 can add runtime packages without first changing workspace glob policy.

The current server path is operationally real, but it is not canonical:

- `apps/hq/server.ts` imports the legacy cutover and calls `bootstrapRawrHqServerViaLegacyCutover(...)` / `startRawrHqServerViaLegacyCutover(...)` (`apps/hq/server.ts:1-5`, `apps/hq/server.ts:10-28`).
- `apps/hq/async.ts` imports `startRawrHqAsyncViaLegacyCutover(...)` and returns a reserved async role (`apps/hq/async.ts:1-14`).
- `apps/server/src/bootstrap.ts` still owns process boot: config load, telemetry install, plugin discovery, state load, route registration, and web plugin mounting (`apps/server/src/bootstrap.ts:69-133`).
- `apps/server/src/rawr.ts` imports `@rawr/hq-app/legacy-cutover` and builds route/runtime surfaces from a global legacy authority (`apps/server/src/rawr.ts:7`, `apps/server/src/rawr.ts:27-30`, `apps/server/src/rawr.ts:192-214`, `apps/server/src/rawr.ts:230-318`).

The existing runtime packages are not runtime authority:

- `packages/bootgraph/src/index.ts` is only `BOOTGRAPH_RESERVATION` with `status: "reserved-support-shell"` (`packages/bootgraph/src/index.ts:1-4`).
- `packages/runtime-context/src/index.ts` is a type-only support seam and explicitly must not own declarations, satisfier binding, or executable assembly (`packages/runtime-context/src/index.ts:3-14`).
- `@rawr/runtime-context` remains imported from server and plugin context code, including `apps/server/src/host-realization.ts`, `apps/server/src/orpc.ts`, and both active server API plugins. That package is therefore still live support debt, not absorbed substrate.

## What Remains Transitional

The surviving bridge is not just an entrypoint wrapper. It is the live runtime assembly path.

`apps/hq/legacy-cutover.ts` claims the "sole sanctioned Phase 1 executable bridge" (`apps/hq/legacy-cutover.ts:64-67`). It creates the legacy route authority through server host composition (`apps/hq/legacy-cutover.ts:52-61`), starts server boot through `apps/server/src/bootstrap` (`apps/hq/legacy-cutover.ts:45-50`, `apps/hq/legacy-cutover.ts:68-91`), and returns a placeholder async reservation (`apps/hq/legacy-cutover.ts:93-102`).

There is also an important implementation wrinkle: the manifest passed into the legacy server cutover is not the actual route authority. `bootstrapRawrHqServerViaLegacyCutover(...)` voids `input.manifest` and calls `bootstrapServer()` (`apps/hq/legacy-cutover.ts:68-75`). `apps/server/src/rawr.ts` creates a module-level `rawrHostAuthority` from `createRawrHqLegacyRouteAuthority()` (`apps/server/src/rawr.ts:27`), and `createRawrHostComposition(...)` constructs its own manifest internally (`apps/server/src/host-composition.ts:47-68`). U00 therefore cannot be a cosmetic entrypoint rewrite. It must remove the server-owned host-composition authority path or the repo will still have two app/runtime authorities.

The current host chain maps closely to the runtime concepts that M2 wants to replace:

- `host-composition.ts` selects declarations, constructs satisfiers, creates a bound role plan, and materializes runtime surfaces (`apps/server/src/host-composition.ts:22-68`).
- `host-seam.ts` binds app-selected plugin declarations against host satisfiers, then composes API/workflow contributions (`apps/server/src/host-seam.ts:43-97`).
- `host-realization.ts` turns one bound role plan into executable oRPC and workflow surfaces (`apps/server/src/host-realization.ts:19-66`).
- `host-satisfiers.ts` is the current pre-Effect service binding site. It creates concrete deps, scopes, configs, and local memoized clients for `example-todo` and `hq-ops` (`apps/server/src/host-satisfiers.ts:58-147`).

That means the current repo already contains a transitional "runtime compiler + service binding + process runtime" shape, but it lives in `apps/server/src/*`, imports the HQ legacy bridge, and has no Effect-backed substrate, bootgraph lifecycle, or canonical harness split.

The public SDK is also transitional:

- `packages/hq-sdk` does not export `./app` or `./app-runtime`, and there are no `packages/hq-sdk/src/app.ts` or `app-runtime.ts` files. The Phase 2 verifier reports these as current findings.
- Current active builders are generic `defineApiPlugin(...)` and `defineWorkflowPlugin(...)`, not canonical role/surface builders like `defineServerApiPlugin(...)`, `defineServerInternalPlugin(...)`, `defineAsyncWorkflowPlugin(...)`, and `defineAsyncSchedulePlugin(...)` (`packages/hq-sdk/src/apis/index.ts:71-93`, `packages/hq-sdk/src/workflows/index.ts:166-195`).
- `bindService(...)` currently owns a local `Map` cache in the SDK (`packages/hq-sdk/src/plugins.ts:93-114`). M2 and the runtime specs want the cache behavior to move underneath the runtime substrate as `BoundaryCache`, with the public seam staying RAWR-shaped.

Effect has not entered the runtime. Root `package.json` has no `effect` or `@effect/*` dependency (`package.json:172-190`), and a repo-wide search found no raw Effect usage in live source outside docs/verifier strings.

## Verification Surface

The Phase 2 gates are already correctly red as current-findings diagnostics:

- `verify-no-legacy-cutover` reports the live bridge file, package export, app imports, and `@rawr/hq-app/legacy-cutover` imports from `apps/server/src/rawr.ts` and `apps/server/src/testing-host.ts`.
- `verify-server-role-runtime-path` reports that `apps/hq/server.ts` does not boot through `@rawr/hq-sdk`, still imports `./legacy-cutover`, does not select the server role explicitly, and lacks `packages/runtime/substrate`, `packages/runtime/bootgraph`, and `packages/runtime/harnesses/elysia`.
- `verify-runtime-public-seams` reports missing `packages/hq-sdk` `./app` and `./app-runtime` exports, missing `src/app.ts` and `src/app-runtime.ts`, and missing `packages/runtime/bootgraph`.
- `verify-gate-scaffold` passes and confirms the current-findings suites are wired.

The current-findings Nx structural suites also pass for `@rawr/hq-app`, `@rawr/server`, and `@rawr/hq-sdk`. That is expected because those suites allow findings and prove the red state is measured, not fixed.

The existing `@rawr/bootgraph:structural` and `@rawr/runtime-context:structural` checks also pass, but they validate current reservation/support-only state. They do not prove M2 runtime readiness. `verify-bootgraph-structural.mjs` explicitly requires the `reserved-support-shell` marker (`scripts/phase-03/verify-bootgraph-structural.mjs:23-31`), and `verify-runtime-context-structural.mjs` explicitly requires type-only support exports and rejects executable assembly (`scripts/phase-03/verify-runtime-context-structural.mjs:23-49`).

## Domino Order Assessment

`M2-U00` through `M2-U06` still form a coherent domino order, with one caveat: U00 needs a spec-lock preface or issue-text update before implementation if the final runtime spec changes topology or public import names.

| Issue | Repo reality verdict | Notes |
| --- | --- | --- |
| `M2-U00` | Still the correct first implementation domino. | The live runtime still depends on `apps/hq/legacy-cutover.ts`, app entrypoints still import it, and server runtime still imports `@rawr/hq-app/legacy-cutover`. U00 cannot be skipped or postponed. |
| `M2-U01` | Correct after U00. | The current bootgraph is only a reservation. A minimal bootgraph must exist before lifecycle hardening, rollback, tagged errors, and Effect scope semantics can be made real. |
| `M2-U02` | Correct, but likely needs wording broadening. | Current host files already combine compiler/process-runtime concerns. U02 should generalize the compiler and process runtime after the first server cut, and should absorb any final-spec additions such as `server/internal` or `async/consumers` as active-lane plan shapes if they are locked. |
| `M2-U03` | Correct after U02. | `apps/hq/async.ts` is reserved and async roots are empty. Async should not drive U00, but once compiler/process runtime is generalized, the Inngest harness path should be the next runtime proof. |
| `M2-U04` | Mostly correct, but watch the builder dependency. | If U00/U02 can compile through a normalized internal adapter that accepts current `defineApiPlugin` output, public builder replacement can stay after async. If the locked spec says canonical role/surface builders are the compiler input, then introduce the normalized builder type earlier and leave package migration for U04. |
| `M2-U05` | Correct. | Proof slices should move only after canonical runtime and builders can actually express them. Current example-todo and HQ Ops are good proof candidates, but not yet runtime-proven. |
| `M2-U06` | Correct. | Ratcheting, `runtime-context` absorption, public Effect quarantine, and transitional seam deletion are closure work after proof slices pass. |

Recommended adjustment: do not insert a descriptor-only implementation phase before U00. The milestone already says descriptor contracts are introduced only when consumed and that bridge deletion comes first (`docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md:121-136`). That remains the right guardrail. If a pre-U00 step is needed, make it a spec/doc/gate alignment step, not a new production runtime layer.

## Implementation Blockers vs Doc-Only Decisions

These decisions are implementation blockers for U00:

1. Physical runtime root. Current M2 and repo gates assume `packages/runtime/bootgraph`, `packages/runtime/compiler`, `packages/runtime/substrate`, and `packages/runtime/harnesses/*` (`docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md:60-85`; `package.json:6-18`). Some candidate-spec language appears to prefer a broader `core/runtime/*` or top-level foundation root. That cannot be left ambiguous before writing imports, package manifests, Nx project metadata, and verifiers.
2. Public SDK package/import surface. The current repo has `@rawr/hq-sdk`; the new specs use `@rawr/sdk` in examples. U00 gates explicitly require boot through `@rawr/hq-sdk` today (`scripts/phase-2/verify-server-role-runtime-path.mjs:15-24`; `scripts/phase-2/verify-runtime-public-seams.mjs:7-21`). Decide whether M2 stays on `@rawr/hq-sdk` for this template or whether the spec lock includes a package rename.
3. U00 app input model. Current `rawr.hq.ts` manually groups `roles.server.api` and `roles.async` (`apps/hq/rawr.hq.ts:25-36`). The runtime specs favor `defineApp({ plugins })` with SDK-derived role/surface indexes. Decide whether U00 may consume the current explicit role tree as the first server lane or must first introduce enough `defineApp(...)` normalization to make the compiler input target-shaped.
4. Service/resource derivation minimum. Current services declare construction lanes as TypeScript context types, not `resourceDep(...)` / `serviceDep(...)` manifests (`services/example-todo/src/service/base.ts:51-65`; `services/hq-ops/src/service/base.ts:39-47`). Decide whether U00 hardcodes/minimally declares required resources for `example-todo` and `hq-ops`, or whether service dependency/resource declaration helpers must land before the runtime compiler can be honest.
5. Server harness extraction boundary. `apps/server` currently owns boot, route registration, Inngest bundle construction, and plugin mounting (`apps/server/src/bootstrap.ts:69-133`; `apps/server/src/rawr.ts:230-318`). U00 needs to decide whether `apps/server` becomes a legacy source to mine, a thin host app that calls `@rawr/hq-sdk/app-runtime`, or a package whose pieces are moved into `packages/runtime/harnesses/elysia`.
6. `bindService(...)` and `BoundaryCache` placement. The public seam can survive, but the cache and process/role scoped service binding behavior must move into the runtime substrate. U00 should not entrench the SDK-local `Map` as canonical runtime cache behavior.

These are not U00 blockers, but should update docs or later issue text:

1. The M2 milestone still points at the archived old Effect runtime subsystem spec as a reference (`docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md:29-39`). Once Alt-X synthesis lands, update references to the new runtime realization authority.
2. If the locked spec includes `server/internal` and `async/consumers`, update M2-U02/U03 language and future verifiers. This does not block first server API cut.
3. CLI, web, agent, desktop, OpenShell, desktop harnesses, and richer platform placement are contingent. They should not steer U00/U01.
4. Runtime topology catalog and diagnostics are important, but only need minimal placeholders before U02/U05 unless the implementation needs them for proof output.
5. Full `packages/runtime-context` deletion can stay in U06 unless U00/U02 replaces all current imports naturally. It is live support debt, but not the first cut.
6. Exact internal file decomposition under substrate, provider folders, schema/error modules, and observability modules is doc/update detail unless it affects package boundaries or public imports.

## Forward Evaluation

The repo is ready for a runtime implementation once the spec lock resolves the naming/topology inputs above. It is not blocked on deeper plugin/service internals. The service and plugin internals can evolve behind stable runtime contracts as long as U00 locks the correct public shell and hidden runtime ownership:

- app/entrypoint starts through `@rawr/hq-sdk` app-runtime APIs
- runtime compiler consumes a normalized graph, not arbitrary host glue
- bootgraph owns lifecycle planning
- Effect-backed substrate owns provisioning and one process runtime root
- process runtime owns service binding, surface assembly, and handoff
- harness adapters mount server/async surfaces without owning service truth

The next implementation should not try to preserve `legacy-cutover` as a hidden wrapper. The current evidence shows that the legacy bridge and server host chain are the runtime authority. Leaving them live would make the new runtime a facade, not a replacement.

The cleanest next move is:

1. Lock the synthesized runtime realization spec with explicit repo topology and public import names.
2. Update M2/U00 wording and Phase 2 gates only where those locked names differ from current M2.
3. Start U00 as the first production runtime cut: add the app-runtime public seam, add minimal runtime packages, route `apps/hq/server.ts` through `startAppRole`, extract/replace the server host chain, and delete `legacy-cutover`.
4. Keep U01-U06 order, with U02/U03 wording expanded if the final spec makes `server/internal` and `async/consumers` part of the active lane.

## Evidence Commands

- `git status --short --branch`
- `git worktree list --porcelain`
- `gt ls`
- `bunx nx show projects`
- `bunx nx show project @rawr/hq-app --json`
- `bunx nx show project @rawr/hq-sdk --json`
- `bunx nx show project @rawr/bootgraph --json`
- `bunx nx show project @rawr/runtime-context --json`
- `bunx nx show project @rawr/server --json`
- `bunx nx show project @rawr/example-todo --json`
- `bunx nx show project @rawr/hq-ops --json`
- `bun scripts/phase-2/verify-no-legacy-cutover.mjs --allow-findings`
- `bun scripts/phase-2/verify-server-role-runtime-path.mjs --allow-findings`
- `bun scripts/phase-2/verify-runtime-public-seams.mjs --allow-findings`
- `bun scripts/phase-2/verify-gate-scaffold.mjs`
- `bunx nx run @rawr/hq-app:structural -- --suite=m2-u00-current-findings`
- `bunx nx run @rawr/server:structural -- --suite=m2-u00-current-findings`
- `bunx nx run @rawr/hq-sdk:structural -- --suite=m2-u00-current-findings`
- `bunx nx run @rawr/bootgraph:structural`
- `bunx nx run @rawr/runtime-context:structural`
- Narsil repo: `rawr-hq-template#5c717202`, used for project-structure and runtime/legacy seam searches.
