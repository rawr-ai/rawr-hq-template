## I. Executive Summary

RAWR HQ should encode durable plugin workflows as a runtime-owned Inngest contract, not as arbitrary plugin background code. The plugin/runtime specs should make the Inngest shape explicit: a runtime-owned `serve()` or operator-selected `connect` topology, a single controlled `/api/inngest` ingress for sync and invocation, stable `createFunction` IDs, stable trigger event names, stable step IDs, side effects inside `step.run`, explicit retry and idempotency rules, declared wait/batch/flow-control behavior, environment-scoped signing and event keys, and layered observation that separates HTTP transport, Inngest run/step state, and RAWR payload state [[serve-inngest-documentation]] [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

The operational conclusion is stricter than "use Inngest." RAWR's current runtime-realization evidence supports a boundary and conformance posture: it can ground the intended plugin/runtime contract around `serve()`, `createFunction`, and `step.run`, and it identifies gaps around async workflow docs, layer disagreement, and production proof. It does not prove durable scheduling, memoized resume, retry replay, wait resumption, run history, signed production ingress, or safe production topology. Those claims require a vendor-backed gate using the Inngest Dev Server, Inngest Cloud, or self-hosted Inngest with state store, queue, runner, and executor behavior in the loop [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]] [[local-development-inngest-documentation]] [[self-hosting-inngest-documentation]].

Draft B's committed position is therefore operational: the spec should encode the Inngest primitives now, but the runtime should only claim durability after tests demonstrate durable behavior in the correct environment. Local development, dummy keys, handler constructibility, and a mounted route are useful checks; they are not production proof. Production readiness additionally needs key management, app sync/versioning, ingress restrictions, flow-control policy, retry/idempotency review, observability, and a clear decision between HTTP `serve()` and outbound worker `connect` deployment models [[security-inngest-documentation]] [[connect-inngest-documentation]] [[render-inngest-documentation]].

## II. Runtime Boundary and `/api/inngest` Ingress

### A. `serve()` Belongs to the Runtime, Not to Plugins

`serve()` is the HTTP API handler that lets Inngest read function configuration and invoke function code. Its required inputs are an Inngest client and an explicit array of functions created with `inngest.createFunction()`. The `servePath` defaults by inference, but the official docs recommend `/api/inngest`; the same endpoint handles `GET` metadata or development landing behavior, `POST` invocation, and `PUT` registration/sync [[serve-inngest-documentation]]. That shape should become a runtime spec boundary.

For RAWR, this means a plugin can declare workflow definitions, trigger names, steps, and policy metadata, but it should not own an independent browser-facing Inngest route. The runtime should own the Inngest client, function registry projection, `serve()` adapter, `serveOrigin`, `servePath`, signing-key lookup, event-key lookup, sync posture, and observation hooks. The reason is operational, not aesthetic: `/api/inngest` is a control-plane ingress that accepts signed Inngest traffic and sync requests, not a general plugin API surface [[serve-inngest-documentation]] [[security-inngest-documentation]].

The spec should therefore say: browser/API callers do not call `/api/inngest`; ordinary plugin REST/RPC surfaces do not proxy through it; plugins do not mint their own signing keys; and any host that mounts it must expose only the runtime-owned Inngest app registry. That protects RAWR from a common failure mode where "plugin workflow endpoint" drifts into "public plugin route," dissolving the security and sync semantics that make Inngest durable execution operationally meaningful.

### B. Signing Keys, Event Keys, and App Sync Are Production Requirements

In production, Inngest requests between the platform and application servers are signed with an environment-unique signing key, and SDK `serve` adapters verify signatures with embedded timestamps to reject replayed requests. Event keys authenticate event sends; API keys serve programmatic API access; signing keys also matter for app sync and Connect workers [[security-inngest-documentation]]. The spec should encode these as separate roles rather than a generic "Inngest token."

Minimum production requirements should be: `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` per environment; no hard-coded secrets; key rotation procedure; branch/preview environment key separation; and a gateway/firewall posture that can allowlist Inngest outbound IP ranges where the platform supports it [[security-inngest-documentation]] [[render-inngest-documentation]]. RAWR should also preserve the distinction between direct sync, where Inngest sends a signed `PUT` and receives function config synchronously, and indirect or Connect startup sync paths [[security-inngest-documentation]] [[connect-inngest-documentation]].

This matters for testing. A local endpoint that answers `GET /api/inngest` only proves the adapter can render diagnostics. A production claim requires signed `PUT` sync, signed `POST` invocation, environment-correct keys, and a deployed URL whose origin/path inference is correct behind whatever proxy or hosting layer RAWR uses [[serve-inngest-documentation]] [[local-development-inngest-documentation]].

### C. `serve()` Is the Conservative Baseline; `connect` Is an Operator Topology

`connect` creates outbound persistent WebSocket worker connections to Inngest. It supports horizontal scaling, automatic reconnects, graceful shutdown, app versions, instance IDs, and worker concurrency controls; it avoids inbound load balancer requirements and is attractive for long-running container workers [[connect-inngest-documentation]]. But the captured docs mark it Public Beta, require long-running servers, and explicitly exclude serverless runtimes [[connect-inngest-documentation]].

RAWR should not make `connect` a plugin primitive. It should model `serve()` versus `connect` as a runtime/operator deployment choice. Plugin workflow declarations should be topology-neutral: they declare the workflow identity, triggers, step contracts, retries, waits, batching, and controls. The runtime chooses whether those functions are exposed through HTTP `serve()` or through outbound `connect` workers, and production docs should state which topology is actually verified for a given deployment.

## III. Workflow Declaration and Durable Step Contract

### A. `createFunction` IDs Are Compatibility Keys

The Inngest function ID is a unique identifier that "should not change between deploys." The same function configuration carries triggers and operational policy: concurrency, throttle, idempotency, rate limiting, debounce, priority, batch events, retries, `onFailure`, `cancelOn`, and start/finish timeouts [[create-function-inngest-documentation]]. RAWR should treat this configuration as spec surface, not incidental adapter code.

A plugin workflow declaration should therefore include at least: `workflow.id` mapped to the Inngest function ID; `workflow.name` as display-only; one or more trigger event names or cron triggers; optional CEL (Common Expression Language) predicates for trigger filtering; retry and timeout policy; idempotency or deduplication strategy; flow-control policy; cancellation policy; and a declared output/status model. Function IDs generated from install paths, timestamps, random strings, deploy hashes, or user-edited labels should fail validation because they break the durable identity contract.

This is also where RAWR needs an explicit migration rule. The current corpus supports treating function and step renames as breaking changes, because IDs drive durable state lookup and memoization, but it does not include a dedicated Inngest versioning guide. Until RAWR designs a versioning policy, the safe spec rule is: ID changes require a workflow version/migration annotation and cannot be silently folded into a routine plugin update [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

### B. `step.run` Is the Side-Effect Boundary

Inngest functions execute step by step. Step results are persisted outside the function execution context, successful steps are memoized, and subsequent handler executions skip completed steps by injecting prior results. Each step is executed as a separate HTTP request, and non-deterministic logic such as database calls or API calls must be placed inside `step.run()` [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]] [[inngest-steps-inngest-documentation]].

RAWR specs should encode this as a hard boundary: top-level handler code is deterministic orchestration only. It can inspect the event, branch on stable data, compose `step.*` calls, and assemble a final result. It should not write to the database, call external APIs, mutate plugin state, send non-durable events, read wall-clock time for side-effect decisions, or perform filesystem/network work outside a durable step primitive. If that sounds restrictive, that is the point: Inngest may re-enter handlers while memoizing completed steps, so top-level side effects can replay in ways RAWR cannot reason about [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]].

