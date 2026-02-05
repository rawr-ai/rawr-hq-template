# Skill Sync Plugin TODO

## Context

The reflect skill is currently authored repo-first in:
- `packages/journal/skills/reflect`

It is then manually mirrored into Claude skills and synced to Codex.

## Immediate follow-up

1. Ensure repo-first skills (starting with reflect) are synced reliably via a maintained mechanism.
2. Extract current Claude↔Codex sync scripts from:
   - `/Users/mateicanavra/.claude/plugins/local/plugins/meta/scripts/`
3. Rework that sync logic into a first-class RAWR HQ CLI plugin in this repo.
4. Use that plugin as the primary distribution path so core skills/plugins/scripts remain in HQ and sync outward to agent directories.

## Candidate script inputs to absorb

- `sync_to_codex.py`
- `sync_status.py`
- `sync_from_codex.py`
- shared utility logic in `sync_utils.py`
