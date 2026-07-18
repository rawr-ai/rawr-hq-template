## ADDED Requirements

### Requirement: Vendor state is explicit repository data
Vendor management MUST derive its selected sources from versioned per-plugin declarations, provenance records, locks, and the canonical release input in an explicit content workspace. It MUST NOT scan arbitrary registries or infer sources from installed providers, toolkit packs, app composition, path names, or prior operation history.

#### Scenario: Undeclared vendor source rejects
- **WHEN** status or update is asked to operate on a source, destination, plugin, or upstream ref absent from canonical declarations
- **THEN** it rejects before network, temporary materialization, or repository mutation

### Requirement: Vendor status is read-only and truthful
Status MUST compare admitted provenance/lock/destination state with the exact declared upstream observation and return one closed classification per source: `Current`, `UpdateAvailable`, `Held`, `Diverged`, `Invalid`, or `Unavailable`. Status MUST NOT author content, provenance, locks, release input, artifacts, acceptance, channels, providers, exports, Oclif state, or temporary persistent state.

#### Scenario: Available update performs zero writes
- **WHEN** the declared upstream has a newer admissible commit
- **THEN** status reports admitted and observed identities plus the update classification
- **AND** every repository and lifecycle mutation port records zero calls

### Requirement: Vendor update authors reviewable repository changes only
Update MUST operate only on explicitly selected `tracked` sources, verify repository identity, qualified ref, source path, fast-forward ancestry, supported layout, payload digest, and absence of local destination drift, then author only the selected payload, provenance, lock, and canonical release-input changes. It MUST NOT build, package, export, test, accept, promote, select a channel, or deploy the changed content. An exact repeat MUST preserve bytes and mtimes.

#### Scenario: Successful update stops at authored content
- **WHEN** one declared tracked source has a verified admissible upstream update
- **THEN** update returns `AuthoredReviewableChanges` with only its exact repository paths changed
- **AND** all artifact, acceptance, channel, provider, export, Oclif, and controller-selection state remains unchanged

#### Scenario: Current source stutters
- **WHEN** admitted commit, provenance, lock, destination payload, and upstream observation already agree
- **THEN** update returns `ReadOnlyConverged` without rewriting repository bytes or metadata

### Requirement: Held and failed vendor operations cannot materialize output
A `held` source MUST reject before fetch or byte materialization. Update failure before authoring MUST leave repository bytes unchanged. Failure during a bounded multi-file commit MUST restore the exact captured preimage or report `FailedRestored` without claiming convergence. Operation-owned temporary Git materialization MAY be recursively removed only after exact parent, private-prefix, canonical containment, captured identity, and directory-type revalidation; otherwise cleanup blocks and preserves the candidate.

#### Scenario: Held source traps every output port
- **WHEN** update selects a held source
- **THEN** no fetch, checkout, temporary directory, repository write, artifact, package, export, sync, release, or distribution call occurs

#### Scenario: Substituted temporary root is preserved
- **WHEN** an operation-owned temporary directory is replaced, aliased, moved outside its parent, given the wrong prefix, or changed to a symlink/non-directory before cleanup
- **THEN** recursive cleanup rejects before removal and reports the cleanup failure separately
