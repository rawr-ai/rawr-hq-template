---
name: habitat-plugin-frame
description: Mental model for plugins as single-lane runtime projections that preserve the authority of services, resources, apps, and hosts.
---

# Plugin Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Narrower plugin kinds and their packets own any enforceable topology.

## Frame

A plugin projects an existing capability into one role and surface. It owns
the caller shape, boundary policy, adaptation, and mount facts specific to that
lane. It does not become the capability's source of truth.

Services own domain meaning. Resources declare runtime capability. Providers
implement it. Apps select projections. Hosts mount them. A plugin declares the
service and resource access its projection needs, but it neither acquires
providers nor chooses app membership.

## Gradient

Projection identity follows topology and the matching lane-specific builder.
Route, command, workflow, tool, window, and channel details refine a projection;
they do not reclassify it. A capability that needs two genuinely different
surfaces earns two projections rather than one conditional aggregate.

The broad plugin kind intentionally carries little universal file geometry.
Stronger closure belongs to narrower kinds only when every member shares the
same boundary. This restraint prevents a parent blueprint from inventing a
mini-framework that erases the native host and the underlying capability
owner.

## Relations

- [[../skill|Blueprint direction]]
- [[README|Plugin boundary]]
- [[../plugin-server/skill|Server-plugin frame]]
- [[../../AUTHORITY|Habitat authority]]
