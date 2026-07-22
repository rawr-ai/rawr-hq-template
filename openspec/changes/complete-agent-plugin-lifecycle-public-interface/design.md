## Context

RAWR HQ-Template `main` at
`b7a98c567f4519e5d84229fafacd0a4179875c9c` contains a working native-provider
agent-plugin lifecycle service wrapped in a custom CLI distribution and custom
Oclif extension manager. The installed distribution manifests 18,568 entries,
is approximately 238 MiB per retained release, and selects among retained local
copies through a digest pointer. Those properties were never necessary to keep
CLI execution independent from a source checkout.

The accepted packet remains provenance at Personal commit
`cc631f60c9254802be647d66662823ae47d5e7db`, project tree
`97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`. The repository-separation
correction remains controlling at Personal commit
`43a49d48ab6c6a29b4877f20576b42b533fc82ba`, blob
`10bb040317d62834806b86b36a3a14f13c539fbc`. Neither identity authorizes
Template implementation in Personal or a custom Template distribution.

The categorical correction and working vocabulary are in
[[authority-amendment]].

## Architecture

```text
                         RAWR HQ-Template

  source -> Nx build/release -> conventional Oclif package -> `rawr`
                                                           /       \
                                               `rawr plugins`   `rawr agent plugins`
                                                     |                 |
                                          @oclif/plugin-plugins    oRPC lifecycle
                                                                       |
                                                           closed Personal release input
                                                                       |
                                                   exact Git objects -> in-memory release model
                                                                       |
                                                       in-memory provider projection
                                                                       |
                                                     native Codex / Claude commands
                                                                       |
                                                            explicit provider home

                         Personal RAWR HQ

  curated content + provenance + policy/evaluation + governed records
```

The wires stay visible. The CLI app composes Oclif plugins. Command plugins
project CLI input/output onto public service clients. Services own domain
behavior. Resources expose host capabilities. Providers implement those
capabilities. Nx builds and releases the components. Habitat constrains their
topology.

## Decisions

### Oclif owns the CLI

`apps/cli` has one ordinary entrypoint and one binary declaration. Development
invocation and packaged invocation run the same Oclif application. Core
first-party plugins are declared in `package.json#oclif.plugins`. The official
`@oclif/plugin-plugins` package is a core plugin and directly owns install,
update, remove, link, and list for external Oclif extensions.

RAWR does not disable Oclif user/dev/JIT loading and reconstruct it through a
second registry. It does not wrap official plugin commands in local command
classes. `rawr plugins` is externally extensible CLI mechanics; it never selects
curated agent content.

The command root used for TypeScript development and the compiled command root
used for packaging are explicit. Each Oclif package owns its discovery
configuration and may emit its own `oclif.manifest.json` cache. Generated
manifests are build artifacts, not core-membership declarations or runtime
authority records.

### Nx owns build and release

Nx projects declare build, lint, typecheck, behavior test,
generated-manifest, and package targets. Top-level `nx.json#release`
configuration defines the coherent runtime project group; `nx release` owns
versioning and changelog, and `nx release publish` owns npm publication when npm
is selected. If standalone archives are selected, Oclif's pack command creates
them and the release workflow publishes them. The first replacement package may
require an installed Bun runtime because surviving runtime code uses Bun-only
APIs.
That yields a conventional package with a Bun hashbang, not a custom runtime
store.

Oclif's Node-bearing standalone archives become eligible only after the
surviving CLI closure is proven Node-compatible. A Bun compiled executable is a
separate bounded feasibility option only if Oclif plugin discovery and native
extension loading behave unchanged. Neither option permits a local selector,
retained private release store, or per-file runtime envelope.

Release integrity is artifact-level: ordinary checksums, repository release
provenance, package inventory, generated-manifest validity, and installed-command
equivalence. Per-file hostile-local-tamper attestation and custom archive
canonicalization are out of scope.

### Habitat owns positive architecture policy

Habitat `structure.toml` files declare closed valid topologies. Grit patterns
declare source relationships. Nx declares project imports, task dependencies,
inputs, outputs, and release ordering. Behavior tests remain behavior tests.

The generic source begins with Magic Migration commit
`31c4e1ac1944d88b5ae867e46603eddff36142fc`:

- service spine and module topology;
- service contract and oRPC relationship authority;
- `ORPCTaggedError` placement;
- API server plugin boundary;
- agent-router placement and shape.

