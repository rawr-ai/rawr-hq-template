# Workstream Workflow Extraction Spike

Status: `closed`.
Branch: `codex/runtime-lab-plane-reorg`.
PR: `none at extraction time`.
Commit: `see git history for this file`.
DRA: `Codex`.
Dates: `2026-05-01 -> 2026-05-01`.

This report is informative continuity for the extraction spike. The canonical
output is `docs/process/WORKSTREAMS.md`; this spike is not process authority.

## Frame

Objective:

Extract the normative, canonical, and idiomatic mechanics of running a
workstream into a standalone workflow and a small Codex companion design.

Containment boundary:

This spike covers coordination mechanics only. It does not promote
runtime-realization proof vocabulary, runtime lab phase content, or
subject-specific review lanes into generic process law.

Non-goals:

- Building a full Codex plugin.
- Installing project-scoped agents, hooks, or skills.
- Rewriting runtime-realization lab reports.
- Canonicalizing generic "reviewer" or "explorer" roles.

Done means:

The repository has a canonical workstream workflow, a reusable report template,
and a recorded extraction report with validation against the template, session,
and Codex capability surface.

## Opening Packet

Opening input:

- User request to implement the Workstream Workflow Extraction Plan.

Authority inputs:

- `docs/DOCS.md`
- `docs/process/RUNBOOKS.md`
- `tools/runtime-realization-type-env/guidance/template-workstream-report.md`

Coordination inputs:

- Codex session `019de122-9b5a-7f83-86e7-3ae87cab3954`
- Prior plan produced from the extraction pass

Evidence inputs:

- Template sections for frame, opening packet, prior assimilation, output
  contract, stop conditions, closure criteria, workflow, findings, deferred
  inventory, review result, final output, and next packet.
- Session evidence around DRA framing, agent fleets, accepted/rejected review
  findings, drift repair, stale-agent cleanup, gates, Graphite status, and
  compaction-safe handoff.
- Official Codex docs for subagents, hooks, skills, automations, plugins,
  `AGENTS.md`, MCP, and the Codex SDK.

Excluded or stale inputs:

- Runtime-realization proof terminology: subject-specific.
- Runtime lab phase names and gates: useful as examples, not generic law.
- Generic reviewer/explorer role labels: too broad to be canonical.

Control inputs:

- The checkout already contained a large runtime-lab reorg. This spike was kept
  to `docs/process`, `docs/_templates`, and `docs/projects/spikes`.
- Graphite owns the repository workflow.

Selected skill lenses:

- `extract-workflow`: converts session/template evidence into reusable workflow
  primitives and artifacts.

Capability surfaces:

- Agents: designed as companion roles, not installed in this spike.
- Hooks: designed as deterministic health checks, not installed in this spike.
- Skills: designed as future reusable workflow skills, not installed in this
  spike.
- Automations: deferred until manual workflow stability is proven.
- MCP/SDK: not needed for v1.

## Prior Workstream Assimilation

Previous report consumed:

- The runtime-realization workstream template and the session-derived plan.

Prior final output accepted or rejected:

- Accepted: DRA-owned synthesis, bounded fleets, review loops, closure gates,
  deferred inventory, and next-packet behavior.
- Rejected as generic canon: runtime-specific proof lanes and exact lab command
  lists.

Deferred items consumed:

- Need for a standalone workflow and companion set.

Deferred items explicitly left fenced:

- Actual Codex plugin packaging.
- Installing `.codex/agents`, hooks, or skills.
- External orchestration via MCP or SDK.

Repair demands consumed:

- Keep high-variance subject matter out of the canonical layer.

Next packet changes:

- Future implementation can use `docs/process/WORKSTREAMS.md` as the first
  read instead of replaying the runtime-realization session.

Invalidations from prior assumptions:

- None.

## Output Contract

Required outputs:

- `docs/process/WORKSTREAMS.md`
- `docs/_templates/WORKSTREAM_REPORT.md`
- `docs/process/RUNBOOKS.md` index update
- this spike report

Optional outputs:

- None.

Claim strength / evidence class:

- Process extraction. The workflow is canonical for this repo's workstream
  mechanics, not proof of any subject-domain architecture.

Surfaces touched:

- Process docs, templates, spike docs.

Downstream impact:

- Future workstreams have a reusable launch, review, closure, and next-packet
  structure.

Expected gates:

- `git diff --check -- docs/process/WORKSTREAMS.md docs/_templates/WORKSTREAM_REPORT.md docs/_templates/README.md docs/projects/spikes/SPIKE_WORKSTREAM_WORKFLOW_EXTRACTION.md docs/process/RUNBOOKS.md`
- link/path sanity checks for the new docs
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- Stop if implementation requires installing project Codex config while
  runtime-lab work is already dirty.
- Stop if a companion role requires subject-specific judgment to be useful.

## Workflow

Preflight:

- Checked branch, Graphite status, dirty state, doc architecture, existing
  templates, source workstream template, and spike directory.

Investigation lanes:

- Template primitive extraction.
- Session mechanics extraction.
- Codex capability fit.
- Documentation placement.

Phase teams:

- Extraction: host-only, because the deliverable was scoped docs and the prior
  session evidence already included multi-agent review results.
- Review: host-only, with checklist review against the requested acceptance
  criteria.

Agent scratch documents:

- Not used. The spike report itself records the extraction.

Design lock:

- Canonicalize coordination mechanics only.
- Keep companion set as a design contract, not installed config.
- Put lasting workflow authority in `docs/process/WORKSTREAMS.md`.
- Put the reusable scaffold in `docs/_templates/WORKSTREAM_REPORT.md`.

