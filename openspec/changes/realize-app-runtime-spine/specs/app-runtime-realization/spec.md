## ADDED Requirements

### Requirement: Application owners own cold composition and selection

Every application built on Habitat MUST own one import-safe `AppDefinition`, its
plugin membership, runtime profiles, one cold process catalog, and thin
entrypoints. `apps/habitat` is the platform's self-hosted application for
non-core platform capabilities; a downstream product owns its app in its own
repository. Those roles MUST remain distinguishable in project metadata even
though both conform to the same app contract. A profile MUST select providers, config
sources, process defaults, and harness choices as cold data. An app, profile,
or entrypoint MUST NOT construct a provider, create an Effect scope or managed
runtime, bind a live service, lower a native payload, or mount a host.

The app definition MUST live at `apps/<app-id>/<app-id>.app.ts`; the process
catalog MUST live at `apps/<app-id>/runtime/processes.ts`; and profiles MUST
live below `apps/<app-id>/runtime/profiles`. Every entrypoint MUST contain
exactly one top-level call to the terminal SDK `startApp(...)` facade and select
one catalog record without redefining app membership, roles, harnesses, or
provider selection. An
entrypoint filename MUST name its mount or process role. A surface suffix such
as `<name>.mcp.ts` is valid only for an intentionally single-surface mount; an
entrypoint that mounts several plugin surfaces MUST use its mount or role
identity.

Habitat MUST admit complete `app@2` as the sole current application packet.
The published `app@1` locator remains immutable historical artifact identity
outside the current policy pack and acceptance, with no compatibility,
fallback, or coexistence machinery. `app@2` MUST retain one app and one Nx
project; profile, catalog, and entrypoint interiors MUST NOT become child
projects or new blueprint kinds. `process`, `MCP`, and `async-server` MUST NOT
be introduced as kinds. MCP MUST be an implemented `server` surface with native
stdio and Streamable HTTP harnesses.

#### Scenario: Application process is selected

- **WHEN** a Habitat self-host or downstream product entrypoint selects an app,
  profile, and named process-catalog record
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
- **AND** one `runtime/processes.ts` catalog owns the named process shapes
- **AND** each entrypoint calls `startApp(...)` exactly once with one selected
  process record and contains no provider acquisition or native mounting
- **AND** a surface suffix appears only on a single-surface mount

#### Scenario: Versioned app law is packed

- **WHEN** the SDK policy pack and installed consumer are inspected
- **THEN** the pack selects only `app@2` and the published `app@1` locator is
  absent from current pack membership and acceptance
- **AND** `app@2` is a complete closure for the app definition, profiles, process
  catalog, entrypoints, and proof layout
- **AND** a generated `app@2` consumer owns exactly one app/Nx project
- **AND** no inheritance, fallback, child process project, or second app kind
  is present

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

### Requirement: CLI source bundles preserve topic ownership

Each first-party CLI topic MUST own its command declarations, command bodies,
and private topic package. An application MUST select topic membership as cold
data. Derivation and compilation MUST lower exactly that selected membership
into one topic-neutral private CLI source bundle consumed by the shared Oclif
loader. The app, loader, public CLI package, adapter, and harness MUST NOT
re-author command bodies, infer topic membership, scan source directories, or
load an unselected topic. Private topic packages MUST NOT become public release
members.

Habitat MUST govern the self-host and each selected first-party topic through
separate complete positive closed Oclif-app and CLI-topic blueprints. The app
law owns app/profile/entrypoint topology and selected topic membership; the
topic law owns one topic package, its `commands/` interior, and command-source
closure. Neither law may encode a product path, product niche, legacy negative
`forbids` corpus, alternate launcher, compatibility route, or another owner's
interior. Each law MUST activate only with its first conforming owner.

The Habitat self-host MUST use `plugins/cli/topics/foundation` /
`@habitat-ai/plugin-foundation` for `resolve`, `check`, and `hook`;
`plugins/cli/topics/authoring` / `@habitat-ai/plugin-authoring` for `cli command
create` and `cli extension create`; and `plugins/cli/topics/agent-plugins` /
`@habitat-ai/plugin-agent-plugins` for the curated lifecycle commands and the
qualified `.habitat/overlays/agent-plugin-lifecycle` policy. The app owns
selection of those topic packages and their profile/provider inputs, not their
command implementations or overlay interiors.

#### Scenario: Habitat compiles a selected command inventory

- **WHEN** the Habitat app selects one or more private CLI topics
- **THEN** the compiled private source bundle contains exactly the selected
  topic-owned commands and the shared Oclif loader consumes that bundle without
  scanning or reconstructing membership
- **AND** command bodies remain owned by their topic packages while
  `@habitat-ai/cli` owns only the public host, loader, harness, and native Nx
  generator mechanics

#### Scenario: Unselected or public topic authority is attempted

- **WHEN** a loader discovers an unselected command directory, a public package
  claims a private topic, or an app/loader authors a first-party command body
- **THEN** compilation, package closure, or installed acceptance rejects before
  Oclif dispatch

