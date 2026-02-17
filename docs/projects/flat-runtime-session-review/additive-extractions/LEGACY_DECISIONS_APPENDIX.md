# Legacy Decisions Appendix (Deferred)

> Extracted from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md`. The current canonical register is `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`, which now documents the locked-in decisions. This appendix retains the deferred decisions that still need closure.

## Source anchor
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md`

## Deferred decisions
| ID | Title | Status | Default / Resolution | Rationale | Impact | Owner | Closure Criterion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D-004 | Workflow-backed ORPC helper abstraction | deferred | Do not add in phase 1; evaluate after at least two capabilities show repeated boilerplate. | Avoids premature abstraction. | Temporary duplication in API handlers until evidence threshold is met. | API platform owner | Re-open after two capabilities with evidence of repeated pattern. |
| D-005 | `publishTier` / `published` runtime role | deferred | Keep as deprecated metadata until centralized release policy lands; then remove from runtime semantics. | Prevents blocking release governance while runtime model is simplified. | Transitional docs/tooling complexity remains until release-policy cutover completes. | Release governance owner | Centralized release policy doc exists and runtime tooling no longer reads fields. |
