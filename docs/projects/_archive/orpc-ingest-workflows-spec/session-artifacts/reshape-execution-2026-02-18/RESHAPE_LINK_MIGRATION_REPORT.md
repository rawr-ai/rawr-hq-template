# RESHAPE Link Migration Report

Generated: 2026-02-18T21:54:14Z (UTC)

## Expected Checks

1. Destination map materialization: **PASS**
2. Snippet parity: **PASS**
3. Stale-link gate in canonical destination docs: **PASS**
4. Stale-link gate in docs/SYSTEM.md, docs/system/PLUGINS.md, docs/process/PLUGIN_E2E_WORKFLOW.md: **PASS**

## Check 1) Destination Map Materialization

- Expected mapped destinations: 17
- Present: 17
- Missing: 0

Result: PASS

## Check 2) Snippet Parity

- Source snippets: 159
- Destination snippets (mapped destination files): 162
- Exact hash matches in mapped destinations: 159
- Missing from mapped destinations: 0
- Found in other destination files: 0

Result: PASS

## Check 3) Stale-Link Gate In Canonical Destination Docs

Scope scanned (canonical destination docs):
- docs/projects/flat-runtime/README.md
- docs/projects/flat-runtime/ARCHITECTURE.md
- docs/projects/flat-runtime/DECISIONS.md
- docs/projects/flat-runtime/axes/*.md
- docs/projects/flat-runtime/examples/*.md

- Files scanned: 16
- Stale-link matches: 0

Result: PASS

## Check 4) Stale-Link Gate In Global Core Docs

Scope scanned:
- docs/SYSTEM.md
- docs/system/PLUGINS.md
- docs/process/PLUGIN_E2E_WORKFLOW.md

- Stale-link matches: 0

Result: PASS

## Additional Notes

- Informational full-tree scan over `docs/projects/flat-runtime/**/*.md` finds 56 legacy-name matches.
- Those matches are in reshape linkage/lineage artifacts and are non-blocking for canonical stale-link gates.

## Remaining Blockers

- None.
