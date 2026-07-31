---
name: habitat-resource-frame
description: Mental model for a provider-neutral capability contract at the head of the Habitat product chain.
---

# Resource Capability Frame

A resource names one capability without naming how it is supplied. Its
contract owns the values, operations, typed failures, and lifecycle
expectations that every provider must satisfy. Vendor clients, provider
selection, product policy, and service decisions remain outside.

```text
resource -> provider -> service -> plugin -> app
```

This direction is an authorship law, not a call-stack claim. The resource
defines the neutral vocabulary; a provider realizes it; a service consumes the
ready capability while owning its domain meaning; a plugin projects that
service; an app chooses the concrete runtime assembly.

At runtime, selection and context flow downward from the app. The service sees
the resource value, never the concrete vendor construction. A resource does
not import its providers or select among them, and a provider-specific fact
does not widen the neutral contract merely because one implementation exposes
it.

The closed root makes `contract.ts` the visible neutral face and `providers/`
the hard implementation boundary. When logic cannot remain provider-neutral,
it does not belong in the contract.

## Vocabulary

capability, contract, failure, lifecycle, neutrality, provider, resource
