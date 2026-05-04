## I. Executive Answer

RAWR HQ (the runtime and plugin specification surface for durable plugin execution) should encode Inngest (a durable execution platform for event-triggered functions) as a runtime-owned workflow substrate, not as a loose plugin authoring convenience. RAWR plugin workflow specs should model Inngest functions as durable runtime-owned execution units, not plugin-local scripts. The practical contract is narrow: plugins declare stable workflow identity, trigger events, step IDs, side-effect boundaries, retry and idempotency policy, waits, batching intent, and flow-control intent; the runtime owns the Inngest client, function registry, `/api/inngest` ingress, signing and event keys, app sync, topology, observability, and proof gates [[serve-inngest-documentation]] [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

The current RAWR runtime-realization evidence supports a boundary and conformance claim. It shows why the specs should be shaped around `serve()`, `createFunction`, and `step.run`, and it identifies gaps around production ingress, async workflow documentation, layer disagreement, and durable proof. It does not prove memoized resume, retry replay, `waitForEvent` resumption, run history, production signing, or production topology. Inngest durable execution depends on persisted function state, independently retried steps, handler re-entry, and an Inngest control-plane path, so RAWR should not treat TypeScript constructibility or a mounted endpoint as production durability evidence [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]] [[self-hosting-inngest-documentation]] [[claims-width]].

RAWR should require each durable plugin workflow to declare stable function ids, event triggers, and step boundaries before it can make production durability claims. That declaration is not paperwork. Inngest function IDs are durable compatibility keys, triggers define the event or cron entry point, and step IDs are used to memoize step state across function versions. If those identities are generated, renamed silently, or hidden inside plugin-local code, the runtime cannot validate the workflow, sync it, test it, or reason about in-flight state [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

## II. Runtime-Owned Ingress And Topology

### A. `serve()` Is Runtime Infrastructure

`serve()` is the HTTP API handler that lets Inngest remotely and securely read a deployed app's function configuration and invoke function code. It takes an Inngest client plus an explicit array of functions, and the official docs recommend a `/api/inngest` path. That endpoint has control-plane method semantics: `GET` returns metadata and a development landing page, `POST` invokes function runs, and `PUT` handles registration or sync [[serve-inngest-documentation]]. For RAWR, an ingress means the controlled endpoint where the Inngest control plane calls runtime-owned compute; it is not a general plugin route.

The runtime should therefore own the Inngest client, `serve()` adapter, function registry projection, path/origin configuration, sync posture, logging hooks, and secret lookup. Plugins may contribute declarations that compile into functions, but they should not mount their own Inngest endpoints, expose `/api/inngest` to browsers, or ask ordinary plugin APIs to proxy through that path. `/api/inngest` is where signed Inngest traffic and sync requests enter the runtime; confusing it with user-originated plugin traffic breaks the security and operational model [[serve-inngest-documentation]] [[security-inngest-documentation]].

RAWR production guidance should treat /api/inngest ingress, serve() configuration, and signing-key verification as runtime-owned infrastructure rather than plugin author boilerplate. Production signing is environment-specific: Inngest signs requests between platform and app servers with a signing key, SDK (software development kit) `serve` adapters verify signatures and embedded timestamps to reject replay, and event keys authenticate event sends. The spec should require per-environment `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`, no hard-coded secrets, key rotation procedure, and clear separation between local development exceptions and production ingress [[security-inngest-documentation]] [[render-inngest-documentation]].

### B. `serve()` Is The Baseline; Connect Is A Runtime Topology Option

RAWR should use `serve()` as the conservative baseline because it matches ordinary HTTP-hosted application deployments. Connect is a different topology: it creates outbound persistent WebSocket worker connections, supports horizontal workers, app versions, instance IDs, graceful shutdown, and worker concurrency, but the captured docs mark it Public Beta and require long-running servers rather than serverless runtimes [[connect-inngest-documentation]]. That makes Connect an operator-selected runtime topology, not a plugin primitive.

The plugin declaration should be topology-neutral. A workflow should mean the same durable contract whether the runtime projects it through HTTP `serve()`, Connect workers, Inngest Cloud, or a self-hosted control plane. The runtime/operator layer chooses ingress topology, deployment versioning, worker health checks, and scaling policy. Plugin authors declare what must run and what semantics it needs; operators decide how that work is exposed and secured [[serve-inngest-documentation]] [[connect-inngest-documentation]] [[self-hosting-inngest-documentation]].

## III. Workflow Declaration Contract

### A. Function Identity And Triggers

The first required field is a stable workflow ID mapped to the Inngest `createFunction` ID. Inngest requires an `id` and states that it should not change between deploys. The friendly function `name` is display metadata; the ID is the compatibility key. A RAWR plugin workflow ID must therefore be stable across installs, deploys, and label edits, and it must not derive from timestamps, paths, random values, branch names, deploy hashes, or user-facing copy [[create-function-inngest-documentation]].

Triggers should be explicit spec fields. Inngest functions may be triggered by events or cron schedules, and the function configuration also carries operational policy such as concurrency, throttling, idempotency, rate limiting, debounce, priority, batching, retries, `onFailure`, cancellation, and timeouts [[create-function-inngest-documentation]]. RAWR should expose the trigger event name, expected payload schema, optional CEL (Common Expression Language, a predicate language used here to filter or match event fields), and whether the trigger is user-originated, runtime-originated, or cross-plugin.

Function and trigger changes are compatibility-sensitive. The corpus does not include dedicated Inngest migration guidance for function or step renames, so RAWR should adopt a conservative interim policy: identity changes require explicit workflow versioning or migration annotation. Silent renames should fail conformance for any workflow that may have in-flight runs [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]] [[corpus-critic-gaps]].

