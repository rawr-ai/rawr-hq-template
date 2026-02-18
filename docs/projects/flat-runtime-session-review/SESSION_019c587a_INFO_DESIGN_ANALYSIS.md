# SESSION_019c587a Information Design Analysis

## Assessment Scope and Lens
This assessment covers the ORPC/Inngest packet corpus as a multi-artifact information system, using the `information-design` skill workflow (`assess` lens).

Primary lens for this pass:
- Optimize for a standalone, portable canonical specification.
- Treat implementation clarity as a secondary effect.
- Avoid reframing docs as execution-planning workflow artifacts.

## Intended Purpose and Axes (Current vs Target)

| Axis | Current posture | Target posture (for portable canonical spec) | Misalignment summary |
| --- | --- | --- | --- |
| Purpose | Mixed: canonical policy + session review + implementation walkthrough | Precision/reference-first canonical spec with explicit non-normative layers | Canonical signal competes with review/changelog/session content. |
| Density | Mixed, with heavy code density in examples | Layered density: concise canonical rules, expandable annex depth, code in reference appendices | Canonical readers must traverse large code-heavy files to recover policy intent. |
| Linearity | Multi-entry with many peers | Single canonical entrypoint + clear layer routing | Readers can enter from many places and infer different “sources of truth.” |
| Audience | Mixed (policy maintainers, implementers, reviewers) | Split audience handling by artifact role | Audience modes are mixed within single surfaces. |
| Scope | Multi-artifact system (strong) | Multi-artifact system with explicit role taxonomy | Files are linked, but role boundaries are insufficiently explicit. |
| Temporality | Mixed timeless policy and time-bound session artifacts | Timeless canonical layer + separate historical/provenance layer | Point-in-time docs are adjacent to canonical packet and can be misread as normative. |

## Defaults Found

1. Flat peer prominence at system level.
- Symptom: many docs with similarly authoritative tone.
- Impact: readers can treat multiple files as canonical simultaneously.

2. Redundant scaffolding and policy restatement.
- Symptom: repeated caller-route rules, repeated invariants, repeated lock summaries across packet root, overview, axes, and examples.
- Impact: maintenance drift risk and lower canonical confidence.

3. Uniform section schema regardless of role.
- Symptom: many files mirror the same `In Scope -> Canonical Policy -> Why -> Trade-Offs -> References` shape.
- Impact: helpful locally, but insufficiently role-distinct globally (normative vs reference vs historical).

4. Formatting and structure strength in-file, but weaker system-level hierarchy.
- Symptom: strong headings inside files; weaker “this is the one canonical center” at corpus level.
- Impact: good local readability, weaker global authority model.

## Principle Diagnosis

### Signal-to-noise
- Strong: concise policy bullets and tables in axis docs.
- Weak: duplicated normative prose across multiple artifacts lowers signal.

### Hierarchy as meaning
- Strong: axis decomposition is semantically meaningful.
- Weak: canonical authority is distributed across packet root, posture overview, and decision/session artifacts.

### Information scent
- Strong: heading scent is generally clear and specific.
- Weak: artifact-role scent is under-specified (normative/reference/history not always explicit at top of files).

### Coherence
- Strong: terminology and route semantics are mostly consistent.
- Weak: repeated restatements produce multiple near-authoritative formulations that can diverge.

### Multi-artifact coherence
- Strong: cross-links are abundant.
- Weak: cross-links do not fully solve role ambiguity or duplication ownership.

## What Is Working Well (Preserve)

1. Axis-based policy decomposition (`AXIS_01`..`AXIS_09`) provides meaningful conceptual chunking.
2. Decision register (`DECISIONS.md`) gives explicit status and rationale traceability.
3. Packet entry (`ORPC_INGEST_SPEC_PACKET.md`) already behaves as an index/hub.
4. Caller/auth matrices and route-family tables provide high-value clarity.
5. E2E walkthroughs provide rich, concrete context and guardrails.

## Where the Current IA Impedes Portable Canonical Use

1. Canonical-center ambiguity.
- `ORPC_INGEST_SPEC_PACKET.md`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`, and `DECISIONS.md` all carry high-authority language.
- A portable consumer cannot immediately know which artifact is the canonical normative root.

2. Temporal mixing.
- Session review/changelog/closure docs are adjacent to policy packet docs and use authoritative tone.
- Historical and canonical layers need cleaner separation.

3. Over-repetition of invariants.
- Core route and ownership semantics are restated in many files.
- This improves local readability but harms global maintainability and canonical confidence.

4. Portability leak via local path anchors.
- Absolute local references (`/Users/...`) appear throughout policy docs.
- This weakens pack-and-port behavior to other repos/environments.

5. Code-heavy examples in canonical orbit.
- E2E files are deeply useful but code-dominant.
- Without role fencing, readers can over-index on implementation specifics and under-index on canonical policy intent.

## Multi-Artifact System Issues

1. Role boundaries are implicit instead of explicit.
2. Canonical statements are not single-sourced enough.
3. Session-era artifacts are not clearly fenced as provenance-only.
4. Navigation points to many docs, but does not sufficiently enforce “read order by role.”

## Assessment Summary
The packet is strong in local clarity, explicit policy language, and route semantics. The major deficit is not content quality; it is information architecture around authority, role, and portability. A lightweight but explicit role-layer redesign would preserve the strong material while making the packet reliably portable as a canonical spec.

