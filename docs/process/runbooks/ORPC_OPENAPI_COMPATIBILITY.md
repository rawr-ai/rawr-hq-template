# ORPC OpenAPI Compatibility Workflow

Use this when a consumer cannot use the internal RPC client and needs OpenAPI artifacts.

## Policy

1. Internal first-party clients (web/CLI/plugins in this repo) should use ORPC RPC contracts.
2. OpenAPI is day-1 available for compatibility, integrations, and external SDK generation.
3. The canonical runtime spec endpoint is:
   - `/api/orpc/openapi.json`

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
3. Regenerate `apps/server/openapi/orpc-openapi.types.ts` after contract changes
