# AGENT_2_FINAL_PHASE_F_INTERFACES_AND_FILE_MAP

## Interface and Ownership Map

| Surface | Default owner | Canonical files | Public contract sensitivity |
| --- | --- | --- | --- |
| Manifest composition authority | `@rawr-runtime-host` | `rawr.hq.ts`, `apps/server/src/rawr.ts` | High |
| Route-family mount semantics | `@rawr-runtime-host` | `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts` | High |
| RPC auth classification | `@rawr-runtime-host` | `apps/server/src/auth/rpc-auth.ts` | Medium-High |
| Request context + dedupe policy | `@rawr-runtime-host` | `apps/server/src/workflows/context.ts` | Medium-High |
| HQ/workflow contract assembly | `@rawr-runtime-host` | `packages/core/src/orpc/hq-router.ts`, `packages/core/src/orpc/runtime-router.ts` | High |
| Coordination public types | `@rawr-runtime-host` + `@rawr-architecture-duty` for policy deltas | `packages/coordination/src/types.ts` | High |
| Coordination schema/contract | `@rawr-runtime-host` + `@rawr-architecture-duty` for policy deltas | `packages/coordination/src/orpc/schemas.ts`, `packages/coordination/src/orpc/contract.ts` | High |
| State schema/contract | `@rawr-runtime-host` + `@rawr-architecture-duty` for policy deltas | `packages/state/src/types.ts`, `packages/state/src/orpc/contract.ts` | High |
| Inngest adapter interface | `@rawr-runtime-host` | `packages/coordination-inngest/src/adapter.ts` | Medium-High |
| Verification script chain | `@rawr-verification-gates` | `scripts/phase-*`, `package.json` | Medium |

## Slice Path Boundaries (Template)

### F1 Runtime Core
- Allow: `rawr.hq.ts`, `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`, `apps/server/src/workflows/context.ts`, `apps/server/src/auth/rpc-auth.ts`, `packages/core/src/orpc/runtime-router.ts`, runtime behavior tests.
- No-touch: `packages/coordination/src/orpc/*`, `packages/state/src/orpc/*`, `package.json` phase scripts, decision docs.

### F2 Interface/Policy Hardening
- Allow: `packages/coordination/src/types.ts`, `packages/coordination/src/orpc/schemas.ts`, `packages/coordination/src/orpc/contract.ts`, `packages/state/src/types.ts`, `packages/state/src/orpc/contract.ts`, related drift tests.
- No-touch: route composition code except minimal contract wiring, verifier script chain, decision docs.

### F3 Structural Evidence/Gates
- Allow: `scripts/phase-f/*`, selected `scripts/phase-a/*` gate surfaces, `package.json`, gate-focused tests.
- No-touch: runtime behavior files in `apps/server/src/*` and domain runtime adapters.

### F4 Decision Closure/Disposition
- Allow: `DECISIONS.md`, relevant axes docs, `F4_DISPOSITION.md`, conditional `F4_TRIGGER_EVIDENCE.md`.
- No-touch: runtime code and verifier implementations.

### F5 Review/Fix
- Allow: only files already touched in F1-F4 plus `F5_REVIEW_DISPOSITION.md`.
- No-touch: net-new feature surfaces.

### F5A Structural
- Allow: naming/boundary/duplication refactors in already touched files plus `F5A_STRUCTURAL_DISPOSITION.md`.
- No-touch: architecture/topology changes.

### F6 Docs/Cleanup
- Allow: canonical docs + cleanup manifest.
- No-touch: runtime code, scripts, contract code.

### F7 Readiness/Handoff
- Allow: readiness/report/handoff artifacts.
- No-touch: runtime code and gate scripts.

## Likely Public API / Interface / Type Delta Zones
1. Manifest shape and host composition exports.
2. Route-family registration semantics and caller boundary behavior.
3. oRPC contract topology (paths/operation IDs/procedures).
4. Coordination and state exported TypeScript types.
5. TypeBox schemas in contract surfaces.
6. Runtime adapter interface and finished-hook policy shape.
7. RPC auth policy/classification types.
8. Phase script IDs/chains in `package.json`.

## Declaration Requirements for Any Zone Above
1. Explicit declaration in `PHASE_F_EXECUTION_PACKET.md` and `PHASE_F_IMPLEMENTATION_SPEC.md`.
2. Compatibility/migration note.
3. Structural verifier and runtime test coverage update.
4. Review/fix confirmation in F5 disposition.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:27`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:34`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:30`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:35`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:78`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:59`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:174`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:273`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts:12`
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:227`
11. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:58`
12. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/runtime-router.ts:32`
13. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/contract.ts:22`
14. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:67`
15. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json:75`

## Assumptions
1. F2 is the only slice allowed to change public interface/schema/type contracts.
2. F3 can evolve gate chains without runtime behavior edits.
3. F4 is docs/disposition-only.

## Risks
1. File overlap in `apps/server/src/orpc.ts` and `packages/core/src/orpc/runtime-router.ts` if boundaries are not enforced.
2. Undeclared contract deltas can leak through runtime slices.
3. Gate-chain drift in `package.json` can cause false-green exits.

## Unresolved Questions
1. Exact runtime capability/theme targeted for F1.
2. Whether any public route/operation changes are intended in Phase F.
3. Whether F4 will evaluate new decision IDs beyond D-004.
