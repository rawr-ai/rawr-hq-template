# Path D: Global CLI Owner + Workspace Runtime Plugin

## When to use

Use this when you want plain `rawr` globally and also want to author/use workspace runtime plugins from the same checkout.

## End-to-end Commands

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
./scripts/dev/activate-global-rawr.sh
rawr factory plugin new demo-global --kind both
bunx turbo run build --filter=@rawr/plugin-demo-global
rawr hq plugins enable demo-global --risk off
```

## How discovery works

- Global `rawr` binary points to the activated checkout (`~/.bun/bin/rawr` symlink).
- Channel B still discovers plugins from workspace `plugins/*` and persisted state.

## Caveats

- If your current working directory is outside the workspace, Channel B commands cannot find workspace root.
- Global owner activation is explicit; do not assume branch switches change owner automatically.
