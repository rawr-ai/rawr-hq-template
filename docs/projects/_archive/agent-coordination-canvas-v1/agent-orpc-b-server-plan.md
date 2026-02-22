# Agent B Plan - Server Mount and Bridge (S02)

## Objective

Mount HQ root ORPC router on Elysia with RPC/OpenAPI handlers while keeping temporary bridge routes active.

## Scope

1. Add `/rpc` mount.
2. Add `/api/orpc` and `/api/orpc/openapi.json` mounts.
3. Keep `/rawr/coordination/*` and `/rawr/state` bridge routes temporarily.
4. Preserve `/api/inngest`, `/rawr/plugins/web/:dirName`, `/health`.

## Constraints

- Bridge code must be easily removable in S08.
- Update server tests minimally in this slice.
