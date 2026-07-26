---
name: habitat-provider-frame
description: Mental model for one concrete typed realization and lifecycle implementation of a provider-neutral resource contract.
---

# Provider Realization Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Provider code, resource contracts, applications, and adjacent Habitat
> packets retain their qualified authority.

## Frame

A provider makes one resource contract real on one vendor or substrate. It
owns concrete clients, configuration interpretation, acquisition, release,
failure translation, and the mechanics required to satisfy that contract. Its
public index is the only implementation face consumers need to see.

A provider does not decide product intent. It does not select itself, widen its
parent contract, or become a convenient home for service policy. Vendor-shaped
facts may originate here; domain decisions remain with the service that owns
their meaning.

## Gradient

The provider points inward through its resource:

```text
vendor -> provider -> resource -> app -> service
```

The application chooses a provider and its lifetime. Runtime acquisition owns
the realized scope and passes the provider-neutral resource value downward.
Consumers do not import a concrete implementation. This keeps replacement
honest: a different provider may realize the same resource without rewriting
service operations.

The closed package face gives vendor mechanics room to decompose in TypeScript
while preventing unrelated files and alternate public faces from accumulating.
If an implementation concern is meaningful across providers, reconsider the
resource contract or a truly agnostic package rather than creating a shared
provider bag.

## Relations

- [[README|Provider boundary]]
- [[../resource/skill|Resource frame]]
- [[../service/skill|Service capability funnel]]
- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
