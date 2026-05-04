# Runtime Realization Type Env Agent Guide

## Scope

This file applies to `tools/runtime-realization-type-env/**`.

This project is the Runtime Realization Lab: the contained environment for
building, testing, and proving the runtime realization system without changing
parent repo packages, apps, services, deployment topology, or public surfaces.
It is not parent repo SDK/runtime code and not Parent-Repo Migration
implementation.

## Naming Frame

Use this vocabulary consistently:

| Concept | Canonical term | Meaning |
| --- | --- | --- |
| Environment | Runtime Realization Lab, or the Lab | `tools/runtime-realization-type-env`, the self-contained runtime container/lab. |
| Proof harness | Oracle | The existing falsifiable RAWR-owned proof harness and regression substrate under `src/oracle` and `test/oracle`; separate from the future Reference Runtime. |
| Lab goal | Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime with named gates, test oracles, proof ceilings, required vendor-live checks, and residuals. |
| Runtime artifact | Reference Runtime | The full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Repo transfer | Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

Do not use unqualified production-ready phrasing when the distinction matters.
Say Lab-Production Proof for the Lab goal and Parent-Repo Migration for moving
accepted results into the parent repo.

## Plane Routing

Open `guidance/guardrails-lab-plane-topology.md` before changing ownership,
imports, test lanes, or scenario placement. The working map is:

| Plane | Paths | Use | Proof ceiling |
| --- | --- | --- | --- |
| Shared SDK/runtime source | `src/sdk/**`, `src/spine/**`, `src/runtime/**`, `src/adapters/**`, `src/vendor/**` | Candidate SDK facade, portable refs/artifacts, runtime substrate, shared adapter contracts, and vendor seams. | Type/shape proof, vendor-proof, or Oracle substrate proof when exercised by gates. |
| Oracle | `src/oracle/**`, `test/oracle/**` | Falsification harness, controlled hosts, failure observation, and regression substrate. | `simulation-proof`; not Lab-Production Proof by itself. |
| Reference Runtime | `src/reference-runtime/**`, `test/reference-runtime/**` | Future production-shaped contained runtime-in-a-folder used to earn Lab-Production Proof. | Lab-Production Proof only after honest Reference Runtime gates pass. |
| Scenario packs | `scenarios/**` | Business capability examples consumed by Oracle, conformance, and future Reference Runtime lanes. | Scenario evidence only; proof strength comes from the consuming test lane. |

Use `fixtures/**` only for test mechanics: inline negative cases, expected
failures, and fenced TODO experiments. Positive authored business examples
belong in `scenarios/**`, not a fixture directory.

## Operational Surfaces

- `evidence/**`: produced proof/status authority plus operational system and vendor evidence maps.
- `guidance/**`: lab-specific operator guardrails, proof workflow overlays, and record fill overlays.
- `phases/**`: phase-owned operator anchors, produced workstream records, handoffs, handoff references, and archives; informative continuity only.
- `RUNBOOK.md`: canonical operating guide for lab continuity, authority order, red/yellow/green upkeep, spec feedback, and handoff shape.

## Evidence Terminology

- Containing context: the whole runtime-realization effort and its phase dossiers; input context only unless a current authority source accepts a specific item.
- Phase: a bounded proof campaign inside the containing lab context.
- Workstream: one bounded DRA-owned execution unit recorded with the Workstream Plugin Pack record asset plus the lab overlay.
- Workstream lane: a scoped proof, research, review, or execution slice inside one workstream.
- Handoff: a phase-bound transition or orientation artifact.

Evidence root files are authority/status surfaces. Phase dossiers are continuity
and coordination surfaces. Workstream records and handoffs never override the
manifest, diagnostic, runtime spec, source, fixtures, tests, or gates.

## Artifact Placement Map

Use this map before creating or moving lab documentation. `README.md` is the
only unprefixed filename exception.

| Creating or updating | Place it here | Name it like | Source status |
| --- | --- | --- | --- |
| Global proof/status authority | `evidence/` | Existing canonical filename | Authority/status surface |
| Current lab state | `evidence/` | `current-lab-state.md` | Current experiment pointer |
| System/subsystem evidence map | `evidence/systems/` | `<concept>-map.md` or `<concept>-evidence-map.md` | Evidence map |
| Vendor evidence map | `evidence/vendors/` | `<vendor-or-boundary>.md` | Vendor fact/proof-boundary map |
| Reusable operator guidance | `guidance/` | `guardrails-*`, `workflow-*`, or `workstream-record-overlay.md` | Process/reference or lab overlay |
| Phase overview | `phases/<phase>/README.md` | `README.md` | Phase navigation |
| Phase operator anchor | `phases/<phase>/` | `workflow-*` or `ref-*` | Phase process/reference anchor |
| Phase workstream record | `phases/<phase>/workstreams/` | `workstream-YYYY-MM-DD-phase-<phase-slug>-<slug>.md` | Continuity/record |
| Workstream-produced reference | `phases/<phase>/workstreams/` | `ref-YYYY-MM-DD-<slug>.md` | Reference artifact |
| Phase handoff | `phases/<phase>/handoffs/` | `handoff-YYYY-MM-DD-<slug>.md` | Orientation/transition |
| Handoff-attached reference | `phases/<phase>/handoffs/` | `ref-YYYY-MM-DD-<slug>.md` | Reference artifact |
| Phase archive/provenance | `phases/<phase>/_archive/<group>/` | Preserve or add `workflow-` / `ref-` / `workstream-` prefix | Historical provenance |