### B. Step Identity And Handler Discipline

Step identity is the second durable key. Inngest uses the first argument of each step method as the step ID, and it uses that ID to memoize step state across function versions. Each step is a discrete task that can be retried, debugged, or recovered independently [[inngest-steps-inngest-documentation]]. RAWR should require stable step IDs and reject IDs derived from array position, loops without intentional counter behavior, timestamps, install paths, display labels, or dynamic event data.

Top-level handlers should be deterministic orchestration zones. They may inspect event data, branch on stable values, compose approved `step.*` calls, and assemble return values. They should not write to databases, call external APIs, mutate plugin state, emit non-durable events, or perform time/random-dependent side effects. Inngest re-enters handlers while injecting memoized step results, so top-level side effects can replay outside the runtime's durable step model [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]].

Every plugin workflow declaration should therefore include a compact durable contract: function ID, trigger event or cron, trigger schema, optional predicate, stable step IDs, side-effect category for each step, retry policy, idempotency strategy, timeout, failure behavior, observability labels, and any wait, batch, or flow-control intent. Runtime projection can then validate the declaration before compiling it into an Inngest function registry [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

## IV. Step Semantics, Retries, And Status

### A. `step.run` Is The Side-Effect Boundary

Inngest step.run boundaries give RAWR a natural place to encode retryable side effects, idempotency expectations, and observable progress. `step.run` executes synchronous or asynchronous code as a retriable step; once it succeeds, the response is saved in function run state and the step will not re-run. The durable execution docs add the deeper reason: steps execute incrementally, results are persisted outside the handler, and later executions skip completed work by injecting previous results [[inngest-steps-inngest-documentation]] [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]].

RAWR should treat every side-effecting step as a reviewable unit. A step declaration should specify the step ID, side-effect class, idempotency strategy, retry count or accepted runtime default, timeout, rollback/fallback posture, expected output shape, and observability fields. Idempotency means repeated execution has no additional unintended effect; safe patterns include database upserts, unique constraints, external idempotency keys, deduplicated event IDs, or compensating cleanup. If a plugin cannot explain idempotency for a retried side effect, it should either use zero retries, define compensation, or require a manual exception [[errors-retries-inngest-documentation]].

### B. Retry And Failure Semantics Must Stay Layered

Inngest distinguishes errors from failures. An error causes a step to retry; once attempts are exhausted, the step fails and will not be attempted again in that run. Unhandled failed steps bubble to function failure and cancel future executions. The `createFunction` reference supports `retries` from `0` to `20` and documents a default of `4`, but RAWR should not inherit that default accidentally. It should define retry defaults per workflow class or require explicit retry declarations [[errors-retries-inngest-documentation]] [[create-function-inngest-documentation]].

