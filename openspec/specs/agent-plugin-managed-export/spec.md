# agent-plugin-managed-export Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-release-product. Update Purpose after archive.
## Requirements
### Requirement: Explicit artifact-backed export application
The Template-owned export procedure MUST accept exactly one canonical artifact handle for a release or release set, one versioned `codex` or `claude` layout, one or more explicit absolute destinations, and an explicit overwrite policy whose default is `managed-only`. The `exports` module MUST invoke its injected read-only `ArtifactReader` internally and derive every planned byte from the returned ownership-transferred immutable snapshot rather than a request-supplied snapshot, mutable path, or content checkout. The lifecycle runtime binding owns the sole production adapter; the `exports` module does not import `releases` internals. The procedure MUST be reachable only through `rawr agent plugins export` and MUST NOT be registered below bare plugins, a runtime scan, alias, aggregate, app-composition path, or generic projection fallback.

#### Scenario: Export ignores source availability and aggregate routing
- **WHEN** a verified artifact handle is exported after its disposable source fixture is unavailable
- **THEN** the exact layout plan and bytes are produced from immutable artifacts through the qualified export command
- **AND** no repository executable code, source fallback, tree-equivalence, mixed aggregate, app composition, or provider path executes

#### Scenario: Missing explicit mode fails before destination access
- **WHEN** export receives no release mode, both release and release-set modes, an unsupported layout, a relative destination, or no destination
- **THEN** parsing rejects before reading or writing a destination ledger or payload path
- **AND** no provider, Oclif, controller, artifact, package, or undo state changes

### Requirement: One truthful ledger per canonical destination
Each canonical export destination MUST own one versioned ledger recording canonical destination identity, layout protocol, generation, and managed plugin scopes keyed by curated plugin ID. Each scope MUST bind its release digest, relative paths, payload digests, and verified managed state. A ledger MAY also carry one complete-set convergence claim binding a set digest and exact member-to-release mapping, but only while every scope equals that set and no extra scope exists. A targeted mutation MUST preserve untouched peer scopes and clear the complete-set claim; a targeted no-op MUST preserve the byte-identical truthful ledger. Canonical path aliases for the same destination MUST resolve to the same owner and MUST NOT create a second ledger. A ledger MUST live with or be keyed exclusively by its destination and MUST NOT live under or derive authority from a content checkout, artifact store, provider receipt, Oclif registry, or global aggregate. Ledger reads MUST validate a bounded closed schema, canonical destination binding, lexical and realpath containment, `lstat` type, non-aliasing, and a regular-file link count of one before trusting any ownership claim. Ledger publication MUST bind the expected prior generation and digest, revalidate them immediately before commit, use a private same-parent regular file, and atomically replace the slot after complete validation. Invalid, stale, corrupt, forged, symlinked, hardlinked, directory-valued, aliased, or foreign ledger state MUST block before payload or ledger mutation and MUST NOT be treated as an empty ledger.

#### Scenario: Aliased destinations cannot split authority
- **WHEN** two destination arguments resolve through symlinks or path normalization to the same canonical destination
- **THEN** export treats them as one destination owner or rejects the duplicate before mutation
- **AND** it never creates two ledgers for the same live layout

#### Scenario: Multiple destinations settle independently
- **WHEN** one operation targets two distinct canonical destinations and the second destination blocks
- **THEN** the first destination's applied and verified result remains truthful and independently undoable
- **AND** the second destination's ledger does not advance and neither destination authorizes cleanup in the other

#### Scenario: Invalid ledger cannot grant ownership or be overwritten
- **WHEN** a ledger slot is corrupt, forged for another canonical destination, symlinked, hardlinked, directory-valued, aliased, outside the destination boundary, or contains unknown or path-unsafe fields
- **THEN** export blocks that destination before any payload, cleanup, temp-file, ledger, or undo mutation
- **AND** it neither follows nor replaces the ledger object and grants no managed ownership from it

#### Scenario: Targeted mutation clears a stale complete-set claim
- **WHEN** complete set S1 establishes scopes A1 and B1, then targeted export changes only A to A2
- **THEN** the ledger preserves B1, records A2 in A's scope, increments its generation, and carries no complete-set convergence claim
- **AND** repeating targeted A2 is read-only while a later complete S2 may restore a set claim only after every final scope equals S2

#### Scenario: Stale ledger generation cannot overwrite a winner
- **WHEN** two export plans observe the same destination ledger generation and one operation wins controller transaction admission and advances the ledger
- **THEN** the other operation cannot acquire or commit with the stale expected generation and performs no destination mutation
- **AND** an unconditional ledger overwrite cannot erase the winner's scopes or complete-set claim

