# Migration Playbook (Script Or Existing Plugin)

## Objective

Convert existing behavior into canonical RAWR plugin form with minimal behavioral regression.

## Migration flow

1. Inventory existing source scripts/plugins and map behavior.
2. Choose destination channel:
   - Channel A for CLI command extension.
   - Channel B for runtime capability.
3. Preserve critical behavior first.
4. Introduce improvements behind explicit scope.
5. Add tests covering preserved behavior and intended changes.

## Mapping guide

- Existing shell/utility command -> Channel A command plugin.
- Existing server/web runtime behavior -> Channel B runtime plugin.

## Migration verification

- Old input paths still accepted where promised.
- Old expected outputs preserved unless explicitly changed.
- New docs include migration notes and known differences.
