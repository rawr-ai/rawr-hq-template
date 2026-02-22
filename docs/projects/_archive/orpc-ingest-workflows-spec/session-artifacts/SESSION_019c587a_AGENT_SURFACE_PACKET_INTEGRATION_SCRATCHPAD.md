# SESSION_019c587a Agent Surface Packet Integration Scratchpad

## Constraints (locks to honor)
- Routes: `/api/orpc/*` + `/api/workflows/<capability>/*` caller-facing, `/api/inngest` runtime ingress, `/rpc` first-party internal. No `/rpc/workflows` mount by default.
- Publication: RPC client remains internal-only (not published), OpenAPI client is the external SDK. MFEs default to RPC unless a documented exception is provided.
- Ownership: Plugin customers own boundary contracts (`plugins/api/*`, `plugins/workflows/*`). Packages stay transport-neutral and expose internal clients `packages/<domain>/src/client.ts`.
- Context: Separate context envelopes for boundary (oRPC/Elysia) and runtime (Inngest). Request/metadata objects belong in `context.ts` modules, not domain folders.
- Docs: Canonical spec must speak target-state language only; mark current runtime shortfalls as transitional callouts referencing D-005/route convergence.

## Current runtime snapshot (from SESSION route review)
- `/rpc`, `/api/orpc` already mounted via `apps/server/src/orpc.ts` with parse-safe forwarding; `rawrHqManifest.orpc` exists.
- `/api/workflows` mount + manifest-generated context modules still pending; runtime needs `rawrHqManifest.workflows.triggerRouter`, `apps/server/src/workflows/context.ts`, and host wiring.
- `/api/inngest` is in place at `apps/server/src/rawr.ts` with signed runtime bundle.
- Clients: Browser + CLI use `RPCLink` hitting `/rpc` today; OpenAPI/external surfaces exist but need more doc coverage.

## Key references to tie in
- `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` sections 3-9 for risk list, locked decisions, actionable doc updates.
- `AXIS_07_HOST_HOOKING_COMPOSITION.md`: need to add route-family purpose table and mention manifest-driven `rawrHqManifest.workflows` `triggerRouter` usage.
- `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`: highlight ingress enforcement, mention unstoppable `workflow boundary context module`, and note MFE default call path.
- `DECISIONS.md` D-005 to D-007: new follow-up locks (RPC internal, OpenAPI external, MFE default) should be logged as bullet additions.
- Example files `E2E_03` and `E2E_04`: use these as code-illustration anchors for ingress separation, context + middleware infusions, and doc-level enforcement notes.

## Planned doc hooks (for future commit)
1. Add caller-to-transport matrix near the top of `ORPC_INGEST_SPEC_PACKET.md` plus cross-links to the axis docs noted above.
2. In `DECISIONS.md` add entries (or extend existing ones) referencing the follow-up locks and transitional runtime note.
3. Insert route-family table + ingress enforcement note in `AXIS_07` (maybe under 3. Insert route-family table + ingress enforcement note in `AXIS_07_HOST_HOOKING_COMPOSITION.md` to codify `/rpc`, `/api/orpc`, `/api/workflows`, `/api/inngest` roles and the manifest wiring that keeps them separate.
4. In `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` and the `E2E` examples, call out that `/api/inngest` is runtime-only, list the enforcement expectations (signed ingress, gateway restrictions), and mention the MFE default to RPC policy.
5. Add code/README snippets (either in `apps/server/src/orpc.ts` commentary or a companion `apps/server/openapi/README.md`) showing how to import `rawrHqManifest`, create `RPCLink` + `OpenAPILink` clients, and mount the manifest’s workflows router.

## Verification anchors
- Hypothesis: once the caller matrix + route narratives land, the session review checklist (caller/transport matrix, ingress enforcement, manifest wiring, snippet coverage) will show “pass”.
- Use the forthcoming YAML map (surface-to-packet integration map) to cross-check that each doc change has an associated target file, reason, risk level, and verification check.
- Keep the canvas referenced in optional context only; do not treat it as a blocker unless new dependencies emerge.
