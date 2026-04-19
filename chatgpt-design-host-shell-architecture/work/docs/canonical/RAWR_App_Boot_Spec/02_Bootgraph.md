# Bootgraph

Non-normative: This supporting file depends on `README.md` for packet context and front-door framing.

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

### 8.4 RAWR bootgraph derivation from Arc

Arc/`tsdkarc` today provides a generic module lifecycle manager: `defineModule`, `start`, string `name` identity, nested `modules`, lifecycle hooks, dependency ordering, and rollback.

`packages/bootgraph` keeps that useful core, then narrows and patches it into a RAWR-specific bootgraph. The following items are RAWR bootgraph policy and target API, not claims about Arc's current public model.

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

### 8.6 Target RAWR bootgraph types

These are target `packages/bootgraph` interfaces for RAWR. They are not Arc-native APIs.

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

This is the target RAWR bootgraph API surface.

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
