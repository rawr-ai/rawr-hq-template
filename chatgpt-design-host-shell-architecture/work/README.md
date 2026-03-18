# Active Workspace

This directory is the active working workspace derived from the raw source material in the sibling provenance tree.

Raw source material now lives in:

- `../source-material/conversations/raw-json/`

Active docs:
- `docs/source/*.md`
- `docs/canonical/*.md`

Generated corpus outputs:
- `generated/corpus/inventory.json`
- `generated/corpus/family-graphs.json`
- `generated/corpus/intermediate-graph.json`
- `generated/corpus/corpus-manifest.json`
- `generated/corpus/normalized-threads/*.json`

Generated reports:
- `generated/reports/anomalies.json`
- `generated/reports/ambiguity-flags.json`
- `generated/reports/canonicality-summary.md`
- `generated/reports/decision-log.md`
- `generated/reports/validation-report.json`

Supporting outputs:
- `retained-notes/*.md`

Working surfaces:

- `docs/` for active source-reading, current canon, and retained doc history
- `generated/` for corpus data and derived reports
- `retained-notes/` for the small number of still-useful working notes
- `scripts/` for workspace derivation tooling
