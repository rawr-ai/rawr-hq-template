# Todo Tags Module Router

## Purpose

- Own reusable labels that classify Example Todo tasks.

## Scope

- Applies to tag creation and listing in this module directory.

## Boundaries

- Tags owns label creation/listing policy, display-color normalization,
  uniqueness, and declared failures. The inert tag record schema belongs to
  the service model because persistence and Assignments share it; the relation
  between a tag and a task belongs to Assignments.
- Read-only policy remains service-owned and is enforced by the mutating
  handler, while database, identifier, logging, and analytics mechanics remain
  host-supplied.

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

- `create` and `list` are the caller operations. `module.ts` curates the clock,
  identifier, logger, workspace, trace, read-only policy, and tag-store
  capabilities that their handlers need from inherited service context. Qualified telemetry observes
  the inherited lanes before curation; the named tag router leaves own behavior.

## Routing

- [Example Todo service router](../../../../AGENTS.md)
- [[../../model/dto/tag|Tag record DTO]]
- [[../../model/ports/tags-store|Tag store contract]]
- [[middleware/telemetry|Tag telemetry]]
- [[router/create|Tag creation]]
- [[router/list|Tag catalog]]
- [Assignment module](../assignments/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` for creation, duplicate names,
  read-only mode, listing, and schema validation.
