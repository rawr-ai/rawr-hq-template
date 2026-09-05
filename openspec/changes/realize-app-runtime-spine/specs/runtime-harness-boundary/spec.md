## ADDED Requirements

### Requirement: Harness is one native mounting kind

A runtime harness MUST be a native host mounting boundary. Each realization
MUST expose one import-safe `HarnessDescriptor<TMountPayload>` whose
`mount(input: HarnessMountInput<TMountPayload>)` returns
`Promise<NativeHarnessHandle>`, never `StartedHarness`. `HarnessMountInput` MUST
carry one immutable `RuntimeLaunchIdentity` with exactly
`{ app, process, entrypoint, deployment, source }`, readonly roles and
adapter-lowered mount-ready payloads, bounded process access, read-only required
resource readiness, and an owner-local `HarnessReportSink`.

`NativeHarnessHandle` MUST expose explicit idempotent `stop(): Promise<void>`;
repeated or concurrent calls MUST share one owner-local stop operation. It MAY
expose distinct optional `readiness()` and `liveness()` probes. Each probe and
the report sink MUST use `HarnessHealthReport`, carrying the exact mount launch
identity, descriptor id, `readiness` or `liveness` kind, truthful
`passing`/`failing`/`not-applicable`/`unknown` status, and bounded owner-local
findings. Missing, negative, rejected, timed-out, mismatched, or unknown
evidence MUST NOT become passing readiness.

`runtime-mounting` MUST invoke the harness and, only after mount succeeds,
create the private `StartedHarness` wrapper from descriptor identity, native
handle, accepted findings, launch identity, and mount metadata. A harness MUST
NOT create `StartedHarness`; consume raw authoring declarations, normalized
authoring graphs, or compiler plans; acquire providers; bind services; lower or
run `HabitatEffect`; create a managed runtime; or own app, plugin, or service
meaning.

The public `@habitat-ai/sdk/runtime/harnesses` face MUST expose the import-safe
`HarnessDescriptor`, `HarnessMountInput`, `NativeHarnessHandle` interface,
`HarnessHealthReport`, `HarnessReportSink`, and supporting structural types
needed by an independently packaged external server companion. Exporting the
native handle interface type is required. The subpath MUST NOT expose a live
handle value, live-handle accessor or registry, private `StartedHarness`, a
sibling-process controller, or a supervisor.

#### Scenario: New native harness is added

- **WHEN** a vendor-specific harness realization is introduced
- **THEN** it conforms to the generic descriptor, mount, native-handle, and
  idempotent stop contract
- **AND** vendor-specific configuration and native handles remain inside that
  realization
- **AND** runtime mounting creates the `StartedHarness` record after mount

#### Scenario: External companion descriptor is imported cold

- **WHEN** an app or independently packaged companion imports
  `@habitat-ai/sdk/runtime/harnesses`
- **THEN** it receives only the descriptor, bounded mount input, native-handle
  interface, and process-local report contract without starting or controlling
  a process
- **AND** no native host package, live handle value/accessor/registry, private
  `StartedHarness`, MCP implementation, or sibling
  process is loaded

### Requirement: Surface adapters are the sole lowering boundary

A surface adapter MUST translate one `CompiledSurfacePlan` into a
harness-facing native payload using scoped access, bound services, the
execution registry, and `ProcessExecutionRuntime` for non-oRPC descriptor
lanes. It MAY create native Promise callbacks that delegate non-oRPC invocation
to `ProcessExecutionRuntime`, but MUST NOT execute business logic during
lowering, independently pair plans and descriptors, mount a host, acquire a
provider, or consume raw declarations. An Effect-backed oRPC operation MUST
retain the native oRPC builder and use the official Effect bridge described
below; an adapter MUST NOT replace that bridge with `ProcessExecutionRuntime`.

#### Scenario: CLI surface is lowered

- **WHEN** process runtime lowers a compiled CLI surface
- **THEN** the CLI adapter produces the native command payload and callback
  expected by the Oclif harness
- **AND** the callback resolves and executes the already-matched boundary only
  when Oclif invokes it

### Requirement: Generic coordination preserves native lifecycle semantics

Runtime mounting MUST coordinate selected harnesses through the generic
mount/stop contract without interpreting vendor outcomes or replacing native
lifecycle semantics. An app profile MUST select harness mode and process policy;
the harness realization MUST own native registration, intake, drain, and stop
mechanics. Runtime MUST stop harnesses in reverse mount order before releasing
their resource dependencies and the root runtime.

