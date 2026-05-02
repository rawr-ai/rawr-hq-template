# Runtime Realization Phase Map

This directory is the instance layer for the runtime-realization lab context. A
phase is a bounded proof campaign inside the larger contained lab effort.

Phase dossiers are continuity and coordination surfaces. They explain what was
framed, run, reviewed, closed, and handed off. Current proof status remains in
`../evidence/proof-manifest.json`,
`../evidence/runtime-spine-verification-diagnostic.md`, the source, scenario
packs, fixtures, tests, and named gates.

## Phase Context Map

| Context layer | Location | Use |
| --- | --- | --- |
| Whole runtime-realization lab context | `../` | Container scope, lab runbook, global evidence |
| Phase One | `phase-one/` | Default/pre-Phase-Two research and archive |
| Phase Two | `phase-two/` | Contained spine-composition proof |
| Phase Three | `phase-three/` | Contained live-runtime-passage proof |
| Phase Four | `phase-four/` | Preparation-only Reference Runtime container; phase not opened |

New phases may be added only by an explicit containing-context decision and should use the
same `phase-<phase-slug>/` dossier shape.

## Dossier Map

| Artifact kind | Location inside a phase | Filename shape | Use |
| --- | --- | --- | --- |
| Phase overview | `README.md` | `README.md` | Phase navigation |
| Phase DRA/operator anchor | phase root | `workflow-*` or `ref-*` | Singular normative workflow or reference opened repeatedly by the DRA |
| Workstream record | `workstreams/` | `workstream-YYYY-MM-DD-phase-<phase-slug>-<slug>.md` | Closed/abandoned workstream record |
| Workstream-produced reference | `workstreams/` | `ref-YYYY-MM-DD-<slug>.md` | Concrete reference produced by or attached to workstream execution |
| Phase handoff | `handoffs/` | `handoff-YYYY-MM-DD-<slug>.md` | Transition/orientation |
| Handoff-attached reference | `handoffs/` | `ref-YYYY-MM-DD-<slug>.md` | Concrete reference that travels with a handoff |
| Phase archive | `_archive/<group>/` | Prefix with `workflow-`, `ref-`, or `workstream-` where practical | Provenance only |

`README.md` is the only unprefixed document name. Do not create unprefixed
dated records such as `YYYY-MM-DD-<slug>.md`. Do not recreate phase `refs/` or
phase `workflows/` directories; singular phase-critical anchors belong at the
phase root.

## Current Dossiers

| Phase | Dossier | Closed claim |
| --- | --- | --- |
| Phase One | `phase-one/` | Research/default context material used to ground later proof campaigns |
| Phase Two | `phase-two/` | Contained spine composition, not Lab-Production Proof |
| Phase Three | `phase-three/` | Contained live-runtime-passage `simulation-proof`, not Parent-Repo Migration authorization |
| Phase Four | `phase-four/` | Not opened; Reference Runtime container/setup packet only |
