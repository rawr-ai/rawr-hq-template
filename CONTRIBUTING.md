# Contributing to RAWR HQ-Template

## Purpose

This repository (`RAWR HQ-Template`) is the canonical upstream template.
Contributions here should improve the shared baseline for all downstream `RAWR HQ` repos.

## Contribution Types

- Core contribution (upstream): shared CLI contracts, control-plane behavior, security/state/journal architecture, template docs.
- Plugin contribution (downstream by default): personal/project-specific commands and runtime behavior.

## What Belongs Upstream

Contribute upstream when the change is expected to benefit most template users:
- CLI UX and command contract improvements.
- Shared package behavior (`@rawr/core`, `@rawr/control-plane`, `@rawr/state`, `@rawr/security`, `@rawr/journal`).
- Template governance/docs/process improvements.

## What Usually Stays Downstream (`RAWR HQ`)

- Personal workflows, one-off commands, product-specific integrations.
- Custom plugins not intended as reusable template scaffolds.

## Plugin Promotion Policy

A plugin can be promoted into `RAWR HQ-Template` only when:
- Its behavior is generally reusable.
- It has stable command/runtime contracts.
- It includes tests and documentation.
- It does not encode personal/machine-specific assumptions.

## API Surface Policy

- Canonical workspace runtime plugin commands are `rawr hq plugins ...`.
- `rawr plugins ...` is reserved for Channel A (oclif plugin manager commands).
- Command-surface changes require migration notes in `UPDATING.md`.

## Quality Gates

Before merging:
- `bun run build`
- `bun run test`
- docs updated for user-visible behavior changes

## Commit Scope Expectations

Keep changes narrow and explicit:
- One behavior change per PR where practical.
- Include rationale and migration impact in PR description.
