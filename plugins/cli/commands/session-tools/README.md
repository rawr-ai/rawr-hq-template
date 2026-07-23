# `@rawr/plugin-session-tools`

Session listing/search/extraction commands for the RAWR CLI.

## Local dev

- Build and verify this official Oclif command plugin after changing it:
  - `bunx nx run @rawr/plugin-session-tools:build`
  - `bunx nx run @rawr/plugin-session-tools:test`
  - `bunx nx run @rawr/plugin-session-tools:manifest`
- Run commands through the repository-local Oclif app:
  - `bun run rawr -- sessions list --table`
  - `bun run rawr -- sessions resolve <id>`
  - `bun run rawr -- sessions search --query-metadata oclif`
  - `bun run rawr -- sessions extract <id> --format markdown`

Session Tools is a core Oclif command plugin composed by `@rawr/cli`. Do not
install or link it through the native external-extension channel
`rawr plugins ...`. The ordinary CLI release package is pending; do not restore
the removed controller installer to test this module.

## Structured facet filters

`rawr sessions search` supports structured filters through the upstream
`session-intelligence` service. Filters can be combined with
`--query-metadata`, combined with `--query`, or used on their own for
facet-only search:

- `--has-tag <tag>`: XML-ish block tags like `proposed_plan` (from `<proposed_plan>...</proposed_plan>`)
- `--has-directive <name>`: directives like `code-comment` (from `::code-comment{...}`)
- `--has-tool <toolName>`: tool calls like `apply_patch`, `exec_command`
- `--has-payload-type <payloadType>`: Codex JSONL `payload.type` values
- `--has-top-type <type>`: Codex JSONL top-level `type` values
- `--candidate-limit <n>`: max sessions the service may scan for facets
  (default `250`)
- `--limit <n>`: max returned metadata/facet-only hits
- `--max-matches <n>`: max returned content-search hits

Examples:

- `bun run rawr -- sessions search --has-tag proposed_plan --limit 50`
- `bun run rawr -- sessions search --has-directive code-comment --has-tool apply_patch --query "Updated the following files"`
- `bun run rawr -- sessions search --has-payload-type message --has-top-type assistant --query "gt move"`

Facet-only search is bounded by `--candidate-limit` and returns at most
`--limit` hits. Content search keeps `--max-matches` as the returned hit cap;
`--candidate-limit` is the separate facet scan bound when `--has-*` filters are
present.

To include computed facets in the JSON output written to `--out-dir`, use
`--print-facets`.