The service topology is adapted once to admit either a single `router.ts` or a
closed `router/` directory composed by the module `router.ts` boundary. Magic's
current Collect source already needs that form, so copying its older
single-file-only constraint would encode a known contradiction.

RAWR adds generic Oclif app and command-plugin blueprints. These assert the
kind's valid axes, not a list of retired filenames. A broad universal “plugin”
rule is not invented without a stable common corpus.

The compiled Habitat binary stays pinned to the already-adopted Civ7
`habitat-sdk-v0.1.1` release built with Bun 1.4.0. Unreleased Civ7 SDK changes
are not vendored or claimed. A later published artifact can update through the
existing provenance and checksum recipe.

### Required checks follow the Nx graph

The repository required result remains non-skippable for the candidate
revision. Its implementation stops running every project sequentially on every
local push.

Cacheable lint and typecheck targets use Nx inputs and affected-project
scheduling. Habitat policy runs once against the live candidate tree and is not
cached when live filesystem state matters. The required CI job depends on both
and publishes one stable status. Local hooks provide fast feedback; remote
branch protection remains merge authority.

### One oRPC service owns curated lifecycle behavior

`services/agent-plugin-lifecycle` remains one service with bounded modules. Its
root composes contracts, ready host dependencies, implementation, and routers.
Each module owns its contract, router procedures, and
`model/{dto,policy,schema}`. Domain behavior lives in procedure handlers and
module policy, not an `internal/` implementation tree.

TypeBox schemas are the sole public structural schema and generated-type
authority. Procedure handlers canonicalize ordering, compute digests, and
enforce cross-field domain rules after structural validation. They do not
manually recreate closed-object parsing.

Root context contains only ready host capabilities that are genuinely
cross-cutting. Module middleware acquires or projects owner-specific
capabilities, and each procedure receives only the exact context it consumes.
Leaf modules do not import sibling internals or concrete resource providers.
Effect/Platform programs terminate inside resource adapters and expose ready
capabilities. Effect-oRPC is used only when an Effect program genuinely crosses
the procedure boundary, not merely because an adapter uses Effect internally.

The surviving filesystem/process resource family migrates coherently to Effect
4 only after controller authority, persistent artifact/projection state, target
records, and other rejected owners are deleted. The lifecycle service itself
has no direct Effect dependency and is not made Effectful to justify the
upgrade. At migration opening, re-query the official Effect 4 line and pin one
exact aligned `effect` and `@effect/platform-node` release; remove
`@effect/platform`, whose filesystem, path, platform-error, and process
capabilities moved in Effect 4. Keep the oRPC family upgrade separate. TypeBox
remains the public schema authority, and Effect-oRPC remains absent unless an
Effect program actually crosses a procedure boundary.

The canonical public product operations are:

- `status`: inspect selected membership and explicit native state without
  mutation;
- `sync`: reconcile one selected complete set into explicit Codex and Claude
  homes through native commands.

`test` remains a release-maintainer and CI capability for targeted or complete
verification in explicit disposable homes. It returns bounded inline target
observations and persists no receipt, identity sidecar, or custom evidence
artifact. Repository check, release-input generation, packaging, and vendor
update remain only when their owner-local consumer is confirmed. No adjacent
operation authorizes channel selection or installed state.

### Native providers own mutation mechanics

The lifecycle service computes the exact desired delta. Thin resource providers
invoke native Codex and Claude commands and return bounded observations. RAWR
does not write provider caches or configuration directly and does not infer
provider homes by scanning.

The desired set is closed. RAWR-managed omitted members are removed, including
native enablement/configuration residue. Unmanaged or ambiguous collisions
block. A stale same-ID selected member performs the native remove/add transition
needed for active provider visibility. Partial failure returns the exact applied
prefix; retry starts from a fresh native inspection rather than rollback state.

A converged repeat may inspect live state but invokes no mutating native command
and writes no lifecycle-owned state.

### Derived artifacts do not become competing authority

The stable wire between reviewed Personal content and provider reconciliation is
the exact repository identity, commit, tree, and release-input digest in the
reviewed channel record. The content-workspace resource reads immutable Git
objects at that selection. The service derives the closed release model,
ownership index, and provider projection in memory. Release-set and projection
digests may be computed as invocation-local verification values, but they are
not recorded by Personal and never become local storage handles.

