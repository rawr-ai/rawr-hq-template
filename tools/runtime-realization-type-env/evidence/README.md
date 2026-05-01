# Runtime Realization Evidence Surface

This directory is the operational evidence surface for the contained
runtime-realization lab. It separates current status, proof authority, system
maps, and vendor facts so future phases can find the right evidence without
reading every workstream report.

## Start Here

| Reader task | Open | What it answers |
| --- | --- | --- |
| Understand where the lab is now | `current-lab-state.md` | Current experiment, closed state, proof ceiling, and related manifest entries |
| Check proof ledger, spec hash, fixtures, gates, and proof categories | `proof-manifest.json` | The manifest authority for earned proof categories |
| Check red/yellow/green migration-risk status | `runtime-spine-verification-diagnostic.md` | Derived status view for the runtime spine |
| Inspect evidence by runtime subsystem | `systems/README.md` | Concept maps for runtime spine, Effect integration, and telemetry/observation |
| Inspect evidence by vendor concept | `vendors/README.md` | Vendor-specific facts, proof boundaries, and future official-doc review needs |
| Find phase-owned reports and handoffs | `../phases/README.md` | Phase dossiers, workstreams, handoffs, and archives |
| Find proof policy and reusable workflows | `../guidance/README.md` | Guardrails, phased verification workflow, and report template |

Runtime authority still comes from the manifest-pinned canonical runtime spec.
The architecture spec supplies larger shape, but it does not override
runtime-realization details.

## Naming Frame

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab | This contained tool/environment. |
| Oracle | Existing falsifiable proof harness and regression substrate under `../src/oracle` and `../test/oracle`; separate from the future Reference Runtime. |
| Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime with named gates, test oracles, proof ceilings, required vendor-live checks, and residuals. |
| Reference Runtime | The full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

## Evidence Types

| Evidence type | Location | Create/update rule |
| --- | --- | --- |
| Current lab pointer | `current-lab-state.md` | Update with `proof-manifest.currentExperiment` only |
| Proof ledger | `proof-manifest.json` | Update only with earned gates, fixtures, or explicit proof-boundary changes |
| Derived diagnostic | `runtime-spine-verification-diagnostic.md` | Update when a load-bearing runtime-spine status changes |
| System/subsystem map | `systems/*.md` | Update when a system concept gains or loses relevant evidence |
| Vendor concept map | `vendors/*.md` | Update when vendor behavior, shape, version, or proof boundary changes |
| Phase report/handoff | `../phases/<phase>/...` | Keep phase-specific detail in the owning phase dossier |

Do not add dated workstream reports, handoff files, reference artifacts,
templates, workflows, or archives directly under this directory.

## Proof Boundary

Program/workstream documents coordinate order and continuity. They do not
override the manifest, diagnostic, runtime spec, source, fixtures, tests, or
gates. Archived files are historical provenance and become active inputs only
when a current workstream explicitly reopens them as source-mining material.
