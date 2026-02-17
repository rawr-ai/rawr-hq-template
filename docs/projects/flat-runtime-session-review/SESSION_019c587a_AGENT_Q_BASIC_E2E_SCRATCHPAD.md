# SESSION_019c587a — Agent Q Basic E2E Scratchpad

## Scope Lock
1. Author only Basic E2E walkthrough documentation.
2. No runtime code edits.
3. Ignore unrelated repo edits.
4. Keep output aligned with packet policies and integrated recommendation.

## Skills Grounding Summary
1. `architecture`: separate posture decisions from implementation walkthrough details.
2. `orpc`: contract-first boundary API ownership + explicit `implement(contract)` router binding.
3. `typebox`: TypeBox-first schema artifacts adapted through Standard Schema.
4. `elysia`: explicit parse-safe route forwarding (`parse: "none"`).
5. `inngest`: keep runtime ingress semantics distinct from caller-trigger APIs.

## Source Evidence Map

### Policy anchors from context packet
1. TypeBox-first.
2. Split semantics: `/api/workflows/...` vs `/api/inngest`.
3. Internal package default shape and API plugin default shape.
4. No black-box composition glue.

### Axis-backed constraints applied
1. External generation must come from composed boundary surface:
   - `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
2. Internal call default is in-process internal client, not local HTTP:
   - `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
3. Split API harness vs durability harness is locked:
   - `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
4. Context and lifecycle semantics differ by harness:
   - `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
5. Boundary errors and durable timeline state are separate reporting contracts:
   - `orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
6. Middleware/control-plane placement is harness-specific:
   - `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
7. Host composition/mount boundaries must be explicit:
   - `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
8. Workflow trigger API and `/api/inngest` runtime ingress semantics stay distinct:
   - `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
9. Durable endpoints are additive-only and not a second trigger path:
   - `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`

### Recommendation anchors applied
1. Internal package default layering:
   - `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
2. API plugin boundary default with explicit operations:
   - same recommendation doc.
3. Root fixture examples (`rawr.hq.ts`, host mounting):
   - same recommendation doc.

## Chosen Basic Example Shape
1. Capability: `invoice-processing`.
2. Internal package location:
   - `packages/invoice-processing/src/*`
3. API plugin location:
   - `plugins/api/invoice-processing-api/src/*`
4. Composition route:
   - `rawr.hq.ts` -> `apps/server/src/rawr.ts` -> `apps/server/src/orpc.ts` -> API router -> API operations -> package internal client -> package procedures -> package service/domain.

## Planned Endpoint Divergences (Boundary vs Internal)
1. Divergence A: start endpoint input shape adaptation.
   - Boundary input: `requestedByUserId` + optional `requestSource`.
   - Internal input: `requestedBy`.
   - Mapping handled in boundary `operations/start.ts`.
2. Divergence B: status endpoint output adaptation.
   - Internal output: `{ runId, status }`.
   - Boundary output: `{ runId, phase, isTerminal }`.
   - Derivation handled in boundary `operations/get-status.ts`.

## Mount and Route Semantics to Keep Explicit in Doc
1. API boundary mounts:
   - `/rpc` and `/api/orpc` (parse-safe forwarding).
2. Runtime ingress mount:
   - `/api/inngest` (Inngest runtime only).
3. Split semantics retained even in this API-only walkthrough:
   - `/api/workflows/...` remains caller-trigger namespace by policy, not used for this basic example.

## Required Section Checklist Mapping
1. Goal/use-case framing -> explain API-only scope and policy-safe split semantics.
2. E2E topology diagram -> include host mount and composition route.
3. Canonical file tree -> include package + API plugin + host files.
4. Key files with code -> include TypeBox adapter, package internals, boundary plugin, composition/mount files.
5. Wiring steps -> explicit host -> composition -> plugin/package -> runtime order.
6. Runtime sequence walkthrough -> request lifecycle with operation/client/procedure/service flow.
7. Rationale/trade-offs -> why boundary owns contract while package stays transport-neutral.
8. Failure modes + guardrails -> include drift, mount mismatch, local HTTP self-call anti-pattern.
9. Policy consistency checklist -> explicit yes/no validation list.

## Final QA Before Handoff
1. Confirm no Zod usage in snippets.
2. Confirm no implied collapse of `/api/workflows` with `/api/inngest`.
3. Confirm no hidden helper magic in route registration.
4. Confirm docs-only changes and owned files only.
