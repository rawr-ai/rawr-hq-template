# Cloud Pro Task Prompt: Integrated Architecture Alignment

You own the RAWR integrated canonical architecture realignment.

Your task is to update the Integrated Architecture Document so it becomes authoritative again for the parts of the system it is meant to own. The Runtime Realization System Specification supersedes the Integrated Architecture Document anywhere they overlap, including parts of the durable ontology. Use the Runtime Realization System Specification as the source of truth for all overlapping areas, then transfer those ontology decisions and other architectural gains into the Integrated Architecture Document at the correct level of abstraction.

This is not a new runtime synthesis pass. This is not a migration plan. This is not an implementation plan. Produce the updated integrated canonical architecture document itself.

## Source Files

Use only these provided files:

| File | Role |
| --- | --- |
| `01-integrated-architecture-alignment-authority.md` | Binding task authority for this alignment pass. |
| `02-runtime-realization-system-specification.md` | Binding source of truth for every overlapping runtime realization, topology, naming, ontology, and subsystem-boundary decision. |
| `03-integrated-canonical-architecture-document-under-revision.md` | The canonical architecture document under revision. Preserve its valid status, stance, broad architecture purpose, and recognizable organization while replacing stale overlapping material. |

Do not consult or infer from any unlisted cloud-project document, project note, repository snapshot, source file, transcript, report, prior output, or project memory.

## Authority Model

Apply this authority order:

1. `01-integrated-architecture-alignment-authority.md`.
2. `02-runtime-realization-system-specification.md`, for anything it overlaps.
3. `03-integrated-canonical-architecture-document-under-revision.md`, for the document's valid status, stance, recognizable organization, broader architecture frame, and non-overlapping architecture content.

Assume the Runtime Realization System Specification is the authority on anything that overlaps right now. The Integrated Architecture Document is stale in those overlap zones. The work is to make the Integrated Architecture Document the authority again by updating it from the Runtime Realization System Specification, not by averaging the two documents.

Preserve valid broad architecture content from the Integrated Architecture Document only where it does not conflict with the Runtime Realization System Specification. Where the documents overlap, transfer the Runtime Realization System Specification's decisions into the Integrated Architecture Document at the right abstraction level.

## Objective

Return one updated standalone integrated canonical architecture document.

The document must read as final normative architecture, not as a memo about an update. It must not mention input documents, cloud prompts, revision history, prior terminology, migration status, review process, or provenance.

The canonical architecture specification is the plug-and-play layer. Subsystem specifications attach to it at explicit integration boundaries. It illustrates the entire system and the parts that matter: vision and philosophy, the way RAWR thinks about things, how layers break down, the realization chain, and everything that describes the system as a whole.

The updated Integrated Architecture Document must:

- preserve the broader architecture that remains valid;
- transfer overlapping runtime realization ontology, topology, naming, and boundary decisions from the Runtime Realization System Specification;
- summarize runtime realization at the correct level for a broad canonical architecture document;
- point conceptually to the runtime realization subsystem without duplicating the Runtime Realization System Specification wholesale;
- expose enough runtime authority to prevent migration drift;
- preserve the canonical architecture spec's valid status, stance, broad architecture purpose, and recognizable organization;
- avoid collapsing distinctions, splitting differences, or taking the average of stale and current language;
- remain suitable for deriving migration and implementation plans after this pass.

## Document Relationship

The two specifications have distinct purposes:

- Integrated Architecture Document: the high-level integration and overview specification for the whole system.
- Runtime Realization System Specification: the full subsystem blueprint for runtime realization.

Success means the Integrated Architecture Document owns everything it has authority over and matches the Runtime Realization System Specification at concrete integration points. The Runtime Realization System Specification may use the same language at those integration points because they function like contracts, but the Integrated Architecture Document must not duplicate the full subsystem blueprint.

## Required Reading Workflow

Before drafting:

1. Read `01-integrated-architecture-alignment-authority.md` completely.
2. Read `02-runtime-realization-system-specification.md` completely as the binding authority for all overlaps.
3. Read `03-integrated-canonical-architecture-document-under-revision.md` completely as the document under revision.
4. Build an internal alignment ledger that identifies:
   - overlapping architecture/ontology/runtime statements where the Runtime Realization System Specification supersedes the Integrated Architecture Document;
   - gains from the Runtime Realization System Specification that must be transferred into the Integrated Architecture Document;
   - broad architecture statements that remain valid and should be preserved;
   - broad architecture statements that need wording adjustment because runtime realization authority changed;
   - subsystem details that should remain in the Runtime Realization System Specification and be summarized only at integration points.

The ledger is internal. Return only the updated integrated canonical architecture document.

## Alignment Posture

The Runtime Realization System Specification remains a separate canonical subsystem specification. Do not inline its full component catalog, code examples, artifact definitions, or detailed runtime contracts into the Integrated Architecture Document.

