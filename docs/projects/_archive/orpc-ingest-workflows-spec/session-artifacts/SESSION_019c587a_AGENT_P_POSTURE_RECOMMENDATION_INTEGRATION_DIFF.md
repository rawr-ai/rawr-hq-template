# SESSION_019c587a — Agent P Posture/Recommendation Integration Diff

## Decision Lock
1. Conflict rule applied: recommendation is authoritative on direct conflicts.
2. Non-conflicting canonical posture content is retained.
3. Integration is section-targeted; no full-document rewrite.

## Integration Matrix

| Area | Current Spec | Recommendation | Action | Keep/Replace/Merge | Evidence |
|---|---|---|---|---|---|
| Document authority boundary | Canonical posture spec is normative policy artifact. | Recommendation explicitly says it is non-normative and points back to posture spec for hard rules and internals. | Keep current spec as canonical; integrate recommendation content into it. | Keep | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:6`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:3`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:5` |
| Split harness semantics (API vs durability) | Split is locked across Axis 3/8/9 and hard rules (`/api/inngest` ingress only; triggers on oRPC workflow surfaces). | Same split is restated as recommendation summary and workflow section. | No policy change; keep split semantics and use recommendation examples as reinforcement only. | Keep | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:82`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:180`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:216`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:11`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:349` |
| External SDK/client generation source | External SDK generation must come from composed boundary oRPC/OpenAPI surface only. | Boundary APIs remain contract-first default. | No rule change; keep canonical rule and align examples to contract-first boundary ownership. | Keep | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:44`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:218`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:10`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:232` |
| Internal package default topology | Default capability ownership currently shown as `contract.ts/router.ts/client.ts` for internal package layer. | Recommends one default internal shape: `Domain -> Service -> Procedures -> Router + Client + Errors -> Index`. | Replace internal package default topology section with recommendation shape; keep transport-neutral and internal-client rules untouched. | Replace | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:264`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:220`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:62`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:9`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:19` |
| Internal package exemplars | Canonical spec lacks end-to-end layered internal package code example set. | Provides explicit domain/service/procedures/router/client/errors/index snippets. | Add concise canonical exemplars from recommendation into Section 5 as default authoring pattern. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:246`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:40`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:65`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:119`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:189`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:220` |
| Boundary API plugin structure | Current inventory lists `contract.ts/router.ts/index.ts`. | Adds explicit `operations/*` layer as default (contract-first + explicit operation files). | Update canonical inventory/tree/examples to include `operations/*` as default boundary layer. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:266`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:596`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:236`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:238`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:272` |
| Boundary API handler implementation style | Current Example A shows direct internal client call in router handler body. | Recommends explicit operation functions called by router handlers. | Keep internal client call path but route through explicit operation files in examples/default structure. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:737`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:272`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:321` |
| Workflow plugin structure | Current inventory lists `contract.ts/router.ts/functions/*/index.ts` (+ optional durable adapters). | Adds explicit trigger `operations/*` layer before durable functions. | Add `operations/*` to workflow default tree while keeping existing `functions/*` and optional `durable/*` policy. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:268`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:604`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:355`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:357`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:381` |
| Direct `inngest.send` policy | Direct `inngest.send` should not be used from arbitrary boundary modules; designated workflow trigger routers are exception. | Trigger operation explicitly performs `inngest.send` in workflow trigger path. | Keep rule and make trigger-operation pattern the explicit canonical exception path. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:64`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:224`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:387`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:410` |
| TypeBox standard-schema adapter fixture | Canonical spec has “SHOULD centralize adapter/converter usage” but no concrete package fixture block. | Adds required adapter package fixture with concrete `typeBoxStandardSchema` implementation. | Add required root fixture subsection with brief concrete package snippet; keep existing deep OpenAPI converter internals. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:225`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:491`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:455`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:463` |
| Capability composition root fixture | Canonical spec has optional composition helpers but no required composition-root fixture. | Adds required `rawr.hq.ts` manifest fixture composing contracts/routers/functions. | Add required brief fixture subsection; keep optional helper section as DX layer. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:615`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:618`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:496`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:508` |
| Host mounting fixture expression | Canonical spec has deep host composition block in `apps/server/src/rawr.ts`. | Adds concise host fixture showing `registerOrpcRoutes` + `registerInngestRoute`. | Keep deep canonical harness block; add concise fixture as companion reference (not replacement). | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:545`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:577`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:527`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:535` |
| Adoption exception policy | Not explicitly defined in canonical rules section. | Explicit exception: direct adoption allowed only for true 1:1 overlap, documented. | Add explicit “adoption exception” subsection under rules/boundaries. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:215`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:547` |
| Scale rule for split timing | Not explicitly defined in canonical rules section. | Explicit rule: split handlers first; split contracts only when behavior/policy/audience diverges. | Add explicit “scale rule” subsection under rules/boundaries. | Merge | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:215`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:551` |
| Durable endpoint posture | Durable endpoints are additive ingress adapters only; must not create parallel first-party trigger authoring path. | Recommendation does not alter this and remains compatible with split rule. | Keep canonical durable endpoint policy unchanged. | Keep | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:196`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:200`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:270`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:349` |
| Optional composition helper status | Current helpers are optional/non-black-box DX simplifiers. | Recommendation says keep fixtures explicit and avoid hidden glue behavior. | Keep helpers as optional; add explicit note that required fixtures do not imply hidden auto-composition. | Keep | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:615`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:616`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:12`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:453` |

## Explicit Carryover List (Unique Recommendation Content to Integrate)
1. Internal package default file tree (`domain/service/procedures/router/client/errors/index`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:19`
2. `domain/invoice-status.ts` + `domain/invoice.ts` snippets: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:43`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:53`
3. Service-layer snippets (`lifecycle.ts`, `status.ts`, `cancellation.ts`, `service/index.ts`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:68`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:89`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:99`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:112`
4. Procedure-layer snippets (`start.ts`, `get-status.ts`, `cancel.ts`, `procedures/index.ts`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:122`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:144`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:160`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:176`
5. Boundary API `operations/*` snippets (`start`, `get-status`, `cancel`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:274`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:286`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:295`
6. Workflow trigger operation snippet (`trigger-reconciliation.ts`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:383`
7. TypeBox adapter package fixtures (`packages/orpc-standards/src/index.ts` + `typebox-standard-schema.ts`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:457`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:463`
8. Capability composition root fixture (`rawr.hq.ts`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:499`
9. Concise host mounting fixture (`apps/server/src/rawr.ts` brief form): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:529`
10. Adoption exception language: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:547`
11. Scale rule language: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:551`

## Guardrail: Do Not Rewrite Whole Spec
1. Do not replace Sections 1-3 wholesale.
2. Do not delete canonical harness internals in Section 5 (`hq-router.ts`, `coordination-inngest/adapter.ts`, `apps/server/src/orpc.ts`, `apps/server/src/rawr.ts`).
3. Do not remove Axis 9 durable-endpoint additive-only policy.
4. Apply targeted inserts/replacements only in explicit subsection blocks.
5. Preserve normative wording style and section numbering continuity.

## Targeted Edit Plan by Section
1. **Section 4 — Rules and Boundaries (Normative)**
- Add two new subsections after naming rules:
  - `Adoption Exception (Explicit)`
  - `Scale Rule (Default Progression)`
- Keep existing hard rules unchanged.

2. **Section 5 — Implementation Inventory / Glue Code**
- Replace current internal package default ownership bullets with recommendation package shape.
- Expand boundary API and workflow inventory entries to include explicit `operations/*` layers.
- Add `Required Root Fixtures (Brief, Concrete)` subsection (TypeBox adapter package, `rawr.hq.ts`, concise host fixture).
- Update canonical file tree block to reflect new defaults.
- Keep canonical harness files A-D intact.

3. **Section 6 — End-to-End Examples**
- Update Example A to show boundary operation indirection (router -> operation -> internal client).
- Update Example B to show workflow trigger operation indirection (router -> trigger operation -> `inngest.send`) and durable function split.
- Keep Example C and host mounting semantics; add fixture cross-reference note.

4. **Section 7 — Source Anchors**
- Add explicit anchor to integrated recommendation doc as integration authority source.
- Retain existing local lineage and upstream references.

## Exact Section-Level Patch Order (Implementation Phase)
1. Patch `## 4) Rules and Boundaries (Normative)` in `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.
- Insert `Adoption Exception` and `Scale Rule` subsections.

2. Patch `### Canonical File Inventory` under `## 5) Implementation Inventory / Glue Code`.
- Replace internal package ownership bullet from `contract/router/client` default to layered package default.
- Add `operations/*` to API/workflow inventory bullets.

3. Patch `### Canonical File Tree` under Section 5.
- Update tree entries for internal package layout and plugin operations folders.
- Preserve `durable/*` as optional additive ingress adapters.

4. Insert new subsection `### Internal Package Default (Pure Capability)` in Section 5 (before `### Canonical Harness Files`).
- Add concise recommendation-derived tree and minimal snippets.

5. Insert new subsection `### Boundary API Plugin Default (Contract-First + Operations)` in Section 5.
- Add default shape + operation-layer snippet pointers.

6. Insert new subsection `### Workflow Trigger Plugin + Inngest Split (Recommended)` in Section 5.
- Add trigger contract, trigger operation, trigger router, durable function split summary.

7. Insert new subsection `### Required Root Fixtures (Brief, Concrete)` in Section 5.
- Add TypeBox adapter fixture, `rawr.hq.ts` fixture, concise host fixture.
- Keep note that deep internals remain canonical in harness blocks.

8. Patch `## 6) End-to-End Examples`.
- Replace Example A and Example B code blocks to reflect operations-layer defaults.
- Keep Example C and Host Mounting block with minimal cross-reference addition.

9. Patch `## 7) Source Anchors`.
- Add recommendation doc to local lineage list.
- Keep existing upstream references intact.

10. Run contradiction pass.
- Verify no section now conflicts with Axis policies or hard rules.
- Verify all newly introduced defaults are reflected consistently in inventory + tree + examples.

## Implementation-Ready Decision Summary
1. Replace only one direct conflict: internal package default topology.
2. Merge all other recommendation deltas as additive clarifications and concrete defaults.
3. Keep canonical policy/harness backbone intact.

## Integration Change Log (Implementation Phase)

### Sections Updated in Canonical Spec
1. `## 4) Rules and Boundaries (Normative)`
- Added `### Adoption Exception (Explicit)`.
- Added `### Scale Rule (Default Progression)`.
- Updated naming defaults to include `operations/*` and layered internal package naming context.

2. `## 5) Implementation Inventory / Glue Code`
- Replaced direct conflict in ownership defaults:
  - from `packages/<capability>/src/{contract.ts,router.ts,client.ts}`
  - to layered internal package default (`domain/*`, `service/*`, `procedures/*`, `router.ts`, `client.ts`, `errors.ts`, `index.ts`).
- Merged recommendation defaults by adding:
  - API plugin `operations/*` layer,
  - workflow plugin `operations/*` layer,
  - explicit host split statement (`/api/workflows/<capability>/*` vs `/api/inngest`).
- Inserted new targeted subsections:
  - `### Internal Package Default (Pure Capability)`
  - `### Boundary API Plugin Default (Contract-First + Operations)`
  - `### Workflow Trigger Plugin + Inngest Split (Recommended)`
  - `### Required Root Fixtures (Brief, Concrete)`
- Updated `### Canonical File Tree` to match new defaults.

3. `## 6) End-to-End Examples`
- Example A merged to operation-indirection default (`router -> operations/* -> internal client`).
- Example B merged to operation-indirection default for workflow triggers (`router -> operations/* -> inngest.send`) while preserving Inngest durable function split.
- Host mounting example kept with explicit split-path reminder.

4. `## 7) Source Anchors`
- Added integrated recommendation doc to local decision lineage.

### Intentionally Retained (No Rewrite)
1. Entire Sections 1-3 (scope, axes, per-axis policies) retained.
2. Hard rules and anti-dual-path policy retained.
3. Canonical harness internals retained:
- `packages/core/src/orpc/hq-router.ts`
- `packages/coordination-inngest/src/adapter.ts`
- `apps/server/src/orpc.ts`
- `apps/server/src/rawr.ts`
4. Durable endpoint additive-only posture retained.
5. Optional composition helper section retained as explicit/non-black-box DX layer.
