# Session Tools Readiness

## Readiness Verdict

Prepared for lane-specific planning after review repair. The lane has a fixed
authority model, concrete upstream/downstream evidence, and known parity gaps,
but readiness depends on preserving the bounded facet-only and CLI proof
requirements below.

## Pair Packet

Mapper: Session Tools Behavior Mapper.

Verifier: Session Tools Parity Verifier.

Objective: prepare and then implement upstream session-tools parity while
preserving service/projection architecture.

Allowed edit surfaces:

- `services/session-intelligence/**`
- `plugins/cli/session-tools/**`
- targeted docs that describe session-tools behavior.

Forbidden scope:

- downstream mutation before upstream parity is verified,
- recreating downstream `packages/session-tools` as upstream authority,
- global plugin sync/link repair,
- unrelated session/corpus architecture.

Evidence paths:

- `plugins/cli/session-tools/src/commands/sessions/search.ts`
- `plugins/cli/session-tools/README.md`
- `services/session-intelligence/src/service/common/normalization.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/session-tools/src/commands/sessions/search.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools/src/codex/parse.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools/test/session-tools.test.ts`

Required output: lane-specific implementation plan or code changes, depending
on future user instruction.

Required gates:

- `bunx nx run @rawr/session-intelligence:test`
- `bunx nx run @rawr/plugin-session-tools:test`
- `bunx nx run-many -t typecheck --projects=@rawr/session-intelligence,@rawr/plugin-session-tools`
- upstream CLI tests for every facet flag, `--print-facets`, custom Codex
  payload fixtures, returned `limit`, and candidate/scan semantics.

Lane done condition: upstream service and CLI prove facet/custom-payload parity,
README matches implementation, and downstream duplicate sunset can be planned
without preserving dual authority.

DRA decision point: approve the service-owned bounded facet-only search shape
before CLI-only implementation proceeds.

## First Reads

- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/session-tools/SPEC.md`
- `plugins/cli/session-tools/src/commands/sessions/search.ts`
- `services/session-intelligence/src/service/common/normalization.ts`
- downstream files listed in Evidence paths.

## First Commands

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/session-intelligence --json
bunx nx show project @rawr/plugin-session-tools --json
rg -n "custom_tool_call|custom_tool_call_output|has-tag|has-directive|has-tool|has-payload-type|has-top-type|print-facets|facet" services/session-intelligence plugins/cli/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/session-tools /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/session-tools
```

## Ready-To-Plan Checklist

- [x] Upstream service/projection owner identified.
- [x] Downstream behavior evidence identified.
- [x] Upstream README/code mismatch identified.
- [x] Custom Codex payload gap identified.
- [x] Facet behavior gap identified.
- [x] Tests expected for parity identified.
- [x] Downstream package-level proof separated from unproven downstream CLI
  behavior.
- [x] Bounded facet-only mode and limit/candidate semantics captured.

## Deferred Risks

- Linked-plugin install behavior needs a fresh environment-specific check before
  a future lane claims install parity.
- Service API details for facets must be chosen during lane-specific planning,
  but the required mode and safety semantics are fixed here.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-01-01`, `F-01-02`, `F-01-03`.
- Future work must implement facet-only search as bounded service behavior, not
  as unbounded CLI-side transcript scanning.
