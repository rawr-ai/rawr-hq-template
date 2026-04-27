# Phase 1 Prework Agent Team

This document is the handoff scaffold for the **actual** prework sweep across the local Phase 1 issue packet.

Do not execute the sweep inline from the orchestrator thread. The orchestrator may do light discovery and preparation, but the prompt-resolution work itself should be delegated to a team of default agents.

## Operating Rule

The prework team is responsible for eliminating the remaining `## Prework Prompt (Agent Brief)` sections in:

- `docs/projects/rawr-final-architecture-migration/issues/M1-U00-guardrails-and-phase-1-ledger.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U04-dissolve-legacy-hq-package.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U05-cut-canonical-plugin-topology.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U07-neutralize-legacy-composition-authority.md`
- `docs/projects/rawr-final-architecture-migration/issues/M1-U08-ratchet-phase-1-proofs-and-readjust.md`

The orchestrator owns packet quality and cross-issue consistency, but each prompt should be resolved by a dedicated agent or intentionally grouped agent, not by the orchestrator thread doing all of the work directly.

## Narsil / NX Rules

These are mandatory for the prework sweep.

### Narsil

Use the Narsil MCP server for semantic code understanding:

- symbol usages
- call paths
- definitions
- search/chunk lookup when ripgrep is not enough

Critical constraint:

- Narsil indexes the **original checkout** at:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- Before relying on its index, move that checkout’s `HEAD` to the latest commit you want indexed.
- At the time this scaffold was written, that checkout had already been moved to:
  - commit `56c6dcb3`
  - commit message: `docs(migration): break phase 1 milestone into local issues`

If the issue packet advances before the team starts, update that original checkout again and confirm Narsil’s incremental index status before heavy semantic queries.

### NX

Use the Nx CLI to gather structural signal before deciding anything:

- `bunx nx show projects`
- `bunx nx show project <name> --json`
- relevant project targets for `sync`, `structural`, `typecheck`, and `test`

Nx should be used to confirm:

- current project identities
- current roots / source roots
- target wiring
- whether an expected proof surface is package-owned, app-owned, or plugin-owned

## Common Grounding For Every Prework Agent

Before doing any edits, each agent must:

1. Introspect `/Users/mateicanavra/.codex-rawr/prompts/dev-prework-sweep.md`
2. Introspect these skills:
   - `introspect`
   - `git-worktrees`
   - `deep-search`
   - `decision-logging`
   - `linear-method`
   - `linear-issue-quality`
   - `narsil-mcp`
   - `nx-workspace`
3. Fully read:
   - `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
   - `docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md`
   - `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`
   - `docs/projects/rawr-final-architecture-migration/.context/grounding.md`
   - `docs/projects/rawr-final-architecture-migration/issues/<their assigned issue>.md`

## Team Shape

Default recommendation: six parallel agents, one per prompt-bearing issue.

This is safe because the prompts are slice-local and do not require concurrent edits to the same file. Cross-slice consistency review still belongs to the orchestrator after the agent wave finishes.

### Agent P0: Ledger / Guardrails

Owns:

- `M1-U00`

Must resolve:

- ledger headings
- minimum concrete Phase 1 surface inventory to classify
- exact verification script integration points

Primary tools:

- Narsil for symbol/search support if structural helpers or script references need tracing
- Nx for current workspace inventory and project truth
- shell / ripgrep for repo inventory

### Agent P3: HQ Ops Consumer Inventory

Owns:

- `M1-U03`

Must resolve:

- full consumer inventory for `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, and `@rawr/security`
- identify which consumers are direct vs routed through `@rawr/hq/*`
- exact tests/proofs that must move or be ported with each operational owner

Primary tools:

- Narsil symbol usage and search
- Nx project metadata for impacted apps/packages

### Agent P4: `packages/hq` Disposition

Owns:

- `M1-U04`

Must resolve:

- file-by-file disposition table for `packages/hq/src`
- target owner for each surviving support/tooling surface
- semantic facades that must die after the HQ Ops cut
- relevant tests that need to move with workspace/install/lifecycle support

Primary tools:

- Narsil symbol usages for `assessInstallState`, `parseWorkspacePluginManifest`, `listWorkspacePlugins`, and related helper surfaces
- Nx metadata for owning packages/plugins

### Agent P5: Plugin Topology Cutover Checklist

Owns:

- `M1-U05`

Must resolve:

- exact root workspace updates
- exact Nx `project.json` / root / sourceRoot / tags / target updates
- plugin discovery heuristics and tests that must change with the topology move

Primary tools:

- Nx project metadata
- Narsil search/usages for plugin discovery helpers and topology-proof surfaces

### Agent P7: Legacy Host Authority Audit

Owns:

- `M1-U07`

Must resolve:

- every remaining live caller of `host-composition`, `host-seam`, and `host-realization`
- which paths are production boot, proof-only, helper-only, or structural-test-only
- exact proof conditions for declaring legacy executable authority neutralized

Primary tools:

- Narsil symbol usages / call paths
- Nx metadata for `@rawr/server` and `@rawr/hq-app`

### Agent P8: Plateau Close-Out Review

Owns:

- `M1-U08`

Must resolve:

- exact Phase 1 close-out checklist
- stale-doc audit outside the migration project
- docs that should remain untouched because they describe later phases or historical packets

Primary tools:

- Narsil when tracing doc-cited code surfaces helps clarify ownership
- repo docs search
- Nx only where project ownership is part of the stale-doc decision

## Orchestrator Starter Evidence

This evidence has already been gathered and can seed the agent prompts. It should be treated as a head start, not as a substitute for the agent’s own validation.

- Root verification integration today:
  - `package.json` `sync:check` -> `scripts/phase-03/verify-sync-check.mjs`
  - `package.json` `lint:boundaries` -> `eslint apps services packages plugins`
  - per-project `structural` targets exist for `@rawr/server`, `@rawr/cli`, `@rawr/hq-app`, `@rawr/plugin-plugins`, `@rawr/state`, `@rawr/hq`, `@rawr/coordination`
- Current plugin topology still uses:
  - root workspaces: `plugins/api/*`, `plugins/workflows/*`
  - Nx project roots such as `plugins/api/state`, `plugins/api/example-todo`, `plugins/api/coordination`, `plugins/workflows/coordination`, `plugins/workflows/support-example`
- Narsil-confirmed high-signal symbol usages:
  - `assessInstallState` is used heavily by both `packages/hq/*` and `plugins/cli/plugins/*`
  - `parseWorkspacePluginManifest` is used by `packages/hq/src/workspace/plugins.ts`, tests, and structural scripts
  - `listWorkspacePlugins` exists in both `packages/hq/src/workspace/plugins.ts` and `plugins/cli/plugins/src/lib/workspace-plugins.ts`, with many plugin CLI consumers
  - `createRawrHostComposition` is used directly by `apps/server/src/rawr.ts` and `apps/server/src/testing-host.ts`, plus proof tests
  - `createTestingRawrHostSeam` is used by `apps/server/src/orpc.ts`, multiple server tests, and OpenAPI writing/proof paths

## Completion Standard

Each agent should:

1. Append a concise `### Prework Results (Resolved)` section under `## Implementation Details (Local Only)` in its issue doc.
2. Tighten acceptance / testing / dependency wording if the evidence materially reduces ambiguity.
3. Commit the findings while leaving the prompt intact.
4. Remove the prompt block only after the findings are written.
5. Commit the prompt removal separately.

The orchestrator should only review, reconcile cross-issue edges, and run the final packet-level backstop after the agent wave completes.
