# Post-Phase-Three Live Proof Reframe

This is the frame to carry into the next phase design. It corrects the Phase
Three interpretation without discarding the useful learning.

Phase Three did not achieve a fully live runtime spine across real vendors,
plugins, services, apps, telemetry product visibility, durable async semantics,
and production-like host behavior. It did achieve a better executable
understanding of the runtime spine inside the contained runtime-realization
lab. That learning is useful only if the next phase stops treating the
micro-lab as the main proof target.

## The Correction

The runtime-realization lab answered a weaker but still important question:

> Do we understand the runtime spine well enough to model and specify its
> internal laws?

It did not answer the stronger migration question:

> Does a real runtime slice work live, across real app/plugin/service code and
> the vendor/product boundaries that production will depend on?

The next phase should be designed around that distinction. The micro-lab should
be kept as a conformance and failure-injection layer. It should not be allowed
to stand in for live integration proof.

## What We Now Understand

The program now has a materially stronger grasp of the internal runtime model:

- descriptor refs, descriptor tables, and refs-only portable artifacts;
- derivation and compilation into process/runtime plans;
- provider/profile/resource selection and bootgraph provisioning;
- Effect-backed provider acquire/release and process invocation;
- invocation-bound service/resource access;
- oRPC Fetch server boundary delegation into the runtime;
- Elysia local app/request/listener behavior inside the lab;
- contained Inngest `serve`/function/`step.run` handoff shape;
- redacted telemetry projection and OTLP-shaped export payloads;
- non-persistent migration/control-plane observation packets;
- stop/finalization records and post-stop non-delegation checks;
- proof categories that distinguish `proof`, `vendor-proof`,
  `simulation-proof`, `xfail`, `todo`, and `out-of-scope`.

That is enough to stop broad speculative modeling. It is not enough to claim
the overarching migration objective is derisked.

## What Was Actually Derisked

| Area | Earned value | Proof ceiling |
| --- | --- | --- |
| Runtime spine semantics | The lab made the spine executable enough to reason about derivation, provisioning, invocation, observation, and stop/finalization. | Internal conformance, not live production readiness. |
| Elysia and Bun local listener | A real local listener can start on loopback, receive real `fetch`, route through Elysia and oRPC, and stop without further runtime delegation. | Local contained process proof, not deployed host lifecycle. |
| oRPC Fetch boundary | Real `@orpc/server/fetch` handling can delegate into the contained runtime path. | Local server-boundary proof, not product API topology. |
| Effect/provider/runtime lifecycle | Provider acquire/release and process invocation can run through the modeled runtime spine. | Contained provider/runtime proof, not production config/secrets or provider catalog proof. |
| Inngest package crossing | The lab can construct and call Inngest `serve`, `createFunction`, and `step.run`. | Vendor-shape/local adapter proof, not durable async proof. |
| Telemetry payload shape | Runtime records can be redacted and shaped as OTLP trace payloads. | Payload/export-shape proof, not HyperDX product visibility. |

## What Remains Unproven

These are not cleanup tasks. They are the production-relevant live uncertainties
that the next phase must explicitly route or prove:

- HyperDX product visibility: query, dashboard, alerting, retention, trace/log
  correlation, and actual backend observability.
- Durable Inngest semantics: scheduling, retry, replay, idempotency, run
  history, failure handling, and hosted/dev-server lifecycle.
- Real app/plugin/service passage: at least one reference path using real or
  mined production-like RAWR code rather than fixture-only declarations.
- Production-shaped host lifecycle: process supervision, deploy/start/stop,
  TLS/proxy/load-balancer behavior, auth/logging, and native host telemetry.
- RuntimeCatalog persistence and control-plane topology: storage, indexing,
  retention, rehydration, placement authority, and migration review semantics.
- Production config and secret policy: source precedence, platform secret-store
  integration, redaction guarantees, and operational rotation/refresh behavior.
- Final public API/DX law and final Nx/generator ratchet.

## Where We Overshot

The lab grew from a conformance tool into a near-total substitute for live
integration. That was the main inefficiency.

Overshoot patterns to avoid:

- building a new micro-simulation for every important crossing;
- treating modeled harness success as live vendor/product success;
- writing elaborate proof ledgers before crossing the highest-risk boundary;
- using injected fetch where a real product/backend visibility gate is the
  actual question;
- letting "contained integrated rehearsal" language imply more than fixture
  runtime proof;
- spending coordination effort on residual routing before the live proof target
  is concrete enough.

## Where We Undershot

The program undershot the real vertical slice.

The missing artifact is a golden, runnable reference runtime inside the
runtime-realization environment: a small but complete runtime-in-a-folder that
uses the target architecture end to end with real code paths and real vendor
crossings wherever feasible.

