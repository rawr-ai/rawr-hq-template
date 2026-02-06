# Capability Map

## Command model

- Channel A: external oclif plugin manager (`rawr plugins ...`).
- Channel B: workspace runtime plugin management (`rawr hq plugins ...`).

## Runtime model

- Runtime plugins live under `plugins/*`.
- Enabled plugin state persists in `.rawr/state/state.json`.
- Server and web consume enabled state for mounted behavior.

## Plugin capability axes

1. CLI extension commands (Channel A).
2. Runtime server and web extensions (Channel B).
3. Micro-frontends mounted through host runtime using `@rawr/ui-sdk` contract.
4. Server API route extensions in core or plugin server surfaces.

## Security model touchpoint

- Runtime plugin enablement is a gating boundary.
- Reports and risk posture inform enable/disable flow.

## Roadmap note

- MCP-like permissions direction is discussed in planning docs; treat as planned unless implemented docs/contracts say otherwise.
