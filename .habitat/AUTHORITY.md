# Habitat Authority Boundary

RAWR HQ-Template owns the constraints in this directory. The pinned Habitat
binary owns read-only evaluation mechanics; it does not own repository
architecture or product behavior.

This tree narrows reusable package kinds through positive structure and source
relationships:

1. A `service` has one contract-first oRPC spine, module-owned domain matter,
   native context projection, and one router lineage.
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
2. Every base, contract, service, module, and router spine file directly
   exports the generic anchor for its role.
3. Standalone base, service, boundary, and module construction use direct
   native oRPC and Effect-oRPC authoring views.
4. `base.ts` seeds complete host context once and may expose one separate native
   middleware author when host projection is needed. Module capability
   contributions remain additive and inferred; owner-local resource cuts remove
   raw lanes instead of hiding them behind a shadow context type.
5. Database source is closed to owner-issued migrations and stores, with named
   physical schemas admitted only when required by the database technology.
   TypeBox retains logical DTO-schema authority. Only database-owned source and
   named service-root middleware import database leaves; modules and handlers
   receive projected store capabilities through inherited oRPC context.
6. Qualified middleware is one documented named native value authored from the
   base factory and attached through a native middleware operator rather than
   an inline callback or explicit context type argument.
7. Root composition uses exact relative imports of module contracts and
   completed routers. A module reaches root only through its exact
   `module.ts`-to-`impl.ts` branch edge and
   named-middleware-to-base-factory edge; it does not reach upward or sideways
   for other implementation.
8. Named module router files remain operation authoring sites; module
   `router.ts` only composes completed operation leaves and semantic groups.
9. Every model fact has one direct semantic leaf. Model indexes are
   inadmissible so concrete same-owner dependencies remain visible.
10. Every private service or API alias maps to its owner's `src/service`
   interior rather than creating another public package surface.
11. Module-local imports use normalized relative paths. Module code reserves
    its owner-private alias for `service/model/**`; same-module, sibling,
    runtime, and legacy shared aliases are inadmissible. Foreign, cross-kind,
    and outside-owner imports use public exports.
12. Service source remains independent of concrete Node, Bun, and provider
   implementations; outside capabilities arrive through context and resource
   contracts, while execution frameworks remain outside model source.
13. Standalone production service source never imports its package-owned proof
    corpus; tests may consume production behavior, but the dependency never
    reverses.
14. Foreign consumers cross a standalone service through its public client;
    literal `src/service` paths remain sealed, while the independent
    private-alias law keeps aliases owner-local.
15. TypeBox schemas remain the declarative input and output authority in module
   contracts, adapted through the one canonical RAWR bridge.
16. Module contracts own attached public oRPC error constructors; routers use
   injected error constructors rather than importing error authority.
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
No equivalent policy belongs in ESLint or `scripts/**`.

See [[README|the Habitat blueprint index]], [[AGENTS|the repository router]],
and [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#11. Service runtime boundary contract|the service runtime boundary]].
