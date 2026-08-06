## 1. Admit The Exact Dependency Tuple

- [x] 1.1 Add one focused Nx-owned compatibility fixture that pins oRPC, `@orpc/opentelemetry`, and `@orpc/evlog` at 2.0.0-beta.23, Effect and `@effect/opentelemetry` at 4.0.0-beta.101, Inngest at 3.51.0, OpenTelemetry API 1.9.0 plus Node/log 0.213.0 and stable 2.6.0 families, and EVlog at 2.24.0; assert every resolved public package version.
- [x] 1.2 In that fixture, create one app telemetry lifecycle with one tracer, meter, and logger provider; attach exactly one `InngestSpanProcessor` to the same Inngest client used by the native handler.
- [x] 1.3 Exercise matched, unmatched, and batched oRPC boundaries through the exact `EvlogHandlerPlugin` with Effect work, shared trace context, one metric, technical and product LogRecords, exactly one product event per operation attempt, no host duplicate or outcome filter, and bounded flush/shutdown.
- [x] 1.4 Run the fixture and record the admitted imports, versions, client identity, correlation, and lifecycle result at `de6d1aff8`; stop on incompatibility rather than adding a shim, patch, manual transport, or peer signal provider.

## 2. Preserve The Civ Coordination Record

- [x] 2.1 Preserve the completed best-effort Civ Habitat 0.5.2 handoff under [[../../../docs/process/CROSS_REPO_WORKFLOWS|Cross-Repository Workflows]] as a non-blocking coordination record; require no acknowledgment, consumer-side run, follow-up response, or Civ repository mutation for Template completion.

## 3. Add The Telemetry Resource And Node Provider

- [x] 3.1 Scaffold `resources/telemetry` and `resources/telemetry/providers/opentelemetry-node` at `167aba76c` with package exports, Nx ownership, closed test placement, and the [[../../../.habitat/blueprints/resource/README|resource]], [[../../../.habitat/blueprints/provider/README|provider]], and [[../../../.habitat/blueprints/app/skill|app]] ownership laws.
- [x] 3.2 Define the complete provider-neutral contract at `167aba76c` for process identity, bounded flat correlation attributes, a narrow native-operation event scope only for hosts without an admitted native event binding, technical-log emission, availability, never-reject flush, and bounded diagnostics; use core `Effect.Effect` as the neutral operation substrate without importing telemetry/runtime vendor types or exposing generic span, metric, event, annotation, active-context, exporter, SDK, registry, or mutable lifecycle-state operations; oRPC uses only its exact `EvlogHandlerPlugin` event owner.
- [x] 3.3 Implement the disabled provider branch at `167aba76c` before vendor construction and prove zero SDK, signal provider, exporter, processor, periodic reader, drain, timer, process-hook, Langfuse, and telemetry-network factory calls.
- [x] 3.4 Implement the OpenTelemetry Node provider set at `9d0ee2d55` with one app-owned lifecycle, one provider for each enabled trace/metric/log signal, the standard OTLP HTTP exporters, and one global W3C Trace Context plus Baggage configuration.
- [x] 3.5 Bind Effect to the process tracer provider at `9d0ee2d55` and admit the process-owned Inngest client as the sole input to its one `InngestSpanProcessor`; add no instrumentation-only client or alternate context manager.
- [x] 3.6 Bridge bounded technical logs and finalized EVlog product events at `9d0ee2d55` through the one logger provider with distinct record-kind attributes, flat allowlisted fields, and provider-boundary redaction; add no EVlog OTLP drain or direct backend client.
- [x] 3.7 Implement the provider-owned bounded lifecycle stages at `9d0ee2d55` for observation-intake close, per-signal force flush, and signal-provider shutdown without an active-event registry, provider-owned process hooks, or `process.exit` calls; native event owners finalize during host drain.
- [x] 3.8 Add focused resource/provider tests at `9d0ee2d55` proving every structural contract type derives from bounded TypeBox schemas, the public resource surface contains only the admitted operations, the neutral contract imports no vendor, enabled and disabled construction select one provider per signal, constructor/export/scope-finish failures do not interfere, the first native-operation scope finish wins while later enrichment and repeated finishes are inert, and shared shutdown continues stages under one deadline.

## 4. Wire The HQ Server And Inngest Process

- [ ] 4.1 Move process-owned Inngest client construction ahead of telemetry acquisition and pass that same object to both the workflow harness and `InngestSpanProcessor`.
- [ ] 4.2 Select the telemetry resource from the existing HQ app/server entry seam and acquire its one app lifecycle before route mounting without adding a generic runtime profile compiler, app role, or alternate host composition.
- [ ] 4.3 Install the exact `EvlogHandlerPlugin` as sole owner of one product event per oRPC operation attempt, including unmatched routes and each batch item; let host and service layers enrich its logger and create no HTTP-envelope event or outcome filter.
- [ ] 4.4 Emit existing host technical logs through the neutral technical-log operation and request metrics through the native global meter, with receipt and transport request ids as bounded correlation attributes; derive trace context from the active provider context rather than passing provider handles or caller-authored trace identity.
- [ ] 4.5 Make the host edge the single ingress extraction point, configure native oRPC not to repeat extraction, remove `hostLoggingSpanContext` and its parallel async-local trace identity, derive logging correlation from active OpenTelemetry context, and prove HTTP, oRPC, and Effect child spans share the expected trace lineage with a guard against the removed store.
- [ ] 4.6 Add one EVlog product event per Inngest attempt, retain the durable run id across retries, assign distinct attempt ids, and keep Inngest as retry/replay/history/outcome authority.
- [ ] 4.7 Coordinate server shutdown in order: stop HTTP/Inngest intake, drain admitted work through each native event owner, close observation intake, flush each signal, then shut down the app lifecycle; preserve product-derived process status on every telemetry failure and add no active-event registry.
- [ ] 4.8 Add focused server tests for matched, unmatched, and batched operation-event cardinality, nested enrichment, retry-attempt events, technical/product log separation, shared client/processor identity, propagation, disabled zero construction, telemetry-failure non-interference, and bounded idempotent shutdown.

