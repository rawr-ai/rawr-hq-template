# Runtime Realization Evidence Agent Guide

## Scope

This file applies to `tools/runtime-realization-type-env/evidence/**`.

The evidence surface is for current lab state, proof authority, system evidence
maps, and vendor concept maps. It is not the place for phase-owned workstream
reports, handoffs, reusable templates, or reusable workflows.

## Naming Frame

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab | `tools/runtime-realization-type-env`, the self-contained runtime container/lab. |
| Oracle | The existing falsifiable RAWR-owned proof harness and regression substrate under `../src/oracle` and `../test/oracle`; separate from the future Reference Runtime. |
| Lab-Production Proof | Production-level evidence earned inside the Lab by a full contained runtime/reference system, with named gates, test oracles, proof ceilings, and residuals. |
| Reference Runtime | The full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

## Placement Map

| Need | Go to | Create here? | Authority |
| --- | --- | --- | --- |
| Current lab state | `current-lab-state.md` | Update existing only | Human-readable mirror of `proof-manifest.currentExperiment` |
| Proof ledger | `proof-manifest.json` | Update existing only | Proof/status authority |
| Red/yellow/green status | `runtime-spine-verification-diagnostic.md` | Update existing only | Derived status authority |
| Runtime subsystem evidence | `systems/` | Add/update concept map | Evidence map, not proof promotion |
| Vendor evidence | `vendors/` | Add/update vendor map | Vendor facts and proof boundaries |
| Proof category and review rules | `../guidance/guardrails-design.md` | No | Local proof policy |
| Reusable workflow/template material | `../guidance/` | No | Operator guidance |
| Phase DRA/operator anchor | `../phases/<phase>/` | No | Phase continuity |
| Phase workstream report | `../phases/<phase>/workstreams/` | No | Continuity only |
| Phase handoff/reference | `../phases/<phase>/handoffs/` | No | Orientation/reference only |

## Naming Map

| Artifact | Naming |
| --- | --- |
| Current-state pointer | `current-lab-state.md` |
| System map | `<concept>-map.md` or `<concept>-evidence-map.md` |
| Vendor map | `<vendor-or-boundary>.md` |
| Directory index | `README.md` |

Do not recreate retired root paths: `evidence/focus-log.md`,
`evidence/spine-audit-map.md`, `evidence/effect-integration-map.md`,
`evidence/vendor-fidelity.md`, `evidence/phases/`, `evidence/workstreams/`,
`evidence/handoffs/`, or `evidence/_archive/`.

## Proof Boundary

Runtime authority comes from the manifest-pinned runtime spec. Proof/status
authority comes from the manifest, diagnostic, source, fixtures, tests, and
named gates.

System maps and vendor maps are operational indexes. They explain why evidence
matters and where it points, but they do not promote proof by themselves.
