# qualified-artifact-authoring Specification

## Purpose
TBD - created by archiving change normalize-app-composition-authoring. Update Purpose after archive.
## Requirements
### Requirement: Artifact creation has exactly three qualified command owners (B04, B05, B31)

The controller MUST expose exactly `rawr agent plugins create <id> --content-workspace <path>`, `rawr cli command create <topic> <name>`, and `rawr cli extension create <id> --destination <path>` for the retained source-output kinds. Each command MUST parse to a distinct request and invoke one distinct per-kind authoring application. Legacy `rawr plugins scaffold ...`, app-composition commands, and `rawr app projection create` MUST be undiscoverable in C4.

#### Scenario: Command discovery is qualified by owner

- **WHEN** official command discovery and direct command-ID resolution are enumerated
- **THEN** the three qualified create commands appear under their owning topics
- **AND** no scaffold, composition, app-projection, type/kind flag, alias, hidden alias, or compatibility forwarder appears

### Requirement: Per-kind creators cannot become an aggregate factory (B05, B31)

Official command, external extension, and curated agent-plugin raw argument parsing, normalization, identity types, validation, templates, and domain decisions MUST live in separate per-kind modules. Shared code MUST accept only an already-verified destination root and qualified relative-path/byte plan constructed by one per-kind owner. It MAY enforce containment, canonicalize qualified paths, compare exact bytes, and execute exact write plans, but MUST NOT accept or validate a raw product identifier, accept an output-kind selector, choose a template family, infer an authority, install an output, or import one per-kind module from another.

#### Scenario: Aggregate dispatch is absent

- **WHEN** command flags, request types, shared helpers, and module imports are inspected for cross-kind `mode`, `kind`, or `type` dispatch
- **THEN** no reachable aggregate factory or sibling per-kind dependency exists
- **AND** each command reaches only its named owner plus kind-agnostic qualified write-plan primitives

### Requirement: Official command creation is Template-workspace authoring (B01, B31)

`rawr cli command create` MUST verify exact RAWR HQ-Template repository identity, accept one safe topic and command name, and author one official command source, behavior test, and required command metadata inside that workspace. It MUST reject personal RAWR HQ, foreign repositories, and paths outside the verified Template root. It MUST NOT activate or select a controller release.

#### Scenario: Personal repository cannot receive official command code

- **WHEN** official command creation is pointed at personal RAWR HQ
- **THEN** repository verification rejects before any planned write
- **AND** no Template command implementation, manifest row, test, executable ancestry, or controller selection is added to personal

### Requirement: External extension creation is portable outside Nx (B31)

`rawr cli extension create` MUST operate from an installed Template controller in a foreign directory with no RAWR or Nx workspace. It MUST require one explicit destination and produce a self-contained genuine external Oclif extension package with no workspace-relative runtime dependency. It MUST NOT call native Oclif mutation, load generated code, or claim activation.

#### Scenario: Foreign-directory extension creation succeeds

- **WHEN** the installed controller runs from a fresh foreign directory with isolated HOME/XDG roots, no Nx files, and an explicit empty destination
- **THEN** the extension package builds and its declared command tests pass using only its own package contract
- **AND** Oclif registry, controller selection, personal content, provider, export, and runtime state remain unchanged

#### Scenario: Extension collision blocks before write

- **WHEN** any planned extension path already contains divergent bytes
- **THEN** the complete operation rejects before the first write
- **AND** it does not install, link, quarantine, or mutate external extension state

### Requirement: Curated agent-plugin creation authors content only (B05, B31, I02, I17)

`rawr agent plugins create` MUST use an explicit content workspace only as a locator and author one canonical curated agent-plugin source skeleton under `plugins/agents/<id>/**` plus its declarative content inputs. Its `package.json` MUST use the existing versioned personal content contract (`rawr.kind = agent`, `rawr.pluginContent.version = 1`, and the capability identity). It MUST NOT invent a second content root or source-manifest protocol and MUST NOT create Template implementation, app source, release artifacts, lifecycle records, provider state, export state, packages, Oclif entries, controller state, or runtime state.

