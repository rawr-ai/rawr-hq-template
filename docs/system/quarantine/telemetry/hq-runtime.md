# HQ Runtime Integration

This document defines how the telemetry subsystem attaches to the managed local HQ runtime.

For lifecycle commands, browser behavior, and operator steps, use `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`.

## Runtime Attachment

The telemetry subsystem attaches to one composed local runtime bundle:

- server
- web
- async workflow runtime
- observability support infrastructure when enabled

`rawr hq up` and `rawr hq restart` control that attachment with `--observability auto|required|off`.

## Observability Control

Mode precedence is:

1. explicit CLI flag
2. persisted runtime state in `.rawr/hq/state.env`
3. `RAWR_HQ_OBSERVABILITY`

`RAWR_HQ_OBSERVABILITY` is therefore the fallback environment contract for the same mode selection.

## Runtime Artifacts

The managed runtime contract is backed by:

- `.rawr/hq/state.env`
- `.rawr/hq/status.json`
- `.rawr/hq/runtime.log`

`rawr hq status` writes `.rawr/hq/status.json`.

Observability state is nested under `support.observability`.
