## Context

Current main installs a `NodeSDK` through
`packages/core/src/telemetry.ts`, calls that helper from the server bootstrap,
and keeps request, workflow, and host logging integration in separate app
modules. The helper is process-global, but it is a concrete OpenTelemetry
implementation exposed from a generic package, it is not selected through the
resource/provider/app chain, it is not used by Oclif, and it has no
query-backed backend receipt. Effect and the experimental Inngest span
processor are also not joined to that lifecycle.

The controlling architecture is
[[../../../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec|RAWR Canonical Architecture]] and
[[../../../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec|RAWR Runtime Realization System]].
The concrete placement follows
[[../../../.habitat/blueprints/resource/README|the Habitat resource law]],
[[../../../.habitat/blueprints/provider/README|the Habitat provider law]], and
[[../../../.habitat/blueprints/app/skill|the Habitat app selection law]]. In
those terms, the resource defines a provider-neutral runtime capability, the
nested provider owns OpenTelemetry Node mechanics, the app selects the
provider and process configuration, and process bootstrap acquires exactly one
ready value.

This change is a contained native-platform slice. It wires the existing HQ
server and Oclif entrypoints; it does not implement the broader runtime
compiler, generic profile authoring, bootgraph, or harness package layout that
the canonical specifications reserve for later runtime-realization work.

## Goals / Non-Goals

**Goals:**

- Admit one executable dependency tuple before production code depends on it.
- Define a provider-neutral telemetry resource with one OpenTelemetry Node
  provider at the canonical Habitat path.
- Use one app-owned telemetry lifecycle per enabled OS process, with one
  OpenTelemetry provider for each enabled signal and one global propagation
  configuration.
- Make native oRPC, Effect, HTTP, Inngest, and Oclif integration share that
  process runtime and active context.
- Use the same process-owned Inngest client for workflow execution and its
  `InngestSpanProcessor`.
- Finalize one EVlog product/business event for each native Oclif command,
  oRPC operation attempt, and Inngest attempt and emit it through
  OpenTelemetry Logs.
- Make disabled telemetry allocate no exporter or background telemetry
  machinery, and make all telemetry failures observational only.
- Shut down in a bounded, ordered, idempotent sequence.
- Establish real backend receipt by querying disposable ClickHouse tables for
  run-unique trace, metric, technical-log, and product-event rows.

**Non-Goals:**

- A hand-written OTLP encoder, collector, router, distribution, or controller.
- A second process singleton, lifecycle registry, propagation stack, exporter
  pipeline, or event-state owner beside the selected provider.
- Using telemetry events as service state, workflow history, retry authority,
  idempotency state, audit truth, or product analytics policy.
- Reclassifying service, plugin, workflow, app, or harness ownership.
- Expanding generic app/runtime composition or completing the canonical
  runtime-realization subsystem.
- Hostile-environment hardening, generalized secret policy, backend retention,
  alerting, dashboards, sampling policy, or multi-process control-plane work.
- Making Langfuse a core exporter or sending all platform spans to it.

## Decisions

### Admit the exact package tuple before integration

The first implementation checkpoint is an executable compatibility fixture,
not production wiring. The fixture pins and imports this tuple:

| Family | Exact admission |
| --- | --- |
| oRPC | oRPC runtime packages, `@orpc/opentelemetry`, and `@orpc/evlog` at `2.0.0-beta.23` |
| Effect | `effect` and `@effect/opentelemetry` at `4.0.0-beta.101` |
| Inngest | `inngest` at `3.51.0`, including the public experimental `InngestSpanProcessor` |
| OpenTelemetry | `@opentelemetry/api` `1.9.0`, Node/logs/exporter/instrumentation packages at `0.213.0`, and stable SDK/core/resource packages at `2.6.0` |
| Wide events | `evlog` `2.24.0` |