#### Scenario: Agent-plugin creation has no lifecycle side effect

- **WHEN** a valid curated plugin ID is created in a verified personal content workspace
- **THEN** only the owned curated source and declarative content paths are authored
- **AND** every build, package, export, sync, provider, promotion, Oclif, app, controller, record, and capsule mutation counter remains zero

#### Scenario: Content path cannot select executable authority

- **WHEN** the explicit content workspace is moved or later deleted after source authoring
- **THEN** no controller, command, generated Template implementation, or runtime identity depends on its absolute path
- **AND** the authored repository change remains ordinary content subject to personal repository governance

### Requirement: Authoring plans are deterministic, collision-safe, and idempotent (B21, B31)

Each creator MUST compute its complete deterministic ordered write plan before the first write. The shared executor MUST return exactly one closed `AuthoringDryRun | AuthoringConverged | AuthoringAuthored | AuthoringFailed | AuthoringPartial | AuthoringRejected` result. Dry-run, converged, and rejected variants MUST carry an explicit zero-write fact. Authored MUST carry the nonempty ordered subset newly published and verified by that invocation; failed MUST carry a publication failure and empty published subset; partial MUST carry a publication failure and nonempty proper published subset. Exact preexisting paths MUST NOT be reported as writes. Divergent existing bytes or invalid destinations MUST reject the complete plan before mutation. Exact existing bytes MUST converge with zero writes and no metadata churn.

#### Scenario: Identical creation repeat changes nothing

- **WHEN** any qualified create command is repeated after its exact output exists
- **THEN** it validates and reports `AuthoringConverged`
- **AND** output bytes, metadata, workspace membership, controller selection, and every adjacent authority remain unchanged

#### Scenario: Partial publication remains truthful

- **WHEN** an injected filesystem failure occurs after one or more planned paths are newly published
- **THEN** the result identifies only that ordered newly published subset and does not claim the artifact complete
- **AND** retry may add only missing exact outputs while any divergent substitution blocks before further write

#### Scenario: First publication failure remains truthful

- **WHEN** an injected filesystem failure occurs before the first planned path completes publication
- **THEN** the result reports `AuthoringFailed` with an empty published subset and the complete ordered plan
- **AND** it does not claim any path applied or the artifact complete

### Requirement: Source authoring cannot install, compose, or synchronize output (B05, B31)

No qualified create command may install/link an external extension, select or generate an app projection, edit app composition, build/test/package/export/sync an agent release, mutate a provider, promote a channel, restart a process, rewrite controller selection, or invoke another product application's mutation API. Every result MUST identify authored or converged source paths without claiming runtime availability.

#### Scenario: Mutation boundaries remain zero

- **WHEN** all three creators run against valid fixtures with install, composition, lifecycle, provider, export, process, controller, and Oclif mutation ports trapped
- **THEN** every trapped counter remains zero
- **AND** only the per-kind exact source write plan may mutate

### Requirement: Legacy scaffold semantics are absent (B04, B30, B31, I16)

Active code, help, docs, tests, manifests, and architecture inventories MUST NOT expose `rawr plugins scaffold`, its command IDs, generic output-kind flags, or guidance routing source creation through the mixed plugin aggregate. After the three qualified replacements exist, the mixed factory, obsolete scaffold/factory tests, and every factory-specific import/export/help/tool-registry entry MUST be deleted. The old implementation MUST NOT be copied wholesale, wrapped, forwarded, or retained as dormant active source.

#### Scenario: Semantic absence finds no route back

- **WHEN** active command code, help, docs, manifests, Nx graph inputs, and imports are scanned
- **THEN** no legacy scaffold producer, alias, wrapper, forwarding example, mixed factory, obsolete positive test/export, or aggregate dispatch remains reachable
- **AND** each retained source-authoring capability resolves to exactly one qualified owner

