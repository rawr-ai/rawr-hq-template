## MODIFIED Requirements

### Requirement: Curated lifecycle is one oRPC service

Template MUST implement curated agent-plugin lifecycle as one
`@habitat-ai/rawr-agent-plugin-lifecycle` oRPC service with exactly the
`releases`, `vendors`, `packaging`, `providers`, and `governance` domain
modules. Distinct Personal Git records, native provider homes, and explicit
package outputs remain qualified state owners without becoming peer service
identities. Export and undo modules, the former peer services, and the
release-support package MUST be absent.

#### Scenario: State boundaries do not multiply service identity
- **WHEN** package, Nx, contract, router, import, and runtime inventories are
  inspected
- **THEN** exactly one curated lifecycle service and the exact five domain
  modules are present
- **AND** no peer lifecycle service, export module, or undo application remains
  reachable

#### Scenario: Shared release truth determines cohesion
- **WHEN** module dependencies, consumers, change coupling, and external
  mutation destinations are classified
- **THEN** modules that collaborate through coordinated subsets of release
  input, ownership, payload, release-set, derivation, and current-main
  invariants remain inside the one lifecycle service
- **AND** resource-owned destinations and different ready dependency subsets
  do not create additional service identities

### Requirement: Service topology follows the canonical shell

The lifecycle service MUST expose one root base, composed contract, implementer,
router, typed local client, and only genuinely cross-cutting middleware. Every
module MUST own its contract, module construction, router composition, and
owner-local `model/{dto,policy,ports,...}`, with TypeBox schemas
colocated with their DTO authorities. Root `service/model` MUST contain only
ready host dependency contracts, dependency-owned observation types, and the
minimum service-owned domain model consumed by multiple modules. Current-main
selection belongs to that shared service model because governance and providers
consume the same service-owned policy; governance-only operation requests and
results remain in the governance module. The shared release-derivation
capability MAY expose the minimum closed release observation needed by releases,
packaging, and providers, while operator requests, results, and issues remain
under the releases module. The package source root MUST contain exactly
`client.ts` and the private `service/` spine, and the package MUST expose only
the `/client` specifier. That client face MAY expose client construction, its
single construction-options type, the service contract, and bounded input
admission required by callers. The router, host context lanes, schemas, model,
modules, module-local handlers, ports, database stores, concrete providers, and
broad DTO barrels MUST remain private.

#### Scenario: Structural inventory is exact
- **WHEN** Habitat and package export inventories run
- **THEN** the root and each module match their closed positive topology
- **AND** a root facade, second package specifier, owner-local
  release/governance request under root model, sixth module, or public concrete
  provider fails the ratchet

Each module MUST expose a closed `contract/` directory through
`contract/index.ts`, a closed `router/` authorship directory, and one
module-root `router.ts` composition face. Operation handlers MUST be authored
directly in named `router/<operation>.ts` leaves or deliberate semantic
groups and composed as a plain router object by module-root `router.ts`. A
handler MAY call module-owned pure policy or
ready resource capabilities, but MUST NOT delegate its operation to a parallel
business entrypoint or acquire an ornamental `*Procedure` export name merely
for composition. Router files MUST consume the inferred module capability
surface and MUST NOT redeclare a local dependency bag or reconstruct root
context. The completed service MUST remove operation dependencies on broad
`deps`, `scope`, `config`, `invocation`, or `provided` lanes through
owner-qualified resource and middleware boundaries rather than claim those
additive native fields were subtracted.
Module `contract.ts` and `router/index.ts` alternatives MUST NOT exist. Optional
module middleware MUST use the equivalent closed `middleware/` catalog with one
`index.ts` and direct semantic leaves.

#### Scenario: Operation composition is direct
- **WHEN** module router exports and operation handler call sites are inspected
- **THEN** module-root `router.ts` composes the directly authored named router values
- **AND** no parallel operation function or individually named procedure wrapper
  or router-local dependency bag impersonates the oRPC composition boundary

### Requirement: Runtime authorities are explicit and transport-neutral