## 5. Wire The Oclif Process

- [ ] 5.1 Add one app-owned telemetry bootstrap used by both the source-development and compiled Oclif entrypoints; individual command classes must not acquire telemetry.
- [ ] 5.2 Use native Oclif lifecycle hooks to open one product event after command resolution, enrich it with bounded command/outcome fields and technical logs while the provider derives active trace context, and finalize it once for success, declared error, or cancellation.
- [ ] 5.3 On command completion or signal, stop new command intake, drain the admitted invocation through its native event owner, close observation intake, flush each signal, and shut down through the shared bounded lifecycle without replacing the command exit classification or introducing an active-event registry.
- [ ] 5.4 Prove source/compiled parity, nested service-call deduplication, disabled zero construction, exporter/finalizer failure non-interference, repeated shutdown, and no background handle after exit.
- [ ] 5.5 Remove the direct core telemetry singleton, export, process hooks, and obsolete dependencies only after server and Oclif consumers use the resource; add an import/ownership guard against its return.

## 6. Produce A Disposable ClickHouse Receipt

- [ ] 6.1 Add a pinned disposable ClickStack/ClickHouse fixture with guarded startup/teardown, exact trace/metric/log table names, standard OTLP HTTP endpoints, and bounded readiness polling.
- [ ] 6.2 Generate one run-unique receipt id plus distinct request, command, Inngest run, and attempt ids, then exercise the enabled server, Oclif, and Inngest paths through ordered shutdown.
- [ ] 6.3 Query the pinned ClickHouse trace, metric, and log tables by the unique ids and decode the returned rows rather than treating exporter callbacks, UI state, or HTTP status as receipt.
- [ ] 6.4 Assert an oRPC/Effect child trace, Inngest attempt lineage, at least one correlated metric row, at least one technical-log row, exactly one EVlog product-event row for every native operation, and no host/batch-envelope duplicate.
- [ ] 6.5 Add a red acceptance case in which OTLP or ClickHouse returns HTTP 200 without the required unique rows and prove that the receipt gate fails.
- [ ] 6.6 Emit a bounded machine-readable receipt with image identity, table names, query predicates, selected ids, and per-signal/per-record-kind counts, then remove the disposable environment without retaining secrets or raw product payloads.

## 7. Keep Optional Integrations Separate

- [ ] 7.1 After the core ClickStack receipt is green, admit an exact Langfuse SDK version and AI/research span filter in a separate focused fixture, or record the optional slice as deferred without blocking core completion.
- [ ] 7.2 If Langfuse is admitted in this change, attach one filtered processor to the existing tracer provider under the app lifecycle and prove unrelated platform spans are excluded; otherwise leave production wiring absent.
- [ ] 7.3 Prove unconfigured/disabled Langfuse constructs no client, processor, timer, or network exporter and remains outside the core receipt and shutdown authority.
- [x] 7.4 Record the completed PostHog placement audit: a separate post-core `AnalyticsSinkResource` would receive finalized allowlisted product events; PostHog receives no technical telemetry and owns no telemetry provider/runtime or core completion state.
- [x] 7.5 Defer PostHog package admission, actor/personless identity policy, analytics-sink implementation, and existing analytics-owner migration to a separate OpenSpec change after core telemetry receipt; add no PostHog production dependency or wiring here.

## 8. Review Land And Drain Cleanly

- [ ] 8.1 Run strict OpenSpec validation, the exact tuple fixture, Habitat resource/provider/app checks, and focused lint/typecheck/test/build targets for every changed Nx owner.
- [ ] 8.2 Run server and Oclif native acceptance plus the disposable ClickHouse receipt with caches disabled where process lifecycle or backend rows are the subject.
- [ ] 8.3 Obtain independent reviews for dependency admission, resource/provider neutrality, one lifecycle and one provider per signal, propagation, EVlog cardinality, telemetry non-interference, shutdown ordering, and SQL-backed receipt evidence.
- [ ] 8.4 Resolve review findings and rerun every affected focused gate and receipt query before promotion.
- [ ] 8.5 Land exact-tuple admission, resource/provider, server/Inngest, Oclif, and disposable receipt as reviewable semantic nodes through [[../../../docs/process/GRAPHITE|the Graphite workflow]]; keep any admitted Langfuse work in a later optional node.
- [ ] 8.6 Pass the repository ratchet and canonical-main CI, then follow [[../../../docs/process/runbooks/STACK_DRAIN_LOOP|the stack drain loop]] until merged branches are pruned and the worktree/stack are clean.
- [ ] 8.7 Archive this OpenSpec change only after canonical receipt, review, Graphite settlement, and clean drain are complete.
