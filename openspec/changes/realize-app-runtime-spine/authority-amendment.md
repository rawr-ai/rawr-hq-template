# Runtime Source Authority Amendment

## Purpose

This amendment records which exact source governs each part of
[[design|the runtime-spine design]]. It prevents a visible checkout, a newer
whole file, or an older project draft from silently replacing section-level
authority.

## Authority Order

When two sources conflict, authority resolves in this order:

1. Current explicit owner intent for this work, within the hard repository
   boundary in `AGENTS.md` and `AGENTS_SPLIT.md`.
2. Repository-local `HABITAT_ARCHITECTURE.md`,
   `HABITAT_RUNTIME_REALIZATION.md`, `.habitat/AUTHORITY.md`, and
   `.habitat/AUTHORITY-ONTOLOGY.md` for canonical platform, runtime, and
   blueprint law, read at section level with any explicit accepted amendment.
3. This active OpenSpec for those named amendments and execution sequencing.
   An explicit amendment governs only its named clause; it never replaces a
   canonical document wholesale.
4. Exact repository-pinned installed vendor source for vendor mechanics.
5. Current source and tests as implementation evidence.
6. Consumer repositories and dated external documents as directional evidence
   only.

Nx remains workspace/project truth. The repository router remains destination
truth. Neither changes the semantic authority order above.

## Reviewed Normative Parent

The reviewed canonical Habitat authority landed on `main` at merge commit
`f920232efbcb10cc4a7220e3b6be4b81a393009d`. This execution record landed
directly above it at `7457505fc5dc068c1ff80a06ca78f713ebe3a954`.
The earlier candidate branch, source commit, and two canonical blob identities
recorded by task 1.1 remain ordinary Git provenance, not alternate authority.

The landed authority's canonical files are
`docs/system/HABITAT_ARCHITECTURE.md` and
`docs/system/HABITAT_RUNTIME_REALIZATION.md`. The predecessor Rawr-named project
paths are provenance pointers only and cannot satisfy the two blob checks.

The landed authority reconciles the frozen runtime lineage with the accepted
Habitat identity, public SDK and CLI boundaries, app and entrypoint law, CLI topic
topology, TypeBox adaptation, resource/provider public-face law, and the
repository boundary between the Habitat platform and downstream products. Its
contents on canonical `main` are the complete normative input to this OpenSpec.
Branch names, transient restack commits, and byte comparison do not create a
second authority.

Habitat is the platform, substrate, runtime, and architecture law. Rawr is an
independent downstream product, not a reference application housed in Habitat.
`apps/habitat` is Habitat's self-hosted realization for non-core platform
capabilities, not a peer product or a second platform identity. `packages/core`
is reserved exclusively for Habitat core. Before separation, Habitat MAY land
only the bounded non-live `runtime-schema` adaptation and public service/CLI
interfaces required to compile the destination projects. Before any other
private runtime implementation begins, the repository MUST classify every
current capability, move the proven Rawr closure to the independent Rawr
repository, move retained Habitat capabilities to their exact platform owners,
and delete all product, dead, and mixed source from Habitat. No `apps/rawr` path
or other compatibility app may be created in Habitat. Marketplace remains the
separate curated-content repository; it does not become the Rawr application
repository.

## Frozen Runtime Authority

The lineage from `d4acaa7f8d1235ad2e0dbf7675aefc500b50e03d` through
`a1e6e4c6714b293c910858cb850a157ffbc24db6` remains authoritative for:

- the seven realization phases and their qualified artifacts;
- compiler, bootgraph, Effect kernel, and process-runtime ownership;
- execution registry and execution-runtime ownership;
- adapter lowering, harness mount/stop, and observation boundaries.

The frozen architecture provenance blob is
`2961da490b026d39f5458d1174ff8ba0d373b0ab`. The frozen runtime provenance blob is
`c6f475ccc09b1d629ed746f3fbb0cc55baf8b9ee`.

These frozen identities establish source provenance. Where their older Rawr
platform naming or illustrative source topology conflicts with the reviewed
normative parent, the reviewed parent governs.

## Later Applicable Amendments

The following later landed sources supersede only the named frozen clauses:

1. Commit `944476991056fd58abb929780c4e2d3c990b93c8` contributes the admitted
   resource/provider law. A resource package owns one provider-neutral root
   face, providers belong to a closed nested family with direct public faces,
   and neither the contract face nor resource imports a provider
   implementation. Habitat blueprints own concrete filenames and export maps.
2. The same commit makes `providerSelection({ resource, provider, config })` a
   core-definition operation exposed by the terminal SDK and used by app profiles. Resource-owned
   selector wrappers and provider catalogs are not authorities.
3. Provider-specific configuration schema and decoding belong to the provider,
   while the neutral resource contract remains provider-independent.
4. The closed private runtime inventory contains only named capability owners.
   Reusable runtime machinery stays with the owner whose invariant it
   implements, and concrete providers remain resource provider projects.
5. Commit `53184506445dd2155687b0d89e843e1e10331a4b` establishes the app/profile
   selection mechanics that Habitat uses for self-hosting and downstream apps
   use for product realization. It does not make Habitat a peer product.
6. Commit `b7ffb43731b1dfb462c4f845722e6b590744b938` establishes the
   `@habitat-ai/cli` executable identity.
7. Commit `950cba6af559c727b03d23502fec572a878b59be` supersedes the separate
   blueprint-package proposal: `@habitat-ai/sdk` is the sole public runtime and
   authoring distribution, while `@habitat-ai/cli` is the separate public Oclif
   executable package.
8. The later closed test-artifact ownership law is admitted: tests remain with
   their semantic owner and no generic support, helper, or runtime directory
   becomes a destination.
9. Generic reusable runtime resources and providers belong to qualified Habitat
   owners. A downstream profile may select and configure released versions but
   does not own their contracts or implementations. Product-specific resources
   and providers remain product assets governed only in shape by Habitat law.
10. `@habitat-ai/cli` owns foundational Habitat commands, native Oclif plugin
    mechanics, initialization, generators, and self-host projections. At the
    initial separation gate, the Rawr CLI owns the ChatGPT corpus,
    Hyperresearch, and session-intelligence domain topics that survive its
    owner-local review. A later Rawr product topic requires a separate
    owner-local admission after its released Habitat prerequisites exist. A
    common Oclif loader or current repository path transfers no topic ownership.
11. Rawr application identity and composition belong only in the independent
    Rawr repository. The current `@habitat-ai/rawr`, `@rawr/hq-app`,
    `@rawr/server`, and `@rawr/web` identities are migration inputs, not
    destinations in either repository.
12. `@habitat-ai/cli` exposes one import-safe Oclif host entrypoint for
    downstream private Oclif apps. That host supplies loading and native harness
    mechanics but selects no Habitat or Rawr topic; each app definition retains
    topic membership authority.

These amendments change placement and selection ownership; they do not change
the frozen realization phases or authorize a second runtime.

## Service-Use Authority Correction

Task 4.3 landed one cold authoring relation. Task 4.8 preserves that relation and
widens only its private-carrier option to `useService(serviceDefinition,
{ contract, instance?, binding? })`; it produces a frozen `ServiceUse<TContract>` whose public
enumerable shape is `kind: "service.use"`, the exact definition `serviceId`, and
an optional `serviceInstance` only when composition selects a genuine distinct
instance. The containing services-map key is the consumer-local injected-client
property. It is not an alias, a service identity, a binding identity, or a cache
key ingredient. The public relation exposes neither the service definition nor
the contract object.

`runtime-definition` retains the exact definition, contract witness, and
optional closed binding tree behind a non-enumerable symbol-keyed private
carrier. Only private runtime owners may use
its internal accessor; the terminal SDK MUST NOT re-export that symbol or
accessor. `ServiceContractOf` and services-map client inference remain purely
TypeScript relationships over `ServiceUse<TContract>` and preserve the authored
map keys.

Task 4.8's complete runtime-derivation increment owns normalization of
`ServiceUse` and production of `ServiceBindingPlan` from the exact grammar
accepted by the authority-only task 4.7a gate and the service-resource
normalization exactness sealed by the authority-only task 4.7b correction.
Neither authority task implements anything; task 4.7's bounded topology
increment owns neither. The SDK service owner
separately owns the five context lanes. Process runtime alone owns live
`BoundService`, `bindService`, cache-key construction, and
`ServiceBindingCache`. `ProcessView`, `RoleView`, `ServiceBoundary`, an
author-facing `ServiceBinding`, public `service`/`contract` fields, and cosmetic
alias identity are rejected predecessor vocabulary and preserve no public API.

## Runtime-Derivation Delivery Correction

`HABITAT_ARCHITECTURE.md` routes the derivation phase, while
`HABITAT_RUNTIME_REALIZATION.md` is its sole exact canonical document. The
accepted delivery boundary is deliberately split across immutable topology task
4.7, the completed authority-only complete-derivation-contract and
binding-source gate 4.7a, the completed matching execution-identity,
async-lowering, and service-resource-normalization correction 4.7b, and the
completed population/public-entrypoint correction 4.7c, the completed
definition-router ownership correction 4.7d, the completed crypto-build
authority correction 4.7e, and the sole active complete-derivation source task
4.8.

