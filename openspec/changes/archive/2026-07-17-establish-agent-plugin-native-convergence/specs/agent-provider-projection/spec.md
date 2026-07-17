## ADDED Requirements

### Requirement: Provider projections consume immutable artifacts only
The projection renderer MUST declare a narrow consumer-owned `VerifiedReleaseReader` using only artifact-ref and verified-snapshot types from the pure release package. It MUST consume C2 release or complete-set snapshots only through the sole production artifact-reader adapter bound at the composition root. The provider service MUST NOT import build, export, packaging, promotion, or legacy aggregate services. It MUST NOT read a content worktree, source path, mutable caller buffer, destination ledger, provider receipt, or channel record as provider-visible content and MUST NOT rebuild a missing or invalid artifact.

#### Scenario: Source checkout is unnecessary
- **WHEN** verified release artifacts remain after the content checkout is removed
- **THEN** every accepted provider projection renders and verifies identically without source access

#### Scenario: Missing artifact blocks without rebuild
- **WHEN** an accepted release or set artifact is absent, tampered, or mismatched
- **THEN** projection and deployment block with no Git content read, build, publication, provider, receipt, or capsule mutation

### Requirement: Projection identity covers all provider-visible output
An `AgentProviderProjection` digest MUST canonically bind provider identity, renderer protocol, adapter protocol, immutable member/set refs, native package files and modes, provider metadata, visible plugin/skill/hook identities, and its semantic capability profile. Home paths, mtimes, traversal order, receipts, lifecycle authorization records, and operation state MUST be excluded.

#### Scenario: Permutations preserve projection identity
- **WHEN** equivalent immutable inputs differ only by input order, traversal order, object allocation, or checkout location
- **THEN** the canonical projection bytes and digest are identical

#### Scenario: Provider-visible mutation changes identity
- **WHEN** any emitted byte, file mode, native metadata, visible identity, renderer protocol, adapter protocol, or capability requirement changes
- **THEN** the projection digest changes and prior acceptance cannot authorize canonical deployment

### Requirement: Semantic capability profiles govern compatibility
Every projection MUST carry a bounded semantic provider capability predicate and exact adapter protocol identity covering the native operations and visibility needed by that projection. Canonical preflight and status MUST verify the live adapter protocol and evaluate observed capabilities against the predicate; exact provider version equality MUST NOT substitute for protocol compatibility or capability satisfaction unless the predicate explicitly includes it.

#### Scenario: Compatible newer or alternate version proceeds
- **WHEN** an observed provider version differs from evaluation but satisfies every accepted semantic capability predicate
- **THEN** the target remains compatible

#### Scenario: Nominal version missing capability blocks
- **WHEN** the nominally accepted version lacks any required native install, enablement, inventory, hook, skill-visibility, or removal capability
- **THEN** the target is `INCOMPATIBLE_PROVIDER` and no mutation begins

#### Scenario: Adapter protocol changed after acceptance blocks
- **WHEN** native package bytes remain identical but the selected adapter protocol differs from the accepted projection binding
- **THEN** status and canonical preflight classify the target incompatible until the new projection and adapter protocol receive governed acceptance

### Requirement: Native renderer set is explicit and closed
The Template renderer registry MUST explicitly enumerate supported native providers and MUST reject an unknown provider. Codex and Claude projections MUST preserve their native plugin species; no renderer may fall back to standalone skill projection or generic export. Cowork MUST NOT appear as a provider renderer.

#### Scenario: Native renderer is selected explicitly
- **WHEN** a supported provider projection is requested
- **THEN** exactly one provider renderer handles it and produces one native package per selected curated release member

#### Scenario: Fallback is unavailable
- **WHEN** native rendering or installation is unsupported or fails while a direct filesystem layout could be produced
- **THEN** the operation blocks rather than invoking export or standalone-skill projection

### Requirement: Byte-identical renderer refactors remain compatible
A controller implementation change under the same renderer and adapter protocols that reproduces the exact accepted canonical projection bytes and digest MUST remain compatible. A changed projection or adapter protocol MUST require new provider-visible acceptance before canonical convergence.

#### Scenario: Refactor preserves accepted digest
- **WHEN** renderer or adapter implementation changes under unchanged protocols but canonical provider-visible output and capability profile are byte-identical
- **THEN** the existing accepted projection binding remains valid

#### Scenario: Rendering change requires acceptance
- **WHEN** a renderer change alters canonical output or its capability predicate
- **THEN** canonical convergence rejects until governed acceptance binds the new projection digest

### Requirement: Projection is deterministic and side-effect free
Projection construction and verification MUST perform no provider, receipt, capsule, export, Oclif, app-composition, channel, or filesystem publication mutation.

#### Scenario: Renderer mutation ports are trapped
- **WHEN** projection success and every validation failure are exercised
- **THEN** the only observable dependency calls are immutable artifact reads

### Requirement: Projection materialization is stable derived state
Canonical projection bytes used as native package sources MUST materialize below a stable Template runtime projection root keyed only by verified projection digest. Existing materialization MUST be verified before reuse, a missing entry MUST be reproducible only from verified immutable artifacts, and a converged repeat MUST not rewrite it. Materialization MUST NOT become release, channel, provider-home, receipt, or worktree identity.

#### Scenario: Stable package source survives worktree removal
- **WHEN** an accepted projection is materialized and all source worktrees disappear
- **THEN** native installation and verification use the digest-addressed stable projection bytes without changing their identity

#### Scenario: Existing verified materialization is read-only
- **WHEN** the digest-addressed projection entry already matches canonical bytes
- **THEN** materialization performs verification reads and zero writes or metadata churn
