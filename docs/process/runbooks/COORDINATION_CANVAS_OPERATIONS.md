# Coordination Canvas Operations Runbook

This runbook covers the canonical local HQ runtime path for the coordination canvas and Inngest support surface.

## Scope

- Web coordination canvas route: `/coordination`
- ORPC RPC transport: `/rpc/*`
- Published ORPC OpenAPI transport: `/api/orpc/*`
- Inngest serve endpoint: `/api/inngest`
- Managed runtime surface: `rawr hq up|down|status|restart|attach`
- Workspace graph explorer: `rawr hq graph`
- Workflow CLI surface: `rawr workflow coord ...`

## Local Development

1. Install dependencies:
```bash
bun install
```

2. Provision the local HyperDX support container once if you want managed traces and metrics:
```bash
docker run -d --name rawr-hq-hyperdx -p 8080:8080 -p 4318:4318 docker.hyperdx.io/hyperdx/hyperdx-local
```
If the container already exists but is stopped:
```bash
docker start rawr-hq-hyperdx
```

3. Start the managed HQ runtime:
```bash
bun run rawr hq up --observability required
```
Use `--observability auto` only when you intentionally want HQ to degrade cleanly without the managed HyperDX stack.

Canonical lifecycle controls:
```bash
bun run rawr hq status
bun run rawr hq attach
bun run rawr hq restart
bun run rawr hq down
```

Workspace exploration stays on-demand:
```bash
bun run rawr hq graph
```

Canonical runtime artifacts:
- `.rawr/hq/state.env`
- `.rawr/hq/status.json`
- `.rawr/hq/runtime.log`

Canonical canvas surface:
- Primary canvas URL: `http://localhost:5173/coordination`
- Host shell home: `http://localhost:5173/`
- Utility launchers for Inngest, HyperDX, and Nx Graph live in the shell sidebar.
- Standalone canvas serving is not enabled by default.

Runtime flags and env:
- `--open none|coordination|app|app+inngest|all`
- `--observability auto|required|off`
- `RAWR_HQ_OPEN=<policy>`
- `RAWR_HQ_OBSERVABILITY=<mode>`

Browser launch behavior:
- HQ reuses and focuses an existing HQ browser context when possible.
- `coordination` is a shell route inside the HQ UI, not a separate canonical utility surface.
- Utility surfaces such as Inngest, HyperDX, and Nx Graph open only as needed.

Examples:
```bash
RAWR_HQ_OPEN=none bun run rawr hq up
RAWR_HQ_OBSERVABILITY=required bun run rawr hq up
bun run rawr hq restart --open all --observability auto
```

Low-level internal tasks remain available for debugging, but they are not managed lifecycle surfaces:
```bash
bun run dev
bun run dev:server
bun run dev:web
bun run dev:workflows
```

## Local Smoke Checks

1. Confirm runtime status and artifact write:
```bash
bun run rawr hq status --json
```
Expected:
- `summary` is present
- `summary` is `running` when all three roles are healthy and the HyperDX container is available
- `support.observability` is nested under `support`
- `support.observability.state` is `running`
- `.rawr/hq/status.json` exists

Optional workspace graph:
- Run `bun run rawr hq graph` when you want the Nx project graph in a separate browser session.
- The graph explorer is not part of HQ runtime health/status.

2. Server health:
```bash
curl -sS http://localhost:3000/health
```
Expected: `{"ok":true}`

3. Inngest serve endpoint:
```bash
curl -sS http://localhost:3000/api/inngest
```
Expected: `200` response from the Inngest serve handler.

4. ORPC RPC workflow list:
```bash
curl -sS http://localhost:3000/rpc/coordination/listWorkflows \
  -X POST \
  -H "content-type: application/json" \
  -d '{"json":{}}'
```
Expected: `200` response with JSON body containing `json.workflows`.

5. Coordination workflow round-trip via CLI:
```bash
bun run rawr workflow coord create --id wf-smoke --json
bun run rawr workflow coord validate wf-smoke --json
bun run rawr workflow coord run wf-smoke --json
```

