# CLI Build Paths

## Goal

Provide all supported ways to run/build/install the CLI, with exact commands and expected effects.

## Notation

All commands below are captured from the current working model and should be used as-is unless your checkout path differs.

## Path 1: Repo-local dev run

Use when you are developing in a checkout and do not need global install.

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
bun run rawr -- --help
bun run rawr -- <command>
```

Effects:
- Uses repo-local CLI entrypoint.
- Writes only what the invoked command writes.

## Path 2: Repo-local compile/build gate

Use before commit/PR or when validating full workspace build outputs.

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
bun run build
# or CLI-only
bun run --cwd apps/cli build
```

Effects:
- Produces `dist/**` outputs across apps/packages.

## Path 3: Global CLI from local checkout (explicit owner activation)

Use when `rawr` should resolve globally to this checkout.

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq
./scripts/dev/activate-global-rawr.sh
rawr doctor global
```

Effects:
- Updates `~/.rawr/global-rawr-owner-path`.
- Rewrites `~/.bun/bin/rawr` symlink to this checkout's `apps/cli/bin/run.js`.

## Path 4: Distributed/global CLI from package registry

Use when consuming a published CLI package, not local source.

```bash
# generic path if published
bunx @rawr/cli --help
# or global package-manager install path if used by consumers
```

Effects:
- Uses package-manager global/bin installation path.

## Caveats

1. Global `rawr` owner is explicit; it is not implicit "last checkout wins".
2. If Bun is missing from PATH, global wrapper will fail to launch (`run.js` shells out to `bun`).
