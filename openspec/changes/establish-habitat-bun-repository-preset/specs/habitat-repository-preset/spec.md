## ADDED Requirements

### Requirement: Habitat provides a Bun Nx repository preset
The released `@habitat-ai/cli` package SHALL expose an Nx generator named `preset`
that creates the portable Habitat repository spine in a Bun workspace. The
generator MUST require `packageManager` equal to `bun` and MUST refuse any
alternate package-manager artifact before its first Tree write.
The generated package SHALL select the exact supported Bun and Nx versions.

#### Scenario: Bun workspace is created
- **WHEN** Nx invokes the installed Habitat preset with `packageManager` equal to
  `bun`
- **THEN** the resulting repository contains the portable Bun, Nx, TypeScript,
  Biome, and Habitat architecture-policy configuration
- **AND** the repository uses the installed `@habitat-ai/cli/nx-plugin`

#### Scenario: Non-Bun or unstated workspace is refused
- **WHEN** Nx invokes the Habitat preset without `packageManager` equal to `bun`
- **OR** the repository contains an alternate package-manager artifact
- **THEN** generation fails before the first Tree write

### Requirement: The generated spine is portable and closed
The preset SHALL generate only generic repository scheduler, source-quality,
workspace-kind, and Habitat integration anchors. It MUST NOT generate producer or
consumer product inventory, `.habitat` policy selections, AGENTS content, package
aliases, release groups, hosted CI policy, or product-specific source exclusions.

#### Scenario: Consumer receives no producer state
- **WHEN** the preset completes in a new repository
- **THEN** no Habitat producer path, Rawr identity, product project, blueprint
  selection, or release configuration is present
- **AND** installed Habitat blueprints remain package-owned rather than copied into
  the consumer

#### Scenario: Root scripts remain scheduler faces
- **WHEN** Nx builds the generated project graph
- **THEN** root scheduler scripts are excluded from package-script target inference
- **AND** they delegate to native Nx targets without calling themselves

#### Scenario: Build scheduling is graph-closed
- **WHEN** an existing Bun Nx repository begins without named inputs
- **THEN** the preset installs the generic `default` and `production` inputs
- **AND** a real project build resolves the preset-owned build target defaults

### Requirement: Preset creation and repository activation remain truthful
The preset SHALL leave hook files and Git configuration untouched because Git does
not yet exist. The installed `init` generator SHALL remain the sole post-Git hook
installation and activation surface.

#### Scenario: Pre-Git preset does not claim activation
- **WHEN** Nx runs the preset before repository Git initialization
- **THEN** the generator performs no Git mutation and returns successfully with
  ordinary repository files only

#### Scenario: Post-Git initialization activates hooks
- **WHEN** Git exists and the consumer invokes the installed `init` generator
- **THEN** Husky configures the repository hook path
- **AND** the Habitat pre-push and marked Codex contributions are active without
  replacing unrelated consumer hooks

### Requirement: Generation is repeatable and preserves ownership
The preset and initializer SHALL be byte-stable after convergence. Unrelated
consumer-owned files and configuration MUST remain unchanged.
Generic workspace-kind roots SHALL be additive, while an incompatible value in a
preset-owned Nx, TypeScript, toolchain dependency, Bun resolution field, or Bun
patch for a foundation tool, an incompatible Habitat-owned predecessor, or a
duplicate contribution MUST be refused rather than silently combined. An empty preset-owned foundation file
SHALL be completed; a conflicting nonempty preset-owned foundation file SHALL be
refused.
The exact native Nx custom-preset named inputs SHALL be admitted only as the
vendor bootstrap that the same generator invocation replaces.

#### Scenario: Repeat changes nothing
- **WHEN** the same installed preset planner or initializer runs after convergence
- **THEN** it produces no Tree mutation

#### Scenario: Consumer configuration survives adoption
- **WHEN** an existing Bun consumer has unrelated Nx plugins, Codex hook groups, or
  a nonempty pre-push hook
- **THEN** Habitat preserves those values while adding only its named missing
  contributions

#### Scenario: Reserved foundation conflict is refused
- **WHEN** an existing Bun consumer assigns incompatible behavior to a preset-owned
  Nx scheduler key, TypeScript foundation option, tool dependency, or Bun
  resolution control, or foundation-tool patch
- **THEN** the preset fails before its first Tree write

#### Scenario: Empty foundation anchor is completed
- **WHEN** an existing Bun consumer contains an empty preset-owned foundation file
- **THEN** the preset writes the canonical foundation content

#### Scenario: Conflicting foundation anchor is refused
- **WHEN** an existing Bun consumer contains noncanonical behavior in a
  preset-owned foundation file
- **THEN** the preset fails before its first Tree write

### Requirement: Installed-package acceptance uses native package and Nx surfaces
Release acceptance SHALL inspect the packed preset factory and schema, exercise
native Bun/Nx generation, and test `nx add` from a fixture where
`@habitat-ai/cli` is initially absent. Existing-repository adoption MUST begin
from an empty Nx configuration and exercise one real project build. Acceptance
MUST distinguish file generation from post-Git hook activation.

#### Scenario: Packed candidate creates and adopts a repository
- **WHEN** acceptance installs the packed Habitat products through native package
  and Nx commands
- **THEN** preset discovery, dependency closure, generated graph, repeated
  generation, and post-Git initialization all pass
- **AND** no workspace path or producer source is required at runtime
