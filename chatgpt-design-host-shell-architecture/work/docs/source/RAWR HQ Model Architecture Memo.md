# RAWR Host Model / Runtime / Plugin Architecture Memo

## Core mental model

Separate these layers cleanly:

- **Capability truth**: `packages/*` and `services/*`
- **Runtime projections**: `plugins/*`
- **Assembly authority**: `rawr.hq.ts`
- **Runtime roles**: server, async, cli, web, agent
- **Hosts**: the environments that run one or more runtime roles

A **host** is the environment/deployable runtime container.
A **runtime role** is the kind of process being run there.
A **machine/service/container** is just where that role happens to run.

So:

- `server` is a **process/runtime role**
- `async` is a **process/runtime role**
- `cli` is a **process/runtime role**
- your laptop can be the **CLI host**
- one Railway service can be the **server host**
- one Railway service can be the **async host**

The correct hierarchy is:

```text
capabilities/services
  -> projected through plugins
      -> composed into runtime roles
          -> run on hosts
```

## What a host actually is

The final host model should be:

A **host bundle** is a deployable runtime assembly built from one composition authority. It is not inherently one machine and not inherently one process.

That means one RAWR HQ can run in:

### Single-process mode

```text
1 host bundle
1 process
1 machine
server + async + maybe web together
```

### Multi-process same-machine mode

```text
1 host bundle
2-3 processes
1 machine
process A = server
process B = async
process C = web optional
```

### Multi-machine / multi-service mode

```text
1 host bundle
2-3 deploy units
N machines/services
server on machine A
async on machine B
web on machine C optional
```

So the durable mental model is:

```text
One HQ/plugin system
  -> one manifest/composition authority
  -> many plugin surfaces
  -> mounted into a small number of runtime roles
  -> each role can run as one process today and separate later
```

## The right top-level runtime roles

Keep the primary host/runtime roles as:

- **server**
- **async**
- **cli**
- **web** (optional)
- **agent** (real runtime role for Nanoclaw stewards)

Do **not** create a separate top-level “worker host” just for semantics.

Why:

- `async` is the real umbrella role
- `worker` is one subtype within async execution
- splitting `worker host` from `async host` too early creates overlap and confusion

The clean model is:

```text
server = caller-facing boundary host
async  = non-request execution host
cli    = command host
web    = frontend host optional
agent  = Nanoclaw steward runtime
```

## Server vs async

`server` and `async` are **peer runtime roles**, not main app + sidecar.

A sidecar is usually an infrastructure-support companion process:

- OpenTelemetry collector
- reverse proxy
- log shipper
- secrets agent

Your async role is not that. It carries core product execution:

- Inngest workflows
- schedules
- consumers
- background jobs
- private internal routers where needed

So:

```text
server = caller-facing runtime role
async  = background execution runtime role
```

Neither is inherently a sidecar of the other.

## Sync vs async vs service plane

You were mixing three different things:

- **boundary plane**
- **durable/background execution plane**
- **service call plane**

The clean model is:

```text
server/API plane = caller-facing synchronous boundaries
async plane      = durable/background execution
service plane    = private callable capability boundaries used by either one
```

That means you do **not** need a separate top-level “synchronous host” beyond the server/API host unless you later choose to create a dedicated internal request/response service host for real operational reasons.

## Service boundaries

A service boundary is a **callable capability boundary**.
It is not inherently local or remote.
It is not inherently server or async.

The key rule is:

```text
service boundary first
placement second
transport third
```

A service can be:

- called **in-process** when colocated
- called over **oRPC** when remote

The default should be:

```text
same process -> in-process client
different process/host -> RPC client
```

So yes: if the service is not on a separate host/process, it should usually stay in-process.
Calling it over RPC on the same host is usually pointless unless you are intentionally forcing transport parity.

The value of `services/*` is not “always use RPC.”
The value is:

- a real private capability boundary
- one canonical contract/router/client shape
- transport-neutral semantics
- optional remoting later without rewriting callers

So:

```text
private != remote
remote != async
async != worker
```

## Public API host vs dedicated internal services host

A dedicated internal services host is common in some organizations. It is **not** the right default for this architecture.

The temptation is:

```text
public API host
  -> internal services host
  -> async host
```

That does exist in the wild. But if the public API host becomes just a thin proxy for nearly everything, you pay for:

- extra latency
- more failure modes
- more deploy/config surface
- harder debugging
- worse local/dev ergonomics
- premature distributed complexity

The correct default is:

```text
api host
async host
```

Keep services transport-neutral and top-level.
Run them in-process by default on the host that needs them.
Promote a service/domain to its own internal host only when there is a concrete operational reason.

## Inngest’s role

Use Inngest as the **default durability harness for async workflows**.
Do **not** force literally all asynchronous activity through Inngest if it is really just:

- a tiny local side effect
- a long-lived daemon/consumer loop
- infrastructural support work
- a very hot internal path where the durable envelope is the wrong fit

