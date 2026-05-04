# Runtime Workstream Record Overlay

Use this overlay with the Workstream Plugin Pack record asset:

`tools/workstream-plugin-pack/skills/workstream-runner/assets/workstream-record.md`

This file is only Runtime Realization Lab fill guidance. It is not a standalone
schema, record template, program model, or generic workstream authority.

## Runtime-Specific Authority Inputs

Fill the pack record's authority fields with only the inputs that materially
decide or verify the runtime workstream. Use this runtime authority order when
sources conflict:

1. Canonical runtime spec pinned by
   `tools/runtime-realization-type-env/evidence/proof-manifest.json`.
2. `tools/runtime-realization-type-env/RUNBOOK.md`.
3. `tools/runtime-realization-type-env/AGENTS.md`.
4. `tools/runtime-realization-type-env/guidance/guardrails-design.md`.
5. `tools/runtime-realization-type-env/guidance/guardrails-lab-plane-topology.md`.
6. `tools/runtime-realization-type-env/evidence/proof-manifest.json`.
7. `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`.
8. `tools/runtime-realization-type-env/evidence/current-lab-state.md`.
9. Focused subsystem/vendor evidence maps and source, test, fixture, or
   scenario files touched by the workstream.
10. containing-program or phase context when applicable: the relevant
    `tools/runtime-realization-type-env/phases/<phase>/` dossier, handoff,
    prior record, or workstream-produced reference. This context is input only.

Treat migration plans, archived docs, transcripts, scratch notes, agent
summaries, and old phase/program artifacts as provenance unless a current
authority source accepts them.

## Runtime Proof And Evidence Classes

Use the proof categories defined by `guidance/guardrails-design.md`:

- `proof`: a TypeScript or authoring-shape rule enforced by a named regression
  gate.
- `vendor-proof`: installed vendor behavior or shape the lab relies on, without
  claiming RAWR runtime integration.
- `simulation-proof`: contained RAWR-owned Oracle or compatibility simulation
  behavior.
- `xfail`: known unresolved architecture or design gap with a test oracle or
  stop condition.
- `todo`: planning inventory not yet compiled or executed.
- `out-of-scope`: intentionally outside the current lab claim, proof lane, or
  phase.

Lab-Production Proof requires a Reference Runtime gate plus required
vendor-live/product gates. Parent-Repo Migration requires a separate accepted
migration slice. Do not promote vendor, Oracle, or simulation evidence beyond
its earned ceiling.

## Expected Gates

Record exact commands and results in the workstream record. Choose the focused
target that matches the workstream before running composed gates.

- `bunx nx show project runtime-realization-type-env --json`.
- `bunx nx run runtime-realization-type-env:<focused-target>`.
- `bunx nx run runtime-realization-type-env:structural`.
- `bunx nx run runtime-realization-type-env:report`.
- `bunx nx run runtime-realization-type-env:gate`.
- `bun run runtime-realization:type-env`.
- `git diff --check`.
- `git status --short --branch`.
- `gt status --short`.

If a gate is skipped, record why, what risk remains, and which future
workstream or owner can rerun it.

## Fill Guidance

- Copy the generic record asset from the Workstream Plugin Pack.
- Put runtime-specific material in existing generic fields instead of adding
  runtime-only schema sections.
- State claim strength with the runtime proof/evidence classes above.
- In downstream impact fields, distinguish Lab work, Lab-Production Proof, and
  Parent-Repo Migration.
- Do not duplicate proof manifest or diagnostic tables. Link to them and update
  the source artifact when status changes.
- Every deferred runtime item needs an authority home, unblock condition,
  re-entry trigger, and next eligible workstream. A record cannot be the only
  home for deferred work.
- Keep scratch notes, transcripts, old phase/program artifacts, and agent
  reports fenced as non-authority unless explicitly accepted into a durable
  artifact.
