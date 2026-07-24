# Hello CLI Plugin Router

## Scope

- Applies to `plugins/cli/commands/hello/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package is the minimal external Oclif extension example and owns the
  `rawr hello` command.

## Boundaries

- Command files are default exports extending `@oclif/core` `Command`.
- `package.json#oclif` maps `src/commands` to compiled `dist/commands`; do not
  add a parallel command registry or custom discovery mechanism.
- This plugin is linked or installed through native Oclif extension state. It
  is not a core command composed into `@rawr/cli` and has no agent-plugin
  lifecycle authority.
- Keep the example intentionally small; reusable product behavior belongs in
  a service or package with its own boundary.

## Flow

- Native Oclif extension discovery loads the compiled command, Oclif parses the
  invocation, and the command writes its result through the standard command
  runtime.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [External-extension usage](README.md)
- [Behavior test](test/hello.test.ts)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run @rawr/plugin-hello:typecheck`.
- Run `bunx nx run @rawr/plugin-hello:test`.
- Run `bunx nx run @rawr/plugin-hello:build`.
- Run `bunx nx run @rawr/plugin-hello:manifest` when command discovery or
  Oclif metadata changes.