The fixture must instantiate one in-memory app telemetry lifecycle with one
tracer provider, meter provider, and logger provider, attach the Inngest
processor to the same Inngest client used by a native handler, and run a real
oRPC boundary with the exact `EvlogHandlerPlugin`. Matched, unmatched, and
batched calls must produce exactly one finalized product event per operation
attempt and no host-owned duplicate. The fixture also runs Effect-backed work, records a
metric, emits a technical LogRecord, bridges the EVlog events through
OpenTelemetry LogRecords, and completes flush/shutdown. It asserts the runtime
package versions and the trace/correlation identity observed at each boundary.
Type-only compatibility or a successful package install is not admission.

If the tuple fails, implementation stops. The correction is a new exact tuple
decision, not a compatibility wrapper, package patch, manual transport, or
second provider. This is important because Inngest 3.51.0 exposes an
experimental processor and the selected oRPC and Effect packages are beta
families.

The Civ Habitat 0.5.2 consumer handoff is already a completed, best-effort
coordination record under
[[../../../docs/process/CROSS_REPO_WORKFLOWS|Cross-Repository Workflows]]. This
change preserves that record before production implementation completion. An
acknowledgment, consumer-side run, or follow-up response is not a Template
blocker, and this change does not mutate the Civ repository. If the admitted
telemetry tuple is forwarded later, that notice is also informational rather
than release authority.

Alternative considered: integrate each library and discover incompatibility
at the final acceptance. Rejected because a late peer-realm failure would make
architecture debugging indistinguishable from package incompatibility.

### Put neutral capability in the resource and vendor mechanics in the provider

`resources/telemetry/contract.ts` owns only provider-neutral values and
operations: process identity, correlation attributes, spans/events/annotations,
one native-operation event scope, non-throwing flush, and lifecycle state. It
does not import OpenTelemetry, EVlog, oRPC, Inngest, Effect, ClickHouse, or
Langfuse types. Product and service owners choose event names and semantic
fields; the resource transports observations without deciding their meaning.

`resources/telemetry/providers/opentelemetry-node/index.ts` is the single
concrete realization face. Its private implementation owns `NodeSDK`, trace,
metric, and log providers/processors, OTLP HTTP exporters, native framework
instrumentation, the EVlog-to-OpenTelemetry-Logs drain, redaction at the
transport boundary, and provider release.

Apps select provider config once per process. Existing process bootstraps
acquire the value and pass it to host integrations. Services and plugins see
only provider-neutral operations or the active runtime context already
sanctioned by the platform; they never construct exporters or select a
provider.

The current direct core telemetry singleton is retired after both consumers
move. It is not retained as an alias or fallback because that would preserve a
second state and lifecycle owner. The provider does not register its own
`SIGINT`, `SIGTERM`, or `beforeExit` handlers and never calls `process.exit`;
the app entrypoint owns process signals and invokes the one lifecycle handle.

Alternative considered: extend the existing core helper. Rejected because it
keeps a vendor implementation in a generic package and makes the resource and
app selection boundaries cosmetic.

### Share one app lifecycle, one provider per signal, one Inngest client, and one propagator

An enabled OS process constructs one app-owned telemetry lifecycle. The
OpenTelemetry Node SDK coordinates exactly one tracer provider, one meter
provider, and one logger provider for the enabled trace, metric, and log
signals. The lifecycle also registers one process-global context manager and
W3C Trace Context plus Baggage propagator. Processors and native
instrumentations attach to the provider for their signal; no integration
creates a peer provider for the same signal.

Effect telemetry consumes the registered global tracer provider through the
admitted Effect integration. It does not create another tracer provider,
context manager, exporter, or shutdown path. oRPC instrumentation and host
HTTP spans use that tracer provider, metrics use the one meter provider, and
technical logs plus EVlog product events use the one logger provider under the
same app lifecycle and global context.

The HQ server constructs its process-owned Inngest client before telemetry
provider acquisition. The same object is passed to both the Inngest workflow
harness and exactly one `InngestSpanProcessor` attached to the process tracer
provider. No instrumentation-only Inngest client exists. When telemetry is
disabled, workflow execution may still construct its required product client,
but no Inngest telemetry processor is constructed.

