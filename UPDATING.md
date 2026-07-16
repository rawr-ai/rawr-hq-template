# Updating The Controller And Interfaces

`RAWR HQ-Template` and personal `RAWR HQ` update independently from their own
canonical `main` branches. There is no Template-to-personal Git sync workflow.

## Template Repository

Update this checkout from its own `origin`, run its repository gates, and build a
new immutable controller release. Selecting a release changes only the installed
controller selector; it does not rewrite either repository.

```bash
git pull --ff-only origin main
bun install --frozen-lockfile
bun run build
bun run test
./scripts/dev/install-global-rawr.sh
rawr doctor global --json
```

## Personal Repository

Update personal from its own `origin`. It may invoke an externally installed
Template-owned tool, but it must pin the exact schema/protocol version and artifact
digest accepted by its governed content records.

Do not add a Template remote, merge or cherry-pick Template commits, copy runtime
files, or use tree equivalence as compatibility proof.

## Interface Changes

1. Publish the versioned schema/protocol and immutable tool or artifact from Template.
2. Record the exact accepted version and digest in personal.
3. Validate personal declarative inputs with the installed Template-owned tool.
4. Promote each repository through its own review, Graphite, and `main` process.

Git commit and tree IDs may be retained as audit provenance. They are never runtime
identity, an interface version, or permission to share code.