Task 4.7 creates only the private package-less `runtime-derivation` Nx project
at `packages/core/runtime/derivation`, selects the closed
`runtime-derivation@1` law, and establishes exactly the direct private edges
`runtime-derivation -> runtime-schema` and
`runtime-derivation -> runtime-definition`. Its sole operation is private
`deriveNormalizedRuntimeTopology({ entrypoint, profileId })`, and its sole
artifact is `NormalizedRuntimeTopology`. The exact topology value contracts are:

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

type NormalizedRuntimeTopologyEdge =
  | { readonly kind: "app.plugin"; readonly appId: string; readonly plugin: NormalizedPluginIdentity }
  | { readonly kind: "plugin.resource"; readonly plugin: NormalizedPluginIdentity; readonly resource: NormalizedResourceRequirementIdentity }
  | { readonly kind: "service.service"; readonly serviceId: string; readonly dependencyServiceId: string }
  | { readonly kind: "service.resource"; readonly serviceId: string; readonly resourceId: string }
  | { readonly kind: "service.semantic"; readonly serviceId: string; readonly adapterId: string };
```

The topology carries a recursively copied and frozen, field-for-field exact
`RuntimeLaunchIdentity`; exact `profileId`; normalized plugin identities, role
requirements, surface requirements, sorted `resourceRequirementIdentities`, and
the typed edge union above. Roles come only from the selected process. Plugin,
surface, and resource facts come only from the selected app's plugins, with
resource `lifetime` holding the effective lifetime and optional `role` retaining
only an authored role. `resourceRequirementIdentities` is the sorted unique
projection of `resource` values from accepted `plugin.resource` edges. The same
resource-requirement identity demanded by distinct plugin identities is admitted
and appears once in that projection; a duplicate exact `plugin.resource` edge is
refused. Service edges come only from service definitions reached transitively
through the private `ServiceUse` carriers. There is no `plugin.service` edge.
`service.service` points from dependent `serviceId` to `dependencyServiceId`; a
self-loop is a cycle and is refused with every longer service cycle.
Task-4.7 service-cycle acceptance proves only order-independent refusal for a
self-loop or longer cycle. It does not prescribe an error class, select or
expose a cycle path, order diagnostics, or define a finding payload, and task
4.7 adds no error API.

Derivation checks `identity.app`, `identity.process`, and
`identity.entrypoint` against the selected declarations and checks the supplied
`profileId` against the selected profile before emission.
`identity.deployment` and `identity.source` remain opaque selected values copied
exactly rather than re-derived. Duplicate plugin identities, role literals,
surface tuples, and exact edge tuples are refused; shared resource demand across
distinct plugin identities is not a duplicate. Every output object and
collection is a fresh recursive copy and is recursively frozen, including the
copied launch identity.
Every tuple-bearing collection is sorted lexicographically by its complete
field tuple using ECMAScript code-unit order; missing optional fields compare as
the empty string and remain absent in the emitted value. Equivalent cold inputs
therefore produce deeply equal topology irrespective of authored collection
order.

Because this structural artifact crosses an owner boundary, `runtime-derivation`
owns closed TypeBox schemas for it and adapts them through
`RuntimeSchema.fromTypeBox(...)`. That real schema reference establishes the
`runtime-schema` edge; the exact cold declaration and launch-identity imports
establish the `runtime-definition` edge. Neither edge may be replaced by
`implicitDependencies`. Every schema object sets `additionalProperties: false`,
so surplus properties and unknown edge kinds are rejected.

The exact checked-in task-4.7 project closure is the project shell
`AGENTS.md`, `habitat.toml`, `project.json`, `src/`, `test/`, `tsconfig.json`,
`tsconfig.test.json`, and `tsdown.config.ts`; `src/` contains only `index.ts` and
`normalized-runtime-topology.ts`, and `test/` contains only
`normalized-topology.test.ts` and `nx-cache.test.ts`. That first node co-lands
`runtime-derivation:acceptance:normalized-topology` plus the owner cache proof.
The proof observes a deeply equal but nonidentical copied identity, recursive
freeze, closed-schema rejection of surplus properties and unknown edge kinds,
and zero calls to preserved cold web loaders or Effect bodies. It adds no
optional interior, `package.json`, `@habitat-ai/sdk -> runtime-derivation` edge,
SDK export, complete `NormalizedAuthoringGraph`, service/provider/binding/
surface/workflow artifact, execution or web-module reference/table, or
`PortableRuntimePlanArtifact`.

The selected closed `runtime-derivation@1` blueprint is immutable and
topology-only. Later complete derivation MUST NOT edit, widen, inherit from, or
fall back to version 1.

Task 4.7a is complete across exactly eight authority documents:
`HABITAT_ARCHITECTURE.md` as router, `HABITAT_RUNTIME_REALIZATION.md` as the sole
exact canonical document, and six active OpenSpec artifacts. It changed no
implementation, project, blueprint, SDK edge, export map, public export, stage,
or commit. Immutable topology-only `runtime-derivation@1` remains unchanged.

Task 4.7b is complete across that same eight-document authority surface and is
also documentation-only. It changes no implementation, source, project,
blueprint, SDK edge, export map, public export, stage, or commit; in particular,
it changes no `packages/core/runtime/definition/src/execution.ts`. It preserves
the then-current task-4.8 source/test, seven-file behavior-companion, and
separate publication/assembly corpora; task 4.7d below alone advances the
behavior companion to eight files.

The matching correction closes three exact task-4.8 joins without duplicating
their canonical mechanics here. Execution identity is
`execution-descriptor:sha256:` over RFC 8785 canonical JSON of
`{ kind: "execution.descriptor-identity", ...identityInput }`, where
`identityInput` is the exact closed boundary-specific
`ExecutionDescriptorIdentityInput`; canonical `executionId` and `ownerId`
patterns apply, and the descriptor, full ref, and recomputed identity must
agree. Complete derivation lowers every async-step occurrence to a frozen
operational `execution.effect` descriptor under its full ref, retaining the
exact authored effect and frozen policy by reference. `run(...)` invokes no
authored code before returning a cold `HabitatEffect`; executing that Effect
invokes the authored function and routes a generator through definition-owned
`Effect.gen`. Reuse under distinct parents produces distinct descriptor ids,
and the table carries these derived operational descriptors rather than the
authored async descriptors. A service-owned `resourceDep` normalizes with owner
`serviceId` and dependency `localName`, resource id and default lifetime, the
binding role if and only if that lifetime is `role`, no instance, `optional:
false`, and `reason` equal to `localName`; plugin/provider reasons remain
authored.

Task 4.7c is complete across that same exact eight-document authority surface
and is also documentation-only. It changes no implementation, source, test,
project, blueprint, SDK edge, export map, public export, stage, commit, or exact
task-4.8 corpus. It narrows task-4.8 population to operational descriptors
derived from authored async-step occurrences while preserving the exact
five-boundary-variant ref/table contracts for future-compatible later lanes.
Each non-async variant remains conditional on a separately admitted lane-owned
authoring carrier and lowering. `plugin.web-surface` remains schema vocabulary
only, not a task-4.8 entry or an early web Effect face. Public acceptance calls
the actual SDK export with one async occurrence and one lazy web loader and
cannot substitute arbitrary properties, project facts, casts, synthesized
refs, or a direct table fixture.

Task 4.7d is complete across exactly nine documents: the prior eight authority
documents plus `packages/core/runtime/definition/AGENTS.md`. It is a sealed
documentation-only correction before task 4.8 and admits that existing router
as the eighth behavior-companion file solely for ownership and routing
documentation. The publication/assembly corpus remains unchanged. The router
records that flat runtime-definition `profile.ts` owns cold object-shaped
`providerSelection(...)` grammar and that the terminal SDK projects it only
through `@habitat-ai/sdk/runtime/profiles`; provider Effect plans and
acquisition remain later runtime responsibilities. Task 4.7d changes no
implementation, source, test, project, blueprint, SDK edge, export map, public
export, stage, or commit, and immutable topology-only
`runtime-derivation@1` remains unchanged.

Task 4.7e is complete across exactly the same eight authority documents used by
tasks 4.7a-c; it excludes the runtime-definition router and changes no
implementation. It corrects only task 4.8's exact publication/assembly corpus
by adding the existing
`packages/core/runtime/derivation/tsdown.config.ts`. Task 4.8 may change that
config only by adding `node:crypto` exactly once to `deps.onlyImport`, producing
exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`
while retaining `platform: "neutral"`, every prior entry, and every other
option. The synchronous RFC 8785/SHA-256 identity implementation uses Node's
native `createHash`; pinned tsdown 0.22.14's neutral-platform `onlyImport` audit
otherwise rejects the emitted builtin. No platform change, hand-rolled digest,
Bun-only crypto, async WebCrypto, dependency, package, Nx, public-surface, or
source-semantic change is admitted. The exact source/test and eight-file
behavior-companion corpora, every other publication file, immutable
`runtime-derivation@1`, all package/blueprint/directory counts, and all exports
remain unchanged.