The provider is the only propagation configuration owner. A transport adapter
may perform one extraction or injection at its physical edge through the
global propagator, but it does not parse or persist a parallel trace context.
Native oRPC, Inngest, HTTP, and Effect integrations consume the resulting
active context and are configured not to repeat ingress extraction.

Alternative considered: let every framework configure its preferred provider,
propagator, and exporter. Rejected because duplicate extraction and peer
signal providers break parentage, shutdown, and receipt correlation.

### Model EVlog as one native-operation product event

The three event roots follow native product-operation ownership:

- one resolved Oclif command invocation;
- one oRPC operation attempt, whether matched or unmatched; and
- one Inngest function execution attempt.

The exact `EvlogHandlerPlugin` is the sole oRPC event owner. A unary call emits
one product event whether routing matches or not. A batched HTTP request emits
one event for each item because each operation attempt has an independent
routing result, outcome, and error boundary; the HTTP envelope remains a
transport span and technical-log scope. The host does not wrap oRPC in another
EVLog event or filter native terminal outcomes.

Each native operation opens one EVLog event after admission, enriches that same
event as work crosses semantic boundaries, and finalizes it exactly once with
duration and outcome. Effect spans, service calls, and Inngest steps add spans
or fields; they do not create additional events for their enclosing product
operation. A durable Inngest retry is another attempt and therefore gets
another event carrying the same run identity and a distinct attempt identity.

Attribute bags are flat and atomic: one stable concept per key. The baseline
includes app, process role, surface, operation, outcome, duration, trace/span
identity, the operation id, and available transport request, command, or
Inngest run/attempt ids. Arbitrary nested metadata blobs, raw request bodies,
prompts, secrets, and unbounded error payloads are not admitted. Owners may add
bounded semantic fields through explicit enrichment.

Finalized EVlog events enter the OpenTelemetry Logs API and the process log
pipeline. There is no `evlog/otlp` drain, direct ClickHouse writer, extra HTTP
exporter, or standalone EVlog shutdown owner. `@orpc/evlog` owns oRPC event
construction and context through its native handler plugin. Host and service
integration enrich that logger rather than constructing another event owner.

Technical/operational logs remain a distinct record class. The existing host
logger bridge emits bounded technical LogRecords through the same process
logger provider, while EVlog emits product-event LogRecords. A stable
record-kind attribute distinguishes them. Technical logs may describe several
implementation moments; the exactly-one rule applies only to the product event
for one native operation.

These wide events are product/business observations. Domain services and
Inngest remain authoritative for state and durable execution. Losing,
duplicating, or delaying an observation must never change a domain write,
workflow branch, retry, replay, command result, or HTTP response.

Alternative considered: make the physical HTTP envelope the EVLog owner.
Rejected because the admitted oRPC plugin owns one event per operation attempt,
including unmatched routes and each batch item. A host event would duplicate
the native owner and blur distinct outcomes. Service calls and Inngest steps
still enrich their enclosing operation rather than opening peer events.

### Integrate at existing native process boundaries

The HQ server path acquires telemetry before route mounting. Its host request
span and technical log own transport observation; the native oRPC plugin owns
each operation-attempt event, and the Inngest function wrapper owns its attempt
event. oRPC and Effect spans remain children of the extracted request context.
Success, expected caller errors, unexpected failures, and cancellation
finalize the native operation event without changing response mapping.

Both Oclif entrypoints use one shared app-owned bootstrap around native
`execute(...)`. Oclif lifecycle hooks begin the event only after a native
command is resolved, enrich the same event during execution, and finalize it
on success, declared error, or cancellation. Source and compiled entrypoints
must use the same lifecycle selection and shutdown helper; individual command
classes do not bootstrap telemetry.

Effect spans are emitted by the admitted Effect integration against the
global tracer provider. Existing explicit platform spans may remain when they
add a real native boundary, but duplicate wrapper spans are removed rather
than renamed. Inngest continues to own run identity, attempts, retries,
replay, and step history.

