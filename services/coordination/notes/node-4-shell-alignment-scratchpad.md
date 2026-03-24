# Node 4 Coordination Shell Alignment Scratchpad

## Landed Shape

- `src/index.ts` now exports the thin package boundary plus explicit compatibility residue only.
- `src/node.ts` is storage-only; it no longer acts as a grab-bag semantic export surface.
- `src/service/modules/workflows/*` and `src/service/modules/runs/*` now carry the domain procedure split that the old flat `service/router.ts` was missing.
- `src/orpc/**` was removed from the service package. Transport projection authority is no longer preserved as service-owned compatibility.

## Reference Hard Shell From `services/example-todo`

### Package shell
- `src/index.ts` is a thin package boundary that re-exports only stable public entrypoints.
- `src/router.ts` is a thin stable import surface that re-exports the authoritative service router from `src/service/router.ts`.
- `src/client.ts` owns the in-process package boundary using `defineDomainPackage(router)`.

### Service shell
- `src/service/base.ts` is the one declarative service seam:
  - service context lanes
  - policy vocabulary
  - bound contract builder
  - bound middleware/provider/implementer builders
- `src/service/contract.ts` composes root contract truth only.
- `src/service/impl.ts` creates one central implementer tree for the whole service.
- `src/service/router.ts` performs one final `.router(...)` attach over module routers.

### API plugin shell
- plugin contract is a namespaced projection over the service router.
- plugin router owns runtime context adaptation and transport-facing handler glue.
- plugin root registration returns `{ namespace, contract, router }`.

## Coordination Business Logic To Preserve

- workflow graph and validation domain:
  - ids
  - graph helpers
  - workflow validation rules
  - domain types and schemas
- node-local persistence helpers:
  - workflow storage
  - run status storage
  - run timeline storage
  - desk memory storage
- existing coordination behavior:
  - list/save/get/validate workflows
  - queue run with validation + duplicate run guard behavior
  - failed queue persistence path
  - get run status
  - get run timeline

## Separation Line For This Cut

### Keep in service package
- domain types, schemas, ids, validation, graph
- node storage helpers and node export surface
- service contract truth
- service router logic for workflow/run procedures
- semantic dependency ports needed by the service router
- lifecycle event/status truth and run finalization semantics in `services/coordination/src/events.ts`

### Move to plugin layer
- runtime-context dependence
- Inngest queue adapter wiring
- runtime trace-link composition (`defaultTraceLinks`)
- runtime-only event id/timestamp construction if the service only needs semantic payload assembly
- transport namespace projection (`coordination: ...`)
- workflow-kit/browser projection helpers in `plugins/workflows/coordination`
- route metadata, transport-facing oRPC contract wrapping, and runtime-to-service translation

## Design Constraints For The Cut

- stay inside `services/coordination/**` and `plugins/api/coordination/**`
- stay inside `services/coordination/**`, `plugins/api/coordination/**`, and `plugins/workflows/coordination/**`
- preserve coordination business behavior
- keep package root thin even if compatibility re-exports remain
- do not preserve compatibility package shims once owned surfaces have been moved
- support packages must not remain semantic capability truth owners after the cut
- service package must not own route metadata, HTTP/request/runtime context, or transport-shaped contracts

## Live Branch Reality

- the hard shell already exists in `services/coordination/src/service/*`; this cut is about finishing the ownership split, not inventing a brand new shell
- `plugins/api/coordination` owns API transport projection and `plugins/workflows/coordination` owns workflow runtime projection
- the residue support packages were deleted once callers and proofs moved to canonical service/plugin homes

## Explicit Seam Classification

### 1. Core capability / service truth
- `services/coordination/src/types.ts`
  semantic capability-owned types, including workflow/run lifecycle and finalization state.
- `services/coordination/src/ids.ts`
  capability id normalization/validation rules.
- `services/coordination/src/graph.ts`
  workflow graph semantics and traversal helpers.
- `services/coordination/src/validation.ts`
  workflow validation rules and error semantics.
- `services/coordination/src/storage.ts`
  node-local persistence semantics for workflows, runs, timelines, and desk memory.
