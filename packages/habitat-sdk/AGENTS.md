# Habitat SDK Package Router (`@habitat-ai/sdk`)

## Purpose

- Ship Habitat's public local runtime as one conventional npm SDK.
- Bundle the private service, resource, provider, and TypeBox adapter owners
  behind one small public client surface.
- Transport the repository's generic Habitat blueprint bytes from the canonical
  `.habitat/blueprints` tree as generated package assets.

## Scope

- Applies to `packages/habitat-sdk/**`.

## Boundaries

- The public root exports only `createHabitatClientForWorkspace`,
  `HabitatClient`, `standard`, and `TypeBoxStandardSchema`.
- Low-level service constructors, resource contracts, provider factories, and
  implementation package identities stay private and must be bundled out of
  both JavaScript and declarations.
- Third-party runtime libraries remain ordinary npm dependencies.
- The SDK owns production Node composition, but no controller, package manager,
  retained store, compatibility export, or public implementation cohort.
- Blueprint assets are copied only at build time. Do not create a second
  tracked blueprint tree below this package.

## Behavior

- Each client construction resolves one absolute workspace root over the ready
  Node provider profile and the SDK's packaged policy envelope.
- `HABITAT_COMMAND_TIMEOUT_MS` retains the production integer range of 1 through
  600000 milliseconds and defaults to 600000.
- Production invokes the published JavaScript command entrypoint from the exact
  pinned `@getgrit/cli` package directly on POSIX so its vendor-owned Node shebang
  selects the runtime. Windows invokes the same entrypoint through PATH-resolved
  Node. The vendor command owns native acquisition when a consumer package
  manager has not run dependency install scripts.
- The TypeBox bridge retains TypeBox 1.3.8 as its sole validation authority.
- `habitat-pack.json` is the closed protocol-1 policy envelope. Its exact sorted
  member set is `app@1`, `package@1`, `plugin@1`, `plugin-nx@1`, `provider@1`,
  and `resource@1`. The positive `service@1` root definition is copied as an
  unselected candidate until its portable source rules, native Nx generator,
  and packed-consumer construction proof land with pack admission; shipped files
  are not members merely by being present.
- The selected package owns reusable definitions, versions, runner assets, and
  policy-pack provenance. Repository manifests alone select instances and
  qualified overlays remain repository-owned.
- Each selected definition exposes only its required `project` anchor;
  source-specific structure scopes carry blueprint-owned `src/**` paths.

## Flow

- `src/index.ts` composes the private service and concrete Node providers into
  the public workspace-bound client.
- `tsdown` bundles workspace implementation owners into `dist` and leaves only
  declared third-party dependencies external.
- The build copies `.habitat/blueprints` into `dist/blueprints` without
  modifying the canonical authoring source. Exact producer definitions resolve
  as inert duplicates of the package authority; drift at the same identity is
  rejected.

## Interfaces

- Public runtime: `@habitat-ai/sdk`.
- Public assets: `@habitat-ai/sdk/habitat-pack.json` and
  `@habitat-ai/sdk/blueprints/*`.
- Ordinary package metadata: `@habitat-ai/sdk/package.json`.

## Routing

- [[../AGENTS|Packages router]]
- [[../../services/habitat/AGENTS|Private Habitat service authority]]
- [[../../resources/rule-evaluation/AGENTS|Private rule-evaluation resource]]
- [[../../resources/source-inventory/AGENTS|Private source-inventory resource]]
- [[../../packages/typebox-adapter/AGENTS|Private TypeBox adapter]]

## Validation

- Run `bunx nx show project @habitat-ai/sdk --json` and confirm its package root,
  public npm tag, and build inputs.
- Run `bunx nx run @habitat-ai/sdk:typecheck` and
  `bunx nx run @habitat-ai/sdk:build`.
- Inspect `dist/index.js` and `dist/index.d.ts` for private workspace package
  names, and inspect the packed tarball for `dist/blueprints`.
