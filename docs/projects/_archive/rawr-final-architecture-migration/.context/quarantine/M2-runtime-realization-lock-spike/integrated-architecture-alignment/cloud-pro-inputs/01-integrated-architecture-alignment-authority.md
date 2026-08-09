# Integrated Architecture Alignment Authority

Status: Binding alignment authority
Scope: bounded realignment of the integrated canonical architecture document

## Authority

This document governs the integrated canonical architecture alignment pass.

Use these provided files in this authority order:

1. `01-integrated-architecture-alignment-authority.md`.
2. `02-runtime-realization-system-specification.md`, for anything it overlaps.
3. `03-integrated-canonical-architecture-document-under-revision.md`, as the canonical architecture document under revision.

For this alignment pass, the Runtime Realization System Specification supersedes the Integrated Architecture Document anywhere the two overlap, including parts of the durable ontology. The output restores the Integrated Architecture Document as the authority for the parts of the system it is meant to own. The alignment pass transfers ontology decisions and other architectural gains from the Runtime Realization System Specification into the Integrated Architecture Document at the correct abstraction level.

The Integrated Architecture Document remains the canonical plug-and-play architecture layer after it is updated. It is not replaced by the Runtime Realization System Specification. It remains the broad architecture frame that subsystem specifications attach to at explicit integration boundaries.

## Output Contract

Produce one standalone integrated canonical architecture document.

The output:

- states architecture normatively;
- preserves valid broad architecture content;
- aligns all runtime realization material to the Runtime Realization System Specification;
- transfers overlapping ontology, topology, naming, boundary, lifecycle, and ownership decisions from the Runtime Realization System Specification;
- avoids migration notes, implementation sequencing, process commentary, provenance, input-document references, and review narrative;
- keeps the Runtime Realization System as a distinct subsystem with its own detailed specification;
- preserves the canonical architecture specification's valid status, stance, broad architecture purpose, and recognizable organization;
- contains enough runtime realization framing to prevent migration drift.

The output must not split differences between stale and current authority. It must not take the average of the two documents. Where the documents overlap, the Runtime Realization System Specification wins and the Integrated Architecture Document is updated.

## Canonical Architecture Role

The canonical architecture specification is the plug-and-play layer.

Subsystem specifications attach to it at explicit integration boundaries. The canonical architecture specification illustrates the entire system and the parts that matter:

- vision and philosophy;
- the way RAWR thinks about things;
- how layers break down;
- the realization chain;
- the system as a whole;
- the integration points where subsystem specifications attach.

The Runtime Realization System Specification remains the full subsystem blueprint for runtime realization. The Integrated Architecture Document must match it at integration points without copying its full component catalog, code examples, artifact definitions, or detailed runtime contracts.

## Runtime Authority Locks

Runtime realization uses these canonical target terms and placements:

```text
packages/core/sdk        publishes @rawr/sdk
packages/core/runtime/*  contains runtime internals
resources/*              declares resource capability contracts and providers
services/*               owns semantic capability truth
plugins/*                projects service truth into runtime surfaces
apps/*                   selects projections, profiles, entrypoints, and process shape
apps/<app>/runtime/*     owns app runtime profiles and app-local runtime selection
```

The public SDK package is `@rawr/sdk`.

The canonical start operation is `startApp(...)`.

The canonical app definition operation is `defineApp(...)`.

There is no canonical public `startAppRole(...)` or `startAppRoles(...)`.

Runtime realization follows:

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

Shutdown, rollback, finalizers, and stop order are deterministic runtime finalization and observation behavior. They are not an eighth top-level lifecycle phase.

Live runtime access nouns are:

```text
RuntimeAccess
ProcessRuntimeAccess
RoleRuntimeAccess
```

`RuntimeCatalog` is a diagnostic read model. It is not live access and not a second manifest.

## High-Risk Alignment Hot Spots

Use `AppDefinition`, `defineApp(...)`, `startApp(...)`, app composition, runtime profiles, and entrypoints as the normative app-authoring vocabulary. The term `manifest` may survive only as a broad architecture alias for the app composition file `apps/<app>/rawr.<app>.ts`; it must not become a separate runtime artifact, public SDK object, bootgraph input authority, or authority above `defineApp(...)`.

Plugin projection classification comes from topology plus the matching lane-specific builder. Do not preserve `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` as projection-classification fields. Do not preserve `bind` or `bindService(...)` as the normal plugin service-use model when the Runtime Realization System specifies `useService(...)`, resource requirements, SDK-derived service binding plans, compiled surface plans, adapter lowering, and harness handoff.

Service authoring overlap is high-risk. Preserve services as semantic capability truth, but update service examples and laws to the Runtime Realization System model. `defineService(...)` declares service identity, dependency lanes, runtime-carried `scope`/`config`/`invocation` schemas, metadata defaults, service-owned policy vocabulary, and service-local oRPC helpers. Resource dependencies use `resourceDep(...)`; service dependencies use `serviceDep(...)`; semantic adapter dependencies use `semanticDep(...)`. Do not preserve abstract `initialContext` examples, `defineServicePackage(...)` client seams, sibling private imports, provider construction in service implementation, or service dependencies selected through runtime profiles.

