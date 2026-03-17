# Path A: Local Runtime Plugin (Channel B)

## When to use

Use this when you want a local personal plugin usable immediately in your workspace runtime, with no publish/install step.

## End-to-end Commands

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
rawr factory plugin new demo-runtime --kind both
bunx nx run @rawr/plugin-demo-runtime:build
rawr plugins web enable demo-runtime --allow-non-operational --risk off
rawr plugins web status --json
```

## How discovery works

- CLI scans `plugins/web/*` in the workspace.
- Enablement is persisted in `.rawr/state/state.json`.

## Caveats

- Run from inside the workspace; outside repo, workspace root discovery fails.
- Keep Channel B commands (`rawr plugins web ...`) separate from Channel A commands.
