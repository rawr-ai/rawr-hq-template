# Cloud Pro Task Prompt: Runtime Realization System

You are the owner of the final RAWR Runtime Realization System specification.

Your task is not to merge documents. Your task is to produce the final runtime realization architecture in specification form. Own the system being specified: selected authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning, process runtime binding, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization.

The output must be a standalone canonical normative document. It must not mention candidates, authority documents, prompts, packet documents, source documents, synthesis process, review process, revisions, or provenance.

## Input Roles And Authority

Use the provided packet in this authority order:

1. Finalization Authority.
2. Runtime Realization Architecture Authority.
3. Baseline Runtime Realization Specification.
4. Baseline Repair Map.
5. Normalized Transplants.

The Finalization Authority governs this final repair pass.

The Runtime Realization Architecture Authority governs architecture: topology, naming, ownership, lifecycle, runtime artifacts, reserved boundaries, and forbidden layer collapse.

Baseline Specification is the baseline specification. Preserve its spine, topology, component-first posture, lifecycle chain, and canonical nouns unless a higher-authority input requires a repair.

Baseline Repair Map tells you where Baseline Specification must be kept, repaired, augmented, or replaced. It overrides local Baseline Specification wording where it identifies a repair; Baseline Specification remains the baseline everywhere else.

Normalized Transplants is the only source of transplant carry-forward material.

## Task

Produce a single standalone canonical and normative Runtime Realization System specification.

The document must be a transparent blueprint. A reader must be able to see through the layers: authoring declarations, SDK-derived artifacts, runtime-compiled artifacts, provisioning/binding artifacts, adapter-lowered payloads, harness integrations, diagnostics, telemetry, and finalization records.

Do not optimize for concision when concision hides ownership, lifecycle, interface, placement, or integration detail. Nothing should be magic. If an authoring surface appears simple, the spec must show the backend artifacts and runtime handoffs that make that simplicity real.

## Required Reading Workflow

Before drafting:

1. Read the Finalization Authority completely.
2. Read the Runtime Realization Architecture Authority completely.
3. Read Baseline Specification completely as the baseline document.
4. Read Baseline Repair Map completely and map its repair directives onto Baseline Specification.
5. Read Normalized Transplants completely.
6. Do not consult or infer from any unlisted cloud-project document, project note, repository snapshot, source file, transcript, report, prior output, or existing canonical document.

Build an internal repair ledger before drafting. For every baseline repair and every normalized transplant, decide whether it is incorporated, normalized, or rejected for authority conflict.

This workflow is internal. The final output is only the final specification.

## Required Architectural Posture

Preserve these laws:

- Services own truth.
- Plugins project.
- Apps select.
- Resources declare capability contracts.
- Providers implement capability contracts.
- The SDK derives.
- The runtime realizes.
- Harnesses mount.
- Diagnostics observe.

Runtime realization follows:

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

Shutdown, rollback, finalizers, and stop order are deterministic runtime finalization and observation behavior. They are not an eighth top-level lifecycle phase.

Topology plus builder classifies projection identity. Do not use `exposure`, `visibility`, `publication`, `public`, `internal`, `kind`, or `adapter.kind` as projection classification fields.

RAWR owns boundaries and runtime handoffs. Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads.

## Required Construction Standard

Build the document from concrete components that assemble into the complete runtime realization system.

For every load-bearing component or artifact, include the applicable contract:

- canonical name and owner;
- file-system placement and package boundary;
- public authoring surface, SDK-derived shape, runtime-internal shape, or harness-facing shape;
- inputs, outputs, invariants, and forbidden responsibilities;
- upstream producer and downstream consumer;
- lifecycle phase participation;
- integration point with adjacent layers;
- diagnostics emitted or consumed;
- enforcement rules that prevent layer collapse.

Every system component with file-system presence must include a concrete placement illustration.

Every code block must include visible labels immediately before it:

```text
File: ...
Layer: ...
Exactness: ...
```

