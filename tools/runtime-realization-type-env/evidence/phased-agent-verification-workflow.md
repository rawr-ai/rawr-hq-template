# Phased Agent Verification Workflow

This workflow is the reusable operating pattern for high-risk spec, runtime, migration, and vendor-integration work. It is designed for teams of agents, but it works with a single host when delegation is unnecessary.

The purpose is to convert broad architecture questions into grounded evidence, explicit decisions, red/yellow/green status, and verifiable next work without turning guesses into authority.

This workflow is the lab-local coordination loop for runtime-realization burn-down workstreams. It borrows the useful coordination concepts of durable continuity, typed inputs, output contracts, evidence-backed review, repair demands, invalidation, waiver-not-pass, and explicit closure. It does not implement the future RAWR Workstream System, review graph service, event model, storage schema, or governance API.

## Core Pattern

1. Open the workstream from an explicit packet.
2. Map authority, provenance, and stale inputs.
3. Extract claims and current proof status before conclusions.
4. Split evidence gathering and judgment across lanes.
5. Integrate through one directly responsible host.
6. Lock the smallest safe design or proof target.
7. Capture the plan before implementation.
8. Implement inside the accepted containment boundary.
9. Verify with named gates and layered review loops.
10. Promote evidence only to the proof strength earned.
11. Close with a report, deferred inventory, and next workstream packet.

Evidence tools and explorer agents can surface candidates. They do not decide architecture truth.

## Typed Inputs

Treat inputs as typed control surfaces, not undifferentiated conversation.

| Input kind | Meaning | Examples | Governance effect |
| --- | --- | --- | --- |
| Opening input | Creates or materially reframes the workstream. | User request, prior workstream output, red diagnostic item, accepted decision. | Defines the output contract and plan target. |
| Evidence input | Adds information without changing governance by itself. | Spec sections, test output, peer report, vendor docs, PR feedback, logs. | Can support verdicts, repair demands, or replanning. |
| Control input | Changes posture or progression. | Approve, reject, pause, resume, retarget, split, merge, abandon, close. | Must be explicit and recorded in the workstream report or plan. |

Most interaction is evidence. Only typed control changes the workstream target,
acceptance criteria, or closure state.

## Skill Lens Selection

At the start of each workstream, choose the smallest useful set of skill lenses.
Do not load every broadly relevant skill by default. The host should state which
lenses are selected and why, then apply their mandate checks where they add real
review value.

Useful lenses include:

| Lens | Use when |
| --- | --- |
| `architecture` | Target/current/transition separation, lifecycle boundaries, migration slices, and decision packets. |
| `solution-design` | Problem framing, whether the chosen intervention is the right level, and reversible-vs-irreversible tradeoffs. |
| `system-design` | Feedback loops, second-order effects, incentives, and program-level control loops. |
| `domain-design` | Ownership boundaries, authority, language seams, and responsibility splits. |
| `api-design` | Public or pseudo-public API, SDK, CLI, local library, adapter, or tool surface choices. |
| `typescript` | Type-level design, SDK authoring ergonomics, inference, module boundaries, discriminated unions, safe refactors, and proportional type complexity. |
| `ontology-design` | Semantic models, evidence graphs, claim ledgers, identity, relationship meaning, and inference/validation use cases. |
| `information-design` | Multi-document shape, reader task, hierarchy, information scent, and report/template usability. |
| `docs-architecture` | Repo doc placement, canonical-vs-supporting docs, and doc-system compliance. |
| `team-design` | Agent roles, handoff contracts, accountability, feedback loops, and failure modes. |
| `testing-design` | Falsifiable oracles, risk-proportional tests, boundaries, and adequacy criteria. |
| `nx-workspace` | Nx project truth, target discovery, and workspace navigation. |
| `graphite` | Branch, stack, submit, restack, and PR hygiene. |

The lens list is a menu, not a checklist. If a lens does not materially change
the workstream plan or review, omit it.

For TypeScript-level DX/API review, useful external references include:

- <https://refactoring.guru/design-patterns/typescript>
- <https://github.com/RefactoringGuru/design-patterns-typescript>
- <https://refactoring.guru/refactoring/techniques>

Use these as review aids for pattern vocabulary, refactoring moves, and
professional TypeScript judgment. They are not runtime architecture authority.

## Refresher Rule

The host/DRI must refresh this workflow and
`runtime-realization-research-program.md` before opening a new workstream and
after context compaction, resume, or long interruption. If the host is fully
confident the active state is already loaded, the refresh can be skipped, but
the workstream report should still make the opening packet and current
authority inputs explicit.

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
| Workstream Lifecycle Reviewer | Whether the workstream was opened, run, reviewed, closed, and handed off according to this process. Also records process-tension notes and structural improvements for the next workstream. |
| Adversarial Reviewer | False green, overfit fixtures, facade overclaims, stale authority, and missing stop rules. |
| Integrator / Editor | Final document or code integration after the host resolves the evidence. |

