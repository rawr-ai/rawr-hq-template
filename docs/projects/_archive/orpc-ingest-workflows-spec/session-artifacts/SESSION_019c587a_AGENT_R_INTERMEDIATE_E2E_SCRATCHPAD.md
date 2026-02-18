# SESSION_019c587a — Agent R Intermediate E2E Scratchpad

## 0) Scope and Constraints
- Docs-only authoring.
- Intermediate E2E walkthrough only.
- No runtime code edits.
- Ignore unrelated local repo changes.

## 1) Skill Intake (Read + Applied)
- `orpc`: contract-first boundary surfaces, explicit `implement(contract)`, server-side internal clients.
- `inngest`: durable execution belongs in function runtime (`createFunction` + `step.run`), not in caller API path.
- `elysia`: host route mounts must be explicit and parse-safe for delegated handlers.
- `typebox`: schema artifacts are TypeBox-first and should flow through shared Standard Schema adapter.
- `architecture`: keep split concerns explicit (API boundary vs workflow trigger vs durable runtime ingress).

## 2) Canonical Source Packet (Read)
1. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
2. `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
3. `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
4. `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
5. `AXIS_03_SPLIT_VS_COLLAPSE.md`
6. `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
7. `AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
8. `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
9. `AXIS_07_HOST_HOOKING_COMPOSITION.md`
10. `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
11. `AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
12. `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## 3) Locked Policy Extracts Used in Walkthrough
1. TypeBox-first schemas everywhere (`typeBoxStandardSchema(Type.Object(...))`).
2. Internal calls default to package internal client (`client.ts`), never local HTTP self-calls.
3. API and workflow trigger are caller-facing surfaces; `/api/inngest` remains runtime ingress only.
4. Workflow trigger API dispatches to Inngest by event send; function runtime owns durable steps.
5. Host owns explicit multi-mount composition and one Inngest client bundle.

## 4) Intermediate Example Capability Choice
- Capability: `invoice-processing`.
- Reason: aligns with recommendation examples while letting workflow trigger explicitly call internal client before enqueue.
- Surfaces:
  - API surface: start + get status.
  - Workflow trigger surface: trigger reconciliation.
  - Durable runtime: reconciliation function.

## 5) Key Design Decisions for This Doc
1. Workflow trigger operation performs preflight via internal package client (`queueReconciliation`) before sending Inngest event.
2. Durable function also uses internal package client (`markReconciliationResult`) to keep domain updates in package layer.
3. `rawr.hq.ts` composes both API and workflow trigger contracts/routers under one capability namespace.
4. Host mounts remain explicit:
   - caller trigger mount: `/api/workflows/*`
   - runtime ingress mount: `/api/inngest`

## 6) Required Sections Mapping
1. Goal/use-case -> business + runtime motivation.
2. Topology diagram -> explicit split harness view.
3. File tree -> package, API plugin, workflow plugin, composition root, host.
4. Key files -> concrete snippets (no pseudocode placeholders).
5. Wiring steps -> ordered host -> composition -> plugin/package -> runtime.
6. Runtime sequence -> API request path and workflow trigger/durable execution path.
7. Trade-offs -> split clarity vs extra wiring.
8. Failure modes -> prefix mismatch, dual-path drift, schema drift, ingress misuse.
9. Checklist -> direct policy verification.

## 7) Guardrail Checks Before Finalizing
1. No plugin imports another plugin at runtime.
2. Trigger path and ingress path are both shown and intentionally distinct.
3. TypeBox adapter package is referenced once and reused.
4. Internal package shape includes `domain/ service/ procedures/ router.ts client.ts errors.ts index.ts`.
5. API plugin shape includes `contract.ts + operations/* + router.ts + index.ts`.
