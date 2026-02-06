# Agent Routing: Template vs Personal Repo

This file tells agents where to make changes during the `RAWR HQ-Template` / `RAWR HQ` split model.

## Modify `RAWR HQ-Template` (`rawr-ai/rawr-hq-template`) when:

- The change should apply to all downstream users.
- You are changing shared CLI contracts or command UX.
- You are changing shared packages:
  - `apps/cli`
  - `packages/core`
  - `packages/control-plane`
  - `packages/state`
  - `packages/security`
  - `packages/journal`
- You are changing template-wide scaffolding, governance docs, or baseline workflows.

## Do NOT put in template:

- Personal experiments.
- Machine-specific settings and local-only workflows.
- Project-specific plugins that are not intended for broad reuse.

## Modify personal `RAWR HQ` (`rawr-ai/rawr-hq`) when:

- The behavior is specific to one user's local HQ.
- The change is plugin-only and does not alter shared core contracts.
- The change is project/product customization not meant for all template consumers.

## Promotion Path (Personal -> Template)

1. Prove the change in personal repo.
2. Confirm it is broadly useful and not user-specific.
3. Open PR to `rawr-ai/rawr-hq-template`.
4. Update docs (`README`, `SYSTEM`, `PROCESS`, `PLUGINS`) if contracts changed.

## Quick Decision Rule

- "Will every template user benefit from this by default?" -> template.
- "Is this only for this HQ or plugin set?" -> personal repo.

## Global CLI Wiring Ownership

- Shared CLI contracts (including `rawr doctor global`) are template-owned.
- Baseline global wiring scripts (`scripts/dev/install-global-rawr.sh`, `scripts/dev/auto-refresh-main.sh`, `scripts/githooks/*`) are template baseline and should land here first.
- Downstream personal repos may keep machine-only overrides, but those are not template defaults.

## Graphite Policy

- Graphite is enabled in this template repo.
- Trunk must remain `main`.
- Use stacked branches for template/core work; keep stacks clean and close superseded PR branches after landing.
