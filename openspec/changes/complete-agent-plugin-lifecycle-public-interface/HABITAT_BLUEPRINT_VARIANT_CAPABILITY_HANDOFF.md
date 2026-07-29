# Habitat Blueprint Variant Capability Handoff

## Status

`UPSTREAM_NORMATIVE_HANDOFF`

This document specifies a future Habitat SDK capability. It is not implemented
in RAWR HQ-Template, does not authorize a local SDK fork or script, and does not
block the active lifecycle work recorded in [[README]]. The service posture
remains governed by the
[[.habitat/blueprints/service/skill|Service Capability Funnel]] and the
[[.habitat/blueprints/service/README|service blueprint authority]].

## Capability

Habitat MUST support an owner selecting one explicit variant of a declared
blueprint kind when that kind intentionally admits multiple structural forms.

- A **kind** owns the invariants shared by every member.
- A **variant** owns one positive structural refinement of that kind.
- **Membership** is declared at the component root owned by the kind. It MUST
  NOT be inferred from filenames, partial structural matches, or source
  heuristics.
- A component MUST select exactly one admitted variant of its kind.
- Variant selection MUST remain owner-local. A parent, sibling, or descendant
  component MUST NOT select or rewrite another component's membership.
- The admitted structure MUST be the monotonic composition of the kind's base
  structure and the selected variant's structure. A variant may narrow the
  possible shape; it MUST NOT weaken or bypass the kind's base constraints.
- Closed structure remains authoritative after composition. Files admitted by
  neither the base kind nor the selected variant MUST be rejected.

The capability MUST report useful, deterministic diagnostics for absent,
unknown, and multiple variant membership. A diagnostic MUST identify the
component root, the blueprint kind, the observed membership, and the admitted
variants without requiring a repository-specific checker.

## Required Verification

The upstream implementation MUST prove:

1. One declared, admitted variant composes with and preserves its kind's base
   constraints.
2. Missing, unknown, and multiple memberships fail deterministically.
3. Files outside the composed positive structure remain rejected.
4. Nested components select variants independently at their own roots.
5. A parent or sibling cannot satisfy, shadow, or override another component's
   membership.
6. Diagnostics remain stable enough to identify the owner and corrective
   choice without exposing implementation-specific traversal details.

These obligations belong to the upstream Habitat SDK. RAWR MUST NOT emulate
them with local cardinality checks, XOR scripts, filename inference, or
repository-specific runners.

## Current RAWR Resolution

RAWR does not need a variant for service-module routers. It admits one
canonical module shape:

```text
module/
├── contract/
│   ├── index.ts
│   ├── inspect.ts
│   └── mutate.ts
├── module.ts
├── router.ts
└── router/
    ├── inspect.router.ts
    └── mutate.router.ts
```

Named router leaves author individual operations or cohesive operation groups.
Module-root `router.ts` imports those completed leaves and composes the
module's one plain router object. `contract/index.ts` owns the matching
declarative contract composition. Module `contract.ts` and `router/index.ts`
alternatives are not admitted.

This single positive shape eliminates the local router XOR. The upstream
variant capability remains useful only for future kinds that deliberately need
more than one explicit structural form.
