## ADDED Requirements

### Requirement: Exact telemetry tuple is admitted before integration
The system SHALL admit native platform telemetry through an executable fixture
using oRPC and its telemetry integrations at `2.0.0-beta.23`, Effect and its
OpenTelemetry integration at `4.0.0-beta.101`, Inngest at `3.51.0`,
OpenTelemetry Node/log packages at `0.213.0` with stable SDK/core/resource
packages at `2.6.0`, `@opentelemetry/api` at `1.9.0`, and EVlog at `2.24.0`.
The fixture MUST exercise runtime interoperability, shared correlation, metric
recording, technical and product LogRecord emission, flush, and shutdown;
package installation or typechecking alone MUST NOT constitute admission.

#### Scenario: Exact tuple passes executable admission
- **WHEN** the compatibility fixture runs with every dependency at the admitted exact version
- **THEN** one app telemetry lifecycle with one provider per enabled signal executes matched, unmatched, and batched oRPC boundaries through the exact `EvlogHandlerPlugin`, Effect work, an Inngest client/processor pair, a metric, and technical and product LogRecords
- **AND** the fixture observes one product event per oRPC operation attempt, no host duplicate or outcome filter, shared correlation, and successful bounded flush and shutdown

#### Scenario: Tuple mismatch blocks implementation
- **WHEN** a package version differs or a selected public integration fails the executable fixture
- **THEN** production telemetry integration is blocked
- **AND** the system does not add a compatibility wrapper, package patch, manual transport, or second provider to hide the mismatch

#### Scenario: Completed Civ handoff remains best effort
- **WHEN** production implementation is reviewed for completion
- **THEN** the completed Civ Habitat 0.5.2 handoff under [[../../../../../docs/process/CROSS_REPO_WORKFLOWS|Cross-Repository Workflows]] is retained as a coordination record
- **AND** no acknowledgment, consumer-side run, follow-up response, or Civ repository mutation blocks Template completion or transfers Template implementation authority

### Requirement: Telemetry follows resource provider and app ownership
The system SHALL define telemetry as a provider-neutral resource under
`resources/telemetry`, SHALL place the concrete Node implementation at
`resources/telemetry/providers/opentelemetry-node`, and SHALL let the app select
provider configuration once for each process. The resource contract MAY use
core `Effect.Effect` for its provider-neutral operations, but MUST NOT expose
OpenTelemetry, EVlog, oRPC, Inngest, ClickHouse, Langfuse, PostHog, or
`@effect/opentelemetry` types. Its complete positive surface SHALL consist of process identity,
bounded flat correlation attributes, a native-operation event scope gated to
hosts without an admitted native event binding, technical-log emission,
availability, never-reject flush, and bounded diagnostics. It MUST NOT expose generic span,
metric, active-context, exporter, SDK, registry, mutable lifecycle-state,
generic event, or generic annotation operations. oRPC MUST use its exact
`EvlogHandlerPlugin` without a resource-owned wrapper event. The concrete
provider and its native framework bindings MUST remain the only owners of
vendor construction, signal APIs, propagation, export, and release mechanics.

#### Scenario: Consumer uses the neutral resource
- **WHEN** a service, plugin, native host integration, or app process consumes telemetry
- **THEN** it consumes the provider-neutral value or the active process context
- **AND** it does not construct an exporter, select a provider, or import provider-private vendor mechanics

#### Scenario: App selects and process bootstrap acquires
- **WHEN** an app process enables native platform telemetry
- **THEN** the app selects the OpenTelemetry Node provider and process configuration
- **AND** process bootstrap acquires and releases the selected provider exactly once

#### Scenario: Legacy singleton leaves the active path
- **WHEN** server and Oclif consumers have moved to the telemetry resource
- **THEN** the direct core telemetry singleton is removed from active exports and call paths
- **AND** it is not retained as an alias, fallback, or second lifecycle owner

### Requirement: One app telemetry lifecycle owns each enabled OS process
Each enabled OS process SHALL construct exactly one app-owned telemetry
lifecycle and exactly one OpenTelemetry provider for each enabled signal:
trace, metric, and log. Native HTTP, oRPC, Effect, Inngest, Oclif, traces,
metrics, and logs in that process MUST use the corresponding signal provider
under that lifecycle and the same active context. No integration SHALL
construct a peer provider for a signal, context manager, exporter lifecycle,
process hook set, or lifecycle registry.

