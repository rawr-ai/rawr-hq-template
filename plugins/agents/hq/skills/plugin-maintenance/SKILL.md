---
name: plugin-maintenance
description: |
  Use when maintaining scripts, commands, skills, workflows, agents, or hooks in a curated RAWR agent plugin, including source validation, reference repair, and an explicit handoff to the governed agent-plugin lifecycle.
---

# Plugin Maintenance

Maintain curated content in its explicit source workspace. Provider homes,
caches, marketplaces, registries, exports, and installed CLI/provider state are
outputs or separate authorities, never authoring locations.

## Core Invariants

- Every content unit has one parent agent-plugin distribution owner.
- Make and validate source changes before considering lifecycle operations.
- Authoring never triggers package, selection, or sync
  automatically.
- Curated agent-plugin lifecycle uses `rawr agent plugins ...` only.
- External Oclif extensions use `rawr plugins ...` only.

## Source Workflow

1. Resolve the explicit content workspace and parent plugin under
   `plugins/agents/<plugin>`.
2. Make the smallest source change that solves the request.
3. Run the owning repository's focused syntax, test, lint, and reference checks.
4. Review destructive changes and dependent identities before deletion or rename.
5. Report the source proof and stop.

## Explicit Lifecycle Handoff

When the user also requests lifecycle work, start with the read-only
`rawr agent plugins check` against exact governed release coordinates. Later
operations are separate choices: `rawr agent plugins package`,
`rawr agent plugins test`, `rawr agent plugins sync`,
`rawr agent plugins status`, `rawr agent plugins check --mode
current-main-selection`.

Do not substitute provider-home edits, an external extension command, or an app
composition path for the qualified lifecycle.
