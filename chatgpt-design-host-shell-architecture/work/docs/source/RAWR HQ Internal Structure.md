# Service internal structure and ownership

## What this document is

This document sits one level below the semantic architecture snapshot.

The snapshot locks the main ontology:

- `packages/` for pure/shared support matter
- `services/` for semantic service boundaries
- `plugins/` for runtime embodiments
- `apps/` for hosts

This document answers the next question:

**Once a service exists, how should its internals be structured so the system stays semantically clear, low-ambiguity, and scalable from small to large services?**

The goal is not maximal flexibility. The goal is to remove optionality where it creates drift, while preserving a clean path for earned exceptions.

---

## Core rule

A service should be **module-encapsulated by default**.

That means the default ownership zone inside a service is the module, not a broad shared internal layer.

The service kernel should stay small and explicit:

- declarative service definition
- service-wide assembly seam
- final service router composition
- a narrow shared internal layer only when duplication proves it is needed

This gives the service a strong shape:

```text
services/foo/
  src/
    index.ts
    router.ts

    service/
      base.ts
      impl.ts
      router.ts
      shared/
      modules/
        module-a/
        module-b/
```

The rule is:

```text
module-local first
service-shared second
package extraction last
```

That is the main law.

---

## Why module-local first is stronger

At small scale, broad shared internal folders feel convenient.
At large scale, they create constant ambiguity.

A flatter service-internal structure creates repeated questions like:

- does this belong to this module or the shared repository area?
- is this policy local or service-global?
- is this schema module-specific or shared?
- is this helper generic enough to move upward?

That is exactly the kind of ambient uncertainty the system is trying to eliminate.

Module-local structure is stronger because it makes locality the default. Most questions get the same answer:

**keep it with the module unless there is a proven reason not to.**

This scales better because the filesystem mirrors semantic ownership.

---

## Canonical service-internal shape

The recommended shape is:

```text
services/foo/
  src/
    index.ts
    router.ts

    service/
      base.ts
      impl.ts
      router.ts
      shared/
        repository/
        db/
        policies/
        middleware/
        providers/
        types/
      modules/
        tasks/
          contract.ts
          setup.ts
          router.ts
          repository/
          db/
          policies/
        tags/
          contract.ts
          setup.ts
          router.ts
        assignments/
          contract.ts
          setup.ts
          router.ts
```

### Meanings

- `src/index.ts` and `src/router.ts` are thin package boundary surfaces.
- `src/service/base.ts` is the declarative service definition and service vocabulary.
- `src/service/impl.ts` is the service-wide assembly seam.
- `src/service/router.ts` composes module routers once.
- `src/service/modules/*` is the default ownership area.
- `src/service/shared/*` is the earned exception layer for service-internal sharing.

---

## What belongs in the service kernel

The service kernel should stay narrow.

### `base.ts`
Owns:
- the service definition
- stable context lanes
- service-wide metadata vocabulary
- service-wide policy vocabulary
- builders/factories tied to the service concept

### `impl.ts`
Owns:
- service-wide implementer construction
- required service-wide middleware attachment
- service-wide runtime assembly that should happen exactly once

### `router.ts`
Owns:
- final composition of module routers into the service router

These files define the service as a semantic boundary.
They should not become junk drawers.

---

## Module-local by default

Each module should own as much of its own internal truth as possible.

A module may contain:

- contract shape
- setup/context narrowing
- router/handlers
- repository logic
- db logic
- policies
- views/mappers
- module-local middleware

Example:

```text
modules/tasks/
  contract.ts
  setup.ts
  router.ts
  repository/
    task-repository.ts
  db/
    schema.ts
    migrations/
    queries.ts
  policies/
    can-create-task.ts
    can-update-task.ts
```

This is preferred over pulling everything upward early.

Why:
- it preserves local semantic ownership
- it reduces “where does this go?” ambiguity
- it makes the module understandable in isolation
- it prevents service-shared folders from becoming internal dumping grounds

---

## What `service/shared/` is for

`service/shared/` is not the default place to author internals.
It is the place for **proven service-internal shared seams**.

It should be explicitly scarce.

A good `service/shared/` exists for things that are:
- reused across multiple modules in the same service
- not appropriate as public/package-level support matter
- still semantically owned by this one service

Examples:
- shared service-internal repository primitives
- shared service-internal schema/query helpers
- shared service-internal policy logic
- shared service-local middleware or providers
- shared service-internal types

Bad signs:
- random helpers landing there by convenience
- vague `common/`, `utils/`, or `lib/` folders
- anything public-facing or cross-service landing there

The path should mean something precise:

```text
service/shared/* = shared within this service only
```

That precision matters.

---

## `db` vs `repository`

These only need to be separate when the separation buys clarity.
They are not automatically different folders at every scale.

### `db`
`db` is for storage mechanics.

Typical contents:
- schema definitions
- migrations
- table metadata
- SQL/query-builder fragments
- row mapping
- transaction helpers
- database-specific construction and persistence mechanics

Question answered:

**How is data stored and queried mechanically?**

### `repository`
`repository` is for service-facing data access semantics.

