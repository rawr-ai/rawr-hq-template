# V5 To Enforcement Crosswalk

| V5 area | Enforcement consequence | Primary layer |
| --- | --- | --- |
| Service promotions (`coordination`, `state`, `journal`, `security`, `session-intelligence`, `agent-config-sync`) | Projects must retag to `type:service` with `capability:*`; service truth may no longer live in `packages/*` or app-local seams. | Nx graph policy |
| `packages/hq` recomposition into `plugin-management` | `workspace`, `install`, and `lifecycle` logic cannot remain inside a mixed support package; support residue must be reclassified or retired. | Nx graph policy + structural static checks |
| `hq-operations` extraction from `apps/cli/src/lib/hq-status.ts` | App-local operational truth becomes service-owned; app role projects may project it but not own it. | Nx graph policy |
| `core` router split | `packages/core/src/orpc/runtime-router.ts` cannot remain a home for service handlers. | Structural static checks + Nx graph policy |
| `support-example` authority collapse | Workflow projection cannot co-own support truth; one service boundary must own the capability. | Structural static checks + seam tests |
| Role-first plugin topology | Every plugin project must carry coherent `role:*`, `surface:*`, and `capability:*` metadata matching canonical paths. | Graph-derived shell validation |
| Plugin lifecycle duplication under `plugins/cli/plugins` | Duplicated install/lifecycle truth in a plugin becomes a structural failure. | Structural static checks |
| `@rawr/cli -> @rawr/plugin-plugins` dependency | Direct app-to-plugin imports outside manifest or entrypoint composition seams must fail. | Nx graph policy |
| HQ app seam reservation | Runtime projects must be modeled as one `app:hq` shell with role-owned entrypoints and a composition-only manifest. | Graph-derived shell validation + lint |
| Bootgraph reservation | `packages/bootgraph` is protected as narrow support infrastructure; app truth, manifest truth, and plugin discovery stay elsewhere. | Graph-derived shell validation |
