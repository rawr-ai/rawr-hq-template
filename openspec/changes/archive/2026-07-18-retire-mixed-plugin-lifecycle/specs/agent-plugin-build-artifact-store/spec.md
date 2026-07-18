## RENAMED Requirements

- FROM: `### Requirement: Build owner remains isolated and inactive`
- TO: `### Requirement: Release and vendor modules preserve artifact authority`

## MODIFIED Requirements

### Requirement: Release and vendor modules preserve artifact authority
The lifecycle service's `releases` module MUST own explicit Git verification, release construction, content-addressed publication, lookup, verification, and retention. Its `vendors` module MUST own repository-vendor observation and reviewable authoring. Neither module may import provider adapters, export ledgers, packaging output ownership, Oclif state, app composition, acceptance authorization, or personal executable code. Their operator reachability MUST be limited to the exact qualified `rawr agent plugins check|build|vendors status|vendors update` typed procedures.

#### Scenario: Build cannot cross a state authority
- **WHEN** every non-build mutation port is instrumented during check, build, lookup, verification, retention, and vendor operations
- **THEN** only the explicitly selected artifact publication or reviewable vendor repository authoring may mutate its declared state
- **AND** no provider, export, package, Oclif, app, acceptance, controller-selection, or unrelated personal repository mutation occurs
