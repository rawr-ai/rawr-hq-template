# Legacy Decisions Appendix (Deferred)

> Extracted from `docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md`. The current canonical register is `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`, which now documents the locked-in decisions. This appendix retains the deferred decisions that still need closure.

## Source anchor
- `docs/projects/_archive/flat-runtime-session-review/system/spec-packet/DECISIONS.md`

## Deferred decisions
> Legacy ID namespace notice: `D-004` and `D-005` in this appendix are historical archive IDs and are not the active packet decision IDs. Use `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md` for current canonical decision meanings/status.

| ID | Title | Status | Default / Resolution | Rationale | Impact | Owner | Closure Criterion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D-004 | Workflow-backed ORPC helper abstraction | deferred | Do not add in phase 1; evaluate after at least two capabilities show repeated boilerplate. | Avoids premature abstraction. | Temporary duplication in API handlers until evidence threshold is met. | API platform owner | Re-open after two capabilities with evidence of repeated pattern. |
| D-005 | `publishTier` / `published` runtime role | deferred | Keep as deprecated metadata until centralized release policy lands; then remove from runtime semantics. | Prevents blocking release governance while runtime model is simplified. | Transitional docs/tooling complexity remains until release-policy cutover completes. | Release governance owner | Centralized release policy doc exists and runtime tooling no longer reads fields. |
