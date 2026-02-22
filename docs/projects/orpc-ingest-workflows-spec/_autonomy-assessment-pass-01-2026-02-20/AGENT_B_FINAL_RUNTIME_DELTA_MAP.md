# Agent B Final Runtime Delta Map

## Skills Introspected

| Skill | Evidence (absolute path + anchor) | Applied lens for this assessment |
| --- | --- | --- |
| solution-design | `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md:60` | Use axis-based framing + mandate checks to avoid premature convergence and classify runtime/target deltas by consequence, not by syntax. |
| system-design | `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md:72` | Evaluate runtime as interacting control planes and feedback loops; inspect first-order plus second-order implications of route/composition posture. |
| domain-design | `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md:89` | Check boundary authority ownership and overlap risk (package vs plugin vs host seams). |
| typescript | `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:104` | Validate trust-boundary typing/validation posture and whether exported contract surfaces are disciplined API boundaries. |
| orpc | `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:50` | Validate contract-first composition, transport split behavior, and drift-guard posture. |
| inngest | `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md:38` | Validate durable step semantics, side-effect boundaries, and ingress/runtime separation. |

## Evidence Map

| Claim | Evidence |
| --- | --- |
| Packet target-state locks manifest-driven workflow trigger routes and keeps `/api/inngest` runtime-only | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:13` |
| Packet target-state locks plugin-owned workflow/API boundary contracts | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:25` |
| Packet target-state fixes caller transport/publication boundaries (`/rpc` internal, OpenAPI published, `/api/inngest` runtime-only) | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:39` |
| Runtime mounts `/api/inngest` and then delegates oRPC mounts via `registerOrpcRoutes` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:111`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:113` |
| Runtime mounts `/rpc` and `/api/orpc` families; no workflow trigger family mount appears in anchor runtime wiring | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:340`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:350`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:360`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:370` |
| Root contract composition is package-owned (`coordination`, `state`) | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:5` |
| Coordination boundary contract is package-local and TypeBox-backed via `typeBoxStandardSchema(...)` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:31` |
| State boundary contract is package-local and TypeBox-backed | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/state/src/orpc/contract.ts:67`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/state/src/orpc/contract.ts:76` |
| Host creates one Inngest bundle and injects runtime/client into oRPC handler wiring | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:105`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:117` |
| Inngest function uses `step.run(...)` boundaries for durable state transitions | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:253`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:298`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:333` |
| Tests verify RPC + OpenAPI success paths and `/api/inngest` presence, but do not enforce caller-path negative-route assertions | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:18`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:32`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/rawr.test.ts:57` |
| Contract drift test snapshots only coordination/state route set | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/test/orpc-contract-drift.test.ts:34` |

## Aligned / Divergent / Non-Overlap Matrix (vs Packet Decisions)

| Decision | Packet target-state checkpoint | Runtime reality (anchor evidence) | Classification |
| --- | --- | --- | --- |
| D-005 | Manifest-driven `/api/workflows/<capability>/*`; `/api/inngest` runtime-only; no default `/rpc/workflows` | Runtime mounts `/api/inngest`, `/rpc`, `/api/orpc` only in examined host/router wiring; no capability workflow trigger route family in scope anchors | **Divergent** |
| D-006 | Workflow/API boundary contracts plugin-owned | Root router composes package contracts (`coordination`, `state`) and package-local boundary contracts back the API surface | **Divergent** |
| D-007 | Caller transport/publication split fixed by route family | Runtime transport surfaces exist (`/rpc`, `/api/orpc`, `/api/inngest`), but examined server tests treat RPC and OpenAPI as equally callable and do not validate forbidden caller paths | **Divergent** |
| D-008 | Baseline `extendedTracesMiddleware()` first; explicit mount/control order | `/api/inngest` mounted before oRPC families (aligned part), but no baseline `extendedTracesMiddleware()` bootstrap appears in examined runtime anchors | **Divergent** |
| D-011 | Procedure I/O schemas co-located with procedures/contracts; domain stays transport-neutral | I/O schemas are contract-local and TypeBox-backed in `coordination` and `state` contracts | **Aligned** |
| D-012 | Inline-I/O posture for docs/examples with extraction exceptions | This is a documentation authoring lock; runtime code inventory does not materially exercise this policy surface | **Non-overlap** |
| D-013 | Manifest-first runtime semantics (`rawr.kind`, `rawr.capability`, `rawr.hq.ts` authority) | Examined runtime wiring is explicit code composition and does not show manifest-owned route composition semantics in anchor files | **Divergent** |
| D-014 | Package-owned transport-neutral infrastructure; host owns adapter wiring + injection | Host creates runtime adapter and injects dependencies into route registration; coordination runtime adapter remains package-owned seam | **Aligned** |
| D-015 | Canonical harness matrix + mandatory negative-route assertions | Tests cover positive RPC/OpenAPI paths and ingress existence, but no required caller-path negative-route assertions are present in anchor tests | **Divergent** |

## Non-Overlap Code Inventory (Current Runtime vs Packet Target-State)

1. Package-root ORPC aggregation centered on coordination/state: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:5`.
2. Package-owned coordination boundary contract surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:22`.
3. Package-owned state boundary contract surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/state/src/orpc/contract.ts:67`.
4. Host runtime route spine centered on `/api/inngest` + `/rpc` + `/api/orpc` only: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:111`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:340`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:360`.
5. Test harness lock-in to current package route set: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/test/orpc-contract-drift.test.ts:34`.

## Assumptions

1. This assessment is bounded to the requested anchors plus packet authority docs (`DECISIONS.md`, `ARCHITECTURE.md`) and does not claim full-repo route/auth coverage outside those boundaries.
2. Classification uses packet locks as normative target-state and current anchor runtime files/tests as implementation reality.
3. Absence claims (for example manifest-owned workflow trigger route composition) are constrained to examined anchors, not a global guarantee for every file in the repository.

## Risks

1. **Route-policy drift risk:** Current runtime surface lacks the packet’s manifest-driven workflow trigger route family, so downstream clients/docs can diverge from executable reality.
2. **Ownership drift risk:** Package-owned boundary contracts can harden against the plugin-owned boundary ownership target, increasing migration cost.
3. **Caller-boundary regression risk:** Missing negative-route assertions allows accidental exposure/regression across `/rpc`, `/api/orpc`, and `/api/inngest` caller classes.
4. **Observability contract risk:** Missing explicit baseline traces bootstrap in host wiring can violate trace continuity expectations set by packet D-008.

## Unresolved Questions

1. Is this worktree intentionally representing a pre-migration runtime baseline, or is it expected to already satisfy packet D-005/D-006/D-013 target-state semantics?
2. Where is canonical manifest composition (`rawr.hq.ts` / `rawrHqManifest`) expected to be generated and consumed in the live runtime path?
3. Which module is the authoritative caller/auth enforcement layer for distinguishing first-party `/rpc` vs external OpenAPI callers?
4. Should contract drift tests evolve to include packet-required workflow trigger route families and mandatory forbidden-route assertions from D-015?
