# M1 Takeover Handoff: HQ Ops Service-Shape Repair

You are taking over as the orchestrator and implementer for the active HQ Ops repair. The prior agent is no longer the orchestrator. Treat that prior agent as optional historical memory only.

This document is the authoritative takeover brief for the current repair. If it conflicts with older local notes in this execution directory, prefer this document.

## Mission

Finish the HQ Ops repair on branch `agent-FARGO-M1-U02-followup-hq-ops-service-shape` so `services/hq-ops` is a real service package all the way down:

- same narrow package posture as `services/example-todo`
- business capability owned inside `src/service/modules/*`
- service capability projected into the right runtime/plugin surfaces
- no package-style business-capability imports like `@rawr/hq-ops/config`
- no fake “service shell outside, library bucket inside” compromise

The user’s latest correction is explicit and authoritative:

- stop thinking in terms of consumer clusters and local client-helper scaffolding as the main repair mechanism
- look at `example-to-do` and do that
- centralize the capability in the service
- rip embedded business capability out of the CLI app
- project the capability into a CLI plugin instead of embedding it in the CLI app shell

## Why This Handoff Exists

The user is dissatisfied with the prior agent’s implementation and review quality. The explicit criticism to preserve:

- boundaries were crossed sloppily
- architecture was not being read and followed tightly enough
- the HQ Ops “service” was not actually being built like the example service
- bad implementation direction was not caught in review
- “helper” thinking was reintroducing reinvention and drift

Important epistemic qualifier from the user:

- if something looks boundary-crossing but is a deliberate precursor to a later planned change, that can be fine
- if it is not clearly planned, then treat the complaint as real and fix it

## Working Environment

Primary execution checkout:

- `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou`

Single-worktree milestone execution. Do not create more worktrees for this milestone run.

Current branch:

- `agent-FARGO-M1-U02-followup-hq-ops-service-shape`

Current stack head:

- `agent-FARGO-M1-U02-followup-hq-ops-service-shape`

Execution context directory:

- `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution`

Scratch continuity file:

- `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/.scratch/agent-Milo.scratch.md`

Narsil primary tree:

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`

Narsil rule:

- after each commit you want indexed, move the primary tree to the same commit/branch and let Narsil catch up before trusting code-intel results

## Grounding Order

Read these in order before making decisions:

1. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md`
2. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md`
3. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Canonical_Architecture_Spec.md`
4. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/guidance.md`
5. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/orpc-ingest-domain-packages/DECISIONS.md`
6. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U02-reserve-hq-ops-seam.md`
7. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/issues/M1-U03-migrate-hq-ops-and-rewire-consumers.md`
8. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md`
9. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/HQ-OPS-service-shape-followup.md`

Read the next group as the direct reference model:

10. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/package.json`
11. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/index.ts`
12. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/client.ts`
13. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/router.ts`
14. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/base.ts`
15. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/contract.ts`
16. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/impl.ts`
17. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/router.ts`
18. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/modules/tasks/module.ts`
19. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/modules/tasks/contract.ts`
20. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/services/example-todo/src/service/modules/tasks/router.ts`

Read the projection examples next. These matter because the user explicitly corrected the repair direction toward projection, not app-embedded helper glue:

21. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/example-todo/src/contract.ts`
22. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/example-todo/src/server.ts`
23. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/example-todo/src/router.ts`
24. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/state/src/contract.ts`
25. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/state/src/server.ts`
26. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/server/api/state/src/router.ts`
27. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-satisfiers.ts`
28. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/host-seam.ts`
29. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/hq/src/manifest.ts`
30. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/cli/chatgpt-corpus/src/lib/client.ts`
31. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/cli/chatgpt-corpus/src/lib/projection.ts`
32. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/cli/chatgpt-corpus/src/commands/corpus/init.ts`
33. `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/plugins/cli/chatgpt-corpus/src/commands/corpus/consolidate.ts`

Historical reference only if needed:

- tag `archive/pre-u01-last-live-coordination-support-example`

Use that tag only to recover prior art or understand wiring that no longer exists. It is not canonical architecture truth.

## Architectural Rules To Preserve

- the canonical architecture document is the source of truth for ontology and boundary rules
- `services/example-todo` is the exact package/service shape model to copy
- `services/hq-ops` must expose only:
  - package root `.`
  - `./router`
  - `./service/contract`
- `services/hq-ops` must not expose:
  - `./config`
  - `./repo-state`
  - `./journal`
  - `./security`
- business capability ownership belongs inside `services/hq-ops/src/service/modules/*`
- “package” is support matter, not the place where business capability truth should live
- service capability should be projected into runtime/plugin surfaces; it should not be embedded directly into the CLI app shell as the primary long-term shape

## Current User Correction That Overrides Older Notes

The prior repair direction was wrong. Specifically wrong:

- framing the next step as “consumer clusters”
- framing the main repair as adding local per-consumer HQ Ops helpers
- treating CLI app local helper seams as the intended end state

The user’s correction is:

- centralize the capability
- make it a real service capability
- project it into the CLI plugin surface
- use `example-to-do` as the model “to the T”

This means some older notes in:

- `context.md`
- `HQ-OPS-service-shape-followup.md`

contain now-stale guidance about local helpers or consumer-cluster sequencing. Read them for history only. Do not obey that stale direction over this handoff doc.

## Current Branch State

Current branch:

- `agent-FARGO-M1-U02-followup-hq-ops-service-shape`

Current working tree is dirty. Nothing on this follow-up branch is committed yet.

Current `git status --short --branch` at handoff time:

```text
## agent-FARGO-M1-U02-followup-hq-ops-service-shape
 M apps/server/src/bootstrap.ts
 M apps/server/test/rawr.test.ts
 M apps/server/test/storage-lock-route-guard.test.ts
 M docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md
 M services/hq-ops/package.json
 M services/hq-ops/src/bin/security-check.ts
 D services/hq-ops/src/config/index.ts
 D services/hq-ops/src/journal/index-db.ts
 D services/hq-ops/src/journal/index.ts
 D services/hq-ops/src/journal/paths.ts
 D services/hq-ops/src/journal/semantic.ts
 D services/hq-ops/src/journal/types.ts
 D services/hq-ops/src/journal/utils.ts
 D services/hq-ops/src/journal/writer.ts
 D services/hq-ops/src/repo-state/index.ts
 D services/hq-ops/src/repo-state/model.ts
 D services/hq-ops/src/repo-state/storage.ts
 D services/hq-ops/src/security/audit.ts
 D services/hq-ops/src/security/exec.ts
 D services/hq-ops/src/security/git.ts
 D services/hq-ops/src/security/index.ts
 D services/hq-ops/src/security/internal.ts
 D services/hq-ops/src/security/report.ts
 D services/hq-ops/src/security/secrets.ts
 D services/hq-ops/src/security/types.ts
 D services/hq-ops/src/security/untrusted.ts
 M services/hq-ops/src/service/modules/config/contract.ts
 M services/hq-ops/src/service/modules/config/middleware.ts
 M services/hq-ops/src/service/modules/config/repository.ts
 M services/hq-ops/src/service/modules/config/router.ts
 M services/hq-ops/src/service/modules/config/schemas.ts
 M services/hq-ops/src/service/modules/journal/contract.ts
 M services/hq-ops/src/service/modules/journal/middleware.ts
 M services/hq-ops/src/service/modules/journal/repository.ts
 M services/hq-ops/src/service/modules/journal/router.ts
 M services/hq-ops/src/service/modules/journal/schemas.ts
 M services/hq-ops/src/service/modules/repo-state/contract.ts
 M services/hq-ops/src/service/modules/repo-state/repository.ts
 M services/hq-ops/src/service/modules/repo-state/router.ts
 M services/hq-ops/src/service/modules/security/contract.ts
 M services/hq-ops/src/service/modules/security/middleware.ts
 M services/hq-ops/src/service/modules/security/repository.ts
 M services/hq-ops/src/service/modules/security/router.ts
 M services/hq-ops/src/service/modules/security/schemas.ts
?? apps/server/src/hq-ops.ts
?? docs/projects/rawr-final-architecture-migration/.context/M1-execution/HQ-OPS-service-shape-followup.md
?? docs/projects/rawr-final-architecture-migration/.context/M1-execution/orchestrator-handoff.md
?? services/hq-ops/src/service/modules/config/support.ts
?? services/hq-ops/src/service/modules/journal/index-db.ts
?? services/hq-ops/src/service/modules/journal/paths.ts
?? services/hq-ops/src/service/modules/journal/semantic.ts
?? services/hq-ops/src/service/modules/journal/support.ts
?? services/hq-ops/src/service/modules/journal/types.ts
?? services/hq-ops/src/service/modules/journal/utils.ts
?? services/hq-ops/src/service/modules/journal/writer.ts
?? services/hq-ops/src/service/modules/repo-state/model.ts
?? services/hq-ops/src/service/modules/repo-state/storage.ts
?? services/hq-ops/src/service/modules/repo-state/support.ts
?? services/hq-ops/src/service/modules/security/audit.ts
?? services/hq-ops/src/service/modules/security/exec.ts
?? services/hq-ops/src/service/modules/security/git.ts
?? services/hq-ops/src/service/modules/security/internal.ts
?? services/hq-ops/src/service/modules/security/report.ts
?? services/hq-ops/src/service/modules/security/secrets.ts
?? services/hq-ops/src/service/modules/security/support.ts
?? services/hq-ops/src/service/modules/security/types.ts
?? services/hq-ops/src/service/modules/security/untrusted.ts
```

## What The Dirty Diff Means

The current diff is a mix of:

1. Likely-correct inward ownership moves
2. Real service-surface widening work
3. At least one likely-wrong projection move
4. Stale context text

### Likely-correct direction already started

These moves are probably directionally correct and worth evaluating rather than discarding blindly:

- business-capability implementation files were physically moved inward from:
  - `services/hq-ops/src/config/*`
  - `services/hq-ops/src/repo-state/*`
  - `services/hq-ops/src/journal/*`
  - `services/hq-ops/src/security/*`
- new module-local homes now exist under:
  - `services/hq-ops/src/service/modules/config/*`
  - `services/hq-ops/src/service/modules/repo-state/*`
  - `services/hq-ops/src/service/modules/journal/*`
  - `services/hq-ops/src/service/modules/security/*`
- `services/hq-ops/package.json` was narrowed to remove the illegal capability exports
- `services/hq-ops/src/bin/security-check.ts` was changed to call `createClient(...)` instead of importing a top-level capability export
- `config`, `journal`, `repoState`, and `security` module contracts/routers were widened away from placeholder reservations toward real procedures

### Likely-wrong or at-least-suspect move

This file is likely the wrong long-term direction under the user’s latest correction:

- `apps/server/src/hq-ops.ts`

Why it is suspect:

- it is a local app-owned HQ Ops client seam
- the user explicitly objected to embedding capability like this in the app shell
- the user wants the capability projected properly, not re-embedded in app-local glue
- if a server-side host-owned satisfier/projection seam is needed, it should look more like:
  - `apps/server/src/host-satisfiers.ts`
  - `apps/server/src/host-seam.ts`
  - `plugins/server/api/state/*`
  than like a standalone `apps/server/src/hq-ops.ts` helper bucket

The related rewires that may need to be rethought with it:

- `apps/server/src/bootstrap.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/storage-lock-route-guard.test.ts`

Do not assume those rewires should survive as-is just because they typechecked.

### Stale note files

These files were written from the wrong repair frame and should be updated or treated as historical only:

- `docs/projects/rawr-final-architecture-migration/.context/M1-execution/context.md`
- `docs/projects/rawr-final-architecture-migration/.context/M1-execution/HQ-OPS-service-shape-followup.md`

## Exact Reference Patterns You Should Copy

There are two distinct reference patterns to study together:

### 1. Service package shape

Primary reference:

- `services/example-todo/*`

What to copy from it:

- narrow package exports
- one root `createClient`
- one root `router`
- one root `service/contract`
- business capability authored as service modules
- no public module-capability package exports

### 2. Capability projection

Server/API projection references:

- `plugins/server/api/example-todo/*`
- `plugins/server/api/state/*`
- `apps/server/src/host-satisfiers.ts`
- `apps/server/src/host-seam.ts`
- `apps/hq/src/manifest.ts`

CLI/plugin projection reference:

- `plugins/cli/chatgpt-corpus/src/lib/client.ts`
- `plugins/cli/chatgpt-corpus/src/lib/projection.ts`
- `plugins/cli/chatgpt-corpus/src/commands/corpus/*`

Interpretation to carry forward:

- service capability lives centrally in the service package
- runtime/plugin surfaces project or bind that capability
- projection logic is organized with the plugin/runtime that owns the projection
- the app shell should not become the long-term home of capability-specific library glue

## What The References Actually Show

Do not just read the reference files. Carry forward these specific conclusions.

### Service-shape conclusions from `services/example-todo`

- `package.json` exports only:
  - `.`
  - `./service/contract`
  - `./router`
- `src/index.ts` exports only:
  - `createClient`
  - `router`
  - boundary types
- `src/service/contract.ts` composes module contracts only
- `src/service/router.ts` composes module routers only
- business capability is authored under service modules, not under top-level capability directories exposed as public package seams

### API projection conclusions from plugin server examples

- `plugins/server/api/example-todo/src/contract.ts` projects the service contract into route declarations
- `plugins/server/api/example-todo/src/server.ts` registers a plugin declaration and binds it with `resolveClient`
- `plugins/server/api/example-todo/src/router.ts` forwards requests into the resolved service client
- `plugins/server/api/state/*` shows the same pattern using `@rawr/hq-ops/service/contract`, not package capability subpaths
- `apps/server/src/host-satisfiers.ts` is host-owned client construction and caching, not an arbitrary app-local helper bucket
- `apps/server/src/host-seam.ts` binds declarations against satisfiers; it does not own capability logic
- `apps/hq/src/manifest.ts` is app composition authority only

### CLI projection conclusions from `plugins/cli/chatgpt-corpus`

- the plugin owns a small service client bootstrap at the plugin boundary
- commands do not reach into service internals; they call the service client
- projection-specific shaping lives in plugin-local projection files
- this is different from inventing generic per-app helper seams throughout the app shell

### Critical implication for HQ Ops

There are two different “client helper” ideas, and they are not equivalent:

- acceptable:
  - a projection-local client bootstrap in the runtime or plugin that legitimately owns that projection
- not acceptable:
  - scattering ad hoc app-local HQ Ops helper seams across consumers as the architecture itself

The previous agent drifted toward the second one. The repair needs to follow the first one.

## Commands Already Verified Earlier In This Repair

These passed earlier in the branch while testing the first server-side rewire:

- `bun run --cwd apps/server typecheck`
- `bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/storage-lock-route-guard.test.ts`

Do not treat those as branch-wide verification. They were only narrow checks.

## Open Technical Questions You Need To Resolve

1. Which current HQ Ops consumers belong inside dedicated plugin projection surfaces versus host-owned satisfier seams versus direct in-process service callers?
2. Should HQ Ops server-facing projection live more like:
   - current `apps/server/src/host-satisfiers.ts` state/example-todo host binding, or
   - current ad hoc `apps/server/src/hq-ops.ts`
   The user’s latest message strongly implies the former, not the latter.
3. Which existing CLI commands currently living in `apps/cli` should instead be authored under a CLI plugin projection surface?
4. Are the current `config`/`journal`/`security` service procedures sufficient, or do they still reflect old utility thinking instead of proper service capability boundaries?
5. Which parts of the current dirty diff should be preserved as good inward service-centralization work even if the projection story changes?

Do not answer these from memory. Resolve them by studying the reference files above.

## Constraints To Preserve

- single worktree only
- Graphite-first workflow
- do not use explorer/worker agents for the implementation repair
- if you later use agents for review, keep each one on a clean context vector
- before switching task/objective on an agent, compact first
- before any eventual commit that changes runtime behavior, run:
  - `bun run rawr hq up --observability required --open none`
  - then status, health, and log inspection
  - then confirm first-party state RPC success
  - then confirm archived coordination/support-example routes still `404`

## First Moves For The New Orchestrator

1. Reconfirm local state:
   - `git status --short --branch`
   - `git branch --show-current`
   - `gt ls`
2. Read the grounding set and the exact reference files listed above.
3. Reassess the current dirty diff in two buckets:
   - keep/evolve: central service-inward ownership changes
   - discard/rework: app-embedded projection moves that violate the user’s correction
4. Rewrite `context.md` so it reflects the corrected direction:
   - not local helpers
   - not “consumer clusters” as the main organizing idea
   - yes to centralized service capability plus projection surfaces
5. Then continue the implementation from that corrected model.

## How To Treat The Prior Agent

The prior agent is not the orchestrator anymore.

Use that agent only for:

- explaining what a particular dirty file change was trying to do
- pointing at a prior command or already-read document
- sanity-checking whether a change seems to preserve the new corrected direction

Do not let the prior agent drive the implementation plan.

## Bottom Line

The key correction is simple:

- HQ Ops must become one real service package like `example-to-do`
- its capability must be projected into the right plugin/runtime surfaces
- the app shell must stop being the place where embedded HQ Ops helper glue accumulates

Start from that correction, not from the previous agent’s helper-oriented repair path.
