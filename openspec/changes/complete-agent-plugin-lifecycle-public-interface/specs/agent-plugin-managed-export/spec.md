## RENAMED Requirements

- FROM: `### Requirement: Explicit collision and native-home exclusion`
- TO: `### Requirement: Root ownership and collision handling are destination-local`

## MODIFIED Requirements

### Requirement: Root ownership and collision handling are destination-local
Export MUST own collision decisions only within its explicit canonical
destination and destination ledger. It MUST NOT acquire a provider-home registry,
provider receipt, target sidecar, ambient home scan, or caller-authored native
home list.

The fixed `.rawr-agent-plugin-owner.json` slot MUST contain canonical
newline-terminated JSON no larger than 4,096 bytes with exactly
`{schemaVersion:1, protocol:"rawr-agent-plugin-root-owner/v1", owner:"export", canonicalRoot, rootDigest}`.
For an absent destination, `canonicalRoot` MUST equal the verified stable
parent's absolute real path joined with one validated nonempty basename. The
basename MUST be one ordinary path component and MUST NOT be `.`, `..`, contain
a separator, or contain NUL. `rootDigest` MUST equal
`"rt1_" + hex(SHA-256(UTF8(canonicalRoot)))`. This one versioned marker establishes
mutually exclusive export ownership. Export may admit only an absent canonical
destination path. It MUST prepare and verify one private same-parent directory
containing the marker, then atomically publish that complete marked root with
no-replace semantics as its first controller-capsule-covered mutation before
payload publication. It MUST revalidate the opened parent identity immediately
before publication and verify the published root's real path equals
`canonicalRoot` immediately afterward. An existing marker MUST be a non-aliased regular file with
link count one whose closed canonical bytes bind owner `export`, marker protocol,
and canonical root identity. The marker persists while the root is an export
destination. An unmarked nonempty root, malformed/aliased/foreign marker, or
changed marker blocks before payload, ledger, or cleanup mutation, including
under `replace-planned`.

After root admission, export MUST preflight live destination paths and apply
`managed-only` by default, making only same-ledger-owned paths eligible for
ordinary replacement. Under `replace-planned`, it MUST limit replacement and
adoption to exact current-plan paths after capturing prior state for undo. Every
unmanaged or ambiguous collision outside that policy MUST be preserved and
block. Export MUST NOT infer provider ownership from path shape or native files;
provider operations honor the visible marker at their own boundary.

#### Scenario: Absent root becomes export-owned once
- **WHEN** export targets an absent canonical destination
- **THEN** its first mutation atomically publishes one complete owner-created
  marked root under the export capsule before any payload or ledger mutation

#### Scenario: Existing unowned root cannot be adopted
- **WHEN** export targets any existing root with no valid export marker
- **THEN** it blocks without payload, marker, ledger, cleanup, or capsule
  mutation even under `replace-planned`

#### Scenario: Provider and export admission cannot both win
- **WHEN** a provider request and export request select the same canonical path
- **THEN** provider requires that path to exist while export requires it to be
  absent through atomic no-replace publication, so exactly one side can reach
  its first external mutation without a registry or cross-owner lock

#### Scenario: Symlinked parent aliases cannot change prospective identity
- **WHEN** a lexical destination reaches an absent child through a symlinked or
  substituted parent
- **THEN** export derives identity from the verified real parent, revalidates
  that parent before no-replace publication, and blocks if the published root
  cannot verify as the exact prospective `canonicalRoot`

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
