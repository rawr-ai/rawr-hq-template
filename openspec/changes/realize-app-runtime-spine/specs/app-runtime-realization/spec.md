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
data. Derivation MUST retain exactly that selected membership and its native
source references. One topic-neutral private CLI source bundle projects this
cold inventory for Oclif's static explicit discovery and packed manifest.
Live compilation and adapter lowering MUST preserve the same exact selected
refs; the shared Oclif loader/harness MUST match those lowered callbacks to the
cold bundle before dispatch. Cold discovery acquires nothing and needs no
public compiler. The app, loader, public CLI package, adapter, and harness MUST NOT
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
- **THEN** the derived private source bundle contains exactly the selected
  topic-owned commands and live mounting verifies the compiled callbacks against
  that same inventory; the shared Oclif loader consumes it without
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

### Requirement: Selection preserves a complete cold launch identity

Definition and selection MUST agree on app, profile, finite catalog process,
roles, entrypoint and the immutable launch identity. Unknown or disagreeing
selection MUST refuse before a partial artifact is returned. Definition owns
declaration shape and identity uniqueness; derivation owns selected semantic
normalization. A process launch MUST consume the exact selected Entrypoint
rather than accepting an independently reconstructed identity.

#### Scenario: A selected identity disagrees with its catalog record

- **WHEN** app, profile, process, role or entrypoint selection disagrees
- **THEN** the owning cold boundary refuses before emitting a successful artifact
- **AND** no provider, service constructor, descriptor body or loader runs

### Requirement: Derivation normalizes only the selected executable closure

Derivation MUST be the single owner of effective authoring normalization.
Selected process role/surface roots, transitive service dependencies, resource
requirements and selected-provider dependencies determine startup coverage and
binding completeness. Whole-app graph inspection MAY remain a separate tool;
whole-app satisfiability MUST NOT gate an unrelated process.

A profile MAY contain valid unused provider selections. Those selections MUST
NOT introduce dependency traversal, config-value resolution/decode, build or
acquisition obligations for this process. Selected required resources need
exactly one compatible provider; missing or ambiguous coverage MUST refuse
before acquisition. Selected optional absence MUST retain its explicit
nonfatal finding. A selected provider's own resource dependencies enter the
closure. Immediate malformed declarations and imported module initialization
remain at their actual authoring boundary; process selection is not a sandbox.

Config-source order and policy MUST remain explicit. Every required source
authored in the selected profile remains required. Only selected provider
config and service scope/config refs are expanded for value preflight.
First-hit lookup and refusal on a winning decode failure MUST NOT change.

#### Scenario: One app has independent API and async configuration

- **WHEN** API selects no async capability but a sibling role requires a database
- **THEN** API planning succeeds without the sibling's provider/config
- **AND** a reusable profile's unused async provider introduces no config lookup or build
- **AND** async planning/preflight still refuses its own missing requirement

#### Scenario: A profile explicitly requires a missing source

- **WHEN** the selected profile declares a required file that is unavailable
- **THEN** startup refuses before acquisition even if some profile provider entries are unused
- **AND** it does not silently remove the source or fall through after a winning decode failure

#### Scenario: A selected provider adds a transitive dependency

- **WHEN** a selected provider depends on another resource
- **THEN** that resource's coverage, lifetime and selected config become process obligations
- **AND** a dangling, ambiguous or cyclic selected dependency refuses before executable work

### Requirement: Named dependency assignments survive service instances

A service MUST preserve its named dependency slots and MAY target the same
service or resource through several slots. Coarse topology MUST be a deterministic set projection for reachability
and cycle checks, not a loss of the named authoring relation. Distinct slots
that reach the same target MUST NOT be rejected as duplicate author declarations.

An executable binding recipe MUST preserve every declared slot-to-target
assignment, including service localName to child bindingId. Named assignments
MUST participate in the parent's binding identity. A sorted child-id set alone
MUST NOT substitute. Resource/semantic dependency injection likewise retains
enough named relation data to bind without reopening authoring or inverting hashes.

