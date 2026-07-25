# Todo Tags Module Router

## Purpose

- Own reusable labels that classify Example Todo tasks.

## Scope

- Applies to tag creation and listing in this module directory.

## Boundaries

- Tags owns label identity, display color, uniqueness, and persistence; the
  relation between a tag and a task belongs to assignments.
- Read-only policy is enforced at the service boundary, while database,
  logging, and analytics mechanics remain host-supplied.

## Behavior

- The module creates a uniquely named tag with a validated color or reports a
  declared duplicate/read-only failure, and returns the current tag catalog in
  list operations.

## Concepts

- A **tag** is a reusable name and hex display color. **Duplicate tag**
  preserves name uniqueness; the **tag catalog** is the current set available
  for assignment.

## Flow

- Create validates caller input, checks policy and uniqueness, and persists the
  entity. List reads all tags without acquiring assignment behavior.

## Interfaces

- `create` and `list` are the caller operations. The tag repository and common
  service support capabilities enter through module context.

## Routing

- [Example Todo service router](../../../../AGENTS.md)
- [Assignment module](../assignments/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` for creation, duplicate names,
  read-only mode, listing, and schema validation.
