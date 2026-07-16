## ADDED Requirements

### Requirement: External-only native Oclif state (B03, I08)
Template-owned bare `rawr plugins install|link|uninstall|list|inspect|update|reset` projections MUST be the sole user-facing command owner. Mutating projections MUST delegate only through the public `@oclif/plugin-plugins#commands` export, whose package-internal native manager remains the sole native-registry writer and owns only genuine external CLI extensions. The controller MUST add no copied/deep-imported manager or direct registry writer, MUST disable automatic raw user-plugin loading, and MUST NOT create a second registry or use external state for official modules.

#### Scenario: Valid external extension activates through native state
- **WHEN** a genuine external extension with a valid static manifest claims no reserved identity and is linked successfully
- **THEN** the native Oclif registry records it once and its declared commands become available
- **AND** the controller manifest and selector remain unchanged

#### Scenario: Official modules work without native user entries
- **WHEN** every native Oclif user entry is removed
- **THEN** the complete official controller command surface remains available
- **AND** external list reports an empty user registry rather than missing official modules

### Requirement: Pre-load reserved-surface guard (B03)
Before extension command or hook modules load, the system MUST parse static package and command manifests and reject collisions with controller package IDs, command IDs, topics, aliases, hidden aliases, or hooks. Malformed, missing, or dynamically undiscoverable manifests MUST be rejected without importing candidate runtime modules.

#### Scenario: Each reserved identity class is rejected before import
- **WHEN** separate candidates claim a reserved package ID, command ID, topic, alias, hidden alias, or hook
- **THEN** each candidate is rejected with the exact collision class before registry commit or module import
- **AND** a candidate top-level import sentinel remains untouched

#### Scenario: Missing or malformed static manifest is quarantined
- **WHEN** a linked registry entry has no usable static manifest or contains invalid command metadata
- **THEN** the entry is excluded from active Oclif configuration and reported as quarantined for that invocation
- **AND** startup performs no registry or package mutation

### Requirement: Recovery-safe core dispatch (B03)
A missing, broken, colliding, or throwing external extension MUST NOT prevent core startup or `rawr`, `doctor global`, and `plugins list|inspect|uninstall|reset` recovery behavior. Recovery dispatch MUST execute without active external hooks.

#### Scenario: Deleted linked path cannot block removal
- **WHEN** a native link points to a deleted directory
- **THEN** core help, global doctor, external list and inspect remain available
- **AND** uninstall removes only that native registry entry without loading extension code

#### Scenario: Throwing external hook is isolated from recovery
- **WHEN** an accepted extension later exposes a hook that throws during normal startup
- **THEN** core recovery dispatch starts without that hook and reports the extension failure
- **AND** uninstall or reset can restore a healthy external registry

### Requirement: Guarded native external mutation (B03)
The Template projection MUST return exactly `delegate-native`, `converged`, or `reject` and MUST NOT write registry package JSON, lock data, installed trees, or link entries. Install MUST delegate the exact inspected local package artifact. Link MUST require a static manifest, disable dependency installation, and compare the actual linked manifest after native return. Update MUST run without package scripts or external hooks and MUST validate the actual resulting entries before activation. Native commands MUST run by exact path through the invocation's already-verified bundled Bun binary in a dedicated `userPlugins:false` subprocess launched with platform-null explicit config and temporary HOME/XDG, controller cwd, no-env/no-install flags, and scrubbed preload/env/module inputs. No selected-release or user-controlled bootstrap config/home may be consulted. Package scripts MUST be disabled, manager lifecycle hooks reserved, nested candidate plugins rejected, ambient discovery scrubbed, and a runtime import sandbox installed. A filesystem module may load only when both its normalized requested/resolved path and canonical realpath are inside the selected controller release; outside-to-inside aliases reject. Candidate code, hooks, package scripts, env files, and dynamic manifest generation MUST NOT execute even when nested native `Config.load` falls back. Rejection MUST occur before native mutation, while invalid post-mutation results MUST remain quarantined and unactivated. `reset --reinstall` MUST reject before native dispatch. Staging output MUST be removed. Uninstall and reset MUST operate without loading candidate code.

