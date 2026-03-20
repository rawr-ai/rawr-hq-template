# HQ Runtime Operations Runbook

Use this runbook when you need to start, stop, inspect, or debug the managed local HQ runtime.

Related docs:
- `docs/process/HQ_USAGE.md`
- `docs/system/TELEMETRY.md`
- `docs/system/telemetry/hyperdx.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
- `docs/process/runbooks/TELEMETRY_VERIFICATION.md`

## Scope

This runbook covers the composed local HQ runtime bundle:

- server
- web shell
- async workflow runtime
- observability support infrastructure when enabled
- browser launch behavior for shell and utility surfaces
- workspace graph exploration

## Local Prerequisites

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

The current local support contract is:
- container name: `rawr-hq-hyperdx`
- UI: `http://localhost:8080/`
- OTLP HTTP ingest: `http://127.0.0.1:4318`

## Managed Lifecycle

Start the managed HQ runtime:
```bash
bun run rawr hq up --observability required
```

Canonical lifecycle controls:
```bash
bun run rawr hq status
bun run rawr hq attach
bun run rawr hq restart
bun run rawr hq down
```

Use `--observability auto` only when you intentionally want HQ to degrade cleanly without the managed HyperDX stack.

## Runtime Controls

Observability controls:
- `--observability auto|required|off`
- `RAWR_HQ_OBSERVABILITY=<mode>`

Browser/open controls:
- `--open none|coordination|app|app+inngest|all`
- `RAWR_HQ_OPEN=<policy>`

Mode precedence for observability:
1. explicit CLI flag
2. persisted runtime state in `.rawr/hq/state.env`
3. `RAWR_HQ_OBSERVABILITY`

## Runtime Artifacts

The managed runtime contract is backed by:

- `.rawr/hq/state.env`
- `.rawr/hq/status.json`
- `.rawr/hq/runtime.log`

`rawr hq status --json` writes `.rawr/hq/status.json`.

## Browser Behavior

Canonical shell surfaces:
- host shell home: `http://localhost:5173/`
- coordination route inside the shell: `http://localhost:5173/coordination`

Utility surfaces:
- Inngest
- HyperDX
- Nx Graph

Current behavior:
- HQ reuses and focuses an existing HQ browser context when possible.
- `coordination` is a shell route inside the HQ UI, not a separate canonical utility surface.
- utility surfaces open only as needed
- `rawr hq graph` opens Nx Graph on demand; it is not part of runtime health

Examples:
```bash
RAWR_HQ_OPEN=none bun run rawr hq up
RAWR_HQ_OBSERVABILITY=required bun run rawr hq up
bun run rawr hq restart --open all --observability auto
bun run rawr hq graph
```

## Basic Runtime Checks

1. Confirm runtime status and artifact write:
```bash
bun run rawr hq status --json
```
Expected:
- `summary` is present
- `summary` is `running` when all runtime roles are healthy and the HyperDX container is available
- `support.observability` is nested under `support`
- `.rawr/hq/status.json` exists

2. Confirm server health:
```bash
curl -sS http://localhost:3000/health
```
Expected: `{"ok":true}`

3. Confirm the Inngest serve endpoint is reachable:
```bash
curl -sS http://localhost:3000/api/inngest
```
Expected: `200` response from the Inngest serve handler.

4. Tail correlated runtime logs:
```bash
bun run rawr hq attach
```

## Debug Surfaces

Low-level internal tasks remain available for debugging, but they are not managed lifecycle surfaces:
```bash
bun run dev
bun run dev:server
bun run dev:web
bun run dev:workflows
```

Use these only when you intentionally need to bypass the managed HQ runtime surface.