`runtime-mounting` MUST be the sole owner of live `startApp(...)`, harness
invocation, `StartedHarness`, reverse native stop, process-stop coordination,
and process-local cross-owner single-flight finalization. One `startApp(...)`
invocation MUST own only its launch identity, lease, ManagedRuntime, resources,
native handles, readiness/liveness, and stop. `runtime-harnesses` MUST NOT create
`StartedHarness`, coordinate another owner's lifecycle, or observe, restart,
stop, or release a sibling process.

Finalization MUST be single-flight with the closed states `running`,
`draining(deadline, pendingNativeStop)`, and `settled`. The currently admitted
native-stop policy is `waitForNativeStop`: a deadline emits a bounded
observation but does not complete finalization, release providers, dispose the
root runtime, or create a force-stop path. A future forced-termination policy
requires its own authority amendment and child-process contract.

#### Scenario: Multiple harnesses share one process

- **WHEN** a compiled process mounts cohosted native harnesses
- **THEN** each harness receives the same process-scoped access and only its
  adapter-lowered payloads
- **AND** shutdown invokes harness stop in reverse mount order before releasing
  shared resources; any drain remains part of the native stop implementation

#### Scenario: Separate process records share one app

- **WHEN** two entrypoints invoke `startApp(...)` for distinct records in the
  same app process catalog
- **THEN** each mounting owner finalizes only its own launch identity and native
  handles
- **AND** no shared coordinator infers app-wide readiness or controls either
  sibling

#### Scenario: Adapter lowering fails before mount

- **WHEN** adapter lowering fails before mount
- **THEN** no native harness mounts
- **AND** runtime mounting requests the ordinary process stop path

#### Scenario: Later harness mount fails

- **WHEN** harness B fails after harness A mounted
- **THEN** no later harness starts, A stops exactly once, and providers release
  only after A stops
- **AND** the B mount failure remains primary even when stop, observation, or
  release also fails

### Requirement: Oclif harness preserves native command completion

The Oclif harness MUST be implemented and distributed by `@habitat-ai/cli` and
MUST mount SDK adapter-lowered command payloads through Oclif's native command
and hook surfaces. It MUST use the low-level Oclif run path so
the root `finally` hook and output flush settle before process-runtime release,
and it MUST invoke Oclif error handling only after asynchronous cleanup because
that handler may terminate the process. Individual command classes and
entrypoints MUST NOT acquire runtime resources or create process-global
lifecycle state.

The package MUST expose one import-safe `@habitat-ai/cli/host` entrypoint for
private downstream Oclif applications. The host MUST accept an app-owned
definition and native process inputs, supply the shared loader and harness, and
select no first-party topic. A downstream app MUST NOT copy the loader, create
a second harness, or acquire runtime resources in its bin entrypoint.

#### Scenario: Downstream application uses the shared host

- **WHEN** a private downstream executable starts its selected app through
  `@habitat-ai/cli/host`
- **THEN** it uses the same Oclif loader and harness implementation as the
  Habitat executable
- **AND** its app definition selects only product-owned topics while the host
  adds no Habitat topic membership

#### Scenario: Command fails after starting

- **WHEN** an Oclif command returns a declared failure or throws
- **THEN** its native `finally` observation settles, output is flushed, and the
  Oclif harness stops before runtime releases and Oclif handles the error
- **AND** telemetry or cleanup failure does not replace the command's exit
  classification

#### Scenario: Command receives a process signal

- **WHEN** the first supported signal arrives during an admitted command
- **THEN** the process marks intake draining, propagates cancellation to the
  active execution, awaits native command finalization within policy, and then
  releases runtime resources once

#### Scenario: Oclif native terminal paths are accepted

- **WHEN** built child processes exercise success, command failure,
  command-plus-cleanup failure, SIGINT, and SIGTERM
- **THEN** each case preserves the following exact terminal oracle and complete
  output with no surviving process handle:

| Case | Exit | Handle calls | Required order |
| --- | --- | --- | --- |
| success | numeric `0` | `0` | `finally -> flush -> runtime release` |
| declared command failure | fixture-declared numeric `2` | `1` | `finally -> flush -> runtime release -> handle` |
| command failure plus cleanup failure | command-primary numeric `2` | `1` | `finally -> flush -> runtime release -> handle` |
| `SIGINT` | Oclif-native numeric `1` | `1` | `cancel -> finally -> flush -> runtime release -> handle` |
| `SIGTERM` | Oclif-native numeric `1` | `1` | `cancel -> finally -> flush -> runtime release -> handle` |

