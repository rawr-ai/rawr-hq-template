# Runtime Realization Lab Runbook

This runbook is canonical for operating the runtime realization type environment lab. It is not architecture authority for the runtime system, not production SDK documentation, and not migration implementation guidance.

The lab exists to make the runtime realization spine concrete enough to finish the canonical spec, expose red/yellow migration risks, and test accepted shapes before migration planning depends on them.

## Intent And Scope

Use this lab to:

- Prove that the accepted runtime spine can be authored, derived, type-checked, and minimally executed in a contained environment.
- Keep unresolved architecture questions visible as `xfail` or `todo` instead of hiding them inside fixtures.
- Distinguish type proof, vendor proof, simulation proof, and migration-only work.
- Maintain the red/yellow/green runtime spine diagnostic as the working status view.
- Feed accepted findings back into the canonical runtime spec and later migration plan.

Do not use this lab to:

- Implement production SDK or runtime packages.
- Import production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code.
- Treat mini-runtime success as production runtime readiness.
- Treat vendor library behavior as proof of RAWR runtime integration.
- Resolve architecture silently in a fixture or facade.

## Authority Stack

When sources conflict, use this order:

1. Canonical runtime spec pinned by `evidence/proof-manifest.json`.
2. This runbook for operating the containment lab.
3. `AGENTS.md` for local lab boundaries and required reading.
4. `evidence/design-guardrails.md` for proof categories, violation categories, review categories, and promotion rules.
5. `evidence/proof-manifest.json` for current evidence entries, gates, fixtures, and pinned spec hash.
6. `evidence/runtime-spine-verification-diagnostic.md` for the derived red/yellow/green spine status.
7. `evidence/focus-log.md` for the current experiment marker.
8. Migration plans, audits, and quarantined docs as provenance or directional inputs only.

The canonical runtime spec remains the conflict-winning architecture source. This lab may expose a spec gap, but it must not become the source of a hidden architecture decision.

## Session Startup

Start each lab session with a short grounding pass:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
```

Then read, in order:

1. `tools/runtime-realization-type-env/AGENTS.md`
2. `tools/runtime-realization-type-env/RUNBOOK.md`
3. `tools/runtime-realization-type-env/evidence/design-guardrails.md`
4. `tools/runtime-realization-type-env/evidence/runtime-realization-research-program.md`
5. `tools/runtime-realization-type-env/evidence/phased-agent-verification-workflow.md`
6. `tools/runtime-realization-type-env/evidence/proof-manifest.json`
7. `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
8. `tools/runtime-realization-type-env/evidence/focus-log.md`
9. The latest relevant report under `tools/runtime-realization-type-env/evidence/workstreams/`.
10. The fixtures/tests for the active focus only.

Use Nx for project and target truth. Use source files for local authority. Use Narsil or other code intelligence as evidence discovery when useful, not as architecture authority.

Before opening a new workstream, after context compaction, after a long
interruption, or when resuming from a handoff, refresh
`evidence/runtime-realization-research-program.md` and
`evidence/phased-agent-verification-workflow.md` unless you are fully confident
the active state is already loaded. If you skip the refresh, make the opening
packet and current authority inputs explicit in the report anyway.

## Evidence Model

Use the proof categories exactly as defined in `evidence/design-guardrails.md`.

| Category | Meaning in this lab |
| --- | --- |
| `proof` | Type or authoring-shape rule enforced by fixtures and named gates. |
| `vendor-proof` | Installed vendor behavior or shape the lab relies on, without claiming RAWR runtime integration. |
| `simulation-proof` | Contained RAWR-owned mini-runtime or compatibility simulation behavior. |
| `xfail` | Known unresolved architecture or design gap with an oracle or stop condition. |
| `todo` | Planning inventory not yet compiled or executed. |
| `out-of-scope` | Important but intentionally outside the containment lab. |

Every `proof`, `vendor-proof`, and `simulation-proof` entry must name a gate that would fail on regression. `vendor-proof` is not runtime proof. `simulation-proof` is not production readiness.

