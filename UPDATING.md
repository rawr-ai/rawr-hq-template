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
repository-local command above; releasing that private application is outside
this workstream.
Do not restore the removed custom installer, selector, release store, or launcher.
The predecessor distribution, global alias, and legacy `@rawr/cli` data root
are absent. Development and acceptance have no installed-RAWR fallback.

## Personal Repository

Update personal from its own `origin`. Task 6.4 must replace Personal's current
controller/Civ7 checks with repository-owned content validation and installed
`@habitat-ai/cli@0.4.1`. Until that lands, the predecessor checks are not
accepted authority. Template performs lifecycle acceptance against explicit
Personal Git records from its own exact revision; do not install the private
`rawr` application into Personal or substitute a checkout link or retired
custom distribution.

Do not add a Template remote, merge or cherry-pick Template commits, copy runtime
files, or use tree equivalence as compatibility proof.

## Interface Changes

1. Publish reusable Habitat schema and tooling interfaces from Template.
2. Record the exact accepted interface versions in personal where consumed.
3. Validate Personal declarative inputs with repository-owned checks.
4. Run Template lifecycle acceptance against explicit Personal Git records.
5. Promote each repository through its own review, Graphite, and `main` process.

Git commit and tree IDs may be retained as audit provenance. They are never runtime
identity, an interface version, or permission to share code.

See [[docs/process/CROSS_REPO_WORKFLOWS]] for the repository boundary and
[[docs/process/HQ_USAGE]] for current development commands.
