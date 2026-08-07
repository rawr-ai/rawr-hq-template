## ADDED Requirements

### Requirement: Habitat contains no downstream product source

The Habitat repository MUST contain only platform source, the Habitat self-host,
qualified owner-local conformance fixtures, and platform-owned records. A downstream product
MUST own its app composition, profiles, entrypoints, services, resources,
providers, plugins, topics, policy, tests, and product documentation in its own
repository. Habitat MUST expose reusable capability only through versioned
package interfaces and ordinary release artifacts. No downstream repository may
consume a Habitat workspace path, Git synchronization relationship, copied
implementation, alias, or compatibility export.

#### Scenario: Repository ownership is inspected

- **WHEN** Habitat and a downstream product repository are inspected after separation
- **THEN** Habitat contains no downstream product source or private product package identity
- **AND** the downstream product builds and runs using exact released Habitat package interfaces

### Requirement: Semantic classification precedes runtime implementation

Every current Habitat repository capability MUST be classified from its
behavior and invariants as Habitat platform, proven Rawr product, qualified
owner-local conformance fixture, or delete. A current path, package name,
command name, or Rawr prefix MUST NOT establish ownership. Every retained
capability MUST have one exact destination and acceptance owner; an ambiguous
capability MUST be deleted. Before the independent Rawr move, Habitat MAY land
only the bounded `runtime-schema` adaptation and public service/CLI interfaces
required to compile the destination projects. That prerequisite MUST perform no
app selection, provider acquisition, execution, mounting, observation, or
product policy. The independent Rawr move, every other Habitat owner move and
deletion, and exact-main gates in both repositories MUST complete before any
other private runtime implementation begins.

#### Scenario: Runtime implementation gate is evaluated

- **WHEN** the first private Habitat runtime owner other than the bounded schema-adaptation prerequisite is ready to receive implementation
- **THEN** Habitat canonical `main` contains only platform source, `apps/habitat`, and qualified owner-local conformance fixtures
- **AND** Rawr canonical `main` contains only the product closure admitted by its owner-local OpenSpec
- **AND** no compatibility app, path, alias, copied implementation, or synchronization relationship exists

### Requirement: The accepted capability destinations are closed

Habitat MUST retain its existing CLI and catalog; native Oclif plugin mechanics;
agent-plugin lifecycle; content-workspace, agent-plugin package-output,
native-agent-provider, and versioned-content resources/providers;
development/repository operations; runtime mounting and non-authorizing
observation; and Habitat CLI generators.
Rawr's initial finite source migration MUST receive only the proven ChatGPT
corpus, Hyperresearch, and session-intelligence domain services/topics. The unused agent-plugin
export-destination owner, predecessor agent-plugin creation, root doctor, HQ
shell/PID and graph commands, reflect, routine check/snapshot, tools export,
workflow harden, config, journal, security, hello, example-todo production projects, and
synthetic codex-slice/run-fixture production commands/projects MUST be deleted.
Indispensable test behavior MAY remain only as an owner-local conformance
fixture outside production membership.

#### Scenario: Final capability inventories are compared

- **WHEN** Habitat and Rawr exact-main project and command inventories are compared with the classification ledger
- **THEN** every retained capability has exactly one listed owner and acceptance target
- **AND** `nx run habitat:acceptance:product-separation-absence` passes against the cumulative exact predecessor inventory
- **AND** every deleted capability, predecessor owner, production example, reader, and compatibility path is absent
- **AND** agent-plugin export behavior remains available without the unreachable export-destination resource/provider

### Requirement: Initial Rawr movement is one finite native Nx import migration

The existing `rawr-ai/rawr` repository MUST be selected through a clean
worktree from canonical `origin/main`
`b02a9394a1476a90c11a871b678e28591d69bfa3`. Its legacy Turborepo-era source is
migration input, not target topology, and MUST be dispositioned by a Rawr
owner-local OpenSpec. Proven ChatGPT corpus, Hyperresearch, and
session-intelligence service/topic
projects MUST move through a finite, destination-owned migration event using
native `nx import` from one frozen Habitat source/ref with explicit source and
destination directories and filtered Git history. The Rawr owner-local record
MUST enumerate each exact invocation before execution. Cohesive projects SHOULD
import together; otherwise dependencies MUST import leaf-first. The destination
MUST reconcile external root configuration and local dependency edges and pass
its Nx graph before landing. The completed migration MUST NOT create an ongoing
ancestry, copy, mirror, or synchronization dependency.

#### Scenario: Rawr accepts the imported product closure

- **WHEN** the native Nx imports and destination reconciliation complete
- **THEN** only the admitted ChatGPT corpus, Hyperresearch, and session-intelligence projects and their owner-local verification remain as imported product source
- **AND** the Rawr Nx graph and every initial-product target named in the capability classification ledger's behavioral acceptance matrix pass from the clean destination worktree

