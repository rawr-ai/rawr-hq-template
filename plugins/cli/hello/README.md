# @rawr/plugin-hello

Sample oclif plugin shipped by `RAWR HQ-Template`.

## Local usage

```bash
./scripts/dev/install-global-rawr.sh --json
rawr plugins link "$(pwd -P)/plugins/cli/hello"
rawr hello --json
```

`hello` is intentionally external-only. The native Oclif registry stores the
absolute linked root. Removing that checkout quarantines only this extension;
the installed controller and `rawr plugins uninstall @rawr/plugin-hello`
remain available for recovery.
