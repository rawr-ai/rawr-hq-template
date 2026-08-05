# Service

`service` is the reusable contract-first oRPC kind. Its v3 structure defines a
standalone service project. Embedded API-plugin service interiors reuse the
applicable service source laws through their own additive plugin kind; they are
not instances of the standalone project structure.

The topology packet owns the standalone package/public face, its optional
package-root proof tree, and the root and module interior spines. Optional
service-root middleware is closed to direct simple kebab-case `.ts` leaves;
it has no barrel, nesting, or role suffix. A module exposes its required closed
`contract/` directory through `contract/index.ts`, authors operations in a
closed `router/` directory of named `<name>.ts` leaves, and composes them
through one module-root `router.ts`. An optional closed `middleware/` directory
retains its indexed catalog only when middleware exists. A module-level
`contract.ts` and `router/index.ts` are not part of the kind. Root service
`contract.ts` and `router.ts` remain because they compose modules. Embedded API
service interiors do not contain proof; the independently selected
`plugin-server-api` kind owns their package-root behavior/support topology.
Optional model facts live as direct leaves under `dto`, `entities`, `errors`,
`policy`, or `ports`. Each present model kind has one `index.ts`
import face over its direct semantic leaves; there is no service-wide
`model/index.ts`. The barrel owns no decisions and does not turn access into
shared meaning. `shared`, `internal`, `dependencies`, and `helpers` are not
model destinations. An entity has stable domain identity that survives
attribute changes and participates in domain transitions. Persistence may
evidence that meaning but cannot establish it by itself. TypeBox owns the
canonical entity schema and generated type. A DTO is an operation or boundary
projection and may compose, pick, omit, or refine an entity without acquiring
its authority. Service-root entities own identity or invariants that genuinely
span modules; access alone never promotes module meaning. Module entities
remain specific to one subdomain. A port describes an external capability
seam, while policy owns decisions and definitions; neither becomes an entity
because several callers can reach it. A standalone service spine admits the
optional `db` child whose entire topology and import funnel belong to the
independent [[../database/README|database blueprint]]; modules and embedded API
service interiors do not own database placement. The shared TypeBox authority and
platform-independence laws cover service- and module-owned entity leaves.
Entities remain upstream of DTO, contract, database, store, transport, and
persistence concerns. The independent source packets own
positive generic-anchor presence, the native declaration-to-implementation
lineage and exact service-branch module hop, context boundaries, configured router
authorship, the canonical module import surface,
platform-neutral contract, schema, and DTO declarations, and standalone
production-to-proof isolation. They also seal private standalone-service
implementation aliases from foreign consumers and close explicit untyped
Effect failure slots at service capability boundaries. The
[[skill|service capability funnel]] is the authoring frame for these rules.

Standalone service proof lives only under optional package-root `test/`.
Service-owned behavior suites live directly at `behavior/*.test.ts`, while
module-owned behavior follows its production owner at
`behavior/modules/<module>/*.test.ts`. Client and database mechanics use
`mechanics/{client,db}/*.test.ts`; contract mechanics admit both
`mechanics/contract/*.test.ts` and `mechanics/contract/*.typecheck.ts`.
Integration suites live at `integration/*.test.ts`; separately scheduled
environment-qualified acceptance suites live directly at
`acceptance/*.test.ts`; and reusable non-suite assets remain at
`support/{db,service,modules/<module>}/*.ts`.
Categories remain optional and need not exist when a service has no proof of
that kind.
The source catalog schema-admits the v3 service definition, but no service
instance exists and the definition has no release-pack acceptance. Its current
generic rule set is structure-only: the enforced RAWR-path-qualified v2 Grit
construction laws remain outside the definition pending a location-independent
recut.
The candidate already exposes only its `project` root and binds every source
scope through blueprint-owned `src/**` paths. That simplification prevents
source redirection but does not promote the candidate into the policy pack.
Release-pack acceptance waits until finite contract, operation-semantic, and
root-execution member axes are frozen and the application resolver can reject
unselected members. No open support, helper, runtime, fixture, or case-by-case
proof cabinet is admitted. Existing v2 service proof topology remains
compatibility evidence during that transition.
`test`, `tests`, and `__tests__` directories do not live under standalone or
API-embedded service source, and standalone service `src/` does not contain
`*.test.ts` or `*.spec.ts` suite files. API plugin proof remains governed by
its additive kind rather than acquiring the standalone service axes.

