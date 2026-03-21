## Overarching goal
I want you to finish the Canonical Kernel Doc Corrections implementation on `RAWR_App_Boot_Spec.md` and `RAWR_Future_Architecture_V2.md` so both docs read as standalone canonical future-state specifications: precise, cohesive, non-meta, and aligned with the locked architecture.

## Current state / progress snapshot
The canonical-language cleanup pass is complete. Both docs were patched to remove mixed referentials, migration/program language, and residual ambiguity; the last semantic cleanup normalized the manifest-vs-mounting-runtime authority wording so neither doc uses bare `host` ambiguously at that seam. Validation has already passed:
- `bun scripts/phase-a/manifest-smoke.mjs`
- `bunx vitest run --project server apps/server/test/rawr.test.ts`

The branch is still dirty only because the final edited docs and this continuation packet have not been committed yet. You are at the final repo-cleanup and closeout step.

## Invariants and decisions (for this continuation)
1. The future architecture direction and load-bearing semantics are locked. Do not renegotiate them.
2. These docs are canonical future-state specs. They are explicitly not required to match the current repo layout.
3. Canonical target-state wording should remain strong; do not weaken it to fit the transitional repo.
4. Keep mixed referentials, supporting-doc governance chatter, self-reference, and semantically empty phrasing out of the spec bodies.
5. Keep Arc/`tsdkarc` language precise: `packages/bootgraph` is a RAWR derivative of Arc core lifecycle ideas, not Arc-as-is.
6. Keep service boundaries transport-neutral and oRPC as the default local-first callable harness, not service identity.
7. Preserve the manifest-authority vs mounting-runtime augmentation distinction.
8. Validation already passed; do not reopen the docs unless you find a concrete defect.

## Next step / immediate continuation
Commit the final edited docs plus the refreshed continuation packet so the branch is clean, then deliver the concise implementation summary with the validation results and the main architectural changes that landed.

## Verbatim continuation snippet (programmatically inserted)
{{RAWR_VERBATIM_CONTINUATION_SNIPPET}}

Immediately continue from “Next step / immediate continuation” after compaction; do not restart or re-plan from scratch.
