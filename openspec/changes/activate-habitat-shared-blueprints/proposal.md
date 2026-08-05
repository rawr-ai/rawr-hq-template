## Why

Habitat `0.4.2` distributes generic blueprint files but leaves its policy-pack member set empty, so consumers cannot select those definitions without recreating local authority. The package must become the single versioned authority for shared blueprint definitions while each repository remains the authority for its own instances and qualified overlays.

## What Changes

- Resolve the exact blueprint definitions and rule assets declared by the selected `@habitat-ai/sdk` policy pack, with package provenance and no workspace copy step.
- Keep repository `habitat.toml` manifests as the only instance-selection authority. An exact checked-in copy of a package definition is inert; a conflicting duplicate is rejected.
- Keep `project` as each selected blueprint's sole root and express source topology through blueprint-owned `src/**` structure paths, rejecting caller-authored source redirection.
- Activate the six settled root blueprint kinds already owned by Template and add Magic Migration's provider-neutral resource Effect-failure law to the `resource` definition.
- Record the API-plugin, async-workflow, server-app proof, Nx-admission, and tool-law comparison without importing consumer paths, open proof cabinets, product tag inventories, or an unimplemented kind-composition model.
- Keep the service definition candidate-only until its portable source law and finite release proof are accepted; do not turn shipped authoring source into package authority.
- Preserve Template's settled service topology, `api.ts` API face, module-root router composition, closed model kinds, and package-owned Husky initialization.
- Exclude blueprint variants, new specialized kinds, product instances, Magic/Civ paths, legacy rule copying, concrete Inngest realization, and public-consumer sealing from this change.
- Release the resulting fixed SDK/CLI pair through the ordinary Nx and npm path, then hand Magic Migration and Civ7 exact consumer migrations.

## Capabilities

### New Capabilities

- `habitat-shared-blueprint-resolution`: Exact package-owned blueprint admission, repository-owned instance resolution, generic-law composition, and installed-consumer behavior.

### Modified Capabilities

None.

## Impact

- Habitat catalog schemas, resolution policy, runner-asset provenance, Nx projection inputs, and installed-package acceptance.
- Template-owned generic blueprint definitions and their structural or Grit assets.
- `@habitat-ai/sdk` and `@habitat-ai/cli` fixed-group release metadata and live release documentation.
- Magic Migration and Civ7 migration guidance; neither consumer repository is mutated by this change.
