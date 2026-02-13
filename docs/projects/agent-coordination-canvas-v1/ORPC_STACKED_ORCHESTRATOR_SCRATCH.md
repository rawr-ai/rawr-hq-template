# ORPC Stacked Orchestrator Scratch

## Session metadata

- Date: 2026-02-13
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl`
- Branch: `codex/orpc-v1-s01-contract-spine`
- Base branch: `codex/coordination-fixpass-v1-cutover-purge`

## Checkpoints

- [x] New clean worktree created from top stack branch
- [x] Canonical stacked implementation plan written
- [x] Agent plan + scratch docs created
- [x] S00 committed
- [ ] S01 committed
- [ ] S02 committed
- [ ] S03-S06 integrated
- [ ] S07 convergence complete
- [ ] S08 cleanup complete
- [ ] S09 final docs complete

## Integration notes

- Top stack advanced from earlier ORPC scope baseline. Validate impacted files at start of each slice.
- Keep bridge code temporary and tagged for guaranteed removal in S08.
- TypeBox-first policy confirmed during execution; ORPC boundary must use TypeBox->Standard Schema bridge, not new Zod contract authoring.

## Agent findings integration (2026-02-13)

1. Agent TB-REPO (`019c5496-f700-7e81-98f3-d958b809c805`)
- Repo baseline confirms TypeBox is canonical in existing schema-validation modules.
- `@sinclair/typebox` remains present for framework/peer compatibility and should not be treated as the primary authoring API for new ORPC contracts.
- Zod is present in CLI dependencies but not used as canonical schema strategy.

2. Agent TB-ORPC (`019c5496-f606-7a92-9917-dbdd5294e9ed`)
- ORPC expects Standard Schema at the contract boundary.
- Recommended path: TypeBox source-of-truth + TypeMap adapter to Standard Schema where ORPC requires it.
- For OpenAPI/coercion, use ORPC converter hooks rather than replacing TypeBox schema ownership.

## Open risks

1. Branch drift from fixpass stack may change exact file touchpoints.
2. ORPC transport wiring in Elysia may require parse/handler adjustments.
3. Full cleanup slice must verify no manual procedure endpoints remain.