Construction identity is role-local service identity plus optional explicit
instance. Equal complete effective scope/config and dependency requests for
one identity MUST reuse a binding; divergent requests for that identity MUST
refuse. Explicit nonempty opaque case-sensitive instance names request separate
construction identities even when current values match. Absence means default,
not an authored empty string. A plugin injection key alone MUST NOT split child
identity or cache. Selected service cycles, invalid lane overrides, unknown
dependency keys and conflicting declarations/complete exports for one service
id MUST still refuse.

#### Scenario: A comparison service selects two store instances

- **WHEN** left and right dependency slots select distinct named instances/config refs
- **THEN** the parent recipe records both correct named targets
- **AND** swapping those targets changes the parent recipe and binding id even though the child-id set is unchanged

#### Scenario: Two names select one equal instance

- **WHEN** two dependency names reach the same effective service instance
- **THEN** one child binding is emitted and later injected under both names
- **AND** different effective config for the same default identity refuses as a divergent diamond

#### Scenario: Two resource slots share one lifetime identity

- **WHEN** two declared names select the same process-lifetime resource
- **THEN** both named slots resolve to the one provisioned value
- **AND** distinct service instances do not themselves force distinct resource leases

### Requirement: Service selection retains one complete cold executable export

A runtime-selectable service MUST expose one service-owned complete cold export
coupling its declaration, canonical callable contract and typed synchronous
constructor. The service MAY author its upstream declaration before its native
implementation, then seal the join at its public boundary. The upstream base
MUST NOT import its own downstream router to satisfy this contract. Service-use
and service-dependency selection MUST retain that complete export rather than
independently pairing an arbitrary declaration, contract and implementation.

The constructor receives ready declared dependencies and schema-backed decoded
scope/config. It MUST NOT acquire resources, read config sources, run Effect,
start a host or capture invocation. Native oRPC contract/router implementation
and the official implementation-owned Effect bridge remain authoritative.
A native Promise client MAY remain an external convenience but MUST NOT
substitute for the invocation-aware managed Effect-facing binding.

Derivation MUST retain the exact selected transitive service references cold;
compilation MUST pair bindings with those references; process runtime MUST
receive the nonportable reference channel explicitly alongside recipes and
provisioned values. Portable graphs cannot recreate executable capability.
No app-maintained registry, private router import, string lookup fallback or
constructor embedded in ProvisionedProcess/resource values is admitted.

#### Scenario: Producer-local authoring variables leave scope

- **WHEN** a nonempty real native service and provider are selected and cold artifacts are produced
- **THEN** the downstream owner has the exact references needed for later construction without producer locals or a private import
- **AND** all construction, procedure, provider-build and loader counters remain zero during cold planning

#### Scenario: A compiled binding lacks its matching cold export

- **WHEN** process runtime receives an absent or identity-mismatched service reference
- **THEN** it refuses before constructor execution without a service-id lookup fallback

### Requirement: Cold artifacts separate portable facts from executable references

Derivation MUST emit deterministic, recursively immutable data and separate
exact nonportable descriptor, web-loader and runtime-construction references.
Config refs remain refs before provisioning; secrets/decoded values, clients
and live handles MUST NOT enter portable graph, catalog or identity records.
RuntimeObservationPort remains definition-owned and non-authorizing.

Execution descriptors MUST use the canonical boundary-specific identity and
SHA-256/RFC 8785 encoding, with full-ref/boundary/recomputed-id agreement.
Only admitted definition-owned carriers produce entries. Async occurrences
lower to distinct lazy operational descriptors with exact policy/function
references; reused steps under different parents have different full refs.
Non-async variants remain conditional on a real admitted lane carrier, not
synthetic table injection. Lazy web modules preserve exact loader identity.

#### Scenario: Equivalent authoring order changes

- **WHEN** equivalent selected declarations are reordered
- **THEN** normalized semantic data and canonical identities remain equivalent and deterministic
- **AND** no descriptor body, constructor, provider build or lazy web loader runs

#### Scenario: An async step is reused under different parents

