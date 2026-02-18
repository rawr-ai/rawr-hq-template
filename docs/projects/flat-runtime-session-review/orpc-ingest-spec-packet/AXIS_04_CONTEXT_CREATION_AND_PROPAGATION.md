# Axis 04: Context Creation and Propagation

## Role Metadata
- Role: Normative Annex
- Authority: Binding context-envelope and propagation rules under split runtime models.
- Owns: request-context creation, runtime-context derivation, and trigger-to-run correlation propagation constraints.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Caller/auth route-family boundaries are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership is in `./DECISIONS.md` (D-008 closed baseline, D-009 open guidance).

## Axis-Specific Normative Deltas
1. Boundary request context MUST be created at oRPC ingress and injected per request.
2. Durable run context MUST be derived in Inngest runtime execution (`event`, `step`, run metadata, logger, runtime middleware fields).
3. Context modeling MUST keep two envelopes by design:
   - boundary request context;
   - Inngest runtime function context.
4. Packet policy rejects forcing a universal context object across boundary and durable runtimes.
5. Correlation metadata SHOULD propagate from trigger boundary input/context into event payload, timeline records, and runtime logs.
6. Request/correlation/principal/network metadata contracts SHOULD live in `context.ts` (or equivalent context modules), not `domain/*`.
7. Context-adjacent trigger/procedure docs SHOULD default to inline `.input(...)` and `.output(...)`; extraction is exception-only and SHOULD use paired `{ input, output }` shape.

## Two-Envelope Summary
| Envelope | Created by | Lifecycle |
| --- | --- | --- |
| Boundary request context | host/oRPC ingress per request | request-scoped |
| Inngest runtime context | Inngest runtime + middleware | run/attempt-scoped |

## Out of Scope
- Full error/timeline semantics (`AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`).
- Middleware placement by control plane (`AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- oRPC context: https://orpc.dev/docs/context
- Inngest middleware dependency injection: https://www.inngest.com/docs/features/middleware/dependency-injection