The correct rule is:

“All business-level async work that benefits from retries, durability, scheduling, timelines, and observability should flow through Inngest.”

That means:

- workflow plugins should primarily define durable execution units and trigger handles
- schedules should usually trigger workflows
- worker/consumer plugins should often feed Inngest rather than invent a second async system

The right async host model is:

```text
server host
  -> API plugins
  -> workflow trigger APIs where appropriate

async host
  -> Inngest runtime bundle
  -> workflow execution
  -> consumers / bridges / schedules
  -> rare direct non-Inngest background runtimes where justified
```

## Workflow plugins vs API plugins

The cleaner split is:

- **workflow plugin** = execution authority
- **API plugin** = exposure authority

A workflow is not inherently an API.
Some workflows are:

- externally callable
- internal only
- scheduled only
- event-driven only
- chained from other workflows

So the workflow plugin should primarily own:

- canonical workflow IDs
- trigger schemas
- execution functions
- schedule definitions
- internal trigger helpers/clients
- Inngest function bundle contribution

The API plugin should own:

- external routes
- exposure policy
- auth and transport
- mapping public requests to workflow triggers

That keeps execution and public exposure separate.

## What “async” actually means

“Async” is not determined by whether you use RPC or an immediate trigger call.
The real question is:

```text
Does this boundary perform work now, or schedule work now?
```

If the flow is:

```text
API -> internal boundary -> do real work inline -> return
```

that is not really async in the meaningful architectural sense.

If the flow is:

```text
API -> internal boundary -> trigger workflow / enqueue work -> return ack/runId
```

that is async.

The formula is:

```text
caller latency ≈ trigger latency
not
caller latency ≈ total work latency
```

That is the real test.

## Durable Endpoints

Durable Endpoints are a good fit for some request/response flows that should still feel like APIs but need checkpointing, retries, and observability.

They are **not** the universal wrapper for every private service router.

Use them when the caller still wants a direct final response, but you want durable multi-step behavior.
Use standard Inngest workflows/functions when the caller should get an ack quickly and the real work should proceed independently.

So:

- durable endpoint = durable request/response
- workflow execution = durable background/orchestrated execution

Do not blur those two.

## Long-running/background work: what it actually is

Long-running or background work is just work where the caller should not sit around waiting for completion, or work that needs its own execution lifecycle.

Examples:

- imports
- email fanout
- report generation
- billing reconciliation
- knowledge base embedding generation
- nightly jobs
- external sync retries
- AI pipelines

There are only a few real start modes.

### 1. Request-triggered

```text
User/API request
  -> server route
  -> trigger background work
  -> return ack/runId
```

### 2. Schedule-triggered

```text
Cron/scheduler
  -> trigger background work
```

### 3. Event/consumer-triggered

```text
Webhook / queue / stream / external event
  -> consumer/bridge
  -> trigger background work
```

### 4. Resident daemon loop

```text
Long-lived process starts
  -> loop / poll / watch / consume forever
```

So background work is not mysterious. It always has one of those lifecycles.

## Async plugin second-level split

Within `plugins/async/*`, you should split the second level by **real contribution shape**, because the host composes those differently.

Recommended:

```text
plugins/
  async/
    workflows/
    internal/
    schedules/
    consumers/
```

Why:

- workflows contribute Inngest bundles
- internal contributes private routers
- schedules contribute timed triggers
- consumers contribute bridges/listeners/daemons

That second-level split is worth it because those categories have different execution and composition behavior.

## Plugin directory shape

There are two valid centers of gravity.

If plugins become the real home of capability logic, host-first layout is dangerous.
If `services/*` and `packages/*` remain the true capability center of gravity, then host-first plugin layout is coherent because plugins are just runtime adapters.

Given this architecture, the intended model is the second one.

So this shape is reasonable:

```text
plugins/
  server/
  async/
  web/
  agent/
  cli/
```

with second-level splits where composition behavior actually differs.

The rule is:

**Services/packages own the capability. Plugins own the host-specific projection of that capability.**

## Agent stewards / Nanoclaw

Agent stewards are a real runtime concern, not just a future note.

Lock this into the model:

- each steward owns a domain
- stewards run on the **agent** host/runtime via Nanoclaw
- ownership is executable, not just static

And for owners:

- each steward/owner can have its own git alias or even email
- ownership should connect to the repo topology HUD
- domain ownership should map to steward identity and runtime placement

That means “owner” is not just a CODEOWNERS line. It is:

```text
domain
  -> owned by steward
  -> steward runs on agent host
  -> steward has git identity
  -> steward activity visible in repo topology HUD
```

## Nx + oRPC + Inngest operating model

The stack is:

- **Nx** = graph, generation, enforcement, orchestration
- **oRPC** = typed public/private call boundaries, in-process or remote transport
- **Inngest** = durable execution plane, retries, schedules, observability

That is the core operating system of the repo.

The split of responsibilities is:

