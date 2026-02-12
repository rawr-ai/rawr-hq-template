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
2. Start the server:
```bash
bun --cwd apps/server run dev
```
3. Start Inngest dev server:
```bash
bun --cwd apps/server run dev:inngest
```
4. Start the web app:
```bash
bun --cwd apps/web run dev
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
