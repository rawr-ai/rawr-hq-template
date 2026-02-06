# Path C: Install Published Third-Party Plugin (Channel A)

## When to use

Use this when consuming a plugin published by someone else (npm/GitHub source).

## End-to-end Commands

```bash
rawr plugins install @vendor/plugin-x
rawr plugins inspect @vendor/plugin-x --json
rawr <plugin-command>
```

## How discovery works

- Plugin is installed via oclif plugin manager.
- Installed plugin commands are added to the CLI command graph.

## Caveats

- Plugin must be packaged correctly for oclif discovery.
- This path is Channel A only (`rawr plugins ...`).
