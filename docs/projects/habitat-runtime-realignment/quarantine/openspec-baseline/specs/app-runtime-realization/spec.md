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
produce exactly one `Entrypoint` through `defineEntrypoint(...)`, thereby
selecting exactly one catalog process record, and then pass that exact artifact
to its sole future `startApp(...)` call. `startApp(...)` MUST consume the
artifact without reconstructing app, profile, process, entrypoint, or identity.
The artifact carries the immutable `RuntimeLaunchIdentity`
`{ app, process, entrypoint, deployment, source }`; each live invocation MUST
own only that process's lease, ManagedRuntime, resources, native handles,
health, and idempotent stop. Readiness and liveness MUST be distinct
process-local facts.
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

#### Scenario: Application process Entrypoint is selected and consumed

- **WHEN** a Habitat self-host or downstream product entrypoint module calls
  `defineEntrypoint(...)` with an app, profile, process, entrypoint id, and
  exact launch identity
- **THEN** it passes that exact selected `Entrypoint` artifact to its sole
  future `startApp(...)` call without reconstructing selection or identity
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
  thin entrypoint module produces one `Entrypoint` via `defineEntrypoint(...)`
  and passes that exact artifact to its sole future `startApp(...)` call
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

- **WHEN** server and async entrypoint modules each produce an `Entrypoint` via
  `defineEntrypoint(...)` for two records from the same app process catalog
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
  synchronously returns one `RuntimeCompilationResult` containing exactly the
  compiled plan, cold reference table, and observation seed
- **AND** provisioning and mounting consume that plan through their declared
  boundaries even when unused plan collections are empty
- **AND** the plan itself contains neither the observation seed nor findings

#### Scenario: A downstream boundary receives upstream declarations

- **WHEN** a harness or adapter is given raw app declarations, a normalized
  authoring graph, or an uncompiled surface plan
- **THEN** runtime admission fails before native host mutation

### Requirement: Each phase handoff is complete and exclusive

At every phase edge, the downstream owner MUST accept the exact artifact emitted
by the upstream owner and MUST NOT reread source, reconstruct an earlier
decision, or substitute an equivalent-looking artifact. A mismatched artifact
MUST fail before the downstream owner emits output or invokes executable work;
for a mutating boundary it MUST also fail before external mutation. Behavior
proof MUST exercise each producer-to-consumer edge independently with the
producer-local authoring bindings or earlier declarations that are not part of
the emitted artifact made unavailable after handoff. It MUST NOT require the
producer's implementation source code to become unavailable.

#### Scenario: Qualified phase artifact is consumed

- **WHEN** a phase producer emits its canonical artifact and producer-local
  authoring bindings outside that artifact become unavailable
- **THEN** the immediate downstream owner completes from that artifact alone
- **AND** an identity-mismatched artifact is refused before downstream output
  or executable work and, where applicable, before external mutation

### Requirement: Definition-to-selection authority is closed before implementation

Task 4.9a MUST remain a completed documentation-only authority correction
across exactly nine documents: `HABITAT_ARCHITECTURE.md` as router,
`HABITAT_RUNTIME_REALIZATION.md` as the sole exact canonical mechanics owner,
`packages/core/runtime/definition/AGENTS.md` as the definition-owner router,
and the six active OpenSpec artifacts. It MUST change no implementation,
source, test, project, blueprint, SDK face, public contract, export, package,
or runtime behavior. Task 4.10 MUST be the sole next implementation node.

`Entrypoint` MUST be the sole cold selection artifact.
`defineEntrypoint(...)` MUST synchronously produce it from a real
`AppDefinition`, `RuntimeProfile`, and `ProcessDefinition`, the entrypoint id,
and an exact `RuntimeLaunchIdentity`
`{ app, process, entrypoint, deployment, source }`. Before returning or
publishing the artifact, it MUST require `identity.app === app.id`,
`identity.process === process.id`, and `identity.entrypoint === id`. Each
disagreement MUST throw built-in `TypeError` before output, external mutation,
or authored executable invocation. No public error API, prescribed error text,
or prescribed validation order is admitted.

Task 4.10 MUST change exactly
`packages/core/runtime/definition/src/app.ts` and
`packages/core/runtime/definition/test/definition.test.ts`. It MUST preserve
the existing signatures and TypeScript inference, the result's exact
app/profile/process references, freeze behavior, and SDK export identity. Its
proof MUST use real constructors, make producer-local bindings unavailable
after handoff, exercise all three identity disagreements independently, and
observe zero authored executable work. It MUST add no validator, schema, file,
project, edge, blueprint, version, export, or error surface.

Task 4.11 MUST change only
`packages/core/runtime/derivation/test/complete-derivation.test.ts`. It MUST use
a real `Entrypoint` plus `profileId`, complete with selection source unavailable
after handoff, and independently exercise corrupt app, process, and entrypoint
identity plus profile mismatch. Each mismatch MUST throw built-in `TypeError`
before a derivation result with zero Effect-body or loader invocation.
Derivation MUST retain all four checks defensively and task 4.11 MUST change no
derivation source or public surface. Profile agreement belongs here because the
exact launch identity has no profile field.

#### Scenario: Real definition selection completes from its artifact

- **WHEN** real app, runtime-profile, and process constructors supply
  `defineEntrypoint(...)` with an agreeing entrypoint id and exact five-field
  launch identity
- **THEN** it returns the sole frozen cold `Entrypoint` selection artifact with
  the exact app, profile, and process references and existing inference
- **AND** the consumer completes from that artifact after producer-local
  bindings become unavailable, without invoking an authored executable

#### Scenario: Definition selection refuses all identity disagreements

- **WHEN** each of launch identity app, process, and entrypoint is separately
  made inconsistent with its real definition input
- **THEN** `defineEntrypoint(...)` throws built-in `TypeError` before returning
  an artifact, mutating external state, or invoking an authored executable
- **AND** acceptance prescribes neither validation order nor error text and
  introduces no public error API

#### Scenario: Derivation retains complete selection defense

- **WHEN** task 4.11 consumes a real `Entrypoint` plus `profileId` after
  selection source becomes unavailable and separately corrupts the three
  launch-identity agreements or profile agreement
- **THEN** the valid artifact completes and every mismatch throws built-in
  `TypeError` before a derivation result
- **AND** no Effect body or web loader is invoked and no derivation source or
  public surface changes

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

### Requirement: Complete-derivation authority corrections are closed before implementation

The task-4.7a, task-4.7b, task-4.7c, task-4.7d, and task-4.7e authority gates MUST
remain closed by the canonical routing and acceptance ownership recorded here.
All five MUST remain documentation-only corrections and leave immutable
topology-only `runtime-derivation@1` unchanged. Only after task 4.7e is complete
MUST task 4.8 become the sole source owner of independent
`runtime-derivation@2`.

Task 4.7a MUST remain an authority-only correction across exactly eight
documents: `HABITAT_ARCHITECTURE.md` as the architecture router,
`HABITAT_RUNTIME_REALIZATION.md` as the sole exact canonical document, and these
six active OpenSpec artifacts. It changes no implementation, project,
blueprint, SDK edge, export map, public export, stage, or commit, and immutable
topology-only `runtime-derivation@1` remains unchanged. Canonical
`HABITAT_RUNTIME_REALIZATION` §§11.8, 13.5, 15, 23.1, and 27 own the exact
TypeBox schemas, TypeScript signatures, identities, ordering, tables, decoder,
source/binding law, publication topology, and runtime mechanics. This
requirement and its scenarios are the sole archive-safe OpenSpec acceptance
owner; they MUST NOT create a second implementation vocabulary.

Task 4.7b MUST remain a matching authority-only correction across that same
exact eight-document surface. It closes only execution-descriptor identity,
async-step occurrence lowering, and service-owned `resourceDep` normalization
under the existing canonical mechanics and the scenarios below. It changes no
implementation, source, test, project, blueprint, SDK edge, export map, public
export, stage, or commit, and it does not widen either exact task-4.8 corpus.

Task 4.7c MUST remain a third authority-only correction across that same exact
eight-document surface. It narrows task-4.8 execution-ref and descriptor-table
population plus its acceptance proof to operational descriptors derived from
authored async-step occurrences. The exact five-boundary-variant
`ExecutionDescriptorRef` and `ExecutionDescriptorTable` contracts remain
future-compatible, but every non-async variant is conditional on a later,
separately admitted lane-owned authoring carrier and operational lowering.
`plugin.web-surface` remains schema vocabulary only in task 4.8: it creates no
execution ref or table entry and authorizes no early web Effect face. Task 4.7c
changes no implementation, source, test, project, blueprint, SDK edge, export
map, public export, stage, or commit, and it does not widen or otherwise change
either exact task-4.8 corpus.

Task 4.7d MUST remain a sealed documentation-only correction before task 4.8.
Its exact nine-document surface is the prior eight authority documents plus
`packages/core/runtime/definition/AGENTS.md`. It admits that existing router as
the eighth task-4.8 behavior-companion file solely for ownership and routing
documentation and leaves the publication/assembly corpus unchanged. It records
that cold object-shaped `providerSelection(...)` grammar belongs to flat
runtime-definition `profile.ts` and is projected only through
`@habitat-ai/sdk/runtime/profiles`; provider Effect plans and acquisition
remain later runtime responsibilities. It changes no
implementation, source, test, project, blueprint, SDK edge, export map, public
export, stage, or commit, and immutable `runtime-derivation@1` remains
unchanged.

Task 4.7e MUST remain the final documentation-only correction before task 4.8
across exactly the same eight authority documents used by tasks 4.7a-c. It MUST
exclude `packages/core/runtime/definition/AGENTS.md` and change no
implementation or config. It corrects only the exact task-4.8
publication/assembly corpus by adding the existing
`packages/core/runtime/derivation/tsdown.config.ts`. Task 4.8 may change that
file only by adding `node:crypto` exactly once to `deps.onlyImport`, yielding
exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`,
while retaining `platform: "neutral"`, every prior entry, and every other
option. The synchronous RFC 8785/SHA-256 implementation MUST use Node's native
`createHash`; pinned tsdown 0.22.14's neutral-platform `onlyImport` audit
otherwise rejects the emitted builtin. A platform change, hand-rolled digest,
Bun-only crypto, async WebCrypto, new dependency or package, Nx change, public
change, or source-semantic change is forbidden. The exact source/test and
eight-file behavior-companion corpora, every other publication file, immutable
version 1, all package/blueprint/directory counts, and all exports remain
unchanged.

Only after task 4.7e is sealed, task 4.8 MUST select independent
no-inheritance/no-fallback
`runtime-derivation@2` and implement those canonical sections without widening
them. It MUST create exactly the independent blueprint closure
`.habitat/blueprints/runtime-derivation/versions/2/blueprint.toml` and
`.habitat/blueprints/runtime-derivation/versions/2/structure.toml`, then select
version 2 in the existing
`packages/core/runtime/derivation/habitat.toml`. The root version-1 blueprint
files remain byte-for-byte untouched and version 2 MUST NOT inherit from or
fall back to them. No `runtime-derivation@3` is admitted. Its retained project
root shell has no `package.json`. Its exact source closure is `index.ts`,
`normalized-runtime-topology.ts`, `derive-runtime-artifacts.ts`,
`normalized-authoring-graph.ts`, `execution-descriptor-ref.ts`,
`derive-execution-descriptor-table.ts`, `identity-policy.ts`,
`service-binding-plan.ts`, `surface-runtime-plan.ts`,
`web-route-module-table.ts`, `workflow-dispatcher-descriptor.ts`, and
`portable-runtime-plan-artifact.ts`; its exact tests are
`normalized-topology.test.ts`, `complete-derivation.test.ts`, and
`nx-cache.test.ts`. Tasks 4.9 through 4.11 MAY only edit those admitted
version-2 modules/tests. No optional interior or alternate test is admitted.

The exact eight-file task-4.8 behavior companion corpus is the existing
`packages/core/runtime/definition/AGENTS.md`,
`packages/core/runtime/definition/src/service.ts`,
`packages/core/runtime/definition/src/profile.ts`,
`packages/core/runtime/definition/test/definition.test.ts`,
`packages/core/sdk/src/service/index.ts`,
`packages/core/sdk/src/runtime/profiles/index.ts`,
`packages/core/sdk/test/runtime-authoring-public-faces.test.ts`, and
`apps/habitat/test/installed-package.test.ts`. It evolves only the private
`ServiceUse` carrier in `service.ts` and adds the cold object-shaped
`providerSelection(...)` helper to the flat `profile.ts`; that helper MUST be
exported only through `@habitat-ai/sdk/runtime/profiles`. Task 4.7d already
corrected the router, and task 4.8 MUST retain it unchanged as the eighth
routing companion; it is not implementation or publication authority.

The separate exact task-4.8 publication/assembly corpus is `.gitattributes`;
`.habitat/AUTHORITY.md`, `.habitat/AUTHORITY-ONTOLOGY.md`, and
`.habitat/README.md`; `packages/core/runtime/derivation/AGENTS.md`,
`packages/core/runtime/derivation/habitat.toml`, and
`packages/core/runtime/derivation/project.json`, plus
`packages/core/runtime/derivation/tsdown.config.ts`; the new
`packages/core/sdk/src/runtime/derivation/index.ts` plus the existing
`packages/core/sdk/AGENTS.md`, `packages/core/sdk/README.md`,
`packages/core/sdk/habitat-pack.json`, `packages/core/sdk/package.json`,
`packages/core/sdk/project.json`, `packages/core/sdk/tsdown.config.ts`, and
`packages/core/sdk/test/runtime-authoring-public-faces.test.ts`;
`apps/habitat/test/installed-package.test.ts`; and the two new version-2
blueprint files named in this requirement. Task 4.8 MUST create no new
`runtime-definition` file, project, blueprint, or blueprint version and no
other blueprint kind, version, or project.
Tasks 4.7b, 4.7c, 4.7d, and 4.7e add no source or test file, and
`packages/core/runtime/definition/src/execution.ts` MUST remain outside task
4.8 and unchanged; the exact source/test, eight-file behavior-companion, and
separate publication/assembly corpora above remain otherwise exact.

Within the existing runtime-derivation `tsdown.config.ts`, task 4.8 MUST make
only the `node:crypto` addition sealed above. It MUST NOT change the neutral
platform or another option, remove or reorder a prior `onlyImport` entry,
substitute another crypto mechanism, or create a dependency, package, Nx,
public-surface, or source-semantic change. This config correction changes none
of the package, policy-pack, blueprint-directory, or export counts below.

The SDK policy pack MUST grow from exactly 11 to exactly 13 sorted members by
adding `runtime-derivation@1` at
`dist/blueprints/runtime-derivation/blueprint.toml` and
`runtime-derivation@2` at
`dist/blueprints/runtime-derivation/versions/2/blueprint.toml`. The SDK
blueprint copy/input inventory MUST grow from exactly eight directories to
exactly nine by adding `runtime-derivation`. `.gitattributes` MUST add exactly
`.habitat/blueprints/runtime-derivation/** text eol=lf`.

The complete derivation operation MUST remain exactly synchronous
`deriveRuntimeArtifacts({ entrypoint, profileId })`. It calls private
`deriveNormalizedRuntimeTopology({ entrypoint, profileId })` exactly once and
returns exactly the own enumerable fields `topology`, `graph`,
`executionDescriptorTable`, `webRouteModuleTable`, and `portableArtifact`.
The result MUST be recursively frozen and MUST satisfy
`result.graph.topology === result.topology`. Except for that required shared
topology identity, schema-shaped public data MUST be fresh copied and frozen.
Derivation MUST invoke no Effect body or web loader and MUST perform no source
availability check, lookup, I/O, schema decode, provider acquisition, live
service binding, cache construction, mounting, or lifecycle action.
Acceptance MUST prove the public entrypoint by importing and invoking the actual
`deriveRuntimeArtifacts` export through the admitted SDK face against authored
declarations. Arbitrary object properties, Nx or project facts, TypeScript
casts, synthesized refs, and a directly constructed descriptor-table fixture
MUST NOT stand in for public-entrypoint reachability or task-4.8 population.

The structurally reachable `NormalizedAuthoringGraph` MUST contain exactly
`kind`, `topology`, `app`, `plugins`, `roleSurfaceIndex`, `serviceUses`,
`serviceDependencies`, `semanticDependencies`, `resourceRequirements`,
singular `profile`, `serviceBindingPlans`, `surfaceRuntimePlans`,
`workflowDispatcherDescriptors`, `executionDescriptorRefs`,
`webRouteModuleRefs`, and `findings`. There is no graph-level
`providerSelections` field. The exact normalized carrier fields and closed
schemas remain canonical §15 mechanics; no schema object, decoded value,
callback, executable body, loader, or live handle may enter the graph.
Task 4.8 MUST populate `executionDescriptorRefs` only from authored async-step
occurrences. The field's wider closed schema remains future-compatible and does
not synthesize a carrier for another lane.

The sole public `@habitat-ai/sdk/runtime/derivation` face MUST expose exactly
three runtime values: `deriveRuntimeArtifacts`,
`PortableRuntimePlanArtifactSchema`, and
`decodePortableRuntimePlanArtifact`. Its exact type-only inventory is
`RuntimeDerivationInput`, `RuntimeDerivationResult`,
`NormalizedPluginIdentity`, `NormalizedSurfaceRequirement`,
`NormalizedResourceRequirementIdentity`, `NormalizedRuntimeTopologyEdge`,
`NormalizedRuntimeTopology`, `NormalizedAppDefinition`,
`NormalizedPluginDefinition`, `DerivedRoleSurfaceIndex`,
`NormalizedServiceUse`, `NormalizedServiceDependency`,
`NormalizedSemanticDependency`, `ResourceRequirement`, `ProviderSelection`,
`NormalizedRuntimeProfile`, `ServiceBindingPlan`, `SurfaceRuntimePlan`,
`WorkflowDispatcherDescriptor`, `ExecutionDescriptorRef`,
`ExecutionDescriptorTable`, `WebRouteModuleRef`,
`WebRouteModuleTableEntry`, `WebRouteModuleTable`,
`PortableRuntimePlanArtifact`, and `DerivationFinding`.
`NormalizedAuthoringGraph`, `RuntimeConfigRefInput`,
`NormalizedRuntimeConfigRef`, normalized config-source/ref aliases,
binding-source aliases, nested owner/index/JSON helpers, schema constants,
identity helpers, and `ExecutionDescriptorTableEntry` MUST remain structurally
reachable nonexports. No public derivation error API or fourth runtime value is
admitted.

Public `ServiceUse` MUST remain exactly enumerable `kind`, `serviceId`, and
optional `serviceInstance`. Its private authoring carrier retains
`definition` and `contract` by exact reference; it neither copies nor
recursively freezes them. It fresh-copies and recursively freezes only the
optional `binding` tree before storing it. Private `RuntimeConfigRefInput`
remains exactly `{ kind: "runtime.config", key }`; recursive dependency
overrides contain only optional `instance`, `scope`, `config`, and
`dependencies` keyed by the immediately enclosing service dependency-map
keys. Authoring `instance` normalizes to `serviceInstance` and never survives
in normalized output. Unknown, resource, semantic, unused, or unreachable
override keys MUST throw built-in `TypeError`.

Task 4.8 MUST normalize exactly the five authored source variants `env`,
`dotenv`, `file`, `memory`, and `test`, including canonical §15 defaults
and app-root-relative POSIX path refusal. Every config key is a nonempty opaque
case-sensitive ECMAScript string. Private `NormalizedRuntimeConfigRef` remains
exactly `{ kind: "runtime.config-ref", key, sources }`.
`profile.configSources` and every expanded ref `sources` array preserve every
normalized authored entry in order without sorting or deduplication; env
`name` is exact `prefix + key`. They are the only order-sensitive arrays.
Every other array MUST follow the exact canonical §15.2 tuple table and
ECMAScript code-unit ordering.

`processDefaults` MUST be a fresh recursively copied and frozen plain JSON
object containing only null, boolean, finite number, string, recursively
readonly arrays, or recursively readonly plain string-keyed objects.
`undefined`, bigint, symbol, function, class or other nonplain object, `NaN`,
and either infinity MUST throw built-in `TypeError`.

For every binding role through which a reachable service-owned
`resourceDep(...)` key is normalized, the non-derived requirement fields MUST
be exactly owner `{ kind: "service", serviceId, localName }`; resource
`{ resourceId: dependency.resource.id, lifetime:
dependency.resource.defaultLifetime }` plus `role: bindingRole` if and only if
that default lifetime is `role`; `optional: false`; and `reason: localName`.
`resource.instance` MUST be absent. A process-lifetime dependency therefore
carries no role, while a role-lifetime dependency carries the enclosing binding
role. Plugin- and provider-owned requirements MUST retain their exact authored
`reason`; only a service-owned dependency derives it from `localName`.
The same process-lifetime dependency reached through multiple binding roles
MUST resolve to one requirement id reused by those bindings, while a
role-lifetime dependency MUST resolve to a distinct id for each propagated
role. Each binding plan MUST reference its corresponding direct requirement id
in `resourceRequirementIds`.

A normalized `ProviderSelection` MUST carry `configRef` if and only if its
provider owns `configSchema`, using an explicit selection key before the
provider default. A schema-bearing provider without either key and a
schema-free provider with either config input MUST throw `TypeError`. Required
missing or ambiguous provider selection is derivation-owned `TypeError`.
Only an unselected optional resource requirement emits the sole finding
`provider-selection.optional-missing`.

A schema-bearing service scope/config lane MUST have its effective normalized
ref, and a schema-free lane MUST have none. The nearest path-local dependency
override wins; otherwise a schema-bearing child inherits its parent's effective
lane. Equal diamonds MUST normalize to one identical `ServiceBindingPlan` and
deduplicate before emission; divergent diamonds MUST throw `TypeError`.
`ServiceBindingPlan` contains exactly `kind`, `bindingId`, `role`,
`serviceId`, optional `serviceInstance`, optional `scopeRef`, optional
`configRef`, and the three sorted arrays `resourceRequirementIds`,
`serviceBindingIds`, and `semanticDependencyIds`. Task 4.8 derives the
canonical RFC 8785/SHA-256 ids and proves binding-id/equal-diamond deduplication
only; task 8.2 alone constructs and proves a live cache.

The Effect and web reference/table channels MUST remain distinct. The exact
five boundary variants of `ExecutionDescriptorRef` and
`ExecutionDescriptorTable` MUST remain in the public contract for future
compatible lane admission. Task 4.8 MUST populate that contract only with
operational descriptors derived from authored async-step occurrences. A CLI
command, web surface, agent tool, or desktop background ref/table entry MAY be
populated only after a later task separately admits that lane's authoring
carrier and operational lowering; task 4.8 MUST NOT infer, cast, or synthesize
one from arbitrary plugin properties, project facts, or surface declarations.
In particular, `plugin.web-surface` is schema vocabulary only during task 4.8.
It MUST NOT produce an execution ref or descriptor-table entry and MUST NOT
authorize an Effect-backed web authoring face. The lazy web route-module loader
continues to use only the distinct web ref/table channel.

Every emitted `ExecutionDescriptorRef.executionId` and matching operational
descriptor id MUST match
`^execution-descriptor:sha256:[0-9a-f]{64}$`; every execution ref `ownerId` MUST
match `^plugin-owner:sha256:[0-9a-f]{64}$`. The execution id MUST be SHA-256
over the UTF-8 RFC 8785 canonical JSON record
`{ kind: "execution.descriptor-identity", ...identityInput }`, where
`identityInput` is the exact closed boundary-specific
`ExecutionDescriptorIdentityInput`. A looser optional-field bag is forbidden.
For every table pair, `descriptor.executionId`, `ref.executionId`, and the
recomputed id MUST agree byte for byte, and `descriptor.boundary` MUST equal
`ref.boundary`; disagreement MUST throw built-in `TypeError` before a result.

For every authored async-step occurrence under a workflow, schedule, or
consumer, complete derivation MUST create one new frozen operational
`execution.effect` descriptor under that occurrence's full ref. The ref MUST
use the enclosing plugin's canonical `ownerId`, the authored descriptor `id` as
`stepId`, and exactly the enclosing `workflowId`, `scheduleId`, or `consumerId`.
The operational descriptor MUST use that ref's canonical `executionId`,
boundary `plugin.async-step`, the exact authored frozen policy value by
reference, and the exact authored `effect` function by reference. Its
`run(invocation)` MUST invoke no authored code before returning a cold
`HabitatEffect`; only execution of that returned Effect MUST invoke
`authoredDescriptor.effect(invocation.context)` with the exact
reference-identical context and no reconstruction. It MUST NOT pass
`invocation.input` to the authored async-step function. A generator result MUST
be normalized through definition-owned `Effect.gen(...)`, while an authored
`HabitatEffect` result MUST be yielded by reference inside that lazy wrapper.
Reusing one authored async descriptor under distinct parents MUST
produce distinct full refs, ids, and operational descriptors. Derivation MUST
invoke neither `run(...)` nor the authored function, and the table MUST carry
the derived operational descriptors rather than authored
`AsyncStepEffectDescriptor` values.

`ExecutionDescriptorTable` exposes only literal kind, full-structural-ref
`get` returning `ExecutionDescriptor<unknown, unknown, unknown, unknown>`,
and `entries` returning readonly frozen `[ref, descriptor]` tuples.
`WebRouteModuleTableEntry` is exactly `{ ref, load }`, and
`WebRouteModuleTable` exposes only literal kind, full-structural-ref `get`
returning `WebRouteModuleTableEntry["load"]`, and `entries`. Every web
`ownerId` is the canonical `pluginOwnerId` value. Each table constructs one
recursively frozen canonically ordered snapshot, returns that same snapshot by
reference on every `entries()` call, preserves the exact stored
descriptor/loader identity from `get`, and throws built-in `TypeError` on
absence or structural mismatch.
Task 4.8's execution-table snapshot contains only the derived async operational
descriptors above. Its `get` signature retains the exact five-boundary-variant
ref contract, but a non-async lookup is absent until its later lane-owned
carrier and lowering have been admitted and populated through complete
derivation.

`PortableRuntimePlanArtifactSchema` and its `Static` type MUST describe
exactly `kind: "portable.runtime-plan-artifact"`, `artifactId`, `identity`,
`profileId`, `roles`, `surfaces`, and `executionDescriptorRefs`.
`artifactId` MUST match `^sha256:[0-9a-f]{64}$` and equal SHA-256 over UTF-8
RFC 8785 canonical JSON of the other six fields.
`decodePortableRuntimePlanArtifact(value: unknown)` MUST closed-decode,
validate canonical order, verify the digest, and return a fresh recursively
frozen artifact. It MUST reject surplus fields, duplicate or noncanonical
collections, malformed/mismatched digest, web refs/loaders, either table,
callbacks, executable/live values, and lifecycle state with built-in
`TypeError`.
Task 4.8 emits only async-step refs in the portable artifact. The artifact
schema and decoder retain all five boundary variants for future-compatible
decoding, but that compatibility does not authorize task 4.8 to manufacture a
non-async ref.

Every fatal derivation issue other than the sole finding MUST throw built-in
`TypeError` before any result; message, selected path, and throw order are not
contractual. Task 5.2 owns normalized-handoff referential consistency and
provider dependency closure/cycle defense against corrupt artifacts. Task 7.2
owns physical availability, exact-key first-hit lookup, and owning-schema decode
for every provider plus service scope/config ref before first acquisition.
Task 8.2 owns actual private `{ identity, profileId, bindingId }` cache
construction and reuse.


#### Scenario: Public exports and structurally reachable nonexports are inspected

- **WHEN** an installed consumer enumerates runtime and type-only names at
  `@habitat-ai/sdk/runtime/derivation`
- **THEN** it observes exactly the three runtime values and finite type-only
  inventory named by this requirement
- **AND** `NormalizedAuthoringGraph`, config/binding aliases, nested helpers,
  and `ExecutionDescriptorTableEntry` remain structurally reachable without
  becoming named exports

#### Scenario: Config source defaults, order, and ref expansion are derived cold

- **WHEN** complete derivation normalizes authored `env`, `dotenv`, `file`,
  `memory`, and `test` declarations plus one opaque config key
- **THEN** it emits the exact explicit defaults, preserves every source in
  authored order without sorting or deduplication, and expands the ref sources
  in that same order with env `name` equal to literal `prefix + key`
- **AND** derivation performs zero source availability check, lookup, I/O, or
  schema decode; task 7.2 alone proves physical source and first-hit behavior

#### Scenario: Private service-use carrier is enumerated and recovered

- **WHEN** a plugin authors `useService(..., { contract, instance?, binding? })`
  and a private runtime owner reads it
- **THEN** public enumeration yields only `kind`, `serviceId`, and optional
  `serviceInstance`
- **AND** the private accessor alone recovers the definition and contract by
  exact reference plus a fresh recursively copied and frozen binding tree;
  neither referenced definition nor contract is copied or recursively frozen

#### Scenario: Binding inheritance, override, and diamond convergence are derived

- **WHEN** complete derivation traverses nested `serviceDep` paths with inherited
  lane refs and path-local overrides
- **THEN** each schema-bearing child receives the nearest inherited or replaced
  ref, each schema-absent lane receives none, and authoring `instance` becomes
  normalized `serviceInstance`
- **AND** an invalid dependency-map key, missing required lane ref, forbidden
  absent-schema ref, unused override, or divergent diamond refuses with built-in
  `TypeError`

#### Scenario: Binding ids and equal diamonds deduplicate before emission

- **WHEN** multiple service uses or equal diamond paths normalize to the same
  exact binding identity
- **THEN** derivation emits one `ServiceBindingPlan` and its RFC 8785/SHA-256
  `bindingId`
- **AND** `NormalizedServiceUse.localName`/the services-map key is not a separate
  binding-id ingredient, while service-owned dependency keys may affect the id
  only through normalized dependency or requirement ids

#### Scenario: Execution descriptor identity disagreement is refused

- **WHEN** complete derivation emits an execution descriptor and its full ref
- **THEN** canonical `executionId` and `ownerId` patterns hold, and the
  descriptor id, ref id, RFC 8785 recomputation from the exact closed
  boundary-specific identity input, and descriptor/ref boundary agree
- **AND** any pattern, id, boundary, or full-ref disagreement throws built-in
  `TypeError` before a result

#### Scenario: Reused async steps lower lazily per occurrence

- **WHEN** generator-returning and direct-`HabitatEffect`-returning authored
  async-step descriptors are reused beneath distinct workflow, schedule, or
  consumer parents
- **THEN** each occurrence's full ref uses the enclosing canonical plugin owner,
  authored step id, and exact parent id and produces a distinct frozen
  operational `execution.effect` descriptor and canonical execution id
- **AND** the table contains those derived descriptors with the exact authored
  policy and effect-function reference, not the authored async descriptor
- **AND** neither derivation nor `run(invocation)` invokes authored code;
  `run(invocation)` returns a cold `HabitatEffect`, whose execution passes the
  exact reference-identical `invocation.context` to the authored function and
  never passes `invocation.input`
- **AND** the generator result is normalized through definition-owned
  `Effect.gen`, while the direct `HabitatEffect` result is yielded by reference
  inside the lazy wrapper

#### Scenario: Service resource dependencies normalize by lifetime

- **WHEN** reachable service `resourceDep` keys select process- and role-default
  resources through a binding role
- **THEN** both requirements use exact service owner/local-name fields,
  resource id/default lifetime, `optional: false`, and `reason: localName`, with
  no resource instance
- **AND** only the role-lifetime requirement carries the binding role, so
  one process-lifetime requirement is emitted and reused across reaching
  bindings while role-lifetime identity remains role-specific, and each
  binding plan references its direct requirement id; independently authored
  duplicate requirements still refuse, and plugin/provider reasons remain
  authored

#### Scenario: Independent version-2 law is packed and applied

- **WHEN** task 4.8 builds and installs the SDK policy pack and evaluates the
  retained runtime-derivation project
- **THEN** the pack contains exactly 13 sorted members, the SDK copies exactly
  nine blueprint directories, and the exact LF rule governs the derivation
  blueprint tree
- **AND** the retained runtime-derivation build config keeps
  `platform: "neutral"` and every prior option while its exact
  `deps.onlyImport` array is
  `["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`
  for the synchronous Node-native `createHash` path
- **AND** installed acceptance pins the immutable version-1 root closure while
  excluding its `versions/` subtree, pins the exact version-2 closure, proves
  canonical-to-packed byte parity and pack provenance, cold-imports
  `@habitat-ai/sdk/runtime/derivation`, and actually applies
  `runtime-derivation@2` to the retained project

### Requirement: Complete derivation remains import-safe and separates references

Task 4.8 MUST implement canonical `HABITAT_RUNTIME_REALIZATION` §§11.8, 13.5,
15, 23.1, and 27 through the sole `@habitat-ai/sdk/runtime/derivation` face and
the archive-safe acceptance requirement/scenarios in this capability under
independent `runtime-derivation@2`. It MUST remain synchronous and import-safe,
retain the exact source/test closure, exact eight-file behavior companion
corpus, and separate exact publication/assembly corpus named by the acceptance
requirement, create no new `runtime-definition` file/project/blueprint/version
or any other kind/version/project, call private topology once, preserve
`result.graph.topology === result.topology`, recursively freeze all output and
table snapshots, and call no Effect body or web loader. Effect refs/tables and
web refs/tables MUST remain disjoint; only the former enter the portable
artifact. The compiler MUST consume the complete graph, process runtime MUST
consume the Effect table, the web adapter/module-loading boundary MUST consume
the web table, and pre-runtime/deployment tooling MUST consume only the reduced
portable artifact.
Task 4.8 MUST populate the Effect refs/table and portable refs only with
per-occurrence operational descriptors derived from authored async steps. The
five-boundary-variant contracts remain exact and future-compatible, but every
other variant requires a later separately admitted lane-owned carrier and
lowering. Public-entrypoint acceptance MUST invoke the actual SDK export and
MUST NOT substitute arbitrary properties, project facts, casts, synthesized
refs, or a direct table fixture.

#### Scenario: Exact result and eager tables execute nothing

- **WHEN** a consumer calls
  the actual exported `deriveRuntimeArtifacts({ entrypoint, profileId })` with
  one authored async-step occurrence and one lazy web route-module loader
- **THEN** it receives exactly `topology`, `graph`,
  `executionDescriptorTable`, `webRouteModuleTable`, and `portableArtifact`,
  from one private topology call with referential graph identity
- **AND** both eager tables return frozen canonical entry snapshots, exact
  structural lookup returns the derived async operational descriptor and the
  preserved loader; the execution refs/table and portable refs contain no
  non-async entry, absent or mismatched lookup throws `TypeError`, and no
  executable or authored async function is invoked
- **AND** the proof uses neither arbitrary properties or project facts, a cast,
  a synthesized ref, nor a directly constructed descriptor-table fixture in
  place of the public entrypoint and its derived result

#### Scenario: Optional provider finding and fatal refusal are distinguished

- **WHEN** an explicitly optional resource requirement has no selected provider
- **THEN** derivation emits exactly one
  `provider-selection.optional-missing` finding and no provider selection
- **AND** missing required or ambiguous coverage and every other invalid shape,
  identity, source/ref, override, duplicate, cycle, or table condition throw
  built-in `TypeError` before a result, with no public error API

#### Scenario: Portable artifact roundtrips canonically

- **WHEN** a valid seven-field `PortableRuntimePlanArtifact` is decoded
- **THEN** the decoder closed-validates nested data, canonical ordering, and the
  exact RFC 8785/SHA-256 digest of the other six fields and returns a fresh
  recursively frozen deeply equal artifact
- **AND** a surplus field, malformed id, noncanonical order, digest mismatch,
  web ref/loader, table, callback, executable/live value, acquisition, or
  lifecycle field throws built-in `TypeError`

### Requirement: Service use is one cold typed relation

Plugin authoring MUST declare projected service clients only through
`useService(serviceDefinition, { contract, instance?, binding? })`. The operation MUST
produce a frozen `ServiceUse<TContract>` whose public enumerable shape contains
only `kind: "service.use"`, the exact definition `serviceId`, and optional
`serviceInstance`. `serviceInstance` MUST be present only when composition
selects a genuine distinct instance. The containing services-map key MUST remain
the consumer-local injected-client property and MUST NOT become an alias,
service identity, binding identity, or cache-key ingredient. The public relation
MUST NOT expose the service definition, contract object, or an `alias` field.

`runtime-definition` MUST retain the exact service definition and contract
references plus the optional closed `binding` tree in the private
non-enumerable symbol-keyed carrier defined by the complete-derivation
requirement. It MUST neither copy nor
recursively freeze the referenced definition or contract; it MUST fresh-copy
and recursively freeze only the optional binding tree before freezing the
declaration and carrier. Only private runtime owners MAY use its internal accessor;
the SDK MUST NOT export the carrier symbol, accessor, or config/binding aliases.
`ServiceContractOf` and services-map client projection MUST infer the exact
contract while preserving every authored map key without a dynamic lookup.
Every terminal SDK plugin face that admits service use MUST re-export the same
`useService` helper rather than define a lane-local variant. Complete derivation
MUST normalize each use, recursively apply path-local inheritance and overrides,
and emit the exact reduced `ServiceBindingPlan`. The compiler MUST consume that
plan, provisioning alone MAY resolve/decode config, and only process runtime MAY
construct or cache live service bindings.

#### Scenario: A plugin declares one service use

- **WHEN** a plugin places `useService(...)` under a services-map key
- **THEN** the frozen public record contains `kind`, `serviceId`, and only a
  genuinely selected `serviceInstance` when one was supplied
- **AND** enumeration reveals no `service`, `contract`, `binding`, `alias`,
  callback, live client, or binding plan
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
- **THEN** the private accessor recovers the exact definition, contract, and
  optional binding tree from the non-enumerable carrier
- **AND** derivation emits the exact normalized use and reduced
  `ServiceBindingPlan` with only closed data-only scope/config refs and id arrays
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
`providerSelection({ resource, provider, config?, lifetime?, role?, instance? })`
using those direct faces, where `config`, when present, is exactly the private
`{ kind: "runtime.config", key }` binding. Normalization MUST emit `configRef`
if and only if the provider owns `configSchema`, selecting the explicit key
before `defaultConfigKey`; schema/key disagreement MUST throw `TypeError`.
Resource-owned selector wrappers and provider catalogs MUST NOT become alternate selection owners. The closed private runtime inventory
contains only named capability owners, and reusable machinery remains with the
owner whose invariant it implements.

#### Scenario: App profile selects a concrete provider

- **WHEN** a profile selects one provider for a neutral runtime resource
- **THEN** runtime derivation emits the exact normalized provider selection and
  emits `configRef` exactly when the provider owns a config schema
- **AND** the resource package does not enumerate or import the provider

#### Scenario: Compiler preserves selected provider references cold

- **WHEN** compilation receives a complete normalized graph and recovers the
  selected provider and service definitions through the exact supplied
  `Entrypoint`
- **THEN** it reconciles those cold references with the graph's normalized
  selection and binding identities and retains the exact references without
  copying or invoking them
- **AND** every selected concrete provider still resolves from its resource
  provider project

### Requirement: Runtime-compiler authority is closed before source activation

Task 5.0 MUST remain a completed documentation-only authority correction across
exactly eight documents: `HABITAT_ARCHITECTURE.md` as router,
`HABITAT_RUNTIME_REALIZATION.md` §16 as the sole exact mechanics and closed
TypeBox DTO owner, and the six active OpenSpec artifacts. This requirement and
its scenarios MUST remain the sole archive-safe acceptance owner. The other
OpenSpec artifacts MUST route or record the decision without copying §16's full
schema block. Task 5.0 MUST change no implementation, source, test, project,
blueprint, SDK/public surface, export, package, runtime behavior, `.habitat`
blueprint, or `.habitat` current-realization record. Task 5.1 MUST be the sole
next source node.

Task 5.1 MUST create and fully activate private package-less
`runtime-compiler@1`. The blueprint root MUST contain exactly
`blueprint.toml`, `structure.toml`, and `skill.md`. The project root
`packages/core/runtime/compiler` MUST contain exactly `AGENTS.md`,
`habitat.toml`, `project.json`, `src`, `test`, `tsconfig.json`,
`tsconfig.test.json`, and `tsdown.config.ts`. `src` MUST contain exactly
`compile-runtime-plan.ts`, `compiled-process-plan.ts`, `index.ts`, and
`runtime-compilation-reference-table.ts`; `test` MUST contain exactly
`compile-runtime-plan.test.ts`, `derivation-handoff.test.ts`, and
`nx-cache.test.ts`.

That node MUST establish only the real direct edges
`runtime-compiler -> runtime-definition` and
`runtime-compiler -> runtime-derivation`, activate and apply version 1, add the
LF rule, grow the sorted SDK policy pack from 13 to 14 members, grow copied and
input blueprint directories from 9 to 10, and prove exact structure, both Nx
edges, cache restoration/invalidation, packed parity, provenance, and
application. It MUST add no optional interior, `package.json`, `versions/`
directory, Grit source law, successor blueprint, compiler package/public
face/export, fake SDK export,
`implicitDependencies`, publication-metadata edge, or early
terminal-composition edge. A later terminal composition source MAY establish a
direct compiler edge only when its real `compileRuntimePlan(...)` import and
consumer proof co-land. Specifically, task 10.6's terminal SDK composition
source MUST establish the final direct
`@habitat-ai/sdk -> runtime-compiler` assembly relation when it actually imports
and calls the operation. Runtime mounting MUST receive no compiler edge, and
transitive process-runtime reachability MUST NOT substitute.

The compiler project MUST define exactly three focused targets:
`acceptance:compiled-process-plan` runs `compile-runtime-plan.test.ts`,
`acceptance:derivation-handoff` runs `derivation-handoff.test.ts`, and
`acceptance:nx-cache` runs `nx-cache.test.ts`. Each MUST use
`nx:run-commands`, set `cache: false` and `parallelism: false`, and declare
`outputs: []`.

Task 5.1's exact publication/assembly corpus MUST be the following 18 files:
`.gitattributes`; `.habitat/AUTHORITY.md`;
`.habitat/AUTHORITY-ONTOLOGY.md`; `.habitat/README.md`;
`.habitat/blueprints/runtime-compiler/blueprint.toml`;
`.habitat/blueprints/runtime-compiler/skill.md`;
`.habitat/blueprints/runtime-compiler/structure.toml`;
`packages/core/AGENTS.md`; `packages/core/runtime/compiler/AGENTS.md`;
`packages/core/runtime/compiler/habitat.toml`;
`packages/core/runtime/compiler/project.json`;
`packages/core/runtime/compiler/tsdown.config.ts`;
`packages/core/sdk/AGENTS.md`; `packages/core/sdk/README.md`;
`packages/core/sdk/habitat-pack.json`; `packages/core/sdk/project.json`;
`packages/core/sdk/tsdown.config.ts`; and
`apps/habitat/test/installed-package.test.ts`. It MUST exclude
`packages/core/sdk/package.json`, every SDK public-face test, the
product-separation test, root manifests, the lockfile, root Nx configuration,
and `.habitat/index.json`. Remaining compiler source, tests, and tsconfigs MUST stay
in the distinct implementation closure rather than the publication corpus.

Tasks 5.2 through 5.5 MUST be proof-only expansions within the existing exact
compiler test closure and MUST change no compiler or derivation source, project
topology, blueprint, pack, or public surface. Behavior tests MUST own semantic
planning and refusal, TypeScript and TypeBox MUST own type and closed admission,
Habitat MUST own exact structure, Nx MUST own exact edges and cache behavior,
and SDK pack/installed-blueprint acceptance MUST prove provenance only. Runtime
source or AST string inspection and a fabricated compiler export MUST NOT count
as proof.

Task 5.2 MUST add only normalized provider-handoff; required and
selected-optional requirement matching; unselected-optional requirement or
dependency id retention with its exact derivation finding and no
binding/node/edge/resource/reference; missing-finding refusal; dependency
closure; dangling required dependency; and direct/transitive cycle proof to
`compile-runtime-plan.test.ts`. Task 5.3 MUST add only selected-process roots,
canonical role agreement, transitive service/semantic/resource/provider/
workflow/execution/web closure, exclusion of unrelated app-role and semantic
facts, selected harness ids, ordinary identity/reference agreement,
explicit-empty, and no-invented-compatibility proof plus cold
reference identity/stable snapshots and the observable observation-seed data
boundary with no port input, call, or publication. Import/implementation absence
remains a reviewed boundary rather than a source-inspection behavior assertion.
Task 5.4 MUST add only
ordering, freeze, schema closure, built-in-TypeError, absent diagnostic/finding,
and zero downstream-work proof to that file. Task 5.5 MUST add only the real
derivation handoff and corrupted-artifact proof to `derivation-handoff.test.ts`,
making producer-local authoring bindings unavailable rather than derivation
source.
`nx-cache.test.ts` MUST remain task 5.1's sole owner-cache proof.

#### Scenario: The baseline compiler owner is activated completely

- **WHEN** task 5.1 lands the first compiler realization
- **THEN** the exact blueprint, project, source, and test closures exist together
  under selected and applied `runtime-compiler@1`
- **AND** the policy pack, copied/input directory counts, LF rule, application,
  provenance, exact real edges, and cache behavior all pass in the same node
- **AND** no optional interior, package identity, Grit source law, successor
  blueprint, public compiler face, or early terminal-composition edge exists
- **AND** the three focused acceptance targets and exact 18-file
  publication/assembly corpus match their closed declarations without an
  excluded SDK, repository, or index file

#### Scenario: Compiler proof remains with the qualified truth owner

- **WHEN** tasks 5.2 through 5.5 extend compiler acceptance
- **THEN** each edits only its allocated existing compiler test file and
  preserves all task-5.1 source and structure
- **AND** behavior, TypeScript/TypeBox, Habitat, Nx, and SDK pack/provenance each
  prove only their allocated truth rather than inspecting runtime source strings
  or fabricating a public compiler export

### Requirement: Compilation proves complete process closure

The private runtime compiler MUST expose exactly one synchronous internal
operation, `compileRuntimePlan({ entrypoint, graph })`, consuming the exact
selected `Entrypoint` and complete `NormalizedAuthoringGraph`. It MUST NOT
accept a derivation result, `ExecutionDescriptorTable`, `WebRouteModuleTable`,
or `PortableRuntimePlanArtifact`. It MUST return exactly one
`RuntimeCompilationResult` with the three fields `{ plan, references,
observationSeed }`. Canonical runtime §16 alone owns the exact closed TypeBox
DTO fields for the plan, its nested records, and the seed, plus the exact private
operational reference-table contract. `CompiledProcessPlan` MUST contain neither
`observationSeed` nor `findings`.

After whole-graph closed-schema admission and entrypoint/graph identity
agreement, the compiler MUST duplicate-check and canonicalize
`entrypoint.process.roles`, require that result to equal
`graph.topology.roleRequirements`, and project exactly one process. Its roots
MUST be the surface plans whose roles occur in that canonical role set. It MUST
close transitively over those surfaces' service bindings and child bindings,
their semantic dependency records, direct and service-owned resource
requirements, selected providers and their provider dependencies, workflow
dispatchers, Effect execution refs, and web route-module refs. The plan and cold
reference table MUST contain only that closure. Valid
whole-app facts for roles outside the selected process MUST remain excluded and
MUST NOT become process-local provisioning, mounting, dependency, or cycle
outcomes. Within the selected closure the compiler MUST validate normalized
referential consistency, provider dependency closure and cycle freedom, service
binding and semantic dependency closure, surface and workflow relation
agreement, execution-ref agreement, selected-role and selected-harness-id
identity/reference agreement, duplicates, and canonical order. For adapter and harness planning, it MUST
carry only the exact selected lane tuple and selected harness ids;
adapter-target
resolution remains task 10.1 and harness-descriptor compatibility remains tasks
10.2 through 10.3. Every invalid compiler input MUST throw built-in `TypeError`
before any result exists. There MUST be no `CompilationFinding`, compiler
diagnostic result, public/custom error API, prescribed error text, or prescribed
validation order. Authored missing or ambiguous provider selection and the sole
optional-provider finding MUST remain derivation-owned.

Every reached required resource requirement MUST resolve to exactly one
selection or throw `TypeError`. A reached optional requirement with a selection
MUST follow the ordinary provider closure. A reached optional requirement with
no selection MUST retain its requirement or dependency id, require the exact
derivation-owned `provider-selection.optional-missing` finding, and emit no
binding, provider node or edge, compiled resource, or cold reference for that
branch. The compiler MUST NOT copy or rename that finding into its result.

`RuntimeCompilationReferenceTable` MUST retain the exact cold provider and
service definition references. Repeated `providerEntries()` calls MUST return
the same one-time, referentially stable, canonically sorted frozen provider
snapshot, and repeated `serviceEntries()` calls MUST do the same for the service
snapshot. The table MUST NOT copy or invoke a definition, descriptor, callback,
loader, Effect, provider, or service implementation. `observationSeed` MUST
remain returned cold structural data; the compiler MUST NOT import, consume,
implement, call, or publish through `RuntimeObservationPort`.

Compilation MUST NOT accept, construct, or consume `ProviderEffectPlan`; resolve
or decode config; build or acquire a provider; execute an Effect, body, loader,
or callback; bind a service or construct a cache; resolve adapter targets; check
harness descriptor compatibility; construct native functions; mount hosts;
access live values; or publish observation.

#### Scenario: A complete cold process is compiled

- **WHEN** the real compiler receives an agreeing real `Entrypoint` and complete
  normalized graph
- **THEN** it synchronously returns exactly `{ plan, references,
  observationSeed }`, with plan and seed conforming to the closed §16 TypeBox
  DTOs and references conforming to the exact private table contract
- **AND** the plan contains the exact selected lane tuple and harness ids,
  contains only the transitive closure rooted in the selected process roles,
  excludes valid facts owned solely by other app roles, preserves explicit
  empty collections, and contains neither `observationSeed` nor `findings`
- **AND** no authored executable or downstream lifecycle work occurs

#### Scenario: Reference-table snapshots are stable and cold

- **WHEN** provider and service reference entries are read repeatedly
- **THEN** `providerEntries()` and `serviceEntries()` each return their same
  referentially stable, canonically sorted frozen snapshot
- **AND** the referenced definitions retain exact identity without copying or
  invocation

#### Scenario: Invalid compiler input is refused without a diagnostic result

- **WHEN** the entrypoint and graph disagree or the normalized graph contains a
  dangling/mismatched reference, incomplete dependency closure, cycle,
  duplicate, unsupported identity/reference, or invalid closed DTO shape
- **THEN** `compileRuntimePlan(...)` throws built-in `TypeError` before returning
  any part of `RuntimeCompilationResult`
- **AND** there is no compiler finding or diagnostic output and no provisioning,
  execution, mounting, observation publication, or external mutation begins

#### Scenario: Real derivation hands off without its authoring bindings

- **WHEN** the real derivation producer consumes the exact selected `Entrypoint`,
  emits the complete normalized graph, and its producer-local authoring bindings
  become unavailable
- **THEN** the real compiler completes from that entrypoint and graph alone
- **AND** it receives no derivation result, non-portable table, or portable
  artifact and invokes no authored executable

### Requirement: Provider-effect-plan authority is closed before source activation

Task 6.0 MUST remain a completed documentation-only authority correction across
exactly nine documents: `HABITAT_ARCHITECTURE.md` as router;
`HABITAT_RUNTIME_REALIZATION.md` §13.4 and its directly affected §§17, 25,
and 27 as the sole exact mechanics owner;
`packages/core/runtime/definition/AGENTS.md` as owner router; and the six active
OpenSpec artifacts. This requirement and its scenarios MUST remain the sole
archive-safe acceptance owner. The other OpenSpec artifacts MUST route or
record the decision without copying the canonical TypeScript blocks. Task 6.0
MUST change no `.habitat` file, SDK documentation, implementation, source,
test, project, blueprint, package/public output, runtime behavior, or other
OpenSpec file. Task 6.1 MUST be the sole next source node.

Task 6.1 MUST preserve `runtime-definition@1` byte-for-byte, create only
`.habitat/blueprints/runtime-definition/versions/2/blueprint.toml` and
`structure.toml`, and select independently resolvable version 2 in the existing
definition `habitat.toml`. Version 2 MUST admit the exact flat successor
closure: the existing eight shell entries; exactly eleven source files, the
existing ten plus `provider-effect-plan.ts`; and exactly three proof files,
`definition.test.ts`, `provider-effect-plan.test.ts`, and `nx-cache.test.ts`.
It MUST add no version-specific skill, Grit rule, inheritance, fallback,
optional interior, version 3, kind, project, package, or nested `src/providers`
directory.

The exact task-6.1 implementation/behavior corpus MUST be eight files:
definition `src/provider.ts`, `src/provider-effect-plan.ts`, `src/resource.ts`,
`src/index.ts`, `test/definition.test.ts`, and
`test/provider-effect-plan.test.ts`; derivation
`test/complete-derivation.test.ts`; and compiler
`test/compile-runtime-plan.test.ts`. The exact separate 17-file
publication/assembly corpus MUST be `.gitattributes`;
`.habitat/AUTHORITY.md`; `.habitat/AUTHORITY-ONTOLOGY.md`;
`.habitat/README.md`; the two exact version-2 blueprint files;
`packages/core/runtime/definition/AGENTS.md`;
`packages/core/runtime/definition/habitat.toml`; SDK
`src/runtime/providers/index.ts`; SDK `src/runtime/providers/effect/index.ts`;
SDK `AGENTS.md`; SDK `README.md`; SDK `habitat-pack.json`; SDK `package.json`;
SDK `tsdown.config.ts`; SDK `test/runtime-authoring-public-faces.test.ts`; and
`apps/habitat/test/installed-package.test.ts`. Their union MUST impose a
25-file task diff ceiling.

Publication MUST grow the sorted SDK policy pack from 14 to 15 members by
adding `runtime-definition@2`, keep copied/input blueprint directories exactly
10, grow JavaScript build specifiers from 17 to 18, and grow runtime authoring
subpaths from 8 to 9. `@habitat-ai/sdk/runtime/providers` MUST expose only value
`defineRuntimeProvider` and types `ProviderBuildContext`, `RuntimeProvider`,
`RuntimeProviderHealthDescriptor`, and `RuntimeResourceMap`.
`@habitat-ai/sdk/runtime/providers/effect` MUST expose only value `providerFx`
and types `ProviderAcquire`, `ProviderEffectPlan`, `ProviderFx`,
`ProviderFxFacade`, and `ProviderRelease`. Neither face may expose raw Effect,
Exit, Scope, Layer, ManagedRuntime, `ProviderScope`, a terminal runner, private
plan witness/accessor, or alternate plan constructor.

Task 6.1 MUST evolve the existing provider root and add only the provider Effect
subpath; it MUST NOT classify both paths as new faces. It MUST exclude
definition `project.json` and `tsdown.config.ts`,
`.habitat/index.json`, root manifests, the lockfile, root Nx configuration,
product-separation acceptance, and every other SDK face. TypeScript MUST own
the full const-input/readonly `requireResource(...)` result, map-overload
optionality, ProviderFx/error inference, required never-release, no-Promise
contracts, and nominal anti-forgery through both a positive real-plan assignment
and negative structural-lookalike assignment. Owner behavior tests MUST own
cold no-callback construction, exact enumerability and descriptor flags,
metadata/witness freezing, opaque body identity, private-accessor
forged-witness rejection, and zero-build behavior. Habitat and Nx MUST own
successor structure/application and unchanged edge/cache behavior. SDK and
installed-package proof MUST own exact value/type inventories, counts, pack
parity/provenance, and cold imports. Runtime source-string or AST inspection
MUST NOT count as proof.

#### Scenario: The authority-only gate closes without implementation

- **WHEN** task 6.0 is reviewed as a complete change
- **THEN** exactly the two canonical documents, runtime-definition router, and
  six active OpenSpec artifacts contain the authority correction
- **AND** no implementation, `.habitat`, SDK documentation, package/public
  output, or runtime behavior changes
- **AND** task 6.1 becomes the sole next source node

#### Scenario: Version 2 resolves, applies, and packs independently

- **WHEN** the root selector, local Habitat evaluator, SDK policy pack, and
  installed consumer resolve `runtime-definition@2`
- **THEN** the exact two-file successor resolves and applies as the complete
  eight-shell, eleven-source, three-proof closure with packed byte parity and
  provenance
- **AND** `runtime-definition@1` remains byte-identical and independently
  resolvable with no inheritance, fallback, version 3, skill, or Grit source law
- **AND** the pack and build/subpath/directory counts are exactly 15, 18, 9,
  and 10 respectively

#### Scenario: The existing provider root and new Effect subpath are exact

- **WHEN** source and installed-package consumers import the provider root and
  provider Effect subpath
- **THEN** each runtime value and type-only inventory is exactly the declared
  finite set and preserves identity with its definition-owned implementation
- **AND** the private witness/accessor and every raw runtime primitive, runner,
  alternate constructor, and other SDK face remain absent

#### Scenario: The implementation and proof corpora stay closed

- **WHEN** task 6.1 implementation, publication, and proof are reviewed
- **THEN** its diff contains no file outside the exact eight-file behavior and
  17-file publication corpora
- **AND** each TypeScript, behavior, Habitat/Nx, SDK, and installed-package claim
  is proven by its allocated owner without source-string or AST inspection

### Requirement: Provider plans are cold definition-owned Effect values

`ProviderEffectPlan` MUST remain operational interior of the existing private,
package-less `runtime-definition` owner rather than a Habitat kind, project,
package, bootgraph artifact, or new phase. A `ProviderFx<TValue, TError>` MUST
be the exact curated `HabitatEffect<TValue, TError, never>` value, not a thunk,
Promise, acquired value, raw Effect, or terminal result. Acquire MUST preserve
typed `TError`. Release MUST be required, receive only the acquired value, and
return `ProviderFx<void, never>`. The `providerFx` facade MUST contain exactly
the enumerable keys `succeed`, `tryPromise`, and `acquireRelease` and MUST be
frozen.

The `RuntimeProvider` interface MUST add its acquire-error generic and required synchronous
`build(...)` while retaining erasure-friendly default config and acquire-error
generics of `unknown` and `unknown`. Only `defineRuntimeProvider(...)` helper
inference MUST default schema-free config to `undefined` and acquire error to
`never`. `ProviderBuildContext` MUST contain exactly already-decoded
`config`, declared-dependency `resources`, and the definition-owned
`observation` port, with no lifecycle scope or telemetry client.
Task 6.1 MUST define only the `RuntimeResourceMap` TypeScript contract with
`has(requirement)` and three exact `get(requirement)` overload outcomes. It MUST
create no concrete instance or factory. `requireResource(...)` MUST preserve
its entire const input type and readonly shape so exact `optional: true`, exact
false, absence, and widened `boolean | undefined` remain visible to the map
overloads. Exact true returns `TValue | undefined`; exact false or absence
returns `TValue`; widened optionality remains safely `TValue | undefined`.

A plan MUST expose exactly enumerable `kind`, `acquire`, and `release` keys.
Its acquire and release records MUST each expose exactly enumerable `boundary`,
`policy`, and `telemetry` keys with the corresponding canonical boundary.
Absent optional metadata MUST retain the `policy` and `telemetry` keys with
`undefined` values; the optional metadata inputs MUST themselves admit only
acquire and release members.
Construction MUST fresh-copy and recursively freeze the plan, boundary records,
policy metadata, telemetry metadata, and private witness container. It MUST
preserve the opaque acquire Effect and release callback by exact identity and
MUST NOT traverse, copy, freeze, or invoke either body. A private
symbol witness MUST retain those exact bodies through a non-enumerable,
non-writable, non-configurable property; its symbol/accessor MUST remain limited
to definition assembly and the future Effect substrate and MUST NOT be exported
by the SDK. Provider plan, build-context, resource-map, and facade contracts
MUST remain TypeScript operational contracts with no fake structural schema,
decoder, or serialized form.

Task 6.1 MUST prove only cold construction and boundary admission. Constructing
`ProviderFx`, `ProviderEffectPlan`, or a provider declaration, and passing the
provider through derivation or compilation, MUST invoke no `tryPromise` callback,
release callback, provider build, or other authored body. The private accessor
MUST accept a genuine nominal plan and reject a forged structural lookalike.
ManagedRuntime construction MUST remain task 7.1. Executing `tryPromise`, live
failure classification, real beta.101
`Effect.acquireRelease(acquire, release)` construction/use, and registration
immediately after successful acquire MUST remain task 7.2.
Cleanup observation, rollback, reverse continuation, inert repeated
disposal/release, and runtime close MUST remain task 7.3. Qualified-provider
live lifecycle conformance MUST remain task 7.4. Compiler and bootgraph MUST
carry no provider plan or acquire/release body.

#### Scenario: Plan construction is exact, frozen, and cold

- **WHEN** an author combines one acquire `ProviderFx` and required release
  callback through `providerFx.acquireRelease(...)`
- **THEN** construction invokes neither body and returns a plan whose enumerable
  keys are exactly `kind`, `acquire`, and `release`
- **AND** each public phase record has exactly `boundary`, `policy`, and
  `telemetry` enumerable keys, including explicit undefined metadata, with
  recursively frozen fresh metadata containers
- **AND** the frozen three-operation facade is exact, while the private
  non-enumerable, non-writable, non-configurable witness retains the exact
  opaque Effect and callback references without copying, traversing, or
  freezing them
- **AND** the private accessor accepts the genuine plan and rejects a forged
  structural lookalike without invoking either body

#### Scenario: Acquire and required release inference stays curated

- **WHEN** a typed acquire Effect and its release callback are authored through
  the three-operation provider facade
- **THEN** the plan preserves inferred acquired value and acquire error types,
  while provider Effect requirements remain exactly `never`
- **AND** erasure-friendly `RuntimeProvider` remains defaulted to unknown config
  and acquire error, while only `defineRuntimeProvider(...)` helper inference
  defaults schema-free config to `undefined` and acquire error to `never`
- **AND** release receives only that value and must return
  `ProviderFx<void, never>`
- **AND** a thunk, Promise, raw value, optional release, fallible release Effect,
  or provider Effect with requirements fails TypeScript admission
- **AND** a genuine plan satisfies nominal `ProviderEffectPlan` while a
  structural lookalike fails TypeScript assignment

#### Scenario: Requirement and map typing preserve optionality

- **WHEN** `requireResource(...)` receives exact true, exact false, absent, and
  widened optionality inputs
- **THEN** each result preserves its entire const input type and readonly shape
- **AND** the `RuntimeResourceMap.get(...)` contract returns optional, required,
  required, and safely optional value types respectively
- **AND** task 6.1 constructs no map instance or public/private map factory

#### Scenario: Earlier cold phases never build a provider

- **WHEN** real derivation and compilation process an entrypoint containing a
  provider whose `build(...)` is instrumented
- **THEN** both phases complete with zero build calls
- **AND** neither the compiler result nor bootgraph ordering records carry a
  provider plan or acquire/release body

### Requirement: Runtime bootgraph authority and delivery stay closed

Completed task 6.1a MUST remain a documentation-only authority correction
across exactly eight documents: `HABITAT_ARCHITECTURE.md` as the ownership
router; `HABITAT_RUNTIME_REALIZATION.md` §17 as the sole exact TypeScript, DTO,
ordering, refusal, freezing, project/blueprint closure, corpus, topology, and
task-mechanics authority; and these six active OpenSpec artifacts. This
requirement and its scenarios MUST remain the sole archive-safe acceptance
owner. The other five OpenSpec artifacts MUST route or record the decision
without copying the canonical TypeScript block. Task 6.1a MUST change no
implementation, source, test, project, blueprint, `.habitat` record,
package/public output, SDK edge, runtime behavior, or other OpenSpec file. Task
6.2 is sealed by its exact historical receipt and MUST NOT be reopened or
rewritten. Task 6.2a MUST be the sole next documentation-only authority node.

Task 6.2a MUST correct Proxy admission across exactly eight documents:
`HABITAT_ARCHITECTURE.md` as the ownership router;
`HABITAT_RUNTIME_REALIZATION.md` §17 as the sole exact mechanics owner; and this
change's `proposal.md`, `design.md`, `authority-amendment.md`, `tasks.md`,
`execution-queue.md`, and `specs/app-runtime-realization/spec.md`. This
requirement and its scenarios MUST remain the sole archive-safe acceptance
owner. The other five OpenSpec artifacts MUST route or record the correction
without copying the canonical TypeScript block. Task 6.2a MUST change no
implementation, source, test, project, blueprint, `.habitat` record, config,
package/public output, SDK edge, runtime behavior, or other OpenSpec file. Task
6.2a.1 MUST now be the sole active documentation-only correction. After it
lands, task 6.2b MUST resume as the exact same three-file source-bearing repair
node, and only after 6.2b lands MUST unchanged one-file task 6.3 resume.

Task 6.2a.1 MUST correct runtime-bootgraph build-config authority across exactly
the same eight documents as task 6.2a. It MUST preserve the sealed task-6.2 and
task-6.2a entries and receipts verbatim and MUST change no implementation,
source, test, project, blueprint, `.habitat` record, config, package/public
output, SDK face or edge, platform, runtime behavior, or other OpenSpec file.
`HABITAT_RUNTIME_REALIZATION.md` §17 MUST remain the sole exact mechanics owner;
this requirement and its scenarios MUST remain the sole archive-safe acceptance
owner. No ninth document, classification-ledger change, `.habitat` record,
public or SDK work, platform/edge change, or task-7 work is admitted.

Task 6.2 MUST create the complete private package-less
`runtime-bootgraph@1` owner at `packages/core/runtime/bootgraph` and MUST
implement the complete synchronous `orderBootgraph(...)` operation in that
same node. The owner MUST consume only compiler-owned `BootgraphInput`; it MUST
accept no compiled plan, compilation result, reference table, observation seed,
definition/derivation input, or second ordering carrier. Its exact project
closure MUST be eight root entries (`AGENTS.md`, `habitat.toml`, `project.json`,
`src`, `test`, `tsconfig.json`, `tsconfig.test.json`, and
`tsdown.config.ts`), exactly four source files, exactly two tests, and exactly
three blueprint files, and `src/index.ts` MUST be the sole private assembly
interface. The positive closed `runtime-bootgraph@1` MUST have no
optional interior, `versions/`, second version, inheritance, Grit rule,
`package.json`, extra source/test file, or alternate assembly interface.

The exact task-6.2 implementation/proof corpus MUST be eight files:
`packages/core/runtime/bootgraph/src/bootgraph.ts`;
`packages/core/runtime/bootgraph/src/boot-resource-key.ts`;
`packages/core/runtime/bootgraph/src/boot-resource-module.ts`;
`packages/core/runtime/bootgraph/src/index.ts`;
`packages/core/runtime/bootgraph/test/bootgraph.test.ts`;
`packages/core/runtime/bootgraph/test/nx-cache.test.ts`;
`packages/core/runtime/bootgraph/tsconfig.json`; and
`packages/core/runtime/bootgraph/tsconfig.test.json`. Its exact separate
18-file publication/assembly corpus MUST be `.gitattributes`;
`.habitat/AUTHORITY.md`; `.habitat/AUTHORITY-ONTOLOGY.md`;
`.habitat/README.md`;
`.habitat/blueprints/runtime-bootgraph/blueprint.toml`;
`.habitat/blueprints/runtime-bootgraph/skill.md`;
`.habitat/blueprints/runtime-bootgraph/structure.toml`;
`apps/habitat/test/installed-package.test.ts`; `packages/core/AGENTS.md`;
`packages/core/runtime/bootgraph/AGENTS.md`;
`packages/core/runtime/bootgraph/habitat.toml`;
`packages/core/runtime/bootgraph/project.json`;
`packages/core/runtime/bootgraph/tsdown.config.ts`;
`packages/core/sdk/AGENTS.md`; `packages/core/sdk/README.md`;
`packages/core/sdk/habitat-pack.json`; `packages/core/sdk/project.json`; and
`packages/core/sdk/tsdown.config.ts`. Their union MUST impose an exact 26-file
task ceiling.

Task 6.2's baseline `bootgraph.test.ts` MUST prove one nontrivial dependency
graph's exact ordering, output shape, closed-schema admission, and key-reference
reuse, plus one representative malformed-input generic `TypeError`. This paired
positive/negative baseline MUST prevent an empty or constant stub from
satisfying the complete source node.

Task 6.2b MUST repair Proxy admission in exactly
`packages/core/runtime/bootgraph/src/bootgraph.ts`,
`packages/core/runtime/bootgraph/test/bootgraph.test.ts`, and
`packages/core/runtime/bootgraph/tsdown.config.ts`. The source MUST use exact
`isProxy` from `node:util/types`, which remains the emitted subpath specifier.
Pinned tsdown 0.22.14's neutral-platform `onlyImport` audit MUST instead admit
the Node package root: the config MUST add `node:util` exactly once immediately
after retained `node:crypto`, MUST never contain literal `node:util/types`, and
MUST yield exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "node:util", "typebox"]`
while retaining `platform: "neutral"` and every other option. No fourth
file, other new dependency or project edge, public/SDK surface, package
identity, project, blueprint, version, target, finding, diagnostic, unwrap, or
task-7 behavior is admitted.

Neither the input shell nor any nested input record or array MAY be a Proxy.
For every candidate container, active and revoked Proxy detection and refusal
MUST occur before `Array.isArray`, property access or lookup, reflection, schema
validation, or any other operation that the caller can make trap. An ordinary
container whose prototype is a Proxy MUST also refuse before any prototype trap
or inherited lookup. Nested candidates MUST be obtained only from already
admitted own data-descriptor values, never through property access. The
implementation MUST NOT unwrap a Proxy. Every such case MUST synchronously
throw built-in `TypeError` before result with zero proxy traps, getters,
callbacks, or external work.

Task 6.2b behavior proof MUST use real active-Proxy, revoked-Proxy, accessor, and
proxied-prototype canaries and MUST prove a valid input still returns one
synchronous exact closed output. Topology and TypeScript MUST own the
non-injectable provider/config/Effect/observation boundary. A default counter
that cannot be reached or incremented by the operation is tautological and MUST
NOT be used as zero-work evidence. The task MUST retain the exact 8/4/2/3 owner
closure, sole real `runtime-bootgraph -> runtime-compiler` edge, task-6.2
publication and pack counts, neutral build and all unrelated tsdown options,
and absence of a public/SDK face and task-7 behavior. It MUST stop rather than
widen if these guarantees require another file, dependency, edge, platform,
public surface, or weaker task-6.2 invariant.

For each accepted compiler node, `orderBootgraph(...)` MUST produce one
selection-id-backed resource key with the canonical kind plus `selectionId`,
`resourceId`, `lifetime`, and only the applicable optional `role` and
`instance`, never a requirement owner or `instanceKey`; its module MUST retain
that key, provider identity, and dependency keys. A dependency edge from one
selection to another MUST mean dependent to dependency, so the target precedes
the source.
Ordering MUST use Kahn's algorithm and ascending ECMAScript code-unit
`selectionId` as the sole ready-node tie-break. `modules` and `order` MUST be
acquisition order; `rollbackOrder` and `releaseOrder` MUST each be its exact
reverse. Repeated dependency targets for one module MUST deduplicate by target
selection and sort by `selectionId`, while a duplicate exact
`(fromSelectionId, requirementId, toSelectionId)` edge MUST refuse. Exactly one
fresh key object MUST be created
per node and that same frozen object MUST be reused by exact reference as its
module key, every dependency occurrence, and every forward and reverse order
entry.

Proxy-bearing or proxied-prototype input, malformed or surplus input, duplicate
`selectionId`, duplicate exact lifecycle
resource identity tuple `(resourceId, lifetime, role-or-empty,
instance-or-empty)`, duplicate exact edge, dangling source or target,
self-cycle, and multi-node cycle MUST be separate caller-reachable refusals that
throw built-in `TypeError` before any result. Error text, validation order, and
selected cycle path MUST remain noncontractual. Independently, before return,
the implementation MUST validate every produced artifact against the closed
output schema and the exact module/order/reverse/reference relations. Internal
output or schema disagreement MUST throw built-in `TypeError` as a defensive
pre-return invariant, but MUST NOT be treated as a caller-reachable refusal or
require a fabricated test input. Every accepted output object and collection
MUST be a fresh recursive copy and recursively frozen. Input MUST be neither
mutated nor newly frozen; its preexisting frozen state, property descriptors,
and reference identities MUST remain unchanged. The operation MUST perform no
provider build, config/source resolution or decode, Effect
construction/execution, acquisition, release, finalizer registration,
observation, callback, or other external work. It MUST return no finding,
diagnostic, partial result, provider reference, decoder/redaction metadata,
provider plan or acquire/release body, private witness or live value, and it
MUST gain no public API projection.

Task 6.2 MUST establish only `runtime-bootgraph -> runtime-compiler`, through a
real relative compiler import and matching tsconfig reference, with no
`implicitDependencies`. The exact LF rule for
`.habitat/blueprints/runtime-bootgraph/**` MUST land. Nx projects MUST grow 26
to 27. The sorted protocol-1 SDK pack MUST grow 15 to 16 members by inserting
`runtime-bootgraph@1` before
`runtime-compiler@1`; copied/input blueprint directories MUST grow 10 to 11;
SDK build inputs MUST grow 13 to 14. SDK JavaScript entries MUST remain 18,
package exports MUST remain 21, and SDK release membership MUST remain
unchanged. These SDK changes MUST be policy-asset carriage only and MUST create
no SDK source/build edge, source entry, bootgraph public face, package export,
or private-owner release member. The owner MUST explicitly define only
`typecheck`, `test`, `build`, and `check`; `check:policy` and
`habitat:application:runtime-bootgraph:runtime_bootgraph_v1_structure` MUST be
inferred. It MUST define no explicit acceptance, verify, aggregate, or nested
scheduler target. Installed-package acceptance MUST prove pack parity, the
exact fixture instance, resolution and application provenance, structure, and
restoration; `nx-cache.test.ts` MUST remain the sole unchanged-cache restoration
and relevant-input invalidation proof.

Task 6.3 MUST be proof-only and MUST expand only the existing
`packages/core/runtime/bootgraph/test/bootgraph.test.ts`. It MUST validate every
successful output against the closed schema and exact
module/order/reverse/reference relations. It MUST prove the complete
permutation, tie-break, dedupe, exact-identity reuse, output freeze/input-state
preservation, empty/disconnected, absent-finding, and zero-work matrix, and MUST
exhaustively prove every caller-reachable malformed/surplus,
duplicate-`selectionId`, duplicate exact lifecycle resource identity tuple,
duplicate exact edge, dangling source/target, self-cycle, and multi-node-cycle
refusal. It MUST NOT fabricate a caller-reachable internal output/schema
disagreement case; that remains the implementation's defensive pre-return
invariant. It MUST change no source, project, blueprint, pack, SDK/public
surface, or `nx-cache.test.ts`. Its cumulative predecessor-absence proof MUST
retain the absence of `packages/bootgraph` and `BOOTGRAPH_RESERVATION`, any Nx
`@rawr/bootgraph` identity, the old root/package identity from root workspaces
and parsed `bun.lock`, and any `package.json` in the fresh owner, while proving
the exact new project identity, root, and sole edge. It MUST NOT edit
`scripts/habitat/product-separation-absence.test.ts` or use runtime source-string
or AST assertions.

Task 6.2 MUST explicitly exclude `packages/core/sdk/package.json`, every SDK
source/public face and public-face test, `.habitat/index.json`, root manifests,
the lockfile, root Nx configuration, product-separation acceptance, every file
outside the exact 26-file corpus, another project/blueprint/version/target,
package/public identity, early SDK edge/export, finding API, provider body,
config/decode work, acquisition/release/finalizer behavior, Effect execution,
observation, and every task-7 behavior. Task 10.6 alone MUST establish the real
`@habitat-ai/sdk -> runtime-bootgraph` edge when terminal `startApp(...)`
composition imports and calls `orderBootgraph(...)` beside its real compiler
call.

#### Scenario: The authority correction remains documentation-only

- **WHEN** completed task 6.1a is reviewed after archive
- **THEN** only the two canonical system documents and six active OpenSpec
  artifacts comprise its exact authority surface
- **AND** runtime realization §17 remains the sole exact TypeScript/mechanics
  owner while this requirement remains the sole archive-safe acceptance owner
- **AND** no canonical TypeScript block or implementation change appears in the
  OpenSpec routing artifacts

#### Scenario: Proxy admission authority remains documentation-only

- **WHEN** task 6.2a is reviewed before implementation
- **THEN** only the two canonical system documents and these six active OpenSpec
  artifacts comprise its exact eight-document authority corpus
- **AND** runtime realization §17 remains the sole exact mechanics owner while
  this requirement and its scenarios remain the sole archive-safe acceptance
  owner
- **AND** the sealed task-6.2 receipt is unchanged and no implementation,
  source, test, project, blueprint, `.habitat` record, config, public/SDK output,
  runtime behavior, or other OpenSpec file changes

#### Scenario: Build-config authority correction remains documentation-only

- **WHEN** pending task 6.2a.1 is reviewed before the repair resumes
- **THEN** only the same two canonical system documents and six active OpenSpec
  artifacts used by task 6.2a comprise its exact eight-document authority corpus
- **AND** runtime realization §17 remains the sole exact mechanics owner while
  this requirement and its scenarios remain the sole archive-safe acceptance
  owner
- **AND** the sealed task-6.2 and task-6.2a entries and receipts remain verbatim,
  no ninth document or classification ledger changes, and no implementation,
  source, test, project, blueprint, `.habitat` record, config, public/SDK output,
  platform, edge, runtime behavior, task-7 work, or other OpenSpec file changes

#### Scenario: Active Proxy input refuses without observation

- **WHEN** the input shell or any nested input record or array is a real active
  Proxy whose traps are instrumented
- **THEN** exact `isProxy` detects and refuses it with built-in `TypeError`
  before `Array.isArray`, property access or lookup, reflection, schema
  validation, result, or any other caller-trapping operation on that candidate
- **AND** no proxy trap, getter, callback, provider/config/Effect/observation
  path, or external work runs and no Proxy is unwrapped

#### Scenario: Revoked Proxy input refuses without observation

- **WHEN** the input shell or any nested input record or array is a real revoked
  Proxy
- **THEN** exact `isProxy` detects and refuses it with built-in `TypeError`
  before any operation that could consult the revoked target or handler
- **AND** refusal is synchronous and occurs before result, getter, callback, or
  external work without unwrapping the Proxy

#### Scenario: A proxied prototype cannot become an inherited input channel

- **WHEN** an otherwise ordinary input shell, nested record, or array has a real
  instrumented Proxy as its prototype
- **THEN** `orderBootgraph(...)` throws built-in `TypeError` before inherited
  lookup, any prototype trap, schema validation, or result
- **AND** all trap, getter, callback, and external-work canaries remain at zero

#### Scenario: The bounded repair preserves exact successful behavior

- **WHEN** task 6.2b applies the Proxy-admission repair
- **THEN** only existing `src/bootgraph.ts`, `test/bootgraph.test.ts`, and
  `tsdown.config.ts` change; source imports and emits `node:util/types`, while
  retained neutral-platform `deps.onlyImport` contains package root `node:util`
  exactly once immediately after `node:crypto` and never literal
  `node:util/types`
- **AND** its exact final array is
  `["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "node:util", "typebox"]`
- **AND** the actual owner build under pinned tsdown 0.22.14 accepts the emitted
  subpath through that package-root allowance, while unchanged
  `nx-cache.test.ts` proves cache restoration and relevant-input invalidation
- **AND** a valid input returns synchronously as a non-Promise with the exact
  closed-schema-valid output unchanged in shape, while real Proxy,
  revoked-Proxy, accessor, and proxied-prototype canaries prove the refusal
  boundary
- **AND** topology and TypeScript, not a tautological default-zero counter, prove
  provider/config/Effect/observation work is non-injectable
- **AND** the 8/4/2/3 closure, sole compiler edge, publication counts, absent
  public/SDK face, task-7 exclusions, and all other task-6.2 invariants remain
  unchanged

#### Scenario: Repair widening stops the task

- **WHEN** Proxy refusal would require a fourth file, another dependency or
  edge, a platform or unrelated tsdown-option change, a public/SDK surface, an
  unwrap path, task-7 behavior, or a weaker task-6.2 invariant
- **THEN** task 6.2b stops without widening or partially landing
- **AND** task 6.3 does not begin until the exact three-file repair is complete

#### Scenario: The complete owner lands with policy assets but no public face

- **WHEN** task 6.2 creates and implements `runtime-bootgraph@1`
- **THEN** its exact 26-file corpus, 8/4/2/3 closure, sole real compiler edge,
  explicit four targets, inferred policy/application, and 27-project graph are
  present together
- **AND** pack, blueprint-directory, and SDK-input counts become 16, 11, and 14
  while JavaScript entries and exports remain 18 and 21
- **AND** installed proof establishes parity, fixture resolution, provenance,
  application, structure, and restoration without an SDK bootgraph source face

#### Scenario: The complete source node cannot pass as a stub

- **WHEN** task 6.2 runs its baseline `bootgraph.test.ts`
- **THEN** one nontrivial dependency graph proves exact ordering, output shape,
  closed-schema admission, and exact key-reference reuse
- **AND** one representative malformed input throws generic built-in `TypeError`
  before result or external work

#### Scenario: Bootgraph ordering is deterministic, referential, and cold

- **WHEN** equivalent compiler-owned inputs differ only in node/edge authoring
  order and contain shared dependency targets
- **THEN** both produce deeply equal Kahn acquisition order with
  `selectionId` tie-breaking, deduplicated target dependencies, and exact
  reverse rollback/release order
- **AND** each node's one fresh frozen key is reused by exact reference at every
  output occurrence while the input is neither mutated nor newly frozen and its
  preexisting frozen state, property descriptors, and reference identities are
  preserved
- **AND** no finding, provider/config/Effect/observation work, plan body, or live
  value is produced

#### Scenario: Caller-reachable invalid ordering input refuses before result

- **WHEN** input is malformed or surplus, duplicates a `selectionId`, duplicates
  the exact lifecycle resource identity tuple, duplicates an exact edge triple,
  dangles either endpoint, or contains a self/multi-node cycle
- **THEN** `orderBootgraph(...)` throws built-in `TypeError` before returning any
  artifact or performing external work
- **AND** no diagnostic, finding, partial result, or prescribed error text/order
  is introduced

#### Scenario: Defensive output agreement is checked before return

- **WHEN** `orderBootgraph(...)` has constructed a candidate successful artifact
- **THEN** it validates that artifact against the closed output schema and exact
  module/order/reverse/reference relations before returning it
- **AND** internal disagreement throws built-in `TypeError` as a defensive
  invariant rather than a caller-reachable refusal fixture

#### Scenario: Adversarial proof remains one existing test file

- **WHEN** task 6.3 expands bootgraph proof after the complete source node lands
- **THEN** only the existing `bootgraph.test.ts` changes and every task-6.2
  source, project, blueprint, pack, public, and cache file remains unchanged
- **AND** every successful output is validated against the schema and exact
  output relations while every caller-reachable input refusal is exhausted
- **AND** no caller-reachable internal output-disagreement case is fabricated
- **AND** cumulative old-root/package/reservation absence is proven there while
  the frozen product-separation test remains untouched

#### Scenario: Terminal composition creates the first SDK bootgraph edge

- **WHEN** task 10.6's terminal SDK `startApp(...)` composition really imports
  and calls both compilation and bootgraph ordering
- **THEN** the SDK gains direct compiler and bootgraph edges from those real
  source calls
- **AND** blueprint asset carriage, publication metadata, an inert import,
  `implicitDependencies`, and transitive process-runtime reachability cannot
  substitute

### Requirement: Semantic-ledger authority is closed before source activation

Task 6.3a MUST be the sole active documentation-only node after sealed task
6.3. It MUST change exactly `design.md`, `authority-amendment.md`, `tasks.md`,
`execution-queue.md`, `classification-ledger.md`, and this specification. It
MUST preserve every historical entry and receipt verbatim and MUST change no
seventh file, proposal, stack cut sheet, canonical/system document, owner
router, implementation, source, test, project, blueprint, `.habitat` record,
manifest, lockfile, SDK file, runtime behavior, stage, commit, or push. Task 6.4
MUST remain pending until this correction lands.

After task 6.3a is sealed, task 6.3b MUST be the sole active
documentation-only node. It MUST change exactly the same six OpenSpec artifacts
named above and no seventh file. It MUST preserve every task 6.3a sentence and
receipt verbatim and MUST change no proposal, stack cut sheet,
canonical/system document, owner router, executable, implementation, source,
test, project, blueprint, `.habitat` record, manifest, lockfile, SDK file,
runtime behavior, stage, commit, or push. Task 6.4 MUST remain pending until
task 6.3b lands. This specification remains the sole exact public API and
mechanics authority; `tasks.md` is only the routed execution summary, and no
other artifact may restate these exact mechanics as a second authority.

After task 6.3b is sealed, task 6.3c MUST be the sole active
documentation-only node. It MUST change exactly the same six OpenSpec artifacts
named above and no seventh file. It MUST preserve every task-6.3a and task-6.3b
sentence and receipt verbatim and MUST change no proposal, stack cut sheet,
canonical/system document, owner router, executable, implementation, source,
test, project, blueprint, `.habitat` record, manifest, lockfile, SDK file,
runtime behavior, stage, commit, or push. Task 6.4 MUST remain pending until
task 6.3c lands. This later clause supersedes only the preserved activation
state and the earlier claims of subject-wide merge collision, globally exact
positions after a general merge, durable lost-answer replay, and preserved
`fluree/server:4.1.4`-only execution compatibility. This
specification remains the sole exact mechanics and archive-safe acceptance
authority; the other five artifacts route or summarize it and MUST NOT define a
second contract.

Task 6.3c MUST remain the current documentation-only correction until sealed.
Task 6.3d is currently pending. After task 6.3c seals, its receipt MUST activate
task 6.3d rather than task 6.4, and task 6.3d MUST become the sole active
documentation/evidence-only qualification across exactly the same six OpenSpec
artifacts and no seventh file. It MUST change no source, test, publication,
project, proposal, stack cut sheet, canonical/system document, owner router,
manifest, lockfile, SDK file, runtime behavior, stage, commit, or push. Tasks 6.4
and 6.5 MUST remain pending behind task 6.3d.

The sole evidence admitted to task 6.4 MUST be commit
`77b6c38e8701b8ac9292ef5676385a5e6e096f2`, path
`resources/semantic-ledger/**`, exact subtree
`859b463650e7ad769a56d1b67f328e84584479ef`. It MUST be treated only as
behavior evidence. It MUST NOT be cherry-picked, merged, restacked, or treated
as implementation, topology, package, or public-interface authority.

Task 6.4 MUST create exactly two owners and no third project. The resource MUST
be rooted at `resources/semantic-ledger`, use Nx identity
`@habitat-ai/resource-semantic-ledger`, select existing `resource@2`, and define
runtime resource id `semantic-ledger` through value
`semanticLedgerResource`. Its nested Fluree HTTP provider MUST be rooted at
`resources/semantic-ledger/providers/fluree-http`, use Nx identity
`provider-semantic-ledger-fluree-http`, select existing `provider@1`, and define
provider id and `defaultConfigKey` `semantic-ledger.fluree-http` through value
`semanticLedgerFlureeHttpProvider`. It MUST add no kind, blueprint version,
package-shaped runtime owner, public memory provider, private-owner release
member, or `implicitDependencies` entry.

The exact six direct source relations MUST be resource to
`runtime-definition`; provider to resource, `runtime-definition`, and
`runtime-schema`; and SDK to resource and provider. The SDK MUST have no reverse
edge. The root workspace devDependency MUST add the separate ordinary
`habitat-workspace -> @habitat-ai/resource-semantic-ledger` relation. Projects
MUST grow 27 to 29 and typed Nx edges 49 to 56 across that relation plus the six
source relations, without a cycle.

This requirement is the sole exact public TypeScript/API authority for the
semantic-ledger slice. The other five task-6.3a OpenSpec artifacts MUST route
public shapes, signatures, callable values, and finite SDK inventories here
rather than define a second API. The exact public type contract is:

```ts
export type Term =
  | Readonly<{ kind: "var"; name: string }>
  | Readonly<{ kind: "iri"; value: string }>
  | Readonly<{ kind: "literal"; value: string }>;

export type GroundTerm = Extract<Term, Readonly<{ kind: "iri" | "literal" }>>;

export declare const term: Readonly<{
  readonly var: (name: string) => Readonly<{ kind: "var"; name: string }>;
  readonly iri: (value: string) => Readonly<{ kind: "iri"; value: string }>;
  readonly literal: (value: string) => Readonly<{ kind: "literal"; value: string }>;
}>;

export type GraphProperty = Readonly<{
  predicate: string;
  object: GroundTerm;
}>;

export type GraphNode = Readonly<{
  id: string;
  properties: readonly GraphProperty[];
}>;

export type TriplePattern = Readonly<{
  subject: Term;
  predicate: Term;
  object: Term;
}>;

export type SelectQuery = Readonly<{
  select: readonly string[];
  where: readonly TriplePattern[];
}>;

export type Binding = Readonly<Record<string, string>>;

export type LedgerHead = Readonly<{
  ledger: string;
  t: number;
}>;

export type GuardAbsence = Readonly<{
  subject: string;
  predicate: string;
}>;

export type WriteGuard =
  | Readonly<{ kind: "unconditional" }>
  | Readonly<{
      kind: "conditional";
      requires: readonly TriplePattern[];
      absent: readonly GuardAbsence[];
    }>;

export type WriteRefusal = "GuardUnmatched" | "AlreadyProposed";

export type LedgerApplied = Readonly<{
  applied: true;
  ledger: string;
  t: number;
  commit: string;
}>;

export type LedgerRefused = Readonly<{
  applied: false;
  ledger: string;
  t: number;
  reason: WriteRefusal;
}>;

export type LedgerReceipt = LedgerApplied | LedgerRefused;

export type LedgerMergeReceipt = Readonly<{
  ledger: string;
  t: number;
  copied: number;
  conflicts: number;
  fastForward: boolean;
}>;

export type LedgerMergePreview = Readonly<{
  from: string;
  into: string;
  ahead: number;
  behind: number;
  conflicts: number;
  fastForward: boolean;
  mergeable: boolean;
}>;

export type SemanticLedgerOperation =
  | "ensureLedger"
  | "head"
  | "propose"
  | "select"
  | "fork"
  | "merge"
  | "previewMerge"
  | "lines";

export type SemanticLedgerFailureReason =
  | "InvalidInput"
  | "LedgerMissing"
  | "TimeUnreached"
  | "TransportFailed"
  | "BackendFailed"
  | "MergeConflict";

export type SemanticLedgerFailure = Readonly<{
  _tag: "SemanticLedgerFailure";
  operation: SemanticLedgerOperation;
  reason: SemanticLedgerFailureReason;
  detail: string;
}>;

export interface SemanticLedger {
  readonly ensureLedger: (
    input: Readonly<{ ledger: string }>
  ) => HabitatEffect<LedgerHead, SemanticLedgerFailure, never>;
  readonly head: (
    input: Readonly<{ ledger: string }>
  ) => HabitatEffect<LedgerHead, SemanticLedgerFailure, never>;
  readonly propose: (
    input: Readonly<{
      ledger: string;
      identity: string;
      guard: WriteGuard;
      nodes: readonly GraphNode[];
    }>
  ) => HabitatEffect<LedgerReceipt, SemanticLedgerFailure, never>;
  readonly select: (
    input: Readonly<{ ledger: string; at?: number; query: SelectQuery }>
  ) => HabitatEffect<readonly Binding[], SemanticLedgerFailure, never>;
  readonly fork: (
    input: Readonly<{ from: string; to: string }>
  ) => HabitatEffect<LedgerHead, SemanticLedgerFailure, never>;
  readonly merge: (
    input: Readonly<{ from: string; into: string }>
  ) => HabitatEffect<LedgerMergeReceipt, SemanticLedgerFailure, never>;
  readonly previewMerge: (
    input: Readonly<{ from: string; into: string }>
  ) => HabitatEffect<LedgerMergePreview, SemanticLedgerFailure, never>;
  readonly lines: (
    input: Readonly<{ family: string }>
  ) => HabitatEffect<readonly LedgerHead[], SemanticLedgerFailure, never>;
}

export type FlureeHttpSemanticLedgerConfig = Readonly<{
  baseUrl: string;
  timeoutMilliseconds: number;
}>;

export type FlureeHttpSemanticLedgerAcquireFailure = Readonly<{
  _tag: "FlureeHttpSemanticLedgerAcquireFailure";
  reason: "FetchUnavailable";
}>;
```

The exact exported descriptor types are:

```ts
export declare const semanticLedgerResource: RuntimeResource<
  "semantic-ledger",
  SemanticLedger
>;

export declare const semanticLedgerFlureeHttpProvider: RuntimeProvider<
  typeof semanticLedgerResource,
  FlureeHttpSemanticLedgerConfig,
  FlureeHttpSemanticLedgerAcquireFailure
>;
```

`semanticLedgerResource` MUST be constructed with exact id
`"semantic-ledger"`, title `"Semantic ledger"`, purpose
`"Provides append-only temporal graph ledger operations."`, default lifetime
`"process"`, and the frozen ordered allowed-lifetime list `["process"]`
containing exactly one member. Its
`observationContributor` property MUST be absent. The descriptor MUST retain
the exact generic type shown above rather than widen either the id or resource
value.

`semanticLedgerFlureeHttpProvider` MUST be constructed with exact id and
title `"semantic-ledger.fluree-http"` and
`"Fluree HTTP semantic ledger"`. Its `provides` value MUST be the exact
`semanticLedgerResource` reference, its `requires` value MUST be a frozen empty
array, its `configSchema` MUST be the exact exported
`FlureeHttpSemanticLedgerConfigSchema` reference, and its
`defaultConfigKey` MUST be `"semantic-ledger.fluree-http"`. Its `health`
property MUST be absent. The descriptor MUST retain all three exact generic
arguments shown above.

The `term` value MUST be frozen, expose exactly the three callable keys shown,
and return the corresponding frozen variant. Every operation input MUST remain
an anonymous `Readonly` record and every public array MUST remain readonly.
Runtime DTO and failure records MUST contain exactly their listed fields;
notably, `LedgerRefused` has no `commit`, and
`FlureeHttpSemanticLedgerAcquireFailure` has no third field. No public failure
helper, classifier, port, named input DTO, constructor, or extra SDK symbol is
admitted.

Writes MUST remain append-only and positions monotonic. A proposal MUST carry
an explicit unconditional or conditional guard and one identity scoped to its
ledger line; the identity MUST be no more than 128 UTF-8 bytes. Guard evaluation
and write admission MUST be atomic under contention. An applied proposal MUST
return `LedgerApplied` with its commit identity. A guard mismatch or same
identity offered with different facts MUST write nothing and return
`LedgerRefused` with exact `WriteRefusal` `GuardUnmatched` or
`AlreadyProposed`; a refusal MUST be a successful operation result, not a
failure. Repeating the same line-scoped identity after an answer is lost MUST
recover the determinate first outcome rather than create a second write.

`select` MUST support an exact historical `at` position. `fork` MUST create an
independent line from source history. `previewMerge` MUST be nonmutating;
`merge` MUST fast-forward or preserve both noncolliding line deltas, and MUST
fail with `MergeConflict` without writes when both sides changed a colliding
subject. `lines` MUST report the family line heads. No delete, workstream
policy, or vendor strategy MUST enter the resource contract.

Within the immediately preceding merge paragraph, task 6.3c supersedes only the
subject-wide collision and globally exact post-merge-position claims.
Semantic-ledger facts have RDF triple-set semantics in the default graph. A
merge collision exists when both sides changed
the same logical `(subject, predicate)` slot after their merge base, regardless
of whether their resulting object sets are equal or different. A one-sided
same-slot change and changes to different predicates on the same subject are
noncolliding. The provider MUST
use Fluree's native `strategy: "abort"`; a conflicting slot MUST return
`MergeConflict` atomically with no write. The neutral memory fixture and the
private HTTP conformance seam MUST independently falsify subject-wide
collision by merging disjoint predicates on one subject and MUST prove
source-only and target-only same-slot changes plus bilateral equal-object and
differing-object refusal.

Merge accounting MUST follow commit ancestry rather than fact count, distinct
position count, or one stored fork point. `ahead` and `behind` are the counts of
source-only and target-only commits reachable after the common ancestor. A
fast-forward copies exactly the missing source commits, creates no synthetic
commit, sets the target head to the source head, and reports `copied === ahead`
and `fastForward: true`; an already-current target reports zero copied and also
creates no commit. A clean non-fast-forward merge imports every source-only
commit with its source-local `t`, creates exactly one target commit with both
pre-merge heads as parents at the target's pre-merge `t + 1`, reports that new
position even when a source-local position is greater, reports
`copied === ahead` without counting the merge commit, and reports
`fastForward: false`. Preview and receipt `conflicts` count
conflicting logical slots. Public `mergeable` MUST be exactly
`conflicts === 0`, never Fluree's weaker raw `mergeable` field. Repeated,
reverse, cousin, and nested merges MUST use the same ancestry law, including
factless merge commits.

Source-local positions therefore can overlap after a non-fast-forward merge.
Before such a merge, and outside its overlapped positions, `select({ at })`
addresses the exact reachable history at that position. At an overlapped
position after the merge, it intentionally evaluates the union of both
reachable chains through that position; the API makes no exact-commit-address
or single-chain promise there. Every public `t`, `at`, `ahead`, `behind`,
`copied`, `conflicts`, and decoded flake count MUST be a finite nonnegative safe
integer. Numeric strings, fractions, negative values, `NaN`, infinity, and
missing required numeric members MUST refuse through the typed failure channel.

Task 6.3c additionally supersedes every implication above that pinned official
`fluree/server:4.1.4` can realize this unrestricted neutral merge law. Exact
official refs `v4.1.4@07316fa440548247e8985215b8151965d2c72726`,
`v4.1.5@d767927dae550a6ecde8f15603ad9c195de60351`, and upstream
`main@a85e0368285575204d75227742ac9d8ee5d1f0a7` as observed on
2026-08-11 retain byte-identical relevant files: `fluree-db-api/src/merge.rs`
blob `ebd0341732d923726f8188efff76be7d992435d5`,
`fluree-db-api/src/merge_preview.rs` blob
`5092f20c09d778bc999f0d8499b3e7afdb1a0d14`,
`fluree-db-core/src/commit.rs` blob
`842b05315d5d1a6e8dbbe41ca7895f8411d9d279`, and
`fluree-db-novelty/src/delta.rs` blob
`1488a94d930d030b3e31e458d196ae5f69b890bc`. Their native preview/merge
delta, source-replay, and copy-chain walks use numeric `ancestor.t` cutoffs.
Once a general merge preserves source-local `t`, nested, cousin, reverse, and
repeated histories can omit reachable commits, miss conflicts, and lose facts.
No process- or acquisition-local epoch, preflight,
single-actor condition, sequence assumption, or degraded no-merge behavior MAY
narrow the public law. The existing 27-file task-6.4 work in progress is
inadmissible and task 6.4 source MUST remain closed.

Task 6.3d MUST select and pin exactly one immutable, reproducible,
wire-compatible Fluree artifact by upstream tag and commit plus OCI digest and
provenance. Its native preview `ahead`/`behind`, conflict delta, source replay,
and copy-chain traversal MUST terminate by ancestor CID or reachable-set
membership rather than numeric `t`. Source inspection and provenance alone MUST
NOT select the artifact. Before selection, task 6.3d MUST run disposable
live-image F1 and F2 against the exact OCI digest, record the immutable command,
image, and outcome evidence in the same six-document corpus, and observe every
required HEAD, ancestry, counter, abort, copy, and parent relation below. If no
such artifact exists or either live vector fails, task 6.3d MUST stop and
require a later owner decision between an explicit fail-closed no-merge
capability and redesign. It MUST NOT invent a local patch or deployment
promise. Before task 6.3d seals, no Fluree artifact is compatible with task
6.4. After it seals, its exact tag, commit, OCI digest, and provenance MUST be
task 6.4's sole Fluree compatibility target and supersede every preserved
historical `fluree/server:4.1.4`-only execution statement; the existing Node,
Effect, and TypeBox pins and zero-Fluree-npm-metadata law remain unchanged.

The task-6.3d qualification attempt is `STOPPED — NO_CANDIDATE; positive
qualification unsealed`. No Fluree artifact is selected, task 6.3d remains
unchecked and unsealed, and task 6.3e is the sole active owner-decision node.
Task 6.3e opens no source, selects no artifact, and does not check off task 6.3d.
Tasks 6.4 and 6.5 remain pending and closed until that decision seals and creates
deterministic successor work.

After this exact six-document negative-evidence change merges and its exact-main
Repository Ratchet passes, one immediate landing-provenance receipt MUST change
exactly `tasks.md` and `execution-queue.md` before any task-6.3e decision edit.
It MUST record the PR, final head, exact main/tree, and check outcomes; leave task
6.3d unchecked, stopped, and unsealed; reaffirm task 6.3e as the sole active
owner-decision node and tasks 6.4/6.5 as pending and closed; and neither select
an artifact nor modify the other four authority artifacts. This bookkeeping
receipt is not a task-6.3d seal or a new task node.

The official qualification universe MUST be complete and bounded within one
stable UTC observation window. `G` MUST contain every commit reachable from
every advertised canonical upstream head or tag in the canonical repository.
`I` MUST contain every runnable platform manifest resolved from the complete
official `registry-1.docker.io/fluree/server` tag inventory, including every
index child and directly runnable single-platform manifest. `U` MUST contain
exactly the tuples `(upstream tag, peeled commit, OCI index digest, runnable
platform manifest digest)` for which image provenance binds the canonical
repository to that exact upstream tag and commit, the upstream tag peels to that
commit, and the official Docker Hub manifest-by-digest API returned each exact
index and runnable body with decoded bytes whose SHA-256 matched the requested
digest. Branch-only or history-only source evidence may enter `G` but is not a
candidate. Forks, pull-request refs, local builds, mutable unresolved names,
unretrievable or digest-mismatched bodies, and absent or contradictory
provenance MUST be excluded from candidate selection. This captured
retrievable-and-hash-verifiable property is the receipt criterion; it MUST NOT
be restated as an uncaptured general registry-pull claim.

Positive selection MUST apply the mandatory source predicate before any live
probe: the exact candidate source MUST contain the required preview/merge pair
and every relevant preview, conflict-delta, source-replay, and copy-chain walk
MUST terminate by ancestor CID or reachable-set membership rather than numeric
`t`. Source inspection MAY reject a candidate but MUST never qualify one. Only a
source-predicate survivor may proceed to exact-digest disposable live F1 and F2,
and both live vectors MUST succeed before a tuple can proceed. Before positive
selection, a source/live survivor MUST also pass an affirmative reproducibility
gate: it MUST have a frozen rebuild recipe, toolchain, and base-image set plus
at least two independent index and platform rebuilds whose bytes are identical
to each other and whose digests equal the selected published index and platform
digests, or another exact proof explicitly accepted as authority-equivalent.
The captured SLSA statement bodies omit the `reproducible` property, so a
non-presence-aware projection reports it as null; `resolvedDependencies` is
either absent in the older statement shape or present with value `false`.
These facts establish provenance only and MUST NOT satisfy that gate. All 28
current `U` tuples fail the earlier wire or source predicate, so this
additional positive gate changes neither their classes nor the no-candidate
outcome.

The stable observation window ran from `2026-08-11T23:01:43Z` through
`2026-08-11T23:19:21Z`. The canonical Git repository was
`https://github.com/fluree/db.git`, and the exact ref producer was
`LC_ALL=C GIT_TERMINAL_PROMPT=0 git -c protocol.version=2 ls-remote --heads --tags https://github.com/fluree/db.git`.
Its before and after outputs were byte-identical at 17,552 bytes and 236 rows,
with SHA-256
`ead1aa9a5e5444bfe583f0775b12ea54a6d617fc87a0e320a5d1fbd4827f0700`,
84 heads, 103 direct tags, and 49 peeled records. A refreshed nonshallow
temporary mirror ran exactly
`git fetch --prune --force --tags origin '+refs/heads/*:refs/remotes/origin/*'`
and `git rev-list --remotes=origin --tags --count`; `G` contained 10,912 commits,
and its sorted commit-OID set had SHA-256
`b39733f222b7bd45c9b472505b2ce01efd02bbced2a3449569669eb7f92cbf79`.

The exact OCI Distribution inventory request was
`GET https://registry-1.docker.io/v2/fluree/server/tags/list?n=100` with bearer
pull authentication. Its before and after responses were HTTP 200, one page,
with no `Link` header and 73 tags; both the raw and canonical sorted JSON
receipts had SHA-256
`fc239cfb549d6bfb024493d4c06ef68963c9a27b7e2da4e41746832523f405bf`.
The pull-insensitive Hub inventory before and after had SHA-256
`56582799014793edc37b873c2c6a7f15a69755f4245bfe43b2314ac592a43864`
and contained 73 tags, 69 unique tag-target manifests comprising 68 OCI indexes
plus one directly runnable single-platform `stable` manifest, and 137 unique
active runnable platform manifests. Hash-checked inspection covered 68/68 OCI
indexes, 1/1 direct manifest, 137/137 runnable manifests, 137/137 configs, and
136/136 expected attestations. The old `stable` direct manifest had no
attestation, as expected. Inspection fetched no filesystem layer, pulled no
image, and ran no container. A later anonymous Distribution manifest pass
received HTTP 429 after quota exhaustion and is not evidence for a complete
Distribution pull matrix; only the `v4.1.5` `linux/amd64` tuple had its
complete index, platform, config, attestation, and statement chain captured
through Distribution endpoints. The complete-universe receipt instead uses the
official Hub manifest-by-digest body recovery and matching decoded-byte digest
described above. The two complete partition ledgers had SHA-256 values
`1da2029bb1b4fb9b811d034fe3ae64e871e83f8acd67eafdec2b023c6dfad9a8`
and `478dabec40047a3903a9741f3f19d773cd20f1a3759d745c101f4eaa42ce365f`.

The complete tag-target and provenance partition is inlined below as
`fluree-server-oci-partition/v1`. It uses this exact indexed schema:

- `f` is the format identifier; `o` is the inclusive observation-window
  pair; and `q` is the repository name.
- `d` is the bytewise-sorted dictionary of every full lowercase
  `sha256:` digest. All digest-bearing rows below store an integer index into
  `d`.
- `m` and `p` are bytewise-sorted media-type and platform dictionaries.
- Each `t` target row is
  `[aliases,targetDigest,mediaType,runnables,attestationRelations]`.
  `aliases` is the exact bytewise-sorted tag-alias set; a runnable is
  `[platform,manifestDigest]`; and an attestation relation is
  `[attestationManifestDigest,subjectManifestDigest]`.
- `c` is the config-fact dictionary. Its slots are
  `[source,revision,version]`.
- `s` is the statement-fact dictionary. Its slots are
  `[statementPredicateType,layerPredicateType,githubRepository,githubRef,githubRefType,githubWorkflowSha,vcsSource,vcsRevision,reproducible,resolvedDependencies,builderId]`.
- Every fact slot is presence-aware: `[]` means the property was absent,
  `[null]` means it was present with JSON null, and `[value]` means
  it was present with that exact value. Missing and explicit null MUST NOT be
  collapsed.
- Each `r` runnable record is
  `[manifestDigest,configDigest,configFact,statements]`. A statement row is
  `[attestationManifestDigest,statementDigest,subjectDigestIndexes,statementFact]`.
  `subjectDigestIndexes` preserves decoded source order and duplicates.
- `d`, `m`, and `p` are bytewise sorted; `c` and `s`
  are sorted by their compact JSON bytes; `t` is sorted by target digest;
  aliases are unique and bytewise sorted; runnables are sorted by platform then
  digest; relations by subject then attestation digest; and `r` by manifest
  digest. Statement rows are sorted by statement digest while statement
  subjects retain source order.

```json
{"c":[[["https://github.com/fluree/db"],["07316fa440548247e8985215b8151965d2c72726"],["4.1.4"]],[["https://github.com/fluree/db"],["478dde21bebc40da794b6a979a958203702c6c1b"],["4.0.7"]],[["https://github.com/fluree/db"],["544da2a9deda653bbb25302d10260a7e4350a057"],["4.0.3"]],[["https://github.com/fluree/db"],["587c8623310aee9ef14a9c8d964480b58b3337d8"],["4.0.0"]],[["https://github.com/fluree/db"],["7145a38883b317285123778e23f699f4dffb12a6"],["4.1.3"]],[["https://github.com/fluree/db"],["717ecd480758cdfe7ae99e05678e057e30cc0b02"],["4.0.1"]],[["https://github.com/fluree/db"],["9fd0135b4fc6d1f7c9a7bd1267294f5e131a17b1"],["4.0.5"]],[["https://github.com/fluree/db"],["a600e0d33ea9e122f49633889ff791574aaa8120"],["4.0.6"]],[["https://github.com/fluree/db"],["c11b828b11a0df9a33b79011e654285d661a1127"],["4.1.2"]],[["https://github.com/fluree/db"],["d0f7ba5b2b674c93e5bde18a1fea5dc3b489fdd2"],["4.1.0"]],[["https://github.com/fluree/db"],["d767927dae550a6ecde8f15603ad9c195de60351"],["4.1.5"]],[["https://github.com/fluree/db"],["d7f85144faee8ed52df6b90c91a0145a0899fe15"],["4.1.1"]],[["https://github.com/fluree/db"],["e8596cc7187f9c2e03ed37b510f216a63cddb60a"],["4.0.4"]],[["https://github.com/fluree/db"],["efa05951155f2064fc8414206482036bc2458243"],["4.0.2"]],[["https://github.com/fluree/db"],[],[]],[[],[],["22.04"]]],"d":["sha256:002a2c34a66be87a53558b8bcdaa4e56428227359b62f1b2c88926650048b95b","sha256:00543ab67676cc25577deeffd4f5f3809c21bf678ba94054100cc40930d8409c","sha256:00c1fa11eb6e4844235d8286227a9fd33625ce72fcb77eebe7253a7cddbd1f8a","sha256:01215227e9496f7a7a3887a3ab89c2431bcfdde7e94fc39917ddd044c07b2d82","sha256:014ff2c3c46ea445b3bde93322ee7083324df9d2b7f50aacde7393371208c796","sha256:018ad93eccd3e6b6b17959890ed1e305a434e2c4ab0583dfac6823fa45c40c20","sha256:01d901f72dcd0c17fa4b4a9ef412b35403702cfe729f635358ae0321fce6463d","sha256:01e088f08c805bfe2d138caf51fd17e4a755da2b0477c6ef0e0eb6474da76ee8","sha256:02531c49a8bab7283ee69d2ef069d1d678aeb0f13f0a69fc627a1cf6a7ba0243","sha256:02d86e839afd2708ec44041d1d2be054b4e34d718fd9bdc57fa4973acbb2ec25","sha256:039a9c09fa2c4ccc0d38e13b7de53aa9f2de0e843f27440797c94634db05605e","sha256:03a4dfe102c01b9d1141ec6e89c0f574cb97ab9d58a5f68c16c727cb625d4aec","sha256:048190f3a7071704ee57ac99f381a19fc23a4bcf73c8b6b30f736dceb09df22f","sha256:04aa711030b0c5c55e56f6fb08c2a5a307a1e397010f3668888eab1e891ec7b0","sha256:04c50de588404727c3cdeb3edc6d4c913711df852f06ceda392bac334c8b0f26","sha256:04c7c7b0557e21f94a6bf20a0a657a2eb02d8d13ea3c7b3166d685487243561e","sha256:04d7604ded80353953440ae84df07bfd28c8e4495ec7fa267d1db2482abfa9e4","sha256:0535d85ac0942e5b9416d8bde61d0e71eea0c2705c98f6e2511e9e4256cc7ee8","sha256:054213771f811e4c6b70bf5b89ea54945305fa0d7ed4e934e229e42391f936e2","sha256:055641495576062a91c727ca190cd5b44ea1447c388f3408b13ad280b6840218","sha256:059284359cc75c6cc7f5059915c26b05a881203ac5deb845122ad49306be72dc","sha256:05c5f12b2f11f27a723a4ad9198357cc90a77f9e544069d7f528251e2636821b","sha256:05fcf4c56947e907773cc684faf6a110a43074fb4bc633ce7175eb5719737a4a","sha256:06ca1becaacb822197749f6cf8cef01a26ce6a4465c77b18624944b3fece58d9","sha256:071dc90c00ce79eb4a4ee74c66e1e8815dfeb1948d5b0e0e01d7c8f53189cdee","sha256:08425003b45640ae61be53695cc1bff0fc627e3db21f98a6e8eb7915ebee7ae5","sha256:0a7a67703f49c05e4aa96952703430597dfe0b9982dd8a3e4ff5db6fd4fcac26","sha256:0aff93693897366e7b1c592245703576684891607245b72fbd0d7107b08a525d","sha256:0bdf80afaf9191cf60c80bbb84c0b4f83aca8e2ccc806006af2a0558ef275635","sha256:0bf6248eec0f6d5c92b534a96bd7c26c1fbc7f09263c53fdbdc6e8993f2d1bd0","sha256:0c3b06269a778725315b2022372eba62f1bd6bb45886ed9831a620af098d6050","sha256:0c9e4472f6eefa581e53344de1fa39303dc9511dbaadfe46defd36284f10ed08","sha256:0d63baf4746ae5682d53c0faed44c7817114472811013bdbd002912c9b8d9677","sha256:0d8b11fddfe2dc505d56f57c7c7b7518745a803b0faf1d8746c408ad2054f780","sha256:0f441390de44dd9ce4922fd083cafbfda453eaef1989aea3b51e6de694a721d3","sha256:0f64203274e8234d298501fefa1f46be79a6302e086d9fb5d4416ddeddf053ed","sha256:101ffed42ae05b48e4730b6deca7b4388cb1b594f764c063e3face3a9e4e9691","sha256:10a8c05ea7446a847e841bc2b5d6097502f7c14226f15ba08d66eb4aeba40855","sha256:114c411c207083bfb34e23bd2760453835262b2fc15102daf8eee8a01a7bc41a","sha256:11522937be9ae2737a1876b31afe795e9fa003ebfa813c45534d9b22f2ab553f","sha256:11632b43a75d109b3f2d258b04c1bc2c91beaaad4ec7cf4af56594dedafcc6c9","sha256:11704e92927dd6a0acc3b3d555c231f8a8beca316333ca439a145f188f484e65","sha256:117d9f5730582a73cbb739f9aa923a0f561ea72b656ddfa1609ef875214a5293","sha256:1181b237524ccdfb091a4a3c88708c6573aa77b5508c2070551d84fb91ae7656","sha256:11ee2feb3a8b970d35d9a01b75218563496bcfc6843356dd56d630361f0d64c2","sha256:11ef4b7aff213a5bc83f892463ddf1b489541129f6e4e9e972cc659e3665bf1f","sha256:11ef921a2b039e8481c79c365245497d14961847814378aa1868f1d761eeb429","sha256:11fb759286abdc4145451b38a1009aa68bfb38f47c16adb70535d06fd88fa08f","sha256:12914331847b6766c42dd1495e1ec0eaccda1c41003ba1c3ba2d48740edfcc8c","sha256:1298183ad60c440454f14bec9c5df3797a847883fa5497e56fcebb2a62c9eb04","sha256:132209a16ea429315c019da6e28b83530ef43346407f4bada267ce88c499da7c","sha256:1367e587b8487171c609bbdd7a914d772a94fcccf6c85c7f7522a11441125d8c","sha256:1401d99cececdde0dfebf3704347ef0ec21616cf020fb55165a8d3bb152fa385","sha256:1530e6db1842c97f38f29c57cf81accbdd00a11be5a93a213ce5311f51a5240e","sha256:1585151a73846567d5aff898c68820f91a2088996309a3376885f83ef3d6ffa7","sha256:158ae6fa155ac31ed155d106e1445714c062f62236226f6e2798ea23c7265425","sha256:15ad2ca953da53227c78ba02db215f9637cd819f97391de35e81cb3e7d961e6c","sha256:15f03e04e3fb44d09a110a887789bfebeed3b9a5602b4fc2996bdea39ca05bca","sha256:1609a88329c317461419833b2dff722086b7f912c0fc55311c6f71f4949e403d","sha256:165a3d17ea5a35767d4301021be5f93293482ddbd0669681035665237a499859","sha256:167d878154d35f0fb1268b80cfe6e8f7eeb5c0766c5c04bdb3ff14179c6e3565","sha256:169e01ebe1c760cb74fab97f055a5d4250658778229a919ed6fc36feccd53770","sha256:16e1f575fd26565249833df9333f853cd6473062d07f4456d1c1d3c47a64ee8a","sha256:182c10a32fa43492949e60da66757499ce5356c10cb1c593d7aaf0a5c7a155b6","sha256:198059e33ea1228cd920f63cb04439bd6dd2236f3fd78439ce0161900b814aad","sha256:1a533de71482616229c440d60d199144e0b3f31ae85bf144c8ded3514e34f70d","sha256:1bd02cec3300f0ee4c6a2d500f0fd81ebc99493e8b6f808122c3b1ed61fa4ab8","sha256:1c09f79c8b7efb940b55d76c339f428918f37835163dcbecf3fe26c4aaff5c98","sha256:1cba33c4824cafb7cb8fbf68cb872feb04e04560e263f3f04e1caee939492f74","sha256:1d68da16d0fb8a8669839f05905871a9a0d1b0193bb5f15aae759aa5076f1c77","sha256:1d9b443e730a603b7409726412544fa892623727636e21761d441587090880bd","sha256:1e610f4b885315e74053254201ecedc5c065c3e900f3ee67020db223f5c93b8e","sha256:1ebb2610ee3245b475c79aa3501063ea2baecc66ac985d31fe15f95c905be038","sha256:1ee54bff8d24fe3a927321790724c83f75a8a6e15973feee2076ac7ff5f3c00e","sha256:1f0e6d27a4d92c909dd0d5976e82c7246043579586710b84dbfa266513ea3136","sha256:1f64b631dc822d8c8a83e0621a6662dbde2d925a84ba52865e28dbcb181681b2","sha256:206371e787a522472a9fb51b7bedb5e732395cc6a6ca9ce4f12316fdf6d0ef8c","sha256:20b46d7f4d8f36aa33851a80192c6b876394570b2823a77dd405f1dd330fdf83","sha256:21055c52a353ce3920bd546c067c6d1a9d93240e1595d763c90ceb37b5bd61ed","sha256:219940c63bccd5385709c525348588b45a8882fe6e3195716f4bee882ffee1c2","sha256:219fc7db538594568d684e5e0c975ff8ea4f7fa588297bad070206c67f4a2623","sha256:2264c87d867d475701522ae5f4b5dceabc5954586596e0c06c74c0589d3da577","sha256:227ce7d523f9dea73a5cbde7545b6c113d77d07f37b98e8cb4f7533d75c3ade6","sha256:23874e0f765c5b5f1b2e96d339703d6f79552b39c74f4d5641e08c3bf848f144","sha256:238decbc5c7f41026c8a14a03246aa8e13bf8da091e989de9185f90aed8f5444","sha256:2475e1b93c036f793fe1bc2d9f23fcdd9bb5b3e3c36489135c2d47d523acf221","sha256:251fc25f671d95dfa2f8a644cf5269022143a1169078339264675577324eef44","sha256:263979b1d521b320f6cb077d16b7ee7d693f158aa6df32bac2d01e8160edcfe4","sha256:26fc7467e61c210a212e4e792f627d42ed04c1e6aee1835cdd45620352df0fae","sha256:277d00d033a2d39a3d1ff236d2d71803090d65b888f6e710eddbb03af0515ec2","sha256:27eff34bfe184baea57ffe91bd413b1079c4fc5ad421de6dc089f5dfac85cbff","sha256:2812432b6de52715e5cbd4292c54761f9bbeb75b65528a14b898ff7c3777c534","sha256:288f704d569b61ef5c8f8ee5acab7dd418c1a0b25e984fffdbb08e22639fc1e5","sha256:289b91268104b479f947ade7fb7a2a7366b51a5497b2054252e3eb6af6483a3a","sha256:293915ec315287fec7dc57574867b681c2e02f19a3035552396bcd402190e0b6","sha256:296041c8cba5ef52ef0d3346b168af8ef3fc73391b38cf2925cda98b2b702704","sha256:2967d0a7d790ea5e68b598815534932393df9ac2e003282ac8832f795889e375","sha256:29a43a72c78ab768f1ee0620416a011b9462171598307b8968585aec698834e9","sha256:2a217951f1e5a6ef491ffd674960ec4b3f1dac11b67c48fd8f654dc9a2e12b25","sha256:2a7b5029df26dd9e32e72ba972ca2b14bfadf3a0b73aed1d2386b80ed88ba21d","sha256:2bdb03e2294d9fc7246490642519fd46dd3fc2b0954e4a3ed5a0e632db2ef425","sha256:2bf681519453aceae5c111898fab79c09f77a365629fe40a7cf3a538e3ad4a8a","sha256:2bffe35c183cc3e7f8d8be92d0613e1deea52161cc6752f3a3e1c97b173b2df1","sha256:2c071053c36991a1a3508a9aaf900d84c9f16f90d7a7a65d8ea1ad313b1ee4ac","sha256:2c3969b3fc0d14d3a18d159a6b5f0458c8a60d32bea49cc7c3235cfdee867475","sha256:2c5f15e1a993dc3182ed50c4a5d4a04985e1e130482e82fa1696f2972fd531d0","sha256:2d78bc5bafd5967efeb1707c6295bc7ddc77093f3bfe760bc7af116cd668236b","sha256:2e60c70ce5ef02decdc2b40c8bed7a720a2cdb91b428483065fa902a52643229","sha256:2e837b56009d5434c933d5a028fafad65c2a6cfd4395029819670f67e2acd1f2","sha256:2ef0320d82bfe46a326195142354b92df461ffb9d715c5f4375dcae9f4ad5fd1","sha256:2f32d54eb65cec9604592fd7ecf80b91fb773408c383aec9a3b4555420e553e1","sha256:3041397e0e02b9f44e3457f59685331ea8d2d1157629e39778ce1e1950a36ccd","sha256:30aaefefee80398b60c36f7b372507fe6270637c0c8bdf21076ce187a81651ef","sha256:30af2e286bf12e6e00722b5a515c990783dd41db5c7ddf75d01c51504a910397","sha256:311a971ad2d69fd7e5b4c4ed69b2f45242f066996f1bcbd100ca3c17920631c7","sha256:311d656879367753430e02d71ed7122f6a0d48b9a8974308050ec6ecf75a2634","sha256:3288d5576584fe983091a150a3a197413a8798ac98d6450dbc82809a924c82e2","sha256:3290496d4ef4be7dfcfaf9592448bb4abbc72c0535746b43fbf847e70b0eb37c","sha256:32b4378c9171671e6e26a6e538fac07defe1895b1e82a69ebc28ae353415f701","sha256:33027253595607564d29757f4b1fab7bad196d224609d78d2fab5f3975d5eed2","sha256:33bba4ca0c1ff20a115f3d4ffff609739d1b1e9246894e8402543882d433b6b2","sha256:33d2ee401e12c9f7aef88f7ecfc61193e21a06988e129453a74b63f33eba2100","sha256:34730af7c36998526b5fdde9901f9789173b903e45e67267b9471c8cda9c49e6","sha256:349d4ddf7ef8b2ff56889633a99781c96238d485c852a0551d8237d88d00b6de","sha256:362c84a54967c6449cda453f2d5cba5052c2ed48077f0dc99078167354239476","sha256:366562fb6816078666427d72be7713896ba809f3214e3b903169c75e5dbb1d12","sha256:373f3f37772ba87afaa727db7970a3d98aeb09bcb9efcc04cdb68dbebb32bb49","sha256:3778a0e611317ca00a847c30858fee09baa39227769443156ba6fe7954a546bc","sha256:385975a53a6e82493c4502e2eae61bf101ffee337689c20fb4794174bb980a9b","sha256:398e7a6828b9bdca7fee6990058307fef9fa6512947c1ed980e91512b847a9cb","sha256:399598148c06b707a36700fb8fb0db603593156e1c692bcaa90d663021385ba7","sha256:39ca4d4490bbac9de520e67bfdf1d8b383e1671f6024910aa422d05458f1e2ac","sha256:3b0342590650e912493a79b7aa0d0138c0f704f88ed5965b896a332677419e60","sha256:3b7fdc12b841d1764a7d96f960c12a8438ed539861a7ac3fc6bdf4d3f2b8c49e","sha256:3bf83df356c61be61065d56e30378f17217fd4b1963659762e998f67e8828ee5","sha256:3c572cd0faae856341d1d1a75328c138287f3a630ae41480200796c16a2f3a51","sha256:3e6eb6bd0c4aab5116ce73e65d77bd2dd164b6bec956ef9d73cb6ce420ad3898","sha256:3f06cece6791f80937f4f612fe635b3a0b47f06baf53289c311fac50324ef206","sha256:3f60f5b96c7a4b8e75b7a837bb6f494aa210b72e6640c4aff5220ee67c3b6bb5","sha256:3ffc94b0b7f373c67d6379fcb850654703be1fb3d7e5b861de20a9661ea5976d","sha256:402ea15882d070196a8a3ed5d396ef4c0becc2f72f90730bb2a79f154108b86d","sha256:402ff690a733e0dfc5fe8289f76e645b7978b60059e7380280a4f59d5bc10662","sha256:406e1dfa21ec07a4b42cd78af89923bf0829797ecff7f30355943fcd73c1ed78","sha256:407e0210c6a0a022568c7a053ca61df0bd4de686a2c9911fa1a628de21a67ea0","sha256:40e1b7aa4c0ca11520fd25df95db5d96b2501a8e2ab0c8489c790f4ccc8851ac","sha256:410ad27b6f758b4563512fb2d09bfa55b27b3cd9f961f6b48761e372df960328","sha256:413d9ea7673ae9ed000b0a211a72cbf4b5b05182fbba463f7597c9452abb0555","sha256:41632bdb25ffbe603f104bfabd74244e6454b5725541cb176e81531be0c5a52e","sha256:41d7e410997ca96516198b26162ef1b4b532a837470fd118d36fd43a937ad4ee","sha256:423c2ce21a357e1041944b48acaf347dd5f498babab82da852b581a141e962e7","sha256:424a17202a3362e97fe0ebb3193ed62cb85489a5218462a2528deb226ab037b5","sha256:42f68531d6cd5df4aa55707487fefd3546c09c30914ed212d8a15e6b32e0f7cf","sha256:43234204763babcf34799f0828522e0a3a29ae505f9278283e2093c2bb8acd51","sha256:43531134582944fde938b89def79c7dfe6595967d767d3e14038d07e301c71f8","sha256:4353bdd92b4ecf8ef44aecfe5847f89903399584483665c2aa1b4567d3087cfc","sha256:43aaba3fa927fd6fe8d18a7b8f0bcaa4050bc4b991d9f60cbfe5ae3e040eca46","sha256:43ea827eccbd92b62805f8eab5db42ba3f1061713bb959a20bbab9b372a1dedb","sha256:445ada1d36df781a756788a07155ce6114f4f0a18c598a55113ce49433a580c5","sha256:446ba98bed4ace2b95f4d9320e4d5117d39e1f34e7a4c35971a2070a95fe585c","sha256:44702736ff36f8a3636a2da7458a036cd38d8603f8f56d458185c25f092b9d43","sha256:449ee20c53396e100f035ab121efda65470cede431fef21ad696a96ba510f1c2","sha256:44a13558269dbf5c6c2085ad321961c6ba53513343e5b2bde1b6b63f9d909cf7","sha256:45379892326dfa912fd39b3b6a38eb51bea0ead743f3565d316632f0410d69c1","sha256:46d4d1098efc2db5728e39cb25f8ed494f7fa927a009777b20685ede9d859b63","sha256:472664c3f88fc90029f1ff7419ab14a767c2241aeaac9983cd1324b79f6eb966","sha256:472b4223620521f9744aa06276392641c96f4556362623e6737fc769d52f9003","sha256:4780bbb13aecde44a5495f0a944b0dee05b6458010961923759da6294c3c9b38","sha256:4888be2c630194d665e6b86188e55d42b1b2bbff70d71f85ad26360e1c72f7bc","sha256:4961d30acd8aa3e2b249c4edc9717e9ca8ac3f6e296092b7691c3338617de33d","sha256:499ef470b33668cf6f022f948ced8d95778c9cf4e6bcd3111f096b9f67c7fbbb","sha256:4a6cc28a08b34700b3917f2fb8642b433166f1dacc51248bab4d8a2b0024ff36","sha256:4b0a8cc2a64c3339c4d01910293ebc98381faa13e3acdf01f23328b1f7a6cc64","sha256:4bb54a0cf54dbeb7866ca34cb41b95df03f48c5e549fb5f64c0e50516a302261","sha256:4bc07602ae0e881df7f85bf43d5ba00791cc6edeb785bd1d931aa09fd62d4ea6","sha256:4c0dc82399bfa512ee6214b1ad7daa41b8f0cfd0d630e837e0ee561d3b4ea150","sha256:4dcee9a6f7219ce14f8bf6bbcd0b89b0304897130083dce63a38148d370f91ca","sha256:4ea7de312f7b57561af364fdca58dd5af5242c354bba0ea75cba0f1cb58a5de0","sha256:4fa68c4600f72e5a831fe35496c3a3f07e751a55387e4e9167b06bb171259fe1","sha256:4ff43d1d543e52f3bf14c31aa69802fcdf7ef157ae3d6126ecc9a4aed7658943","sha256:5103dc6c67d047d10a7dd0ab5e473b5f2be6f0997949e3772915e4ca9d35fe23","sha256:5107412f185c79e8a9b195cbdd66fe562fa0785b8a1962730fef294320fc096f","sha256:51a402e04898cb661dfc716a24d6b1ad7158e06911a434bf6ba68bd39943c780","sha256:51b1d5210c2090806c1721304e0e9a29abfaaa7a369e47b6d96de9912f7a82a8","sha256:52817d9372255d2eb568a2f061e1daab9d928d7eca609aea84c94bd9c216d895","sha256:5318a4a821de5088494ebbe04d3e45c055a15d32ea494cfee1db09d2b8044c7b","sha256:5356d1f4fc661c4da91a4eaa7680897793ca3c9541db5f8a799b3489a574c2bf","sha256:5357c83205074f9fd8f2fedff29b6f9e66cab80da514255b60c8a1554a9e0f05","sha256:539ac0fb63bb0f01a394af5340b8656be749f9a84a0bf8d6ed9d7c18074ceb32","sha256:53b1cbeeaa45ff11d94a05af93b466a04ccc35b68bcf9c50dd59d7353a8ce967","sha256:53cfce4155b6cfb41029e51a470a803eb8953b888833e9246330a51b4aa84f1c","sha256:53e0286e3773bfbd82fbed3479650bbd6d4043c028ebe0d857eec809dd390ae5","sha256:53eeb25295d848695f0c4f2fd2ddd0e85234938a975db4694ac42a45d2eef36f","sha256:54740305511ca98d4e39de159ee583f9b15ae4cb98cc899c99c0d7a27ad89df5","sha256:5488cc294aa254917a151e5dbe46988b24d593c4e4fdef32831c82fa79228eaa","sha256:54a15999d7c99b5a60bb6d897fc93143c240ea2ae347a5e0862533d2c698ba56","sha256:54b835d184e6b99a1e7079592cf2a14f9212e7228bf2309775df9ad3b018fb48","sha256:55051abda18011725dafff44eb2a46689ff7b131047b4c0e00701ff77e79d230","sha256:55a43a107190d9336e4a0f8983e3da4f13fd153b7139ebf506c1e1da2dfa4a42","sha256:562b1df6475ab76080e90f45636959765ff4f5cc10a52a201e3396d0d0f0ab61","sha256:5662244ac01a8adbf51034fcb0ecdad551328be43bfd4e8608a9fa005eeb4331","sha256:566e374300d35e2836667a5021f2afee9da8b6592379872873ee0ff49fab757b","sha256:56f015811e5f4e91ed83db1f8d2b94282fabca7c9f7db3a91fa3f3b0e83c0f03","sha256:57064f841055f3090bb1dc8b45897642040c26a2a7b1461eccab14d9bd16272e","sha256:58176448ddd75f035fe4808752e18a58b615cbddd15663bb90f31319207561f9","sha256:581989c351b263abbdd74cff4517b2c2116f173ae34206bce3ecd2cab7668a86","sha256:582213a1da65aa2672555e8375ed5f1e227824d99f7f8cf352225f209263bf00","sha256:589b7dbd0870755dc257f3dd883df8a03a832d6c92c739a09264a8ffc650ed08","sha256:58ecdcd43854f57d241512548df54385531dbbb00808ca976c0dc79591781282","sha256:591dc4d1f4a431ab1511294162e886b97a709b3c679f3ea645f4cfcd7159b86a","sha256:5928b83a70f74e67ab0982f31aa17bfbf5ef295218dbc323b1a13a4485f71ae5","sha256:598c03102e27728a6397dd408c46cbf886f21b7144cc719a7d7c9d33711c271a","sha256:59af8a7d81a4729ac5ff5ad71f323d45266cc29038de793a86d1294458b0aa21","sha256:5a991af4a6103352e79a9323bd8472c5447ae305e170e114fdf340531cba3bb7","sha256:5a9f040f017825b6f80e0fefa250d82b742d5f8d90e67f5891c3761d2b4e656c","sha256:5ba4e3809d211757a1a271c276ca3774d65d380f545b3aeadd8f485783d5a307","sha256:5bad432c37f1b0842125da453b3213e1d9a86ad9f0f7e57adcad9fbc24926f20","sha256:5bb1b5209a664a0db4b0bef404398b90ea0b9c839f7da1d547462b314417fff2","sha256:5bd0883767c3d033b6a0ac86f15c26142bd8151c4a29f3036b2e4c75042c1c06","sha256:5be926c85110dc04b95717ee64d727d33b16e8ebc6cee262ea2073fbe51be772","sha256:5c833009bcbd8c191248a75959943f3a0da6ef863d2c35ba54ec79e48c18ee29","sha256:5d437f66e9612803d9596a9963975a45902baf5825fd7abcb99823208de0a881","sha256:5e34e2956046622ec6206181d247fee1b734d3bc4ab63412918f0526d7512788","sha256:5e6e4930bcad77016b76c9a2f2727647fab3c38fc81eee2e70146071222cce57","sha256:5f699010ce1b5ff84bbdb7eff8948999a3d9a656cb32fbd4a9fa006bd50d98b8","sha256:5f9c9be7d76ec8cf1d232cce7f0ecb0fc09952305a7d5939db03dbcc4a357ffc","sha256:6043c917d1123c9afd471faf955e05a53929339783af22318a14551d7e2a0efe","sha256:6058deb2120fb115cc426323c573cc12274001f0659d24a39650af61a6fe4e0a","sha256:60a161bfaeabaa4349fabeb6dc06638c6b818709e1b73e25cdf65b2104271d37","sha256:60ba4d652c7954e2f889dea45e78f92527b9e2930b87a2293eb62893c7d62f3d","sha256:6189753b5570111b4c985f743384402eb1ad8350052e26b2de543c0732f1248c","sha256:620a870d676965bf79102f8bdd8257c72fc3b668e9ab6ece57b2d979611b1e2d","sha256:62f05a868d36cb8eb8d0620bae268d3e1fa4a5e5b179e63f27207f285273ef1b","sha256:636be6d8111f9b86c1a86aa0a8e24cdb1f2173ce5abbe146f5676ccdea67db20","sha256:63f2c26332b3b31ab7fd92137c1aa101a6a025b901ad6522b367844ba3fcec3b","sha256:64d9e1bdfbb7e4bfee3991c4e9db38effd265dc8fe10c14c633085dc2e0eea75","sha256:65165f835bd4baaa6416672c2bd3d7c9b6fa7d7c226297e0d03849b8a226663a","sha256:65d8ae6fbd04d29aa2eb569c4acf58071689b19ae9d75a3766c9df6e90eb7bd5","sha256:65fb80e4f45744ba723c322b351874fc92af63107218b5d53a82ba42310053e0","sha256:66c478e54b3d62a5ce0844e2e88dbacd0c059f9537d85dc9916e990a443eb2e9","sha256:67c4eff98bcdf2f93fd8dfa803ab104d531a07d4c5fa9cc45a1c5da6b1e5c2e1","sha256:68d94bfdb583afff4c19254194282da3436ad2a0058b09def1569bf608ec837e","sha256:693e680dd1f9cadbbd48bab74328b7b1c51c2c46a66a12b6c503dad625fdae68","sha256:69920c2d32866e247a2da144de221080e0be91ce7dbc8bc77be5831fd22a75c8","sha256:6a79c14e957b6e321cfdd3169265bcb25aee74cf17cf1fcc3616b81333d7e53b","sha256:6a8096b72a1aee00b739cea6d51e4c84bfb776c5f31ad4f66cd08dfd02ad2244","sha256:6a95540c8052f80543518e50bc8527ded6a3a3cbc796698c9aaa870c54b4891a","sha256:6ae6f5ae09567a2a3d5355d6e51eb552a85f12fb70e70c2fc20d3884c4fc5062","sha256:6b00957c773b565c36054583019e0c167a02c69f72a75c216d4123a883207d22","sha256:6b06c84c0772b0a4c6943b9f3833b4d918373baa4266f40b9b0ab6fc9faa4ae4","sha256:6b9e0296d6bb556db051fcd6e29d6ed4396dd23f87000e572e1768ecb5664119","sha256:6bb2045219528fc87717af4f2f441378f12839682d58419f00f912ab877f2256","sha256:6bcf038358818727f23634ca99b07efd5244e449e2343b3faf7d7b58e35dded0","sha256:6c201b1eac38e61fa10409204f970c7baaaf67b262b6269b30d8907b738a56e7","sha256:6c82d2d9a8329ee16f73eb355d158693682a4645e02a3acf18ca8929caa02a19","sha256:6cd676f0ed50fd559719b3dfd99002174ab4f0fe07b770626bb75fe16e8bca92","sha256:6e6956543fc5e63a9c3fd9955af6c5a68d3b6688e4f1f9b33637089ae730c413","sha256:6ebf1eb0c9fe15eda1218dfcb3b3ed6711fb117a4b882f2b3b97dac096069441","sha256:6f3625d0fd9fad9663579aaf8175dbf52c4a8afdc37f388282de0c91aab5bcf6","sha256:701d37156e5a2f84906830ff4ef17f90412b6ebaf513fd9765f89df0cd3b13e2","sha256:70c95f1332d5e3ced63d7691dec809878f99b5651c59f03d38a5e1cd76279fc5","sha256:723e7fc0110bb5aa4fbb20b6993554399a8ef8a697e6f8e511ddfb7a3f803790","sha256:7338f5c05698b974f55c8c9ae664c272bb888739e8d917660300c411a74948e6","sha256:737c07a7998577159d634b7d8e1c91d13d20ac1b1649feeec14060d59e664e4b","sha256:7384527a6447f4f3afd2b0c724bc545459eab9490756273851eeef565be7b103","sha256:738c989b11501f350655cb74deb2aa04b236b5dd3d3111169a0ca1aa60928ce1","sha256:73f8a24e1e774c5bb8688a4cc98a329be57e6385d070a982df0169086a9ef06c","sha256:74bd0581477cab4387324ef989f00472666e9b1d7a6baa88006ea06f8cb3a022","sha256:75c1cc05df7b68b65a3ac69a7d24d4bb387e39701946519aaed89d261c33ed6e","sha256:771998956be204ad1f5dc1c673eeca80a806eac7c480224e2ececd2243f01ffa","sha256:780aa2cf162c3d1cc2a87c1749381afcd333008100d27442a10aad23605f506e","sha256:78308ba5ea8699fdbe6a301415385ff74c6b0f3179cea9f5cdc238e60f2a7c4a","sha256:7872e79bdf4cf6ce937a3106f4e8e07855309f36d152b80c174b449471b476ff","sha256:78774a289de27b4085cc566bfae02e37d0b3bb47a79203af3d7a2fd05eff3362","sha256:799c995680d71a1d0ead91ec3b914235b6a969205c204073e754043cf916ee56","sha256:79a3fbeb0f3bae0524d9740e9a235b91464c59a202f197ec62bfa85cc54c0c21","sha256:79b2a273491a6c9f81c4162eda08f19e386561fc2b589abc4ab7fa9cea169012","sha256:79beedc4ae7821eca3d389a860e2755734597de5bc0146e232b70bf68210d9b8","sha256:79deb7e4cf7495cb2a27a4f0ffee853413d414ae77bfaecdb86a48a7529d4a78","sha256:7b3e7cb6e1c006522476e963fad8546b232be36fc8f0476f34b7c328a78ea969","sha256:7bfd82983d79ea2159391129264c718f3a3159f66631038f91b2c2e33d27bc2a","sha256:7c80166e09221b30049a7e13889f1261dab47edc046670684042a6ed5a544a6e","sha256:7d2d0631ec07c0ab2d534deed036c5fc9ed18bb6b79a463fe9f1068798d712ee","sha256:7d92dc1fd1c75999c24d2f0b9b8426f6079ba34156d34764bb8c3878a2260ece","sha256:7ec2db7b0aa2943d2a27239902dd742e0572414ac000429d4397cd7b9dced9ba","sha256:7f4c34a1c2ac189ccff3bac93c54e264a05b7ca5d05fbe5ee5656ac1cff19d44","sha256:7f910f5f219c3d452cde9d275c19c88917b1b480d0be1d438b39d8f8bde1e272","sha256:7fbcf51955bb95be1fc59adbd693b9cc760a8ce5d5803b13098367c3283f9619","sha256:8134fcfed3f20559208f32a6ae8579a1285b5116a798f5c480017cb97533e547","sha256:813f6907c9e27b9bc39bdfd41f9b52df98c8b89c1b38d52450c1e1332847d781","sha256:8159cb4ddb752c7146525ad6de5e938e74e3d37cfc1e0b962b87752a3e3e1a77","sha256:816df9c84e65d9b3d834f5c73eb60800377d68fa8f73dd10dc333184c565ad3d","sha256:81bcba95a23bff8141c0d7acc96d9bc32b7d410f5ed147125012fca11eff0535","sha256:81cf2248ed1776d42baa9ada2be6bc3d7e17b42e15edc22e809b1dbceb2ef436","sha256:81e0dac48624ed1d8d3536477e8ea76bb0c38ba1028f4e34528a7e63842bbd1a","sha256:8265fcb724c0e5e63ac4d9d4274552c5b56bc9450d6aa3da4dd0bcbabb349ba5","sha256:82bbb5cd5e8b2e5795f3a60d738e49e6c0f6b8921d4553f9fc18bc50dc306600","sha256:82e0475396ef65a0303edcc247c8c7cba8eba4680e1a01d54155499667e2d688","sha256:834a7b6fd51c48152b6115f7ae651f711eb69644038505e9fe706e38c69a7acc","sha256:8357fa9280a73944b0d4510f51a674205358ad57fe11c44329d0a003745db552","sha256:83723801db2f01f5bce2c0b9dc5606e4fac8c0a57d0388c0b6b13dc6877d174a","sha256:837cd34d11045c90bf4de00514b78a036173713a35b6cb84d4f80528f34fa0d2","sha256:83926a257a50d6a758d077db182f6d31e65a8256b7e2ef393a929bdc3fa7c0ae","sha256:83d0e1795256fc3ad1499a8adc83f2017c19f26840d3764ea1cc0f356294c73f","sha256:83d58f10916c3fb70d6935bb957679fa5c7efc876e77b8f6e342825fb28815e5","sha256:83f8bb1e93619bbebe074549fd124ff6724d9971dbd97266727fb999bdca9703","sha256:8435214f103ff11e39a6fa50bdc4e00dd60564a52f70186ddfcda46459939a46","sha256:847785e8fbfc951e54445a25c7215f4ec7f8c9b386ad35ffbdae9cc044b18291","sha256:84ce6e664d52896d9049a1058119a7b5ee823ba1adb82e3b303c2c385b5a42aa","sha256:84d7c90d0d1e468fac708fd2b1ab3b9cc0d72a0d5678053bd58538b8a3265ee9","sha256:86c56fccf4f83e6cf1db73958dbcf5e7864dd4e90edf71ba9c9f2c2d334a56bb","sha256:86d45302a9bc3c2a3cd094481ce0a342f337fecd00e599396e01c14477b40246","sha256:871df4d4d3cdc461a05d44c9a98b4f6b96e8aa88fb0a0e9d0bb6f78e4bf4092f","sha256:873c2e8b012f67af10fcb794c293668076883e21dbc200fed1b7b20316b9a7dd","sha256:8745711c4e6f604a0b0567ecfd503f56ad61135133547c321b37b9f4f70a0a30","sha256:878471c4517e756ce1e99d2cc0c696b4616b1a640c99b42fc82241c768268693","sha256:8788b9059aa779d405fea5c2a1d8eb59761bf923a7c565ec360bd0bdac9adebd","sha256:87b2a1a19df288959612d314eb471022388fc8a6d25fb088b10aa87a8d24ad44","sha256:87e32e478c8caf5eafe7ca271cf118a2c5e91657161dee773067e65f287c56af","sha256:88f74664965474d48794f7de5832a3240a05a96c7ebffd4aaa394aaadb36b951","sha256:89de65a79a2bc86de44cffa125c34426fe3efdc36a46ff112d776bfafc62b6ff","sha256:8a4996456b8a33a5628e6b6746ab079d40deaeffc54c0c157234632c4d419776","sha256:8af70703e049756657397167ec140d85f85a4fc3e4c88e623317dd1e2fc970df","sha256:8b7bd421403226a209c268e4637851882928b01fb83f37e3810cf8f346f7c473","sha256:8bd8cdf974fb95f38ccc1e8eef8253d2baa6b8759b8d590b0e994c5c491c1b4b","sha256:8c9900a26c16233bcad3187549979e4b9b508699857555b4beb873994b267014","sha256:8cdda6ff30b5c96309bc77107f6a7df0ed563d1aaa3d47b91aa9ff2797eac5ed","sha256:8dd8f19a59b259d00c0d075e579b40d05bc17f9e532aa299e3274077e3ffae67","sha256:8e42aec17f1f6c870963cb551360044b7cebab91d9652739cf965d62ccad1060","sha256:8f1dc0a5d836f27e970ef8fcbf4f01d14325aadff47d885d88748b74b0e9c3ee","sha256:8f3ca7379a4fb8aac4a6b484a0de2ce713ea3fa46f895d802217b246f4146d76","sha256:8f45419ea1e4d23a653e000e35746d86cc5d19bc033c937c447149c8f25e6ff8","sha256:8f5a3079b8639c7c2fcfabf2139f42208cc0928a1beae93bda0757dcc4b42422","sha256:8fa263497af8d36f2e8ed66e1e1018679d373094b945521c5d5e8cd3ddb98fa2","sha256:904674daec3a3628784bb8d1f66dd34242987c39222ebefd2832bbebb806cb46","sha256:906236cc5fbbd66f976dd15a8d1fd63cfe0ee8f1b1130b337ccf103cfb5001dc","sha256:90a23dbb5e3b291c9ab59f939e3f8340a0c6f0823e46b7bd8a5b731048dbb032","sha256:9143fdaf0ab3acdde9a98f8a6e587907aab6f1284f35e2f8de8ec2827ab205f0","sha256:914c1130a8077717b025bd3d99b1862a12ce4ffd050fbf430a6b1fc2c4389f3d","sha256:91a78c2acafad990e4ffe65f3d48c6c409cfcde3550295bb5b05d5d9d815e0af","sha256:91b08a1b1339f4eab588f086e380dab5e12bca45f7830134bf8bdeb92891838a","sha256:91ef797ab4541d29ddd6d54696657419d0b5efb38a78b06bf3a9846d6eb2d4a0","sha256:924d14d3c4f48683a2f2ce459d858e1e859c2bea97d835391548443a2d09e296","sha256:92f80220d84b7e0acb5010fb34f7eac380ae8313f379674af3bc4e26a5c81648","sha256:93379c88f82244a0c2e5b6d37cb3a214e99b3b86a07f4dffc8b41ab6ec4e785c","sha256:93cd80619a1607682adc2652ce754bd0e243196b266f0d33831516311a6c6cc4","sha256:93f3686bdd2814ea116db20ee435687c809e7f14154ea11d3382466c014ef31f","sha256:949aaa5543f88569de5530dba043e27290fbaca5c324da8e742f1169e18d517c","sha256:94d5bb02daf971a858e3e8cc79940f56b1f30edbcea7bea22384b98b7c7443ba","sha256:954df348548cf656272f16604e1bbcd9c00528fa3a2de2a2619d5437b37094b4","sha256:958ff05123fe26c653ce02afd1b15499de85cdf21b866adfa6c727e2867bc2d8","sha256:959b813c3b0003fbf43b5d074cc8373234c40d37fe8adbcd9f9cf698e6f982cc","sha256:96ec1cc02e7429b2bcd3d299fb5b116cdf8fe43dc282d93318a724dda0028e49","sha256:96f613b0bf956cc977cbd1267b60c83f3a01d5cd7f6c7869b400d630bea76764","sha256:97bd20e52745d03c401a4f59a3a37ee6c77386dfc10e8f345887b41a3d007714","sha256:97f6351385700fc617ea4e8fdc80cd84aeb56eaed4aa45ddb94ea45849725a0b","sha256:98c3cc61392d27fabc2ec60512aca15594ae683fcb2f14b4d4fff2a170182f09","sha256:993334c40e401d6791496b87b757b3f96b41059464b13c8c3bc8baa09298054a","sha256:9935e9f0c22ecb669ac6d062a9cf50b7595b231ba7f87fcd22445a234660f1ea","sha256:9a9284827e34ffa8d1da077cf1650f3718a6dd32cf5bd7c8c06d3e5afdd26e78","sha256:9ae9896cd566c477841b61db5d7f8ef38b6db641deea83076d31e49866cbe880","sha256:9b156bb9ff45e047885a01644360f039087bb769f6e61c1b30356adf62dbd6d5","sha256:9b410a132284870ea8378717f3b953ad502730ccba91bd486d5a4df857b942a1","sha256:9bb432b95f315ad38ccf2b5d029ae1afe1d61b340dfebe43cdd0c4792d9d3ecf","sha256:9bf982d6be2f3fe12cf8a8fc07e88931c6f043efd7816124f15bcf2eccda3133","sha256:9c03e88c2dbbf373b745f6657cff928cc927c91e131608a77852039647103a01","sha256:9c4561905c2c49c24d79235dac395f9fa9a9998c1d4af3ddbd735d630838da9a","sha256:9cdff9fdda1434cf7a63aefdff8664d0d77e3cf6957b67a8b1b3475243b55c16","sha256:9dbf789631154492128574063ca2c1a3ba0f16c149d94585d0ec254134f78333","sha256:9de2ecdae99d67d44f39f5bfaaee329555a9af16c0bed308fd885e3d8a4f0160","sha256:9df9a03aaee0fa5e033980ebf659ad81d9408edc16011ff174a5d742b48f0fac","sha256:9e3b1ddd5e1cc055af6d8e4d3f7702e467d37c384b72edc97abb733d0fa1bcdd","sha256:9e87c4637490cada46cdf9212a9799b75a856a74571071640afa3dbfb3c84a9e","sha256:9f1f11b45acc43588e52b8dccf4fd7eda178afc2ccaa718e5c42d88c19bfb9cb","sha256:9f28b649fc1d683cff38145134648e5f99ab5855edeb9bcc19d3cd2a3968d603","sha256:9ffb78e7c3fed667aab3e3b1746d88f654dcf3a19cdb8b71cb704a96453acc97","sha256:a0e97bbfddbed906fc7c370d20594da13d19b1136af7cb3d7bec89ff29ed01e5","sha256:a0edf4094a96d8b2de3551d6dadc8ef9774fb1194fada1e939c2cdc9ab024e66","sha256:a18f1f1d10c4aa561b02bcc54335f350cf139d3e97e9c27d804dc33b5c373777","sha256:a1e056064e62bf93c078e3be0b3b303e0ec5882f6f22c80594bd5b4bb0fdf5f7","sha256:a29ad50438b3536ad38c0ae2bf2c55e89ed6bc19092fe249eea578f0e1049aa8","sha256:a409e44ac7dd34762e034297392d2cc7788adc5c4490457607901c9a162c5013","sha256:a4157261ec75581cb459be5251b3a72c6c81dff33f0ebac79735f75e9a6b2345","sha256:a5119da0a3a158d1e4bfced15702bc6fc5922c81eaa7e187f44a0cfa43bbc3df","sha256:a60b184b28dc2c9f1a0027125cd327a990ebbf8532698579ba8adc2e7d8e775f","sha256:a7d597ca36948152dc3742042e0868acec42a4b6b632ee9f692365d74ec11101","sha256:a7e2859057c14a89847157506275c457a5a670bd38e77478dc86450cc76b854c","sha256:a80120075979e7ea467c6c0bf4b7cf5b520bf8da77be4d194dbc85d6caa8cf40","sha256:a8292d84dd98bf3a1c7024f618f73f6e8d96fe9a3cc839b972d3d636a620186c","sha256:a87463fa4761ce298d75dc1e9d7b64e7e7efe2c72d409b9e89b473638ee552a6","sha256:a8bc7e2a322eb2d68203eb539d731b5fb9d7a99d0262cc214ce94ffba556b8f7","sha256:a9e00174f1e0fb7ee9b59602b8ac66740288cee4a4efe617c7820f96cab5ca92","sha256:aa5527c2b961aa0f9f221c9c3b492cbd8d945690856ece6e613617fe5303886f","sha256:aa90c5d9f6121cab36ea0b89b8fd9eb0d9b76c084b67b60381a8cfc5dc485f13","sha256:abae09059d872948a71df67dfd77badefdbe59ea7f21080c2363e1a813649f52","sha256:ac09193f2f0da5a188d188405ed08b060f5cf6598f80c9dfb729e475ed28aeb8","sha256:ac0e45bdc2b6e6d01cfc9a24ab082f611c9ce623174c1cb839031f5cc0862ff7","sha256:acc7826d2a52724038d452c6d3bd6090dd8ffd90b397a53099fd10a60f3d8bcf","sha256:acf067efe2cf56d2296207cb8bd9368ed63a1cdf3f88feeef3f0f331014de662","sha256:ad231026e263ad17633420251826918b3f3ef8eaaae7f9619147ed3a2cd29f80","sha256:ad23753a59b2bd4a13e93f6fa954fe88534cf20fffdbfaf5d5bf871b18857b56","sha256:ad71e702e62e14769d75b1807ba9bc9ad3ea2c5ae1d4b372e5809d81db9db77a","sha256:ade777bdc3fa8efee1e90178779207239ced446c87e340056b3fe22a121cc7ff","sha256:ae2eaa8123ca7264da7042b2fbc8e7440ad1a113621ff61b455fbd29985426be","sha256:aecd673892dfaae99aa23321007f4de8c8d71651d48a1a2fbae56a6967fe2499","sha256:af884a92a2220918aaf5decb47bb16d6cf2c23dcb1758c86816b438e69abc775","sha256:af9e9115fa6e019d35b84a55fe1c2108770f8006b224c2fa3ef4bde176ecb075","sha256:affb609d1dea9f5e5e4c1fbf1302521bb221a796e859cd8abbffaeeffc7c185f","sha256:b02374ed446cf1e914388d13fb763e86843e730dea3415deab0e3d29b3e50419","sha256:b06351b085d3494527c3871846c00d777a2119b587bd9e377a4fe5168f1bb301","sha256:b0fd9b2c4abc30fc55bc1cd872f3174e0ed9db1f29fce4618635300f3942e34a","sha256:b181080bdfefcdfe29372eca9f4e07f11e8ac06d1678e20fb0898c420597babe","sha256:b20db08569cd30b7379d65702695025f97db887eb6e9c5b129c9f944a7d2c33f","sha256:b2663e82a919697de1ee2235de4e2430143626d3f78a057d1fca7097eba46133","sha256:b315ec95a15ca898511df6ad4cbddf87b804cd7032eb8b36408b776f9cd30553","sha256:b346afc67a999a7a81b8597d97349730e3a6c5d4eae04669771a88814bede60e","sha256:b394b9a8eca9e630ee9db1bebb2cab97a0b704e059063fae80caba65d654cd9e","sha256:b3c3f4abd9508f4552c1c3f36775d5b03711721809a56438c73a22dceb417565","sha256:b3d48113553978589cdfd8b80be0a0963253a5a735837ca7f53f872c65aa6897","sha256:b4d2fc43365c290c5bbfdebbccad4f6994d71bfe8a4583ce065a3d69d010baaf","sha256:b4e1d17eb5eb1f7d1f7c5ec5ad7db088d4419479eebd7074f3d64bfcfcfbc97a","sha256:b5217ece37619d258c833ba1b864070801500dc610c48ac31c48359db337ff4f","sha256:b5cce585c07802f4c67038dd3d0cbb0addad293c1db4cf4ced8470de4546bdea","sha256:b5e68c95e94f05209f7d8db26c0722dd06886f183e86b5b3c7dedee0701b047d","sha256:b66ab7d5cf025b29dad5079b02b7ac491fe3cb80cfa6e8ec4df71a740bc42819","sha256:b6825301a57b3e541eb1adc0be393782d14cf9b47d4dfdf3011babd1a3299e38","sha256:b739974d0b0923b9458dc94656717546fcdab58273857f02ae69a76fb9150795","sha256:b77eec08165d128dfb16dee092a9cb961e33f22aa2bf283507d92def271c726a","sha256:b7ac8a8bb37a9304b2d2de1ebce4108e4d0292a187b63417a580e59123f13b1f","sha256:b81e6a28746655e32eb850eebb11ceb12b7ee3d2ed0caff518ad956406b3d3cc","sha256:ba1b4a97b88903f6465fd7941dbb6c588468b867196b8af9b7ae8041deb19922","sha256:ba72b74e07e83be4708e5dda2f51dc1fc37784042b8f4414b51258a1309aabf5","sha256:ba92e72d1d2cbfce9bd5d1af59c3a41804a3da6b467ac410cf8b09b9538a8038","sha256:bb9e14e16919ce931762d7b271ef923541bc45e7a0b88621e324265927d29b4c","sha256:bbb7849463090a1239cd2b44922e8bcc8aadbd7414a2f6fad29741d82c6d51e0","sha256:bbd57e9f35219b607c06bf64f2b3fecdea523d0901c8529832e3b62dedabd532","sha256:bcc54d3131c6c73cddbd34b60e371ffa1511420bbf0cf27c272ac434f4d0c436","sha256:bd6d1bc9bc28334829e1f77739aa834ae981a2c4c48c5949d27b1784b213a025","sha256:be0575171b4b079405dadca56cc89aceae9f587d40fa625518d7746ec7d9b6dc","sha256:bf05eab7d15f97f6e5d58032cf0acfedee711ef0d11d0f69f8340b2910d24f16","sha256:bf2ad87ba16a6d984de1483fc6a26fdd6bcbad7468e7d641046a5a334aa6dce0","sha256:bf2e99c49231df81428c6fcbceb24263a010340e1cec5e38e1634f2f236b2958","sha256:bf421d07f543c470885ef86212511b0fb9986f2a91ae8ba88554d9905fe19640","sha256:bf47c10e203ae48661100a6a8617e77d40ad2ff612d80e3e401d3b179eaa364d","sha256:bf76d62161a6f376b376d4a0a4b9f603387e2e4eef5c3138842929a5f5f6ea92","sha256:bff0d63981e7ccc2927f384c5d5870e5fe95388f7bb24da2d5fc093f1a9fd9a2","sha256:c09e4b9cfc54187e853ce1df96d5480fc2839b7d4a57b1f9b2d9f0460216c217","sha256:c0ca777de364ccb3aa32b8d572fcccb6f1b002dbdd1b0f83c4a6c630301bca94","sha256:c16ca5abbf48123293f8b777706ad85ba5bea43f806ddc3b1a6609269e356346","sha256:c20febee6c81270749318169d7fc9e93cda9fc35c4cd38ad3d6b194f75aff8d1","sha256:c2183753bd3f9486bc9c3f8d883823eda1a77599592ba31b476a2a27d17b3f68","sha256:c26cc0d2f8f0665df2f0548ab690a1e3261b9f965062a196bdfdf30194197432","sha256:c272c477ecec660a61ae6a299e95276ef9ccc6ced4f60f82cf6cab6ac4df0d37","sha256:c2858ec81b460295584b4ebacc80e08f6eaea397655e3702ba3d842519db047d","sha256:c286a7990313f7ff6fa8495b42e884bcd18f9f51eab868e85598fd45d90da595","sha256:c3e9deec44cbc37a6a9f4f6c741f84a49fdb171302a8365d0ce870409068e5a4","sha256:c3eeaa769d38da835f8f932a6457419e9cd66f166e686abe87169d1927873457","sha256:c40d979ecb9f4c2146669c046dd6a67bbf6903bd523cf821857931b836acf3d9","sha256:c441cff38db857eb0184ec788ed41d4d3e0290685a5063baccc65c2774cfbca0","sha256:c4cc1fea896df38edffa824f53d018538f8d35653122b6821fc5624a0ccfba7d","sha256:c4fe9e6712165cec485b188b105996dfd862a97d39312eff2235ed650b4b1a15","sha256:c543baa93e92a728e22215736d03fd0ce265b60d9478b969b4ce1a6e566a4474","sha256:c55c4dbc38b51a99febafe780638a3612ef83d343ca342de82d86f9a5b734a5c","sha256:c582916ff9cda33ae0cd2cbd8020601a956ffb3c07f54711e569617f7dec03bb","sha256:c7074509cbd23ada6bc7020f5ed808562a4dbca6fe61d30a6dd3c6f41b587707","sha256:c73aea89b1a1ae89dea76fe686dc6d110d8ae4954f6163047662e6c3bbbde99c","sha256:c8261194a1f034c79c337900b995b6dcf6f3de6ff01ac30e25758bd445a57071","sha256:c8273b21e6eee6b2d102ef63a1a8ccc86ff35f51018f798a092444e7bd834176","sha256:c842f97f31bb6b2d2ebcd34e3474ae5d08d547f6fd2aced655703056ca9d23fb","sha256:c861dbec3861fd331e03224a22f06ee1c4b6dc37696a05569e22be236ebfcc18","sha256:c8ff39a042129bb10bb4f49c3ae2dda0244fdf999bd72e106cfff406894be008","sha256:c996f5a31aa4d47457889d4ab83b375d2b0b573ffca0db4f0698edba7119de4b","sha256:c9dec2a1c25045f6c74c112709b06f885548d2ca5671cfa97fbc3ddf089eaa77","sha256:ca483c7d8beabebf8815433223faef666e05ced7787b492b399362f74d2c4315","sha256:ca5e551f249a8ee477b837dba2fecb54c86b7a8aa7919d57fb714d42e1a74cc0","sha256:ca8db41283dbfcaaed9b5884d65dd812ec71ff74b3c72faf2909ed1489ed8cc4","sha256:caa1dc5c08ed03b07dfcc17090bc4d9b0da1f30f5a1fcb28a01b9ba2700e9281","sha256:caae008348723f324c6848c6c2e1f37ee885812f9c260b072de53be5d954f099","sha256:cb7ad9bfe10fb17374caa6f86ce0de3a6ee41bd652390a9e31498cf6856352bf","sha256:cc2ef9343b701afcbd53db4700c96cd7771798863515b80a104954904881ab60","sha256:ccb6089676046c71ee64598daeedb394131774e426004a35e0aa059b9b5e205e","sha256:cccc9990d5b84f5200a57415ce83d4440a102c3ab3c14f2322ce056b01f37ffd","sha256:ccd41ff382752963a241622a887af9e268204af0871193eff502713bc816ae62","sha256:ccd8b471dc4c862c805c464d08d896a562c1af4232f96404affacf4f7f7a5afa","sha256:cdecbb843a4e772b40f128c40ee4c657dbe730b0f60e6a40ee311e30dd30cdf1","sha256:ce520ae89417dff65761a3a4b21820a5bface9d3155942e59678fb28756cc928","sha256:ce5eabfea9e96d6167b835d063fb987812242616d8da5551642b0ca7358017fe","sha256:cf8b8294e93fe5f98d4987f0ea541c14f5e25473aa6e464ee8fdaded51894735","sha256:cfa994e135aebc0257f83dca1c31a80a59c0770b23215c51383694fffcec3b7d","sha256:cfcc6d5f7af7a6d0e76d6b58af6adf87ddb351503be4407e02d0562778a58e07","sha256:cfd617d81efa209dc159fdb58ec865d3723ad37d89bbda4dcf1d99da34bf7c9a","sha256:d0409f8c5a64c0c607e2cd5993e4393fab4c965065734c70604a8eac4989ca92","sha256:d146b96e3b2ab497e4e1f3294100600728a3ca29fbb728b48508521ea7b340e1","sha256:d1658b719a500450f08521460f34bca97e38917acc2a248f69c30e79e68b634d","sha256:d1ebb6d4b0223e04ee8ee91502c10c3dbb69f4acd729e1baf37062d259b3f180","sha256:d2b33f7e4a7103833f5d3df87468c8ebc5b4a12484bd5332c6734e90229778be","sha256:d307dcc6846e1fb101daf1e48fa9b74ff1e16f3dd13a25c3eef6d66d9b239239","sha256:d33abec54993057f62401164d0f9d6b29cc20727f7e4e2f5051cd22aa977e991","sha256:d3c1e8b9b0236a7a774e8fafbd5347e3ab34e27f2743a6015d632312f145b5a7","sha256:d3c5c041cffe9f15ee74357bc9480e15f5e4a1c5676a6643e4f89f3b1ed8b852","sha256:d4448338a003a43b1aa1f8d1d23a44d145b405bf2f7731242a2ca5bb3ee50c4c","sha256:d4f552f94ccf5d689bcbf9c3d566925873b6ee4df55b5f1faabb02d29c671f61","sha256:d50a2b394d2c4a87248f75ad3cc53c3b68eb16284c06bd6a0bbae34660a98816","sha256:d5134ed3f053ab8784b95ed89e25880ba88f97a761331bb8aaf3b75cd12713e6","sha256:d5469b35b788085c70bf979ed6ce83d3e7d599de06c95797ca77aa5f53bfc935","sha256:d582a60c0475bb3baeed380b9c1af0e14fa53e37b3cf2d830d2fa5dc373304fc","sha256:d6c63854f7fdfd8d35c2993c18bdca4068ea579d8068959a0a950aecd07afbb7","sha256:d73ba30e8516bed74b7bd86d18a1ebcc6ef63eaf29598ae581d3504523734751","sha256:d7adb8a307c53c47ac6c9abc19190c557a61a9f9f435c7c8973963278d2298de","sha256:d815c4de86e29668c6e797de60c5683ec4698400dc96de1abda7ce97516da07b","sha256:d86c9dd43c262e859c299e29338143b40f47a30347c1ba91453a65cdc614c1e5","sha256:d8c25a1f3bae278d20a435f3c9572f851f75d989b35ac755366412ba140f18f7","sha256:d8e0cbed5f8b14c630c1728e9e357c7ee617754f54b100d03d9888b948b50db3","sha256:d98c9aac3dd1d67df675f184f38d58549beb80c66b23781ca57ac0fbc18c19dc","sha256:da27e7edb70c7dd0e9187cb77c34f2eb0306fd911dafc599dbca19679c484a28","sha256:da307f85b107f4eb31aafea4875f40e36d15e8e85329f834788e778254d28a5e","sha256:da99446bcebd4306314201d844903ba558c9e0dea4874b955920e5ff44d124ba","sha256:daa17f674ef5e06b20873248fb7155d995c4b4e2ff69fddaff4fa29dca7e6f56","sha256:db1a7fdda2127d842fd26f835f7c142bdb73b793e4206084bd45e121a1462330","sha256:dc2cd16faa4bbf1d4646e0a53ba35975478db972cb813a93c36b7dd1a696db12","sha256:dc34d642f047589ffbef19531e5e56f6d27f1a1a34e378e562a68e2ef0e975d0","sha256:dc9300dc61bb05627ee1cb37da7e02a77c24ba9009dd0e35b88668be7e92f6f1","sha256:dc9910bc0494948d94dd319db325e6702dbccb540732b96f2bbc98e9dd1ed475","sha256:dca5fc1a301f453e8be9672bb89f9b4ac7900c3e0a720dabe6dfd474949a56f3","sha256:dccc8008b091a0081d9a6528fa4efd58ba11c0441e9d9cf27ebe990015c98f83","sha256:dcd475497afae53e1a04cb9b980e927c87157eec217debbff40607cc0e353bb7","sha256:dd0c84993e9c88a625a9825b1afeaa8c825e73bf9223c83cdc97a01eb54378ed","sha256:dd862447794d980ae4a498cf549b7abf6929f2931ec6958d58f17711042a9174","sha256:ddb9782e107917fc47be25809dfc9ad48de0cfe1f77e2766df1bcebf5d98f5c4","sha256:de341d385a7ec7a82e4e2b19b52fb891ca66bc29c135d9dc97cfa3c1e06cc38f","sha256:deaad207c35def7d53f98f11bb6d7fa259cae117e63c12dc65a035101da6d2de","sha256:dec52f5809f73e582982d8ce945cce4fc7003bbe5305915c7f245fce9c0b4d48","sha256:df6a0ca391ffdade563286d56343b13e6092930e11c4c5a6065028f2dea5fdd8","sha256:e02140696b23e6a4e214049f928b03464a3fa360b4780cc9b58aa6a9336b4e3b","sha256:e051eac29aa3e71d008cbb22b1f3fb858325d3455871c7dfc1de6dd631c0ab37","sha256:e14043e9232d73797912e5bc5c9a91883e8824a7c13d80416655c17e8e64c269","sha256:e1470c1f53fc37216325ebcbb4bfb691c2464c7c3dfb8dc07faf3137f6d191eb","sha256:e1aa140443c894835fee71e6b88b00aad42be3d690d4f43d75bfd9ee8d997283","sha256:e20e6b47e0dafa1782b87f8e6edd370899153e6096c6ca616942d9ce2474f5ff","sha256:e241fe44cabcfbfef4010fdc0d54301e5c91e3cbea8d6420e52ed795bdf0f15e","sha256:e277ead77066640f660c2428227e3cd5807602e0193a618f8637e78d2450094b","sha256:e2c8cb366d0c40170bc9540a07602a943581284c03d4fdafa9680ea8489da3d8","sha256:e2e41b6ff32dd74898290543c814b9e348eb07b05a59cf42a831893a8a57f5d5","sha256:e2eb5682e1f30ec4f89a271dd1939e0d543f13d6fc1e2c947f88321a139bb2b2","sha256:e34efd2fa518bd19fbdecd44847226c5ff0a63ceb79f403279d662e147ab12fe","sha256:e3580117dc26c533faffc89ff1c3d225568321da7e1f5151d48c4ad3299e4bbd","sha256:e49c5dfcb003e40ae7d88918065b6d3a3ecdecf515b8914b88aa742f3ed7c64d","sha256:e4d73b98d4a644940194033187470a9af09057de48fa9d72fb19d80cb50e5d07","sha256:e558fc49e8163b4bdd89a4f89ba45a65297283b3f23c9f7a3ce6cfcff42483b4","sha256:e562f108f123cfb59acf04fa5a48d70f574bddc68a9e70616dd0890a952388c9","sha256:e57d95df105875788ff961f769c34721ab572748c3aa7f523f35d2ba8b60c46d","sha256:e6924c640513df88fb044eda3feec893389c1320833319271f0f904e098e11f5","sha256:e6f14bd6e93e7fbc84c9d2490867763b1b4a9f5d6cfafde947c6bd9bf769d1c2","sha256:e701462acd2ce1d34ffb4aedfc7ff2e0b11839bef3ecb3c9653a9922290719b3","sha256:e706c3de9dfa6ea681aa4cee0c7a7ea84ee9f0526bdbde7acf8dfa9dbb873c18","sha256:e7792fd0f4c7ad48b2572f670b25b718399db4874f8b1988f996caf67465dad2","sha256:e7a2abc1aab1dfc8db0f948f965a54a688745802eebc5d68e9ff1512a607dc97","sha256:e8051de8286a2530e5490ad3a6de47afb61be8b15b0bc156d262d3fbf9063358","sha256:e85ab04fb551e2ef7fb94cdf3546b5ef0686e16c2fbfeb95be142ba0566e67ca","sha256:e899714bfc815b70353133fb2999f49b88bad7ab2a26e74722d67f6640c0c77a","sha256:e92ceafd4e5af4beea7901b83f8ac8a784e9657f8f68f67b22dc7d7e4ecf524f","sha256:e9427c647b9a052017f8880fad4fae4e2c9ee169b3d5362b21a1905710c93cd0","sha256:e9922d1709154527d9fd806c5bfd5fa1a6bacefe0c3279e2fb2c38c7e2b973c8","sha256:e9e6898d6bfb65303ab88ff8dca4269defadf6290772887e4dfad648592d38e9","sha256:ea27f51a6fab9ead2e82f9c11e5662382b46760ecd9feebffbd6dc7db9b64d15","sha256:eaf829d0b1ea2fdc438bc35ab36b32257735549732682e0dddc1bc31710c4cc1","sha256:eb3d761eba3438f925f7fc5a42761dea74a0385508def2cd0e541063be960095","sha256:ec0c3b1fcbea9254125ebda0160a26fdf35cd90e60ea3f4a6448401ff91b85d9","sha256:ec4323ad3c399072e2e3549a67d8a6b58fbc5119d6df602f5270d090318cde6e","sha256:ed052a8e9fcceaa7799280dd0517e57a0d2d47e345368df370c3ff916b4b8c2c","sha256:edab18f6804472e2f2851ec26ba5abaeb25e7157c8c57ef095c38bd56ca200f2","sha256:ee7ef0142f9285617331899d0933d683e2d05e73c1c710ec789cbd2ff2576699","sha256:eea9be58fbb19bebbf323df3069af38ed1c783c5de5348b105e704c06670e71b","sha256:ef5603be36a5986e4ea4d181268e7de0577340bd690c2d2e98b02b5b5f8f5c12","sha256:ef5d36f001d3c0a94361b196e7c28344cf1f8709cbeb15596b78b32f706ca08f","sha256:ef691817a9285adf964c5f8d8ef843cde838633e0daf32b93c181ea4565d3bdd","sha256:ef6d159aa11891d213085045275cb531a6f4e39141652ad244251d47075b5084","sha256:ef9f8c8e890585b3d99b3519204f0d0d85f4f1f2c8d7f98c7b8a1c9ddc3edf5b","sha256:efa8cd4840075e818f33c90b32646475c44754bbd3541e1f512b9b9ffc8b260a","sha256:efbebdc5f5f356bfba2d41f8342ea00a9aaf3d766d66a4a06ff4fb251311dcbe","sha256:f0656cece81600ed96c9213724ca3c66d21c4c76dfff052bbcac68b9bed81300","sha256:f06c7953ffb5ba63a073822f871f3b6bce77f85c237e60ae5400efa061138da5","sha256:f089ab6568b5cd483574e058365de5dcbb3fdb51380cb2d93bf46de2f8ba9ecf","sha256:f13b36d727bb33285504e281267c8ba7fb51f83ee9051402e8e1595e186569c2","sha256:f16474bd450ebc76193328c762d34b510fb9786d071f8bd4e43d8cee214cbd61","sha256:f18aef2fb48242d138e2219fa52d6c988e9233af3f08181feb2d85254b014cdb","sha256:f2457d48f22541e8ba65bc61e838c743e3dbbfff2131297da577fb500a291b08","sha256:f2a3fd834688472f99311033c63af36d3316d3f4e58fb8d58813635ec4917516","sha256:f3c40179408698b3e988f471ec8f5b07b065c6b442933e2486bce2533ea25ef6","sha256:f46fc3e1bef4b7a2742a028e5b9eed96be7a1773319d5a2acd99c47eaeef4461","sha256:f50ce268aa12fd6ca2db263953e7729368799152932503f5dff10d7ddc94e86a","sha256:f517e999d675e4c992bf3d0968fbf6feb44d52cf49615d0b4ff25a5161ee184e","sha256:f59cabb8a5dcc96ce968c73f6294609c3429fa7c44bec1cb6f0132237b28cbf4","sha256:f5ca8e562a550e428606a44a2aa45c695cf4ec34b031ca73ac1986c6c1de25ab","sha256:f5e31846bb63c72bd030669f35b480aafbfaab62fc097ae90bda3fdedb2f26df","sha256:f695e50e4872b30bd244fa2d03676141574df1a3e6a3e2ef6c5dbaf9c6be152c","sha256:f69c725c97249c9474b06c9ab632604ed894840e86a11f9ec5076ecc2cc410d0","sha256:f6d0a80056b1a42d68102a00e8f36c8caa524ed068a0d7db9a3e78cede7b5a3a","sha256:f703e0137fd21e3b5fabb8d989669a6b29025c200c6a31bc0436281333b66c89","sha256:f83c1bed661bd5e02158b76086704c6008a3a96e9fd5279996b9cf971b5eb524","sha256:f8f9985e45c423e85902050195b078279163910ce290a735069b13896ec2cf1c","sha256:f930eca5dc964bbeb5e4ba0e855e87769a6a21896d42e6bf548ede4c51b7c980","sha256:f98bd5a06d237b94ce4501f6dd06c75ec69a94f04406ddc3b704ad79dfba6cea","sha256:fad7e16f8ce4c2fcf566bceb6ae89190e71ab80d152af90e290e6318caeae761","sha256:fb2f37d7189da55765c37467e7f7b5c1116e57df0eb74287cd069ba7669e2b74","sha256:fb86c01041be4625bc4ca2aa68564407081ff391f47a9ebcf2369758d92d1652","sha256:fbe3edb43b6a4b7f0195928978ca25d8d7378f43633c511ea3cca7a17d92910c","sha256:fda0cf9d630052b04a3521e589bb8716bd0e826b69d85407da8c0f7704c897d1","sha256:fe5d97e3122ef4f46af5c844b096cab6b0b59ebd6a5f5371300410d5aa1a0fca","sha256:fe9f54333ae4aa2740c755dd9213e758f9f45ef931f5813d288ce13c311d1fea","sha256:ff354d61b0afc37a148413ce190cb90d13f5d44ac4da70077f58eb330b9489e1","sha256:ff48ef9e44eacc19cc569982e0082bea2b34995c0eda5233048131590849082b","sha256:ff5b50c2bafe47f0fb9549b227069b793c6f4f7985a3ea9259eec7aeae6df054","sha256:ffb476776e93f90e4905f2523ff4e8902c5c0051acf6bc7bd981b1a6fab9d05c"],"f":"fluree-server-oci-partition/v1","m":["application/vnd.docker.distribution.manifest.v2+json","application/vnd.oci.image.index.v1+json"],"o":["2026-08-11T23:01:43Z","2026-08-11T23:19:21Z"],"p":["linux/amd64","linux/arm64"],"q":"docker.io/fluree/server","r":[[1,454,8,[[569,599,[1,1,1,1,1],11]]],[2,63,15,[[314,479,[2,2],0]]],[3,504,6,[[500,202,[3,3,3,3,3],6]]],[15,377,13,[[397,247,[15,15,15,15,15],3]]],[17,268,15,[[478,424,[17,17],0]]],[18,9,15,[[338,370,[18],0]]],[21,145,15,[[168,172,[21],0]]],[28,558,15,[[318,476,[28,28],0]]],[32,442,15,[[151,499,[32,32],0]]],[43,363,12,[[374,514,[43,43,43,43,43],5]]],[56,132,14,[[548,559,[56],0]]],[57,540,10,[[224,325,[57,57,57,57,57],14]]],[64,604,15,[[553,298,[64],0]]],[66,253,15,[[585,375,[66],0]]],[70,257,15,[[391,34,[70],0]]],[75,195,3,[[311,512,[75,75,75,75,75],1]]],[77,213,15,[[144,166,[77,77],0]]],[82,249,11,[[288,435,[82,82,82,82,82],10]]],[84,534,15,[]],[89,595,15,[[603,65,[89,89],0]]],[92,181,15,[[342,108,[92,92],0]]],[98,534,15,[[392,432,[98,98],0]]],[101,567,15,[[254,465,[101,101],0]]],[111,212,15,[[463,58,[111,111],0]]],[113,520,15,[[230,388,[113,113],0]]],[119,85,15,[[16,69,[119,119],0]]],[123,320,15,[[72,88,[123],0]]],[125,8,15,[[248,449,[125,125],0]]],[126,37,2,[[357,24,[126,126,126,126,126],4]]],[128,335,15,[[430,44,[128,128],0]]],[129,45,14,[[564,521,[129],0]]],[133,362,15,[[445,36,[133,133],0]]],[138,365,15,[[562,240,[138],0]]],[146,198,15,[[413,304,[146,146],0]]],[149,522,15,[[421,592,[149],0]]],[153,204,15,[[246,38,[153,153],0]]],[157,467,14,[[256,584,[157],15]]],[162,206,15,[[305,492,[162],0]]],[165,276,15,[[403,161,[165,165],0]]],[169,587,15,[[297,103,[169,169],0]]],[170,555,15,[[135,186,[170,170],0]]],[177,87,14,[[588,423,[177],0]]],[178,164,15,[[446,353,[178,178],0]]],[180,448,15,[[579,405,[180,180],0]]],[183,547,15,[[11,54,[183,183],0]]],[185,418,15,[[68,328,[185,185],0]]],[187,505,15,[[371,167,[187],0]]],[188,605,1,[[94,300,[188,188,188,188,188],8]]],[190,535,8,[[347,495,[190,190,190,190,190],11]]],[191,142,15,[[525,612,[191],0]]],[193,112,15,[[419,336,[193,193],0]]],[197,460,15,[[154,39,[197,197],0]]],[201,351,15,[[332,205,[201,201],0]]],[203,250,15,[[511,487,[203],0]]],[208,156,15,[[83,222,[208,208],0]]],[209,239,15,[[40,243,[209,209],0]]],[218,7,9,[[513,173,[218,218,218,218,218],9]]],[220,262,15,[[327,140,[220,220],0]]],[223,199,15,[[292,411,[223,223],0]]],[225,182,15,[[229,447,[225],0]]],[227,502,15,[[497,221,[227,227],0]]],[231,331,15,[[258,551,[231],0]]],[232,117,14,[[194,533,[232],15]]],[233,93,15,[[35,137,[233,233],0]]],[234,67,15,[[554,196,[234],0]]],[241,33,15,[[299,471,[241,241],0]]],[260,55,15,[[80,214,[260,260],0]]],[266,369,15,[[91,470,[266,266],0]]],[270,387,15,[[121,118,[270,270],0]]],[274,606,15,[[404,158,[274,274],0]]],[278,4,15,[[529,456,[278,278],0]]],[279,601,5,[[174,313,[279,279,279,279,279],2]]],[282,360,0,[[350,116,[282,282,282,282,282],13]]],[286,104,2,[[152,273,[286,286,286,286,286],4]]],[290,393,12,[[485,337,[290,290,290,290,290],5]]],[294,147,15,[[523,308,[294],0]]],[303,124,15,[[5,244,[303,303],0]]],[316,417,15,[[565,368,[316,316],0]]],[319,481,15,[[455,285,[319,319],0]]],[324,86,15,[[563,367,[324,324],0]]],[330,78,9,[[590,396,[330,330,330,330,330],9]]],[334,359,15,[[261,488,[334,334],0]]],[343,226,15,[[594,412,[343,343],0]]],[344,263,1,[[568,19,[344,344,344,344,344],8]]],[346,175,7,[[526,422,[346,346,346,346,346],7]]],[352,102,15,[[251,312,[352],0]]],[355,530,15,[[264,46,[355,355],0]]],[356,339,15,[[528,384,[356,356],0]]],[364,537,14,[[431,127,[364],0]]],[366,607,15,[[589,163,[366],0]]],[372,296,15,[[383,458,[372,372],0]]],[379,400,15,[[29,27,[379],0]]],[385,317,15,[[376,472,[385,385],0]]],[386,159,15,[[398,515,[386,386],0]]],[390,380,15,[[440,389,[390,390],0]]],[394,427,15,[[496,265,[394,394],0]]],[399,211,10,[[267,150,[399,399,399,399,399],14]]],[410,576,15,[[42,507,[410,410],0]]],[414,468,4,[[598,71,[414,414,414,414,414],12]]],[415,315,15,[[277,61,[415,415],0]]],[416,571,15,[[494,407,[416,416],0]]],[425,550,15,[[73,22,[425,425],0]]],[426,519,15,[[107,572,[426,426],0]]],[429,287,15,[[345,503,[429,429],0]]],[436,532,15,[[210,6,[436,436],0]]],[443,189,15,[[491,31,[443,443],0]]],[444,51,5,[[381,340,[444,444,444,444,444],2]]],[451,459,15,[[53,323,[451],0]]],[473,50,15,[[281,59,[473],0]]],[477,90,15,[[583,510,[477],0]]],[482,474,3,[[141,557,[482,482,482,482,482],1]]],[484,518,15,[[483,539,[484],0]]],[486,321,15,[[307,493,[486,486],0]]],[489,115,15,[[184,10,[489],0]]],[490,14,15,[[134,439,[490,490],0]]],[501,295,6,[[450,291,[501,501,501,501,501],6]]],[506,348,15,[[457,378,[506,506],0]]],[508,219,4,[[48,171,[508,508,508,508,508],12]]],[509,139,15,[[428,110,[509],0]]],[517,235,13,[[437,97,[517,517,517,517,517],3]]],[536,544,7,[[611,289,[536,536,536,536,536],7]]],[542,60,15,[[23,578,[542,542],0]]],[546,349,15,[[341,236,[546,546],0]]],[549,597,15,[[269,469,[549],0]]],[552,238,15,[[329,582,[552,552],0]]],[560,531,15,[[242,461,[560,560],0]]],[561,160,15,[[309,524,[561],0]]],[566,580,15,[[610,109,[566,566],0]]],[570,106,15,[[361,12,[570],0]]],[573,252,15,[[25,354,[573,573],0]]],[575,99,0,[[26,52,[575,575,575,575,575],13]]],[577,306,15,[[401,593,[577],0]]],[581,302,15,[[122,245,[581,581],0]]],[586,131,15,[[176,216,[586,586],0]]],[596,148,15,[[541,310,[596,596],0]]],[600,516,15,[[556,283,[600],0]]],[609,105,11,[[255,462,[609,609,609,609,609],10]]]],"s":[[["https://slsa.dev/provenance/v0.2"],["https://slsa.dev/provenance/v0.2"],[],[],[],[],[],[],[],[],[]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.0"],["tag"],["587c8623310aee9ef14a9c8d964480b58b3337d8"],["https://github.com/fluree/db"],["587c8623310aee9ef14a9c8d964480b58b3337d8"],[],[false],["https://github.com/fluree/db/actions/runs/24803050132"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.1"],["tag"],["717ecd480758cdfe7ae99e05678e057e30cc0b02"],["https://github.com/fluree/db"],["717ecd480758cdfe7ae99e05678e057e30cc0b02"],[],[false],["https://github.com/fluree/db/actions/runs/24830493186"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.2"],["tag"],["efa05951155f2064fc8414206482036bc2458243"],["https://github.com/fluree/db"],["efa05951155f2064fc8414206482036bc2458243"],[],[false],["https://github.com/fluree/db/actions/runs/25120772066"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.3"],["tag"],["544da2a9deda653bbb25302d10260a7e4350a057"],["https://github.com/fluree/db"],["544da2a9deda653bbb25302d10260a7e4350a057"],[],[false],["https://github.com/fluree/db/actions/runs/25518637357"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.4"],["tag"],["e8596cc7187f9c2e03ed37b510f216a63cddb60a"],["https://github.com/fluree/db"],["e8596cc7187f9c2e03ed37b510f216a63cddb60a"],[],[false],["https://github.com/fluree/db/actions/runs/26478576543"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.5"],["tag"],["9fd0135b4fc6d1f7c9a7bd1267294f5e131a17b1"],["https://github.com/fluree/db"],["9fd0135b4fc6d1f7c9a7bd1267294f5e131a17b1"],[],[false],["https://github.com/fluree/db/actions/runs/26953964782"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.6"],["tag"],["a600e0d33ea9e122f49633889ff791574aaa8120"],["https://github.com/fluree/db"],["a600e0d33ea9e122f49633889ff791574aaa8120"],[],[false],["https://github.com/fluree/db/actions/runs/27417480590"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.0.7"],["tag"],["478dde21bebc40da794b6a979a958203702c6c1b"],["https://github.com/fluree/db"],["478dde21bebc40da794b6a979a958203702c6c1b"],[],[false],["https://github.com/fluree/db/actions/runs/27637916800"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.0"],["tag"],["d0f7ba5b2b674c93e5bde18a1fea5dc3b489fdd2"],["https://github.com/fluree/db"],["d0f7ba5b2b674c93e5bde18a1fea5dc3b489fdd2"],[],[false],["https://github.com/fluree/db/actions/runs/28029439937"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.1"],["tag"],["d7f85144faee8ed52df6b90c91a0145a0899fe15"],["https://github.com/fluree/db"],["d7f85144faee8ed52df6b90c91a0145a0899fe15"],[],[false],["https://github.com/fluree/db/actions/runs/28411176626"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.2"],["tag"],["c11b828b11a0df9a33b79011e654285d661a1127"],["https://github.com/fluree/db"],["c11b828b11a0df9a33b79011e654285d661a1127"],[],[false],["https://github.com/fluree/db/actions/runs/29097004308"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.3"],["tag"],["7145a38883b317285123778e23f699f4dffb12a6"],["https://github.com/fluree/db"],["7145a38883b317285123778e23f699f4dffb12a6"],[],[false],["https://github.com/fluree/db/actions/runs/29784685033"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.4"],["tag"],["07316fa440548247e8985215b8151965d2c72726"],["https://github.com/fluree/db"],["07316fa440548247e8985215b8151965d2c72726"],[],[false],["https://github.com/fluree/db/actions/runs/29977323901"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],["fluree/db"],["refs/tags/v4.1.5"],["tag"],["d767927dae550a6ecde8f15603ad9c195de60351"],["https://github.com/fluree/db"],["d767927dae550a6ecde8f15603ad9c195de60351"],[],[false],["https://github.com/fluree/db/actions/runs/31437217831"]],[["https://slsa.dev/provenance/v1"],["https://slsa.dev/provenance/v1"],[],[],[],[],["git@github.com:fluree/db.git"],["e19eb955efe6361358d7224db45215bd6ce51ed6"],[],[false],[""]]],"t":[[["60829de035c4996369f7dbe0766b80db0e743a8b"],0,1,[[0,162],[1,123]],[[72,123],[305,162]]],[["189201d41aff911a5176b80465de58bdb0986962"],13,1,[[0,436],[1,506]],[[210,436],[457,506]]],[["fe422559bd9229e52ba04fc05694a0060c0fd129"],20,1,[[0,596],[1,385]],[[376,385],[541,596]]],[["99340881df64ec11bca0907641db42f96c08cab1"],30,1,[[0,324],[1,193]],[[419,193],[563,324]]],[["4.0.2"],41,1,[[0,15],[1,517]],[[397,15],[437,517]]],[["4.0.5"],47,1,[[0,501],[1,3]],[[500,3],[450,501]]],[["7cc3f8bb106c88683e83bc83da973c29320510c8"],49,1,[[0,416],[1,386]],[[398,386],[494,416]]],[["d3f3773921b9c93772817f417b016103edde9de2"],62,1,[[0,92],[1,316]],[[342,92],[565,316]]],[["9079322dff5e32d120d1381a4279f7fcbf21176d"],74,1,[[0,319],[1,133]],[[445,133],[455,319]]],[["86f6690a13c3409fa42074a3bb0f85a42ae04464"],76,1,[[0,180],[1,581]],[[579,180],[122,581]]],[["dcb12860d69476a7e0bb0110acb630f3d84212ab"],79,1,[[0,443],[1,223]],[[292,223],[491,443]]],[["5839ffe273062b8da972b120deb54dd62e7c3d1f"],81,1,[[0,426],[1,274]],[[404,274],[107,426]]],[["stable"],84,0,[[0,84]],[]],[["1255693fab0723b1cf29efda3050a9cb6e76d4ed"],95,1,[[0,573],[1,113]],[[230,113],[25,573]]],[["7cbb2becad87fe5f1fb37596cba4d87cf0ea7d63"],96,1,[[0,560],[1,153]],[[246,153],[242,560]]],[["89a0f228bb53961effd9143fddc8896c2617da87"],100,1,[[0,185],[1,415]],[[68,185],[277,415]]],[["c2a0f5f55927cf293a7bb691bfe14fd81ffbd3ba"],114,1,[[0,509],[1,352]],[[251,352],[428,509]]],[["df9c83ca64aa5c711347231f82b16dcbf58d8949"],120,1,[[0,119],[1,183]],[[16,119],[11,183]]],[["ff8dd970b4b07363ec5c5f2c0ff62c1c5917c691"],130,1,[[0,2],[1,197]],[[314,2],[154,197]]],[["4.1.2"],136,1,[[0,1],[1,190]],[[569,1],[347,190]]],[["4.0.6-hotfix.1"],143,1,[[0,177],[1,364]],[[588,177],[431,364]]],[["7ca39f4b5c5c31602b44873cc19d313d33a99382"],155,1,[[0,241],[1,586]],[[299,241],[176,586]]],[["hotfix-1ffefe432db25a3c8df29f1e01e79ab02abc86cf"],179,1,[[0,170],[1,490]],[[135,170],[134,490]]],[["v3.0.0-alpha2"],192,1,[[0,473],[1,366]],[[589,366],[281,473]]],[["39b98914dfa2782cff8d720a2ed39126681bdee1"],200,1,[[0,208],[1,111]],[[463,111],[83,208]]],[["nexus-public-preview"],207,1,[[0,577],[1,149]],[[421,149],[401,577]]],[["4.0.0"],215,1,[[0,482],[1,75]],[[311,75],[141,482]]],[["d5eb31b1c2be560a92a30176dc8b0e01973859ea"],217,1,[[0,234],[1,570]],[[554,234],[361,570]]],[["a9ea752cc4bf3f6af3ffdd4a08fd836c91801880"],228,1,[[0,233],[1,28]],[[318,28],[35,233]]],[["4.0.6-hotfix.3"],237,1,[[0,56],[1,129]],[[548,56],[564,129]]],[["98a2e3637d0c0119f12b456c925a4eb537283834"],259,1,[[0,552],[1,278]],[[529,278],[329,552]]],[["4.0","4.0.7"],271,1,[[0,344],[1,188]],[[94,188],[568,344]]],[["23f5f5d304f9113c6c8c391aa158c6c129ec86af"],272,1,[[0,410],[1,220]],[[327,220],[42,410]]],[["3c1c41e2ea0201a651775cb55306d10b0a485ceb"],275,1,[[0,89],[1,425]],[[603,89],[73,425]]],[["b7e47ab400d98a2c04d65da8a43a9afbe46a0a0e"],280,1,[[0,546],[1,201]],[[332,201],[341,546]]],[["4","4.1","4.1.5","latest"],284,1,[[0,399],[1,57]],[[224,57],[267,399]]],[["v3.0.0-alpha3"],293,1,[[0,477],[1,231]],[[258,231],[583,477]]],[["af9503ba45e4d506402934b884b07fd2266081b3"],301,1,[[0,372],[1,343]],[[594,343],[383,372]]],[["0d411e4b2c4f1269dc538c65072fd479db9e2e64"],322,1,[[0,270],[1,260]],[[80,260],[121,270]]],[["5f5ead9cbfbe25bf10f05a92f517cc0f392c0694"],326,1,[[0,334],[1,486]],[[261,334],[307,486]]],[["v0.1.0-citest2"],333,1,[[0,549],[1,294]],[[523,294],[269,549]]],[["824e76db98a606cb1feedb01e572a687238de9bf"],358,1,[[0,227],[1,566]],[[497,227],[610,566]]],[["4.1.0"],373,1,[[0,330],[1,218]],[[513,218],[590,330]]],[["3.0.0-rc1"],382,1,[[0,561],[1,64]],[[553,64],[309,561]]],[["v0.1.0-citest4"],395,1,[[0,600],[1,484]],[[483,484],[556,600]]],[["a796f10e048ecdeb3d18109744ac63337bcb211e"],402,1,[[0,390],[1,355]],[[264,355],[440,390]]],[["llm-internal-beta"],406,1,[[0,138],[1,225]],[[562,138],[229,225]]],[["298c0ba51ad44420b48e6cc64b113ddad45f7a95"],408,1,[[0,165],[1,542]],[[403,165],[23,542]]],[["1ffefe432db25a3c8df29f1e01e79ab02abc86cf"],409,1,[[0,266],[1,32]],[[151,32],[91,266]]],[["24f7b318dac1c9a2d0a4d0478495d86bdc6ef2ca"],420,1,[[0,429],[1,303]],[[5,303],[345,429]]],[["3.0.0-alpha-1"],433,1,[[0,191],[1,379]],[[525,191],[29,379]]],[["c452631c50b8f8e595d486240dab503bbaad6033"],434,1,[[0,18],[1,21]],[[338,18],[168,21]]],[["f8257cf514d53e9abd0a4abddabf38561d02c79e"],438,1,[[0,66],[1,489]],[[585,66],[184,489]]],[["4.0.4"],441,1,[[0,43],[1,290]],[[374,43],[485,290]]],[["7f125ccae182d4df5b1850ee64301291cf414954"],452,1,[[0,209],[1,356]],[[40,209],[528,356]]],[["4.0.3"],453,1,[[0,126],[1,286]],[[357,126],[152,286]]],[["57e7a86ad0bd06d58c8ca0705e0c70239bc4b231"],464,1,[[0,128],[1,17]],[[478,17],[430,128]]],[["v0.1.0-citest5"],466,1,[[0,203],[1,451]],[[511,203],[53,451]]],[["4.1.3"],475,1,[[0,508],[1,414]],[[598,414],[48,508]]],[["4.1.1"],480,1,[[0,82],[1,609]],[[288,82],[255,609]]],[["4.0.1"],498,1,[[0,279],[1,444]],[[174,279],[381,444]]],[["v0.1.0-citest"],527,1,[[0,187],[1,70]],[[391,70],[371,187]]],[["b014577265130b7a500ab0943fc67870db0f9b2b"],538,1,[[0,178],[1,77]],[[144,77],[446,178]]],[["4.1.4"],543,1,[[0,282],[1,575]],[[350,282],[26,575]]],[["4.0.6-hotfix.2"],545,1,[[0,157],[1,232]],[[256,157],[194,232]]],[["6787e857beb33af95667f5e103f72c37b2f92884"],574,1,[[0,146],[1,125]],[[248,125],[413,146]]],[["4.0.6"],591,1,[[0,536],[1,346]],[[526,346],[611,536]]],[["5c5f385c840dfa54dc1f85706cc5e98fa98f91f8"],602,1,[[0,101],[1,169]],[[254,101],[297,169]]],[["df51739cf942d67f17331963a895fb097cbced5e"],608,1,[[0,98],[1,394]],[[392,98],[496,394]]]]}
```

The canonical serializer is `LC_ALL=C jq -S -c -j .` over UTF-8, with
no BOM, insignificant whitespace, or trailing LF. The resulting body is 62,090
bytes and has SHA-256
`6653faaba99a2c4ee88866618f9656078c834c3186d7dc9666c0dc6fed2ac47d`.
Its self-check totals are 613 unique digests, two media types, two platforms, 69
target rows, 73 aliases, 68 index media-type rows, one direct-manifest row, 137
runnable references and unique runnable manifests, 136 attestation relations,
137 runnable/config records, 136 unique config blobs, 136 statement records,
320 statement-subject entries with duplicates preserved, 16 unique config-fact
rows, and 16 unique statement-fact rows. Every attestation relation resolves to
one runnable under the same target, and every statement has at least one
subject digest equal to its related runnable manifest.

Applying the exact provenance and tag/commit join defined below to this ledger
produces exactly the 28 manifests in the grouped `U` payload and no others.
The remaining 109 runnable manifests lack a complete exact provenance join;
there is no complete claim whose tag peels to a different commit. All 16
statement-fact rows encode `reproducible` as absent `[]`, while
`resolvedDependencies` is either absent `[]` or present false
`[false]`. The ledger therefore verifies the current
`missing_provenance=109` and `reproducibility_failed=0` partitions without
consulting the registry's current mutable tag state, while preserving the facts
needed for a future positive reproducibility gate.

`U` contained 28 platform tuples across 14 upstream tags and 14 OCI indexes.
The tuple ledger had SHA-256
`aa8a68414b1b5913df4f9ec15a3c9c24dadeb24bc15f433bc9ef74cb2947c5a3`,
and the tag-target-object receipt had SHA-256
`d05995fe3e8435e1253ffd08bebac9257a1bf97652131fc91dbeccf7b5c18340`.
The exact `I` classification was
`{"live_failed":0,"missing_provenance":109,"numeric_t":24,"qualified":0,"reproducibility_failed":0,"tag_commit_mismatch":0,"wire_incompatible":4}`
with SHA-256
`ac0e1427dea5f746ef4370a4f3dfe4d275c5d1c6a653b6a426c3d7b62c37906f`.
The exact `U` classification was
`{"live_failed":0,"missing_provenance":0,"numeric_t":24,"qualified":0,"reproducibility_failed":0,"tag_commit_mismatch":0,"wire_incompatible":4}`
with SHA-256
`0e38d9af3bab04fed28bfbd9b20f89de01f54be810995befe73719848dc6490a`.
Every `I` and `U` record was classified exactly once.

The archive-safe grouped `U` payload uses the exact pipe-delimited schema
`tag|commit|index|amd64|arm64|class`. Each row represents exactly two
platform tuples: `(tag,commit,index,linux/amd64,amd64,class)` and
`(tag,commit,index,linux/arm64,arm64,class)`.

```text
v4.0.0|587c8623310aee9ef14a9c8d964480b58b3337d8|sha256:5bad432c37f1b0842125da453b3213e1d9a86ad9f0f7e57adcad9fbc24926f20|sha256:ccd8b471dc4c862c805c464d08d896a562c1af4232f96404affacf4f7f7a5afa|sha256:1f64b631dc822d8c8a83e0621a6662dbde2d925a84ba52865e28dbcb181681b2|wire_incompatible
v4.0.1|717ecd480758cdfe7ae99e05678e057e30cc0b02|sha256:d3c5c041cffe9f15ee74357bc9480e15f5e4a1c5676a6643e4f89f3b1ed8b852|sha256:7bfd82983d79ea2159391129264c718f3a3159f66631038f91b2c2e33d27bc2a|sha256:bff0d63981e7ccc2927f384c5d5870e5fe95388f7bb24da2d5fc093f1a9fd9a2|wire_incompatible
v4.0.2|efa05951155f2064fc8414206482036bc2458243|sha256:11704e92927dd6a0acc3b3d555c231f8a8beca316333ca439a145f188f484e65|sha256:04c7c7b0557e21f94a6bf20a0a657a2eb02d8d13ea3c7b3166d685487243561e|sha256:db1a7fdda2127d842fd26f835f7c142bdb73b793e4206084bd45e121a1462330|numeric_t
v4.0.3|544da2a9deda653bbb25302d10260a7e4350a057|sha256:c286a7990313f7ff6fa8495b42e884bcd18f9f51eab868e85598fd45d90da595|sha256:373f3f37772ba87afaa727db7970a3d98aeb09bcb9efcc04cdb68dbebb32bb49|sha256:7fbcf51955bb95be1fc59adbd693b9cc760a8ce5d5803b13098367c3283f9619|numeric_t
v4.0.4|e8596cc7187f9c2e03ed37b510f216a63cddb60a|sha256:bf421d07f543c470885ef86212511b0fb9986f2a91ae8ba88554d9905fe19640|sha256:1181b237524ccdfb091a4a3c88708c6573aa77b5508c2070551d84fb91ae7656|sha256:816df9c84e65d9b3d834f5c73eb60800377d68fa8f73dd10dc333184c565ad3d|numeric_t
v4.0.5|9fd0135b4fc6d1f7c9a7bd1267294f5e131a17b1|sha256:11fb759286abdc4145451b38a1009aa68bfb38f47c16adb70535d06fd88fa08f|sha256:d50a2b394d2c4a87248f75ad3cc53c3b68eb16284c06bd6a0bbae34660a98816|sha256:01215227e9496f7a7a3887a3ab89c2431bcfdde7e94fc39917ddd044c07b2d82|numeric_t
v4.0.6|a600e0d33ea9e122f49633889ff791574aaa8120|sha256:f59cabb8a5dcc96ce968c73f6294609c3429fa7c44bec1cb6f0132237b28cbf4|sha256:e1aa140443c894835fee71e6b88b00aad42be3d690d4f43d75bfd9ee8d997283|sha256:949aaa5543f88569de5530dba043e27290fbaca5c324da8e742f1169e18d517c|numeric_t
v4.0.7|478dde21bebc40da794b6a979a958203702c6c1b|sha256:7872e79bdf4cf6ce937a3106f4e8e07855309f36d152b80c174b449471b476ff|sha256:93cd80619a1607682adc2652ce754bd0e243196b266f0d33831516311a6c6cc4|sha256:53b1cbeeaa45ff11d94a05af93b466a04ccc35b68bcf9c50dd59d7353a8ce967|numeric_t
v4.1.0|d0f7ba5b2b674c93e5bde18a1fea5dc3b489fdd2|sha256:9f28b649fc1d683cff38145134648e5f99ab5855edeb9bcc19d3cd2a3968d603|sha256:8f45419ea1e4d23a653e000e35746d86cc5d19bc033c937c447149c8f25e6ff8|sha256:5be926c85110dc04b95717ee64d727d33b16e8ebc6cee262ea2073fbe51be772|numeric_t
v4.1.1|d7f85144faee8ed52df6b90c91a0145a0899fe15|sha256:cccc9990d5b84f5200a57415ce83d4440a102c3ab3c14f2322ce056b01f37ffd|sha256:227ce7d523f9dea73a5cbde7545b6c113d77d07f37b98e8cb4f7533d75c3ade6|sha256:ff354d61b0afc37a148413ce190cb90d13f5d44ac4da70077f58eb330b9489e1|numeric_t
v4.1.2|c11b828b11a0df9a33b79011e654285d661a1127|sha256:3e6eb6bd0c4aab5116ce73e65d77bd2dd164b6bec956ef9d73cb6ce420ad3898|sha256:00543ab67676cc25577deeffd4f5f3809c21bf678ba94054100cc40930d8409c|sha256:53e0286e3773bfbd82fbed3479650bbd6d4043c028ebe0d857eec809dd390ae5|numeric_t
v4.1.3|7145a38883b317285123778e23f699f4dffb12a6|sha256:caa1dc5c08ed03b07dfcc17090bc4d9b0da1f30f5a1fcb28a01b9ba2700e9281|sha256:d815c4de86e29668c6e797de60c5683ec4698400dc96de1abda7ce97516da07b|sha256:b346afc67a999a7a81b8597d97349730e3a6c5d4eae04669771a88814bede60e|numeric_t
v4.1.4|07316fa440548247e8985215b8151965d2c72726|sha256:e34efd2fa518bd19fbdecd44847226c5ff0a63ceb79f403279d662e147ab12fe|sha256:7d92dc1fd1c75999c24d2f0b9b8426f6079ba34156d34764bb8c3878a2260ece|sha256:ef6d159aa11891d213085045275cb531a6f4e39141652ad244251d47075b5084|numeric_t
v4.1.5|d767927dae550a6ecde8f15603ad9c195de60351|sha256:7f4c34a1c2ac189ccff3bac93c54e264a05b7ca5d05fbe5ee5656ac1cff19d44|sha256:ad23753a59b2bd4a13e93f6fa954fe88534cf20fffdbfaf5d5bf871b18857b56|sha256:15f03e04e3fb44d09a110a887789bfebeed3b9a5602b4fc2996bdea39ca05bca|numeric_t
```

The canonical grouped-`U` serializer is
`jq -Rn -S -c -j '[inputs | split("|") | {tag:.[0],commit:.[1],index:.[2],amd64:.[3],arm64:.[4],class:.[5]}] | sort_by(.tag)'`.
It emits UTF-8 JSON with recursively bytewise-sorted object keys, rows sorted by
`tag`, no insignificant whitespace, and no trailing LF. The result is 4,707
bytes and has SHA-256
`aa8a68414b1b5913df4f9ec15a3c9c24dadeb24bc15f433bc9ef74cb2947c5a3`.
Because this grouped ledger is record-oriented, admitting the empty
`reproducibility_failed` bucket changes the aggregate `U` classification
body and hash above but does not change any grouped row or this payload hash.

The archive-safe compact `I` ledger is a JSON object whose seven required
classification keys map to bytewise-sorted arrays of unique runnable manifest
digests. The arrays are pairwise disjoint and their lengths are respectively
`0,109,24,0,0,0,4` in serialized key order, covering all 137 members exactly
once.

```json
{"live_failed":[],"missing_provenance":["sha256:00c1fa11eb6e4844235d8286227a9fd33625ce72fcb77eebe7253a7cddbd1f8a","sha256:0535d85ac0942e5b9416d8bde61d0e71eea0c2705c98f6e2511e9e4256cc7ee8","sha256:054213771f811e4c6b70bf5b89ea54945305fa0d7ed4e934e229e42391f936e2","sha256:05c5f12b2f11f27a723a4ad9198357cc90a77f9e544069d7f528251e2636821b","sha256:0bdf80afaf9191cf60c80bbb84c0b4f83aca8e2ccc806006af2a0558ef275635","sha256:0d63baf4746ae5682d53c0faed44c7817114472811013bdbd002912c9b8d9677","sha256:15ad2ca953da53227c78ba02db215f9637cd819f97391de35e81cb3e7d961e6c","sha256:198059e33ea1228cd920f63cb04439bd6dd2236f3fd78439ce0161900b814aad","sha256:1bd02cec3300f0ee4c6a2d500f0fd81ebc99493e8b6f808122c3b1ed61fa4ab8","sha256:1d9b443e730a603b7409726412544fa892623727636e21761d441587090880bd","sha256:20b46d7f4d8f36aa33851a80192c6b876394570b2823a77dd405f1dd330fdf83","sha256:238decbc5c7f41026c8a14a03246aa8e13bf8da091e989de9185f90aed8f5444","sha256:277d00d033a2d39a3d1ff236d2d71803090d65b888f6e710eddbb03af0515ec2","sha256:288f704d569b61ef5c8f8ee5acab7dd418c1a0b25e984fffdbb08e22639fc1e5","sha256:2a217951f1e5a6ef491ffd674960ec4b3f1dac11b67c48fd8f654dc9a2e12b25","sha256:2bf681519453aceae5c111898fab79c09f77a365629fe40a7cf3a538e3ad4a8a","sha256:3041397e0e02b9f44e3457f59685331ea8d2d1157629e39778ce1e1950a36ccd","sha256:30af2e286bf12e6e00722b5a515c990783dd41db5c7ddf75d01c51504a910397","sha256:33027253595607564d29757f4b1fab7bad196d224609d78d2fab5f3975d5eed2","sha256:349d4ddf7ef8b2ff56889633a99781c96238d485c852a0551d8237d88d00b6de","sha256:366562fb6816078666427d72be7713896ba809f3214e3b903169c75e5dbb1d12","sha256:385975a53a6e82493c4502e2eae61bf101ffee337689c20fb4794174bb980a9b","sha256:398e7a6828b9bdca7fee6990058307fef9fa6512947c1ed980e91512b847a9cb","sha256:3b7fdc12b841d1764a7d96f960c12a8438ed539861a7ac3fc6bdf4d3f2b8c49e","sha256:3f60f5b96c7a4b8e75b7a837bb6f494aa210b72e6640c4aff5220ee67c3b6bb5","sha256:413d9ea7673ae9ed000b0a211a72cbf4b5b05182fbba463f7597c9452abb0555","sha256:423c2ce21a357e1041944b48acaf347dd5f498babab82da852b581a141e962e7","sha256:43531134582944fde938b89def79c7dfe6595967d767d3e14038d07e301c71f8","sha256:445ada1d36df781a756788a07155ce6114f4f0a18c598a55113ce49433a580c5","sha256:45379892326dfa912fd39b3b6a38eb51bea0ead743f3565d316632f0410d69c1","sha256:472b4223620521f9744aa06276392641c96f4556362623e6737fc769d52f9003","sha256:499ef470b33668cf6f022f948ced8d95778c9cf4e6bcd3111f096b9f67c7fbbb","sha256:4a6cc28a08b34700b3917f2fb8642b433166f1dacc51248bab4d8a2b0024ff36","sha256:4fa68c4600f72e5a831fe35496c3a3f07e751a55387e4e9167b06bb171259fe1","sha256:4ff43d1d543e52f3bf14c31aa69802fcdf7ef157ae3d6126ecc9a4aed7658943","sha256:5107412f185c79e8a9b195cbdd66fe562fa0785b8a1962730fef294320fc096f","sha256:52817d9372255d2eb568a2f061e1daab9d928d7eca609aea84c94bd9c216d895","sha256:5356d1f4fc661c4da91a4eaa7680897793ca3c9541db5f8a799b3489a574c2bf","sha256:539ac0fb63bb0f01a394af5340b8656be749f9a84a0bf8d6ed9d7c18074ceb32","sha256:53eeb25295d848695f0c4f2fd2ddd0e85234938a975db4694ac42a45d2eef36f","sha256:5488cc294aa254917a151e5dbe46988b24d593c4e4fdef32831c82fa79228eaa","sha256:55a43a107190d9336e4a0f8983e3da4f13fd153b7139ebf506c1e1da2dfa4a42","sha256:56f015811e5f4e91ed83db1f8d2b94282fabca7c9f7db3a91fa3f3b0e83c0f03","sha256:58176448ddd75f035fe4808752e18a58b615cbddd15663bb90f31319207561f9","sha256:591dc4d1f4a431ab1511294162e886b97a709b3c679f3ea645f4cfcd7159b86a","sha256:5928b83a70f74e67ab0982f31aa17bfbf5ef295218dbc323b1a13a4485f71ae5","sha256:5d437f66e9612803d9596a9963975a45902baf5825fd7abcb99823208de0a881","sha256:5f699010ce1b5ff84bbdb7eff8948999a3d9a656cb32fbd4a9fa006bd50d98b8","sha256:6043c917d1123c9afd471faf955e05a53929339783af22318a14551d7e2a0efe","sha256:60a161bfaeabaa4349fabeb6dc06638c6b818709e1b73e25cdf65b2104271d37","sha256:62f05a868d36cb8eb8d0620bae268d3e1fa4a5e5b179e63f27207f285273ef1b","sha256:636be6d8111f9b86c1a86aa0a8e24cdb1f2173ce5abbe146f5676ccdea67db20","sha256:63f2c26332b3b31ab7fd92137c1aa101a6a025b901ad6522b367844ba3fcec3b","sha256:64d9e1bdfbb7e4bfee3991c4e9db38effd265dc8fe10c14c633085dc2e0eea75","sha256:693e680dd1f9cadbbd48bab74328b7b1c51c2c46a66a12b6c503dad625fdae68","sha256:723e7fc0110bb5aa4fbb20b6993554399a8ef8a697e6f8e511ddfb7a3f803790","sha256:74bd0581477cab4387324ef989f00472666e9b1d7a6baa88006ea06f8cb3a022","sha256:78308ba5ea8699fdbe6a301415385ff74c6b0f3179cea9f5cdc238e60f2a7c4a","sha256:79a3fbeb0f3bae0524d9740e9a235b91464c59a202f197ec62bfa85cc54c0c21","sha256:7b3e7cb6e1c006522476e963fad8546b232be36fc8f0476f34b7c328a78ea969","sha256:8265fcb724c0e5e63ac4d9d4274552c5b56bc9450d6aa3da4dd0bcbabb349ba5","sha256:83d58f10916c3fb70d6935bb957679fa5c7efc876e77b8f6e342825fb28815e5","sha256:87b2a1a19df288959612d314eb471022388fc8a6d25fb088b10aa87a8d24ad44","sha256:89de65a79a2bc86de44cffa125c34426fe3efdc36a46ff112d776bfafc62b6ff","sha256:8c9900a26c16233bcad3187549979e4b9b508699857555b4beb873994b267014","sha256:906236cc5fbbd66f976dd15a8d1fd63cfe0ee8f1b1130b337ccf103cfb5001dc","sha256:93379c88f82244a0c2e5b6d37cb3a214e99b3b86a07f4dffc8b41ab6ec4e785c","sha256:96f613b0bf956cc977cbd1267b60c83f3a01d5cd7f6c7869b400d630bea76764","sha256:98c3cc61392d27fabc2ec60512aca15594ae683fcb2f14b4d4fff2a170182f09","sha256:993334c40e401d6791496b87b757b3f96b41059464b13c8c3bc8baa09298054a","sha256:9c03e88c2dbbf373b745f6657cff928cc927c91e131608a77852039647103a01","sha256:9cdff9fdda1434cf7a63aefdff8664d0d77e3cf6957b67a8b1b3475243b55c16","sha256:9f1f11b45acc43588e52b8dccf4fd7eda178afc2ccaa718e5c42d88c19bfb9cb","sha256:a29ad50438b3536ad38c0ae2bf2c55e89ed6bc19092fe249eea578f0e1049aa8","sha256:a7e2859057c14a89847157506275c457a5a670bd38e77478dc86450cc76b854c","sha256:a80120075979e7ea467c6c0bf4b7cf5b520bf8da77be4d194dbc85d6caa8cf40","sha256:a9e00174f1e0fb7ee9b59602b8ac66740288cee4a4efe617c7820f96cab5ca92","sha256:ac09193f2f0da5a188d188405ed08b060f5cf6598f80c9dfb729e475ed28aeb8","sha256:b181080bdfefcdfe29372eca9f4e07f11e8ac06d1678e20fb0898c420597babe","sha256:b394b9a8eca9e630ee9db1bebb2cab97a0b704e059063fae80caba65d654cd9e","sha256:b3c3f4abd9508f4552c1c3f36775d5b03711721809a56438c73a22dceb417565","sha256:b739974d0b0923b9458dc94656717546fcdab58273857f02ae69a76fb9150795","sha256:b77eec08165d128dfb16dee092a9cb961e33f22aa2bf283507d92def271c726a","sha256:ba1b4a97b88903f6465fd7941dbb6c588468b867196b8af9b7ae8041deb19922","sha256:bd6d1bc9bc28334829e1f77739aa834ae981a2c4c48c5949d27b1784b213a025","sha256:bf76d62161a6f376b376d4a0a4b9f603387e2e4eef5c3138842929a5f5f6ea92","sha256:c272c477ecec660a61ae6a299e95276ef9ccc6ced4f60f82cf6cab6ac4df0d37","sha256:ca5e551f249a8ee477b837dba2fecb54c86b7a8aa7919d57fb714d42e1a74cc0","sha256:cb7ad9bfe10fb17374caa6f86ce0de3a6ee41bd652390a9e31498cf6856352bf","sha256:ce520ae89417dff65761a3a4b21820a5bface9d3155942e59678fb28756cc928","sha256:cf8b8294e93fe5f98d4987f0ea541c14f5e25473aa6e464ee8fdaded51894735","sha256:cfd617d81efa209dc159fdb58ec865d3723ad37d89bbda4dcf1d99da34bf7c9a","sha256:d0409f8c5a64c0c607e2cd5993e4393fab4c965065734c70604a8eac4989ca92","sha256:d73ba30e8516bed74b7bd86d18a1ebcc6ef63eaf29598ae581d3504523734751","sha256:d86c9dd43c262e859c299e29338143b40f47a30347c1ba91453a65cdc614c1e5","sha256:e2eb5682e1f30ec4f89a271dd1939e0d543f13d6fc1e2c947f88321a139bb2b2","sha256:e4d73b98d4a644940194033187470a9af09057de48fa9d72fb19d80cb50e5d07","sha256:e57d95df105875788ff961f769c34721ab572748c3aa7f523f35d2ba8b60c46d","sha256:e701462acd2ce1d34ffb4aedfc7ff2e0b11839bef3ecb3c9653a9922290719b3","sha256:e9427c647b9a052017f8880fad4fae4e2c9ee169b3d5362b21a1905710c93cd0","sha256:e9922d1709154527d9fd806c5bfd5fa1a6bacefe0c3279e2fb2c38c7e2b973c8","sha256:ec0c3b1fcbea9254125ebda0160a26fdf35cd90e60ea3f4a6448401ff91b85d9","sha256:ee7ef0142f9285617331899d0933d683e2d05e73c1c710ec789cbd2ff2576699","sha256:ef5d36f001d3c0a94361b196e7c28344cf1f8709cbeb15596b78b32f706ca08f","sha256:efa8cd4840075e818f33c90b32646475c44754bbd3541e1f512b9b9ffc8b260a","sha256:f089ab6568b5cd483574e058365de5dcbb3fdb51380cb2d93bf46de2f8ba9ecf","sha256:f2a3fd834688472f99311033c63af36d3316d3f4e58fb8d58813635ec4917516","sha256:f6d0a80056b1a42d68102a00e8f36c8caa524ed068a0d7db9a3e78cede7b5a3a","sha256:f930eca5dc964bbeb5e4ba0e855e87769a6a21896d42e6bf548ede4c51b7c980"],"numeric_t":["sha256:00543ab67676cc25577deeffd4f5f3809c21bf678ba94054100cc40930d8409c","sha256:01215227e9496f7a7a3887a3ab89c2431bcfdde7e94fc39917ddd044c07b2d82","sha256:04c7c7b0557e21f94a6bf20a0a657a2eb02d8d13ea3c7b3166d685487243561e","sha256:1181b237524ccdfb091a4a3c88708c6573aa77b5508c2070551d84fb91ae7656","sha256:15f03e04e3fb44d09a110a887789bfebeed3b9a5602b4fc2996bdea39ca05bca","sha256:227ce7d523f9dea73a5cbde7545b6c113d77d07f37b98e8cb4f7533d75c3ade6","sha256:373f3f37772ba87afaa727db7970a3d98aeb09bcb9efcc04cdb68dbebb32bb49","sha256:53b1cbeeaa45ff11d94a05af93b466a04ccc35b68bcf9c50dd59d7353a8ce967","sha256:53e0286e3773bfbd82fbed3479650bbd6d4043c028ebe0d857eec809dd390ae5","sha256:5be926c85110dc04b95717ee64d727d33b16e8ebc6cee262ea2073fbe51be772","sha256:7d92dc1fd1c75999c24d2f0b9b8426f6079ba34156d34764bb8c3878a2260ece","sha256:7fbcf51955bb95be1fc59adbd693b9cc760a8ce5d5803b13098367c3283f9619","sha256:816df9c84e65d9b3d834f5c73eb60800377d68fa8f73dd10dc333184c565ad3d","sha256:8f45419ea1e4d23a653e000e35746d86cc5d19bc033c937c447149c8f25e6ff8","sha256:93cd80619a1607682adc2652ce754bd0e243196b266f0d33831516311a6c6cc4","sha256:949aaa5543f88569de5530dba043e27290fbaca5c324da8e742f1169e18d517c","sha256:ad23753a59b2bd4a13e93f6fa954fe88534cf20fffdbfaf5d5bf871b18857b56","sha256:b346afc67a999a7a81b8597d97349730e3a6c5d4eae04669771a88814bede60e","sha256:d50a2b394d2c4a87248f75ad3cc53c3b68eb16284c06bd6a0bbae34660a98816","sha256:d815c4de86e29668c6e797de60c5683ec4698400dc96de1abda7ce97516da07b","sha256:db1a7fdda2127d842fd26f835f7c142bdb73b793e4206084bd45e121a1462330","sha256:e1aa140443c894835fee71e6b88b00aad42be3d690d4f43d75bfd9ee8d997283","sha256:ef6d159aa11891d213085045275cb531a6f4e39141652ad244251d47075b5084","sha256:ff354d61b0afc37a148413ce190cb90d13f5d44ac4da70077f58eb330b9489e1"],"qualified":[],"reproducibility_failed":[],"tag_commit_mismatch":[],"wire_incompatible":["sha256:1f64b631dc822d8c8a83e0621a6662dbde2d925a84ba52865e28dbcb181681b2","sha256:7bfd82983d79ea2159391129264c718f3a3159f66631038f91b2c2e33d27bc2a","sha256:bff0d63981e7ccc2927f384c5d5870e5fe95388f7bb24da2d5fc093f1a9fd9a2","sha256:ccd8b471dc4c862c805c464d08d896a562c1af4232f96404affacf4f7f7a5afa"]}
```

Canonicalization is `jq -S -c -j .` over UTF-8 JSON, with bytewise-sorted
keys and arrays and no trailing LF. The result is 10,283 bytes and has SHA-256
`17686feada33c418479c86837d18c4ec5d25996d4750463aaf651e9a2486fc6f`.

The deterministic Git producer and replay contract is:

```sh
URL=https://github.com/fluree/db.git
MIRROR=/tmp/fluree-db-receipt.git

git init --bare "$MIRROR"
git -C "$MIRROR" remote add origin "$URL"
git -C "$MIRROR" for-each-ref \
  --format='delete %(refname)' refs/remotes/origin refs/tags |
  git -C "$MIRROR" update-ref --stdin
git -C "$MIRROR" fetch --force --prune --prune-tags --no-write-fetch-head \
  origin \
  '+refs/heads/*:refs/remotes/origin/*' \
  '+refs/tags/*:refs/tags/*'
git -C "$MIRROR" update-ref -d refs/remotes/origin/HEAD

LC_ALL=C GIT_TERMINAL_PROMPT=0 \
git -c protocol.version=2 ls-remote --heads --tags "$URL"
git -C "$MIRROR" rev-list --remotes=origin --tags | LC_ALL=C sort -u
```

The first and last `ls-remote` bodies delimit the observation window and are
hashed as emitted, including their final LF. Tag parsing consumes the emitted
tab-separated rows without locale folding: for a row ending in `^{}`, remove
only that suffix and let its OID override the same tag's direct tag-object OID;
otherwise use the direct OID as the lightweight-tag target. Every effective
target MUST satisfy `git cat-file -t TARGET == commit`. `G` is the
bytewise-sorted unique output of the displayed `rev-list` command, not the
advertised OID set.

The deterministic OCI producer starts with these official paginated
inventories:

```sh
TOKEN=$(curl -fsSL \
  'https://auth.docker.io/token?service=registry.docker.io&scope=repository:fluree/server:pull' |
  jq -er .token)
curl -fsSL -H "Authorization: Bearer $TOKEN" \
  'https://registry-1.docker.io/v2/fluree/server/tags/list?n=100'
curl -fsSL \
  'https://hub.docker.com/v2/repositories/fluree/server/tags?page_size=100'
```

The Distribution loop MUST follow each RFC 5988 `Link` value until none is
returned. The Hub loop MUST follow each response's absolute `.next` URL until
it is null, concatenate every `.results[]` entry, require the sum to equal
`.count`, and record the before/after page set. The stable Hub identity
projection retains tag fields
`name,digest,media_type,content_type,full_size,tag_status,v2,last_updated,tag_last_pushed`
and, for each image, fields
`os,architecture,variant,digest,size,status,last_pushed`. Image arrays are
sorted by `os,architecture,variant,digest`, tag rows by `name`, and the
whole projection is serialized with `jq -S -c -j`. Volatile
`last_pulled` and actor/request metadata MUST NOT enter that projection.
The exact top-level preimage is the unwrapped JSON array produced from the
concatenated page results by:

```jq
[
  .results[] |
  {
    name,
    digest,
    media_type,
    content_type,
    full_size,
    tag_status,
    v2,
    last_updated,
    tag_last_pushed,
    images: (
      [
        .images[] |
        {os,architecture,variant,digest,size,status,last_pushed}
      ] |
      sort_by(.os,.architecture,(.variant // ""),.digest)
    )
  }
] |
sort_by(.name)
```

That exact array, not an envelope containing `count` or pagination fields,
has no trailing LF, is reproducible from the documented projection, and has
SHA-256
`56582799014793edc37b873c2c6a7f15a69755f4245bfe43b2314ac592a43864`.

For each unique tag-target digest `D`, the producer performs
`GET https://hub.docker.com/v2/namespaces/fluree/repositories/server/manifests/D`,
requires envelope `.digest == D`, decodes `.data` from base64 without
text reserialization, and requires
`sha256:$(shasum -a 256 decoded-body) == D`. A decoded body with media type
`application/vnd.oci.image.index.v1+json` contributes every descriptor whose
platform is exactly `linux/amd64` or `linux/arm64`; the direct
single-platform `stable` target contributes itself. Deduplicate runnable
descriptors by manifest digest to construct `I`. Repeat the same official
manifest-by-digest body recovery and digest check for every runnable descriptor.

For each runnable manifest, read but do not fetch its filesystem-layer
descriptors. Recover its config from
`GET https://registry-1.docker.io/v2/fluree/server/blobs/CONFIG_DIGEST`
with the bearer token and verify its bytes against `CONFIG_DIGEST`. Within an
index, select only a descriptor whose
`vnd.docker.reference.type == "attestation-manifest"` and whose
`vnd.docker.reference.digest` equals the runnable manifest. Recover and
hash-check that attestation manifest through the Hub manifest-by-digest API,
select only its
`application/vnd.in-toto+json` layer whose
`in-toto.io/predicate-type == "https://slsa.dev/provenance/v1"`, then recover
and hash-check that statement through the Distribution blob endpoint. Absence
of the expected attestation is recorded, never synthesized.

The provenance projection records these exact paths without fuzzy repository,
tag, or commit inference:

```text
predicateType
subject[].digest.sha256
predicate.buildDefinition.internalParameters.github_repository
predicate.buildDefinition.internalParameters.github_ref
predicate.buildDefinition.internalParameters.github_ref_type
predicate.buildDefinition.internalParameters.github_workflow_sha
predicate.runDetails.metadata.buildkit_metadata.vcs.source
predicate.runDetails.metadata.buildkit_metadata.vcs.revision
predicate.runDetails.metadata.reproducible
predicate.runDetails.metadata.buildkit_completeness.resolvedDependencies
predicate.runDetails.builder.id
config.Labels["org.opencontainers.image.source"]
config.Labels["org.opencontainers.image.revision"]
config.Labels["org.opencontainers.image.version"]
```

A `U` join requires the SLSA subject digest to equal the runnable manifest;
repository `fluree/db` and source `https://github.com/fluree/db`;
`github_ref_type == "tag"`; `github_ref == "refs/tags/"+upstream_tag`;
agreement among `github_workflow_sha`, VCS revision, and config revision;
an upstream tag that exists and peels to that commit; a Hub tag equal to the
upstream tag after removal of exactly one leading `v` and mapping to the
containing index; a matching platform-specific SLSA subject; and successful
official Hub retrieval plus byte-digest verification of the index and runnable
manifest. Any incomplete exact chain remains outside `U`.

The deterministic source projection is:

```sh
git -C "$MIRROR" rev-list --objects --remotes=origin --tags -- \
  fluree-db-api/src/merge.rs \
  fluree-db-api/src/merge_preview.rs \
  fluree-db-core/src/commit.rs \
  fluree-db-novelty/src/delta.rs
```

Keep only rows naming those four exact paths, validate each retained OID with
`git cat-file -t OID == blob`, inspect each unique body once with
`git cat-file blob OID`, and map each `U` commit to its path/blob tuple
with `git ls-tree -r COMMIT -- PATHS`. The source classifier records
`wire_incompatible` when the required native preview/merge pair and its
ahead/behind, conflict-delta, source-replay, and copy-chain surface are absent.
It records `numeric_t` when that surface exists but a relevant route retains
`ancestor.t`, `stop_at_t`, an `Option<i64>` replay boundary, or
equivalent numeric transaction stop instead of ancestor CID or reachable-set
membership.

Every unique `I` digest is then assigned exactly once by the following
priority: `missing_provenance` for an incomplete exact provenance chain;
`tag_commit_mismatch` for a complete tag/commit claim whose canonical Git
tag is absent or peels elsewhere; `wire_incompatible`; `numeric_t`;
`live_failed` only for a source survivor that fails F1 or F2;
`reproducibility_failed` for a source and live survivor that lacks the
required affirmative reproducibility proof; and `qualified` only after the
source, both live, and affirmative reproducibility gates pass. The six
`4.0.6-hotfix.1/.2/.3` platform
records are `missing_provenance` because no exact upstream-tag claim
completes the join; they are not inferred to be tag/commit mismatches.

Official immutable recovery URLs are formed without tag lookup:

```text
https://hub.docker.com/v2/namespaces/fluree/repositories/server/manifests/<sha256:digest>
https://registry-1.docker.io/v2/fluree/server/manifests/<sha256:digest>
https://registry-1.docker.io/v2/fluree/server/blobs/<sha256:digest>
https://api.github.com/repos/fluree/db/git/commits/<commit>
https://api.github.com/repos/fluree/db/git/blobs/<blob>
https://raw.githubusercontent.com/fluree/db/<commit>/<path>
```

The concrete `v4.1.5` `linux/amd64` chain, including the corresponding
Distribution URLs captured successfully before quota exhaustion, is:

```text
Hub index:
https://hub.docker.com/v2/namespaces/fluree/repositories/server/manifests/sha256:7f4c34a1c2ac189ccff3bac93c54e264a05b7ca5d05fbe5ee5656ac1cff19d44
Distribution index:
https://registry-1.docker.io/v2/fluree/server/manifests/sha256:7f4c34a1c2ac189ccff3bac93c54e264a05b7ca5d05fbe5ee5656ac1cff19d44
Hub amd64 platform:
https://hub.docker.com/v2/namespaces/fluree/repositories/server/manifests/sha256:ad23753a59b2bd4a13e93f6fa954fe88534cf20fffdbfaf5d5bf871b18857b56
Distribution amd64 platform:
https://registry-1.docker.io/v2/fluree/server/manifests/sha256:ad23753a59b2bd4a13e93f6fa954fe88534cf20fffdbfaf5d5bf871b18857b56
Distribution amd64 config:
https://registry-1.docker.io/v2/fluree/server/blobs/sha256:59af8a7d81a4729ac5ff5ad71f323d45266cc29038de793a86d1294458b0aa21
Hub amd64 attestation:
https://hub.docker.com/v2/namespaces/fluree/repositories/server/manifests/sha256:75c1cc05df7b68b65a3ac69a7d24d4bb387e39701946519aaed89d261c33ed6e
Distribution amd64 attestation:
https://registry-1.docker.io/v2/fluree/server/manifests/sha256:75c1cc05df7b68b65a3ac69a7d24d4bb387e39701946519aaed89d261c33ed6e
Distribution SLSA statement:
https://registry-1.docker.io/v2/fluree/server/blobs/sha256:424a17202a3362e97fe0ebb3193ed62cb85489a5218462a2528deb226ab037b5
commit:
https://github.com/fluree/db/commit/d767927dae550a6ecde8f15603ad9c195de60351
provenance run:
https://github.com/fluree/db/actions/runs/31437217831
```

No complete OCI response-body archive remains in temporary files. The
read-only source object store at `/tmp/fluree-db-4.1.4-source` is temporary
working provenance, not durable evidence. The inline payloads, canonical
serialization rules and hashes, immutable URLs, and replay steps above are the
durable receipt.

The `U` tags ranged from `v4.0.0` through `v4.1.5`. The two runnable platforms
for each of `v4.0.0` and `v4.0.1` were `wire_incompatible` because the required
preview pair was absent; the two runnable platforms for each tag from `v4.0.2`
through `v4.1.5` were `numeric_t`. Across all of `G`, the relevant source
projection reduced to 38 blob identities, whose ledger had SHA-256
`4d470059988a614f1042305b6ec67bd42dbae546681fcca10a7f8c02cf54b63c`.
Every relevant implementation either lacked the required pair or retained a
numeric cutoff; none terminated by ancestor CID or reachable-set membership.
The seven `U` source groups had SHA-256
`4797034d06ed4748044a0250319dae9e09f334573f002455a8f034c9bfda49a8`.

The tool receipt had SHA-256
`9dcffa958fe79de279e6a874184b91b17f597605806af41e15a5fd48485d1274`
and recorded
`Git2.48.0/curl8.7.1/jq1.7.1-apple/Docker29.1.3/Buildx0.30.1-desktop.1/Digest::SHA6.02/OpenSSL3.6.2/rg15.2.0`.
The final
classification was `qualified=0`. Because no tuple satisfied the mandatory
source predicate, the exact F1/F2 status was
`NOT RUN: no candidate satisfied the mandatory source predicate`.

This negative qualification receipt does not falsify or narrow the unrestricted
neutral merge law. It MUST preserve every preexisting task-6.3a, task-6.3b,
task-6.3c, and task-6.3d line and receipt; every existing Node, Effect, and
TypeBox pin; the zero-Fluree-npm-metadata law; every public API, descriptor,
config, file, edge, corpus, count, publication boundary, and package-metadata
exclusion; task 6.4's Promise-level waiter allocation; and task 7.4's
Effect-interruption allocation. With no positive qualification, no selected
tag, commit, OCI digest, provenance, or compatibility target exists, no
preserved 4.1.4-only/version stop is superseded, and task-6.4 source remains
closed.

A new advertised canonical upstream ref or new official registry image is the
bounded-inventory rerun trigger. A rerun MUST construct complete fresh `G`, `I`,
and `U` ledgers inside one new stable UTC observation window, repeat the
before/after inventories and hash receipts, classify every `I` and `U` record
exactly once, apply the source predicate before exact-digest live F1/F2, and
apply the affirmative reproducibility gate after any source/live survivor and
before positive selection. The trigger alone MUST NOT reactivate or check off
task 6.3d, select an artifact, or open task 6.4 or task 6.5; task 6.3e remains
the sole active owner decision until it seals and creates deterministic
successor work.

Task 6.3e MUST select option (b): preserve unrestricted provider-neutral merge
and redesign only its vendor/runtime realization. It MUST preserve every
preexisting task-6.3a, task-6.3b, task-6.3c, and task-6.3d line and receipt
byte-identically, together with every public API, behavior, config, topology,
file, edge, corpus, count, publication boundary, package-metadata exclusion,
task-6.4 Promise-level waiter allocation, and task-7.4 lifecycle and
Effect-interruption allocation. It MUST reject option (a)'s fail-closed
no-merge capability, provider-side ancestry or merge emulation, a sidecar or
proxy, a process/acquisition epoch, preflight, single-actor or sequence
restriction, and a third Habitat owner, API, project, or package.

The smallest admitted realization MUST be one corrected, independently
released external Fluree server artifact based on exact official
`v4.1.5@d767927dae550a6ecde8f15603ad9c195de60351`. The existing
`provider-semantic-ledger-fluree-http` owner MUST consume the qualified image as
ordinary external OCI compatibility evidence. Habitat MUST NOT own, package,
publish, proxy, or emulate that server realization. The provider MUST retain its
exact existing config and API: it can address `baseUrl` but cannot attest which
binary or image digest serves that URL. Exact OCI digest selection and pinning
MUST therefore remain deployment-handoff evidence and configuration, never a
provider config field, provider descriptor field, resource API, or runtime
attestation claim.

The official source tuple is the immutable correction baseline, not a selected
task-6.4 compatibility artifact. No corrected source origin, external
repository, registry origin, tag, corrected commit, OCI digest, or provenance
is selected by task 6.3e. Neither `rawr-ai/db` nor any registry namespace MAY be
represented as existing, reserved, selected, or organization-authorized by
this decision.

This decision change MUST modify exactly the same six OpenSpec artifacts and no
seventh file, source, test, publication, project, proposal, stack cut sheet,
canonical/system document, owner router, manifest, lockfile, SDK file, runtime
behavior, stage, commit, push, or external system. It MUST add exactly one new
unchecked task, 6.3f, so the decision-change ledger is exactly 56 checked tasks
out of 115 total. Task 6.3e MUST remain unchecked in this decision change. Task
6.3d MUST remain unchecked, stopped, and unsealed unless a later complete
official-universe rerun under the preserved `G`/`I`/`U` law positively qualifies
an official artifact. Tasks 6.4 and 6.5 MUST remain pending and closed.

The generic first-unchecked-container rule MUST NOT reactivate stopped task
6.3d. For this semantic-ledger sequence, the latest explicit task-state record
is authoritative: task 6.3e is active and unchecked through the decision change;
after its required landing receipt, task 6.3f is active while task 6.3d remains
unchecked and stopped and tasks 6.4/6.5 remain closed.

After the six-document task-6.3e decision merges and its exact-main Repository
Ratchet passes, one immediate landing-provenance receipt MUST change exactly
`tasks.md` and `execution-queue.md`. It MUST record the PR, final head, exact
main/tree, and check outcomes; change only the task-6.3e checkbox from unchecked
to checked; activate task 6.3f; preserve task 6.3d unchecked, stopped, and
unsealed; preserve tasks 6.4 and 6.5 pending and closed; and perform no external
mutation. No other authority artifact changes in that receipt.

Task 6.3f MUST be a Habitat documentation/evidence qualification with an
external prerequisite. Before any external repository creation, source-origin
selection, registry-origin or namespace selection, publication, signing,
maintenance or security commitment, licensing decision, artifact-retention
commitment, or upstream-rebase commitment, explicit organization authorization
MUST identify and approve the responsible owners and exact origins. Until that
authorization exists, task 6.3f MUST stop at `AUTHORIZATION_REQUIRED` and MUST
perform no external mutation. Planning text and read-only evidence MUST NOT be
misrepresented as authorization.

After the authorization prerequisite is recorded, each preview or merge MUST
compute the complete source-head and target-head reachable CID sets once as
`S` and `T`. From those immutable sets it MUST derive the full differences
`S \ T` and `T \ S`
once and MUST feed those identical CID memberships to preview `ahead` and
`behind`, conflict-delta evaluation, source replay, and copy traversal. Numeric
`t` MUST NOT decide membership, terminate a walk, or otherwise own replay
topology. An internal common-ancestor CID MAY assist deterministic ordering but
MUST NOT filter either difference or own correctness; stopping at one ancestor
is insufficient for multi-parent and criss-cross histories. The public
`LedgerMergePreview` MUST remain unchanged and expose no ancestor field or
singular-ancestor promise.

The corrected server MUST preserve the v4.1.5 HTTP wire routes, methods,
statuses, and response shapes; physical storage representation and compatibility;
branch-list `BranchInfo.t` as the exact HEAD source; source-local `t` on copied
commits; and the native two-parent general-merge head. It MUST NOT add a Habitat
wire extension, provider-side correction, alternate storage namespace, sidecar,
proxy, epoch, preflight, or sequence restriction. The authorized external fork
MUST own regressions that directly prove shared CID-set use and falsify the
former numeric cutoff through criss-cross histories, distinct CIDs with equal
`t`, nonmonotonic reachable `t`, upgrade/reopen of unmodified v4.1.5 storage,
and restart/reopen after corrected merges. Those regressions MUST cover every
corrected preview-counter, conflict-delta, source-replay, and copy path while
preserving every unchanged wire, storage, HEAD, source-local-position, and
two-parent semantic.

The external build MUST freeze the complete toolchain, build recipe, base
images, and dependency inputs. At least two independent clean builders with no
shared output or build cache MUST produce, for the OCI index and for every
admitted platform manifest, corresponding bytes identical to one another and
to the published bytes, with digests exactly equal to the published index and
platform digests. The published artifact MUST retain verifiable source/build
provenance, a complete SBOM, and every required license and notice in both
source and image distributions.

A derivative, fork, or image based on the BUSL-1.1 source MUST conspicuously
preserve that license and notice, MUST use distinct derivative branding, and
MUST NOT rely on any ungranted Fluree trademark right. Deployment MUST remain
within the Additional Use Grant and MUST NOT expose the artifact as a Database
Service. If the intended exposure could be a Database Service, task 6.3f MUST
stop at `LICENSE_REQUIRED` and select nothing until another applicable license
has been obtained and recorded.

Every admitted runnable platform MUST then pass disposable live F1, the complete
F2 conflict arm both below and above the former `ancestor.t` cutoff, and the
independent F2 source-cutoff replay/copy arm. Each platform MUST preserve exact
branch-list HEAD evidence, ancestry, preview counters, native conflict abort and
no-write behavior, source replay, target preservation, `copied === ahead`,
target pre-merge `t + 1`, and exact two-parent identity. Source inspection,
fork-owned regressions, one platform, one build, provenance alone, or a
partially published index cannot qualify the artifact.

Only after authorization, corrected-source regressions, unchanged compatibility,
two independent reproducible builds, provenance, SBOM, license/use review, and
all-platform live vectors all pass MAY task 6.3f select one exact compatibility
tuple for task 6.4. That tuple MUST contain the official v4.1.5 base tag and
commit; the organization-authorized corrected source origin, release ref, and
commit; the organization-authorized registry origin and repository; the
published OCI index digest; the complete ordered admitted-platform-to-manifest-
digest map; and immutable provenance, SBOM, license/notice, rebuild, and live-
vector receipt identities. Task 6.4 MUST use only that exact tuple as
compatibility evidence, while any real deployment MUST pin its exact digest in
the deployment handoff rather than the provider. Task 6.4 MUST remain closed on
any missing or failed tuple member. A 6.3f selection supersedes only the
preserved Fluree compatibility stops; every other existing contract and
allocation remains unchanged.

Every operation input MUST be runtime-admitted before state access or
transport. Each input shell, nested record, term variant, guard, node,
property, pattern, and response-independent collection MUST have its exact own
enumerable data fields, ordinary or null prototype as appropriate, and dense
ordinary arrays; accessors, Proxies, symbols, inherited substitutions, holes,
surplus members, and wrong variants MUST return `InvalidInput` without invoking
them. Identity MUST contain 1 through 128 UTF-8 bytes and MUST be an ASCII HTTP
field value: every code unit is from U+0020 through U+007E and the first and last
code units are from U+0021 through U+007E. The driver MUST use that exact value
unchanged in `Idempotency-Key` and MUST apply `encodeURIComponent(identity)`
exactly once when placing it in the submission-status path. A control,
non-ASCII value, or leading/trailing space MUST return `InvalidInput` before
header or URL construction. An empty node is semantically inert, but the
flattened proposal MUST contain at least one ground triple in aggregate.
Total-zero proposals MUST return `InvalidInput` before identity reservation,
state mutation, or fetch.

Term admission MUST respect RDF/SPARQL position rather than only the public
union shape. Every `GraphNode.id`, graph-property predicate, and `GuardAbsence`
subject/predicate MUST be a valid logical IRI. A `TriplePattern` subject MUST be
an IRI or variable, its predicate MUST be an IRI or variable, and only its
object may also be a literal. A literal in subject or predicate position, an
invalid variable name, or an invalid IRI MUST return `InvalidInput` before
state access or fetch.

Proposal sameness MUST be computed from the exact canonical update body, not
from raw `GraphNode` grouping or an abbreviated digest. The driver and memory
fixture MUST flatten nodes to ground triples, validate all nodes, sort and
deduplicate exact triples, canonicalize conditional required and absent clauses
as conjunction sets, and assign deterministic aliases to their sorted distinct
logical variable names. Reordering nodes/properties/guard clauses, splitting or
combining one subject across nodes, or repeating an exact triple/guard clause
therefore remains the same offer. A different canonical guard or ground-triple
set under the same line-scoped identity is a different offer and MUST refuse as
`AlreadyProposed` without a write.

Storage encoding MUST prevent Fluree namespace allocation from becoming a
second, vendor-only merge-conflict axis. Every logical subject, predicate, and
IRI object MUST be well-formed Unicode for which `new URL(value)` succeeds with
a nonempty protocol. Validation MUST NOT normalize the logical string. The
exact original string MUST be privately mapped to exactly one provider-owned
namespace with prefix
`urn:habitat:semantic-ledger:iri:`. Its local token MUST be the complete logical
IRI's UTF-8 bytes encoded as canonical unpadded base64url. Caller IRIs MUST
never be interpolated into SPARQL. Query IRI constants MUST use the same
injective codec. Only a returned SPARQL cell typed `uri` whose value has that
exact prefix and a canonical valid token may be decoded to a logical IRI;
malformed, foreign-namespace, or invalid-UTF-8 URI cells MUST return
`BackendFailed`. Literal cells MUST retain their exact logical value and MUST
be well-formed Unicode rendered with complete SPARQL string escaping rather
than interpolation; short escapes cover tab, backspace, line feed, carriage
return, form feed, quote, and backslash, and every remaining C0/C1 control is
rendered through its Unicode escape rather than raw syntax.
The codec MUST add no graph metadata, public symbol, file, commit, or second
storage namespace.

Logical variable names MUST never be interpolated into SPARQL. The driver MUST
admit only well-formed names containing 1 through 128 UTF-8 bytes, then
map the sorted distinct names deterministically to `?v0`, `?v1`, and so on,
reuse those aliases through patterns and projection, and map returned binding
keys back to the exact logical names with own-data construction that cannot
trigger `__proto__` semantics. `SelectQuery.select` MUST be nonempty and contain
no duplicate name, and every selected name MUST occur as a variable in at least
one `where` pattern. Projection and every reconstructed binding record MUST
expose exactly those selected keys in the caller's `SelectQuery.select` order
even though alias assignment uses sorted distinct logical names. A missing,
surplus, or unrecognized backend binding cell MUST return
`BackendFailed`. RDF storage and visible graph matching MUST deduplicate
identical ground triples, while conjunctive evaluation and projection MUST use
ordinary bag semantics. The provider MUST emit plain `SELECT`, never `SELECT
DISTINCT`, and MUST preserve equal projected rows without local deduplication.
Backend row order is non-authoritative and MUST NOT be sorted.
Every newly decoded binding record, result record, failure, and array MUST be
fresh and frozen; the acquisition-local identity table MAY replay its already
frozen determinate receipt by exact reference as specified below.

Line input MUST be closed before transport or SPARQL construction. A family
MUST match `[A-Za-z][A-Za-z0-9.-]{0,127}`; a branch MUST match
`[A-Za-z0-9][A-Za-z0-9._-]{0,127}`; and a line MUST be exactly
`<family>:<branch>` with one colon. `lines` accepts exactly one bare family.
An empty segment, extra colon, `@`, slash, whitespace, control character,
query, fragment, or value outside those grammars MUST return `InvalidInput`
before fetch. Only the validated line and an optional finite nonnegative safe
integer `at` may contribute to a SPARQL `FROM` IRI. `fork` MUST require its
`from` and `to` lines to share one family; `merge` and `previewMerge` MUST
require their `from` and `into` lines to share one family. A cross-family pair
MUST return `InvalidInput` before state access or fetch. `lines` MUST return unique
fresh frozen heads in ascending ECMAScript code-unit order by full line, and a
duplicate or malformed backend line entry MUST return `BackendFailed` rather
than be repaired.

`SemanticLedgerFailure` MUST remain a tagged non-`Error` record. Owner-local
failure construction MUST normalize redacted `detail` to at most 4,096 UTF-16
code units. When longer, it MUST retain the first 4,093 code units and append
literal `...`. Detail and every provider diagnostic MUST exclude URL, request
or response body, headers, proposal identity, raw response, and vendor-exception
content. No public detail-bound constant or construction/classification helper
is admitted beyond the exact export inventory below.

The provider MUST first create one closed TypeBox input schema. It accepts
required `baseUrl`, constrained to an absolute HTTP(S) URL no longer than 2,048
characters and containing no credentials, query, or fragment, plus optional
integer `timeoutMilliseconds` from 100 through 300000 inclusive. It rejects
every additional field. It MUST NOT attach a TypeBox default annotation and
MUST NOT export an input type or normalization helper.

That owner-local input schema MUST be annotation-free and default-free and MUST
be structurally exact to this TypeBox expression:

```ts
Type.Object(
  {
    baseUrl: Type.Refine(
      Type.String({ minLength: 1, maxLength: 2048 }),
      (value) => {
        try {
          const url = new URL(value);
          return (
            (url.protocol === "http:" || url.protocol === "https:") &&
            url.username === "" &&
            url.password === "" &&
            !value.includes("?") &&
            !value.includes("#")
          );
        } catch {
          return false;
        }
      },
      () =>
        "Expected an absolute HTTP or HTTPS URL without credentials, query, or fragment"
    ),
    timeoutMilliseconds: Type.Optional(
      Type.Integer({ minimum: 100, maximum: 300000 })
    ),
  },
  { additionalProperties: false }
);
```

No schema node may add `default`, `description`, `title`, `$id`, examples, or
another annotation. The refinement error MUST be exactly
`"Expected an absolute HTTP or HTTPS URL without credentials, query, or
fragment"`. The refinement MUST inspect raw `value` with
`!value.includes("?") && !value.includes("#")` exactly as shown rather than
checking `url.search` or `url.hash`, so an empty query or fragment delimiter is
also refused.

An owner-local base check MUST be created with
`RuntimeSchema.fromTypeBox(...)` and exact redaction paths `["baseUrl"]`. The
exported `FlureeHttpSemanticLedgerConfigSchema` MUST be a frozen owner-local
normalizing wrapper typed
`RuntimeSchema<FlureeHttpSemanticLedgerConfig>`. Its `decode` and `validate`
methods MUST delegate to the corresponding base check. On success, each MUST
return a fresh frozen required config containing the admitted `baseUrl` and
`timeoutMilliseconds: value.timeoutMilliseconds ?? 30_000`; on failure, the
base issues remain authoritative. Neither method may mutate input. The
wrapper's serializable schema and redacted shape MUST remain those of the base
closed TypeBox schema. If global fetch is absent at acquisition, the failure
MUST have exactly the two fields frozen above and no diagnostic payload.
`FlureeHttpSemanticLedgerConfig` is both the exported schema output type and the
exact config type received by provider `build(...)`; no separate public input or
build-config type exists.

The `RuntimeSchema.fromTypeBox(...)` options object MUST contain only
`redaction: { paths: ["baseUrl"] }`; it MUST omit `description`. The frozen
exported wrapper MUST reuse the base check's `kind`, `serializable`,
`redaction`, and `toRedactedShape` by exact reference and MUST have no own
`description` property. Each wrapper method MUST call the matching base method.
A base failure MUST be returned by exact result identity, unchanged. A base
success MUST produce a fresh frozen success result containing a fresh frozen
`FlureeHttpSemanticLedgerConfig` with the exact admitted `baseUrl` and
`timeoutMilliseconds: value.timeoutMilliseconds ?? 30_000`; neither the result
nor config object may be reused across successful calls.

Provider `build(...)` MUST be synchronous and cold and MUST return exactly one
`providerFx.acquireRelease(...)` plan. Only the opaque
`providerFx.tryPromise(...)` acquire MAY read `globalThis.fetch` and construct
the resource. The exact release callback MUST be
`release: () => providerFx.succeed(undefined)`: it declares no parameter and
returns `ProviderFx<void, never>`. Importing the provider and calling build MUST
invoke no fetch, Promise, acquire, release, or resource operation. Task 6.4 MUST
execute no plan body. Promise and injected fetch MUST exist only in private
provider `driver.ts` and the private test conformance seam. Neither MUST be
exported by the resource package or SDK; they MUST permit transport and shared
conformance proof without constructing a runtime substrate.

The `providerFx.acquireRelease(...)` input MUST omit both `policy` and
`telemetry`. Its exact public descriptor MUST nevertheless retain the required
phase metadata keys with explicit `undefined` values:

```ts
{
  kind: "provider.effect-plan",
  acquire: {
    boundary: "provider.acquire",
    policy: undefined,
    telemetry: undefined,
  },
  release: {
    boundary: "provider.release",
    policy: undefined,
    telemetry: undefined,
  },
}
```

This public shape does not include the existing non-enumerable private witness.
The no-argument release callback, private witness/body identity law, and task
7.4-only execution boundary remain unchanged.

The task-6.4 provider test MUST prove only the public `ProviderEffectPlan`
descriptor/metadata shape, TypeScript assignability, and import/build coldness.
It MUST NOT import or call `readProviderEffectPlan`, inspect the nominal witness,
or recover either body reference. Sealed task 6.1 already proves nominal
witness/body-identity mechanics generically. The private driver/conformance
tests MUST prove HTTP mapping, redaction, failure classification, and
lost-answer behavior independently without plan access or execution. Exact
`providerFx.tryPromise(...)` fetch/error behavior, successful acquisition, and
execution of the no-op release callback MUST be proved only by task 7.4, which
privately recovers and executes this provider's acquire/release through the live
substrate. `readProviderEffectPlan` remains reserved to runtime-definition
assembly and the future Effect substrate. Accessor, witness, and bodies remain
absent from package, SDK, and every public face.

Task 6.3c clarifies that the preceding provider-test restriction governs the
public-plan suite, not the whole admitted file. Separate private
driver/conformance suites MUST coexist in the same frozen
`providers/fluree-http/test/provider.test.ts` and may exercise only the private
injected-fetch driver seam, without plan access, witness inspection, body
recovery, or acquire/release execution.

Task 6.3c narrows lost-answer identity recovery to one acquired
`SemanticLedger` value. The private driver MUST own an acquisition-local table
keyed by exact `(ledger, identity)`. Each entry MUST retain the exact canonical
request body, the write-send count, and exactly one state: a running shared
completion, an indeterminate reservation, or a settled full terminal outcome.
Before its first write transport call, the first caller MUST atomically install
the entry and start the table-owned producer. That caller is the creator but is
only the first waiter. Every later same-body caller is also only a waiter and
starts no transport. A different-body caller MUST neither await the producer nor
send a write; it MUST settle as `AlreadyProposed` at a valid non-writing head.

The table-owned producer MUST be independent of every caller lifetime. Task
6.4's private driver/conformance suite MUST prove at the Promise seam that the
table owns the producer: two same-body calls share one producer and one write;
either returned waiter may be abandoned through a controlled test race; the
other receives the exact shared receipt, typed failure, or defect; and settled
replay retains exact reference/category. That suite MUST NOT interpret a
`HabitatEffect` or claim Effect interruption.

Task 7.4 alone MUST prove the Effect projection. After the real substrate
acquires one `SemanticLedger`, its owner-local test MUST invoke that acquired
value's real `propose(...)` `HabitatEffect` through the substrate's existing
private lowering path. Using two distinct identities in the same acquisition
and controlled pending-write gates, it MUST interrupt the creator fiber in one
case and a same-body follower fiber in the other. Only the selected waiter MUST
exit with an interruption Cause. Interruption MUST NOT become a
`SemanticLedgerFailure`, be memoized, clear the entry, or propagate cancellation
to the producer. The still-attached waiter MUST receive the exact shared frozen
receipt without hanging, exactly one write MUST complete for that identity, and
a later same-body call MUST replay that exact receipt. This proof MUST add no
public runner, plan accessor, resource getter, test seam, API, file, project, or
edge.

The initial producer MUST own one absolute `timeoutMilliseconds` deadline across
its initial POST, submission reads, polling delays, and any replacement POST. It
MUST send exactly one initial POST and, after an unanswered send, inspect
`/submissions` rather than blindly posting again. Exact `unknown` observed before
that deadline while the replacement permit remains unused MUST atomically
consume the permit before invoking exactly one replacement POST. Starting that
replacement or exhausting the initial deadline MUST permanently close writes
for the entry. Once writes are closed, exact `unknown` and exact `in_flight`
MUST only poll within the same deadline. Exact `committed` MUST decode a
determinate receipt, and exact `failed` MUST return a determinate
`BackendFailed`. The exact `/update` in-progress response defined below MUST
also close writes permanently and enter submission polling within the same
deadline; it MUST NOT become `AlreadyProposed` or authorize a replacement.

A determinate receipt, determinate typed failure, or defect MUST move the entry
to settled and MUST remain the exact memoized terminal category for later
same-body callers during the acquisition: the same receipt object, typed failure
as typed failure, or defect as defect. Deadline or transport exhaustion after an
unanswered write MUST instead publish `TransportFailed` to current waiters and
move the entry to indeterminate; that `TransportFailed` is not a settled or
memoized terminal outcome. The entry MUST retain its exact body and send count,
and writes MUST remain permanently closed.

A later same-body call on an indeterminate entry MUST atomically start or join
one table-owned read-only recovery producer with a fresh
`timeoutMilliseconds` deadline. That producer MUST perform only submission
reads. Exact `unknown` and exact `in_flight` MUST only poll until the fresh
deadline and MUST NOT authorize another POST. Exact `committed` MUST settle the
entry with its determinate receipt, and exact `failed`, malformed, or
contradictory state MUST settle it with a determinate `BackendFailed`. An
unexpected implementation cause MUST settle it as the memoized defect rather
than enter the typed failure channel. Read-only deadline or transport exhaustion
MUST publish another
`TransportFailed`, leave the entry indeterminate, and permit a later same-body
call to start another shared read-only recovery deadline without ever reopening
writes. The table is reachable only from the acquired resource, and a later
acquisition starts with a new table. No identity recognition, replay, cache
sharing, reconciliation, or duplicate-write prevention is promised across
resource release/reacquisition or loss of Fluree's in-memory submission record.

The private HTTP route mapping MUST be exact and MUST append these paths to the
configured `baseUrl` after removing only its trailing slash characters. Head,
ensure, create-race, idempotency-collision, and different-body refusal head reads
MUST split the validated line and use
`GET /v1/fluree/branch/${encodeURIComponent(family)}`, selecting the unique
entry whose `branch` and `ledger_id` exactly equal the requested branch and
line; creation uses `POST /v1/fluree/create` with exact JSON object
`{ ledger: line }`;
proposal writes use
`POST /v1/fluree/update?ledger=${encodeURIComponent(line)}` with exact
`Content-Type: application/sparql-update`, exact admitted `Idempotency-Key`, and
the canonical update body; submission reads use
`GET /v1/fluree/submissions/${encodeURIComponent(identity)}/${encodeURIComponent(line)}`;
and selects use `POST /v1/fluree/query` with exact
`Content-Type: application/sparql-query` and the canonical query body. Fork uses
`POST /v1/fluree/branch` with exact JSON object
`{ ledger: family, branch: toBranch, source: fromBranch }`; preview uses
`GET /v1/fluree/merge-preview/${encodeURIComponent(family)}` with exactly
`source` then `target` encoded through `URLSearchParams`; merge uses
`POST /v1/fluree/merge` with exact JSON object
`{ ledger: family, source: fromBranch, target: intoBranch, strategy: "abort" }`;
and lines uses `GET /v1/fluree/branch/${encodeURIComponent(family)}`. No alternate
route, method, content type, identity header, query member, request member, or
second write body is admitted. Every JSON request above MUST carry exact
`Content-Type: application/json`.

Every submission response MUST be an exact closed ordinary JSON data record.
`unknown` and `in_flight` have only the exact `state` key. `failed` has
exactly `state: "failed"` and a nonempty string `error` and returns
`BackendFailed`. A committed response MUST have required exact keys `state`,
`idempotency_key`, `kind`, `commit_id`, and `t`. Its state MUST be `committed`,
idempotency key MUST equal the requested identity, kind MUST be `transact`, `t`
MUST be a finite nonnegative safe integer, and `commit_id` MUST be a nonempty
string. The response MUST either omit both `detail` and the pinned `status`
compatibility alias or include both; one without the other is malformed. When
present, `detail` and `status` MUST have exactly the same values and exact keys
`operation`, `idempotency_key`, `commit_id`, `t`, and `flake_count`; their
operation MUST be `transaction`, identity/commit/position MUST equal the
top-level values, and flake count MUST be a finite nonnegative safe integer.
`flake_count === 0` MUST be equivalent to `commit_id` equalling the established
flake-less sentinel
`bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi`;
a positive flake count MUST carry a nonsentinel commit id. When both detail
records are omitted, the required canonical kit remains authoritative and the
same sentinel comparison MUST distinguish refused from applied. Missing,
fractional, negative, mismatched, empty, or contradictory required members MUST
return `BackendFailed` and MUST NOT become an applied or refused receipt.

The private HTTP boundary MUST parse every response from `unknown` and admit
only the established route status and complete required shape. Successful
`/create` and branch-creation `/branch` responses MUST use `201`; successful
`/update`, `/query`, `/merge-preview`, `/merge`,
`/submissions`, and branch-list responses MUST use `200`. Every admitted
exceptional response below MUST be a closed ordinary JSON data record whose own
enumerable keys are exactly `error`, `status`, and `@type`; no body regex,
substring, unparsed text, surplus member, or status alone may classify it.

The only create-race response is HTTP `409` with `status: 409`,
`"@type": "err:db/LedgerExists"`, and exact
`error: "Ledger already exists: <line>"` for the requested validated line. It
MUST be followed by one exact successful branch-list head read before
`ensureLedger` may return that head. The only idempotency collision is
`/update` HTTP `409` with `status: 409`,
`"@type": "err:db/CommitConflict"`, and exact
`error: "idempotency key collision: key already used for a different transaction"`;
it MUST return `AlreadyProposed` only after one exact successful head read.
The only answered in-progress update is `/update` HTTP `409` with `status: 409`,
`"@type": "err:db/CommitConflict"`, and exact
`error: "submission with this key is already in progress"`; it MUST close writes
for the acquisition-local entry and resume submission polling within the current
producer deadline without returning `AlreadyProposed`.
The only merge-conflict response is `/merge` HTTP `409` with `status: 409`,
`"@type": "err:db/CommitConflict"`, and exact error grammar
`Branch conflict: Merge aborted: <positive-safe-integer> conflict(s) between <source-branch> and <target-branch> with abort strategy`,
where both branch values equal the validated request. The only
`TimeUnreached` response is query HTTP `408` with `status: 408`,
`"@type": "err:db/ReadAfterWriteTimeout"`, and exact error grammar
`Ledger has not reached t=<requested>, current t=<current>`, where both values
are nonnegative safe integers, requested equals the input `at`, and current is
less than requested. A validated line absent from an exact successful branch
list is the sole `LedgerMissing` or create-needed branch. Every non-success
branch-list response, near miss, and every other non-success status MUST return
the operation's typed failure and MUST NOT become absence, refusal, merge
conflict, or `TimeUnreached`.

No successful decoder may default a missing position, counter, boolean, commit,
array, result envelope, binding cell, branch, or submission member to `0`,
`false`, `""`, or `[]`; a malformed 2xx response is `BackendFailed`. The
update response MUST distinguish the exact flake-less sentinel from a nonempty
applied commit, preview MUST derive public `mergeable` from the decoded
conflict count, and merge MUST send exact `strategy: "abort"`. A successful
merge MUST carry `conflict_count === 0`; any positive value is
`BackendFailed`, never a written `MergeConflict`. Failure detail MUST retain
the existing redaction and bound law and MUST never include the inspected URL,
headers, identity, body, raw response, or exception.

The required success projections are equally exact. Create MUST return
`ledger_id` equal to the requested line, safe-integer `t: 0`, and a `commit`
record with exact empty `hash`. A branch-list entry MUST carry one valid
`branch`, matching `ledger_id: family + ":" + branch`, and safe-integer `t`;
branch and ledger identities MUST be unique across the decoded list. The exact
matching entry supplies head position, while its absence supplies the sole
missing-line branch. Update MUST return
the exact projection specified below.
Task 6.3c clarifies that this matching branch-list record is the exact
`BranchInfo` projection and its safe-integer `t` is the sole HEAD source. The
provider MUST NOT infer HEAD from `/log` or from an ambiguous `/info` response.
Update MUST return
safe-integer `t` and `commit.hash`, and its successful
response MUST carry an `idempotency-key` header exactly equal to the admitted
identity; a missing, normalized, or mismatched echo is `BackendFailed`. Query
MUST return `results.bindings` as an array of records with exactly the requested
projected aliases, whose cells each have a recognized binding type and string
`value`. Branch creation MUST return `ledger_id`, `branch`, and `source` equal
to the requested target line, target branch, and source branch plus safe-integer
`t`. Preview MUST return `source` and `target` equal to the requested branches,
safe-integer count records for `ahead`, `behind`, and `conflicts`, and boolean
`fast_forward` and `mergeable`. Merge MUST return the requested target
`ledger_id`, `target`, and `source`; safe-integer `new_head_t`,
`commits_copied`, and `conflict_count`; boolean `fast_forward`; and exact
`strategy: "abort"` when it is not a fast-forward, with the `strategy` member
absent when it is. Branch listing MUST return the bare array containing those
records. Task 6.4 MUST capture the exact request and every positive/negative
shape so a fake cannot
independently manufacture the neutral answer while ignoring the production
request.

These ordinary successful vendor bodies use exact required projections, not the
closed-key discriminator law above: unlisted vendor members MAY be present but
MUST be ignored, MUST NOT classify an outcome, and MUST NOT enter a neutral DTO.
Every listed container and member remains mandatory with its exact type and
relation. Exceptional error envelopes and submission-state records remain
closed exactly as specified.

Task 6.4 import/build coldness MUST be exercised in a fresh isolated module
evaluation after replacing `globalThis.fetch` with a configurable throwing and
counting getter. The provider test MUST import the provider package and call its
synchronous `build(...)`; the SDK public-face and installed-package owners MUST
separately import their own neutral and `/fluree` entries and may call the same
public descriptor's build. Each owner MUST observe exactly zero getter reads as
well as zero fetch, Promise, acquire, release, or ledger-operation invocation,
without creating a provider-to-SDK edge. Deleting fetch or assigning
`undefined` is not sufficient proof. Task 7.4 remains the first owner allowed
to recover the opaque acquire body and observe its fetch read.

Task 6.4 MUST add these proofs only inside its already frozen corpus. Resource
and shared conformance tests own closed neutral input behavior, RDF set and
SPARQL bag semantics, canonical proposal equivalence, logical-slot collision,
commit ancestry, source-local position overlap, exact merge counters, reverse
and nested merges, frozen results, and guarded concurrency. Separate private
driver/conformance suites in the existing provider test file own the
one-namespace codec, captured canonical SPARQL,
status/shape/integer/sentinel decoding, single-flight and lost-answer state
machine, redaction, and no-request invalid-input cases without plan access. The
public-plan suite in that file owns only unchanged public plan/type assertions
and the fresh provider-package throwing-fetch-getter import/build proof. The SDK
public-face and installed-package owners each own the corresponding fresh
static-entry throwing-getter proof required above. TypeScript, Habitat, and Nx
retain their task-6.3a/6.3b owners and exact inventories.
No new public schema, decoder, helper, cache, digest, file, export, project,
relation, vendor package, or plan-execution seam is admitted.

After task 6.3d selects its artifact and task 6.4 eventually opens, the existing
`providers/fluree-http/test/provider.test.ts` MUST also own mandatory
live-image F1 and F2 proof. F1 MUST drive a source to high `t` and a target to
low `t`, perform a clean general merge whose target head is below imported
source `t`, prove that head from exact branch-list `BranchInfo.t`, and prove
exact source replay plus native counters. F2 MUST fork a descendant from the
high-`t` source, produce a bilateral same-slot conflict whose target conflict
commit is below `ancestor.t`, repeat after advancing the target above
`ancestor.t`, and assert exact preview `ahead`/`behind`/`conflicts`, native
abort with no write. F2 MUST also run an independent source-cutoff arm from a
fresh F1 history: add a disjoint fact to the low-`t` merged branch while its
local head remains at or below the high common ancestor, independently advance
the original high-`t` line to force non-fast-forward, and preview/merge the
low-`t` branch into that high-`t` target. The arm MUST report every reachable
low-`t` source-only commit in `ahead`, the exact target-only `behind`, zero
conflicts, `copied === ahead`, replay the source fact without losing the target
fact, create the head at target pre-merge `t + 1`, and preserve the exact two
pre-merge parents. The memory fixture and shared conformance MUST remain the provider-neutral
oracle. Fake HTTP tests MUST prove only codec, route/status, and decoder
behavior and MUST NOT qualify native ancestry semantics. These live-image
vectors add no file, API, edge, corpus member, count, or plan-execution seam.
Task 6.4 retains only Promise-level waiter/producer abandonment proof; task 7.4
alone retains real Effect-interruption proof.

Task 6.4's exact source corpus MUST be these 17 files:
`resources/semantic-ledger/AGENTS.md`, `contract.ts`, `habitat.toml`,
`package.json`, `project.json`, `tsconfig.build.json`, `tsconfig.json`,
`test/contract.test.ts`, `test/conformance.ts`, `test/memory.ts`,
`providers/fluree-http/AGENTS.md`, `providers/fluree-http/driver.ts`,
`providers/fluree-http/habitat.toml`, `providers/fluree-http/index.ts`,
`providers/fluree-http/project.json`, `providers/fluree-http/tsconfig.json`, and
`providers/fluree-http/test/provider.test.ts`.

Within that corpus, the private source package `package.json` MUST have exactly
this semantic inventory and no `main` or top-level `types` member:

```json
{
  "name": "@habitat-ai/resource-semantic-ledger",
  "version": "0.1.0",
  "private": true,
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rawr-ai/rawr-hq-template.git",
    "directory": "resources/semantic-ledger"
  },
  "type": "module",
  "files": [
    "contract.ts",
    "providers/fluree-http/driver.ts",
    "providers/fluree-http/index.ts"
  ],
  "exports": {
    ".": {
      "types": "./contract.ts",
      "default": "./contract.ts"
    },
    "./providers/fluree-http": {
      "types": "./providers/fluree-http/index.ts",
      "default": "./providers/fluree-http/index.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "bun test test/contract.test.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "typebox": "1.3.8"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  },
  "nx": {
    "tags": [
      "type:resource",
      "layer:resource-contract",
      "resource:semantic-ledger"
    ]
  }
}
```

The resource `project.json` MUST be semantically exact to:

```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "@habitat-ai/resource-semantic-ledger",
  "namedInputs": {
    "production": [
      "default",
      "{workspaceRoot}/resources/semantic-ledger/providers/**/*.ts",
      "!{workspaceRoot}/resources/semantic-ledger/providers/**/test/**",
      "!{workspaceRoot}/resources/semantic-ledger/providers/**/*.test.*",
      "!{workspaceRoot}/resources/semantic-ledger/providers/**/*.spec.*",
      "!{workspaceRoot}/resources/semantic-ledger/providers/**/vitest.config.*"
    ]
  },
  "targets": {
    "check": {
      "executor": "nx:noop"
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bun test {projectRoot}/test"
      }
    }
  }
}
```

It MUST omit `projectType`, `sourceRoot`, and `implicitDependencies`; its
package scripts MUST infer `build` and `typecheck`, so neither target may be
declared explicitly. The resource `tsconfig.json` MUST be semantically exact
to:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "files": [
    "contract.ts",
    "test/contract.test.ts",
    "test/conformance.ts",
    "test/memory.ts"
  ]
}
```

The resource `tsconfig.build.json` MUST be semantically exact to:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "."
  },
  "files": [
    "contract.ts",
    "providers/fluree-http/driver.ts",
    "providers/fluree-http/index.ts"
  ],
  "references": [
    { "path": "../../packages/core/runtime/definition" },
    { "path": "../../packages/core/runtime/schema" }
  ]
}
```

The provider `project.json` MUST be semantically exact to:

```json
{
  "name": "provider-semantic-ledger-fluree-http",
  "projectType": "library",
  "sourceRoot": "resources/semantic-ledger/providers/fluree-http",
  "tags": [
    "type:provider",
    "layer:resource-provider",
    "resource:semantic-ledger",
    "provider:fluree-http"
  ],
  "targets": {
    "check": {
      "executor": "nx:noop"
    },
    "typecheck": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc -p {projectRoot}/tsconfig.json --noEmit"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bun test {projectRoot}/test"
      }
    }
  }
}
```

It MUST have exactly those four tags and MUST omit `implicitDependencies`. The
provider `tsconfig.json` MUST be semantically exact to:

```json
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "files": [
    "driver.ts",
    "index.ts",
    "test/provider.test.ts"
  ]
}
```

Its exact disjoint publication corpus MUST be these ten files: root
`package.json` and `bun.lock`; `packages/core/sdk/AGENTS.md`, `README.md`,
`package.json`, and `tsdown.config.ts`; SDK
`src/resources/semantic-ledger/index.ts` and `fluree.ts`; SDK
`test/semantic-ledger-public-faces.test.ts`; and
`apps/habitat/test/installed-package.test.ts`. The complete task-6.4 diff MUST
be exactly that 27-file union. No 28th file is admitted, and
`scripts/habitat/product-separation-absence.test.ts` MUST remain untouched.

Root `package.json` MUST add exactly one alphabetized devDependency,
`@habitat-ai/resource-semantic-ledger: workspace:*`. Root workspace patterns
MUST remain 12 and release members MUST remain the SDK/CLI pair. Regenerated
`bun.lock` MUST grow workspace importer records from 11 to 12 and package
records from 1215 to 1216. SDK `package.json` MUST have zero private Habitat
dependencies and zero Fluree dependency, peer, or optional-peer metadata. SDK
exports MUST grow 21 to 23, tsdown entries 18 to 20, and private bundled
workspace specifiers 5 to 7. Policy-pack membership MUST remain 16 and copied
blueprint directories MUST remain 11.

The only additions to the SDK tsdown `alwaysBundle` inventory MUST be, in this
order, `@habitat-ai/resource-semantic-ledger` and
`@habitat-ai/resource-semantic-ledger/providers/fluree-http`. The existing
exact SDK face, count, publication-corpus, pack-membership, and copied-blueprint
law MUST otherwise remain unchanged.

SDK source wiring and SDK bundling MUST remain distinct exact authorities.
`packages/core/sdk/src/resources/semantic-ledger/index.ts` MUST re-export the
neutral values and types below only from
`@habitat-ai/resource-semantic-ledger`; it MUST have no provider source import.
That package-root source import MUST create the direct
`@habitat-ai/sdk -> @habitat-ai/resource-semantic-ledger` Nx relation.

`packages/core/sdk/src/resources/semantic-ledger/fluree.ts` MUST re-export the
exact `/fluree` values and types below only from the direct relative source
specifier
`"../../../../../../resources/semantic-ledger/providers/fluree-http/index"`.
The specifier MUST omit `.ts` and MUST NOT be replaced by
`@habitat-ai/resource-semantic-ledger/providers/fluree-http` in SDK source.
That package-subpath source import would map to the root
`@habitat-ai/resource-semantic-ledger` Nx project and therefore cannot establish
or prove the SDK-to-provider relation.
That exact relative source import MUST create the direct
`@habitat-ai/sdk -> provider-semantic-ledger-fluree-http` Nx relation. Inside
the provider source, the package self-import MUST remain exactly
`@habitat-ai/resource-semantic-ledger`, establishing the provider-to-resource
relation. The two ordered `alwaysBundle` specifiers above remain unchanged:
their package-subpath role in bundling MUST NOT substitute for either exact
source import or its Nx edge.

`@habitat-ai/sdk/resources/semantic-ledger` MUST export exactly runtime values
`semanticLedgerResource` and `term` and types `Binding`, `GraphNode`,
`GraphProperty`, `GroundTerm`, `GuardAbsence`, `LedgerApplied`, `LedgerHead`,
`LedgerMergePreview`, `LedgerMergeReceipt`, `LedgerReceipt`, `LedgerRefused`,
`SelectQuery`, `SemanticLedger`, `SemanticLedgerFailure`,
`SemanticLedgerFailureReason`, `SemanticLedgerOperation`, `Term`,
`TriplePattern`, `WriteGuard`, and `WriteRefusal`.

`@habitat-ai/sdk/resources/semantic-ledger/fluree` MUST statically re-export
exactly runtime values `FlureeHttpSemanticLedgerConfigSchema` and
`semanticLedgerFlureeHttpProvider` and types
`FlureeHttpSemanticLedgerAcquireFailure` and
`FlureeHttpSemanticLedgerConfig`. Consumer selection MUST mean importing this
static subpath deliberately, not dynamic loading. Neither face may export a
driver, fetch injection, constructor, factory, Promise port, raw Effect,
runner, acquire/release mechanic, plan body/accessor, or vendor mechanic.

Compatibility MUST be exactly `fluree/server:4.1.4`; existing Node, Effect, and
TypeBox pins MUST remain. No Fluree npm dependency, peer, optional peer, or lock
record may land. The neutral resource face MUST NOT reach the provider or
global fetch. The static cold `/fluree` face MUST import successfully with
global fetch absent.

Task 6.3c preserves the preceding sentence only as sealed task-6.3a history and
supersedes its execution authority. Before task 6.3d seals, no Fluree artifact
is compatible with task 6.4. After task 6.3d seals, the exact selected upstream
tag, commit, OCI digest, and provenance become task 6.4's sole compatibility
target. The Node, Effect, TypeBox, zero-Fluree-npm-metadata, neutral-isolation,
and cold-import constraints above remain authoritative.

TypeScript MUST prove every exact public shape and anonymous signature above,
success/failure inference, required normalized config output, tagged non-Error
failures, non-Promise public operations, and finite inventories. Resource tests
MUST use the private memory fixture to prove frozen term construction,
provider-neutral DTO, proposal/receipt, exact-history, fork/merge/lines,
identity, and guarded concurrency semantics. Private driver/conformance tests
MUST prove HTTP mapping, redaction, bounded failure classification, and
lost-answer recovery without plan access or execution. The provider test MUST
prove only public plan descriptor/metadata shape, TypeScript assignability, and
import/build coldness, with no accessor import/call, witness inspection, or body
recovery. It MUST also prove both config methods delegate, normalize successful
output freshly, preserve the base serializable/redacted shape, and never mutate
input. Sealed task 6.1 retains generic witness/body-identity proof. Habitat MUST
prove the two existing-kind structures; Nx MUST prove exact relations/counts
and no cycle; SDK and installed
acceptance MUST prove exact runtime keys/imports, no bundled workspace residue,
neutral isolation, cold `/fluree`, and zero Fluree metadata. Task 7.4 alone MUST
privately recover and execute this provider's acquire/release and prove exact
`providerFx.tryPromise(...)` fetch/error behavior, successful acquisition,
execution of the no-op release callback, and failure cleanup through the real
substrate.

Task 6.3c clarifies that the preceding `provider test MUST prove only` sentence
restricts that file's public-plan suite. Separate private driver/conformance
suites in the same admitted `providers/fluree-http/test/provider.test.ts` own
the preceding HTTP and shared-conformance work without plan access, witness
inspection, body recovery, or acquire/release execution.

#### Scenario: The semantic-ledger authority correction remains documentation-only

- **WHEN** task 6.3a is reviewed before task 6.4 begins
- **THEN** exactly the six active OpenSpec artifacts named above contain the
  correction and this requirement/scenario set remains the sole archive-safe
  acceptance owner
- **AND** this requirement is the sole exact public TypeScript/API authority and
  the other five artifacts contain only routed summaries
- **AND** every sealed receipt remains verbatim, task 6.4 remains pending, and
  no seventh file or executable artifact changes
- **AND** the held commit/path/tree is retained only as evidence with no
  cherry-pick, merge, restack, or ancestry claim

#### Scenario: The task-6.3b refinement remains documentation-only and archive-safe

- **WHEN** task 6.3b is reviewed before task 6.4 begins
- **THEN** exactly the same six OpenSpec artifacts named above contain the
  refinement, no seventh file changes, and every task-6.3a sentence and receipt
  remains verbatim
- **AND** this specification is the sole exact API and mechanics authority,
  `tasks.md` remains only a routed execution summary, and task 6.4 remains
  pending until task 6.3b lands
- **AND** no executable, implementation, source, test, project, blueprint,
  manifest, lockfile, SDK, canonical/system document, owner router, proposal,
  runtime behavior, stage, commit, or push changes

#### Scenario: The task-6.3c runtime-law correction is additive and archive-safe

- **WHEN** task 6.3c is reviewed before task 6.4 resumes
- **THEN** exactly the same six OpenSpec artifacts named above contain the
  correction, no seventh file changes, and every task-6.3a and task-6.3b
  sentence and receipt remains byte-identical
- **AND** this specification is the sole exact mechanics and archive-safe
  acceptance authority, while the other five artifacts only route or summarize
  it and task 6.4 remains pending until task 6.3c lands
- **AND** only the later activation state, subject-wide collision claim,
  globally exact post-general-merge position claim, durable lost-answer claim,
  and preserved `fluree/server:4.1.4`-only execution compatibility are
  superseded by additive task-6.3c text
- **AND** no executable, implementation, source, test, project, blueprint,
  manifest, lockfile, SDK, canonical/system document, owner router, proposal,
  runtime behavior, stage, commit, or push changes

#### Scenario: Task 6.3c records the official-runtime blocker before sealing

- **WHEN** task 6.3c is reviewed against exact official refs
  `v4.1.4@07316fa440548247e8985215b8151965d2c72726`,
  `v4.1.5@d767927dae550a6ecde8f15603ad9c195de60351`, and upstream
  `main@a85e0368285575204d75227742ac9d8ee5d1f0a7` observed on 2026-08-11
- **THEN** it records their numeric-`ancestor.t` preview/merge delta,
  source-replay, and copy-chain cutoff and does not claim that they realize the
  unrestricted neutral merge law
- **AND** it records that source-local `t` after a general merge permits nested,
  cousin, reverse, and repeated histories to omit reachable commits, miss
  conflicts, and lose facts
- **AND** exact branch-list `BranchInfo.t` remains the sole HEAD source, with no
  `/log` or ambiguous `/info` substitution
- **AND** no process/acquisition epoch, preflight, single-actor condition,
  sequence assumption, or degraded no-merge behavior narrows the public law
- **AND** the existing task-6.4 27-file work in progress is inadmissible, task
  6.4 source remains closed, and the task-6.3c receipt activates task 6.3d

#### Scenario: Task 6.3d qualification is documentation-only and decisive

- **WHEN** task 6.3d runs after task 6.3c seals
- **THEN** exactly the same six OpenSpec artifacts change and no source, test,
  publication, project, proposal, canonical/system document, owner router,
  manifest, lockfile, SDK file, runtime behavior, stage, commit, or push changes
- **AND** it selects one immutable reproducible wire-compatible Fluree artifact
  by upstream tag and commit plus OCI digest and provenance only when native
  preview counters, conflict delta, source replay, and copy-chain traversal use
  ancestor CID or reachable-set membership rather than numeric `t`
- **AND** before selection it runs disposable live-image F1 and F2 against that
  exact digest and records the immutable command, image, HEAD, ancestry,
  counter, abort, copy, and parent evidence in the same six-document corpus;
  source inspection or provenance without these live outcomes cannot qualify it
- **AND** before positive selection any source/live survivor also proves
  reproducibility through a frozen rebuild recipe, toolchain, and base-image set
  plus at least two independent index and platform rebuilds whose bytes are
  identical to each other and whose digests equal the selected published index
  and platform digests, or another exact authority-equivalent proof; SLSA
  provenance with absent or null `reproducible`, or absent or false
  `resolvedDependencies`, cannot satisfy this gate
- **AND** before this task seals no Fluree artifact is compatible with task 6.4,
  while afterward the selected tag, commit, OCI digest, and provenance are task
  6.4's sole compatibility target and supersede preserved 4.1.4-only execution
  statements without changing the Node, Effect, TypeBox, or dependency law
- **AND** if none exists it stops for a later owner decision between explicit
  fail-closed no-merge capability and redesign, without inventing a local patch
  or deployment promise
- **AND** tasks 6.4 and 6.5 remain pending behind task 6.3d

#### Scenario: Task 6.3d no-candidate receipt is additive and archive-safe

- **WHEN** the complete bounded `G`, `I`, and `U` universe is evaluated in the
  recorded stable UTC window
- **THEN** every `I` and `U` record is classified exactly once, `qualified=0`,
  and the exact F1/F2 disposition is
  `NOT RUN: no candidate satisfied the mandatory source predicate`
- **AND** no Fluree artifact, tag, commit, OCI digest, provenance, compatibility
  target, local patch, or deployment promise is selected
- **AND** captured SLSA statements omit `reproducible` and have
  `resolvedDependencies` either absent or false, so they cannot satisfy the
  affirmative reproducibility gate required of any future source/live survivor
  before positive selection
- **AND** task 6.3d remains unchecked and unsealed with status
  `STOPPED — NO_CANDIDATE; positive qualification unsealed`, task 6.3e is the
  sole active owner-decision node, and tasks 6.4 and 6.5 remain pending and
  closed
- **AND** the negative vendor-artifact result does not falsify or narrow the
  unrestricted neutral merge law and supersedes no preserved
  4.1.4-only/version stop
- **AND** every earlier task-6.3a/b/c/d line and receipt, pin, API, file, edge,
  corpus, count, publication boundary, package-metadata exclusion, and task-7
  allocation remains preserved
- **AND** a new advertised canonical upstream ref or new official registry
  image triggers only a complete newly bounded inventory rerun and does not by
  itself select an artifact, check off task 6.3d, or open tasks 6.4/6.5
- **AND** after the six-document evidence change merges and exact-main Ratchet
  passes, an immediate receipt changes only `tasks.md` and
  `execution-queue.md`, records immutable landing/check identities, leaves task
  6.3d unchecked and unsealed, and lands before task-6.3e decision edits

#### Scenario: Task 6.3e selects the provider-neutral corrected-artifact direction

- **WHEN** the task-6.3e owner decision is reviewed after the no-candidate
  landing receipt
- **THEN** option (b) preserves unrestricted provider-neutral merge and every
  existing API, behavior, config, topology, corpus, publication, package-
  metadata exclusion, Promise-level waiter allocation, and task-7 allocation
- **AND** the smallest admitted realization is one independently released
  corrected external Fluree server artifact based on exact official
  `v4.1.5@d767927dae550a6ecde8f15603ad9c195de60351`, consumed by the existing
  provider as ordinary external OCI compatibility evidence
- **AND** the provider keeps its exact `baseUrl` config and no binary-attestation
  API, while the deployment handoff alone owns the exact digest pin
- **AND** fail-closed no-merge, provider-side emulation, sidecar/proxy,
  epoch/preflight/sequence or singular-ancestor restriction, and a third Habitat
  owner, API, project, or package remain rejected
- **AND** exactly the six authorized OpenSpec artifacts change additively, task
  6.3e remains unchecked, exactly one unchecked task 6.3f is added, the count is
  56/115, task 6.3d remains unchecked/stopped/unsealed, and tasks 6.4/6.5 remain
  closed
- **AND** no external origin, repository, namespace, tag, corrected commit,
  digest, or provenance is selected, and neither `rawr-ai/db` nor any registry
  namespace is represented as existing or authorized

#### Scenario: Task 6.3e landing activates only the authorized successor

- **WHEN** the six-document decision merges and exact-main Repository Ratchet
  passes
- **THEN** one immediate receipt changes exactly `tasks.md` and
  `execution-queue.md`, records PR/head/main/tree/check identities, and flips
  only task 6.3e to checked
- **AND** task 6.3f becomes active, task 6.3d remains unchecked, stopped, and
  unsealed, and tasks 6.4 and 6.5 remain pending and closed
- **AND** the receipt performs no external mutation and the explicit task-state
  record overrides the generic first-unchecked rule

#### Scenario: Task 6.3f qualifies every external artifact dimension together

- **WHEN** task 6.3f begins after its landing receipt
- **THEN** it stops at `AUTHORIZATION_REQUIRED` before external mutation until
  explicit organization authorization names the source and registry origins and
  owns repository creation, publication/signing, maintenance/security,
  licensing/retention, and upstream rebases
- **AND** after authorization, one complete source and target reachable-CID set
  pair `S` and `T` yields `S \ T` and `T \ S` once, and the identical sets feed
  preview counters, conflict delta, source replay, and copy without numeric-`t`
  or singular-ancestor topology ownership
- **AND** wire/storage, branch-list `BranchInfo.t`, source-local `t`, and native
  two-parent semantics remain unchanged, the public preview gains no ancestor
  field, and fork-owned criss-cross/equal-`t`/nonmonotonic-`t`/storage-upgrade/
  restart regressions prove both the correction and preservation
- **AND** a frozen toolchain, recipe, base-image, and dependency set produces at
  least two independent byte-identical corresponding index/platform builds that
  match every published digest, with provenance, complete SBOM, and retained
  license/notice evidence
- **AND** BUSL-1.1 and its notice remain conspicuous, derivative branding is
  distinct, no ungranted trademark is relied upon, and deployment stays within
  the Additional Use Grant and outside a Database Service; otherwise it stops
  at `LICENSE_REQUIRED` until another license is obtained
- **AND** live F1 and both F2 arms pass on every admitted platform before one
  exact source/registry/index/platform/provenance/SBOM/license/evidence tuple is
  selected for task 6.4, with the deployment handoff rather than provider config
  owning the digest pin
- **AND** any partial authorization, correction, build, platform matrix,
  evidence chain, license posture, or live outcome leaves task 6.4 closed

#### Scenario: Semantic input, storage, and query realization are canonical and safe

- **WHEN** task 6.4 admits a semantic operation and renders its private Fluree
  request
- **THEN** every input and nested value has exact own-data closed shape,
  identity has 1 through 128 bytes of exact non-edge-whitespace printable ASCII,
  lines and positions satisfy their exact grammars, and malformed, trapping,
  surplus, or total-zero input returns typed `InvalidInput` before state or fetch
- **AND** fork, merge, and preview refuse cross-family line pairs before state or
  fetch
- **AND** graph ids and predicates are logical IRIs, triple-pattern subjects and
  predicates admit only IRIs or variables, and literal terms remain object-only
- **AND** node grouping, order, and exact duplicates collapse to one sorted
  flattened triple-set body, conditional clauses and logical variables receive
  deterministic canonicalization, and exact-body comparison rather than a raw
  graph digest owns proposal sameness
- **AND** every logical IRI round-trips through the one private
  `urn:habitat:semantic-ledger:iri:` base64url namespace, caller IRIs and names
  never enter SPARQL syntax, and literals receive complete SPARQL escaping
- **AND** visible ground triples form a set while plain `SELECT` projection is a
  bag: equal solution rows remain, `DISTINCT` and local row deduplication are
  absent, row order is non-authoritative, and every returned row/array is fresh
  and frozen

#### Scenario: Merge behavior follows logical slots and commit ancestry

- **WHEN** the memory fixture and private HTTP seam preview and merge forked
  lines
- **THEN** source-only and target-only same-slot changes and disjoint predicates
  on one subject merge, but equal or differing object sets after both sides
  changed one `(subject, predicate)` slot return `MergeConflict` with no write
  under exact native `strategy: "abort"`
- **AND** the one provider-owned IRI namespace prevents post-fork namespace-code
  allocation from turning a logically clean merge into a vendor-only conflict
- **AND** ahead, behind, copied, fast-forward, and the new head follow the exact
  commit-ancestry rules above across fast-forward, already-current, general,
  reverse, repeated, cousin, and nested merges, including factless merge commits
- **AND** source commits retain source-local positions, a general merge has one
  two-parent head and excludes it from copied count, and a query at an
  overlapped post-merge position deliberately returns the union of both chains
- **AND** every position and counter is a finite nonnegative safe integer,
  public mergeability is `conflicts === 0`, and no missing or malformed value is
  defaulted
- **AND** memory plus shared conformance is the provider-neutral oracle; fake
  HTTP responses prove only codec, route/status, and decoder behavior and do not
  qualify native ancestry semantics

#### Scenario: Qualification and acceptance both cross the numeric-cutoff failures

- **WHEN** task 6.3d qualifies one exact OCI digest through a disposable live
  probe and task 6.4 later repeats the same vectors through the existing provider
  test file
- **THEN** F1 advances source to high `t` and target to low `t`, performs a clean
  general merge whose target head is below imported source `t`, obtains HEAD
  from exact branch-list `BranchInfo.t`, and proves exact source replay and
  native counters
- **AND** F2 forks a descendant from the high-`t` source, creates a bilateral
  same-slot conflict whose target conflict commit is below `ancestor.t`, repeats
  after target advances above `ancestor.t`, and observes exact preview
  `ahead`/`behind`/`conflicts` plus native abort with no write in both cases
- **AND** an independent F2 source-cutoff arm starts from a fresh F1 history,
  adds a disjoint fact to the low-`t` merged branch while its head remains at or
  below the high common ancestor, advances the original high-`t` line to force
  non-fast-forward, then previews and merges the low-`t` branch into that target
- **AND** the source-cutoff arm reports every reachable low-`t` source-only
  commit in `ahead`, exact target-only `behind`, zero conflicts, and
  `copied === ahead`; it replays the source fact, preserves the target fact,
  creates target pre-merge `t + 1`, and records the exact two pre-merge parents
- **AND** task 6.3d records the disposable probe's immutable command, digest,
  and outcomes without repository source/test changes, while task 6.4 installs
  the same vectors as non-skippable acceptance in the already admitted file
- **AND** neither proof adds a file, API, edge, corpus member, count, fake-HTTP
  ancestry oracle, or plan execution

#### Scenario: Lost-answer recovery is single-flight and lifetime-bounded

- **WHEN** same-body, different-body, answered, unanswered, unknown,
  in-flight, committed, failed, malformed, and exhausted proposal attempts run
  against one private acquired driver
- **THEN** one exact-body table-owned producer is installed before the first
  POST, the creator and same-body followers are only waiters, and a different
  body sends no write and receives `AlreadyProposed`
- **AND** task 6.4 races either returned Promise waiter against a controlled
  test gate, then completes the producer; the other waiter receives the shared
  outcome, send count remains one, and replay/memoization remains exact; this is
  waiter-abandonment proof, not Effect-interruption proof
- **AND** the initial producer's one absolute deadline permits exactly one
  initial POST, submission polling, and at most one replacement POST authorized
  only by exact `unknown`; starting the replacement or exhausting that deadline
  permanently closes writes
- **AND** a determinate receipt, typed failure, or defect is memoized in its
  exact terminal category for the acquisition, while waiter interruption is not
  memoized and an indeterminate `TransportFailed` leaves a write-closed entry
- **AND** a later same-body call on that entry starts or joins one shared fresh
  read-only recovery deadline, performs only submission reads, and sends no POST
  even when the backend reports exact `unknown`
- **AND** release discards the table and no cross-reacquisition, backend-restart,
  durable-reconciliation, or cache-TTL guarantee is claimed
- **AND** committed submission identity, kind, position, operation, flake count,
  and sentinel equivalence are strict, while contradictory records return
  `BackendFailed`

#### Scenario: HTTP decoding and import coldness are non-vacuous

- **WHEN** provider conformance exercises every route status and success payload
  plus import/build coldness
- **THEN** create and branch creation admit exact `201`, ordinary used routes
  admit exact `200`, and only the exact closed status/type/error discriminators
  above receive absence, collision, or history handling
- **AND** the exact answered in-progress update closes writes and resumes
  submission polling, while the exact idempotency collision alone becomes
  `AlreadyProposed` after its required head read
- **AND** near-miss `409` and `408` bodies, surplus error members, and every
  other status return a typed redacted failure rather than a semantic result
- **AND** malformed 2xx JSON, missing members, unsafe integers, wrong booleans,
  malformed branch/head entries, malformed bindings, duplicate line entries,
  and inconsistent submission records return `BackendFailed` rather than
  plausible defaults
- **AND** raw Fluree `mergeable: true` with a positive preview conflict count
  projects public `mergeable: false`, merge requests carry exact
  `strategy: "abort"`, and a successful merge body with positive
  `conflict_count` is `BackendFailed`
- **AND** a fresh isolated import and synchronous build under a throwing and
  counting `globalThis.fetch` getter perform zero getter reads and execute no
  Promise, fetch, acquire, release, or ledger operation

#### Scenario: Resource, provider, plan, and config descriptors are exact

- **WHEN** task 6.4's public descriptors and owner-local config mechanics are
  inspected
- **THEN** the resource and provider retain the exact generic types, ids,
  titles, purpose, lifetimes, exact reference identities, frozen empty
  requirements, config key, and absent optional members declared above
- **AND** `acquireRelease(...)` omits policy and telemetry while the public
  acquire/release records retain their exact boundaries and explicit
  `policy: undefined` and `telemetry: undefined` keys
- **AND** the closed annotation-free/default-free TypeBox schema uses the exact
  URL refinement, error, timeout bounds, and additional-property refusal above
- **AND** the frozen wrapper reuses the base kind, serializable schema,
  redaction, and redacted-shape callable by exact reference, omits description,
  returns an unchanged base failure by identity, and returns a fresh frozen
  success result and config on every success
- **AND** the no-argument release, private witness/body identity, and task-7.4
  execution boundaries remain unchanged

#### Scenario: Source package, Nx projects, TypeScript projects, and bundling are exact

- **WHEN** task 6.4's package, project, tsconfig, and SDK build metadata are
  inspected
- **THEN** the private source package has exactly the package JSON inventory,
  source-file export map, scripts, dependencies, development dependency, and
  Nx tags above, with `main` and top-level `types` absent
- **AND** the resource project has exactly its schema, name, production input,
  explicit check/test targets, inferred package build/typecheck, and declared
  absences, while its two tsconfigs have exactly the files, options, and two
  project references above
- **AND** the provider project and tsconfig have exactly the root, four tags,
  three targets, three files, and declared implicit-dependency absence above
- **AND** the SDK adds exactly the two ordered `alwaysBundle` specifiers and
  preserves every existing exact face, count, corpus, pack, and blueprint law

#### Scenario: SDK source wiring establishes both qualified Nx edges

- **WHEN** the two SDK semantic-ledger entry modules and the typed Nx graph are
  inspected
- **THEN** the neutral entry re-exports only from the resource package root and
  that source import creates the direct SDK-to-resource relation
- **AND** the `/fluree` entry re-exports its exact values and types only from
  `"../../../../../../resources/semantic-ledger/providers/fluree-http/index"`
  without a `.ts` suffix, and that source import creates the direct
  SDK-to-provider relation
- **AND** SDK source does not import the provider package subpath, while the
  subpath would map to the root resource Nx project rather than the provider;
  the provider's package self-import remains
  `@habitat-ai/resource-semantic-ledger` and creates its resource relation
- **AND** both ordered `alwaysBundle` package specifiers remain exact without
  serving as source-edge evidence or changing any face, count, or corpus law

#### Scenario: The exact resource and provider owners land together

- **WHEN** task 6.4 re-authors the admitted semantic-ledger slice
- **THEN** exactly the two resource/provider roots, Nx identities, existing
  blueprint selections, ids, config key, and exported values are present
- **AND** exactly the 17 source and ten publication files form the 27-file diff
- **AND** the graph has 29 projects, 56 typed edges, the six exact direct source
  relations plus the root workspace relation, no reverse/implicit edge, and no
  cycle
- **AND** no third project, kind/version, package-shaped runtime owner, public
  memory provider, or release member appears

#### Scenario: The public resource face preserves determinate ledger semantics

- **WHEN** TypeScript and the private memory conformance fixture exercise all
  eight operations, guards, receipts, history, forks, merges, lines, identities,
  and concurrent claims
- **THEN** every public operation is a `HabitatEffect` with exact success and
  `SemanticLedgerFailure` channels and is not Promise
- **AND** the public DTOs, anonymous readonly inputs, frozen `term` callable,
  operation signatures, two failure shapes, and finite symbols are exactly the
  closed contract above with no helper, port, or named input DTO
- **AND** exactly one guarded claimant applies under contention, every refusal
  writes nothing and returns a successful refused receipt, historical reads are
  exact, noncolliding line facts survive merge, and colliding subjects fail
  without mutation
- **AND** the tagged failure has only the frozen fields/reasons and its redacted
  detail is at most 4,096 UTF-16 code units using the exact truncation rule
- **AND** within the preceding behavioral shorthand, task 6.3c supersedes only
  its historical/collision claims:
  exact single-chain history holds before a general merge and outside overlap,
  overlapped positions union both commit chains, one-sided same-slot changes or
  disjoint predicates merge, and every bilateral change at one logical slot
  conflicts even when the resulting object sets are equal

#### Scenario: The provider descriptor stays cold and redacted

- **WHEN** closed config is decoded, the provider module is imported with
  global fetch absent, and synchronous build constructs its plan
- **THEN** the closed TypeBox base has no default annotation, and both wrapper
  methods delegate then return fresh frozen required config on success without
  mutating input or changing the base serializable/redacted shape
- **AND** config enforces the exact URL and timeout bounds, applies
  `timeoutMilliseconds ?? 30_000`, and publishes exactly `["baseUrl"]`
  redaction paths
- **AND** import/build invoke no fetch, Promise, acquire, release, or ledger
  operation and return one cold acquire/release plan whose release is exactly
  the no-parameter callback `() => providerFx.succeed(undefined)` with return
  type `ProviderFx<void, never>`
- **AND** provider tests observe only public plan descriptor/metadata shape,
  TypeScript assignability, and import/build coldness with no accessor, witness,
  or body recovery
- **AND** diagnostics contain none of the forbidden transport or identity data
- **AND** task 6.3c makes that coldness proof non-vacuous through a fresh
  throwing and counting fetch getter with zero import/build property reads;
  deletion or assignment of `undefined` is not the acceptance oracle
- **AND** task 6.3c clarifies that the preceding restriction applies to the
  public-plan suite, while separate private driver/conformance suites coexist in
  the same frozen provider test file without plan access or execution

#### Scenario: Private transport conformance cannot widen the public face

- **WHEN** provider tests exercise HTTP mapping, failure mapping, redaction,
  lost-answer recovery, and the shared conformance cases
- **THEN** Promise and injected fetch remain confined to private `driver.ts` and
  the private test seam
- **AND** the same provider-neutral cases run without a substrate or plan
  accessor and task 6.4 executes no acquire/release plan body
- **AND** no driver, injected transport, constructor, factory, Promise port,
  runner, raw Effect, plan mechanic, or vendor value is package- or SDK-reachable

#### Scenario: Live substrate alone proves provider Effect execution

- **WHEN** task 7.4 runs the semantic-ledger provider through the real substrate
- **THEN** the substrate privately recovers and executes the provider's opaque
  acquire/release and exact `providerFx.tryPromise(...)` fetch/error mapping is
  observed, including the two-field `FetchUnavailable` failure when global
  fetch is absent
- **AND** successful acquisition constructs the resource and invokes the exact
  no-op release callback through substrate-owned lifecycle execution
- **AND** no task-6.4 resource, driver/conformance, provider, SDK, or installed
  test is cited as behavioral proof of either opaque plan body
- **AND** task 7.4 runs one representative shared-conformance `propose(...)`
  vector through the actually acquired value, and the controlled global-fetch
  gate observes its exact canonical request, binding the opaque acquire output
  to the tested driver
- **AND** separate creator- and follower-interruption cases satisfy the exact
  interruption, surviving-producer, one-write, attached-waiter, and replay
  obligations above without a second execution path

#### Scenario: SDK publication is exact, static, and vendor-free

- **WHEN** source and installed consumers import the neutral and `/fluree`
  subpaths with global fetch absent
- **THEN** the two exact finite runtime/type inventories are present, the
  neutral face cannot reach provider/fetch, and the static `/fluree` descriptor
  remains cold
- **AND** exports, build entries, and bundled workspace specifiers become 23,
  20, and 7 while pack members and copied blueprint directories remain 16 and
  11
- **AND** root workspace/lock deltas are exact, packed output has no unresolved
  workspace residue, and no Fluree dependency/peer/optional/lock metadata exists

#### Scenario: Semantic-ledger widening stops before a partial landing

- **WHEN** task 6.3a or task 6.4 would require a seventh authority file, 28th
  implementation file, second public API authority, extra
  kind/version/project/package, public Promise/fetch/driver/factory/helper/port
  or named input, reverse/implicit/cyclic edge, another config field, TypeBox
  default annotation, wrong release callback, task-6.4 accessor import/call,
  witness inspection, body recovery or invocation, broader Fluree
  version/metadata, Rawr policy, canonical/system edit, or live lifecycle
  execution
- **THEN** the active task stops without widening or partially landing
- **AND** task 7.4 remains the only owner of live provider acquisition, release,
  and failure-cleanup proof

#### Scenario: Task-6.3b exactness drift stops separately

- **WHEN** task 6.3b or later task 6.4 would drift a descriptor type, field,
  literal, reference, absence, or plan metadata; the schema, URL refinement,
  wrapper identity, or result freeze; the package JSON, export, script,
  dependency, or tag inventory; a project JSON, named input, target, tsconfig,
  file, or project reference; an SDK source specifier, provider self-import, or
  source-created Nx edge; or the SDK `alwaysBundle` additions
- **THEN** the active task stops without widening the six-document authority
  boundary or partially landing
- **AND** the sealed task-6.3a stop record above remains historical authority
  and task 7.4 remains the only owner of live provider acquisition, release,
  and failure-cleanup proof

#### Scenario: Task-6.3c runtime-law drift stops separately

- **WHEN** task 6.3c or later task 6.4 would delete or rewrite sealed 6.3a/6.3b
  text; add a seventh authority or 28th implementation file; add an API, owner,
  kind, project, edge, export, or storage namespace; restore subject-wide
  collision; renumber source commits; create a one-parent general merge; count
  facts instead of commits; emit `SELECT DISTINCT`; deduplicate projected rows;
  interpolate a caller IRI or logical variable; admit an unsafe line, malformed
  closed input, or total-zero proposal; compare an abbreviated body digest;
  send a blind retry; propagate waiter cancellation to the table-owned producer;
  memoize waiter interruption; reopen writes or send a POST during read-only
  recovery; promise restart/reacquisition durability; default a missing response
  member; accept sentinel/flake inconsistency; or read fetch during import/build
- **THEN** the active task stops without widening or partially landing
- **AND** the exact API, 17-source/ten-publication/27-file corpus, topology and
  publication counts, provider-plan boundary, and task-7.4-only live lifecycle
  ownership remain unchanged

#### Scenario: Task-6.3d qualification drift stops separately

- **WHEN** task 6.3d would admit numeric-`ancestor.t` traversal, infer HEAD from
  `/log` or ambiguous `/info`, pin no tag/commit/digest/provenance, substitute a
  process/acquisition epoch, preflight, single actor, sequence restriction, or
  degraded no-merge behavior, use fake HTTP as native-semantic proof, promise a
  local patch/deployment, open task-6.4 source early, or add a file, API, edge,
  corpus member, project, publication file, or count
- **THEN** task 6.3d stops without selecting the artifact or partially opening
  task 6.4
- **AND** absence of a qualifying artifact routes only to the later owner
  decision between explicit fail-closed no-merge capability and redesign
- **AND** task 6.4 retains Promise-level waiter/producer proof and task 7.4
  retains real Effect-interruption proof

#### Scenario: Task-6.3e and task-6.3f realization drift stops separately

- **WHEN** task 6.3e or 6.3f would narrow unrestricted merge; introduce
  provider-side emulation, sidecar/proxy, epoch/preflight/sequence or singular-
  ancestor restriction, or a third Habitat owner/API/project/package; claim an
  unauthorized source or registry identity including `rawr-ai/db`; mutate an
  external system before organization authorization; drift the exact v4.1.5
  base or unchanged wire/storage/HEAD/source-local-position/two-parent law;
  compute different reachability memberships for preview/conflict/replay/copy;
  let numeric `t` or one ancestor own topology; add a public ancestor or digest
  API; omit a required fork-owned DAG/storage/restart regression; accept fewer
  than two reproducible builds or any unmatched index/platform digest; omit
  provenance, SBOM, license, notice, distinct branding, use-grant, trademark,
  retention, security, or maintenance evidence; expose a Database Service
  without another license; skip an admitted platform or either F2 arm; or
  partially open task 6.4
- **THEN** the active task stops without selecting a compatibility tuple or
  widening Habitat
- **AND** absent organization authorization the exact stop is
  `AUTHORIZATION_REQUIRED`; Database Service exposure without another license
  stops at `LICENSE_REQUIRED`; and any later failed qualification remains
  unselected
- **AND** task 6.3d stays unchecked/stopped/unsealed absent a separate positive
  official-universe rerun, and tasks 6.4 and 6.5 remain pending and closed

### Requirement: Runtime providers remain cold until Effect provisioning

A `RuntimeProvider` MUST implement one `RuntimeResource` contract and own its
resource requirements, config schema/decoder, observation redaction metadata,
health/refresh metadata, and `build(...)`. `runtime-definition` MUST own the
TypeBox `RuntimeObservationRecord` and narrow non-authorizing
`RuntimeObservationPort`; build MUST receive that port through the exact
task-6.1 context without importing the downstream observation implementation.
The compiler reference handoff MUST retain the exact provider references plus
provider-owned config decoder and observation-redaction metadata. The task-6.2
ordered boot artifact MUST carry only resource/provider identity,
dependency order, deduplication, rollback order, and release-order metadata.
The future Effect substrate MUST join those two inputs; neither handoff may
carry a provider plan or acquire/release body. Before the first provider
acquisition, the runtime config component MUST materialize every declared
source and successfully resolve and decode every provider config plus service
scope/config ref. A missing optional dotenv/file source alone MAY be skipped;
missing required
sources, absent declared memory/test sources, malformed or unreadable sources,
exhausted keys, and winning decode failures MUST refuse with zero acquisition.
Task 7.2 MUST assemble the substrate-private concrete frozen
`RuntimeResourceMap` from already-provisioned dependency values without a
public factory. Its `has(...)` and `get(...)` operations MUST key only by exact
declared `ResourceRequirement` reference; an identity-equivalent copy MUST miss,
and runtime required/optional lookup MUST agree with the task-6.1 overload
contract.

The Effect provisioning kernel MUST own one
`effect@4.0.0-beta.101` `ManagedRuntime` created from exactly one substrate
`Layer.effectContext` lifecycle adapter for each started process. The adapter
MUST consume bootgraph order as ordinary data and, only after dependency
readiness, call synchronous `build(...)` with the already-decoded full config,
exact dependency-resource map, and observation port. It MUST privately recover
the returned plan bodies. Task 7.2 MUST construct and use the real beta.101
`Effect.acquireRelease(acquire, release)` adapter, execute acquire, register
required release immediately after successful acquisition, and return the
assembled process Context. It MUST prove that executing `tryPromise` maps both
synchronous throw and Promise rejection through the authored mapper into typed
acquire error and that typed acquire failure registers no release. Provider
build throw, private accessor rejection of a forged plan, and Effect defect MUST
remain defects rather than typed acquire failures. Task 7.3 MUST execute cleanup
through that already-constructed adapter and prove expected-cleanup recovery and
observation inside the provider's infallible release Effect, unexpected release
defect observation without preventing later releases, startup rollback, reverse
release order, inert repeated disposal/release, and runtime close. It MUST NOT
construct, lower, or register another adapter. The substrate MUST
force the managed context before any mount. `ManagedRuntime` MUST own all
process scopes, fibers, and reverse release; Habitat MUST NOT create a second
root `Scope`, a second or per-execution ManagedRuntime, or reinterpret bootgraph
order as Layer composition. Domain services MUST remain Habitat services bound
by process runtime, not Effect services, Context tags, or Layer nodes.
Provider-owned redaction applies only to diagnostic, telemetry, and catalog
observation projections.
A provider MUST NOT select itself or construct a managed runtime.

Tasks 6.4 and 6.5 MUST prove only the qualified semantic-ledger and
temporal-inquiry Fluree HTTP providers' config schema/normalization contracts,
cold plan construction, and private conformance. Those nodes MUST perform no
live acquisition, release, or failure cleanup. Semantic-ledger transport
conformance MUST run through its private driver/test seam with no plan access;
its separate provider test proves only public plan descriptor/metadata shape,
TypeScript assignability, and import/build coldness and MUST NOT access the
private accessor/witness or recover/execute a plan body. Sealed task 6.1 owns
generic witness/body-identity mechanics. Task 7.4 MUST run both providers
through the real Effect substrate; for semantic ledger it alone privately
recovers/executes acquire/release and proves exact `tryPromise` fetch/error
behavior, successful acquisition, no-op release execution, and lifecycle
cleanup.

#### Scenario: Compiler references and boot order remain separate

- **WHEN** task 6.2 emits the ordered boot artifact beside the compiler
  reference handoff
- **THEN** the boot artifact contains only resource/provider identity,
  dependency order, deduplication, rollback order, and release-order metadata
- **AND** exact provider references plus provider-owned config decoder and
  observation-redaction metadata remain only in the compiler reference handoff
- **AND** the future substrate joins both inputs without either carrying a
  provider plan or acquire/release body

#### Scenario: Qualified provider integration remains cold before substrate proof

- **WHEN** tasks 6.4 and 6.5 complete their provider conformance suites
- **THEN** each proves its config schema/decode contract, cold plan construction,
  and provider conformance
- **AND** neither task performs live acquisition, release, or failure cleanup
- **AND** semantic-ledger uses only its private Promise/fetch conformance seam
  and executes no provider plan body

#### Scenario: Config preflight completes before first acquisition

- **WHEN** a compiled plan carries provider config and service scope/config refs
  expanded across the five declared source variants
- **THEN** source availability, authored-order exact-key first-hit lookup, and
  owning-schema decode for every ref complete before any provider acquisition
- **AND** an absent required source, absent declared memory/test source,
  malformed or unreadable source, exhausted key, or winning decode failure
  refuses with zero acquisition and no lower-precedence fallthrough

#### Scenario: The substrate assembles exact-reference dependency lookup

- **WHEN** task 7.2 builds a provider context from already-provisioned declared
  dependencies
- **THEN** its concrete `RuntimeResourceMap` is private and frozen and exposes
  only `has(...)` and `get(...)`
- **AND** each exact declared requirement resolves with its required/optional
  runtime outcome while an identity-equivalent copied requirement misses
- **AND** no public map constructor, factory, iterator, or snapshot exists

#### Scenario: Process provisioning succeeds

- **WHEN** the Effect substrate receives valid bootgraph ordering metadata,
  matching exact cold provider references, and fully preflighted config
- **THEN** each selected process resource is acquired exactly once in
  dependency order
- **AND** task 7.2 builds each provider synchronously only after its dependencies
  are available, constructs and uses the real beta.101
  `Effect.acquireRelease(acquire, release)` adapter, and registers required
  release immediately after successful acquire
- **AND** provisioning emits `ProvisionedProcess` plus one runtime-owned
  `ManagedRuntimeHandle`
- **AND** the one managed context is forced before mounting begins

#### Scenario: Acquisition failure is classified without release registration

- **WHEN** task 7.2 executes `tryPromise` whose callback throws synchronously or
  rejects, after earlier resources were acquired
- **THEN** the authored mapper produces typed acquire failure and the failing
  provider registers no release
- **AND** no process runtime or harness is mounted

#### Scenario: Acquisition defects remain defects

- **WHEN** provider build throws, the private accessor rejects a forged plan, or
  an acquire Effect defects during task 7.2 execution
- **THEN** the outcome remains a defect rather than being mapped into typed
  acquire failure
- **AND** no release is registered for that provider and no harness mounts

#### Scenario: Reverse release observes and continues

- **WHEN** task 7.3 executes cleanup through the task-7.2 adapter and one
  provider encounters expected cleanup failure or an unexpected release defect
- **THEN** expected cleanup failure is recovered and observed inside that
  provider's infallible release Effect
- **AND** an unexpected release defect is observed without preventing later
  reverse-ordered releases
- **AND** repeated release remains inert after the managed-runtime-owned scope
  settles

#### Scenario: Startup rolls back an acquired prefix

- **WHEN** task 7.3 observes a provider acquisition failure after earlier
  resources were acquired
- **THEN** it releases the acquired prefix once in reverse dependency order
- **AND** no process runtime or harness is mounted

#### Scenario: Effect substrate ownership is inspected

- **WHEN** task 7.3 disposes one provisioned process after native stop
- **THEN** one beta.101 ManagedRuntime closes exactly once and owns its scopes,
  fibers, Context, and reverse provider release through the one
  `Layer.effectContext` adapter
- **AND** repeated disposal/release is inert
- **AND** no second root Scope, Layer-shaped bootgraph, service Layer node, or
  per-execution ManagedRuntime exists

#### Scenario: Qualified providers prove lifecycle through the real substrate

- **WHEN** task 7.4 runs the task-6.4 semantic-ledger provider and task-6.5
  temporal-inquiry provider through the real Effect substrate
- **THEN** each provider proves single acquisition/release and failure cleanup
- **AND** no direct provider construction or substitute lifecycle harness counts
  as this proof
- **AND** semantic ledger alone additionally executes the acquired
  `propose(...)` operation through the same substrate-owned runtime to prove
  creator/follower interruption isolation; no direct provider construction or
  substitute operation runner counts

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

`ServiceBindingCache` MUST construct and reuse live bindings only by the exact
private key `{ identity, profileId, bindingId }`, where `identity` includes
all five `RuntimeLaunchIdentity` fields. The plugin
`NormalizedServiceUse.localName`/services-map property name is excluded as a separate
ingredient, as are plugin/surface/capability, contract/schema object identity,
decoded values, and invocation. Service-owned dependency keys MAY influence
reuse only through normalized dependency or requirement ids already represented
by `bindingId`.

#### Scenario: Matching live binding cache keys reuse one construction

- **WHEN** process runtime requests two bindings with the same exact
  `{ identity, profileId, bindingId }`
- **THEN** `ServiceBindingCache` performs one live construction and returns the
  reused bound service
- **AND** changing an exact key ingredient prevents reuse, while changing only
  an excluded plugin local-name, object-identity, decoded-value, or invocation
  ingredient does not create a second cache entry

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
qualified integration exports `./telemetry`,
`./resources/semantic-ledger`, `./resources/semantic-ledger/fluree`,
`./resources/temporal-inquiry`, and `./resources/temporal-inquiry/fluree`; and
the data exports `./habitat-pack.json`,
`./blueprints/*`, and `./package.json`. Every name in those three groups MUST be
present in the packed export map. Semantic-ledger `/fluree` MUST be a static
re-export of its cold descriptor; consumer-selected describes deliberate
subpath import, not conditional dynamic loading or optional package metadata.
The closed private runtime inventory and completed direct dependency graph MUST
be exactly:

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
into one package only when the corresponding real public projection or terminal
composition consumer lands. Task 5.1 MUST create no SDK-to-compiler edge or
compiler public face, and tasks 6.2-6.3 MUST create no SDK-to-bootgraph source
edge or public face. Task 10.6's terminal SDK composition source MUST establish
the final direct `@habitat-ai/sdk -> runtime-compiler` and
`@habitat-ai/sdk -> runtime-bootgraph` edges through its real imports and calls
to `compileRuntimePlan(...)` and `orderBootgraph(...)`; runtime mounting MUST
have neither edge and transitive process-runtime reachability MUST NOT
substitute. Real source/build references MUST establish every edge;
`implicitDependencies`, publication metadata, and blueprint asset carriage are
not substitutes. No private runtime project may import the public facade.

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
SDK but do not join the private runtime inventory or release group. The
semantic-ledger provider descriptor is reachable only from its static cold
`./resources/semantic-ledger/fluree` entry, whose import MUST NOT execute or
consult global fetch; temporal inquiry retains its separately admitted task
law. Packed output contains no unresolved workspace dependency.

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
terminal entry module; neither may load every subpath or vendor. Each qualified
integration entry assembles only its Habitat resource/provider without
transferring source ownership, selecting it for an app, or loading it from any
other SDK entry. Semantic-ledger `/fluree` is a static descriptor re-export
with zero Fluree dependency/peer/optional metadata and MUST remain cold with
global fetch absent; temporal inquiry and native-host integrations retain their
own later optionality law. No integration may become a third package or move
into the CLI host. Installed-package acceptance MUST cold-import every neutral
and provider subpath, prove unrelated imports remain isolated, and reject any
unresolved workspace dependency.
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
