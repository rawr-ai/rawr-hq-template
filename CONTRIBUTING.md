# Contributing To Habitat

## Purpose

This repository owns the Habitat platform: its public SDK and foundational
Oclif/Nx CLI, reusable runtime machinery, generic capability owners, tooling,
and constitutional law.

## What Belongs Here

- Reusable Habitat SDK, CLI, runtime, adapter, resource, provider, service, and
  schema behavior.
- Generic Nx, Oclif, validation, release, and repository machinery.
- Habitat-owned fixtures that prove a public platform contract without becoming
  product source.
- Habitat governance, architecture, process, and operator documentation.

## What Belongs Elsewhere

- Rawr domain services, topics, profiles, app composition, and product policy
  belong in Rawr's independent repository.
- Marketplace owns curated agent-plugin content, vendor provenance, declarative
  evaluation inputs, and governed content release/channel records.
- Machine-specific settings and personal workflows remain outside all three
  repositories.

Cross-repository behavior uses a versioned data interface or ordinary package
artifact. Never copy executable implementation or merge repository histories.

## Fixture Admission

A Habitat fixture must be owner-local, deterministic, non-product, and scoped
to one public contract. It cannot become an Nx product project, app/topic
member, release-group member, or source-workspace fallback.

## Command Surfaces

- `habitat plugins ...` is the operational external Oclif extension channel.
- Curated agent-plugin lifecycle has no current CLI projection. Task 12.1 must
  land its command, manifest, profile, and policy together before
  `habitat agent plugins ...` becomes operational.
- No Rawr alias is admitted in Habitat.

## Quality Gates

Use Nx to select the owning project and run its focused typecheck, test, build,
manifest, or acceptance target. Before pushing, run `bun run check`; the remote
Repository Ratchet remains merge authority.

## Change Shape

Keep each change owner-complete: move one behavior through implementation,
proof, documentation, and migration impact without unrelated refactors.
