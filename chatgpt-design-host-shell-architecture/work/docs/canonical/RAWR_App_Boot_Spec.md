# RAWR App, Manifest, Entrypoint, Bootgraph, and Surface Canonical Specification

Status: canonical supporting specification  
Scope: app manifest, role entrypoints, process-local bootgraph, surface composition, and operational mapping  
Audience: principal/staff implementation handoff for HQ and future app splits  
Supersedes: `RAWR_Host_Bundle_Bootgraph_oRPC_Canonical_Spec.md`, `RAWR_Arc_Nx_Integration_No_Conformance_Snippet.md`, `RAWR_Arc_oRPC_Integration_Revision.md`

---

## 0. What this document locks

This document forward-locks the runtime integration model under the canonical RAWR future architecture.

It does not replace the top-level architecture. It makes the existing one executable without semantic drift.

This document intentionally evolves the previous canonical spec instead of appending to it. The earlier version still carried overloaded vocabulary from the old model: `host`, `host bundle`, `substrate`, and `deployment` were doing too much work at once. That produced category mistakes between:

- stable code organization
- process-local boot behavior
- machine/service placement

This document fixes that by separating:

```text
stable architecture    = app -> manifest -> role -> surface
runtime realization    = entrypoint -> bootgraph -> process
operational placement  = machine locally, Railway service/replica on Railway
```

Those are the durable layers.

This document locks the following things:

- the canonical nouns and what they mean
- what belongs in `packages`, `services`, `plugins`, and `apps`
- what `rawr.hq.ts` is and is not
- what an entrypoint is and is not
- what the Arc-derived package owns and does not own
- where oRPC belongs
- where Inngest belongs
- how local multi-process development maps to the model
- how Railway service topology maps to the model
- how HQ later splits into multiple apps without changing the ontology
- the minimum concrete package/module/type shape needed to implement this cleanly

This document does **not** lock every helper file name, every generated artifact, or every implementation detail inside the box. It locks the nouns, boundaries, invariants, and responsibility split that implementation must preserve.

The target reader should be able to sit in the repo, implement the shape, and make local adjustments without reopening the architecture.

---

## 1. Canonical ontology

### 1.1 The repo-level ontology stays simple

The durable top-level repo ontology is:

```text
packages   = support matter
services   = semantic capability truth
plugins    = runtime projection
apps       = top-level product/runtime identities
```

That is the file-tree truth.

The repo should prioritize those stable semantic boundaries. It should **not** primarily encode process placement, machine placement, or deployment topology.

### 1.2 The stable semantic model inside runtime integration

The stable semantic layers are:

```text
app
manifest
role
surface
```

These are the nouns the architecture should be organized around.

#### App

An **app** is the top-level product/runtime identity and the natural future split boundary.

Examples:

```text
apps/hq/
apps/billing/
apps/search/
```

When a domain is ready to become independently owned, independently trusted, or independently deployed, it becomes a new app. That is the clean bifurcation line.

#### Manifest

A **manifest** is the app-level composition file.

It defines what belongs to the app:

- the roles the app contains
- the shared wiring those roles require
- the role-local boot contributions
- the role-local surfaces those roles expose or run

For HQ, the manifest is:

```text
apps/hq/rawr.hq.ts
```

This file is the canonical definition of the HQ app in runtime terms.

If older docs say “host bundle definition,” this specification replaces that with **app manifest**.

#### Role

A **role** is a semantic execution class inside the app.

The canonical roles are:

```text
server
async
web
cli
agent
```

These are peer runtime roles. They are not machine counts, not deployment units, and not plugin subtype names.

#### Surface

A **surface** is what a role exposes or runs.

Examples:

- public oRPC API
- internal trusted-only oRPC API
- workflow runner
- consumer loop
- scheduler
- web app
- CLI commands
- agent tools / steward runtime

This is where runtime composition actually becomes user-facing or operator-facing.

### 1.3 The runtime realization model

The runtime realization layers are:

```text
entrypoint
bootgraph
process
```

These are not repo-organization nouns. They are runtime nouns.

#### Entrypoint

An **entrypoint** is a concrete executable file that boots one or more roles from the app manifest.

Examples:

```text
apps/hq/server.ts
apps/hq/async.ts
apps/hq/web.ts
apps/hq/dev.ts
```

An entrypoint is the explicit mount decision for one process.

#### Bootgraph

A **bootgraph** is the process-local lifecycle engine.

It boots dependencies in order, rolls back on failure, and shuts down cleanly.

