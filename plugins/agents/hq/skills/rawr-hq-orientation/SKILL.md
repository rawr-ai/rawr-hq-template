---
name: rawr-hq-orientation
description: Orientation and operating context for RAWR HQ and RAWR HQ-Template. Use when you need to explain what RAWR HQ is, how template vs personal responsibilities are divided, which command surfaces to use, how plugin/runtime capabilities fit together, and where to route implementation work safely.
---

# RAWR HQ Orientation

## Purpose

Use this skill to orient collaborators quickly and safely in the RAWR HQ ecosystem:
- what RAWR HQ and RAWR HQ-Template are,
- where work should land,
- what plugin channels exist,
- what capabilities are currently implemented,
- which runbooks govern common workflows.

## Core mental model

1. `RAWR HQ-Template` is the upstream baseline for shared behavior.
2. `RAWR HQ` is the downstream personal customization repo.
3. Command surfaces are split and must not be mixed.
4. Runtime plugin enablement is explicit and gated.
5. Cross-repo work follows routing plus sync runbooks.

## Hard invariants

- Channel A (external oclif plugin manager): `rawr plugins ...`
- Channel B (workspace runtime plugins): `rawr plugins web ...`
- Do not swap command surfaces in docs, implementation, or examples.

## How to answer with this skill

1. Start with repo role: template vs personal.
2. State command surface explicitly before giving command examples.
3. Identify capability axis involved:
   - CLI extension,
   - workspace runtime plugin,
   - micro-frontend,
   - server/API route,
   - security/gating,
   - sync workflow.
4. Route to the exact runbook.
5. Call out pitfalls (channel mix-ups, wrong repo destination) early.

## Capability map

- Shared core surfaces: `apps/cli`, `packages/*` core packages.
- Optional runtime surfaces: `apps/server`, `apps/web`, `packages/ui-sdk`.
- Plugin package surfaces: `plugins/*`.
- Process surfaces: `docs/process/*` runbooks and routing docs.

## References

| Topic | File |
| --- | --- |
| Repo roles and routing | `references/repo-roles-and-routing.md` |
| Capability map | `references/capability-map.md` |
| Runbooks and workflows | `references/runbooks-and-workflows.md` |

## Summary

Use this skill to keep work correctly routed, command surfaces cleanly separated, and explanations grounded in implemented system behavior and canonical runbooks.
