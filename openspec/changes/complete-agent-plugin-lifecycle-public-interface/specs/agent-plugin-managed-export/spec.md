## RENAMED Requirements

- FROM: `### Requirement: Explicit collision and native-home exclusion`
- TO: `### Requirement: Root ownership and collision handling are destination-local`

## MODIFIED Requirements

### Requirement: Root ownership and collision handling are destination-local
Export MUST own collision decisions only within its explicit canonical
destination and destination ledger. It MUST NOT acquire a provider-home registry,
provider receipt, target sidecar, ambient home scan, or caller-authored native
home list.

The fixed `.rawr-agent-plugin-owner.json` slot MUST contain exactly the canonical
newline-terminated bytes `{"owner":"export","schemaVersion":1}\n`. Export owns
this private marker policy; providers recognize only occupancy of the fixed
slot and MUST NOT import or parse its codec. The export resource MUST admit an
explicit destination only when it is absent or is an existing directory with
those exact marker bytes. For an absent destination, the resource MUST prepare
one private same-parent directory containing the exact marker and atomically
publish it no-replace through an admitted root-publication action. Capture MUST
represent root state with an owner-local discriminated observation, and the
existing private export resource/action unions MUST gain one forward
root-publication variant and its matching inverse-action variant. The private
export action codec and undo sequence own those variants; they create no service,
receipt, ledger, registry, or shared protocol. Capture MUST record the absent-root
observation before admission; publication and its exact inverse MUST be in the
same frozen action set before undo preflight and begin; and apply MUST revalidate
final-path absence before publication. The final
destination MUST NOT be observable as an unmarked directory. Its inverse MAY
remove only the exact unchanged marker and then-empty owner-created root after
payload undo. Root admission and its applied prefix MUST use the existing export
capsule/result accounting; no second transaction, root receipt, digest, registry,
or provider field is added. Preparation or publication failure MAY remove only
that owner-created private directory after exact path, parent, directory,
non-symlink, and containment guards. An existing unmarked directory, different
marker bytes, file, or unreadable root MUST block without payload, ledger, or
cleanup mutation, including under `replace-planned`.

After root admission, export MUST preflight live destination paths and apply
`managed-only` by default, making only same-ledger-owned paths eligible for
ordinary replacement. Under `replace-planned`, it MUST limit replacement and
adoption to exact current-plan paths after capturing prior state for undo. Every
unmanaged or ambiguous collision outside that policy MUST be preserved and
block. Export MUST NOT infer provider ownership from path shape or native files;
provider operations honor the visible marker at their own boundary.

#### Scenario: Absent root becomes export-owned once
- **WHEN** export targets an absent canonical destination
- **THEN** its first transaction action atomically publishes one already-marked
  private directory before payload or ledger mutation

#### Scenario: Exact marked root is reused
- **WHEN** export targets an existing directory with the exact marker bytes
- **THEN** root admission is read-only and destination-ledger rules decide the
  requested payload transition

#### Scenario: Private publication failure advances no committed state
- **WHEN** exact-marker preparation or no-replace publication fails for an
  absent destination
- **THEN** export returns non-success with no final root, payload, ledger,
  applied prefix, or committed capsule advancement and cleanup is limited to
  the exactly guarded owner-created private directory

#### Scenario: Existing unowned root cannot be adopted
- **WHEN** export targets any existing root with no valid export marker
- **THEN** it blocks without payload, marker, ledger, cleanup, or capsule
  mutation even under `replace-planned`

#### Scenario: Provider cannot enter an unmarked publication window
- **WHEN** export and provider admission overlap on one absent final path
- **THEN** the final path is either absent or already marked, so provider cannot
  begin native mutation in an export-created unmarked directory

#### Scenario: Provider side state cannot authorize export
- **WHEN** provider receipts, target sidecars, native inventory, or an old
  native-home registry exist or are stale
- **THEN** export neither reads nor uses them and derives ownership only from
  the visible root marker plus destination ledger

#### Scenario: Unmanaged collision blocks by default
- **WHEN** an unmanaged file appears at a planned path inside a valid marked
  destination under `managed-only`
- **THEN** export preserves it and blocks with the exact collision path

#### Scenario: Replace-planned is exact and reversible
- **WHEN** `replace-planned` selects an unmanaged file at an exact planned path
  inside a valid marked destination
- **THEN** export captures prior state, replaces only that path, and adopts it
  into the destination ledger after verification
