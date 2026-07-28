# Service

`service` is the reusable contract-first oRPC kind shared by standalone
services and API-plugin service interiors.

The topology packet owns the standalone package/public face, its optional
package-root proof tree, and the root and module interior spines. A module
exposes required closed `contract/` and `router/` directories through
`index.ts`; an optional closed `middleware/` directory follows the same access
pattern only when middleware exists. Redundant module-level `contract.ts` and
`router.ts` files are not part of the kind. Root service `contract.ts` and
`router.ts` remain because they compose modules. Embedded API
service interiors do not contain proof; the independently selected
`plugin-server-api` kind owns their package-root behavior/support topology.
Optional model facts live as direct leaves under `actors`, `dto`, `entities`,
`errors`, `helpers`, `policy`, `ports`, or `prompts`; model `index.ts` files
and deeper catch-all trees are not part of the kind. An entity is
identity-bearing domain state with lifecycle or persistence meaning. A DTO is
a command, query, result, or boundary projection and may compose or refine an
entity without acquiring its authority. Service-root entities own
cross-module identity and invariants; module entities remain specific to one
subdomain. A standalone service spine admits the optional
`db` child whose entire topology and import funnel belong to the independent
[[../database/README|database blueprint]]; modules and embedded API service
interiors do not own database placement. Entity placement is structurally
advisory until the shared TypeBox and platform-neutral source laws cover the
new kind; production source does not use it before that law lands. The
independent source packets own
positive generic-anchor presence, the native declaration-to-implementation
lineage and exact service-branch module hop, context boundaries, configured router
authorship, the canonical module import surface,
platform-neutral contract, schema, and DTO declarations, and standalone
production-to-proof isolation. They also seal private standalone-service
implementation aliases from foreign consumers and close explicit untyped
Effect failure slots at service capability boundaries. The
[[skill|service capability funnel]] is the authoring frame for these rules.

Standalone service proof lives only under optional package-root `test/`.
Behavior suites follow their production owner at
`behavior/modules/<module>/*.test.ts`; client, contract, and database mechanics
live at `mechanics/{client,contract,db}/*.test.ts`; integration suites live at
`integration/*.test.ts`; and reusable non-suite assets live at
`support/{db,service,modules/<module>}/*.ts`. Categories remain optional and
need not exist when a service has no proof of that kind. `test`, `tests`, and
`__tests__` directories do not live under standalone or API-embedded service
source, and standalone service `src/` does not contain `*.test.ts` or
`*.spec.ts` suite files. Support does not contain those suites either. API
plugin proof remains governed by its additive kind rather than acquiring the
standalone service categories.

Standalone production TypeScript does not acquire package proof through a
relative module source containing the exact path segment `test`. Static
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
adaptation at every procedure input/output, bounded private support
reachability, and private native error-map authority when those support
declarations are present. Contract property-description law requires every
directly authored TypeBox object property, including API transport containers,
to declare its meaning or delegate it to a named schema authority. Standalone
and embedded API services apply that one source law at their own bounded
Habitat scan roots. Private schema composition, local error maps, fragments,
and helpers remain valid only while they are syntactically reachable from the
owning leaf export or directory contract anchor; imported or dynamic error-map authority and exported
parallel schema, type, envelope, or helper authority remain invalid.
The kind preserves one implementation lineage across three flows. Module
contracts compose into the root contract; `base.ts` declares one complete
native context author; `impl.ts` implements that aggregate contract once and
configures the root `service`; modules descend through exact configured
branches; plain module operation trees ascend to the root; and the unconfigured
root `impl` performs the sole aggregate router implementation. Executable
interiors do not reconstruct contract or context
types. TypeScript owns context assignability and router completeness. Behavior
tests own runtime ordering, request isolation, and once-only root execution.

`base.ts` exports `base = os.$context<Context>()`. It never imports the root
contract, calls `implement`, or admits the Effect extension. Context-only
provider/acquisition middleware derives from that author. `impl.ts` owns the sole
`implement(contract).$context<Context>()`, exports the unconfigured `impl`, attaches
root middleware, and exports the configured `service`. Contract-aware
root policy derives from the aggregate `impl` and attaches there. Named module
policy that needs initial context and module errors derives from
`impl.<module>.middleware(...)` and attaches exactly once to
`service.<module>`. Policy that also needs root-configured output is an inline
callback directly in `service.<module>.use(...)`. Neither lane uses
`base.<module>`, `decorateMiddleware`, `.use` parameter extraction, or
configured `.middleware(...)` feedback.

Every `module.ts` starts from its exact `service.<module>` branch, attaches
named middleware, and ends with one inferred inline curation from the semantic
context lanes to the smallest handler vocabulary. Ready values are selected
there directly; middleware remains reserved for a real guard, acquisition, or
enrichment. A module-local provider remains module-local. No context wrapper,
prepared object, explicit `.use` generic, cast, merge helper, or parallel
implementer is part of the kind. When no per-call facts are required, public
call context is optional while the client mapper supplies the required
`invocation: {}` lane.

Operation leaves author procedures from the configured module. Module
`router/index.ts` composes those leaves as a plain operation tree; root
`router.ts` composes the module operation trees and implements the aggregate
contract once through the unconfigured `impl.router(...)` stage. Using the
configured `service` stage there would replay inherited middleware; `impl` is
not a second implementation lineage.

Module capability directories are ordinary static TypeScript faces. Contract
and router indexes compose their direct semantic leaves; middleware indexes
only catalog documented native middleware under semantic import names.
Indexes may import leaves, but leaves never import their own index. Contract
code never imports implementation, middleware never imports `module.ts`, and
router leaves never import the router index. No runtime discovery, loader,
generator, or module SDK is part of the kind. An `entities` category is
admitted only for identity-bearing domain state, subject to the pending shared
source law; wire-shaped requests and results remain DTOs, while physical
mappings and private persistence implementations remain in the database
boundary.

Services that author Effect procedures admit the official Effect-oRPC
`@orpc/experimental-effect/extensions/effect` extension in `impl.ts`. A
native-handler service does not import it ceremonially. Service contracts use
native `.errors(...)` maps and procedure implementations use the
handler-supplied `errors` constructors. The selected official extension does
not admit the community bridge, `ORPCTaggedError` classes, status tables, or
custom error-translation tunnels as compatibility surfaces.

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

The spine topology, anchor, context, composition, module-isolation,
public-consumer, and independent router-authorship packets are closed and
advisory while the module
entrypoint and service-funnel corpus is migrated. Their empty baselines
preserve every live finding as visible red rather than accepted debt. The
seven packets return to enforced together at zero red corpus after their focused
proofs pass. Habitat structure owns topology, including the package-root proof
categories and the absence of source-owned test directories and suite files;
Grit owns the declared source relations; Nx production inputs exclude
`{projectRoot}/test/**/*`; and behavior tests remain with the behavior they
prove.
