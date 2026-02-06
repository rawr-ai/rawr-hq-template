# Path B: Local Command Plugin + Link (Channel A)

## When to use

Use this when you want a plugin-provided CLI command available through your local/global `rawr` plugin manager without publishing.

## End-to-end Commands

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
# scaffold command plugin package per runbook
bunx turbo run build --filter=@rawr/plugin-demo-oclif
rawr plugins link "$(pwd)/plugins/demo-oclif" --install
rawr plugins inspect @rawr/plugin-demo-oclif --json
rawr demo-hello
```

## How discovery works

- oclif plugin manager stores the linked plugin as a user plugin.
- command discovery comes from plugin manifest (`oclif.commands`) + built `dist/src/commands/*`.

## Caveats

- Link/install step is mandatory for Channel A.
- Build output must exist and manifest paths must match or commands will not appear.
