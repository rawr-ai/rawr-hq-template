# Session Tools Rough Plan

## Implementation Slices

1. Service parser parity:
   - Extend Codex normalization in `services/session-intelligence` to include
     `custom_tool_call` and `custom_tool_call_output`.
   - Add or port structured Codex fixture coverage.

2. Service facet extraction:
   - Add facet entity/contract shape inside `services/session-intelligence`.
   - Implement XML-ish tag, directive, tool, payload type, and top-level type
     extraction.
   - Treat facet-only search as a supported bounded service mode.
   - Keep returned result `limit` separate from any internal candidate/scan
     bound.

3. Search integration:
   - Compose facet filters with metadata/content search.
   - Compose facet filters without metadata/content query input.
   - Preserve safe limits and avoid accidental unbounded transcript reads.
   - Preserve indexed search semantics.

4. CLI projection:
   - Add documented flags to
     `plugins/cli/session-tools/src/commands/sessions/search.ts`.
   - Normalize flag values.
   - Call service behavior.
   - Include facets in out-dir JSON for `--print-facets`.

5. Docs/tests:
   - Align README with implemented behavior.
   - Add service tests for parser/facet extraction and bounded facet-only
     search.
   - Add plugin CLI tests for every facet flag, `--print-facets`, custom Codex
     payload fixtures, returned `limit`, and candidate/scan semantics.
   - Record any residual linked-plugin install caveat.

## Likely Touch Surfaces

- `services/session-intelligence/src/service/common/normalization.ts`
- `services/session-intelligence/src/service/contract.ts`
- `services/session-intelligence/src/service/impl.ts`
- `services/session-intelligence/test/**`
- `plugins/cli/session-tools/src/commands/sessions/search.ts`
- `plugins/cli/session-tools/test/**`
- `plugins/cli/session-tools/README.md`

## Validation

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/session-intelligence --json
bunx nx show project @rawr/plugin-session-tools --json
bunx nx run @rawr/session-intelligence:test
bunx nx run @rawr/plugin-session-tools:test
bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
```

Optional non-mutating evidence before edits:

```bash
rg -n "custom_tool_call|has-tag|extractSessionFacets|print-facets" services/session-intelligence plugins/cli/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/session-tools
```

## Sequencing Notes

Service parser/facet behavior should land before CLI flags. If the CLI flags
land first, the command will repeat the current README problem: advertised
surface without service-owned implementation.

Facet-only service semantics and candidate bounds should land before the CLI
advertises `--has-*` searches that can run without metadata/content query
input.

Downstream removal is a later sunset step after upstream parity is tested and
consumed downstream.

## Stop Conditions

- Future implementation cannot define service API shape without broad
  architecture changes.
- Facet filtering requires unbounded transcript reads by default.
- Current upstream code has drifted enough that this packet's evidence is stale.

## DRA Disposition

Accepted after review repair. These are implementation slices, not executed
steps; the first slice must settle bounded service-owned facet-only behavior.
