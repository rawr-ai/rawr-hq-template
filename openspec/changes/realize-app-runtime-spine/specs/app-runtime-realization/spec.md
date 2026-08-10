## ADDED Requirements

### Requirement: Application owners own cold composition and selection

Every application built on Habitat MUST own one import-safe `AppDefinition`, its
plugin membership, runtime profiles, one finite cold `ProcessCatalog`, and thin
entrypoints inside one semantic app and one app Nx project. `apps/habitat` is
the platform's self-hosted application for non-core platform capabilities; a
downstream product owns its app in its own repository. Those roles MUST remain
distinguishable in project metadata even though both conform to the same app
contract. A profile MUST select providers, config sources, process defaults,
and harness choices as cold data. A process is a catalog record, not another
app, blueprint kind, child Nx project, supervisor, or deployment unit. MCP is a
`server` surface/process projection, not a role, kind, app, service, provider,
or lifecycle owner. An app, profile, process record, or entrypoint MUST NOT
construct a provider, create an Effect scope or managed runtime, bind a live
service, lower a native payload, mount a host, or control a sibling process.

The app definition MUST live at `apps/<app-id>/<app-id>.app.ts`, and its catalog
MUST live at `apps/<app-id>/runtime/processes.ts`. Every thin entrypoint MUST
make exactly one `startApp(...)` call selecting exactly one catalog process
record without redefining app membership, provider selection, lifecycle, or a
sibling. Each invocation MUST receive an immutable `RuntimeLaunchIdentity`
`{ app, process, entrypoint, deployment, source }` and MUST own only that
process's lease, ManagedRuntime, resources, native handles, health, and
idempotent stop. Readiness and liveness MUST be distinct process-local facts.
An entrypoint filename MUST name its mount or process role. A surface suffix
such as `<name>.mcp.ts` is valid only for an intentionally single-surface
server-process projection; an entrypoint that mounts several plugin surfaces
MUST use its mount or role identity.

The existing `app@1` blueprint and every packed byte in its declared closure
MUST remain unchanged. A future `app@2` successor MUST be complete and
independently resolvable from its own declared closure; it MUST NOT inherit,
fallback to, or mutate `app@1`. No current app selection advances to `app@2`
before its complete law, conforming owner, pack parity, and installed proof
co-land.

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
- **AND** `runtime/processes.ts` owns one finite cold process catalog and each
  entrypoint calls `startApp(...)` exactly once with one selected process record
- **AND** each entrypoint contains no provider acquisition, native mounting,
  sibling-process control, or lifecycle implementation
- **AND** a surface suffix appears only on a single-surface mount

#### Scenario: App blueprint versions resolve independently

- **WHEN** packed source and an isolated installed consumer resolve `app@1` and
  the future `app@2`
- **THEN** `app@1` remains byte-identical to its immutable current closure
- **AND** `app@2` resolves from a complete closure without reading, mutating, or
  falling back to `app@1`

#### Scenario: Two records from one app start independently

- **WHEN** server and async entrypoints select two records from the same app
  process catalog
- **THEN** their immutable launch identities, leases, ManagedRuntimes,
  resources, native handles, readiness, liveness, and stop handles are distinct
- **AND** stopping, restarting, or failing either invocation does not control or
  release its sibling

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
- **THEN** the Habitat core derivation owner emits `NormalizedRuntimeTopology`
  and then the complete `NormalizedAuthoringGraph` before the runtime compiler
  emits one `CompiledProcessPlan`
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

### Requirement: Runtime topology normalization is deterministic and bounded

Private runtime derivation MUST first produce one `NormalizedRuntimeTopology`
through the private operation
`deriveNormalizedRuntimeTopology({ entrypoint, profileId })`. It MUST recursively
copy and freeze the entrypoint's exact `RuntimeLaunchIdentity`, preserve exact
`profileId`, take role requirements only from the selected process, and take
plugin identities, surface requirements, and resource-requirement identities
only from the selected app's plugins. It MUST follow service definitions
transitively only through the definition witnesses carried by private
`ServiceUse` carriers; it MUST NOT add a `plugin.service` edge or invoke an
executable declaration while discovering topology.

The exact nested value shapes MUST be:

```ts
type NormalizedPluginIdentity = {
  readonly pluginId: string;
  readonly instance?: string;
};

type NormalizedSurfaceRequirement = {
  readonly plugin: NormalizedPluginIdentity;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
};

type NormalizedResourceRequirementIdentity = {
  readonly resourceId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
};
```

