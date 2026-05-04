# Runtime Realization Type Env Agent Guide

## Scope

This file applies to `tools/runtime-realization-type-env/**`.

This project is a contained runtime realization lab. It is not production SDK code, not production runtime code, and not migration implementation. Keep changes inside this tool unless the user explicitly asks for a migration slice.

## Structure

- `src/sdk/**`: local pseudo-SDK facade for canonical-looking `@rawr/sdk/*` imports.
- `src/spine/**`: shared runtime spine artifact and compatibility simulation helpers.
- `src/mini-runtime/**`: contained miniature RAWR-owned runtime path.
- `src/vendor/**`: narrow vendor probes and adapters for real dependencies.
- `fixtures/positive/**`: authoring and artifact examples that must typecheck.
- `fixtures/inline-negative/**`: `@ts-expect-error` misuse checks compiled by the normal typecheck.
- `fixtures/fail/*.fail.ts`: one-file expected failures checked by `scripts/assert-negative-types.ts`.
- `fixtures/todo/**`: unresolved design experiments excluded from positive typecheck.
- `test/vendor-effect/**`: real Effect behavior used by the facade/runtime lanes.
- `test/vendor-boundaries/**`: vendor boundary shape smoke checks only.
- `test/mini-runtime/**`: contained RAWR mini-runtime behavior.
- `evidence/**`: proof manifest, focus log, vendor notes, diagnostic reports, and guardrails.
- `RUNBOOK.md`: canonical operating guide for lab continuity, authority order, red/yellow/green upkeep, spec feedback, and handoff shape.

## Required Reading

Before adding or changing tests, fixtures, manifest entries, or evidence docs, read:

- `README.md`
- `RUNBOOK.md`
- `evidence/design-guardrails.md`
- `evidence/focus-log.md`
- `evidence/proof-manifest.json`
- `evidence/vendor-fidelity.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/phased-agent-verification-workflow.md`

## Evidence Rules

- Use `proof`, `vendor-proof`, `simulation-proof`, `xfail`, `todo`, and `out-of-scope` exactly as defined in `evidence/design-guardrails.md`.
- Vendor-shape checks must not be described as RAWR runtime proof.
- Mini-runtime tests must not be described as production runtime proof.
- TODO fixtures are not proof. They are fenced experiments or known design gaps.
- Every proof entry must name a gate that would fail if the claim regressed.
- Every new TODO fixture must be listed in `proof-manifest.json`.
- Experiment changes must keep `evidence/focus-log.md` and `proof-manifest.currentExperiment` aligned.
- Before promoting proof or changing red/yellow/green status, use `RUNBOOK.md` and `evidence/phased-agent-verification-workflow.md` to verify the authority order, review axes, and promotion condition.

## Test-Theater Rules

Remove or downgrade tests that only prove a vendor library behaves as itself.

Do not add:

- Native oRPC `.effect(...)` tests.
- Bare `Bun.version` or `Bun.serve` existence checks.
- Direct raw Effect primitive demos counted as runtime-spine proof.
- Tests that assert only constructibility while claiming adapter/runtime behavior.

Keep vendor probes only when they protect a RAWR adaptation boundary, and label them as vendor proof or shape smoke.

## Containment Rules

- Do not add `tools/runtime-realization-type-env/package.json`.
- Do not add this tool to workspaces, root build/typecheck/test, package exports, or production imports.
- Do not import production `apps/*`, `packages/*`, `services/*`, or `plugins/*` code.
- Real `effect@3.21.2` remains a root dev dependency for this lab only.
- Canonical-looking `@rawr/sdk/*` imports remain local `tsconfig` aliases.

## Verification

For meaningful lab changes, run the focused target first, then:

```bash
bunx nx run runtime-realization-type-env:gate
```

The root convenience equivalent is:

```bash
bun run runtime-realization:type-env
```

Use `bunx nx show project runtime-realization-type-env --json` for project truth. Use Narsil/code-intel as evidence discovery when it has useful indexed symbols, but use Nx and source files as the authority for local verification.
