# Session Tools Session Parity Workstream

Status: `complete`.
Branch: `agent-session-tools-workstream-b-session-parity`.
PR: `none`.
Commit: branch tip after closure commit.
DRA: `Codex DRA`.
Dates: `2026-05-08 -> active`.

This record preserves state and handoff context for one bounded workstream. It
is not architecture authority, product authority, a program definition,
sequence authority, or a live task board.

## Workstream State

Workstream record path:
`docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`

Status: `complete`

DRA: `Codex DRA`

Branch/stack:
`agent-session-tools-workstream-b-session-parity`, parented to
`codex/workstream-b-preparation` by `gt info`.

Live Graphite state at opening repair:

- `agent-session-tools-workstream-b-session-parity` is one of several
  zero-commit Workstream B lane branches with the same parent
  `codex/workstream-b-preparation`.
- Sibling lane branches currently visible: `agent-upstream-fallout-*`,
  `agent-undo-*`, `agent-plugin-sync-*`, and `agent-devops-*`.
- All listed lane branches currently point at `b5156443`; `gt ls` renders them
  as a lattice, but `gt info --branch agent-session-tools-workstream-b-session-parity`
  reports parent `codex/workstream-b-preparation`.
- Submission/restack rule: this DRA may mutate and submit only this lane
  branch. Use `gt sync --no-restack`; use `gt restack --upstack` only for this
  stack if needed; do not change parents or absorb sibling lane work.

Current phase: complete; final repo/Graphite check runs after closure commit.

Selected skills:

- `workstream-runner`
- `workstream-review-loops`
- `solution-design`
- `team-design`
- `framing-design`
- `parallel-development-workflow`

Selected agents:

- Service/API mapper: Dirac `019e08e0-d4c7-7fe2-a215-da29b1317a81`.
- Downstream parity mapper: Hypatia `019e08e0-f90d-7290-af28-771da760b0ad`.
- Workstream opening reviewer: Halley `019e08e1-11c7-7700-ab33-1edaa52adc35`.
- Service package exemplar mapper: James `019e08e6-7514-7ba2-bd2d-2b81199d4611`.
- Follow-up opening reviewer: Maxwell `019e08e9-6e00-7930-bdb2-b4f20d4d329a`.
- Plan reviewer: Herschel `019e08e8-d83f-7ca0-bbef-18f766ce54a3`.
- Red-team reviewer: Kant `019e08e8-efa4-7241-92f6-c2bca6387dc1`.
- Final proof reviewer: Godel `019e08ff-d0f8-7a43-bfd6-3a3818cb6150`, no
  blocking findings.
- Implementation workers: not used; DRA implemented the service/CLI changes
  directly after the reviewed plan was accepted.

Selected hooks: none.

## Frame

Objective:
Implement upstream session-tools parity for migration-sensitive session
capabilities, so `RAWR HQ-Template` becomes the shared authority for reusable
session tooling while downstream `RAWR HQ` remains behavior evidence until a
later sunset phase.

Containment boundary:
This lane is limited to `services/session-intelligence/**`,
`plugins/cli/session-tools/**`, and targeted session-tools documentation and
workstream artifacts under this lane directory.

Primitive boundary:
This is one implementation workstream inside Workstream B. It does not own the
overall Workstream B program sequence or downstream sunset.

Non-goals:

- Do not remove or mutate downstream `RAWR HQ` files.
- Do not recreate downstream `packages/session-tools` as upstream authority.
- Do not run global plugin sync or link repair.
- Do not broaden this lane into a general transcript/corpus platform.
- Do not change unrelated session, corpus, plugin-sync, undo, or DevOps surfaces.

Done means:
Upstream service and CLI prove facet/custom-payload parity with tests, the
README matches implemented behavior, downstream duplicate session tooling is
ready for later sunset without preserving dual authority, review findings are
dispositioned, required gates are recorded, and repo/Graphite state is clean.

## Opening Packet

Opening input:

- User-assigned lane: `session-tools session parity`.
- Prior frame: migrate behavior into upstream template authority while keeping
  downstream as evidence until explicit final sunset.
- User instruction: run a DRA-owned long-running workstream end to end with
  artifacts, agents, review, red-team, development, iteration, and completion.
