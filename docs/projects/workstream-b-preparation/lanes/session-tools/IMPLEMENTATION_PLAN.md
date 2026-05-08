# Session Tools Implementation Plan

Status: `draft-for-review`.
DRA: `Codex DRA`.
Branch: `agent-session-tools-workstream-b-session-parity`.
Record: `docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`.

## Objective

Implement upstream session-tools parity for structured session facets and Codex
custom payload parsing while preserving the upstream service/projection
architecture:

- `services/session-intelligence` owns reusable parsing, search, facet
  extraction, facet filtering, and bounded candidate policy.
- `plugins/cli/session-tools` owns CLI flags, validation, projection, and
  output writing.
- Downstream `RAWR HQ` remains behavior evidence only. This lane does not
  mutate or delete downstream code.

## Design Frame

This is a migration of behavior, not authority. The downstream
`packages/session-tools` implementation proves useful behavior and fixture
shape, but it is not the target package boundary. The upstream service already
has the correct service/client/projection shape, so the work should deepen that
shape instead of copying downstream package structure.

The key technical risk is limit semantics. Facet filters require structured
transcript reads. For metadata and facet-only search, `limit` is the returned
hit cap. For content search, `maxMatches` remains the returned hit cap. In all
facet-enabled modes, `candidateLimit` is the session scan bound. The service
must not let returned-result limits double as hidden transcript scan bounds.

## Service Package Structure Constraint

Use `agent-config-sync` and `example-todo` as structural exemplars:

- Package-level routers compose module routers.
- Contracts and schemas define public boundary shape.
- Helpers hold mechanical parsing, normalization, and filtering utilities.
- Module routers own procedure behavior and service capability orchestration.
- Projections call service procedures and render output; they do not own domain
  semantics.

For this lane, the search module router should contain the real search/facet
composition: load bounded candidates, compute facets, filter sessions, rank or
match metadata/content, and shape results. It should not become a thin shell
that forwards to a hidden downstream-style session-tools package.

## Selected Solution Shape

### 1. Custom Codex Payload Parsing

Update `services/session-intelligence/src/service/common/normalization.ts` so
`extractCodexMessages` treats these `response_item.payload.type` values as
tool-role content when `includeTools` allows it:

- `function_call`
- `function_call_output`
- `custom_tool_call`
- `custom_tool_call_output`
- `reasoning`

For custom calls, preserve `name` and `input`. For custom outputs, preserve
`output`. This mirrors downstream behavior while keeping the implementation in
the upstream service normalization layer.

### 2. Service-Owned Facet DTOs

Add search module schemas/types/constants in
`services/session-intelligence/src/service/modules/search/entities.ts`:

- `SessionFacets`
  - `xmlBlockTags: string[]`
  - `directives: string[]`
  - `toolCalls: string[]`
  - `topLevelTypes: string[]`
  - `payloadTypes: string[]`
- `SessionFacetFilters`
  - `tags?: string[]`
  - `directives?: string[]`
  - `tools?: string[]`
  - `payloadTypes?: string[]`
  - `topTypes?: string[]`
- `FacetSearchHit`, using `SessionListItem` fields plus optional `facets`.
- candidate bound constants:
  - `DEFAULT_FACET_CANDIDATE_LIMIT = 250`
  - `MAX_FACET_CANDIDATE_LIMIT = 50_000`

Extend `MetadataSearchHit` and `SearchHit` with optional `facets` so service
results can carry facets when requested. Export public aliases from
`services/session-intelligence/src/types.ts` and rely on
`plugins/cli/session-tools/src/lib/session-types.ts` to re-export service
types.

### 3. Mechanical Facet Helpers

Add a helper such as
`services/session-intelligence/src/service/modules/search/helpers/session-facets.ts`.

This helper owns mechanical utilities only:

- token normalization: trim, lower-case, collapse whitespace to `_`, collapse
  repeated `_`;
- marker scanning for matched XML-ish block tags and directives;
- extraction of facet sets from one session file via `SessionSourceRuntime`;
- `facetsMatchAll` for repeatable filter composition.

Facet categories should mirror downstream evidence, with an explicit upstream
source policy:

- matched XML-ish block tags from text, e.g. `<proposed_plan>...</proposed_plan>`;
- directives such as `::code-comment{...}`;
- tool calls from `function_call` and `custom_tool_call`;
- top-level JSONL `type`;
- `payload.type`.

Upstream facet extraction should scan Codex/Claude user, assistant, tool, and
event text rows that represent transcript-visible or tool-visible content. It
must explicitly test instruction/scaffolding treatment. DRA-selected default:
exclude raw `environment_context` and `user_instructions` scaffolding from text
marker facets, matching upstream transcript extraction's existing policy of not
surfacing those blocks as normal transcript content. Top-level and payload type
facets may still record row types because those are structured JSONL
categories, not hidden text markers.