6. Canvas route:
- Open `http://localhost:5173/coordination`
- Confirm the canvas loads, `Cmd/Ctrl+K` opens the command palette, and the run timeline updates after a run.

7. Runtime log tail:
```bash
bun run rawr hq attach
```

8. Canonical `example-todo` proof-path smoke checks:
```bash
curl -sS http://localhost:3000/rpc/exampleTodo/tasks/create \
  -X POST \
  -H "content-type: application/json" \
  -H "x-rawr-caller-surface: first-party" \
  -H "x-rawr-session-auth: verified" \
  -d '{"json":{"title":"runtime smoke task","description":"verify correlated host logging"}}'

curl -sS http://localhost:3000/api/orpc/exampleTodo/tasks/create \
  -X POST \
  -H "content-type: application/json" \
  -H "x-rawr-caller-surface: external" \
  -d '{"title":"published smoke task","description":"verify caller-facing proof surface"}'
```
Expected:
- both requests succeed with `200`
- the canonical proof path crosses both `/rpc/exampleTodo/*` and `/api/orpc/exampleTodo/*`
- `/api/orpc` remains the published API-plugin surface; internal HQ procedures stay on `/rpc`

9. Runtime log correlation evidence:
```bash
rg -n '"event":"(todo\\.tasks\\.create|todo\\.procedure|orpc\\.procedure)"' .rawr/hq/runtime.log | tail -n 12
```
Expected:
- the emitted log lines contain `requestId`, `correlationId`, `requestPath`, `surface`, and `traceId`
- the `/rpc/exampleTodo/tasks/create` and `/api/orpc/exampleTodo/tasks/create` requests both appear in `.rawr/hq/runtime.log`

10. Trace and metric evidence in the local HyperDX stack:
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
- traces show `rawr.orpc.rpc.request` and `rawr.orpc.openapi.request` spans for the recent `exampleTodo` requests
- `rawr.orpc.requests` and `rawr.orpc.request.duration` rows appear for both routed surfaces
- the same execution shape is now proven across `.rawr/hq/runtime.log`, traces, and metrics without bypassing the shared host boundary

11. Optional UI confirmation:
Expected:
- `http://localhost:8080/` is reachable while HQ is running with `--observability required`
- HyperDX should now show the same recent `exampleTodo` traces/metrics already proven via ClickHouse queries

12. Observability UI confirmation:
- Open `http://localhost:8080/`
- confirm the local HyperDX UI is reachable while HQ is running with `--observability required`
- verify the canonical `example-todo` request produces traces/metrics on the shared `/rpc` or `/api/orpc` host ingress path, not only package-level spans

## Hosted Runtime Notes (Railway / Similar)

1. Environment variables:
- `INNGEST_BASE_URL` (or `INNGEST_EVENT_API_BASE_URL` / `INNGEST_DEV`) should point to the Inngest runtime endpoint used for traces and links.

2. Persistence model:
- Current coordination storage is file-backed under `.rawr/coordination` relative to the server repo root.
- In ephemeral filesystems, workflow, run, timeline, and memory data can be lost on restart or redeploy.
- For production durability, deploy with persistent disk or replace the file-backed storage adapter with durable DB or object storage.

3. Operational health checks:
- `GET /health` for service liveness
- `GET /api/inngest` reachability
- `POST /rpc/coordination/listWorkflows` basic data-path validation
- `GET /api/orpc/openapi.json` published OpenAPI contract availability

## Incident Triage Checklist

1. Confirm the managed HQ runtime status: `bun run rawr hq status --json`.
2. Confirm server health (`/health`).
3. Confirm the Inngest handler is reachable (`/api/inngest`).
4. Confirm published ORPC contract exposure (`/api/orpc/openapi.json`) and verify it advertises the public API-plugin surface.
5. Validate the workflow by id (`POST /rpc/coordination/validateWorkflow` with `{"json":{"workflowId":"..."}}`).
6. Check run status (`POST /rpc/coordination/getRunStatus`).
7. Check timeline diagnostics (`POST /rpc/coordination/getRunTimeline`).
8. Inspect `.rawr/hq/runtime.log` for correlated runtime output.