### Requirement: Oclif telemetry is app-selected and process-scoped

An application profile MUST select the telemetry resource and concrete provider
for each Oclif process. Runtime provisioning MUST acquire that provider once for
the process, and process runtime, the Oclif adapter, harness, command boundary,
bound services, and invoked providers MUST project observations through the one
resulting process context. A command, topic, service, adapter, harness, or public
CLI package MUST NOT construct an exporter, select a backend, create a second
trace root, or retain telemetry beyond process settlement.

#### Scenario: Installed command emits one correlated observation chain

- **WHEN** an installed `habitat agent plugins` command crosses Oclif dispatch,
  its topic-owned projection, the bound lifecycle service, and a selected native
  provider
- **THEN** the app-selected telemetry provider observes one correlated trace
  identity across those owners with command result, output, and native outcome
  preserved
- **AND** the Oclif harness flushes observation before process-runtime release
  and no exporter or process handle survives

#### Scenario: Terminal paths preserve telemetry and native outcomes

- **WHEN** installed Oclif acceptance exercises success, declared failure,
  cancellation, and command-primary cleanup failure
- **THEN** each path emits its final correlated observations exactly once and
  retains the native exit classification and complete output
- **AND** telemetry failure cannot replace the command outcome, trigger another
  provider acquisition, or delay release beyond the selected process policy

### Requirement: Elysia harness owns HTTP intake and drain

The Elysia harness MUST mount adapter-lowered route payloads and own the native
server handle. Graceful stop MUST use the admitted Elysia/Bun stop operation to
reject new intake and await in-flight HTTP work plus WebSocket work when a
WebSocket surface is selected; runtime mounting MUST invoke exactly one native
`stop(false)` and order its settlement before
provider release. A deadline MAY bound mounting and observation work, but it
MUST NOT claim that uncooperative admitted native work drained, release shared
providers before native stop settles, or escalate by calling `stop(true)` after
`stop(false)`. Deadline expiry records the deadline and leaves the single-flight
operation in `draining` under `waitForNativeStop`. Elysia lifecycle hooks MUST NOT be
treated as an awaited provider-release boundary when the vendor does not await
them.

#### Scenario: HTTP process shuts down

- **WHEN** runtime asks the Elysia harness to stop gracefully
- **THEN** new connections are rejected and admitted native work is drained
  before shared provider release
- **AND** the harness returns the settled native stop outcome to runtime mounting

#### Scenario: Native Elysia stop exceeds policy deadline

- **WHEN** `stop(false)` remains pending after the mounting deadline
- **THEN** the process remains `draining`, reports the deadline outcome, and
  retains shared providers until native stop settles
- **AND** runtime neither reports a completed drain nor calls `stop(true)` as a
  second stop path

#### Scenario: Elysia stop closes intake before release

- **WHEN** one admitted HTTP request remains gated and graceful stop begins
- **THEN** a second connection attempt is rejected while the first request is
  still pending
- **AND** provider release waits for the first request and native stop to settle

### Requirement: oRPC request abort uses the official native Effect bridge

An adapter-lowered oRPC procedure MUST retain native oRPC validation,
middleware, context, declared errors, transport, and abort outcomes. A
synchronous or Promise-returning operation MAY use an inline native
`.handler(...)`. An Effect-backed Habitat service operation MUST use exact
`@orpc/experimental-effect@2.0.0-beta.32` implementation-owned `.effect(...)`,
installed once in `src/service/impl.ts`. The selected bridge MUST alone run the request
Effect: it provides native `effect/context`, applies native `effect/wrap`,
forwards the request signal to `Effect.runPromiseExit`, maps the resulting
Cause, and returns the Promise to oRPC. `ProcessExecutionRuntime`, a manual
`Effect.run*` call, a custom runner, and a Habitat imitation MUST NOT execute or
wrap that oRPC Effect. The extension's underlying `handlerGen` is internal
vendor machinery. Habitat-authored authoring, adapter, and operation code MUST
NOT directly import, call, wrap, or reimplement it; the selected official
extension MUST remain free to call it internally.

The application/process MUST own construction and release of Effect Context and
scoped resources, policy and telemetry composition through `effect/wrap`, and
shutdown. Runtime mounting alone coordinates cross-owner finalization. The
official extension and native oRPC builder and implementer prototypes it
patches MUST resolve in one physical module realm; equal version strings or
compatible types do not satisfy that proof.

#### Scenario: HTTP caller aborts an oRPC request

