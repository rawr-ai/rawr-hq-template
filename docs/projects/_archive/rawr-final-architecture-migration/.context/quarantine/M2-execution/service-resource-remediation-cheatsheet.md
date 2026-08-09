# Service Resource Remediation Cheat Sheet

Use this for the remediation pass that removes service-specific `*-host` packages.

## Core Correction

`*-host` packages were a bad abstraction. Remove them.

The correct split is:

- **Service**: owns semantic behavior, contracts, validation, policies, orchestration, ranking, merge/conflict rules, undo/retirement semantics, domain algorithms, and reusable entity schemas/types.
- **Plugin/app/runtime surface**: constructs concrete resources and passes them to service clients.
- **Package**: owns only genuinely reusable primitives shared by multiple services.

Runtime adjacency is not ownership. Needing filesystem, SQLite, paths, env, or processes means the service needs a resource seam; it does not mean the entire behavior moves to a package.

## Agent Workflow

Each service remediation agent must work in its own worktree and branch from the current stack head.

Required first steps:

1. Confirm worktree root, branch, and clean status.
2. Read `service-promotion-cheatsheet.md`, this document, `services/example-todo/src/service/**`, `guidance.md`, `DECISIONS.md`, and the integrated architecture/runtime specs.
3. Use Nx for project truth and Narsil/rg for references and call paths.
4. Audit current service, current `*-host` package, and consumer imports.
5. Write a mini plan to a scratchpad before implementing.
6. Implement only after the mini plan is written.
7. Commit with Graphite from the agent branch.

Required scratchpad content:

- current violations
- service-owned behavior to move or consolidate
- concrete resources to provide from plugin/app/runtime surface
- deleted `*-host` imports/deps/files
- verifier and lint ratchets
- behavioral proof commands and exact pass criteria

## Agent Prompt Template

Use this structure when launching a service agent.

```text
You are a default implementation agent in RAWR HQ-Template.

Repo: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template
You must create/use your own worktree under /Users/mateicanavra/Documents/.nosync/DEV/worktrees and branch from the current stack head, not from uncommitted local changes.
Use Graphite for commits. Do not touch other agents' worktrees or branches.

Objective:
Remove the service-specific host package for <service> and re-ground service resource binding.

Governing correction:
There are no `*-host` packages. They were a corrupt abstraction.
Services own service behavior. Plugins/apps/runtime surfaces provide concrete resources. Packages only hold genuinely shared primitives with multiple real consumers.

Required reading:
- docs/projects/rawr-final-architecture-migration/.context/P2-execution/handoffs/service-promotion-cheatsheet.md
- docs/projects/rawr-final-architecture-migration/.context/P2-execution/handoffs/service-resource-remediation-cheatsheet.md
- services/example-todo/src/service/**
- docs/projects/orpc-ingest-domain-packages/guidance.md
- docs/projects/orpc-ingest-domain-packages/DECISIONS.md
- docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md
- docs/projects/rawr-final-architecture-migration/resources/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md

Use skills/methods:
architecture, domain-design, testing-design, typescript, nx-workspace, narsil-mcp, graphite, git-worktrees.

Before implementation:
Audit the current service, the current host package, and all consumers.
Write a mini plan to <scratchpad path>.
The mini plan must list violations, moves, concrete resource seams, deleted host imports/deps, ratchets, and behavioral proof.

Implementation rules:
- Do not create any new `*-host`, runtime, adapters, or dumping-ground package.
- Do not move single-service helper logic into packages.
- Procedure input/output schemas live inline in the owning module contract.
- Reusable non-IO entity schemas/types may be extracted into intentional entity files.
- `shared/schemas.ts` is only for real cross-module primitives.
- Service repositories must implement service behavior, not forward to same-named runtime methods.
- Concrete resources may be declared as typed service deps and supplied by plugin/app code.
- Prefer Bun-native APIs for new concrete runtime code where stable.

Verification:
Run service typecheck/build/test/structural and meaningful command or integration proof.
State any commands not run and why.

Final response:
List changed files, mini plan path, commit/branch, verification results, and remaining risks.
```

## Bun-Native Resource Defaults

Prefer:

- `Bun.file` / `Bun.write` for file/blob/string IO
- `bun:sqlite` for local SQLite
- `Bun.SQL` for a Promise SQL facade when useful
- Bun Shell `$` for bounded shell commands
- `Bun.spawn` for long-running subprocesses
- `Bun.Glob` for discovery scans
- `Bun.env` / `import.meta.env` for Bun-local env reads
- Web streams and `Bun.file().stream()` for stream IO
- `Bun.serve` for Bun-hosted HTTP resources

Do not put experimental Bun APIs into stable service contracts.

## Service-Specific Objectives

### `hq-ops`

- Delete `packages/hq-ops-host`.
- Keep config, repo-state, journal, and security semantics inside `services/hq-ops`.
- Supply concrete resources from `apps/server`, `apps/cli`, and `plugins/cli/plugins`.
- Config load/merge/validation and repo-state mutation policy are service behavior.

### `agent-config-sync`

- Delete `packages/agent-config-sync-host`.
- Service owns sync planning, conflict policy, apply semantics, retirement, undo model, drift assessment, source scope, registry/manifest semantics.
- `plugins/cli/plugins` supplies filesystem, registry/manifest IO, process execution, archive/package, and target-home resources.
- `runSync`, `previewSync`, `retireStaleManaged`, `runUndo`, and drift assessment are not runtime adapter methods.

### `session-intelligence`

- Delete `packages/session-intelligence-host`.
- Service owns list, resolve, extract, search, reindex, clear-index, source detection, normalization, ranking, snippets, role filtering, dedupe, offset, and max-message semantics.
- `plugins/cli/session-tools` supplies concrete file discovery, JSONL reading, stat/path/env, and SQLite/cache resources.
- Host-level verbs like `listSessions`, `resolveSession`, `extractSession`, and `reindexSessions` must disappear outside the service.

## Cross-Service Ratchets

Add or update checks so they fail on:

- `packages/*-host`
- `@rawr/*-host`
- docs that bless `*-host` packages as current architecture
- extracted IO-schema buckets and module schema files that only re-export shared schemas
- service repositories that only forward to same-named runtime methods
- service-specific helper packages with only one service consumer

Behavioral proof must exercise real service behavior through the consumer surface and assert domain outputs or side effects.
