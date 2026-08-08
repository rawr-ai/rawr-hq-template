---
name: habitat-server-plugin-frame
description: Mental model for server plugins as server-hosted projections whose narrower surface kind owns the caller boundary.
---

# Server Plugin Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. It introduces no universal source shape beyond narrower server-plugin
> kinds.

## Frame

A server plugin is a projection selected for a server role. It sits between an
underlying capability and a server host, preserving both boundaries: the
capability owner defines meaning, while the host owns transport and native
lifecycle.

The parent kind is intentionally a container, not a universal implementation
template. Public API and trusted internal API are different caller boundaries;
their narrower kinds own the extra contracts and topology that distinction
earns.

## Gradient

Information moves from service or sanctioned host capability into one
server-facing projection, then into a host-owned mount. Caller policy,
authentication, transformation, and public failure shape belong at the
projection boundary when they are specific to that surface. Domain invariants
remain below it. Listener setup, request transport, and native shutdown remain
above it in the host.

A server plugin therefore stays thin in authority, not necessarily in useful
behavior. It may perform substantial boundary work without becoming a service
or an application.

## Relations

- [[../skill|Blueprint direction]]
- [[README|Server-plugin boundary]]
- [[../plugin/skill|Plugin frame]]
- [[../../AUTHORITY|Habitat authority]]