Canonical `HABITAT_RUNTIME_REALIZATION` §§11.8, 13.5, 15, 23.1, and 27 own task
4.8's exact mechanics. The active `app-runtime-realization` requirement and
scenarios are the sole archive-safe OpenSpec acceptance owner. This amendment
records routing only.

Only after task 4.7e is sealed, task 4.8 is the sole active source node. It
creates exactly the independent
`.habitat/blueprints/runtime-derivation/versions/2/{blueprint.toml,structure.toml}`
closure and selects `runtime-derivation@2` in the existing derivation
`habitat.toml`, without inheritance, fallback, an edit to version 1, or version
3. It preserves the exact eight-file behavior companion corpus and uses the
separate exact publication/assembly corpus named by the active requirement;
that corpus owns the SDK pack growth from 11 to 13 sorted members, blueprint
copy/input growth from eight to nine directories, the exact LF rule, and
installed publication/application proof. No new `runtime-definition` file,
project, blueprint, or version and no other kind, version, or project is
admitted. Task 4.8 derives source defaults/order/ref expansion with zero source
I/O or decode and derives binding ids plus equal-diamond deduplication without
constructing a live cache.
The private `ServiceUse` carrier retains definition and contract by exact
reference and fresh-copies/freezes only its binding tree. Derivation owns
authored missing or ambiguous provider selection as built-in `TypeError`;
compiler owns normalized-handoff consistency and dependency closure/cycle
defense. Task 7.2 owns physical config preflight before first acquisition, and
task 8.2 owns actual `{ identity, profileId, bindingId }` cache construction and
reuse.

## Official Effect Runtime Source Authority

The exact `effect@4.0.0-beta.101` source installed in this repository governs
the runtime primitives used by this change:

- `node_modules/effect/src/ManagedRuntime.ts`, SHA-256
  `4212b73dc4b36228c078ddb72a9b711ed49b0cd43faa1fb7334cb04f9a4f4767`;
- `node_modules/effect/src/Layer.ts`, SHA-256
  `079a2d0cb72efe6930e00e4b4fddd53907b78badb52619e2950c48d6f36ea29b`;
  and
- `node_modules/effect/src/Scope.ts`, SHA-256
  `7454a86440c0c8514f3c08dbd02f62c6bb6b190086d51e2808381673083384f2`.

Each started process owns exactly one `ManagedRuntime`. `ManagedRuntime.make(...)`
owns its internal root scope and forked layer scope, and builds its layer
lazily. Provisioning therefore MUST force `await managedRuntime.context()` and
obtain the completed resource Context before it may produce
`ProvisionedProcess` or allow mounting. Disposal of that one managed runtime is
the process resource-lifetime close. Runtime substrate code MUST NOT create a
second root `Scope`, use `managedRuntime.scope` as an application-owned scope,
or build another process managed runtime.

The substrate owns one lifecycle adapter expressed as
`Layer.effectContext(...)`. That adapter consumes compiled provider plans plus
bootgraph order and rollback/reverse-release metadata, executes the plans in
that order inside the managed runtime's layer scope, and returns the resource
Context. Bootgraph remains an ordering data graph; it never becomes an Effect
`Layer` DAG and never executes provider plans. Domain services remain Habitat
service contracts and live bindings. They are never Effect Context services,
Effect `Layer` nodes, or inputs to a layer dependency graph.

## Official Effect-oRPC Source Authority

The repository-selected bridge is exactly
`@orpc/experimental-effect@2.0.0-beta.23` with the exact beta.23 oRPC family and
`effect@4.0.0-beta.101`, as pinned in `package.json` and `bun.lock`. The
published artifact is the source authority for its boundary mechanics:

- `dist/shared/experimental-effect.C9oJcd5q.mjs`, SHA-256
  `7dc87009d1f0a32c6249222ed57958778caa7d0c772c909a70a92651e95fc4a9`,
  defines `handlerGen(...)` and `runPromise(...)`;
- `dist/extensions/effect.mjs`, SHA-256
  `0f04cfc7d4793d3d70960da6643095433ee5d33191b946f3b554a5848c1609b6`,
  defines `.effect(...)` only as prototype sugar for
  `.handler(handlerGen(...))`; and
- the published `package.json`, SHA-256
  `55a225ee8ad7167f060e52deb6864691a6218336e3d95552351c4982c88d49d5`,
  declares the exact family dependencies, Effect peer, exports, and extension
  side effects.

As underlying vendor mechanics, `handlerGen(...)` constructs the handler Effect,
turns handler-originated `ORPCError` failures into returned values, provides
native `effect/context`, applies native `effect/wrap`, calls
`Effect.runPromiseExit` with the request signal, maps the resulting Cause, and
returns the Promise to native oRPC.
The same implementation remains present in beta.25, but beta.25 is comparison
evidence rather than the selected repository artifact.

This exact vendor source supersedes any frozen or reviewed wording that assigns
execution of an Effect-backed oRPC operation to `ProcessExecutionRuntime`, a
Habitat Effect imitation, a manual `Effect.run*` call, or a custom runner.
Native `.handler(...)` remains valid for synchronous and Promise operations.
Effect-backed Habitat service operations MUST use the official `.effect(...)`
extension installed once in `src/service/impl.ts`; the extension delegates to
official `handlerGen(...)` internally. `handlerGen(...)` is source authority for
the bridge mechanism, not an authoring choice or operation-leaf import.
Habitat-authored authoring, adapter, and operation code MUST NOT directly
import, call, wrap, or reimplement it; the selected official extension's
internal call is required and remains admitted. The
application/process owns Effect Context
construction, resource lifetime, policy, telemetry, and shutdown through the
native context and wrap hooks; the selected bridge alone owns the request
fiber/signal/Cause/Promise boundary. `ProcessExecutionRuntime` remains available
only for non-oRPC descriptor lanes.

The extension and native oRPC builders it patches MUST resolve to one physical
module realm. Source identity proves the mechanism, not the application
lifecycle, abort behavior, resource release, or module realm; those remain
executable acceptance obligations.

## Public Companion Harness Contract Authority

`@habitat-ai/sdk/runtime/harnesses` exports the import-safe
`HarnessDescriptor`, bounded `HarnessMountInput`, `NativeHarnessHandle`
interface, `HarnessHealthReport`, owner-local report sink, and their supporting
structural types. `HarnessDescriptor.mount(...)` accepts the frozen
`RuntimeLaunchIdentity`, roles, adapter-lowered mount-ready payloads, read-only
required-resource readiness, bounded process access, and report sink, and
returns `Promise<NativeHarnessHandle>`, never `StartedHarness`. The native
handle has required idempotent `stop()` and may have distinct readiness and
liveness probes. Every health report carries the same launch identity, harness
id, truthful kind/status, and bounded findings.

`StartedHarness` is private to runtime mounting. Only mounting creates it after
successful native mount from descriptor identity, returned native handle,
accepted findings, frozen launch identity, and mount metadata, and only
mounting coordinates its reverse stop before process release. Exporting the
native handle interface type is required; exporting a live handle value,
accessor, registry, or `StartedHarness` is forbidden.

## Future Native Inngest Harness Authority

The future durable-async harness selects native `inngest@4.18.0`. This
amendment lands no Inngest dependency. Implementation must add and prove the
exact dependency only in the task that realizes the owner-local harness.
`effect-inngest` is explicitly rejected: Habitat adapts native Inngest at the
step and harness boundaries instead of installing a second Effect integration.

The step boundary is exact. A native Inngest function calls `step.run(...)`;
the callback delegates the pre-derived step descriptor to
`ProcessExecutionRuntime` and returns its Promise. Replay re-enters the native
function and `step.run(...)` registration; it does not resume a retained Effect
fiber. A completed memoized step returns native memoized state without invoking
the callback or `ProcessExecutionRuntime`; a failed or otherwise un-memoized
attempt invokes the callback anew.
Cancellation is observed between durable steps. The adapter MUST NOT invent an
`AbortSignal` or claim interruption of an already-running `step.run(...)`
callback unless the selected native API supplies and proves that signal.

The async adapter produces a private registration factory, `FunctionBundle`,
which the Inngest harness materializes with the same provisioned native client
supplied to the selected Serve or Connect harness. It carries no
`dispatcherDescriptor` without a named consumer; no such consumer is admitted
by this change. `WorkflowDispatcher` is a separate named consumer and
process-runtime materialization, not part of `FunctionBundle` materialization.
`WorkflowDispatcher.send(...)` returns event/admission identity, not workflow
run identity. Status and cancellation by run identity require a separately
selected control capability; they are not implied by event admission.

