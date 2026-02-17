# SESSION_019c587a — Inngest vs oRPC Debate: Integrated Recommendation

## Scope
This integrates three position papers:
- Agent I (split/harden): `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- Agent J (collapse/unify): `SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- Agent K (internal calling/packaging): `SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`

This is a decision synthesis, not yet canonical-doc integration.

## Agent Position Summary

### Agent I (keep split, harden)
- Keep separate API and workflow plugin types.
- Standardize overlap to one path: API-exposed workflow triggers are always oRPC procedures that dispatch to Inngest durable execution.
- Treat Inngest Durable Endpoints as additive ingress adapters, not primary first-party trigger APIs.

### Agent J (collapse/unify side)
- Tested collapse hypothesis and rejected full collapse.
- Main reason: semantics mismatch between oRPC API contracts/clients and Inngest durable execution/endpoint runtime behavior.
- Recommended "single composition model, dual harness runtime" rather than one runtime surface.

### Agent K (internal calling + packaging)
- Recommends one strict internal-calling default: in-process oRPC internal client wrappers from domain packages.
- Proposes explicit prohibitions to prevent "four ways to call" drift.
- Keeps workflow execution runtime-owned (Inngest), with clear trigger-vs-ingress separation.

## Overlap and Differences (oRPC vs Inngest)

### oRPC strengths (primary boundary harness)
- Contract-first boundary design.
- Unified external API surface and client generation via OpenAPI.
- Strong fit for request/response procedures, context injection, middleware, and typed API errors.

### Inngest strengths (primary durability harness)
- Durable step execution, retries, concurrency/idempotency controls, scheduling/events, orchestration semantics.
- Strong fit for long-running/multi-step background workflows and cross-workflow orchestration.

### Durable Endpoints nuance
- Useful addition for some HTTP ingress patterns.
- Not equivalent to replacing first-party API contract surfaces in this architecture.
- Based on current docs, carries runtime-specific semantics and (currently documented) constraints that make it better as an additive adapter than as canonical primary API contract surface.

Primary source anchors used across agent papers:
- oRPC docs: `https://orpc.dev/docs/...`
- Inngest docs (durable endpoints/functions/serve): `https://www.inngest.com/docs/...`
- Elysia lifecycle/mount docs: `https://elysiajs.com/...`

## Integrated Recommendation (Single Direction)

Decision: **Yes to split semantics, no to full collapse, with one standardized authoring model.**

### Primary/secondary harness rule
1. **Primary API harness: oRPC**
- All caller-facing capability APIs and external client generation come from composed oRPC contracts.
2. **Primary durability harness: Inngest**
- All durable workflow execution lives in Inngest functions.
3. **Durable Endpoints role: additive only**
- Use only for specific ingress adapter cases; do not introduce as a parallel first-party API authoring path.

### One-way standard per capability (no optionality drift)
1. Domain/package logic:
- pure domain services + one internal oRPC contract/router/client.
2. Caller-facing API procedures:
- oRPC boundary contract/router only.
3. Workflow trigger APIs:
- oRPC trigger procedures that dispatch to Inngest.
4. Durable execution:
- Inngest functions only.
5. Ingress split remains explicit:
- `/api/workflows/*` = caller-trigger surface.
- `/api/inngest` = Inngest runtime ingress only.

### Internal calling default
- Default cross-boundary internal calls use package internal oRPC client wrapper.
- Disallow direct self-HTTP, ad hoc invocation styles in runtime code, and direct `inngest.send` from arbitrary boundary modules.
- Allow test-only exceptions with explicit scope.

## What this resolves
- Preserves one real client/API contract story across the system.
- Preserves Inngest’s durable guarantees without overloading API boundary semantics.
- Removes “multiple ways” ambiguity by locking a single default per call intent.
- Keeps boundaries strong while still allowing additive use of newer Inngest capabilities.

## Proposed Near-Term Canonical Doc Integration (Next Step)
1. Add a hard policy section: "Primary harness + additive harness" (oRPC boundary, Inngest durability, Durable Endpoints additive).
2. Add an explicit "call intent -> canonical path" matrix (internal sync calls, workflow triggers, durable execution, external SDK generation).
3. Tighten workflow trigger rule: API-exposed workflow triggers are always oRPC procedures that enqueue/dispatch to Inngest.
4. Add prohibition list to prevent drift (no direct self-HTTP internal calls, no direct arbitrary `inngest.send` from API boundary modules).
5. Integrate Agent H simplification abstractions only where they support this policy spine.

## Pending Integration Tracker (Not Yet Applied to Canonical E2E Doc)

These artifacts currently contain recommendations not yet merged into
`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`:

1. `SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- Status: review-only; not integrated into canonical doc yet.

2. `SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- Status: new debate output; not integrated yet.

3. `SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- Status: new debate output; not integrated yet.

4. `SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
- Status: new debate output; not integrated yet.

## Confidence and Open Questions
Confidence: high on harness split recommendation; medium on where to place optional Durable Endpoint adapters by default.

Open question to settle during canonical integration:
- Do we keep workflow triggers authored in workflow plugins and optionally wrapped by API plugins, or allow direct API-plugin ownership of trigger contracts with workflow plugin execution ownership? Either can work, but pick one canonical ownership pattern.
