## ADDED Requirements

### Requirement: Atomic official controller closure (B01, I01)
The system MUST execute every supported official command from one selected Template controller release. The launcher and every official command module MUST appear in one controller manifest with release-relative paths and verified payload digests. Oclif user state MUST NOT supply, replace, or shadow an official member.

#### Scenario: Empty external registry retains the complete official command surface
- **WHEN** a verified controller release starts with an empty Oclif user registry
- **THEN** every controller-manifest command is discoverable and executable from that release
- **AND** no workspace scan, link, install, or repair occurs

#### Scenario: Cross-revision official module substitution fails read-only
- **WHEN** the launcher or one official module is replaced with bytes, metadata, commands, aliases, or hooks from another revision
- **THEN** controller verification fails before that module executes
- **AND** the selector, release bytes, and Oclif registry remain unchanged

#### Scenario: Official package cannot enter external user state
- **WHEN** an operator attempts to install or link a package ID reserved by the controller manifest
- **THEN** the external mutation is rejected before registry commit or candidate activation
- **AND** the selected controller remains unchanged

### Requirement: Stable materialized controller authority (B02, B32, I02, I17)
The system MUST build and activate platform/architecture-specific controller releases below the stable Template data root resolved from `RAWR_DATA_DIR` or the platform XDG convention. Each release MUST contain its pinned Bun binary bytes. Each envelope MUST bind one exact target-specific `BootstrapTrampolineIdentity` containing protocol, platform, architecture, stable install-relative path, and byte digest, plus the bundled runtime and launcher release-relative paths/digests and exact Bun version/full revision. The non-shell native Template trampoline MUST parse one bounded canonical binary selector record, verify its own target contract and the selected runtime/launcher containment and bytes, and neutralize ambient shell/Bun/Node config, preloads, env-file loading, auto-install, module paths, cache, HOME/XDG config, and cwd before any JavaScript executes. It MUST use only the platform null device for Bun config and temporary HOME/XDG; no selected-release or user-controlled config/home path may be a pre-entry input. The selector-hashed launcher MUST be a self-contained single-file bundle of the pure verifier and minimal entry composition, and MUST load only bundled-runtime built-ins until the complete envelope and payload verify. Bootstrap MUST fail closed on mismatch before dispatch. Runtime selection and operational state MUST NOT use cwd, an ambient Bun locator, a source checkout, a personal repository, a Git remote, or a worktree path.

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

#### Scenario: Selected-release bootstrap inputs are inert
- **WHEN** a selected release contains a hostile root bunfig, purported bootstrap-home/config tree, `.env`, or preload sentinel in addition to its declared payload
- **THEN** the trampoline launches with platform-null config and HOME/XDG plus disabled env loading and auto-install
- **AND** no selected-release bootstrap input executes or writes before launcher verification

#### Scenario: Verifier dependency cannot execute before verification
- **WHEN** a tampered release adds, replaces, or redirects a verifier helper or package module that the launcher could otherwise import
- **THEN** the selector-hashed single-file launcher loads no filesystem module before complete payload acceptance
- **AND** the tampered import sentinel remains untouched and verification fails read-only

#### Scenario: Source-local launcher has no release authority
- **WHEN** `apps/cli/bin/run.js` is invoked outside a verified materialized controller release
- **THEN** it exits with `CONTROLLER_RELEASE_REQUIRED`
- **AND** it does not fall back to adjacent source, an installed extension, another checkout, or a personal repository

#### Scenario: Unsupported runtime has no controller authority
- **WHEN** the selected launcher starts under a Bun path, byte digest, platform, architecture, version, or full revision that differs from its envelope
- **THEN** it exits with `CONTROLLER_RUNTIME_MISMATCH` before official or external command dispatch
- **AND** it performs zero selector, release, registry, journal, undo, or unrelated writes

#### Scenario: Trampoline target mismatch cannot select a controller
- **WHEN** the global path or selector presents a valid trampoline protocol or binary from a different platform/architecture target, or its installed path/digest differs from the envelope
- **THEN** install or activation rejects before replacing the selector and bootstrap refuses execution
- **AND** the prior controller remains selected byte-for-byte

### Requirement: Atomic activation and idempotent selection (B32, I01)
The activation script MUST validate a complete candidate controller and installed target trampoline before atomically replacing one canonical `ControllerSelectorV1` record at `controller/current.v1`. The selector MUST bind controller digest and target plus contained runtime/launcher paths and byte digests, and its native parser MUST reject unknown, trailing, noncanonical, oversized, or unsafe-path data. The loaded launcher MUST derive one verified release context from the canonical path of its already-loaded entry module and MUST NOT reread the selector in application code. Failure MUST retain the prior selector bytes exactly, and re-selecting identical canonical bytes MUST perform no write.

#### Scenario: Candidate fails before selection
- **WHEN** candidate validation fails at any launcher, member, dependency, command-surface, or runtime-path check
- **THEN** the prior controller remains selected and usable
- **AND** no partial selector or global launcher target becomes visible

#### Scenario: Identical activation is read-only
- **WHEN** the selected controller digest is activated again
- **THEN** the script verifies the live selection and reports convergence
- **AND** it performs zero selector, release, global-link, or metadata writes

#### Scenario: Concurrent activation cannot mix releases
- **WHEN** activation switches `current.v1` from release A to B while a new invocation crosses each bootstrap failpoint, including between the trampoline's one selector-record read and digest-qualified exec
- **THEN** each invocation uses only A or only B for launcher, envelope, dependency bytes, and commands
- **AND** no invocation observes a mixed release context

#### Scenario: Entry spelling cannot select a different release
- **WHEN** the trampoline entry argument or an outside symlink canonicalizes differently from the already-loaded launcher module
- **THEN** bootstrap rejects before deriving release context or importing controller code
- **AND** only the canonical loaded-module realpath could have supplied release identity

### Requirement: Non-circular complete payload identity (B01, B32)
The system MUST derive `ControllerDigest` from a canonical digest-free payload manifest that enumerates every controller, official-module, and transitive controller-dependency file, link, mode, and byte digest inside one release. The claimed digest and payload manifest MUST live in a separate verified envelope. No controller-owned executable byte may come from a sibling release, shared mutable dependency store, checkout, or unenumerated path. Guarded external-extension bytes remain outside this payload and under native Oclif authority.

#### Scenario: Installed dependency tampering fails before dispatch
- **WHEN** any installed dependency file, mode, or internal link differs from the payload manifest
- **THEN** envelope verification fails before command or hook dispatch
- **AND** controller selection, release bytes, and external registry remain unchanged

#### Scenario: Sibling-release alias is rejected
- **WHEN** a payload link is changed to resolve into a sibling release or shared data-root directory containing byte-identical content
- **THEN** containment verification rejects the link before dispatch
- **AND** path or byte equivalence does not grant authority

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
`rawr doctor global` MUST report the selected controller digest, stable data root, canonical selector status, target-specific bootstrap trampoline path/digest/protocol/platform/architecture, bundled Bun path/digest/platform/architecture and supported/observed version/revision, launcher path/digest, dependency-lock digest, every official member and verification result, global command resolution, and external-extension health. It MUST NOT repair, activate, relink, rebuild, or mutate any reported state.

#### Scenario: Healthy controller provenance is one closed revision
- **WHEN** all selected release bytes and runtime paths match the controller manifest
- **THEN** global doctor reports one controller digest for the launcher and complete official member set
- **AND** reports no checkout owner or personal repository identity

#### Scenario: Tampered member remains diagnosable
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
