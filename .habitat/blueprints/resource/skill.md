---
name: habitat-resource-frame
description: Mental model for a provider-neutral capability contract whose concrete realization remains outside product and service policy.
---

# Resource Capability Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Resource contracts, providers, applications, and adjacent Habitat
> packets retain their qualified authority.

## Frame

A resource names one capability the runtime can supply without naming how it
is supplied. Its contract describes the operations, values, failures, and
lifecycle expectations a consumer may rely on. It contains no provider
selection, vendor implementation, or product decision.

The resource boundary exists so service authors can reason in capabilities
rather than reconstructing external systems inside policies or helpers. A
remote repository, filesystem, database, ledger, model-runtime capability,
queue, or native host capability belongs here when it can be described
independently of the consuming operation and requires a concrete runtime
realization.

## Gradient

The direction is explicit:

```text
provider -> resource -> app -> service
```

A provider realizes the contract. An application chooses that provider and
its lifetime. Runtime acquisition scopes, releases, and binds the ready
capability into service context. The service consumes only the resource
contract. Movement in the opposite direction is an authority inversion:
resources do not import providers, services do not construct vendors, and
model policy does not perform resource effects.

The closed package face keeps the contract visible and makes concrete mechanics
fall into the nested provider kind. When logic cannot remain provider-neutral,
it is not resource contract matter.

## Relations

- [[README|Resource boundary]]
- [[../provider/skill|Provider frame]]
- [[../service/skill|Service capability funnel]]
- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
