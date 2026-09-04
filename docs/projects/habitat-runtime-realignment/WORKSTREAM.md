# Habitat Runtime Realignment

Status: `prepared`; completion requires the admission condition below.
Branch: `agent-root-habitat-runtime-realignment`.
PR: [1007](https://github.com/rawr-ai/rawr-hq-template/pull/1007).
Commit: see Git history; baseline `374149800a067e527342e334ff6a3022fbd38cd7`.
DRA: Codex, current owner-delegated implementation steward.
Preparation date: 2026-09-04.

This record preserves the realignment work and its verification. It is not
runtime semantics or a replacement implementation queue. The resulting
canonical specifications and active OpenSpec retain those responsibilities.

## Workstream State

Current phase: repository admission of completed preparation. No runtime source
implementation is activated by this record alone.

Admission condition: this record's preparation is complete when its admission
PR is merged and the exact admitted main revision passes Repository Ratchet.
On an unpublished or unmerged branch, it remains ready for admission. Git/PR/CI
state supplies that fact without rewriting this record after every gate.

Selected skills: repository-local habitat-platform-authority and
workstream-runner; framing-design; team-design; perspective; system-design;
git-worktrees; Graphite. Specialist review uses review-code-quality.

Selected agents: three bounded readers for authority provenance, artifact impact
and runtime-contract decisions, followed by disjoint policy/canonical/accounting
execution and independent review. The DRA owns integration and disposition.
Existing repository hooks remain active; no standing watcher, new hook,
automation or persistent agent is introduced by this work.

## Frame

Objective: perform all fundamental realignment needed before restarting Habitat
runtime implementation, owning scope, definition, execution and preparation
through an explicit before/after frame diff.

Containment boundary: Habitat architecture/runtime authority, the active
runtime OpenSpec, associated policy constraints, review/verification and the
consumer handoff definition. Civ7 and Magic are acceptance inputs, not source
trees to migrate during this preparation.

Non-goals: execute the remaining live runtime, publish an SDK release, create
or maintain a Fluree distribution, restore rejected WIP, clean unrelated
branches, mutate hosted infrastructure, or automatically resume another task.

Done means:

- The frame diff states what is preserved, corrected, removed, separated and
  still unknown, with evidence and consequences rather than renamed labels.
- Current canonical authority and execution routing agree with that frame.
  Historical receipts remain evidence, not competing instructions.
- Every inherited work obligation has a disposition. Required capabilities
  are not silently dropped to make a smaller release look complete.
- Remaining implementation has coherent dependency order, testable acceptance,
  explicit known code/spec gaps and an unambiguous first action.
- Independent review, link/routing checks, applicable Nx checks and the
  repository's Graphite admission process have completed. Scope and evidence
  support preparation completion, not runtime completion.

## Opening Packet

Opening input: the owner's September 4 request to take over all fundamental
realignment before resuming implementation, following the recovery assessment.

Authority inputs:

- [Architecture](../../system/HABITAT_ARCHITECTURE.md).
- [Runtime realization](../../system/HABITAT_RUNTIME_REALIZATION.md).
- [Habitat authority](../../../.habitat/AUTHORITY.md) and
  [ontology](../../../.habitat/AUTHORITY-ONTOLOGY.md).
- [Active runtime change](../../../openspec/changes/realize-app-runtime-spine/authority-amendment.md).
- [Platform routing](../../../.agents/skills/habitat-platform-authority/SKILL.md).

Authority order: current owner intent within the repository boundary; canonical
semantic authority; named OpenSpec changes and sequence; pinned vendor
mechanics; implementation evidence; historical and consumer evidence.

Evidence inputs: local and remote main at the baseline above; published
foundation 0.5.15; fresh no-cache check/test graphs from the recovery assessment;
reproduced DAG traversal, nested-instance, profile-coverage and Unicode cases;
the latest relevant Civ7/Magic initiatives and prior task history. Fresh checks
on this branch must be recorded before closure.

Excluded/stale inputs: older external specs as current law; main's unchanged
SDK version as proof that runtime exports were released; rejected ledger stash
as accepted source; former task state as authorization to resume it.

Control inputs: the active owner request, this task's goal, repository Graphite
and required CI. No old task's autonomous goal controls this work.

Stop/escalation conditions: evidence that a selected minimum consumer truly
requires unrestricted ledger merge; a necessary change to the preserved
semantic core or repository ownership; a new external maintenance obligation;
or user changes that make the agreed authority irreconcilable. Ordinary helper
organization and implementation decisions are not escalation conditions.

## Output Contract

Required outputs: a durable frame diff; independently citable decisions;
reconciled canonical and OpenSpec authority; complete inherited-work accounting;
execution-ready acceptance and handoff; verification and review disposition.

Claim strength: preparation and semantic alignment, supported by source and
review. No claim that the final runtime is implemented or consumer-accepted.

Expected gates: focused artifact/routing validation; relevant owner checks for
any executable-policy changes; full `bun run check`; OpenSpec validation where
available; independent adversarial review; required remote repository check.

## Workflow

Preflight: baseline and remote checked; independent Graphite branch/worktree
created; primary worktree and existing WIP left unchanged; frozen dependencies
installed without lockfile changes.

Investigation lanes: method and semantic provenance; current-authority impact
and obligation accounting; runtime boundary decisions and acceptance cases.
Each reader returns evidence and recommendations, not independently enacted law.

Plan: establish the frame diff; reconcile affected authority and task ownership;
prepare executable-policy changes only where necessary for the new frame;
review the composed result; validate and admit through Graphite; close with the
exact next implementation action. No live runtime feature starts in this pass.

Design lock: the delegated DRA accepted decisions D-06 through D-16. Canonical,
policy and queue propagation plus independent composed review are complete.
Runtime source resumes only after preparation is admitted, starting with 0.1.

Scratch policy: temporary analysis stays in the initiating task's `work/`
directory. Only curated authority, decisions and verification enter this repo.

## Findings

Decisions are recorded in [decisions.md](decisions.md), with evidence and
disposition in [findings.md](findings.md). The frame preserves the
owner/lifecycle/native core while correcting named-instance recipes, process
coverage, complete executable references, duplicate normalization and private
trust promises. Ledger qualification no longer blocks unrelated runtime work.
All 115 inherited obligations are accounted in the active OpenSpec; source
corrections remain explicit tasks 0.1/0.2, not completed by this preparation.

## Outcome Record

Local outcome: `prepared and verified`. Repository completion follows the
explicit admission condition above, not a predicted remote result.

The frame diff, reconciled authority, executable policy successors, complete
obligation disposition and zero-context implementation packet are complete.
No unresolved material preparation finding remains. Known source defects are
explicit runtime tasks, not concealed by this status.

[Verification](verification.md) records actual commands, positive/negative
installed acceptance, source/snapshot parity and review repairs. The runtime
itself remains unfinished by design.

## Deferred Inventory

The current runtime has 49 unchecked acceptance obligations, beginning with
0.1/0.2. [Obligation disposition](../../../openspec/changes/realize-app-runtime-spine/obligation-disposition.md)
preserves all 115 inherited task IDs and additional spec-level capability
promises without converting deferrals to completed checkboxes.

[Deferred capabilities](../../../openspec/changes/realize-app-runtime-spine/deferred-capabilities.md)
assign D-1 ledger, D-2 inquiry, D-3 later Rawr transfers, and D-4 native
agent/desktop hosts to their actual reactivation/acceptance owners and triggers.
Agent/desktop authoring and web-local execution remain active runtime work.
Persisted observability and deployment tooling remain initiative outcomes in
the roadmap. No external fork, consumer migration or historical-source cleanup
is implied by any deferral.

## Review Result

Independent readiness review found two P2s: premature native-stop proof and
unassigned authoring faces. Both are repaired and independently rechecked.
Final bounded semantic review found no remaining material inconsistency across
the five corrected contracts, canonical documents, deltas and tasks. Its peer
review also repaired optional-absence wording and zero-ref source-policy handoff.
All dispositions are in [findings.md](findings.md); no preparation waiver is used.

Read-only closure review of the finalized committed packet found no additional
preparation blocker. It rechecked preservation, accounting, links, clean branch
state and the no-runtime-source-change boundary. Its only readiness warning is
the explicitly pending external admission gate; a minor exact-command/verifier
locator note was addressed in verification. Required remote checks and final
repository state remain real gates, not waived conditions.

## Final Output

- [Frame diff](FRAME.md) and [decisions](decisions.md).
- Clean architecture/runtime authority and current OpenSpec at their canonical
  paths, with intact quarantined predecessors and external history ledgers.
- Four selected immutable runtime policy successors, packed and verified in an
  installed consumer; all earlier definition bytes preserved.
- Current task/dependency queue, all-obligation accounting, durable deferred
  capabilities and preserved source/acceptance/held-worktree disposition.
- [Verification](verification.md), review findings and this next packet.

## Next Packet

First confirm the preparation admission condition from the PR and exact-main CI.
If unadmitted, finish Graphite admission rather than beginning runtime source.
After admission, read the frame/decisions, canonical architecture/runtime, and
active runtime change's design, tasks and execution queue. Historical snapshots
explain provenance; they do not override those current artifacts.

Exact next action: open an isolated Graphite implementation branch from accepted
main for **task 0.1**, the complete cold-pipeline correction. Trace definition,
derivation, compiler and terminal SDK consumers before editing. Replace the
contradictory source/tests and prove a real nonempty cold service/provider
handoff, named slot swaps/instances, equal/divergent diamonds, selected-process
coverage, ordered source policy even with zero refs, request/edge-scale DAG work
and lone-surrogate refusal. Run the relevant owner behavior/types/policy/build
and changed-boundary installed tests, then repository checks and admission.

Do not implement acquisition or live binding in 0.1. Follow with trusted
bootgraph simplification 0.2, then the actual live owner sequence. Private helper
decomposition within selected policy is implementation judgment, not another
design gate. Reopen the frame only for its stated falsifiers, not local defects.

Preserve the primary worktree's preexisting `.codex/config.toml`, held telemetry
worktree changes, rejected ledger stash and consumer repositories. Task-local
analysis remains in the initiating task's `work/`; bounded agents are finished,
with no standing watcher or automatic continuation created.
