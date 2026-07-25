# Service

`service` is the reusable contract-first oRPC kind shared by standalone
services and API-plugin service interiors. Read
[[.habitat/blueprints/service/skill|Service Capability Funnel]] before
applying the rules: the service is a narrowing capability funnel, and Habitat
is its backstop rather than a substitute for that design posture.

The topology packet owns the standalone package and public surface, closed root
spines, the dotless direct-child module namespace, closed module spines, named
model families with required kind-local indexes, optional service database
kinds, and both valid module router forms. A name such as `orders.v2` is not an
alternate module version; the closed namespace rejects it. The model-kind index
packet keeps those indexes to curated direct-sibling re-exports. The
router-surface packet enforces exactly one reachable module router;
router-authorship keeps directory indexes composition-only and real semantic
groups documented. The remaining independent packets own positive
generic-anchor presence, exact native service/module authoring views, the
host-admission boundary, the context funnel, and the canonical module import
surface.
Embedded API-plugin `base.ts` remains its required boundary and type anchor but
does not export the standalone runtime `base`; its implementer begins at
`impl.ts`. Named runtime oRPC imports may share a declaration with type-only
specifiers.

Closed module shells admit `AGENTS.md` so a module-local product-context router
can live at the ownership boundary. The `agent-router` blueprint selects the
same dotless module set, alone requires that document, and owns its positive
source shape; service topology does not create a second documentation
requirement.

Contract and error packets own the single exported contract, Standard Schema
adaptation at every operation input/output, bounded private support
reachability, and private public-error constructor lineage when those support
declarations are present. Private schema composition, local error maps,
fragments, and helpers remain valid only while they are syntactically reachable
from the one contract anchor; imported or dynamic error-map authority and
exported parallel schema, type, envelope, or helper authority remain invalid.
RAWR-owned amendments keep private import aliases owner-local and service
implementation independent of concrete platform and provider code.
TypeScript owns exact service, module, and final host context. Source law keeps
their native ownership hops visible without simulating path resolution,
inferred types, expression purity, or runtime behavior.

Empty baselines keep current product disagreements visible. Habitat structure
owns topology, Grit owns the declared source relations, and behavior tests
remain with the behavior they prove. `shared`, `internal`, `dependencies`,
loose `schemas.ts`, whole-model barrels, context assembly files, and
procedure/operation buckets are not service destinations.
