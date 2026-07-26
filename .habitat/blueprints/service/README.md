# Service

`service` is the reusable contract-first oRPC kind shared by standalone
services and API-plugin service interiors. Read
[[.habitat/blueprints/service/skill|Service Capability Funnel]] before
applying the rules: the service is a narrowing capability funnel, and Habitat
is its backstop rather than a substitute for that design posture.

The topology packet owns the standalone package and public surface, closed root
spines, the canonical lowercase-kebab module namespace, closed module spines,
direct model leaves, and one module router shape. A name such as `orders.v2`
is not an alternate module version; the closed namespace rejects it. Model
`index.ts` files are structurally forbidden so imports retain the concrete
owner and leaf. No service currently admits `db`; persistence returns only
through a separately owned, positively closed database blueprint.

Every module has `router.ts` as its completed public composition face and
`router/*.router.ts` as its operation-authoring leaves or semantic groups.
`router/index.ts` is not admitted. Router-authorship keeps module `router.ts`
composition-only and documents real semantic groups. The remaining independent
packets own positive generic-anchor presence, the direct native base and exact
service-branch module hop, the context funnel, normalized owner aliases, and
module isolation.
Embedded API-plugin `base.ts` remains its required boundary and type anchor but
does not export the standalone runtime `base`; its implementer begins at
`impl.ts`. Named runtime oRPC imports may share a declaration with type-only
specifiers.

Closed module shells require `AGENTS.md` at the ownership boundary. The
`agent-router` blueprint owns the document's positive source shape. The
`rawr/repository` niche audits the cross-kind placement lattice without
acquiring service-module topology or creating another constructible package
shape.

Contract and error packets own the single exported contract, Standard Schema
adaptation at every operation input/output, bounded private support
reachability, and private public-error constructor lineage when those support
declarations are present. Private schema composition, local error maps,
fragments, and helpers remain valid only while they are syntactically reachable
from the one contract anchor; imported or dynamic error-map authority and
exported parallel schema, type, envelope, or helper authority remain invalid.
RAWR-owned amendments keep private import aliases owner-local and service
implementation independent of concrete platform and provider code. Root
`router.ts` imports completed module routers only and directly checks the plain
object against `Router<typeof contract, never>`. Each `module.ts` derives its
matching `service.<module>` branch. A bare branch inherits service context;
module capability middleware is authored from the one complete-context native
author in `base.ts` and attached without explicit type arguments. The
contribution is additive and inferred; the elected author is separate from the
contract implementer and does not claim subtractive handler context. SDK-owned
required observability and analytics builders remain distinct baseline
extensions, not alternate context factories. The pinned oRPC 1.x lane cannot
close this heterogeneous-context router with native `.router(...)` without
centralizing module dependencies, so the public host boundary infers the
completed router's actual context. TypeScript
owns context assignability. Source law keeps native ownership hops
and root contract completeness visible without simulating path resolution,
inferred types, expression purity, or runtime behavior. This root composition
law adopts Magic Migration `52873620ffe0b8b6e60527cd399076fc13ab86a7`
(PR #109) without changing RAWR's named module-router authorship shape.

Empty baselines keep current product disagreements visible. Habitat structure
owns topology, Grit owns the declared source relations, and behavior tests
remain with the behavior they prove. `shared`, `internal`, `dependencies`,
loose `schemas.ts`, model `index.ts` barrels, context assembly files, and
detached operation buckets are not service destinations.

The topology, anchor, module-isolation, context, composition, router-authorship,
and production platform-independence rules remain advisory while the lifecycle
service is being moved into this shape. Their fixture contracts are sealed now;
the burn-down must make the live corpus conform before one later activation
checkpoint changes them to enforced rules and adds them to the Habitat-owned
repository gate.
