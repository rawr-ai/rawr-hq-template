# Adapter / Port Design Scratch

## Status

This is a scratch document.

It captures the current state of the design conversation, the active tensions,
and the open questions that are still making the discussion feel "spinny."

It is intentionally not final guidance and should not be treated as a settled
architecture decision.

## Key Unlock

The key unlock in the latest round of discussion is that we now have a clearer
mental model for the input layers.

The most important clarification is:

- the **service package's declared initial/dependency context must mean
  caller-fulfilled requirements only**
- and anything that violates that is the semantic problem we need to solve next

We also now have a second major clarification:

- there is a **separate top-level host entry point**
- that host entry point may be represented as a `baseline` or `host` property
  key (or something similar)
- the exact naming is not locked in yet, but the layer distinction is

That means the main design problem is not "where do clients live?"

It is:

- what the **service package declares**
- what the **caller must fulfill**
- what the **host/runtime provides through its own top-level entry point**
- what is derived later as execution-time resources
- and what module/procedure authors actually write against

We also have a third clarification from the latest round:

- **"host-provided" is not the same thing as `context.provided`**
- a capability can be host-owned and still be available **before execution
  starts**
- `context.provided` is for values attached later during middleware/setup, not
  for every capability the host happens to own

This matters because the current confusion is not really "where do clients
live?" It is "which input layer owns them, and when do they come into
existence?"

## Mind Map

### Core Frame

- We are designing the **domain service package** boundary.
- The main problem is not "where do clients live?"
- The real problem is:
  - what the **service package declares**
  - what the **caller must fulfill**
  - what the **host/runtime provides**
  - what module/procedure authors actually write against

### Locked In Mental Models

- **Declared initial context means caller-fulfilled requirements only.**
  - If something is in the service package's declared dependency/initial bag,
    the caller must satisfy it.
  - We should not describe that bag as containing things the SDK silently
    provisions for you.
- **Middleware does not inject back into `deps`.**
  - Up-front caller-supplied context is one thing.
  - Later execution-time additions are a different thing.
- **The service domain package is repo-and-service oriented.**
  - Module `repository.ts` is authored inside the domain package.
  - Module `router.ts` authors service externals/procedures.
  - The package is not primarily receiving pre-authored repositories from
    outside.
- **We are designing a transport-agnostic domain service.**
  - In-process now.
  - Potential worker/standalone service later.
  - That scaling concern remains active.
- **There is now a separate top-level host entry point.**
  - The exact property key is not locked in.
  - It may be represented as `baseline`, `host`, or something similar.
  - But the important distinction is locked in:
    - service-declared requirements are one thing
    - host/framework-level supplied requirements are another thing
- **Host-provided does not imply `context.provided`.**
  - Up-front host-owned capabilities can still belong to the construction-time
    boundary.
  - `context.provided` is specifically the execution-time derived/attached lane.
- **The active code smell is semantic mislabeling, not merely "concrete
  clients".**
  - Concrete clients/capabilities are not automatically wrong in the
    construction-time boundary.
  - The problem is pretending that SDK/baseline caller requirements were
    declared by the service package itself.

### Patterns / Boundaries / Invariants

- **Boundary honesty**
  - Declared requirements must match what the caller really must provide.
  - Hidden widening of caller obligations is semantically dangerous.
- **Host/runtime vs service package**
  - The host/runtime owns concrete composition.
  - The service package owns domain authoring.
  - Those are different layers and should not be collapsed.
- **Execution-time derived values are different from declared requirements.**
  - This distinction remains valid even though naming is still unsettled.
- **Ports/adapters are still potentially useful**
  - But only if they clarify ownership or semantics.
  - Not if they create fake-generic abstractions that strip away needed
    capabilities.
- **Separate top-level host input is now part of the working model**
  - This allows baseline/framework caller-fulfilled requirements to exist
    without pretending they were declared by the service package itself.

### Levers Already Identified

- **What module authors write against**
  - repositories/services
  - Drizzle-shaped DB capability
  - generic SQL capability
- **Where concrete clients exist**
  - service-declared caller boundary
  - host composition layer / top-level host entry point
  - execution-time resource layer
- **Whether a capability is a service-declared requirement, a host-level
  requirement, or a derived resource**
- **Whether a port is generic, concrete-shaped, or layered**
- **How the host entry point is represented structurally**
  - separate top-level `host`
  - separate top-level `baseline`
  - or something equivalent

### Still Carries Forward

- The current code likely mixes:
  - service-declared deps
  - SDK/baseline widened deps
  - and execution-time provisioned resources
- The API plugin's needs and the service package's needs are still probably
  different.
- Drizzle remains the key pressure point because it exposes whether abstraction
  is helping or hiding real authoring needs.
- The question of whether `provided` should really be something like
  `resources` is still alive, but not decided.
