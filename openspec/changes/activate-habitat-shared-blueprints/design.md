## Context

Habitat `0.4.2` already ships the canonical `.habitat/blueprints` bytes inside
`@habitat-ai/sdk`, but `habitat-pack.json` declares no members and the catalog
explicitly rejects a nonempty member set. Consumers therefore receive policy
files without a versioned activation path. Repository-local version 2 packets
still execute, while version 3 definitions remain source-only evidence.

Template, Magic Migration, and Civ7 currently expose three different maturity
points. Template owns the final service and resource destination law and the
public SDK/CLI. Magic has proven several useful version 2 laws against a real
application corpus. Civ still owns a historical Habitat producer and a much
larger compatibility corpus. The repositories need one shared product, not
three copies of its runtime or generic policy.

The Magic peer compared this design against exact commit
`8f40bdff34dde18680352a9b91ce7b953c385942`. A follow-up compared the current
stack tip `3cce431b6298e51b829c5564c172bfe840427398`; its relevant service law and
Jobs/Candidates implementations are unchanged, and the peer accepted the final
disposition. Its current authority is `.habitat/index.json`, its service law
still uses the predecessor router/index topology, and its hook installer
remains `scripts/dev/install-repository-hooks.sh`. Those are migration inputs,
not shared substrate authority. Template intentionally keeps named operation
and operation-group leaves under `module/router/` and one composition-only
`module/router.ts`; oRPC gives the two filesystem layouts identical runtime
semantics, while Template's form separates authorship from module composition.
Magic also confirmed that `plugin-nx` replaces no Magic `nx-workspace` overlay
and must be selected only for an actual qualified Nx-plugin instance.

The working classification is:

```text
package: definition, asset, version, provenance
repository: instance, overlay, owner, subject
application: resolution, scope, runner, result
```

## Goals / Non-Goals

**Goals:**

- Make the selected SDK policy pack the versioned authority for the six
  settled root blueprints.
- Let a repository activate those blueprints only through its own
  `habitat.toml` instances.
- Preserve exact package provenance through catalog resolution, checking, and
  Nx target hashing without copying package law into a consumer workspace.
- Promote Magic's provider-neutral resource Effect-failure law into the shared
  `resource` blueprint.
- Release one fixed `@habitat-ai/sdk` and `@habitat-ai/cli` pair and provide
  exact Magic and Civ consumer handoffs.

The tracked `service` definition is deliberately not a member of this release.
Its own authority record still marks it structure-only and without
release-pack acceptance. Omitting it is a truthful boundary, not a second
service topology.

**Non-Goals:**

- Blueprint inheritance, variants, capabilities, niches, or public-consumer
  sealing.
- Converting Magic's API, workflow, server-app, Nx, or tool overlays into a
  generic law before their generic kind and finite proof semantics are settled.
- Copying policy during initialization, retaining a second policy tree, or
  teaching consumers to invoke a repository checkout.
- Retiring all version 2 compatibility rules or mutating either consumer repo.

## Decisions

### The selected package owns reusable blueprint definitions

`habitat-pack.json` declares an ordered, unique set of exact blueprint members.
Each member path is relative to the selected npm package root and identifies a
regular `blueprint.toml` file below that root. The catalog reads the member and
its declared runner assets from that same package root and verifies that the
declared id and version equal the admitted definition.

The tracked `.habitat/blueprints` tree remains Template's authoring source and
is copied once into the SDK build. It does not become a second consumer input.
No initializer copies these files into a workspace.

Alternative considered: keep activation consumer-local through version 2
packets. That uses today's runtime, but it preserves one manually copied generic
policy implementation per repository and defeats the released SDK boundary.

### Repository authority starts at the instance

Repository discovery continues to admit local `habitat.toml` manifests and
qualified version 2 overlays. Package and local definitions are merged by
identity for the producer workspace only: an exactly equal checked-in source
definition is inert and resolves with package provenance, while a different
definition at the same id and version is rejected. This lets Template retain
the one canonical authoring tree without making copied consumer definitions an
authority.

Alternative considered: stop discovering all local definitions. That is
cleaner for consumers but would make Template unable to validate the exact
authoring source that its build publishes. Exact redundant admission keeps one
semantic owner while still detecting drift.

### Selected definitions use one project root

All six selected definitions expose only their required `project` anchor.
Source topology remains blueprint-owned inside each native structure asset:
source-specific scopes bind `project` directly and use `src/**` relative
paths. Instance manifests therefore supply only `project`, and any attempted
`source` binding is rejected as an unknown root role.

Alternative considered: retain independent `project` and `source` manifest
roots and compare them. That preserves a redundant caller value. Putting the
positive descendant path in the existing structure scope preserves released
protocol compatibility and makes redirection unrepresentable.

