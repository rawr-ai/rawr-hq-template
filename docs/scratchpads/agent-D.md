# Agent D scratchpad — server/backend slice

## Goals (this slice)

- Keep `@rawr/server` as a **long-running dev service**.
- Maintain `GET /health`.
- Add a **local-first plugin mount stub** (no marketplace): load workspace plugins that expose a server registration function.
- Add a small **config contract** (port + base URL).
- Add at least one meaningful **unit test** without binding to a port.

## Server config contract

- `RAWR_SERVER_PORT` (preferred) or `PORT` (fallback): server listen port.
- `RAWR_SERVER_BASE_URL`: optional canonical base URL used by plugins and logs.
  - If unset, default: `http://localhost:${port}`.

## Plugin mount contract (server-side)

### Types

- `ServerPluginContext`: currently `{ baseUrl: string }`.
- `ServerPlugin`: `{ name: string; register(app, ctx) => void|Elysia|Promise<void|Elysia> }`.

### Loading policy (local-first)

- Workspace plugin roots live under `plugins/*`.
- A plugin may expose a server entrypoint via one of:
  - `src/server.ts`
  - `src/server/index.ts`
  - `dist/server.js`
  - `dist/server/index.js`
- Module shape supported (minimal):
  - `export function registerServer(app, ctx) { ... }`
  - or `export default function register(app, ctx) { ... }`
  - or `export const register = ...`
  - or `export default { register }`

Notes:
- This is intentionally permissive for early dev; once a canonical plugin API exists, tighten to one export shape.
- Failed plugin imports should warn and not crash the server.

## Integration dependencies / handoffs

- **CLI**: no coupling yet; plugin discovery for CLI remains separate from server plugin loading.
- **Marketplace**: explicitly out of scope for this slice.
- **Shared state** (`packages/state`): not needed yet; only introduce once plugins require shared runtime state beyond `baseUrl`.