It is the Arc-derived package.

Its home is:

```text
packages/bootgraph
```

It is deliberately narrower than the manifest and narrower than the app.

#### Process

A **process** is the running program created by an entrypoint.

Examples:

- `apps/hq/server.ts` running on your MacBook
- `apps/hq/async.ts` running as a Railway service instance
- `apps/hq/dev.ts` running locally as a cohosted development process

### 1.4 The operational placement model

The operational placement nouns are environment-specific.

Locally, the useful noun is:

```text
machine
```

On Railway, the useful nouns are:

```text
Railway service
replica
```

Those are operational nouns, not core architecture nouns.

### 1.5 The one line that keeps the whole model coherent

The file tree follows the stable semantic layers:

```text
app -> role -> surface
```

The boot system handles runtime realization:

```text
entrypoint -> bootgraph -> process
```

The environment handles placement:

```text
locally:  process -> machine
Railway:  process -> Railway service -> replica(s)
```

That is the full model.

---

## 2. Explicit terminology changes from the previous canonical spec

This section is not optional. It replaces earlier wording.

### 2.1 Retire `host bundle` from the core vocabulary

The previous spec used **host bundle** as a core noun.

This specification retires it from the primary ontology.

Reason: it was carrying too many meanings at once:

- the app’s composition file
- the deployable runtime assembly
- sometimes the conceptual whole of the app
- sometimes the thing split across multiple processes

Those are related, but not the same level.

Where the old spec said **host bundle definition**, this specification means **app manifest**.

### 2.2 Retire `host` from the core vocabulary

This specification does **not** use `host` as a primary noun.

Reason: it is overloaded in too many ways across software and infrastructure:

- physical/virtual machine
- container host
- the process that hosts plugins
- application server
- runtime shell

That makes it a bad canonical term here.

If an old document says `host`, implementation should resolve the intended meaning to one of:

- app
- manifest
- entrypoint
- process
- machine
- Railway service

### 2.3 Retire `substrate` from the core vocabulary

This specification does **not** use `substrate` as a primary architectural noun.

Reason: it reads as external platform/runtime environment, not the app-defined executable shell.

If needed, use concrete terms instead:

- HTTP server
- worker harness
- CLI runtime
- browser runtime
- NanoClaw runtime

### 2.4 Do not use bare `deployment` as a core noun

This specification does **not** use `deployment` as a primary architectural noun.

Reason: it is an ops noun, not a stable code-organization noun.

If an operational section needs to talk about Railway, it should say **Railway service** and **replica** explicitly.

### 2.5 Keep `app` simple

`hq` is the app. Full stop.

```text
apps/hq/ = the HQ app
```

Do not invent a second noun for the same identity boundary unless it materially buys something.

---

## 3. The final mental model, progressively

### 3.1 The semantic stack

```text
app
  -> manifest
  -> roles
  -> surfaces
```

The manifest says what roles and surfaces belong to the app.

### 3.2 The runtime stack

```text
entrypoint
  -> bootgraph
  -> started process
```

The entrypoint picks one or more roles from the manifest, the bootgraph starts the process-local runtime, and the process mounts the resulting surfaces.

### 3.3 The operational mapping

Locally:

```text
entrypoint -> process -> machine
```

On Railway:

```text
entrypoint -> Railway service -> replica(s)
```

### 3.4 The HQ example

Static architecture:

```text
app: HQ
manifest: apps/hq/rawr.hq.ts
roles: server, async, web
surfaces:
  server -> public/internal oRPC APIs
  async  -> workflows, consumers, schedules
  web    -> web app
```

Runtime on one MacBook:

```text
machine: your MacBook

process 1: apps/hq/server.ts -> server
process 2: apps/hq/async.ts  -> async
process 3: apps/hq/web.ts    -> web
```

Optional cohosted local mode:

```text
machine: your MacBook

process 1: apps/hq/dev.ts -> server + async + web
```

Same app. Same manifest. Same roles. Different entrypoints. Different process shape.

That is the robustness the model is supposed to preserve.

---

## 4. Repo shape and what the file structure should prioritize

The file structure should prioritize the stable semantic layers, not process or machine placement.

### 4.1 Canonical repo shape

```text
packages/
  bootgraph/
  shared-types/

services/
  support/

plugins/
  server/
    api/
      support/
    internal/
      support/            # only if earned
  async/
    workflows/
      support/
    consumers/
      support/
    schedules/
      support/
  web/
    app/
      support/
  cli/
    commands/
      support/
  agent/
    tools/
      support/

apps/
  hq/
    rawr.hq.ts
    server.ts
    async.ts
    web.ts
    dev.ts                # optional cohosted dev entrypoint
    cli.ts                # optional
    agent.ts              # optional
```