`NormalizedResourceRequirementIdentity.lifetime` MUST be the effective lifetime
after declared defaulting, while `role` MUST be present only when authored. The
topology's `resourceRequirementIdentities` MUST be the deterministically sorted
unique projection of `resource` values from accepted `plugin.resource` edges.
The same resource identity MAY be demanded by distinct plugin identities and
MUST appear once in that projection; a duplicate exact `plugin.resource` edge
MUST be refused. The edge union MUST contain exactly these typed variants and
fields:

```ts
type NormalizedRuntimeTopologyEdge =
  | {
      readonly kind: "app.plugin";
      readonly appId: string;
      readonly plugin: NormalizedPluginIdentity;
    }
  | {
      readonly kind: "plugin.resource";
      readonly plugin: NormalizedPluginIdentity;
      readonly resource: NormalizedResourceRequirementIdentity;
    }
  | {
      readonly kind: "service.service";
      readonly serviceId: string;
      readonly dependencyServiceId: string;
    }
  | {
      readonly kind: "service.resource";
      readonly serviceId: string;
      readonly resourceId: string;
    }
  | {
      readonly kind: "service.semantic";
      readonly serviceId: string;
      readonly adapterId: string;
    };
```

`service.service` MUST point from dependent `serviceId` to
`dependencyServiceId`; a self-loop MUST be treated as a cycle. Derivation MUST
refuse a mismatch in `identity.app`, `identity.process`, or
`identity.entrypoint` against the selected declarations, a `profileId` mismatch,
a duplicate plugin identity, role literal, surface tuple, exact edge tuple, and
every cycle in the `service.service` subgraph before emitting topology. Shared
resource demand across distinct plugin identities MUST NOT be treated as a
duplicate.
`identity.deployment` and `identity.source` MUST remain opaque values copied
exactly rather than re-derived.

Task-4.7 service-cycle acceptance MUST prove only order-independent refusal for
a self-loop and a longer cycle. It MUST NOT prescribe an error class, select or
expose a cycle path, prescribe diagnostic ordering, define a finding payload,
or add an error API.

Every emitted object and collection MUST be a fresh recursive copy and MUST be
recursively frozen. Every tuple-bearing collection MUST use lexicographic
ECMAScript code-unit ordering over its complete tuple; a missing optional field
MUST compare as the empty string while remaining absent in output. Semantically
equivalent inputs MUST therefore produce deeply equal topology independent of
authored collection order.

`runtime-derivation` MUST own the TypeBox schema for
`NormalizedRuntimeTopology` and adapt it through
`RuntimeSchema.fromTypeBox(...)`. That owner-local schema reference MUST be the
real source/build edge to `runtime-schema`; the selected definition and launch
identity references MUST establish the real edge to `runtime-definition`.
Neither edge may be represented only by `implicitDependencies`. Every object in
the schema MUST set `additionalProperties: false`; surplus properties and
unknown edge variants MUST fail decode.

The checked-in private owner MUST contain exactly the root shell `AGENTS.md`,
`habitat.toml`, `project.json`, `src/`, `test/`, `tsconfig.json`,
`tsconfig.test.json`, and `tsdown.config.ts`; only `src/index.ts` and
`src/normalized-runtime-topology.ts`; and only
`test/normalized-topology.test.ts` and `test/nx-cache.test.ts`. It MUST contain
no optional interior or `package.json`. The bounded topology artifact alone
MUST NOT require or authorize an SDK edge or export, complete
`NormalizedAuthoringGraph`, descriptor or module table, or
`PortableRuntimePlanArtifact`.

#### Scenario: Equivalent topology declarations are reordered

- **WHEN** the same cold declarations are supplied with plugin and dependency
  collections in different authored orders
- **THEN** derivation emits deeply equal `NormalizedRuntimeTopology` values
- **AND** each emitted launch identity is field-for-field equal to but not the
  same object as its corresponding input identity, and the emitted copy is
  recursively frozen
- **AND** every normalized tuple uses ECMAScript code-unit order with absent
  optionals compared as empty strings

#### Scenario: Invalid topology is refused

- **WHEN** selected app/process/entrypoint or profile identity disagrees, a
  plugin identity, role literal, surface tuple, or exact edge is duplicated, or
  the dependent-to-dependency
  `service.service` subgraph contains a self-loop or longer cycle
- **THEN** derivation refuses the input before emitting a topology artifact
- **AND** reordered edges for the same cycle are also refused without asserting
  an error class, selected path, diagnostic order, or finding payload