This wiring changes existing app/host entry seams only. It does not add a
generic runtime profile compiler, new app role, alternate host composition,
or second runtime assembly.

### Disabled mode is construction-free and failures are non-interfering

Provider selection normalizes disabled mode before importing or invoking
vendor construction factories. The disabled branch returns a provider-neutral
no-op value and constructs no `NodeSDK`, exporters, span/log processors,
periodic metric readers, EVlog drain, Inngest processor, Langfuse client,
telemetry timers, process hooks, or telemetry network requests.

Enabled telemetry is best effort after ordinary app configuration has been
admitted. Telemetry construction, enrichment, finalization, export, flush, and
shutdown failures are contained at the telemetry boundary. They may produce a
bounded local diagnostic through an injected non-recursive sink, but they do
not change an HTTP status/body, Oclif result/exit classification, Effect
success or typed failure, domain commit, or Inngest retry/outcome. Telemetry
callbacks do not leave unhandled rejections.

Alternative considered: make optional telemetry provider failure fatal to
process startup or workflow execution. Rejected because observation is not a
product correctness dependency in this slice.

### Make shutdown ordered, bounded, and idempotent

The app/process owner coordinates shutdown with native hosts; the telemetry
provider does not reach upward to stop them. One monotonic deadline covers this
sequence:

1. Stop accepting new command, HTTP, and Inngest work.
2. Drain already admitted native operations within the remaining budget.
3. Finalize every admitted EVlog event that can still finish.
4. Close the EVlog/event intake so no new event can enter the log pipeline.
5. Force-flush the OpenTelemetry log, trace, metric, Inngest, and optional
   processor set within the remaining budget.
6. Shut down the one app telemetry lifecycle, including its tracer, meter, and
   logger providers, processors, and exporters.

Concurrent or repeated shutdown calls share one promise and do not repeat any
stage. A stage failure is recorded, later stages are still attempted, and the
deadline prevents a stuck exporter from keeping the process alive. Signal
handling preserves the product-derived exit status; flush or shutdown failure
cannot replace it.

Alternative considered: let each integration register process hooks and flush
itself. Rejected because ordering becomes nondeterministic and one stalled
exporter can block unrelated finalizers.

### Require a query-backed disposable receipt

Acceptance starts a pinned disposable ClickStack/ClickHouse environment and
configures the standard OpenTelemetry OTLP HTTP exporters. The fixture assigns
one run-unique receipt id and distinct operation ids, exercises unary and
batched oRPC procedures, an Oclif command, and an Inngest attempt, then shuts each
process down through the ordered lifecycle.

The fixture uses bounded polling and SQL against ClickHouse. During fixture
construction, the selected ClickStack image and its trace, metric, and log
table names are recorded and then pinned; later runs query those exact tables.
Acceptance decodes returned rows and asserts the receipt id, operation ids,
trace correlation, resource identity, expected
surface/outcome, at least one metric row, at least one technical LogRecord,
and exactly one EVlog product-event LogRecord for each native operation. The
fixture must observe matched and unmatched oRPC outcomes, and the batched
request must contain one event per item with no host-level duplicate. At least
one Effect/oRPC child span and the Inngest attempt lineage must be present under
the shared context.

An OTLP or ClickHouse HTTP 200, an empty SQL result, a UI screenshot, exporter
callback success, or an in-memory span alone cannot pass. The fixture emits a
small machine-readable receipt containing image identity, table names, query
predicates, selected ids, and per-signal/per-record-kind row counts; it
contains no secrets or raw product payloads and is removed with the disposable
environment unless a review task explicitly records it as test evidence.

Alternative considered: mock exporters only. Rejected because mocks prove
serialization callbacks, not backend ingestion and queryability.

### Keep Langfuse as a filtered later processor

The core provider exposes an internal processor-extension point only as needed
to attach admitted native processors to the process tracer provider under the
same app lifecycle. A later optional slice may use it for one Langfuse
processor that accepts only spans carrying an explicit bounded AI/research
semantic marker. Ordinary HTTP, Oclif, provider, service, and Inngest
infrastructure spans are excluded.

