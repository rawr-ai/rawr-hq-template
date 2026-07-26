# @rawr/plugin-workstream

CLI projection of the `@rawr/workstream-frame` service.

```bash
rawr workstream open s1 --boundary specified --boundary reviewed --boundary verified
rawr workstream admit s1 a --title "Ship the thing" --tag specified
rawr workstream push s1
rawr workstream resolve s1 'a~needs-reviewed'
rawr workstream inspect s1 --at 3
```

Set `--ledger-url` or `FLUREE_URL` to point at a Fluree server
(`podman run -d -p 8090:8090 docker.io/fluree/server:latest`).
