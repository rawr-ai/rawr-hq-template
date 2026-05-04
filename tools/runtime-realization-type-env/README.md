# Runtime Realization Type Environment

This project is the Runtime Realization Lab: the contained environment for
building, testing, and proving the Runtime Realization spine without changing
parent repo packages, apps, services, deployment topology, or public surfaces.
It is not the parent repo SDK/runtime and not Parent-Repo Migration
implementation.

Use these names consistently:

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab | This contained tool/environment. |
| Oracle | Existing falsifiable proof harness and regression substrate under `src/oracle` and `test/oracle`; separate from the future Reference Runtime. |
| Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime with named gates, test oracles, proof ceilings, required vendor-live checks, and residuals. |
| Reference Runtime | The full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

Pinned authority for the current lab:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- The SHA-256 is recorded in `evidence/proof-manifest.json` and verified by the structural guard.

The SDK facade in `src/sdk/**` exists only to make the spec authoring model executable by TypeScript. Canonical-looking imports such as `@rawr/sdk/effect` are local `tsconfig` aliases and must not be treated as production package exports.

## Plane Topology

Open `guidance/guardrails-lab-plane-topology.md` before changing source
ownership, test topology, or scenario placement.

| Plane | Primary paths | Responsibility |
| --- | --- | --- |
| Shared SDK/runtime source | `src/sdk/**`, `src/spine/**`, `src/runtime/**`, `src/adapters/**`, `src/vendor/**` | Candidate authoring facade, portable artifacts, runtime substrate, shared adapter contracts, and vendor seams. |
| Oracle | `src/oracle/**`, `test/oracle/**` | Falsification harness, controlled hosts, failure observation, and regression substrate. |
| Reference Runtime | `src/reference-runtime/**`, `test/reference-runtime/**` | Future production-shaped contained runtime-in-a-folder for Lab-Production Proof gates. |
| Scenario packs | `scenarios/**` | Business capability examples consumed by Oracle, conformance tests, and future Reference Runtime flows. |

Current materialization:

- Phase Three is closed as contained Oracle `simulation-proof`.
- Phase Four is not open.
- Shared runtime, Oracle, scenarios, and current tests exist.
- Reference Runtime source, Reference Runtime tests, and a Reference Runtime
  gate do not exist beyond README-level scaffolds.
- The Lab is a contained semantic mirror, not the final Nx/package/generator
  topology.

## Evidence Lanes And Proof Ceilings

- Type/shape proof: authoring signatures, descriptor refs, portable artifacts, and negative misuse cases compile or fail as expected.
- Vendor proof: real `effect@3.21.2`, TypeBox, oRPC, Inngest, and Bun boundary behavior is exercised only in narrow lab lanes.
- Oracle proof: descriptor table/registry assembly,
  runtime-owned Effect execution, adapter delegation, deployment handoff, and
  invocation-time context binding run through Oracle. These Oracle tests are
  useful substrate for the future Reference Runtime, but they remain
  `simulation-proof` unless a stronger gate exists.
- Compatibility simulation proof: the original simulation lane remains as a
  compatibility check while Oracle and the Reference Runtime planes grow.
- Lab-Production Proof: future lab-contained, production-shaped proof from a
  Reference Runtime gate plus required vendor-live/product gates.

Current gates do not yet earn Lab-Production Proof for final oRPC adapter
behavior, provider plan shape, durable workflow scheduling, telemetry export,
persistence, network transport, or bootgraph execution. They also do not
authorize Parent-Repo Migration. Open architecture gaps stay marked as `xfail`
or `todo` in `evidence/proof-manifest.json`.

## Commands

```bash
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:typecheck
bunx nx run runtime-realization-type-env:negative
bunx nx run runtime-realization-type-env:vendor-effect
bunx nx run runtime-realization-type-env:vendor-boundaries
bunx nx run runtime-realization-type-env:oracle
bunx nx run runtime-realization-type-env:simulate
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:gate
```