Standalone production TypeScript does not acquire package proof through a
literal relative module source that resolves beneath its package-root `test`
directory. A production operation named `test` remains ordinary source. Static
imports, re-exports, `import()`, `require()`, and `require.resolve()` share that
one source law. Package-root tests may still import production source; embedded
API-plugin services remain outside this standalone rule. No alias to proof code
is admitted.

Standalone service source and package-root proof may consume the matching
private `#<owner>-service/*` alias. Every app, package, plugin, resource, tool,
or sibling service consumes the deliberate public client face instead of a
private alias or a literal module source that visibly names the service tree.
The public-consumer packet also closes the sibling `<owner>/src/service`
relative shape from within another service package. It does not resolve
arbitrary relative paths; Nx owns project-kind direction and ordinary path
data remains outside the source relation.

Contract and error packets own the single exported contract directory
entrypoint and one operation or deliberate group per direct leaf. They own Standard Schema
adaptation at every procedure input/output and public error-data position, plus
private native error-map authority when those declarations are present.
Contract property-description law requires every
directly authored TypeBox object property, including API transport containers,
to declare its meaning or delegate it to a named schema authority. Standalone
and embedded API services apply that one source law at their own bounded
Habitat scan roots. Private schema composition, local error maps, fragments,
and helpers remain source-local; Knip owns private reachability and the
contract law does not govern general schema/type naming outside its declared
owners. Imported or dynamic error-map authority remains invalid.
The kind preserves one implementation lineage across three flows. Module
contracts compose into the root contract; `base.ts` declares one complete
context and adds a native author only when context middleware needs it;
`impl.ts` implements that aggregate contract once and
configures the root `service`; modules descend through exact configured
branches; plain module operation trees ascend to the root; and the unconfigured
root `impl` performs the sole aggregate router implementation. Executable
interiors do not reconstruct contract or context
types. TypeScript owns context assignability and router completeness. Behavior
tests own runtime ordering, request isolation, and once-only root execution.

`base.ts` always exports `Context` and exports
`base = os.$context<Context>()` only when context-authored middleware consumes
it. It never imports the root contract, calls `implement`, or admits the Effect
extension. Context-only provider/acquisition middleware derives from that
author when present. `impl.ts` owns the sole
`implement(contract).$context<Context>()`, exports the unconfigured `impl`, attaches
root middleware, and exports the configured `service`. Contract-aware
root policy derives from the aggregate `impl` and attaches there. Policy
placement follows both ownership and input depth. Input-independent module-wide
policy attaches in `module.ts`. Input-independent reusable group policy may be
authored from an unconfigured router descendant rooted at `impl.<module>`,
imported through the module middleware catalog, and attached across a
deliberate grouped router leaf. A policy used by one operation stays inline. A
documented named policy reused by several operations and requiring validated
input remains in the module middleware catalog and is attached by every
consuming procedure leaf through native `.use(...)`; reuse does not promote it
to module-wide or group attachment. Review owns both genuine reuse and exact
descendant scope. Pinned oRPC 2 beta.23 router implementers expose
`.middleware(...)`, while procedure implementers expose only `.use(...)` and
`.handler(...)`; TypeScript proves that native distinction. None of these lanes uses
`base.<module>`, `decorateMiddleware`, `.use` parameter extraction, or
configured `.middleware(...)` feedback, and no helper or decorator simulates
an oRPC operation-policy surface. Review owns that semantic simulation check.

On pinned oRPC 2 beta.23, router/module middleware is augmented at
`inputSchemasLengthAtUse: 0`, while procedure attachment records a point after
the schemas already present. Any policy that consumes validated input therefore
attaches through procedure `.use(...)`, whether local to one operation or
imported as a named reused policy. Because native `disableInputValidation` can
bypass schema execution, behavior proof must establish that validation is
enabled and precedes every such policy.

Every `module.ts` starts from its exact `service.<module>` branch, attaches
input-independent module-wide named middleware, and ends with one inferred
inline curation from the semantic context lanes to the smallest handler
vocabulary. Direct selection may use an expression body. Translation or
synchronous provider construction and failure containment may use a block body;
it remains the same inline stage and returns through one `next(...)` call. A
deliberate grouped router leaf may attach genuinely reusable input-independent
group policy; validated-input policy stays on each consuming procedure before
its handler. Ready values are selected there directly. An
acquired or derived capability that must cross a later middleware or branch
boundary travels under `provided`. Standalone named middleware remains reserved
for a stage that is independently meaningful, reusable, or order-sensitive,
including a real guard, acquisition, or enrichment. A module-local dependency
remains module-local. No context wrapper,
prepared object, explicit `.use` generic, cast, merge helper, or parallel
implementer is part of the kind. When no per-call facts are required, public
call context is optional while the client mapper supplies the required
`invocation: {}` lane.

