# RAWR semantic architecture snapshot

## What this is

This is the current canonical design snapshot.

It is not a broad architecture inventory and it is not a narrow implementation checklist.

It captures the current semantic target, why it matters, what has been learned so far, what should be locked now, what should still be pressure-tested, and what sequence creates the most leverage for the next phase.

The goal is simple: create a system whose structure becomes legible enough that future enforcement, scaffolding, worktree harnessing, and eventually autonomous stewardship can be built on top of it without fighting ambiguity at every layer.

---

## The core realization

The repo is not only becoming a software system. It is becoming a machine-operable environment.

That changes what matters.

The main job is no longer just choosing frameworks or making code reusable. The main job is to make the architecture semantically explicit enough that:

- humans can reason about it quickly,
- agents can operate inside it safely,
- boundaries can be pressure-tested and then enforced,
- runtime embodiment can stay separate from semantic truth,
- later graph tooling like Nx can encode real structure instead of premature guesses.

The design pressure has made one thing clear: the system needs explicit distinction between **semantic capability truth**, **runtime embodiment**, and **runtime container/boot authority**.

That leads to the locked target ontology below.

---

## Locked target semantic architecture

### Top-level roots

```text
packages/   pure/shared/supporting code
services/   contract-bearing in-process service boundaries
plugins/    runtime-hosted embodiments and adapters
apps/       host implementations
```

This is the current target.

### Why this is the right split

`packages/` and `services/` are not the same thing.

A pure package is shared matter: types, helpers, SDKs, adapters, utilities, lower-level primitives, and anything else that does not itself define a first-class service boundary.

A service is a semantic boundary. It owns contract-bearing behavior, stable context lanes, service-wide middleware semantics, and the internal modules/procedures that make up a meaningful capability surface.

A plugin is not the service itself. A plugin is how some runtime surface mounts, wraps, adapts, exposes, or runs one or more services.

An app is not the business logic center. An app is a host. It owns bootstrapping, runtime composition, lifecycle, and mounting.

That gives the system a clean four-part model:

```text
package = support matter
service = semantic capability boundary
plugin = runtime embodiment / adapter
app = host / boot authority
```

This is the minimum vocabulary that makes the rest of the architecture legible.

---

## Why `services/` won

Several alternatives were explored: `domains`, `capabilities`, `boundaries`, `kernel`, and staying under `packages/`.

`kernel` was rejected because it implies privileged global centrality and would blur more than clarify.

`domains` was rejected as the primary root because some service-boundary units may become large and domain-heavy, but many may remain smaller or more mixed in scope. Using `domain` for all of them would overweight the small ones and encourage unnecessary ceremony.

`capabilities` was strong, but in practice `services` is simpler, more natural, and more immediately readable once the runtime plugin subtype is renamed away from `service`.

That is the key trick: keep `services/` for semantic service boundaries, and use runtime-specific nouns under plugins.

Examples:

```text
services/todo
services/support

plugins/web/support-panel
plugins/api/support-api
plugins/worker/support-triage
plugins/background/todo-sync
```

This keeps `service` as the semantic concept and gives runtime embodiments their own clearer names.

---

## The service concept, locked

A service is a contract-bearing in-process boundary.

It is not merely “code with behavior.”
It is not merely “a package.”
It is not yet “a deployed microservice.”

It is the semantic unit that owns:

- stable boundary contracts,
- stable context lane structure,
- required service-wide middleware semantics,
- central service implementer composition,
- internal module/procedure decomposition,
- business-capability truth for that boundary.

The service package is where semantic truth lives.

It may be small or large.
It may grow domain weight over time.
That does not change its type.

The important thing is that its meaning is now explicit.

---

## The plugin concept, clarified

A plugin is a runtime-hosted embodiment.

It owns runtime-facing concerns:

- mounting onto a host,
- transport and surface adaptation,
- runtime middleware,
- host integration,
- lifecycle participation,
- optional background/worker behavior,
- runtime-specific orchestration.

A plugin may wrap a service directly.
A plugin may expose a service through a particular runtime surface.
A plugin may sometimes compose runtime-specific behavior across services.

But plugins should not become the default home of semantic composition.

That pressure-test question is still being actively resolved, but the current target principle is:

- **semantic composition belongs in services when it is part of service truth**
- **plugins compose only when the composition is genuinely runtime-specific**

This distinction is one of the most important remaining architecture questions, and it must be pressure-tested rather than guessed.

---

## The host concept, formalized

The current repo already behaves as if a host exists. It just has not been named strongly enough.

A host is the boot authority for a runtime surface.

It owns:

