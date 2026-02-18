# SESSION_019c587a Agent Surface Packet Integration Plan

## Objective
Stitch the Planner Agent surface-review findings into the ORPC + Inngest spec packet so the canonical docs (and downstream hosts) capture the locked transport/caller policies, runtime deltas, and missing code-illustration gaps that this review surfaced. This plan sits at the intersection of the Agent Surface Review and the packet’s axis docs; it does not change those docs yet but drives the follow-up edits.

## Essential constraints (read before editing)
- **Split route families** stay: caller-facing transports are `/api/orpc/*` plus `/api/workflows/<capability>/*`, runtime ingress is `/api/inngest`, and there is no `/rpc/workflows` mount by default. Any integration work must keep that naming explicit.
- **RPC client scope**: `/rpc` + `RPCLink` remain first-party/internal only, never published externally, and first-party callers (including MFEs by default) are expected to use them unless explicit exception paths are documented.
- **OpenAPI client scope**: OpenAPI surfaces (`/api/orpc` and workflow boundaries) are the externally published SDK entry points; the spec packet must highlight this in a caller/route matrix and anywhere SDK publication is discussed.
- **Host ownership**: Host wiring (apps/server rawr/orpc and rawr.hq manifest) is the canonical composition spine; there is no hidden composition layer or runtime slack that sidesteps explicit mounts or context contracts.
- **Target-state language only**: All plan output and future doc changes must speak in target-state terms; current-state information belongs in transition callouts or scratchpad notes only.

## Key gaps (that the integration should resolve)
1. **Caller/transport matrix**: Packet docs lack a single place that spells out which caller modal (browser/network, server-internal, runtime ingress) uses which route, client, and auth. This matrix is required for onboarding and verifying the locked publication model.
2. **Locked transport/publication policy**: The new follow-up locks (RPC internal only, RPC client unpublishable, OpenAPI client published, MFE default RPC) need explicit expression in the decision log and the relevant axes where caller/auth expectations live (D-005 companion entries in `DECISIONS.md`, `AXIS_01`, `AXIS_08`).
3. **Workflow route convergence status**: Runtime currently lacks `/api/workflows` wiring and a manifest-driven context module; the plan should capture where the current host diverges and how to mark it as transitional next to the D-005 target state.
4. **Inngest enforcement clarity**: `/api/inngest` is runtime-only, but existing docs don’t yet say what enforcement checks (signature, gateway controls) are expected; this plan identifies where to slot that context (e.g., `AXIS_08` and the real-world examples). 
5. **Code gap fill**: The packet lacks concrete snippets for RPC/OpenAPI client setup and protocol imports with the new policy context; the plan should note where to introduce those snippets (e.g., host/clients sections in `AXIS_07` or new appendices).

## Proposed workstreams
1. **Caller/transport matrix update** (target `ORPC_INGEST_SPEC_PACKET.md`, `DECISIONS.md`, `AXIS_01`, `AXIS_08`) — produce a YAML/markdown matrix that couples caller mode → route family → client → publication status → auth expectations, and cite the new follow-up locks (RPC internal only, OpenAPI external). Keep the narrative framed as target-state language with a side note referencing the runtime “transitional status” described in the route-design review.
2. **Decision log + axis reinforcement** (targets `DECISIONS.md`, `AXIS_01`, `AXIS_07`, `AXIS_08`) — encode the locked follow-up decisions, add the missing route-family purpose table in the host axis, and define current runtime delta vs canonical route mount status as a short transitional note that links back to D-005 and the manifest-driven route plan.
3. **Narrative/context enhancements** (targets `AXIS_08`, `examples/E2E_04`, optionally `AXIS_07` etc.) — add ingress enforcement expectations, mention the locked RPC/OpenAPI publication boundaries, and double-check the example flows (especially `E2E_03` and `E2E_04`) to highlight that `/api/inngest` must remain runtime-only.
4. **Code-illustration add-ons** (target `apps/server` README or new bullet somewhere) — fill in missing snippets showing how to instantiate `RPCLink`/OpenAPILink` clients, import contracts from the manifest, and document the `rawrHqManifest` wiring so the spec clarifies how to wire the dual transports.
5. **Verification story** — once docs land, perform the checklist from the route review (caller/transport matrix, transitional note, ingress enforcement, manifest mount, snippet coverage) and verify each axis cross-link remains accurate.

## Dependencies / Riskiest assumptions
- `rawrHqManifest` generation currently exists; the plan assumes it can expose separate `orpc` + `workflows` namespaces with `triggerRouter`/`triggerContract` in place (per axis docs). If that generator changes, revisit the host axis scope.
- The host code must align with the locked policy before spec updates land; if not (for example, `/api/workflows` mount is still missing), the integration plan must document the runtime delta as “in-flight” and not prematurely claim completion.

## Deliverable expectations (for the real integration sprint)
- Add the caller/mode matrix and publication lock narrative to the packet root and relevant axes.
- Annotate `AXIS_07`/`AXIS_08`/`DECISIONS.md` with the current runtime delta note and ingress enforcement guardrails.
- Supplement the host/api example files with code snippets showing RPC/OpenAPI client setup + manifest import, referencing routes `/rpc`, `/api/orpc`, and `/api/workflows` explicitly.
- Validate each change by cross-checking the `session review -> spec packet map` (see attached YAML) and by running any docs generators (if applicable) to ensure references render correctly.

**Note to implementers:** This plan is preparatory for the actual spec edits; keep the new files in this plan/scratchpad stack until the larger integration work starts.
