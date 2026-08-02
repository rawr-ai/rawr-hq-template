# Habitat Nx Projection Router

## Purpose

- Project resolved Habitat policy into native Nx scheduler targets.

## Scope

- Applies to `plugins/nx/habitat/**`; inherit the [plugin router](../../AGENTS.md).

## Boundaries

- The plugin receives an app-owned workspace client factory and runtime cache
  inputs. It never selects providers, constructs resources, or discovers
  Habitat authority itself.
- Consumer initialization uses Nx's `Tree` to converge only the app-bound
  plugin registration, named hook group, and Grit trust declaration.
- Habitat owns catalog resolution and application meaning; Nx owns target
  scheduling, hashing, caching, and dependency composition.
- The projection augments existing project roots and never supplies a project
  name or another scheduler.

## Behavior

- Resolve the catalog once for each graph construction.
- Reject owner identities outside the portable shell-safe Nx project grammar
  before projecting an executable command.
- Project one cacheable focused leaf per version 3 application and version 2
  compatibility rule, then one cacheable native `habitat check --owner`
  target per owner project. The owner target hashes the union of its leaves'
  authority, acquisition-root, subject, asset, and app-owned runtime inputs; it
  does not depend on or schedule the leaves.
- Compatibility leaves augment the exact admitted owner root without inventing
  an instance identity or a second runtime.
- Refuse rejected or internally inconsistent catalogs without partial output.

## Concepts

- An **application target** is the Nx scheduling projection of one resolved
  Habitat application. A **compatibility target** projects one admitted version
  2 rule directly. An **owner target** executes one owner-selected native check;
  focused leaves remain available for exact rule or application scheduling.

## Flow

- The app binds the workspace client, Habitat resolves applications and
  compatibility rules, this plugin projects owner and focused targets, and Nx
  schedules the selected native command.

## Interfaces

- `src/index.ts` is the installed target-inference face. The Habitat app
  bundles `src/initialization.ts` only into its native Nx generator entries;
  it is not part of the runtime Nx-plugin export.

## Routing

- [[../../AGENTS|Plugin kinds and boundaries]]
- [[../../../services/habitat/AGENTS|Habitat service authority]]

## Validation

- Run `nx run @habitat-ai/plugin-nx:typecheck`, `:test`, and `:check`.