```text
Nx
  repo graph / boundaries / generation / orchestration

oRPC
  request-response contracts
  public APIs
  private internal service boundaries
  in-process or remote transport

Inngest
  durable async execution
  schedules
  retries
  workflow timelines
```

Do not let those responsibilities smear together:

Bad:
- using Inngest as the general internal sync RPC layer
- using oRPC to fake durable execution
- expecting Nx tags alone to define runtime semantics

Good:
- oRPC for call boundaries
- Inngest for execution boundaries
- Nx for workspace/governance boundaries

## Nx domain ownership in the snowflake factory

The snowflake factory model is:

- **service core** = capability truth
- **plugin spokes** = runtime projections of that capability
- **domain ownership** = who is allowed to create, compose, and depend on those units

Nx should encode ownership as graph rules, not just folder names.

Recommended tag dimensions:

```text
scope:hq | scope:sales | scope:todo | scope:billing
type:service | type:plugin | type:app | type:sdk
runtime:server | runtime:async | runtime:web | runtime:agent | runtime:cli | runtime:neutral
owner:steward-sales | owner:steward-todo | owner:platform
visibility:public | visibility:private | visibility:internal
execution:workflow | internal-router | consumer | command | ui | none
```

Then enforce:

- domain projects only depend on approved scopes
- service cores do not depend on plugins/apps
- server plugins do not depend directly on async plugins
- async plugins project service cores into async runtime
- agent apps map cleanly to domain owners/stewards
- promoted assemblies only compose approved scopes

Generators should create these correctly by default.
Sync rules should compile ownership outward into the topology HUD and any other derived ownership outputs.

## App assembly topology

You do want `n = 1` shared-host capability **and** the ability to promote any subtree into its own host bundle later.

So the correct model is:

- one primary HQ assembly
- optional promoted sub-assemblies
- shared runtime bootstraps in SDK packages

Use `hq`, not `shared`.

Why:

- `hq` describes semantic authority
- `shared` just describes reuse and becomes muddy once sub-assemblies start splitting out

Recommended shape:

```text
packages/
  hq-sdk/
    roles/
      server/
      async/
      cli/
      web/
      agent/

apps/
  hq/
    rawr.hq.ts
    server/
      main.ts
    async/
      main.ts
    cli/
      main.ts
    web/
      main.ts
    agent/
      main.ts

  sales/
    rawr.hq.ts
    server/
      main.ts
    async/
      main.ts
    agent/
      main.ts
```

This supports:

- `n = 1` HQ shared host/plugin model
- partial tree extraction
- full host duplication into sub-ecosystems

The role bootstraps belong in an SDK/runtime package, not under `apps/roles`.

## App folders vs single files

Even if an app assembly is tiny today, keep the app folders.

You do not need the folder for raw file count reasons.
You want it for:

- stable topology
- stable scaffolding
- agent legibility
- Nx project identity
- future growth without churn
- explicit assembly roots

Do **not** introduce multiple equivalent shapes like:

- `server.ts`
- `server/main.ts`

The variability is not worth the tiny gain.

Lock one uniform shape:

```text
apps/
  hq/
    rawr.hq.ts
    server/
      main.ts
    async/
      main.ts

  sales/
    rawr.hq.ts
    server/
      main.ts
```

No mixed shorthand.
No “flatten until needed.”
Just one stable shape.

## Final recommended filesystem model

```text
packages/
  hq-sdk/
    roles/
      server/
      async/
      cli/
      web/
      agent/

services/
  <domain>/
    contract.ts
    router.ts
    client.ts
    impl.ts

plugins/
  server/
    api/
      <domain>/

  async/
    workflows/
      <domain>/
    internal/
      <domain>/
    schedules/
      <domain>/
    consumers/
      <domain>/

  web/
    apps/
      <domain>/

  agent/
    stewards/
      <domain>/

  cli/
    commands/
      <domain>/

apps/
  hq/
    rawr.hq.ts
    server/
      main.ts
    async/
      main.ts
    cli/
      main.ts
    web/
      main.ts
    agent/
      main.ts

  <domain>/
    rawr.hq.ts
    <role>/
      main.ts
```

## Final conclusion

The architecture is strong if you keep the boundaries hard.

The key principles are:

- capabilities live in `services/*` and `packages/*`
- plugins are host-specific projections, not capability truth
- `server` and `async` are peer runtime roles
- services are transport-flexible and in-process by default
- Inngest is the default durable async execution path
- agent stewards are first-class runtime owners on the agent host
- `hq` is the primary composition root
- promoted sub-assemblies are peers to HQ, not ad hoc exceptions
- app assembly folders should stay uniform for topology stability
- Nx + oRPC + Inngest together form the repo operating system

The repo should optimize for:

- stable topology
- explicit runtime ownership
- low ambiguity about where code belongs
- low ambiguity about what runs where
- easy promotion from HQ to sub-ecosystem
- strong scaffolding and generation discipline

That is the model to lock.

