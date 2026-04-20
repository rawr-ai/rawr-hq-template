# Service Migration Violations Bag (Nx + Narsil sweep)

Sweep date: 2026-04-20 (America/New_York)

## Grounding (exact SHAs)

- Graphite stack top branch: `agent-ORCH-plugin-logic-service-split`
- Stack tip SHA (local): `b90329c22a727eaaef39ba8fe720fa573efd79fc`
- `origin/agent-ORCH-plugin-logic-service-split` SHA: `a31e1ef9c3ec05bcf270ddc560463f8650467fc3`

### Worktrees

- Indexing worktree (Narsil-aligned): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
  - State: clean, detached at `b90329c22a727eaaef39ba8fe720fa573efd79fc`
  - Note: local edits on `matei/reorganize-project-docs` were stashed as `WIP: exec plan edits` to keep this checkout clean for indexing.
- Primary edit worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-plugin-plugins-service-migration`
  - Branch: `agent-ORCH-plugin-logic-service-split`
  - State: clean (before remediation), HEAD `b90329c22a727eaaef39ba8fe720fa573efd79fc`

## Scope (Nx-truth)

Swept services:
- `@rawr/hq-ops` (`services/hq-ops`)
- `@rawr/agent-config-sync` (`services/agent-config-sync`)
- `@rawr/session-intelligence` (`services/session-intelligence`)

## Baseline verification (Nx)

Ran:
- `bunx nx run-many -t structural,typecheck,test --projects @rawr/hq-ops,@rawr/agent-config-sync,@rawr/session-intelligence --skipNxCache`

Result: all targets passed (no baseline P0/P1 build-breakers).

## Rules / Tags

Primary tags (planned):
- `RULE:no-contract-import`
- `RULE:contract-io-in-contract`
- `RULE:no-module-root-buckets`
- `RULE:helpers-mechanical-only`
- `RULE:repo-mechanics-only`
- `RULE:no-cross-module-internals`
- `RULE:ports-not-adapters`
- `RULE:schema-first-types-derived`
- `RULE:errors-example-todo`

Additional enforcement tag (explicitly used by this sweep):
- `RULE:router-not-dumping-ground` (routers author the capability flow, but should not grow into monolithic dumping grounds; when they do, fix by structuring the module and/or splitting procedures).

Severity scale:
- P0 (hard invariant violation, likely to spread)
- P1 (architectural drift, should fix soon)
- P2 (structure/clarity debt)
- P3 (style/nice-to-have)

---

# Findings

## `@rawr/hq-ops`

Summary: P0=0, P1=0, P2=0, P3=0

### HQO-CFG-001 (RESOLVED)
- Service: `@rawr/hq-ops`
- Tags: `RULE:no-contract-import` `RULE:schema-first-types-derived` `MOD:config` `KIND:type-import-from-contract`
- Severity: P1
- Evidence:
  - `services/hq-ops/src/service/modules/config/helpers/load.ts` imports `LoadRawrConfigResult` from `../contract`
  - `services/hq-ops/src/service/modules/config/helpers/validation.ts` imports `ConfigValidationIssue` from `../contract`
- Fix intent:
  - Make helpers depend only on reusable entity/DTO shapes (or module-local internal types), not on `contract.ts`.
  - Preferred direction: move reusable config DTO schemas/types (e.g. load result + validation issue) into `services/hq-ops/src/service/modules/config/entities.ts` (contract consumes entities; helpers consume entities).
- Suggested owner: `agent:hq-ops`
- Resolution: `d9559ce1213f7ec0781def9cc5f1428114a4d70a` — move config DTO schemas/types into `entities.ts`; `contract.ts` reuses them; helpers depend on entities (not contract)

### HQO-PLC-001 (RESOLVED)
- Service: `@rawr/hq-ops`
- Tags: `RULE:router-not-dumping-ground` `MOD:plugin-lifecycle` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/hq-ops/src/service/modules/plugin-lifecycle/router.ts` is 445 LOC.
- Fix intent:
  - Keep procedure handlers readable and structured; if logic is mechanical, keep it in focused helpers; if it’s persistence/query/index mechanics, keep it in repositories; avoid turning the router into the only place where meaning lives.
- Suggested owner: `agent:hq-ops`
- Resolution: `d9559ce1213f7ec0781def9cc5f1428114a4d70a` — split procedure handlers into module-local `procedures/*`; keep router as thin composition/export

### HQO-PLI-001 (RESOLVED)
- Service: `@rawr/hq-ops`
- Tags: `RULE:router-not-dumping-ground` `MOD:plugin-install` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/hq-ops/src/service/modules/plugin-install/router.ts` is 248 LOC.
- Fix intent:
  - Same as HQO-PLC-001; keep the capability flow legible, split where needed.
- Suggested owner: `agent:hq-ops`
- Resolution: `d9559ce1213f7ec0781def9cc5f1428114a4d70a` — split install assessment/repair procedures into module-local `procedures/*`; keep router as thin composition/export

## `@rawr/agent-config-sync`

Summary: P0=0, P1=0, P2=3, P3=0

### ACS-PLN-001 (OPEN)
- Service: `@rawr/agent-config-sync`
- Tags: `RULE:router-not-dumping-ground` `MOD:planning` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/agent-config-sync/src/service/modules/planning/router.ts` is 455 LOC.
- Fix intent:
  - Split into clearer procedures and/or module structure so this doesn’t become a single “plan everything” blob.
- Suggested owner: `agent:agent-config-sync`

### ACS-EXE-001 (OPEN)
- Service: `@rawr/agent-config-sync`
- Tags: `RULE:router-not-dumping-ground` `MOD:execution` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/agent-config-sync/src/service/modules/execution/router.ts` is 348 LOC.
- Fix intent:
  - Keep the execution capability flow legible; move mechanics into repositories/helpers without hiding authored meaning.
- Suggested owner: `agent:agent-config-sync`

### ACS-RET-001 (OPEN)
- Service: `@rawr/agent-config-sync`
- Tags: `RULE:router-not-dumping-ground` `MOD:retirement` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/agent-config-sync/src/service/modules/retirement/router.ts` is 276 LOC.
- Fix intent:
  - Reduce the “single handler owns everything” feel by structuring the procedure; keep helpers mechanical.
- Suggested owner: `agent:agent-config-sync`

## `@rawr/session-intelligence`

Summary: P0=0, P1=0, P2=2, P3=0

### SINT-SCH-001 (RESOLVED)
- Service: `@rawr/session-intelligence`
- Tags: `RULE:router-not-dumping-ground` `MOD:search` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/session-intelligence/src/service/modules/search/router.ts` is 334 LOC.
- Fix intent:
  - Keep core flow authored in procedures, but avoid a monolithic dumping ground; push mechanics behind repositories and keep helpers narrow.
- Suggested owner: `agent:session-intelligence`
- Resolution: `cb9023b125c17bca32469ea2bffc2fcfda0306cf` — split mechanical filtering/metadata/search-text caching into module-local helpers; keep capability flow in `router.ts`

### SINT-CAT-001 (RESOLVED)
- Service: `@rawr/session-intelligence`
- Tags: `RULE:router-not-dumping-ground` `MOD:catalog` `KIND:router-godfile`
- Severity: P2
- Evidence:
  - `services/session-intelligence/src/service/modules/catalog/router.ts` is 218 LOC.
- Fix intent:
  - Same as SINT-SCH-001.
- Suggested owner: `agent:session-intelligence`
- Resolution: `cb9023b125c17bca32469ea2bffc2fcfda0306cf` — split mechanical filtering/date-window logic into a focused module-local helper; keep capability flow in `router.ts`
