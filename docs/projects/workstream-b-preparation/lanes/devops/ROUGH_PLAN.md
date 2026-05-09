# DevOps Rough Plan

## Implementation Supersession

This rough plan is now historical planning input. The implemented branch
realizes the service / Node adapter / CLI projection shape described below. Use
`COMPLETION_AUDIT.md`, `WORKSTREAM_RECORD.md`, and `NEXT_PACKET.md` for current
post-implementation status and remaining work.

## Implementation Slices

1. Upstream project scaffolding:
   - Add `services/dev`.
   - Add `packages/dev-node`.
   - Add `plugins/cli/devops`.
   - Register Nx/package metadata consistently with existing template packages
     and CLI plugins.

2. Service migration:
   - Implement service-owned Graphite doctor/drain modules.
   - Implement service-owned repo sync module.
   - Implement service-owned worktree cleanup module.
   - Implement service-owned scratch policy module.
   - Keep host process/filesystem/path access behind resource ports.
   - Keep Node resources in `packages/dev-node`.

3. CLI migration:
   - Port command files.
   - Bind the `@rawr/dev` service client.
   - Preserve planning-by-default and JSON output.
   - Enforce scratch policy for mutating commands.
   - Wire with template-safe defaults: no plugin convergence unless
     `--converge-after`; no link healing unless `--heal-links`.

4. Shared-safety review:
   - Verify `--converge-after` and `--heal-links` remain opt-in defaults
     upstream.
   - Parameterize local paths and branch prefixes.
   - Ensure no command silently runs global plugin sync/link repair unless the
     operator explicitly asks for it.
   - Encode Graphite/worktree/noninteractive invariants in service tests.

5. Tests:
   - Add service unit tests for scratch policy and command planning.
   - Add node adapter tests for resource fixtures.
   - Add CLI projection tests for commands and JSON output.
   - Add no-mutation planning-mode tests.
   - Add applied-path failure tests.
   - Add fixture-backed JSON contracts for stack doctor, stack drain, repo
     sync, worktree cleanup, and scratch policy.
   - Mock Graphite, repo, and worktree command execution.

6. Docs cleanup:
   - Update `AGENTS_SPLIT.md`.
   - Update `docs/process/CROSS_REPO_WORKFLOWS.md`.
   - Update any runbook references that still claim DevOps remains personal.
   - Do not preserve continuing split-model language.

7. Downstream sunset planning:
   - After upstream migration is proven, plan final downstream removal of
     `packages/dev` and `plugins/cli/devops` as duplicate authority.

## Likely Touch Surfaces

- `services/dev/**`
- `packages/dev-node/**`
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
bunx nx show project @rawr/dev-node --json
bunx nx show project @rawr/plugin-devops --json
bunx nx run @rawr/dev:test
bunx nx run @rawr/dev-node:test
bunx nx run @rawr/plugin-devops:test
bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops
```

Additional targeted checks:

```bash
rg -n "packages/dev/|personal-owned|personal mechanical dev workflows|stays personal-owned" AGENTS_SPLIT.md docs/process
```

## Sequencing Notes

Run this lane late. It benefits from the `upstream-fallout` cleanup landing
first and from `plugin-sync` settling sync/link authority assumptions. It is the
largest migration lane and should not carry unrelated cleanup or downstream
sunset work.

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
