This packet is the canonical subsystem reference for the RAWR app manifest boot seam. Read this file first; it is the packet's normative front half and the entry point for the supporting docs.

Questions this entry point answers:
- What does this subsystem lock, and what remains flexible inside implementation?
- What are the canonical nouns and layers for app, manifest, role, surface, entrypoint, bootgraph, and process?
- How should the repo shape and responsibility split be interpreted before reading the deeper mechanics docs?
- Which supporting doc should I read next for manifest/entrypoints, bootgraph, runtime composition, or realization/operations?

Packet map:
- `01_App_Manifest_and_Entrypoints.md`: how app composition is defined and how one process explicitly chooses what boots
- `02_Bootgraph.md`: the process-local lifecycle engine, its ownership boundary, lifetimes, and target public API
- `03_Services_Plugins_and_Role_Runtime.md`: how semantic capability truth is projected into runtime surfaces across roles
- `04_Realization_Operations_and_Evolution.md`: how the model realizes locally and on Railway, how it scales, and which invariants stay fixed

Current workspace anchors for readers in this repo are the root `rawr.hq.ts`, runtime apps under `apps/server`, `apps/web`, and `apps/cli`, plus the existing `plugins/*` and `services/*` roots.

# RAWR App, Manifest, Entrypoint, Bootgraph, and Surface Canonical Specification

Status: canonical specification  
Scope: app manifest, role entrypoints, process-local bootgraph, surface composition, and operational mapping  
Audience: principal/staff architectural reference for HQ and future app splits  

---

## 0. What this document locks

This document forward-locks the runtime integration model under the canonical RAWR future architecture.

It fixes the runtime-integration seam at the manifest / entrypoint / bootgraph / process boundary without semantic drift.

The durable separation is:

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
- what the RAWR bootgraph package, derived from Arc/`tsdkarc` core lifecycle ideas, owns and does not own
- where oRPC belongs
- where Inngest belongs
- how local multi-process development maps to the model
- how Railway service topology maps to the model
- how HQ splits into multiple apps without changing the ontology
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

That is the canonical target-state file-tree model.

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

In the target-state HQ app topology, the manifest is:

```text
apps/hq/rawr.hq.ts
```

This file is the canonical definition of the HQ app in runtime terms.

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

Target-state examples:

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

It is a RAWR support package derived from useful Arc/`tsdkarc` core lifecycle ideas, then narrowed to this architecture.

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

## 2. Terminology precision

This seam uses a small set of precise nouns. Keep them precise.

### 2.1 Use `app manifest` for the app-level composition file

The canonical noun for the app-level composition file is **app manifest**.

### 2.2 Do not use bare `host` as a primary noun

`host` is overloaded across software and infrastructure:

- physical/virtual machine
- container host
- the process that hosts plugins
- application server
- runtime shell

Use the more precise noun instead:

- app
- manifest
- entrypoint
- process
- machine
- Railway service

### 2.3 Use concrete runtime nouns instead of `substrate`

`substrate` reads as an external runtime environment, not the app-defined executable shell. Use concrete terms instead:

- HTTP server
- worker harness
- CLI runtime
- browser runtime
- NanoClaw runtime

### 2.4 Use operational placement nouns instead of bare `deployment`

`deployment` is an ops noun, not a stable code-organization noun. When an operational section needs to talk about Railway, say **Railway service** and **replica** explicitly.

### 2.5 Keep `app` simple

`hq` is the app identity.

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

### 4.1 Canonical target-state repo shape

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

### 4.2 Why this target-state file structure is correct

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
