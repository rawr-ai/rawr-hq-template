# Session Tools Spec

## Ownership

`RAWR HQ-Template` owns reusable session tooling behavior.

Service authority:

- `services/session-intelligence`

CLI projection authority:

- `plugins/cli/session-tools`

Downstream `packages/session-tools` is behavior evidence only. Do not recreate
that package upstream unless a future architecture decision explicitly changes
the service/projection shape.

## Target State

Upstream `rawr sessions ...` commands should reach behavior parity for the
migration-sensitive capabilities:

- list sessions,
- resolve sessions,
- search by metadata/content/index,
- structured facet filters,
- extract sessions,
- parse Codex function and custom tool payloads.

Facet extraction and Codex payload parsing should be reusable service behavior.
The CLI should expose flags, validate user input, call service methods, and
render JSON/human output.

## Public Surface

Expected CLI surface:

```bash
rawr sessions list [--source claude|codex|all] [...]
rawr sessions resolve <id-or-path> [--source claude|codex|all] [...]
rawr sessions search --query-metadata <q> [filters...] [...]
rawr sessions search --query <regex> [filters...] [...]
rawr sessions search --has-tag <tag> [...]
rawr sessions search --has-directive <name> [...]
rawr sessions search --has-tool <toolName> [...]
rawr sessions search --has-payload-type <payloadType> [...]
rawr sessions search --has-top-type <type> [...]
rawr sessions search --print-facets --out-dir <dir> [...]
rawr sessions extract <id-or-path> --format markdown|json [...]
```

Facet flags must be repeatable and must compose with both metadata and content
search. `--print-facets` should affect JSON output written to `--out-dir` and,
if future implementation chooses to include it in `--json`, that behavior must
be explicit in tests.

Facet-only search is a first-class bounded search mode. A command with only
`--has-*` filters and no `--query` or `--query-metadata` must be valid when it
uses the service-owned structured transcript search path.

`limit` means returned result count. Any transcript scan/candidate bound needed
to keep facet-only search safe must be a separate service option and a separate
CLI-facing concept if exposed. Do not overload returned result `limit` as an
implicit unbounded transcript-read control.

## Internal Boundaries

Service-owned:

- Codex/Claude transcript normalization.
- Codex `function_call`, `function_call_output`, `custom_tool_call`,
  `custom_tool_call_output`, and `reasoning` extraction.
- Structured facet extraction.
- Search/filter operations that depend on structured transcript reads.
- Fixtures that prove parser behavior.

Projection-owned:

- oclif flags.
- flag normalization.
- converting CLI flags into service input.
- human output.
- writing `search-results.json` into `--out-dir`.

## Bring / Preserve / Remove / Ignore

Bring upstream from downstream:

- facet categories: XML-ish block tags, directives, tool calls, payload types,
  top-level JSONL types.
- custom Codex tool payload parsing.
- tests proving custom tool extraction and facet extraction.
- CLI flag names already documented upstream.

Preserve upstream:

- `services/session-intelligence` service boundary.
- `plugins/cli/session-tools` as projection.
- existing list/resolve/search/extract command names.
- indexed search behavior and safe-limit defaults.

Remove later downstream:

- downstream duplicate session tooling implementation after upstream parity is
  proven and downstream consumes the upstream surface.

Ignore:

- upstream README as proof of implementation; it is currently a stale/aspirational
  claim for facets.

## Test And Evidence Contract

Future implementation must add or update tests that prove:

- Upstream service extracts `custom_tool_call` and `custom_tool_call_output`.
- Upstream service extracts structured facets from Codex JSONL fixtures.
- CLI exposes and accepts all facet flags.
- Facet flags filter metadata searches, content searches, and facet-only
  searches.
- `--print-facets` writes facet data in `search-results.json`.
- Custom Codex payload fixtures prove `custom_tool_call` and
  `custom_tool_call_output` survive through the service and CLI projection.
- Tests distinguish returned `limit` from any internal candidate/scan bound.
- Existing list/resolve/search/extract behavior does not regress.

Expected gates:

```bash
bunx nx run @rawr/session-intelligence:test
bunx nx run @rawr/plugin-session-tools:test
bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
```

## Non-Goals

- Do not move back to a downstream-style `packages/session-tools` authority.
- Do not solve global plugin install/link state.
- Do not broaden session-tools into a general transcript/corpus platform.
- Do not remove downstream implementation until upstream parity is verified.

## DRA Disposition

Accepted after review repair. The spec fixes the target shape: upstream
service-owned behavior with CLI projection parity, including bounded facet-only
search and explicit upstream CLI proof.

## Review Repair Addendum

- Downstream package tests are behavior evidence, not CLI parity proof.
- Upstream implementation must add plugin CLI tests for every facet flag,
  `--print-facets`, custom Codex payload output, and limit/candidate semantics.
