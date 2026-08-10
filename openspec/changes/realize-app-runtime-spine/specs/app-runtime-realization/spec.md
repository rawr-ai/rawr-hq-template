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
MUST fail before the downstream owner emits output or invokes executable work;
for a mutating boundary it MUST also fail before external mutation. Behavior
proof MUST exercise each producer-to-consumer edge independently with the
upstream source made unavailable after handoff.

#### Scenario: Qualified phase artifact is consumed

- **WHEN** a phase producer emits its canonical artifact and the upstream source
  becomes unavailable
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
topology, normalized-handoff referential consistency, provider dependency
closure and cycle freedom, service binding closure, execution descriptor
agreement, adapter targets, and harness targets before it emits exactly one
`CompiledProcessPlan`. Authored missing or ambiguous provider selection is a
fatal built-in `TypeError` owned by derivation; it MUST NOT remain reachable as
a compiler diagnostic. Compilation MUST defend against a corrupt normalized
artifact, but MUST NOT acquire resources, bind live services, execute Effects,
construct native callbacks, or mount hosts.

#### Scenario: Corrupt normalized provider handoff is refused

- **WHEN** a normalized handoff contains a dangling or mismatched provider
  selection reference, an incomplete dependency target, or a provider cycle
- **THEN** compilation returns a bounded corrupt-artifact/dependency diagnostic
- **AND** provisioning never begins, while authored missing or ambiguous
  provider selection remains an earlier derivation `TypeError`

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
NOT copy acquire/release execution. Before the first provider acquisition, the
runtime config component MUST materialize every declared source and successfully
resolve and decode every provider config plus service scope/config ref. A
missing optional dotenv/file source alone MAY be skipped; missing required
sources, absent declared memory/test sources, malformed or unreadable sources,
exhausted keys, and winning decode failures MUST refuse with zero acquisition.
The Effect provisioning kernel MUST own one
`effect@4.0.0-beta.101` `ManagedRuntime` created from exactly one substrate
`Layer.effectContext` lifecycle adapter for each started process. The adapter
MUST consume bootgraph dependency order as ordinary data, receive the already
decoded provider-owned config, build a provider only after its dependencies exist,
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

#### Scenario: Config preflight completes before first acquisition

- **WHEN** a compiled plan carries provider config and service scope/config refs
  expanded across the five declared source variants
- **THEN** source availability, authored-order exact-key first-hit lookup, and
  owning-schema decode for every ref complete before any provider acquisition
- **AND** an absent required source, absent declared memory/test source,
  malformed or unreadable source, exhausted key, or winning decode failure
  refuses with zero acquisition and no lower-precedence fallthrough

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
