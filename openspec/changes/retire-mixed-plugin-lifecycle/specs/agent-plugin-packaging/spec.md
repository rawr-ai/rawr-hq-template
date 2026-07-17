## MODIFIED Requirements

### Requirement: Packaging module remains isolated behind one qualified procedure
The lifecycle service's `packaging` module MUST own deterministic package rendering and explicit output only. It MUST NOT read source workspaces to rebuild bytes, import provider adapters, project generic filesystem layouts, mutate Oclif or controller state, issue acceptance, write personal lifecycle records, or participate in app composition. Its only operator reachability MUST be `rawr agent plugins package`, which parses one canonical release or release-set handle and invokes the typed packaging procedure once without a compatibility route.

#### Scenario: Package command cannot become another lifecycle path
- **WHEN** command dispatch and all non-output mutation ports are inspected during qualified packaging
- **THEN** exactly one typed packaging procedure is invoked and no adjacent authority is mutated
- **AND** only the explicit package output may change after every input and output guard passes
