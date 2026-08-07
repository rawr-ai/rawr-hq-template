## ADDED Requirements

### Requirement: Application owners own cold composition and selection

Every application built on Habitat MUST own one import-safe `AppDefinition`, its
plugin membership, runtime profiles, process declarations, and thin
entrypoints. `apps/habitat` is the platform's self-hosted application for
non-core platform capabilities; a downstream product owns its app in its own
repository. Those roles MUST remain distinguishable in project metadata even
though both conform to the same app contract. A profile MUST select providers, config
sources, process defaults, and harness choices as cold data. An app, profile,
or entrypoint MUST NOT construct a provider, create an Effect scope or managed
runtime, bind a live service, lower a native payload, or mount a host.

The app definition MUST live at `apps/<app-id>/<app-id>.app.ts`. Every
entrypoint MUST call the terminal SDK `startApp(...)` facade and select one
process role set without redefining app membership or provider selection. An
entrypoint filename MUST name its mount or process role. A surface suffix such
as `<name>.mcp.ts` is valid only for an intentionally single-surface mount; an
entrypoint that mounts several plugin surfaces MUST use its mount or role
identity.

#### Scenario: Application process is selected

- **WHEN** a Habitat self-host or downstream product entrypoint selects an app,
  profile, process, and role set
- **THEN** it passes only cold selected facts into the runtime start boundary
- **AND** no live resource exists before runtime provisioning

#### Scenario: Repository app topology is inspected

- **WHEN** Nx and Habitat classify projects beneath `apps/`
- **THEN** `apps/habitat` is Habitat's only production application project and
  each downstream product identity exists only in its own repository
- **AND** CLI, server, async, and web process roles are not peer app identities

#### Scenario: Habitat policy tool topology is inspected

- **WHEN** the complete Nx project inventory is inspected
- **THEN** `scripts/habitat` is exactly one `type:tool` / `role:architecture-policy`
  project and is not classified as an application
- **AND** no second Nx project claims that root

#### Scenario: App and entrypoint authoring is inspected

- **WHEN** a Habitat self-host or downstream product app definition and each process
  entrypoint are inspected
- **THEN** the app definition is named `<app-id>.app.ts`
- **AND** each entrypoint calls `startApp(...)` with one selected process-role
  set and contains no provider acquisition or native mounting
- **AND** a surface suffix appears only on a single-surface mount

### Requirement: Habitat self-hosts its qualified non-core catalog service

The Habitat blueprint and rule-admission capability MUST be owned by the
ordinary service project at `services/catalog` with package identity
`@habitat-ai/catalog-service`. `apps/habitat` MUST select that service plus its
source-inventory and rule-evaluation resources through the same app, profile,
runtime, and service-binding contracts used by downstream applications. The
predecessor `services/habitat` path and `@habitat-ai/service` identity MUST NOT
remain as an alias, fallback, duplicate project, or import source.

#### Scenario: Habitat catalog ownership is inspected

- **WHEN** Nx, Habitat topology, package metadata, and imports are inspected
- **THEN** the catalog capability has exactly one service project and package
  identity at `services/catalog` / `@habitat-ai/catalog-service`
- **AND** every reader uses that identity and no predecessor owner remains

#### Scenario: Habitat command uses the catalog

- **WHEN** `habitat resolve`, `habitat check`, or `habitat hook` invokes the
  selected catalog capability
- **THEN** `apps/habitat` supplies only cold selection and the runtime binds the
  service and resources
- **AND** no command or module-global helper acquires a provider directly

### Requirement: Runtime realization preserves the seven-phase chain

The platform MUST realize a selected process through the ordered phases
`definition -> selection -> derivation -> compilation -> provisioning ->
mounting -> observation`. Each phase MUST consume the qualified artifact of the
preceding phase and MUST emit the canonical artifact for its downstream owner.
An implementation MUST NOT skip, fuse, reverse, or reconstruct a phase inside
an app, entrypoint, adapter, harness, service, plugin, or provider.

