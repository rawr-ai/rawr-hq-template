## ADDED Requirements

### Requirement: Atomic official controller closure (B01, I01)
The system MUST execute every supported official command from one selected Template controller release. The payload-bound `app/rawr.mjs` release entry and every official command module MUST appear in one controller manifest with release-relative paths and verified payload digests. The stable `controller/bin/rawr` selector launcher is outside that release identity. Oclif user state MUST NOT supply, replace, or shadow an official member.

#### Scenario: Empty external registry retains the complete official command surface
- **WHEN** a verified controller release starts with an empty Oclif user registry
- **THEN** every controller-manifest command is discoverable and executable from that release
- **AND** no workspace scan, link, install, or repair occurs

#### Scenario: Cross-revision official module substitution fails read-only
- **WHEN** the release entry or one official module is replaced with bytes, metadata, commands, aliases, or hooks from another revision
- **THEN** activation rejects the candidate, or the release entry's ordinary verification fails before any official command or hook dispatch
- **AND** the selector, release bytes, and Oclif registry remain unchanged

#### Scenario: Official package cannot enter external user state
- **WHEN** an operator attempts to install or link a package ID reserved by the controller manifest
- **THEN** the external mutation is rejected before registry commit or candidate activation
- **AND** the selected controller remains unchanged

### Requirement: Stable materialized controller authority (B02, B32, I02, I17)
The system MUST build and activate controller releases below the stable Template data root resolved from `RAWR_DATA_DIR` or the platform XDG convention. Each release MUST contain its pinned Bun binary and the complete official controller bytes. A stable Template-owned launcher MUST read one atomic `<controller-digest>\n` selector exactly once, derive that digest-qualified release, neutralize ambient Bun/Node config, preloads, env-file loading, auto-install, module paths, cache, HOME/XDG config, and cwd, then execute fixed `runtime/bun` and `app/rawr.mjs` paths. The release entry MUST verify the ordinary envelope/payload contract before controller dispatch and MUST NOT reread the selector. The launcher MUST contain no command, repair, authentication, source lookup, alternate runtime, or fallback behavior. Runtime selection and operational state MUST NOT use cwd, an ambient Bun locator, a source checkout, a personal repository, a Git remote, or a worktree path.

#### Scenario: Source worktree deletion does not affect the selected controller
- **WHEN** a controller release is built and activated and the build checkout is then deleted
- **THEN** the global launcher, official commands, global doctor, and external-extension recovery commands remain usable
- **AND** every controller, official-module, and transitive controller-dependency realpath stays inside the one selected release
- **AND** any accepted external extension realpath remains separately governed by guarded native Oclif state

#### Scenario: Foreign content cwd is only ambient process context
- **WHEN** the selected controller is invoked with cwd set to a personal-like content repository containing copied or misleading CLI paths, hostile bunfig/global config, `.env`, and Bun/Node preload directives
- **THEN** command resolution still uses only the selected Template controller
- **AND** no hostile preload or env file executes or writes before the controller restores cwd as ordinary command context
- **AND** no file, remote, ancestry, or tree comparison from that repository participates in controller identity

#### Scenario: Source-local launcher has no release authority
- **WHEN** `apps/cli/bin/run.js` is invoked outside a verified materialized controller release
- **THEN** it exits with `CONTROLLER_RELEASE_REQUIRED`
- **AND** it does not fall back to adjacent source, an installed extension, another checkout, or a personal repository

#### Scenario: Missing bundled runtime has no fallback authority
- **WHEN** the selected release lacks its declared bundled Bun or app entry
- **THEN** launch fails before official or external command dispatch
- **AND** no ambient Bun, adjacent source entry, or other release is selected instead

### Requirement: Atomic activation and idempotent selection (B32, I01)
The activation script MUST validate a complete candidate controller before atomically replacing `controller/current` with exactly `<controller-digest>\n`. The stable launcher MUST validate that closed syntax, read it once, and derive one release context. The selector is the sole authority commit. A failure before selector commit MUST retain the prior selector bytes exactly and MUST NOT publish a newly prepared global alias. Re-selecting identical selector bytes MUST NOT rewrite the selector. The requested activation state is the selected digest plus the verified stable launcher and requested global alias. Only exact full-state convergence is read-only. Selector-equal auxiliary drift MUST be classified as settlement-required and MAY repair only the launcher or alias without rewriting the selector or rerunning the clean-start probe. A failure after selector commit MUST report the resulting unhealthy partial settlement truthfully; a retry MAY settle the auxiliary state but MUST NOT roll back or rewrite the selected digest merely to hide the failure.

#### Scenario: Candidate fails before selection
- **WHEN** candidate validation fails at any release-entry, member, dependency, command-surface, or runtime-path check
- **THEN** the prior controller remains selected and usable
- **AND** no partial selector or newly prepared global alias becomes visible

#### Scenario: Exact full-state activation is read-only
- **WHEN** the selected controller digest, stable launcher, and requested global alias are already verified and converged
- **THEN** the script inspects the live state and reports convergence
- **AND** it performs zero selector, release, global-link, or metadata writes

