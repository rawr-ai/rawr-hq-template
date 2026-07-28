# Habitat Authority Boundary

RAWR HQ-Template owns the constraints in this directory. The pinned Habitat
binary owns read-only evaluation mechanics; it does not own repository
architecture or product behavior.

This tree narrows reusable package kinds through positive structure and source
relationships:

1. A `service` has one contract-first oRPC spine, module-owned domain matter,
   native additive context curation, and one router lineage.
2. An optional service-owned `database` has closed migrations and stores, plus
   an optional closed physical-schema boundary when its technology needs one.
   TypeBox owns logical record structure; migrations own physical evolution.
   Root middleware projects stores into context; modules never acquire
   database source.
3. A `resource` has one closed provider-neutral capability contract and
   provider family. Each nested `provider` has one typed public realization
   face. The application selects providers and lifetimes; runtime acquisition
   scopes, releases, and binds ready resources into service context.
4. An API plugin adds one public `client.ts`/`api.ts` pair around an embedded
   service. The API surface exposes operations while its application host retains
   transport ownership.
5. The repository requires one concise `AGENTS.md` operator router at each
   admitted package and service-module boundary; the generic document kind
   defines its stable orientation anchors and repository-relative routes.
6. The executable CLI is one conventional Oclif app, and every first-party
   command capability is one uniform host-composed Oclif plugin on public
   package boundaries.
7. The workspace root exposes one exact Nx scheduler surface. Repository lint
   has one workspace owner; project checks compose it once through Nx rather
   than re-running a project-local aggregate.

## Service Source Law

The generic service and optional database kinds narrow construction through
independently owned topology and source axes:

1. Every package, public surface, service, module, model kind, database, router,
   and middleware directory is positively closed.
2. Every contract, implementation, module, and router spine directly exports
   the generic anchor for its role. `base.ts` always exports `Context`; it
   exports the native `base` anchor only when context-authored middleware uses
   it.
3. `base.ts` declares the complete native oRPC context lanes and remains
   contract-free. `impl.ts` implements the aggregate contract once, admits the
   official Effect-oRPC extension only when used, and exports the unconfigured
   `impl` plus the root-configured `service` stage.
4. Context-only provider and acquisition middleware derive from `base`.
   Service-root middleware is a closed set of direct kebab-case leaves that
   export `middleware`; `impl.ts` imports those leaves by semantic aliases and
   attaches them without a root barrel. Input-independent module-wide policy
   attaches in `module.ts`; input-independent group policy derives from the
   matching unconfigured router descendant and attaches in its grouped router
   leaf. A named policy reused across operations and requiring validated input
   stays procedure-attached through every consumer; exact operation policy stays
   inline. No configured-
   middleware feedback, context wrapper, prepared object, merge helper,
   decorator, simulated procedure author, or parallel implementer is admitted.
5. Database source is closed to owner-issued migrations and stores, with named
   physical schemas admitted only when required by the database technology.
   Database schema is physical mapping, not domain identity or boundary data.
   Only database-owned source and direct named service-root middleware leaves
   import database source. Those leaves export the generic `middleware` value
   for semantic attachment in `impl.ts`; no root middleware barrel is admitted.
   Modules and handlers receive projected store capabilities through inherited
   oRPC context.
6. Every `module.ts` derives its exact configured service branch, attaches only
   qualified module policy, and ends with one inferred inline additive curation
   that exposes the nonempty route-facing fields selected below the five context
   lanes. Direct selection may use an expression body; bounded synchronous
   adaptation or client construction may use a block body with exactly one
   terminal `next(...)` call. Curation does not acquire a resource lifecycle,
   replace the raw lanes, or prove inherited context was removed. Operation
   handlers author against the curated names and do not reopen the raw lanes.
7. Required module `contract/` and `router/` directories expose only their
   `index.ts` faces plus semantic leaves. Optional module `middleware/` follows
   the same shape. Each contract or router leaf maps its kebab-case filename to
   one lower-camel export. Contract indexes prove canonical direct acquisition;
   router indexes remain composition-only. TypeScript, Knip, and generated
   client/API behavior own completeness and reachability. Leaves never import
   their own index, and no runtime loader, generator, or module SDK participates.
