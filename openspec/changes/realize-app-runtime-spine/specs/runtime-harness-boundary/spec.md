## ADDED Requirements

### Requirement: Harness is one native mounting kind

A runtime harness MUST be a native host mounting boundary that consumes only
adapter-lowered payloads or mount-ready surface runtime records plus bounded
role and process access. Each harness realization MUST expose one import-safe
descriptor and one owner-local native handle with explicit idempotent stop
behavior. `runtime-mounting` MUST invoke the harness and own the resulting
`StartedHarness` record and observation handoff. A harness MUST NOT consume raw authoring declarations,
normalized authoring graphs, or compiler plans; acquire providers; bind services; lower or run
`HabitatEffect`; create a managed runtime; or own app, plugin, or service
meaning.

#### Scenario: New native harness is added

- **WHEN** a vendor-specific harness realization is introduced
- **THEN** it conforms to the generic descriptor, mount, native-handle, and
  idempotent stop contract
- **AND** vendor-specific configuration and native handles remain inside that
  realization
- **AND** runtime mounting creates the `StartedHarness` record after mount

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
and cross-owner single-flight finalization. `runtime-harnesses` MUST NOT create
`StartedHarness` or coordinate another owner's lifecycle.

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
synchronous or Promise-returning operation MAY use native `.handler(...)`. An
Effect-backed operation MUST use exact
`@orpc/experimental-effect@2.0.0-beta.23` `handlerGen(...)` or an admitted
official `.effect(...)` extension, whose exact source delegates to
`.handler(handlerGen(...))`. The selected bridge MUST alone run the request
Effect: it provides native `effect/context`, applies native `effect/wrap`,
forwards the request signal to `Effect.runPromiseExit`, maps the resulting
Cause, and returns the Promise to oRPC. `ProcessExecutionRuntime`, a manual
`Effect.run*` call, a custom runner, and a Habitat imitation MUST NOT execute or
wrap that oRPC Effect.

The application/process MUST own construction and release of Effect Context and
scoped resources, policy and telemetry composition through `effect/wrap`, and
shutdown. Runtime mounting alone coordinates cross-owner finalization. If the
`.effect(...)` extension is selected, the extension and the native oRPC builder
and implementer prototypes it patches MUST resolve in one physical module
realm; equal version strings or compatible types do not satisfy that proof.

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

- **WHEN** acceptance selects `.effect(...)` rather than direct `handlerGen(...)`
- **THEN** the loaded extension delegates through official `handlerGen(...)` on
  the exact `Builder` or `ProcedureImplementer` prototype used by the mounted
  procedure
- **AND** runtime resolution reports one physical `@orpc/server` and one
  physical `@orpc/experimental-effect` copy for that process boundary

### Requirement: Inngest harness preserves durable execution ownership

The Inngest harness MUST keep Serve and Connect as explicit native modes. In
Serve mode the owning HTTP harness MUST provide the request drain boundary. In
Connect mode the harness MUST use the native close operation and MUST disable
vendor-installed process signal handlers when runtime mounting owns
signals. Adapter-lowered functions MUST execute plugin-owned Effects from stable
`step.run` callbacks by delegating to `ProcessExecutionRuntime`; Effect retries,
fibers, or waits MUST NOT replace Inngest retry, memoization, history, or
cancellation semantics.

#### Scenario: Durable step is retried

- **WHEN** an adapter-lowered Inngest function executes a step and a transient
  Effect failure occurs
- **THEN** the failure remains visible to Inngest's native retry authority
- **AND** a permanent classified failure is mapped only through the admitted
  native non-retryable error boundary
- **AND** acceptance executes the pinned native Inngest function and
  `step.run` boundary rather than a protocol or worker test double

#### Scenario: Connect process shuts down

- **WHEN** runtime stops an Inngest Connect harness
- **THEN** the native client stops intake, drains in-flight work, and flushes
  buffered messages through its own close operation
- **AND** no second signal owner or provider-release path runs

#### Scenario: Runtime owns Connect process signals

- **WHEN** the selected Connect harness starts and repeated or concurrent
  runtime stop requests arrive
- **THEN** the Inngest client has installed zero SIGINT or SIGTERM listeners and
  native `close()` runs exactly once through a disposable pinned native Connect
  boundary
- **AND** provider release begins only after `close()` settles

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