#### Scenario: Narrow process realization is compiled

- **WHEN** an entrypoint starts a process with one selected role and one
  selected surface
- **THEN** the Habitat core derivation owner emits a normalized graph before the
  runtime compiler emits one `CompiledProcessPlan`
- **AND** provisioning and mounting consume that plan through their declared
  boundaries even when unused plan collections are empty

#### Scenario: A downstream boundary receives upstream declarations

- **WHEN** a harness or adapter is given raw app declarations, a normalized
  authoring graph, or an uncompiled surface plan
- **THEN** runtime admission fails before native host mutation

### Requirement: Each phase handoff is complete and exclusive

At every phase edge, the downstream owner MUST accept the exact artifact emitted
by the upstream owner and MUST NOT reread source, reconstruct an earlier
decision, or substitute an equivalent-looking artifact. A mismatched artifact
MUST fail before the downstream owner's first side effect. Behavior proof MUST
exercise each producer-to-consumer edge independently with the upstream source
made unavailable after handoff.

#### Scenario: Qualified phase artifact is consumed

- **WHEN** a phase producer emits its canonical artifact and the upstream source
  becomes unavailable
- **THEN** the immediate downstream owner completes from that artifact alone
- **AND** an identity-mismatched artifact is refused before downstream mutation

### Requirement: Definition and derivation remain import-safe

Services, plugins, resources, providers, apps, profiles, and executable bodies MUST
be declared without reading live config, acquiring resources, registering
globals, creating native clients, starting processes, or running Effects.
Habitat core derivation MUST produce canonical identities, dependency edges, resource
requirements, provider selections, service binding plans, surface plans,
execution descriptor references, one non-portable execution descriptor table,
and portable diagnostics without importing runtime compiler types into public
authoring surfaces.

#### Scenario: Authoring modules are imported

- **WHEN** every selected declaration is imported during graph construction
- **THEN** no filesystem, network, timer, provider, host, or managed runtime is
  created
- **AND** repeated derivation of identical inputs produces equivalent artifacts

### Requirement: Resource and provider selection has one direct authoring owner

A resource package MUST expose one provider-neutral root face. Each concrete
provider MUST be a nested provider project with a direct public face and MUST
own its provider-specific config schema and decoding. A resource face MUST NOT
import a provider. Habitat blueprints own the concrete filenames and export-map
shape of those faces. An app profile MUST create cold selection through the
core definition operation exposed as SDK
`providerSelection({ resource, provider, config })` using
those direct faces. Resource-owned selector wrappers and provider catalogs MUST
NOT become alternate selection owners. The closed private runtime inventory
contains only named capability owners, and reusable machinery remains with the
owner whose invariant it implements.

#### Scenario: App profile selects a concrete provider

- **WHEN** a profile selects one provider for a neutral runtime resource
- **THEN** runtime derivation admits the resource face, provider face, and
  provider-owned config as cold structural data
- **AND** the resource package does not enumerate or import the provider

#### Scenario: Compiler owns bounded diagnostic normalization

- **WHEN** compilation normalizes matching failures into bounded diagnostics
- **THEN** that implementation remains inside `runtime-compiler`
- **AND** bootgraph and runtime mounting receive the qualified compiler artifact only
  through the admitted downstream handoffs rather than importing
  compiler-private helpers
- **AND** the implementation remains inside the closed named-owner topology and
  outside app-selectable provider inventory
- **AND** every selected concrete provider resolves from its resource provider
  project

### Requirement: Compilation proves complete process closure

The runtime compiler MUST consume the normalized authoring graph plus selected
app, profile, entrypoint, environment, role, and harness facts. It MUST validate
topology, provider coverage and dependency closure, service binding closure,
execution descriptor agreement, adapter targets, and harness targets before it
emits exactly one `CompiledProcessPlan`. Compilation MUST NOT acquire resources,
bind live services, execute Effects, construct native callbacks, or mount hosts.

#### Scenario: Provider coverage is incomplete

- **WHEN** a compiled process requires a runtime resource without one
  unambiguous selected provider and complete provider dependency closure
