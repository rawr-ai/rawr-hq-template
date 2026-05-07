# DevOps Rough Plan

## Implementation Slices

1. Upstream project scaffolding:
   - Add `packages/dev`.
   - Add `plugins/cli/devops`.
   - Register Nx/package metadata consistently with existing template packages
     and CLI plugins.

2. Package migration:
   - Port Graphite doctor/drain modules.
   - Port repo sync module.
   - Port worktree cleanup module.
   - Port scratch policy module.
   - Keep process execution testable.

3. CLI migration:
   - Port command files.
   - Bind `@rawr/dev` package behavior.
   - Preserve dry-run and JSON output.
   - Enforce scratch policy for mutating commands.
   - Wire with template-safe defaults: no plugin convergence unless
     `--converge-after`; no link healing unless `--heal-links`.

4. Shared-safety review:
   - Verify `--converge-after` and `--heal-links` remain opt-in defaults
     upstream.
   - Parameterize local paths and branch prefixes.
   - Ensure no command silently runs global plugin sync/link repair unless the
     operator explicitly asks for it.
   - Encode Graphite/worktree/noninteractive invariants in package tests.

5. Tests:
   - Add package unit tests for scratch policy and command planning.
   - Add CLI projection tests for commands and JSON output.
   - Add no-mutation dry-run tests.
   - Add fixture-backed JSON contracts for stack doctor, stack drain, repo
     sync, worktree cleanup, and scratch policy.
   - Mock Graphite, repo, and worktree command execution.

6. Docs cleanup:
   - Update `AGENTS_SPLIT.md`.
   - Update `docs/process/CROSS_REPO_WORKFLOWS.md`.
   - Update any runbook references that still claim DevOps remains personal.
   - Do not preserve continuing split-model language.

7. Downstream sunset planning:
   - After upstream migration is proven, plan downstream removal of
     `packages/dev` and `plugins/cli/devops` as duplicate authority.

## Likely Touch Surfaces

- `packages/dev/**`
- `plugins/cli/devops/**`
- `package.json`
- `apps/cli/package.json`
- workspace/Nx/project metadata as required by this repo's current package
  conventions.
- `scripts/githooks/template-managed-paths.txt`
- `AGENTS_SPLIT.md`
- `docs/process/CROSS_REPO_WORKFLOWS.md`
- relevant tests.

## Validation

```bash
git status --short --branch
gt ls
bunx nx show projects
bunx nx show project @rawr/dev --json
bunx nx show project @rawr/plugin-devops --json
bunx nx run @rawr/dev:test
bunx nx run @rawr/plugin-devops:test
bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/plugin-devops
```

Additional targeted checks:

```bash
rg -n "packages/dev|plugins/cli/devops|personal-owned|personal mechanical dev workflows|stays personal-owned" AGENTS_SPLIT.md docs/process
```

## Sequencing Notes

Migrate package behavior before CLI projection. Then update docs. Downstream
removal is later and only after upstream commands are tested.

The shared-safety review is not optional. The repair decision fixes upstream
defaults as opt-in convergence/link healing, so future implementation should
verify those defaults rather than reopen them.

## Stop Conditions

- Future implementation cannot add Nx projects cleanly.
- DevOps commands would require machine-specific paths as hard-coded defaults.
- A command would run global plugin sync/link repair by default without explicit
  operator intent.
- Graphite operation safety cannot be tested without mutating a real stack.

## DRA Disposition

Accepted after review repair. The rough plan identifies migration slices,
template-safe defaults, JSON fixture requirements, and Graphite/worktree test
boundaries.
