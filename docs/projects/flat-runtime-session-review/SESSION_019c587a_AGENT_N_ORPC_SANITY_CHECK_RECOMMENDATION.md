# SESSION_019c587a — Agent N ORPC Sanity Check Recommendation

## 1) Verdict: Match or Drift?

Short answer: **partial match with meaningful illustration drift**.

- **Matches consensus at policy level**:
  - Boundary surfaces stay contract-first.
  - Internal leaf logic can be router/service-first.
  - Split oRPC (API contract harness) vs Inngest (durability harness) remains intact.
- **Drifts at structure/example level**:
  - The new N=3 API plugin illustration (`contracts/*.contract.ts` + `handlers/*.handler.ts` + recomposition) is heavier than prior canonical consensus and risks being read as the new default.
  - Prior consensus-bearing docs anchor canonical plugin structure to `contract.ts` + `router.ts` (+ `index.ts`), not per-operation contract/handler folders.

Evidence anchors:
- Hybrid consensus: `SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md:6`, `SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md:6`.
- Canonical file inventory/naming: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:237`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:266`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:582`.
- New heavier illustration: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:180`.

## 2) Is Current Separation Justified or Over-Fragmented?

For current posture, **API plugin separation as illustrated is over-fragmented by default**.

- `contracts/` + `handlers/` + `contract.ts` + `router.ts` + `index.ts` can be valid for very large surfaces, but it is not required by oRPC or by prior consensus.
- The posture spec’s naming and inventory emphasize concise role files (`contract.ts`, `router.ts`, `index.ts`) and avoiding unnecessary context-baked decomposition.
- oRPC contract-first docs support flexible granularity (`implement(contract)` + `os.router({...})`), not mandatory per-operation file splitting.

## 3) Least-Churn Recommendation (API Plugins)

Adopt this as default for API plugins:

- `contract.ts`: full boundary contract for that plugin namespace.
- `router.ts`: implementation attachment/mapping via `implement<typeof contract>(...)`.
- `index.ts`: optional/export surface for composition.
- Optional `operations/` helpers only when complexity genuinely requires it.

Do **not** make `contracts/` and `handlers/` the baseline convention.

## 4) Internal Package Operations Recommendation

Recommendation: **conditional keep** (not universal keep, not universal drop).

- Keep package boundary canonical (`contract.ts`, `router.ts`, `client.ts`) where package-level surface exists.
- Allow internal `operations/` split under `src/internal/` only when one or more thresholds are hit:
  - 4+ operations with divergent concerns,
  - distinct middleware/context/error policy per operation,
  - handlers becoming large enough that router readability degrades,
  - explicit testing/isolation benefit outweighs file churn.
- If thresholds are not met, keep handlers close to router/service for lower ceremony.

## 5) Recommended Structure (Concrete)

```text
packages/<capability>/src/
  contract.ts              # package boundary/internal contract artifact
  router.ts                # package router implementation
  client.ts                # default internal call path
  services/                # domain logic
  internal/                # optional complexity split zone
    operations/            # optional; only when threshold reached
      <op>.ts
    index.ts

plugins/api/<capability>-api/src/
  contract.ts              # full caller-facing API contract (single source in plugin)
  router.ts                # implement(contract) + handler mapping
  index.ts                 # export typed surface/composition entry
  operations/              # optional implementation helpers (NOT required)
    <op>.ts

plugins/workflows/<capability>-workflows/src/
  contract.ts              # trigger API contract
  router.ts                # trigger router (dispatches to Inngest)
  functions/               # durable execution
  index.ts
```

Concise code-pattern notes:
- Put caller-facing schema + route metadata ownership in plugin `contract.ts`.
- Use `router.ts` to bind handlers (`os.<proc>.handler(...)`) and keep orchestration readable.
- If needed, extract handler functions into `operations/*.ts`, but keep contract ownership centralized unless scale demands a split.

## 6) Explicit Tradeoffs

Pros of least-churn structure:
- Strong alignment with prior consensus/posture canonical inventory.
- Lower cognitive load and fewer moving files for N=1..N=3 surfaces.
- Easier policy enforcement (single visible boundary contract file per plugin by default).

Cons / what you give up:
- Slightly less per-operation file isolation in medium-sized plugins.
- If plugin grows large quickly, you may later introduce `operations/` (and possibly deeper splits) as a second refactor step.

Pros of heavier split (`contracts/` + `handlers/`) when justified:
- Better isolation for large teams/high operation count/high governance surfaces.
- Clearer per-operation ownership boundaries.

Cons of heavier split when premature:
- Churn and over-separation without proportional reliability gain.
- More recomposition overhead and more places for drift.

## Final Call

The integrated recommendation’s **architecture intent is right**, but the **new illustration should be tightened** so default guidance stays least-churn and posture-aligned:

1. Keep hybrid policy.
2. Keep canonical default file surface minimal (`contract.ts`, `router.ts`, optional `index.ts`).
3. Treat deep per-operation splits as **scale-triggered exceptions**, not baseline.
