# PLAN (Transition Tracking)

This file tracks the transition from historical `rawr-hq` documentation toward the canonical
`RAWR HQ-Template` architecture model.

## Current Canonical Sources

- `docs/SYSTEM.md`
- `docs/PROCESS.md`
- `docs/system/PLUGINS.md`
- `CONTRIBUTING.md`
- `UPDATING.md`

## Locked Decisions

1. `RAWR HQ-Template` is the canonical upstream.
2. `RAWR HQ` is the personal downstream repo created from template.
3. CLI core lives in template upstream.
4. Plugin channels are separated:
   - Channel A: `rawr plugins ...` (oclif manager)
   - Channel B: `rawr hq plugins ...` (workspace runtime)

## Deferred Items

- `rawr.lock` introduction remains deferred until external workspace plugin sources are supported.
- Marketplace runtime remains parked.
- LLM-judge runtime gating remains parked.
