# Updating The CLI And Interfaces

`RAWR HQ-Template` and personal `RAWR HQ` update independently from their own
canonical `main` branches. There is no Template-to-personal Git sync workflow.

## Template Repository

Update this checkout from its own `origin`, install the locked dependencies, and
run the repository-owned Nx gates. Use the repository-local Oclif development
command when working from source:

```bash
git pull --ff-only origin main
bun install --frozen-lockfile
bun run build
bun run test
bun run rawr -- --version
```

The fixed Habitat Nx Release group contains exactly `@habitat-ai/sdk` and
`@habitat-ai/cli`. Version `0.4.1` is the current published release of the
reusable substrate and its Oclif entrypoint through ordinary package
dependencies and installed-package acceptance;
internal RAWR services, resources, plugins, and applications remain private
workspace projects. The `@habitat-ai/rawr` Oclif application uses the
repository-local command above until its own conventional release is complete.
Do not restore the removed custom installer, selector, release store, or launcher.
A previously installed custom distribution may remain executable on a workstation,
but it is obsolete, is not updated, and is not authority for development or
acceptance.

## Personal Repository

Update personal from its own `origin`. Once the ordinary Template-owned CLI
package is published, personal may invoke that externally installed tool at an
exact package and schema/protocol version accepted by its governed content
records. Until then, installed-package cross-repository settlement remains
pending; do not substitute a checkout link or the retired custom distribution.

Do not add a Template remote, merge or cherry-pick Template commits, copy runtime
files, or use tree equivalence as compatibility proof.

## Interface Changes

1. Publish the versioned schema/protocol and ordinary CLI package from Template.
2. Record the exact accepted package and interface versions in personal.
3. Validate personal declarative inputs with the installed Template-owned tool.
4. Promote each repository through its own review, Graphite, and `main` process.

Git commit and tree IDs may be retained as audit provenance. They are never runtime
identity, an interface version, or permission to share code.

See [[docs/process/CROSS_REPO_WORKFLOWS]] for the repository boundary and
[[docs/process/HQ_USAGE]] for current development commands.