In Serve mode, the Habitat/Bun host owns HTTP admission and tracks every
admitted native handler Promise through settlement before releasing process
resources. In Connect mode, Habitat passes `handleShutdownSignals: []` and
keeps the owner-local callback tracker because exact 4.18 source proves an
uncovered lease-loss path: `RequestProcessor.handleExtendLeaseAck` deletes the
request from `requestLeases` when renewal is denied while explicitly allowing
the user callback to continue; `ConnectionCore.close` and `reconcileLoop` gate
on `requestLeases`; `waitForInProgress` exists, but
`SameThreadStrategy.close` does not call it. Runtime mounting owns one outer
single-flight stop, invokes and awaits native `close()` once, then waits for
owner callback-tracker zero before provider release. Native close or flush is
useful transport lifecycle behavior, never proof of callback completion,
delivery, checkpoint, or workflow completion. Reports preserve only
evidence-backed `presented`, `confirmed`, `dropped`, or `unknown` truth.

## Explicit Rejections

- A root `plugins/cli/commands/*` projection lane is rejected. A selectable
  CLI plugin is a topic under `plugins/cli/topics/<topic>`; its individual
  Oclif command surfaces live beneath that topic's `commands/` member.
- Promoting a Rawr command, service, resource, provider, or plugin into Habitat
  by renaming it is rejected. Generic Habitat ownership requires an actually
  reusable platform capability and a qualified platform destination.
- Preserving `@habitat-ai/rawr-hq-sdk`, `@rawr/runtime-context`, `@rawr/ui-sdk`,
  or `@rawr/test-utils` as renamed aggregate/support authorities is rejected.
  Their useful parts move to the exact Habitat or Rawr owner in the destination
  ledger, and each predecessor package disappears after its last reader moves.
- A separate `@habitat-ai/blueprints` package is superseded and MUST NOT return.
- `effect-inngest` and any equivalent second Effect-owned durable-workflow
  runtime are rejected. The native Inngest harness is the only selected future
  durable-async integration.
- Habitat initializer, hook, pack-resolution, and version-coexistence mechanics
  remain owned by their existing lifecycle record and are not redesigned here.
- Unreviewed branch copies and stale canonical documents are not whole-file
  replacements for the exact reviewed normative parent.

## Generic Law And Downstream Products

Habitat kinds, core owners, public interfaces, phase handoffs, lifecycle
guarantees, and kind-identifying topology are normative. The Habitat self-host
demonstrates that non-core platform capabilities obey those same contracts.
Downstream products consume released Habitat interfaces and own their ids,
selected providers, plugin membership, config sources, role sets, deployment,
and executable bodies. This OpenSpec does not define a Rawr reference app.
Only the proven ChatGPT corpus, Hyperresearch, and session-intelligence domain
services and topics enter the initial finite source migration. Later stack-only
Rawr product capabilities, including workstream and research experimentation,
may enter only through separate Rawr owner-local admission after their released
Habitat prerequisites exist; they are not part of the initial separation gate.
Application composition is governed by the Rawr repository's owner-local
OpenSpec after separation. Services own domain semantics, apps own composition,
plugins own projection, and Habitat owns the execution grammar and
handoffs.

## Experiment Admission

The latest applicable Runtime Realization Lab is commit
`3147acbdcdd916883cee5b081c0868e3d1bf09b9`, whole tree
`7fff3eaf6d80a4609dd0d511696212a38133753d`, with
`tools/runtime-realization-type-env` subtree
`d35cd11d21abf6831947a57638cbd7de8035bf0d`. Later changes are vendor,
tooling, or policy maintenance rather than a newer realization experiment.
Only admitted algorithms and behavior fixtures may be ported; its public types,
package topology, Oracle APIs, and runtime ownership are not authority. The live
tool project is classified `delete`; the frozen commit remains provenance for
later owner-local ports.

Task 4.9 completes the derivation-specific comparison as an authority-only
no-op against landed `runtime-derivation@2`. Task 4.8 already re-authored the
lab's admissible reference identity/agreement, service-binding deduplication,
surface grouping, workflow inventory, async ownership/laziness, cold tables,
and refs-only portability under canonical Habitat schemas and ownership. No
distinct lab derivation algorithm remains to port. The lab's
`stableJson`/`exec:*` identity, explicit binding inputs, mutable shapes, public
types, Oracle, alternate `deriveRuntimeSpine`, and route derivation without an
admitted carrier remain rejected. Provider graph matching, closure, cycles, and
built-in refusal proof stay with compiler tasks 5.2 and 5.4; they do not create
compiler diagnostics. Task 4.9 changes no
source, test, project, blueprint, SDK face, public contract, Oracle, optional
interior, blueprint version, or alternate path and leaves
`runtime-derivation@2` exact.

## Definition-To-Selection Authority Correction

Task 4.9a is complete as a documentation-only correction across exactly nine
documents: `HABITAT_ARCHITECTURE.md` as router,
`HABITAT_RUNTIME_REALIZATION.md` as the sole exact canonical mechanics owner,
`packages/core/runtime/definition/AGENTS.md` as the definition-owner router,
and the six active OpenSpec artifacts. `Entrypoint` is the sole cold selection
artifact. `defineEntrypoint(...)` synchronously produces it from a real
`AppDefinition`, `RuntimeProfile`, `ProcessDefinition`, entrypoint id, and the
exact five-field `RuntimeLaunchIdentity`
`{ app, process, entrypoint, deployment, source }`. Before it returns or
publishes that artifact, `identity.app` MUST equal `app.id`,
`identity.process` MUST equal `process.id`, and `identity.entrypoint` MUST equal
the entrypoint id. Any disagreement throws built-in `TypeError` before output,
external mutation, or invocation of an authored executable. No public error
API, prescribed error text, or prescribed validation order is admitted.

Profile agreement remains the selection-to-derivation responsibility in task
4.11: launch identity deliberately has no profile field. Complete derivation
retains all app/process/entrypoint identity and `profileId` checks defensively;
the earlier producer check does not remove or weaken them.

Task 4.10 is the sole next implementation node. Its exact corpus is only
`packages/core/runtime/definition/src/app.ts` and
`packages/core/runtime/definition/test/definition.test.ts`. It preserves the
existing function signatures, TypeScript inference, exact app/profile/process
result references, freeze behavior, and SDK export identity. Owner tests use
real constructors, make producer-local bindings unavailable after handoff,
exercise the three identity disagreements independently, and prove zero
authored executable work. It adds no validator, schema, file, project, edge,
blueprint, version, export, or error surface.

Task 4.11 changes only
`packages/core/runtime/derivation/test/complete-derivation.test.ts`. It passes a
real `Entrypoint` plus `profileId`, proves successful derivation after selection
source becomes unavailable, and corrupts each of the three launch-identity
agreements plus profile agreement independently. Every mismatch is refused
before a derivation result and with zero Effect-body or loader invocation. No
derivation source or public surface changes.

## Runtime-Compiler Authority Correction

Task 5.0 is complete as a documentation-only authority correction across
exactly eight documents: `HABITAT_ARCHITECTURE.md` as router,
`HABITAT_RUNTIME_REALIZATION.md` §16 as the sole exact mechanics owner, and the
six active OpenSpec artifacts. The active `app-runtime-realization` requirement
and scenarios are the sole archive-safe acceptance owner. The other five
OpenSpec artifacts route or record the decision without copying §16's exact
TypeBox schema block. Task 5.0 changes no implementation, source, test, project,
blueprint, SDK face, public contract, export, package, runtime behavior, or
`.habitat` current-realization record. Task 5.1 is the sole next source node.

The first compiler realization is private package-less `runtime-compiler@1` at
`packages/core/runtime/compiler`. Its exact real private edges are
`runtime-compiler -> runtime-definition` and
`runtime-compiler -> runtime-derivation`; neither `implicitDependencies` nor
publication metadata may stand in for them. Task 5.1 creates no compiler
package identity, public compiler face, or early terminal-composition edge. The
later task 10.6 terminal SDK composition source MUST establish the final direct
`@habitat-ai/sdk -> runtime-compiler` assembly edge when its real
`compileRuntimePlan(...)` import, call, and consumer proof co-land. Runtime
mounting receives no compiler edge, and transitive process-runtime reachability
is not a substitute.

The sole synchronous operation is
`compileRuntimePlan({ entrypoint, graph }) -> { plan, references,
observationSeed }`. It consumes the exact selected `Entrypoint` and complete
`NormalizedAuthoringGraph`, not a derivation result, either non-portable table,
or `PortableRuntimePlanArtifact`. Canonical runtime §16 alone defines the exact
closed TypeBox DTO fields for `CompiledProcessPlan`, its nested DTOs, and
`CompilationObservationSeed`, plus the exact private operational
`RuntimeCompilationReferenceTable` contract. The reference table contains only
exact cold provider and service reference identity. Repeated
`providerEntries()` calls return the same one-time, referentially stable,
canonically sorted frozen provider snapshot, and repeated
`serviceEntries()` calls do the same for the service snapshot. Provider and
service definitions remain their exact references; the table neither copies nor
invokes a referenced descriptor, callback, loader, Effect, provider, or service
implementation.