- **THEN** compilation returns a bounded diagnostic
- **AND** provisioning never begins

#### Scenario: Executable boundary is mismatched

- **WHEN** a compiled execution plan and its descriptor reference do not agree
  on execution identity or policy
- **THEN** compilation or execution-registry assembly fails before invocation

### Requirement: Runtime providers remain cold until Effect provisioning

A `RuntimeProvider` MUST implement one `RuntimeResource` contract and own its
resource requirements, config schema/decoder, observation redaction metadata,
health/refresh metadata, and `build(...)`. `runtime-definition` MUST own the
TypeBox `RuntimeObservationRecord` and narrow non-authorizing `RuntimeObservationPort`;
`ProviderBuildContext` MUST receive that port without importing the downstream
observation implementation. `build(...)` MUST return a cold
`ProviderEffectPlan` containing acquire/release execution plus admitted
execution policy and telemetry labels; it MUST NOT own dependency ordering or a
live finalizer registry. Compiled bootgraph inputs MUST own dependency and
static finalization order/policy metadata plus the provider reference; they MUST
NOT copy acquire/release execution. The Effect provisioning kernel MUST own one
root managed runtime, scope, provider-owned config decoding and validation,
provider build once dependency resources exist, acquisition, registration of
that plan's release after successful acquisition, and reverse release for each
started OS process. The full validated provider-local config MUST reach build,
acquire, and release; provider-owned redaction applies only to diagnostic,
telemetry, and catalog observation projections.
A provider MUST NOT select itself or construct a managed runtime.

#### Scenario: Process provisioning succeeds

- **WHEN** the Effect substrate receives valid bootgraph ordering metadata and
  the matching cold provider plans
- **THEN** each selected process resource is acquired exactly once in
  dependency order
- **AND** provisioning emits `ProvisionedProcess` plus one runtime-owned
  `ManagedRuntimeHandle`

#### Scenario: Acquisition fails midway

- **WHEN** a provider plan fails after earlier resources were acquired
- **THEN** the kernel releases the acquired prefix once in reverse dependency
  order
- **AND** no process runtime or harness is mounted

### Requirement: Process runtime owns live binding and execution

Process runtime MUST consume one `CompiledProcessPlan`, the matching execution
descriptor table, and one `ProvisionedProcess`. It MUST assemble runtime access,
bound service clients, the service binding cache, execution registry,
`ProcessExecutionRuntime`, adapter-lowered mount-ready surface records, and an
idempotent process stop handle. It MUST NOT invoke a harness or project
observation-owned read models. Every app-, service-, or
plugin-owned Effect body invoked from a native callback through Habitat runtime
MUST execute through `ProcessExecutionRuntime`.
Runtime access MUST NOT expose raw Effect layers, contexts, scopes, managed
runtimes, provider leases, provider internals, or unredacted secrets.

#### Scenario: Native callback invokes an Effect body

- **WHEN** an adapter-lowered Promise callback is invoked by a native host
- **THEN** it resolves the matching compiled executable boundary through the
  execution registry
- **AND** delegates the body to the one process execution runtime

#### Scenario: Two OS processes start

- **WHEN** two entrypoints start distinct OS processes from the same app profile
- **THEN** each process receives its own root runtime and process-scoped leases
- **AND** neither process observes or releases the other's live values

### Requirement: Observation records without controlling realization

Every upstream lifecycle boundary MUST publish a bounded, redacted
`RuntimeObservationRecord` and correlation through the definition-owned
observation port. `runtime-observation` MUST implement that port and project
`RuntimeDiagnostic`, `RuntimeTelemetry`, and `RuntimeCatalog` only.
`runtime-mounting` MUST own the live path exposed as SDK `startApp(...)`,
harness invocation, `StartedHarness`, reverse native stop, process-stop
coordination, and cross-owner single-flight finalization; cold definition and
runtime observation MUST NOT start a process. Observation MAY
record derivation, compilation, provisioning, binding, execution, adapter,
harness, rollback, and finalization facts, but MUST NOT select providers,
acquire resources, mutate runtime state, expose live values, or become a shadow
control plane. Runtime mounting MUST stop harnesses, then invoke the process
stop handle so runtime-owned values release in deterministic reverse dependency
order.

