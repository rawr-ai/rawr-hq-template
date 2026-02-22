# SESSION_019c587a_AGENT_ANNEX_RESHAPE_EXEC_SCRATCHPAD

## Setup Status
- Mandatory skills/spec/reshape reads completed in prior setup checkpoint.
- Plan verbatim artifact recreated in active session-review area.
- Execution scope now active for owned outputs only: `docs/projects/flat-runtime/axes/*.md`.

## Locked Invariants (No-Drift)
1. API boundary and durable execution remain split semantics.
2. oRPC stays primary API harness; Inngest stays primary durability harness.
3. Durable Endpoints are additive ingress adapters only.
4. `/rpc` + `RPCLink` remain first-party/internal only.
5. External clients remain OpenAPI-boundary only (`/api/orpc/*`, `/api/workflows/<capability>/*`).
6. Runtime ingress remains signed `/api/inngest` only.
7. No dedicated `/rpc/workflows` mount by default.
8. Host bootstrap baseline traces middleware order remains fixed.
9. Plugin middleware may extend baseline instrumentation context but cannot replace/reorder baseline.
10. Boundary contracts remain plugin-owned; packages remain transport-neutral.
11. TypeBox-only contract/procedure schema authoring remains locked.
12. Procedure I/O ownership remains with procedures/contracts, not `domain/*`.
13. Snippets default to inline I/O schema declarations; extraction is exception-only.

## Execution Rules
1. Clarity/structure reshape only; no policy reinterpretation.
2. Preserve normative force words exactly (`MUST`, `SHOULD`, `MUST NOT`, `never`, `only`).
3. Preserve route/auth/caller semantics and forbidden-route constraints exactly.
4. Preserve implementation-legible snippets; no semantic reduction.
5. Remove duplicated global policy text only when replaced by clear canonical-pointer wording.
6. Keep decision IDs stable; no reuse/repurpose.

## Active Gates
1. Decision ID uniqueness (`D-012` cannot be reused; next free ID if needed).
2. Canonical matrix authority (`ARCHITECTURE.md` remains canonical matrix source).
3. Snippet parity/no-loss gate (no unresolved snippet deltas).
4. Repo-wide stale-link gate including non-packet docs.
5. No destructive move before parity and link gates pass.
6. Q-06 bounded assumption lock before cutover.

## Known Reshape Blockers (Carry Forward)
- BLOCKER: Decision-ID collision risk.
- BLOCKER: Cross-reference migration scope risk.
- BLOCKER: Silent snippet-loss risk without hard parity checks.
- MAJOR: Canonical-authority confusion if derivative docs drift from canonical source.
- MAJOR: Wildcard archive non-determinism risk.
- MAJOR: Open-question gating bypass risk.
