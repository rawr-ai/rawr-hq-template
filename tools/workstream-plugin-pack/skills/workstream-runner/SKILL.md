---
name: workstream-runner
description: Use when designing, setting up, planning, launching, running, reviewing, closing, or handing off a workstream. Trigger this for DRA-owned workstreams, agent waves, workstream records, proof boundaries, review loops, zero-context Next Packets, or workstream closure.
---

# Workstream Runner

Use this skill when you are the directly responsible agent for a bounded
workstream. A workstream is the execution primitive: one objective, one DRA,
one containment boundary, evidence-aware work, review/repair, closure, and a
handoff a future agent can resume from.

The workstream record is durable state and handoff context. It is not the
purpose of the workstream.

Mental model: the workstream owns continuity. Sessions, threads, worktrees,
tickets, workflows, and transcripts are projections or resources that can
support a workstream, but they are bad owners of continuity by themselves.

## Primitive Boundary

- A normal workstream is not a program, portfolio, task board, or sequence
  authority for later workstreams.
- Phases, waves, lanes, companion agents, and review loops are internal
  mechanics inside one workstream.
- Agents produce evidence and findings. The DRA owns synthesis, scope,
  canonicality, proof claims, repair disposition, repo state, and closure.
- Subject-specific material stays parameterized. Do not turn one domain's proof
  vocabulary into generic workstream law.

Open `references/primitive-boundary.md` when the workstream starts to blur with
program, phase, or runtime-specific language.

## Default Workflow

1. **Ground the workstream.** Check repo state (branch, working tree, recent
   history, related branches), repo conventions (any `docs/process/*`
   runbooks, the local stacking/submission tooling, project-specific
   AGENTS.md or CLAUDE.md, hook configuration, lint/CI conventions,
   permission boundaries the user has configured), authority inputs
   (canonical specs, governing docs, prior decisions), and any project-local
   quarantine or archive directories so they get fenced as stale-input
   rather than silently consumed.

   The categories are tool-agnostic. Check whether the repo uses a stacking
   convention, not whether a specific stacking tool is installed; check
   whether canonical specs exist, not which spec a particular project
   happens to use. Project-specific runbooks fill in the names.
2. **Frame the objective.** State the objective, containment boundary,
   non-goals, done condition, authority order, and stop conditions.
3. **Type the inputs.** Separate opening inputs, authority inputs,
   coordination inputs, evidence inputs, stale/excluded inputs, and control
   inputs before drawing conclusions.
4. **Create the record.** Copy `assets/minimal-workstream-record.md` for small
   workstreams or `assets/workstream-record.md` for complex workstreams. Do not
   invent a second schema.
5. **Plan the lanes.** Use host-only execution unless parallel lanes reduce real
   risk. Use `assets/agent-packet.md` and `assets/wave-packet.md` when
   delegation is useful.
6. **Run the work.** Update the record at phase changes, accepted findings,
   proof changes, gate results, waivers, deferrals, and closure.
7. **Review and repair.** Use `workstream-review-loops` for review lane design,
   finding disposition, waivers, and repair loops.
8. **Close or hand off.** Record final outputs, verification, repo/Graphite
   state, deferred inventory, review disposition, and a zero-context Next
   Packet.

## Reference Map

| Reference | Use when |
| --- | --- |
| `references/primitive-boundary.md` | Workstream/program/phase boundaries are at risk |
| `references/input-and-scratch-discipline.md` | Inputs, scratch, and process feedback need clear authority boundaries |
| `references/records-and-packets.md` | You need record, Agent Packet, Wave Packet, or Next Packet guidance |
| `references/steward-agents.md` | You need to decide whether to invoke companion stewards |
| `references/closure.md` | You are closing, abandoning, or handing off a workstream |

## Asset Map

| Asset | Use for |
| --- | --- |
| `assets/minimal-workstream-record.md` | Small workstream record scaffold |
| `assets/workstream-record.md` | Full scaffold for complex, multi-lane, review-heavy, or handoff-heavy workstreams |
| `assets/agent-packet.md` | Delegating one bounded lane |
| `assets/wave-packet.md` | Coordinating multiple lanes inside one phase |
| `assets/finding-record.md` | Recording review findings and dispositions |
| `assets/deferred-inventory.md` | Capturing unresolved work with trigger/context |
| `assets/next-packet.md` | Zero-context continuation handoff |

## Companion Stewards

Use these read-only stewards only when they reduce meta-process:

- `workstream-opening-steward`: opening packet, authority order, selected
  capabilities, design lock, and stop conditions.
- `workstream-proof-ledger-auditor`: claim strength, evidence homes, waivers,
  deferred inventory, and proof-boundary honesty.
- `workstream-closure-steward`: output contract, gates, review disposition,
  scratch cleanup, repo state, deferred inventory, and Next Packet.

The steward briefs live in `../../agents/`. They are source material for
provider-specific adapters.

## Quality Gates

Before final response or closure:

- Objective outcome is stated as achieved, partially achieved, or not achieved,
  with residual objective gaps named.
- The output contract is satisfied or explicitly revised.
- Review findings are accepted, rejected, invalidated, waived, or deferred.
- Gates are recorded with commands, results, and skipped-check rationale.
- Deferred items have context, owner/future DRA, authority home, and trigger.
- Repo and Graphite state are recorded when relevant.
- The Next Packet names what to inspect first and the exact next action.