#### Scenario: Cohosted integrations share one lifecycle
- **WHEN** one process hosts HTTP, oRPC, Effect execution, and Inngest ingress
- **THEN** all integrations emit through the one tracer, meter, or logger provider assigned to their signal under the same app lifecycle
- **AND** the process exposes one idempotent telemetry lifecycle handle

#### Scenario: Effect uses the registered global tracer provider
- **WHEN** Effect work executes inside an instrumented request, command, or Inngest attempt
- **THEN** Effect spans use the registered process-global tracer provider and active parent context
- **AND** no Effect-owned tracer provider, exporter, or shutdown path is created

#### Scenario: Inngest processor uses the workflow client
- **WHEN** the enabled process mounts an Inngest workflow harness
- **THEN** exactly one `InngestSpanProcessor` is constructed with the same Inngest client object used by the harness
- **AND** that processor attaches to the process tracer provider and no instrumentation-only Inngest client is created

### Requirement: Propagation has one process owner
The telemetry provider SHALL configure W3C Trace Context and Baggage propagation
once for the process. A native transport edge MUST extract or inject through
that global propagator at most once, and downstream oRPC, Effect, Inngest, and
host integrations MUST consume the resulting active context rather than parse,
store, or propagate a parallel trace identity.

#### Scenario: HTTP context reaches oRPC and Effect
- **WHEN** an admitted HTTP request carries valid W3C trace headers and invokes an oRPC procedure backed by Effect work
- **THEN** the request, oRPC, and Effect spans share the expected trace lineage
- **AND** only the host transport edge performs ingress extraction

#### Scenario: Inngest context reaches an attempt
- **WHEN** an Inngest invocation carries its admitted trace context
- **THEN** the Inngest attempt and its child Effect spans use that lineage through the global tracer provider
- **AND** the workflow harness does not register another propagator

#### Scenario: Host logging derives active correlation
- **WHEN** the host emits a technical log during an active request or operation
- **THEN** trace and span correlation are derived from the active OpenTelemetry context
- **AND** no parallel async-local trace identity or caller-authored trace field is stored

### Requirement: Each native product operation owns one wide event
The system SHALL open and finalize exactly one EVlog product/business event for
each resolved Oclif command invocation, each oRPC operation attempt whether
matched or unmatched, and each Inngest function attempt. Service calls, Effect
work, and Inngest steps MUST
enrich the enclosing event or add child spans rather than create another event.
A finalized event SHALL enter OpenTelemetry Logs through the process log
provider and SHALL NOT use an EVlog OTLP drain, direct ClickHouse writer, or
independent exporter. Technical/operational logs SHALL enter the same logger
provider as a distinct record kind and MUST NOT be counted as product events.

#### Scenario: Unary procedure produces one event
- **WHEN** one HTTP request matches one oRPC procedure and crosses a service and Effect work
- **THEN** the exact `EvlogHandlerPlugin` finalizes exactly one operation product event with its operation id and outcome
- **AND** host and service integration enrich that event without constructing another event owner

#### Scenario: Unmatched operation remains observable
- **WHEN** one oRPC operation attempt does not match a procedure
- **THEN** the exact `EvlogHandlerPlugin` finalizes exactly one product event with the unmatched outcome
- **AND** the host neither creates a duplicate event nor filters the native terminal result

#### Scenario: Batch preserves operation cardinality
- **WHEN** one oRPC HTTP request executes one matched and one unmatched batch item
- **THEN** exactly two product events are finalized, one for each operation attempt and outcome
- **AND** the HTTP envelope contributes transport telemetry without a host-level EVLog event

#### Scenario: Command produces one event
- **WHEN** Oclif resolves and executes one command
- **THEN** exactly one command product event is finalized for success, declared error, or cancellation
- **AND** service calls made by the command do not create another command root event

#### Scenario: Durable retry produces attempt events
- **WHEN** Inngest executes two attempts for the same durable run
- **THEN** exactly two attempt product events are finalized with the same run id and distinct attempt ids
- **AND** Inngest remains the authority for retry, replay, run history, and outcome

#### Scenario: Event fields remain bounded observations
- **WHEN** a native-operation event is enriched
- **THEN** its baseline attributes are flat, atomic, bounded, and redacted
- **AND** it contains no generic metadata blob, raw request body, prompt, secret, or unbounded error payload

#### Scenario: Technical and product logs remain distinct
- **WHEN** one native product operation emits implementation diagnostics and finalizes its EVlog event
- **THEN** technical LogRecords and the product-event LogRecord carry distinct stable record-kind attributes through the same logger provider
- **AND** only the product-event LogRecord is subject to the exactly-one native-operation rule