Failure handling is step-scoped. A step that exhausts retries can throw `StepError`, which may be caught so the workflow can recover, ignore non-critical work, fall back to another provider, or run a rollback `step.run`. If unhandled, the function is marked failed [[rollbacks-inngest-documentation]]. RAWR specs should preserve those states instead of flattening them into a single success bit.

This directly addresses the existing RAWR spec gap around layer disagreement. A transport response can succeed while a runtime payload reports failure, and an Inngest run can succeed while a plugin-level outcome is degraded. Durable workflow observation should preserve at least these layers: HTTP/control-plane result, Inngest run status, step status, retry attempt and exhaustion state, handled fallback or rollback result, and RAWR payload status [[claims-width]] [[rollbacks-inngest-documentation]].

## V. Continuations, Batching, And Flow Control

### A. `step.waitForEvent` Is A Continuation Contract

`step.waitForEvent` pauses a function run until a matching event arrives or a timeout returns `null`. It is the preferred event-resumed pause mechanism because events fan out, decouple code from resumed functions, and provide audit trails. A RAWR continuation should declare the awaited event name, match predicate, timeout, timeout branch, matched branch, correlation fields, expected emitting actor, and whether the wait crosses plugin or human-in-the-loop boundaries [[wait-for-an-event-inngest-documentation]].

The wait contract must be race-aware. Inngest begins listening only when the code reaches the wait, so events sent before that point are not handled by the wait. A plugin approval flow, external webhook join, or cross-plugin completion wait therefore needs an ordering guarantee, pre-wait state check, replay lookup, or other race mitigation. The spec should not allow plugins to hide those semantics inside arbitrary handler code [[wait-for-an-event-inngest-documentation]].

### B. Batching And Flow Control Need Validation

Batching changes both execution semantics and handler shape. `batchEvents` groups multiple events into one run using `maxSize`, `timeout`, optional `key`, and optional `if`; the handler receives `events`, not a single `event`. The batching guide warns about memory and performance, enforces a 10 MiB safety limit, and states that batching cannot be combined with idempotency, rate limiting, cancellation events, or priority [[batching-events-inngest-documentation]] [[create-function-inngest-documentation]].

RAWR should expose batching only as an explicit capability. A batch-safe workflow should declare why batching is correct, how partial failures are handled, whether ordering matters, how item-level deduplication works, and whether the batch key aligns with concurrency keys. If a workflow is must-process and per-event idempotency matters, batching may be wrong unless RAWR adds item-level safeguards inside the batch step [[batching-events-inngest-documentation]].

| Primitive | Core Semantics | RAWR Spec Rule |
| --- | --- | --- |
| Concurrency | Limits executing steps across runs | Use for resource capacity and per-tenant or per-provider isolation |
| Throttling | Limits new run starts and queues excess work FIFO | Prefer for must-process work that needs smoothing |
| Rate limiting | Hard limit that skips excess function runs | Allow only when lost executions are explicitly acceptable |
| Debounce | Coalesces bursty invocations over a window | Use when latest-state processing is enough |
| Priority | Changes execution order | Treat as scheduling policy, not correctness policy |
| Batching | Groups multiple events into one run | Require batch-safe side effects and reject incompatible controls |

These primitives are not synonyms. Rate limiting is intentionally lossy; throttling delays; concurrency constrains executing work; debounce collapses bursts; priority reorders; batching changes payload shape and failure granularity. RAWR should validate these distinctions at spec time so plugin workflows cannot silently drop required events or combine incompatible controls [[flow-control-inngest-documentation]] [[throttling-inngest-documentation]] [[rate-limiting-inngest-documentation]] [[batching-events-inngest-documentation]].

## VI. Testing Gates And Production Caveats

### A. Layered Gates

