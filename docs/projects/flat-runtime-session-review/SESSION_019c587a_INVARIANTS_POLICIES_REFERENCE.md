# SESSION_019c587a Invariants, Policies, Decisions, Direction Reference

## Purpose
This document captures the locked invariants/policies/decisions/direction that came from the clarification loop and planning Q&A for pure-package end-to-end convergence.

## Canonical direction
- Canonical architecture direction: pure package, end-to-end.
- Canonical editing target: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`.
- Update strategy: forward-only canonical edits; do not retrofit older historical docs.

## Locked policy decisions

### Domain package baseline
1. Domain packages must use oRPC internally.
2. Each domain package must include:
- one internal oRPC router,
- one in-process server-side oRPC client wrapper,
- pure TypeScript service modules.
3. Router topology lock: exactly one exported internal router per domain package.
4. Service layout default: service-module-first; split to operations only when thresholds are exceeded.

### API boundary ownership
1. API boundary is boundary-owned by default.
2. Boundary plugin owns its boundary contract and router and boundary client shape.
3. Reuse of package internal contract/implementation is allowed as an exception when overlap is mostly 1:1 and reuse is simple.
4. Guardrail: no extension hell, no tangled contract/implementation inheritance stacks.

### Workflows model
1. Workflows are ingest-first for execution semantics.
2. In addition to Inngest execution functions, workflow plugins also provide a workflow trigger router.
3. Trigger path naming standard: `/api/workflows/<capability>/...`.
4. Inngest execution ingress remains separate and locked at `/api/inngest`.
5. Per-procedure visibility metadata exists with default `internal` and explicit promotion to `external`.

### Capability composition
1. `rawr.hq.ts` remains central composition authority in this phase.
2. Capability composition merges API routers + workflow trigger routers + Inngest functions without plugin-to-plugin imports.
3. Auto-discovery is deferred (central now, discovery later).

### Boundary integrity
1. Runtime plugin-to-plugin imports remain disallowed.
2. Boundary calls flow through composed surfaces, not direct runtime plugin references.

## Semantic clarifications locked from Q&A
1. `/api/inngest` and `/api/workflows/...` are not the same thing.
2. `/api/inngest` is Inngest runtime execution ingress.
3. `/api/workflows/...` is workflow trigger API surface.
4. “Events API vs Workflows API” ambiguity resolved in canonical naming: use workflows naming for trigger surface.

## Cleanup direction
- Delete superseded non-canonical/other-approach artifacts that add confusion and no longer carry needed value.
- Keep current-session active evidence docs supporting rationale and auditability.

## Deferred decisions (explicit)
1. Auto-discovery manifest model is deferred to a later phase.
2. Cutover condition for discovery re-open: demonstrated manual registration friction and repeatable boilerplate across multiple capabilities.

## Reference usage
Agents implementing canonical edits should consult this file before modifying the canonical doc.