- `services/coordination/src/node.ts`
  service-owned node helper export surface over semantic persistence helpers only.
- `services/coordination/src/schemas.ts`
  capability-owned schemas only if they remain transport-agnostic and are reused by the service boundary.
- `services/coordination/src/events.ts`
  lifecycle event/status contract and semantic event payload construction.
- `services/coordination/src/router.ts`
  thin stable export to the authoritative service router.
- `services/coordination/src/client.ts`
  in-process service boundary factory.

### 2. Plugin / runtime projection
- `plugins/api/coordination/src/contract.ts`
  transport-facing contract projection and namespacing.
- `plugins/api/coordination/src/router.ts`
  runtime context adaptation, middleware, translation, and transport handler wiring.
- `plugins/api/coordination/src/index.ts`
  plugin registration boundary.
- `plugins/workflows/coordination/src/inngest.ts`
  Inngest client/serve/process wiring, queue transport adapter, runtime locks, finished-hook guardrails, and runtime trace-link inputs.
- `plugins/workflows/coordination/src/browser.ts`
  workflow-kit/browser mapping and desk action projection.
- `plugins/workflows/coordination/src/events.ts` and `src/trace-links.ts`
  runtime event id/timestamp construction and trace-link URL composition.

### 3. Temporary residue to delete or collapse
- residue support packages were deleted in favor of canonical `services/coordination` and `plugins/workflows/coordination` homes.

## Decision Log

### Preserve root compatibility while changing the internal shell
- **Context:** non-owned consumers currently import coordination types plus legacy caller-envelope helpers from `@rawr/coordination`.
- **Options:** break callers and expose only example-todo style root; preserve selected root compatibility while deleting service-owned transport shims; keep broad root re-exports.
- **Choice:** keep a narrow root compatibility surface for semantic types and envelope helpers, but delete service-owned `/orpc` entirely and move the authoritative implementation to `src/router.ts`, `src/client.ts`, and `src/service/*`.
- **Rationale:** this keeps the owned package aligned internally without re-legitimizing transport residue inside the service package.
- **Risk:** root still carries temporary envelope residue until plugin/client callers finish migrating.

### Model queueing as a service dependency port
- **Context:** current service router directly depends on runtime transport helpers and Inngest-specific context.
- **Options:** keep runtime fields in service context; move queueing fully out of service behavior; define semantic dependency ports that the plugin supplies.
- **Choice:** define service dependency ports for queuing runs and generating failure events/trace links, then supply those ports from the plugin runtime shell.
- **Rationale:** this removes transport/runtime coupling from the service package while preserving the service's queue-run business behavior.
- **Risk:** non-owned direct service-router consumers must switch to the plugin shell or supply the new service client boundary explicitly.

### Residue package deletion
- **Context:** the old support-package names were only re-export wrappers after the service/plugin split landed.
- **Options:** keep the wrappers around as compatibility shims; repoint proofs and callers to canonical homes, then delete the packages.
- **Choice:** repoint proofs and owned callers to `services/coordination` and `plugins/workflows/coordination`, then delete the residue packages entirely.
- **Rationale:** this removes confusing package-level residue and keeps the architecture honest: service truth in the service package, runtime projection in plugins, no extra package shell pretending to matter.
- **Risk:** downstream notes and any external stale references must be updated if they still mention the deleted package names.

### Keep the coordination contract flat while restoring module composition
- **Context:** `example-todo` gets clean `module.ts` composition from namespaced module branches, but coordination's caller-facing flat surface is locked and should not be casually renamed to `workflows.*` / `runs.*`.
- **Options:** nest the service contract and change the public coordination client shape; keep the flat surface and compose module-local procedure branches individually; leave business helpers in `module.ts` and accept the shell drift.
- **Choice:** keep the flat service contract stable, move procedure I/O wrappers into module-local `schemas.ts`, and restore module composition by applying workflow/run middleware to each procedure branch inside module-local `module.ts`.
- **Rationale:** this aligns the internal bones with the golden pattern without destabilizing callers or reintroducing a fake compatibility shell.
- **Risk:** the flat contract still cannot use a single `impl.workflows` subtree, so module composition remains slightly more repetitive than `example-todo`.