- User instruction during discovery: leverage `agent-config-sync` and
  `example-todo` as service-package structure examples. Service routers should
  not be thin shells; real service capability orchestration should live in
  routers where appropriate.

Authority inputs:

- `AGENTS.md`
- `AGENTS_SPLIT.md`
- `docs/AGENTS.md`
- `docs/process/GRAPHITE.md`
- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/LANE_PACKET_TEMPLATE.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/READINESS.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/SPEC.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/ROUGH_PLAN.md`
- Current upstream code in this worktree.
- `services/agent-config-sync/**` as a structural exemplar for service-owned
  planning/execution routers.
- `services/example-todo/**` and `plugins/server/api/example-todo/**` as golden
  examples for service package/router/module/test structure.

Authority order:

1. Current user instruction.
2. `AUTHORITY_MAP.md` as the ranking rule for Workstream B inputs.
3. Current upstream `RAWR HQ-Template` code in this branch.
4. Current downstream `RAWR HQ` code as behavior evidence only.
5. Accepted `REVIEW_LEDGER.md` findings only where revalidated against current
   files.
6. Lane packet discovery/spec/rough plan/readiness.
7. Old docs only as stale/evidence inputs.

Conflict rule: live code drift forces revalidation. A review finding or lane
packet claim is not automatically promoted over current code.

Prior Assimilation:

- `AGENTS.md`: Nx-first navigation, Graphite requirement, template repo role,
  and command surface policy consumed as control input.
- `AGENTS_SPLIT.md`: confirms `services/session-intelligence` and
  `plugins/cli/session-tools` are template-owned shared surfaces; downstream
  plugin/package material remains evidence unless explicitly promoted.
- `docs/AGENTS.md`: docs naming, active-vs-archive routing, and canonical docs
  boundaries consumed as control input.
- `docs/process/GRAPHITE.md`: Graphite-first and parallel safety commands
  consumed as branch control.
- `NEXT_PACKET.md`: lane sequence, downstream hold, first reads, and forbidden
  scope consumed as coordination authority.
- `AUTHORITY_MAP.md`: upstream service/projection ownership and downstream
  evidence role consumed as authority ordering rule.
- `REVIEW_LEDGER.md`: findings `F-01-01`, `F-01-02`, and `F-01-03` consumed
  as accepted repair requirements after current-file revalidation.
- `LESSONS.md`: no session-tools lessons captured yet; if this lane removes or
  sunsets material with reusable lessons, add lane-local lessons before
  deletion. This lane currently expects no downstream deletion.
- `LANE_PACKET_TEMPLATE.md`: record/plan shape consumed as artifact guidance.
- Session-tools lane packet: discovery, spec, rough plan, and readiness consumed
  as the starting lane contract, not as proof without code/test verification.
- `agent-config-sync` exemplar: module routers own domain orchestration
  (`planning`, `execution`, `undo`, `retirement`) while helpers remain
  mechanical and projections remain thin.
- `example-todo` exemplar: package router composes module routers; module
  routers own handler behavior, typed errors, observability hooks, and
  cross-module checks rather than forwarding to client-to-client calls.

Coordination inputs:

- Graphite stack state.
- Parallel Workstream B lane worktrees.
- Agent outputs recorded in the DRA notes below. Agent outputs are evidence
  candidates, not proof, until synthesized and dispositioned by this DRA.

Evidence inputs:

- Upstream `services/session-intelligence/**`.
- Upstream `plugins/cli/session-tools/**`.
- Downstream `packages/session-tools/**`.
- Downstream `plugins/cli/session-tools/**`.
- Required test output and final repo/Graphite status.

Excluded or stale inputs:

- Upstream README claims about structured facets as proof of implementation.
- Downstream package/CLI shape as architecture authority.
- Any docs that reopen the locked upstream-authority decision.

Control inputs:

- Graphite-first branch workflow.
- Worktree isolation under
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-session-tools-workstream-b-session-parity`.
- Planning artifacts are durable in commit `f7024769`; implementation changes
  are included in the closure commit at branch tip.
- Downstream hold: no downstream mutation or deletion in this lane.

Stop/escalation conditions:

- Facet filtering would require unbounded transcript reads by default.
- Service-owned facet/search behavior cannot be designed without broad
  architecture changes.
- Downstream files would need mutation before upstream parity is proven.
- Current code drifts enough that the lane packet no longer matches the
  service/projection shape.
- An irreversible public CLI/API decision conflicts with the packet authority.
- A design would push session facet/search orchestration into thin CLI shells
  or inert router forwarding instead of service-owned module router behavior.

## Output Contract

Required outputs:

- This workstream record:
  `docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`.
- Lane implementation plan artifact:
  `docs/projects/workstream-b-preparation/lanes/session-tools/IMPLEMENTATION_PLAN.md`.
- Review and red-team findings with DRA disposition:
  `docs/projects/workstream-b-preparation/lanes/session-tools/REVIEW_FINDINGS.md`.
- Code/docs/test changes implementing accepted plan.
- Final verification record in this workstream record.
- Zero-context Next Packet:
  `docs/projects/workstream-b-preparation/lanes/session-tools/NEXT_PACKET.md`.

Optional outputs:

- Lane-local lesson entries if implementation removes or sunsets material with
  reusable lessons.

Claim strength / evidence class:
Implementation claims require direct code inspection plus targeted tests. README
claims, downstream behavior, and agent summaries are evidence inputs, not proof.

Surfaces touched:

- `docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/REVIEW_FINDINGS.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/NEXT_PACKET.md`
- Expected implementation surfaces:
  - `services/session-intelligence/src/service/common/normalization.ts`
  - `services/session-intelligence/src/service/modules/search/**`
  - `services/session-intelligence/test/**`
  - `plugins/cli/session-tools/src/commands/sessions/search.ts`
  - `plugins/cli/session-tools/test/**`
  - `plugins/cli/session-tools/README.md`

Service-structure design constraint:
`services/session-intelligence` must follow the internal service package
pattern demonstrated by `agent-config-sync` and `example-todo`: contracts and
entities define boundary shape, helpers hold mechanical parsing/filtering
pieces, and module routers own the service capability orchestration. The
session search router should contain the real search/facet composition and
bounded candidate policy; it should not become a thin shell over a hidden
library that recreates downstream `packages/session-tools`.

Expected gates:

- `bunx nx run @rawr/session-intelligence:test`
- `bunx nx run @rawr/plugin-session-tools:test`
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`
- `bunx nx run-many -t build,structural --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`
- `git status --short --branch`
- `gt ls`

## Workflow

Preflight:

- Worktree created from `codex/workstream-b-preparation`.
- Dependencies installed with `bun install`.
- Nx project discovery confirmed for `@rawr/session-intelligence` and
  `@rawr/plugin-session-tools`.
- Baseline `bunx nx run @rawr/session-intelligence:test`: passed,
  2 files / 10 tests.
- Baseline `bunx nx run @rawr/plugin-session-tools:test`: passed,
  1 file / 8 tests.

Investigation lanes:

- Service/API mapper.
- Downstream parity mapper.
- Opening mechanics reviewer.
- Service package exemplar mapper.

Phase teams:

- Discovery/design: mapper pair plus DRA synthesis.
- Plan review: focused reviewer plus red-team.
- Development: DRA-directed implementation with bounded workers as useful.
- Final review: proof/closure audit and targeted rerun after repairs.

Design lock:
No implementation work may start until:

- Opening P1/P2 findings are recorded and repaired or waived.
- `IMPLEMENTATION_PLAN.md` exists. Current status: draft written, under review.
- Plan review and red-team findings are recorded in `REVIEW_FINDINGS.md`.
- DRA disposition is recorded for every review finding.
- Branch/Graphite state is refreshed.

Agent packets:

- Service/API mapper
  - Agent: Dirac `019e08e0-d4c7-7fe2-a215-da29b1317a81`.
  - Status: complete, read-only.
  - Objective: map current upstream service/client/search contracts and propose
    minimal service-owned API/implementation shape for custom payloads,
    facets, facet filters, and bounded facet-only search.
  - Evidence base: this lane record and packet; `services/session-intelligence`
    source/tests; `plugins/cli/session-tools` search command/tests.
  - Forbidden scope: no edits; no downstream mutation; no plan finalization.
  - Output format: concise evidence-backed design memo to DRA in agent result.
  - Proof limit: memo is evidence input only; DRA must verify before using.
  - Stop conditions: architecture change broader than search/session service,
    unbounded default scan requirement, or authority conflict.
- Downstream parity mapper
  - Agent: Hypatia `019e08e0-f90d-7290-af28-771da760b0ad`.
  - Status: complete, read-only.
  - Objective: identify downstream behaviors/fixtures/tests to port or mirror
    upstream for custom Codex payloads, structured facets, CLI flags,
    `--print-facets`, and limit/candidate semantics.
  - Evidence base: this lane packet; downstream `packages/session-tools/**` and
    `plugins/cli/session-tools/**`; upstream tests for proof gaps.
  - Forbidden scope: no edits; no downstream mutation; no treatment of
    downstream package as target authority.
  - Output format: concise evidence-backed parity memo to DRA in agent result.
  - Proof limit: downstream code is behavior evidence, not architecture proof.
  - Stop conditions: behavior requires downstream mutation or conflicts with
    upstream service/projection boundary.
- Opening mechanics reviewer
  - Agent: Halley `019e08e1-11c7-7700-ab33-1edaa52adc35`.
  - Status: complete, read-only.
  - Objective: review opening mechanics: objective, containment, authority
    order, stop conditions, output contract, agent/team setup, and proof
    boundary.
  - Evidence base: this workstream record, lane packet, top-level Workstream B
    authority files.
  - Forbidden scope: no implementation design review; no edits.
  - Output format: findings with severity, evidence, and repair demand.
  - Proof limit: findings require DRA disposition.
  - Stop conditions: none encountered.
- Plan reviewer
  - Agent: Herschel `019e08e8-d83f-7ca0-bbef-18f766ce54a3`.
  - Status: complete, read-only.
  - Objective: review `IMPLEMENTATION_PLAN.md` after DRA writes it for service
    boundary, test adequacy, and scope control.
  - Evidence base: workstream record, implementation plan, review findings,
    lane packet, current service/plugin source and tests, Nx target metadata.
  - Forbidden scope: no edits; no implementation; no rewrite of the plan.
  - Output format: findings only, with severity, evidence, disposition
    recommendation, and repair demand.
  - Proof limit: findings require DRA disposition and repair before
    implementation.
  - Stop conditions: discovery of service boundary violation, unbounded scan
    risk, insufficient gates, or incomplete output semantics.
- Red-team reviewer
  - Agent: Kant `019e08e8-efa4-7241-92f6-c2bca6387dc1`.
  - Status: complete, read-only.
  - Objective: adversarially test the plan for unbounded scans, stale proof,
    downstream authority leakage, and CLI/API ambiguity.
  - Evidence base: workstream record, implementation plan, review findings,
    top-level authority/review docs, upstream/downstream code as needed.
  - Forbidden scope: no edits; no implementation; no non-adversarial rewrite.
  - Output format: findings only, with severity, evidence, disposition
    recommendation, and repair demand.
  - Proof limit: red-team output is an adversarial input; DRA owns disposition.
  - Stop conditions: P1 closure blocker, irreversible API ambiguity,
    Graphite/worktree risk, or proof-boundary failure.
- Implementation workers
  - Agents: not used.
  - Decision: DRA implemented directly because the service/CLI write sets were
    coupled through the service contract and small enough to keep integrated in
    one local pass.
  - Proof limit: implementation quality is proven by code review, tests, and
    final proof review, not by worker delegation.
- Service package exemplar mapper
  - Agent: James `019e08e6-7514-7ba2-bd2d-2b81199d4611`.
  - Status: complete, read-only; result assimilated into plan and record.
  - Objective: map `agent-config-sync` and `example-todo` structural patterns
    relevant to session-intelligence search facets.
  - Evidence base: `services/agent-config-sync/**`, `services/example-todo/**`,
    `plugins/server/api/example-todo/**`, and their tests.
  - Forbidden scope: no edits; no full implementation plan; no unrelated
    service redesign.
  - Output format: concise exemplar guidance with file references and
    implications for this lane.
  - Proof limit: exemplar guidance constrains style and structure, but current
    session-intelligence code and lane requirements remain the implementation
    authority.
- Final proof reviewer
  - Agent: Godel `019e08ff-d0f8-7a43-bfd6-3a3818cb6150`.
  - Status: complete, read-only; no blocking findings.
  - Objective: review the final diff for service-owned parity, candidate-limit
    semantics, hidden scaffolding policy, CLI proof, and router/helper split.
  - Evidence base: current uncommitted implementation diff, lane artifacts,
    service/plugin tests, external CLI command-channel proof.
  - Forbidden scope: no edits; no destructive commands; no branch mutation.
  - Output format: findings first with severity and file/line references, or
    no-blocker statement plus residual risk.
  - Proof limit: proof reviewer did not rerun build/structural; DRA did, and
    those gates passed before disposition.

Wave packets:

- Wave 1: discovery and opening repair
  - Wave objective: ground service/downstream evidence and repair DRA
    workstream mechanics before implementation.
  - Agents/lanes: Service/API mapper, downstream parity mapper, service package
    exemplar mapper, opening mechanics reviewer.
  - Inputs: lane packet, top-level authority docs, current upstream code,
    downstream code as evidence.
  - Allowed edit surfaces: DRA only edits workstream artifacts in lane
    directory; agents read-only.
  - Forbidden files: downstream `RAWR HQ`; sibling lane worktrees/branches.
  - Scratch path or none: none; outputs returned to DRA and summarized in this
    record.
  - Expected output: design/parity memos and opening findings.
  - Output artifact path: this record; later `IMPLEMENTATION_PLAN.md` and
    `REVIEW_FINDINGS.md`.
  - Expected diff shape: lane artifacts only during Wave 1.
  - Required gates: baseline tests and repo/Graphite checks.
  - Branch/Graphite constraints: no parent changes; no sibling branch mutation.
  - Lane done condition: opening P1/P2 findings disposed and plan ready to
    review.
  - DRA decision point: service-owned API shape and implementation entry.
  - Gate: no implementation workers until opening repairs and plan review pass.
  - Close condition: DRA can proceed to plan review without process drift.
- Wave 2: plan review and red-team
  - Status: complete pending artifact durability and branch/Graphite refresh.
  - Wave objective: validate the plan artifact before implementation starts.
  - Agents/lanes: plan reviewer and red-team reviewer.
  - Inputs: `IMPLEMENTATION_PLAN.md`, `WORKSTREAM_RECORD.md`,
    `REVIEW_FINDINGS.md`, lane packet, top-level authority/review docs, and
    current code as needed.
  - Allowed edit surfaces: agents read-only; DRA repairs plan/review/record
    artifacts.
  - Forbidden files: downstream `RAWR HQ`; sibling lane branches/worktrees.
  - Scratch path or none: none; findings recorded in `REVIEW_FINDINGS.md`.
  - Output artifact path: `REVIEW_FINDINGS.md` plus repaired plan/record.
  - Expected diff shape: lane artifacts only until implementation starts.
  - Required gates: branch/Graphite refresh before implementation entry.
  - Branch/Graphite constraints: no parent changes; no sibling branch mutation.
  - Lane done condition: all P1/P2 review findings repaired or consciously
    waived, P3 findings repaired/deferred, and design lock satisfied.
  - DRA decision point: accept/reject/waive/defer each review finding.
  - Gate: no implementation until plan review and red-team are dispositioned.
  - Gate result: review findings dispositioned and plan repaired; artifact
    durability and branch-state refresh remain before implementation.
  - Close condition: all review findings dispositioned and plan repaired or
    waived.
- Wave 3: implementation and verification
  - Status: complete.
  - Implementation result: service-owned facets/custom payload parity and CLI
    projection are implemented in the upstream template repo.
  - Required gates: service tests, plugin tests, typecheck, build, structural,
    and targeted external CLI plugin-channel proof passed.
  - Close condition: final proof review has no blocking findings, closure
    artifacts are updated, and implementation diff is committed.

Scratch policy:
Use this lane directory for durable artifacts. Use temporary scratch only for
throwaway command output; promote evidence into this record or plan before
relying on it.

## Findings

### F-OPEN-01: Delegation Was Not Mechanically Replayable

Finding: The first draft named selected agents but did not record replayable
agent or wave packets.

Evidence: Halley opening review of `WORKSTREAM_RECORD.md`.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Fill agent and wave packets for each used agent and pending
agent class, including objective, evidence base, forbidden scope, output
format, stop conditions, and proof limits.

Next Packet consequence: Future handoff must include agent outputs as evidence
inputs, not unexplained spawned IDs.

### F-OPEN-02: Authority Order Conflicted With Top-Level Authority Map

Finding: The first draft ranked accepted review ledger findings above current
upstream code.

Evidence: Halley compared this record with `AUTHORITY_MAP.md`.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Align authority order with the top map and add a live-code drift
revalidation rule.

Next Packet consequence: Future agents must revalidate lane packet and review
claims against current files.

### F-OPEN-03: Branch/Stack State Was Incomplete

Finding: The first draft recorded only the parent branch and omitted the live
multi-lane Graphite topology and local draft state.

Evidence: Halley opening review plus current `gt ls`, `gt info`, `git status`,
and `git worktree list --porcelain`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Record topology, sibling lane branches, and DRA mutation rule;
commit or mark artifacts as local draft before relying on durable handoff.

Next Packet consequence: Future Graphite operations must avoid absorbing or
rewriting sibling lane branches.

### F-OPEN-04: Output Contract And Implementation Entry Were Not Path-Complete

Finding: The first draft named generic outputs but not concrete paths or a hard
implementation entry condition.

Evidence: Halley opening review.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Name concrete artifact paths and lock implementation behind
opening repair, plan artifact, review/red-team disposition, and refreshed
branch state.

Next Packet consequence: Future implementation starts only after reviewable
plan artifacts exist.

### F-OPEN-05: Prior/Control Input Assimilation Was Incomplete

Finding: The first draft omitted required first-read/control files from the
record.

Evidence: Halley compared this record with `NEXT_PACKET.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Add prior assimilation covering first reads, control inputs, and
lesson capture rule.

Next Packet consequence: Future handoff should distinguish authority, control,
evidence, stale input, and lesson-capture surfaces.

### F-OPEN-06: Plan-Review Delegation Was Not Mechanically Complete

Finding: Follow-up opening review found plan reviewer and red-team packets were
still stubs.

Evidence: Maxwell follow-up opening review of `WORKSTREAM_RECORD.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Fill plan-review/red-team packets with evidence base, forbidden
scope, output format, proof limit, and stop conditions; complete implementation
worker packet before implementation if workers are used.

Next Packet consequence: Future review agents must be replayable from the
record, not inferred from chat.

### F-OPEN-07: Agent State Was Inconsistent

Finding: Follow-up opening review found the service package exemplar mapper was
recorded as active in some places and omitted from the selected-agent summary.

Evidence: Maxwell follow-up opening review of `WORKSTREAM_RECORD.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Add exemplar mapper to selected agents and mark result as
assimilated.

Next Packet consequence: Keep selected-agent summary and agent packets aligned.

### F-OPEN-08: Outcome And Review Summary Contained Stale State

Finding: Follow-up opening review found the record still said the plan artifact
was not written and review loops were pending despite active review artifacts.

Evidence: Maxwell follow-up opening review of `WORKSTREAM_RECORD.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Update outcome and review sections to reflect current phase:
plan exists, opening follow-up complete with repairs, plan review/red-team in
progress, implementation not entered.

Next Packet consequence: Avoid stale process-state claims in handoff.

### F-PLAN-01: Service Bound Was Not Service-Enforced

Finding: Plan reviewer found `candidateLimit` defaulting was only concrete in
the CLI, leaving direct service consumers without a service-owned safe default.

Evidence: Herschel plan review of `IMPLEMENTATION_PLAN.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Require service-owned default and max for `candidateLimit` in the
search contract/router, plus tests for omitted, explicit, and invalid
candidate limits.

Next Packet consequence: Service safety cannot depend on CLI defaults.

### F-PLAN-02: Required Gates Omitted Structural/Build Coverage

Finding: Plan reviewer found required gates omitted structural and build targets
available for the exact projects under change.

Evidence: Herschel plan review plus Nx project metadata.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: Add build and structural gates for both touched projects.

Next Packet consequence: Final proof must include boundary/structural checks,
not only tests and typecheck.

### F-PLAN-03: Facet-Only Output Semantics Were Under-Specified

Finding: Plan reviewer found the new `search.facets` procedure did not pin
output DTO or ordering.

Evidence: Herschel plan review of `IMPLEMENTATION_PLAN.md`.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: State `search.facets` output DTO and ordering rule and add
service/CLI tests that pin it.

Next Packet consequence: Future CLI projection should not infer facet-only
shape.

### F-RT-01: Content Search Could Still Conflate Returned Limit With Candidate Bound

Finding: Red-team found the plan did not account for existing content search
using `maxMatches` as returned hit cap while `limit` controls loaded sessions.

Evidence: Kant red-team review of `IMPLEMENTATION_PLAN.md`,
`services/session-intelligence/src/service/modules/search/router.ts`, and
`plugins/cli/session-tools/src/commands/sessions/search.ts`.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Pin post-change content-search contract: `maxMatches` remains
returned hit cap; `candidateLimit` is the facet scan bound. Add tests where
`maxMatches=1` and the matching faceted session is inside `candidateLimit` but
outside the first result boundary.

Next Packet consequence: Content search parity cannot close unless
`maxMatches`, `limit`, and `candidateLimit` are distinguished in code and tests.

### F-RT-02: Candidate Limit Was Bounded In Prose, Not Schema

Finding: Red-team found current service contracts use unconstrained
`Type.Number()` and the plan had not yet required bounded integer schema.

Evidence: Kant red-team review of search contract and plan.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Define `candidateLimit` as validated bounded integer in the
service contract, with service-side default independent of CLI flags.

Next Packet consequence: Service safety must be contract-enforced.

### F-RT-03: Facet Source Policy Could Copy Hidden-Context Behavior

Finding: Red-team found downstream facet tests include `environment_context` and
`permissions_instructions`, while upstream transcript extraction deliberately
filters instruction scaffolding from normal transcript text.

Evidence: Kant red-team review of downstream tests and upstream normalization.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Explicitly decide facet-eligible row/text policy and add tests
for `environment_context` / instruction scaffolding inclusion or exclusion.

Next Packet consequence: Do not blindly port downstream facet fixture
expectations for hidden scaffolding.

### F-RT-04: CLI Proof Was Too Indirect For Plugin Command Surface

Finding: Red-team found plugin tests may prove command classes, but not that the
external plugin channel exposes and runs the new flags.

Evidence: Kant red-team review of README, plugin search command, app CLI package
state, and plugin tests.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: Add one scoped CLI proof for command discovery/help plus one JSON
invocation path without global plugin sync/link repair.

Next Packet consequence: README/API proof cannot substitute for runnable
command-surface proof.

### F-RT-05: Review Artifacts Were Not Durable In Graphite Yet

Finding: Red-team found lane docs remained untracked and therefore not durable
for handoff.

Evidence: Kant red-team review plus `git status --short --branch`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Before implementation, intentionally add/commit lane artifacts or
keep them explicitly local-draft with no-handoff warning; refresh branch and
Graphite state before mutation.

Next Packet consequence: Handoff cannot rely on untracked artifacts.

### F-RT-06: Thin-Router Drift Could Reappear Through Overgrown Helpers

Finding: Red-team found the plan constrained router ownership but not overgrown
local helpers.

Evidence: Kant red-team review of plan and current search router.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.8`

Repair demand: Keep helpers limited to per-session facet extraction,
normalization, and pure predicates; ensure router tests make candidate loading,
composition order, result limiting, and facet attachment visibly router-owned.

Next Packet consequence: Review final implementation for hidden orchestration
helpers, not only CLI/downstream leakage.

## Outcome Record

Objective outcome: `achieved`.

Residual objective gaps:

- Downstream duplicate removal/sunset remains out of scope for this lane and
  should be handled only after upstream integration sequencing allows it.

Implementation summary:

- Added service-owned session facet DTOs, filters, candidate-limit constants,
  and `search.facets` contract under `services/session-intelligence`.
- Added mechanical facet extraction helper for XML-ish tags, directives, tool
  calls, top-level row types, and Codex payload types.
- Kept facet search orchestration in `search/router.ts`: candidate loading,
  facet computation, facet filtering, metadata/content composition, returned
  hit limiting, and optional facet attachment are router-owned.
- Extended Codex transcript normalization for `custom_tool_call` and
  `custom_tool_call_output`.
- Wired CLI flags for `--has-tag`, `--has-directive`, `--has-tool`,
  `--has-payload-type`, `--has-top-type`, `--candidate-limit`, and
  `--print-facets`.
- Added facet-only CLI search path and README updates.
- Added external command-channel proof in `apps/cli/test/plugins-install-all.test.ts`
  for command help/discovery and `rawr sessions search --has-tag ... --json`.

Decisions:

- `candidateLimit` is service-owned: default `250`, max `50_000`, validated as
  a bounded integer at the service contract boundary.
- Content search keeps `maxMatches` as returned hit cap. When facet filters are
  present, `candidateLimit` is the scan bound.
- Text marker facets exclude hidden scaffolding tags:
  `environment_context`, `permissions_instructions`, and `user_instructions`.
  Structured top-level and payload type facets still record row categories.
- Downstream `RAWR HQ` files were read as evidence only and not mutated.

Evidence:

- Baseline service test passed before implementation.
- Baseline plugin-session-tools test passed before implementation.
- Service/API mapper, downstream parity mapper, and service package exemplar
  mapper outputs assimilated.
- Opening mechanics initial and follow-up reviews recorded and accepted.
- Plan review and red-team review recorded and accepted.
- `bunx nx run @rawr/session-intelligence:test`: passed, 2 files / 15 tests.
- `bunx nx run @rawr/plugin-session-tools:test`: passed, 1 file / 12 tests.
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`:
  passed.
- `bunx nx run-many -t build,structural --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`:
  passed, including `sync`, `verify-session-intelligence-structural`, and
  `verify-projection-boundary-invocation` where applicable.
- `bunx vitest run --project cli apps/cli/test/plugins-install-all.test.ts --testNamePattern='loads session-tools'`:
  passed, proving linked oclif plugin command help/discovery and facet-only
  JSON invocation.
- Final proof reviewer found no blocking issues and independently reran:
  `git diff --check`, service tests, plugin-session-tools tests, the
  typecheck run-many gate, and full `apps/cli/test/plugins-install-all.test.ts`.

Verification:
Opening mechanics has no remaining P1. Remaining P2 opening findings were
accepted and repaired. Plan review and red-team findings were accepted and
repaired before implementation. Implementation gates pass. Final proof review
has no blocking findings. Closure commit and final repo/Graphite status check
are mechanical post-record actions.

## Deferred Inventory

No deferred items yet.

## Review Result

Leaf loops:

- Opening mechanics: initial review failed; accepted findings repaired.
- Opening mechanics follow-up: warn, no P1; accepted P2 repairs applied.
- Plan review: complete; findings accepted and plan/record repaired.
- Red-team review: complete; findings accepted and plan/record repaired.
- Final proof review: complete; no blocking findings.

Composed loops: plan review + red-team findings accepted and repaired; no
unwaived P1/P2 remains in the plan artifact.

Waivers: none.

Invalidations: none.

Repair demands:

- Service-owned `candidateLimit` default/max and tests.
- Build and structural gates.
- Facet-only output DTO and ordering tests.
- Content `maxMatches` / `candidateLimit` separation.
- Facet source-policy tests for hidden scaffolding.
- Scoped external-plugin-channel proof.
- Artifact durability before handoff/implementation.

Closure steward result: complete; no additional blocking findings.

## Final Output

Artifacts:

- `docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/IMPLEMENTATION_PLAN.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/REVIEW_FINDINGS.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/NEXT_PACKET.md`

Verification run:

- `bunx nx run @rawr/session-intelligence:test`: passed.
- `bunx nx run @rawr/plugin-session-tools:test`: passed.
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`:
  passed.
- `bunx nx run-many -t build,structural --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`:
  passed.
- `bunx vitest run --project cli apps/cli/test/plugins-install-all.test.ts --testNamePattern='loads session-tools'`:
  passed.

Repo/Graphite state:
Expected clean after closure commit; final `git status --short --branch` and
`gt ls` are recorded in the assistant closeout.

## Next Packet

See
`docs/projects/workstream-b-preparation/lanes/session-tools/NEXT_PACKET.md`.
