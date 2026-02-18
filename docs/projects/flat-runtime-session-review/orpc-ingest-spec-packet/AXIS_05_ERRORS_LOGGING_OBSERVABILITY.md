# Axis 05: Errors, Logging, and Observability

## Role Metadata
- Role: Normative Annex
- Authority: Binding per-surface error/observability contracts under split boundary and durable runtimes.
- Owns: boundary typed-error semantics, durable timeline/status recording requirements, and trace-link expectations.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-wide caller/auth matrix and split surface invariants are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership for observability-related posture is in `./DECISIONS.md` (D-008 closed, D-010 open guidance).

## Axis-Specific Normative Deltas
1. Boundary API errors MUST use typed oRPC error semantics (`ORPCError` with explicit status/code semantics).
2. Durable execution state MUST be recorded as run/timeline lifecycle updates in runtime adapters.
3. Trigger-to-run correlation SHOULD be persisted across boundary logs, event payloads, runtime logs, and timeline updates.
4. Host bootstrap MUST initialize baseline `extendedTracesMiddleware()` before composing Inngest runtime bundle and route mounts (D-008 lock).
5. `finished`-hook side effects SHOULD remain idempotent and non-critical; this remains open/non-blocking guidance (D-010) and is not promoted to stricter policy in this axis.

## Reporting Model
- Boundary surface: typed request/response errors for caller contracts.
- Durable surface: run-status and timeline lifecycle records for asynchronous operations.

## Out of Scope
- Request/durable context-envelope construction (`AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`).
- Middleware placement rules (`AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- Inngest middleware lifecycle: https://www.inngest.com/docs/reference/middleware/lifecycle
