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
capability MUST be deleted. The independent Rawr move, Habitat owner moves and
deletions, and exact-main gates in both repositories MUST complete before any
new runtime implementation begins.

#### Scenario: Runtime implementation gate is evaluated

- **WHEN** the first private Habitat runtime owner is ready to receive implementation
- **THEN** Habitat canonical `main` contains only platform source, `apps/habitat`, and qualified owner-local conformance fixtures
- **AND** Rawr canonical `main` contains only the product closure admitted by its owner-local OpenSpec
- **AND** no compatibility app, path, alias, copied implementation, or synchronization relationship exists

### Requirement: The accepted capability destinations are closed

Habitat MUST retain its existing CLI and catalog; native Oclif plugin mechanics;
agent-plugin lifecycle; content-workspace, agent-plugin package-output,
native-agent-provider, and versioned-content resources/providers; config
inspection; journal; security check/report; development/repository operations;
session intelligence; runtime mounting and non-authorizing observation; and
Habitat CLI generators. Rawr MUST receive only the proven ChatGPT corpus and
Hyperresearch domain services/topics. The unused agent-plugin
export-destination owner, predecessor agent-plugin creation, root doctor, HQ
shell/PID and graph commands, reflect, routine check/snapshot, tools export,
workflow harden, security posture, hello, example-todo production projects, and
synthetic codex-slice/run-fixture production commands/projects MUST be deleted.
Indispensable test behavior MAY remain only as an owner-local conformance
fixture outside production membership.

#### Scenario: Final capability inventories are compared

- **WHEN** Habitat and Rawr exact-main project and command inventories are compared with the classification ledger
- **THEN** every retained capability has exactly one listed owner and acceptance target
- **AND** every deleted capability, predecessor owner, production example, reader, and compatibility path is absent
- **AND** agent-plugin export behavior remains available without the unreachable export-destination resource/provider

### Requirement: Rawr movement is one finite native Nx import migration

The existing `rawr-ai/rawr` repository MUST be selected through a clean
worktree from canonical `origin/main`
`b02a9394a1476a90c11a871b678e28591d69bfa3`. Its legacy Turborepo-era source is
migration input, not target topology, and MUST be dispositioned by a Rawr
owner-local OpenSpec. Proven ChatGPT corpus and Hyperresearch service/topic
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
- **THEN** only the admitted ChatGPT corpus and Hyperresearch projects and their owner-local verification remain as imported product source
- **AND** the Rawr Nx graph and behavior gate pass from the clean destination worktree

### Requirement: Downstream consumers use released Habitat integration

A downstream Nx repository MUST add Habitat through `nx add @habitat-ai/cli`.
That package's exported `./nx-plugin` and shipped `init` generator MUST pull the
exact `@habitat-ai/sdk` dependency. Later upgrades MUST use `nx migrate`.
Habitat distribution MUST remain the existing Nx Release group containing
exactly `@habitat-ai/sdk` and `@habitat-ai/cli`; no product or internal runtime
package joins that group.

#### Scenario: Rawr upgrades after Habitat runtime release

- **WHEN** the Rawr owner-local OpenSpec adopts a released Habitat runtime
- **THEN** it uses the published CLI Nx plugin and migration path rather than a Habitat workspace or source path
- **AND** product runtime acceptance runs in Rawr without moving source back into Habitat

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
