# SESSION_019c587a — Agent L Contract-First Scratchpad

## 0) Scope + Method Notes
- This scratchpad is evidence-first and posture-anchored.
- Firecrawl MCP was attempted first but unavailable due credits; continued with native web tooling against official docs.
- Focus: determine whether contract-first default should remain, be narrowed, or adjusted without violating locked split-harness policy.

## 1) Mandatory Skill Introspection (Cited)

### `orpc` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- Contract-first and router-first are both explicit workflows (`:18-19`).
- Canonical oRPC mental model is `Contract -> Implement -> Transport exposure` (`:50-52`).
- Skill explicitly warns that contract-first is not “schemas in files”; it is contract artifact + `implement()` (`:150`).
- Implication for this analysis: contract-first is a deliberate authoring choice, not mandatory everywhere.

### `inngest` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- Inngest positioned as durable execution (step-based, persisted progress) (`:38-40`).
- Pitfalls emphasize side effects must live inside step boundaries and stable step IDs (`:50`, `:54`).
- Implication: workflow durability semantics are execution-model specific; not equivalent to request/response API authoring.

### `elysia` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- Lifecycle is order-sensitive (`:51`), and forwarded handlers should use `parse: 'none'` to avoid consumed body (`:137`, `:157`).
- Elysia is Fetch-native and mount-oriented (`:37`, `:151`).
- Implication: host/boundary wiring must remain explicit and parse-safe (aligns with current `apps/server/src/orpc.ts`).

### `typebox` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- TypeBox frames schemas as durable JSON Schema artifacts (`:31-33`, `:40`).
- OpenAPI 3.1 alignment is a core reason to adopt schema artifact flow (`:51`, `:77`).
- Implication: posture rule for TypeBox-first schema flow is structurally aligned with external SDK/OpenAPI stability.

### `typescript` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- Emphasizes boundary-first architecture decisions (`:30`) and controlling public surface area during refactors (`:47`, `:63`).
- Implication: contract decisions should be boundary-scoped and avoid type-graph/ceremony overhead for low-value internals.

### `architecture` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
- Requires separation of current/target/transition (`:24`) and dependency-order decisioning: spine -> boundaries -> domain (`:38-44`).
- Requires explicit, grounded claims (`:96`, `:98`).
- Implication: posture (spine) constraints must be preserved before proposing local authoring adjustments.

### `web-search` skill
Source: `/Users/mateicanavra/.codex-rawr/skills/web-search/SKILL.md`
- Tool hierarchy: MCP first, built-in tools fallback (`:69-83`), triangulation required for critical claims (`:244`).
- Must provide source map and confidence framing (`:319`, `:430`).
- Implication: conclusions below use official primary docs and explicitly note uncertainty.

## 2) Locked Posture Anchors (Local Canonical Spec)
Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

Hard anchors:
- Keep split semantics; reject collapse (`:16`).
- Single external SDK source from composed oRPC/OpenAPI (`:44-45`, `:218`).
- Internal default must use in-process clients; no self-HTTP default (`:62-63`, `:223`).
- Workflow trigger APIs remain oRPC caller-facing surfaces dispatching to Inngest (`:180-182`, `:217`).
- Durable endpoints are additive only; no second first-party trigger path (`:200`, `:222`).
- Preserve TypeBox-first schema flow (`:221`).
- Optional composition helpers are allowed only if explicit/non-black-box and policy-neutral (`:615-616`).

## 3) Debate-Lineage Anchors (Agent I/J/K/H)

### Agent I (split hardening)
Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- Workflow trigger APIs: always oRPC trigger -> Inngest dispatch (`:8`, `:29`).
- Durable endpoints additive only (`:9`, `:143`).
- API normal endpoints listed as contract-first (`:28`).

### Agent J (collapse rejection)
Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- Rejects full collapse (`:4`).
- Keeps oRPC as external contract standard, Inngest as durability harness (`:22`, `:120`).
- Notes durable endpoint limitations and client-surface inconsistency risk if collapsed (`:18-20`).

### Agent K (internal-calling standard)
Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
- Internal default: package client wrapper (`:4`).
- Forbids production drift paths (`router.call`, `contract.call`, `createContractRouterClient`) as defaults (`:22`).
- Keeps one runtime-owned Inngest client, workflow trigger ownership of enqueue (`:44`, `:46`).

### Agent H (DX simplification)
Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- Identifies composition over-wiring (`:8`).
- Proposes explicit helper-based simplification (composer/surfaces/shared TypeBox adapter) (`:31`, `:130`).
- Explicitly keeps split unchanged (`:481`, `:484`).

## 4) Current Runtime Code Anchors (Required Files)