#### Scenario: Distinct plugins share one resource requirement

- **WHEN** two distinct normalized plugin identities carry the same effective
  resource-requirement identity through distinct `plugin.resource` edges
- **THEN** both edges are admitted and `resourceRequirementIdentities` contains
  one sorted projection entry
- **AND** repeating either exact plugin/resource edge is refused

#### Scenario: Closed topology schema receives surplus data

- **WHEN** a topology value contains a surplus property or an unknown edge kind
- **THEN** the owner-local TypeBox schema refuses it before handoff

#### Scenario: Cold executable declarations participate in topology

- **WHEN** the selected app contains a lazy web route-module loader and a cold
  Effect body
- **THEN** topology derives only their declarative plugin, surface, resource,
  and reachable-service facts
- **AND** neither executable body is called

### Requirement: Complete-derivation contract and binding-source authority are closed before implementation

Complete derivation MUST implement one previously frozen contract rather than
settle any public or binding contract in source. Before complete implementation
may start, the authority-only gate MUST replace every illustrative or undefined
public `RuntimeDerivationResult` shape and nested public carrier with exact
closed TypeBox schemas and TypeBox-derived readonly shapes. It MUST freeze the
exact producer/consumer signatures and every method signature on
`ExecutionDescriptorTable` and `WebRouteModuleTable`, plus exact
complete-derivation finding, error/refusal, and deterministic ordering contracts,
without adding a public error class, error type, or error value export.

The sole public derivation face MUST have exactly one derivation operation,
`deriveRuntimeArtifacts(input)`, and exactly three runtime value exports:
`deriveRuntimeArtifacts`, `PortableRuntimePlanArtifactSchema`, and
`decodePortableRuntimePlanArtifact`. Its exact finite type-only export inventory
MUST be `RuntimeDerivationInput`, `RuntimeDerivationResult`,
`NormalizedPluginIdentity`, `NormalizedSurfaceRequirement`,
`NormalizedResourceRequirementIdentity`, `NormalizedRuntimeTopologyEdge`,
`NormalizedRuntimeTopology`, `NormalizedAppDefinition`,
`NormalizedPluginDefinition`, `DerivedRoleSurfaceIndex`,
`NormalizedServiceUse`, `NormalizedServiceDependency`,
`NormalizedSemanticDependency`, `ResourceRequirement`, `ProviderSelection`,
`NormalizedRuntimeProfile`, `ServiceBindingPlan`, `SurfaceRuntimePlan`,
`WorkflowDispatcherDescriptor`, `ExecutionDescriptorRef`,
`ExecutionDescriptorTable`, `WebRouteModuleRef`, `WebRouteModuleTableEntry`,
`WebRouteModuleTable`, `PortableRuntimePlanArtifact`, and
`DerivationFinding`. The decoder is a validation utility rather than a second
derivation operation. No other runtime value, type-only export, or public error
API is admitted.

The same gate MUST name the scope/config binding authoring owner and declaration
site; define exact closed TypeBox source and normalized-reference discriminated
unions; state whether and how the sealed `ServiceUse` private carrier evolves;
define required and forbidden bindings when scope/config schemas are present or
absent; define transitive `serviceDep` propagation and override; define
`RuntimeConfigSource` ordering, key identity, and missing-source semantics; and
settle normalization, identity, cache, and public/private projection. The
grammar MUST reject callbacks, closures, executable resolvers, provider
acquisition, and live values. The authority-only gate's only allowed edit scope
MUST be `docs/system/HABITAT_ARCHITECTURE.md`,
`docs/system/HABITAT_RUNTIME_REALIZATION.md`, and the six active OpenSpec
authority artifacts
`openspec/changes/realize-app-runtime-spine/authority-amendment.md`,
`openspec/changes/realize-app-runtime-spine/classification-ledger.md`,
`openspec/changes/realize-app-runtime-spine/design.md`,
`openspec/changes/realize-app-runtime-spine/execution-queue.md`,
`openspec/changes/realize-app-runtime-spine/tasks.md`, and
`openspec/changes/realize-app-runtime-spine/specs/app-runtime-realization/spec.md`.
The gate MUST create or edit no implementation, project, blueprint, SDK edge,
export map, or public export. It MUST replace every canonical placeholder
contract before task 4.8 or archive; both transitions MUST remain blocked until
the complete contract is deterministic and the two canonical documents and all
six active OpenSpec authority artifacts agree.

#### Scenario: Complete derivation receives an unsettled contract

