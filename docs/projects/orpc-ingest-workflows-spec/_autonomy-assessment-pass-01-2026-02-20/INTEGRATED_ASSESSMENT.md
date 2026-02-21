# Integrated ORPC + Inngest Autonomy Assessment

Date: 2026-02-20
Scope: Packet + current runtime reality + autonomy-readiness implications.

## Integration Inputs
1. Agent A packet-integrity analysis.
2. Agent B runtime delta map.
3. Agent C API/context assessment.
4. Agent D domain/authority assessment.
5. Agent E system risk/failure-mode analysis.
6. Agent F alternatives analysis.

## Cross-Agent Arbitration Log
1. D-011 alignment disagreement (`aligned` in Agent B vs ambiguity in Agent A/C):
   Decision: split into two claims.
   - Schema placement is aligned.
   - Request-context envelope enforcement is divergent.
2. D-008 disagreement (`packet drift` in Agent A vs runtime divergence in Agent B/E):
   Decision: both are true.
   - Packet examples have local drift risk.
   - Runtime host path does not show baseline traces bootstrap enforcement in assessed anchors.
3. “Right shape” disagreement risk (`too much change` vs `needed architecture`):
   Decision: target shape is directionally correct, but current migration posture is under-specified and under-guarded.

## Canonical Evidence Matrix

