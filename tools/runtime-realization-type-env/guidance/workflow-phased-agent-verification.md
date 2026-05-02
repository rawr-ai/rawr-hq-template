# Runtime Lab Proof Workflow Overlay

This workflow is the Runtime Realization Lab overlay for running bounded
workstreams against runtime proof, migration, and vendor-integration questions.

Generic workstream mechanics live in the Workstream Plugin Pack:

`tools/workstream-plugin-pack/`

This file adds only runtime-lab specialization: authority loading, proof
ceilings, runtime review axes, evidence promotion rules, and migration
non-claims.

## Naming Frame

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab | `tools/runtime-realization-type-env`, the contained environment where runtime realization evidence is built. |
| Oracle | Falsifiable RAWR-owned proof harness and regression substrate under `src/oracle` and `test/oracle`; separate from the future Reference Runtime. |
| Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime with named gates, test oracles, proof ceilings, required vendor-live checks, and residuals. |
| Reference Runtime | Full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

## Startup Overlay

Before opening or resuming a runtime workstream:

1. Open the Workstream Plugin Pack skill and record asset.
2. Read `AGENTS.md`, `RUNBOOK.md`, `guidance/guardrails-design.md`, and
   `guidance/guardrails-lab-plane-topology.md`.
3. Read `evidence/current-lab-state.md`, `evidence/proof-manifest.json`, and
   `evidence/runtime-spine-verification-diagnostic.md`.
4. Read the relevant phase dossier under `phases/**`.
5. Use `guidance/workstream-record-overlay.md` to fill runtime-specific
   authority, proof/evidence class, gates, and downstream-impact fields.

Do not create runtime-only record fields for generic workstream duties. List
runtime sources as authority, coordination, evidence, stale/excluded, or control
inputs in the pack record.

## Runtime Review Axes

Use only the axes that match the runtime workstream:

- Containment: no production imports, workspace promotion, root gate drift, or
  hidden authority expansion.
- Mechanical: paths, Nx targets, imports, generated outputs, branch state, and
  structural guard.
- Type and negative: TypeScript proof, expected-failure fixtures, and public
  surface boundaries.
- Vendor fidelity: real dependency behavior only where the claim depends on
  vendor behavior.
- Oracle behavior: contained runtime simulation, fake-host honesty, and
  runtime-owned delegation.
- Evidence honesty: proof category, test oracle, gate, status wording, and
  test-theater risk.
- Migration realism: whether evidence de-risks Parent-Repo Migration without
  authorizing it.

## Evidence Promotion

Use red/yellow/green only for claims tied to the active objective.

| Status | Meaning |
| --- | --- |
| Green | Verified at the claimed proof strength by current lab gates, with no unresolved authority conflict. |
| Yellow | Partially verified, type-only, vendor-only, simulation-only, xfail-backed, or Parent-Repo Migration validation still needed. |
| Red | Missing, unresolved, unrepresented in the lab, or unsafe to plan from without a design decision. |

Do not promote:

- vendor behavior to RAWR runtime proof;
- Oracle or compatibility simulation to Lab-Production Proof;
- lab-contained evidence to Parent-Repo Migration authorization;
- TODO fixtures, scratch notes, or old phase records to proof.

## Runtime Gates

Choose focused gates before composed gates:

```bash
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:<focused-target>
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:gate
```

Record skipped checks with reason, risk, and re-entry trigger in the workstream
record.

## Escalation

Ask the user only for runtime decisions that change architecture, public API,
ownership topology, proof ceiling, migration sequence, or authority order.
Routine lab implementation choices, focused gates, and honestly fenced
residuals stay DRA-owned.
