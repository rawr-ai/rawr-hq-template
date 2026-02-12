# Coordination Canvas Operations Runbook

This runbook covers local and hosted operations for the coordination canvas + Inngest runtime path.

## Scope

- Web coordination canvas route: `/coordination`
- Server APIs: `/rawr/coordination/*`
- Inngest serve endpoint: `/api/inngest`
- CLI surface: `rawr workflow coord ...`

## Local Development

1. Install dependencies:
```bash
bun install
```
2. Start coordination stack (server + web + Inngest dev):
```bash
bun run dev:up
```

Lifecycle behavior:
- If no managed stack is running, `dev:up` starts server/web/inngest.
- If managed stack is already running:
  - interactive terminal: prompts for `status` (default), `attach`, `stop`, or `restart`
  - non-interactive/CI: defaults to `status` and exits (no duplicate process spawn)
- If lifecycle ports are already occupied by another stack outside this worktree:
  - `auto` mode treats that as an existing stack and exits cleanly with status/remediation guidance
  - interactive mode offers to stop conflicting listeners and start in this worktree
  - explicit `--action start` fails fast with remediation guidance

Canonical canvas surface:
- Primary canvas URL: `http://localhost:5173/coordination`
- This is a host-shell route; standalone canvas serving is not enabled by default.

Browser open policy defaults to one surface:
- default: `coordination` (opens only `http://localhost:5173/coordination` once)
- policy options: `none | coordination | app | app+inngest | all`

Open-policy controls:
```bash
RAWR_DEV_UP_OPEN=none bun run dev:up
```

Backward-compatibility aliases:
- `RAWR_OPEN_POLICY=<policy>` (alias of `RAWR_DEV_UP_OPEN`)
- `RAWR_OPEN_UI=0` -> `none`
- `RAWR_OPEN_UI=1` -> `all`

Lifecycle actions can be set explicitly:
```bash
bun run dev:up -- --action status
bun run dev:up -- --action attach
bun run dev:up -- --action stop
bun run dev:up -- --action restart
```

3. Optional individual processes:
```bash
bun run dev:server
bun run dev:web
bun run dev:workflows
```

4. Backward-compatible alias:
```bash
bun run dev:inngest
```

## Local Smoke Checks

1. Server health:
```bash
curl -sS http://localhost:3000/health
```
Expected: `{"ok":true}`

2. Inngest serve endpoint:
```bash
curl -sS http://localhost:3000/api/inngest
```
Expected: `200` response from Inngest serve handler.

3. Coordination workflow round-trip via CLI:
```bash
bun run rawr workflow coord create --id wf-smoke --json
bun run rawr workflow coord validate wf-smoke --json
bun run rawr workflow coord run wf-smoke --json
```

4. Canvas route:
- Open `http://localhost:5173/coordination`
- Confirm canvas loads, `Cmd/Ctrl+K` opens command palette, and run timeline updates after a run.

5. Repeated-start safety checks:
```bash
bun run dev:up -- --action status
```
Expected:
- No new duplicate listeners are created when stack is already running.
- Status output reports managed process pids and listener ownership for lifecycle ports.

## Hosted Runtime Notes (Railway / Similar)

1. Environment variables:
- `INNGEST_BASE_URL` (or `INNGEST_EVENT_API_BASE_URL` / `INNGEST_DEV`) should point to the Inngest runtime endpoint used for traces/links.

2. Persistence model:
- Current coordination storage is file-backed under `.rawr/coordination` relative to server repo root.
- In ephemeral filesystems, workflow/run/timeline/memory data can be lost on restart/redeploy.
- For production durability, deploy with persistent disk/volume or replace the file-backed storage adapter with durable DB/object storage.

3. Operational health checks:
- `GET /health` for service liveness
- `GET /api/inngest` reachability
- `GET /rawr/coordination/workflows` basic data-path validation

## Incident Triage Checklist

1. Confirm server is healthy (`/health`).
2. Confirm Inngest handler is reachable (`/api/inngest`).
3. Validate workflow by id (`POST /rawr/coordination/workflows/:id/validate`).
4. Check run status (`GET /rawr/coordination/runs/:runId`).
5. Check timeline diagnostics (`GET /rawr/coordination/runs/:runId/timeline`).
6. Verify trace links in run payload point to expected Inngest environment.