#### Scenario: Ledger publication failure exposes no partial authority
- **WHEN** ledger private-file create, write, flush, verification, expected-generation revalidation, or final rename fails
- **THEN** the ledger slot contains either the exact prior ledger or one complete verified next-generation ledger and never partial or caller-minted bytes
- **AND** any already applied payload or retirement subset remains truthfully represented by bounded controller settlement for recovery while the failure unlocks no further orphan cleanup

### Requirement: Scope-bounded planning and retirement
A targeted release export MUST update only that curated plugin's ledger scope and MUST NOT retire or rewrite peer scopes. A complete release-set export MUST treat the selected set as closed-world only for that destination and layout and MUST limit retirement to stale files claimed by the same destination ledger after replacement bytes are verified. Export MUST preserve unrelated files and unmanaged or ambiguous state.

#### Scenario: Targeted export preserves omitted peers
- **WHEN** a destination ledger owns plugins A and B and a targeted release export updates only A
- **THEN** export may update and retire stale paths only inside A's owned scope
- **AND** B's files and ledger claims remain unchanged

#### Scenario: Complete-set export removes only ledger-owned orphans
- **WHEN** a complete release set omits a prior member whose old paths are claimed by that destination ledger
- **THEN** export removes those paths only after the complete replacement set is written and verified
- **AND** same-named, byte-identical, or nearby unmanaged paths are preserved

### Requirement: Explicit collision and native-home exclusion
Export MUST obtain the complete known-native-home snapshot through a consumer-owned read-only `KnownNativeHomesReader`, not from request fields. C2 permits generated test adapters only; the future provider owner supplies the sole production adapter before command activation. The snapshot MUST bind provider read-model protocol, canonical home identities, completeness, and snapshot digest. A missing, failed, malformed, incomplete, caller-authored, or unverified snapshot MUST block before destination access. Export MUST then preflight live destination paths and apply `managed-only` by default. It MUST make only ledger-owned paths eligible for ordinary replacement according to their recorded ownership. Under explicit `replace-planned`, it MUST limit replacement and adoption to exact paths in the current plan after capturing their prior state for undo. Every unmanaged collision outside that explicit policy MUST be preserved and block the affected destination. A destination overlapping any known canonical native provider home MUST always block regardless of layout, release scope, or overwrite policy.

#### Scenario: Caller cannot weaken native-home exclusion
- **WHEN** a caller supplies an empty or partial home list, attempts a request override, or the injected known-native-home reader is absent, fails, or returns an incomplete snapshot
- **THEN** export rejects before reading a destination, ledger, or payload path
- **AND** only a complete verified reader snapshot may authorize overlap preflight

#### Scenario: Unmanaged collision blocks by default
- **WHEN** an unmanaged file exists at a planned export path under `managed-only`
- **THEN** export preserves the file and blocks that destination with the exact collision path
- **AND** name or byte equality does not confer ledger ownership

#### Scenario: Replace-planned is exact and reversible
- **WHEN** `replace-planned` is explicitly selected for an unmanaged file at an exact planned path
- **THEN** export captures the prior file state, replaces only that exact path, and adopts it into the destination ledger after verification
- **AND** siblings and unplanned descendants remain untouched

#### Scenario: Native provider overlap always blocks
- **WHEN** a canonical export destination overlaps any known canonical native provider home from the complete reader snapshot
- **THEN** export rejects before payload or ledger mutation even under `replace-planned`
- **AND** it performs no provider registration, installation, enablement, cleanup, receipt, or marketplace mutation

### Requirement: Payload publication is atomic and path-safe
Every planned payload file MUST remain lexically and canonically contained by the destination through a component-by-component parent walk that rejects symlinked, aliased, non-directory, or outside-resolving parents. An existing managed file MUST be a non-aliased regular file with link count one and MUST match the ledger-bound expected identity before replacement. `replace-planned` MUST accept only an exact planned non-aliased regular file with link count one whose bytes and identity were captured for inverse settlement. A symlink, hardlink, directory, device, socket, path alias, outside target, unexpected path appearance, or changed captured identity MUST block replacement and remain preserved.

Payload publication MUST write and verify an owner-created private same-parent regular file, revalidate the captured current path entry immediately before commit, and atomically rename the verified temporary entry without opening or truncating the live target. Missing planned parent directories MUST be created only through a validated component-wise transaction and revalidated before use. After any replacement, destination-visible type, link count, containment, and digest MUST be verified before ledger advance or orphan cleanup.