### 4.2 Why this file structure is correct

This structure is aligned to the nouns that survive growth and bifurcation:

- apps are the top-level identities
- roles are first-class runtime categories
- surfaces are the second-level runtime projections

The file tree should **not** primarily represent:

- how many processes happen to run today
- which machine they run on
- which Railway services exist right now

Those are runtime/ops facts, not core repo facts.

### 4.3 Optional app-local helpers

App-local helper files may exist if they make entrypoints or manifest code clearer.

Examples:

```text
apps/hq/runtime/*
apps/hq/lib/*
apps/hq/internal/*
```

Those helper locations are **not** load-bearing architecture nouns.

This specification does not lock a helper-directory name because that would repeat the same mistake as inventing extra architecture layers.

---

## 5. Canonical responsibility split

| Kind | Owns | Does not own |
| --- | --- | --- |
| `packages` | support matter, shared helpers, SDKs, low-level runtime support | semantic capability truth, app identity, manifest authority |
| `services` | semantic capability truth, contracts, procedures, business invariants, callable capability boundaries | runtime projection, app boot, transport ownership |
| `plugins` | runtime projection, role/surface adaptation, route and mount contribution, runtime orchestration | semantic authority, app manifest authority |
| `apps` | app identity, app manifest, entrypoints, boot decisions, role selection, final mount decisions | service truth |
| `packages/bootgraph` | process-local lifecycle graph, dependency-ordered boot/shutdown, typed process context | app manifest definition, plugin discovery, repo/workspace policy |

Short form:

```text
services define truth
plugins project truth
apps define the manifest and entrypoints
bootgraph boots one process
surfaces mount after boot
```

---

## 6. App manifest

### 6.1 What the manifest is

`apps/hq/rawr.hq.ts` is the HQ app manifest.

It answers one question:

```text
What roles, shared wiring, and surfaces belong to the HQ app?
```

It is:

- the canonical runtime definition of the app
- the upstream source for every HQ entrypoint
- the stable place where role and surface membership lives

It is not:

- the bootgraph
- a process
- a Railway service definition
- a machine placement definition
- a control plane

### 6.2 What the manifest must define

The manifest must define:

- app identity
- the roles the app contains
- process-lifetime boot contributions required by those roles
- role-lifetime boot contributions required by those roles
- the surfaces those roles expose or run

### 6.3 What the manifest must not define

The manifest must not define:

- boot ordering algorithms
- rollback semantics
- framework listener internals
- Railway placement decisions
- Nx task graph logic
- repo crawling or discovery logic

### 6.4 Draft manifest types

```ts
export type AppRole = 'server' | 'async' | 'web' | 'cli' | 'agent'

export interface AppManifest {
  id: string
  roles: Partial<Record<AppRole, RoleManifest>>
}

export interface RoleManifest {
  boot: RoleBootManifest
  surfaces: RoleSurfaceDescriptor[]
}

export interface RoleBootManifest {
  processModules?: BootModule<any, any>[]
  roleModules?: BootModule<any, any>[]
}
```

The exact type file location may vary. The split cannot.

### 6.5 Example HQ manifest

```ts
import { configModule, telemetryModule, postgresPoolModule } from './boot/modules'
import { registerSupportApi } from '@rawr/plugins/server/api/support'
import { registerSupportWorkflows } from '@rawr/plugins/async/workflows/support'
import { registerSupportWebApp } from '@rawr/plugins/web/app/support'

export const rawrHq: AppManifest = {
  id: 'hq',
  roles: {
    server: {
      boot: {
        processModules: [configModule, telemetryModule, postgresPoolModule],
        roleModules: [registerSupportApi().bootModule].filter(Boolean),
      },
      surfaces: [registerSupportApi().surface],
    },
    async: {
      boot: {
        processModules: [configModule, telemetryModule, postgresPoolModule],
        roleModules: [registerSupportWorkflows().bootModule].filter(Boolean),
      },
      surfaces: [registerSupportWorkflows().surface],
    },
    web: {
      boot: {
        processModules: [configModule, telemetryModule],
        roleModules: [registerSupportWebApp().bootModule].filter(Boolean),
      },
      surfaces: [registerSupportWebApp().surface],
    },
  },
}
```