Implementation summary:

- Added the canonical workflow.
- Added the reusable report template.
- Added this spike report.
- Updated the runbook index and template README.

Comment / documentation trailing pass:

- Passed. No code comments were relevant.

Verification:

- See final output.

Review loops:

- Workflow completeness.
- Canonicality/noncanonicality.
- Codex capability fit.
- Operational unattended-zone expansion.
- Repo documentation placement.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Opening packet, prior assimilation, output contract, deferred inventory, review result, and next packet are stable workflow primitives. | Template structure and repeated session use. | Canonicalized in `docs/process/WORKSTREAMS.md` and template. | High |
| DRA ownership is essential. | Session repeatedly used agents for lanes while DRA synthesized and repaired. | Canonicalized. | High |
| Generic reviewer/explorer roles are too vague. | User constraint and session evidence favor named review lanes. | Excluded from companion set. | High |
| Hooks are useful only for mechanical health checks. | Codex hook docs expose lifecycle scripts; judgment belongs in DRA/skills. | Canonicalized as hook boundary. | High |
| Automations are useful later, not v1. | Codex automations can run recurring tasks, but unattended write risk is real. | Deferred. | Medium |

## Report

Promotions or claims earned:

- Workstream mechanics promoted into canonical process guidance.

Claims explicitly not earned:

- No claim that runtime-realization proof vocabulary is generic.
- No claim that the companion roles are installed Codex agents.
- No claim that hooks or automations are active.

Status or diagnostic changes:

- Runbook index now points to the workflow.

Spec or process feedback:

- Workstream reports should remain continuity artifacts, while process law lives
  in `docs/process/WORKSTREAMS.md`.

Theater removals or downgrades:

- Generic role names were omitted.
- MCP/SDK orchestration was excluded from v1.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Install actual Codex custom agents | `todo` | Needs agreement on runtime config distribution. | `docs/process/WORKSTREAMS.md` | User asks to build the companion set. | Repeated manual use validates role shape. | Codex workstream companion implementation | Codex agents |
| Implement hooks | `todo` | Hooks should stay mechanical and need a trusted `.codex` config decision. | `docs/process/WORKSTREAMS.md` | Hook scripts and config placement are approved. | Report-health drift recurs. | Workstream health hook implementation | Hooks |
| Package as plugin | `out-of-scope` | User explicitly did not want a full plugin now. | `docs/process/WORKSTREAMS.md` | Bundle is stable across multiple workstreams. | Cross-repo installation becomes necessary. | Workstream plugin packaging | Plugins |
| Recurring automations | `todo` | Manual workflow must stabilize first. | `docs/process/WORKSTREAMS.md` | Stable prompt and safe execution mode exist. | User asks for scheduled health checks. | Workstream automation spike | Automations |

## Review Result

Leaf loops:

- Mechanical: new paths are under active doc surfaces and avoid runtime-lab
  dirty files.
- Claim honesty: companion set is designed, not installed.
- Type/test: not applicable, docs-only.
- Documentation: workflow, template, index, and spike record are aligned.
- Subject-specific: runtime vocabulary remains fenced.
- Report: this report records evidence, dispositions, deferrals, and next
  packet.

Parent loops:

- Architecture / authority: lasting process authority lives in `docs/process`.
- Migration / downstream impact: no migration claim.
- API / developer experience: no API change.
- Workstream lifecycle: closure criteria and next packet are explicit.
- Adversarial evidence honesty: excluded categories are recorded.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| No installed agents/hooks/skills in this spike | Companion set remains design-only | User scope | The user asked for extraction, not a full plugin/config install | This spike only | Implement companion set later if requested |

Invalidations:

- None.

Repair demands:

- None.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Workstreams benefit from hooks, but hooks can overreach into judgment | Bad hooks could block valid DRA decisions | Keep hooks mechanical and put judgment in skills/agents | Companion implementation workstream |

## Final Output

Artifacts:

- `docs/process/WORKSTREAMS.md`
- `docs/_templates/WORKSTREAM_REPORT.md`
- `docs/projects/spikes/SPIKE_WORKSTREAM_WORKFLOW_EXTRACTION.md`
- `docs/process/RUNBOOKS.md`
- `docs/_templates/README.md`

Verification run:

- `test -f` for all expected artifacts: passed.
- `git diff --check -- docs/process/WORKSTREAMS.md docs/_templates/WORKSTREAM_REPORT.md docs/_templates/README.md docs/projects/spikes/SPIKE_WORKSTREAM_WORKFLOW_EXTRACTION.md docs/process/RUNBOOKS.md`: passed.
- Scoped `rg` sanity check for workflow, template, and companion names: passed.
- `git status --short --branch -- <scoped-docs>`: showed only the intended docs.

Repo/Graphite state:

- Branch: `codex/runtime-lab-plane-reorg`.
- Graphite owns the repository workflow.
- The runtime-lab reorg was already dirty before this extraction workstream and
  was left untouched.

## Next Workstream Packet

Recommended next workstream:

Codex workstream companion implementation.

Why this is next:

The workflow is now documented. The next step, if needed, is turning the
designed roles, skills, and hooks into actual Codex configuration/artifacts.

Required first reads:

- `docs/process/WORKSTREAMS.md`
- `docs/_templates/WORKSTREAM_REPORT.md`
- official Codex docs for subagents, hooks, skills, and plugins

First commands:

- `git status --short --branch`
- `gt status --short`
- inspect `.codex/` and user skill/agent locations before installing anything

Deferred items to consume:

- Custom agent install.
- Hook scripts/config.
- Skill authoring.
- Plugin packaging.