| claim | proposal_source | runtime_source | alignment_status | impact | confidence |
| --- | --- | --- | --- | --- | --- |
| D-005 requires manifest-driven `/api/workflows/<capability>/*` with `/api/inngest` runtime-only and `/rpc` internal-only. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:13`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:49`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:78` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:111`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:339`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:359` | divergent | high | 0.96 |
| D-006 requires plugin-owned boundary contracts for API/workflows. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:25`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:50` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/src/orpc/hq-router.ts:5`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:22` | divergent | high | 0.94 |
| D-007 caller/publication boundaries require explicit forbidden-route behavior. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:39`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:64`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:119` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:18`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/rawr.test.ts:57` | divergent | high | 0.93 |
| D-008 requires explicit baseline traces bootstrap + mount order. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:147`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:52` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:111` | divergent | high | 0.82 |
| D-011 procedure I/O schema ownership is boundary-local and transport-neutral. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:55`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:92` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination/src/orpc/contract.ts:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/state/src/orpc/contract.ts:76` | aligned | medium | 0.92 |
| Axis-04 requires per-request boundary context envelopes with correlation/principal metadata contracts. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md:21`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:106` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:314`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:343` | divergent | high | 0.92 |
| D-013 requires runtime semantics by `rawr.kind` + `rawr.capability` and manifest registration only. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:86`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md:19` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:10`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:124`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts:107` | divergent | high | 0.98 |
| Target plugin roots include `plugins/api/*` and `plugins/workflows/*` as runtime-first surfaces. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/SYSTEM.md:79`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:22` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:81`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/hq/src/workspace/plugins.ts:84` | divergent | high | 0.97 |
| D-014 package-first infrastructure + host-owned injection seams are active in current runtime. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:107`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:108` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/rawr.ts:113`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:123` | aligned | medium-high | 0.93 |
| D-015 requires route-aware harness matrix + mandatory negative-route assertions. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:127`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:25`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md:123` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/test/orpc-handlers.test.ts:22`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/core/test/orpc-contract-drift.test.ts:34` | divergent | high | 0.95 |
| Queue idempotency currently uses process-local lock map, not shared idempotency boundary. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:24` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:25`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/packages/coordination-inngest/src/adapter.ts:136` | divergent | high | 0.88 |
| Queue failure path can swallow persistence failures while returning only upstream queue failure. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md:26` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:216`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:229`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/apps/server/src/orpc.ts:233` | divergent | medium-high | 0.89 |
| D-015 parity contract says DECISIONS wording should be validated “verbatim”, but downstream execution order still includes “Add D-015 in DECISIONS.md.” | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:34`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:125` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md:174` | divergent | medium | 0.96 |
| Template vs personal operational ownership introduces a governance handshake requirement for API/workflow plugin rollout. | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/AGENTS_SPLIT.md:63`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/AGENTS_SPLIT.md:65` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:71`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/system/PLUGINS.md:73` | non-overlap | medium-high | 0.85 |

## Axis Scoring
Scale: 1 (weak) to 5 (strong).

| Axis | Score | Why |
| --- | --- | --- |
| Solution design | 3.8 | Target shape is coherent and autonomy-oriented; migration mechanics and enforcement sequencing are under-specified in runtime. |
| System design | 3.1 | Split control planes are correct, but runtime route/caller enforcement and distributed idempotency are not yet hardened. |
| Domain design | 3.0 | Target authority model is strong; current tooling keeps legacy overlaps and duplicated ownership in plugin lifecycle code. |
| API design | 3.3 | Contract-first substrate is strong; caller-path guardrails and external publication filtering are not fully enforced in current tests/runtime. |
| TypeScript/context design | 3.0 | Type-level contract quality is good; request-scoped context envelope requirements are not fully represented in runtime context creation. |
| Team design for autonomy | 2.9 | Team boundaries are spec’d, but control-plane/tooling ownership and template vs personal promotion handshake are not yet operationalized. |

## Scenario Validation

1. Route semantics scenario:
- Packet expects `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest` with strict persona boundaries.
- Runtime anchors currently mount `/rpc`, `/api/orpc/*`, `/api/inngest`; capability workflow route family is not mounted in assessed host wiring.
- Current tests assert positive success paths, not required forbidden-route assertions.

2. Metadata migration scenario:
- Packet D-013 target is explicit (`rawr.kind` + `rawr.capability` + manifest authority).
- Runtime lifecycle tooling still parses and enforces legacy metadata (`templateRole/channel/publishTier`) and filters operational behavior with it.

3. Context propagation scenario:
- Packet requires split envelopes and ingress-created request context.
- Runtime oRPC registration currently constructs a static process-level context object reused across requests.

4. Autonomous extension scenario:
- Target expects new capability surfaces to land via manifest and canonical plugin roots.
- Discovery/tooling only scans `plugins/cli`, `plugins/agents`, `plugins/web`; `plugins/api` and `plugins/workflows` are outside default scan roots.
- This blocks “agent adds capability end-to-end without human glue” in current operational tooling.

5. Blast-radius scenario (D-015 downstream docs/runbook lifecycle):
- Packet explicitly defers downstream docs/runbook updates.
- Execution contract is detailed, but includes one stale step and a wording parity inconsistency that should be cleaned before execution handoff.

## High-Level Assessment

### Did we choose the right shape?
Conditional yes.
- Yes for target architecture: split ORPC boundary + Inngest durability + manifest-first composition is the right long-run shape for autonomous extensibility.
- Not yet as implemented reality: today’s runtime/control-plane is still a coordination-centric, legacy-metadata, partial-route posture.

### Is there a simpler way?
Yes.
- A conservative path can stabilize current routes and harden D-013 metadata semantics + D-015 tests without adding capability workflow routes immediately.
- Tradeoff: lower near-term risk, but leaves long-term topology mismatch and autonomy ceiling.

### Is there a more robust way?
Yes.
- A robust path is manifest-first cutover with strict capability routes, strict metadata contract enforcement, strict caller-path gates, and full route-persona negative tests.
- Tradeoff: higher migration blast radius and delivery friction unless staged with explicit rollback gates.

### What gets us first?
1. Route/caller-policy drift (`/api/inngest` and `/rpc` misuse not blocked by tests).
2. Legacy metadata continuing to drive operational behavior.
3. Plugin discovery/model not including API/workflow surfaces.
4. Cross-instance duplicate enqueue risk (process-local idempotency lock).
5. Context envelope drift (policy says per-request; runtime uses static context object).

## Integrated Recommendation
Use a bounded bridge plan (balanced path):
1. Phase 0: define hard gates and ownership map.
2. Phase 1: enforce D-013 semantics in tooling with temporary compatibility reads.
3. Phase 2: add capability workflow route family and manifest-driven composition additively.
4. Phase 3: enforce full D-015 harness matrix with mandatory negative-route assertions; remove compatibility shims.

This preserves reversibility while converging to target shape.