- **WHEN** a real Elysia/oRPC request is aborted while the selected official
  bridge is running a gated Effect body
- **THEN** the bridge observes the same request signal, interrupts the request
  fiber, runs the body's finalizer exactly once, and the caller observes oRPC's
  native abort result
- **AND** one application/process-owned service supplied through
  `effect/context` is observable in the body and `effect/wrap` observes the same
  path, procedure, and signal exactly once
- **AND** the application/process-owned scoped resource releases exactly once,
  after the request finalizer and native Elysia stop settle
- **AND** neither `ProcessExecutionRuntime`, a manual `Effect.run*`, a custom
  runner, nor another Effect terminal executes the body

#### Scenario: Official extension shares the native oRPC realm

- **WHEN** acceptance selects the service's official `.effect(...)` operation
- **THEN** the loaded extension patches the exact native implementer prototype
  used by the mounted procedure and owns the request terminal
- **AND** runtime resolution reports one physical `@orpc/server` and one
  physical `@orpc/experimental-effect` copy for that process boundary
- **AND** Habitat-authored authoring, adapter, and operation code directly
  imports, calls, wraps, or reimplements no internal `handlerGen`; the official
  extension's internal call remains admitted

#### Scenario: Synchronous or Promise operation is mounted

- **WHEN** a non-Effect oRPC operation is synchronous or Promise-returning
- **THEN** the native builder invokes its implementation-owned `.handler(...)`
- **AND** neither `.effect`, `handlerGen`, nor `ProcessExecutionRuntime` is
  introduced as a second terminal

### Requirement: Inngest harness preserves durable execution ownership

The Inngest harness MUST use native `inngest@4.18.0` and MUST NOT use
`effect-inngest`. It MUST keep Serve and Connect as explicit native modes.
Private `FunctionBundle` registration factories MUST receive the same native
client as the selected harness; no public `dispatcherDescriptor` is admitted
without a named consumer. Adapter-lowered functions MUST execute plugin-owned
Effects at exactly `step.run(id, () => ProcessExecutionRuntime...)`. Native
Inngest MUST retain retry, memoization, history, replay, cancellation, and
transport authority. Replay MUST re-enter the native function and
`step.run(...)` registration and MUST NOT resume an Effect fiber. A completed
memoized step MUST return native memoized state without invoking the callback
or `ProcessExecutionRuntime`; a failed or otherwise un-memoized attempt MUST
invoke the callback anew. Cancellation MUST NOT be represented as interruption
of an already active step, and Habitat MUST NOT inject a synthetic signal.

In Serve mode the owning harness MUST track every admitted native handler
Promise and MUST wait for those Promises before process release. In Connect mode
the native client MUST be constructed with `handleShutdownSignals: []`. The
owner-local callback tracker MUST remain: exact 4.18 source shows
`RequestProcessor.handleExtendLeaseAck` deleting a request from
`requestLeases` when renewal is denied while explicitly allowing the user
callback to continue; `ConnectionCore.close` and `reconcileLoop` gate on
`requestLeases`; `waitForInProgress` exists, but `SameThreadStrategy.close`
does not call it. Runtime mounting MUST own one outer process-local
single-flight stop, invoke and await native `close()` exactly once, then wait
for owner callback-tracker zero before provider release. Native close/flush
settlement MUST NOT prove callback completion or confirmed delivery;
observation MUST use only evidenced `presented`, `confirmed`, `dropped`, or
`unknown` outcomes.

#### Scenario: Durable step is retried

- **WHEN** an adapter-lowered Inngest function executes a step and a transient
  Effect failure occurs
- **THEN** the failure remains visible to Inngest's native retry authority
- **AND** a permanent classified failure is mapped only through the admitted
  native non-retryable error boundary
- **AND** acceptance executes native `inngest@4.18.0` at exactly
  `step.run(id, () => ProcessExecutionRuntime...)` rather than a protocol,
  worker test double, or `effect-inngest`

#### Scenario: Durable step is replayed or cancelled

- **WHEN** native history replays a completed or failed boundary, or
  cancellation arrives while its step is active
- **THEN** replay re-enters the native function and `step.run` registration and
  never resumes a suspended Effect fiber
- **AND** completed memoized state returns without invoking the callback or
  `ProcessExecutionRuntime`, while a failed or otherwise un-memoized attempt
  invokes the callback anew
- **AND** cancellation does not interrupt the active step and Habitat injects
  no synthetic signal

#### Scenario: Serve process drains admitted functions

