## MODIFIED Requirements

### Requirement: Vendor responsibilities remain singular

Nx SHALL remain the task graph, affected-selection, hashing, and cache owner;
Biome SHALL remain the ordinary source lint/format owner; Grit SHALL remain the
Habitat source-law engine; and Effect SHALL remain the production Habitat
evaluator's process and resource lifecycle owner. Subprocess proof SHALL live in
owner-local CLI or semantic fixtures belonging to the behavior being proved.
`@rawr/test-utils` SHALL NOT remain the acceptance subprocess owner or a generic
test-support package. The repository SHALL NOT add a second runner or custom
native engine without a measured vendor capability gap.

#### Scenario: Cold native law remains expensive

- **WHEN** a true-cold Grit law exceeds the desired duration while unchanged Nx
  replay remains fast
- **THEN** investigation profiles the native law and corpus before changing the
  task graph or process substrate
- **AND** no custom engine is admitted from duration alone

#### Scenario: Compatibility law uses one repository source inventory

- **WHEN** one owner check selects one or more version-2 compatibility Grit applications
- **THEN** the catalog observes the Git-visible source inventory exactly once for the request and derives every application's exact subject set from that inventory
- **AND** ignored paths, tracked non-files, symbolic links, non-files, and paths outside the admitted acquisition roots never enter evaluation
- **AND** compatibility acquisition performs no recursive filesystem glob and does not inherit the narrower version-3 root-pattern subject or command-line bounds

#### Scenario: Subprocess proof follows its semantic owner

- **WHEN** a child-process fixture proves Habitat CLI, Rawr CLI, or another
  qualified owner's behavior
- **THEN** the fixture and its readers live with that CLI or semantic owner
- **AND** no reader imports `@rawr/test-utils` as a shared subprocess authority
