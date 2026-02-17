# SESSION_019c587a — Agent L Contract-First Recommendation (Option A)

## Executive Recommendation
**Adjust the default (narrowed hybrid), not a full switch.**

1. Keep **contract-first as default** for caller-facing boundary surfaces (API plugins + workflow trigger routers).
2. Narrow dedicated contract-first inside **pure/internal package internals** where a service has a single caller and no external/OpenAPI artifact duty.
3. Keep split harness posture unchanged: **oRPC for caller contract surfaces**, **Inngest for durable execution surfaces**.

This is the highest-confidence path that preserves locked policy while reducing unnecessary internal ceremony.

## Explicit Compatibility Statement (Posture-Safe)
This recommendation is compatible with the accepted posture spec and does not regress locked rules:

- Preserves split semantics (`oRPC boundary` vs `Inngest durability`) and rejects collapse.
- Preserves one external SDK generation source (composed oRPC/OpenAPI).
- Preserves trigger-path rule: API-exposed workflow triggers remain oRPC procedures that dispatch into Inngest.
- Preserves additive-only durable endpoint rule (no parallel first-party trigger path).
- Preserves TypeBox-first schema flow for contract I/O and OpenAPI conversion.
- Preserves explicit host mounts (`/api/orpc|/rpc` and `/api/inngest`) and parse-safe forwarding.

Posture anchors:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:16`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:218`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:180`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:200`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:221`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:346`

## Canonical Definitions In This Architecture

### Contract-first
A first-class `contract.ts` defines procedure shape and schema; router implementation is attached via `implement<typeof contract>` and composed into a stable boundary contract tree for OpenAPI/SDK outputs.

### Router-first
Router/handler logic is authored first (contract optional or derived). This is useful for internal leaf services where no external artifact is required.

### Deliberate hybrid (recommended)
Contract-first at boundary and cross-capability seams; router/service-first in pure internal leaf logic. This keeps guarantees where they matter and removes low-value duplication where they do not.

## Direct Answers To Required Questions

### 1) Pure/internal packages: dedicated contract-first value vs router-first wrapping pure services; scale threshold
- Dedicated contract-first adds clear value when internal boundary is multi-consumer or contract-stability sensitive.
- For single-caller pure services, router/service-first wrappers are sufficient until complexity grows.

Promotion threshold (introduce dedicated contract-first when any 2 conditions hold):
1. 2+ independent caller groups (API plugin, workflow trigger, other package).
2. Compatibility/versioning pressure appears.
3. Contract drift/testing pressure appears (snapshot or compatibility checks needed).
4. Near-term externalization likelihood.

### 2) API plugins: should simple wrappers stay router-first? when does contract-first pay off?
- Caller-facing API plugins should **not** default to router-first wrappers.
- Even simple wrappers should stay contract-first at the boundary because they contribute to single-source OpenAPI/SDK semantics and boundary policy control.
- Router-first is acceptable only behind the boundary contract in internal implementation details.

### 3) Workflows: contract-first vs router-first for trigger routers and workflow surfaces
- Workflow trigger routers: contract-first (oRPC) remains correct default.
- Durable execution surfaces (`createFunction`, `step.run`): not contract-first; they are Inngest durability artifacts.
- Durable endpoints: additive ingress adapters only, never replacement trigger path.

### 4) Where contract-first truly makes sense
1. Boundary APIs that feed OpenAPI/SDK generation.
2. Workflow trigger routers exposed to callers.
3. Cross-capability package seams with multi-caller reuse.
4. Surfaces with explicit compatibility governance.

### 5) Clarified definitions in current context
- Contract-first = stable boundary artifact strategy.
- Router-first = local implementation strategy for low-fanout internals.
- Deliberate hybrid = policy-compatible distribution of both by layer.

### 6) Can auto-composition be simplified by contract-first while preserving posture?
Yes, with explicit (non-black-box) helpers only.
- Safe: typed surface builders, capability composer, shared TypeBox/OpenAPI converter helper.
- Not safe: implicit auto-discovery/auto-mount that hides split ownership or ingress boundaries.

## Layer Implications (Concrete)

### Package layer (`packages/<capability>`)
- Keep package boundary contract/client where cross-boundary calls exist.
- Allow service-first internals for single-caller leaf logic until promotion threshold is hit.
- Keep transport-neutral package rule intact.

### API plugin layer (`plugins/api/*`)
- Boundary procedures remain contract-first by default.
- Simple wrappers stay contract-first if caller-facing.
- Internal helper code may be router/service-first behind contract.

### Workflow plugin layer (`plugins/workflows/*`)
- Trigger contracts/routers stay contract-first (oRPC -> Inngest dispatch).
- Durable function files remain Inngest-native.
- Durable endpoint adapters remain additive/non-overlapping.

### Composition layer
- Adopt explicit helper composition from Agent H proposals where useful.
- Preserve explicit host mounts and split ingress registration.

## What Changes In Authoring Model (And Why No Regressions)
Change proposed:
- Introduce a **layered authoring rule**, not a harness policy change.

New authoring rule set:
1. Boundary/trigger surfaces: contract-first required.
2. Pure internal leaf services: router/service-first allowed by default.
3. Promotion to dedicated contract-first triggered by threshold criteria.

Why no regressions:
- External contract source remains singular.
- Split ingress model unchanged.
- Trigger ownership unchanged.
- In-process client and no-self-HTTP defaults unchanged.

## Best Counterargument + Response
Counterargument:
- “Make contract-first universal everywhere for maximum consistency and easiest composition.”

Response:
- Universal contract-first improves uniformity but over-pays in internal leaf zones where there is no contract-consumer pressure.
- oRPC itself supports both with and without contract-first; architecture should use that flexibility intentionally, not universally.
- Boundary guarantees are preserved by keeping contract-first strict where artifacts and policy are externalized.

## Official Sources

### oRPC
- [Overview](https://orpc.dev/docs/overview)
- [Comparison](https://orpc.dev/docs/comparison)
- [Define contract](https://orpc.dev/docs/contract-first/define-contract)
- [Implement contract](https://orpc.dev/docs/contract-first/implement-contract)
- [Router](https://orpc.dev/docs/router)
- [Router to contract](https://orpc.dev/docs/router-to-contract)
- [Server-side calls](https://orpc.dev/docs/client/server-side)
- [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler)
- [OpenAPI specification](https://orpc.dev/docs/openapi/openapi-specification)
- [OpenAPI client](https://orpc.dev/docs/openapi/client)

### Inngest
- [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
- [Serve reference](https://www.inngest.com/docs/reference/serve)
- [Create function](https://www.inngest.com/docs/reference/functions/create)
- [Step run](https://www.inngest.com/docs/reference/functions/step-run)
- [Multi-step functions](https://www.inngest.com/docs/features/inngest-functions/multi-step-functions)

### Elysia
- [Lifecycle](https://elysiajs.com/essential/life-cycle)
- [Mount](https://elysiajs.com/patterns/mount)

### TypeBox
- [TypeBox repository/docs](https://github.com/sinclairzx81/typebox)
