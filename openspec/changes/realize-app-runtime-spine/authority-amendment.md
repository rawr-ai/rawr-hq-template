# Runtime Source Authority Amendment

## Purpose

This amendment records which exact source governs each part of
[[design|the runtime-spine design]]. It prevents a visible checkout, a newer
whole file, or an older project draft from silently replacing section-level
authority.

## Reviewed Normative Parent

The reviewed canonical Habitat authority landed on `main` at merge commit
`f920232efbcb10cc4a7220e3b6be4b81a393009d`. This execution record landed
directly above it at `7457505fc5dc068c1ff80a06ca78f713ebe3a954`.
The earlier candidate branch, source commit, and two canonical blob identities
recorded by task 1.1 remain ordinary Git provenance, not alternate authority.

The landed authority's canonical files are
`docs/system/HABITAT_ARCHITECTURE.md` and
`docs/system/HABITAT_RUNTIME_REALIZATION.md`. The predecessor Rawr-named project
paths are provenance pointers only and cannot satisfy the two blob checks.

The landed authority reconciles the frozen runtime lineage with the accepted
Habitat identity, public SDK and CLI boundaries, app and entrypoint law, CLI topic
topology, TypeBox adaptation, resource/provider public-face law, and the
repository boundary between the Habitat platform and downstream products. Its
contents on canonical `main` are the complete normative input to this OpenSpec.
Branch names, transient restack commits, and byte comparison do not create a
second authority.

Habitat is the platform, substrate, runtime, and architecture law. Rawr is an
independent downstream product, not a reference application housed in Habitat.
`apps/habitat` is Habitat's self-hosted realization for non-core platform
capabilities, not a peer product or a second platform identity. `packages/core`
is reserved exclusively for Habitat core. Before separation, Habitat MAY land
only the bounded non-live `runtime-schema` adaptation and public service/CLI
interfaces required to compile the destination projects. Before any other
private runtime implementation begins, the repository MUST classify every
current capability, move the proven Rawr closure to the independent Rawr
repository, move retained Habitat capabilities to their exact platform owners,
and delete all product, dead, and mixed source from Habitat. No `apps/rawr` path
or other compatibility app may be created in Habitat. Marketplace remains the
separate curated-content repository; it does not become the Rawr application
repository.

## Frozen Runtime Authority

The lineage from `d4acaa7f8d1235ad2e0dbf7675aefc500b50e03d` through
`a1e6e4c6714b293c910858cb850a157ffbc24db6` remains authoritative for:

- the seven realization phases and their qualified artifacts;
- compiler, bootgraph, Effect kernel, and process-runtime ownership;
- execution registry and execution-runtime ownership;
- adapter lowering, harness mount/stop, and observation boundaries.

The frozen architecture provenance blob is
`2961da490b026d39f5458d1174ff8ba0d373b0ab`. The frozen runtime provenance blob is
`c6f475ccc09b1d629ed746f3fbb0cc55baf8b9ee`.

These frozen identities establish source provenance. Where their older Rawr
platform naming or illustrative source topology conflicts with the reviewed
normative parent, the reviewed parent governs.

## Later Applicable Amendments

The following later landed sources supersede only the named frozen clauses:

1. Commit `944476991056fd58abb929780c4e2d3c990b93c8` contributes the admitted
   resource/provider law. A resource package owns one provider-neutral root
   face, providers belong to a closed nested family with direct public faces,
   and neither the contract face nor resource imports a provider
   implementation. Habitat blueprints own concrete filenames and export maps.
2. The same commit makes `providerSelection({ resource, provider, config })` a
   core-definition operation exposed by the terminal SDK and used by app profiles. Resource-owned
   selector wrappers and provider catalogs are not authorities.
3. Provider-specific configuration schema and decoding belong to the provider,
   while the neutral resource contract remains provider-independent.
4. The closed private runtime inventory contains only named capability owners.
   Reusable runtime machinery stays with the owner whose invariant it
   implements, and concrete providers remain resource provider projects.
5. Commit `53184506445dd2155687b0d89e843e1e10331a4b` establishes the app/profile
   selection mechanics that Habitat uses for self-hosting and downstream apps
   use for product realization. It does not make Habitat a peer product.
6. Commit `b7ffb43731b1dfb462c4f845722e6b590744b938` establishes the
   `@habitat-ai/cli` executable identity.
7. Commit `950cba6af559c727b03d23502fec572a878b59be` supersedes the separate
   blueprint-package proposal: `@habitat-ai/sdk` is the sole public runtime and
   authoring distribution, while `@habitat-ai/cli` is the separate public Oclif
   executable package.
8. The later closed test-artifact ownership law is admitted: tests remain with
   their semantic owner and no generic support, helper, or runtime directory
   becomes a destination.
9. Generic reusable runtime resources and providers belong to qualified Habitat
   owners. A downstream profile may select and configure released versions but
   does not own their contracts or implementations. Product-specific resources
   and providers remain product assets governed only in shape by Habitat law.
10. `@habitat-ai/cli` owns foundational Habitat commands, native Oclif plugin
    mechanics, initialization, generators, and self-host projections. At the
    initial separation gate, the Rawr CLI owns the ChatGPT corpus,
    Hyperresearch, and session-intelligence domain topics that survive its
    owner-local review. A later Rawr product topic requires a separate
    owner-local admission after its released Habitat prerequisites exist. A
    common Oclif loader or current repository path transfers no topic ownership.
