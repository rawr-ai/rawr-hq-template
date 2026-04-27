# Agent C: session-intelligence locality cleanup

Branch/worktree: `agent-service-module-ownership-hardening` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`.

Scope: remediate only `services/session-intelligence/**` and the session-intelligence structural verifier/tests needed to ratchet module ownership.

## Shared file matrix

| Shared file | Actual consumers | Classification | Destination / action |
| --- | --- | --- | --- |
| `src/service/shared/catalog-logic.ts` | `modules/catalog/repository.ts` only | move to module | Move into `src/service/modules/catalog/repository.ts`; catalog owns list, resolve, date/window filtering, id/path resolution, and catalog-specific filter semantics. |
| `src/service/shared/transcript-logic.ts` | `modules/transcripts/repository.ts` only | move to module | Move into `src/service/modules/transcripts/repository.ts`; transcripts owns extraction, dedupe, offset, and max-message semantics. |
| `src/service/shared/search-logic.ts` | `modules/search/repository.ts` only | move to module | Move into `src/service/modules/search/repository.ts`; search owns metadata ranking, content snippets, search-text cache use, reindex, and cache clearing semantics. |
| `src/service/shared/schemas.ts` | shared ports, shared normalization, module schema files, test helpers | split | Keep only cross-module/provider primitives: session source/filter/status, role/message primitives, provider discovery/stat types, provider metadata types, session list item. Move catalog-only `SessionFilters` and `ResolveResult` into `modules/catalog/schemas.ts`; transcript-only `ExtractOptions` and `ExtractedSession` into `modules/transcripts/schemas.ts`; search-only `SearchHit`, `MetadataSearchHit`, and `ReindexResult` into `modules/search/schemas.ts`. Delete unused `OutputFormat`. |
| `src/service/shared/normalization.ts` | catalog via metadata, transcripts via detect/extract messages, search via detect/extract messages | keep shared | Keep as provider wire-format normalization because all three service modules consume the same Claude/Codex JSONL normalization primitives. Update type imports to shared primitives only. |
| `src/service/shared/path-utils.ts` | normalization and catalog path/id resolution | keep shared | Keep tiny path primitives because they support shared normalization plus catalog path resolution. |
| `src/service/shared/errors.ts` | catalog/transcripts/search contracts | keep shared | Keep shared boundary errors because multiple modules consume the shared ORPC error vocabulary. |
| `src/service/shared/internal-errors.ts` | currently no consumers | delete | Delete if still unused after moves. |
| `src/service/shared/ports/session-source-runtime.ts` | `base.ts`, catalog/transcripts/search middleware/repositories, tests | keep shared | Keep as service resource contract. |
| `src/service/shared/ports/session-index-runtime.ts` | `base.ts`, search middleware/repository, tests | keep shared | Keep as service resource contract. |

## Verifier updates

- Extend `scripts/phase-03/verify-session-intelligence-structural.mjs` so module schema files fail when they are re-export shells or import known module-owned schema names from `shared/schemas`.
- Extend the same verifier so `shared/schemas.ts` fails if catalog/transcripts/search module-only schema names are present.
- Extend the same verifier so same-domain shared logic delegation fails when `shared/catalog-logic.ts`, `shared/transcript-logic.ts`, or `shared/search-logic.ts` exists or module repositories import those old shared logic files.
- Keep the existing host-package and concrete-runtime purity ratchets.

## Behavioral proof

- `bunx nx run @rawr/session-intelligence:typecheck --skip-nx-cache` must pass.
- `bunx nx run @rawr/session-intelligence:test --skip-nx-cache` must pass and continue to prove catalog list/resolve, transcript detect/extract, search metadata/content/cache/reindex/clear behavior through the real client surface.
- `bunx nx run @rawr/session-intelligence:structural --skip-nx-cache` must pass and prove the new locality ratchets.
