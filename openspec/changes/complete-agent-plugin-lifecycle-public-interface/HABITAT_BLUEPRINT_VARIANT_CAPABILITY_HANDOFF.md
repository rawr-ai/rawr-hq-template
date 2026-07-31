# Habitat Blueprint Variant Capability Handoff

## Status

`TEMPLATE_OWNED_NORMATIVE_RECORD`

This document specifies future Template-owned Habitat catalog capabilities. It
does not authorize a parallel SDK, repository-specific script, or partial v3
activation, and it does not block the active lifecycle work recorded in
[[README]]. The service posture remains governed by the
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

## Exact Member Closure

The same Habitat relation model MUST let a blueprint declare a finite family
of owned members without reducing membership to filename inference.

- A parent instance MUST be able to declare exact child members, including a
  resource's provider family and a proof owner's selected proof cases.
- Every visible child in that family MUST resolve to exactly one declared
  member. An undeclared child, a declared member with no child, and two
  declarations for one child MUST fail deterministically.
- A child that is itself a blueprint instance MUST retain its own kind and
  owner. Parent membership closes the family; it does not duplicate or weaken
  the child's blueprint.
- Member identity and member path MUST be separate fields. Hierarchical paths
  such as a service module plus operation MUST NOT be encoded by permitting
  path separators inside a generic identifier.
- A selected member path MUST remain below its declared family root after
  normalization. No template, alias, or manifest value may escape that root.
- Closed structure MUST evaluate the resolved member set, not merely the
  syntactic glob that could contain it.

This capability is required before RAWR calls a v3 resource provider family or
an operation-mirrored proof tree constructible. Until then those definitions
may exist as inert design input, while the released v2 packets remain the sole
executing compatibility authority.

## Root Relation Closure

A blueprint MUST be able to relate its declared roots rather than trusting
independent instance paths that merely share names.

- A root MAY be declared as an exact descendant of another root, such as a
  service `source` root at `project/src`.
- Resolution MUST normalize both roots, reject escape from the parent, and
  reject a child root that resolves to any other location.
- Structure scopes MUST evaluate the resolved relation, not merely confirm
  that the parent separately contains a child named `src`.
- One instance manifest MUST NOT be able to point `project` at one component
  and `source` at unrelated repository matter while still satisfying the same
  blueprint.

This relation is required before any of the seven v3 definitions is
constructible. RAWR MUST NOT substitute matching filenames, repository
convention, or a separate validation script for a blueprint-owned root
relation.

## Workspace Acquisition

Habitat MUST let catalog resolution attach the exact workspace subject set
needed by a relation that crosses one instance boundary, such as service
public-consumer sealing, to the resulting application.

- The blueprint relation MUST declare the bounded foreign-subject selector
  shape, and the instance manifest MUST supply the exact selectors.
- Every selector MUST resolve to exactly one schema-admitted instance and its
  definition kind.
- For a workspace-wide relation, the eligible subject set MUST be derived from
  the authoritative workspace project set and the relation's declared project
  kinds. The instance-selected set MUST equal that eligible set; missing and
  extra subjects MUST be refused.
- Each selector MUST declare exact, bounded source roots for its foreign
  subject rather than scan an ambient repository or infer ownership from an
  import string.
- A service instance MUST NOT own, admit, or rewrite a foreign consumer. It may
  only evaluate the acquired subjects against the service-owned public face.
- The Nx projection MUST consume the same resolved application and subject set;
  it MUST NOT construct a second workspace inventory.
- Missing, ambiguous, out-of-workspace, and wrong-kind subjects MUST be refused
  before source evaluation.

This capability is required before public-consumer sealing becomes a resolved
v3 application. Until then the corresponding source law remains staged.

## Required Verification

The Template-owned Habitat implementation MUST prove:

1. One declared, admitted variant composes with and preserves its kind's base
   constraints.
2. Missing, unknown, and multiple memberships fail deterministically.
3. Files outside the composed positive structure remain rejected.
4. Nested components select variants independently at their own roots.
5. A parent or sibling cannot satisfy, shadow, or override another component's
   membership.
6. Diagnostics remain stable enough to identify the owner and corrective
   choice without exposing implementation-specific traversal details.
7. Exact child-family membership rejects missing, extra, duplicate, and
   out-of-root paths.
8. A parent closes its member set while each child still satisfies its own
   independently selected blueprint.
9. Hierarchical member paths preserve atomic member identity and deterministic
   diagnostics.
10. Derived root relations accept the exact descendant and reject unrelated,
    escaping, and missing paths.
11. Foreign-consumer acquisition proves exact equality with the eligible
    workspace subject set, refuses missing, extra, or ambiguous ownership, and
    supplies the same resolved set to Habitat evaluation and Nx projection.

These obligations belong to Template-owned Habitat catalog resolution and
application execution. RAWR MUST NOT emulate them with a parallel SDK, local
cardinality checks, XOR scripts, filename inference, or repository-specific
runners.

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

This single positive shape eliminates the local router XOR. The deferred
variant capability remains useful only for future kinds that deliberately need
more than one explicit structural form.