Use explorer agents for retrieval and default/judgment agents for conclusions.

## Phase Teams

Each phase can and should use an agent team when parallel evidence, independent
review, or bounded implementation slices would improve confidence. The host/DRI
selects a phase team from the roles above, gives each agent a narrow output
contract, and records the team shape in the workstream plan or report.

Phase teams are local to the phase. The host may rotate agents within a phase
when fresh context, independent judgment, or a different lane is useful. Use
fresh agents when context carryover is not desired. Keep no more than 6 agents
active concurrently for a single workstream phase.

The concurrency cap is a coordination guard, not a target. A phase with one host
and no delegated agents is valid when delegation would add ceremony without
better evidence. A larger phase team is justified only when the lanes are
independent enough that the host can verify and integrate their results without
turning review into shape checking.

## Phases And Artifacts

| Phase | Output artifact | Gate |
| --- | --- | --- |
| 0. Workspace preflight | Branch/status/tool note | Current repo process and allowed edit scope are known. |
| 1. Opening packet | Workstream brief | Objective, authority order, output contract, non-goals, proof target, expected gates, and excluded inputs are explicit. |
| 2. Prior workstream assimilation | Prior report delta | Previous final output, deferred inventory, repair demands, and next packet are consumed or explicitly rejected. |
| 3. Authority triangulation | Authority/provenance map | Current spec, diagnostic, manifest, migration plan, and stale inputs are separated. |
| 4. Skill lens selection | Lens note | The host chooses only useful skills and records why. |
| 5. Extraction | Section map, claim ledger, or component map | Claims are anchored before conclusions are drawn. |
| 6. Investigation | Lane reports | Each lane states evidence, confidence, and proposed disposition. |
| 7. Host synthesis and design lock | Integration report | Source authority, vendor behavior, architecture truth, DX, and migration readiness are not collapsed. |
| 8. Plan capture | Workstream plan | No hidden design decision is required to execute the next step. |
| 9. Implementation | Patch set | Changes stay inside the accepted containment boundary. |
| 10. Semantic JSDoc/comment pass | Comment review result | New semantic seams preserve intent, invariants, and proof boundaries without comment spam. |
| 11. Verification loop | Verification log | Focused gates and composed gate match the claim strength. |
| 12. Layered review | Review result | Leaf loops pass before parent judgment closes the workstream. |
| 13. Evidence promotion | Manifest/diagnostic deltas | Proof status, red/yellow/green status, and gates agree. |
| 14. Closeout | Workstream report and next packet | A fresh session can resume from one next action with authority, deferred items, and risk clear. |

## Workstream Output Contract

Every workstream starts with an output contract. The host owns making it explicit before implementation.

Minimum fields:

- required outputs;
- optional outputs;
- proof strength target;
- non-goals;
- acceptance and closure criteria;
- expected gates;
- authority files and excluded stale inputs;
- stop conditions for user escalation.

A workstream closes only when all required outputs are present, acceptance loops are satisfied or explicitly waived, deferred items have authority homes and re-entry triggers, and repo/Graphite state is recorded.

## Review Axes

Run the axes that match the work:

- Mechanical: paths, targets, imports, generated outputs, required docs, and repo state.
- Structural: information design, section placement, duplicate definitions, and canonical homes.
- Architectural: lifecycle boundaries, ownership, authority, and no second execution model.
- Vendor: installed package behavior, official docs, version pins, and adapter-shape fidelity.
- TypeScript/API: authoring shape, inference, discriminated unions, narrowing, and public surface clarity.
- Semantic JSDoc/comments: high-signal comments for non-obvious lifecycle,
  authority, proof-boundary, and invariant seams introduced by TypeScript/runtime
  edits.
- Evidence honesty: proof category, oracle, gate, status wording, and test-theater risk.
- SDK ergonomics: agent-friendly authoring, one way per kind, minimal ceremony, visible backing.
- Migration realism: whether the evidence de-risks the actual migration path.
- Scope containment: no production imports, root gate drift, workspace leakage, or public export promotion.

## Review Loop Ordering

Run review as layered acceptance, not as a flat checklist.

Leaf loops usually run first:

