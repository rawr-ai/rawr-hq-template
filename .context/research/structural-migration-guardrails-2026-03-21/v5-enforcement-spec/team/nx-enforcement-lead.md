## Settled facts from canon and V5

- The canonical semantic kinds are `packages`, `services`, `plugins`, and `apps`. `packages/bootgraph` is support infrastructure, not a fifth semantic layer.
- The fixed semantic model is `app -> manifest -> role -> surface`. The fixed runtime realization model is `entrypoint -> bootgraph -> process`.
- `hq` is one app identity. `server`, `async`, `web`, `cli`, and `agent` are roles inside that app, not peer app identities.
- Manifest authority is upstream. It owns app identity, role membership, boot contributions, and surfaces. Entrypoints explicitly select which roles boot in one process. Nx must validate that seam, not replace it.
- Semantic dependency direction is fixed: `packages -> services -> plugins -> apps`.
- Services own semantic capability truth. Plugins project that truth into runtime surfaces. Apps compose plugins and services into manifests and entrypoints.
- The canonical plugin topology is `plugins/<role>/<surface>/<capability>`, with allowed surfaces fixed by role.
- V5 classification is materially settled for enforcement purposes: the identified future services are not open classification debates, the role-first plugin tree is canonical, and current `apps/server`, `apps/web`, and `apps/cli` are transitional runtime homes rather than enduring app identities.
- The current Nx posture is insufficient: tags are mostly coarse `type:*`, `type:app` is effectively unconstrained, `apps/server/src/rawr.ts` is outside ESLint boundary enforcement, and root package scripts still own most structural verification.

## Exact enforcement implications

- The required Nx tag axes are:
  - `type:*` with canonical values `type:package`, `type:service`, `type:plugin`, `type:app`
  - `capability:*` for semantic boundary ownership
  - `app:*` with `app:hq` now
  - `role:*` with `role:server|async|web|cli|agent`
  - `surface:*` with `surface:api|internal|workflows|consumers|schedules|app|commands|tools`
  - `migration-slice:*` as transient rollout tags only
- Non-architectural workspace helpers such as fixtures and the root aggregator should not masquerade as canonical architecture kinds. They need a non-semantic classification such as `type:tool` or must stay outside the structural regime.
- Every `type:plugin` project must carry exactly one `role:*`, exactly one `surface:*`, and one `capability:*`. The role/surface legality matrix is fixed:
  - `role:server` only with `surface:api|internal`
  - `role:async` only with `surface:workflows|consumers|schedules`
  - `role:web` only with `surface:app`
  - `role:cli` only with `surface:commands`
  - `role:agent` only with `surface:tools`
- Every app-owned runtime project must carry `type:app`, `app:hq`, and the relevant `role:*`. Current `@rawr/server`, `@rawr/web`, and `@rawr/cli` must therefore be treated in Nx as HQ role projects, not as three app identities.
- Services must carry `type:service` plus `capability:*`. The V5-promoted package candidates cannot stay tagged as `type:package` once the enforcement layer claims to protect target architecture; otherwise the graph is enforcing the old world.
- Packages are upstream support matter. In the structural regime they may depend only on other packages.
- Services may depend on packages and other services, but never on plugins or apps.
- Plugins may depend on packages and services, but never on apps or other plugins.
- Apps may depend on packages, services, and plugins, but not on other apps. `type:app -> *` is structurally invalid and must not survive.
- `@nx/enforce-module-boundaries` is the first-line fence. It must move from single-axis `type:*` policy to multi-axis policy, using `allSourceTags` where needed so kind rules and role/surface rules compose rather than compete.
- Boundary lint cannot retain `apps/server/src/rawr.ts` as an exclusion. That file must be inside the same first-line fence as the rest of the runtime shell.
- Structural target ownership is part of enforcement, not an implementation detail. The canonical target surface is `lint`, `test`, `typecheck|build`, `structural`, and `sync`. Each participating project or tag cohort owns those checks; the root project may aggregate them, but it is not the owner.
- Graph-derived enforcement starts where imports stop telling the truth. The mandatory graph-derived inventory should validate:
  - app identity is `hq`
  - manifest ownership exists and is app-owned
  - entrypoint-to-role mapping is coherent
  - plugin path matches `role/surface/capability` tags
  - dependency direction matches kind tags
  - transitional exceptions are explicit and finite
- `nx sync:check` is the hard-fail drift gate for that inventory. It should validate graph-derived architectural truth; it must not become a second manifest or a host-runtime oracle.
- Custom structural analyzers remain valid, but only as project-owned `structural` implementations or as inputs to `sync` checks. They are no longer the control plane.

## What this lane proves

- Nx OSS is sufficient to be the structural control plane for V5. Enterprise features may help later, but they are not required to make the shell mechanically enforceable.
- Import-visible architecture can be enforced immediately with multi-axis tags plus module-boundary rules.
- Tag-defined cohorts are sufficient to make slices first-class enforcement units; explicit project lists are not the right enduring model.
- Graph-derived shell checks are also Nx-native once the architecture inventory is generated and drift-checked with `nx sync:check`.
- This lane proves the enforceable shape of the control plane. It does not prove runtime behavior, manifest purity, bootgraph correctness, or host-composition correctness by itself.

## Where another lane must supply the mechanism

- The repo-mapping lane must supply the authoritative project reclassification and retagging, especially for V5-promoted services and the re-identified HQ role projects.
- The task-orchestration lane must supply the concrete target implementations, `targetDefaults`, `namedInputs`, cache policy, and `affected`/CI wiring.
- The graph-extensibility lane must supply the sync generator and, when needed, the project-graph plugin that models manifest-shell or bootgraph edges once those edges are semantically real but import-invisible.
- The architecture/runtime lanes must supply the actual oracles for manifest purity, host composition, route-family constraints, bootgraph semantics, and other domain-specific checks that Nx can select and ratchet but cannot infer.
- The service and plugin authoring lanes must supply the canonical source-of-truth declarations that the Nx layer validates; Nx must not invent those declarations.

## Open only if canon is genuinely unresolved

- No canonical ambiguity remains on app identity, role set, plugin topology, manifest authority, bootgraph scope, or dependency direction.
- The only unresolved items are mechanism choices canon intentionally leaves open:
  - exact tag spellings beyond the required dimensions
  - whether the manifest shell is modeled as one Nx app project or several app-owned projects
  - the precise moment when non-import bootgraph edges become real enough to justify project-graph modeling rather than remaining runtime-oracle concerns
