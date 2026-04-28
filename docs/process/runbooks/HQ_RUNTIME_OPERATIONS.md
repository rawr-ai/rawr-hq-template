# HQ Runtime Operations Runbook

Use this runbook when you need to start, stop, inspect, or debug the managed local HQ runtime.

Related docs:
- `docs/process/HQ_USAGE.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
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

## External Plugin-Manager Noise

If `rawr hq up` emits `Error: command hq:status not found`, first inspect the stack trace before treating it as a repo-owned runtime failure.

Classification rule:
- If every stack frame points at the current workspace, search and fix the local colon-form invocation.
- If stack frames point at another checkout, classify it as external oclif/plugin-manager noise.

Useful checks:
```bash
rg -n "hq:status|command hq:status" .rawr/hq/runtime.log
node -e 'const fs=require("fs"), os=require("os"), path=require("path"); const p=path.join(os.homedir(), ".local/share/@rawr/cli/package.json"); console.log(p); console.log(fs.readFileSync(p, "utf8"))'
```

Known observed external case:
- current workspace command: `rawr hq up`
- emitted stack path: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/apps/cli/src/index.ts`
- local status path still wrote this workspace's `.rawr/hq/status.json`
- the user oclif manager manifest linked `@rawr/cli` and workspace CLI plugins to `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

In that case, fix or relink the external user plugin-manager state; do not patch this template checkout unless a local `hq:status` caller is found.

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
- Inngest, HyperDX, and Nx Graph launchers live in the shell sidebar.
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