1. Containment: no production imports, workspace promotion, root gate drift, or hidden authority expansion.
2. Mechanical: paths, Nx targets, imports, generated outputs, Graphite branch state, and structural guard.
3. Type and negative: TypeScript proof, expected-failure fixtures, and public surface boundaries.
4. Semantic JSDoc/comments: comments preserve why/invariant/proof-boundary
   meaning and do not restate mechanics or lock unresolved public API.
5. Vendor fidelity: real dependency behavior only where the claim depends on vendor behavior.
6. Mini-runtime behavior: contained runtime simulation, fake-host honesty, and runtime-owned delegation.
7. Manifest/report consistency: proof entries, gates, diagnostics, focus log, and report output agree.

Parent loops judge composed meaning after leaf evidence exists:

1. Architecture: lifecycle boundaries, ownership, and no hidden second execution model.
2. Migration derivability: whether the proof reduces actual migration risk without claiming production readiness.
3. DX/API/TypeScript: whether the chosen shape is powerful, vendor-aligned, author-friendly, inference-friendly, and professionally typed without losing capability.
4. Workstream lifecycle: whether opening packet, prior-workstream assimilation, plan capture, review loops, deferred inventory, proof promotion, final output, and next packet were actually used rather than filled in after the fact.
5. Adversarial evidence honesty: false green, reward hacking, overfit fixtures, hidden API selection, and stale authority.

Parent failures may invalidate satisfied leaf loops. Record the invalidation and rerun the affected loops instead of quietly preserving a prior green.

Workstream lifecycle review may emit process-tension notes. A tension note is
not a runtime finding by itself; it names repeated friction, ambiguity, skipped
process, or coordination debt and proposes a concrete workflow or template
repair before the next workstream repeats the same failure.

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
- Authority home.
- Re-entry trigger.
- Next eligible workstream.

No deferred item may exist only in chat or only in a workstream report. It must also live in the manifest, diagnostic, todo fixture, research program, spec patch proposal, migration-only note, or out-of-scope note as appropriate.

## Promotion, Repair, Invalidation, And Waiver

Promotion rule:

- A `proof`, `vendor-proof`, or `simulation-proof` entry must have a gate that would fail on regression.
- An `xfail` can promote only after the oracle is clear, the focused gate fails or passes for the right reason, and the manifest and diagnostic agree.
- Vendor proof never becomes RAWR runtime proof unless the claim is explicitly only about vendor behavior.
- Simulation proof never becomes production readiness.

Repair demand rule:

- Failed evidence must narrow the next move.
- A repair demand names the failure kind, target refs, required change or investigation, blocked evidence, whether replan is required, and which loops must rerun.
- Bad repair demand: `try again`.
- Good repair demand: `lower provider acquire/release through bootgraph, keep retry policy fenced, rerun mini-runtime, report, and architecture review`.

Invalidation rule:

- New plan revision, artifact change, spec hash change, parent-review failure, or governance decision can invalidate previously satisfied loops.
- Record what was invalidated and why in the workstream report.
- Do not keep a green claim if its assumptions changed.

Waiver rule:

- A waiver is not satisfaction and not a pass.
- A waiver records accepted risk, authority, rationale, scope, and follow-up workstream.
- Waivers are allowed for process closure only when they do not overstate proof strength.

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
- A fixture or implementation chooses a public API, method law, lifecycle law, telemetry/error taxonomy, or vendor-boundary behavior that the spec has not accepted.
- A simplification changes capability, DX contract, ownership, runtime behavior, or migration topology.

Ask the user only for real design decisions. Resolve mechanical, source, and workflow questions from the repo.

Host-owned decisions include branch names, doc placement inside this lab, fixture placement, gate wiring, report wording, and keeping existing fenced items fenced.

User-escalation decisions include public authoring API changes, `ProviderEffectPlan` final shape, `RuntimeResourceAccess` method law, dispatcher access policy, async step membership policy, cold route derivation/import-safety law, boundary default policy, durable-vs-process-local semantics, and any change that contradicts a negotiated architecture decision.

## Lab Application

For `runtime-realization-type-env`, apply this workflow as follows:

- Authority: canonical runtime spec pinned in `proof-manifest.json`.
- Status view: `runtime-spine-verification-diagnostic.md`.
- Evidence ledger: `proof-manifest.json`.
- Focus marker: `focus-log.md`.
- Program map: `runtime-realization-research-program.md`.
- Workstream reports: `workstreams/YYYY-MM-DD-<slug>.md`.
- Workstream template: `workstreams/TEMPLATE.md`.
- Guardrails: `AGENTS.md`, `RUNBOOK.md`, and `design-guardrails.md`.
- Verification: focused Nx target first, then `runtime-realization-type-env:gate`.

Do not promote lab results into migration readiness unless the diagnostic names what remains production-only.
