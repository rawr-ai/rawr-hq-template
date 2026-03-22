## Settled facts from canon and V5

- The durable repo ontology is fixed: `packages` = support matter, `services` = semantic capability truth, `plugins` = runtime projection, `apps` = app identity plus manifest and entrypoints.
- The semantic stack is fixed: `app -> manifest -> role -> surface`.
- The runtime realization stack is fixed: `entrypoint -> bootgraph -> process`.
- The operational mapping is downstream only: locally `process -> machine`; on Railway `entrypoint -> Railway service -> replica(s)`. Those are not core architecture nouns.
- `hq` is the app identity. `server`, `async`, `web`, `cli`, and `agent` are peer runtime roles, not peer apps and not surface kinds.
- The canonical plugin tree is settled as `plugins/<role>/<surface>/<capability>` with these roots: `server/api`, `server/internal` only if earned, `async/workflows`, `async/consumers`, `async/schedules`, `web/app`, `cli/commands`, `agent/tools`.
- The manifest is upstream authority for app identity, role membership, boot contributions, and surfaces. It is the canonical runtime definition of the app. It is not the bootgraph, not process placement, not Railway topology, and not Nx policy.
- Entrypoints are explicit process mount decisions. They select one or more manifest-defined roles for one process. They do not redefine app truth and do not act as a second manifest.
- The bootgraph is process-local and narrow. It owns boot-module identity, dependency ordering, dedupe, rollback, shutdown order, typed process context assembly, and only two lifetimes: `process` and `role`.
- Services own contracts, procedures, context lanes, business invariants, and capability truth. Shared infrastructure does not create shared semantic ownership.
- Plugins are projections only. They contribute role/surface-specific boot modules and surface descriptors. They do not own business truth, app truth, or process truth.
- Apps compose services and plugins into manifests and entrypoints. They do not redefine service truth.
- oRPC is the default local-first callable harness at the service boundary and server projection boundary. It is not the bootgraph.
- Inngest belongs in the `async` plane as the durability harness for async work. It does not replace the synchronous service layer.
- The canonical semantic dependency direction is fixed: `packages -> services -> plugins -> apps`. Bootgraph stays as support infrastructure downstream of entrypoints, not a peer semantic authority.
- Repo-specifically, V5 settles that current `apps/server`, `apps/web`, `apps/cli`, and root `rawr.hq.ts` are transitional filesystem state, not enduring ontology. Enforcement must encode one `app:hq` shell, not preserve today’s directory names as truth.
- Repo-specifically, V5 also settles that capability-truth owners ratchet toward `services/*` and support matter ratchets toward `packages/*`; those classification calls are not open re-litigation inside the enforcement lane.

## Exact enforcement implications

- Enforcement must model `app`, `role`, and `surface` as distinct axes. It must not blur `role` and `surface`, and it must not treat `apps/server`, `apps/web`, or `apps/cli` as durable app identities.
- Enforcement must validate manifest-shell authority: manifest defines roles, boot contributions, and surfaces; entrypoints define which roles boot in one process; bootgraph only realizes that process.
- Enforcement must validate plugin path and metadata coherence against the canonical role-first tree: `plugins/<role>/<surface>/<capability>`.
- Enforcement must forbid inward semantic dependency inversion: service truth cannot depend on plugins or apps; plugins cannot become upstream semantic authorities over services; apps cannot redefine service truth.
- Enforcement must encode that one capability has one truth owner. Split-brain service/plugin ownership is invalid even if both pieces currently work.
- Enforcement must treat `server/internal` as optional and earned, not a baseline required surface.
- Enforcement must keep operational placement out of ontology enforcement. Railway services, replicas, and machine placement may be checked as deployment facts elsewhere, but not encoded as primary architectural kinds here.
- Enforcement must keep bootgraph checks scoped to process-local lifecycle semantics and lifetime vocabulary only. It must not let bootgraph metadata become a second app-composition layer.
- Enforcement must ratchet toward the target `app:hq` shell immediately, while allowing transitional physical layout only as an explicitly marked migration state.

## What this lane proves

- Canon already settles the nouns, authority seams, and dependency direction strongly enough for enforcement to encode them now.
- V5 is authoritative in this lane only where it aligns with canon by turning those settled boundaries into repo-local classification calls and transitional-shell rules.
- The enforcement spec does not need more architectural debate before it can lock ontology, ownership direction, and shell coherence.

## Where another lane must supply the mechanism

- Exact Nx tag names, metadata schema, and `depConstraints` syntax.
- Exact target ownership for `structural`, `sync`, `lint`, `test`, and `typecheck`.
- Exact graph-derived inventory or sync-check machinery for manifest, entrypoint, and other import-invisible relationships.
- Exact migration exceptions, staging rules, and physical file/project moves.
- Exact bootgraph API shape, internal decomposition, and any future plugin authoring API.

## Open only if canon is genuinely unresolved

- Whether async “resident” execution earns a canonical plugin root. Canon names resident execution conceptually, but only `workflows`, `consumers`, and `schedules` are settled plugin roots.
- The threshold for when runtime-specific multi-service composition must be promoted into a composed service. Canon leaves that frontier intentionally downstream.
- The final landing package name for extracted Inngest auth support matter. Its classification as support matter is settled; its exact home is not.
- The exact public API and internal structure of `packages/bootgraph` beyond its narrow ownership boundary.