Code and type blocks are normative for locked names, ownership boundaries, required fields, producer/consumer shape, lifecycle handoff, and layer handoff. They are illustrative for overloads, generic parameters, helper placement, and import paths unless an authority document states otherwise.

Simplified examples are allowed only as entry points. Pair simplified examples with realistic examples that preserve layers and integration artifacts.

Use diagrams, package trees, type illustrations, interface tables, and sequence flows as core specification material when prose alone would allow layer collapse.

## Required Repairs And Transplants

Apply all required baseline repairs from the Finalization Authority and Baseline Repair Map.

Incorporate normalized transplants for:

- `WorkflowDispatcher` as a derived runtime/SDK integration artifact and live dispatcher materialization boundary;
- `FunctionBundle` as async harness-facing lowered artifact;
- `RuntimeTelemetry` interface shape;
- deterministic shutdown/finalization order;
- provider acquire/release and provider selector/config binding examples;
- provider dependency graph, provider dependency closure, and provider coverage diagnostics as compiler/provisioning artifacts;
- CLI, web, agent/OpenShell, and desktop projection examples;
- server internal projection wrapping `WorkflowDispatcher`;
- async lowering chain into `FunctionBundle`;
- ownership-law prose and native interior boundary language;
- reserved-boundary explicit owner, integration hook, dedicated specification condition, and examples-as-gates framing.

Preserve Baseline Specification or architecture-authority-approved shapes for:

- `RuntimeSchema` with explicit decode/validation behavior;
- `ServiceBindingPlan` with `invocationSchema`;
- `ServiceBindingCacheKey` excluding invocation;
- `NormalizedAuthoringGraph`;
- `PortableRuntimePlanArtifact`;
- `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`;
- `RuntimeCatalog` as diagnostic read model, not live access.

## Required Examples

The final specification must include concrete examples for:

- N > 1 service module shape, including root contract/router composition and the contract/module/router/repository responsibility split;
- public server API projection calling a service;
- trusted server internal projection wrapping `WorkflowDispatcher`;
- service depending on sibling service through `serviceDep(...)`;
- app profile and entrypoint selection without collapsing app membership, provider selection, and process shape;
- provider acquire/release;
- CLI command projection;
- web app projection;
- agent/OpenShell projection;
- desktop projection;
- async lowering into `FunctionBundle`;
- examples-as-gates acceptance mapping.

Use schemas or schema-backed contract objects for data shapes. Plain strings may identify ids, names, routes, capabilities, event names, cron expressions, or policy labels; plain strings do not stand in for data schemas.

## Review Before Finalizing

Before returning the final document, review it internally across these axes:

- structural correctness: section order, component boundaries, and layer separation are sound;
- goal fit: the document actually defines runtime realization as an implementable system;
- layering clarity: internals are visible and important layers are not collapsed;
- examples at multiple scales: simple examples are paired with realistic examples;
- authoring surface versus internals: simple DX is backed by derived/runtime/harness artifacts;
- transplant fidelity: transplant material was carried only through the Normalized Transplants document and normalized through the authority documents;
- baseline fidelity: Baseline Specification remains the baseline;
- residual forbidden carryover audit: no normative `diagnosticView`, `RuntimeResourceDiagnosticView`, `RuntimeView`, `ProcessView`, `RoleView`, bare `AuthoringGraph`, `@rawr/runtime`, `@rawr/hq-sdk`, root `core/`, root `runtime/`, `startAppRole(...)`, generic projection-classification fields, rejected package-root taxonomy, or top-level `Shutdown` phase survives; non-`@rawr/sdk` import paths are explicitly illustrative unless separately locked;
- shutdown/finalization audit: shutdown may appear as finalization behavior, diagnostic class, telemetry event, catalog record, status, subphase, or observation detail, but not as a member of the seven-phase lifecycle;
- cohesion: the document stands alone as canonical normative architecture;
- foundation and extension: stable foundations are locked and flexible areas can evolve without renegotiating the foundation;
- migration derivability: the specification can drive M2 migration planning.

Return only the final specification.