#### Scenario: Started process settles shutdown

- **WHEN** the process receives a completion, cancellation, or signal reason
- **AND** every reverse-ordered native `stop()` settles
- **THEN** provisioned resources release and the root runtime disposes once
- **AND** observation failure does not replace the product result or process
  exit classification

#### Scenario: Native stop remains pending after its deadline

- **WHEN** a finalization deadline is observed while a native `stop()` is still
  pending
- **THEN** the single-flight finalization remains `draining`, provisioned
  resources remain acquired, and the root runtime remains undisposed
- **AND** repeated stop requests share the pending operation until native stop
  settles and ordinary reverse finalization resumes

### Requirement: Habitat distributes one SDK with sealed internal owners

The public runtime and authoring facade MUST be distributed as the single
`@habitat-ai/sdk` package from the Nx project at `packages/core/sdk`. Its stable
exports MUST be exactly
`.`, `./app`, `./effect`, `./execution`, `./service`, `./service/schema`,
`./plugins/server`, `./plugins/server/effect`, `./plugins/async`,
`./plugins/async/effect`, `./plugins/cli`, `./plugins/cli/effect`,
`./plugins/cli/schema`, `./plugins/web`, `./plugins/web/effect`,
`./plugins/agent`, `./plugins/agent/effect`, `./plugins/agent/schema`,
`./plugins/desktop`, `./plugins/desktop/effect`, `./runtime/resources`,
`./runtime/providers`, `./runtime/providers/effect`, `./runtime/profiles`, and
`./runtime/schema`; the optional integration exports `./telemetry`,
`./resources/semantic-ledger`, `./resources/semantic-ledger/fluree`,
`./resources/temporal-inquiry`, and `./resources/temporal-inquiry/fluree`; and
the data exports `./habitat-pack.json`,
`./blueprints/*`, and `./package.json`. The closed private runtime inventory and
completed direct dependency graph MUST be exactly:

| Exact project root | Nx-only project ID | Direct private dependencies |
|---|---|---|
| `packages/core/runtime/schema` | `runtime-schema` | none |
| `packages/core/runtime/definition` | `runtime-definition` | `runtime-schema` |
| `packages/core/runtime/derivation` | `runtime-derivation` | `runtime-schema`, `runtime-definition` |
| `packages/core/runtime/compiler` | `runtime-compiler` | `runtime-definition`, `runtime-derivation` |
| `packages/core/runtime/bootgraph` | `runtime-bootgraph` | `runtime-compiler` |
| `packages/core/runtime/substrate/effect` | `runtime-substrate-effect` | `runtime-definition`, `runtime-compiler`, `runtime-bootgraph` |
| `packages/core/runtime/process-runtime` | `runtime-process-runtime` | `runtime-derivation`, `runtime-compiler`, `runtime-substrate-effect` |
| `packages/core/runtime/harnesses` | `runtime-harnesses` | `runtime-compiler`, `runtime-process-runtime` |
| `packages/core/runtime/observation` | `runtime-observation` | `runtime-definition` |
| `packages/core/runtime/mounting` | `runtime-mounting` | `runtime-definition`, `runtime-process-runtime`, `runtime-harnesses`, `runtime-observation` |

Dependency direction in this table is consumer to dependency, and no other
private edge is admitted. These unscoped names are Nx scheduler identities
only; they MUST NOT become package names, workspace links, import specifiers,
registry identities, or release members. Every private root MUST have
`project.json` and its blueprint-qualified source and tests but no
`package.json`. The terminal SDK MUST have one direct assembly edge to each
listed project and MUST remain the sole downstream assembler of their outputs
into one package. Real source/build references MUST establish the edges;
`implicitDependencies` and publication metadata are not substitutes. No private
runtime project may import the public facade.

