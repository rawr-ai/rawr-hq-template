# semantica-First Phase Handoffs

This file records implementation-phase checkpoints for the semantica-first migration. It is a tracked handoff ledger; generated `.semantica/` artifacts remain ignored.

## Phase 2: Ingest, Split, And Provenance Foundation

Branch: `codex/semantica-first-pipeline-implementation`

Changed files:

- `tools/semantica-workbench/src/semantica_workbench/semantica_intake.py`
- `tools/semantica-workbench/tests/test_workbench.py`

Implementation:

- Added a semantica-backed intake probe using pinned `semantica.split.StructuralChunker`.
- Added a RAWR char-offset-to-line-span adapter for semantica chunks.
- Added semantica `SourceReference` provenance projection while preserving RAWR source id, path, authority rank, authority scope, heading path, and line span.
- Kept `chunk_markdown` as the decision-grade fallback and parity oracle.

Capability status:

- `semantica.split.StructuralChunker`: proven importable and usable for character-offset chunks.
- `semantica.provenance.SourceReference`: proven usable for source reference projection.
- `semantica.parse.MarkdownParser`: blocked/absent in the pinned package, so markdown intake remains `partial`.

Fallback and removal trigger:

- Decision-grade intake remains on `chunk_markdown` while semantica Markdown parsing is absent.
- Removal trigger: switch decision-grade intake only after semantica Markdown parsing and exact span parity are both proven.

Residual uncertainty:

- Structural chunking segmentation does not intentionally match current RAWR chunk boundaries.
- The current proof maps character offsets back to line spans but does not yet feed production extraction.
