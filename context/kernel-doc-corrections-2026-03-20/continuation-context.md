## Overarching goal
You are implementing the approved Canonical Kernel Doc Corrections plan for the two canonical docs so they precisely express the locked target architecture, stay cohesive as canonical specs, and do not overclaim current repo state or Arc behavior.

## Current state / progress snapshot
The very last thing that happened was initial implementation setup: you created the dedicated research workspace under `context/kernel-doc-corrections-2026-03-20/`, wrote `brain.md`, and captured the continuation packet before editing the docs. This preserves the framing and puts you at the checkpoint immediately before the required pre-edit git commit and doc patching work.

## Invariants and decisions (for this continuation)
1. The future architecture direction and load-bearing semantics are locked; do not renegotiate them.
2. Current repo transitional layout mismatch is not, by itself, a reason to change the target architecture.
3. The main semantic correction is to describe `bootgraph` as a RAWR derivative of Arc/`tsdkarc`, not Arc-as-is.
4. Keep service boundaries transport-neutral; describe oRPC as the default local-first callable harness, not as service identity.
5. Preserve the distinction between manifest authority and host mount-time runtime augmentation.
6. Remove migration / implementation-program content from the canonical doc body.
7. Use a ratcheting workflow with architecture and information-design review coverage.

## Next step / immediate continuation
Commit the current state of the canonical docs now, before any additional semantic edits, so the upcoming corrections have a clean checkpoint and traceable evolution.

## Verbatim continuation snippet (programmatically inserted)
{{RAWR_VERBATIM_CONTINUATION_SNIPPET}}

Immediately continue from “Next step / immediate continuation” after compaction; do not restart or re-plan from scratch.