- **WHEN** any public shape, producer/consumer or table signature, finding,
  refusal, ordering, export-inventory, binding-owner, union-member, carrier,
  schema-presence, dependency-propagation, config-source, or projection decision
  remains illustrative, undefined, or ambiguous
- **THEN** complete derivation implementation remains blocked
- **AND** no placeholder implementation, project, blueprint, SDK edge, export
  map, public export, or error API is added
- **AND** task 4.8 and archive remain blocked while any canonical placeholder or
  canonical-to-active authority disagreement remains

### Requirement: Complete derivation remains import-safe and separates references

Complete runtime derivation MUST remain import-safe.
Services, plugins, resources, providers, apps, profiles, and executable bodies
MUST be declared without reading live config, acquiring resources, registering
globals, creating native clients, starting processes, or running Effects.
Habitat core derivation MUST consume the qualified `NormalizedRuntimeTopology`
without reconstruction, carry it into the complete `NormalizedAuthoringGraph`,
and produce `NormalizedServiceUse`, normalized provider selections,
`ServiceBindingPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`,
Effect-only `ExecutionDescriptorRef` values with one
non-portable `ExecutionDescriptorTable`, separate `WebRouteModuleRef` values
with one non-portable `WebRouteModuleTable`, and one deployment-safe cold
`PortableRuntimePlanArtifact`. Public authoring surfaces MUST NOT import runtime
compiler types.

The Effect-only `ExecutionDescriptorRef` discriminated union MUST include
`plugin.web-surface` with required `surfaceId`. That variant represents actual
web-local Effect work. It MUST remain distinct from `WebRouteModuleRef`, which
represents a lazy native route-module loader and never enters the Effect
descriptor table or registry. Complete derivation MUST sort execution refs by
their complete discriminated boundary-identity tuples using ECMAScript
code-unit order, including every required identity field of the selected
variant and comparing each missing optional identity field as the empty string.

The sole public derivation face MUST be
`@habitat-ai/sdk/runtime/derivation`. Its SDK assembly edge and export MUST land
with the complete public derivation projection rather than with a private
topology-only increment. No SDK root export, second derivation subpath, or
individually distributed private runtime owner may become alternate authority.

The accepted top-level outline MUST retain `RuntimeDerivationInput` with fields
`entrypoint` and `profileId` and `RuntimeDerivationResult` with fields
`topology`, `graph`, `executionDescriptorTable`, `webRouteModuleTable`, and
`portableArtifact`. Task 4.7a MUST replace every illustrative or undefined
nested carrier with the final exact closed TypeBox-derived shape before task
4.8 starts. Task 4.8 MUST implement that frozen contract verbatim rather than
inventing or widening it, and MUST expose only the operation, runtime values,
and finite type-only inventory stated by the authority gate. The derivation
operation MUST call private
`deriveNormalizedRuntimeTopology` exactly once, MUST place that same recursively
frozen object at both `result.topology` and `result.graph.topology`, MUST
recursively freeze its returned artifacts, and MUST NOT invoke an Effect body or
web route-module loader.

The immutable topology-only blueprint MUST remain
`runtime-derivation@1`. Complete derivation MUST select independent
`runtime-derivation@2` with no inheritance or fallback. Version 2 MUST retain the
same exact project shell and contain exactly source `index.ts`,
`normalized-runtime-topology.ts`, `derive-runtime-artifacts.ts`,
`normalized-authoring-graph.ts`, `execution-descriptor-ref.ts`,
`derive-execution-descriptor-table.ts`, `identity-policy.ts`,
`service-binding-plan.ts`, `surface-runtime-plan.ts`,
`web-route-module-table.ts`, `workflow-dispatcher-descriptor.ts`, and
`portable-runtime-plan-artifact.ts`, plus tests `normalized-topology.test.ts`,
`complete-derivation.test.ts`, and `nx-cache.test.ts`. Later derivation and
handoff work MUST edit those existing modules/tests and MUST NOT create an
optional interior, fallback, alternate test, or `runtime-derivation@3`.

