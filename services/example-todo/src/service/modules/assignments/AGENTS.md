# Todo Assignments Module Router

## Purpose

- Govern the relation that attaches existing tags to existing tasks.

## Scope

- Applies to assignment creation and task-assignment queries in this module
  directory.

## Boundaries

- Assignments owns relation uniqueness and the configured per-task limit; task
  and tag entity creation remain with their modules. The inert assignment,
  task, and tag record schemas belong to the service model because the
  composite contract and persistence share them.
- Cross-entity reads use service-provided stores through curated module context rather
  than invoking sibling operation implementations.
- Identifier generation enters through service context; assignment policy
  decides when a relation receives an identity without acquiring a runtime.

## Behavior

- The module verifies both entities exist, enforces read-only, duplicate, and
  assignment-limit policy, persists the relation, and can return one task with
  all of its assigned tags.

## Concepts

- An **assignment** is a unique task-id/tag-id pair. The **assignment limit**
  caps tags on one task; **already assigned** and **resource not found** are
  caller-actionable relationship failures.

## Flow

- Assign validates both sides and current relation state before writing.
  List-for-task resolves the task, reads its relations, and joins the admitted
  tag entities for the result.

## Interfaces

- `assign` and `listForTask` are the composite caller boundary. `module.ts`
  curates the clock, identifier, workspace, assignment limit, and three stores
  plus the read-only policy that their handlers need from inherited service context. Qualified telemetry
  observes inherited lanes before curation; the named assignment router leaf
  owns cross-entity behavior.

## Routing

- [Example Todo service router](../../../../AGENTS.md)
- [[../../model/dto/assignment|Assignment record DTO]]
- [[../../model/ports/assignments-store|Assignment store contract]]
- [[../../model/ports/tasks-store|Task store contract]]
- [[../../model/ports/tags-store|Tag store contract]]
- [[middleware/telemetry|Assignment telemetry]]
- [[router/assign.router|Assignment mutation]]
- [[router/list-for-task.router|Assigned-tag query]]
- [Tasks module](../tasks/AGENTS.md)
- [Tags module](../tags/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` for missing entities, duplicate
  relations, assignment limits, read-only mode, and composed task/tag results.
