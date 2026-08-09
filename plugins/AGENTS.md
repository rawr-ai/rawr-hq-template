# Plugin Router

## Purpose

- Reserve Habitat plugin-kind roots without confusing a reserved family with a
  selected plugin instance or downstream product source.

## Scope

- Applies to `plugins/**`.

## Nx First Hop

- Use `bunx nx show projects` and `bunx nx show project <name> --json` before
  treating any plugin path as an owning project.

## Boundaries

- External Oclif extensions are installed packages managed only through
  `habitat plugins ...`; they are not source members of this directory.
- Curated agent-plugin lifecycle has no current CLI projection. Task 12.1 must
  land its Habitat topic, command manifest, app profile, and policy together.
- No Rawr command alias or product topic belongs in Habitat.
- Reserved `web`, `server`, `workflow`, and schedule roots do not become active
  until their generic kind law and first conforming owner co-land.
- The final generic CLI-topic root and law are task 11.4 work, not task 2.11
  residue.

## Behavior

- A plugin is admitted only by its selected kind, owning Nx project, closed
  Habitat law, and host composition contract.

## Concepts

- A **plugin kind** defines a reusable contribution boundary. A **selected
  plugin** is one concrete owner admitted by that kind. A directory reservation
  is neither.

## Flow

- Kind law and a conforming owner land together.
- Nx validates the owner; the qualified host composes only its public face.

## Interfaces

- Package exports, selected manifests, and host-native contribution faces are
  the only plugin interfaces.

## Routing

- [Repository router](../AGENTS.md)
- [Habitat authority](../.habitat/AUTHORITY.md)
- [Apps router](../apps/AGENTS.md)

## Validation

- Confirm the owning project with Nx, then run its focused check and behavior
  targets.