Do not create `evidence/phases/`, `evidence/workstreams/`,
`evidence/handoffs/`, `evidence/_archive/`, root `workflows/`, root
`templates/`, phase `refs/`, or phase `workflows/`. If a future file is
phase-owned and singular/normative for the DRA, keep it at `phases/<phase>/`.
If it is produced work, place it under the phase `workstreams/` or `handoffs/`
surface that owns it. If it is reusable process or overlay material, place it
under `guidance/`.

## Required Reading

Use the fast path first, then add the task-specific reads for the work in
front of you.

Fast path for any lab change:

- `README.md`
- `RUNBOOK.md`
- `guidance/guardrails-design.md`
- `guidance/guardrails-lab-plane-topology.md`
- `evidence/current-lab-state.md`
- `evidence/systems/README.md`
- the relevant phase dossier under `phases/**`
- `tools/workstream-plugin-pack/skills/workstream-runner/assets/workstream-record.md`
- `guidance/workstream-record-overlay.md`
- `evidence/proof-manifest.json`
- `evidence/vendors/README.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `guidance/workflow-phased-agent-verification.md`

Task-specific reads:

- Evidence docs or proof/status changes: `evidence/AGENTS.md`,
  `evidence/README.md`, `evidence/proof-manifest.json`,
  `evidence/runtime-spine-verification-diagnostic.md`,
  `evidence/systems/README.md`, and `evidence/vendors/README.md`.
- Phase or workstream changes: the relevant phase dossier under `phases/**`
  and `guidance/workflow-phased-agent-verification.md`.
- Source, test, scenario, fixture, or gate changes: the owning source/test
  files, `project.json`, and:

  ```sh
  bunx nx show project runtime-realization-type-env --json
  ```
- Reference Runtime preparation: `phases/phase-four/README.md`,
  `src/reference-runtime/README.md`, and `test/reference-runtime/README.md`.

## Evidence Rules

- Use `proof`, `vendor-proof`, `simulation-proof`, `xfail`, `todo`, and `out-of-scope` exactly as defined in `guidance/guardrails-design.md`.
- Vendor-shape checks must not be described as RAWR runtime proof.
- Oracle tests must not be described as Lab-Production Proof by
  themselves; they are Oracle construction and regression substrate for the
  future Reference Runtime.
- TODO fixtures are not proof. They are fenced experiments or known design gaps.
- Every proof entry must name a gate that would fail if the claim regressed.
- Every new TODO fixture must be listed in `proof-manifest.json`.
- Experiment changes must keep `evidence/current-lab-state.md` and `proof-manifest.currentExperiment` aligned.
- Vendor-specific behavior or shape changes must update the relevant `evidence/vendors/*.md` concept map.
- Runtime subsystem evidence changes must update the relevant `evidence/systems/*.md` concept map.
- Before promoting proof or changing red/yellow/green status, use `RUNBOOK.md` and `guidance/workflow-phased-agent-verification.md` to verify the authority order, review axes, and promotion condition.

## Test-Theater Rules

Remove or downgrade tests that only prove a vendor library behaves as itself.

Do not add:

- Native oRPC `.effect(...)` tests.
- Bare `Bun.version` or `Bun.serve` existence checks.
- Direct raw Effect primitive demos counted as runtime-spine proof.
- Tests that assert only constructibility while claiming adapter/runtime behavior.

Keep vendor probes only when they protect a RAWR adaptation boundary, and label them as vendor proof or shape smoke.

## Containment Rules

- Do not add `tools/runtime-realization-type-env/package.json`.
- Do not add this tool to parent workspaces, root build/typecheck/test, package
  exports, or parent repo production imports.
- Do not import production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code.
- Real `effect@3.21.2` remains a root dev dependency for this lab only.
- Canonical-looking `@rawr/sdk/*` imports remain local `tsconfig` aliases.

## Verification

For meaningful lab changes, run the focused target first, then:

```bash
bunx nx run runtime-realization-type-env:gate
```

The root convenience equivalent is:

```bash
bun run runtime-realization:type-env
```

Use `bunx nx show project runtime-realization-type-env --json` for project truth. Use Narsil/code-intel as evidence discovery when it has useful indexed symbols, but use Nx and source files as the authority for local verification.