- **WHEN** real authored occurrences lower under different workflow/schedule/consumer parents
- **THEN** each has its canonical full ref and operational descriptor
- **AND** constructing or calling the cold run surface executes no authored body until the returned Effect executes

#### Scenario: Unicode is not representable by canonical encoding

- **WHEN** an identity string contains a lone surrogate, including a trailing high surrogate
- **THEN** admission refuses rather than hashing replacement bytes
- **AND** valid Unicode inputs retain their deterministic canonical encoding

### Requirement: Compilation lowers one cohesive derivation-owned handoff

The private compiler MUST consume the selected library-produced derivation
handoff containing normalized meaning and its exact cold references, or its
owner-private projection. It MUST NOT accept arbitrary independently pairable
entrypoint and graph data as executable authority or reimplement derivation's
binding semantics as a second normalizer. Public inspection and schema validation
of serialized graph data remain available but do not confer executable authority.
This is an owner/type boundary, not a cryptographic authenticity protocol.

Compiler admission and lowering MUST retain needed consumed-shape, referenced-id,
unique-record, named-slot completeness, selected role/lifetime, cold-reference
identity and output-consistency checks. Provider relations retain dangling,
conflicting-identity and cycle refusal. No fatal mismatch returns partial success.
Compilation reads/decodes no config, builds no provider and executes no body.
The compiled process plan MUST retain the selected profile's data-only source
declarations in authored order independently of selected value refs. A process
with no config refs still carries its explicitly required source policy; later
preflight needs neither the original profile nor a producer-local lookup.

Normalization work MUST scale with distinct effective requests and edges rather
than all paths through an equal dependency DAG. Reuse MUST compare the full
effective request and retain divergent-diamond refusal.

#### Scenario: A public inspection graph is independently altered

- **WHEN** a caller supplies a portable/independently paired graph as executable compiler authority
- **THEN** the private compiler boundary does not admit it
- **AND** actual data ingress still validates its serialized shape for inspection

#### Scenario: A cohesive handoff is lowered

- **WHEN** the real derivation result includes selected services and providers
- **THEN** compilation emits complete selected recipes and exact cold references without re-normalizing authoring
- **AND** missing ids, wrong references or inconsistent compiler-owned relations refuse without executable work

#### Scenario: No selected value refers to an explicitly required source

- **WHEN** the selected profile has a required file but its process has no config refs
- **THEN** the cold compiled handoff still preserves that source and its authored order without reading it
- **AND** later preflight refuses an unavailable required source before acquisition without revisiting the profile

#### Scenario: An equal diamond has many paths

- **WHEN** a layered dependency DAG reaches the same complete effective requests repeatedly
- **THEN** a bounded work-count regression demonstrates request/edge-scale work, not path-exponential traversal
- **AND** changing an effective request still triggers the appropriate divergent-identity refusal

### Requirement: Provider plans are cold definition-owned Effect values

`ProviderEffectPlan` MUST remain operational interior of the existing private,
package-less `runtime-definition` owner rather than a Habitat kind, project,
package, bootgraph artifact, or new phase. A `ProviderFx<TValue, TError>` MUST
be the exact curated `HabitatEffect<TValue, TError, never>` value, not a thunk,
Promise, acquired value, or terminal result. `HabitatEffect` MUST be the pinned
native Effect value type behind a curated non-terminal facade, not a duplicate
program representation or interpreter. Native service/resource Effects MUST
compose directly without a second runner. Acquire MUST preserve
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
Runtime definition MUST own the `RuntimeResourceMap` TypeScript contract with
`has(requirement)` and three exact `get(requirement)` overload outcomes. Definition MUST create no concrete instance or factory; the substrate owns live construction. `requireResource(...)` MUST preserve
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

Constructing a provider declaration, ProviderFx or ProviderEffectPlan and
passing a provider through derivation or compilation MUST invoke no callback,
provider build or other declared executable body. The private plan accessor
MUST accept a genuine nominal plan and reject a forged structural lookalike.
The Effect substrate alone owns managed runtime construction, native
acquireRelease adaptation, execution, successful-acquisition finalizer
registration, cleanup observation, rollback, reverse continuation and disposal.
Compiler and bootgraph carry no provider plan or acquire/release body.

