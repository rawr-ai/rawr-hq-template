# Research Inputs

Status: project research index / informative / not canonical architecture authority.

This directory contains the current research inputs for the next spec-update phase of the final architecture migration. The top-level files are the current working set. They are decision inputs for spec updates, not replacements for the canonical specs in `../spec/`.

## Current Working Set

| File | Role |
| --- | --- |
| `runtime-architecture-alignment-plan.md` | Direct input for aligning the canonical architecture specification with the runtime realization specification. Start here for the system-architecture/runtime-realization alignment pass. |
| `spec-landscape-audit.md` | Broad audit across the RAWR spec corpus. Use as a map of cross-spec gaps and future spec-update candidates, not as the active edit plan for any one spec. |
| `inngest-durable-workflow-findings.source-report.md` | Source report for durable Inngest workflow semantics and proof boundaries. Use as vendor/runtime evidence, not as production readiness proof. |
| `ingest-misalignment-synthesis.md` | Narrow synthesis of the three overlapping Inngest findings across the reports above. This is the current short entry point for Inngest follow-up. |
| `SPEC_UPDATE_BACKLOG.md` | Lightweight backlog of known spec-update inputs. It is intentionally not prioritized. |

## Supporting Inputs

`_provenance/2026-05-03-spec-alignment-inputs/` contains the notes, audits, source captures, claim traces, and intermediate artifacts that produced the current working set. Treat those files as evidence and reconstruction material.

`quarantine/` contains older or non-current research packets that are preserved for possible mining but should not steer the current spec-update phase as active authority.

## Authority Boundary

Canonical specification authority remains in `../spec/`. Research files can identify gaps, propose edits, and preserve evidence, but any requirement becomes authoritative only after it is incorporated into the owning canonical specification.
