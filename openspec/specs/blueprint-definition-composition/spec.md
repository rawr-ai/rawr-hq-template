# blueprint-definition-composition Specification

## Purpose
Define blueprint-owned composition through ordered ordinary rule assets,
byte-exact recursive packaging and one instance and Nx owner, while keeping
reusable blueprint relations separately gated.
## Requirements
### Requirement: Components organize existing ordered rule packets

A blueprint MUST remain the sole owner of its kind identity, version, anchor
grammar, closure, rules, and instance contract. Gate A MUST keep the existing
schema-version-1 `blueprint.toml` `[[rules]]` sequence as the only ordered
definition-composition surface. `Component` is only informal shorthand for a
named authoring subdirectory inside that blueprint that groups small ordinary
rule assets. It has no definition field, id, manifest, or runtime
representation.

For the Gate A service proof, root `structure.toml` MUST remain exactly one
ordinary Habitat structure rule and MUST own the complete positive filesystem
closure. Informal component directories MUST group focused ordinary Grit
`pattern.md` assets only. Each nested asset MUST receive authority only when an
ordinary root `[[rules]]` entry references its confined relative path through
the existing runner shape. Every structure or Grit packet MUST retain its
ordinary rule id, lane, runner, acquisition, application, provenance, and
focused Nx target. Directory placement alone MUST NOT activate law. A future
blueprint requires separate explicit authority before adding another ordinary
structure rule and application; component organization does not imply one.

#### Scenario: Ordinary rules reference an organized authoring tree

- **WHEN** `service@1` groups small focused Grit assets beneath named authoring
  directories
- **THEN** its schema-version-1 root manifest references those assets through
  ordinary `[[rules]]` entries in the intended evaluation order
- **AND** exactly one root Habitat structure rule owns complete filesystem
  closure while each nested Grit packet retains its ordinary application and
  focused target

#### Scenario: Directory placement is undeclared

- **WHEN** an asset is placed below a component directory but no ordinary root
  rule references it
- **THEN** the asset contributes no authority merely because of its path

#### Scenario: A referenced nested asset is invalid

- **WHEN** an ordinary Grit rule references a missing, malformed, non-regular,
  or escaping nested asset
- **THEN** the existing catalog boundary rejects the complete definition before
  application emission or Nx projection

### Requirement: Gate A changes no schema or evaluation primitive

Gate A MUST NOT add a `components` field, blueprint or instance schema version,
runner-array form, component DTO, parser branch, component resolver, structure
merge, application collapse, target collapse, or component-named target. The
existing schema-version-1 decoder, asset resolver, rule-application model, and
Nx target projection MUST process every root and nested packet unchanged.

The repository's registry `@habitat-ai/cli@0.5.2` Nx bootstrap MUST remain able
to project Gate A before the candidate plugin is published. Candidate-only
plugin authority MUST NOT be a prerequisite for repository-local service law.

#### Scenario: Existing bootstrap projects Gate A law

- **WHEN** the repository evaluates the Gate A service definition before
  candidate publication
- **THEN** registry `@habitat-ai/cli@0.5.2` reads only existing
  schema-version-1 rule and runner forms
- **AND** no candidate-only parser, DTO, evaluator, or projection behavior is
  required

#### Scenario: Focused packets remain distinct

- **WHEN** several ordinary rules reference assets grouped beneath one
  authoring component directory
- **THEN** each rule emits its existing application and focused target
- **AND** no component application or component-named target is created

### Requirement: Composed authority packing is recursively byte-exact

The Habitat SDK pack MUST recursively include the complete declared authority
tree for every selected blueprint. The packed tree MUST preserve relative paths
and byte-for-byte equality for the blueprint manifest, required root
`structure.toml` anchor, every informal authoring component directory, and every
rule-referenced nested Grit asset.
When blueprint relations are admitted, the pack MUST also contain every
referenced definition and its transitive declared authority assets with exact
policy-pack provenance. Packaging MUST NOT flatten, reinterpret, or omit nested
authority; a shallow first-level copy is nonconforming.

#### Scenario: Nested component assets are packed

