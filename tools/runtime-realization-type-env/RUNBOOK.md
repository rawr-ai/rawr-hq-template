# Runtime Realization Lab Runbook

This runbook is canonical for operating the Runtime Realization Lab. It is not
architecture authority for the runtime system, not parent repo SDK/runtime
documentation, and not Parent-Repo Migration implementation guidance.

The Lab exists to make the runtime realization spine concrete enough to finish
the canonical spec, earn Lab-Production Proof inside containment, expose
red/yellow Parent-Repo Migration risks, and test accepted shapes before
Parent-Repo Migration planning depends on them.

## Naming Frame

| Term | Meaning |
| --- | --- |
| Runtime Realization Lab, or the Lab | `tools/runtime-realization-type-env`, the self-contained runtime container/lab. |
| Oracle | The existing falsifiable RAWR-owned proof harness and regression substrate under `src/oracle` and `test/oracle`; separate from the future Reference Runtime. |
| Lab-Production Proof | Future lab-contained, production-shaped proof earned by the Reference Runtime with named gates, test oracles, proof ceilings, required vendor-live checks, and residuals. |
| Reference Runtime | The full runtime-in-a-folder system built inside the Lab to earn Lab-Production Proof. |
| Parent-Repo Migration | Later migration/adaptation of accepted Lab results into parent repo packages, apps, services, deployment topology, or public surfaces. |

## Intent And Scope

Use this lab to:

- Prove that the accepted runtime spine can be authored, derived,
  type-checked, and executed in a contained environment, including
  production-shaped Reference Runtime paths when they are needed for
  Lab-Production Proof.
- Keep unresolved architecture questions visible as `xfail` or `todo` instead of hiding them inside fixtures.
- Distinguish type proof, vendor proof, simulation proof, Lab-Production Proof,
  and Parent-Repo Migration work.
- Maintain the red/yellow/green runtime spine diagnostic as the working status view.
- Feed accepted findings back into the canonical runtime spec and later migration plan.

Do not use this lab to:

- Implement parent repo SDK or runtime packages.
- Import production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code.
- Treat Oracle success as Lab-Production Proof by itself.
- Treat vendor library behavior as proof of RAWR runtime integration.
- Resolve architecture silently in a fixture or facade.

## Authority Stack

When sources conflict, use this order:

1. Canonical runtime spec pinned by `evidence/proof-manifest.json`.
2. This runbook for operating the containment lab.
3. `AGENTS.md` for local lab boundaries and required reading.
4. `guidance/guardrails-design.md` for proof categories, violation categories, review categories, and promotion rules.
5. `guidance/guardrails-lab-plane-topology.md` for Lab source/test/scenario ownership and dependency direction.
6. `evidence/proof-manifest.json` for current evidence entries, gates, fixtures, and pinned spec hash.
7. `evidence/runtime-spine-verification-diagnostic.md` for the derived red/yellow/green spine status.
8. `evidence/current-lab-state.md` for the current experiment marker.
9. `evidence/systems/` and `evidence/vendors/` for subsystem and vendor evidence maps.
10. Migration plans, audits, and quarantined docs as provenance or directional inputs only.

The canonical runtime spec remains the conflict-winning architecture source. This lab may expose a spec gap, but it must not become the source of a hidden architecture decision.

## Session Startup