- The baseline wrappers consume logger/analytics/telemetry **before** later
  execution-time provisioning, so those capabilities do not fit the current
  meaning of `context.provided`.

## Updated Input-Layer Clarification

One of the earlier problems in the conversation was that we were mixing
multiple sources of input into one blurry model.

The clarified working model now looks more like this:

1. **Service-declared caller input**
   - what the service package explicitly declares
   - must be fulfilled by the caller
2. **Host/framework top-level input**
   - baseline/framework-level requirements that still must be fulfilled at the
     call boundary
   - but should not be pretended to be part of the service's own declared deps
   - this now gets its own top-level entry point
3. **Execution-time derived resources**
   - values attached later during middleware/setup
   - not part of the declared caller requirement bag

This now implies a sharper distinction:

- **service-declared caller input** is owned semantically by the service package
- **host/framework top-level input** is owned semantically by the SDK/host layer
- **execution-time resources** are owned semantically by the middleware/setup
  pipeline

The current code is confusing because it collapses the first two into one `deps`
bag.

## Active Tensions

### Tension A: Caller-fulfilled honesty vs SDK baseline requirements

We need the service package's declared dependency bag to stay honest:

- if the service declares it, the caller must fulfill it

But we also have real SDK/baseline caller requirements:

- logger
- analytics
- telemetry

The tension is that these baseline requirements are currently caller-fulfilled
too, but they are **not** really service-declared requirements.

### Tension B: Multiple hosts vs one concrete current host

We want the service package boundary to stay host-agnostic enough to support:

- the current embedded/in-process host
- possible future standalone-service deployment
- different host composition layers

But the current system has one concrete host story, which makes it tempting to
shape the package boundary as if that host were the only one that matters.

### Tension C: Same host, different caller/product configurations

Even on one host, different API plugins/products may need:

- differently configured analytics clients
- different telemetry scopes or names
- different logging adapters or logger instances

So we need a model that supports caller/product variance without pretending that
every module author must wire those concrete clients manually.

### Tension D: Avoiding a fake-generic abstraction

We want ports/adapters when they clarify ownership and semantics.

We do **not** want:

- fake-generic abstractions that collapse useful backend capability
- semantic drift where a "dependency" bag really means multiple unrelated kinds
  of input
- a model that hides who is actually responsible for supplying which capability

## Working Insight

The current confusion is best explained like this:

- **service-declared caller requirements**
- **host/framework caller requirements**
- **execution-time derived resources**

are three different input layers, and we have been collapsing at least the
first two into one runtime bag.

That is why the current model feels incoherent.

The key insight is:

- logger, analytics, and telemetry are **up-front host-owned caller inputs**
- they are **not** service-declared deps
- and they are **not** execution-time `provided` resources in the current
  runtime model

So the fix is not "move them into `provided`."

The fix is:

- keep them as up-front caller-fulfilled input
- but give them a **separate top-level host/baseline lane**

## Working Resolution Model

The current best working model is:

```ts
createClient({
  deps: {
    dbPool,
    clock,
  },
  host: {
    logger,
    analytics,
    telemetry,
  },
  scope: {
    workspaceId,
  },
  config: {
    readOnly,
    limits,
  },
})
```

The exact key is not locked in:

- `host`
- `baseline`
- or something equivalent

But the shape is what matters:

- `deps` = service package caller requirements
- `host` / `baseline` = SDK/framework caller requirements
- `provided` / later `resources` = execution-time derived values

Important implication:

- if a caller wants to pass a fully configured analytics client directly, that
  belongs in the host/baseline lane
- if a host wants to provision an analytics client from configuration, that
  provisioning happens in host composition **before** `createClient(...)`
- the service package should not have to encode that provisioning dance inside
  its own declared dependency bag

## Tension -> Resolution Mapping

### Tension A -> Resolution

**Tension**
- Caller-fulfilled honesty versus SDK baseline caller requirements

**Resolution**
- Keep both caller-fulfilled, but separate them structurally.
- The service package declares only service-owned caller requirements.
- The SDK/host layer declares its own top-level caller requirements.

**Why this helps**
- the service package no longer appears to declare things it did not declare
- the caller contract stays honest
- SDK baseline requirements still have an explicit place to live

### Tension B -> Resolution

**Tension**
- Multiple hosts versus one concrete current host

**Resolution**
- Treat the host/baseline lane as the host-composition seam.
- Different hosts can satisfy that seam differently without changing the
  service's declared deps.

**Why this helps**
- the package boundary stops assuming one permanent host
- embedded/in-process host stays supported
- future standalone-service composition stays possible

### Tension C -> Resolution

**Tension**
- Same host, different caller/product configurations

**Resolution**
- Let the caller/host composition layer supply differently configured
  host-level capabilities in the top-level host/baseline lane.
- Keep the service package unaware of the provisioning details.