Typical contents:
- `findById`
- `insertTask`
- `listAssignmentsForTask`
- `markCompleted`
- aggregate load/save patterns
- persistence operations expressed in service language

Question answered:

**What data operations does this service/module need in its own terms?**

### Relationship

```text
handler -> repository -> db
```

That is the ideal layering when the service is large enough to deserve it.

### When to keep them combined

For small modules, splitting them can create fake architecture.

Small module rule:
- keep `db` and `repository` together under one local area if the distinction is not yet buying much.

Larger module/service rule:
- split them once storage mechanics and service-facing data semantics are diverging enough to make the split clarifying.

So the rule is:

```text
small = combine locally
large = separate for clarity
```

---

## What `policies` are

Policies are **named semantic rule decisions**.

They are not just convenience predicates.
They are not just errors.
They are not telemetry.

They answer:

**Under what rule conditions is this behavior permitted, rejected, constrained, or modified?**

Examples:
- read-only mode rules
- assignment limits
- mutation eligibility
- task visibility rules
- lifecycle/state transition rules
- permission checks tied to service semantics

A useful split is:

```text
errors = how failure is expressed
policies = why a decision was made
observability = how that decision is recorded
repository = how data is accessed
db = how storage works
```

Who can use policies:
- handlers
- setup/middleware
- repositories, when service-owned rule checks are needed before access
- service observability/analytics layers
- future composed services that must preserve the same decision logic

Policies become worth their own area when rule logic is repeated, important, or semantically named enough that it should not stay buried inline.

---

## Shared database instance vs shared ownership

Multiple services can use the same database instance or the same host-provided `dbPool` without sharing semantic ownership.

This is the important distinction:

```text
shared infrastructure != shared semantic ownership
```

### Good default

- same host: often yes
- same Postgres instance: often yes
- same `dbPool`: yes, often
- same tables with multiple direct writers: usually no

### Preferred model

Each service owns:
- its own tables
- its own migrations
- its own repositories
- its own write invariants

Even when several services use the same physical database.

### Warning sign

If two services both want direct write authority over the same business tables/entities, one of two things is usually true:

1. they are actually one service with multiple modules, or
2. one service should be canonical owner and the other should go through it or through explicitly governed projections.

The shared-host model is not a reason to weaken semantic ownership.

---

## When two “small services” are actually one service

If two candidate services deeply share:
- domain entities
- write invariants
- policy logic
- migration ownership
- repository semantics

then they may not actually be separate services.

They may be one service with several modules.

This is important because the service structure is already modular. Separation should not be forced prematurely just because the repo can physically hold multiple services.

The question is not “can these be separate?”
The question is “does separate service ownership produce cleaner semantic truth?”

If not, use one service with multiple modules.

---

## Extraction should not remain ambient judgment

One of the biggest risks is leaving “should this internal thing become shared or extracted?” as an open contextual question.

That creates drift.

The rule should be explicit:

### Default

Keep internals nested and module-local unless an extraction trigger is hit.

### Extraction triggers

Create an extraction candidate when:
- a second module needs the same internal mechanism
- repeated duplication appears
- the internal subsystem becomes more stable than the service-specific logic around it
- ownership/lifecycle/governance starts to diverge
- the service boundary is being distorted to preserve nesting

### Important rule

Hitting a trigger does **not** mean auto-extract.
It means open a governed extraction candidate.

Flow:

```text
nested by default
  ↓
trigger hit
  ↓
record extraction candidate
  ↓
assess
  ↓
keep nested or extract deliberately
```

This turns fuzzy architectural taste into a manageable governance process.

---

## Progression law

The whole internal structure should follow this progression:

```text
module-local first
  ↓
service/shared if duplication is real
  ↓
package extraction only if cross-service support value is real
```

This progression matters because it preserves semantic truth at the smallest scope long enough for the real reuse seams to reveal themselves.

A package should earn its generality.
A shared internal seam should earn its centrality.
A module should keep ownership by default.

---

## What this unlocks later

This internal structure is not just about tidiness.
It supports the later system in several ways.

### 1. Better graph law

Once modules, service-shared internals, and packages have distinct meanings, later Nx policy becomes much easier to encode without ambiguity.

### 2. Better scaffolding

Generators can scaffold the kernel pattern consistently because the progression law is explicit.

### 3. Better agent behavior

Agents get fewer ambient “should I move this?” questions because defaults and exceptions are clear.

### 4. Better observability and stewardship

Ownership zones become easier to observe, reason about, and assign stewardship over.

### 5. Better pressure-testing

Cross-boundary work becomes easier to evaluate because service-internal truth is not constantly leaking outward through premature package extraction.

---

## Final law

If there is one rule to carry forward, it is this:

```text
Services should be module-encapsulated by default.
Service-shared internals are earned exceptions.
Package extraction is a governed move, not a convenience refactor.
```

That is the internal structure law that best matches the larger goals of the system:

- low ambiguity
- strong semantic ownership
- clear scaling from small to large
- future graph enforcement
- future scaffoldability
- future autonomous stewardship