`PortableRuntimePlanArtifact` MUST contain exactly `kind`, `artifactId`,
`identity`, `profileId`, `roles`, `surfaces`, and
`executionDescriptorRefs`. `identity` MUST equal the exact launch-identity copy
carried by normalized topology, and `executionDescriptorRefs` MUST contain
Effect execution references only in the deterministic order above. The sole
public derivation face MUST export closed
`PortableRuntimePlanArtifactSchema` and
`decodePortableRuntimePlanArtifact`. `artifactId` MUST be exactly `sha256:` plus
the 64 lowercase hexadecimal SHA-256 characters for the RFC 8785 canonical JSON
encoding of the other six top-level fields. Decode MUST reject a surplus
top-level or nested field, a malformed artifact id, or a digest mismatch. The
portable artifact MUST NOT
contain `derivedAt`, placement constraints, a web route-module ref or loader,
either non-portable table, an executable value, a live resource or client, a
runtime handle, a readiness gate, an observation port, a provider secret,
supervision, or lifecycle authority.

#### Scenario: Authoring modules are imported

- **WHEN** every selected declaration is imported during graph construction
- **THEN** no filesystem, network, timer, provider, host, or managed runtime is
  created
- **AND** repeated complete derivation of identical inputs produces equivalent
  artifacts

#### Scenario: Public derivation returns one coherent result

- **WHEN** a consumer calls `deriveRuntimeArtifacts({ entrypoint, profileId })`
- **THEN** the result contains exactly `topology`, `graph`,
  `executionDescriptorTable`, `webRouteModuleTable`, and `portableArtifact`
- **AND** private topology derivation was called once and
  `result.graph.topology === result.topology`
- **AND** the result is recursively frozen and no Effect body or web loader was
  invoked

#### Scenario: Effect and web module references are separated

- **WHEN** complete derivation encounters a private web-local Effect descriptor
  and a lazy native web route-module loader in one owner-local fixture
- **THEN** the Effect body receives a `plugin.web-surface`
  `ExecutionDescriptorRef` with its required `surfaceId` and remains only in the
  non-portable `ExecutionDescriptorTable`
- **AND** the web loader receives a `WebRouteModuleRef` and remains only in the
  non-portable `WebRouteModuleTable`
- **AND** the web loader never becomes an Effect execution reference or enters
  the portable artifact
- **AND** the fixture does not create an early
  `@habitat-ai/sdk/plugins/web/effect` face

#### Scenario: A deployment boundary consumes the portable plan

- **WHEN** a deployment owner receives the serialized
  `PortableRuntimePlanArtifact`
- **THEN** it observes exactly `kind`, `artifactId`, `identity`, `profileId`,
  `roles`, `surfaces`, and `executionDescriptorRefs`
- **AND** the exact launch identity supplies app, process, entrypoint,
  deployment, and source correlation without a non-portable table
- **AND** `artifactId` is `sha256:` followed by the 64 lowercase hexadecimal
  SHA-256 characters for RFC 8785 canonical JSON of the other six fields and the
  decoder verifies that exact value
- **AND** no `derivedAt`, placement constraint, executable value, live state, or
  process lifecycle authority is present

### Requirement: Service use is one cold typed relation

Plugin authoring MUST declare projected service clients only through
`useService(serviceDefinition, { contract, instance? })`. The operation MUST
produce a frozen `ServiceUse<TContract>` whose public enumerable shape contains
only `kind: "service.use"`, the exact definition `serviceId`, and optional
`serviceInstance`. `serviceInstance` MUST be present only when composition
selects a genuine distinct instance. The containing services-map key MUST remain
the consumer-local injected-client property and MUST NOT become an alias,
service identity, binding identity, or cache-key ingredient. The public relation
MUST NOT expose the service definition, contract object, or an `alias` field.

`runtime-definition` MUST retain the exact service definition and contract
witness in a private non-enumerable symbol-keyed carrier. Only private runtime
owners MAY use its internal accessor; the SDK MUST NOT export the carrier symbol
or accessor. `ServiceContractOf` and services-map client projection MUST infer
the exact contract while preserving every authored map key without a dynamic
lookup. Every terminal SDK plugin face that admits service use MUST re-export
the same `useService` helper rather than define a lane-local variant. Complete
runtime derivation MUST normalize each `ServiceUse` and produce its
`ServiceBindingPlan` with closed declarative scope/config binding-reference
discriminants and no callback or executable resolver. The compiler MUST consume
that derived plan, and only process runtime MAY construct or cache live service
bindings.

#### Scenario: A plugin declares one service use

- **WHEN** a plugin places `useService(...)` under a services-map key
- **THEN** the frozen public record contains `kind`, `serviceId`, and only a
  genuinely selected `serviceInstance` when one was supplied
- **AND** enumeration reveals no `service`, `contract`, `alias`, callback, live
  client, or binding plan
- **AND** the services-map key remains only the injected-client property name

