# RAWR Workflow Plugin Shell

## Purpose

Define the simplest architecture that still gives RAWR a strong, scalable workflow model:

- external systems can discover and trigger named workflows through OpenAPI and oRPC
- workflow authors can compose any number of private service clients and external APIs
- Inngest owns durable execution, retries, and step checkpoints
- host composition remains explicit and safe
- the public workflow contract stays stable even if workflow internals change

This is the clean separation:

- **oRPC/OpenAPI** owns the **workflow invocation surface**
- **Inngest** owns the **workflow execution runtime**
- **private service clients** own the **business capabilities used inside workflows**

The workflow plugin is the package that binds those three together.

---

## Core model

A workflow plugin is a **named workflow capability package**.

It has three surfaces:

1. **Workflow API surface**
   - the public or host-callable contract
   - exposed through oRPC
   - optionally published through OpenAPI
   - used to trigger, inspect, and control workflow runs

2. **Workflow execution bundle**
   - the Inngest functions that actually perform the durable work
   - uses `step.run(...)` for checkpoints, retries, and resumability
   - may call any number of private service clients or external APIs

3. **Workflow bindings**
   - host-injected context and private clients required by both routes and functions
   - keeps workflow packages decoupled from concrete host wiring

That means the mental model is:

**Workflow plugin = named workflow API + Inngest execution bundle + client bindings**

Not:

**workflow plugin = auto-generated routes from raw Inngest functions**

That latter model is too leaky.

---

## What this design optimizes for

This design tries to maximize three things at once.

### Robustness

- stable external contract
- explicit host composition
- idempotent trigger semantics
- clear run status ownership
- ability to add auth, validation, quotas, and dedupe at the API boundary
- ability to evolve workflow internals without breaking callers

### Flexibility

- one workflow can call many private service clients
- one workflow API route can dispatch one or many Inngest functions
- workflows can mix internal and external API calls
- plugins can support custom routes beyond `trigger/status`
- plugins can use plugin-local run storage or core coordination storage

### Simplicity

- one canonical plugin shape
- one canonical host registration model
- explicit route authoring instead of magical function-to-route inference
- shared shell/builder instead of hand-wiring every plugin differently

---

## Non-goals

This design does **not** try to make Inngest functions themselves the public API.

It also does **not** try to auto-wrap steps into endpoints.

Reasons:

- steps are execution checkpoints, not business API operations
- Inngest function bundles do not fully define public API semantics
- public trigger/status/cancel/retry semantics often require extra logic not present in the function definition
- function internals should remain replaceable without forcing API drift

---

## Canonical workflow plugin shape

### File tree

```text
plugins/
  workflows/
    support-triage/
      package.json
      index.ts
      src/
        index.ts
        plugin.ts
        base.ts
        context.ts
        contract.ts
        router.ts
        bindings.ts
        models/
          run.ts
          inputs.ts
          outputs.ts
        operations/
          trigger-run.ts
          get-status.ts
          get-timeline.ts
          cancel-run.ts
          retry-run.ts
        functions/
          support-triage-runner.ts
          support-triage-escalation.ts
        runtime/
          dispatch.ts
          run-store.ts
          idempotency.ts
          concurrency.ts
        middleware/
          observability.ts
          analytics.ts
          authorization.ts
        errors.ts
```

### Meaning of each file

`plugin.ts`
: the canonical descriptor exported to the host

`base.ts`
: workflow shell primitives and builders

`context.ts`
: workflow-specific typed boundary context built on shared host workflow context

`contract.ts`
: minified contract surface for the plugin router

`router.ts`
: composed workflow API router

`bindings.ts`
: private service client bindings and host enrichment hooks

`operations/*`
: public workflow API handlers such as trigger, status, timeline, cancel, retry

`functions/*`
: Inngest durable execution units

`runtime/*`
: internal execution support utilities, not public contract

---

## The workflow shell

Workflow plugins should have a **workflow-native shell** parallel to service packages.

Not the exact same shell, because workflow plugins are not plain services.

### Shared workflow shell responsibilities

The shell should provide:

- typed workflow context lanes
- procedure builders for workflow routes
- middleware builders for workflow routes
- optional observability and analytics builders
- a canonical plugin descriptor helper
- helpers for standard trigger/status/timeline/cancel/retry patterns

