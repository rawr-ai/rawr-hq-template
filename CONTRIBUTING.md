# Contributing to RAWR HQ-Template

## Purpose

This repository owns the executable controller and generic lifecycle/tooling
authority. Personal `RAWR HQ` is a separate curated-content repository, not a
downstream fork.

## Contribution Types

- Controller contribution: official CLI contracts, controller release behavior,
  generic lifecycle services, provider adapters, schemas, tooling, and validators.
- Fixture contribution: non-personal artifacts used only to validate Template behavior.

## What Belongs Here

Contribute here when the change implements generic executable behavior:
- CLI UX and command contract improvements.
- Shared package behavior (`@rawr/core`, `@rawr/control-plane`, `@rawr/state`, `@rawr/security`, `@rawr/journal`).
- Template governance/docs/process improvements.

## What Belongs In Personal `RAWR HQ`

- Curated agent-plugin source/content and vendor provenance.
- Declarative policy/evaluation inputs.
- Content acceptance, release, and channel records.
- Personal repository process and configuration.

Do not copy Template runtime code into personal or merge repository histories.
Publish a versioned data/artifact interface when the two products must interact.

## Fixture Admission Policy

A plugin can be added as a Template fixture only when:
- Its behavior is generally reusable.
- It has stable command/runtime contracts.
- It includes tests and documentation.
- It contains no personal curated content or machine-specific assumptions.
- Its package ID has an explicit `external-fixture` row in `apps/cli/src/lib/controller/classification.ts`.

## API Surface Policy

- `rawr plugins ...` is reserved for external Oclif extension management.
- `rawr agent plugins ...` is reserved for curated agent-plugin lifecycle.
- App composition commands do not acquire lifecycle authority.
- Command-surface changes require migration notes in `UPDATING.md`.
- CLI publish ownership for `@rawr/cli` is template-only.

## Quality Gates

Before merging:
- `bun run build`
- `bun run test`
- docs updated for user-visible behavior changes

## Commit Scope Expectations

Keep changes narrow and explicit:
- One behavior change per PR where practical.
- Include rationale and migration impact in PR description.