### Requirement: Later Rawr products require owner-local admission

Habitat and Rawr MUST keep every stack-only product capability outside the
initial six-project import until its own owner-local record admits the domain,
source behavior, released Habitat prerequisites, and destination acceptance.
Workstream and research-experiment capabilities MAY follow that route after
separation. They MUST NOT enter Habitat platform ownership, broaden the initial
migration, or create a continuing source relationship.

#### Scenario: A later product source is evaluated

- **WHEN** a held Habitat-side adoption source has a Rawr product destination
- **THEN** Rawr admits and lands the product through its own record after the required Habitat release exists
- **AND** the Habitat source is retired only after destination acceptance

### Requirement: Downstream consumers use released Habitat integration

A downstream Nx repository MUST add Habitat through `nx add @habitat-ai/cli`.
That package's exported `./nx-plugin` and shipped `init` generator MUST pull the
exact `@habitat-ai/sdk` dependency. Later upgrades MUST use `nx migrate`.
Habitat distribution MUST remain the existing Nx Release group containing
exactly `@habitat-ai/sdk` and `@habitat-ai/cli`; no product or internal runtime
package joins that group. The SDK's installed Habitat pack MUST select a
constructible `service@1` kind with one public contract, in-process client,
router, and private implementation. Service dependencies MUST use public
clients, resources/providers MUST enter at app composition, and plugin/app
owners MUST retain transport projection and orchestration. The packed service
subtree MUST contain only the positive closed `service@1` kind. Product terms,
legacy v2 rule metadata, generic `forbids` packets, and superseded service
source-policy variants MUST be absent. oRPC 2 and Effect 4 MUST be the sole
vendor substrate; no compatibility kind or legacy construction path may ship.
The final SDK MUST assemble the
provider-neutral semantic-ledger contract at
`@habitat-ai/sdk/resources/semantic-ledger` and its Fluree provider only through
the optional conditional-import `/fluree` integration; neither source project
may become another release member.

The initiative has exactly two exact-main public checkpoints: the task 2.8
pre-separation interface release and the task 15.6 final runtime release. Each
checkpoint publishes only the SDK and CLI, and each checkpoint's accepted main
commit authorizes only that checkpoint.

#### Scenario: Rawr upgrades after Habitat runtime release

- **WHEN** the Rawr owner-local OpenSpec adopts a released Habitat runtime
- **THEN** it uses the published CLI Nx plugin and migration path rather than a Habitat workspace or source path
- **AND** product runtime acceptance runs in Rawr without moving source back into Habitat

#### Scenario: A service consumer installs Habitat law

- **WHEN** Civ7, Rawr, Magic Migration, or another downstream repository installs the exact released SDK pack
- **THEN** `service@1` is selected and constructible without repository-local generic service law
- **AND** the consumer retains only product-qualified overlays and proof

#### Scenario: Public artifacts are admitted before publication

- **WHEN** an exact Habitat-main SDK and CLI candidate is ready for release
- **THEN** the local installed-package Nx acceptance packs both public tarballs, installs the exact SDK candidate, and invokes native `nx add @habitat-ai/cli@file:<absolute-packed-cli-tarball>` in a disposable consumer before any tag or registry mutation
- **AND** that consumer proves generated `service@1` construction, cold public imports, CLI plugin and initializer loading, Oclif manifest behavior, and exact dependency closure
- **AND** artifact inspection proves the packed `dist/blueprints/service` subtree contains only the positive closed kind and no product vocabulary or legacy service rule packet
- **AND** any workspace import, missing public face, unpublished dependency, or source/installed divergence blocks publication

#### Scenario: A later Rawr workstream adopts semantic ledger capability

- **WHEN** the final Habitat runtime release is installed in Rawr
- **THEN** the workstream service imports only the released provider-neutral semantic-ledger SDK subpath
- **AND** the Rawr app MAY select the optional Fluree integration without a workspace import or third Habitat package
- **AND** the workstream source does not transfer before that release exists

### Requirement: Marketplace remains an independent content repository

The Marketplace repository MUST remain independent from Habitat and downstream
product source repositories. It MUST own curated agent-plugin content and its
content-governance records only. A repository path MAY identify content input,
but MUST NOT establish executable ancestry, implementation sharing, runtime
identity, or repository lifecycle authority.

#### Scenario: Three repository boundaries are verified

- **WHEN** Habitat, Rawr, and Marketplace canonical `main` are inspected
- **THEN** Habitat owns the platform, Rawr owns the downstream product, and Marketplace owns curated agent-plugin content
- **AND** no source path, ancestry, mirror, or synchronization mechanism transfers authority between them