### Proposed workflow context lanes

The shared shell should split context into these semantic lanes.

#### `deps`

Stable host-owned workflow prerequisites.

Examples:

- logger
- clock
- runtime adapter
- Inngest client
- storage adapters
- auth services

#### `scope`

Stable workflow identity and tenancy boundary.

Examples:

- workspace id
- account id
- org id
- environment
- capability id

#### `config`

Stable workflow behavior configuration.

Examples:

- concurrency limits
- dry-run defaults
- timeout policies
- external API toggles
- retention modes

#### `invocation`

Per-request invocation context.

Examples:

- request id
- correlation id
- caller principal
- trace metadata
- auth decision

#### `provided`

Downstream provider-added execution resources.

Examples:

- private service clients
- repo handles
- cached auth decision
- external SDK wrappers

This keeps workflow plugins structurally aligned with the clarity of service packages while still acknowledging workflow-specific runtime concerns.

---

## Canonical plugin descriptor

The host should consume workflow plugins through one explicit descriptor.

### Proposed shape

```ts
export type WorkflowPluginDescriptor = {
  kind: "workflow";
  capability: string;
  pathPrefix: string;

  router: AnyWorkflowRouter;
  contract: AnyWorkflowContract;
  functions: readonly unknown[];

  enrichContext: (context: HostWorkflowContext) => HostWorkflowContext;

  metadata?: {
    name?: string;
    summary?: string;
    description?: string;
    tags?: string[];
  };

  features?: {
    trigger: boolean;
    status: boolean;
    timeline?: boolean;
    cancel?: boolean;
    retry?: boolean;
    health?: boolean;
  };

  runModel?: {
    authority: "plugin-local" | "core-coordination";
  };
};
```

### Why this is enough

This gives the host everything it needs:

- what capability is being registered
- how to mount the OpenAPI surface
- what Inngest functions to include in the handler
- how to enrich host context with plugin-specific clients
- what lifecycle operations the plugin supports
- where run truth is stored

It is explicit, small, and extensible.

---

## Public workflow API surface

For most workflow plugins, the public API surface should follow a standard pattern.

### Standard operations

#### `trigger`

Starts a workflow run.

Responsibilities:

- validate input
- normalize ids
- apply authorization
- dedupe or short-circuit if needed
- optionally write queued state before dispatch
- dispatch one or more Inngest events or function starts
- return accepted/run handle response

#### `status`

Returns a current run projection.

Responsibilities:

- look up run state
- return stable run projection independent of raw Inngest internals

#### `timeline`

Returns run events or progress history.

Responsibilities:

- expose durable workflow progress in a domain-safe way

#### `cancel`

Requests cancellation.

Responsibilities:

- mark intent to cancel
- signal underlying runtime if supported
- preserve clear semantics if cancellation is best-effort

#### `retry`

Requests a new attempt or replay.

Responsibilities:

- validate retry policy
- either requeue from input or resume from known checkpoint model

#### `health`

Optional capability health route.

Responsibilities:

- show whether the workflow API and runtime are available

### Standard route shape

```text
POST   /api/workflows/<capability>/runs
GET    /api/workflows/<capability>/runs/{runId}
GET    /api/workflows/<capability>/runs/{runId}/timeline
POST   /api/workflows/<capability>/runs/{runId}/cancel
POST   /api/workflows/<capability>/runs/{runId}/retry
GET    /api/workflows/<capability>/health
```

### Why standardization matters

This keeps external integrators sane.

A system reading OpenAPI should not have to learn a completely different shape for each workflow plugin unless there is a real business reason.

At the same time, the descriptor should allow custom routes when needed.

---

## Execution bundle shape

The execution bundle is the plugin’s Inngest function array.

### Rules

1. Functions are **internal execution units**, not the public API.
2. `step.run(...)` boundaries are execution checkpoints, not REST endpoints.
3. Function handlers may call any number of private service clients or external APIs.
4. Function handlers should not own the external workflow contract.
5. Trigger handlers should not leak raw Inngest details unless intentionally exposed.

### Canonical responsibilities of functions

- consume dispatch events
- perform durable steps
- persist progress or run updates
- call private service clients
- call external APIs
- produce stable completion/failure records

