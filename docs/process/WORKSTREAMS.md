# Workstreams

This document is **canonical** and **normative** for running workstreams in
`RAWR HQ-Template`.

A workstream is a coordination object for bounded work. It is not a live kanban
board, not architecture authority, and not a substitute for the directly
responsible agent's judgment. Use it when a task needs an explicit frame,
authority order, staged execution, review loops, evidence handling, closure
criteria, and a usable next packet.

## Core Model

- The DRA owns synthesis, scope, proof or evidence claims, final quality, repo
  state, and the handoff. Agents, hooks, and skills reduce mechanical process
  load; they do not replace DRA judgment.
- A workstream report records a closed or abandoned snapshot. Active drafts may
  exist on an implementation branch, but committed reports should not be used as
  live kanban.
- A workstream MUST distinguish authority inputs, coordination inputs, evidence
  inputs, stale or excluded inputs, and control inputs.
- A workstream MUST make its output contract explicit before implementation:
  required outputs, optional outputs, touched surfaces, claim strength, expected
  gates, and stop conditions.
- A workstream MUST close with recorded review loops, verification, repo state,
  deferred inventory, and a next packet usable by a zero-context agent.

## What To Canonicalize

Canonical workstream mechanics:

- opening packet shape and authority order;
- prior-workstream assimilation and invalidation tracking;
- DRA-owned design lock before implementation;
- phase-local teams or host-only rationale;
- bounded scratch policy and final disposition;
- accepted/rejected findings with evidence;
- deferred inventory with authority home, unblock condition, and re-entry
  trigger;
- focused and composed gates;
- repo and Graphite state recording;
- next workstream packet.

Do not canonicalize high-variance subject matter:

- domain-specific proof lanes;
- runtime, product, vendor, or migration terminology;
- exact test commands except as parameters;
- exact phase names beyond launch, planning, implementation, review, and
  closure;
- generic "reviewer" or "explorer" roles without a workstream-specific
  responsibility.

## Just-In-Time Workflow

### 1. Launch

Create or identify the workstream report draft from
`docs/_templates/WORKSTREAM_REPORT.md`.

Before changing files, the DRA MUST:

- check branch, worktree, stack, and dirty state;
- identify the repo workflow, usually Graphite in this repository;
- name the objective, containment boundary, non-goals, and done condition;
- list authority, coordination, evidence, stale/excluded, and control inputs;
- select only skills that materially apply;
- define stop conditions that require user escalation.

User escalation is reserved for decisions that change architecture, public API
law, product or vendor policy, ownership topology, migration sequence, or other
scope-defining constraints. Routine implementation details and honestly fenced
residuals stay DRA-owned.

### 2. Plan

The DRA MUST run a spike or planning pass before broad implementation when the
workstream crosses multiple surfaces, has proof or evidence implications, or
needs multiple agents.

The planning pass MUST produce:

- output contract;
- included surfaces and explicit non-goals;
- expected gates;
- review lanes;
- phase/team plan or host-only rationale;
- deferral policy;
- scratch policy;
- design lock criteria.

Agent lanes SHOULD be non-overlapping and named for the workstream need, such
as "opening packet health", "proof ledger audit", or "closure steward". Avoid
generic lane names that do not encode the responsibility.

### 3. Implement

During implementation, the DRA SHOULD keep the report current enough to preserve
continuity, but the report is not a task board.

The DRA MUST:

- keep edits scoped to the workstream;
- preserve unrelated dirty work;
- run focused gates before broad gates when the work touches code;
- record material findings and dispositions;
- move resolved scratch into final artifacts or delete/archive/quarantine it;
- re-open planning if evidence invalidates the design lock.

### 4. Review And Repair

Every workstream MUST run review loops proportional to risk. The default loops
are:

- Mechanical: paths, links, dates, stale terms, markdown, command accuracy, and
  repo hygiene.
- Claim honesty: every claim has an evidence class, gate, residual, or explicit
  non-claim.
- Architecture/semantics: authority order and ownership boundaries remain
  coherent.
- Risk/leverage: included work is still worth doing now; deferrals are real and
  have a home.
- Workstream lifecycle: report completeness, scratch disposition, review
  dispositions, and next packet quality.

Subject-specific loops MAY be added only when they answer a concrete risk. Do
not add agents for coverage theater.

### 5. Close

A workstream may close only when:

- required outputs are present;
- proof, evidence, or non-proof status is recorded where relevant;
- every deferred item has an authority home, unblock condition, and re-entry
  trigger;
- review loops and repair demands are recorded;
- focused and composed gates are recorded;
- repo and Graphite state are recorded;
- the next workstream packet is usable by a zero-context agent.

If the workstream cannot close, mark it abandoned, record why, and preserve the
next valid re-entry point.

## Companion Codex Set

These companions are canonical for the workstream approach, but installing them
as project Codex configuration is a separate implementation step.

### Agent Roles

`workstream-opening-steward`

- Validates the opening packet, authority order, stale/excluded inputs, prior
  report assimilation, selected skill lenses, and stop conditions.
- Should run before implementation, not at closure.

`workstream-proof-ledger-auditor`

- Checks claim categories, evidence homes, deferred inventory, waivers,
  promotion boundaries, and non-claims.
- Should not decide architecture or product policy.

`workstream-closure-steward`

- Checks report completeness, review-loop disposition, scratch cleanup, gates,
  repo/Graphite state, and the zero-context next packet.
- Should run after implementation repair and before final handoff.

### Skills

`$workstream-runner`

- Main reusable workflow skill for DRAs.
- Packages the phase model, decision points, escalation rules, review loops,
  closure criteria, and report template usage.

`$workstream-review-loops`

- Helper skill for designing non-generic review lanes and recording
  accepted/rejected findings.
- Use when a workstream needs multiple review axes or when prior work has drift
  risk.

### Hooks

Hooks must stay deterministic and mechanical:

- `SessionStart`: surface the workstream startup checklist when the current
  directory or prompt indicates a workstream path.
- `PostToolUse`: warn on mechanical report-health failures after edits, such as
  missing required headings, stale scratch references, or missing next-packet
  fields.
- `Stop`: warn when a workstream appears to end without recorded gates, repo
  state, review dispositions, or deferred inventory.

Hooks MUST NOT make judgment calls about architecture, proof promotion, product
policy, or scope. They may only surface missing mechanical evidence.

### Capability Boundaries

Codex agents, hooks, and skills are enough for v1.

- Custom agents are useful for the three named workstream roles.
- Skills are the right authoring format for the reusable workflow and review
  loop method.
- Hooks are useful for deterministic health checks.
- Plugins are the later distribution unit if this bundle should be installed
  across repositories.
- Automations are optional later work for recurring workstream health checks.
  They should be added only after the manual workflow is stable.
- MCP and the Codex SDK are not needed for v1 unless a future external
  orchestrator must launch or inspect workstreams programmatically.

## Artifact Placement

- Canonical workflow: `docs/process/WORKSTREAMS.md`.
- Reusable report scaffold: `docs/_templates/WORKSTREAM_REPORT.md`.
- Time-bound extraction or feasibility spikes: `docs/projects/spikes/`.
- Subject-specific workstream reports: the owning project or tool area.
- Historical reports: the owning `_archive/` directory.

## Source Evidence

This workflow was extracted from:

- `tools/runtime-realization-type-env/guidance/template-workstream-report.md`;
- Codex session `019de122-9b5a-7f83-86e7-3ae87cab3954`;
- official Codex docs for subagents, hooks, skills, automations, plugins,
  `AGENTS.md`, MCP, and the Codex SDK.
