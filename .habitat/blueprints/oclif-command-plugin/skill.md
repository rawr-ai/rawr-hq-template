---
name: habitat-oclif-command-plugin-frame
description: Mental model for a first-party Oclif command plugin as one host-composed terminal projection on public package boundaries.
---

# Oclif Command Plugin Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. The package, Oclif manifest, and adjacent Habitat packets remain the
> executable authority.

## Frame

A command plugin is one terminal-facing capability projection composed by the
Oclif host. It owns command names, arguments, flags, prompts, terminal output,
exit behavior, and caller-facing error mapping. It does not own another
executable or become a service.

Domain meaning remains in services. Host capability remains behind resources.
The command invokes those public boundaries and translates between terminal
interaction and their typed results. Private helpers may support that
translation, but another command plugin is never a dependency or orchestration
layer.

## Gradient

Every first-party command plugin has the same recognizable package shell and
one discovered command root. Uniformity lets authors spend attention on the
capability rather than rebuilding dispatch, manifests, or install behavior.
The host composes plugins side by side; plugins do not form a hidden command
dependency graph.

The default-exported Oclif command is the terminal authoring surface. Logic
that decides domain truth belongs behind the service boundary. Logic that
acquires a native capability belongs behind a resource provider. The command
retains only the policy and presentation specific to its caller lane.

## Relations

- [[../skill|Blueprint direction]]
- [[README|Command-plugin boundary]]
- [[../../AUTHORITY|Habitat authority]]