- **WHEN** a selected blueprint references focused Grit assets below a nested
  authoring component directory
- **THEN** the built and installed SDK contains every asset at the same
  package-relative path with byte-identical contents
- **AND** catalog resolution and Nx hashing use those installed paths and
  policy-pack provenance

#### Scenario: A recursive asset is missing or changed

- **WHEN** installed-package acceptance finds a declared nested or transitive
  authority asset missing, relocated, flattened, or byte-different from source
- **THEN** the candidate fails before publication

### Requirement: Instance realization retains one manifest and owner

One repository project MUST select one primary blueprint and version through one
project-root `habitat.toml`, and the selected instance MUST retain one Nx owner.
Authoring component directories MUST require no instance authoring. The owner's
existing `check:policy` composition MUST evaluate the selected ordinary rule
applications and focused targets. If blueprint relations are admitted later,
included and contained occurrences MUST derive without child manifests,
projects, or targets. Repeated occurrences of one related child rule MUST batch
into one application owned by the parent instance and its owning project.

Existing qualified selection facts MAY bind genuine instance members, but the
consumer MUST NOT restate fixed definition composition or supply a new
composition inventory.

#### Scenario: A service instance selects composed law

- **WHEN** a service project selects `service@1` and that definition uses
  several authoring component directories
- **THEN** the project owns one root `habitat.toml`, one selected
  blueprint/version, and one Nx owner
- **AND** owner `check:policy` evaluates its selected ordinary rule targets
- **AND** no component directory requires additional repository configuration

#### Scenario: Repeated child occurrences are realized

- **WHEN** an admitted contained child rule binds several valid occurrences
  below one parent instance
- **THEN** Habitat batches those occurrences into one child-rule application
  under the parent application and owning project
- **AND** Nx creates no occurrence-local project or target

### Requirement: Relations are a separately gated extension for reusable kinds

Habitat MUST NOT require a blueprint relation for every nested directory or
stable internal role. Law that exists only as a layer of one owning kind MUST
remain ordinary packets grouped inside the owning blueprint's authoring tree. A
relation MAY be admitted only when the related blueprint has an independent
semantic identity; owns its anchor, version, and complete positive closure; is
independently constructible and migratable without parent inspection; owns at
least one useful law wholly; and has proven reuse or explicit authority for
reuse. Repetition inside one parent, a long structure file, or a separate
historical packet directory does not satisfy that promotion test.

An admitted `include` relation MUST apply the complete related blueprint law at
the same anchor. An admitted `contains` relation MUST bind the complete related
child law below a parent-owned boundary while the parent owns the mount and
cardinality. A parent MUST NOT copy, edit, suppress, weaken, or satisfy the
related blueprint's interior law. Relation support MUST be sequenced after the
minimum authoring-tree and recursive-pack fix as a separately gated future
extension. Gate A MUST implement zero blueprint relations. `service@1` modules,
database persistence, model, middleware, operations, and proof MUST remain
service-owned ordinary packets rather than child kinds. `package@1` MUST NOT be
included merely because a service owns `package.json`; it is an independently
closed support-package kind with a different proof grammar, not a universal
mixin.

#### Scenario: Nested law has no independent identity

- **WHEN** several structural and source packets describe a stable role that is
  meaningful only inside its owning blueprint
- **THEN** the packets are grouped in an authoring component directory rather
  than promoted to a related blueprint

#### Scenario: Repetition does not prove a child kind

- **WHEN** a service contains repeated modules, an optional database interior,
  or a historically separate blueprint packet directory
- **THEN** that repetition or history does not admit a blueprint relation
- **AND** the law remains in the owning service definition unless the complete
  promotion test is independently satisfied

#### Scenario: Package shape does not create an include

- **WHEN** `service@1` requires `package.json` at its root
- **THEN** the service does not `include package@1`
- **AND** the service root anchor owns its package boundary while `package@1`
  retains its separate constructible identity and proof grammar

#### Scenario: Reusable law shares the parent anchor

- **WHEN** an independently constructible reusable blueprint must add its
  complete law at the parent's anchor
- **THEN** an admitted `include` relation applies that law without creating a
  child instance or cardinality