Default native acquisition masking MUST preserve successful-acquire finalizer
registration. Explicit authored interruption MUST retain native semantics;
cleanup of partial or unreturned provider acquisitions remains provider-owned.
The substrate MUST NOT inspect/rewrite a program AST or silently introduce a
child fiber to override that choice.

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
- **AND** definition constructs no map instance or map factory

#### Scenario: Earlier cold phases never build a provider

- **WHEN** real derivation and compilation process an entrypoint containing a
  provider whose `build(...)` is instrumented
- **THEN** both phases complete with zero build calls
- **AND** neither the compiler result nor bootgraph ordering records carry a
  provider plan or acquire/release body

### Requirement: Boot ordering validates owned structure without a hostile-object protocol

Bootgraph MUST consume only compiler-owned in-memory boot data. It MUST keep
ordinary shape and relation admission, unique selection and lifecycle resource
identities, duplicate exact edge refusal, dangling/cycle refusal, deterministic
dependency-first ordering with minimum-ready selectionId tie-breaking, and exact reverse
rollback/release order. Repeated dependency targets deduplicate for a module;
one frozen key object per accepted resource is reused throughout its artifact.

Output MUST be fresh and recursively immutable without mutating or newly
freezing input. No provider/reference body, config decode, observation, Effect
execution or external work occurs. Malformed admitted data refuses before a
result; internal output/schema/relation agreement remains an invariant, not a
fabricated caller-reachable fixture.

This private trusted boundary MUST NOT promise zero-trap admission of hostile
JavaScript Proxies/prototypes or prescribe Node introspection as an API contract.
Coldness concerns declared executable bodies, not a sandbox for arbitrary
imported code. External configuration/manifests/paths and serialized data keep
their real validation boundaries.

#### Scenario: Owned boot data is permuted

- **WHEN** equivalent compiler nodes and edges arrive in a different order
- **THEN** acquisition order and exact reverse orders remain identical with key-reference reuse
- **AND** input is unchanged and no declared executable body runs

#### Scenario: Ordinary boot relations are invalid

- **WHEN** duplicate identities/edges, dangling nodes, self-cycles or longer cycles occur
- **THEN** bootgraph refuses before emitting a partial ordering
- **AND** no hostile-Proxy canary or prescribed introspection algorithm is needed to establish that graph contract

### Requirement: Runtime providers remain cold until selected Effect provisioning

The Effect substrate MUST own one process-scoped managed runtime from one native
lifecycle adapter using the accepted Effect mechanism. Boot order is ordinary
data, not an Effect Layer dependency graph. Domain services are bound services,
not Effect service/Layer nodes. Force the managed context before mount.

Before acquisition, materialize the selected profile's config sources and
preflight all selected provider config and service scope/config refs. Preserve
authored first-hit order, optional-source absence, required-source refusal,
unreadable/malformed-source refusal and winning-decode failure without fallback.
No selected preflight failure may acquire a resource or mount a host.

The substrate's concrete RuntimeResourceMap MUST contain ready dependencies and
use exact declared ResourceRequirement references. An identity-equivalent copy
misses. Required/optional lookup agrees with the definition-owned overloads.
After dependencies exist, build the selected provider with decoded config,
privately recover its genuine plan and adapt through native acquireRelease.
A successful acquisition immediately registers that same plan's release.
A failed acquire registers none. Expected typed failure, build throw/forgery and
Effect defect retain their correct distinct classifications.

Managed runtime owns finalizers and resource lifetime. Release MUST continue
through the reverse dependency order, observe expected cleanup recovery and
unexpected defects without replacing the primary startup/command failure, and
be inert for repeated disposal. No second root scope or release adapter exists.
Provider redaction applies to diagnostic/catalog/telemetry projections, not the
actual provider config. Generic lifecycle proof MUST NOT require a ledger vendor.

#### Scenario: Selected preflight refuses

- **WHEN** a required source/key is absent or the winning value fails its schema
- **THEN** zero providers acquire and no harness mounts
- **AND** an unused sibling provider's config is neither resolved nor decoded