## Red/Yellow/Green Spine Map Upkeep

`evidence/runtime-spine-verification-diagnostic.md` is the living status view for migration-risk visibility. It is derived from the spec, migration inputs, manifest, and lab gates. It is not independent architecture authority.

Use these meanings:

| Status | Meaning |
| --- | --- |
| Green | Verified at the claimed proof strength by current lab gates, with no unresolved authority conflict. |
| Yellow | Partially verified, type-only, vendor-only, simulation-only, xfail-backed, or migration-only validation still needed. |
| Red | Missing, unresolved, unrepresented in the lab, or unsafe to plan from without a design decision. |

When a runtime spine component changes status:

1. Update the Mermaid map and component matrix together.
2. Name the gate or evidence that justifies the status.
3. Keep every yellow/red row tied to a next validation move.
4. Record whether the next move is a lab experiment, spec patch, migration-only slice, or out-of-scope containment action.
5. Do not promote green status from vendor or simulation proof unless the stated claim only requires that proof strength.

## Spec Feedback Workflow

Every lab finding must land in one of these lanes:

| Finding | Handling |
| --- | --- |
| Spec rule is accepted and lab can prove it | Add or update the smallest facade, fixture, mini-runtime behavior, manifest entry, and gate. |
| Spec rule is accepted but lab cannot prove it yet | Keep or add `xfail` with an oracle and stop condition. |
| Spec is underspecified | Keep the lab fenced as `xfail` or `todo`; draft a spec decision before promoting proof. |
| Lab facade or test is wrong | Fix the lab and avoid changing the spec. |
| Proof requires production code or real host behavior | Split it into migration work and mark it yellow/red or out-of-scope here. |
| Vendor behavior changed or was overstated | Update vendor evidence and downgrade proof language until gates match the claim. |

Accepted spec changes should flow back into the canonical runtime spec first. The migration plan should be regenerated or amended from that current spec, not from quarantined or older runtime/effect documents.

## Migration-Readiness Objective

The lab is ready for migration planning only when the runtime spine map makes the remaining risk explicit enough to sequence migration slices.

A green lab gate means the lab evidence is internally consistent at the claimed strength. It does not mean the production runtime, host harnesses, external providers, telemetry export, persistence, or durable scheduling semantics are implemented.

Use the lab to decide:

- Which spine pieces are already stable enough to plan migration around.
- Which red/yellow pieces require a spec decision before migration.
- Which pieces are intentionally migration-only because they require production hosts, external services, or deployment infrastructure.

## Durable Workstream Reports

At the end of each meaningful burn-down, persist one completed session report in:

```text
tools/runtime-realization-type-env/evidence/workstreams/YYYY-MM-DD-<slug>.md
```

Those reports are informative continuity containers. They should preserve the
session frame, input packet, workflow, findings, final output, and the useful
input for the next workstream. They do not replace the canonical spec, proof
manifest, focus log, diagnostic, or this runbook.

Do not turn `evidence/focus-log.md` into a transcript or live status tracker.
Keep session detail in workstream reports and keep authority deltas in the
manifest and diagnostic.

Use `evidence/workstreams/TEMPLATE.md` for new reports. A workstream is closed
only when required outputs are present, proof deltas and diagnostic deltas are
recorded, deferred items have authority homes, unblock conditions, and re-entry
triggers, review loops are recorded, verification is recorded, repo/Graphite
state is recorded, and the next workstream packet is usable by a zero-context
agent.

Closeout also needs a workstream lifecycle/process review: confirm the
workstream was opened, run, reviewed, closed, and handed off according to the
workflow. Record process-tension notes when the coordination loop itself caused
friction, ambiguity, skipped checks, or repeatable failure, and turn actionable
process findings into workflow/template repairs before the next workstream.

Every deferred item must also appear in the manifest, diagnostic, todo fixture,
research program, spec patch proposal, migration-only note, or out-of-scope
note. A report may summarize deferred work, but it must not be the only place
that deferred work exists.

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
- Still migration-only:

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