The load-bearing split is:

- manifest defines what exists
- entrypoint selects what boots now
- bootgraph starts it in one process

---

## 7. Entrypoints

### 7.1 What an entrypoint is

An entrypoint is the concrete file that boots one or more roles from the app manifest.

It is the explicit mount decision for one process.

Examples:

```text
apps/hq/server.ts   -> server role
apps/hq/async.ts    -> async role
apps/hq/web.ts      -> web role
apps/hq/dev.ts      -> server + async + web roles together
```

### 7.2 What an entrypoint does

An entrypoint does three things.

First, it selects one or more roles from the app manifest.

Second, it derives one process-local boot input from those selected roles.

Third, it starts the bootgraph and mounts the resulting surfaces.

That means an entrypoint is thin, but not empty.

### 7.3 What an entrypoint does not do

An entrypoint does not:

- redefine service truth
- redefine role membership
- invent a second manifest
- hide role selection behind framework magic

### 7.4 Example server entrypoint

```ts
import { rawrHq } from './rawr.hq'
import { startBootGraph } from '@rawr/bootgraph'
import { buildServerHttpRuntime } from './server-runtime'

const serverRole = rawrHq.roles.server
if (!serverRole) throw new Error('HQ manifest does not define server role')

const runtime = await startBootGraph({
  modules: [
    ...(serverRole.boot.processModules ?? []),
    ...(serverRole.boot.roleModules ?? []),
  ],
})

const server = await buildServerHttpRuntime({
  ctx: runtime.ctx,
  surfaces: serverRole.surfaces,
})

await server.listen()
```

### 7.5 Example cohosted dev entrypoint

```ts
import { rawrHq } from './rawr.hq'
import { startBootGraph } from '@rawr/bootgraph'
import { dedupeBootModules } from '@rawr/bootgraph/dedupe'
import { buildDevRuntime } from './dev-runtime'

const selectedRoles = [rawrHq.roles.server, rawrHq.roles.async, rawrHq.roles.web].filter(Boolean)

const runtime = await startBootGraph({
  modules: dedupeBootModules(
    selectedRoles.flatMap(role => [
      ...(role!.boot.processModules ?? []),
      ...(role!.boot.roleModules ?? []),
    ])
  ),
})

await buildDevRuntime({
  ctx: runtime.ctx,
  surfaces: selectedRoles.flatMap(role => role!.surfaces),
})
```

The exact helper names may vary. The architecture does not.

### 7.6 The key invariant

The app manifest defines what can be booted. The entrypoint decides what is booted in this process.

That split must stay explicit.

---

## 8. Bootgraph

### 8.1 What the bootgraph is

`packages/bootgraph` is the process-local lifecycle engine.

It is the only new support package this specification requires.

Its job is process-local lifecycle management.

### 8.2 What the bootgraph owns

It owns:

- boot module identity
- dependency graph resolution
- module dedupe by canonical identity
- boot ordering
- rollback on startup failure
- reverse shutdown ordering
- typed process context assembly
- lifetime semantics for process-local and role-local instances
- lifecycle hooks

### 8.3 What the bootgraph does not own

It does not own:

- app identity
- manifest definition
- role membership
- plugin discovery
- oRPC router composition
- Inngest function composition
- CLI command composition
- web mount composition
- Railway topology
- repo/workspace policy logic

### 8.4 The Arc-derived patch set

If `packages/bootgraph` vendors or ports `tsdkarc`, it must patch the raw model in the following ways.

First, replace raw string-name identity with structured `BootModuleKey` identity.

Second, make startup failure fatal even when an error hook exists. Error hooks may observe/report. They may not convert a failed boot into a partially-started process.

Third, remove any lifetime language broader than `process` and `role`.

Fourth, keep rollback semantics explicit and testable.

Fifth, keep the package free of manifest authority and role/surface policy.

### 8.5 Lifetime model

The bootgraph owns only these lifetimes:

```ts
export type BootLifetime = 'process' | 'role'
```

`process` means one instance shared inside the current running process.

`role` means one instance owned by one mounted role inside the current running process.

That is the complete lifetime model.

The bootgraph must not pretend there is a lifetime broader than one process.

### 8.6 Draft bootgraph types

