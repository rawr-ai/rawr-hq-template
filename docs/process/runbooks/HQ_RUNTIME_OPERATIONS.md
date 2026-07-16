# HQ Runtime Operations Runbook

Use this runbook when you need to start, stop, inspect, or debug the managed local HQ runtime.

Related docs:
- `docs/process/HQ_USAGE.md`
- `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md`

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

Telemetry subsystem docs and proof-lane runbooks are quarantined. Mine them through `docs/system/quarantine/AGENTS.md` and `docs/process/runbooks/quarantine/AGENTS.md`; do not treat them as current authority.

## Managed Lifecycle

Start the managed HQ runtime:
```bash
rawr hq up --observability required
```

Canonical lifecycle controls:
```bash
rawr hq status
rawr hq attach
rawr hq restart
rawr hq down
```

Use `--observability auto` only when you intentionally want HQ to degrade cleanly without the managed HyperDX stack.

## Runtime Controls

Observability controls:
- `--observability auto|required|off`
- `RAWR_HQ_OBSERVABILITY=<mode>`

Browser/open controls:
- `--open none|app|app+inngest|all`
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

## Controller Provenance Failures

If an official `hq` command is missing or its stack resolves through a checkout,
stop. Official commands must come from one verified installed controller and are
never repaired through Oclif user state.

```bash
rawr doctor global --json
command -v rawr
```

Build/select a verified release with `scripts/dev/install-global-rawr.sh` when the
installed controller is absent. Do not link `@rawr/cli`, relink official plugins,
or point the global command at a source checkout.

## Browser Behavior

Canonical shell surfaces:
- host shell home: `http://localhost:5173/`

Utility surfaces:
- Inngest
- HyperDX
- Nx Graph

Current behavior:
- HQ reuses and focuses an existing HQ browser context when possible.
- Inngest, HyperDX, and Nx Graph launchers live in the shell sidebar.
- utility surfaces open only as needed
- `rawr hq graph` opens Nx Graph on demand; it is not part of runtime health

Examples:
```bash
RAWR_HQ_OPEN=none rawr hq up
RAWR_HQ_OBSERVABILITY=required rawr hq up
rawr hq restart --open all --observability auto
rawr hq graph
```

## Basic Runtime Checks

1. Confirm runtime status and artifact write:
```bash
rawr hq status --json
```
Expected:
- `summary` is present
- `summary` is `running` when all runtime roles are healthy
- when observability is enabled, `support.observability` is nested under `support`
- when observability is intentionally off, `summary` can still be `running`
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
rawr hq attach
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
