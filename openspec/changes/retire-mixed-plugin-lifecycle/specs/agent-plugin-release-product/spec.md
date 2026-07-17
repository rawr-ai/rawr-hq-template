## MODIFIED Requirements

### Requirement: Release lifecycle activates only through qualified procedures
Release construction MUST remain internal to the lifecycle `releases` module and become operator-reachable only through qualified `check` and `build`. The typed `check|build|export|package` procedures MUST be composed by `@rawr/agent-plugin-lifecycle` and projected only at their exact qualified `rawr agent plugins` commands. Controller undo remains a separate typed controller application. None may be exposed through a `release` command, direct module-application imports, runtime scans, bare plugins, root undo, aliases, aggregate projections, compatibility fallbacks, or personal executable code.

#### Scenario: Qualified activation does not add another owner
- **WHEN** controller command discovery and dispatch are inspected after C5
- **THEN** the qualified command invokes the corresponding consolidated module behavior already tested in C2
- **AND** no aggregate, Oclif, app-composition, or personal repository implementation becomes an alternate path