```ts
export type AppRole = 'server' | 'async' | 'web' | 'cli' | 'agent'

export interface BootModuleKey {
  id: string
  lifetime: 'process' | 'role'
  role?: AppRole
  purpose: string
  capability?: string
  surface?: string
  instance?: string
}

export interface BootContext<ReadCtx extends object, OwnSlice extends object = {}> {
  readonly current: ReadCtx
  set(slice: OwnSlice): void
}

export interface BootModule<ReadCtx extends object, OwnSlice extends object = {}> {
  key: BootModuleKey
  dependsOn?: readonly BootModule<any, any>[]
  beforeBoot?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<void> | void
  boot?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<OwnSlice | void> | OwnSlice | void
  afterBoot?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<void> | void
  beforeShutdown?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<void> | void
  shutdown?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<void> | void
  afterShutdown?(ctx: BootContext<ReadCtx, OwnSlice>): Promise<void> | void
}

export interface StartBootGraphInput {
  modules: readonly BootModule<any, any>[]
  hooks?: BootGraphHooks
}

export interface StartedBootGraph<Ctx extends object = {}> {
  ctx: Ctx
  stop(): Promise<void>
}
```

### 8.7 Minimal public API

```ts
export function defineBootModule<ReadCtx extends object, OwnSlice extends object = {}>(
  module: BootModule<ReadCtx, OwnSlice>
): BootModule<ReadCtx, OwnSlice>

export function startBootGraph<Ctx extends object = {}>(
  input: StartBootGraphInput
): Promise<StartedBootGraph<Ctx>>
```

It may expose internal helpers for testing and identity serialization. It should not expose manifest-level abstractions.

---

## 9. Services and oRPC

### 9.1 Service posture

The service layer is the semantic capability plane.

The preferred posture is:

```text
services are oRPC-first local-first callable capability boundaries
```

That means a service may use oRPC server primitives for:

- procedure definition
- callable contract shape
- context lanes
- server-side local invocation
- eventual remote transport projection if placement changes later

### 9.2 What services own

Services own:

- contracts
- procedures
- service-wide context lanes
- business invariants
- capability truth

### 9.3 What services do not own

Services do not own:

- public API route trees
- trusted internal route trees
- app manifest membership
- process boot
- HTTP listener details
- async runtime harness selection

### 9.4 Recommended service package shape

```text
services/
  support/
    src/
      contract.ts
      procedures.ts
      router.ts
      context.ts
      client.ts
      index.ts
```

### 9.5 Example service shape

```ts
// services/support/src/context.ts
import { os } from '@orpc/server'

export interface SupportServiceContext {
  db: DatabasePool
  logger: Logger
}

export const supportBase = os.$context<SupportServiceContext>()
```

```ts
// services/support/src/procedures.ts
import { supportBase } from './context'

export const getSupportTicket = supportBase
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    return context.db.findTicket(input.id)
  })
```

```ts
// services/support/src/client.ts
import { createRouterClient } from '@orpc/server'
import { supportRouter } from './router'

export function createSupportClient(context: SupportServiceContext) {
  return createRouterClient(supportRouter, { context })
}
```

### 9.6 The critical boundary

oRPC belongs in two places:

- inside `services/*` as the local-first callable capability boundary
- inside `plugins/server/*` as the server-surface composition layer

What oRPC does **not** become is the bootgraph.

Typed context merging at invocation time does not replace process-local startup, rollback, resource lifetime, or reverse shutdown.

---

## 10. Plugins and surfaces

### 10.1 What plugins are

Plugins are runtime projection.

They translate service truth into role- and surface-specific runtime contributions.

### 10.2 Canonical plugin roots

This specification locks the following baseline roots:

```text
plugins/server/api/*
plugins/server/internal/*     # optional, only if earned
plugins/async/workflows/*
plugins/async/consumers/*
plugins/async/schedules/*
plugins/web/app/*
plugins/cli/commands/*
plugins/agent/tools/*
```

### 10.3 What a plugin contributes

A plugin contributes descriptors, not host-wide authority.

A plugin may contribute:

- one or more boot modules needed for its role/surface
- one surface descriptor used after boot

It does not own the whole app, the whole manifest, or the whole process.

### 10.4 Draft registration interfaces

```ts
export interface ServerApiPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: ServerSurfaceDescriptor
}

export interface ServerInternalPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: ServerSurfaceDescriptor
}

export interface AsyncWorkflowPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: AsyncSurfaceDescriptor
}

export interface AsyncConsumerPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: AsyncSurfaceDescriptor
}

export interface AsyncSchedulePluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: AsyncSurfaceDescriptor
}

export interface WebAppPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: WebSurfaceDescriptor
}

export interface CliCommandPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: CliSurfaceDescriptor
}

export interface AgentToolPluginRegistration {
  capability: string
  bootModule?: BootModule<any, any>
  surface: AgentSurfaceDescriptor
}
```