Operation-private payload and ledger temporary files are not destination ownership claims. Failed-operation cleanup MUST immediately revalidate the canonical same parent, owner-created direct-child private prefix, exact current-operation captured file identity, `lstat` non-symlink regular-file type, link count one, and realpath containment before individually unlinking only that file. A substituted, aliased, hardlinked, wrong-prefix, foreign, or nonregular temporary candidate MUST be preserved and reported; no temporary or parent cleanup may be recursive.

#### Scenario: Planned payload substitution fails closed
- **WHEN** a managed or `replace-planned` target or one of its parents is replaced before commit by a symlink, hardlink, directory, outside-resolving alias, unexpected regular file, or changed captured object
- **THEN** export blocks before replacing that path entry and preserves both the substituted object and any alias or hardlink target
- **AND** no orphan cleanup or ledger advance is authorized by the failed replacement

#### Scenario: Verified same-parent replacement never follows the target
- **WHEN** a valid managed file or exact `replace-planned` regular file is replaced
- **THEN** export verifies a private same-parent file, revalidates the expected live entry, and atomically replaces the path entry without opening or truncating it
- **AND** a failpoint at every publication boundary exposes either the exact prior entry or the exact verified replacement, with inverse staging for every applied replacement

#### Scenario: Substituted export temp is preserved
- **WHEN** a private payload or ledger temporary file is replaced before cleanup by a symlink, hardlink, directory, foreign regular file, wrong-prefix child, or outside-resolving alias
- **THEN** cleanup blocks before unlink and preserves the candidate and every alias or hardlink target
- **AND** the result reports cleanup failure without granting a ledger claim or recursively removing any destination path

### Requirement: Verified export transaction and truthful inverse actions
For each destination, export MUST inspect live state, produce a deterministic plan, capture exact prior state, apply planned replacements, verify destination-visible bytes, retire eligible ledger-owned orphans, verify final state, and atomically commit the ledger in that order. Before each external mutation, export MUST stage its typed inverse action through the controller-provided `UndoWriter`; the export service MUST NOT persist its own capsule. The complete candidate MUST group canonical destinations contiguously and in canonical order. Within each group, create-directory and write-payload actions MUST preserve deterministic plan order, retire-payload actions MUST follow the write phase, retire-directory actions MUST follow payload retirement in bottom-up plan order, and the sole optional write-ledger action MUST be final. Admission MUST reject duplicate paths or action digests, incomplete directory-creation or retirement closure, cross-destination interleaving, phase regression, and ledger-first or ledger-middle candidates before external mutation. The export application MUST bind the complete planner-produced digest order one-for-one to the admitted opaque handle order and MUST refuse execution if that list differs or develops a gap. Settlement MUST accept only an exact structurally valid applied prefix, including a prefix that stops during a directory-creation chain or before the final ledger action. After any mutation is applied, the controller capsule MUST preserve the exact applied subset, including mutations in a destination that later fails verification. A failure MUST report the actual applied, verified, retired, blocked, and failed subset and MUST NOT advance a destination ledger beyond verified live state.

#### Scenario: Replay-unsafe aggregate ordering is rejected
- **WHEN** a complete candidate moves a ledger action before another mutation, regresses an action phase, interleaves canonical destination groups, duplicates a path or action, leaves a directory-creation or retirement-closure gap, or differs from the planner-produced admitted digest list
- **THEN** owner-protocol admission rejects before controller begin or destination mutation
- **AND** settlement still accepts every exact valid applied prefix without inventing a missing ledger action or target binding

#### Scenario: Failure before mutation preserves all authority
- **WHEN** inspection, planning, collision preflight, or prior-state capture fails before the first destination mutation
- **THEN** payload, ledger, and controller undo capsule remain byte-for-byte unchanged
- **AND** no cleanup occurs

#### Scenario: Failure after one verified destination remains truthful
- **WHEN** destination A is applied and verified and destination B applies one replacement before failing verification
- **THEN** A's ledger advances, B's ledger does not, and the controller capsule contains inverse actions for A plus the exact applied B replacement
- **AND** per-destination results distinguish A's verified state from B's applied and failed state and no unverified B cleanup occurs

### Requirement: Repeated converged export is read-only
Export MUST recompute the plan from verified artifact bytes, read each live destination, and verify ledger agreement on every run. When payloads, layout, managed paths, and ledger already match, the operation MUST report convergence with zero payload, directory, metadata, ledger, cleanup, package, artifact, controller, provider, Oclif, or undo writes.

#### Scenario: Identical export changes nothing
- **WHEN** an identical targeted or complete export is repeated against a fully converged destination
- **THEN** export may read artifacts, the ledger, and destination paths but invokes no mutating port
- **AND** filesystem snapshots including mtimes and the prior undo capsule remain unchanged