#### Scenario: Selector-equal auxiliary drift is settled without authority rewrite
- **WHEN** the selected controller digest already matches but the stable launcher or requested global alias is missing or drifted
- **THEN** activation reports settlement-required and repairs only the drifted auxiliary state
- **AND** it performs no selector write or clean-start probe

#### Scenario: Post-selector alias failure remains truthful and retryable
- **WHEN** the selector commit succeeds and the prepared global alias cannot be committed
- **THEN** activation returns an unhealthy partial-settlement result while leaving the new selected digest authoritative
- **AND** a retry may settle the alias without rewriting the selector, after which the next identical activation is read-only

#### Scenario: Concurrent activation cannot mix releases
- **WHEN** activation switches `current` from release A to B while a new invocation crosses each launch failpoint, including between the stable launcher's one selector read and release exec
- **THEN** each invocation uses the stable selector launcher and only A or only B for release entry, envelope, dependency bytes, and commands
- **AND** no invocation observes a mixed release context

### Requirement: Non-circular complete payload identity (B01, B32)
The system MUST derive `ControllerDigest` from a canonical digest-free payload manifest that enumerates every controller, official-module, and transitive controller-dependency file, link, mode, and byte digest inside one release. The claimed digest and payload manifest MUST live in a separate verified envelope. No controller-owned executable byte may come from a sibling release, shared mutable dependency store or inode, checkout, or unenumerated path. Materialization MUST create independent file storage and verification MUST reject regular files whose link count is greater than one. Guarded external-extension bytes remain outside this payload and under native Oclif authority.

#### Scenario: Installed dependency tampering fails before dispatch
- **WHEN** any installed dependency file, mode, or internal link differs from the payload manifest
- **THEN** envelope verification fails before command or hook dispatch
- **AND** controller selection, release bytes, and external registry remain unchanged

#### Scenario: Sibling-release alias is rejected
- **WHEN** a payload link is changed to resolve into a sibling release or shared data-root directory containing byte-identical content
- **THEN** containment verification rejects the link before dispatch
- **AND** path or byte equivalence does not grant authority

#### Scenario: Shared hardlink is rejected
- **WHEN** a payload file is hardlinked to a checkout, shared dependency store, sibling release, or other path outside the selected release
- **THEN** materialization or verification rejects its shared inode before command or hook dispatch
- **AND** byte equivalence and in-release realpath do not grant independent authority

#### Scenario: Genuine external bytes remain outside controller identity
- **WHEN** the external-only Hello fixture is guarded and linked through the native Oclif manager
- **THEN** its command may execute from the native external root after controller verification
- **AND** its bytes and path do not enter or alter the controller payload manifest, digest, selector, or official closure

### Requirement: Mutation-free universal bootstrap (B01-B03, B32)
Controller bootstrap MUST NOT expire undo state, write journals, invoke HQ Ops or lifecycle applications, or perform any other pre-dispatch or post-dispatch secondary mutation. Read-only and recovery commands MUST have zero writes outside their explicitly invoked state owner.

#### Scenario: Read-only and recovery commands have no bootstrap writes
- **WHEN** version, global doctor, external list/inspect, absent uninstall, or empty reset runs with every non-owner write port trapped
- **THEN** bootstrap records zero undo, journal, HQ Ops, lifecycle, selector, release, and unrelated filesystem writes
- **AND** only a requested external mutation may change native Oclif state

### Requirement: Complete read-only controller provenance (B01, B32)
`rawr doctor global` MUST report the selected controller digest, stable data root, selector status, stable selector-launcher path, payload-bound release-entry path and verification, bundled Bun path/version/revision provenance, dependency-lock digest, every official member and verification result, global command resolution, and external-extension health. It MUST NOT repair, activate, relink, rebuild, or mutate any reported state.

#### Scenario: Healthy controller provenance is one closed revision
- **WHEN** all selected release bytes and runtime paths match the controller manifest
- **THEN** global doctor reports one controller digest for the payload-bound release entry and complete official member set, while naming the stable selector launcher separately
- **AND** reports no checkout owner or personal repository identity

#### Scenario: Incomplete or mixed member remains diagnosable
- **WHEN** an official member digest or runtime path does not match the selected manifest
- **THEN** global doctor returns an unhealthy machine-readable result naming the mismatch
- **AND** all controller, registry, and filesystem mutation counters remain zero

### Requirement: Explicit complete command-package classification (B01)
Every Template CLI command package MUST have exactly one checked-in classification as a controller member or external fixture. Workspace presence, `rawr.kind`, current links, and directory location MUST NOT infer membership.

#### Scenario: Unclassified command package blocks release construction
- **WHEN** a Template CLI package exists without exactly one controller classification
- **THEN** the controller release build fails before durable artifact output
- **AND** the error names the unclassified or multiply classified package

#### Scenario: External fixture stays outside the controller
- **WHEN** the controller release is built with `@rawr/plugin-hello` present in the Template workspace
- **THEN** `hello` is absent from the controller manifest and command discovery
- **AND** becomes available only after an explicit guarded external link