### Requirement: Native framework integration preserves boundary ownership
Server request handling, oRPC instrumentation, Effect tracing, Inngest attempt instrumentation, and Oclif lifecycle hooks SHALL integrate at their existing
native process boundaries. The implementation MUST NOT add a new app role,
alternate host composition, generic runtime compiler, or duplicate wrapper
span merely to carry telemetry.

#### Scenario: Server mounts after telemetry acquisition
- **WHEN** the HQ server process starts with telemetry enabled
- **THEN** it acquires the one process telemetry value before route mounting
- **AND** server routes use that value without changing service or plugin contracts

#### Scenario: Source and compiled Oclif entrypoints agree
- **WHEN** the same command runs through source-development and compiled Oclif entrypoints
- **THEN** both use the same app-owned telemetry bootstrap, command event lifecycle, and shutdown behavior
- **AND** individual command classes do not bootstrap telemetry

#### Scenario: Inngest steps remain native durable work
- **WHEN** an instrumented Inngest function executes steps or retries
- **THEN** Inngest continues to own durable identity, step history, retries, and replay
- **AND** telemetry records those facts without becoming a workflow state store or decision input

### Requirement: Disabled telemetry constructs no telemetry machinery
The disabled provider branch SHALL return a provider-neutral no-op value before
invoking vendor construction. It MUST construct zero OpenTelemetry SDKs,
exporters, span processors, log processors, periodic metric readers, EVlog
drains, Inngest telemetry processors, Langfuse clients, telemetry timers,
process hooks, or telemetry network requests.

#### Scenario: Disabled server remains inert
- **WHEN** the server process selects disabled telemetry
- **THEN** server product routes remain callable through the no-op resource
- **AND** telemetry factory and network counters remain zero

#### Scenario: Disabled workflow still uses its product client
- **WHEN** an app needs its Inngest client for workflow behavior while telemetry is disabled
- **THEN** the app may construct that product client
- **AND** it constructs no `InngestSpanProcessor` or other telemetry exporter machinery

#### Scenario: Disabled Oclif command exits normally
- **WHEN** an Oclif command runs with telemetry disabled
- **THEN** command execution and exit classification are unchanged
- **AND** no background telemetry handle keeps the process alive

### Requirement: Telemetry failures never change product outcomes
Telemetry construction, enrichment, event finalization, export, flush, and shutdown failures SHALL be contained at the telemetry boundary. They MUST NOT
change HTTP status or body, Oclif result or exit classification, Effect success
or typed failure, committed domain state, or Inngest retry/outcome. Telemetry
callbacks MUST settle without unhandled rejections.

#### Scenario: Provider construction degrades without blocking product work
- **WHEN** enabled telemetry construction fails after ordinary app configuration has been admitted
- **THEN** the process continues with a non-throwing degraded/no-op telemetry value
- **AND** the product operation retains the outcome it would have had with telemetry disabled

#### Scenario: Request export fails
- **WHEN** a trace or log exporter fails during an otherwise successful HTTP request
- **THEN** the response status and body remain the product-defined success
- **AND** exporter failure does not escape as an unhandled rejection

#### Scenario: Command finalization fails
- **WHEN** EVlog finalization, flush, or shutdown fails after a command has produced its result
- **THEN** the command keeps its product-derived exit classification
- **AND** telemetry failure cannot replace it

#### Scenario: Inngest telemetry fails
- **WHEN** telemetry enrichment or export fails during an Inngest attempt
- **THEN** Inngest retry and function outcome are determined only by workflow execution
- **AND** telemetry failure creates neither a retry nor a successful outcome

### Requirement: Shutdown is ordered bounded and idempotent
The app/process owner SHALL perform shutdown in this order: stop new intake,
drain admitted work through each native owner's own event finalizer, close
observation intake, force-flush every attached telemetry processor/exporter,
then shut down the one app telemetry lifecycle and its tracer, meter, and logger
providers. The app and provider MUST NOT maintain an active-event registry or
re-finalize native events. One monotonic deadline SHALL bound the complete
coordinator wait and every telemetry stage. Concurrent or repeated shutdown
requests MUST share one completion and MUST NOT repeat provider stages. If a
native host has not settled at the deadline, the coordinator MUST stop waiting
and still attempt telemetry shutdown with the same expired deadline; it MUST
NOT claim forced native cancellation or OS-process termination.