#### Scenario: Oclif law ownership is inspected

- **WHEN** the Habitat app and selected CLI topics are checked against their
  active blueprints
- **THEN** one closed app law and one reusable closed topic law cover their
  distinct owner interiors
- **AND** no product identity, predecessor path, compatibility assertion, or
  duplicate app/topic law remains

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

#### Scenario: Required resource is unavailable

- **WHEN** a selected process cannot acquire one non-optional resource required
  by its compiled closure
- **THEN** provisioning produces no `ProvisionedProcess`, no harness mounts,
  and no liveness or readiness success is published
- **AND** a listener, log, diagnostic, or previously healthy sibling process
  cannot satisfy that process's startup requirement

### Requirement: Process runtime owns live binding and execution

Process runtime MUST consume one `CompiledProcessPlan`, the matching execution
descriptor table, and one `ProvisionedProcess`. It MUST assemble runtime access,
bound service clients, the service binding cache, execution registry,
`ProcessExecutionRuntime`, adapter-lowered mount-ready surface records, and an
idempotent process stop handle. It MUST NOT invoke a harness or project
observation-owned read models. Every app- or plugin-owned Effect body in a
non-oRPC descriptor lane invoked from a native callback through Habitat runtime
MUST execute through `ProcessExecutionRuntime`. An Effect-backed oRPC operation
MUST instead execute through exact `@orpc/experimental-effect@2.0.0-beta.23`
`.effect(...)`, installed once in the service implementation and delegated by
the official extension to `handlerGen(...)`.
`ProcessExecutionRuntime` MUST NOT execute that oRPC Effect or
insert a second runner around it. The application/process MUST construct the
Effect Context, resource lifetime, policy, telemetry, and shutdown behavior
supplied through native `effect/context` and `effect/wrap`; the official bridge
MUST own the request fiber, signal, Cause mapping, and Promise boundary.
Runtime access MUST NOT expose raw Effect layers, contexts, scopes, managed
runtimes, provider leases, provider internals, or unredacted secrets.

#### Scenario: Non-oRPC native callback invokes an Effect body

- **WHEN** a non-oRPC adapter-lowered Promise callback is invoked by a native host
- **THEN** it resolves the matching compiled executable boundary through the
  execution registry
- **AND** delegates the body to the one process execution runtime

#### Scenario: Native oRPC callback invokes an Effect body

- **WHEN** an Effect-backed oRPC operation is invoked
- **THEN** native oRPC invokes the selected official bridge with the request
  signal and application/process-owned `effect/context` and `effect/wrap`
- **AND** no Habitat descriptor runner, manual `Effect.run*`, custom runner, or
  `ProcessExecutionRuntime` execution path invokes that Effect

#### Scenario: Two OS processes start

- **WHEN** two entrypoints start distinct OS processes from the same app profile
- **THEN** each process receives its own root runtime and process-scoped leases
- **AND** neither process observes or releases the other's live values

#### Scenario: Same app starts server and async children

- **WHEN** one `app@2` definition and process catalog start an Elysia `server`
  child and a native Inngest Serve `async` child through separate entrypoints
- **THEN** each child acquires a distinct process lease and accepts one real
  native boundary operation
- **AND** stopping either child does not stop, await, observe, or release the
  other child's runtime or native handle
- **AND** process lifecycle, readiness, and observation remain local to each child

### Requirement: Process health is distinct, immutable, and fail-closed

For any process shape that publishes health, Habitat MUST keep liveness and
readiness as separate process-local claims. Liveness MUST claim only that the
selected process/native host can answer its own probe. Readiness MUST require
successful acquisition and current readiness of every required selected
resource plus every selected harness readiness contribution. A missing,
negative, rejected, or timed-out required check MUST report not ready. Logs,
diagnostics, telemetry, listener creation, mount success, and another process's
health MUST NOT satisfy readiness.

Both responses MUST carry the same immutable `RuntimeLaunchIdentity` containing
the app, process, entrypoint, deployment, and source correlation supplied once
at process start. Habitat MUST carry opaque deployment/source values without
selecting placement or interpreting release lineage. Process health MUST NOT
become cross-process runtime authority, product health policy, or
vendor-specific policy.

#### Scenario: Liveness succeeds while readiness fails

- **WHEN** a mounted native host answers its liveness probe but one required
  selected readiness check fails
- **THEN** liveness reports success and readiness reports not ready
- **AND** both results carry the same immutable launch identity
- **AND** no finding, log, or observation upgrades readiness

#### Scenario: Sibling process is healthy

- **WHEN** one process from an app is live and ready while a sibling process is
  missing a required resource or harness readiness contribution
- **THEN** the sibling remains not started or not ready according to its own
  lifecycle state
- **AND** Habitat neither aggregates the siblings nor stops either one

### Requirement: Observation records without controlling realization