That reference runtime should make the runtime system inspectable as a working
thing, not only as a set of conformance fragments.

## The Layered Proof Pattern

The next phase should use both tools, but assign them different jobs.

### 1. Spec And Conformance Lab

Keep the existing mini-runtime lab.

Use it for deterministic laws:

- portable artifact constraints;
- descriptor/ref identity;
- provider graph validation;
- lifecycle ordering;
- redaction and no-live-handle checks;
- failure classification;
- negative tests;
- small boundary invariants that should stay fast and hermetic.

This layer supports the runtime. It does not represent the full runtime.

### 2. Full Runtime-In-A-Folder

Create or promote a complete reference runtime inside
`tools/runtime-realization-type-env`.

This should be the next main proof object. It should include:

- a real reference app declaration;
- at least one real or production-mined plugin/service path;
- provider/resource/profile wiring;
- server route through Elysia and oRPC;
- async workflow through Inngest;
- runtime start/stop/finalization;
- telemetry, catalog, and control-plane observation;
- config/secrets handling appropriate to the lab;
- one command or gate that runs the whole story.

The goal is not to copy production blindly. Current repo code is migration
substrate: mine it, adapt it, or discard it according to the manifest-pinned
runtime spec.

### 3. Vendor-Local And Live Product Layer

Use real vendor behavior where the risk lives.

This layer should include broad-to-deep official docs review plus local skill
introspection before implementation. It should produce durable vendor
integration notes only when they are useful as future reference, and those notes
must be labeled as normative, reference-only, or exploratory.

Required posture:

- HyperDX proof means actual product/backend visibility, not only OTLP payload
  construction.
- Inngest proof means durable or dev-server behavior appropriate to the claim,
  not only local `serve` request construction.
- oRPC and Elysia proof should remain real local request/server crossings, with
  product/API policy separated from transport mechanics.
- Effect proof should distinguish author-facing DX from runtime-owned
  operational reality.

### 4. Migration Substrate Layer

Mine existing `apps`, `plugins`, `services`, `packages`, and docs for realistic
behavior, but do not let legacy shape become authority by accident.

Use real code when it increases fidelity. Use extracted/mined examples when
production mutation would add incidental risk. Delete or supersede old lab
fixtures when the full reference runtime makes them redundant.

### 5. Production-Like Layer

Only after the reference runtime works should the program move toward
production-like proof: deployment/process lifecycle, config/secrets, host
telemetry, vendor product visibility, persistence, and migration readiness.

This layer is where production risk is intentionally accepted. It should not be
smuggled into a contained lab phase by tone or implication.

## Design Rule For The Next Phase

Do not choose between the container approach and a full runtime-in-a-folder.
Use both naturally:

- The container/conformance lab tests runtime laws.
- The full runtime-in-a-folder proves the system as a working runtime.
- Vendor-local/live gates prove the external behavior that actually carries
  migration risk.
- Migration substrate mining keeps the reference runtime realistic without
  mutating production surfaces prematurely.

The next phase should be designed around the first executable live vertical
slice, not around another broad modeling pass.

## What The Next Phase Should Optimize For

The next phase should make the following question answerable with evidence:

> Can one complete, target-shaped RAWR runtime slice run inside containment with
> real app/plugin/service code paths and honest vendor/product crossings, while
> preserving the runtime laws already learned by the conformance lab?

Useful proof looks like:

- one command starts the reference runtime;
- a real request crosses Elysia -> oRPC -> runtime -> service/provider;
- a real async path crosses Inngest with the strongest feasible durable/dev
  semantics for the accepted scope;
- telemetry appears in the actual intended observation backend or is explicitly
  fenced if that backend remains out of scope;
- config/secrets/redaction are tested at runtime boundaries;
- stop/finalization and post-stop behavior are observable;
- every claim has an oracle, gate, proof category, and residual route.

## Guardrails

- The manifest-pinned runtime spec remains runtime authority.
- The canonical architecture spec supplies larger shape but does not override
  runtime-realization mechanics.
- Workstream reports and handoffs are continuity, not proof authority.
- Lab `simulation-proof` must not be promoted into production readiness.
- Vendor constructibility must not be promoted into live product proof.
- HyperDX, Inngest, RuntimeCatalog, production config/secrets, and production
  host lifecycle each need their own earned gates before migration confidence
  increases.
- Whenever a patterned correction appears, bake the remediation into the
  workflow or artifact structure instead of only fixing the individual case.

## Operating Conclusion

The existing work was not worthless. It built the semantic foundation needed to
avoid a sloppy runtime implementation. But the next phase must pivot from
modeling the runtime to running a reference runtime.

Keep the lab. Reclassify it. Supersede its role as the main proof object. Build
the full runtime-in-a-folder under container supervision, then attach real
vendor-local and product visibility gates where the production risk actually
lives.
