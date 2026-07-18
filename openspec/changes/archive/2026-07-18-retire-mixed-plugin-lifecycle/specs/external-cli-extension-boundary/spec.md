## ADDED Requirements

### Requirement: Bare plugins is exactly the external extension surface
The installed controller MUST expose exactly `rawr plugins install|link|uninstall|list|inspect|update|reset` below the bare plugins topic. Curated agent lifecycle, provider deployment, export, app composition, scaffolding, aggregate status/doctor, official-module install/link, and compatibility aliases MUST NOT appear below that topic.

#### Scenario: Bare plugins discovery is closed
- **WHEN** command discovery, help, aliases, hidden aliases, topics, and controller manifest entries below `plugins` are enumerated
- **THEN** exactly the seven external extension operations are present
- **AND** every curated or legacy operation is absent before Oclif registry access