RAWR should define three proof gates. Static conformance proves the declaration is well-shaped: stable function IDs, trigger names, step IDs, side-effect placement, route ownership, no hard-coded secrets, policy projection, and invalid batching/control rejection. It proves that a workflow can be projected into an Inngest-shaped registry, not that durable execution has occurred [[create-function-inngest-documentation]] [[serve-inngest-documentation]].

The second gate is a vendor-local or self-hosted durability test. The Inngest Dev Server can auto-discover or manually register `/api/inngest`, poll local apps for function changes, invoke functions, accept test events, and expose diagnostic endpoint output. Self-hosting adds an explicit Event API, event stream, Runner, Queue, Executor, state store, database, API, and UI, which are the components that schedule runs, persist step output and errors, resume waits, and retry failures [[local-development-inngest-documentation]] [[self-hosting-inngest-documentation]].

The third gate is production-like ingress and security. It should verify real signing keys and event keys, signed `PUT` sync, signed `POST` invocation, app sync after function changes, environment separation, route origin/path behavior behind proxies, firewall posture where applicable, and observable run IDs, step IDs, attempts, retries, waits, and payload outcomes. Render's docs are only one deployment example, but they show the pattern: deploy the app serving functions, set signing and event keys, and sync the app with Inngest [[security-inngest-documentation]] [[render-inngest-documentation]] [[serve-inngest-documentation]].

| Gate | What It Proves | What It Does Not Prove |
| --- | --- | --- |
| Static conformance | Stable identity, allowed primitives, route ownership, policy validation | Durable scheduling, memoized resume, retries, waits, signing |
| Dev Server or self-hosted test | Local durable semantics, retries, waits, batches, run/step history | Production keys, firewall, hosted sync, exact deploy topology |
| Production-like ingress | Signed ingress, environment keys, app sync, observation | Long-term production SLOs without soak and runbooks |

### B. Caveats RAWR Should Keep Visible

Local development must stay in its lane. The Dev Server is a useful and necessary test harness, but local event keys may be dummy values and `INNGEST_DEV=1` disables signature verification in the documented TypeScript path. A local run can support "locally durable-tested"; it cannot support "production ingress secured" [[local-development-inngest-documentation]] [[security-inngest-documentation]].

Self-hosting also needs careful wording. The default self-hosted setup can use SQLite and an in-memory Redis server with snapshots, while external Redis and Postgres are the stronger reliability and scaling path. A single-node self-host proof is valuable for control-plane semantics, but it is not high-availability production evidence [[self-hosting-inngest-documentation]].

Hooks and MCP are not part of the active Hyperresearch Codex parity claim until their runtime configuration and failure modes are separately proven. That boundary matters here because Inngest durable workflow semantics can be specified and tested without claiming that every adjacent runtime guardrail, hook, or tool integration has been proven under the same conditions.

## VII. Strategic Outlook

The future RAWR design should be a manifest-to-runtime compiler for durable workflows. Plugin authors should declare stable workflow identity, triggers, steps, side-effect categories, idempotency, retries, waits, batching, and loss/ordering tolerance in a reviewable schema. The runtime should compile that schema into Inngest `createFunction` declarations, step wrappers, policy fields, event schemas, a controlled function registry, and deployment-specific `serve()` or Connect wiring [[create-function-inngest-documentation]] [[serve-inngest-documentation]] [[connect-inngest-documentation]].

This design keeps plugin authoring ergonomic while preserving the semantics that make Inngest useful. Operators can later choose HTTP `serve()`, Connect workers, Inngest Cloud, or self-hosted infrastructure without changing the plugin workflow contract. What changes is runtime projection and proof level: declared, statically conformant, locally durable-tested, production-synced, and production-observed should be separate states [[local-development-inngest-documentation]] [[self-hosting-inngest-documentation]].

The immediate implementation move is not to claim more; it is to encode the boundary and build the proof suite. RAWR should add conformance tests for declarations, a Dev Server or self-hosted suite for memoized `step.run`, retry exhaustion, handled `StepError`, matched and timed-out `waitForEvent`, batching validation, and signed ingress tests before production claims. That keeps the current runtime-realization evidence useful without overstating it [[errors-retries-inngest-documentation]] [[rollbacks-inngest-documentation]] [[wait-for-an-event-inngest-documentation]].
