# FINAL_INTEGRATED_SPEC: rawr-hq Agent Plugin

## Scope

Build canonical `rawr-hq` agent plugin artifacts in template repo with two initial skills:
1. `rawr-hq-orientation`
2. `rawr-hq-plugin-creation`

## System contracts to preserve

- Routing split (template vs personal) from `AGENTS_SPLIT.md`.
- Command surface invariant:
  - Channel A: `rawr plugins ...`
  - Channel B: `rawr hq plugins ...`
- Runtime enablement boundary and persisted state semantics for Channel B.

## Skill output contracts

### Orientation skill

Must explain:
- HQ purpose/philosophy,
- template vs personal responsibilities,
- capability map,
- runbook entrypoints,
- command surface invariants.

### Plugin-creation skill

Must guide:
- channel selection,
- migration vs net-new branch,
- requirement capture and plan checkpoints,
- channel-specific implementation contracts,
- tests/docs/wiring,
- failure-mode handling.

## Verification scenarios

1. Frontmatter and folder shape valid for both skills.
2. Both channels documented without command mixing.
3. Both origin paths documented.
4. References include concrete remediation for known failure modes.
5. Plugin artifacts mirror cleanly to Claude plugin tree.
6. `sync_to_codex.py --dry-run` and apply succeed.
7. Codex mirror paths exist for both skills.
