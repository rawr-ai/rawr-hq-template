# Agent 2 Final: F2 Interface/Policy Hardening

## Outcome
1. Landed F2 interface/policy hardening with additive contract posture.
2. Preserved invariant families (route-family, manifest-authority, channel semantics, architecture topology).
3. Tightened coordination ID policy at type + schema + runtime seam layers.
4. Added additive state contract seam field (`authorityRepoRoot`) for F1/F2 authority observability.
5. Resolved one typecheck blocker in `@rawr/coordination-observability` using a strict type-safe local widening (no `any`/`unknown`).

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`

## Implementation Summary
1. **Centralized coordination ID policy constants + normalization** in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/ids.ts`.
2. **Threaded coordination ID aliasing through public coordination types** in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/types.ts`.
3. **Encoded ID policy in TypeBox schemas** with separate persisted-ID vs input-ID patterns in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts`.
4. **Maintained contract topology** (`/coordination/*`, `/state/runtime`) and operation IDs unchanged.
5. **Added additive state output field** `authorityRepoRoot?: string` in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts` and emitted from runtime router.
6. **Hardened contract drift tests** to validate schema behavior through the existing `typeBoxStandardSchema` path rather than runtime schema casts.
7. **Fixed typecheck blocker** at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-observability/src/events.ts` by widening the local include set type.

## Evidence Map
1. Invariant lock context: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:11`
2. F2 target map: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_SCRATCHPAD.md:19`
3. ID policy constants + normalization: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/ids.ts:1`
4. ID normalization exported for runtime seams: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/ids.ts:11`
5. Coordination ID type aliasing across domain types: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/types.ts:31`
6. ID alias usage in workflow/run/event contracts: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/types.ts:65`
7. Persisted ID schema constraints: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:35`
8. Input ID schema (trim-compatible): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:41`
9. ID policy wired into workflow/run/timeline input schemas: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:251`
10. Additive state output field: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:25`
11. Runtime state output wiring (`authorityRepoRoot`): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/runtime-router.ts:275`
12. Runtime ID normalization seam usage: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/runtime-router.ts:48`
13. HQ contract drift assertions (ID policy + additive state output): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/orpc-contract-drift.test.ts:117`
14. Trigger contract drift assertions (ID policy + finalization schema availability): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/workflow-trigger-contract-drift.test.ts:114`
15. Typecheck blocker fix (`includes` union inference): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-observability/src/events.ts:60`

## Assumptions
1. F2 may include additive observability metadata on existing state contract responses.
2. Trim-compatible input ID acceptance is additive and compatible with existing runtime normalization behavior.
3. Typecheck blocker remediation is in-scope when introduced/exposed by F2 interface/type deltas and required verification includes full repository typecheck.

## Risks
1. Optional `authorityRepoRoot` can be over-relied on by downstream callers without null-safe handling.
2. Future schema additions could bypass centralized ID constants and reintroduce drift.
3. Contract tests currently validate schema behavior at adapter-validation level; consumer integrations should still exercise full handler/runtime paths.

## Unresolved Questions
1. Should `authorityRepoRoot` be documented as a supported diagnostics field in canonical external docs during F6 cleanup?
2. Should coordination event IDs (`eventId`) also be brought under explicit policy constants in a follow-up hardening pass?

## Executed Verification Commands and Outcomes
1. `bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts packages/core/test/workflow-trigger-contract-drift.test.ts`
- Outcome: pass (`2` files, `9` tests)
2. `bunx vitest run --project core packages/core/test/runtime-router.test.ts`
- Outcome: pass (`1` file, `3` tests)
3. `bun run typecheck`
- Outcome: pass (`turbo run typecheck`, `19` successful tasks / `19` total)