### 10.5 Example server API plugin registration

```ts
import { os } from '@orpc/server'
import { createSupportClient } from '@rawr/services/support'

export function registerSupportApi(): ServerApiPluginRegistration {
  return {
    capability: 'support',
    bootModule: defineBootModule({
      key: {
        id: 'server:api:support:router',
        lifetime: 'role',
        role: 'server',
        purpose: 'support-api-router',
        capability: 'support',
        surface: 'api',
      },
      dependsOn: [postgresPoolModule, telemetryModule],
    }),
    surface: {
      kind: 'server:api',
      namespace: 'support',
      build(ctx) {
        const support = createSupportClient({
          db: ctx.db,
          logger: ctx.logger,
        })

        return {
          router: {
            getTicket: os.handler(({ input }) => support.getSupportTicket(input)),
          },
        }
      },
    },
  }
}
```

The exact implementation may evolve. The split cannot.

### 10.6 Surface descriptors

Surfaces consume booted context and produce mountable runtime outputs.

Example descriptor families:

```ts
export interface ServerSurfaceDescriptor {
  kind: 'server:api' | 'server:internal'
  namespace: string
  build(ctx: Record<string, any>): Promise<{
    router?: Record<string, any>
    middleware?: unknown[]
    mounts?: unknown[]
  }> | {
    router?: Record<string, any>
    middleware?: unknown[]
    mounts?: unknown[]
  }
}

export interface AsyncSurfaceDescriptor {
  kind: 'async:workflow' | 'async:consumer' | 'async:schedule' | 'async:resident'
  namespace: string
  build(ctx: Record<string, any>): Promise<{
    functions?: unknown[]
    consumers?: unknown[]
    schedules?: unknown[]
    residents?: unknown[]
  }> | {
    functions?: unknown[]
    consumers?: unknown[]
    schedules?: unknown[]
    residents?: unknown[]
  }
}
```

Equivalent descriptors should exist for `web`, `cli`, and `agent`.

---

## 11. Role-specific runtime shape

### 11.1 Server role

The server role stack is:

```text
services/*
  -> plugins/server/api/* and plugins/server/internal/*
  -> app manifest
  -> server entrypoint
  -> bootgraph
  -> mounted server surfaces
  -> HTTP server runtime
```

The server process should:

- start config, telemetry, DB pool, cache, auth/session infra as needed
- start server role-local modules
- build public server surfaces
- build internal server surfaces only if they exist
- compose the HTTP runtime and listen

### 11.2 Async role

The async role stack is:

```text
services/*
  -> plugins/async/workflows/*, consumers/*, schedules/*
  -> app manifest
  -> async entrypoint
  -> bootgraph
  -> mounted async surfaces
  -> worker runtime
```

The async process should:

- start process-lifetime resources needed by async work
- start async role-local modules
- build workflow/consumer/schedule surfaces
- hand them to the async runtime harness

### 11.3 Web role

`web` is its own role, not a folder under `server`.

It mounts web-facing surfaces after booting web process resources.

### 11.4 CLI role

`cli` is a role for operator/local command hosting.

It is usually not a long-running deployed process, but it still follows the same manifest -> entrypoint -> bootgraph -> surface pattern.

### 11.5 Agent role

`agent` is a role for steward/tool runtime execution.

It mounts agent surfaces on top of booted process resources. NanoClaw is the runtime backend, not a peer ontology kind.

### 11.6 Inngest

Inngest belongs in the async plane as the default durability harness for business-level async work that benefits from retries, scheduling, and durable execution timelines.

It is mounted by async-facing plugins and started by async-facing entrypoints after the bootgraph has created the long-lived process resources it depends on.

What Inngest does **not** become is the synchronous callable service layer.

---

## 12. Runtime realization in local development

This section is operationally concrete without changing the architecture.

### 12.1 Baseline local posture

The HQ app may run as separate local processes on one machine:

```text
machine: your MacBook

apps/hq/server.ts -> process 1
apps/hq/async.ts  -> process 2
apps/hq/web.ts    -> process 3
```

This is the clean local analogue of the production split.

### 12.2 Optional cohosted dev mode

A dedicated local entrypoint may boot multiple roles together:

```text
apps/hq/dev.ts -> one process containing server + async + web
```

This is allowed because the entrypoint is the explicit mount decision for one process.

