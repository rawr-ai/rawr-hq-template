# Telemetry Verification Runbook

Use this runbook when you need to prove that the canonical HQ telemetry path is working end to end.

Related docs:
- `docs/system/TELEMETRY.md`
- `docs/system/telemetry/orpc.md`
- `docs/system/telemetry/hyperdx.md`
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
- `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md`

## Scope

This runbook verifies the canonical proof lane:

- first-party `/rpc/exampleTodo/*`
- published `/api/orpc/exampleTodo/*`
- correlated runtime logs in `.rawr/hq/runtime.log`
- traces and metrics visible in the local HyperDX backend

The canonical proof capability is `exampleTodo`.

## Prerequisites

1. Start the managed HQ runtime with observability enabled:
```bash
bun run rawr hq up --observability required
```

2. Confirm the runtime is healthy:
```bash
bun run rawr hq status --json
```
Expected:
- `summary` is `running`
- `support.observability.state` is `running`

For generic runtime setup and lifecycle behavior, use `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`.

## Proof Requests

1. First-party RPC proof request:
```bash
curl -sS http://localhost:3000/rpc/exampleTodo/tasks/create \
  -X POST \
  -H "content-type: application/json" \
  -H "x-rawr-caller-surface: first-party" \
  -H "x-rawr-session-auth: verified" \
  -d '{"json":{"title":"runtime smoke task","description":"verify correlated host logging"}}'
```

2. Published OpenAPI proof request:
```bash
curl -sS http://localhost:3000/api/orpc/exampleTodo/tasks/create \
  -X POST \
  -H "content-type: application/json" \
  -H "x-rawr-caller-surface: external" \
  -d '{"title":"published smoke task","description":"verify caller-facing proof surface"}'
```

Expected:
- both requests succeed with `200`
- the proof path crosses both `/rpc/exampleTodo/*` and `/api/orpc/exampleTodo/*`
- internal HQ procedures remain on `/rpc`

## Runtime Log Evidence

```bash
rg -n '"event":"(todo\\.tasks\\.create|todo\\.procedure|orpc\\.procedure)"' .rawr/hq/runtime.log | tail -n 12
```

Expected:
- emitted log lines contain `requestId`, `correlationId`, `requestPath`, `surface`, and `traceId`
- both `/rpc/exampleTodo/tasks/create` and `/api/orpc/exampleTodo/tasks/create` appear in `.rawr/hq/runtime.log`

## HyperDX Trace and Metric Evidence

```bash
docker exec rawr-hq-hyperdx clickhouse-client --query "
SELECT Timestamp, SpanName, SpanAttributes['rawr.orpc.surface'], SpanAttributes['url.full'], TraceId
FROM default.otel_traces
WHERE Timestamp > now() - INTERVAL 10 MINUTE
  AND ServiceName='@rawr/server'
  AND SpanAttributes['url.full'] LIKE '%exampleTodo/tasks/create'
ORDER BY Timestamp DESC
LIMIT 8
FORMAT Vertical"

docker exec rawr-hq-hyperdx clickhouse-client --query "
SELECT TimeUnix, MetricName, Attributes
FROM default.otel_metrics_sum
WHERE TimeUnix > now() - INTERVAL 10 MINUTE
  AND ServiceName='@rawr/server'
  AND MetricName='rawr.orpc.requests'
ORDER BY TimeUnix DESC
LIMIT 8
FORMAT Vertical"

docker exec rawr-hq-hyperdx clickhouse-client --query "
SELECT TimeUnix, MetricName, Attributes
FROM default.otel_metrics_histogram
WHERE TimeUnix > now() - INTERVAL 10 MINUTE
  AND ServiceName='@rawr/server'
  AND MetricName='rawr.orpc.request.duration'
ORDER BY TimeUnix DESC
LIMIT 8
FORMAT Vertical"
```

Expected:
- traces show `rawr.orpc.rpc.request` and `rawr.orpc.openapi.request` spans for recent `exampleTodo` requests
- `rawr.orpc.requests` and `rawr.orpc.request.duration` rows appear for both routed surfaces
- the same execution shape is visible across runtime logs, traces, and metrics

## UI Confirmation

1. Open `http://localhost:8080/`.
2. Confirm the local HyperDX UI is reachable while HQ is running with `--observability required`.
3. Verify the recent `exampleTodo` requests appear on the shared host ingress path rather than only as package-level spans.

## Related Checks

- For publication policy and spec generation, use `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md`.
- For coordination-canvas behavior and workflow run/timeline checks, use `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`.