#### Scenario: Failed link leaves no partial activation
- **WHEN** a candidate passes package acquisition but fails reserved-surface or runtime verification
- **THEN** the policy rejects before native command dispatch and native registry mutation
- **AND** controller and official command state are unchanged

#### Scenario: Native failure residue never activates or blocks recovery
- **WHEN** a non-empty native home with active, quarantined, and broken entries faults separately during native install, link, or update after guard approval
- **THEN** any partial candidate residue is excluded from active configuration and reported as quarantined on the next guarded read
- **AND** staging output is absent, controller state is unchanged, prior valid extensions remain governed by native state, and core list/doctor/uninstall/reset remain usable

#### Scenario: Actual mutation output is the activation input
- **WHEN** native update produces bytes different from an earlier registry observation or a linked manifest changes during the native operation
- **THEN** guarded postvalidation evaluates the actual resulting native root before any candidate command, hook, or script executes
- **AND** a mismatch or reserved identity remains quarantined rather than inheriting approval from preflight

#### Scenario: Nested native loading cannot execute candidate code
- **WHEN** install or link encounters a missing or version-mismatched root/child manifest, candidate-declared nested Oclif plugin, ambient candidate user plugin, ESM/CommonJS dynamic-discovery fallback, or outside symlink/file URL whose canonical target is a controller module
- **THEN** the controller-root-only import sandbox rejects every candidate module resolution before evaluation
- **AND** the native operation fails or leaves quarantined residue while controller and prior external command state remain usable

#### Scenario: Runtime mismatch refuses native mutation
- **WHEN** the launcher or manager child observes a Bun path/digest/platform/architecture/version/full revision different from the controller envelope, the trampoline target identity mismatches, or a hostile cwd/global/selected-release bunfig, bootstrap-home tree, `.env`, `BUN_OPTIONS`, `NODE_OPTIONS`, or preload tries to execute before its entrypoint
- **THEN** it fails closed before importing the native command class or candidate module
- **AND** the hostile sentinel, native registry, candidate staging, controller selection, and every unrelated state owner record zero writes

#### Scenario: Reset cannot bypass per-candidate guarding
- **WHEN** an operator invokes `plugins reset --reinstall`
- **THEN** the Template projection rejects before the native reset command dispatches
- **AND** no native install, link, package script, candidate hook, or registry mutation occurs

#### Scenario: Every converged external operation is read-only
- **WHEN** converged install, link, update, absent uninstall, and empty reset are each repeated
- **THEN** pre-dispatch policy verifies native state, reports `converged`, and does not dispatch the native mutation command
- **AND** performs zero registry/package write, reinstall, hook load, metadata churn, controller mutation, or non-Oclif mutation

### Requirement: Hermetic recovery survives source deletion (B02, B03, B32)
Clean-home acceptance MUST use a fresh process after deleting every source and verifier checkout, with isolated HOME/XDG/data roots, scrubbed workspace/module environment, and a foreign cwd. The same run MUST combine official command use with missing, colliding, and throwing-extension recovery.

#### Scenario: Fresh process uses only installed authority
- **WHEN** source and verifier trees are deleted and a fresh process starts with a valid-static-manifest extension whose top-level command import throws
- **THEN** official commands, global doctor, and external list/inspect/uninstall/reset operate from the installed controller and native registry only
- **AND** recovery never imports the throwing candidate, resolves a workspace module, or reads the foreign cwd as authority

### Requirement: Lifecycle paths cannot mutate Oclif authority (B01, I01, I08)
Agent, provider, export, app, status, doctor, sync, and interim mixed-lifecycle commands MUST NOT install, link, update, uninstall, reset, or repair external extensions or official controller modules.

#### Scenario: Lifecycle command mutation ports are trapped
- **WHEN** every surviving lifecycle read or mutation command is invoked with Oclif mutation ports instrumented
- **THEN** every invocation records zero external-registry mutation calls
- **AND** any official provenance mismatch is reported rather than repaired

#### Scenario: Workspace package discovery does not change commands
- **WHEN** an additional compatible CLI package or worktree appears under a scanned workspace path
- **THEN** controller and external command discovery remain unchanged
- **AND** no build, link, registry write, or next-invocation authority change occurs
