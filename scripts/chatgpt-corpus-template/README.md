# ChatGPT Corpus Template

This directory is no longer the executable authority for ChatGPT corpus consolidation.

The canonical implementation now lives in:

- `services/chatgpt-corpus`
- `plugins/cli/chatgpt-corpus`

Use the CLI projection instead:

```bash
rawr corpus init [path]
rawr corpus consolidate [path]
```

The preserved workspace contract is still the same:

- raw exports: `source-material/conversations/raw-json/*.json`
- optional curated docs: `work/docs/source/*.md`
- generated outputs: `work/generated/**`

If you need the runtime entry points or package seam, follow the service/package source of truth above rather than reviving the old Python script.