#### Scenario: Provisioning succeeds then a later acquisition fails

- **WHEN** real native Effect acquires a dependency prefix before failure
- **THEN** each successful acquisition releases once in reverse order
- **AND** the failed acquisition registers no release, later cleanup continues and nothing mounts

#### Scenario: Provider errors have different meanings

- **WHEN** tryPromise sees a synchronous throw or Promise rejection
- **THEN** its authored mapper produces the typed acquire failure
- **AND** provider build throws, forged plans and Effect defects remain defects instead of being mislabeled typed failure

### Requirement: Process runtime owns ready service binding and execution

Process runtime MUST construct selected services only from compiled named recipes,
exact complete cold service exports and provisioned dependency values. The cache
key uses immutable launch identity, selected profile and binding id. Plugin
injection names, invocation, decoded value identity and schema/contract object
identity MUST NOT independently split the cache. Named child assignments are
already represented by the parent binding id.

The five lanes remain deps, scope, config, invocation and provided. Module
projection narrows without overwriting. Construction is synchronous over ready
deps/scope/config; invocation enters each call independently and provided is
execution-derived. A constructor failure aborts startup and rolls acquired
resources back before mounting.

ExecutionRegistry MUST match the exact compiled descriptor and refuse after
stop. ProcessExecutionRuntime owns only native boundaries without their own
Effect terminal. Native synchronous/Promise oRPC uses .handler; Effect-backed
oRPC uses the official implementation-owned .effect bridge with native request
fiber, Cause/Promise reconciliation and one module realm. Context/wrap supply
environment, policy and telemetry, never another terminal.

#### Scenario: One binding serves changing invocation contexts

- **WHEN** two native calls use one selected constructed binding
- **THEN** the constructor runs once while each call sees its own invocation
- **AND** the official native execution boundary owns its outcome

#### Scenario: A service constructor throws after provisioning

- **WHEN** a real selected constructor fails
- **THEN** no surface mounts and acquired resources follow their existing rollback owner
- **AND** runtime does not try another registry entry or a Promise-client substitute

### Requirement: Mounting owns process-local native finalization

Adapters MUST lower compiled surface plans without mounting/executing. Harnesses
consume only adapter-lowered input and bounded process access, then return
explicit native handles. A no-op harness still returns an explicit idempotent
handle and marks health not applicable. Public companion harness contracts stay
import-safe; StartedHarness remains mounting-private.

The terminal SDK composes actual derivation, compiler, boot ordering, provisioning
and mounting owners. Mounting alone owns cross-owner single-flight finalization:
stop mounted native handles in reverse order, await native settlement, then
release process resources. Repeated callers share one operation. A deadline
reports pending native work honestly; it does not authorize early resource
release or forced native termination. Adapter failure mounts nothing; later
mount failure stops the mounted prefix and retains the original failure.

Each start and stop concerns only its selected process. Required-resource and
selected required-harness readiness are fail-closed and distinct from liveness.
Health, diagnostics and native handles carry the exact launch identity; no
whole-app aggregate, supervisor or sibling lifecycle controller is introduced.

#### Scenario: Native stop exceeds its deadline

- **WHEN** native work remains pending after the stop deadline
- **THEN** state remains draining and repeated stop shares the pending operation
- **AND** no provider release or completed-drain claim occurs until native settlement

Terminal SDK `startApp` MUST require explicit source input, finite per-start
native integration registrations, and a validated `waitForNativeStop` policy
with a nonnegative native-timer-representable integer deadline in milliseconds.
It MUST resolve already-selected harness IDs and refuse conflicting descriptors,
duplicate pairs, missing harnesses, incompatible roles/surfaces and uncovered
selected surfaces before acquisition. Initial registrations admit agent/tools,
desktop/background or an explicit empty-payload native integration, not arbitrary
lowerers. Public typed payload consumers MUST reject narrower incompatible mount
inputs; only actual process-owned lowered records cross into native hosts.