**Why this helps**
- different API plugins/products can supply different analytics/telemetry
  instances or scopes
- we do not have to pretend those provisioning parameters are service-declared
  deps
- per-caller variance is handled where it belongs: host composition

### Tension D -> Resolution

**Tension**
- Avoiding fake-generic abstraction and semantic drift

**Resolution**
- Keep ports/adapters only where they clarify ownership or capability
  contracts.
- Do not move host-owned up-front capabilities into the execution-resource lane
  just because the host owns them.
- Do not force the service package dependency bag to carry SDK/host semantics.

**Why this helps**
- ownership stays explicit
- runtime timing stays honest
- the model does not dumb down capabilities just to fit one bag

## System Impact

If this working model holds, it changes the system in a meaningful way:

- the package boundary becomes **more semantically honest**
- the SDK stops silently widening service-declared deps with baseline
  requirements
- host composition becomes a first-class layer instead of a hidden assumption
- execution-time resources become easier to reason about because they stop
  competing with up-front host capabilities for the same conceptual slot

This also affects how future real integrations should be reasoned about:

- PostHog-like analytics may still be host-owned up-front capability, or may
  later pressure a provider-based execution model
- telemetry remains clearly an up-front host capability unless we explicitly
  redesign its runtime shape
- Drizzle pressure should be evaluated separately from this lane split, rather
  than smuggling the ORM decision into the dependency/provisioning model

## Trade-Offs

This model does take on some trade-offs, but they appear acceptable:

- **More explicit boundary structure**
  - There is one more top-level lane to understand.
  - This is acceptable because it buys semantic honesty.
- **More visible host-composition responsibility**
  - The host/caller must acknowledge baseline requirements explicitly.
  - This is acceptable because those requirements were already real; they were
    just being hidden.
- **No free collapse of all up-front values into one bag**
  - Simpler object shape is traded for cleaner meaning.
  - This is acceptable because the current single-bag model is the source of
    the confusion.

At the moment this looks more like "threads the needle with a manageable
structure cost" than like a high-cost trade-off.

This is the current best mental model for why the earlier discussion felt
incoherent.

## Not Locked In Yet

- The final meaning/naming of:
  - `deps`
  - `provided`
  - possible `resources`
  - the exact host entry key (`host`, `baseline`, or similar)
- Whether logger/analytics/telemetry belong as:
  - service-declared caller requirements
  - host-level top-entry requirements
  - execution-time derived resources
- What exact DB authoring model we want inside the domain package:
  - repo-oriented over lower-level DB capability
  - Drizzle-oriented
  - generic SQL-oriented
- Whether ports are needed for each capability, or whether some concrete
  clients should just be the boundary.

## Open Questions

- If declared initial context is caller-fulfilled only, what exactly belongs in
  the separate top-level host entry point?
- Should the host-level entry point hold fully provisioned capabilities,
  provisioning prerequisites, or allow both depending on the capability?
- Is the host itself the canonical caller at the service boundary in the
  important cases, or do we need a cleaner distinction between:
  - external caller
  - API plugin
  - host runtime
  - internal composition layer
- What should the execution-time resource lane actually mean?
- Should module code ever see Drizzle directly?
- If yes, at what layer?
- Should the host-level entry point hold:
  - concrete capabilities,
  - provisioning prerequisites,
  - or both?

## Open Design Problems

- The current model appears to make the declared service deps bag and the
  actual caller requirement diverge.
- We do not yet have a stable semantic split between:
  - service-declared caller requirements
  - host/framework top-level caller requirements
  - execution-time resources
- We do not yet have a crisp answer for how API plugins consume the domain
  service without reintroducing manual wiring pain everywhere.
- We do not yet know whether the host-level entry point should expose concrete
  clients directly or only the inputs needed to provision them.

## Possible Missing / Partial Levers

- The identity of the "caller" may itself be under-specified.
  - human-facing caller
  - API plugin
  - host runtime
  - internal composition layer
- We may need a stronger distinction between:
  - **service package declaration boundary**
  - **host composition boundary**
- We may not yet have fully identified whether some capabilities should be
  modeled as:
  - prerequisites
  - factories
  - already-provisioned handles
  - or derived execution resources
- We may still be missing a clear rule for when a capability should live in:
  - the service-declared input,
  - the host top-level entry point,
  - or the later execution resource lane

## Why This Doc Exists

This document exists to stop the discussion from flattening several different
personal or architectural concerns into one blurry question.

At minimum, the conversation currently contains these separable concerns:

- domain service authoring model,
- API plugin versus service package boundary needs,
- repository authoring ownership,
- concrete ORM choice versus generic abstraction,
- host ownership of concrete clients,
- service-declared input versus host-level input,
- and whether ports/adapters are actually earning their keep in each case.

The next design step should try to handle those concerns more deliberately
rather than treating them as one single yes/no question about "ports and
adapters."
