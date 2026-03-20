# ORPC OpenAPI Compatibility Workflow

Use this when a consumer cannot use the internal RPC client and needs OpenAPI artifacts.

## Policy

1. Internal first-party clients in this repo use `/rpc` and the internal HQ contract by default.
2. `/api/orpc/*` is the published API-plugin OpenAPI surface, not the full internal HQ router.
3. Workflow trigger and status publication lives on `/api/workflows/<capability>/*`, not on `/api/orpc/*`.
4. OpenAPI remains available for compatibility, integrations, and external SDK generation.
5. The canonical published spec endpoint is:
   - `/api/orpc/openapi.json`

Current published `/api/orpc` surface:
- `exampleTodo.*`

Internal-only HQ procedure namespaces such as `coordination.*` and `state.*` remain on `/rpc`.

## Generate local artifacts

From `apps/server`:

```bash
bun run orpc:openapi:write
```

This writes:
- `apps/server/openapi/orpc-openapi.json`

To also generate TypeScript types from the OpenAPI spec:

```bash
bun run orpc:openapi:sdk
```

This writes:
- `apps/server/openapi/orpc-openapi.types.ts`

## Base URL override

When generating specs for a non-default environment, set:

```bash
RAWR_ORPC_OPENAPI_BASE_URL=https://your-host.example bun run orpc:openapi:write
```

## Verification checks

1. `bun run typecheck` in `apps/server`
2. Confirm `/api/orpc/openapi.json` resolves on the running server
3. Confirm the generated spec includes `exampleTodo` paths
4. Confirm the generated spec does not advertise `coordination` or `state`
5. Regenerate `apps/server/openapi/orpc-openapi.types.ts` after contract changes
