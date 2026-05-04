# Runtime Realization Lab Workstreams

This directory is informative. It preserves completed burn-down session packets
for future agents without replacing the canonical runtime spec, proof manifest,
diagnostic, or runbook.

## Purpose

Use one workstream report per meaningful lab burn-down session. A report should
let a future agent recover:

- the frame and objective;
- the input packet and excluded stale inputs;
- the workflow and review lenses used;
- the decision-grade findings;
- the final report and proof-status deltas;
- the output that becomes the useful input to the next workstream.

## Authority Boundary

These reports are continuity artifacts, not architecture authority.

Authority still flows through:

1. the canonical runtime spec pinned in `../proof-manifest.json`;
2. `../../RUNBOOK.md`;
3. `../design-guardrails.md`;
4. `../proof-manifest.json`;
5. `../runtime-spine-verification-diagnostic.md`;
6. `../focus-log.md`.

When a report conflicts with those files, the authority files win. Update the
authority file rather than treating the report as the source of truth.

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
- `Input Packet`: authority files, included evidence files, excluded or stale
  inputs.
- `Workflow`: commands run, review axes, agents or lenses used.
- `Findings`: decision-grade findings with source pointers and confidence.
- `Report`: synthesis and proof-status deltas.
- `Final Output`: PR/report/artifact/gates with exact paths.
- `Continuity`: one next action, risks, and first files/commands for the next
  agent.

## Rules

- One file per completed workstream. Do not append every session to one long
  log.
- Link to manifest, diagnostic, and focus-log entries instead of duplicating
  their full tables.
- Summarize deltas only; avoid copying the entire proof manifest into a report.
- Do not use this directory as a live kanban, status tracker, or source of
  canonical requirements.
- The final output of a workstream should be the useful input packet for the
  next workstream.