### 4. Search Contract Extension

Extend `services/session-intelligence/src/service/modules/search/contract.ts`:

- `metadata` input gains optional:
  - `facetFilters?: SessionFacetFilters`
  - `includeFacets?: boolean`
  - `candidateLimit?: number` validated as a bounded integer by service schema
- `content` input gains optional:
  - `facetFilters?: SessionFacetFilters`
  - `includeFacets?: boolean`
  - `candidateLimit?: number` validated as a bounded integer by service schema
- Add a new facet-only procedure, likely `facets`, with input:
  - `source`
  - `filters`
  - `facetFilters`
  - `limit`
  - `candidateLimit`
  - `includeFacets`

For metadata and facet-only search, `limit` is the returned hit cap. For content
search, `maxMatches` is the returned hit cap and existing `limit` must stop
being overloaded as the facet scan bound when facet filters are present.
`candidateLimit` is the bounded count of candidate sessions that may be
inspected for facets. The service owns the default and maximum; CLI defaults are
projection conveniences only.

Service-side candidate-limit policy:

- omitted `candidateLimit` -> default `250`;
- integer `1..50_000` -> accepted;
- `0`, negative, non-integer, non-finite, or over max -> schema/procedure
  validation failure.

Facet-only output shape:

- `search.facets` returns `{ hits: FacetSearchHit[] }`;
- hits use the normal `SessionListItem` fields and include `facets` only when
  `includeFacets` is true;
- ordering is newest-first after metadata filters and facet filters;
- returned hits are sliced by `limit`, while scan candidates are bounded by
  `candidateLimit`.

### 5. Search Router Behavior

Update `services/session-intelligence/src/service/modules/search/router.ts`.

The router should own these decisions:

- when facet filters are present, load a bounded candidate set using
  `candidateLimit` rather than returned `limit` or content `maxMatches`;
- compute facets in the service using `SessionSourceRuntime`;
- filter sessions with `facetsMatchAll`;
- compose facet filters with metadata search before ranking;
- compose facet filters with content search before regex matching;
- support facet-only search through `search.facets`;
- attach facets to returned hits only when `includeFacets` is true.
- keep candidate loading, metadata/content composition order, result limiting,
  and facet attachment visibly in `search/router.ts`. Helpers must not grow
  into an opaque `runFacetSearch`/`doEverything` implementation.

Existing metadata-only search without facet filters should remain metadata-only
and should not read transcript content. Existing content search should preserve
cached and uncached search behavior.

### 6. CLI Projection

Update `plugins/cli/session-tools/src/commands/sessions/search.ts`:

- Add repeatable flags:
  - `--has-tag`
  - `--has-directive`
  - `--has-tool`
  - `--has-payload-type`
  - `--has-top-type`
- Add `--print-facets` for JSON written to `--out-dir`.
- Add an explicit bounded scan flag:
  - `--candidate-limit <n>`
  - CLI default mirrors the service-owned default: `250`.
  - CLI must not be the only source of bounded behavior.

Validation changes:

- `--query-metadata` plus `--query` remains ambiguous and exits before client
  work.
- `--reindex` remains content-search-only.
- A command with only `--has-*` filters is valid and calls service-owned
  `search.facets`.
- A command with no query, no reindex, and no facet filters still fails with
  `MISSING_QUERY`.

Projection behavior:

- For metadata search, pass facet filters to `client.search.metadata` when any
  `--has-*` flag is present.
- For content search, pass facet filters to `client.search.content`.
- For facet-only search, call `client.search.facets`.
- Pass `includeFacets: true` only when `--print-facets` is requested.
- Preserve existing human output shape. Facets are required in
  `search-results.json` when `--print-facets --out-dir` is used. Do not add
  facets to normal JSON output unless tests explicitly pin that behavior.
- Add one scoped external-plugin-channel proof that `sessions search` exposes and
  runs with the new flags without global plugin sync/link repair. Minimum proof:
  command help/discovery plus one JSON invocation path using the plugin command
  class or package-local executable surface that mirrors the external plugin
  channel.

### 7. Docs

Update `plugins/cli/session-tools/README.md` so it describes actual behavior:

- facet flags are implemented upstream;
- facet-only search is valid and bounded;
- `--candidate-limit` controls scan/candidate bound;
- `--limit` controls returned results;
- `--print-facets` affects `--out-dir` JSON.

## Test Plan

### Service Tests

Update `services/session-intelligence/test/fixture-data.ts` with a structured
Codex fixture adapted from downstream evidence. It should include:

- message content with matched XML-ish block tags;
- directives in message or event payload text;
- `function_call`;
- `custom_tool_call`;
- `custom_tool_call_output`;
- `event_msg.message`;
- `event_msg.text`.

Update `services/session-intelligence/test/session-intelligence.test.ts` to
prove:

