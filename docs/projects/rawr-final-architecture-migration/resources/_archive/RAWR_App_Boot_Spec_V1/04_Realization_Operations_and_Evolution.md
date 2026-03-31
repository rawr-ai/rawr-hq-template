# Realization, Operations, and Evolution

Non-normative: This supporting file depends on `README.md` for packet context and front-door framing.

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

## 15. Canonical invariants

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

## 17. Final canonical picture

The final picture should be read as:

```text
packages/
  bootgraph/          process-local lifecycle support
  shared-types/       shared support matter

services/
  */                  semantic capability truth, transport-neutral capability boundaries with local-first callable harnesses

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

That is the canonical box.

Implementation can resolve details inside the box.
The nouns, boundaries, layers, and invariants above should remain fixed across implementation.