11. Rawr application identity and composition belong only in the independent
    Rawr repository. The current `@habitat-ai/rawr`, `@rawr/hq-app`,
    `@rawr/server`, and `@rawr/web` identities are migration inputs, not
    destinations in either repository.
12. `@habitat-ai/cli` exposes one import-safe Oclif host entrypoint for
    downstream private Oclif apps. That host supplies loading and native harness
    mechanics but selects no Habitat or Rawr topic; each app definition retains
    topic membership authority.

These amendments change placement and selection ownership; they do not change
the frozen realization phases or authorize a second runtime.

## Explicit Rejections

- A root `plugins/cli/commands/*` projection lane is rejected. A selectable
  CLI plugin is a topic under `plugins/cli/topics/<topic>`; its individual
  Oclif command surfaces live beneath that topic's `commands/` member.
- Promoting a Rawr command, service, resource, provider, or plugin into Habitat
  by renaming it is rejected. Generic Habitat ownership requires an actually
  reusable platform capability and a qualified platform destination.
- Preserving `@habitat-ai/rawr-hq-sdk`, `@rawr/runtime-context`, `@rawr/ui-sdk`,
  or `@rawr/test-utils` as renamed aggregate/support authorities is rejected.
  Their useful parts move to the exact Habitat or Rawr owner in the destination
  ledger, and each predecessor package disappears after its last reader moves.
- A separate `@habitat-ai/blueprints` package is superseded and MUST NOT return.
- Habitat initializer, hook, pack-resolution, and version-coexistence mechanics
  remain owned by their existing lifecycle record and are not redesigned here.
- Unreviewed branch copies and stale canonical documents are not whole-file
  replacements for the exact reviewed normative parent.

## Generic Law And Downstream Products

Habitat kinds, core owners, public interfaces, phase handoffs, lifecycle
guarantees, and kind-identifying topology are normative. The Habitat self-host
demonstrates that non-core platform capabilities obey those same contracts.
Downstream products consume released Habitat interfaces and own their ids,
selected providers, plugin membership, config sources, role sets, deployment,
and executable bodies. This OpenSpec does not define a Rawr reference app.
Only the proven ChatGPT corpus, Hyperresearch, and session-intelligence domain
services and topics enter the initial finite source migration. Later stack-only
Rawr product capabilities, including workstream and research experimentation,
may enter only through separate Rawr owner-local admission after their released
Habitat prerequisites exist; they are not part of the initial separation gate.
Application composition is governed by the Rawr repository's owner-local
OpenSpec after separation. Services own domain semantics, apps own composition,
plugins own projection, and Habitat owns the execution grammar and
handoffs.

## Experiment Admission

The latest applicable Runtime Realization Lab is commit
`3147acbdcdd916883cee5b081c0868e3d1bf09b9`, whole tree
`7fff3eaf6d80a4609dd0d511696212a38133753d`, with
`tools/runtime-realization-type-env` subtree
`d35cd11d21abf6831947a57638cbd7de8035bf0d`. Later changes are vendor,
tooling, or policy maintenance rather than a newer realization experiment.
Only admitted algorithms and behavior fixtures may be ported; its public types,
package topology, Oracle APIs, and runtime ownership are not authority. The live
tool project is classified `delete`; the frozen commit remains provenance for
later owner-local ports.

## Magic Migration Admission

Magic Migration is implementation evidence, not product or specification
authority. Its repository is
`/Users/mateicanavra/Documents/.nosync/DEV/magic-apply/magic-migration`.
Clean `main` at `4e2f5d63e964f8299a25172ece4d5d38f6f18655`, tree
`88f0f24e98ba057c43f5aa6e93de4c7a510c0b11`, is the stable blueprint snapshot.
The latest applicable committed implementation is
`c4d9aa83917c303510f9621494dd9c7e6933587a`, tree
`f062e173a14d787fc43adfa9c7061f605b6074ea`, on
`codex/activate-assistant-led-submission` in worktree
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-cleanup-organization-slice`.
That worktree is dirty, so only the exact commit object is admitted.

At that commit, the relevant generic blueprint subtrees are app
`45b5bc60b5be2f2a986adc8ea923c3b9a2096a8b`, app-server
`b5d3b7c20e639b5d152a0d5596870bfde62765b7`, plugin-server-api
`c7885833f4066820a9413c0ffed37d50decf2499`, service
`e360635137cb3901fe4d99423773043bcf949491`, resource
`878fda04025362ba0d09b01f2dfcdc0eb2ed9dd1`, and provider
`218afe721e58774f56af2b9a0d40fefb3d068dc1`.

Admitted evidence is limited to its abstract app package, composer, entrypoint,
and runtime-boundary separation; five service context lanes and module
narrowing; one implementer lineage and base-rooted native middleware; direct
resource/provider faces; root `Effect.scoped` lifetime; provider-local
`Effect.acquireRelease`; typed failures; interruption; cancellation; and
finalizer ordering. Magic's concrete `apps/server` topology, direct provider
selection and acquisition, service-client factories, Elysia/oRPC route
composition, Inngest mounting, product identities, and telemetry-completeness
claims are excluded. None replaces the canonical compiler, bootgraph, process
runtime, harness, or seven-phase realization law.
