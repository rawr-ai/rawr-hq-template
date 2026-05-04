# Lane 2.2 Patch — Recommendation #6 Compressions (§10.4, §10.5, §10.6, §17.6)

**Workstream:** Runtime-Architecture Alignment
**Lane:** 2.2
**Phase:** Phase 2
**Worker:** Worker B
**Target spec:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
**Decision in effect:** W-3 — the four `Process*HubResource` types are runtime-spec-only; arch-spec refers to them by category only.

---

## Sub-edit 2.2.A — Compress §10.4 (SDK derivation)

**Spec location:** Line 1655
**BEFORE lines:** 1655–1671

BEFORE:
```
### 10.4 SDK derivation

The SDK derives explicit artifacts from compact authoring declarations.

The SDK owns:

- normalized authoring graph;
- canonical identities;
- resource requirements;
- normalized provider selections;
- service binding plans;
- surface runtime plan descriptors;
- workflow dispatcher descriptors;
- portable plan artifacts;
- derivation diagnostics.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.
```

AFTER:
```
### 10.4 SDK derivation

The SDK derives structured plan artifacts and an in-process execution descriptor table from compact authoring declarations. SDK derivation is the public authoring boundary: SDK output is the sole input to the runtime compiler.

The SDK does not acquire resources, execute providers, construct managed runtime roots, construct native harness payloads, mount harnesses, or define native framework semantics.

The specific artifact types, their portability classification, and the producer/consumer contract for each artifact are defined in the runtime realization specification, §15.
```

---

## Sub-edit 2.2.B — Compress §10.5 (Runtime compiler)

**Spec location:** Line 1673
**BEFORE lines:** 1673–1701

BEFORE:
```
### 10.5 Runtime compiler

The runtime compiler turns a normalized authoring graph plus entrypoint selection into one `CompiledProcessPlan`.

It validates:

- selected roles and surfaces;
- topology and builder agreement;
- provider coverage;
- provider dependency closure;
- service dependency closure;
- service binding DAG shape;
- harness targets;
- surface adapter targets.

It emits:

- compiled process plan;
- provider dependency graph;
- compiled resource plans;
- compiled service binding plans;
- compiled surface plans;
- compiled workflow dispatcher plans;
- harness plans;
- bootgraph input;
- topology seed;
- runtime diagnostics.

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state.
```

AFTER:
```
### 10.5 Runtime compiler

The runtime compiler consumes SDK-derived artifacts plus the entrypoint's selected app, profile, and harness configuration, validates coverage and dependency closure against architectural invariants, and emits one `CompiledProcessPlan` plus diagnostics.

Compilation precedes provisioning and harness mounting. A compilation failure aborts startup before any resource is acquired.

The runtime compiler does not acquire resources, bind live services, construct native functions, mount harnesses, or write final runtime catalog state.

The complete validation rules, emission contract, and `CompiledProcessPlan` shape are defined in the runtime realization specification, §16.
```

---

## Sub-edit 2.2.C — Compress §10.6 (Bootgraph and provisioning kernel)

**Spec location:** Line 1703
**BEFORE lines:** 1703–1727

NOTE: The BEFORE and AFTER blocks below use quadruple-backtick fences so the inner triple-backtick `text` code block is preserved literally.

BEFORE:
````
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
```

The provisioning kernel owns:

- one root managed runtime per started process;
- process scope and role child scopes;
- resource acquisition and release from compiled provider plans;
- config loading, validation, and redaction;
- structured runtime errors;
- runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics;
- runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry;
- reverse-order deterministic disposal.

Process-local coordination primitives do not become durable workflow ownership.
````

AFTER:
````
### 10.6 Bootgraph and provisioning kernel

Bootgraph is the RAWR lifecycle graph above Effect layer composition. It owns stable lifecycle identity, deterministic ordering, dedupe, rollback, reverse finalization order, and typed context assembly for process and role lifetimes.

The Effect provisioning kernel is the runtime-owned substrate beneath bootgraph.

The control split is fixed:

```text
RAWR plans identity, order, dependency, lifetime, and boundary policy.
Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.
```

The provisioning kernel owns one root managed runtime per started process; process and role lifetime scopes; scoped resource acquisition and release from compiled provider plans; validated and redacted config loading; structured runtime errors; lifecycle and provider acquisition telemetry; and reverse-order deterministic disposal.

Process-local coordination is not durable workflow ownership. The named RAWR-owned process-local coordination resources and the Effect-internal substrate primitives they wrap are defined in the runtime realization specification, §14 and §17.3.
````

---

## Sub-edit 2.2.D — Compress §17.6 invariant primitive bullet

**Spec location:** Line 2787
**BEFORE lines:** 2787–2796

BEFORE:
```
### 17.6 Bootgraph and provisioning invariants

- bootgraph is process-local only;
- bootgraph owns process and role acquisition ordering;
- startup failure is fatal for the selected process shape;
- rollback applies to already-started components in the failed startup subset;
- finalizers run deterministically in reverse order;
- each started process owns one root managed runtime;
- process, role, invocation, and call-local remain distinct runtime lifetimes;
- runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics.
```

AFTER:
```
### 17.6 Bootgraph and provisioning invariants

- bootgraph is process-local only;
- bootgraph owns process and role acquisition ordering;
- startup failure is fatal for the selected process shape;
- rollback applies to already-started components in the failed startup subset;
- finalizers run deterministically in reverse order;
- each started process owns one root managed runtime;
- process, role, invocation, and call-local remain distinct runtime lifetimes;
- RAWR-owned process-local coordination resources are defined in the runtime realization specification, §14; their underlying Effect-internal primitives are runtime substrate detail and are not enumerated in this invariant set.
```

(The 8th bullet replaces "runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics." with the category pointer.)