### Canonical responsibilities that should stay outside raw functions

- public request validation
- external API contract design
- OpenAPI metadata
- route naming
- auth policy at the external boundary
- idempotent trigger response semantics
- custom status projection formatting

---

## Binding layer

The binding layer is what makes workflow plugins composable.

It should let the host inject any private clients needed by the workflow.

Examples:

- support service client
- CRM client
- analytics client
- sales pipeline client
- notification client
- repo-backed coordination adapters

### Design rule

A workflow plugin should depend on **typed client interfaces**, not concrete host implementation details.

That means:

- route handlers use `context.<client>`
- Inngest functions resolve the same clients through host-owned bindings
- the plugin never reaches into the host directly for ad hoc wiring

### Why this matters

This is what lets a single workflow compose across many service packages while keeping each service package clean and reusable.

---

## Trigger route semantics

The trigger route is the most important boundary in the whole design.

### Trigger route must own

- input validation
- id normalization
- dedupe/idempotency behavior
- authorization
- quota/concurrency guardrails
- acceptance response
- dispatch policy

### Trigger route should return a stable response

Example:

```json
{
  "accepted": true,
  "run": {
    "runId": "support-run-123",
    "workflow": "support-triage",
    "status": "queued",
    "startedAt": "2026-03-13T20:00:00.000Z"
  },
  "eventIds": ["evt_123"]
}
```

### Why not expose raw function execution directly

Because callers care about business acceptance and run state, not internal function topology.

The trigger route is where business semantics are turned into durable execution.

---

## Run state model

The design should support two modes.

### Mode A: plugin-local run model

Use when:

- workflow is standalone
- plugin owns its own lifecycle semantics
- no need to integrate deeply with global coordination views

Benefits:

- simple
- capability-local
- easy to reason about

Costs:

- fragmented run visibility across plugins
- more duplicate patterns

### Mode B: core coordination-backed run model

Use when:

- workflow should participate in global coordination views
- timeline and status should be standardized
- host needs cross-plugin visibility and governance

Benefits:

- unified run visibility
- shared tooling and observability
- standard status/timeline semantics

Costs:

- more coupling to core coordination model
- heavier upfront structure

### Recommendation

Support both, but declare the choice explicitly in the plugin descriptor.

Default to **plugin-local** for simple capability workflows.
Use **core-coordination** for workflows that matter operationally across the system.

---

## Why not auto-wrap the function bundle into a router

This is the architectural trap to avoid.

### Problem 1: execution units are not contract units

An Inngest function does not fully define:

- public path
- public method
- public request shape
- acceptance response semantics
- dedupe policy
- auth policy
- status/timeline routes
- cancel/retry support

### Problem 2: one-to-one mapping is false

Common mismatches:

- one route may dispatch multiple functions
- one route may pick between functions
- multiple routes may interact with one workflow family
- some functions may be internal only
- status/timeline routes usually have no function counterpart

### Problem 3: it leaks runtime internals into the public contract

If the contract is derived from raw functions, then implementation refactors become API breaks.
That is backwards.

### Better rule

Generate boilerplate around an explicit plugin descriptor.
Do not generate the public router by inspecting raw functions alone.

---

## The right kind of automation

There **should** be automation, just at the correct level.

### Good automation

- generate standard `trigger/status/timeline/cancel/retry` route scaffolds
- generate minified contract from router
- generate OpenAPI tags and mount paths from plugin descriptor
- auto-register function bundles into the host Inngest handler
- auto-enrich workflow context from plugin bindings
- auto-wire standard run projection helpers

### Bad automation

- infer the public router purely from Inngest functions
- infer routes from steps
- make function names the public API surface
- force every plugin into one execution topology

---

## Host composition model

The host should no longer hand-wire workflow plugins ad hoc.

### Discovery

Workflow plugins are already first-class workspace kinds.
That should continue.

### Registration flow

1. discover workflow plugin packages
2. load plugin descriptors
3. compose workflow routers under `/api/workflows/*` and `/rpc`
4. collect all function bundles into one Inngest handler
5. apply host context enrichment hooks
6. mount capability path prefixes from plugin descriptors

### Why host owns composition

The host is where:

