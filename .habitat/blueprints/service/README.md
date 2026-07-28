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
owner and leaf. A standalone service may add one optional root `db` boundary
governed by the separately owned, positively closed
[[../database/README|database blueprint]]. Modules and embedded API services
do not admit `db`.

Every module has `router.ts` as its completed public composition face and
`router/*.router.ts` as its operation-authoring leaves or semantic groups.
`router/index.ts` is not admitted. Router-authorship keeps module `router.ts`
composition-only and documents real semantic groups. The remaining independent
packets own positive generic-anchor presence, the direct native base and exact
service-branch module hop, the context funnel, and module isolation. Proof
isolation keeps package tests downstream from standalone production service
source. Private-alias ownership keeps service aliases owner-local, while
public-consumer sealing rejects literal `src/service` paths from foreign
callers. Module-local imports use normalized relative paths; the service-private
alias is reserved inside modules for genuinely service-wide `service/model/**`
meaning. Database source flows only into other database-owned source or named
service-root middleware; modules receive projected store capabilities through
inherited context.
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
declarations are present. Contract property-description law requires every
directly authored TypeBox object property, including API transport containers,
to declare its meaning or delegate it to a named schema authority. Standalone
and embedded API services apply that one source law at their own bounded
Habitat scan roots. Private schema composition, local error maps, fragments,
and helpers remain valid only while they are syntactically reachable from the
one contract anchor; imported or dynamic error-map authority and exported
parallel schema, type, envelope, or helper authority remain invalid.
RAWR-owned amendments keep private import aliases owner-local, keep module
colocality visible through relative imports, and keep service
implementation independent of concrete platform and provider code. Root
`router.ts` imports completed module routers through exact relative paths only
and directly checks the plain
object against `Router<typeof contract, never>`. Each `module.ts` derives its
matching `service.<module>` branch. Module capability middleware is authored
from the one complete-context native author in `base.ts` and attached without
explicit type arguments. Every module then ends with one terminal inline
curation whose nonempty explicit fields select
direct noncomputed member paths rooted below the four input lanes or the
`provided` bucket. Named middleware and module
curation are additive and inferred; neither claims subtractive handler
context. Router handlers author against the curated names rather than reopening
the raw lanes. A standalone service provider author is specialized once in
`base.ts`, exported under the canonical `createServiceProvider` name, and used
only by named root service middleware through `../base`. Modules and other
service source cannot consume it, and this packet does not admit embedded API
provider authorship. Root and module middleware otherwise reach `base.ts`
through `../base` and `../../../base` respectively. SDK-owned
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

The topology, anchor, module-isolation, context, composition, and
router-authorship rules remain advisory while the strengthened module-curation
law is burned through the live service corpus. Their fixture contracts stay
sealed; activation follows only after every module and router is green.

Production platform independence is enforced across the complete admitted
service corpus. Concrete Node and Bun runtime acquisition must terminate at a
host, resource, or provider and enter service behavior as a ready context
capability. Portable deterministic computation may remain with its owning
policy when it has no acquisition or lifecycle protocol.
