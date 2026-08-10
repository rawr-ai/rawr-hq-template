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
definition-router ownership correction 4.7d, and the sole active
complete-derivation source task 4.8.

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
documents plus `packages/core/runtime/definition/AGENTS.md`. It is the final
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

Canonical `HABITAT_RUNTIME_REALIZATION` §§11.8, 13.5, 15, 23.1, and 27 own task
4.8's exact mechanics. The active `app-runtime-realization` requirement and
scenarios are the sole archive-safe OpenSpec acceptance owner. This amendment
records routing only.

Only after task 4.7d is sealed, task 4.8 is the sole active source node. It
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