- **WHEN** Serve has admitted one or more handler Promises and stop begins
- **THEN** the Serve owner rejects later intake and waits for every admitted
  Promise before process release
- **AND** registration factories and the selected harness use the same native
  client

#### Scenario: Connect process shuts down

- **WHEN** runtime stops an Inngest Connect harness
- **THEN** runtime mounting invokes and awaits the native client's `close()`
  once, then the owner waits for callback-tracker zero
- **AND** no second signal owner or provider-release path runs, and flush
  settlement is not claimed as confirmed delivery

#### Scenario: Runtime owns Connect process signals

- **WHEN** the selected Connect harness starts and repeated or concurrent
  runtime stop requests arrive
- **THEN** `handleShutdownSignals: []` leaves zero Inngest SIGINT or SIGTERM
  listeners and native `close()` runs exactly once through the outer
  process-local single-flight stop
- **AND** provider release begins only after `close()` settles and the owner
  callback-tracker count reaches zero

#### Scenario: Connect reports a flush outcome

- **WHEN** native close or flush settles with incomplete delivery evidence
- **THEN** observation records only the evidenced `presented`, `confirmed`,
  `dropped`, or `unknown` status
- **AND** settlement alone is never promoted to confirmed delivery

### Requirement: Same-app native processes remain isolated

The same-app native process boundary MUST run a server process and async process
selected from one app's cold process catalog as distinct built child processes.
Each child MUST own a distinct
immutable launch identity, lease, ManagedRuntime, resource set, native handles,
readiness/liveness, and idempotent stop. Each child MUST NOT supervise,
restart, stop, release, or project app-wide health for its sibling. Native stop
MUST settle before that child's process resources release.

#### Scenario: Built server and async children run together

- **WHEN** acceptance starts a real built Elysia child and a native Inngest
  Serve child from two records in the same app process catalog
- **THEN** both report distinct launch identities, leases, readiness/liveness,
  native handles, and process-local stops
- **AND** stopping and restarting either child leaves its sibling live and does
  not release the sibling's resources

#### Scenario: Async required resource is unavailable

- **WHEN** the async child lacks one required resource before native mount
- **THEN** that child fails before Inngest Serve mounts and releases only its
  own acquired prefix
- **AND** the already-running Elysia child remains live and ready

### Requirement: MCP remains an external server-process projection

MCP MUST be modeled only as a `server` surface/process projection, never as a
role, blueprint kind, app, service, provider, deployment unit, or lifecycle
owner. Habitat MUST NOT author an MCP protocol face or a direct official-MCP-SDK
server implementation. Conditional acceptance MAY attach independently
versioned external `mcp-openapi@1.0.0` through the public companion descriptor
and readiness/liveness contract only after that artifact exists. It MUST use
the companion's public lifecycle and tool/OpenAPI-resource surface, MUST NOT
copy Magic's tarball or source, and MUST NOT claim prompts. The absence of that
independent artifact MUST NOT block the core runtime release.

#### Scenario: Independent MCP companion is available

- **WHEN** conditional task 13.6 resolves an independently versioned
  `mcp-openapi@1.0.0` artifact
- **THEN** a server-process record attaches it through the public companion
  descriptor and observes its tools plus OpenAPI resource
- **AND** Habitat owns only that process's mount/stop/health handoff, not MCP
  protocol authoring or sibling lifecycle

#### Scenario: Independent MCP companion is unavailable

- **WHEN** no independently versioned `mcp-openapi@1.0.0` artifact can be
  resolved
- **THEN** task 13.6 remains conditional and records no acceptance claim
- **AND** no MCP-specific SDK subpath, adapter, harness, dependency, or release
  claim is introduced; the generic `@habitat-ai/sdk/runtime/harnesses` contract
  remains required and unchanged
- **AND** no copied tarball, direct SDK substitute, prompts assertion, or core
  runtime release blocker is introduced

### Requirement: Harness law is generic before vendor instances

Habitat MUST positively and closedly assert the generic harness structure,
descriptor, adapter input, native-handle output, native containment, and
dependency direction. That law MUST activate with the first conforming generic
harness owner. Each bounded vendor law MUST activate only with its first
selected conforming application vertical and MUST add only the shape and source
law required by that host. Vendor laws MUST NOT fork the generic harness
contract or make one host's vocabulary part of every harness.

#### Scenario: Harness blueprints are evaluated

- **WHEN** Habitat checks generic and vendor-specific harness owners
- **THEN** every owner satisfies the common lifecycle and import direction
- **AND** only its selected vendor overlay admits native APIs and files
