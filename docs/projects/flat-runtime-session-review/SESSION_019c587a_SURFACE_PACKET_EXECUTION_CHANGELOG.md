# SESSION_019c587a Surface Packet Execution Changelog

## Execution Summary
- Completed a docs-only integration pass for Surface Review -> Spec Packet convergence.
- Applied policy as target-state language across packet, posture, and examples.
- Performed a cross-doc consistency sweep to remove adjacent contradictions, not just minimum-file wording sync.

## Files Changed
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## What Changed
1. Canonicalized caller/transport policy:
- Added explicit first-party/internal `/rpc` + `RPCLink` semantics.
- Added explicit external publication boundary for OpenAPI clients (`/api/orpc/*`, `/api/workflows/<capability>/*`).
- Added explicit MFE default-to-RPC policy with documented exception language.

2. Added canonical matrix artifacts:
- Added caller/transport matrix with required columns (caller type, route family, link type, publication boundary, auth expectation, forbidden routes) in packet root and posture overview.
- Replaced ambiguous YAML caller blocks with explicit tables in key axis/example docs.

3. Locked route-family semantics across docs:
- Preserved `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
- Explicitly documented `/api/inngest` as runtime-only signed ingress.
- Explicitly documented no default `/rpc/workflows` mount.

4. Strengthened host/workflow boundary guidance:
- Added route-family purpose table in `AXIS_07`.
- Added ingress enforcement minimums in `AXIS_08` and E2E docs.
- Updated consumer models to separate first-party RPC defaults from external OpenAPI publication.

5. Added concrete transport snippets:
- Added concise `RPCLink` + `OpenAPILink` setup/import/use snippets in packet root, `AXIS_01`, `AXIS_07`, `AXIS_08`, `E2E_03`, and `E2E_04`.

6. Updated decision register:
- Refined D-005 and D-007 language to reflect locked transport/publication boundaries and first-party MFE defaults.
- Removed rollout-progress framing from decision-status language.

## Canonical Language Corrections
1. `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- Removed exact text:
```text
Implementation reminder (D-005 route convergence): this packet locks on the manifest-driven `/api/workflows/<capability>/*` mount as the target caller-facing surface. Hosts still routing first-party workflow traffic over `/rpc` should treat that as a documented transition, capture the delta in `SESSION_019c587a_AGENT_SURFACE_PACKET_INTEGRATION_PLAN.md`, and emit the manifest-driven route mount once wiring exists.
```
- Reworded to exact text:
```text
D-005 lock: workflow trigger APIs are caller-facing on manifest-driven `/api/workflows/<capability>/*`; `/rpc` remains first-party/internal transport only, and `/api/inngest` remains signed runtime ingress only.
```
2. `orpc-ingest-spec-packet/DECISIONS.md` (D-005)
- Removed exact field:
```text
- `runtime_delta_note`: Hosts may still settle first-party workflow traffic on `/rpc` while the manifest-driven `/api/workflows/<capability>/*` wiring rolls out; treat that as a documented transition and plan the host manifests accordingly (see `SESSION_019c587a_AGENT_SURFACE_PACKET_INTEGRATION_PLAN.md` for the convergence note).
```
- Retained canonical lock language: D-005 `resolution`, `closure_scope`, and `why_closed` remain unchanged as policy lock text.
3. `SESSION_019c587a_SURFACE_PACKET_INTEGRATION_FINAL_REVIEW.md`
- Removed exact recommendation text:
```text
Added an explicit implementation reminder in `ORPC_INGEST_SPEC_PACKET.md` (Section 8) to call out the D-005 runtime delta: while `/api/workflows/*` is the canonical mount for workflow clients, hosts still routing first-party traffic through `/rpc` must describe that transition in `SESSION_019c587a_AGENT_SURFACE_PACKET_INTEGRATION_PLAN.md`.
```
- Reworded to exact text:
```text
Replaced the transient implementation reminder in `ORPC_INGEST_SPEC_PACKET.md` with canonical D-005 lock wording only.
```

## Policy Alignment Checks
- [x] `/rpc` is first-party/internal only.
- [x] RPC client artifacts are never externally published.
- [x] OpenAPI clients are externally published.
- [x] First-party callers (including MFEs by default) use RPC unless explicit exception.
- [x] Route families remain `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
- [x] No dedicated `/rpc/workflows` mount by default.
- [x] Workflow/API boundary contracts remain plugin-owned.
- [x] Canonical policy sections use target-state language (no transition/session-progress logs embedded).
- [x] Coordination canvas is not used as a design driver.
- [x] Required caller/transport matrix is present and aligned.
- [x] Required docs include concrete RPC/OpenAPI link setup illustrations.

## Blockers
- None.