Compilation duplicate-checks and canonicalizes the entrypoint process roles,
requires agreement with the graph, roots one process in the selected surfaces,
then closes transitively over only their service bindings, semantic
dependencies, resources/providers, workflows, Effect refs, and web refs. Unrelated
app-role facts enter neither the plan nor the reference table. The cold provider
and service definitions come through the exact `Entrypoint` and are reconciled
against normalized identities; the graph remains closed data rather than a
cold-definition carrier.

`CompiledProcessPlan` contains neither `observationSeed` nor `findings`.
`observationSeed` is a separate field of the returned
`RuntimeCompilationResult`, beside `plan` and `references`.

Every invalid compiler input, including handoff disagreement, dangling or
mismatched reference, incomplete dependency closure, cycle, duplicate,
unsupported identity/reference, or closed-schema failure, throws built-in `TypeError`
before any result exists. Version 1 has no `CompilationFinding`, compiler
diagnostic collection, public error API, prescribed error text, or prescribed
validation order. The sole optional-provider finding remains derivation-owned
and is not converted into compiler output. A reached unselected optional
requirement retains its requirement or dependency id but creates no binding,
provider node/edge, compiled resource, or cold reference.

`observationSeed` is returned cold structural data. The compiler never imports,
consumes, implements, calls, or publishes through `RuntimeObservationPort`.
Adapter and harness planning is limited to the canonical lane tuple and selected
harness ids with ordinary identity/reference agreement; adapter-target
resolution and harness-descriptor compatibility remain with tasks 10.1 and
10.2-10.3 respectively. Compilation performs no
`ProviderEffectPlan` construction or consumption, config-source resolution or
decoding, provider build/acquisition, Effect execution, service binding, cache
construction, native callback construction, harness mounting, live-value
access, or observation publication.

Task 5.1 owns the complete structural activation and baseline complete plan. Its
blueprint root is exactly `blueprint.toml`, `structure.toml`, and `skill.md`;
its project shell is exactly `AGENTS.md`, `habitat.toml`, `project.json`, `src`,
`test`, `tsconfig.json`, `tsconfig.test.json`, and `tsdown.config.ts`.
`src` contains exactly `compile-runtime-plan.ts`,
`compiled-process-plan.ts`, `index.ts`, and
`runtime-compilation-reference-table.ts`; `test` contains exactly
`compile-runtime-plan.test.ts`, `derivation-handoff.test.ts`, and
`nx-cache.test.ts`. The same node selects and applies version 1, adds the LF
rule, grows the SDK pack from 13 to 14 sorted members and copied/input blueprint
directories from 9 to 10, and proves packed parity, provenance, application,
the two exact Nx edges, and cache restoration/invalidation. It adds no optional
interior, `package.json`, `versions/` directory, Grit source law, successor
blueprint, public compiler export, or fake SDK export.

The compiler project owns exactly three focused `nx:run-commands` acceptance
targets with `cache: false`, `parallelism: false`, and `outputs: []`:
`acceptance:compiled-process-plan` runs `compile-runtime-plan.test.ts`,
`acceptance:derivation-handoff` runs `derivation-handoff.test.ts`, and
`acceptance:nx-cache` runs `nx-cache.test.ts`.

Task 5.1's exact publication/assembly corpus has 18 files:
`.gitattributes`; `.habitat/AUTHORITY.md`,
`.habitat/AUTHORITY-ONTOLOGY.md`, `.habitat/README.md`; the three exact compiler
blueprint files; `packages/core/AGENTS.md`; compiler `AGENTS.md`,
`habitat.toml`, `project.json`, and `tsdown.config.ts`; SDK `AGENTS.md`,
`README.md`, `habitat-pack.json`, `project.json`, and `tsdown.config.ts`; and
`apps/habitat/test/installed-package.test.ts`. It explicitly excludes SDK
`package.json`, an SDK public-face test, the product-separation test, root
manifests, lockfile, root Nx configuration, and `.habitat/index.json`. Compiler
source, tests, and tsconfigs remain the distinct implementation closure rather
than publication files.

Tasks 5.2 through 5.4 are proof-only expansions of
`compile-runtime-plan.test.ts`; task 5.5 expands only
`derivation-handoff.test.ts`, while `nx-cache.test.ts` remains task 5.1's sole
owner-cache proof. They change no compiler source, project topology, blueprint,
pack, or public surface. Behavior tests own semantic planning and refusal,
TypeScript and TypeBox own type/closed admission, Habitat owns the exact
structure, Nx owns the exact edges and cache behavior, and SDK pack tests own
only policy-pack and installed-blueprint provenance. Runtime source/AST string
inspection and a fabricated SDK compiler export are not accepted proof. The
derivation-to-compilation handoff proof makes producer-local authoring bindings
unavailable after the real graph and entrypoint cross the boundary; it does not
require derivation source to become unavailable.

## Provider-Effect-Plan Authority Correction

Task 6.0 is complete as a documentation-only authority correction across
exactly nine documents: `HABITAT_ARCHITECTURE.md` as router;
`HABITAT_RUNTIME_REALIZATION.md` §13.4 and its directly affected §§17, 25,
and 27 as the sole exact mechanics owner;
`packages/core/runtime/definition/AGENTS.md` as definition-owner router; and the
six active OpenSpec artifacts. The active `app-runtime-realization` requirement
and scenarios are the sole archive-safe acceptance owner. The other five
OpenSpec artifacts route or record the correction without copying the canonical
TypeScript blocks. Task 6.0 changes no `.habitat` file, SDK documentation,
implementation, source, test, project, blueprint, package/public output,
runtime behavior, or other OpenSpec file. Task 6.1 is the sole next source node.

`ProviderEffectPlan` is operational interior of the existing package-less
`runtime-definition` owner. It is not a Habitat kind, Nx project, package,
public runtime owner, or bootgraph artifact. A cold `ProviderFx<TValue,
TError>` is the curated `HabitatEffect<TValue, TError, never>` value itself,
never a thunk, Promise, acquired value, raw Effect, or runner result. Acquire
retains typed `TError`. Release is mandatory, receives only the acquired value,
and returns an infallible `ProviderFx<void, never>`. `RuntimeProvider` gains the
acquire-error generic and a required synchronous `build(...)` operation; build
returns the cold plan and never an acquisition result. The interface keeps
erasure-friendly config/acquire-error defaults of `unknown`/`unknown`; only
`defineRuntimeProvider(...)` helper inference defaults schema-free config to
`undefined` and acquire error to `never`.

`ProviderBuildContext` contains exactly the already-decoded provider config, a
`RuntimeResourceMap` contract for already-provisioned declared dependencies,
and the definition-owned observation port. It contains no lifecycle scope or
telemetry client. Task 6.1 defines only the `has(...)`/three-overload `get(...)`
TypeScript contract and no concrete map instance or factory. Its companion
`requireResource(...)` change preserves the entire const input type and readonly
shape so exact true, exact false, absence, and widened optionality remain
available to overload inference. Task 7.2 alone assembles the substrate-private
concrete frozen map, keys lookup by exact declared requirement reference, and
proves that an identity-equivalent copy misses.

The public plan has exactly enumerable `kind`, `acquire`, and `release` keys.
Its acquire and release records each have exactly enumerable `boundary`,
`policy`, and `telemetry` keys and carry their canonical acquire or release
boundary respectively. Construction fresh-copies and recursively freezes the
plan, both boundary records, policy metadata, telemetry metadata, and the
private witness container. It preserves the opaque acquire Effect and release
callback by exact reference and never traverses, copies, freezes, or invokes
either body during construction. A private non-enumerable symbol witness holds
those bodies. Its accessor remains private to later runtime owners and is never
re-exported through either SDK face.

`providerFx` has exactly `succeed`, `tryPromise`, and `acquireRelease`. Task 6.1
proves only cold construction, inference, required never-error release,
metadata/witness descriptor behavior, exact opaque body identity, zero callback
or build invocation, and private-accessor rejection of a forged witness. Its
TypeScript proof includes positive nominal assignment of a real plan and
negative assignment of a structural lookalike. Task 7.2 alone executes
`tryPromise`, proves synchronous-throw/rejection mapping and no release on typed
acquire failure, classifies build throw, forged plan, and Effect defect,
constructs and uses the real beta.101 `Effect.acquireRelease(acquire, release)`
adapter, and registers release immediately after successful acquisition. Task
7.3 executes and proves expected-cleanup observation, release-defect observation
with later-release continuation, rollback, reverse release order, inert repeated
disposal/release, and runtime close through that already-constructed adapter; it
does not lower or register another adapter. Tasks 7.1 through 7.3 retain the
live registration, rollback, and ManagedRuntime mechanics; task 7.4 consumes
those mechanics only for the allocated provider-package proof. Derivation and
compilation call no provider `build(...)`; compiler and bootgraph carry no plan
or provider-plan body.

