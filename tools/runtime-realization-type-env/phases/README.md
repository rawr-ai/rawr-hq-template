# Runtime Realization Phase Map

This directory is the instance layer for the runtime-realization program. A
phase is a bounded proof campaign inside the larger contained lab effort.

Phase dossiers are continuity and coordination surfaces. They explain what was
framed, run, reviewed, closed, and handed off. Current proof status remains in
`../evidence/proof-manifest.json`,
`../evidence/runtime-spine-verification-diagnostic.md`, the source, fixtures,
tests, and named gates.

## Program Topology

| Program layer | Location | Use |
| --- | --- | --- |
| Whole runtime-realization program | `../` | Container scope, lab runbook, global evidence |
| Phase One | `phase-one/` | Default/pre-Phase-Two research and archive |
| Phase Two | `phase-two/` | Contained spine-composition proof |
| Phase Three | `phase-three/` | Contained live-runtime-passage proof |

Keep the topology limited to these three phase buckets unless a later explicit
program decision creates a new phase.

## Dossier Map

| Artifact kind | Location inside a phase | Filename shape | Use |
| --- | --- | --- | --- |
| Phase overview | `README.md` | `README.md` | Phase navigation |
| Phase DRA/operator anchor | phase root | `workflow-*` or `ref-*` | Singular normative workflow or reference opened repeatedly by the DRA |
| Child or program workstream | `workstreams/` | `workstream-YYYY-MM-DD-phase-<one|two|three>-<slug>.md` | Closed/abandoned workstream report |
| Workstream-produced reference | `workstreams/` | `ref-YYYY-MM-DD-<slug>.md` | Concrete reference produced by or attached to workstream execution |
| Phase handoff | `handoffs/` | `handoff-YYYY-MM-DD-<slug>.md` | Transition/orientation |
| Handoff-attached reference | `handoffs/` | `ref-YYYY-MM-DD-<slug>.md` | Concrete reference that travels with a handoff |
| Phase archive | `_archive/<group>/` | Prefix with `workflow-`, `ref-`, or `workstream-` where practical | Provenance only |

`README.md` is the only unprefixed document name. Do not create unprefixed
dated reports such as `YYYY-MM-DD-<slug>.md`. Do not recreate phase `refs/` or
phase `workflows/` directories; singular phase-critical anchors belong at the
phase root.

## Current Dossiers

| Phase | Dossier | Closed claim |
| --- | --- | --- |
| Phase One | `phase-one/` | Research/default-program material used to ground later proof campaigns |
| Phase Two | `phase-two/` | Contained spine composition, not Lab-Production Proof |
| Phase Three | `phase-three/` | Contained live-runtime-passage `simulation-proof`, not Parent-Repo Migration authorization |
