# `@habitat-ai/sdk`

`@habitat-ai/sdk` is Habitat's public local runtime. It composes the private
Habitat service, provider-neutral resources, concrete Node providers, and the
TypeBox Standard Schema bridge into one conventional npm product.

## Public interface

The package root exposes four names:

- `createHabitatClientForWorkspace(workspaceRoot)` constructs a Habitat client
  bound to one absolute workspace root.
- `HabitatClient` is the resulting client type.
- `standard(schema)` adapts a TypeBox 1.3.8 schema to Standard Schema and
  Standard JSON Schema.
- `TypeBoxStandardSchema` is the inferred adapter result type.

The package also exports `habitat-pack.json`, files below `blueprints/*`, and
ordinary `package.json` metadata. The blueprint files are copied during the
build directly from the repository's canonical `.habitat/blueprints` tree;
there is no second tracked authority tree in this package.

## Ownership boundary

The service, resource contracts, concrete providers, and TypeBox adapter remain
private workspace implementation owners. The SDK bundles their code and
declarations, so consumers install and import only `@habitat-ai/sdk`; their
package identities are not part of the published runtime or type interface.
Third-party libraries remain ordinary dependencies.

The SDK selects the production Node provider profile, resolves the packaged
policy envelope, and constructs a fresh client for each workspace binding. It
does not own a controller, package manager, retained store, compatibility
surface, or public implementation cohort.

`habitat-pack.json` is the closed protocol-1 policy envelope. Its member array
remains empty because this runtime version does not activate package-carried
blueprint members. Shipping the canonical generic blueprint bytes makes them
portable package assets without changing that admission behavior.