Task 6.2 created the ordered boot artifact. Task 6.2a closes Proxy admission,
task 6.2a.1 corrects its build-config law, and task 6.2b performs the bounded
repair before task 6.3 expands the original existing behavior proof. The
artifact stays limited to selection-backed
resource/provider identity, dependency order, deduplication, rollback order,
and release-order metadata.
Exact provider references plus provider-owned config decoder and observation
redaction metadata remain in the compiler reference handoff. The future Effect
substrate joins those two inputs without either handoff carrying a plan or
acquire/release body. Task 6.3a closes semantic-ledger authority before source
work; only after it lands do tasks 6.4 and 6.5 prove each qualified Fluree HTTP
provider's config schema/decode contract, cold plan construction, and provider
conformance. Task 7.4 alone runs both provider packages through the real
substrate to prove single acquisition/release and failure cleanup.
The later task-6.3b routing entry supersedes only that activation state: task
6.3b is active and tasks 6.4 and 6.5 remain pending until it lands.

Task 6.1 evolves the existing provider root and adds only the provider Effect
subpath. The provider root exports only runtime value `defineRuntimeProvider`
and the four types
`ProviderBuildContext`, `RuntimeProvider`, `RuntimeProviderHealthDescriptor`,
and `RuntimeResourceMap`. The provider Effect face exports only runtime value
`providerFx` and the five types `ProviderAcquire`, `ProviderEffectPlan`,
`ProviderFx`, `ProviderFxFacade`, and `ProviderRelease`. Neither face exposes
the witness or accessor, raw Effect, Exit, Scope, Layer, ManagedRuntime,
`ProviderScope`, a terminal runner, or another constructor.

Immutable `runtime-definition@1` remains byte-identical. Task 6.1 creates only
`.habitat/blueprints/runtime-definition/versions/2/blueprint.toml` and
`structure.toml`, selects version 2 in the existing definition manifest, and
admits the complete flat successor: eight shell entries, eleven source files
(the existing ten plus `provider-effect-plan.ts`), and three proof files
(`definition.test.ts`, `provider-effect-plan.test.ts`, and `nx-cache.test.ts`).
It adds no version-specific skill, Grit rule, inheritance, fallback, optional
interior, version 3, new kind/project/package, or nested `src/providers` path.

The exact implementation/behavior corpus is eight files: definition
`src/provider.ts`, `src/provider-effect-plan.ts`, `src/resource.ts`,
`src/index.ts`, `test/definition.test.ts`, and
`test/provider-effect-plan.test.ts`; derivation
`test/complete-derivation.test.ts`; and compiler
`test/compile-runtime-plan.test.ts`. The exact separate publication/assembly
corpus is 17 files: repository LF policy; three Habitat authority/readme files;
the two version-2 blueprint files; definition `AGENTS.md` and `habitat.toml`;
the SDK provider root and provider Effect entries; SDK `AGENTS.md`, `README.md`,
`habitat-pack.json`, `package.json`, `tsdown.config.ts`, and
`test/runtime-authoring-public-faces.test.ts`; and the Habitat installed-package
test. The combined task-6.1 diff ceiling is therefore 25 files.

That publication grows the sorted SDK policy pack from 14 to 15 by adding
`runtime-definition@2`, leaves copied/input blueprint directories at 10, grows
JavaScript build specifiers from 17 to 18, and grows runtime authoring subpaths
from 8 to 9. It explicitly excludes definition `project.json` and
`tsdown.config.ts`, `.habitat/index.json`, root manifests, the lockfile, root Nx
configuration, product-separation acceptance, and every other SDK face.
TypeScript owns const-input/readonly requirement preservation, map overloads,
ProviderFx/error inference, required never-release, no-Promise admission, and
positive/negative nominal anti-forgery. Owner behavior tests own cold
no-callback construction, exact enumerability and descriptor flags,
metadata/witness freezing, opaque body identity, private-accessor forged-witness
rejection, and zero-build proof. Habitat and Nx own successor
structure/application and unchanged edge/cache proof; SDK and installed-package
acceptance own exact public inventories, counts, parity, provenance, and cold
imports. Runtime source-string and AST inspection are not accepted proof.

## Runtime-Bootgraph Authority Correction

Task 6.1a is complete as a documentation-only authority correction across
exactly eight documents: `HABITAT_ARCHITECTURE.md` as the ownership router;
`HABITAT_RUNTIME_REALIZATION.md` §17 as the sole exact TypeScript, DTO,
ordering, refusal, freezing, owner/blueprint closure, corpus, topology, and task
mechanics owner; and these six active OpenSpec artifacts. The active
`app-runtime-realization` requirement and scenarios are the sole archive-safe
acceptance owner. The other five OpenSpec artifacts route or record that
authority without copying the canonical TypeScript block. Task 6.1a changes no
implementation, source, test, project, blueprint, `.habitat` record,
package/public output, SDK edge, runtime behavior, or other OpenSpec file.
Completed task 6.2 subsequently sealed the complete owner and source. Its exact
receipt remains closed and is not rewritten by tasks 6.2a or 6.2b.

Task 6.2 created the complete private package-less `runtime-bootgraph@1` owner
at `packages/core/runtime/bootgraph` and the complete synchronous
`orderBootgraph(...)` source. It consumes only compiler-owned `BootgraphInput`.
Each compiler node produces one selection-id-backed resource key with the
canonical `kind`, `selectionId`, `resourceId`, `lifetime`, optional `role`, and
optional `instance`, never a requirement owner or `instanceKey`, plus one module
retaining provider identity. A `from -> to` dependency means `from` depends on
`to`. Kahn ordering emits dependencies first and breaks every ready
tie by ascending `selectionId`; modules and order are acquisition order, while
rollback and release are the exact reverse. Dependency targets deduplicate per
module and sort by `selectionId`, but a duplicate exact
`(fromSelectionId, requirementId, toSelectionId)` edge refuses. The one key
object made for each node is reused by exact reference across its module,
every dependency occurrence, forward order, rollback order, and release order.

Malformed or surplus input, duplicate `selectionId`, duplicate exact lifecycle
resource identity tuple `(resourceId, lifetime, role-or-empty,
instance-or-empty)`, duplicate exact edge, dangling source or target,
self-cycle, and multi-node cycle are distinct caller-reachable refusals that
throw built-in `TypeError` before any result. Independently, the implementation
must validate every produced artifact against the closed output schema and
exact module/order/reverse/reference relations before return; any disagreement
throws built-in `TypeError` as a defensive invariant, not as a caller-reachable
proof case. Accepted output is fresh and recursively frozen. Input is neither
mutated nor newly frozen; preexisting frozen state, property descriptors, and
reference identities remain unchanged. The operation performs no provider,
config/decode, Effect, acquisition, release, observation, or other external
work. It emits no finding, diagnostic, partial result, provider reference,
decoder/redaction metadata, provider plan/body, live value, compiler result, or
public API.

The exact eight-file implementation/proof corpus is bootgraph
`src/bootgraph.ts`, `src/boot-resource-key.ts`,
`src/boot-resource-module.ts`, `src/index.ts`, `test/bootgraph.test.ts`,
`test/nx-cache.test.ts`, `tsconfig.json`, and `tsconfig.test.json`. The exact
18-file publication/assembly corpus is `.gitattributes`;
`.habitat/AUTHORITY.md`; `.habitat/AUTHORITY-ONTOLOGY.md`;
`.habitat/README.md`;
`.habitat/blueprints/runtime-bootgraph/blueprint.toml`;
`.habitat/blueprints/runtime-bootgraph/skill.md`;
`.habitat/blueprints/runtime-bootgraph/structure.toml`;
`packages/core/AGENTS.md`; bootgraph
`AGENTS.md`, `habitat.toml`, `project.json`, and `tsdown.config.ts`; SDK
`AGENTS.md`, `README.md`, `habitat-pack.json`, `project.json`, and
`tsdown.config.ts`; and `apps/habitat/test/installed-package.test.ts`. Their
union is an exact 26-file ceiling. The project root closure is exactly eight
entries, `src` four files, `test` two files, and the blueprint root three files;
`src/index.ts` is the sole private assembly interface.

Task 6.2's baseline `bootgraph.test.ts` proves one nontrivial dependency graph's
exact ordering, output shape, schema admission, and key-reference reuse, plus
one representative malformed-input generic `TypeError`. This paired proof is
required in the complete implementation node so a stub cannot satisfy it.

The sole task-6.2 Nx edge is `runtime-bootgraph -> runtime-compiler`, established
by the real relative compiler import and tsconfig reference; no
`implicitDependencies` substitute exists. The exact bootgraph-blueprint LF rule
lands. Nx projects grow 26 to 27, and the protocol-1 SDK pack grows 15 to 16
sorted members by inserting
`runtime-bootgraph@1` before `runtime-compiler@1`, copied/input blueprint
directories grow 10 to 11, and SDK build inputs grow 13 to 14. SDK JavaScript
entries remain 18 and package exports remain 21. Asset carriage creates no SDK
source/build edge, public bootgraph face, package export, or release membership.
The owner explicitly defines only `typecheck`, `test`, `build`, and `check`;
Habitat infers its selected policy and application targets. Installed-package
acceptance owns pack parity, fixture instance, resolution/application
provenance, structure, and restoration.

