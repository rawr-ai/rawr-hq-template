# HQ Ops Host Package Removal Mini Plan

Branch: `agent-HQOPS-remove-host-package`
Parent: `agent-ORCH-service-resource-remediation-docs`
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-HQOPS-remove-host-package`

## Current Violations Found

- `@rawr/hq-ops-host` exists as a service-specific host package at `packages/hq-ops-host`, which violates the governing correction: no service-specific `*-host`, runtime, adapter, or dumping-ground packages.
- Active consumers import `createNodeHqOpsBoundary` from `@rawr/hq-ops-host` in `apps/server/src/host-satisfiers.ts`, `apps/cli/src/lib/hq-ops-client.ts`, and `plugins/cli/plugins/src/lib/hq-ops-client.ts`.
- `apps/cli/package.json`, `apps/server/package.json`, `plugins/cli/plugins/package.json`, root scripts, `vitest.config.ts`, and `bun.lock` still register or depend on `@rawr/hq-ops-host`.
- `packages/hq-ops-host` owns or duplicates service behavior: config validation/load/merge/global source mutation, repo-state authority-root resolution/locking/mutation policy, journal indexing/search/semantic ranking, and security finding parsing/report/gate policy.
- `services/hq-ops` already has the canonical module shell, but module repositories currently forward to high-level behavior ports (`configStore`, `repoStateStore`, `journalStore`, `securityRuntime`) instead of owning the behavior behind the service boundary.
- Existing structural ratchets bless the bad abstraction: `scripts/phase-03/verify-hq-ops-host-placement.mjs`, `scripts/phase-c/verify-storage-lock-contract.mjs`, `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`, and `apps/server/test/phase-a-gates.test.ts` explicitly expect the host package.
- `apps/server/test/repo-state-store.concurrent.test.ts` imports repo-state behavior directly from `@rawr/hq-ops-host`; that proof should move to the owning service or exercise the service client.

## Behavior That Stays Or Moves Into `services/hq-ops`

- Config module owns `RawrConfigV1` schema, validation, normalization, defaulting, layered merge semantics, workspace/global load semantics, and global sync source mutation semantics.
- Repo-state module owns state shape, default state, authority-root policy, normalization, lock acquisition/reclaim rules, local mutation queue, atomic write policy, enable/disable plugin transitions, and canonical/alias root behavior.
- Journal module owns event/snippet schemas, canonical `.rawr/journal` layout policy, JSON source-of-truth behavior, SQLite index schema and FTS query semantics, semantic search candidate/ranking/cache semantics, and fallback behavior when indexing/search resources fail.
- Security module owns secret pattern catalog, finding normalization/sort/summary, audit/untrusted output parsing, risk-tolerance gate policy, report truncation policy, and report persistence semantics.
- Repositories should become service-owned implementations over narrow concrete resources, not wrappers around same-named host/runtime methods.
- Module schemas remain module-local; `service/shared/*` stays limited to earned cross-module primitives/errors and typed resource contracts required by multiple HQ Ops modules.

## Concrete Resources To Provide From Apps/Plugins

- `apps/server`, `apps/cli`, and `plugins/cli/plugins` each get local HQ Ops resource/boundary factories. These factories replace `createNodeHqOpsBoundary`; no shared replacement package is created.
- Local factories provide logger and analytics adapters as they do today through `@rawr/hq-sdk` placeholder host adapters.
- Local factories provide raw filesystem/path/home resources needed by config, repo-state, journal, and security report persistence. New concrete runtime code should prefer stable Bun-native APIs such as `Bun.file`, `Bun.write`, and `Bun.Glob`; Node compatibility APIs are acceptable only where the current stack requires them.
- Local factories provide process resources needed by repo-state/security: process id/liveness checks and bounded command execution for `git`, `bun audit`, and `bun pm untrusted`. Prefer `Bun.spawn` for new command execution.
- Local factories provide SQLite opening for journal indexing. Prefer `bun:sqlite`; keep a compatibility fallback only if tests show this repo still needs Node-shaped SQLite execution.
- Local factories provide embedding/env-derived configuration for semantic journal search. The service should receive an explicit embedding provider/config resource rather than reading `process.env` directly.

## `@rawr/hq-ops-host` Imports, Deps, And Files To Remove

- Delete `packages/hq-ops-host/**`.
- Remove `@rawr/hq-ops-host` from `apps/cli/package.json`, `apps/server/package.json`, `plugins/cli/plugins/package.json`, `bun.lock`, root `build`/`typecheck`/`pretest:vitest` project lists, and `vitest.config.ts`.
- Replace imports in:
  - `apps/server/src/host-satisfiers.ts`
  - `apps/cli/src/lib/hq-ops-client.ts`
  - `plugins/cli/plugins/src/lib/hq-ops-client.ts`
  - `apps/server/test/repo-state-store.concurrent.test.ts`
- Remove or invert `@rawr/hq-ops-host` expectations in `apps/server/test/phase-a-gates.test.ts` and hq-ops structural scripts.
- Keep `@rawr/hq-ops` service-client imports in sanctioned app/plugin binding sites; the service package remains the capability boundary.

## Structural Ratchets To Update Or Add

- Replace `verify-hq-ops-host-placement.mjs` with an hq-ops resource-binding verifier that fails if `packages/hq-ops-host` exists, `@rawr/hq-ops-host` appears in non-generated source/package files, root scripts include `@rawr/hq-ops-host`, or Vitest/Nx still registers an hq-ops-host project.
- Update `run-structural-suite.mjs` so `@rawr/hq-ops` runs the new no-host/resource-binding verifier; remove the `@rawr/hq-ops-host` project suite.
- Update `verify-hq-ops-service-shape.mjs` to ratchet service-owned resource contracts and reject high-level behavior deps like `configStore`, `repoStateStore`, `journalStore`, and `securityRuntime` if they survive as forwarding-only runtime verbs.
- Update phase C/F repo-state verifiers to inspect service-owned repo-state implementation and service/client behavioral tests instead of `packages/hq-ops-host/src/repo-state-store.ts`.
- Add a forwarding-only repository guard for `services/hq-ops/src/service/modules/**/repository.ts`: repositories must implement service behavior over concrete resources, not just `return await runtime.sameName(...)`.
- Add or extend a host-package scan that rejects `packages/hq-ops-host`/`@rawr/hq-ops-host` immediately. A repo-wide `packages/*-host` ban may need an allowlist until the sibling `agent-config-sync` and `session-intelligence` remediation branches land.

## Behavioral Proof Commands And Pass Criteria

- `bunx nx show projects --json | jq -e 'index("@rawr/hq-ops-host") == null'`
  - Pass: Nx no longer sees `@rawr/hq-ops-host`.
- `! rg -n "@rawr/hq-ops-host|packages/hq-ops-host|hq-ops-host" apps services packages plugins scripts package.json vitest.config.ts bun.lock --glob '!**/dist/**' --glob '!**/.nx/**'`
  - Pass: no active source/package/test/config reference to HQ Ops host remains.
- `bunx nx run @rawr/hq-ops:typecheck --skip-nx-cache`
  - Pass: service typechecks with service-owned behavior/resource deps.
- `bunx nx run @rawr/hq-ops:build --skip-nx-cache`
  - Pass: service build emits without host dependency.
- `bunx nx run @rawr/hq-ops:test --skip-nx-cache`
  - Pass: config, repo-state, journal, security, service-shape, and resource-backed behavior tests pass.
- `bunx nx run @rawr/hq-ops:structural --skip-nx-cache`
  - Pass: new no-host/resource-binding and service-shape ratchets pass.
- `bunx nx run-many -t typecheck --projects=@rawr/cli,@rawr/server,@rawr/plugin-plugins --skip-nx-cache`
  - Pass: all current app/plugin HQ Ops binding sites compile with local resource factories.
- `bunx vitest run --project server apps/server/test/repo-state-store.concurrent.test.ts apps/server/test/storage-lock-route-guard.test.ts apps/server/test/phase-a-gates.test.ts`
  - Pass: repo-state authority/lock behavior and server structural assertions pass without host imports.
- `bunx vitest run --project plugin-plugins --project cli`
  - Pass: plugin CLI and main CLI tests that use HQ Ops config/journal/security surfaces pass.
- `bun run lint:boundaries`
  - Pass: boundary rules still permit sanctioned app/plugin service binding and reject erased host-package paths.
- `bun run build:affected`
  - Pass: affected build graph succeeds after package removal and lockfile refresh.

## Expected Implementation Edit Set

- `services/hq-ops/src/service/**`
- `services/hq-ops/test/**`
- `apps/server/src/host-satisfiers.ts`
- `apps/server/test/repo-state-store.concurrent.test.ts`
- `apps/server/test/phase-a-gates.test.ts`
- `apps/cli/src/lib/hq-ops-client.ts`
- `plugins/cli/plugins/src/lib/hq-ops-client.ts`
- `apps/cli/package.json`
- `apps/server/package.json`
- `plugins/cli/plugins/package.json`
- `package.json`
- `bun.lock`
- `vitest.config.ts`
- `scripts/phase-03/run-structural-suite.mjs`
- `scripts/phase-03/verify-hq-ops-host-placement.mjs` or its replacement
- `scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `scripts/phase-c/verify-storage-lock-contract.mjs`
- `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- `packages/hq-ops-host/**` deletion

## Risks And Open Questions

- The service needs enough concrete resource interfaces to avoid raw fs/env/path/process/sqlite imports, but those interfaces must stay service-owned and narrow, not become a generic runtime package.
- Some current active verifiers intentionally ratchet the obsolete host package; the implementation must invert them without weakening unrelated phase gates.
- Sibling `agent-config-sync-host` and `session-intelligence-host` still exist on this stack, so any global no-`*-host` ratchet needs a temporary allowlist or must wait for the sibling remediation branches.
- Semantic journal search currently reads API keys from env and calls providers directly; moving that behind explicit app/plugin-provided resources is the highest-risk behavior-preservation seam.
- Repo-state lock tests must continue to prove canonical/alias authority roots, stale lock reclaim, active lock refusal, and high-contention writes after moving implementation into the service.