8. Operation leaves author from the matching configured module descendant.
   Deliberate grouped leaves may share only input-independent policy owned by
   that same group; named validated-input policy may cross leaves only through
   the module catalog and remains attached at each consuming procedure.
   Module router indexes compose completed operations as plain trees; root
   `router.ts` implements the aggregate tree once through unconfigured
   `impl.router(...)` so root middleware is not replayed. Knip owns unreachable
   leaves; generated clients and API behavior prove the complete public set.
9. Every model fact has one direct semantic leaf. Model indexes are
   inadmissible. `entities` owns stable domain identity that survives attribute
   changes and participates in transitions. Persistence is evidence, not
   sufficient classification. TypeBox owns each canonical entity schema and
   generated type. Service-root entities span modules by identity or invariant,
   never by access alone; module entities remain subdomain-specific. DTOs own
   operation and boundary projections. DTOs and contracts may compose
   entities, and stores may map records to entities when the domain models
   continuing identity; reverse imports are inadmissible. The structural entity
   destination remains advisory until the shared TypeBox and platform-neutral
   source laws cover it; production entity movement waits for that law rather
   than creating a RAWR-only fork.
10. Module-local imports use normalized relative paths. A module does not reach
    upward or sideways for another implementation. Foreign, cross-kind, and
    outside-owner imports use public exports.
11. Service source remains independent of concrete Node, Bun, and provider
   implementations; outside capabilities arrive through context and resource
   contracts, while execution frameworks remain outside model source.
12. Standalone production service source never imports its package-owned proof
    corpus; tests may consume production behavior, but the dependency never
    reverses.
13. Foreign consumers cross a standalone service through its public client;
    literal `src/service` paths remain sealed.
14. TypeBox schemas remain the declarative input and output authority in module
   contracts, adapted through the one canonical RAWR bridge.
15. Module contracts own attached public oRPC error constructors; handlers use
   injected error constructors rather than importing or translating a parallel
   error authority. Typed capability failures map once at that boundary.
TypeScript owns inferred types and complete object compatibility. Habitat does
not simulate module resolution or runtime behavior. Public error declarations
remain part of the module contract; TypeScript and behavioral tests own their
schema compatibility and runtime mapping.

Blueprints constrain monotonic structural axes shared by packages of a kind.
They do not encode product inventories, retired names, historical migration
state, or one lifecycle service's current file list. Behavior, caller
compatibility, package admission, and provider effects remain with their
qualified owners and tests.

The `resource` blueprint closes RAWR's package face around a provider-neutral
contract, package and project metadata, build and source TypeScript boundaries,
and the provider family. The `provider` blueprint closes each nested concrete
realization around one typed public index while admitting vendor-specific
TypeScript decomposition. Provider lifecycle mechanics remain inside that
realization; the application retains selection while runtime owns scope.

Rules under `.habitat/rawr` remain qualified repository or lifecycle
constraints rather than generic blueprints. The repository niche owns the
cross-kind `AGENTS.md` placement relation while leaving each inspected root's
topology with its package blueprint. The lifecycle niche's remaining rule
closes the curated command channel and will shrink with the implementation.
Reusable service source and topology relationships belong to their generic
Habitat blueprints, while TypeScript package exports own public compatibility.
The former coarse project-kind matrix is retired, not represented as another
source pattern. Nx observes and schedules the graph; any still-required
resolved-edge constraint must enter later as its own Habitat graph packet,
never as ESLint architecture.

The `nx-workspace` blueprint owns the root scheduler contract and resolved
project-quality admission. Grit owns the scheduler source law. The pinned
standalone consumer cannot execute Habitat's native Nx runner, so the project
rule keeps one bounded `check.mjs` adapter beside its manifest until project
metadata has one directly checkable owner or the consumer gains that runner.
The selected local policy CLI leaf and the independent Stop-time structure CLI
leaf remain intentionally uncached until an upstream distributable Habitat Nx
boundary owns registry discovery, exact Nx cache inputs, caching, and one
acquisition. The selected rule scopes themselves remain exact.
No equivalent policy belongs in ESLint or `scripts/**`.

See [[README|the Habitat blueprint index]], [[AGENTS|the repository router]],
and [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#11. Service runtime boundary contract|the service runtime boundary]].