#### Scenario: Service-use inference is checked

- **WHEN** TypeScript projects construction-bound or invocation-bound clients
  from a services map
- **THEN** every map key is preserved and `ServiceContractOf` resolves the exact
  contract carried by its `ServiceUse<TContract>`
- **AND** no public runtime lookup or duplicate contract field is required
- **AND** server and async SDK faces expose the identical `useService` helper

#### Scenario: A private runtime owner normalizes service use

- **WHEN** complete runtime derivation receives the cold relation
- **THEN** the private accessor recovers the exact definition and contract
  witness from the non-enumerable carrier
- **AND** derivation emits the normalized use and `ServiceBindingPlan` with only
  closed declarative scope/config binding references
- **AND** live binding, cache-key construction, and cache ownership remain
  absent until process runtime

#### Scenario: Predecessor service views are attempted

- **WHEN** authoring introduces `ProcessView`, `RoleView`, `ServiceBoundary`, an
  author-facing `ServiceBinding`, cosmetic alias identity, or a callback-backed
  binding reference
- **THEN** the declaration is rejected before derivation

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
`effect@4.0.0-beta.101` `ManagedRuntime` created from exactly one substrate
`Layer.effectContext` lifecycle adapter for each started process. The adapter
MUST consume bootgraph dependency order as ordinary data, decode and validate
provider-owned config, build a provider only after its dependencies exist,
acquire it, register that plan's release after successful acquisition, and
return the assembled process Context. The substrate MUST force that managed
context before any mount. `ManagedRuntime` MUST own all process scopes, fibers,
and reverse release; Habitat MUST NOT create a second root `Scope`, a second or
per-execution ManagedRuntime, or reinterpret bootgraph order as Layer
composition. Domain services MUST remain Habitat services bound by process
runtime, not Effect services, Context tags, or Layer nodes. The full validated
provider-local config MUST reach build, acquire, and release; provider-owned
redaction applies only to diagnostic, telemetry, and catalog observation
projections.
A provider MUST NOT select itself or construct a managed runtime.

#### Scenario: Process provisioning succeeds

- **WHEN** the Effect substrate receives valid bootgraph ordering metadata and
  the matching cold provider plans
- **THEN** each selected process resource is acquired exactly once in
  dependency order
- **AND** provisioning emits `ProvisionedProcess` plus one runtime-owned
  `ManagedRuntimeHandle`
- **AND** the one managed context is forced before mounting begins

#### Scenario: Acquisition fails midway

- **WHEN** a provider plan fails after earlier resources were acquired
- **THEN** the kernel releases the acquired prefix once in reverse dependency
  order
- **AND** no process runtime or harness is mounted

#### Scenario: Effect substrate ownership is inspected

- **WHEN** one process is provisioned and later stopped
- **THEN** one beta.101 ManagedRuntime owns its scopes, fibers, Context, and
  reverse provider release through the one `Layer.effectContext` adapter
- **AND** no second root Scope, Layer-shaped bootgraph, service Layer node, or
  per-execution ManagedRuntime exists

### Requirement: Process runtime owns live binding and execution

Process runtime MUST consume one `CompiledProcessPlan`, the matching Effect
`ExecutionDescriptorTable`, and one `ProvisionedProcess`. The separate
`WebRouteModuleTable` MUST remain on the web lowering path and MUST NOT enter the
Effect execution registry. Process runtime MUST assemble runtime access,
bound service clients, the service binding cache, execution registry,
`ProcessExecutionRuntime`, adapter-lowered mount-ready surface records, and an
idempotent process stop handle. It MUST NOT invoke a harness or project
observation-owned read models. Every app- or plugin-owned Effect body in a
non-oRPC descriptor lane invoked from a native callback through Habitat runtime
MUST execute through `ProcessExecutionRuntime`. An Effect-backed oRPC operation
MUST instead execute through exact `@orpc/experimental-effect@2.0.0-beta.23`
implementation-owned `.effect(...)`, installed once in `src/service/impl.ts`.
Synchronous and Promise-returning oRPC operations MUST use native
`.handler(...)`. The official extension's underlying `handlerGen` is internal
vendor machinery. Habitat-authored authoring, adapter, and operation code MUST
NOT directly import, call, wrap, or reimplement it; the selected official
extension's internal call remains admitted.
`ProcessExecutionRuntime` MUST NOT execute that oRPC Effect or
insert a second runner around it. The application/process MUST construct the
Effect Context, resource lifetime, policy, telemetry, and shutdown behavior
supplied through native `effect/context` and `effect/wrap`; the official bridge
MUST own the request fiber, signal, Cause mapping, and Promise boundary.
Runtime access MUST NOT expose raw Effect layers, contexts, scopes, managed
runtimes, provider leases, provider internals, or unredacted secrets.
Each `startApp(...)` invocation MUST own only the lease, ManagedRuntime,
resources, native handles, readiness, liveness, and stop associated with its
immutable `RuntimeLaunchIdentity`. It MUST NOT observe, restart, stop, or
release a sibling process.

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