### Requirement: Export deletion is ledger-bounded and path-safe
Every export removal MUST be a subset of canonical relative paths claimed by the same destination ledger or exact current-plan paths explicitly adopted under `replace-planned`. Immediately before file removal, export MUST revalidate canonical destination identity, lexical and realpath containment, the exact matching ledger claim, and that the live entry is the expected non-aliased regular file with link count one. It MUST unlink validated files individually and MUST prune only validated ledger-recorded empty directories with non-recursive removal in bottom-up order. It MUST NOT recursively remove any destination directory. A failed containment, type, symlink, hardlink, alias, emptiness, identity, or ledger check MUST preserve the path and block cleanup.

#### Scenario: Orphan file substitution is preserved
- **WHEN** a ledger-claimed orphan file is replaced before unlink by a symlink, hardlink, directory, special file, outside-resolving alias, or different regular-file identity
- **THEN** export blocks cleanup before unlink and preserves the substituted entry and every alias or hardlink target
- **AND** it does not advance the ledger or prune a parent based on the stale claim

#### Scenario: Recursive cleanup target is replaced by an alias
- **WHEN** a ledger-owned directory candidate is replaced before cleanup by a symlink, path alias, non-directory, outside-destination target, or directory containing an unmanaged descendant
- **THEN** directory removal is rejected before mutation and no recursive-removal operation is invoked
- **AND** the alias target, unmanaged descendant, destination ledger, and unrelated state remain unchanged

#### Scenario: Failed replacement cannot unlock orphan cleanup
- **WHEN** any replacement byte fails destination-visible verification
- **THEN** export performs no orphan retirement for that destination
- **AND** the prior ledger remains the truthful ownership boundary

### Requirement: Export cannot mutate adjacent authorities
The export service MUST own only deterministic layout rendering, explicit destination transactions, destination ledgers, collision policy, managed orphan collection, and export inverse-action emission. It MUST NOT import native provider adapters, mutate provider homes or receipts, read or mutate Oclif state, relink the controller, issue lifecycle acceptance, write personal repository records, or persist a service-local undo store. Its only permitted secondary state boundary is the controller-provided `UndoWriter`: bounded inverse staging MUST occur before an attempted external mutation, committed-capsule replacement MUST occur only for an actually applied subset, and an attempted mutation that applies nothing MUST abort its bounded staging while preserving the committed capsule.

#### Scenario: Adjacent mutation ports are trapped
- **WHEN** a mutating export and a converged export execute with provider, receipt, Oclif, controller, acceptance, personal repository, and service-local undo ports instrumented
- **THEN** every adjacent mutation counter remains zero
- **AND** only the declared `UndoWriter` may stage bounded inverse data before a mutation attempt and replace the committed capsule after an applied subset, while convergence performs neither write

#### Scenario: Mutation-call failure aborts only bounded staging
- **WHEN** export stages an inverse action and the corresponding destination mutation call fails before applying any external change
- **THEN** the controller aborts or clears only that bounded staging state and preserves the committed capsule byte-for-byte
- **AND** payload, ledger, provider, Oclif, controller selection, acceptance, personal repository, and service-local undo state remain unchanged

### Requirement: Export results are exhaustive state transitions
Each destination result MUST be exactly `ReadOnlyConverged`, `RejectedBeforeMutation`, `MutatedSettled`, or `MutatedUnsettled`. The overall multi-destination result MUST use the same closed transition classes while containing exhaustive destination variants. Only `MutatedUnsettled` may carry an applied-but-unverified sequence, pending capsule generation, or recovery requirement. `MutatedSettled` MUST distinguish applied, verified, retired, and preserved claims without a pending token. Rejection and convergence MUST carry no applied event. Every admitted aggregate MUST also carry one closed synchronization result, `NotAcquired`, `Released`, or `ReleaseFailed`, independently of its lifecycle class. A release failure MUST NOT rewrite a settled operation as unsettled or erase an unsettled primary failure. Primary, cleanup, and synchronization failures MUST remain separately available only in variants where they occurred. Optional boolean or event bags that permit contradictory authority claims MUST be unrepresentable.

#### Scenario: Partial multi-destination result has one legal shape
- **WHEN** destination A settles, destination B applies a replacement then fails verification, and destination C blocks before mutation
- **THEN** the overall result is `MutatedUnsettled` with A=`MutatedSettled`, B=`MutatedUnsettled`, and C=`RejectedBeforeMutation`
- **AND** no destination can simultaneously report convergence, rejection, and an applied mutation, while the aggregate reports synchronization release separately

