# Runtime Realization Lab Workstreams

This directory is informative. It preserves completed burn-down session packets
for future agents without replacing the canonical runtime spec, proof manifest,
diagnostic, or runbook.

## Purpose

Use one workstream report per meaningful lab burn-down session. A report should
let a future agent recover:

- the opening packet and output contract;
- the workflow and review lenses used;
- the decision-grade findings;
- the deferred inventory and re-entry triggers;
- the review result and proof-status deltas;
- the output that becomes the useful input to the next workstream.

## Authority Boundary

These reports are continuity artifacts, not architecture authority.

Runtime and proof authority still flows through:

1. the canonical runtime spec pinned in `../proof-manifest.json`;
2. `../../RUNBOOK.md`;
3. `../design-guardrails.md`;
4. `../proof-manifest.json`;
5. `../runtime-spine-verification-diagnostic.md`;
6. `../focus-log.md`.

Coordination authority for lab workstream ordering and re-entry lives in
`../runtime-realization-research-program.md`. It may sequence the work, name the
next eligible workstream, and preserve the negative-space ledger. It must not
override the canonical spec, proof manifest, diagnostic, or earned proof
strength.

When a report conflicts with the runtime/proof authority files, the authority
files win. Update the authority file rather than treating the report as the
source of truth. When the research program conflicts with those authority files,
use it only as a stale coordination input until it is reconciled.

## Naming

Use:

```text
YYYY-MM-DD-<workstream-slug>.md
```

Examples:

- `2026-04-30-middle-spine-verification.md`
- `2026-05-01-provider-provisioning-lowering.md`

## Required Snapshot Sections

Each workstream report should contain:

- `Frame`: objective, branch/PR, containment boundary, non-goals.
- `Opening Packet`: authority files, included evidence files, excluded or stale
  inputs.
- `Prior Workstream Assimilation`: previous final output, deferred inventory,
  repair demands, and next packet consumed or explicitly left fenced.
- `Output Contract`: required outputs, optional outputs, proof strength,
  non-goals, and expected gates.
- `Acceptance / Closure Criteria`: what must be true for closure.
- `Workflow`: commands run, review axes, agents or lenses used.
- `Findings`: decision-grade findings with source pointers and confidence.
- `Report`: synthesis and proof-status deltas.
- `Deferred Inventory`: every deferred, fenced, waived, or out-of-scope item.
- `Review Result`: leaf review loops, parent review loops, waivers, and
  invalidations.
- `Process Tension Notes`: coordination friction, skipped-loop risks, and
  proposed workflow/template repairs for the next workstream.
- `Final Output`: PR/report/artifact/gates with exact paths.
- `Next Workstream Packet`: one next action, risks, first files/commands, and
  deferred items to consume.

## Rules

- One file per completed workstream. Do not append every session to one long
  log.
- Link to manifest, diagnostic, and focus-log entries instead of duplicating
  their full tables.
- Summarize deltas only; avoid copying the entire proof manifest into a report.
- Do not use this directory as a live kanban, status tracker, or source of
  canonical requirements.
- Record selected skill lenses only when they materially shape the workstream.
  Skills are a menu for grounding and review, not a mandatory checklist.
- Record phase teams when agents are used. Each phase may use a different team,
  agents may rotate inside a phase, and no more than 6 agents should be active
  concurrently for a single workstream phase.
- For substantial TypeScript or lab-runtime edits, record the semantic
  JSDoc/comment trailing pass in `Workflow` and `Review Result`: files reviewed,
  comments added or intentionally skipped, and any repair demand. This is a
  review lane and migration/documentation substrate, not proof authority.
  Comment presence cannot promote manifest or diagnostic status without a
  falsifiable oracle and named gate.
- The final output of a workstream should be the useful input packet for the
  next workstream.
- No deferred item may exist only in a workstream report. Each deferred item
  must also have an authority home in the manifest, diagnostic, todo fixture,
  research program, spec patch proposal, migration-only note, or out-of-scope
  note.
- Each deferred item must name: status, why deferred, authority home, unblock
  condition, re-entry trigger, next eligible workstream, and whether it is
  lab/spec/migration-only/out-of-scope.
- A waiver is not a pass. It must name accepted risk, authority, rationale,
  scope, and follow-up.
- Every closed report should include a workstream lifecycle/process review. If
  the process itself caused friction or repeated failure, record a process
  tension note and route any structural repair into the next workstream or this
  workflow/template set.
