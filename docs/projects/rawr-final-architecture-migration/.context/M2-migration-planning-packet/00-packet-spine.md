# Migration Planning Packet Spine

Status: ready for migration planning.
Intent: define what the migration planning packet should contain before the actual migration plan is written.

## Purpose

This packet prepares the planning surface for the M2 runtime realization migration.

It is not the migration plan yet. It is the authority model, context boundary, and working spine that should keep the migration plan aligned to the finalized architecture instead of drifting toward old docs, current repo layout, or useful-but-scope-expanding companion specs.

## Planning Packet Shape

The migration planning packet should contain:

| Section | Purpose |
| --- | --- |
| `Authority Model` | Declare which sources win conflicts and which sources are reference-only. |
| `Target Spine` | Summarize the final target geometry the migration must converge on. |
| `Current-State Audit` | Record what exists in the repo today as migration substrate, not target authority. |
| `Preserve / Mine / Replace / Delete Map` | Classify current code, docs, gates, and terminology against the target. |
| `Migration Container` | Define the bounded work area, likely M2 runtime realization first, without silently adding auth/deployment implementation. |
| `Domino Sequence` | Break the migration into executable slices with dependencies, deletion targets, and proof gates. |
| `Negative-Space Ledger` | Name load-bearing hooks that must be preserved but not fully implemented in the first runtime migration. |
| `Verification Plan` | List structural gates, runtime proofs, doc drift checks, and final cutover checks. |
| `Deferred/Future Lanes` | Track auth, deployment, telemetry backend, cache, config precedence, and other later work without turning them into current scope. |
| `Open Decisions` | Capture only real design decisions that block planning or implementation. |

## Initial Planning Questions

The first migration-planning pass should answer:

- What final target architecture must M2 implement first?
- What current repo surfaces are temporary substrate rather than target shape?
- Which existing code survives because it already matches the target?
- Which existing code is useful only as behavior/proof material?
- Which compatibility bridges are unavoidable, and when do they expire?
- Which hooks must be left for authentication, deployment, diagnostics, telemetry, cache, and config without implementing those systems now?
- What proves convergence at each slice?

## Non-Goals

This packet should not:

- re-review the final architecture documents;
- re-open candidate selection;
- produce the final implementation sequence before the current-state audit exists;
- fold auth or deployment companion specs into immediate runtime scope;
- duplicate the broader documentation cleanup inventory.

## Entry Point

Begin migration planning by producing the current-state audit, then regenerate the migration plan, milestone, and issue sequence from the final architecture/runtime specs.