Start each lab session with a short grounding pass:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
```

Then use this reading path.

Fast path:

1. `tools/runtime-realization-type-env/AGENTS.md`
2. `tools/runtime-realization-type-env/RUNBOOK.md`
3. `tools/runtime-realization-type-env/guidance/guardrails-design.md`
4. `tools/runtime-realization-type-env/guidance/guardrails-lab-plane-topology.md`
5. `tools/runtime-realization-type-env/evidence/current-lab-state.md`

Task-specific reads:

- Evidence docs or proof/status changes:
  `tools/runtime-realization-type-env/evidence/AGENTS.md`,
  `tools/runtime-realization-type-env/evidence/README.md`,
  `tools/runtime-realization-type-env/evidence/proof-manifest.json`,
  `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`,
  and the relevant `evidence/systems/**` or `evidence/vendors/**` map.
- Phase or workstream changes:
  `tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md`,
  `tools/runtime-realization-type-env/guidance/workstream-record-overlay.md`,
  and the relevant phase dossier.
- Source, test, scenario, fixture, or gate changes: the active files and
  `bunx nx show project runtime-realization-type-env --json`.
- Reference Runtime container/setup preparation:
  `tools/runtime-realization-type-env/phases/phase-four/README.md`,
  `tools/runtime-realization-type-env/src/reference-runtime/README.md`, and
  `tools/runtime-realization-type-env/test/reference-runtime/README.md`.

Use Nx for project and target truth. Use source files for local authority. Use Narsil or other code intelligence as evidence discovery when useful, not as architecture authority.

Before opening a new workstream, after context compaction, after a long
interruption, or when resuming from a handoff, load the current-state, phase,
and workflow inputs needed to identify the real authority packet. Do not turn
that grounding pass into separate workstream duties or checklist fields; record
only the sources that materially decided or verified the workstream.

## Evidence Model

Use the proof categories exactly as defined in `guidance/guardrails-design.md`.

| Category | Meaning in this lab |
| --- | --- |
| `proof` | Type or authoring-shape rule enforced by fixtures and named gates. |
| `vendor-proof` | Installed vendor behavior or shape the lab relies on, without claiming RAWR runtime integration. |
| `simulation-proof` | Contained RAWR-owned Oracle or compatibility simulation behavior. |
| `xfail` | Known unresolved architecture or design gap with a test oracle or stop condition. |
| `todo` | Planning inventory not yet compiled or executed. |
| `out-of-scope` | Important but intentionally outside the current Lab claim, proof lane, or phase. |

Every `proof`, `vendor-proof`, and `simulation-proof` entry must name a gate
that would fail on regression. `vendor-proof` is not runtime proof.
`simulation-proof` is not Lab-Production Proof by itself. Lab-Production Proof
requires a Reference Runtime gate plus required vendor-live/product gates, and
it still does not authorize Parent-Repo Migration without a separate accepted
migration slice.

## Red/Yellow/Green Spine Map Upkeep

`evidence/runtime-spine-verification-diagnostic.md` is the living status view for migration-risk visibility. It is derived from the spec, migration inputs, manifest, and lab gates. It is not independent architecture authority.

Use these meanings:

| Status | Meaning |
| --- | --- |
| Green | Verified at the claimed proof strength by current lab gates, with no unresolved authority conflict. |
| Yellow | Partially verified, type-only, vendor-only, simulation-only, xfail-backed, or Parent-Repo Migration validation still needed. |
| Red | Missing, unresolved, unrepresented in the lab, or unsafe to plan from without a design decision. |

When a runtime spine component changes status:

1. Update the Mermaid map and component matrix together.
2. Name the gate or evidence that justifies the status.
3. Keep every yellow/red row tied to a next validation move.
4. Record whether the next move is a Lab experiment, spec patch,
   Parent-Repo Migration slice, or out-of-scope containment action.
5. Do not promote green status from vendor or simulation proof unless the stated claim only requires that proof strength.

## Spec Feedback Workflow

Every lab finding must land in one of these lanes:

| Finding | Handling |
| --- | --- |
| Spec rule is accepted and lab can prove it | Add or update the smallest facade, fixture, test-oracle behavior, manifest entry, and gate. |
| Spec rule is accepted but lab cannot prove it yet | Keep or add `xfail` with a test oracle and stop condition. |
| Spec is underspecified | Keep the lab fenced as `xfail` or `todo`; draft a spec decision before promoting proof. |
| Lab facade or test is wrong | Fix the lab and avoid changing the spec. |
| Proof requires parent repo code or real deployed host behavior | Route final validation to Parent-Repo Migration, but keep production-shaped Lab substitutes in the Lab when they can exercise the contract. |
| Vendor behavior changed or was overstated | Update vendor evidence and downgrade proof language until gates match the claim. |

Accepted spec changes should flow back into the canonical runtime spec first. The migration plan should be regenerated or amended from that current spec, not from quarantined or older runtime/effect documents.

## Lab-Production And Migration Objective

The Lab is ready for Parent-Repo Migration planning only when the runtime spine
map makes the remaining risk explicit enough to sequence Parent-Repo Migration
slices.

A green Lab gate means the Lab evidence is internally consistent at the claimed
strength. It does not mean parent repo runtime packages, parent host harnesses,
external providers, telemetry export, persistence, or durable scheduling
semantics are implemented unless the claim explicitly earned that
Lab-Production Proof ceiling.

Use the lab to decide:

- Which spine pieces are already stable enough to plan Parent-Repo Migration around.
- Which red/yellow pieces require a spec decision before Parent-Repo Migration.
- Which pieces are intentionally Parent-Repo Migration-only because they
  require real deployed hosts, external services, or deployment infrastructure.

## Durable Workstream Records

At the end of each meaningful burn-down, persist one completed session record in
the owning phase dossier:

```text
tools/runtime-realization-type-env/phases/<phase>/workstreams/workstream-YYYY-MM-DD-phase-<phase-slug>-<slug>.md
```

Those records are informative continuity containers. They should preserve the
session frame, input packet, workflow, findings, final output, and the useful
input for the next workstream. They do not replace the canonical spec, proof
manifest, current lab state, diagnostic, or this runbook.

Use this placement map when creating lab documentation:

| Creating | Location | Filename |
| --- | --- | --- |
| Current lab state | `evidence/` | `current-lab-state.md` |
| System/subsystem evidence map | `evidence/systems/` | `<concept>-map.md` or `<concept>-evidence-map.md` |
| Vendor evidence map | `evidence/vendors/` | `<vendor-or-boundary>.md` |
| Reusable operator guidance | `guidance/` | `guardrails-*`, `workflow-*`, or `workstream-record-overlay.md` |
| Phase DRA/operator anchor | `phases/<phase>/` | `workflow-*` or `ref-*` |
| Phase workstream record | `phases/<phase>/workstreams/` | `workstream-YYYY-MM-DD-phase-<phase-slug>-<slug>.md` |
| Workstream-produced reference | `phases/<phase>/workstreams/` | `ref-YYYY-MM-DD-<slug>.md` |
| Phase handoff | `phases/<phase>/handoffs/` | `handoff-YYYY-MM-DD-<slug>.md` |
| Handoff-attached reference | `phases/<phase>/handoffs/` | `ref-YYYY-MM-DD-<slug>.md` |

`README.md` is the only unprefixed document exception. Do not create phase
reports under `evidence/`, and do not recreate `evidence/phases/`,
`evidence/workstreams/`, `evidence/handoffs/`, `evidence/_archive/`, root
`workflows/`, root `templates/`, phase `refs/`, or phase `workflows/`.

Do not turn `evidence/current-lab-state.md` into a transcript or live status tracker.
Keep session detail in workstream records and keep authority deltas in the
manifest and diagnostic.

Create new records from the Workstream Plugin Pack record asset in
`tools/workstream-plugin-pack/skills/workstream-runner/assets/workstream-record.md`,
then apply the Runtime Realization Lab fill guidance in
`guidance/workstream-record-overlay.md`. A workstream is closed
only when required outputs are present, proof deltas and diagnostic deltas are
recorded, deferred items have authority homes, unblock conditions, and re-entry
triggers, review loops are recorded, verification is recorded, repo/Graphite
state is recorded, and the Next Packet is usable by a zero-context
agent.

Closeout also needs a runtime-lab complementarity review: confirm the runtime
record used the Workstream Plugin Pack for generic mechanics and this lab only
added proof/evidence, gate, authority, phase, and migration boundaries. Record
process-tension notes as pack or lab-overlay repair demands before the next
workstream repeats them.

Every deferred item must also appear in the manifest, diagnostic, todo fixture,
spec patch proposal, Parent-Repo Migration note, out-of-scope note, or
containing-program context when such a program exists. A record may summarize
deferred work, but it must not be the only place that deferred work exists, and
containing-program context is input/ownership context rather than a normal
workstream duty.

## Handoff Template

Use this shape when ending a lab session:

```markdown
# Runtime Realization Lab Handoff

## Current Experiment

- Experiment:
- Related manifest entries:
- Authority spec path:
- Authority spec hash verified: yes/no

## Evidence Changes

- Promoted:
- Downgraded:
- Added xfail/todo:
- Removed theatrical or overstated evidence:

## Red/Yellow/Green Changes

- Green:
- Yellow:
- Red:
- Still Parent-Repo Migration-only:

## Spec Feedback

- Spec decisions accepted:
- Spec patches needed:
- Questions still open:

## Verification

- Focused gates:
- Full gate:
- Structural guard:
- Repo/Graphite state:

## Next Step

One precise next action for the next session.
```
