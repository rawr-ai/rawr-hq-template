# Path E: Migrate an Ad-Hoc Script Into Plugin Form

## When to use

Use this when converting an existing script (from anywhere on disk) into a proper RAWR plugin workflow.

## Classification Decision

1. If the script should become a CLI command:
- migrate to a Channel A oclif plugin command.
- wire into CLI using `rawr plugins link ...`.

2. If the script should become runtime capability for HQ stack:
- migrate to a Channel B workspace plugin with `exports ./server` and/or `./web`.
- enable using `rawr hq plugins enable ...`.

## End-to-end Command Skeletons

### Channel A migration skeleton

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
# scaffold command plugin package per runbook
bunx turbo run build --filter=@rawr/plugin-demo-oclif
rawr plugins link "$(pwd)/plugins/cli/demo-oclif" --install
rawr plugins inspect @rawr/plugin-demo-oclif --json
```

### Channel B migration skeleton

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
rawr factory plugin new demo-runtime --kind both
bunx turbo run build --filter=@rawr/plugin-demo-runtime
rawr hq plugins enable demo-runtime --allow-non-operational --risk off
rawr hq plugins status --json
```

## Caveats

- Do not mix Channel A and Channel B command surfaces.
- Choose the channel based on behavior destination (command extension vs runtime mount).
