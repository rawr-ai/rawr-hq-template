## Why

Habitat can govern an existing Nx repository through `@habitat-ai/cli:init`, but it
cannot yet create the portable Bun/Nx repository spine that its consumers are
expected to share. That gap caused Rawr to copy platform configuration locally and
made consumer adoption look like product-specific setup rather than one Habitat
capability.

## What Changes

- Add a Bun-only Nx preset to the existing `@habitat-ai/cli` package.
- Generate only the portable repository spine: Bun workspace configuration,
  normalized Nx scheduling, TypeScript and Biome foundations, and the Habitat
  architecture-policy project.
- Reuse the existing pure Nx registration planner while leaving Codex and Husky
  contributions on the post-Git initializer; do not claim Git-hook activation
  before Nx creates the repository.
- Keep post-Git Husky activation in the existing `init` generator and make the
  greenfield two-stage lifecycle explicit.
- Correct installed-package acceptance so `nx add` begins without the CLI already
  installed, and exercise the packed preset through native Nx/Bun entrypoints.
- Generate no product inventory, `.habitat` policy tree, AGENTS content, release
  configuration, or hosted CI policy.

## Capabilities

### New Capabilities

- `habitat-repository-preset`: Creates and adopts the portable Bun/Nx repository
  substrate through the released Habitat CLI package.

### Modified Capabilities

None.

## Impact

- `@habitat-ai/cli` gains one Nx generator and its published schema.
- Bun consumers can adopt the same portable scheduler and source-quality baseline
  without copying producer files or creating another platform authority.
- `@habitat-ai/sdk` remains the CLI's sole Habitat package dependency and stays in
  the existing fixed Nx release group.
- Rawr can replace its temporary hand-authored repository spine with the released
  Habitat generator before product source migration.