Operation leaves author procedures from the configured module. Module-root
`router.ts` composes those leaves as a plain operation tree; root
`router.ts` composes the module operation trees and implements the aggregate
contract once through the unconfigured `impl.router(...)` stage. Using the
configured `service` stage there would replay inherited middleware; `impl` is
not a second implementation lineage.

Module capability directories are ordinary static TypeScript interiors. Each
contract or router leaf maps its kebab-case filename to one lower-camel export.
An ECMAScript-reserved operation name keeps that exact public export through
an export-list alias; its private local binding is not part of the public
contract. The laws admit no general leaf alias form.
Contract law owns canonical direct import of contract leaves. Module-root
routers are composition-only; TypeScript owns router completeness, Knip owns
unreachable leaves and import hygiene, and generated-client/API behavior proof
owns the complete public operation set. Middleware indexes only catalog
documented native decorated middleware values under semantic import names.
`module.ts` consumes input-independent module-wide middleware through
`./middleware`; a router leaf may consume input-independent group policy or a
named reused validated-input policy through the one additional parent edge
`../middleware`. Each
imported name is visibly attached at its consuming destination. Module-root
routers remain closed to middleware and implementation acquisition. Ordinary
collaboration may range anywhere inside one sealed module; crossing the module
root or entering a sibling remains closed. Contract and middleware indexes may
import leaves, but leaves never import their own index. Contract code never
imports implementation, middleware never imports `module.ts`, and module-root
routers only import their operation leaves. No runtime discovery, loader,
generator, or module SDK is
part of the kind. An `entities` category is
admitted only for stable domain identity and transition invariants under the
shared TypeBox and platform-independence source laws. Entity declarations are
platform-, transport-, provider-, and persistence-neutral. Wire-shaped requests
and results remain DTOs; physical mappings and private persistence
implementations remain in the database boundary. DTOs and contracts may depend
on entities, and stores may
map database records to entities when the domain models continuing identity,
but entities never import from those downstream owners.

Services that author Effect procedures admit the official Effect-oRPC
`@orpc/experimental-effect/extensions/effect` extension in `impl.ts`. A
native-handler service does not import it ceremonially. Service contracts use
native `.errors(...)` maps and procedure implementations use the
handler-supplied `errors` constructors. Public error data uses the same
`standard(...)` adaptation as procedure input and output data. The selected
official extension does not admit the community bridge, `ORPCTaggedError`
classes, status tables, or custom error-translation tunnels as compatibility
surfaces.

Each fallible service capability owns the exact typed failure crossing its
boundary. Define it beside its sole owning port by default. When multiple
sibling ports deliberately share one capability failure, place it in the
module's `model/errors` rather than making either port own the other. An
adapter translates foreign failure into that vocabulary once, and a procedure
maps the capability failure to its contract-declared public outcome with
handler-supplied `errors.*`. `Data.TaggedError` is the default for in-process
failure identity; `Schema.TaggedErrorClass` is reserved for a separately
serialized boundary. Service-owned stores map the exact native failure union
for each operation and do not introduce a database-session failure carrier.

The Effect failure packet closes explicit global `Error` types and same-source
subclasses of global `Error` in two- and three-argument `Effect.Effect` failure
slots. TypeScript owns cross-file ownership, implementation assignability, and
inferred failure channels. Effect diagnostics own catch construction and
failure composition. Behavior tests own actual adapter translation and
procedure mapping.

The spine topology, anchor, context, composition, module-isolation, and
router-authorship packets are enforced together with empty baselines after the
complete live corpus reached zero. Public-consumer sealing remains staged and
follows its own zero-red proof after its relative-path classifier is corrected. Habitat
structure owns topology, including the package-root proof
categories and the absence of source-owned test directories and suite files;
Grit owns the declared source relations; Nx production inputs exclude
`{projectRoot}/test/**/*`; and behavior tests remain with the behavior they
prove.
