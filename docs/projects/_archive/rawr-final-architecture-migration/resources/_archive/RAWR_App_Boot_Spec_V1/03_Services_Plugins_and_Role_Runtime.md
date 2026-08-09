# Services, Plugins, and Role Runtime

Non-normative: This supporting file depends on `README.md` for packet context and front-door framing.

## 9. Services and oRPC

### 9.1 Service posture

The service layer is the semantic capability plane.

The preferred posture is:

```text
services are transport-neutral semantic capability boundaries
with oRPC as the default local-first callable harness
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

### 9.4 Illustrative service package shape

One valid target-state package shape is:

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

### 9.5 Illustrative service shape

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

Exact export shape, file layout, and context-lane decomposition may vary. The invariant is one semantic capability boundary with a stable local-first callable surface.

Some services may expose richer lane decomposition such as `deps`, `scope`, `config`, and `invocation` instead of one flat context object. That is still consistent with this specification as long as the service boundary stays semantic-first and transport-neutral.

### 9.6 The critical boundary

oRPC belongs in two places:

- at the `services/*` boundary implementation layer as the default local-first callable harness
- inside `plugins/server/*` as the server-surface composition and transport-projection layer

What oRPC does **not** become is the bootgraph.

Typed context merging at invocation time does not replace process-local startup, rollback, resource lifetime, or reverse shutdown.

---

## 10. Plugins and surfaces

### 10.1 What plugins are

Plugins are runtime projection.

They translate service truth into role- and surface-specific runtime contributions.

### 10.2 Canonical plugin roots

This specification locks the following target-state role-first roots:

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

A plugin contributes descriptors, not process-wide authority.

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
- apply any process-owned runtime adapters needed at the process boundary
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