#### Scenario: Native oRPC callback invokes a non-Effect body

- **WHEN** a synchronous or Promise-returning oRPC service operation is invoked
- **THEN** the official native builder invokes its `.handler(...)` directly
- **AND** no Effect bridge, direct Habitat-authored `handlerGen` import, or
  `ProcessExecutionRuntime` terminal is introduced

#### Scenario: Two OS processes start

- **WHEN** two entrypoints start distinct OS processes from the same app profile
- **THEN** each process receives its own immutable launch identity, ManagedRuntime,
  process-scoped leases, native handles, readiness/liveness, and stop
- **AND** neither process observes, controls, restarts, stops, or releases the
  other's live values

### Requirement: Observation records without controlling realization

Every upstream lifecycle boundary MUST publish a bounded, redacted
`RuntimeObservationRecord` and correlation through the definition-owned
observation port. `runtime-observation` MUST implement that port and project
`RuntimeDiagnostic`, `RuntimeTelemetry`, and `RuntimeCatalog` only.
`runtime-mounting` MUST own the live path exposed as SDK `startApp(...)`,
harness invocation, `StartedHarness`, reverse native stop, process-stop
coordination, and process-local cross-owner single-flight finalization; cold
definition and runtime observation MUST NOT start a process. That finalizer MAY
coordinate owners participating in the same launch identity but MUST NOT become
a supervisor or control a sibling process. Observation MAY
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
- **AND** no sibling launch identity is stopped or released

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
`.`, `./app`, `./effect`, `./effect/context`, `./effect/wrap`, `./execution`,
`./service`, `./service/schema`,
`./plugins/server`, `./plugins/server/effect`, `./plugins/async`,
`./plugins/async/effect`, `./plugins/cli`, `./plugins/cli/effect`,
`./plugins/cli/schema`, `./plugins/web`, `./plugins/web/effect`,
`./plugins/agent`, `./plugins/agent/effect`, `./plugins/agent/schema`,
`./plugins/desktop`, `./plugins/desktop/effect`, `./runtime/resources`,
`./runtime/providers`, `./runtime/providers/effect`, `./runtime/profiles`,
`./runtime/derivation`, `./runtime/harnesses`, `./runtime/observation`, and
`./runtime/schema`; the
optional integration exports `./telemetry`,
`./resources/semantic-ledger`, `./resources/semantic-ledger/fluree`,
`./resources/temporal-inquiry`, and `./resources/temporal-inquiry/fluree`; and
the data exports `./habitat-pack.json`,
`./blueprints/*`, and `./package.json`. Every name in those three groups MUST be
present in the packed export map; "optional" describes conditional provider
loading, not export-path membership. The closed private runtime inventory and
completed direct dependency graph MUST be exactly:

`./runtime/derivation` MUST be the sole public derivation face. It MUST expose
exactly one derivation operation and exactly the three runtime values
`deriveRuntimeArtifacts`, `PortableRuntimePlanArtifactSchema`, and
`decodePortableRuntimePlanArtifact`. Its exact finite type-only inventory MUST
be `RuntimeDerivationInput`, `RuntimeDerivationResult`,
`NormalizedPluginIdentity`, `NormalizedSurfaceRequirement`,
`NormalizedResourceRequirementIdentity`, `NormalizedRuntimeTopologyEdge`,
`NormalizedRuntimeTopology`, `NormalizedAppDefinition`,
`NormalizedPluginDefinition`, `DerivedRoleSurfaceIndex`,
`NormalizedServiceUse`, `NormalizedServiceDependency`,
`NormalizedSemanticDependency`, `ResourceRequirement`, `ProviderSelection`,
`NormalizedRuntimeProfile`, `ServiceBindingPlan`, `SurfaceRuntimePlan`,
`WorkflowDispatcherDescriptor`, `ExecutionDescriptorRef`,
`ExecutionDescriptorTable`, `WebRouteModuleRef`, `WebRouteModuleTableEntry`,
`WebRouteModuleTable`, `PortableRuntimePlanArtifact`, and
`DerivationFinding`. It MUST NOT expose another runtime value or type-only
export, expose a public error API, re-export the private topology increment from
the SDK root, create a second derivation subpath, serialize either non-portable
table, or classify a web loader as an Effect execution descriptor.

