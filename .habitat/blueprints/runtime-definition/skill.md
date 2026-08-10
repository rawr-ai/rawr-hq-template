---
name: habitat-runtime-definition-frame
description: Mental model for Habitat's cold private runtime-definition owner and its non-authorizing contracts.
---

# Runtime Definition Frame

Runtime definition owns cold vocabulary. It lets semantic owners describe
apps, profiles, finite process catalogs, entrypoints, services, plugins,
resources, providers, executable Effects, and observation input without doing
live work.

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

The definition owner sits at the head of that chain. Its values may carry
functions that describe future Effect execution, but importing or constructing
them starts no Effect, provider, host, process, timer, or client.

One app owns one finite process catalog. A catalog record is selected cold
data, not another app, an Nx project, a deployment unit, a supervisor, or a
whole-app controller. The exact launch identity contains only `app`, `process`,
`entrypoint`, `deployment`, and `source`; copying and freezing it grants no
placement or lifecycle authority.

Resources define provider-neutral capability contracts. Providers declare
identity and provider-owned config schema/redaction metadata. Provider
selection, acquisition plans, and execution land only with their later owners.
The observation record and port point downstream, but cannot select, acquire,
mount, stop, or project read models.

Habitat owns the positive closed filesystem topology. Nx owns the sole private
dependency edge and task graph. TypeScript owns capability visibility and
inference. Owner tests prove cold construction, exact identity, TypeBox record
shape, and cache restoration/invalidation.

## Vocabulary

app definition, cold descriptor, entrypoint, launch identity, observation,
process catalog, provider config, runtime profile
