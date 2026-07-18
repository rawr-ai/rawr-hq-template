## MODIFIED Requirements

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