Task 6.2a is the documentation-only Proxy-admission correction. Its exact
authority corpus is `HABITAT_ARCHITECTURE.md`,
`HABITAT_RUNTIME_REALIZATION.md`, and this change's `proposal.md`, `design.md`,
`authority-amendment.md`, `tasks.md`, `execution-queue.md`, and
`specs/app-runtime-realization/spec.md`. The architecture document routes;
runtime realization §17 alone owns exact mechanics; and the active capability
requirement and scenarios alone retain archive-safe acceptance. The other five
OpenSpec artifacts route or record the correction without copying canonical
TypeScript. No implementation, source, test, project, blueprint, `.habitat`
record, build config, package/public output, SDK edge, runtime behavior, or other
OpenSpec file changes in task 6.2a.

The admitted input shell and every nested input record or array must be
non-Proxy. Exact `isProxy` from `node:util/types` detects both active and revoked
Proxies before `Array.isArray`, property access or lookup, reflection, schema
validation, or any other caller-trapping operation on that candidate. An
ordinary container with a proxied prototype also refuses before a prototype
trap or inherited lookup. Nested candidates are obtained only from already
admitted own data-descriptor values, never property access. Proxy unwrapping is
forbidden. Every such input throws built-in `TypeError` synchronously before
result, with zero proxy traps, getters, callbacks, or external work.

Task 6.2a.1 is the sole active documentation-only build-config law correction.
It uses exactly the same eight-document corpus as task 6.2a, leaves the sealed
task-6.2 and task-6.2a entries and receipts verbatim, and changes no
implementation, source, test, project, blueprint, `.habitat` record, config,
package/public output, SDK face or edge, platform, runtime behavior, or other
OpenSpec file. Runtime realization §17 alone owns exact mechanics; the active
capability requirement and scenarios alone retain archive-safe acceptance.
The source import and emitted specifier remain exact `node:util/types`, but
pinned tsdown 0.22.14's neutral-platform `onlyImport` audit admits the package
root. Task 6.2b therefore adds `node:util` exactly once immediately after
retained `node:crypto`, never literal `node:util/types`, producing exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "node:util", "typebox"]`.

Task 6.2b changes exactly existing bootgraph `src/bootgraph.ts`,
`test/bootgraph.test.ts`, and `tsdown.config.ts`. It imports exact `isProxy`
from `node:util/types` in source and adds package root `node:util` exactly once
immediately after retained `node:crypto` in existing `deps.onlyImport`, never
literal `node:util/types`. The final array is exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "node:util", "typebox"]`,
retaining `platform: "neutral"` and every other option. Behavior proof
uses real active and revoked Proxy, accessor, and proxied-prototype canaries and
also proves one synchronous non-Promise, closed-schema-valid successful output
unchanged in shape. Project topology and TypeScript, rather than a tautological
default-zero runtime counter, own the non-injectable
provider/config/Effect/observation absence.

The repair retains the exact 8/4/2/3 closure, sole real compiler edge, existing
publication and pack counts, and absence of public/SDK and task-7 behavior. It
adds no file, project, blueprint, version, target, package/public identity, SDK
surface, unwrap, finding, diagnostic, execution path, provider/config work,
Effect, observation, or external-work hook. Stop if exact refusal requires a
fourth file, another dependency or edge, platform or unrelated config change,
public/SDK work, or weakened task-6.2 law.

Task 6.2b verification distinguishes those two specifiers: the actual neutral
owner build proves the emitted `node:util/types` subpath passes through the
package-root `node:util` allowance, and unchanged `nx-cache.test.ts` proves
cache restoration plus relevant-input invalidation without entering the repair
edit corpus.

After task 6.2b lands, task 6.3 resumes its original proof-only scope and
expands only the existing
`packages/core/runtime/bootgraph/test/bootgraph.test.ts`. It validates every
successful artifact against the closed output schema and exact
module/order/reverse/reference relations, adds the complete ordering,
identity-reuse, freeze/state-preservation, no-finding, zero-work, and exhaustive
caller-reachable input-refusal matrix, and retains cumulative absence of
`packages/bootgraph`, Nx project `@rawr/bootgraph`, its workspace/lock identity,
package identity, and reservation surface. It does not fabricate an internal
output-disagreement case and changes no source, project, blueprint, pack,
SDK/public surface, cache test, or frozen product-separation test. Task 10.6
alone creates the real `@habitat-ai/sdk -> runtime-bootgraph` edge when terminal
`startApp(...)` composition imports and calls `orderBootgraph(...)` beside the
real compiler call.

Explicitly excluded from task 6.2 are SDK `package.json`, every SDK source/public
face and public-face test, `.habitat/index.json`, root manifests, the lockfile,
root Nx configuration, product-separation acceptance, any `package.json` in the
new owner, any source outside the exact corpus, any extra blueprint/version,
explicit acceptance/verify/aggregate target, SDK export or early edge, finding
API, source-string/AST proof, provider body, config/decode work, acquisition,
release, Effect execution, observation, and task-7 behavior.

## Semantic-Ledger Authority Correction

Task 6.3a is the sole active node. It is a documentation-only correction across
exactly six active OpenSpec artifacts: `design.md`, this amendment, `tasks.md`,
`execution-queue.md`, `classification-ledger.md`, and
`specs/app-runtime-realization/spec.md`. The capability requirement and
scenarios remain the sole archive-safe acceptance owner; the other five files
route or record the decision. No seventh file changes: `proposal.md`,
`stack-cut-sheet.md`, canonical/system documents, owner routers, source, tests,
projects, blueprints, `.habitat`, manifests, lockfiles, SDK files, runtime
behavior, stages, commits, and pushes are outside this node. Every sealed entry
and receipt remains verbatim. Task 6.4 is pending until this correction lands.
That same `app-runtime-realization` requirement is the sole exact public
TypeScript/API authority: this amendment routes every DTO field, callable
value, operation signature, acquire-failure/config shape, and finite SDK
inventory there rather than defining a second public contract.

The exact admitted behavior evidence is
`77b6c38e8701b8ac9292ef5676385a5e6e096f2:resources/semantic-ledger/**`, subtree
`859b463650e7ad769a56d1b67f328e84584479ef`. It authorizes no Git ancestry or
source topology. Task 6.4 MUST re-author only admitted provider-neutral behavior
under current Habitat law and MUST NOT cherry-pick, merge, or restack the held
lineage.

Task 6.4 creates exactly two owners. The resource root is
`resources/semantic-ledger`, Nx identity
`@habitat-ai/resource-semantic-ledger`, selected blueprint `resource@2`;
its runtime id/value pair is `semantic-ledger` / `semanticLedgerResource`. The
nested provider root is `resources/semantic-ledger/providers/fluree-http`, Nx
identity `provider-semantic-ledger-fluree-http`, selected blueprint
`provider@1`; its provider id, default config key, and value are respectively
`semantic-ledger.fluree-http`, `semantic-ledger.fluree-http`, and
`semanticLedgerFlureeHttpProvider`. A new kind or version, third project,
package-shaped runtime owner, public memory provider, release member, or
`implicitDependencies` entry is forbidden.

Direct source relations are exactly resource to `runtime-definition`; provider
to resource, `runtime-definition`, and `runtime-schema`; and SDK to resource and
provider. No reverse SDK edge exists. The root's one workspace devDependency
adds the separate ordinary `habitat-workspace ->
@habitat-ai/resource-semantic-ledger` package-manager relation. The final graph
therefore grows from 27 to 29 projects and from 49 to 56 typed edges across that
root relation plus the six source relations, with no cycle.

The resource value is the exact eight-operation `SemanticLedger` defined only
by the active requirement. Every operation returns its exact cold
`HabitatEffect` success/failure value with `never` requirements and never
Promise. The admitted behavior remains provider-neutral: frozen term
construction, readonly DTOs, explicit guards, append-only writes, atomic
contention, applied/refused receipts with refusal as success, line-scoped
identity bounded to 128 UTF-8 bytes, lost-answer replay, exact history,
fork/general-merge/collision behavior, and family lines. No resource operation
exposes provider or workstream policy.

The exact public failure fields, operation/reason unions, and anonymous
operation inputs live only in the active requirement. Owner-local construction
normalizes redacted detail to at most 4,096 UTF-16 code units; when longer, it
retains the first 4,093 code units and appends literal `...`. Neither failure
detail nor any diagnostic contains a URL, request or response body, headers,
proposal identity, raw response, or vendor exception. No public failure helper,
classifier, port, named input DTO, detail constant, or other symbol is admitted.

The provider's exported schema has the exact required readonly config
output/build type defined by the active requirement. A frozen owner-local
normalizing `RuntimeSchema` wrapper delegates `decode` and `validate` to a closed
`RuntimeSchema.fromTypeBox(...)` base accepting required bounded absolute
HTTP(S) `baseUrl` and optional bounded integer `timeoutMilliseconds`, with no
TypeBox default annotation. Success returns a fresh frozen required output
using `timeoutMilliseconds ?? 30_000` without input mutation; serializable and
redacted shapes remain the base closed schema, with redaction paths exactly
`["baseUrl"]`. No public input type or normalizer lands. With global fetch
absent, acquisition yields only the exact two-field failure defined by the
active requirement.