`./runtime/harnesses` MUST expose only the import-safe public companion
`HarnessDescriptor`, `HarnessMountInput`, `NativeHarnessHandle` interface,
`HarnessHealthReport`, owner-local report sink, and supporting process-local
contract types needed to attach an independently packaged external server
companion. Exporting the handle interface type is required. It MUST NOT expose
a live handle value, live-handle accessor or registry, private
`StartedHarness`, sibling controller, MCP protocol authoring face, or an
official-MCP-SDK implementation.

| Exact project root | Nx-only project ID | Direct private dependencies |
|---|---|---|
| `packages/core/runtime/schema` | `runtime-schema` | none |
| `packages/core/runtime/definition` | `runtime-definition` | `runtime-schema` |
| `packages/core/runtime/derivation` | `runtime-derivation` | `runtime-schema`, `runtime-definition` |
| `packages/core/runtime/compiler` | `runtime-compiler` | `runtime-definition`, `runtime-derivation` |
| `packages/core/runtime/bootgraph` | `runtime-bootgraph` | `runtime-compiler` |
| `packages/core/runtime/substrate/effect` | `runtime-substrate-effect` | `runtime-definition`, `runtime-compiler`, `runtime-bootgraph` |
| `packages/core/runtime/process-runtime` | `runtime-process-runtime` | `runtime-derivation`, `runtime-compiler`, `runtime-substrate-effect` |
| `packages/core/runtime/harnesses` | `runtime-harnesses` | `runtime-definition`, `runtime-compiler`, `runtime-process-runtime` |
| `packages/core/runtime/observation` | `runtime-observation` | `runtime-definition` |
| `packages/core/runtime/mounting` | `runtime-mounting` | `runtime-definition`, `runtime-process-runtime`, `runtime-harnesses` |

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

`runtime-mounting` MUST publish only through the definition-owned observation
port supplied by the terminal SDK composition root. It MUST NOT import
`runtime-observation`; that owner remains a separate implementation and
read-model projection dependency of the SDK.

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
Project creation, owner-internal direct edges, and target realization MUST land
with the first conforming implementation rather than as an empty topology
slice. An SDK assembly edge and export MUST land only with the owner's first
public SDK projection, in the same semantic node as that projection and its
installed proof. A private implementation increment MUST NOT create an empty
public facade early. One unchanged rerun MUST restore every cacheable task
without invoking its underlying command; changing one declared relevant input
MUST invalidate the expected dependent work.

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

#### Scenario: Installed consumer derives a cold runtime plan

- **WHEN** a disposable installed consumer imports
  `@habitat-ai/sdk/runtime/derivation` and derives a selected process
- **THEN** the sole derivation face returns the complete normalized graph and
  exact-field portable artifact without resolving an internal workspace package
- **AND** its public schema/decoder rejects surplus data and verifies the
  exact `sha256:` plus 64-lowercase-hex artifact id over RFC 8785 canonical JSON
- **AND** the portable artifact roundtrips without either non-portable table,
  a web loader, `derivedAt`, placement constraints, or live runtime state

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
  owner typecheck/test/build targets, and owner-internal direct project edges
  land in that same semantic node
- **AND** an unchanged rerun restores every cacheable task without invoking its
  command, while one declared relevant-input change invalidates the expected work
- **AND** no empty private runtime project is created in an earlier law-only node
- **AND** no SDK edge or export is invented when the increment has no public
  projection

#### Scenario: A private owner first gains a public projection

- **WHEN** a private runtime owner first exposes a supported terminal SDK face
- **THEN** the real SDK assembly edge, the sole named export, and installed
  package proof land with that complete public projection
- **AND** no earlier empty facade or alternate public path remains

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

#### Scenario: Installed consumer attaches an external companion

- **WHEN** an independently versioned companion package is available and an app
  selects its server-process record
- **THEN** the packed `@habitat-ai/sdk/runtime/harnesses` subpath supplies the
  import-safe descriptor, bounded mount input, native-handle interface, and
  process-local health-report contract
- **AND** the SDK neither bundles the companion, copies its source, authors its
  protocol face, nor gains sibling-process control

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
