# SESSION_019c587a_AGENT_ANNEX_RESHAPE_EXEC_SCRATCHPAD

## Setup Checkpoint Status
- Scope completed: mandatory skill introspection, full official spec corpus read, full reshape-input read.
- Artifact created: `SESSION_019c587a_AGENT_ANNEX_RESHAPE_EXEC_PLAN_VERBATIM.md` (verbatim copy of current `RESHAPE_PROPOSAL.md`).
- Constraint held: no edits to target reshape outputs under `docs/projects/flat-runtime/axes/*.md`.

## Locked Invariants (Must Not Drift)
1. API boundary and durable execution remain split semantics; no collapse by wording reshuffle.
2. oRPC remains primary API harness; Inngest remains primary durability harness.
3. Durable Endpoints remain additive ingress adapters only, never second first-party trigger authoring path.
4. `/rpc` + `RPCLink` remain first-party/internal only; never externally published.
5. External clients remain OpenAPI-boundary only (`/api/orpc/*`, `/api/workflows/<capability>/*`).
6. Runtime ingress remains signed `/api/inngest` only.
7. No dedicated `/rpc/workflows` mount by default.
8. Host bootstrap order remains fixed: baseline traces middleware before Inngest/workflow composition and route mount.
9. Plugin middleware may extend baseline instrumentation context; may not replace/reorder baseline.
10. Workflow/API boundary contracts stay plugin-owned.
11. Domain packages stay transport-neutral.
12. TypeBox-only contract/procedure schema authoring remains locked (no Zod-authored contract/procedure snippets).
13. Procedure I/O ownership stays with procedures/contracts, not `domain/*`.
14. Packet snippets default to inline I/O schema declarations; extraction is exception-only.
15. Context ownership remains explicit in `context.ts`-style modules; runtime envelopes stay split.

## No-Drift Rules for Annex Reshape Execution
1. Clarity/structure reshape only in owned area; no policy reinterpretation.
2. Preserve normative strength words exactly (`MUST`, `SHOULD`, `MUST NOT`, `never`, `only`).
3. Preserve caller/auth/transport semantics and forbidden-route constraints exactly.
4. Preserve implementation-legible snippets (no semantic weakening, no pseudo-code substitution).
5. Remove duplicated global policy text only when replaced by precise pointer to canonical authority.
6. Keep decision IDs stable; do not reuse or repurpose existing IDs.
7. Keep route/path names and contract ownership statements exact unless explicitly canonicalized upstream.
8. Do not infer new generation/runtime policy (especially for `rawr.hq.ts`) beyond bounded assumptions already gated.

## Unresolved Gates (Must Be Treated as Active)
1. Decision-ID uniqueness gate: path-strategy closure cannot reuse `D-012`; only existing owner extension or next free ID (`D-013+`).
2. Canonical matrix authority gate: `ARCHITECTURE.md` remains sole canonical matrix; axis/example tables are derivative views.
3. Snippet preservation gate: code-fence inventory + source->destination parity map + zero unresolved deltas before destructive cutover.
4. Cross-reference gate: repo-wide stale-link scan must include active non-packet docs (not packet-internal only).
5. Destructive-move gate: no archive/cutover moves before parity and link gates pass.
6. Open-question gate: Q-06 bounded decision must be locked before cutover-phase execution.
7. Determinism gate: archive/move operations should use frozen explicit manifests (avoid timing-dependent wildcard sweep).

## Reshape Blockers Snapshot (Carry-Forward)
- BLOCKER: Decision ID collision risk in DECISIONS handling (historically surfaced by Review A/B; enforce uniqueness precheck even after text fixes).
- BLOCKER: Migration link drift risk if cross-reference repair is scoped too narrowly.
- BLOCKER: Silent snippet loss risk without hard parity enforcement.
- MAJOR: Canonical authority confusion risk if any subordinate plan/doc still conflicts on matrix authority.
- MAJOR: Non-deterministic archive behavior risk if wildcard movement is used instead of frozen manifest.
- MAJOR: Open-question handling risk if gated questions are treated as advisory during execution.

## Operating Boundary (Annex)
- Owned edit surface for later execution: `docs/projects/flat-runtime/axes/*.md` only.
- Current step completed as requested: setup checkpoint only; no target reshape output edits started.