### 12.3 What does not change

In both local modes, the semantic model is unchanged:

- HQ is still one app
- `rawr.hq.ts` is still the manifest
- `server`, `async`, and `web` are still roles
- surfaces are still role-local projections

Only process shape changes.

---

## 13. Operational mapping on Railway

This section is intentionally operational. It does not redefine the core ontology.

### 13.1 The Railway mapping

Railway fits the model cleanly when separated from the semantic architecture.

The semantic architecture stays yours:

```text
app -> manifest -> role -> surface
```

The Railway mapping becomes:

```text
entrypoint -> Railway service -> replica(s)
```

### 13.2 The control split

You control:

- app identity
- manifest contents
- roles
- surfaces
- allowed process shapes via explicit entrypoints

Railway controls:

- which entrypoint a service runs
- build/start behavior for that service
- service placement and supervision
- private/public networking
- horizontal scaling via replicas

### 13.3 The correct engineering default on Railway

The correct baseline Railway posture is:

```text
one Railway service per long-running role
```

For HQ that means:

```text
hq-server -> apps/hq/server.ts
hq-async  -> apps/hq/async.ts
hq-web    -> apps/hq/web.ts
```

Optional cohosted services are allowed for dev/staging/cheap environments, but they intentionally couple scaling and failure domains.

### 13.4 Example command mapping

Example workspace commands:

```text
pnpm hq:server
pnpm hq:async
pnpm hq:web
pnpm hq:dev
```

Example Railway mapping:

```text
Railway service: hq-server
Start command:   pnpm hq:server

Railway service: hq-async
Start command:   pnpm hq:async

Railway service: hq-web
Start command:   pnpm hq:web
```

### 13.5 Practical Railway notes

For shared JavaScript monorepos, Railway supports using a common codebase with per-service custom start commands, and it also supports root-directory configuration for monorepo deployments. Horizontal scaling is replica-based: increasing replicas creates multiple instances of the same service deployment. Services in the same Railway project environment can communicate over private networking using internal DNS names under `railway.internal`. These are operational mappings on top of the architecture, not replacements for it.

### 13.6 What Railway should not decide

Railway should not define the role composition model.

That must remain explicit in the repo through entrypoints.

Railway chooses which entrypoint a service runs. It does not define what roles exist or what surfaces belong to them.

---

## 14. Growth model: from one HQ app to multiple apps

This is the long-horizon reason the ontology matters.

### 14.1 Start with one app

Today:

```text
apps/hq/
```

HQ contains multiple roles and multiple surfaces. That is normal.

### 14.2 Split only at the app boundary

When a domain earns an independent environment/trust/ownership boundary, it becomes a new app.

Example:

```text
apps/billing/
  rawr.billing.ts
  server.ts
  async.ts
  web.ts
```

The split happens at the app boundary, not by mutating the role/process/machine vocabulary.

### 14.3 Why this survives bifurcation cleanly

Because the ontology does not change.

Each new app still has:

- an app identity
- a manifest
- roles
- surfaces
- entrypoints
- a bootgraph-backed process model

That is the continuity the model is supposed to preserve.

---

## 15. Invariants that must not change during implementation

These are load-bearing.

### 15.1 The core ontology is fixed

```text
app != manifest != role != surface
entrypoint != process != machine
bootgraph bridges the two
```

### 15.2 The file tree follows the semantic layers

```text
file structure follows: app -> role -> surface
```

It does not primarily encode machine or Railway placement.

### 15.3 The manifest is upstream of process boot

```text
manifest definition != process-local bootgraph
```

### 15.4 Entrypoint role selection is explicit

```text
entrypoint decides which roles boot in one process
```

Do not bury role selection in implicit framework or platform behavior.

### 15.5 Bootgraph is process-local only

```text
bootgraph does not own app meaning
```

### 15.6 Services own semantic truth

```text
services never depend on plugins or apps
```

### 15.7 Plugins own runtime projection

```text
plugins project capabilities into roles and surfaces
```

They do not become the source of semantic truth.

### 15.8 oRPC does not replace the bootgraph

oRPC procedures and routers may consume booted resources. They do not own process startup/shutdown semantics.

### 15.9 No fake control-plane layer

Operational or trusted-only routes remain server surfaces until a different deployment/trust model is concretely earned.

### 15.10 No lifetimes broader than one process in the bootgraph

The bootgraph owns only:

```text
process
role
```

It must not pretend there is an instance lifetime broader than one process.