The SDK MAY additionally assemble only these qualified source-owned integration
pairs: telemetry resource/OpenTelemetry Node provider, semantic-ledger
resource/Fluree HTTP provider, and temporal-inquiry resource/Fluree HTTP
provider. Their exact project IDs are `@habitat-ai/resource-telemetry` and
`provider-telemetry-opentelemetry-node`,
`@habitat-ai/resource-semantic-ledger` and
`provider-semantic-ledger-fluree-http`, and
`@habitat-ai/resource-temporal-inquiry` and
`provider-temporal-inquiry-fluree-http`. These assembly edges terminate at the
SDK but do not join the private runtime inventory or release group. Each
provider is reachable only from its own optional conditional-import subpath,
and packed output contains no unresolved workspace dependency.

Reusable private runtime code MUST stay within one of the ten named capability
owners whose invariant it implements. The inventory is closed.

There MUST NOT be a generic adapter root or Nx project. The `SurfaceAdapter`
contract and generic coordination MUST remain owner-local to
`runtime-process-runtime`; native lowering implementations MUST remain
owner-local to `runtime-process-runtime` or `runtime-harnesses`, and the Oclif
adapter MUST remain in process-runtime rather than the CLI harness package. Harness code
MUST consume only the bounded process-runtime ports and lowered payloads without
introducing a reverse project edge.

The repository MUST retain one workspace-owned cacheable `habitat:lint` target,
whose declared inputs include every checked source format, `.editorconfig`,
`biome.json`, relevant package/toolchain metadata, and every other file read by
the command. Projects MUST inherit the shared non-cacheable `nx:noop` `check`
target, which depends on `habitat:lint`, owner `typecheck`, optional qualified
`verify`, generated `check:policy`, and `^check`. It MUST NOT hide `test` or
`build`; root `ci` and `ci:affected` MUST schedule `build,check,test` explicitly.

Each private owner MUST define cacheable `typecheck`, `test`, and `build` through
the shared target defaults. The SDK MUST inherit that vocabulary and add only
packed-subpath acceptance. The Habitat and selected downstream app projects MUST add their
native manifest and exact `acceptance:<capability>` targets, including
`acceptance:oclif-native-runtime`, installed-package acceptance, and
`acceptance:cli-runtime`. The cacheable policy target MUST declare only its
exact closed owner/policy/toolchain/environment inputs and outputs `[]`.
Project creation, direct edges, SDK assembly edge, and target realization MUST
land with the first conforming implementation rather than as an empty topology
slice. One unchanged rerun MUST restore every cacheable task without invoking
its underlying command; changing one declared relevant input MUST invalidate
the expected dependent work.

The SDK root is a terminal core-authoring facade, and every subpath is its own
terminal entry module; neither may load every subpath or vendor.
Each optional integration entry assembles only its qualified Habitat
resource/provider without transferring source ownership, selecting it for an
app, or loading it from any other SDK entry. It MUST NOT become a third package
or move into the CLI host. Installed-package acceptance MUST cold-import every
provider-neutral and optional provider subpath, prove absent optional peers do
not break unrelated imports, and reject any unresolved workspace dependency.
`@habitat-ai/cli` remains a separate public Oclif executable package, not a
second runtime distribution.

#### Scenario: Consumer installs the Habitat substrate

- **WHEN** a consumer installs `@habitat-ai/sdk`
- **THEN** every supported authoring and runtime subpath resolves from that one
  package and its ordinary dependency closure
- **AND** the consumer does not install internal runtime owners individually

#### Scenario: Nx and release inspect runtime owners

- **WHEN** Nx resolves the SDK build graph and release membership
- **THEN** the ten exact `runtime-schema`, `runtime-definition`,
  `runtime-derivation`, `runtime-compiler`, `runtime-bootgraph`,
  `runtime-substrate-effect`, `runtime-process-runtime`, `runtime-harnesses`,
  `runtime-observation`, and `runtime-mounting` roots are private package-less projects with the
  specified acyclic dependency graph terminating at the SDK build