Status does not materialize provider package bytes. Sync first compares derived
identity with live provider provenance. Canonical mutation passes the selected
immutable Personal Git marketplace to the provider's native command, and the
provider owns its snapshot below the explicit home. A local marketplace is
test-only and shares one bounded lifetime with its disposable home. No
Template-owned persistent release/set store, projection store, publication
index, or retention planner participates in the next invocation.

Generated manifests, ordinary command results, and caches may exist when they
have a concrete product consumer. Their classification is explicit:

- a release-set or projection digest is an invocation-local derived verification
  value, not channel authority;
- a native-provider snapshot is provider-owned installed support state;
- a disposable local marketplace is transient test material with the same
  lifetime as its disposable home;
- a test result retained by the caller or ordinary CI/release tooling is
  external evidence, never lifecycle state;
- a publication index or cache is recomputable mechanics;
- only the Personal channel record selects desired content;
- only native provider observation reports installed provider state.

No derived object silently becomes a prerequisite for a later canonical sync.
Controller digests, target receipts, and CLI-install identity are absent from
channel authority. Test observations are returned inline; the lifecycle owns no
test record, attestation, or evidence store.

### Repositories remain independent

Template owns executable code and generic tooling. Personal owns curated
content and its governed content records. Template reads Personal through an
explicit content workspace and versioned record schemas. It does not share Git
ancestry, executable paths, worktree identity, or release tooling with Personal.

Personal CI may invoke an ordinarily installed released RAWR CLI. It does not
pin a controller selector or vendor Template implementation. Once useful
Personal-only content and records are preserved, remaining Template-derived
code and process machinery are deleted from Personal rather than synchronized.

### Protected lanes remain excluded

HF01 remains pending. The candidate is nested beneath the legitimate Personal
`dev` plugin, so excluding a top-level member is insufficient. Personal's
content policy MUST prove that the selected canonical tree and release input
exclude the exact protected skill identities and payload-relative prefixes
`skills/inngest/**`, `skills/effect-inngest/**`, and
`skills/inngest-orpc/**`, plus the declared research/tool candidate roots. No
refresh, packaging, projection, provider test, release, or settlement operation
reads or mutates them. Template does not add an Inngest mode; the newest
Personal-worktree Inngest skill is a review lens for compatibility only.

The custom controller currently filters Inngest out of its packaged dependency
closure. That filter is deleted rather than transplanted. The conventional CLI
package graph MUST truthfully exclude server/workflow/Inngest runtime packages;
if shared `@rawr/hq-sdk` dependency metadata changes, the legitimate
`apps/server` Inngest runtime receives its own typecheck and behavior tests.

The queued oRPC corrective skill release remains downstream of this
normalization and the first `cognition:state-machine-design` settlement. It does
not widen this change.

## Deletion Order

1. Land the corrected record and positive Habitat/Nx architecture ratchet.
2. Restore ordinary Oclif development execution and direct external extension
   management.
3. Add and smoke-test conventional package/release output in a disposable
   prefix.
4. Remove lifecycle dependence on controller identity and directories.
5. Delete the custom distribution, selector, extension manager, diagnostics,
   and their tests/workflows.
6. Simplify the lifecycle service and surviving resources behind stable public
   behavior.
7. Recut Personal content records and required checks around the released CLI.
8. Run disposable-home and approved-home convergence, then the read-only repeat.
9. Archive superseded records and drain owned stacks/worktrees.

The replacement precedes deletion only where it prevents loss of the working
CLI. No compatibility layer connects the two models.

## Rejected Alternatives

- **Simplify the custom controller:** rejected because the ownership model is
  wrong, not merely too large.
- **Bundle the whole Oclif closure into a new Bun binary immediately:** rejected
  until direct Oclif plugin discovery and extension mechanics are proven.
- **Use Oclif standalone Node archives immediately:** rejected until Bun-only
  first-party command dependencies are removed or isolated.
- **Restore the old mixed agent sync service:** rejected because its command
  ownership and direct provider writes were wrong; only useful behavior and
  tests may be mined.
- **Delete ordinary CI evidence or provider manifests with the lifecycle
  stores:** rejected. Standard-tool output remains with its real consumer, while
  the lifecycle-owned release, projection, receipt, and evidence stores are
  deleted.
- **Make Personal equivalent to Template:** rejected; repository independence is
  a product boundary.

## Related

- Controlling frame: [[authority-amendment]].
- Change proposal: [[proposal]].
- Execution sequence: [[tasks]].
- Live record: [[README]].
