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
those exact marker bytes. Ordinary export MUST NOT admit `Absent` until an
authorized claim mechanism can make the root visible only as an exact
already-marked directory through one no-replace authority transition. A
competing root MUST be preserved and block. A provider observing concurrently
MUST NOT be able to enter an export-created unmarked publication window. The
claim MUST finish before payload, ledger, or undo-capsule work. Once visible,
the exact root and marker are monotonic: payload and ledger undo MUST NOT remove
either, and no root inverse action exists. No root receipt, digest, registry,
provider field, repair protocol, or second transaction is added. An existing
unmarked directory, different marker bytes, file, symlink, or unreadable root
MUST block without payload, ledger, or cleanup mutation, including under
`replace-planned`.

After root admission, export MUST preflight live destination paths and apply
`managed-only` by default, making only same-ledger-owned paths eligible for
ordinary replacement. Under `replace-planned`, it MUST limit replacement and
adoption to exact current-plan paths after capturing prior state for undo. Every
unmanaged or ambiguous collision outside that policy MUST be preserved and
block. Export MUST NOT infer provider ownership from path shape or native files;
provider operations honor the visible marker at their own boundary.

#### Scenario: Authorized publication claims an absent root once
- **WHEN** an authorized no-replace claim mechanism is selected and ordinary
  export targets an absent canonical destination
- **THEN** its resource boundary publishes the root already carrying the exact
  marker without replacing any existing entry and completes before payload,
  ledger, or capsule mutation

#### Scenario: Absent root is blocked before mechanism authorization
- **WHEN** ordinary export targets an absent destination before a claim
  mechanism is authorized
- **THEN** it refuses without creating a root or advancing payload, ledger, or
  capsule state

#### Scenario: Exact marked root is reused
- **WHEN** export targets an existing directory with the exact marker bytes
- **THEN** root admission is read-only and destination-ledger rules decide the
  requested payload transition

#### Scenario: Provider cannot enter an unmarked publication window
- **WHEN** the authorized claim mechanism transitions an absent destination
  while a provider observes the same path
- **THEN** the provider can observe only a missing home or the occupied marker,
  never an export-created unmarked directory eligible for provider mutation

#### Scenario: Failed native claim advances no export state
- **WHEN** the native no-replace root claim fails and no competing entry exists
- **THEN** export returns non-success with no export-created root, marker,
  payload, ledger, cleanup, or capsule advancement and the destination remains
  absent

#### Scenario: Competing native claimant wins the root
- **WHEN** another claimant publishes any entry before a native publication
  invocation commits
- **THEN** this invocation preserves the winner and refuses without payload,
  ledger, cleanup, or capsule mutation; it does not adopt even an exact export
  marker until a cold retry re-observes it

#### Scenario: Cold retry admits an exact winner without rewriting authority
- **WHEN** a later invocation re-observes the exact export marker left by a
  completed claim
- **THEN** it admits the root read-only with zero root or marker writes

#### Scenario: Claim survives later planning refusal truthfully
- **WHEN** a claim commits and later payload or undo preflight rejects
- **THEN** the non-success result reports the durable exact export claim and
  neither removes nor implies absence of the root or marker

#### Scenario: Existing unowned root cannot be adopted
- **WHEN** export targets any existing root with no valid export marker
- **THEN** it blocks without payload, marker, ledger, cleanup, or capsule
  mutation even under `replace-planned`

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
