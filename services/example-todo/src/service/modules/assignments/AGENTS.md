# Todo Assignments Module Router

## Purpose

- Govern the relation that attaches existing tags to existing tasks.

## Scope

- Applies to assignment creation and task-assignment queries in this module
  directory.

## Boundaries

- Assignments owns relation uniqueness and the configured per-task limit; task
  and tag entity creation remain with their modules.
- Cross-entity reads use admitted repositories through module context rather
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

- `assign` and `listForTask` are the composite caller boundary. Task, tag, and
  assignment repositories supply entity and relation facts through context.

## Routing

- [Example Todo service router](../../../../AGENTS.md)
- [Tasks module](../tasks/AGENTS.md)
- [Tags module](../tags/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` for missing entities, duplicate
  relations, assignment limits, read-only mode, and composed task/tag results.