- custom tool calls and outputs survive `transcripts.extract` when tools are
  included;
- structured facets are extracted through service search behavior;
- metadata search with facet filters finds a later candidate inside
  `candidateLimit` while returned `limit` remains the returned hit cap;
- content search with facet filters preserves cached/uncached behavior and uses
  `candidateLimit` for scanned sessions while `maxMatches` remains the returned
  hit cap;
- facet-only search is valid and bounded;
- candidate-bound semantics are distinct from returned result limit.
- omitted, valid explicit, zero/negative, non-integer, and excessive
  `candidateLimit` cases are covered by service tests.
- instruction/scaffolding blocks such as `environment_context` and
  `user_instructions` are explicitly excluded from text marker facets, or the
  test documents any deliberate inclusion.

### CLI Tests

Update `plugins/cli/session-tools/test/plugin-session-tools.test.ts` to prove:

- each facet flag is accepted and normalized into service input;
- repeatable facet flags compose as all-required filters;
- facet-only search calls `client.search.facets`;
- metadata and content searches pass facet filters to the corresponding service
  procedures;
- `--print-facets --out-dir` writes facets into `search-results.json`;
- custom Codex payload fixtures survive through service-backed CLI resources or
  a fake client output;
- `--query` plus `--query-metadata` still fails before client work;
- no-query/no-facet/no-reindex still fails with `MISSING_QUERY`;
- returned `limit` and `candidateLimit` are both sent correctly.
- content `maxMatches` and `candidateLimit` are both sent correctly.
- external plugin-channel command discovery/help and one JSON invocation path
  are covered without global sync/link repair.

### Gates

Required post-implementation gates:

```bash
bunx nx run @rawr/session-intelligence:test
bunx nx run @rawr/plugin-session-tools:test
bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
bunx nx run-many -t build,structural --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
git status --short --branch
gt ls
```

## Implementation Phases

### Phase A: Service Behavior

Implement service DTOs, custom payload normalization, facet helpers, search
contract extensions, and router behavior. Add service fixtures/tests first or
alongside code.

Acceptance for Phase A:

- service tests prove custom payloads, facet extraction, facet filtering, and
  bounded facet-only search;
- service tests prove the service-owned candidate default/max and validation;
- metadata-only behavior without facets remains transcript-free by design;
- content search cache behavior remains covered.

### Phase B: CLI Projection

Wire CLI flags and validation to service behavior. Add plugin tests with fake
client coverage and at least one real-resource/service-backed output check if
needed for `--print-facets`.

Acceptance for Phase B:

- every documented flag is covered by upstream CLI tests;
- facet-only CLI no longer fails as `MISSING_QUERY`;
- service call inputs make `limit` and `candidateLimit` explicit.
- content search service call inputs make `maxMatches` and `candidateLimit`
  explicit.

### Phase C: Docs, Review Repair, And Final Gates

Align README, run required gates, repair review findings, and update
`WORKSTREAM_RECORD.md` plus `NEXT_PACKET.md`.

Acceptance for Phase C:

- required gates pass;
- review findings are dispositioned;
- final record captures evidence, residual risks, repo/Graphite state, and
  downstream sunset conditions.

## Team / Review Plan

Current discovery agents:

- Service/API mapper: complete.
- Downstream parity mapper: complete.
- Service package exemplar mapper: complete and assimilated.
- Opening mechanics reviewer: complete; findings accepted and repaired.

Before implementation:

- Plan reviewer checks service boundary, test adequacy, and scope control.
- Red-team reviewer tries to break the plan on unbounded scans, stale README
  proof, downstream authority leakage, and thin-router/service-shell drift.
- DRA dispositions every finding in `REVIEW_FINDINGS.md`.

Implementation delegation:

- If workers are used, split by write set:
  - Service worker owns `services/session-intelligence/**`.
  - CLI worker owns `plugins/cli/session-tools/**`.
  - DRA owns integration, review disposition, docs, and Graphite state.
- Workers must be told they are not alone in the codebase, must not revert
  others' edits, and must keep write scopes disjoint.

## Stop Conditions

Stop and ask the DRA/user before implementation continues if:

- facet filtering requires unbounded transcript reads by default;
- `candidateLimit` cannot be expressed without a broader service contract
  redesign;
- content `maxMatches` cannot be distinguished from `candidateLimit`;
- service search router would become a thin shell with semantics hidden in CLI
  or downstream-style package code;
- local facet helpers would become opaque orchestration helpers instead of
  mechanical extraction/predicate helpers;
- downstream files would need to be mutated or deleted;
- current code drift invalidates the service/projection shape in the lane
  packet.

## Non-Goals

- No downstream mutation or downstream duplicate removal.
- No package resurrection of downstream `packages/session-tools`.
- No global plugin sync/link repair.
- No unrelated corpus/session architecture expansion.
- No changes to sibling Workstream B lane branches.