The optional slice must admit its own exact Langfuse package version and
filter behavior before wiring. Disabled or unconfigured Langfuse constructs no
client, processor, timer, or network exporter. It adds no provider, context
manager, propagation owner, or shutdown path, and it is not required for the
ClickStack receipt or core completion.

Alternative considered: make Langfuse a second SDK or mirror every span.
Rejected because it creates another lifecycle owner and sends unrelated
platform telemetry to a specialized research backend.

### Keep PostHog analytics outside the core telemetry boundary

The placement audit admits PostHog only as a separate post-core product
analytics slice. A provider-neutral `AnalyticsSinkResource` receives the same
immutable finalized product-event snapshot that enters OpenTelemetry Logs; a
`posthog-node` provider may translate that snapshot into one PostHog event.
Services enrich the active product event and never call PostHog or create a
second procedure-level event. The existing placeholder `AnalyticsClient`
middleware is migration evidence, not the vendor binding to replace in place.

The app selects and scopes the optional analytics sink. PostHog receives no
technical logs, owns no telemetry provider/runtime state, and cannot become a
core completion gate. Its initial admission candidate is
`posthog-node@5.46.1` under the repository's Bun runtime, but production
enablement remains off until an executable fixture proves import, capture,
flush, and bounded shutdown and the product event has a deliberate
actor/personless `distinctId` rule. Failure of either admission defers the
PostHog slice without changing native telemetry completion.

## Risks / Trade-offs

- **The beta package families are structurally compatible but fail at runtime**
  -> execute the exact tuple fixture first and block all integration on its
  trace, log, client identity, flush, and shutdown assertions.
- **Two framework integrations extract the same carrier** -> configure one
  global propagator owner, one transport-edge extraction, and assert shared
  trace identity across HTTP, oRPC, Effect, and Inngest.
- **A wide event is emitted twice or never finalized** -> use the native
  operation boundary as sole owner and test unary, batch, nested work, error
  paths, retries, and idempotent finalization.
- **Telemetry failures leak into product behavior** -> use non-throwing
  resource operations, settle exporter callbacks, and compare product outcomes
  under injected telemetry failures.
- **Shutdown loses the final events or hangs** -> stop intake before drain,
  close event intake before flush, share one shutdown promise, and apply one
  deadline to the full sequence.
- **ClickStack schema or image changes invalidate queries** -> pin the
  disposable image and exact trace, metric, and log table names in the fixture
  and record them in the receipt.
- **High-cardinality or sensitive fields become a de facto data dump** -> use
  flat allowlisted attributes, bounded values, and provider-boundary
  redaction; do not accept generic metadata blobs.
- **The contained wiring looks like the complete runtime realization** -> keep
  changes at existing server and Oclif entry seams and make no compiler,
  bootgraph, or generic profile completion claim.

## Migration Plan

1. Land the exact tuple fixture and record its accepted public API surface.
2. Preserve the completed best-effort Civ Habitat 0.5.2 coordination record
   before marking production implementation complete; do not wait for a
   response or consumer-side change.
3. Add the provider-neutral resource, disabled implementation behavior, and
   OpenTelemetry Node provider set with one app-owned process lifecycle.
4. Move HQ server, oRPC, Effect, and Inngest wiring to the selected provider,
   then move both Oclif entrypoints.
5. Remove the direct core telemetry singleton only after all consumers use the
   resource; do not dual-run old and new providers.
6. Run the disposable ClickStack/ClickHouse receipt and focused failure and
   shutdown suites. A rollback reverts the semantic Graphite node; it does not
   activate the retired helper as a runtime fallback.
7. Treat the filtered Langfuse processor as a separate optional node after the
   core receipt is green.

## Open Questions

None for the core slice. The optional Langfuse node must select and admit its
exact SDK version in its own compatibility fixture; that deferred choice does
not block native platform telemetry.
