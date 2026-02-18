# Axis 06: Middleware and Cross-Cutting Concerns

## Role Metadata
- Role: Normative Annex
- Authority: Binding middleware placement and cross-cutting control-plane boundaries.
- Owns: boundary-vs-durable middleware separation rules, reuse boundaries, and dedupe guidance posture.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-wide split invariants and baseline traces ownership are defined in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership is in `./DECISIONS.md` (D-008 closed, D-009 open guidance, D-010 open guidance).

## Axis-Specific Normative Deltas
1. Boundary middleware concerns (auth, visibility, request-level policy, boundary validation) MUST live in oRPC/Elysia boundary layers.
2. Durable lifecycle concerns (retry behavior, step boundaries, concurrency behavior, run lifecycle hooks) MUST live in Inngest function config/body/middleware layers.
3. Middleware control planes MUST remain split by runtime model; boundary and durable stacks are not merged.
4. Shared policy logic MAY be reused, but application points MUST remain harness-specific.
5. Heavy oRPC middleware SHOULD use explicit context-cached dedupe markers; built-in dedupe is constrained and MUST NOT be treated as universal (D-009 remains open/non-blocking).
6. Plugin middleware MAY extend runtime context/instrumentation but MUST inherit host baseline traces middleware and MUST NOT replace/reorder it (D-008 lock).
7. `finished`-hook side effects SHOULD stay idempotent/non-critical (D-010 guidance).
8. Middleware depending on request/correlation/principal/network metadata SHOULD consume those contracts from context modules (`context.ts`), not `domain/*`.

## Placement Matrix
| Concern | Primary placement |
| --- | --- |
| Boundary auth/visibility/request policy | oRPC/Elysia boundary middleware/handlers |
| Durable retries/steps/concurrency/lifecycle hooks | Inngest function + Inngest middleware |
| Heavy dedupe markers | explicit context flags in boundary middleware |

## Out of Scope
- Full context propagation contract (`AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`).
- Full error/timeline semantics (`AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- oRPC middleware: https://orpc.dev/docs/middleware
- oRPC dedupe guidance: https://orpc.dev/docs/best-practices/dedupe-middleware
- Inngest middleware lifecycle: https://www.inngest.com/docs/reference/middleware/lifecycle