### 15.11 Railway service is an operational mapping, not a semantic layer

Railway services and replicas sit downstream of entrypoints. They do not redefine the app/manifest/role/surface model.

---

## 16. What may vary without reopening the architecture

These details are intentionally left flexible:

- exact helper file names under `apps/hq/*`
- exact framework used for HTTP hosting
- exact internal structure of service packages
- exact internal structure of plugin packages
- exact runtime harness wrappers around Inngest/NanoClaw/web
- exact command names for package scripts
- exact codegen around route/registry collection
- exact bootgraph internal file decomposition

The architecture is about boundaries and responsibility split. Not every subordinate filename is part of the contract.

---

## 17. Required implementation work

### 17.1 New support package

Create:

```text
packages/bootgraph
```

That package should vendor or port the useful core of `tsdkarc` and patch it to match this specification.

### 17.2 HQ manifest

Create or rewrite:

```text
apps/hq/rawr.hq.ts
```

so that it is the single canonical HQ app manifest.

### 17.3 HQ entrypoints

Create or rewrite:

```text
apps/hq/server.ts
apps/hq/async.ts
apps/hq/web.ts
apps/hq/dev.ts
```

with optional `cli.ts` and `agent.ts` following the same model later.

### 17.4 Plugin registrations

Ensure plugins export registration descriptors rather than trying to own app-wide boot or composition authority.

### 17.5 Service callable boundaries

Ensure services expose stable callable capability boundaries that are local-first in-process by default and project cleanly into role/surface plugins.

### 17.6 Railway scripts and service mapping

Ensure the workspace exposes explicit per-entrypoint commands so Railway service mapping is trivial and does not require implicit process-shape inference.

---

## 18. Minimum test surface

### 18.1 Bootgraph tests

- dependency-ordered boot
- reverse-order shutdown
- rollback on startup failure
- fatal startup even when error hooks exist
- dedupe by canonical boot-module identity
- process-lifetime vs role-lifetime behavior
- idempotent stop

### 18.2 Manifest and entrypoint tests

- `rawr.hq.ts` contains the expected baseline role set
- `server.ts` boots only `server`
- `async.ts` boots only `async`
- `web.ts` boots only `web`
- `dev.ts` boots the intended cohosted role set

### 18.3 Surface assembly tests

- public server surface composes the expected capability routes
- internal server surface exists only when configured
- async surface composition yields the expected workflow/consumer/schedule bundle

### 18.4 Boundary tests

- services do not import plugins or apps
- bootgraph package does not depend on manifest or plugin policy semantics
- entrypoints do not redefine service truth

### 18.5 Railway mapping tests or smoke checks

Where practical, smoke-check that each Railway-targeted start command boots the intended entrypoint and only that intended role set.

---

## 19. Source basis and operational references

This specification evolves the prior canonical spec and folds in the final clarified runtime model that separated:

- stable architecture
- process-local boot
- Railway operational mapping

Operational Railway references that informed the service/replica mapping:

- Railway monorepo deployment and per-service custom start commands
- Railway start-command behavior
- Railway horizontal scaling by service replicas
- Railway private networking and internal DNS within one project environment

These are operational mappings layered on top of the architecture, not replacements for it.

---

## 20. Final canonical picture

The final picture should be read as:

```text
packages/
  bootgraph/          process-local lifecycle support
  shared-types/       shared support matter

services/
  */                  semantic capability truth, local-first callable boundaries

plugins/
  server/api/*        public synchronous server surfaces
  server/internal/*   optional trusted-only server surfaces
  async/workflows/*   durable workflow execution surfaces
  async/consumers/*   consumer execution surfaces
  async/schedules/*   scheduled execution surfaces
  web/app/*           web-facing surfaces
  cli/commands/*      CLI-facing surfaces
  agent/tools/*       agent-facing surfaces

apps/
  hq/
    rawr.hq.ts        app manifest
    <entrypoints>     explicit role mount decisions
```

And every running process should conceptually be:

```text
entrypoint
  -> start bootgraph with selected role modules
  -> build surfaces from booted context
  -> attach those surfaces to the concrete runtime harness
  -> run as one process
```

And the full architecture should always be interpreted as:

```text
semantic architecture:  app -> manifest -> role -> surface
runtime realization:    entrypoint -> bootgraph -> process
operational placement:  machine locally, Railway service/replica on Railway
```

That is the implementation box.

Everything inside the box can be resolved in the repo.
The nouns, boundaries, layers, and invariants above should not change during that implementation.