The Integrated Architecture Document must still show the whole system. It must own the shared vocabulary, durable ontology, layer model, architectural laws, high-level topology, system philosophy, and integration points after you update those concepts from the Runtime Realization System Specification.

The integrated document must still include enough runtime realization framing to anchor the broader architecture:

- services own truth;
- plugins project;
- apps select;
- resources declare capability contracts;
- providers implement capability contracts;
- the SDK derives;
- the runtime realizes;
- harnesses mount;
- diagnostics observe.

The integrated document must express runtime realization as:

```text
definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation
```

Shutdown, rollback, finalizers, and stop order are deterministic finalization and observation behavior, not an eighth top-level lifecycle phase.

Each `startApp(...)` invocation starts exactly one process runtime assembly. Process shape varies by selected roles, surfaces, profile, providers, and harnesses; runtime placement changes process shape, not semantic species.

## Required Runtime Alignment

Align load-bearing runtime names and topology throughout the document:

| Replace stale target language | Use canonical target language |
| --- | --- |
| `packages/runtime/*` | `packages/core/runtime/*` |
| `packages/hq-sdk`, `@rawr/hq-sdk` | `packages/core/sdk`, `@rawr/sdk` |
| `@rawr/runtime` | runtime internals under `packages/core/runtime/*`; public authoring through `@rawr/sdk` |
| `startAppRole(...)`, `startAppRoles(...)` | `startApp(...)` |
| `ProcessView`, `RoleView`, `RuntimeView` | `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `RuntimeAccess` |
| role-specific public start verbs | selected roles and surfaces passed to `startApp(...)` |

Pay special attention to sections in the integrated document that currently explain manifests, service authoring, service context/dependency lanes, plugin exposure/binding, bootgraph resource modules, process/role resources, agent runtime package placement, runtime schema, and async workflow triggering. These are authority-overlap hot spots, not simple rename sites. Rewrite them from the Runtime Realization System ownership model instead of preserving old wording with new package names.

Align package topology to:

```text
packages/
  core/
    sdk/       # publishes @rawr/sdk
    runtime/
      compiler/
      bootgraph/
      substrate/
      process-runtime/
      harnesses/
      topology/
resources/
services/
plugins/
apps/
```

The integrated architecture document may summarize this topology; the Runtime Realization System Specification remains the place for the full runtime component contracts.

Do not carry over source-document scaffolding from the Runtime Realization System Specification, including `File:`, `Layer:`, `Exactness:`, `specification://...` anchors, examples-as-gates labels, or dedicated-specification trigger tables. Translate only the architecture rule or integration boundary that belongs in the integrated canonical architecture document.

Do not split the output into new sub-specifications in this pass. Return the updated integrated canonical architecture document only.

## Preserve Valid Broad Architecture

Preserve and update, rather than remove, broad architecture content that remains true:

- RAWR as a bounded software foundry;
- support matter, semantic capability truth, runtime projection, and app-level composition authority as distinct concerns;
- services as semantic capability truth;
- plugins as runtime projections;
- apps as product/runtime identities and composition authorities;
- roles and surfaces as app-level execution and exposure structure;
- service-centric platform mapping as operational placement, not ontology;
- scale continuity where placement changes without changing semantic meaning;
- OpenShell/agent role as human-facing shell authority;
- durable steward execution remaining on async;
- oRPC and Inngest as framework substrates used through RAWR-owned boundaries;
- native framework interiors remaining native after RAWR hands off runtime-realized payloads.

When these sections refer to runtime realization mechanics, update the mechanics to the canonical runtime terms instead of deleting the broader point.

Do not preserve a title, heading, section, or sentence merely because it exists in the under-revision document. Repair or remove it when it encodes superseded runtime authority.

## Canonical Style

Write actively and normatively.

Use present-tense architecture language:

- "Services own truth."
- "Plugins project service truth into runtime surfaces."
- "Apps select projections into one product/runtime identity."
- "The SDK derives runtime plans."
- "The runtime compiles, provisions, binds, lowers, mounts, observes, and finalizes."

Avoid passive phrasing when it hides ownership.

Avoid migration notes, implementation to-do comments, speculative future language, process commentary, and provenance. If a concept belongs outside canonical architecture, remove it. If the concept is a real architecture law, state it normatively.

## Review Before Finalizing

Before returning the document, review it internally across these axes:

- Runtime authority alignment: no stale package roots, SDK names, start APIs, live access nouns, lifecycle phases, or runtime ownership claims remain as target architecture.
- Architecture preservation: valid non-runtime architecture content is preserved and repaired rather than flattened into a runtime-only document.
- Separation of authorities: the integrated document summarizes runtime realization at architecture level and does not duplicate the full runtime spec.
- Cohesion: the document reads as one standalone canonical architecture specification.
- Normative language: sections state ownership and rules actively, without migration notes or process language.
- Migration derivability: the document can safely feed downstream migration planning without reintroducing stale runtime drift.

Return only the updated integrated canonical architecture document.
