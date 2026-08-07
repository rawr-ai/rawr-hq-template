## Context

`@habitat-ai/cli:init` currently adopts an existing Nx repository by registering
the Habitat Nx plugin, contributing one marked Codex hook group, installing Husky,
and writing a missing pre-push hook. It does not create the portable repository
configuration shared by Habitat consumers. Rawr exposed that gap when its Bun/Nx
conversion required hand-authored copies of generic producer configuration.

Nx 23.1.0 invokes a third-party generator named `preset` after writing and
installing the base workspace but before initializing Git. It forwards a broad and
version-dependent option bag. A preset callback therefore cannot activate Husky
truthfully: `.git` does not exist yet, and Nx deliberately withholds `skipGit` from
the generator.

## Goals / Non-Goals

**Goals:**

- Make one released Habitat package able to create the canonical portable Bun/Nx
  repository spine.
- Keep fresh-workspace creation and established-repository adoption on native Nx
  generator surfaces.
- Preserve one package identity, one Nx plugin registration, and one source-quality
  owner.
- Make unchanged generation byte-stable and keep consumer-owned configuration
  intact.

**Non-Goals:**

- Copy the Habitat producer repository, its product inventory, or its policy tree.
- Create a template repository, migration ledger, release manager, or additional
  npm package.
- Select product blueprints, applications, services, plugins, resources, or CI
  policy for a consumer.
- Pretend a pre-Git preset callback has activated repository hooks.

## Decisions

### The preset and adopter remain distinct lifecycle stages

The new `preset` generator is Bun-only and creates the portable repository spine.
It performs only Tree mutations. The existing `init` generator remains the
post-Git adoption surface and activates Husky after the repository exists. Both
share the same pure Nx registration planner, while the second stage alone changes
hook state that cannot exist during the first stage.

Rejected alternatives:

- Running the current `init` callback from the preset silently leaves Husky
  inactive because Git does not exist yet.
- Initializing Git inside the preset would violate Nx's withheld `skipGit` choice.
- A detached process waiting for `.git` would add hidden lifecycle machinery for a
  problem Nx already exposes as an ordinary second generator invocation.

### The installed CLI owns one portable Bun repository plan

The plan writes or completes:

- Bun workspace and isolated-linker configuration;
- exact supported Bun and Nx tool versions;
- normalized root scheduler scripts hidden from Nx project inference through
  `nx.includedScripts`;
- graph-closed generic Nx inputs and target defaults;
- strict TypeScript and generic Biome configuration; and
- one `habitat` architecture-policy project that owns workspace lint and format.

The plan does not write `AGENTS.md`, `.habitat/**`, product workspaces, aliases,
release groups, hosted CI, or product-specific exclusions. It adds the generic
workspace-kind roots and owns the exact Nx scheduler and TypeScript foundation;
the preset-owned source-tool versions, dependency bucket, Bun resolution controls,
and foundation-tool patch boundary are equally exact. Bun and Biome configuration are canonical owned
anchors rather than consumer extension points. Incompatible values in reserved
fields are refused before writes. Empty foundation placeholders are completed,
while unrelated consumer fields and files remain intact.

Nx writes its own minimal custom-preset named inputs before calling the Habitat
generator. Those exact vendor bytes are the sole admitted predecessor for
`default` and `production`; the generator replaces them in the same Tree plan.
This is host sequencing, not an alternate consumer configuration or migration
format.

Rejected alternatives:

- Copying the producer root would transfer product state and create a second
  substrate authority.
- Generating per-project lint/typecheck scripts would duplicate the Habitat/Nx
  scheduler contract in every consumer project.
- Generating a no-op topology target would make an empty repository appear governed
  before it selects any Habitat policy.

### The preset accepts Nx's evolving option bag but validates Habitat's boundary

The published preset schema permits additional Nx options. The generator requires
`packageManager` equal to `bun`, refuses alternate package-manager artifacts
before its first Tree write, and ignores unrelated framework options. The normal `init` generator
retains its established-repository package-manager compatibility; the Bun-only
preset does not broaden or narrow that separate contract.

### Acceptance follows the real host lifecycle

Unit tests exercise Tree planning, refusal before writes, and byte-stable repeat.
Installed-package acceptance inspects the packed generator/schema, begins the
`nx add` adoption case without the CLI installed and without named inputs, then
applies the preset and runs one real project build. It separately exercises native
Nx preset creation against the packed package. Hook activation is asserted only
after Git exists and `init` runs.

## Risks / Trade-offs

- **Fresh creation has two explicit native stages** -> Document the boundary and
  keep both stages inside `@habitat-ai/cli`; do not hide it with a custom launcher.
- **Nx forwards new preset options over time** -> Keep the preset schema permissive
  while validating only the one preset-owned input.
- **Existing Bun consumers may already use reserved foundation keys** -> Preserve
  unrelated configuration, but refuse incompatible scheduler, toolchain, or
  foundation values rather than claiming successful adoption over a different
  substrate.
- **Root scheduler scripts could become self-referential Nx targets** -> Require
  `nx.includedScripts: []` and verify the generated graph does not infer them.

## Migration Plan

1. Land the preset, pure repository planner, tests, and packed schema in
   `@habitat-ai/cli`.
2. Include the change in the next ordinary fixed CLI/SDK Nx release.
3. For a new repository, run the Bun Nx preset and then `@habitat-ai/cli:init`
   after Git creation.
4. For Rawr, upgrade the released package through native Nx migration/addition,
   apply `preset` to its established Bun workspace, and repeat `init`; remove
   temporary consumer-authored generic wiring in the same checkpoint.
5. Roll back by pinning the previous CLI/SDK version; generated consumer-owned
   configuration remains ordinary Nx/Bun configuration and requires no runtime
   compatibility layer.

## Open Questions

None. A future ergonomic wrapper may compose the two native stages, but it is not a
prerequisite for this repository capability or release.
