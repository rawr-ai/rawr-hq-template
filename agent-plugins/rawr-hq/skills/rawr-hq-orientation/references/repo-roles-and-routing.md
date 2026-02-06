# Repo Roles And Routing

## Canonical roles

- `RAWR HQ-Template` is the upstream baseline for shared contracts and docs.
- `RAWR HQ` is the downstream personal repo for operational customization.

## Destination decision rule

Use template when change should apply broadly by default:
- shared CLI/core behavior,
- shared package contracts,
- baseline scaffolding/process docs,
- fixture/example plugin contracts.

Use personal when change is local or operational:
- project-specific customization,
- operational plugin authoring,
- machine-specific workflow behavior.

## Sources

- `AGENTS_SPLIT.md` in both repos.
- `README.md` in both repos.
- `docs/process/CROSS_REPO_WORKFLOWS.md`.

## Common routing mistakes

1. Putting shared contract changes only in personal repo.
2. Putting operational personal plugin work into template plugin space.
3. Skipping template-to-personal sync workflow after upstream changes.

## Corrective action

- Re-evaluate destination with split doc.
- Move baseline changes upstream.
- Sync template downstream via sync runbook.