- runtime adapters live
- Inngest client authority lives
- shared auth policy lives
- telemetry installation lives
- capability enablement/disablement lives

Workflow plugins should declare what they need.
The host should decide how they are assembled.

---

## Recommended authoring API

### Shared workflow shell

```ts
export const workflow = createWorkflowShell<{
  deps: HostWorkflowDeps;
  scope: HostWorkflowScope;
  config: HostWorkflowConfig;
  invocation: HostWorkflowInvocation;
  provided: HostWorkflowProvided;
}>();
```

### Procedure builder

```ts
export const workflowProcedure = workflow.procedure;
```

### Plugin definition

```ts
export const supportTriagePlugin = defineWorkflowPlugin({
  capability: "support-triage",
  pathPrefix: "/support-triage",
  router,
  contract,
  functions,
  enrichContext,
  features: {
    trigger: true,
    status: true,
    timeline: true,
    cancel: true,
    retry: true,
  },
  runModel: {
    authority: "core-coordination",
  },
});
```

### Why this is enough

This keeps authorship simple:

- define routes
- define functions
- define bindings
- export descriptor

No magic. No ambiguity.

---

## Recommended invariants

These should be treated as architectural rules.

### Invariant 1

**A workflow plugin exposes an explicit workflow API router.**

Never make raw Inngest functions the only public surface.

### Invariant 2

**Inngest steps are internal execution checkpoints, never public endpoints.**

### Invariant 3

**Trigger semantics live at the API boundary, not inside function metadata.**

### Invariant 4

**Route handlers and function handlers may share bindings, but not identity.**

They can use the same clients and models without becoming the same abstraction.

### Invariant 5

**Workflow context lanes are canonical and shared.**

Stop hand-mirroring server workflow context types across plugins.

### Invariant 6

**Host composition is descriptor-driven.**

Stop hardcoding workflow plugin assembly in a central manifest as the long-term model.

### Invariant 7

**The public workflow contract must survive internal runtime refactors.**

If you swap one Inngest function for three, callers should not care.

---

## Minimal viable implementation plan

### Phase 1: shell extraction

Create a shared workflow shell package with:

- canonical workflow context lanes
- workflow procedure builder
- workflow middleware builders
- `defineWorkflowPlugin(...)`

### Phase 2: descriptor-driven workflow registration

Move from hand-wired workflow registration to discovered descriptors.

### Phase 3: standard route helpers

Add scaffold/helpers for:

- trigger
- status
- timeline
- cancel
- retry
- health

### Phase 4: shared run model options

Support plugin-local and core-coordination-backed run authorities explicitly.

### Phase 5: host manifest simplification

Reduce host composition code to:

- load plugins
- compose routers
- compose functions
- enrich context
- mount handlers

---

## Final recommendation

The most robust, flexible, and simple model is this:

### Canonical statement

A **workflow plugin** is a **named workflow capability package** that exposes a stable **oRPC/OpenAPI workflow API surface** for external or host callers, a separate **Inngest execution bundle** for durable long-running work, and a shared **binding layer** for injecting private service clients and runtime context into both.

### Practical consequence

Use oRPC to define the named workflow endpoints other systems can call.
Use Inngest to execute the long-running workflow after those endpoints accept and dispatch work.
Do not auto-convert raw functions or steps into the public API.
Instead, generate boilerplate around an explicit workflow plugin descriptor.

### Simplest durable shape

- explicit trigger/status/timeline/cancel/retry routes
- explicit Inngest function bundle
- explicit client bindings
- descriptor-driven host composition
- canonical workflow shell with stable context lanes

That gives RAWR a workflow model that is:

- strong enough for real external integration
- simple enough for plugin authors to follow
- flexible enough for many-client orchestration
- stable enough to survive internal runtime evolution

---

## Short version

Do this:

- define **workflow plugins** as explicit dual-surface packages
- public surface: **oRPC/OpenAPI workflow API**
- execution surface: **Inngest functions**
- shared injection surface: **private client bindings**
- compose everything through a **workflow plugin descriptor**

Do not do this:

- treat steps as endpoints
- treat raw functions as the public contract
- auto-wrap the function bundle directly into a router

That path looks simpler, but it collapses the most important boundary in the system.