Successful startup MUST mean successful mounting, not automatically passing
readiness. Explicit per-kind health queries MUST refuse new probes once draining
begins. Native stop MUST settle its already-started probes and report producers.
Reports during mount MUST NOT create a mounted observation before success, and
late reports MUST NOT revive draining/settled readiness. The public result MUST
remain one process's identity, roles, stop, health/finalization and read models,
never resources, native handles, sibling controls or a whole-app controller.

#### Scenario: A later surface fails to mount

- **WHEN** earlier selected surfaces mounted successfully before failure
- **THEN** mounting stops that prefix once and releases resources only after settlement
- **AND** the mount failure remains primary despite cleanup observations

#### Scenario: Two processes of one app run independently

- **WHEN** real built server and async children each accept a native operation
- **THEN** each owns its launch identity, resources, native handles, health and stop
- **AND** stopping/restarting/failing one leaves the sibling live and outside its control

### Requirement: Observation records without controlling realization

Runtime observation MUST implement the definition-owned port and project
RuntimeDiagnostic, RuntimeCatalog and RuntimeTelemetry as non-authorizing
read models. Observation failures MUST NOT select, acquire, invoke, mount, stop,
replace native outcomes or disclose unredacted secrets. Foundational telemetry
attaches once through runtime/harness ownership with no author-written bootstrap;
business code may add semantic enrichment without becoming lifecycle owner.

The initial observation-owned seed MUST preserve actual selected topology from
SDK-adapted compilation data without importing the compiler into observation.
Unknown port payloads MUST be omitted; supported payloads MUST use fixed safe
projections. Unobserved acquisition, execution, mounting or finalization MUST
NOT become successful lifecycle evidence. Detached snapshots and bounded local
histories MUST retain complete selected topology and report history eviction.

Explicit typed telemetry MUST preserve authored names, phase, boundary and
finite JSON metadata, with caller-owned semantic redaction. Omitted annotations
MUST NOT project their values, and product results/errors MUST NOT be appended.
Malformed metadata or synchronous/asynchronous sink failure MUST NOT prevent
the callback or replace its exact outcome. Sink records MUST retain full launch
identity, and span correlation MUST distinguish identical-identity restarts
without changing the five-field launch identity or creating a global registry.

#### Scenario: Observation fails during startup or stop

- **WHEN** an observation sink fails
- **THEN** the process's primary outcome and lifecycle remain owned by their runtime/native boundaries
- **AND** diagnostic projections respect provider redaction and immutable identity

### Requirement: Native host acceptance exercises actual mechanisms

Oclif acceptance MUST use a real built and installed child process, selected
topic inventory and public host path; prove output flush, native error/exit
classification, cancellation, stop ordering and no surviving handles. It MUST
NOT substitute an alternate launcher. Elysia acceptance MUST prove graceful
stop with an admitted gated request, refused new connection and no early release.

Native Inngest Serve/Connect acceptance MUST prove actual retry, memoization,
history, replay re-entry and real cancellation semantics. A memoized step does
not rerun its Effect callback; an un-memoized attempt may. Native cancellation
does not interrupt an already active step, and Habitat MUST NOT invent a signal.
Serve tracks admitted handler settlement; Connect has zero shutdown-listener
delta and waits for its owner-local active-callback tracker after native close
before releasing resources. Native close/flush is not proof of delivery.
No mock worker, protocol emulator, effect-inngest or custom retry engine substitutes.

Web acceptance MUST exercise real build output and its native mount handoff.
No browser managed runtime exists without a selected browser resource.
An external MCP companion is conditional on an independent package artifact
attached through the public generic harness contract. No vendored Magic
artifact, direct Habitat MCP SDK server, new MCP kind/role or prompts claim is
admitted; absence does not block the core runtime.

#### Scenario: A real oRPC request aborts

- **WHEN** an Effect-backed native request is aborted
- **THEN** the official bridge owns interruption and native outcome reconciliation
- **AND** resources release after native settlement with no duplicate Effect runner

#### Scenario: Inngest resumes native replay

- **WHEN** a completed memoized step is replayed
- **THEN** native registration/replay returns the stored result without entering ProcessExecutionRuntime
- **AND** active callbacks remain tracked until settlement even if a native lease is no longer renewed

