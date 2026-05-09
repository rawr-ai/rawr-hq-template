# Session Tools Discovery

## Frame

This lane prepares upstream `session-tools` parity. The target architecture is
upstream service/projection shape:

- `services/session-intelligence` owns session source detection, normalization,
  catalog/search/extract logic, and reusable behavior.
- `plugins/cli/session-tools` owns the CLI projection.

Downstream is evidence for behavior. It is not the target architecture.

## Current Upstream State

Upstream has both service and CLI projects:

- `services/session-intelligence`
- `plugins/cli/session-tools`

`bunx nx show projects` listed both:

- `@rawr/session-intelligence`
- `@rawr/plugin-session-tools`

The upstream CLI search command currently exposes metadata/content/index flags
but not structured facet flags. Evidence:

- `plugins/cli/session-tools/src/commands/sessions/search.ts:20-62` defines
  `source`, `limit`, `query-metadata`, `query`, `ignore-case`, `max-matches`,
  `snippet`, `use-index`, `index-path`, `reindex`, `reindex-limit`, `roles`,
  `include-tools`, metadata filters, `out-dir`, and `quiet`.
- The same file has no `has-tag`, `has-directive`, `has-tool`,
  `has-payload-type`, `has-top-type`, or `print-facets` flags.

The upstream README advertises structured facets that the current upstream CLI
does not implement:

- `plugins/cli/session-tools/README.md:23-39` says `rawr sessions search`
  supports `--has-tag`, `--has-directive`, `--has-tool`,
  `--has-payload-type`, `--has-top-type`, and `--print-facets`.

The upstream Codex parser handles standard tool payloads but not custom tool
payloads:

- `services/session-intelligence/src/service/common/normalization.ts:159-164`
  includes `function_call`, `function_call_output`, and `reasoning`.
- It does not include `custom_tool_call` or `custom_tool_call_output`.

The upstream plugin already routes through `@rawr/session-intelligence/client`,
which is the correct go-forward shape:

- `plugins/cli/session-tools/src/commands/sessions/search.ts:3-8`
  imports the service client and client factory.

## Current Downstream State

Downstream has older direct package/projection shape:

- `packages/session-tools`
- `plugins/cli/session-tools`

Downstream behavior evidence:

- `plugins/cli/session-tools/src/commands/sessions/search.ts:24-52` defines
  facet normalization and `facetsMatchAll`.
- `plugins/cli/session-tools/src/commands/sessions/search.ts:94-99` exposes
  `--has-tag`, `--has-directive`, `--has-tool`, `--has-payload-type`,
  `--has-top-type`, and `--print-facets`.
- `plugins/cli/session-tools/src/commands/sessions/search.ts:178-201`
  computes and filters facets before content/metadata search.
- `plugins/cli/session-tools/src/commands/sessions/search.ts:252-258`
  includes facets in out-dir JSON when `--print-facets` is set.

Downstream Codex parser includes custom tool calls:

- `packages/session-tools/src/codex/parse.ts:124-129` includes
  `function_call`, `function_call_output`, `custom_tool_call`,
  `custom_tool_call_output`, and `reasoning`.
- `packages/session-tools/src/codex/parse.ts:140-144` serializes
  `custom_tool_call` input and `custom_tool_call_output` output.

Downstream package tests prove parser/facet behavior, not full downstream CLI
behavior:

- `packages/session-tools/test/session-tools.test.ts:71-90` asserts extraction
  includes custom tool calls and function calls.
- `packages/session-tools/test/session-tools.test.ts:301-308` asserts facet
  extraction for XML-ish tags, directives, tools, top-level JSONL types, and
  payload types.
- The downstream CLI code is behavior evidence, but current evidence does not
  include downstream plugin CLI tests that prove all facet flags or
  `--print-facets` behavior end to end.

## Evidence

Commands used:

```bash
find plugins/cli/session-tools services/session-intelligence -maxdepth 4 -type f | sort
find /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools -maxdepth 4 -type f | sort
rg -n "has-tag|has-directive|has-tool|has-payload-type|has-top-type|print-facets|custom_tool_call|custom_tool_call_output|function_call|function_call_output|facet" plugins/cli/session-tools services/session-intelligence /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/session-tools
```

## Mismatches

1. Upstream docs advertise structured facets, but upstream CLI implementation
   does not expose the facet flags.
2. Upstream service parser omits Codex `custom_tool_call` and
   `custom_tool_call_output` payload types that downstream handles.
3. Downstream facet logic currently lives in `packages/session-tools`; upstream
   should move reusable behavior into `services/session-intelligence`, not copy
   the old package shape.
4. Upstream has service-client projection boundaries; downstream is direct
   package import. Future implementation must preserve upstream architecture.

## Risks

- Copying downstream CLI implementation directly would bypass the service-owned
  target architecture.
- Trusting upstream README would hide the current implementation gap.
- Adding facet filtering only in the CLI would make non-CLI service consumers
  second-class.
- Facet-only searches may require reading transcripts without metadata/content
  query input; future implementation must make this a bounded service mode with
  explicit candidate/scan limits separate from returned result `limit`.

## Unknowns

- Exact service API shape for facets is not implemented yet. Future planning
  should choose between a first-class facet extraction/search method and
  extending current search contracts.
- Exact upstream fixture placement must be decided during implementation, most
  likely under `services/session-intelligence/test/`.
- Linked-plugin install behavior should be rechecked in a future lane session
  because it depends on current plugin install state and should not be inferred
  from docs alone.

## DRA Disposition

Accepted after review repair. The lane has enough current evidence for
lane-specific planning without reopening authority. The key target is
service-owned parity with downstream facet/custom-payload behavior, with
downstream package proof separated from unproven CLI behavior.

## Review Repair Addendum

- `F-01-01` accepted: facet-only search is a first-class bounded service mode.
- `F-01-02` accepted: downstream package tests prove parser/facet behavior;
  future upstream CLI tests must prove CLI flags, `--print-facets`, custom
  Codex payload fixture handling, and limit/candidate semantics.
- `F-01-03` accepted: returned result `limit` and internal candidate/scan bound
  semantics must be tested separately.