Each side-effecting step should carry a stable step ID, a side-effect category, input source, output shape, retry policy, idempotency strategy, timeout, and rollback/fallback behavior. For event emission from inside a function, RAWR should prefer `step.sendEvent()` over raw `inngest.send()` because Inngest documents it as reliable event delivery from within functions [[create-function-inngest-documentation]] [[inngest-steps-inngest-documentation]].

### C. Testing Should Treat Step IDs as Public Enough to Protect

The steps docs say the first argument of each step method is an ID and that Inngest uses it to memoize step state across function versions. The same docs note a counter is recorded for repeated calls with the same step ID, which makes loops possible but does not excuse unstable naming [[inngest-steps-inngest-documentation]]. RAWR should treat step IDs as semi-public compatibility keys: not user-facing product labels, but stable enough that changing them affects active durable state.

Conformance tests should snapshot the projected function registry and step contract. They should reject generated IDs, accidental index-based IDs, unreviewed renames, missing retry/idempotency metadata, and top-level side effects in workflow handlers. Those tests will not prove Inngest durability, but they prevent RAWR from emitting workflow definitions that cannot be durable once attached to a real control plane.

## IV. Retries, Errors, Idempotency, and Layered Status

### A. Errors Are Retried; Failures Need Policy

Inngest distinguishes errors from failures. An error causes a step to retry; after all retries are exhausted, the step fails and will not be attempted again in that run. An unhandled failed step bubbles to function failure and cancels future executions. Retried code must be idempotent, meaning repeated execution has no additional side effect; the docs contrast unsafe inserts with safe upserts [[errors-retries-inngest-documentation]].

