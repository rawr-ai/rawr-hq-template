## Why

The repository has server-local OpenTelemetry wiring, but it does not yet have
one app-selected, process-owned telemetry capability shared by oRPC, Effect,
Inngest, Oclif, and structured product events. A successful exporter request
also does not prove that a backend received queryable telemetry, so the native
platform boundary needs an exact dependency admission and a disposable data
receipt before it can be treated as settled.

## What Changes

- Admit the exact oRPC 2.0.0-beta.23, Effect 4.0.0-beta.101, Inngest 3.51.0,
  OpenTelemetry Node 0.213.0/stable 2.6.0, EVlog 2.24.0, and
  `@orpc/evlog` 2.0.0-beta.23 tuple through an executable compatibility
  fixture before production integration begins.
- Add a provider-neutral telemetry resource and one concrete
  `resources/telemetry/providers/opentelemetry-node` implementation, following
  the existing Habitat resource, provider, and app ownership laws.
- Give each enabled OS process one app-owned telemetry lifecycle, with one
  OpenTelemetry provider for each enabled signal and one propagation
  configuration shared by native oRPC, Effect, Inngest, HTTP, and Oclif
  integrations. The Inngest span processor uses the same process-owned
  Inngest client as the workflow harness.
- Emit one finalized EVlog product/business event for each native product
  operation: an Oclif command, oRPC operation attempt, or Inngest attempt. A
  batched oRPC request emits one event per item, including unmatched outcomes,
  while the HTTP envelope remains technical telemetry. Events enter
  OpenTelemetry Logs rather than a second exporter path and never become
  workflow history or domain truth.
- Make disabled telemetry construct no exporters, processors, periodic
  readers, drains, timers, or telemetry network clients. Telemetry startup,
  enrichment, export, flush, and shutdown failures do not change HTTP results,
  command exit semantics, Effect results, or Inngest retry outcomes.
- Add one ordered, bounded, idempotent shutdown path: stop intake, drain
  admitted work through each native owner's own finalizer, close observation
  intake, flush, then shut down.
- Prove backend receipt in a disposable ClickStack/ClickHouse fixture by
  querying run-unique trace, metric, technical-log, and product-event rows. An
  HTTP 200 from an OTLP endpoint is only transport liveness and cannot satisfy
  acceptance.
- Preserve the completed Civ Habitat 0.5.2 handoff as a best-effort
  coordination record. It supplies consumer context but no acknowledgment or
  cross-repository action blocks Template implementation.
- Leave a filtered Langfuse processor for AI/research spans as an optional
  later slice on the process tracer provider under the same app lifecycle; it
  is not part of the core receipt gate.
- Record PostHog's placement as a separate post-core analytics change for
  finalized, allowlisted product events, then leave package admission,
  identity policy, existing analytics-owner migration, and production wiring
  outside this change.
- Exclude a manual OTLP framework, custom telemetry distribution or
  controller, second lifecycle/state owner, hostile-environment hardening, and
  expansion of generic app/runtime composition.

## Capabilities

### New Capabilities

- `native-platform-telemetry`: Defines exact dependency admission,
  provider-neutral telemetry ownership, shared process instrumentation, wide
  product events, non-interference, deterministic shutdown, and query-backed
  backend receipt.

### Modified Capabilities

None.

## Impact

The implementation will add `resources/telemetry` and its OpenTelemetry Node
provider, replace the direct core telemetry singleton, and update the existing
HQ server, Inngest, and Oclif process entry seams. It will also affect package
manifests and the lockfile for the admitted tuple, focused resource/provider,
server, HQ app, and CLI tests, and one disposable ClickStack/ClickHouse
acceptance fixture. Public service contracts, workflow/domain authority,
application membership, and command namespaces remain unchanged.
