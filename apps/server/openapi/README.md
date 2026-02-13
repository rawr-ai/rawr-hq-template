# ORPC OpenAPI Artifacts

This directory stores generated OpenAPI compatibility artifacts for the HQ ORPC root router.

- Source endpoint (runtime): `/api/orpc/openapi.json`
- Local generation command: `bun run orpc:openapi:write`
- Optional TypeScript types for non-RPC consumers: `bun run orpc:openapi:sdk`

Generated files:
- `orpc-openapi.json`
- `orpc-openapi.types.ts`