RAWR should encode retry behavior explicitly. `createFunction` allows `retries` from `0` to `20` and defaults to `4` [[create-function-inngest-documentation]]. The spec can either accept Inngest's default by policy or require every workflow to declare its retry count. The operationally safer stance is to require an explicit retry policy for each workflow class: must-process workflows, user-visible workflows, telemetry/noisy duplicate workflows, compensating workflows, and one-shot workflows have different acceptable retry and loss profiles.

Idempotency is not just the optional `idempotency` function config, which prevents duplicate events from triggering a function more than once in 24 hours. It is a step-body obligation for every side-effecting `step.run`: use upsert, external idempotency keys, deduplicated event IDs, natural unique constraints, or compensating rollback steps where appropriate [[create-function-inngest-documentation]] [[errors-retries-inngest-documentation]]. RAWR should require that explanation in plugin workflow specs before a side effect is accepted as durable-safe.

### B. `StepError`, `onFailure`, and Rollbacks Need Separate Semantics

The rollback docs add a crucial operational detail: when a step exhausts retries, it throws `StepError`, which can be caught so the function can recover, fall back, ignore a non-critical step, or run a compensating `step.run` rollback. If unhandled, the failure bubbles to the function and marks it failed [[rollbacks-inngest-documentation]]. That creates at least four distinct outcomes RAWR should preserve: retryable error, exhausted step failure handled by the workflow, exhausted step failure that triggers compensation, and unhandled function failure.

The spec should not collapse those into one boolean. It should distinguish transport success, Inngest invocation success, Inngest run status, step attempt number, step retry/exhaustion state, handled fallback result, rollback result, and RAWR payload-level outcome. This directly addresses the existing RAWR spec-gap direction: a route or protocol can succeed while the runtime payload reports failure. Durable plugin workflows need a layered status taxonomy or operators will debug the wrong layer.

Testing should mirror the taxonomy. Unit tests can assert that workflow definitions include retry and rollback metadata. A Dev Server or self-hosted test should run a step that fails, retries, then succeeds; another that exhausts and is caught as `StepError`; and another that bubbles to function failure. Production-like tests should correlate RAWR workflow IDs with Inngest run IDs, attempt numbers, and logs or dashboard history where available [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]] [[self-hosting-inngest-documentation]].

## V. Continuations, Batching, and Flow-Control Policy

### A. `step.waitForEvent` Requires Race-Aware Contracts

`step.waitForEvent()` pauses a function run until a matching event arrives or the timeout returns `null`. It is the preferred event-based pause/resume mechanism because events can fan out, decouple code from the functions they resume, and provide audit trails. The wait is matched by event name plus a predicate, often using `async` for the received event and `event` for the triggering event [[wait-for-an-event-inngest-documentation]].

RAWR specs should require each continuation to declare: awaited event name, match predicate, timeout, timeout branch, matched branch, audit/correlation fields, and whether the continuation crosses plugin boundaries or human-in-the-loop approval. They should also require race mitigation. The official docs state that the wait begins listening when the code executes, so events sent before the wait is reached will not be handled [[wait-for-an-event-inngest-documentation]]. That means a plugin approval workflow cannot merely say "wait for approval"; it must define ordering guarantees, state checks before waiting, or a compensating lookup path.

The key operational rule is that waits are not generic sleeps and not ad hoc polling. They are durable continuation points with audit and race semantics. The runtime should expose a small, reviewable wait contract rather than letting plugins hide wait predicates inside arbitrary handler code.

