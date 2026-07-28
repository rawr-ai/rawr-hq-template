---
name: habitat-nx-workspace-frame
description: Mental model for Nx as the repository graph and scheduler while project owners retain their qualified build and verification work.
---

# Nx Workspace Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Nx configuration and the adjacent Habitat packets retain operational
> authority.

## Frame

Nx is the repository's project graph and task scheduler. It knows which
projects exist, how their public targets relate, what can run concurrently, and
what work can be reused. It does not define architectural kinds, source
boundaries, or product behavior.

The root is a scheduler, not a second implementation owner. A project owns its
qualified build, typecheck, test, and optional verification. The workspace owns
one ordinary lint path through Habitat. A public `check` composes those owners
through one graph rather than reproducing them in scripts or nested schedulers.

Ordinary package commands remain ordinary package scripts. Nx infers those
scripts as project targets and adds graph semantics through root target defaults.
Use `project.json` only when the graph needs information a package command cannot
express, such as a dependency edge, a composed no-op target, explicit inputs, or
outputs. Moving the same shell command between those files does not improve the
execution model.

## Gradient

Work moves from a small stable vocabulary at the root toward owner-local
targets. Common quality expectations remain common. A package-specific target
is earned only by package-specific behavior; renaming foundational checks does
not create a new concern.

The graph should expose real dependency and caching boundaries without turning
every helper into a project or every aggregate into another graph. Parallelism
belongs to Nx's scheduler. Structural policy belongs to Habitat. Type authority
belongs to the compiler. This separation keeps checks fast enough to run
routinely and clear enough to diagnose locally.

Commands resolve declared workspace dependencies by package name. A project
that declares Vitest runs `vitest`; it does not encode the repository's current
`node_modules` layout. Structural checks enter through the one Habitat-owned
lint path. A project does not add `sync`, `structural`, or another wrapper merely
to invoke that same authority again.

## Relations

- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
- [[../../README|Habitat index]]
