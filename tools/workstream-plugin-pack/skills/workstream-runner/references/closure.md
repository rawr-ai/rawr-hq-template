# Closure

A workstream closes when the DRA can show what changed, what was verified, what
remains, and how a future agent should continue without transcript archaeology.

Closure needs:

- final outputs and paths;
- verification commands, results, skipped checks, and waivers;
- review findings with disposition;
- deferred inventory with owner/future DRA, authority home, and trigger;
- scratch and temporary-agent cleanup or explicit preservation;
- repo and Graphite state when applicable;
- a zero-context Next Packet.

The closure-readiness stewards audit what the DRA has finalized; they do not
substitute for finalization. Before invoking them, complete Step 8 (DRA
finalize) in the Default Workflow: stage and commit pending edits, update the
record header, and populate Findings, Outcome, Review Result, Final Output,
and Next Packet from the now-complete child artifacts. Stewards run
against unfinalized workstreams return warns the DRA could have prevented.

Planning-only workstreams can close with a design lock, implementation packet,
accepted plan, and first commands instead of code changes.

If required outputs cannot be completed, mark the workstream abandoned or
deferred with enough context to resume. Do not pretend partial evidence is a
closed green state.