### B. Batching Changes the Handler Shape and Has Hard Validation Rules

Batching lets a function process multiple events in one run using `batchEvents` with `maxSize`, `timeout`, optional `key`, and optional `if`. The TypeScript create docs list a current `maxSize` limit of `100` and timeout values from `1s` to `60s`; the batching guide also notes a 10 MiB batch size limit and warns about memory/performance issues [[create-function-inngest-documentation]] [[batching-events-inngest-documentation]]. When batching is configured, handlers should use the `events` array rather than a single event argument [[create-function-inngest-documentation]].

RAWR should expose batching only as an explicit workflow capability. A batch-safe workflow declares the batch key, conditional predicate, maximum size, timeout, aggregate operation, idempotency strategy at batch and item level, and memory/performance rationale. It must also pass incompatible-policy validation: batching cannot be combined with idempotency, rate limiting, cancellation events, or priority, and custom concurrency keys should match the batch key for predictable behavior [[batching-events-inngest-documentation]].

This is a place where production caveat and spec validation are the same thing. If RAWR allows batching as a silent optimization, plugins will accidentally change handler input shape, failure granularity, and deduplication behavior. If RAWR models batching as a declared capability, it can reject unsafe combinations before they reach the runtime.

### C. Flow-Control Primitives Are Not Interchangeable

Inngest's flow-control primitives have materially different semantics. Concurrency limits the number of executing steps across function runs. Throttling limits how many function runs can start over time and queues excess runs FIFO for later capacity. Rate limiting is lossy: excess matching events are skipped for function execution, even though events remain stored. Debounce coalesces bursty triggers over a sliding window. Priority changes ordering [[flow-control-inngest-documentation]] [[throttling-inngest-documentation]] [[rate-limiting-inngest-documentation]].

RAWR should encode those distinctions in the plugin/runtime specs. A must-process workflow should not use rate limiting unless the domain explicitly accepts skipped executions; throttling is the better fit when work must eventually happen but starts need smoothing. Concurrency belongs where resource exhaustion matters, such as per-tenant, per-account, or per-external-service constraints. Debounce belongs to redundant event streams where the latest state is enough. Priority belongs to scheduling fairness, not correctness [[throttling-inngest-documentation]] [[rate-limiting-inngest-documentation]].

The runtime should own default caps and operator overrides, but plugin declarations should state semantic intent: must-process, lossy allowed, coalescing allowed, batch-safe, priority source, and per-key isolation. That gives the operator room to tune capacity without changing whether the workflow is allowed to drop, delay, batch, or reorder work.

## VI. Testing, Local Development, and Proof Boundaries

### A. Local Dev Server Is a Required Gate, Not Production Evidence

The Inngest Dev Server is a local version of the Inngest platform. It can auto-discover common endpoints such as `/api/inngest`, accept explicit `-u` serve URLs, poll local apps for function changes, call functions directly as events are sent, provide UI invocation/test events, and expose diagnostics from the SDK `serve` endpoint [[local-development-inngest-documentation]]. This makes it the right next RAWR integration gate for durable behavior.

But local mode has deliberate exceptions. The docs say local event keys may be dummy values, and `INNGEST_DEV=1` explicitly connects to the Dev Server and disables signature verification. The Dev Server is not designed to run in production, though it can be used in testing environments or CI/CD [[local-development-inngest-documentation]]. Therefore a local test can prove workflow execution behavior, retries, waits, and handler projection against a real-ish Inngest control path; it cannot prove production signing, firewall, cloud sync, or deployment topology.

RAWR should define layered gates:

| Gate | What it proves | What it does not prove |
| --- | --- | --- |
| Static/conformance | Stable function IDs, trigger names, step IDs, no top-level side effects, policy projection, route ownership | Durable scheduling, retries, waits, signed invocation |
| Dev Server | Local function discovery, direct invocation, memoized steps, retry/wait behavior, local run history | Production signatures, key rotation, firewall, cloud sync |
| Self-host/Cloud integration | Real Event API, Runner, Queue, Executor, state store, run history, retry/resume behavior | The exact production deploy unless same topology and keys are used |
| Pre-production | Signed `/api/inngest`, app sync, environment keys, ingress path/origin, observability | Long-term production SLOs without soak and operational runbooks |

