# Legacy / Dual-Path Scan Report

## Scope

- Template repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- Personal repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

## Runtime Command Surface Check

Check performed:
- Search for legacy workspace runtime command files under:
  - `apps/cli/src/commands/plugins/{enable,disable,list,status}.ts`

Result:
- No legacy runtime command files found.
- Canonical runtime workspace commands remain under `rawr hq plugins ...`.

## Docs Command Reference Check

Query:
- `rawr plugins enable|disable|status|list`

Results:
- No canonical docs files currently use legacy workspace command forms.
- Remaining matches are only in historical execution artifacts:
  - `docs/projects/repo-split/agent-a-plan.md`

Interpretation:
- No active dual-path behavior remains.
- Historical report text is intentionally preserved for audit traceability.

## Channel Consistency

- Channel A (oclif): `rawr plugins ...` (kept)
- Channel B (workspace runtime): `rawr hq plugins ...` (kept)

Status: PASS