#### Scenario: Reusable law owns a child boundary

- **WHEN** an independently constructible reusable child blueprint is bound
  below a parent-owned mount with explicit cardinality
- **THEN** an admitted `contains` relation preserves the child's complete
  identity, provenance, roots, packets, and closure at that boundary

#### Scenario: Gate A service has no relations

- **WHEN** ordinary service rules reference assets grouped beneath `spine`,
  `modules`, `model`, `persistence`, and `proof` authoring directories
- **THEN** Gate A evaluates those ordinary rule applications with zero blueprint
  relations
- **AND** the relation engine is not a Gate A prerequisite

### Requirement: Admitted relation graphs fail closed

If `include` or `contains` relations are realized, the catalog MUST resolve the
complete definition graph before evaluation and MUST reject it atomically when
any relation target or binding is invalid. Rejection MUST occur through the
existing catalog, structure evaluator, and Nx projection boundaries rather than
a manual inventory, custom parser, or custom runner.

#### Scenario: Relation target is missing

- **WHEN** a relation names an absent blueprint identity or version
- **THEN** catalog resolution rejects the complete graph before application
  emission

#### Scenario: Relation graph is cyclic

- **WHEN** any combination of `include` and `contains` edges returns to a
  definition already on the resolution path
- **THEN** catalog resolution rejects the complete graph with the cycle
  provenance

#### Scenario: Child binding escapes

- **WHEN** a contained child binding resolves outside its parent instance or
  declared mount
- **THEN** resolution rejects the escaping binding before source inventory or
  evaluation

#### Scenario: Structural ownership overlaps

- **WHEN** parent and child law or two child occurrences claim incompatible
  ownership of the same bound path
- **THEN** resolution rejects the overlap rather than choosing an owner or
  evaluating both independently

#### Scenario: Child cardinality is violated

- **WHEN** a required child is missing, too many children bind, or one child
  identity binds ambiguously against the declared cardinality
- **THEN** resolution rejects the parent instance without emitting a partial
  application set

### Requirement: Definition composition remains a closed minimum surface

Gate A blueprint definition composition MUST change only authoring-tree
organization and recursive packing behind the existing ordered ordinary-rule
surface. It MUST NOT introduce a component schema, inheritance, variants,
capability or niche activation, manual inventories, a custom parser, a custom
runner, open scopes, or new downstream author configuration for fixed
definition structure. `include` and `contains` remain a separately gated future
extension.

The first proof MUST recast `service@1` as small positive native structure and
Grit packets: exactly one ordinary root Habitat structure rule plus ordinary
Grit rules whose assets are grouped under context-bearing authoring
directories. The root structure rule MUST
own the complete positive filesystem closure. Each Grit packet MUST retain its
normal application and focused target, the definition MUST declare zero
blueprint relations, and the monolithic source-law direction MUST be deleted
rather than optimized. The root anchor MUST retain the project, `client.ts`, and
source boundary. Habitat MUST own filesystem closure, focused Grit MUST own only
recognizable local source relations, Nx MUST own project and dependency truth,
TypeScript MUST own capability visibility, and behavior tests MUST own service
semantics and lifecycle proof. The one-operation
`nx add @habitat-ai/cli` consumer path MUST remain unchanged.

#### Scenario: Service is the first composition proof

- **WHEN** the Gate A installed-package candidate constructs a generated
  `service@1` instance
- **THEN** its schema-version-1 root manifest selects exactly one ordinary
  Habitat structure rule that owns the complete positive filesystem closure
- **AND** focused ordinary Grit packets beneath the definition's
  context-bearing authoring directories retain their own applications and
  focused targets with no monolithic source-law packet or blueprint relation
- **AND** the existing one-operation CLI `nx add` flow installs the paired SDK,
  selects the service law, and produces one owning project

#### Scenario: Unsupported composition machinery is proposed

- **WHEN** a Gate A blueprint attempts to use a `components`, inheritance,
  variant, capability, niche, inventory, open-scope, custom-parser,
  custom-runner, or downstream fixed-composition configuration field
- **THEN** the existing closed blueprint admission boundary rejects it rather
  than expanding the composition model
