# Sweep + Delegate Plan (Nx + Narsil) — Migrated Services Violations (Verbatim)

Captured: 2026-04-20 (America/New_York)

This file intentionally preserves the plan *verbatim* so we can execute it without drift.

---

## Sweep + Delegate Plan (Nx + Narsil) — Migrated Services Violations

### Summary
- Goal: do a disciplined “flag/tag/bag” sweep across the migrated services (`@rawr/hq-ops`, `@rawr/agent-config-sync`, `@rawr/session-intelligence`), producing a single violations document; then delegate remediation in parallel (one service per agent) with full context + hard invariants.

### Preconditions (make Narsil indexing accurate)
1) Identify which checkout Narsil is indexing
- Run a quick Narsil `hybrid_search` and confirm returned paths are under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` (currently true).
- Treat that path as the **indexing worktree**.

2) Ensure the indexing worktree points at the *top-of-stack* tip commit (without branch collisions)
- In the **migration worktree** (`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-plugin-plugins-service-migration`):
  - `gt ls` to identify the top branch (currently `agent-ORCH-plugin-logic-service-split`).
  - `git fetch origin` then compute the intended tip SHA: `git rev-parse origin/<top-branch>` and verify the branch worktree is at that SHA (fast-forward in that worktree if not).
- In the **indexing worktree** (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`):
  - Remove/park the local diff (default: `git stash push -m "WIP: exec plan edits"` so it’s reversible).
  - `git switch --detach <tip-sha>` to avoid checking out a branch already owned by another worktree.
  - Verify: `git status --short --branch` is clean and HEAD matches `<tip-sha>`.

### Sweep scope + violation taxonomy
Services in scope (Nx-truth):
- `@rawr/hq-ops` (`services/hq-ops`)
- `@rawr/agent-config-sync` (`services/agent-config-sync`)
- `@rawr/session-intelligence` (`services/session-intelligence`)

Violation categories (tags you’ll use in the bag doc):
- `RULE:no-contract-import` (implementation importing `contract.ts`)
- `RULE:contract-io-in-contract` (IO schemas/types live in `contract.ts`, not entity files / buckets)
- `RULE:no-module-root-buckets` (no `support.ts`/`cache.ts`/etc buckets)
- `RULE:helpers-mechanical-only`
- `RULE:repo-mechanics-only` (raw SQL/index/cache ok; authored flow not)
- `RULE:no-cross-module-internals` (no importing another module’s `helpers/`/internals)
- `RULE:ports-not-adapters` (no runtime `node:*` imports in service code)
- `RULE:schema-first-types-derived`
- `RULE:errors-example-todo`

Severity scale:
- P0 (hard invariant violation, likely to spread)
- P1 (architectural drift, should fix soon)
- P2 (structure/clarity debt)
- P3 (style/nice-to-have)

### How the sweep runs (Nx + Narsil, then confirm locally)
1) Nx baseline (per service)
- `bunx nx run-many -t structural,typecheck,test --projects @rawr/hq-ops,@rawr/agent-config-sync,@rawr/session-intelligence --skipNxCache`
- Record failures as first-class findings (they become P0/P1 entries).

2) Narsil pattern sweep (fast, broad)
- Use `hybrid_search` for each RULE pattern (imports of `contract.ts`, `node:` imports, “helpers reach-through”, “schemas.ts buckets”, “support.ts/cache.ts” filenames, etc.).
- Ignore `.nx/cache/**` hits; only bag findings that correspond to real sources under `services/**`.

3) Local confirmation (source-of-truth)
- For each candidate hit, open the real file under the migration worktree and confirm it’s not a stale build artifact and is actually in the service runtime surface.

### “Flag/Tag/Bag” document format (single file)
Write to (default):
- `docs/projects/rawr-final-architecture-migration/.context/M2-execution/service-migration-violations-bag.md`

Structure:
- Header: sweep date/time, top-branch tip SHA, indexing worktree path + HEAD SHA, migration worktree path + branch + SHA.
- Per service section:
  - Summary counts: P0/P1/P2/P3 totals
  - Findings list (each entry is one “bag item”)
    - `ID`: stable (e.g. `ACS-RET-001`)
    - `Service`: `@rawr/...`
    - `Tags`: `RULE:*` + `MOD:*` (if obvious) + `KIND:*`
    - `Severity`: P0–P3
    - `Evidence`: filepath + short snippet summary
    - `Fix intent`: what “done” looks like (behavior-level)
    - `Suggested owner`: `agent:hq-ops` / `agent:agent-config-sync` / `agent:session-intelligence` / `self`

### Delegation (default agents) — disjoint write scopes
Spin up 3 default worker agents, one per service, after the violations bag is written.

Agent 1: `@rawr/agent-config-sync` remediation
- Write scope: `services/agent-config-sync/**` only.
- Primary target: `services/agent-config-sync/src/service/modules/retirement/router.ts` (reduce “router godfile” without smuggling authored flow into helpers/repos).
- Must: keep `RULE:*` invariants; run `bunx nx run @rawr/agent-config-sync:structural` + `:typecheck` + `:test`.

Agent 2: `@rawr/hq-ops` remediation
- Write scope: `services/hq-ops/**` only.
- Focus on P0/P1 violations from the bag.
- Must: run `bunx nx run @rawr/hq-ops:structural` + `:typecheck` + `:test`.

Agent 3: `@rawr/session-intelligence` remediation
- Write scope: `services/session-intelligence/**` only.
- Focus on “repo mechanics only”, raw SQL placement, ports/adapters, contract/entity boundaries.
- Must: run `bunx nx run @rawr/session-intelligence:structural` + `:typecheck` + `:test`.

### The exact agent prompt template (you’ll reuse 3×)
Include verbatim (fill in `{SERVICE}`, `{SCOPE_PATH}`, `{NX_PROJECT}`, and paste the relevant bag items):

- Context:
  - Repo: RAWR HQ-Template
  - Migration goal: service modules own semantics; CLI/packages are projections
  - Hard invariants: (paste the RULE list)
  - Current stack: top branch name + tip SHA
  - Indexing worktree: path + detached HEAD SHA (Narsil-aligned)
  - Primary worktree for edits: `wt-plugin-plugins-service-migration` on `agent-ORCH-plugin-logic-service-split`

- Task:
  - Fix only the bagged violations for `{NX_PROJECT}`.
  - Keep changes minimal and local; no cross-service refactors.
  - Update the violations doc by marking each item `RESOLVED` with commit SHA and a 1–2 line note.

- Verification:
  - Run `{NX_PROJECT}` `typecheck`, `structural`, `test`.
  - Ensure `git diff --check` clean.

- Deliverable:
  - A clean working tree with fixes + updated violations doc.

### What I’ll do myself (default)
- I’ll own the sweep + violations doc end-to-end (so the bag is consistent), and I’ll personally take the highest-severity single violation (usually the biggest router/repo “godfile” that risks spreading patterns) if we want faster convergence before parallel agent fixes.

### Assumptions (defaults)
- “Primary worktree for Narsil” = `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` (because Narsil results currently point there).
- “Latest branch in Graphite stack” = the top entry from `gt ls` (currently `agent-ORCH-plugin-logic-service-split`).
- The violations doc lives in `.context/M2-execution/` and is committed on the top branch once stable (no lingering dirty state).

