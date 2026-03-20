# HQ Runtime Integration

This document defines the current local HQ runtime integration for managed observability.

## CLI Surface

- Managed HQ lifecycle commands live under `rawr hq up|down|status|restart|attach`.
- `rawr hq graph` is an on-demand Nx graph helper, not part of the managed lifecycle.
- `rawr hq up` and `rawr hq restart` accept `--observability auto|required|off`.
- `RAWR_HQ_OBSERVABILITY` is the environment contract for the same mode selection.

## Managed Backend

- The current managed local observability backend is HyperDX.
- The expected managed container name is `rawr-hq-hyperdx`.
- The current HQ observability contract expects the HyperDX UI at `http://localhost:8080/` and OTLP HTTP ingest at `http://127.0.0.1:4318`.
- `scripts/dev/hq.sh` passes `OTEL_EXPORTER_OTLP_ENDPOINT` to the server only when managed observability is active.

## Status Contract

- `rawr hq status` writes `.rawr/hq/status.json`.
- Observability state is nested under `support.observability`.
- The status payload currently records backend `hyperdx`, the managed container name, current mode, URLs, port ownership, and remediations.

## Runtime Posture

- `auto` allows the HQ runtime to continue without managed observability when Docker, the HyperDX container, or required ports are unavailable.
- `required` fails fast when the managed HyperDX backend is not available.
- `off` disables managed observability and does not pass an OTLP endpoint into the server runtime.
