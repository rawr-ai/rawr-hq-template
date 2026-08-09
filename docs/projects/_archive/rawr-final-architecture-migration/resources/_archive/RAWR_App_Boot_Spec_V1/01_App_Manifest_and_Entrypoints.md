# App Manifest and Entrypoints

Non-normative: This supporting file depends on `README.md` for packet context and front-door framing.

## 6. App manifest

### 6.1 What the manifest is

In the target-state HQ app topology, `apps/hq/rawr.hq.ts` is the HQ app manifest.

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

This is an illustrative target-state manifest shape. It shows the authority split the architecture requires; exact helper names, staging paths, and registration packages may vary while the repo converges.

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

At that mount boundary, the mounting runtime may still add runtime-owned adapters, context factories, wrappers, or execution bridges that are specific to the running process. That does not move manifest authority out of the manifest. It is process-side runtime realization.

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
  // Host-owned wrappers or runtime adapters may be applied here
  // without taking manifest authority away from the manifest.
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
