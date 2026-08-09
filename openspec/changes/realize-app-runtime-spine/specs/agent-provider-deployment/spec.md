## MODIFIED Requirements

### Requirement: Planning is target-scoped and read-only

The `providers` module of the one agent-plugin lifecycle service MUST
canonicalize explicit provider homes and produce an independent deterministic
plan for each target. Canonical planning MUST use only the
governance-resolved selection, verified release model, observed capabilities,
and live native inventory/provenance. It MUST perform no mutation and MUST NOT
read or write receipts, sidecars, evidence, export, undo, hosted-governance,
promotion, Oclif-extension, or app/runtime state.

#### Scenario: Same desired state yields independent plans

- **WHEN** home A is converged and home B lacks one selected plugin
- **THEN** A plans only verification and B plans only its target-local native
  changes

#### Scenario: Ambiguous native provenance blocks cleanup

- **WHEN** an occupied identity is not associated by the provider with the
  exact managed marketplace and source in the same explicit home
- **THEN** planning preserves it and blocks the conflicting target

### Requirement: Status is disjoint, target-scoped, and non-mutating

Canonical status MUST join the reviewed selection, derived release model,
capability compatibility, and live native inventory to return exactly one
primary classification per explicit target: `Converged`, `Drifted`, `Blocked`,
or `Failed`. Exact bounded issues MUST distinguish selection refusal, ownership
collision, incompatible capability, and observation failure. It MUST NOT repair
provider, Oclif, repository, export, app, evidence, cache, or other state.

#### Scenario: External Oclif state drifts

- **WHEN** canonical status runs while unrelated Oclif extension state differs
- **THEN** lifecycle classification remains unchanged and Oclif state is
  neither read nor repaired

#### Scenario: Newer unselected content exists

- **WHEN** Marketplace main contains content newer than the reviewed selection
- **THEN** status evaluates only the selected release set and infers no pending
  promotion

### Requirement: Native state does not depend on mutable checkout bytes

Provider-native input MUST derive from exact selected Git objects. Canonical
mutation MUST use a provider-native Git marketplace source at the selected
immutable Marketplace revision, and the provider MUST own its resulting
snapshot inside the explicit native home. A local content workspace remains
only a Git object locator and MUST NOT become package, provider, cache, or
next-invocation identity. Local marketplace paths are test-only and MUST share
the bounded lifetime of their caller-owned disposable root. Each live call MUST
have exclusive use of that root; sequential calls MAY reuse it after
settlement, but concurrent calls MUST use distinct roots. The service MAY
converge only its reserved direct child and MUST NOT infer deletion authority
over the caller-owned disposable parent or provider home. The content checkout,
reserved marketplace child, and every provider home MUST be pairwise disjoint;
equal, ancestor, and descendant relationships MUST be refused before source or
native work. The checkout remains a versioned-content and inspection input,
not controller/provider identity or a repository/symlink synchronization
channel.

#### Scenario: Mutable worktree differs from selected objects

- **WHEN** worktree bytes differ from the reviewed selected commit and tree
- **THEN** status or sync reads only the exact selected Git objects or returns
  `Blocked` with a selection issue
- **AND** it never substitutes mutable worktree bytes or a retained local copy

### Requirement: Native replacement precedes omitted-member cleanup

Canonical replacement MUST retire a stale same-ID Habitat-managed member
through the provider's native command, verify it absent, install and enable the
selected member through native commands, and verify its declared
provider-visible files before retiring omitted managed members. Fresh catalog
or list metadata MUST NOT substitute for the native refresh transition.
Canonical apply MUST publish no receipt, sidecar, evidence, export record, or
undo state.

#### Scenario: Successful same-ID replacement orders mutations

- **WHEN** canonical convergence replaces a stale managed member
- **THEN** native retirement precedes reinstall and selected visibility
  precedes omitted-member cleanup

#### Scenario: Visibility fails after native install

- **WHEN** native install returns success but selected provider-visible state is
  not verified
- **THEN** cleanup does not run, the result is non-success with the exact
  applied prefix, and retry starts from a fresh native inspection
