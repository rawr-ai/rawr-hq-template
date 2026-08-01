# Habitat CLI Projection Router

## Purpose

- Project the sealed Habitat catalog service into the native Oclif `habitat`
  command surface.

## Scope

- Applies to `plugins/cli/commands/habitat/**`; inherit the
  [plugin router](../../../AGENTS.md).

## Boundaries

- Commands receive one app-created Habitat client through Oclif configuration.
- This plugin does not select providers, construct resources, resolve a
  workspace root, or reinterpret service results.
- Oclif owns argv admission and command discovery; the Habitat service owns
  catalog and check semantics.

## Behavior

- `resolve` prints the total service result for current catalog admission.
- `check` maps native Oclif selectors to the service request, prints the total
  service result, and exits nonzero for refused or unsuccessful outcomes.
- `hook agent-stop` selects native Habitat structure applications, remains
  quiet on success, and exits nonzero with the total failed result.

## Concepts

- A **projection binding** is the ready service client supplied by the app on
  Oclif's own configuration object. A **command projection** translates argv
  without gaining semantic authority.

## Flow

- The app selects providers and constructs the client, Oclif carries the
  binding into a command, and the command invokes exactly one service
  operation.

## Interfaces

- `src/lib/binding.ts` defines the app-to-plugin Oclif binding.
- `src/commands/**` contains the three default-export command faces.

## Routing

- [[../../../AGENTS|Plugin kinds and boundaries]]
- [[../../../../services/habitat/AGENTS|Habitat service authority]]

## Validation

- Run `bunx nx run @habitat/plugin-cli:typecheck`, `:test`, `:build`, and
  `:manifest`.
