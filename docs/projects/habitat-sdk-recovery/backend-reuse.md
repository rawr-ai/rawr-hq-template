# Backend Infrastructure Reuse

Informative recovered recipe, September 15, 2026. This document preserves useful
infrastructure knowledge without promoting the old telemetry tool to supported
runtime machinery. It is not full-observability acceptance or a new Nx target.
See [source retirement](telemetry-retirement.md) for ownership and provenance.

## The Reusable Unit

The historical staged source is
`tools/native-platform-telemetry-receipt/src/receipt.ts` in the existing
`wt-template-native-platform-telemetry` source worktree. Its exact local image:

```text
docker.io/clickhouse/clickstack-local@sha256:6d0019b129a0a0b36ff9d33b7cf628be977704bf6e74814f4add06efb74cf315
```

This pins the recovered fixture, not a recommendation that an old image is
current or production-secure. Requalify upgrades independently. The upstream
[ClickStack deployment sources](https://github.com/ClickHouse/ClickStack/blob/main/docker-compose.yml)
and [OTLP protocol](https://opentelemetry.io/docs/specs/otlp/) describe the native
interfaces; this recipe does not wrap their semantics in new Habitat APIs.

## Safe Local Setup

Use an already provisioned Podman machine; inspect its initial running state.
Starting it is a separate operator action, not an application startup dependency.
Do not install system helpers, change global connections, initialize a new VM,
delete old fixtures, or alter another process's containers merely to run a check.

For an owned probe, choose a unique name and label, retain the returned container
ID, and publish only OTLP HTTP on a dynamic loopback port. Example argument shape:

```sh
podman run --detach --pull=never \
  --name "$UNIQUE_NAME" --label "io.habitat.fixture=$UNIQUE_NAME" \
  --publish 127.0.0.1::4318 "$PINNED_IMAGE"
podman port "$OWNED_CONTAINER_ID" 4318/tcp
```

`--pull=never` makes a cache miss explicit rather than downloading an image as a
hidden side effect. Verify the inspected name, label, image and container ID.
Reject non-loopback mappings. Do not expose ClickHouse or mount user data.

Register cleanup immediately after successful creation, before readiness or
inspection can fail. Every subprocess and HTTP request needs a deadline. On exit,
reinspect ownership and remove only the unchanged owned container, then verify
its absence. An inspection error is not successful teardown. Return a machine
started by this check to its prior stopped state only after confirming no other
work has started on it.

The old implementation needs hardening here: acquisition can fail after creation
but before finalizer registration, teardown can swallow inspection failure, HTTP
readiness fetches lack individual timeouts, and child processes inherit ambient
environment. Preserve the techniques, not those hazards.

## Readiness Is Not Delivery

Use `podman exec "$OWNED_CONTAINER_ID" clickhouse-client --query ...`, not an
externally published ClickHouse port. Wait, with a fixed deadline, for:

```sql
SELECT name FROM system.tables
WHERE database = 'default'
  AND name IN ('otel_logs', 'otel_metrics_histogram', 'otel_metrics_sum', 'otel_traces')
ORDER BY name FORMAT TSVRaw
```

Check `/v1/traces`, `/v1/metrics` and `/v1/logs` on the mapped loopback endpoint
using bounded HTTP requests. The old readiness probe posts empty protobuf bodies
with `Content-Type: application/x-protobuf` and expects HTTP 200. Together with
table discovery and cleanup, this establishes infrastructure readiness only.

For later delivery proof, use a fresh synthetic `receipt.id` resource attribute
and parameterized queries, for example:

```sh
podman exec "$OWNED_CONTAINER_ID" clickhouse-client \
  --param_receipt="$RECEIPT_ID" --query "$QUERY"
```

```sql
SELECT TraceId, SpanId, ParentSpanId, SpanName, ServiceName
FROM default.otel_traces
WHERE ResourceAttributes['receipt.id'] = {receipt:String}
FORMAT JSONEachRow
```

The corresponding tables are `default.otel_metrics_sum`,
`default.otel_metrics_histogram`, and `default.otel_logs`. Decode returned rows
and assert the intended observations, identities and outcomes; reject empty
results. Do not reuse the old fixture's operation counts, event classifications
or metric names without a current contract. Restart durability, HyperDX UI
readback, exception sanitization and actual Habitat producers require their own
explicit acceptance; none follows from the readiness commands above.

## What Not To Transplant

Do not copy the complete old tool or its Nx target into current main. It requires
deleted HQ/server imports, `apps/cli/bin/run.js doctor`, an old `@habitat-ai/rawr`
build/manifest, old Effect context wiring, and old event contracts. Its Inngest
fixture is not a durable server. Current Habitat already has a real native
dev-server helper in
`packages/core/sdk/test/fixtures/async-native/dev-server.ts`, qualified separately
from backend persistence. No second Inngest infrastructure owner is needed.

The [existing D-5 obligation](../habitat-runtime-realignment/deferred-capabilities.md#d-5-full-observability)
and recovered design frame determine when those producers and semantic events
should be qualified. This runbook preserves the local backend setup independently.

## September 15 Readiness Receipt

A fresh, single-process probe passed using Podman 6.0.1 and the exact cached
image above. It verified all four tables and HTTP 200 for empty JSON requests
to all three OTLP endpoints on a dynamic loopback port. No telemetry events
were sent, no Habitat fixture was imported, and no image was downloaded.

The exact owned container was removed; all five pre-existing container
identities and stopped states were preserved. The existing VM was returned to
its initial stopped state. The [bounded receipt](resources/research/backend-readiness-2026-09-15.json)
records these observations without copying unrelated runtime data.

An earlier standalone start command reported success but the VM was already
stopped on the next tool call. The single-process probe did not reproduce that
failure; execution-process cleanup is a hypothesis, not an established Podman
defect. Keep startup, probe and cleanup inside one owned execution when using
short-lived agent command sessions.
