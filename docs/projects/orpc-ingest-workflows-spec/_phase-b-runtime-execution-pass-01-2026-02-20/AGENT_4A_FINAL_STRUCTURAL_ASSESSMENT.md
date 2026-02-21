# Agent 4A Final Structural Assessment

## Outcome
Improvements were warranted and implemented. Scope stayed architecture-conservative (no route topology, authority, or policy changes).

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`

## Evidence Map
1. **High duplication in AST utility logic across Phase A verification scripts**
   - Evidence:
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/manifest-smoke.mjs:5`
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs:5`
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-harness-matrix.mjs:5`
   - Risk: drift between nearly identical traversal/parsing helpers can produce false-greens/false-reds in structural gates.
   - Action: extracted shared helpers into:
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/ts-ast-utils.mjs:1`
   - Result: script modules now focus on gate intent; shared AST logic has one owner.

2. **Naming ambiguity in gate scaffold dispatch (`gate` / `checkMap`)**
   - Evidence:
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs:20`
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs:249`
   - Risk: weaker domain signaling around “gate ID” semantics.
   - Action: renamed to `gateId` and `gateChecksById`.

3. **Server gate test AST checks were less resilient to wrapped expressions**
   - Evidence:
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/phase-a-gates.test.ts:19`
     - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/phase-a-gates.test.ts:100`
   - Risk: fragile structural assertions when code introduces `as`/parenthesized/satisfies wrappers.
   - Action: added `unwrapExpression`, normalized chain matching, and aligned function naming to `hasRegisterOrpcRoutesManifestRouter`.

## Implemented Changes
- Added:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/ts-ast-utils.mjs`
- Refactored to consume shared AST helpers:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/manifest-smoke.mjs`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/scripts/phase-a/verify-harness-matrix.mjs`
- Test clarity/robustness pass:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/phase-a-gates.test.ts`

## Validation (Commands + Results)
1. `bun scripts/phase-a/manifest-smoke.mjs --mode=baseline`
   - Result: `manifest-smoke (baseline) passed.`
2. `bun scripts/phase-a/manifest-smoke.mjs --mode=completion`
   - Result: `manifest-smoke (completion) passed.`
3. `bun scripts/phase-a/verify-gate-scaffold.mjs metadata-contract`
   - Result: `Gate scaffold check passed: metadata-contract`
4. `bun scripts/phase-a/verify-gate-scaffold.mjs import-boundary`
   - Result: `Gate scaffold check passed: import-boundary`
5. `bun scripts/phase-a/verify-gate-scaffold.mjs host-composition-guard`
   - Result: `Gate scaffold check passed: host-composition-guard`
6. `bun scripts/phase-a/verify-gate-scaffold.mjs route-negative-assertions`
   - Result: `Gate scaffold check passed: route-negative-assertions`
7. `bun scripts/phase-a/verify-gate-scaffold.mjs observability-contract`
   - Result: `Gate scaffold check passed: observability-contract`
8. `bun scripts/phase-a/verify-gate-scaffold.mjs telemetry --optional`
   - Result: optional non-blocking path + pass
9. `bun scripts/phase-a/verify-harness-matrix.mjs`
   - Result: required suites + negative assertions verified (pass)
10. `bunx vitest run apps/server/test/phase-a-gates.test.ts`
   - Result: `1` file passed, `3` tests passed

## Assumptions
- AST helper extraction in `scripts/phase-a` is an allowed non-architectural refactor under B4A.
- Existing gate semantics are the source of truth; this pass should improve maintainability, not alter policy.
- No cross-surface contract should be changed by this slice.

## Risks
- Shared helper module becomes a coupling point for script checks. Mitigation: helper scope intentionally limited to AST plumbing, not policy decisions.
- Future script-specific edge cases may tempt over-generalization in `ts-ast-utils.mjs`. Mitigation: keep helpers primitive and domain-agnostic.

## Unresolved Questions
1. Should `apps/server/test/phase-a-gates.test.ts` and script checks eventually share a single package-level AST helper for full consistency, or remain intentionally decoupled between runtime scripts and test code?
2. Do we want a follow-up B4A micro-pass that trims unused helper exports in `ts-ast-utils.mjs` as script surfaces stabilize?