### Provenance is part of resolved catalog data

Blueprint records, applications, and runner assets use a discriminated
provenance value:

- `local` for repository-owned compatibility and instance data.
- `policy-pack` for SDK-owned definitions and runner assets, including package
  name, version, package root, and package-relative path.

Execution uses the already resolved absolute asset path. Nx treats only local
assets as workspace file inputs and hashes the exact public CLI/SDK dependency
closure for package assets. This prevents a package path from masquerading as a
workspace path and keeps cache invalidation native to Nx.

Alternative considered: copy package assets into `.habitat` so all paths look
local. That creates the duplicate wiring and policy authority this release is
intended to remove.

### Only one Magic law crosses the boundary now

Magic's resource Effect-failure rule is provider-neutral, operates on a
resource instance root, and does not depend on Magic product identities. Its
Grit pattern becomes a second rule of `resource@1`.

The other compared Magic laws remain local overlays and evidence for later
generic substrate kinds:

- API, async-workflow, and server-app proof structures admit open filename or
  support cabinets and depend on specialized kind composition that version 3
  does not yet express.
- Nx admission contains consumer-owned kind inventories, exemptions, provider
  identities, and tool selectors. Its eventual generic kernel needs a settled
  workspace kind rather than copied Magic tags.
- Tool topology is a useful candidate, but `tool` is not one of the settled
  released root kinds.

Importing those laws now would either weaken Template's finite proof model or
manufacture an unreviewed variant mechanism. The handoff records these exact
dispositions so neither consumer mistakes retention for a competing shared
law.

### Magic service variance remains evidence, not copied authority

The live Magic service corpus proves two missing semantic kinds for the later
service release: actor vocabularies and provider-neutral prompts. Those will be
absorbed as closed indexed model kinds. Magic's native public client binding is
also reusable evidence for the positive service client face. Template retains
the downward five-lane context funnel, required module `AGENTS.md`, indexed
model kinds, module-root `router.ts` composition, and named `router/<name>.ts`
authoring leaves. Magic's router barrels and missing package/module faces are
consumer migrations, while `helpers` remains a rejected junk-drawer kind.
Generic API, workflow, app, Nx, and tool seals belong in Habitat once each kind
is reconciled with its native vendor model. Magic's product instances,
adapters, policy, and qualified overlay rules remain Magic-local. None of those
later generic kind admissions widens this six-member activation release.

### The first active pack is a minor release

Changing `habitat-pack.json` from transport-only to executable membership is a
new public capability. The fixed SDK/CLI release group advances together to
`0.5.0`. Publication remains the existing Nx release plus npm trusted-publisher
workflow; no private release store, extra package cohort, or consumer-specific
artifact is introduced.

## Risks / Trade-offs

- **Package assets could escape their package root** -> Admit normalized member
  and runner paths, resolve their real paths, and reject any path outside the
  selected package root. This is ordinary containment, not adversarial sandbox
  machinery.
- **Producer and package copies could drift** -> Admit only exact redundant
  definitions; conflicting duplicate identity fails resolution.
- **Nx could cache across an SDK policy change** -> Hash the exact public CLI
  and SDK dependencies and exclude package asset paths from workspace inputs.
- **Consumers may expect installation alone to select every project** -> Keep
  instance creation repository-owned and make the migration prompts name every
  required manifest explicitly.
- **Deferred Magic laws may look like missed convergence** -> Record what
  generic kind variance they demonstrate while retaining the qualified Magic
  overlays locally. Later Habitat kinds absorb only the reusable seal, not the
  consumer's instances, adapters, or policy.

## Migration Plan

1. Land and verify package-member resolution plus the shared resource law.
2. Advance the fixed SDK/CLI group to `0.5.0`, merge to canonical `main`, tag,
   publish, and verify registry provenance.
3. Update Template's own public dependency pin only after registry visibility.
4. Give Magic an exact migration prompt: install `0.5.0`, initialize once,
   declare project-local instances for the six settled kinds, retain qualified
   overlays and its service law, and remove only generic copies proven replaced
   by package applications. Do not select the candidate `service` definition.
5. Give Civ an exact migration prompt after the release is consumable: remove
   the historical producer, adopt the public Nx plugin and Husky setup, convert
   admitted projects to instances, and retain unsupported local policy until it
   has a qualified destination.

Rollback is ordinary package rollback: pin the previous fixed SDK/CLI version.
Repository manifests remain data and no generated policy copy requires cleanup.

## Open Questions

None for this release. Blueprint composition, specialized kinds, and complete
version 2 retirement remain separately bounded future design work.