- process/app bootstrap,
- runtime identity,
- config and repo-root authority,
- telemetry installation,
- runtime lifecycle,
- route/app composition,
- plugin mounting,
- base URL / port / worktree identity.

That means the current system should explicitly recognize:

```text
service = what behavior exists
plugin = how behavior is embodied or mounted
host = where behavior boots and lives at runtime
```

This matters now because the future requires allowing some plugins to begin mounted on a shared host and later graduate into their own dedicated host/server without collapsing semantic boundaries.

So the target model becomes:

```text
apps/       host implementations
plugins/    runtime embodiments that target hosts
services/   host-agnostic semantic service truth
packages/   pure support matter
```

This is the correct foundation for later shared-host and dedicated-host topologies.

---

## Why this ontology speeds things up

The point of the ontology is not tidiness.
The point is leverage.

Right now ambiguity costs time in every direction:

- when deciding what belongs where,
- when pressure-testing cross-boundary work,
- when asking whether a plugin is wrapping behavior or defining it,
- when deciding what future Nx graph types should exist,
- when deciding what should be scaffolded,
- when deciding what agents should be allowed to operate over.

The locked ontology reduces ambiguity in advance.

It gives a simpler set of questions:

- Is this support matter? Then it is a package.
- Is this a semantic boundary with contracts and service lanes? Then it is a service.
- Is this runtime-hosted adaptation or embodiment? Then it is a plugin.
- Is this bootstrapping and runtime container authority? Then it is a host app.

That makes cross-boundary design work faster because it narrows the kinds of architectural mistakes that are even thinkable.

It also sets up later graph law cleanly: once the ontology is stable, Nx tags and graph policy become encoding, not exploration.

---

## What is already locked vs what still needs pressure

### Locked enough to act on

The following is sufficiently clear to treat as the target semantic direction:

- service as a first-class semantic boundary,
- package as pure/shared support matter,
- plugin as runtime embodiment,
- app as host,
- hosts as first-class architectural concept,
- service truth separate from runtime embodiment,
- eventual Nx encoding should follow semantic truth, not invent it.

### Still needs pressure-testing

The biggest unresolved boundary question is at the plugin edge.

Specifically:

1. When should a plugin directly wrap one service router 1:1?
2. When should a plugin compose multiple services directly into a runtime surface?
3. When should cross-service semantic composition become a composed service package that a plugin then mounts thinly?

This is the live architectural frontier.

It should be resolved through concrete examples, not abstract preference.

---

## Canonical pressure-test program

The next phase is not just “finish todo.”

The next phase is to use one golden service plus additional service shapes to force the remaining truth out of the system.

### Pressure-test stack

1. **Golden single service**
   - finish the todo example as the canonical single-service boundary
   - lock service semantics, lane structure, implementer seam, module setup pattern, middleware layering

2. **One smaller service**
   - narrower and simpler than todo
   - proves the lower bound of service shape

3. **One larger composed service**
   - composes the smaller services or parts of them
   - proves what semantic composition wants to look like in service land

4. **Plugin-boundary wiring tests**
   - one plugin wraps a service nearly 1:1
   - one plugin composes multiple services directly
   - one plugin mounts a composed service thinly

### Why these examples matter

This is the only reliable way to answer:

- what plugins should be allowed to own,
- where semantic composition should land,
- where runtime composition should land,
- whether service truth remains centered in services under real pressure,
- what should later be encoded in Nx generators and graph rules.

Without this phase, later codification risks freezing the wrong ontology.

---

## Sequencing for maximum leverage

The correct next sequence is not a broad refactor. It is a domino chain.

### Phase 1 — lock the service definition and golden exemplar

Finish the todo service until it stops teaching fundamentally new lessons every day.

This is where service truth gets sharp.

**Why first:** later naming, graph law, and scaffolding all depend on this.

### Phase 2 — make service semantics explicit in the repo

Once the service definition is clear enough, move proven service-boundary units into `services/`.

Do this as semantic clarification, not final over-encoding.

**Why now:** explicit naming improves the quality of the next cross-boundary experiments by changing how both humans and agents see the repo.

### Phase 3 — run the cross-boundary pressure test

Add:

- one smaller service,
- one larger composed service,
- plugin wrappers/compositions over them.

This phase resolves the plugin/service boundary law.

**Why now:** this is the major unresolved truth that remains.

### Phase 4 — extract the canonical project taxonomy

Once the pressure test resolves the boundary law, write down the stable project kinds and what they mean:

```text
package
service
plugin
app/host
```

For each, define:

- what it may import,
- what it may expose,
- what responsibilities it may own,
- what targets and gates apply,
- what future scaffold/generator it deserves.

**Why now:** this becomes the bridge from semantic truth to graph law.