`base.ts` MUST declare the complete ready host dependency context exactly once
and MAY export `os.$context<Context>()` only when context-authored middleware
consumes that native author. Service-root middleware MUST live in direct
semantic leaves without a barrel, export the generic `middleware` value, and be
imported by semantic alias for attachment only in `impl.ts`. Module-wide policy
MUST be independent of validated input and attach in `module.ts`; reusable group policy MAY be authored from an
unconfigured router descendant rooted at `impl.<module>` and attach only in its
matching grouped router leaf when it is input-independent. A named policy
reused by several operations and requiring validated input MAY cross the module
middleware catalog only when each consuming procedure attaches it through
native `.use(...)`; operation-only policy MUST remain inline. Any policy that
relies on validated input MUST attach after the procedure's schema and retain a
behavior proof that validation is enabled. Module terminal curation MAY use an
expression body or a block body whose direct terminal return is its sole
`next(...)` call. Native oRPC context merging is additive, so an
explicit `.use<Context>` argument, shadow context type, adapter, or witness MUST
NOT be treated as removal of inherited lanes. Owner-local resource and handler
cuts MUST remove broad dependency access at its source; a source-spelling
blacklist MUST NOT impersonate subtractive context.
SDK-owned baseline observability and analytics mechanics MUST remain distinct
from service-owned middleware authorship. A Personal workspace, provider home, package
output, or governed Git ref that selects semantic authority MUST remain
explicit validated input. Provider command names MUST resolve through the
ordinary process environment at the owning native-provider resource;
provider-home validation MUST remain at that resource boundary. No executable
identity, controller identity, artifact store, projection store, receipt,
evidence store, `UndoWriter`, cwd, ambient home discovery, or Personal
executable code may enter service context.

#### Scenario: Misleading ambient state has no authority
- **WHEN** cwd, home variables, Personal runtime-like files, and unrelated
  provider state disagree with explicit input and ready capabilities
- **THEN** the operation authors only against validated input and named module
  capabilities, while the owning resource resolves its ordinary local tool
- **AND** no ambient home locator, global dependency bag, or Personal
  executable implementation is consulted

### Requirement: CLI projects the typed service boundary only

Every service-backed lifecycle command MUST create or receive one typed client
and invoke exactly one operation. Concrete Git, filesystem, package-output, and
provider adapters MAY exist only in the CLI host composition boundary or their
own resource packages. Command code MUST NOT import module handlers or
database stores, sequence cross-module transactions, construct a second
service, or expose export/undo compatibility. `rawr agent plugins create`
remains the separately owned source-authoring command.

#### Scenario: Command dispatch cannot bypass the service
- **WHEN** command imports and instrumented dispatch are inspected
- **THEN** each service-backed command reaches exactly its typed operation
- **AND** module-local handlers, database stores, foreign services, Oclif
  mutation, app composition, and compatibility ports record zero direct calls

### Requirement: Consolidation does not realize a new runtime platform

The service MUST use the same Effect-backed contract-first oRPC construction as
the generic Magic Migration service blueprint. TypeBox remains the public
schema authority. Filesystem/process Effect programs remain inside their owning
resources and expose ready capabilities to service construction. App/runtime
composition remains owned by the dedicated architecture migration. The service
MUST NOT select or acquire concrete providers. The CLI app MUST own a cold
production profile of exact provider factory references. After closed command
input admission, the CLI MUST materialize the ready dependencies once, construct
one local lifecycle client with fixed construction context, and invoke one
selected operation. Provider sessions, temporary values, capture claims, and
publication files MUST retain their existing operation-local acquisition and
cleanup owners. This binding MUST NOT introduce a managed runtime, process
finalizer, client cache, generic registry, workflow engine, alternate service
identity, or app/web composition.

#### Scenario: Service correction remains inside lifecycle semantics
- **WHEN** dependency and source changes are reviewed
- **THEN** the change contains only lifecycle semantics and required resource
  boundary corrections
- **AND** no app/web composition or second service construction appears

#### Scenario: Oclif command binds one local ready service
- **WHEN** a real CLI invocation admits closed input and reaches its lifecycle
  operation
- **THEN** the app-owned profile supplies the exact selected provider factories
  and the command constructs one ready typed lifecycle client
- **AND** the command projection, lifecycle service, and lifecycle modules
  import or construct no concrete provider
- **AND** resource acquisition and cleanup remain inside their owning operation
