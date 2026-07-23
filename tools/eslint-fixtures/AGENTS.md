# ESLint Boundary Fixture Router

## Scope

- Applies to the Nx fixture project in `tools/eslint-fixtures/**`.

## Boundaries

- Owns the finite positive and negative import samples consumed by the
  repository's ESLint boundary verifiers.
- Negative samples must fail only the intended `@nx/enforce-module-boundaries`
  relation, while the positive sample must remain lint-clean.
- Keep project tags and expected outcomes in `project.json`, the repository
  ESLint configuration, and the owning verifier scripts. Fixture source must
  not encode or simulate that metadata.
- This project is test input, not product code. Do not add runtime behavior,
  exports, or reusable helpers here.

## Flow

- The structural target confirms the fixture inventory and required import
  edges.
- The lint target runs the repository ESLint configuration over that inventory
  and verifies the expected positive and negative outcomes.

## Routing

- [Repository router](../../AGENTS.md)
- [Repository ESLint configuration](../../eslint.config.mjs)
- [Fixture lint verifier](../../scripts/phase-03/verify-eslint-fixtures-lint.mjs)
- [Fixture structural verifier](../../scripts/phase-03/verify-eslint-fixtures-structural.mjs)

## Validation

- `bunx nx run eslint-fixtures:sync`
- `bunx nx run eslint-fixtures:structural`
- `bunx nx run eslint-fixtures:lint`