## Iteration Rule

When the spec changes, update the smallest SDK facade, Oracle behavior,
Reference Runtime behavior when it exists, and fixture set needed to
prove the new spine rule. Move the related proof manifest entry from `todo` or
`xfail` to `proof`, `vendor-proof`, or `simulation-proof` only when its named
gate is green.

If a change requires modifying parent repo packages, apps, services, deployment
topology, or public surfaces, split it into Parent-Repo Migration work. If it
can be proven by a production-shaped contained runtime path, keep that proof
inside the Lab. This tool may reveal a spec gap; it must not resolve
architecture silently.

Use `evidence/current-lab-state.md` to identify the current experiment,
`evidence/systems/` to read evidence by runtime subsystem, and
`evidence/vendors/` to keep vendor-shaped facades honest. Do not expand any of
these into a parallel planning system.

## Continuity And Guardrails

Agents working in this lab should start with `AGENTS.md`, `RUNBOOK.md`, and `guidance/guardrails-design.md`.

- `RUNBOOK.md` is the canonical operating guide for lab continuity, authority order, red/yellow/green upkeep, spec feedback, and handoff shape.
- `AGENTS.md` defines the local lab structure, containment rules, and required reading.
- `evidence/README.md` maps global proof/status authority.
- `evidence/AGENTS.md` defines evidence-specific placement rules.
- `evidence/current-lab-state.md` is the explicit current lab state pointer.
- `evidence/systems/README.md` maps evidence by runtime subsystem.
- `evidence/vendors/README.md` maps evidence by vendor concept.
- `guidance/guardrails-design.md` defines proof categories, violation categories, review categories, and test-theater rules.
- `guidance/guardrails-lab-plane-topology.md` defines the canonical Lab plane topology and source/test placement rules.
- `evidence/runtime-spine-verification-diagnostic.md` is the living red/yellow/green runtime spine status view.
- `guidance/workflow-phased-agent-verification.md` is the Runtime Lab proof
  workflow overlay for workstreams run with the Workstream Plugin Pack.
- `guidance/**` holds reusable operator guardrails, workflows, and record overlays.
- `phases/**` holds phase dossiers: phase root anchors for DRA-critical
  workflow/reference files, produced workstream records, phase handoffs,
  handoff references, and archives.
- `guidance/workstream-record-overlay.md` is the Runtime Realization Lab overlay
  for the Workstream Plugin Pack record asset in
  `tools/workstream-plugin-pack/skills/workstream-runner/assets/workstream-record.md`.

## Artifact Map

| Artifact you need | Location | Name shape |
| --- | --- | --- |
| Proof/status authority | `evidence/` | Existing canonical filenames |
| Current lab state | `evidence/` | `current-lab-state.md` |
| System/subsystem evidence | `evidence/systems/` | `<concept>-map.md` or `<concept>-evidence-map.md` |
| Vendor evidence | `evidence/vendors/` | `<vendor-or-boundary>.md` |
| Reusable operator guidance | `guidance/` | `guardrails-*`, `workflow-*`, or `workstream-record-overlay.md` |
| Phase DRA/operator anchor | `phases/<phase>/` | `workflow-*` or `ref-*` |
| Phase-owned workstream record | `phases/<phase>/workstreams/` | `workstream-YYYY-MM-DD-phase-<phase-slug>-<slug>.md` |
| Workstream-produced reference | `phases/<phase>/workstreams/` | `ref-YYYY-MM-DD-<slug>.md` |
| Phase handoff | `phases/<phase>/handoffs/` | `handoff-YYYY-MM-DD-<slug>.md` |
| Handoff-attached reference | `phases/<phase>/handoffs/` | `ref-YYYY-MM-DD-<slug>.md` |

Do not duplicate the manifest or diagnostic tables in new docs. Link to them and update the source artifact when status changes.
