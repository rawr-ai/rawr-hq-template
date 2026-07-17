## ADDED Requirements

### Requirement: Curated lifecycle is one oRPC service
Template MUST implement service-backed curated agent-plugin lifecycle as one `@rawr/agent-plugin-lifecycle` oRPC service with exactly the internal `releases`, `vendors`, `packaging`, `exports`, `providers`, and `governance` modules. Distinct artifact repositories, provider homes, export ledgers, governed records, and outputs MUST remain qualified state owners without becoming peer service identities. The five C2-C3 peer packages and the release support package MUST be absent. Controller-owned undo remains outside the service.

#### Scenario: State boundaries do not multiply service identity
- **WHEN** package, Nx, contract, router, import, and runtime inventories are inspected
- **THEN** exactly one curated lifecycle service and the exact six internal modules are present
- **AND** no build, export, packaging, promotion, or provider-deployment peer service remains reachable

### Requirement: Service topology follows the canonical shell
The lifecycle service MUST expose a canonical service base, composed contract, implementer, router, typed local client, required observability and analytics middleware, module-local schemas/contracts/routers/repositories, and deliberately public boundary types or ports. Code MUST remain module-local unless it is semantically shared by multiple modules. The package root MUST expose only client construction, client boundary types, and the router; exact named subpaths MAY expose the contract and deliberately public types or ports. No export may expose internal applications, repositories, adapters, or concrete Node/provider implementations.

#### Scenario: Structural inventory is exact
- **WHEN** the service structural suite and export inventory run
- **THEN** every required shell file and module is present and every forbidden internal export is absent
- **AND** adding any seventh module, peer router, or concrete runtime adapter fails the ratchet

### Requirement: Runtime authorities are explicit and transport-neutral
Construction dependencies MUST be abstract resource ports, construction scope MUST contain only verified controller identities, configuration MUST contain only stable protocol values, and invocation context MUST contain trace/command identity. A content workspace, provider home, export destination, package output, executable path, or governed Git ref that selects an authority MUST remain an explicit validated procedure input. A controller-supplied `UndoWriter` MAY accept closed inverse actions but MUST expose no capsule store, read, clear, or replay capability. The service MUST NOT read ambient cwd, PATH, personal executable code, provider homes, app composition, or runtime mounting state.

#### Scenario: Misleading ambient state has no authority
- **WHEN** cwd, PATH, home variables, personal runtime-like files, and unrelated provider state disagree with explicit procedure inputs
- **THEN** the typed procedure uses only its validated input and injected port
- **AND** no ambient locator or executable implementation is consulted

### Requirement: CLI projects the typed service boundary only
Every service-backed lifecycle transition command MUST create or receive one typed lifecycle client and invoke exactly one procedure. Concrete Git, filesystem, archive, provider, hosted-governance, and capsule-writer adapters MAY exist only in the controller projection runtime binding. Command code MUST NOT import module applications or repositories, sequence cross-module transactions, or construct a second lifecycle service. `rawr agent plugins create` MUST remain the separately settled C4 source-authoring command. `rawr agent plugins undo` MUST remain the qualified projection of the controller-owned capsule application.

#### Scenario: Command dispatch cannot bypass the service
- **WHEN** command imports and instrumented dispatch are inspected
- **THEN** each service-backed lifecycle transition command reaches at most one typed service procedure
- **AND** every internal application, repository, foreign service, Oclif mutation, app-composition, and compatibility port records zero direct calls

### Requirement: Consolidation does not realize a new runtime platform
The service MUST use the repository-admitted `@rawr/hq-sdk` oRPC primitive. C5 MUST NOT add raw Effect, an effect-oRPC provider, application definitions, runtime compilation, process runtime, adapters/harnesses for app composition, or runtime-catalog behavior. Those concerns remain owned by the dedicated final-architecture migration.

#### Scenario: Service correction remains inside lifecycle semantics
- **WHEN** the dependency graph and C5 diff are reviewed
- **THEN** the change contains only the lifecycle service, its controller projection, and required support updates
- **AND** no Effect/runtime-realization or app/web composition implementation is present
