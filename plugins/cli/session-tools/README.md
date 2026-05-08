# `@rawr/plugin-session-tools`

Session listing/search/extraction commands for the RAWR CLI.

## Local dev

- Link the plugin:
  - From repo root (runs with cwd = `apps/cli`): `bun run rawr plugins link ../../plugins/cli/session-tools`
  - Or explicitly: `cd apps/cli && bun src/index.ts plugins link ../../plugins/cli/session-tools`
- Run commands:
  - `bun run rawr sessions list --table`
  - `bun run rawr sessions resolve <id>`
  - `bun run rawr sessions search --query-metadata oclif`
  - `bun run rawr sessions extract <id> --format markdown`

> **Heads-up: the “disposable worktree” trap**
> - `rawr plugins link` stores an **absolute path** to the plugin directory.
> - If you link from a **disposable git worktree** and later delete it, `rawr` can fail at startup (missing `package.json`).
> - Prefer linking from a **stable checkout path** (your primary worktree), using an absolute path.
> - Recovery: `rawr plugins uninstall <plugin>` (or `rawr plugins reset` to wipe all user-linked plugins).
> - If available, prefer the repo-root helper: `rawr plugins install all`.

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

- `bun run rawr sessions search --has-tag proposed_plan --limit 50`
- `bun run rawr sessions search --has-directive code-comment --has-tool apply_patch --query "Updated the following files"`
- `bun run rawr sessions search --has-payload-type message --has-top-type assistant --query "gt move"`

Facet-only search is bounded by `--candidate-limit` and returns at most
`--limit` hits. Content search keeps `--max-matches` as the returned hit cap;
`--candidate-limit` is the separate facet scan bound when `--has-*` filters are
present.

To include computed facets in the JSON output written to `--out-dir`, use
`--print-facets`.