Synchronous cold provider `build(...)` returns one
`providerFx.acquireRelease(...)` plan. Only the opaque
`providerFx.tryPromise(...)` acquire reads `globalThis.fetch` and constructs the
resource. Exact release is `release: () => providerFx.succeed(undefined)`; the
callback declares no parameter and returns `ProviderFx<void, never>`. Import and
build invoke no fetch, Promise, acquire, release, or ledger operation, and task
6.4 executes no plan body. Promise and injected fetch occur only within private
provider `driver.ts` and the private test conformance seam. Neither enters a
package or SDK export; together they allow HTTP transport and shared
conformance proof without constructing a runtime substrate. The provider test
may prove only public `ProviderEffectPlan` descriptor/metadata shape,
TypeScript assignability, and import/build coldness. It MUST NOT import or call
the private accessor, inspect the witness, or recover a body reference. Sealed
task 6.1 already proves nominal witness/body-identity mechanics generically;
task 7.4 alone privately recovers and executes this provider's acquire/release
through the substrate. Accessor, witness, and bodies remain absent from every
package, SDK, and public face.

The exact source corpus is 17 files: resource `AGENTS.md`, `contract.ts`,
`habitat.toml`, `package.json`, `project.json`, `tsconfig.build.json`, and
`tsconfig.json`; resource tests `contract.test.ts`, `conformance.ts`, and
`memory.ts`; provider `AGENTS.md`, `driver.ts`, `habitat.toml`, `index.ts`,
`project.json`, and `tsconfig.json`; and provider `test/provider.test.ts`. The
exact disjoint publication corpus is ten files: root `package.json` and
`bun.lock`; `packages/core/sdk/AGENTS.md`, `README.md`, `package.json`, and
`tsdown.config.ts`; SDK `src/resources/semantic-ledger/index.ts` and
`fluree.ts`; SDK `test/semantic-ledger-public-faces.test.ts`; and
`apps/habitat/test/installed-package.test.ts`. Task 6.4 MUST change exactly
their 27-file union and no 28th file.
`scripts/habitat/product-separation-absence.test.ts` remains untouched.

Root `package.json` adds only alphabetized devDependency
`@habitat-ai/resource-semantic-ledger: workspace:*`; workspace patterns remain
12 and release membership remains the SDK/CLI pair. Regenerated `bun.lock`
grows its workspace importer from 11 to 12 and package records from 1215 to
1216. SDK package metadata has zero private Habitat dependencies and zero
Fluree dependency, peer, or optional-peer declarations. SDK package exports
grow 21 to 23, build entries 18 to 20, and always-bundled private workspace
specifiers 5 to 7; the policy pack remains 16 and copied blueprint directories
remain 11.

The neutral SDK resource face and static `/fluree` face project only the exact
two-value plus twenty-type and two-value plus two-type inventories defined by
the active requirement. Consumer-selected means explicit subpath import, not a
conditional dynamic import. Both faces exclude a driver, injected fetch,
constructor, factory, Promise port, raw Effect, runner, acquire/release body or
accessor, vendor mechanic, public failure helper/port, named input DTO, or
schema-normalization helper.

Compatibility is fixed to `fluree/server:4.1.4` only; current Node, Effect, and
TypeBox pins remain unchanged. No Fluree npm dependency, peer, optional peer,
or lock record is admitted. The neutral face cannot reach the provider or
global fetch. Static `/fluree` import remains cold when fetch is absent.
TypeScript owns the active requirement's exact public shapes, callable term,
effect inference, schema output, non-Promise operations, tagged failures, and
export inventories. Resource tests own provider-neutral semantics,
historical/fork/merge/line behavior, explicit receipts, and guarded contention
through the private memory fixture. Private driver/conformance tests own HTTP
mapping, redaction, failure classification, and lost-answer recovery without
plan access or execution. The provider test owns only public plan
descriptor/metadata shape, TypeScript assignability, and import/build coldness;
it cannot inspect a witness/accessor or recover a body. Sealed task 6.1 owns the
generic nominal-plan/body-identity proof. Habitat owns the selected structures;
Nx owns the exact source graph and no-cycle proof; SDK/installed acceptance owns
exact runtime keys/imports, bundle residue absence, neutral isolation, cold
Fluree import, and zero vendor metadata. Task 7.4 alone proves `tryPromise`
fetch/error behavior, successful acquisition, no-op release execution, and live
substrate failure cleanup.

Task 6.3a or task 6.4 MUST stop on a seventh authority file, a 28th
implementation file, second public API definition, new
kind/version/project/package, public Promise/fetch/driver/factory/helper/port or
named input, cycle or implicit edge, Fluree version or metadata beyond the fixed
compatibility record, extra config field, TypeBox default annotation, wrong
release callback, task-6.4 accessor import, witness inspection, body recovery or
invocation, live task-7 work, Rawr policy, or canonical/system-document edit.

## Task 6.3b Semantic-Ledger Descriptor Realization Routing

Every preexisting task-6.3a sentence and receipt above remains verbatim. Task
6.3b supersedes only that historical activation state and is now the sole
active documentation-only node. It uses the same exact six active OpenSpec
artifacts: `design.md`, this amendment, `tasks.md`, `execution-queue.md`,
`classification-ledger.md`, and `specs/app-runtime-realization/spec.md`. The
requirement remains the sole archive-safe acceptance and exact-mechanics owner;
the other five files route or summarize it. No seventh file changes:
`proposal.md`, `stack-cut-sheet.md`, canonical/system documents, owner routers,
source, tests, projects, blueprints, `.habitat`, manifests, lockfiles, SDK files,
runtime behavior, stages, commits, and pushes remain outside this node. Task 6.4
is pending until task 6.3b lands, and no task-6.4 source opens.

Task 6.3b freezes descriptor realization without restating its exact literals,
JSON, TypeScript, or schema mechanics here. The requirement alone defines the
resource's exact public descriptor type, fixed title and purpose, process-only
placement, single ordered lifetime, and absent observation contributor. It
also defines the provider's exact public type and reference identity, fixed
title, frozen empty `requires`, exact config-schema reference identity, and
absent health. The cold plan authors neither policy nor telemetry, leaving all
four public metadata fields `undefined` exactly as specified by that
requirement.

The requirement likewise owns the TypeBox base, normalizing wrapper, and one
fixed refinement issue string: the base and wrapper carry no description,
default, or serializable annotations. It freezes the source-exported private
package/project/tsconfig realization, including absent package `main` and
top-level `types`, resource build coverage of contract plus provider through
TypeScript project references, and the SDK's only two `alwaysBundle` additions:
the resource root and provider subpath. The requirement also owns the exact SDK
source wiring: the neutral entry uses the package root, while `/fluree` uses a
direct relative provider-source re-export to create the real SDK-to-provider Nx
edge without restating the literal path here. Task 6.3b changes none of the
existing 17+10 corpus, counts, edges, or task-7.4 lifecycle split. Task 6.3b
MUST stop on a seventh or executable file, a second exact API block, task-6.4
source, or descriptor/schema/package/project/tsconfig drift from the active
requirement.

## Magic Migration Admission

Magic Migration is implementation evidence, not product or specification
authority. Its repository is
`/Users/mateicanavra/Documents/.nosync/DEV/magic-apply/magic-migration`.
Clean `main` at `4e2f5d63e964f8299a25172ece4d5d38f6f18655`, tree
`88f0f24e98ba057c43f5aa6e93de4c7a510c0b11`, is the stable blueprint snapshot.
The latest applicable committed behavior oracle is
`ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7`, tree
`2b3c99700d5db8264b7ee42910575e8b877bda3a`, on
`codex/realize-async-runtime-process-boundary`. The stable clean blueprint
snapshot and latest behavior oracle are separate evidence classes; neither
replaces the other. Only that committed object is admitted; working-tree state
is excluded.

The frozen generic assertions are limited to app/composer/entrypoint/runtime
boundary separation; five service context lanes and module narrowing; one
implementer lineage and base-rooted native middleware; direct
resource/provider faces; scoped resource lifetime and provider-local
acquire/release; typed failure and finalizer ordering; one semantic app lowered
into independently started process identities; and process-local resource
leases, admission, stop, and observation. MCP is a server surface and an
external companion seam, not a Habitat role or kind. This evidence does not
claim that Habitat has implemented a native MCP adapter.

Magic's concrete app/server topology, product service clients, direct provider
selection and acquisition, Elysia/oRPC route composition, Inngest function
inventory and mounting, MCP product wiring, product identities, deployment
policy, and telemetry-completeness claims are excluded. Consumer evidence may
be lifted only by tracing the exact behavior oracle, mapping it to a named
Habitat owner and task, freezing generic assertions, re-authoring under Habitat
and pinned-vendor law, proving and releasing the Habitat artifact, migrating
Magic, and deleting only the superseded prototype. None replaces the canonical
compiler, bootgraph, process runtime, harness, or seven-phase realization law.
