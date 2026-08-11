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
- **AND** before this task seals no Fluree artifact is compatible with task 6.4,
  while afterward the selected tag, commit, OCI digest, and provenance are task
  6.4's sole compatibility target and supersede preserved 4.1.4-only execution
  statements without changing the Node, Effect, TypeBox, or dependency law
- **AND** if none exists it stops for a later owner decision between explicit
  fail-closed no-merge capability and redesign, without inventing a local patch
  or deployment promise
- **AND** tasks 6.4 and 6.5 remain pending behind task 6.3d

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
