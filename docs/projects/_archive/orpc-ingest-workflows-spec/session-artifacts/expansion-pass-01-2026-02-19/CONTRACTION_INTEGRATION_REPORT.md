# Contraction Integration Report (Agent E)

## Scope
Packet-only contraction/integration pass for:
- `docs/projects/orpc-ingest-workflows-spec/**`
- artifacts under `_expansion-pass-01/`

No runtime code edits were made.

## Integration Matrix
| Source change | Target file | Policy impact | Drift risk | Merge decision |
| --- | --- | --- | --- | --- |
| Agent A: D-013 legacy metadata runtime simplification lock | `DECISIONS.md`, `ARCHITECTURE.md`, `axes/10-legacy-metadata-and-lifecycle-simplification.md` | Adds canonical runtime-metadata contract; preserves D-005..D-012 | Medium if lock language conflicts with older metadata claims | Merged with status normalization and cross-doc pending-state alignment |
| Agent C: D-014 seam guarantees (lock-ready) | `axes/02-internal-clients.md`, `axes/07-host-composition.md`, `axes/08-workflow-api-boundaries.md`, `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` | Adds package-first seam and import-direction guarantees without changing locked route/ownership posture | Medium if interpreted as already locked decision | Merged as lock-ready only; decision-register status explicitly `open` |
| Agent T: D-015 harness model (lock-ready) | `axes/12-testing-harness-and-verification-strategy.md` | Establishes canonical harness/layer matrix and negative-route expectations | Medium if interpreted as decision-locked | Merged as lock-ready only; decision-register status explicitly `open` |
| Agent B: lifecycle-ready verification obligations | `axes/05-errors-observability.md`, `axes/06-middleware.md`, `examples/e2e-04-context-middleware.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` | Makes downstream verification contract executable and route-aware | Medium if implementation-adjacent directives appear to mutate architecture decisions | Merged; kept as implementation-adjacent execution contract (not decision authority) |
| Agent D: navigation/read-path reshape | `README.md`, `ARCHITECTURE.md`, `CANONICAL_EXPANSION_NAV.md` | Improves authority scent and concern routing for D-013/014/015 | Low | Merged with small wording normalization for pending decision states |
| Agent E: decision register integrity pass | `DECISIONS.md` | Adds explicit D-014/D-015 entries as `open`, removes duplicate impacted-doc entries, clarifies current status | High if omitted (orphan references + ambiguous lock state) | Merged |
| Agent E: pending-state consistency pass | `README.md`, `ARCHITECTURE.md`, `CANONICAL_EXPANSION_NAV.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` | Aligns D-015 wording to "lock-ready, pending decision registration" | Medium | Merged |
| Agent E: caller-mode matrix alignment fix | `axes/01-external-client-generation.md` | Clarifies first-party browser/network vs server-internal defaults to match canonical matrix | Medium | Merged (minimal targeted patch) |

## Merge Outcomes
### Merged
- Added D-013 locked semantics consistently across architecture + decisions + axis 10.
- Retained D-014 and D-015 as lock-ready concerns while preventing accidental lock-state drift.
- Preserved D-009/D-010 as open/non-blocking while integrating stronger harness guidance.
- Kept implementation-adjacent directives scoped to downstream execution planning.
- Normalized navigation so readers can route quickly by concern without authority ambiguity.
- Added Agent E control artifacts (`AGENT_E_PLAN_VERBATIM.md`, `AGENT_E_SCRATCHPAD.md`, this report).

### Rejected
- Implicit promotion of D-014 to locked status without explicit decision-register registration.
  - Rationale: would bypass decision-governance boundary and create policy drift.
- Implicit promotion of D-015 to locked status within axis/examples/implementation-adjacent docs.
  - Rationale: lock-ready language is present, but decision authority remains `DECISIONS.md`.

### Deferred
- Formal lock registration for D-014 (currently `open` + lock-ready language).
  - Rationale: requires dedicated decision pass.
- Formal lock registration for D-015 (currently `open` + lock-ready language).
  - Rationale: downstream rollout contract is ready, decision registration intentionally deferred.
- External process/runbook/testing doc edits outside packet.
  - Rationale: explicitly deferred by packet contract and guardrails.

## Drift Checks (D-005..D-015)
- D-005: PASS — route split remains caller-facing `/api/workflows/<capability>/*` vs runtime-only `/api/inngest`; no `/rpc/workflows` default mount introduced.
- D-006: PASS — workflow/API boundary contracts remain plugin-owned; packages stay transport-neutral/shared-domain.
- D-007: PASS — caller transport/publication boundaries unchanged (`RPCLink` internal-first-party, `OpenAPILink` published external, `/api/inngest` runtime ingress only).
- D-008: PASS — baseline traces-first bootstrap + single runtime-owned Inngest bundle + explicit mount order preserved.
- D-009: PASS — remains open/non-blocking; context-cached dedupe guidance unchanged in strength.
- D-010: PASS — remains open/non-blocking; `finished` hook guidance stays idempotent/non-critical.
- D-011: PASS — procedure/boundary I/O schema ownership and context-metadata placement unchanged.
- D-012: PASS — inline `.input/.output` default + extracted `{ input, output }` exception shape unchanged.
- D-013: PASS — locked and integrated; runtime semantics keyed to manifest + `rawr.kind`/`rawr.capability`; legacy metadata fields are non-runtime.
- D-014: PASS (open/lock-ready) — seam guarantees integrated in axes and now explicitly registered as `open` in `DECISIONS.md`.
- D-015: PASS (open/lock-ready) — harness strategy integrated in axis 12 + implementation-adjacent downstream contract; explicitly `open` in `DECISIONS.md`.

## Coherence Validation
- README/ARCHITECTURE/DECISIONS alignment: PASS
  - Authority split is explicit; D-014/D-015 now have explicit decision-register status (open/pending).
- Axis consistency: PASS
  - D-014 references consistently labeled lock-ready/pending; D-015 labeled lock-ready/pending.
- Example coherence: PASS
  - `examples/e2e-04-context-middleware.md` remains non-normative and aligned with axis 12 contracts.
- Navigation/read-path clarity: PASS
  - Concern-based routing for D-013/014/015 is explicit via README + architecture map + expansion nav.

## Readiness Statement
Packet is internally consistent and ready for the next implementation-planning phase.

Readiness conditions satisfied:
1. Canonical authority boundaries are explicit (`ARCHITECTURE.md` integrative policy, `DECISIONS.md` decision authority, axes as leaf policy, examples non-normative, implementation-adjacent execution contract scoped correctly).
2. No contradictions detected between README/ARCHITECTURE/DECISIONS/axes/examples on route split, ownership, caller semantics, or lock-state language.
3. Future process/runbook/testing updates remain captured in packet-local planning artifacts only and are not prematurely applied outside this packet.
