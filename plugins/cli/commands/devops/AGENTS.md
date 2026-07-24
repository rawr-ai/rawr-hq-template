# DevOps CLI Plugin Router

## Scope

- Applies to `plugins/cli/commands/devops/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the Oclif projection for repository, Graphite stack, and
  worktree operations exposed by `@rawr/dev`.

## Boundaries

- Commands own flags, workspace-root discovery, CLI rendering, and exit-code
  projection. Planning, preflight, and mutation policy remain in `@rawr/dev`.
- `src/lib/dev-binding.ts` binds the public service client to
  `@rawr/dev-node` resources. Keep Git, Graphite, and filesystem mechanics
  behind those public resource and service boundaries.
- Mutating commands are planning-only by default. Mutation requires explicit
  `--apply`, and the shared dry-run flag must continue to suppress apply.
- Worktree cleanup must preserve its required exact prefix, merged-state, and
  pinned-path or pinned-branch constraints; do not replace them with an
  unqualified recursive deletion path.

## Flow

- Oclif parses a request, locates the workspace, derives scratch policy where
  required, invokes the public Dev client in plan or apply mode, and renders
  the report with preflight-aware exit behavior.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Command safety posture](README.md)
- [Behavior test](test/plugin-devops.test.ts)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run @rawr/plugin-devops:typecheck`.
- Run `bunx nx run @rawr/plugin-devops:test`.
- Run `bunx nx run @rawr/plugin-devops:manifest` when command discovery or
  Oclif metadata changes.
