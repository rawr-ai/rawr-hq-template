# SESSION_019c587a Service Module Design Review

Date: 2026-02-16
Reviewer: Agent E (independent)
Status: Draft (initial pass)

## Executive Assessment
Current Approach A is directionally strong on dependency direction and edge-mount boundaries, but the service/module granularity policy is too rigid. The document currently pushes one-file-per-operation patterns that risk over-fragmentation and weak change locality. It also contains a notable purity contradiction: package space is described as pure domain/service, yet package internals instantiate oRPC server handlers via `implement()`.

## Observed Claims
1. Approach A asserts package purity and one-way boundary-to-domain imports.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:237`

2. The scaled shape prescribes operation-level file fan-out in both package and plugin layers.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:108`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:126`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:213`

3. The proposal materializes `implement()` in package contract space.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:361`

4. Current runtime code in repo correctly mounts oRPC at host edge with Elysia `parse: "none"` forwarding.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts:330`

## Inferred Evaluation
- TypeScript/API design: contract-first posture is good, but excessive micro-files increase import fan-out and obscure capability-level APIs.
- Architecture: boundary ownership is mostly correct; purity degrades when server adapters are created inside package contract modules.
- oRPC/Elysia: transport-edge guidance is coherent and aligned with best practice; that same principle should apply consistently to package-vs-adapter boundaries.

## Keep / Change / Remove (Draft)
### Keep
- One contract + one router per API plugin.
- Boundary contracts/events defined at plugin edges by default.
- App-host ownership of Elysia/oRPC mounting and transport prefixes.

### Change
- Shift from mandatory one-file-per-operation to heuristics-based splits.
- Group service logic by cohesive capability module first, then split when complexity thresholds are crossed.
- Move package-level `implement()` materialization into adapter/plugin layer.

### Remove
- Blanket granularity rule that enforces operation-file fan-out regardless of module complexity.

## Alternative Structure (Draft)
A capability-cohesive service module layout often gives better readability and fewer cross-file hops than many tiny operation files:

```text
packages/invoice-processing/src/
  domain/
    model.ts
    invariants.ts
  services/
    invoice-lifecycle.service.ts   # start/getStatus/markRunning/reconcile/finalize grouped
    invoice-admin.service.ts       # forceReconcile/cancel/retry grouped
    index.ts
  contracts/
    internal.contract.ts
    schema-bridge.ts
  adapters/
    internal-orpc.adapter.ts       # implement(contract) + handler mapping (adapter concern)
```

Tradeoff summary:
- Better: capability-level cohesion, fewer indirections, easier onboarding.
- Worse: larger files unless split thresholds are enforced.
- Mitigation: split only when file exceeds complexity/size/change-churn thresholds.

## Next Revision Targets
1. Finalize rule-set for service granularity (when to split vs group).
2. Propose exact edits to the primary artifact to remove purity contradiction and reduce over-fragmentation risk.
3. Add final recommendation matrix with confidence and migration impact.
