# Phased Agent Verification Workflow

This workflow is the reusable operating pattern for high-risk spec, runtime, migration, and vendor-integration work. It is designed for teams of agents, but it works with a single host when delegation is unnecessary.

The purpose is to convert broad architecture questions into grounded evidence, explicit decisions, red/yellow/green status, and verifiable next work without turning guesses into authority.

## Core Pattern

1. Freeze the packet.
2. Map authority and provenance.
3. Split evidence gathering and judgment across lanes.
4. Integrate through one directly responsible host.
5. Burn findings down against red/yellow/green criteria.
6. Verify with named gates.
7. Leave a compact handoff with next action and proof status.

Evidence tools and explorer agents can surface candidates. They do not decide architecture truth.

## Roles

| Role | Owns |
| --- | --- |
| Host / DRI | Scope, authority order, agent prompts, conflict resolution, final synthesis, and handoff. |
| Authority Cartographer | Source hierarchy, stale inputs, provenance, and conflict rules. |
| Mechanical Verifier | Repo state, Nx project truth, paths, targets, branch/worktree state, and structural checks. |
| Architecture Reviewer | Lifecycle coherence, ownership boundaries, and absence of hidden second models. |
| Vendor Fidelity Reviewer | Real vendor behavior, version/API claims, and adapter boundary honesty. |
| Evidence Auditor | Manifest status, proof strength, test-theater risk, and oracle quality. |
| Migration Derivability Reviewer | Whether implementation slices can be derived without reopening architecture. |
| Adversarial Reviewer | False green, overfit fixtures, facade overclaims, stale authority, and missing stop rules. |
| Integrator / Editor | Final document or code integration after the host resolves the evidence. |

Use explorer agents for retrieval and default/judgment agents for conclusions.

## Phases And Artifacts

| Phase | Output artifact | Gate |
| --- | --- | --- |
| 0. Workspace preflight | Branch/status/tool note | Current repo process and allowed edit scope are known. |
| 1. Packet freeze | Input manifest or brief | Objective, authority order, included inputs, and excluded inputs are explicit. |
| 2. Extraction | Section map, claim ledger, or component map | Claims are anchored before conclusions are drawn. |
| 3. Specialist review | Lane reports | Each lane states evidence, confidence, and proposed disposition. |
| 4. Host synthesis | Integration report | Source authority, vendor behavior, architecture truth, and migration readiness are not collapsed. |
| 5. Red/yellow/green burn-down | Diagnostic matrix | Every load-bearing component has status, evidence, next action, and promotion condition. |
| 6. Repair or implementation plan | Edit map, decision packet, or migration slice plan | No hidden design decision is required to execute the next step. |
| 7. Verification loop | Verification log | Focused gates and composed gate match the claim strength. |
| 8. Handoff | Continuity note | A fresh session can resume from one next action with authority and risk clear. |

## Review Axes

Run the axes that match the work:

- Mechanical: paths, targets, imports, generated outputs, required docs, and repo state.
- Structural: information design, section placement, duplicate definitions, and canonical homes.
- Architectural: lifecycle boundaries, ownership, authority, and no second execution model.
- Vendor: installed package behavior, official docs, version pins, and adapter-shape fidelity.
- TypeScript/API: authoring shape, inference, discriminated unions, narrowing, and public surface clarity.
- Evidence honesty: proof category, oracle, gate, status wording, and test-theater risk.
- SDK ergonomics: agent-friendly authoring, one way per kind, minimal ceremony, visible backing.
- Migration realism: whether the evidence de-risks the actual migration path.
- Scope containment: no production imports, root gate drift, workspace leakage, or public export promotion.

## Red/Yellow/Green Rules

Use red/yellow/green only for claims tied to the active objective.

| Status | Required meaning |
| --- | --- |
| Green | Verified at the required proof strength by a named gate; no blocker remains. |
| Yellow | Partially verified, vendor-only, simulation-only, known `xfail`/`todo`, or needs migration-only validation. |
| Red | Missing, contradictory, unresolved, unrepresented, or unsafe to plan from. |

Every yellow/red item must name:

- Current evidence.
- Why it is not green.
- Next validation move.
- Promotion condition.
- Whether it is a lab experiment, spec decision, or migration-only slice.

## Escalation Rules

Stop or escalate when:

- A red item blocks downstream planning.
- A finding cannot be anchored to source evidence.
- Vendor evidence contradicts an assumed SDK or runtime boundary.
- A semantic or evidence tool is treated as architecture authority.
- A fixture chooses an unresolved architecture shape.
- A test would still pass if the RAWR-owned integration layer were removed.
- A green label depends only on type, vendor, or simulation evidence while claiming production readiness.
- The next step would mutate production code when the current artifact is only a lab proof.

Ask the user only for real design decisions. Resolve mechanical, source, and workflow questions from the repo.

## Lab Application

For `runtime-realization-type-env`, apply this workflow as follows:

- Authority: canonical runtime spec pinned in `proof-manifest.json`.
- Status view: `runtime-spine-verification-diagnostic.md`.
- Evidence ledger: `proof-manifest.json`.
- Focus marker: `focus-log.md`.
- Guardrails: `AGENTS.md`, `RUNBOOK.md`, and `design-guardrails.md`.
- Verification: focused Nx target first, then `runtime-realization-type-env:gate`.

Do not promote lab results into migration readiness unless the diagnostic names what remains production-only.

