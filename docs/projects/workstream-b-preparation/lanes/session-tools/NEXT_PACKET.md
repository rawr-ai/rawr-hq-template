# Next Packet: Session Tools Session Parity

Status: `complete`.
Branch: `agent-session-tools-workstream-b-session-parity`.
Parent: `codex/workstream-b-preparation`.
DRA: `Codex DRA`.

This packet is a zero-context handoff for the Workstream B session-tools lane.
It is not architecture authority and does not reopen downstream sunset scope.

## Objective

This lane migrates migration-sensitive session-tools behavior into upstream
`RAWR HQ-Template` authority:

- service-owned Codex custom payload parsing;
- service-owned structured facet extraction/filtering;
- bounded facet-only and faceted metadata/content search;
- CLI projection for the session-tools plugin.

Downstream `RAWR HQ` was behavior evidence only. This lane did not mutate or
delete downstream files.

## Implemented Shape

Service authority lives in `services/session-intelligence`:

- `search.entities` defines `SessionFacets`, `SessionFacetFilters`,
  `FacetSearchHit`, and candidate bound constants.
- `search.contract` exposes facet-aware metadata/content search plus
  `search.facets`.
- `search.helpers.session-facets` owns only mechanical parsing, normalization,
  and pure predicates.
- `search.router` owns candidate loading, facet computation, facet filtering,
  metadata/content composition, hit limiting, and optional facet attachment.
- `common.normalization` preserves `custom_tool_call` and
  `custom_tool_call_output` as tool content when tools are included.

CLI projection lives in `plugins/cli/session-tools`:

- `sessions search` accepts `--has-tag`, `--has-directive`, `--has-tool`,
  `--has-payload-type`, `--has-top-type`, `--candidate-limit`, and
  `--print-facets`.
- facet-only CLI search is valid.
- `--candidate-limit` is the scan bound. `--limit` is the returned cap for
  metadata/facet-only search. `--max-matches` is the returned cap for content
  search.

External command-channel proof was added to
`apps/cli/test/plugins-install-all.test.ts` without global sync/link repair.

## Policy Decisions

- Service-side candidate policy: omitted `candidateLimit` defaults to `250`;
  valid range is integer `1..50_000`; invalid values fail at the service
  contract boundary.
- Facet text marker extraction excludes hidden scaffolding tags:
  `environment_context`, `permissions_instructions`, and `user_instructions`.
- Structured row-category facets still record top-level JSONL type and
  `payload.type`.
- The search router intentionally contains the real service orchestration; no
  downstream-style package was introduced.

## Review State

Completed reviews:

- opening mechanics review;
- follow-up opening review;
- plan review;
- red-team review.
- final proof reviewer Godel `019e08ff-d0f8-7a43-bfd6-3a3818cb6150`, with no
  blocking findings.

Final repo/Graphite checks should show the lane branch clean at the closure
commit.

## Verification Already Run

All of these passed before this packet was written:

```bash
bunx nx run @rawr/session-intelligence:test
bunx nx run @rawr/plugin-session-tools:test
bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
bunx nx run-many -t build,structural --projects=@rawr/session-intelligence,@rawr/plugin-session-tools
bunx vitest run --project cli apps/cli/test/plugins-install-all.test.ts --testNamePattern='loads session-tools'
```

## First Reads

Read these first in a continuation:

1. `docs/projects/workstream-b-preparation/lanes/session-tools/WORKSTREAM_RECORD.md`
2. `docs/projects/workstream-b-preparation/lanes/session-tools/REVIEW_FINDINGS.md`
3. `docs/projects/workstream-b-preparation/lanes/session-tools/IMPLEMENTATION_PLAN.md`
4. `docs/projects/workstream-b-preparation/lanes/session-tools/COMPLETION_AUDIT.md`
5. Latest final repo/Graphite status

## First Commands

```bash
git status --short --branch
gt info --branch agent-session-tools-workstream-b-session-parity
gt ls
```

If any closure repair changes code, rerun the relevant targeted test plus:

```bash
bunx nx run @rawr/session-intelligence:test
bunx nx run @rawr/plugin-session-tools:test
```

## Non-Goals Still In Force

- Do not mutate downstream `RAWR HQ`.
- Do not delete downstream duplicate session-tools code in this lane.
- Do not run global plugin sync/link repair.
- Do not change sibling Workstream B branches or worktrees.
