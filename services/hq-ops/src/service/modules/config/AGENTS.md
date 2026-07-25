# HQ Configuration Module Router

## Purpose

- Provide validated workspace, global, and layered HQ configuration as data.

## Scope

- Applies to configuration loading, validation, and merge behavior in this
  module directory.

## Boundaries

- Configuration owns supported schema and precedence semantics; it does not
  own plugin lifecycle, runtime construction, or retired policy bags.
- Filesystem, home, and path mechanics remain behind primitive host resources.

## Behavior

- The module loads global and workspace documents independently, reports their
  validation state, and produces a workspace-over-global merged view only when
  the resulting supported configuration is valid.

## Concepts

- A **configuration layer** is one scoped source. A **validation issue**
  explains rejected input; the **layered view** retains both source results and
  the admitted merged configuration.

## Flow

- A caller requests one layer or the combined view; the module reads through
  host resources, validates versioned data, applies field-level precedence,
  and returns structured results.

## Interfaces

- `getWorkspaceConfig`, `getGlobalConfig`, and `getLayeredConfig` are the
  caller operations. Primitive file, path, environment, and home capabilities
  are the host handoff.

## Routing

- [HQ Operations service router](../../../../AGENTS.md)
- [Security module](../security/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/hq-ops:typecheck`.
- Run `bunx nx run @rawr/hq-ops:test` for schema versions, retired fields,
  validation, precedence, and repository-neutral layered configuration.
