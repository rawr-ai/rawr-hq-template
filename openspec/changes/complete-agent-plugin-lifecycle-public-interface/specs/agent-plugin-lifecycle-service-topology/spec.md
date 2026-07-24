## MODIFIED Requirements

### Requirement: Curated lifecycle is one oRPC service

Template MUST implement curated agent-plugin lifecycle as one
`@rawr/agent-plugin-lifecycle` oRPC service with exactly the `releases`,
`vendors`, `packaging`, `providers`, and `governance` domain modules. Distinct
Personal Git records, native provider homes, and explicit package outputs remain
qualified state owners without becoming peer service identities. Export and
undo modules, the former peer services, and the release-support package MUST be
absent.

#### Scenario: State boundaries do not multiply service identity
- **WHEN** package, Nx, contract, router, import, and runtime inventories are
  inspected
- **THEN** exactly one curated lifecycle service and the exact five domain
  modules are present
- **AND** no peer lifecycle service, export module, or undo application remains
  reachable

### Requirement: Service topology follows the canonical shell

The lifecycle service MUST expose one root base, composed contract, implementer,
router, typed local client, and only genuinely cross-cutting middleware. Every
module MUST own its contract, module construction, router composition, and
owner-local `model/{dto,policy,schema}`. Root `service/model` MUST contain only
ready host dependency contracts, dependency-owned observation types, and the
minimum service-owned domain model consumed by multiple modules. Current-main
selection belongs to that shared service model because governance exposes it and
providers consume it; governance-only procedure requests and results remain in
the governance module. The shared release-derivation capability MAY expose the
minimum closed release observation needed by packaging and providers, while
operator requests, results, and issues remain under the releases module. The
package root MUST expose only client
construction, named construction-boundary types, the router, and specifically
required contracts. Module-local handlers, repositories, concrete providers,
and broad DTO barrels MUST remain private.

#### Scenario: Structural inventory is exact
- **WHEN** Habitat and package export inventories run
- **THEN** the root and each module match their closed positive topology
- **AND** owner-local release/governance requests under root model, a sixth
module, or a public concrete provider fails the ratchet

Procedure handlers MUST be authored directly in each module's router surface and
composed as a plain router object. A handler MAY call module-owned pure policy or
ready resource capabilities, but MUST NOT delegate its operation to a parallel
business entrypoint or acquire an ornamental `*Procedure` export name merely for
root composition. Router files MUST consume the exact context inferred from the
module handler and MUST NOT redeclare a local dependency bag or reconstruct root
context. Each module MUST retain one `router.ts` as its procedure and
composition boundary; it MUST NOT introduce a second router container.

#### Scenario: Procedure composition is direct
- **WHEN** module router exports and procedure handler call sites are inspected
- **THEN** the router object contains the directly authored handlers
- **AND** no parallel operation function or individually named procedure wrapper
  or router-local dependency bag impersonates the oRPC composition boundary

### Requirement: Runtime authorities are explicit and transport-neutral

Root construction context MUST contain only cross-cutting ready host lanes that
multiple modules actually consume. Module middleware MUST acquire or project
owner-specific capabilities, and each module MUST expose to procedures only the
exact context they consume. A Personal workspace, provider home, package output,
or governed Git ref that selects semantic authority MUST remain explicit
validated input. Native executable and home checks MUST live at the owning
resource boundary. No controller identity, artifact store, projection store,
receipt, evidence store, `UndoWriter`, cwd, PATH discovery, or Personal
executable code may enter service context.

#### Scenario: Misleading ambient state has no authority
- **WHEN** cwd, PATH, home variables, Personal runtime-like files, and unrelated
  provider state disagree with explicit input and ready capabilities
- **THEN** the procedure uses only validated input and its exact projected
  module context
- **AND** no ambient locator, global dependency bag, or executable
  implementation is consulted

### Requirement: CLI projects the typed service boundary only

Every service-backed lifecycle command MUST create or receive one typed client
and invoke exactly one procedure. Concrete Git, filesystem, package-output, and
provider adapters MAY exist only in the CLI host composition boundary or their
own resource packages. Command code MUST NOT import module handlers or
repositories, sequence cross-module transactions, construct a second service,
or expose export/undo compatibility. `rawr agent plugins create` remains the
separately owned source-authoring command.

#### Scenario: Command dispatch cannot bypass the service
- **WHEN** command imports and instrumented dispatch are inspected
- **THEN** each service-backed command reaches exactly its typed procedure
- **AND** module-local handlers, repositories, foreign services, Oclif mutation,
  app composition, and compatibility ports record zero direct calls

### Requirement: Consolidation does not realize a new runtime platform

The service MUST use the same Effect-backed contract-first oRPC construction as
the generic Magic Migration service blueprint. TypeBox remains the public
schema authority. Filesystem/process Effect programs remain inside their owning
resources and expose ready capabilities to service construction. App/runtime
composition remains owned by the dedicated architecture migration.

#### Scenario: Service correction remains inside lifecycle semantics
- **WHEN** dependency and source changes are reviewed
- **THEN** the change contains only lifecycle semantics and required resource
  boundary corrections
- **AND** no app/web composition or second service construction appears
