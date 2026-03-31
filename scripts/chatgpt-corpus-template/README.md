# ChatGPT Corpus Template

This is the minimal reusable workspace for consolidating exported ChatGPT conversations into a small analysis corpus.

## What belongs here

- `consolidate_corpus.py`: template entry point
- `source-material/conversations/raw-json/*.json`: exported ChatGPT conversation files
- `work/docs/source/*.md`: optional curated source docs you want inventoried alongside the raw exports

Everything else under `work/generated/` is derived output and can be regenerated.

## Run

From the repo root:

```bash
python3 scripts/chatgpt-corpus-template/consolidate_corpus.py
```

The script uses only the Python standard library.

## Output layout

- `work/generated/corpus/inventory.json`
- `work/generated/corpus/family-graphs.json`
- `work/generated/corpus/intermediate-graph.json`
- `work/generated/corpus/corpus-manifest.json`
- `work/generated/corpus/normalized-threads/*.json`
- `work/generated/reports/anomalies.json`
- `work/generated/reports/ambiguity-flags.json`
- `work/generated/reports/canonicality-summary.md`
- `work/generated/reports/decision-log.md`
- `work/generated/reports/mental-map.md`
- `work/generated/reports/validation-report.json`

## Minimal contract

- Raw JSON exports go in `source-material/conversations/raw-json/`.
- Optional Markdown docs go in `work/docs/source/`.
- The script creates `work/generated/` and `work/README.md` itself.
- No service package, runtime server, or Nx project is required for this workflow.