Replace public bootgraph/resource-module authoring language with the Runtime Realization model: `RuntimeResource` declares capability contracts, `RuntimeProvider` implements them, `RuntimeProfile` selects providers and config sources, and `ProviderSelection` is app-owned normalized selection. Bootgraph modules are runtime/compiler/provisioning internals, not ordinary app or plugin authoring.

Do not preserve `packages/agent-runtime/*` as canonical target topology. Agent/OpenShell integration belongs behind RAWR-owned runtime harness, resource, and policy boundaries, including `packages/core/runtime/harnesses/agent`, `plugins/agent/*`, and reserved governance hooks.

When listing canonical runtime roles or plugin roots exhaustively, include every role and surface locked by the Runtime Realization System, including `desktop`. If a section is HQ-baseline-only, say that explicitly instead of calling the list canonical or exhaustive.

Use `RuntimeSchema` as the runtime-carried schema facade. Raw Effect schema, layer, and runtime vocabulary remain hidden runtime substrate unless the Runtime Realization System explicitly exposes them.

For async overlap, keep workflow/schedule/consumer authoring, server API/internal trigger/status/cancel surfaces, `WorkflowDispatcher`, `FunctionBundle`, and Inngest harness handoff as separate artifacts with separate owners.

## Ownership Laws

Carry these laws into the integrated architecture document wherever runtime realization is summarized:

- Services own truth.
- Plugins project.
- Apps select.
- Resources declare capability contracts.
- Providers implement capability contracts.
- The SDK derives.
- The runtime realizes.
- Harnesses mount.
- Diagnostics observe.

Topology plus builder classifies projection identity.

RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads.

Runtime placement changes process shape, not semantic species.

## Preserve Broad Architecture

The integrated architecture document remains broader than runtime realization.

Preserve valid content about:

- RAWR as a bounded software foundry;
- support matter versus semantic capability truth versus runtime projection versus app-level composition authority;
- durable top-level architecture under `packages/`, `services/`, `plugins/`, and `apps/`;
- service/plugin/app composition;
- role and surface meaning;
- app/product identity;
- operational placement on service-centric platforms;
- OpenShell/agent as human-facing shell authority;
- durable steward execution on async;
- oRPC, Inngest, Effect, and native harnesses as substrate technologies behind RAWR-owned boundaries.

Repair runtime mechanics inside those sections without deleting the section's broad architecture purpose.

## Required Replacements

Replace stale target terms in normative architecture text:

| Stale target text | Canonical replacement |
| --- | --- |
| `packages/runtime/*` | `packages/core/runtime/*` |
| `packages/hq-sdk` | `packages/core/sdk` |
| `@rawr/hq-sdk` | `@rawr/sdk` |
| `@rawr/runtime` | runtime internals under `packages/core/runtime/*`; public authoring through `@rawr/sdk` |
| `startAppRole(...)` | `startApp(...)` |
| `startAppRoles(...)` | `startApp(...)` |
| `ProcessView` | `ProcessRuntimeAccess` |
| `RoleView` | `RoleRuntimeAccess` |
| `RuntimeView` | `RuntimeAccess` |

When replacing examples, prefer architecture-level examples over detailed runtime contract examples. The Runtime Realization System Specification owns detailed code examples and artifact contracts.

## Forbidden Target Text

The updated integrated architecture document must not present these as target architecture:

- `packages/runtime/*`;
- `packages/hq-sdk`;
- `@rawr/hq-sdk`;
- `@rawr/runtime`;
- `startAppRole(...)`;
- `startAppRoles(...)`;
- `RuntimeView`;
- `ProcessView`;
- `RoleView`;
- `Shutdown` as a top-level lifecycle phase;
- generic `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` fields as projection classification.

If these strings appear only in a non-normative comparison table, migration note, or history explanation, remove that section or restate the architecture normatively. The final integrated architecture document should not rely on stale-name contrast to teach the target.

## Runtime Detail Boundary

Do not duplicate the Runtime Realization System Specification wholesale.

Do not split the output into new sub-specifications in this pass. The output is the updated integrated canonical architecture document. If a topic needs a future dedicated specification, preserve the owner and integration boundary in the integrated document without expanding the topic into a new document or implementation plan.

The integrated architecture document includes:

- the runtime realization lifecycle;
- runtime realization ownership laws;
- canonical package and SDK naming;
- public app start posture;
- runtime access vocabulary;
- broad relationships among SDK derivation, runtime compilation/provisioning, adapter lowering, harness mounting, diagnostics, telemetry, and catalog.

The integrated architecture document must not copy the full runtime component catalog, full TypeScript interfaces, detailed file-by-file runtime package tree, or all runtime examples. Those remain in the Runtime Realization System Specification.

Do not carry over source-document scaffolding from the Runtime Realization System Specification, including `File:`, `Layer:`, `Exactness:`, `specification://...` anchors, examples-as-gates labels, or dedicated-specification trigger tables. Translate only the architecture rule or integration boundary that belongs in the integrated canonical architecture document.

## Completion Gates

The aligned integrated architecture document is complete only when:

- it remains recognizably the integrated canonical architecture document;
- runtime realization language matches the Runtime Realization System Specification;
- valid non-runtime architecture content is preserved;
- no forbidden target text remains as canonical target architecture;
- no migration notes or process commentary remain in canonical sections;
- the document can feed migration planning without reintroducing stale runtime topology or APIs.
