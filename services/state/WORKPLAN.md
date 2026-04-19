## Node 4 state service-shell correction

### Example-todo hard shell to match

- Package root is thin and stable.
- `src/index.ts` exports only package-boundary entry points plus boundary types.
- `src/router.ts` is a stable export shim over `src/service/router.ts`.
- `src/client.ts` owns in-process client creation through `defineServicePackage(router)`.
- `src/service/base.ts` is the single declarative service seam.
- `src/service/contract.ts` composes the service contract.
- `src/service/impl.ts` creates one central implementer.
- `src/service/router.ts` performs the final router composition.
- Plugin package owns runtime projection and runtime context dependence.

### State-specific business logic to preserve

- Repo-local state authority remains `.rawr/state/state.json`.
- Atomic mutation and lock behavior in `src/repo-state/storage.ts` stays intact.
- Public repo-state helpers remain available from `@rawr/state/repo-state`.
- Runtime API behavior still returns `{ state, authorityRepoRoot }`.

### Design choices for this cut

- Move the service shell to `src/client.ts`, `src/router.ts`, and `src/service/*`.
- Keep repo-state persistence logic in `src/repo-state/storage.ts`; do not move that into the plugin.
- Model the service boundary around repo authority identity in `scope.repoRoot`.
- Keep the service capability semantic (`getState`) and let the plugin project it under the runtime `state.getRuntimeState` namespace.
- Remove runtime-context dependence from `services/state/**`.
- Keep runtime-context dependence inside `plugins/api/state/**`.
- Thin `@rawr/state` to the same boundary shape as `@rawr/example-todo`; publish persistence helpers from `@rawr/state/repo-state`.

### Current-state re-evaluation

- The example-todo shell is present structurally in `services/state` and now remains semantic-only with `getState`.
- The plugin now owns the runtime-facing `state.getRuntimeState` namespace and `/state/runtime` route metadata.
- External imports that still expect `@rawr/state` to own transport-facing contract artifacts are outside this slice and remain fallout, not something to reintroduce into the service package.

### Seam classification

1. Core capability/service truth
   - `src/repo-state/storage.ts`: authority, persistence, locking, atomic mutation.
   - `src/repo-state/model.ts`: canonical repo-state shape.
   - `src/service/base.ts`: semantic service declaration and stable boundary lanes.
   - `src/service/contract.ts`: semantic procedure names plus input/output schemas only.
   - `src/service/impl.ts`: single service implementer seam.
   - `src/service/router.ts`: semantic handler composition for in-process use.
   - `src/client.ts`, `src/router.ts`, `src/index.ts`: thin in-process package boundary.
2. Plugin/runtime projection
   - `plugins/api/state/src/router.ts`: runtime-context translation and service-client invocation.
   - `plugins/api/state/src/contract.ts`: transport-facing oRPC contract projection, including route metadata for `/state/runtime`.
   - `plugins/api/state/src/index.ts`: plugin registration under the `orpc` namespace.
3. Temporary residue to delete or collapse
   - Outside-owned references to deleted `@rawr/state` transport artifacts such as `@rawr/state/orpc`.
   - Outside-owned scripts/tests still pointing at removed `packages/state/*` or `services/state/src/orpc/*` paths.

### Implementation decisions

#### Keep authority identity in the service response

- `authorityRepoRoot` stays in the service output.
- Reason: it describes the capability authority boundary, not HTTP/runtime transport.
- Risk: if a later pass wants a narrower pure-state response, downstream callers need a coordinated migration.

#### Project route metadata from the plugin contract

- `plugins/api/state/src/contract.ts` becomes the transport-facing projection seam.
- Reason: the plugin owns runtime namespace, HTTP route metadata, and runtime-context translation.
- Risk: plugin projection depends on oRPC route decoration remaining stable on projected procedures.

### Executable mini-plan

1. Keep `services/state/src/service/contract.ts` and `services/state/src/service/router.ts` semantic-only with `getState`.
2. Keep `@rawr/state` thin and avoid re-exporting transport-facing contract artifacts from the service package root.
3. Rebuild `plugins/api/state` so it owns `/state/runtime` route metadata, runtime context translation, and the `getRuntimeState` projection over service `getState`.
4. Run targeted checks on `services/state` and `plugins/api/state`.
5. Capture any breakage that remains outside owned files for follow-up integration.
