# Alternatives Comparison: ORPC + Inngest Autonomy Shape

## Framing
Goal: choose the best path from current runtime reality to packet target-state for autonomous extension.

## Option Set

| Option | Shape | Pros | Cons | When to choose |
| --- | --- | --- | --- | --- |
| A. Conservative Incremental (simplest) | Keep current `/rpc` + `/api/orpc` + `/api/inngest` shape; enforce D-013 metadata semantics and partial D-015 tests first; defer capability routes. | Lowest disruption; fastest to stabilize current behavior; small refactor surface. | Leaves topology mismatch with manifest-first target; autonomy ceiling remains lower; can become permanent half-state. | Need immediate stability and minimal change window. |
| B. Balanced Bridge (recommended) | Preserve current routes while additively introducing `/api/workflows/<capability>/*`, manifest-first composition, dual-read metadata bridge, and phased D-015 matrix enforcement. | Best risk/reversibility balance; converges toward target while preserving uptime; measurable gates. | Temporary complexity from parallel states; requires strict time-boxing to avoid bridge permanence. | Need convergence without big-bang cutover. |
| C. Robust Direct Cutover (most robust) | Implement manifest-first capability topology + strict metadata/runtime rules + full route-persona harness matrix in one coordinated migration. | Fastest arrival at coherent target architecture; least long-run ambiguity. | Highest blast radius; harder rollback; heavy coordination/testing burden. | Organization can absorb short-term disruption for fastest long-run payoff. |

## Decision Against Criteria

| Criterion | A | B | C |
| --- | --- | --- | --- |
| Alignment with packet target-state | low-medium | high | very high |
| Near-term execution risk | low | medium | high |
| Reversibility | high | high | medium-low |
| Autonomy enablement speed | low-medium | high | high |
| Operational continuity | high | high | medium |
| Test/verification burden | low-medium | medium-high | very high |

## Simplest Viable Path
Option A, but only if these guardrails are mandatory:
1. Enforce metadata-contract gate (`rawr.kind` + `rawr.capability`).
2. Add forbidden-route tests for current surfaces.
3. Time-box deferral of capability workflow routes with explicit expiry.

Without those guardrails, Option A becomes architecture debt accumulation, not simplification.

## Most Robust Path
Option C with staged release controls:
1. Dark-launch capability routes behind feature flag.
2. Enforce route-persona matrix in CI before exposure.
3. Cut over metadata semantics and manifest ownership atomically.
4. Keep rollback path that reverts to prior route map and metadata resolver.

## Recommendation
Choose Option B (Balanced Bridge).

Why:
1. It preserves current runtime service continuity.
2. It forces convergence on target topology and metadata model.
3. It supports incremental verification and rollback.
4. It avoids indefinite dual semantics if gates and sunset dates are enforced.

## Required Gates for Option B
1. `manifest-smoke` gate must prove manifest-owned capability route composition.
2. `metadata-contract` gate must fail any runtime behavior keyed on legacy metadata.
3. `import-boundary` gate must keep one-way dependencies.
4. `host-composition-guard` gate must prove deterministic mount/control ordering.
5. D-015 matrix gate must require negative-route assertions for each caller persona.
