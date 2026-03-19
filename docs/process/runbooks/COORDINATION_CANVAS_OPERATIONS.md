# Coordination Canvas Operations Runbook

This runbook covers the canonical local HQ runtime path for the coordination canvas and Inngest support surface.

## Scope

- Web coordination canvas route: `/coordination`
- ORPC RPC transport: `/rpc/*`
- ORPC OpenAPI transport: `/api/orpc/*`
- Inngest serve endpoint: `/api/inngest`
- Managed runtime surface: `rawr hq up|down|status|restart|attach`
- Workflow CLI surface: `rawr workflow coord ...`

## Local Development

1. Install dependencies:
```bash
bun install
```

2. Start the managed HQ runtime:
```bash
bun run rawr hq up
```

Canonical lifecycle controls:
```bash
bun run rawr hq status
bun run rawr hq attach
bun run rawr hq restart
bun run rawr hq down
```

Canonical runtime artifacts:
- `.rawr/hq/state.env`
- `.rawr/hq/status.json`
- `.rawr/hq/runtime.log`

Canonical canvas surface:
- Primary canvas URL: `http://localhost:5173/coordination`
- This is a host-shell route; standalone canvas serving is not enabled by default.

Runtime flags and env:
- `--open none|coordination|app|app+inngest|all`
- `--observability auto|required|off`
- `RAWR_HQ_OPEN=<policy>`
- `RAWR_HQ_OBSERVABILITY=<mode>`

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
- `support.observability` is nested under `support`
- `.rawr/hq/status.json` exists

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
- `GET /api/orpc/openapi.json` OpenAPI contract availability

## Incident Triage Checklist

1. Confirm the managed HQ runtime status: `bun run rawr hq status --json`.
2. Confirm server health (`/health`).
3. Confirm the Inngest handler is reachable (`/api/inngest`).
4. Confirm ORPC contract exposure (`/api/orpc/openapi.json`).
5. Validate the workflow by id (`POST /rpc/coordination/validateWorkflow` with `{"json":{"workflowId":"..."}}`).
6. Check run status (`POST /rpc/coordination/getRunStatus`).
7. Check timeline diagnostics (`POST /rpc/coordination/getRunTimeline` or `GET /api/orpc/coordination/runs/{runId}/timeline`).
8. Inspect `.rawr/hq/runtime.log` for correlated runtime output.