### Phase 5 — encode graph-shaped truth into Nx

Only after the project taxonomy and boundary law are proven should Nx become structural law.

Use Nx for:

- graph visibility,
- affected analysis,
- project kinds and tags,
- dependency constraints,
- generators,
- scaffoldability,
- later distribution and conformance.

Do not ask Nx to discover the ontology.
Use Nx to encode the ontology once learned.

**Why now:** at this point the graph is expressing real truth rather than guesses.

### Phase 6 — build the worktree harness around the locked kernel

Once services, plugins, hosts, and graph law are stable enough, build the per-worktree boot harness:

- host identity,
- port allocation,
- server/web/runtime boot,
- worktree-aware telemetry identity,
- reproducible local runtime bundles.

**Why now:** the semantic kernel makes worktree harnessing much easier and much less ambiguous.

### Phase 7 — add real worktree observability

Make each worktree legible via:

- structured logs,
- OpenTelemetry resource identity,
- collector routing,
- simple backend/UI path.

This is not for enterprise polish. It is for machine-operable runtime truth.

### Phase 8 — add governance primitives

Only after the semantic kernel, graph law, and worktree harness exist should the governance system deepen:

- tension bank,
- failed approach capture,
- collision with external signals,
- experiment loop,
- steward workbench,
- review and escalation policy.

This is where the system begins to accumulate agenda continuity rather than just execution capability.

---

## Why this sequence is the highest-leverage path

Each step creates the substrate the next step depends on.

```text
golden service truth
    ↓
semantic naming clarity
    ↓
cross-boundary truth
    ↓
project taxonomy
    ↓
Nx graph law and scaffoldability
    ↓
worktree harness
    ↓
observability
    ↓
governance / autonomous stewardship
```

If this order is inverted, the later steps become weaker:

- Nx too early encodes guesses.
- worktree harness too early wraps ambiguity.
- governance too early becomes philosophy without substrate.
- observability too early becomes generic infra noise.

The sequence above avoids that.

---

## The critical insight: this semantic kernel is the leverage point

The most important thing to see is that the service/plugin/host/package split is not just naming.

It is the kernel that allows the later system to exist coherently.

Once this kernel is stable, several downstream wins become possible.

### 1. Nx becomes high-value instead of premature

Without the semantic kernel, Nx is mostly graph tooling.
With the semantic kernel, Nx becomes:

- architecture law,
- project taxonomy,
- dependency policy,
- generator authority,
- scaffoldable correctness,
- affected reasoning over meaningful units.

This is the point where the graph stops being just dependency visibility and starts becoming machine-readable architectural truth.

### 2. Worktree boot becomes clean and scalable

Per-worktree boot only becomes elegant when the system already knows:

- what a host is,
- what services are,
- what plugins mount where,
- what runtime identity should attach to each host and worktree.

The semantic kernel makes worktree harnessing straightforward rather than ad hoc.

### 3. Observability becomes attached to real units

Instead of generic “app telemetry,” the system can observe:

- host behavior,
- plugin behavior,
- service boundaries,
- worktree identity,
- runtime composition patterns.

That makes observability useful for architecture and future agents, not just debugging.

### 4. The tension bank and governance layer become grounded

Governance ideas like a tension bank, failed approach memory, steward workbench, and generative experimentation only become serious when the system already has real semantic units to attach pressure to.

The semantic kernel gives governance a place to live:

- tensions can belong to services,
- runtime tensions can belong to plugins or hosts,
- graph relationships can surface collisions,
- stewards can own bounded areas rather than vague folders.

### 5. Autonomous stewardship becomes plausible

A fully autonomous development environment does not begin with smarter generation.
It begins with a codebase that has a legible political structure.

The semantic kernel is that political structure.

Once stable, it gives agents:

- clear units of ownership,
- graph-visible relationships,
- enforceable import/dependency law,
- known boot/runtime surfaces,
- known places where semantic truth should live,
- known escalation points between service/plugin/host decisions.

That is what makes later persistent stewards, workbench operations, and self-improving harnesses realistic.

---

## Final snapshot

The architecture is converging toward this:

```text
packages/   pure/shared support matter
services/   semantic service boundaries
plugins/    runtime embodiments and adapters
apps/       hosts / boot authorities
```

The next unlock is not a broad system rewrite.
It is to use this clarified ontology to force out the remaining plugin/service/host boundary truth through targeted pressure testing.

Then, and only then, the system should be codified into Nx graph law and scaffolding.

That is the highest-leverage design path because it turns naming into clarity, clarity into pressure, pressure into truth, truth into graph law, and graph law into the substrate for everything that follows.

That is the design moment.

That is the snapshot.
