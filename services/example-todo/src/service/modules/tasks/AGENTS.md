# Todo Tasks Module Router

## Purpose

- Own creation and retrieval of the task entity at the Example Todo service
  boundary.

## Scope

- Applies to task behavior in this module directory.

## Boundaries

- Tasks owns title normalization, task creation/retrieval policy, and
  task-specific failures; the inert task record schema belongs to the service
  model because persistence and Assignments share it. Tag creation and
  task-tag relationships belong to sibling modules.
- Database, clock, identifier, logging, and analytics mechanics enter through
  service context rather than becoming task policy.

## Behavior

- The module validates and normalizes a requested title, enforces read-only
  mode for creation, persists a new task, and resolves existing tasks by id or
  returns the declared not-found failure.

## Concepts

- A **task** has a stable id, human-readable title, optional description, and
  creation facts. **Read-only mode** blocks creation; **resource not found**
  describes an absent requested task.

## Flow

- Create admits task input and returns the persisted entity. Get resolves a
  task id through the workspace-bound task store and returns the entity or a
  typed domain failure.

## Interfaces

- `create` and `get` form the caller-visible task contract. `module.ts` curates
  the clock, identifier, logger, workspace, and task-store capabilities that
  their handlers need from inherited service context. The named task router
  leaf authors both operations; the module `router.ts` only composes them.

## Routing

- [Example Todo service router](../../../../AGENTS.md)
- [[../../model/dto/task|Task record DTO]]
- [[../../model/ports/tasks-store|Task store contract]]
- [[router/tasks.router|Task operation group]]
- [Assignment module](../assignments/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` for task create/get, invalid title,
  read-only, schema, and not-found behavior.
