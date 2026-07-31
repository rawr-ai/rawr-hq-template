# Habitat Nx Projection Router

## Purpose

- Project resolved Habitat applications into native Nx scheduler targets.

## Scope

- Applies to `plugins/nx/habitat/**`; inherit the [plugin router](../../AGENTS.md).

## Boundaries

- The plugin receives an app-owned workspace client factory and runtime cache
  inputs. It never selects providers, constructs resources, or discovers
  Habitat authority itself.
- Habitat owns catalog resolution and application meaning; Nx owns target
  scheduling, hashing, caching, and dependency composition.
- The projection augments existing project roots and never supplies a project
  name or another scheduler.

## Behavior

- Resolve the catalog once for each graph construction.
- Project one cacheable leaf per application and one dependency-only aggregate
  per owner project.
- Refuse rejected or internally inconsistent catalogs without partial output.

## Concepts

- An **application target** is the Nx scheduling projection of one resolved
  Habitat application. An **owner aggregate** contains dependencies only.

## Flow

- The app binds the workspace client, Habitat resolves applications, this
  plugin projects targets, and Nx schedules the selected leaves.

## Interfaces

- `src/index.ts` is the sole source face and exports the app composition
  factory.

## Routing

- [[../../AGENTS|Plugin kinds and boundaries]]
- [[../../../services/habitat/AGENTS|Habitat service authority]]

## Validation

- Run `nx run @habitat/plugin-nx:typecheck`, `:test`, and `:check`.
