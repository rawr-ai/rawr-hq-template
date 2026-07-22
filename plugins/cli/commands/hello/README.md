# @rawr/plugin-hello

Sample oclif plugin shipped by `RAWR HQ-Template`.

## Local usage

```bash
bunx nx run @rawr/plugin-hello:build
rawr plugins link --no-install "$(pwd -P)/plugins/cli/commands/hello"
rawr hello --json
```

`hello` is intentionally external-only. The native Oclif registry stores the
absolute linked root. Removing that checkout makes only this extension
unavailable; the installed RAWR CLI remains independently manageable.