Every upstream lifecycle boundary MUST publish a bounded, redacted
`RuntimeObservationRecord` and correlation through the definition-owned
observation port. `runtime-observation` MUST implement that port and project
`RuntimeDiagnostic`, `RuntimeTelemetry`, and `RuntimeCatalog` only.
`runtime-mounting` MUST own the live path exposed as SDK `startApp(...)`,
harness invocation, `StartedHarness`, reverse native stop, process-stop
coordination, and process-local cross-owner single-flight finalization; cold definition and
runtime observation MUST NOT start a process. Observation MAY
record derivation, compilation, provisioning, binding, execution, adapter,
harness, rollback, and finalization facts, but MUST NOT select providers,
acquire resources, mutate runtime state, expose live values, or become a shadow
control plane. Runtime mounting MUST stop harnesses, then invoke the process
stop handle so runtime-owned values release in deterministic reverse dependency
order.

Runtime mounting MUST NOT coordinate sibling `startApp(...)` invocations or
implement a cross-process stop, readiness, lifecycle, or observation
controller.

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
`@habitat-ai/sdk` package from the Nx project at `packages/core/sdk`. Its exact
public export set MUST comprise the stable authoring and runtime exports
`.`, `./app`, `./effect`, `./execution`, `./service`, `./service/schema`,
`./plugins/server`, `./plugins/server/effect`, `./plugins/async`,
`./plugins/async/effect`, `./plugins/cli`, `./plugins/cli/effect`,
`./plugins/cli/schema`, `./plugins/web`, `./plugins/web/effect`,
`./plugins/agent`, `./plugins/agent/effect`, `./plugins/agent/schema`,
`./plugins/desktop`, `./plugins/desktop/effect`, `./runtime/resources`,
`./runtime/providers`, `./runtime/providers/effect`, `./runtime/profiles`,
`./runtime/harnesses`, and `./runtime/schema`; the optional integration exports `./telemetry`,
`./resources/semantic-ledger`, `./resources/semantic-ledger/fluree`,
`./resources/temporal-inquiry`, and `./resources/temporal-inquiry/fluree`; and
the data exports `./habitat-pack.json`,
`./blueprints/*`, and `./package.json`. Every name in those three groups MUST be
present in the packed export map; "optional" describes conditional provider
loading, not export-path membership. The closed private runtime inventory and
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
`acceptance:oclif-native-runtime` and installed-package acceptance. The
generated `check:policy` target MUST be a non-cacheable `nx:noop` composition
target whose deterministic dependencies are the owner's cacheable policy leaves.
Each leaf MUST declare only its exact closed owner/policy/toolchain/environment
inputs and outputs `[]`.
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

#### Scenario: Consumer adds the Habitat substrate

- **WHEN** a Bun/Nx consumer runs `bunx nx add @habitat-ai/cli --no-interactive`
- **THEN** the shipped initializer installs the exact paired `@habitat-ai/sdk`
  and every supported authoring and runtime subpath resolves from that package
  and its ordinary dependency closure
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

#### Scenario: Packed consumer runs native harness verticals

- **WHEN** a package outside the Habitat workspace installs the packed SDK/CLI
  and starts an admitted Elysia, Inngest, MCP, Oclif, web, desktop, or OpenShell
  process through `app@2`
- **THEN** each native harness receives only bounded mount input and returns an
  idempotent native stop handle
- **AND** runtime mounting creates private `StartedHarness` state and settles
  native stop before releasing that process lease
- **AND** the consumer imports no private runtime project or source link

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

### Requirement: Deployment consumes a cold process handoff

Runtime derivation MUST expose one portable cold process plan for deployment
placement. The handoff MUST contain immutable app, process, entrypoint, source,
and deployment identity; role and surface requirements; placement constraints;
and executable descriptor references only. It MUST NOT contain executable
closures, acquired resources, runtime handles, readiness gates, observation
ports, provider secrets, or process-local lifecycle authority. Deployment owns
placement, supervision, networking, and replicas and MUST NOT reconstruct app
composition or start runtime phases outside the selected entrypoint.

#### Scenario: Deployment selects placement

- **WHEN** a deployment consumer receives the portable process plan
- **THEN** it can choose placement and supervision from cold facts without
  importing runtime implementation or starting the process
- **AND** the entrypoint later realizes exactly that selected identity through
  the canonical lifecycle

#### Scenario: Live runtime state enters deployment handoff

- **WHEN** a candidate handoff includes a live value, closure, readiness gate,
  observation port, provider secret, or process stop handle
- **THEN** derivation refuses the handoff before deployment placement

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

The app kind MUST use complete `app@2` as the sole admitted runtime-authoring
topology; the immutable published `app@1` locator remains outside current pack
and acceptance. Habitat structure MUST own the
positive app tree; focused Grit MAY assert the parser-visible one-`startApp`
entrypoint relation; Nx MUST own the one project identity and task graph;
TypeScript MUST own catalog/profile/entrypoint compatibility; child-process
tests MUST own independent lease and stop behavior.

#### Scenario: A runtime owner is created or changed

- **WHEN** Habitat evaluates the owning blueprint and Nx project
- **THEN** the positive kind shape, allowed import direction, standard lint,
  typecheck, and focused tests are required
- **AND** files that do not fit a qualified destination fail the ratchet
