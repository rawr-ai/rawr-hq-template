# Phase 1 Milestone -> Local Issue Docs Workflow

This document is the execution scaffold for finishing the current Phase 1 milestone and converting it into finalized **local** Linear-style issue docs.

This stage is local-only.

- We are **not** creating actual issues in Linear.
- We are **not** using `dev-linear` as part of this stage.
- The target outcome is:
  - one hardened milestone doc
  - one coherent local issue-doc packet
  - prework prompts resolved so the packet is ready for execution handoff

## Current State

Completed already:

- Grounding note exists:
  - `docs/projects/rawr-final-architecture-migration/.context/grounding.md`
- Phase 1 milestone draft exists:
  - `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`
- Local templates/process docs now exist in-repo:
  - `docs/process/LINEAR.md`
  - `docs/projects/DOCS.md`
  - `docs/_templates/issue.md`
  - `docs/_templates/milestone.md`

Operational note:

- All previously spawned review agents have been closed.

## Exact Workflow Sequence

The correct local-only sequence is:

1. `dev-harden-milestone`
2. `dev-milestone-to-issues`
3. `dev-prework-sweep`

Exact prompt files:

- `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-milestone-to-issues.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-prework-sweep.md`

Why this order:

- `dev-harden-milestone` expands the milestone into something issue-ready without changing scope or hierarchy.
- `dev-milestone-to-issues` converts that hardened milestone into local issue docs. The prompt explicitly says this step does **not** create actual Linear issues.
- `dev-prework-sweep` runs only after local issue docs exist. Its own prompt explicitly positions it after milestone breakout, not before.

Excluded on purpose for this stage:

- `dev-linear`
- `dev-review-linear`
- any workflow that creates or syncs real Linear issues

## Working File Layout Decision

Use exactly this layout:

- milestone stays at:
  - `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`
- local issue docs go in:
  - `docs/projects/rawr-final-architecture-migration/issues/`

This is the only path for this stage.

Reason:

- `dev-milestone-to-issues` and `dev-prework-sweep` both assume the standard project-level `issues/` location.
- Keeping the standard layout avoids workflow drift and avoids introducing hidden branching into the execution plan.

## Materials Every Workflow Agent Must Read in Full

Before doing any substantive work, every workflow-specific agent must fully read:

- `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
- `docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`

Recommended additional grounding:

- `docs/projects/rawr-final-architecture-migration/.context/grounding.md`
- `docs/process/LINEAR.md`
- `docs/projects/DOCS.md`

## Mandatory First Move for Every Workflow Agent

The first message sent to each workflow agent must require two things before any edits:

1. Introspect the exact workflow prompt they are about to execute.
2. Introspect the skills relevant to that workflow and explicitly ground into them.

This is a hard requirement. No agent should start by “doing the work” before grounding itself in the prompt and skill contract.

## Agent Team Plan

One agent per workflow.

### Agent 1: Milestone Hardener

**Workflow**

- `dev-harden-milestone`

**Primary responsibility**

- Expand and harden `M1-authority-collapse.md` without changing its scope, objective, or hierarchy.

**Owned outputs**

- the hardened milestone doc
- embedded issue-level acceptance, scope boundaries, verification guidance, implementation guidance, and explicit prework prompts where needed

**Skills to ground into first**

- `introspect`
- `linear-method`
- `information-design`
- `linear-issue-quality`
- `git-worktrees`

**Non-negotiable constraints**

- preserve P1 as the forward-locked decision set
- do not silently resolve ambiguity by changing architecture
- add prework prompts instead of guessing when repo-specific facts are still missing

### Agent 2: Milestone Breakout Steward

**Workflow**

- `dev-milestone-to-issues`

**Primary responsibility**

- convert the hardened milestone into local issue docs only
- keep the milestone as the index and move implementation detail into issue docs

**Owned outputs**

- project-local issue docs
- updated milestone index links and structure
- consistent dependency/front-matter relationships across the local issue set

**Skills to ground into first**

- `introspect`
- `linear-method`
- `linear-issue-quality`
- `information-design`
- `git-worktrees`

**Non-negotiable constraints**

- do not create actual Linear issues
- preserve milestone sequencing and dependency integrity
- keep the local issue tree stable enough for prework sweep and later handoff

### Agent 3: Prework Sweep Steward

**Workflow**

- `dev-prework-sweep`

**Primary responsibility**

- resolve every embedded prework prompt in the local issue docs
- append findings
- tighten issue ambiguity where evidence supports it
- remove prompts only after the findings are written down

**Owned outputs**

- issue docs with resolved prework findings
- updated acceptance/testing/dependency text where justified
- zero remaining prework prompts in scope

**Skills to ground into first**

- `introspect`
- `git-worktrees`
- `deep-search`
- `decision-logging`
- `linear-method`
- `linear-issue-quality`

**Non-negotiable constraints**

- resolve with evidence, not speculation
- if a real human decision is required, surface it explicitly instead of faking certainty
- keep the issue packet tighter and more deterministic after every prompt resolution

## Orchestrator Responsibilities

The main agent remains accountable for overall quality. Workflow agents can do direct edits, but the orchestrator must ensure:

- forward-locking behavior across the whole packet
- no milestone drift while hardening
- no dependency or sequencing regressions during issue breakout
- no ambiguity or hidden branch points left behind after prework sweep
- no inconsistencies between milestone, issue docs, and grounding docs

The orchestrator should review between workflow boundaries, not just at the very end.

## Recommended Handoffs Between Agents

Handoff 1:

- Agent 1 hands Agent 2:
  - hardened milestone path
  - explicit issue tree
  - any open questions that were intentionally preserved as prework prompts

Handoff 2:

- Agent 2 hands Agent 3:
  - issue-doc directory
  - parent/child dependency map
  - list of all files containing prework prompts

Handoff 3:

- Agent 3 hands back to orchestrator:
  - zero-prompt confirmation
  - explicit summary of resolved decisions
  - any rare remaining user-decision points

## Review Backstops to Run After the Workflow Chain

These happen after the three workflow agents finish.

Backstop angle 1: semantic fidelity

- verify nothing drifted away from:
  - the canonical architecture spec
  - the dedicated Phase 1 plan
  - the hardened milestone objective

Backstop angle 2: issue quality and execution readiness

- verify the local issue packet is:
  - decision-complete
  - unambiguous
  - sequenced correctly
  - executable by handoff

Backstop angle 3: packet integrity

- verify:
  - milestone/index links are correct
  - parent/child issue relationships are consistent
  - blockers are coherent
  - no stale prework prompts or contradictory guidance remain

## Agent Brief Template

Use this pattern as the first instruction to each workflow agent:

1. Introspect and read the exact workflow prompt you are about to execute.
2. Introspect and read the relevant skills for that workflow before doing anything else.
3. Fully read these three docs end-to-end:
   - `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
   - `docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md`
   - `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`
4. Read `docs/projects/rawr-final-architecture-migration/.context/grounding.md`.
5. Only then produce your plan for the workflow you own.

## Immediate Next Step

When execution begins, the first workflow to run should be:

- `dev-harden-milestone` against:
  - `docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md`

Nothing downstream should start until that hardened milestone is reviewed and accepted as the execution authority for the local issue-doc breakout.
