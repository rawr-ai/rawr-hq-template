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

## Relations

- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
- [[../../README|Habitat index]]
