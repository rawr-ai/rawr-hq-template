# Service Module Ownership Hardening

Updated: 2026-04-19

## Purpose

This pass completes the service cleanup after removing the corrupt `*-host` packages.

The remaining architectural problem is broader than duplicated schemas: some promoted services still use `service/shared/**` as a service-internal dumping ground. This pass makes module-local ownership the default and requires proof before anything remains in `shared/`.

## Current Branch

- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-remove-host-global-cleanup`
- Parent branch: `agent-ORCH-remove-host-global-cleanup`
- Current integration branch: `agent-service-module-ownership-hardening`

## Invariants

- Modules own their schemas, repositories, policies, algorithms, and helper logic by default.
- `service/shared/**` is allowed only for service-wide resource ports, reusable errors, and mechanisms actually consumed by multiple modules.
- `service/shared/internal/**` may not hide logic consumed by exactly one module.
- Procedure input/output/result schemas belong to the module that exposes the procedure.
- Module repositories must own service behavior; they must not simply delegate to same-domain shared logic files.
- `packages/*-host` and `@rawr/*-host` remain forbidden.

## Agent Assignments

- Agent A: `hq-ops` locality audit and any required cleanup.
- Agent B: `agent-config-sync` shared/internal breakup and provider-style alignment.
- Agent C: `session-intelligence` shared logic/schema breakup.
- Agent D: direct `rawr sessions ...` proof and `hq:status` runtime-noise diagnosis.

Each agent must write a mini scratchpad before implementation listing every relevant `service/shared/**` file, actual consumers, classification, movement plan, ratchets, and behavioral proof.

## Expected Focus

`hq-ops` is likely mostly correct because its shared resource contract is consumed by all modules. It still needs audit proof and ratchets.

`agent-config-sync` likely needs the most restructuring. Planning, execution, retirement, and undo semantics must move into module ownership unless a helper is truly shared by multiple modules. Module providers should follow `example-todo`: `middleware.ts` exports the repository provider and `module.ts` composes it.

`session-intelligence` must move `catalog-logic`, `transcript-logic`, and `search-logic` into owning modules, and move module-specific schemas out of `shared/schemas.ts`.

Session-intelligence database/index policy is also module-owned. Plugin/app surfaces may instantiate SQLite, filesystem, JSONL, path, env, and process resources for now, but table names, query strings, refresh/prune policy, and destructive DELETE/UPDATE semantics belong in the service modules.

Projection proof must try to make direct `rawr sessions ...` commands work through actual plugin loading. If the blocker is external, it must be documented with exact evidence rather than left as a vague caveat.

## Verification Target

- Root typecheck/build/affected build.
- Targeted typecheck/build/test/structural for `@rawr/hq-ops`, `@rawr/agent-config-sync`, `@rawr/session-intelligence`, `@rawr/plugin-session-tools`, `@rawr/plugin-plugins`, `@rawr/cli`, and `@rawr/server`.
- Behavioral command proof for plugin sync, sessions, config, journal, and security paths.
- Managed runtime smoke with health probe and exampleTodo proof requests.
- Final clean status in all relevant worktrees.
