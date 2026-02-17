# SESSION_019c587a — Agent AD Schema Object Wrapper Plan

## Objective

Apply `schema({...})` snippet usage for object-root contract/procedure schemas where current snippets use either:

- `std(Type.Object(...))`
- `typeBoxStandardSchema(Type.Object(...))`

Do not change non-`Type.Object` schema roots.

## Scope

- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

## Execution Steps

1. Add plan/scratchpad artifacts first.
2. Replace object-root wrapper callsites with `schema({...})` style.
3. Preserve non-object wrappers and all behavioral prose.
4. Run targeted grep verification.
5. Commit documentation updates.

## Acceptance Criteria

- All object-root wrapper callsites in scoped snippet docs use `schema({...})`.
- No non-object wrapper callsites are altered.
- Worktree is clean after commit.
