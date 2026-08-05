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

`habitat-pack.json` is the closed protocol-1 policy envelope. It declares
exactly six sorted members: `app@1`, `package@1`, `plugin@1`, `plugin-nx@1`,
`provider@1`, and `resource@1`. Each member points to its installed
package-relative `dist/blueprints/<id>/blueprint.toml` definition. The shipped
`service` authoring source is not a member until its portable source law and
release proof are accepted; presence in `dist/blueprints` grants no authority.

The selected SDK package owns each reusable definition, version, runner asset,
and its policy-pack provenance. A repository remains the authority for its own
`habitat.toml` instances and qualified overlays; installing the package does
not select an instance or create an application. Template's exact tracked
authoring copy is inert during resolution, while a different local definition
at the same identity is rejected as drift.

Each selected definition exposes only its required `project` anchor.
Source-specific structure scopes carry blueprint-owned `src/**` relative
paths; a caller-authored `source` binding is rejected as an unknown root role.

`resource@1` includes the provider-neutral Effect failure law promoted from
the Magic Migration evidence at commit
`8f40bdff34dde18680352a9b91ce7b953c385942`. Only its generic Grit semantics
ship: the Magic v2 rule manifest, baseline, and consumer paths are not package
members. Their exercised API, workflow, app, Nx, and tool variance informs
later generic Habitat kinds, while Magic-specific instances, adapters, policy,
and qualified overlay rules remain local.
