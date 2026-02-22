# Agent C Final API + Context Assessment

Date: 2026-02-20 (UTC)
Scope: API design + context design quality for ORPC + Inngest architecture (contracts, transport, errors, caller model, context envelopes).

## Executive Judgments
- Consumer model fitness: **Moderate-High at policy level, Moderate at implementation level**.
  - Policy clarity is strong (explicit caller/auth matrix, forbidden-route semantics, route-family ownership).
  - Implementation shows a context-creation gap: current server oRPC context is process-level and infra-centric, not request-scoped principal/correlation context.
- API evolution posture: **Moderate**.
  - Strength: contract-first + TypeBox/OpenAPI generation provides a stable evolution substrate.
  - Weakness: explicit compatibility governance (deprecation lifecycle, compatibility guarantees, error-code registry) is mostly implicit/policy-driven rather than encoded in surfaced implementation.

## Skills Introspected
- `solution-design` (`/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:49`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:77`, `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:99`)
  - Used for reframing and reversibility checks in assessment framing.
- `system-design` (`/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:72`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:111`, `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:119`)
  - Used for boundary choice and second-order consequence evaluation.
- `domain-design` (`/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:69`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:93`, `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:134`)
  - Used for ownership/seam analysis (single authority, overlap risk).
- `api-design` (`/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:53`, `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:66`, `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md:124`)
  - Used for consumer-task-relationship lens, contract test, evolution test.
- `typescript` (`/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:35`, `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:114`, `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:181`)
  - Used for runtime/type-time contract integrity and boundary parsing expectations.
- `orpc` (`/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:13`, `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:50`, `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:145`, `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:152`)
  - Used for dual-transport interpretation, contract-first posture, and versioning pitfalls.

## Assessment

### 1) Contracts
Strengths:
- Contract-first policy is explicit for boundary APIs and external publication surfaces.
- Ownership model is well-specified: workflow/API boundary contracts remain plugin-owned; packages remain transport-neutral domain logic.
- TypeBox-first schema policy is explicit and consistently documented.

Observed gaps:
- Coordination/admin router appears to be generated into OpenAPI from the same composed router used for RPC, but policy does not clearly encode which contract subsets are externally publishable vs internal-only at generation time.
- Contract governance for backwards compatibility is described normatively, but no explicit compatibility metadata, capability negotiation, or deprecation fields are visible in sampled route implementation.

### 2) Transport + Caller Model
Strengths:
- Caller model is one of the strongest parts of the design packet: route families, link types, auth expectations, and forbidden routes are explicit.
- Split-path model is coherent: `/rpc` for first-party/internal, `/api/orpc/*` and `/api/workflows/<capability>/*` for published clients, `/api/inngest` runtime ingress only.
- CLI implementation aligns with first-party internal transport defaults via `RPCLink` to `/rpc`.

Observed gaps:
- In sampled server registration, `/rpc` and `/api/orpc/*` are mounted with shared router/context but route-family access controls are not encoded in this file; enforcement appears to rely on outer middleware/gateway assumptions.
- `apps/web/src/lib/orpc-client.ts` is not present in this worktree, limiting direct verification of browser-first-party transport conformance.

### 3) Errors + Observability
Strengths:
- Boundary error handling uses typed `ORPCError` with explicit status/code helpers.
- Queue failure path records failed run status and timeline before surfacing boundary error, preserving durable observability continuity.
- CLI maps `ORPCError` to structured `CoordinationFailure`, including retriable heuristic (`status >= 500`).

Observed gaps:
- Error-code catalog/registry contract is not visible in sampled anchors; client branching may drift if codes are not centrally governed.
- Failure payloads include propagated details; data-shape discipline for safe external exposure is policy-dependent and not visibly constrained in this router module.

### 4) Context Envelopes
Strengths:
- Two-envelope contract is explicit and correct for mixed request/durable runtime models.
- Correlation propagation expectations are documented from trigger payload through runtime timeline.

Observed gaps:
- Axis policy says request context MUST be created at ingress per request, but current `registerOrpcRoutes` builds one static context object and reuses it for all requests.
- The server oRPC context type in this file contains infra/runtime fields only (`repoRoot`, `baseUrl`, `runtime`, `inngestClient`) and does not carry request/principal/correlation/network envelope fields described in context-policy docs.

### 5) Consumer Model Fitness (Explicit)
Judgment: **Moderate-High design fitness, Moderate implementation fitness**.
- Fit is high for architectural intent: each consumer class has an explicit transport and auth boundary.
- Fit drops in implementation confidence because request-scoped context creation and route-family enforcement are not directly encoded in sampled runtime registration.

### 6) API Evolution Posture (Explicit)
Judgment: **Moderate**.
- Positive posture: contract-first, TypeBox-first, and OpenAPI generation from composed router improve consistency and toolability.
- Limitation: explicit deprecation/versioning mechanics are thin in the sampled runtime surface (static OpenAPI version string, no visible compatibility negotiation primitives), so long-lived external evolution depends on process discipline more than encoded contract controls.

## Evidence Map
- Architecture enforces split model, ownership, caller transport defaults: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:45`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:50`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:51`
- Canonical caller/auth matrix and forbidden routes: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:64`
- Global invariants for route semantics, external SDK source, and context split: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:81`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:82`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:106`
- External publication rules and internal-only RPC rule: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/01-external-client-generation.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/01-external-client-generation.md:20`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/01-external-client-generation.md:24`
- Internal in-process default and no local HTTP self-call default: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/02-internal-clients.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/02-internal-clients.md:20`
- Two-envelope context contract and per-request ingress creation requirement: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:21`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:35`
- Error and observability requirements by surface/harness: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:21`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:26`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:56`
- Middleware split-control-plane requirement and route-negative assertions: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:20`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md:30`
- Workflow/API split and consumer model statement: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:19`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:43`
- Runtime-ingress non-public constraints: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:61`
- Server oRPC context type (infra-centric fields only): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:41`
- Server static context object reused in handler calls (not request-derived): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:314`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:343`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:353`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:363`
- Typed boundary error helpers and run-queue failure path: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:80`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:186`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:200`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:233`
- OpenAPI generation and static version marker: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:294`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:300`
- CLI internal transport default via RPC and base URL resolution: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/cli/src/lib/coordination-api.ts:23`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/cli/src/lib/coordination-api.ts:36`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/cli/src/lib/coordination-api.ts:98`
- CLI error normalization contract: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/cli/src/lib/coordination-api.ts:54`

## Assumptions
- `apps/server/src/orpc.ts` is a representative boundary registration path for this assessment slice.
- Route-family auth gating may exist elsewhere (gateway or host middleware), but was not directly inspected outside assigned anchors.
- Coordination APIs are treated as first-party/internal administrative surfaces unless explicitly published.
- Missing `apps/web/src/lib/orpc-client.ts` means web transport conformance could not be directly verified in this pass.

## Risks
- **High:** Policy/implementation drift on context envelopes: per-request ingress context requirement is not directly reflected in sampled server context creation.
- **High:** Internal-vs-external publication ambiguity if composed OpenAPI includes administrative/internal procedures without explicit publish filtering.
- **Medium:** Evolution fragility for external consumers if compatibility/deprecation/error-code governance remains process-only rather than encoded in contract metadata/tooling.
- **Medium:** Route-family safety relies on distributed enforcement; if gateway/middleware misconfigures, `/rpc` and `/api/orpc/*` exposure boundaries could blur.
- **Low-Medium:** Error detail payloads may leak operational internals if route auth/publication controls are inconsistent.

## Unresolved Questions
- Which exact contract subsets are intended for external OpenAPI publication today, and where is that filter encoded?
- Where is first-party/internal vs external auth enforcement concretely implemented for `/rpc` and `/api/orpc/*` in runtime code?
- Is there a canonical, machine-checked error-code registry shared across server and CLI consumers?
- What is the formal deprecation/migration contract for externally published procedures and fields (timeline, signaling mechanism, compatibility window)?
- Should `RawrOrpcContext` remain infra-only for this administrative surface, or should it be refactored to a request-derived envelope aligned with Axis 04 MUST language?
