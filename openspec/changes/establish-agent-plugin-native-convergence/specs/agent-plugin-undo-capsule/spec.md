## ADDED Requirements

### Requirement: Provider inverse actions use the existing controller capsule
Provider deployment MUST integrate one closed provider owner protocol with the existing controller-owned bounded last-operation capsule. Provider services and adapters MUST NOT persist a second capsule, command-scoped undo file, operation history, or replay authority.

#### Scenario: Provider mutation replaces the last capsule once
- **WHEN** one or more provider targets apply native mutations
- **THEN** the controller begins one candidate for the complete operation, settles one capsule for the exact applied subset, and replaces the prior last-operation capsule only according to controller state-machine rules

#### Scenario: Read-only convergence preserves capsule bytes
- **WHEN** every selected target is already converged
- **THEN** no capsule preflight, begin, replacement, settle, or clear occurs

#### Scenario: Planning precedes capsule admission
- **WHEN** a multi-target operation is planned
- **THEN** all target plans complete read-only and capsule bounds are preflighted and one candidate begins only if at least one admitted mutation exists

### Requirement: Provider actions bind exact target and receipt truth
Every provider inverse action MUST bind the provider ID, canonical home identity, admitted target receipt generation and digest when applicable, bounded prior native/sidecar observation, expected post observation, and exact owner protocol. First target-sidecar admission MUST bind prior absence and exact expected sidecar bytes. An action or observation from another target, generation, digest, or provider MUST reject before replay.

#### Scenario: Cross-home replay rejects
- **WHEN** an inverse action or observed-post binding from home A is presented with home B target state
- **THEN** codec validation or replay classification rejects without native or receipt mutation

#### Scenario: First target admission is reversible
- **WHEN** an `AdmitTargetIdentity` action is the first target action and exact undo restores all later provider and receipt actions
- **THEN** replay verifies the exact action-owned sidecar and removes it last, returning the target to prior absence

### Requirement: Partial multi-target application retains complete inverse coverage
One multi-target capsule candidate MUST include every planned target action in canonical order and MAY settle only the exact validated applied subset. A failure at a later target MUST NOT erase, replace, or overclaim inverse coverage for earlier applied targets.

#### Scenario: Later target failure preserves earlier inverse
- **WHEN** home A applies and verifies while home B fails after zero or some actions
- **THEN** the settled or recoverable capsule covers exactly A plus B's actual applied prefix and no unapplied action

### Requirement: Provider replay is owner-specific and receipt-bounded
Undo and cold recovery MUST dispatch provider actions only through the registered provider codec, live classifier, inverse executor, and prior verifier. Replay MUST restore or remove only exact action-owned native state and the matching target receipt, in reverse applied order, and MUST block on ambiguous or foreign live state rather than invoke generic filesystem deletion.

#### Scenario: Exact provider undo restores prior state
- **WHEN** all observed postconditions still match the capsule
- **THEN** undo restores the exact prior native registration, visibility, managed bytes, and receipt for every applied target, verifies the prior state, and clears the capsule once

#### Scenario: Transition and final registrations replay distinctly
- **WHEN** one applied target contains transition registration, receipt-owned retirement, and final registration actions
- **THEN** each registration has a distinct action identity and reverse replay restores final registration, retired members, and transition registration in exact reverse order before prior-state verification

#### Scenario: Foreign substitution blocks retryably
- **WHEN** native or receipt state no longer matches expected post or already-restored prior state
- **THEN** replay reports a target-scoped blocked outcome, preserves the capsule for retry, and leaves ambiguous state unchanged

### Requirement: Provider failpoints preserve controller recovery truth
Failures before mutation MUST preserve the prior capsule. Failures after external mutation but before observed-post binding MUST leave controller applying state for cold classification. Receipt-publication and inverse-replay failures MUST report exact persisted state without manufacturing rollback.

#### Scenario: Crash boundaries recover from stable state
- **WHEN** a fresh process resumes at each sidecar-admission, provider apply, verify, receipt, and replay boundary after source worktrees are absent
- **THEN** owner classification either completes exact recovery or blocks truthfully using only the capsule, stable artifacts, target state, and receipt store
