# Enforcement Matrix

| Seam / invariant | Enforcement layer | Mechanism | Notes |
| --- | --- | --- | --- |
| Canonical kinds and dependency direction | Nx graph policy | Multi-axis tags plus `@nx/enforce-module-boundaries` | `packages -> services -> plugins -> apps` is a hard rule. |
| One app, multiple roles | Graph-derived shell validation | `app:hq` inventory plus `nx sync:check` | `apps/server`, `apps/web`, and `apps/cli` stay transitional physical homes only. |
| Role-first plugin topology | Nx graph policy + graph-derived shell validation | `role:*`, `surface:*`, `capability:*` tags plus path/tag coherence checks | Enforces `plugins/<role>/<surface>/<capability>`. |
| Manifest authority | Lint + structural static checks | Manifest-purity lint and manifest-shell verifier | Manifest may compose roles and surfaces, but not own host wiring or process boot. |
| Entrypoint thinness | Lint + structural static checks | Entrypoint-thinness lint and entrypoint verifier | Entrypoints select roles and mount booted surfaces; they do not redefine the app. |
| Host-shell correctness | Lint + structural static checks + seam tests | Host-composition verifier and runtime route-family tests | Removes the `apps/server/src/rawr.ts` blind spot. |
| Single truth owner per capability | Nx graph policy + structural static checks | Reclassification tags, ownership checks, and anti-duplication verifiers | Prevents split-brain service/plugin ownership. |
| Services remain truth owners | Nx graph policy | `type:service` cannot depend on `type:plugin` or `type:app` | V5 service promotions become enforceable. |
| Packages remain support matter | Nx graph policy + structural static checks | `type:package` depends only on packages; support packages may not own contracts or write authority | Protects support residue from re-absorbing truth. |
| Plugins remain projections only | Nx graph policy + seam tests | `type:plugin` depends on packages/services only; surface tests prove correct projection | Prevents plugins from becoming capability owners. |
| Bootgraph remains narrow and downstream | Graph-derived shell validation + future bootgraph tests | Shell inventory now; bootgraph-internal oracles later | Current enforcement protects the boundary, not the bootgraph API. |
| Evidence and closure gates remain durable | Structural static checks | Artifact-integrity verifier | Structural proof cannot depend on scratchpads or ephemeral planning artifacts. |
