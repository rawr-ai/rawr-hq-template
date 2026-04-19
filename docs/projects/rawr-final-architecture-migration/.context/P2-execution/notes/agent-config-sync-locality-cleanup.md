# Agent Config Sync Locality Cleanup Scratchpad

## Scope

- Branch/worktree: `agent-service-module-ownership-hardening` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`.
- Edit scope: `services/agent-config-sync/**` and `scripts/phase-03/verify-agent-config-sync-service-shape.mjs`.
- Rule: no `*-host` packages; service modules own behavior; `service/shared/**` is only for proven cross-module primitives/resources/errors.

## Shared File Matrix

| Current file | Actual consumers | Classification | Destination / action |
| --- | --- | --- | --- |
| `service/shared/README.md` | Structural verifier only. | keep shared | Update to state the narrow allowlist and module ownership rule. |
| `service/shared/errors.ts` | No runtime consumers; reserved shared ORPC boundary error seam. | keep shared | Keep as allowed shared error seam, but verifier should reject shared dumping-ground files. |
| `service/shared/internal-errors.ts` | No current runtime consumers. | keep shared | Keep as allowed shared internal error seam matching `example-todo`. |
| `service/shared/resources.ts` | `service/base.ts`, service modules via repo providers, test helpers, plugin resource type import through package root. | keep shared | Keep as the only service-wide resource contract. |
| `service/shared/schemas.ts` | Planning/execution contracts and module types; package `./schemas` public type imports from plugin CLI. | split | Keep cross-module/public sync-domain value objects: source plugin/content, agent/scope, item/target/run result. Move planning-only assessment/target/skip selection schemas and types into `modules/planning/schemas.ts`. Delete unused `SyncPolicy`. |
| `service/shared/internal/source-scope.ts` | Planning assessment scope filtering and retirement stale-managed scope filtering; plugin CLI has its own copy. | keep shared | Keep as the only allowed shared internal primitive because planning and retirement both truly need identical scope semantics. Update imports to use shared schemas directly instead of `shared/internal/types`. |
| `service/shared/internal/types.ts` | Only shared internal helpers. | delete | Replace with module-local types/imports. |
| `service/shared/internal/effective-content.ts` | `shared/internal/sync-engine.ts`; plugin CLI has its own host-resource copy. | move to module | Move to `modules/execution/effective-content.ts`; execution owns provider overlay merge before target apply/preview runs. |
| `service/shared/internal/registry-codex.ts` | `shared/internal/sync-engine.ts` only. | move to module | Move to `modules/execution/registry-codex.ts`; Codex registry claim/upsert semantics are execution sync semantics. |
| `service/shared/internal/marketplace-claude.ts` | `shared/internal/sync-engine.ts`; `retire-stale-managed.ts` reads sync manifest only. | split | Move upsert/write/read helpers to `modules/execution/marketplace-claude.ts`; duplicate the small read-manifest helper in retirement so retirement does not import execution. |
| `service/shared/internal/sync-engine.ts` | Planning repository for dry-run preview/assessment and execution repository for apply. | split | Move engine to `modules/execution/sync-engine.ts`; planning may call the same engine with forced dry-run until a later planner/apply decomposition, but no sync engine remains in shared. |
| `service/shared/internal/retire-stale-managed.ts` | Retirement repository only. | move to module | Move to `modules/retirement/retire-stale-managed.ts`; use shared `source-scope` and local Claude manifest reader. |
| `service/shared/internal/sync-undo.ts` | Undo repository and package root public exports. | move to module | Move to `modules/undo/sync-undo.ts`; package root re-exports undo capsule helpers from the undo module. |

## Module Provider Style

- Current violation: `modules/*/module.ts` imports `createRepository` and constructs repository providers inline.
- Target: each module `middleware.ts` imports `createServiceProvider` and exports `repository`; each `module.ts` composes `observability`, `analytics`, `repository`, then maps `context.provided.repo` into handler context.
- Applies to planning, execution, retirement, and undo.

## Verifier Updates

- Fail if any file remains under `services/agent-config-sync/src/service/shared/internal/**` except `source-scope.ts`.
- Fail if `service/shared/schemas.ts` contains planning-only schemas/types: `TargetHomes`, `WorkspaceSkip`, `SyncAgentSelection`, `SyncPolicy`.
- Fail if module repositories import from `../../shared/internal/`.
- Fail if module `module.ts` imports `createRepository` or calls `createRepository(`.
- Require each module `middleware.ts` to import/use `createServiceProvider`.
- Require each module `module.ts` to import `repository` from `./middleware`, call `.use(repository)`, and map `context.provided.repo`.
- Continue host-package and runtime-forwarding ratchets.

## Behavioral Proof

- `bunx nx run @rawr/agent-config-sync:typecheck --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache`
- `bunx nx run @rawr/agent-config-sync:build --skip-nx-cache`

Pass criteria:

- Typecheck confirms moved symbols and package exports.
- Tests confirm preview/apply and stale retirement behavior are unchanged.
- Structural verifier confirms no shared junk and module-provider style.
- Build confirms package output from new module-local files.
