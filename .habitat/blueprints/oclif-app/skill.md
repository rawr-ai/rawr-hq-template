---
name: habitat-oclif-app-frame
description: Mental model for one conventional installed Oclif application that owns CLI identity while commands retain qualified capability boundaries.
---

# Oclif App Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Oclif, package configuration, Nx, and the adjacent Habitat packets own
> the executable facts.

## Frame

The Oclif app is the installed `rawr` command application. It owns one package
identity, one executable, command discovery, official extension composition,
and the common terminal lifecycle around commands.

Oclif owns dispatch and external extension state. Command plugins own
first-party terminal projections. Services own domain capability. Resources
and their providers own host effects. Nx owns build and release scheduling.
Those roles remain visible rather than being hidden behind another launcher,
selector, local release store, or private package manager.

## Gradient

Both development and installed execution converge on the same Oclif
application. Source and compiled entrypoints are direct projections of that
identity, not competing authorities. Conventional versioned packages or
release artifacts establish installability; the application does not need a
second runtime-distribution model merely to be independent of a checkout.

The app composes commands but does not absorb their capability logic. A command
crosses a public service or resource boundary, maps terminal input to that
boundary, and maps the result back to terminal behavior. Native Oclif plugin
management stays distinct from curated agent-plugin lifecycle commands.

## Relations

- [[../skill|Blueprint direction]]
- [[README|Oclif app boundary]]
- [[../oclif-command-plugin/skill|Command-plugin frame]]
- [[../../AUTHORITY|Habitat authority]]
