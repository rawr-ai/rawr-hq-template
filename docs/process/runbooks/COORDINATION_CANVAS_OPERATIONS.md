# Coordination Canvas Operations Runbook

Use this runbook when you need to operate or validate the coordination canvas and its workflow-control surfaces.

Related docs:
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`

## Scope

- coordination canvas route: `/coordination`
- first-party coordination RPC procedures under `/rpc/coordination/*`
- workflow CLI surface: `rawr workflow coord ...`
- coordination run/timeline troubleshooting

This runbook assumes the managed HQ runtime is already running. For startup, shutdown, browser behavior, and generic runtime health, use `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`.

## Local Coordination Flow

Canonical coordination surfaces:
- primary canvas URL: `http://localhost:5173/coordination`
- workflow CLI commands: `rawr workflow coord ...`
- first-party RPC procedures: `/rpc/coordination/*`

The canvas is served inside the host shell. Standalone canvas serving is not enabled by default.

## Local Smoke Checks

1. Confirm the workflow list is reachable through first-party RPC:
```bash
curl -sS http://localhost:3000/rpc/coordination/listWorkflows \
  -X POST \
  -H "content-type: application/json" \
  -H "x-rawr-caller-surface: first-party" \
  -H "x-rawr-session-auth: verified" \
  -d '{"json":{}}'
```
Expected: `200` response with JSON body containing `json.workflows`.

2. Run a coordination workflow round-trip through the CLI:
```bash
bun run rawr workflow coord create --id wf-smoke --json
bun run rawr workflow coord validate wf-smoke --json
bun run rawr workflow coord run wf-smoke --json
```

3. Open the canvas route:
- Open `http://localhost:5173/coordination`
- Confirm the canvas loads, `Cmd/Ctrl+K` opens the command palette, and the run timeline updates after a run.

4. Inspect runtime log output while exercising coordination:
```bash
bun run rawr hq attach
```

Telemetry proof-path runbooks are quarantined. Mine them through `docs/process/runbooks/quarantine/AGENTS.md` only when needed.

## Hosted Coordination Notes

1. Environment variables:
- `INNGEST_BASE_URL` (or `INNGEST_EVENT_API_BASE_URL` / `INNGEST_DEV`) should point to the Inngest runtime endpoint used for traces and links.

2. Persistence model:
- Current coordination storage is file-backed under `.rawr/coordination` relative to the server repo root.
- In ephemeral filesystems, workflow, run, timeline, and memory data can be lost on restart or redeploy.
- For production durability, deploy with persistent disk or replace the file-backed storage adapter with durable DB or object storage.

## Incident Triage Checklist

For direct `/rpc` checks in this section, include first-party headers:
- `x-rawr-caller-surface: first-party`
- `x-rawr-session-auth: verified`

1. Confirm the managed HQ runtime status: `bun run rawr hq status --json`.
2. Confirm server health (`/health`).
3. Confirm the Inngest handler is reachable (`/api/inngest`).
4. Validate the workflow by id (`POST /rpc/coordination/validateWorkflow` with `{"json":{"workflowId":"..."}}`).
5. Check run status (`POST /rpc/coordination/getRunStatus`).
6. Check timeline diagnostics (`POST /rpc/coordination/getRunTimeline`).
7. Inspect `.rawr/hq/runtime.log` for correlated runtime output.
