# Path A: Local Runtime Plugin (Channel B)

## When to use

Use this when you want a local personal plugin usable immediately in your workspace runtime, with no publish/install step.

## End-to-end Commands

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
rawr factory plugin new demo-runtime --kind both
bunx turbo run build --filter=@rawr/plugin-demo-runtime
rawr hq plugins enable demo-runtime --allow-non-operational --risk off
rawr hq plugins status --json
```

## How discovery works

- CLI scans `plugins/web/*` in the workspace.
- Enablement is persisted in `.rawr/state/state.json`.

## Caveats

- Run from inside the workspace; outside repo, workspace root discovery fails.
- Keep Channel B commands (`rawr hq plugins ...`) separate from Channel A commands.