#### Scenario: A companion package is unavailable

- **WHEN** no qualified independent external MCP artifact exists
- **THEN** its condition is recorded unsatisfied without an MCP release claim or internal substitute
- **AND** the required import-safe generic companion-harness interface and core release proceed independently

### Requirement: Habitat distributes accepted interfaces with sealed private owners

The public SDK MUST remain the terminal assembly facade over package-less private
runtime owners. Real source/build imports establish Nx dependencies; asset
carriage alone does not. Compiler and bootgraph public exports are not introduced
as shortcuts. Internal runtime/resource/service/plugin projects MUST NOT become
a new release cohort. Installed artifacts expose only implemented and accepted
public faces, with cold imports and no unpublished workspace dependency.

The core release MUST include the functioning canonical agent and desktop
projection authoring families, their executable helpers and the agent schema
face, plus web-local executable authoring. Each MUST preserve its typed
descriptor through derivation, compilation, registry matching and actual
process-owned Effect execution with failure, cancellation and post-stop proof.
Empty exports or a type-only fixture do not satisfy an executable interface.
Native agent/OpenShell and desktop host integration is a distinct retained D-4
capability, not a prerequisite for these host-independent interfaces or a claim
established by their acceptance. Web route-module loading remains separate from
web-local Effect execution.

Selected blueprint definitions MUST remain complete immutable closures.
Successors permit a bounded positive grammar for owner-local TypeScript source
and tests while preserving project anchors, private assembly, ownership and
package boundaries. No historical source/test/file-count inventory is a standing
layout ceiling. Each predecessor remains independently resolvable and byte-identical.

New owners MUST co-land their implementation, selected law, owned boundary
schemas, purpose/interface router, actual dependency edges and the existing Nx
scheduler contract. Test/build remain explicit CI targets; relevant cache hits
and input invalidation are proved. No red policy-only landing, optional shell,
fake schema for an operational capability, ownerless schema dump or extra generic
adapter owner is admitted.

#### Scenario: A private owner adds a legitimate helper

- **WHEN** implementation or test support is decomposed within the selected positive grammar
- **THEN** its owner-local source/test structure remains conforming
- **AND** nested packages/owners, wrong file kinds and public/private boundary violations still refuse

#### Scenario: Installed consumers resolve policy versions

- **WHEN** the packed SDK resolves old and newly selected definitions
- **THEN** each closure is complete, source-byte-identical and independently resolvable
- **AND** the package exposes no internal runtime package or source import

#### Scenario: A runtime release is prepared

- **WHEN** exact-main accepted SDK/CLI candidates pass native installed-package acceptance
- **THEN** only that accepted public capability is published with exact provenance and integrity
- **AND** unimplemented ledger/inquiry faces or unrelated product transfers do not gate or appear in the generic runtime release

#### Scenario: Agent and desktop authoring is accepted without a native host

- **WHEN** real tool and background declarations pass cold installed imports and process-owned execution acceptance
- **THEN** their typed authoring and executable faces may be released without loading an unselected native host
- **AND** D-4 native mounting, host security, cancellation and lifecycle acceptance remains explicitly unimplemented

### Requirement: Deferred capabilities retain independent semantic obligations

Deferred capabilities MUST retain durable ownership, preserved intent and
capability-specific acceptance: semantic ledger, temporal inquiry, later Rawr
product adoption and native agent/desktop host integration, rather
than being marked implemented or silently discarded. Ledger retains unrestricted
ancestry-correct merge and its qualification/recovery/conformance requirements.
No database vendor or externally maintained distribution is a generic runtime
prerequisite. Requalification MUST precede an explicit separate external
maintenance commitment. Runtime release and optional capability releases may
occur independently through the same accepted public package boundary.

#### Scenario: A consumer requires a deferred capability

- **WHEN** a Rawr workstream service requires semantic-ledger operations
- **THEN** that adoption waits for an accepted released ledger capability
- **AND** a generic runtime or unrelated service-law consumer does not inherit that dependency