#### Scenario: Normal shutdown preserves final observations
- **WHEN** shutdown begins with admitted requests, commands, or Inngest attempts in flight
- **THEN** new intake stops before admitted work drains
- **AND** each native owner finalizes its admitted event during work drain before observation intake closes and telemetry flushes
- **AND** signal-provider shutdown occurs last under the app lifecycle

#### Scenario: Repeated shutdown is idempotent
- **WHEN** process completion and a signal request shutdown concurrently or shutdown is called repeatedly
- **THEN** every stage runs at most once through one shared completion
- **AND** the product-derived exit status is preserved

#### Scenario: Native drain exceeds the deadline
- **WHEN** admitted native work does not settle before the monotonic deadline
- **THEN** the coordinator stops awaiting the native host and still attempts telemetry shutdown with the expired deadline
- **AND** the system records no claim that the native work was cancelled or that the OS process terminated

#### Scenario: Exporter cannot hang shutdown
- **WHEN** telemetry flush or an exporter stalls or fails
- **THEN** later shutdown stages are attempted within the remaining deadline
- **AND** the shutdown coordinator settles within the configured bound

### Requirement: Acceptance queries disposable backend tables
The system SHALL prove enabled telemetry with a pinned disposable
ClickStack/ClickHouse fixture. Each run SHALL assign a unique receipt id and
operation ids, exercise matched, unmatched, and batched oRPC, Oclif, and Inngest paths, query the
pinned ClickHouse trace, metric, and log tables with those ids, and decode the
returned rows. Acceptance MUST assert trace lineage, resource identity,
surface/outcome attributes, at least one matching metric row, at least one
matching technical-log row, and exactly one product-event row per native
product operation.

#### Scenario: Backend contains every required signal and log kind
- **WHEN** the disposable fixture completes matched, unmatched, and batched oRPC calls, an Oclif command, an Inngest attempt, ordered flush, and shutdown
- **THEN** bounded SQL polling returns matching trace, metric, technical-log, and product-event rows for the run-unique receipt id and operation ids
- **AND** the rows include an oRPC/Effect child trace, Inngest attempt lineage, at least one metric, at least one technical LogRecord, exactly one EVlog product event for each native operation, the unmatched outcome, and no batch-envelope duplicate

#### Scenario: HTTP success without rows fails acceptance
- **WHEN** an OTLP or ClickHouse endpoint returns HTTP 200 but the unique SQL queries return no matching rows or incomplete correlation
- **THEN** the acceptance fails
- **AND** transport response status, exporter callback success, UI state, and in-memory spans cannot substitute for table receipt

#### Scenario: Receipt records the queried evidence
- **WHEN** the disposable acceptance passes
- **THEN** it emits a bounded machine-readable receipt containing the pinned image identity, exact table names, query predicates, selected ids, and per-signal/per-record-kind row counts
- **AND** the receipt contains no secrets or raw product payloads

### Requirement: Langfuse remains an optional filtered processor
An optional Langfuse slice MUST remain separate from core completion and MAY attach one span processor to the existing process tracer provider under the app telemetry lifecycle only after admitting
an exact Langfuse SDK tuple. The processor MUST accept only spans with an
explicit bounded AI/research semantic marker. It MUST NOT create another
provider, context manager, propagation owner, exporter lifecycle, or core
completion dependency.

#### Scenario: Marked research span is selected
- **WHEN** optional Langfuse is enabled and a span carries the admitted AI/research marker
- **THEN** the filtered processor may export that span through the process tracer provider and app telemetry lifecycle
- **AND** unrelated platform spans are excluded

#### Scenario: Langfuse is absent or disabled
- **WHEN** Langfuse is unconfigured, disabled, or its optional slice has not landed
- **THEN** native ClickStack receipt and core telemetry completion remain available
- **AND** no Langfuse client, processor, timer, or network exporter is constructed

### Requirement: Native libraries retain their assigned responsibilities
The implementation SHALL delegate wire encoding, context propagation,
instrumentation, processing, and export to the admitted OpenTelemetry, oRPC,
Effect, Inngest, and EVlog libraries. It MUST NOT introduce a manual OTLP
framework, custom telemetry distribution/controller, second state owner, or
telemetry-driven domain/workflow control path.

#### Scenario: Architecture review finds one native path
- **WHEN** the completed implementation is reviewed across resource, provider, server, Oclif, and acceptance owners
- **THEN** each signal reaches its backend through its one selected signal-provider path under the app lifecycle
- **AND** no duplicate controller, transport, lifecycle, or domain-state mechanism exists
