# repository-ratchet-runtime Specification

## Purpose
Define precise foundational lint ownership, bounded native Nx cache acceptance,
and singular vendor responsibilities for the repository ratchet.

## Requirements
### Requirement: Foundational lint owns admitted filename classes
The repository's foundational lint target SHALL hash the positive filename
classes its pinned lint engine can admit plus active formatter configuration.
It SHALL NOT claim unsupported filename classes merely because they exist in
the workspace, and SHALL NOT duplicate the lint engine's path-exclusion
semantics as Nx input negations.

#### Scenario: Unsupported documentation stays outside lint
- **WHEN** a Markdown-only repository record changes
- **THEN** Nx does not select the foundational lint owner because of that file

#### Scenario: Supported source selects lint
- **WHEN** a supported source file or active lint configuration changes
- **THEN** Nx selects the foundational lint owner
- **AND** the changed file participates in the lint task's cache identity

#### Scenario: Path exclusion remains lint-engine authority
- **WHEN** a supported filename lives beneath a path excluded by the lint-engine
  configuration
- **THEN** the positive Nx filename-class input may conservatively select the
  foundational lint owner
- **AND** Nx does not reproduce the lint engine's exclusion grammar

### Requirement: Native cache acceptance is behavior-bounded
The repository SHALL verify Habitat cache selection and invalidation through
native Nx behavior using one representative transition per distinct behavior
class. The acceptance SHALL NOT repeat equivalent host-process transitions
when exhaustive projection tests already prove the individual input members.

#### Scenario: Unchanged acceptance is inert
- **WHEN** the native owner check repeats without an authority, source, tool, or
  environment change
- **THEN** Nx replays the cached result without executing Habitat

#### Scenario: Every behavior class remains covered
- **WHEN** an unrelated file, covered file, rule authority input, installed tool
  identity, or declared runtime environment changes
- **THEN** native acceptance observes the corresponding preserved or invalidated
  cache behavior
- **AND** covered file addition, modification, and deletion remain represented

### Requirement: Vendor responsibilities remain singular
Nx SHALL remain the task graph, affected-selection, hashing, and cache owner;
Biome SHALL remain the ordinary source lint/format owner; Grit SHALL remain the
Habitat source-law engine; Effect SHALL remain the production Habitat
evaluator's process and resource lifecycle owner; and `@rawr/test-utils` SHALL
remain the acceptance subprocess owner. The repository SHALL NOT add a second
runner or custom native engine without a measured vendor capability gap.

#### Scenario: Cold native law remains expensive
- **WHEN** a true-cold Grit law exceeds the desired duration while unchanged Nx
  replay remains fast
- **THEN** investigation profiles the native law and corpus before changing the
  task graph or process substrate
- **AND** no custom engine is admitted from duration alone
