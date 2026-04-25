# Integrated Architecture Alignment Cloud Packet

Status: Ready for cloud alignment pass
Scope: Bounded realignment of the integrated canonical architecture document after final Runtime Realization System specification promotion

## Purpose

This packet prepares one narrow cloud Pro pass to realign the broader integrated canonical architecture document with the finalized Runtime Realization System specification.

The goal is not another runtime specification synthesis. The Runtime Realization System specification is already final and remains separate. For this alignment pass, the Runtime Realization System specification supersedes the integrated canonical architecture document anywhere the two overlap, including runtime realization, package topology, public SDK naming, start API, live access vocabulary, lifecycle framing, resource/provider/profile ownership, service authoring/dependency lanes, plugin projection classification, app/manifest vocabulary, and parts of the durable ontology. This packet restores the integrated canonical architecture document as the plug-and-play architecture layer by transferring those decisions into it at the correct abstraction level.

## Documents To Provide

Use `integrated-architecture-alignment-cloud-pro-inputs/00-cloud-pro-task-prompt.md` as the cloud Pro task prompt.

The cloud-input folder is self-contained. Provide these files together as one packet:

```text
integrated-architecture-alignment-cloud-pro-inputs/
  00-cloud-pro-task-prompt.md
  01-integrated-architecture-alignment-authority.md
  02-runtime-realization-system-specification.md
  03-integrated-canonical-architecture-document-under-revision.md
```

| File | Role |
| --- | --- |
| `00-cloud-pro-task-prompt.md` | Cloud Pro task prompt. |
| `01-integrated-architecture-alignment-authority.md` | Binding task authority for the bounded alignment pass. |
| `02-runtime-realization-system-specification.md` | Binding source of truth for overlapping runtime realization, topology, naming, ontology, and subsystem-boundary decisions. |
| `03-integrated-canonical-architecture-document-under-revision.md` | Integrated canonical architecture document under revision. Preserve its valid status, stance, broad architecture purpose, and recognizable organization while replacing stale overlapping material. |

## Unlisted Context

Use only the documents listed above. If the cloud project contains other canonical documents, notes, repository snapshots, source files, transcripts, reports, or project memory, they are outside the input set for this pass.

## Authority Order

Apply this order:

1. `01-integrated-architecture-alignment-authority.md`.
2. `02-runtime-realization-system-specification.md`, for anything it overlaps.
3. `03-integrated-canonical-architecture-document-under-revision.md`, for the document's valid status, stance, recognizable organization, broader architecture frame, and non-overlapping architecture content.

If material overlaps, the Runtime Realization System Specification wins. The alignment pass restores the Integrated Architecture Document as architecture authority by transferring those decisions into it at the correct level of abstraction.

## Expected Output

The cloud Pro agent must return one updated integrated canonical architecture document.

The output must:

- remain a standalone canonical architecture document;
- keep runtime realization and integrated architecture as separate authority levels;
- restore the Integrated Architecture Document as the plug-and-play architecture layer;
- handle authority-overlap hot spots as conceptual repairs, not simple rename sites;
- remove stale runtime realization topology, imports, start APIs, package names, live access nouns, and lifecycle language;
- preserve the document's broader architecture frame wherever still valid;
- avoid migration notes, provenance, review narrative, or cloud-task metacommentary;
- be suitable as the architecture input for downstream migration planning.

## Sub-Specification Decision

Do not create new sub-specifications before this cloud architecture alignment pass.

The alignment pass preserves concrete integration boundaries for topics that may later need dedicated specifications, but the cloud Pro agent output remains one updated integrated canonical architecture document. Potential follow-on specifications are evaluated only after the aligned integrated document comes back.

## Readiness Checklist

Before using the packet, verify that:

- the finalized Runtime Realization System specification is present as `02-runtime-realization-system-specification.md`;
- the integrated architecture document is present as `03-integrated-canonical-architecture-document-under-revision.md`;
- only the four files listed above are provided;
- the alignment authority includes high-risk authority-overlap hot spots;
- the cloud prompt asks for a bounded architecture alignment pass, not a broad rewrite.