- Contract root aggregation exists and is contract-first (`hqContract`):
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Boundary router implementation uses `implement<typeof hqContract>`:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:105`
- OpenAPI generation derives from router + TypeBox converter:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:295`
- Parse-safe forwarding (`parse: "none"`) is used for oRPC mounts:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:346`
- Split host mounts are explicit:
  - Inngest ingress mount `/api/inngest`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`
  - oRPC registration: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`
- Queue bridge from oRPC trigger path into Inngest adapter:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:187`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts:123`

## 5) Official Web Source Map (Primary Docs)

### oRPC (official)
1. Overview + comparison (shows both with/without contract-first are supported):
- [oRPC docs overview](https://orpc.dev/docs/overview)
- [Comparison page](https://orpc.dev/docs/comparison)
  - Evidence: “With Contract-First: Yes / Without Contract-First: Yes”.
2. Contract-first authoring:
- [Define contract](https://orpc.dev/docs/contract-first/define-contract)
- [Implement contract](https://orpc.dev/docs/contract-first/implement-contract)
3. Router-first / non-contract-first paths and tradeoffs:
- [Router guide](https://orpc.dev/docs/router)
- [Router to contract](https://orpc.dev/docs/router-to-contract)
  - Evidence: deriving contract from router can leak internals; minification suggested for public exposure.
4. Internal invocation options:
- [Server-side calls](https://orpc.dev/docs/client/server-side)
  - Evidence: `router.call`, `contract.call`, `createRouterClient` all exist.
5. External contract artifacts:
- [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler)
- [OpenAPI specification](https://orpc.dev/docs/openapi/openapi-specification)
- [OpenAPI client](https://orpc.dev/docs/openapi/client)

### Inngest (official)
1. Durable execution model and step semantics:
- [How Inngest functions work (multi-step)](https://www.inngest.com/docs/features/inngest-functions/multi-step-functions)
2. Function API + retries:
- [Create function reference](https://www.inngest.com/docs/reference/functions/create)
- [Step run reference](https://www.inngest.com/docs/reference/functions/step-run)
3. Runtime ingress contract:
- [Serve reference](https://www.inngest.com/docs/reference/serve)
4. Durable endpoint constraints:
- [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
  - Evidence includes unsupported flow control today and not-yet-supported POST body handling.

### Elysia (official)
- [Lifecycle](https://elysiajs.com/essential/life-cycle)
- [Mount pattern](https://elysiajs.com/patterns/mount)

### TypeBox (official)
- [TypeBox repo/docs](https://github.com/sinclairzx81/typebox)

## 6) Working Findings by Question

### Q1) Pure/internal packages: dedicated contract-first vs router-first wrapping pure services; scale threshold
Working finding:
- Dedicated contract-first is high-value at package boundaries that are consumed by multiple callers (API plugin + workflow trigger + other packages), because it creates a stable typed seam and prevents invocation drift.
- Dedicated contract-first is low-value for single-caller pure services entirely internal to one package where no OpenAPI exposure or cross-capability reuse exists.

Threshold proposal (promotion from service-first to dedicated contract-first):
Promote when any 2 of the following are true:
1. More than one independent caller group (e.g., API boundary + workflow runtime).
2. Schema compatibility matters across releases (breaking-change risk).
3. Need for contract snapshots/drift tests.
4. Expected externalization within next planning cycle.

Posture compatibility note:
- This does **not** remove package boundary contracts where required by canonical package shape; it narrows where to invest extra sub-contract layers inside pure internals.

### Q2) API plugins: should simple wrappers stay router-first? when does contract-first pay off?
Working finding:
- For caller-facing API plugins, contract-first should remain default, including simple wrappers, because external SDK generation must come from composed oRPC/OpenAPI and boundary policy is explicit there.
- Router-first can be tolerated for implementation internals behind a contract, not as boundary default.

Contract-first payoff in API plugin layer is immediate when:
1. Endpoint is external or partner-facing.
2. Endpoint contributes to OpenAPI/SDK artifacts.
3. Endpoint has policy needs (auth/visibility/rate/error semantics).

### Q3) Workflows: contract-first vs router-first for trigger routers and workflow surfaces
Working finding:
- Trigger routers should stay contract-first (oRPC) because they are caller-facing trigger contracts.
- Durable workflow functions (`createFunction`, `step.run`) are execution surfaces, not API contract surfaces; router-first/service-first style is appropriate there.
- Durable endpoints remain additive adapters only; not a parallel trigger authoring path.

### Q4) Where contract-first truly makes sense in this architecture
1. Composed boundary namespaces that feed OpenAPI + SDK generation.
2. Workflow trigger surfaces exposed to callers.
3. Cross-capability package boundaries with multi-caller reuse.
4. Any surface where explicit compatibility/version governance is required.

### Q5) Canonical definitions in this repo context
- Contract-first:
  - First-class `contract.ts` as boundary artifact; handlers implement via `implement<typeof contract>`; composed into a single external contract tree.
- Router-first:
  - Router/handlers authored first; contract may be optional/derived; good for internal leaf logic with single caller and no public artifact duty.
- Deliberate hybrid:
  - Contract-first at caller-facing and cross-capability boundaries; router/service-first within pure internal execution internals.

### Q6) Can auto-composition be simplified by contract-first without regressions?
Working finding:
- Yes, but only via explicit helper composition (Agent H proposals) that preserves split mounts and ownership visibility.
- Safe scope:
  - typed surface builders,
  - capability composer,
  - shared TypeBox/OpenAPI converter helpers.
- Unsafe scope:
  - implicit auto-discovery/auto-mount that hides harness boundaries.

## 7) Candidate Recommendation (Pre-Final)
Recommendation candidate: **Adjust default (narrowed hybrid), not full switch.**
- Keep contract-first as hard default for boundary APIs and workflow trigger routers.
- Narrow dedicated contract-first usage inside pure/internal package internals; allow service-first/router-first there until threshold is met.
- Keep split-harness policy untouched (`oRPC boundary` + `Inngest durability`).

## 8) Best Counterargument (Pre-Final)
Counterargument:
- “Contract-first everywhere gives one universal model and easiest composition automation.”

Response:
- Universal contract-first inside every pure internal leaf creates ceremony and type-graph overhead without additional boundary guarantees.
- Posture already permits explicit DX helpers; composition simplicity can be achieved without turning every internal service into a dedicated public-like contract artifact.

## 9) Confidence + Gaps
Confidence: Medium-high.
- Strong on posture alignment and official docs.
- Remaining uncertainty: exact future capability growth rate, which affects when promotion thresholds are crossed.

Gaps:
- Firecrawl deep extraction unavailable due credits; mitigated by direct official web source reads via native web tooling.
