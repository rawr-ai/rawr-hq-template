## Settled facts from canon and V5

- The architecture is fixed as `app -> manifest -> role -> surface`, with runtime realization fixed as `entrypoint -> bootgraph -> process`. `HQ` is one app; `server`, `async`, `web`, `cli`, and `agent` are roles, not peer apps.
- Semantic direction is fixed as `packages -> services -> plugins -> apps`. Services own capability truth. Plugins project that truth into role/surface runtime seams. Apps own composition authority.
- The manifest is upstream authority for app identity, role membership, boot contributions, and surfaces. Entrypoints explicitly select roles. The bootgraph is downstream, process-local, and only owns boot ordering, dependency resolution, rollback/shutdown, and `process` / `role` lifetimes.
- The canonical plugin tree is fixed as `plugins/<role>/<surface>/<capability>`.
- V5 settles the classification posture and the target shell. Current `apps/server`, `apps/web`, and `apps/cli` are transitional runtime homes, not target-state app identities.
- The decisive guardrails doc is explicit that current custom gates remain valuable, but as oracle layers under Nx orchestration, not as a substitute control plane.
- The current repo already has the right kinds of non-Nx oracle checks: manifest smoke, host composition guard, route boundary matrix, harness matrix, telemetry/observability contracts, and evidence-integrity gates. It also has one known blind spot: `apps/server/src/rawr.ts` is excluded from ESLint and that exemption must end.

## Exact enforcement implications

- `Lint` in this lane should prove file-local purity, not cross-project graph policy. The load-bearing lint rules are:
  - Manifest purity: the manifest may compose roles, surfaces, and boot contributions, but may not own host wiring, framework listener setup, env-driven placement logic, direct process boot, or ad hoc runtime assembly.
  - Entrypoint thinness: entrypoints may select roles, derive boot input, start the bootgraph, and mount surfaces; they may not redefine app identity, discover plugins, or bury role selection behind framework magic.
  - Host-shell seam purity: host files such as `apps/server/src/rawr.ts` must consume manifest-owned seams and runtime adapters explicitly, and must not bypass the manifest with app-internal router construction or hidden route families.
  - Legacy metadata hard-delete: forbidden historical metadata keys remain statically banned anywhere they would affect active runtime behavior.
- `Structural static checks` in this lane should be AST/file-system verifiers for architecture that imports alone cannot prove:
  - Manifest shell verifier: the manifest declares the required composition seams and only those seams.
  - Host composition verifier: the host imports the manifest authority seam, mounts the required route families, preserves explicit mount order, and avoids forbidden seams like dedicated `/rpc/workflows`.
  - Route/harness declaration verifier: the route-boundary matrix declares every required suite and negative assertion so the runtime tests cannot silently narrow coverage.
  - Artifact-integrity verifier: phase/closure gates depend only on durable artifacts, not scratchpads, planning-pass files, or ephemeral session outputs.
- `Seam-specific tests` in this lane should prove behavior at the boundaries the canon actually cares about:
  - Route-family separation between external callers, first-party RPC, runtime ingress, and in-process callers.
  - Manifest-owned composition of server/workflow surfaces rather than app-internal ad hoc wiring.
  - No leakage of legacy or wrong-surface procedures into canonical route families.
  - Ingress authentication and spoofing rejection before runtime dispatch.
  - Request-scoped context behavior and runtime authority stability across alias roots or equivalent host-initialization seams.
  - Typed service-to-plugin projection behavior on the canonical surfaces that V5 keeps or promotes.
- What each layer proves:
  - Lint proves local purity and forbidden constructs.
  - Structural static checks prove declared shell shape and gate integrity.
  - Seam-specific tests prove actual runtime boundary behavior.
  - None of those prove the project graph, tag coherence, or slice selection; that belongs elsewhere.

## What this lane proves

- This lane proves that code inside the shell obeys the canon after Nx has selected the slice. It is the oracle for invariants that are semantic or behavioral rather than graph-topological.
- Concretely, it should prove:
  - The manifest stays composition-only and upstream.
  - Entrypoints stay explicit and thin.
  - Host runtimes consume manifest seams instead of inventing second manifests.
  - Route families preserve the caller-surface model: `/rpc` is not public, `/api/inngest` is ingress-only, `/api/workflows/<capability>` is capability-first, and `/rpc/workflows` does not exist as a caller-facing family.
  - Plugins remain projections on canonical surfaces and do not leak capability truth through wrong routes.
  - Closure/evidence gates remain deterministic and durable, so enforcement cannot “pass” by depending on scratch artifacts or stale planning files.
- The lane should not try to prove repo-wide dependency direction twice. Its job is to catch shell drift, seam drift, and runtime drift that graph policy cannot see.

## Where another lane must supply the mechanism

- The Nx boundary lane must supply the cross-project dependency mechanism:
  - tag taxonomy
  - `@nx/enforce-module-boundaries`
  - project retagging as services/plugins/apps move
  - removal of `type:app -> *`
- The graph/extensibility lane must supply the graph-derived shell mechanism once relationships are semantically real but import-invisible:
  - architecture inventory
  - sync generator / `nx sync:check`
  - project-graph modeling for manifest/entrypoint/bootgraph edges when imports stop telling the truth
  - path/tag coherence for `app:*`, `role:*`, `surface:*`, and canonical plugin roots
- The task-orchestration lane must supply the execution mechanism:
  - project-owned `structural` targets
  - `targetDefaults` / `namedInputs`
  - `run-many` / `affected`
  - cache policy and uncached proof runs
- The repo-mapping lane must supply the authoritative project decomposition and transitional exception map. This lane can say “a gate must prove plugin path purity” but not which Nx project names or graph edges encode that truth.

## Open only if canon is genuinely unresolved

- The exact implementation vehicle for file-local purity is open: custom ESLint rules, standalone AST verifiers, or both. The invariant is not open.
- Bootgraph-internal proof beyond the manifest shell is open until concrete bootgraph modules and non-import-visible boot edges exist. Canon fixes the bootgraph boundary, but not yet the final static/runtime oracle shape for internal bootgraph mechanics.
- The exact plugin authoring API shape remains open, but that does not change the proof obligation: plugins must remain runtime projection only.
