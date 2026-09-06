# repository-separation Specification

## Purpose
Define the platform, product and curated-content boundaries for Habitat,
downstream repositories and Marketplace, including destination-owned adoption,
held-source preservation, exact released SDK/CLI integration and
capability-specific acceptance.
## Requirements
### Requirement: Habitat contains no downstream product source

Habitat MUST contain platform source, its self-host, qualified owner-local
conformance fixtures and platform-owned records only. Downstream products own
their app composition, profiles, entrypoints, services, resources/providers,
plugins, topics, policy, tests and product documentation in their repositories.
Released package interfaces, not workspace paths, continuing Git ancestry,
copied implementation, aliases or compatibility exports, cross that boundary.

#### Scenario: Repository ownership is inspected

- **WHEN** Habitat and a downstream product are inspected
- **THEN** each capability has one semantic owner and Habitat contains no private product source identity
- **AND** the product builds against exact released Habitat interfaces

### Requirement: Retained capabilities have a destination and acceptance owner

Classification MUST use behavior and invariants rather than current names or
paths. Every retained capability needs a qualified destination and acceptance.
Mixed source is evidence, not a merge unit. Ambiguous or occupied source MUST
remain held until its owner/disposition is established; classification alone
MUST NOT authorize deleting user work. A completed transfer retires predecessor
readers with its accepted replacement, not a later compatibility cleanup.

Habitat retains CLI/catalog, native Oclif plugins, curated agent-plugin lifecycle,
content resources/providers, development operations, runtime/observation and
CLI generators. Rawr owns the admitted corpus, Hyperresearch, session-intelligence
and separately admitted later product behavior. Unused predecessor export-
destination, doctor/HQ/reflect/routine/tools-export/workflow-harden/config/journal/
security/hello, example-todo and synthetic production fixtures MUST remain absent.
Indispensable behavior fixtures stay owner-local, outside production membership.

#### Scenario: Final inventories are compared

- **WHEN** current project, command and package inventories are evaluated
- **THEN** retained capabilities match their destination and named acceptance owner
- **AND** cumulative product-separation acceptance proves retired identities/readers remain absent
- **AND** agent-plugin export behavior does not recreate the unused export-destination owner

### Requirement: Product movement is finite and destination-owned

The initial admitted Rawr service/topic migration MUST remain a completed finite
native Nx import, with filtered history and destination-owned reconciliation,
not an ongoing source relationship. Later workstream, research-experiment,
session or reference material requires a separate owner-local admission based
on unique behavior and actually needed released interfaces. A held source MUST
retire only after its destination accepts the replacement.

#### Scenario: A later product source is evaluated

- **WHEN** a held mixed Habitat-side lineage contains useful Rawr behavior
- **THEN** Rawr admits only that behavior through its own record and acceptance
- **AND** no stale platform authority or predecessor repository metadata is copied
- **AND** unrelated Habitat runtime work does not wait for that product transfer

### Requirement: Consumers use the native released Habitat integration

A downstream Bun/Nx repository MUST add Habitat with native
`bunx nx add @habitat-ai/cli --no-interactive`. The CLI Nx plugin/init generator
installs its exact paired SDK and converges the repository foundation in that
operation. Later upgrades use `nx migrate`, not manual producer-file copies,
a custom installer, SDK preseed or a second bootstrap identity.

The release group MUST remain only `@habitat-ai/sdk` and `@habitat-ai/cli`.
Source main's version string does not establish that its runtime faces were
released. Every publication needs accepted exact-main source, installed artifact
proof, exact provenance/integrity and a truthful public capability inventory.
A later optional capability may publish independently; there is no permanent
two-functional-release ceiling.

#### Scenario: A consumer upgrades

- **WHEN** Rawr, Civ7, Magic or another consumer adopts a released capability
- **THEN** native migration selects the exact paired interfaces and proves idempotence
- **AND** that consumer runs its own compatibility and product acceptance without importing Habitat internals

#### Scenario: Service-law adoption does not need the full runtime

- **WHEN** a consumer needs an already released service blueprint
- **THEN** it may migrate and prove that law without waiting for unrelated runtime or ledger implementation
- **AND** host-specific constraints such as V8-isolate compatibility remain its own acceptance gate

### Requirement: Packaged authority is complete and immutable

The SDK pack MUST carry complete independently resolvable blueprint definitions
and every referenced asset at preserved relative paths. Installed bytes MUST
match selected source authority. Every admitted predecessor remains byte-identical;
a change of law uses a complete successor rather than inheritance or fallback.
The current service law preserves public contract/client/router and private
implementation ownership, native oRPC/Effect mechanics and dependency direction.

Positive closure protects owner boundaries and admitted file kinds without a
permanent exact private-helper inventory. Product vocabulary, obsolete negative
rule packets and a second public construction model MUST NOT reappear. No private
runtime package joins the release cohort.

#### Scenario: Public artifacts are admitted before publication

- **WHEN** SDK/CLI candidates are ready
- **THEN** installed acceptance packs both, publishes only to an isolated local registry and invokes native nx add in a disposable consumer before a public tag/registry mutation
- **AND** generated service construction, cold imports, native CLI/plugin/init loading, manifest behavior and exact dependency closure pass
- **AND** all selected and predecessor blueprint assets are present and source-byte-identical
- **AND** missing assets, private workspace imports or unpublished dependencies block release

### Requirement: Optional capabilities have capability-specific gates

Semantic-ledger and temporal-inquiry contracts/providers MUST publish only when
implemented, qualified and accepted through the SDK boundary. They do not gate
generic runtime publication or unrelated consumers. Ledger-dependent Rawr
workstream behavior still requires an accepted released ledger interface;
research and other products wait only for their own needed capabilities.
Provider neutrality and unrestricted merge MUST NOT be weakened to bypass
qualification. External database maintenance requires separate explicit authority.

#### Scenario: Rawr adopts a ledger-dependent workstream

- **WHEN** its owner-local record admits workstream behavior requiring ledger operations
- **THEN** adoption waits for the accepted released provider-neutral ledger face
- **AND** the app selects a qualified provider through released interfaces without another Habitat package or workspace import
- **AND** unrelated runtime/service-law adoption proceeds independently

### Requirement: Marketplace remains an independent content repository

Marketplace MUST own curated agent-plugin content and content-governance records
only. A content input path establishes no executable ancestry, runtime identity,
source sharing or repository lifecycle authority.

#### Scenario: Repository boundaries are verified

- **WHEN** Habitat, Rawr and Marketplace accepted main revisions are inspected
- **THEN** they own platform, product and curated content respectively
- **AND** no source mirror, ancestry or synchronization process transfers authority between them
