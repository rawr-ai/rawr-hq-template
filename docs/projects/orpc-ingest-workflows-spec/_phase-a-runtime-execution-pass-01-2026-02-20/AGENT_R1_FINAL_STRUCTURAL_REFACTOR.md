# AGENT R1 Final Structural Refactor

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`

## Scope Completed
- Updated RPC handler tests to use first-party caller-surface headers on `/rpc` requests.
- Replaced plugin-local workspace discovery implementation with a thin adapter to package-owned `@rawr/hq/workspace`.
- Replaced plugin-local install-state implementation with thin re-exports from package-owned `@rawr/hq/install`.
- A7 micro-fix: removed parser symbol leakage from the plugin workspace shim export surface.
- A7 micro-fix: updated static boundary assertion to validate adapter forwarding shape instead of parser symbol presence.

## Evidence Map
- ORPC caller-surface policy allow/deny sets: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L45`
- Test contract now sends first-party RPC headers: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts#L8`
- RPC request in listWorkflows test uses hardened header surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts#L28`
- RPC request in validation-failure test uses hardened header surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts#L47`
- Plugin workspace adapter delegates only workspace discovery API to package authority (no parser export): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts#L1`
- Plugin install-state adapter delegates to package authority: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts#L1`
- Canonical package-owned workspace implementation authority: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts#L5`
- Canonical package-owned install-state implementation authority: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/install/state.ts#L6`
- Boundary matrix static adapter assertion shape: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts#L256`

## Assumptions
- `first-party` is an accepted internal caller-surface for `/rpc` parity with current boundary policy.
- Package-owned `@rawr/hq/workspace` and `@rawr/hq/install` are the correct long-term authorities for these surfaces.
- Static boundary checks can validate adapter forwarding semantics without requiring parser symbol leakage from plugin shim exports.

## Risks
- `findWorkspaceRoot` fallback module-location behavior now depends on package module location (`@rawr/hq/workspace`) rather than plugin-local file location; current tests pass, but edge install layouts could differ.
- Static text assertions in boundary tests can still be brittle if adapter internals are refactored without behavior changes.

## Unresolved Questions
- None specific to the A7 micro-fix.

## Commands And Results
1. `bunx vitest run --project server apps/server/test/orpc-handlers.test.ts apps/server/test/orpc-openapi.test.ts apps/server/test/rawr.test.ts apps/server/test/route-boundary-matrix.test.ts`
   - Initial run: failed 1 test (`route-boundary-matrix` static parser-contract assertion).
   - After explicit parser re-export in adapter: passed (4 files, 21 tests).
2. `bunx vitest run --project plugin-plugins plugins/cli/plugins/test/workspace-plugins-discovery.test.ts plugins/cli/plugins/test/install-state.test.ts`
   - Passed (2 files, 7 tests).
3. `bunx tsc -p plugins/cli/plugins/tsconfig.json --noEmit`
   - Passed (no type errors).
4. `bun run phase-a:gates:exit`
   - Passed (completion + legacy metadata hard-delete static guard chain completed successfully).
5. `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts`
   - Passed (1 file, 6 tests).
6. `bunx vitest run --project plugin-plugins plugins/cli/plugins/test/workspace-plugins-discovery.test.ts`
   - Passed (1 file, 2 tests).
7. `bun run phase-a:gate:harness-matrix`
   - Passed (required suite IDs + negative assertion keys verified).