- **AND** adapter code is owner-local to process-runtime or harnesses and no
  generic adapter project exists
- **AND** the only non-runtime SDK assembly edges are the three exact qualified
  resource/provider integration pairs
- **AND** only `@habitat-ai/sdk` is a public runtime or authoring package

#### Scenario: A private owner lands its first implementation

- **WHEN** a private runtime owner first receives conforming implementation
- **THEN** its exact project root, Nx-only ID, inherited shared check/lint graph,
  owner typecheck/test/build targets, direct project edges, and terminal SDK assembly
  edge land in that same semantic node
- **AND** an unchanged rerun restores every cacheable task without invoking its
  command, while one declared relevant-input change invalidates the expected work
- **AND** no empty private runtime project is created in an earlier law-only node

#### Scenario: Selected application acceptance is scheduled

- **WHEN** the Habitat self-host or a downstream app project is inspected through Nx
- **THEN** native manifests and selected runtime acceptance are explicit app-owned
  targets rather than hidden inside `check`
- **AND** `ci` schedules ordinary build, check, and test while installed/native
  acceptance remains named by the capability it proves

#### Scenario: CLI process selects only CLI capabilities

- **WHEN** the installed Habitat CLI imports the SDK app and CLI subpaths
- **THEN** those subpaths neither load nor require installation of Elysia,
  Inngest, or other server- and async-only vendor packages
- **AND** installed-artifact acceptance proves reachability per public subpath
  and selected process rather than through one aggregate smoke

#### Scenario: Selected app supplies a native host

- **WHEN** a selected server or async subpath needs its vendor host
- **THEN** the application supplies that optional peer and the owner-local
  conditional dynamic import resolves it
- **AND** packed SDK metadata, static reachability, and real process loading
  prove unselected hosts are not installed or evaluated

#### Scenario: Structural runtime data is authored

- **WHEN** data must be decoded, validated, redacted, or serialized across a
  runtime owner boundary
- **THEN** its TypeScript type derives from its bounded TypeBox schema
- **AND** runtime use adapts that schema through `RuntimeSchema.fromTypeBox(...)`
- **AND** handwritten structural decoding is not a second schema authority
- **AND** no parallel `RuntimeSchema` structural-builder grammar is introduced
- **AND** the schema lands with its semantic owner rather than in an ownerless
  runtime-wide schema directory

#### Scenario: Operational runtime capability is authored

- **WHEN** a provider plan, callback, Effect, runtime handle, or lifecycle method
  crosses an internal handoff
- **THEN** it remains an owner-local TypeScript interface whose structural data
  inputs and results derive from TypeBox schemas
- **AND** no schema pretends to encode executable or live runtime state

### Requirement: Habitat law asserts the runtime kinds positively

Habitat MUST apply closed blueprint structures for the exact ten private
runtime owners: `runtime-schema`, `runtime-definition`, `runtime-derivation`,
`runtime-compiler`, `runtime-bootgraph`, `runtime-substrate-effect`,
`runtime-process-runtime`, `runtime-harnesses`, `runtime-observation`, and `runtime-mounting`. App,
profile, and SDK law MUST remain in their qualified kind packets. Adapter law
MUST be an owner-local overlay within the process-runtime or harness packet and
MUST NOT create an additional runtime-owner packet or project. Grit MUST assert only
positive local authoring forms it can recognize. Nx MUST own project/package
dependency and task-graph checks; TypeScript MUST own capability visibility;
behavior tests MUST prove process-wide runtime and lifecycle semantics. A kind
law MUST activate in the same semantic node as its first conforming owner. The
repository MUST NOT use standalone structural or topology scripts where these
native owners can express the law.

#### Scenario: A runtime owner is created or changed

- **WHEN** Habitat evaluates the owning blueprint and Nx project
- **THEN** the positive kind shape, allowed import direction, standard lint,
  typecheck, and focused tests are required
- **AND** files that do not fit a qualified destination fail the ratchet
