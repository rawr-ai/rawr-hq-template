# Graphite Stack Module Router

## Purpose

- Diagnose a Graphite stack and drain its publishable branches through an
  explicit, failure-aware plan.

## Scope

- Applies to stack doctor and drain capabilities in this module directory.

## Boundaries

- Stack owns diagnosis, sequencing, and stop conditions; Graphite and Git
  command mechanics remain behind process resources.
- It does not synchronize the repository root or remove worktrees.

## Behavior

- Doctor reports stack readability and blocking conditions. Drain plans the
  required branch operations by default, executes them only in apply mode, and
  stops when a mutating step fails.

## Concepts

- A **Graphite stack** is an ordered branch chain. A **doctor report**
  classifies readiness; a **drain plan** records ordered publish and cleanup
  steps plus their execution status.

## Flow

- The caller requests diagnosis or drain for a repository; the module gathers
  Graphite state, builds a plan, and either returns it or runs each admitted
  step in sequence.

## Interfaces

- `doctor` and `drain` are the service operations. Their handlers author
  against the workspace root, process resource, and service-owned scratch
  policy checker curated by the module; structured reports are the caller
  result. Root construction lanes remain service-internal and are not an
  operation interface.

## Routing

- [Development Operations service router](../../../../AGENTS.md)
- [Repository operations module](../repo/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/dev:typecheck`.
- Run `bunx nx run @rawr/dev:test` for plan-only drains, failed publish stops,
  adapter failures, and doctor readiness.
