## ADDED Requirements

### Requirement: Workspace-root acquisition does not widen coverage
Each compatibility-policy target that acquires the Nx workspace root SHALL hash
its catalog and rule authority, local runner assets, declared coverage, and
runtime inputs. The workspace-root acquisition SHALL NOT add unrelated
workspace descendants that cannot be selected by the rule's coverage.

#### Scenario: Unrelated source preserves cache identity
- **WHEN** a tracked file changes below an acquisition root but outside every
  declared coverage pattern for the rule
- **THEN** the focused rule target retains its Nx cache identity
- **AND** the owner target retains its cache identity only when no sibling
  policy input covers that file

#### Scenario: Covered source invalidates the check
- **WHEN** a tracked file matching the rule's declared coverage is added,
  changed, or removed
- **THEN** the focused rule target and its owner target receive a different Nx
  cache identity

#### Scenario: Rule authority invalidates the check
- **WHEN** the rule manifest, baseline, local runner asset, catalog authority,
  or declared runtime input changes
- **THEN** the focused rule target and its owner target receive a different Nx
  cache identity

#### Scenario: Non-workspace root remains conservative
- **WHEN** a compatibility rule acquires a directory below the workspace root
- **THEN** its current recursive acquisition input remains in force until a
  native Nx representation can preserve root admission without another cache
  model

### Requirement: Owner checks preserve one selected execution
Each owner SHALL expose one cacheable `check:policy` target whose inputs are the
ordered union of its focused policy inputs and whose execution performs one
owner-selected Habitat check without scheduling the focused targets.

#### Scenario: Unchanged owner check is inert
- **WHEN** an owner check repeats with identical rule authority, inspected
  corpus, acquisition roots, and runtime inputs
- **THEN** Nx replays the cached owner result without executing Habitat again

#### Scenario: One focused input invalidates its owner
- **WHEN** any focused policy input for an owner changes
- **THEN** the owner target receives a different Nx cache identity and executes
  one owner-selected Habitat check

#### Scenario: Sibling coverage preserves focused isolation
- **WHEN** one file is outside focused rule A's coverage but inside sibling rule
  B's coverage for the same owner
- **THEN** focused rule A retains its cache identity
- **AND** focused rule B and the owner target receive different cache identities