### B. Durable Claims Require a Control Plane and State Store

The self-hosting docs make the proof boundary concrete. Inngest architecture includes Event API, event stream, Runner, Queue, Executor, state store, database, API, and Dashboard UI. Runner schedules new function runs, resumes functions paused with `waitForEvent`, cancels runs with matching `cancelOn`, and writes event history. Executor executes functions and steps, writes incremental run state, and retries failures. The state store persists pending and ongoing runs, step outputs, and step errors [[self-hosting-inngest-documentation]].

That means a RAWR test that only constructs an Inngest function or hits a local adapter cannot prove durable execution. Durable execution is not just TypeScript code shape; it is the interaction between handler, step IDs, persisted state, queue, runner, executor, retries, and run history [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]] [[self-hosting-inngest-documentation]]. The current runtime-realization story should say "we can project the boundary and know what must be proven next," not "we have production durable workflows."

For self-hosted gates, RAWR should also avoid overclaiming. Default self-hosting can use SQLite and an in-memory Redis server with periodic snapshots; external Redis and Postgres improve reliability and scaling, and support guarantees have caveats [[self-hosting-inngest-documentation]]. A single-node self-host proof is good for semantics and integration, not high-availability production readiness.

## VII. Production Caveats and Future Implications

### A. Production Caveats the Specs Should Preserve

The runtime spec should carry explicit caveats rather than bury them in deployment docs:

- Local dummy event keys and disabled signature verification are never production proof [[local-development-inngest-documentation]].
- `/api/inngest` must be signed runtime ingress, not a public plugin API surface [[serve-inngest-documentation]] [[security-inngest-documentation]].
- `connect` is a runtime/operator topology with beta and long-running-server constraints in the captured docs [[connect-inngest-documentation]].
- Batching is not a transparent optimization because it changes handler input shape and conflicts with several controls [[batching-events-inngest-documentation]].
- Rate limiting skips work, so it is unsafe for must-process workflows unless loss is explicit [[rate-limiting-inngest-documentation]].
- Step output and function output may contain sensitive data persisted in Inngest state; sensitive workflows should evaluate end-to-end encryption middleware and payload minimization [[security-inngest-documentation]].
- Function/step ID migration remains under-specified in this corpus and should be treated as a design gap before long-running workflows are exposed to users [[inngest-steps-inngest-documentation]] [[how-inngest-functions-are-executed-durable-execution-inngest-documentation]].

### B. Future Implications

The future RAWR runtime should become more explicit, not more magical. Durable plugin workflows will need a versioned workflow manifest that separates plugin-declared semantics from runtime-owned deployment policy. Plugin authors should declare stable workflow identity, triggers, steps, idempotency, waits, batching intent, and loss/ordering tolerance; runtime operators should decide `serve()` versus `connect`, signing/event/API keys, environment naming, sync automation, worker concurrency, firewall posture, storage topology, observability, and rollout/rollback policy [[create-function-inngest-documentation]] [[connect-inngest-documentation]] [[render-inngest-documentation]].

The strongest next implementation move is a vendor-backed proof suite. It should run one workflow that demonstrates memoized `step.run` resume, one retried step that succeeds after failure, one exhausted step that throws and is handled as `StepError`, one unhandled function failure, one `waitForEvent` timeout and one matched-event resume, one batch-safe workflow, and one signed `/api/inngest` sync/invocation path. The suite should capture run IDs, attempt numbers, event payloads, step outputs, and run history. Only after that gate should RAWR claim durable runtime behavior beyond boundary conformance [[errors-retries-inngest-documentation]] [[rollbacks-inngest-documentation]] [[wait-for-an-event-inngest-documentation]] [[self-hosting-inngest-documentation]].

The final design implication is that RAWR should be conservative about plugin freedom at the async boundary. Inngest durability is keyed by stable function and step identity, persisted step state, controlled retries, and signed runtime ingress. If plugins can smuggle side effects outside `step.run`, generate unstable IDs, expose `/api/inngest` as a plugin route, or collapse status layers into one success bit, RAWR loses the operational semantics it is trying to encode. The spec should prevent those failures first, then let runtime topology and operator policy evolve behind a stable workflow contract.
