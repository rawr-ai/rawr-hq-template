> Archived on 2026-03-09. Historical context only. This plan captures an older
> topology proposal and is superseded by the current active docs in
> `../../orpc-ingest-domain-packages/`.

# Plan Scratch — `@rawr/example-todo` domain topology refactor

This file intentionally contains the implementation plan verbatim so it survives context compaction.

---

# Refactor `@rawr/example-todo` to `boundary/ + domain/ + domain/modules/ + orpc/` topology

## Summary
Refactor `packages/example-todo/src` to:
- Make **package boundary** explicit and single-shot (`src/boundary/router.ts` is the only final attach point).
- Make **domain semantics + composition** explicit (`src/domain/{deps,setup,boundary,router}.ts`).
- Nest modules under the domain (`src/domain/modules/**`) to keep authoring and composition inside one subtree.
- Keep a local **proto-SDK kit** (`src/orpc/**`) with a seam (`src/orpc.ts`) so later extraction is straightforward.

This plan is implementation-ready and includes a non-conflicting multi-agent execution approach (agents do read-only mapping/audits; one implementer does the edits).

---

## Goals + Success Criteria
### Goals
- **One-way DAG** (no cycles, no “round-trips”):
  - `orpc/**` imports nothing from domain/modules/boundary.
  - `domain/**` may import from `orpc.ts` (kit seam) and itself.
  - `boundary/**` imports from `domain/**` (and boundary middleware).
  - Root `index.ts`/`router.ts`/`client.ts` import from `boundary/**` only (public surface stays thin).
- **Single-shot final attach**:
  - Only `src/boundary/router.ts` calls the final `.router(domainRouter)` (or equivalent final attach).
- **Preserve module-local patterns**:
  - Module-local setup remains in `domain/modules/<mod>/setup.ts`.
  - Module-local middleware remains possible under `domain/modules/<mod>/middleware/*` and is applied in that module’s `setup.ts`.
- **Scaffoldability**:
  - “Replace domain” becomes “replace `src/domain/**`” while `src/boundary/**` stays stable.
- **Tests still pass** (`bun test` + `bun run typecheck` in `packages/example-todo`).

### Non-goals (explicitly out of scope)
- Actually extracting the kit into the external SDK package.
- Renaming public package exports or changing the `exports` map in `packages/example-todo/package.json`.
- Auto-discovery of modules (composition remains explicit/manual).

---

## Target Topology (authoritative layout)
```
packages/example-todo/src/
  index.ts
  client.ts
  router.ts

  boundary/
    router.ts
    middleware/
      with-telemetry.ts
      # (any other package-wide middleware; import-fault etc if present)

  domain/
    deps.ts
    setup.ts
    boundary.ts
    router.ts

    shared/
      README.md
      errors.ts            # created only because we already have cross-module errors
      internal-errors.ts   # created because multiple modules use it

    middleware/
      with-read-only-mode.ts   # domain-wide semantics

    modules/
      tasks/
        contract.ts
        setup.ts
        router.ts
        schemas.ts
        repository.ts
        middleware/        # optional, module-local
      tags/
        ...
      assignments/
        ...

  orpc/
    factory.ts             # kit creation primitives (no domain concretes)
    # (any truly generic kit helpers)

  orpc.ts                  # seam facade re-exporting from ./orpc/*
```

### Why `domain/shared/*` exists, and what is allowed there
- `domain/shared/` is the **only** place for cross-module shared constructs (errors/schemas/helpers) that are domain-internal.
- We **do not** pre-create empty `schemas.ts` etc. We only create files when there is a real shared artifact.
- We **do** create `domain/shared/README.md` to prevent semantic drift (the README is the guardrail).

---

## Key Invariants (must be enforced during refactor)
1. **No module imports from `boundary/**`.** (`domain/modules/**` must not depend on package boundary.)
2. **No kit imports from domain/modules/boundary.** (`orpc/**` is extractable.)
3. **Root public surface stays thin**:
   - `src/index.ts` exports only `createClient`, `router`, and boundary types.
4. **Final attach single-shot**:
   - Only `src/boundary/router.ts` performs final `.router(domainRouter)` (or whatever the oRPC attach call is).
5. **Domain-wide middleware is defined once, applied once**:
   - Defined under `domain/middleware/*`, applied in `domain/boundary.ts`.
6. **Module-local middleware stays local**:
   - Applied in `domain/modules/<mod>/setup.ts` so authors don’t have to leave module scope for module-specific concerns.

---

## Execution Approach (agents + workflow)
### Why multiple agents, but no conflicts
This refactor is tightly coupled (moves + import rewrites). Parallel code editing is likely to conflict. So:
- Use **1 implementer** to do all repo mutations (to avoid merge conflicts).
- Use **2 read-only agents** to map changes and audit correctness (they do not edit files).

### Agent Roles
1) **Agent A — “Import & Move Map” (explorer, read-only)**
- Deliverable: a checklist of every file path that must change (imports in src + imports in tests + docs references), plus a grep-able list of “old paths that must go away”.
- Research only if stuck (should be straightforward).

2) **Agent B — “Invariant Auditor” (explorer, read-only)**
- Deliverable: an audit checklist to confirm:
  - only one final attach point exists,
  - no forbidden import edges exist,
  - tests updated to new deep paths,
  - module-local middleware pattern still works.

3) **Orchestrator (me) — Implementer + final reviewer**
- Does all file moves/edits, runs checks, resolves failures, and reviews the final result.
- Maintains the canonical scratch plan doc + working pad.

### Branch / Graphite workflow
- Work must happen in the **existing worktree** (`wt-agent-codex-dev-orpc-domain-examples-grounding-session`), not the primary checkout.
- Use Graphite for the refactor branch:
  - Confirm trunk is `main` (`gt trunk`).
  - Create a new branch on top of the current stack for this refactor (name explicitly, e.g. `refactor/example-todo-domain-boundary-domain-dir`).
  - No global restacks unless needed; keep changes in one branch unless there’s a compelling split.

---

## Step-by-Step Implementation Plan (decision complete)

### Phase 0 — Pre-flight (no edits)
1. Verify you are in the correct worktree + branch; confirm clean working tree.
2. Confirm Graphite status (`gt status`) and trunk (`gt trunk`).
3. Identify current entrypoints + invariants with grep:
   - Locate final attach call(s) (search for `.router(` patterns used for boundary attach).
   - Locate all imports of `../src/orpc/deps` and `../src/modules/*` in tests.

### Phase 1 — Scratch documents (must happen first after plan acceptance)
> This phase is mandatory for context-compaction resilience.

1. Create `docs/projects/orpc-ingest-domain-packages/PLAN_SCRATCH.md` and **paste this plan verbatim** (no edits; exact copy).
2. Create `docs/projects/orpc-ingest-domain-packages/WORKING_PAD.md` for orchestrator notes.
3. Create per-agent scratch pads (temporary) under `docs/projects/orpc-ingest-domain-packages/`:
   - `WORKING_PAD_agent-import-map.md`
   - `WORKING_PAD_agent-invariant-audit.md`
4. Spin up Agent A + Agent B and give them:
   - target topology (above),
   - the invariants list,
   - explicit “read-only only” instruction,
   - their expected deliverables.

### Phase 2 — Create the new directory skeleton (minimal scaffolding, no empty shared files)
1. Add `src/boundary/` and `src/domain/` directories.
2. Add `src/domain/shared/README.md` with strict rules:
   - cross-module only,
   - keep module-owned artifacts inside modules,
   - promote only when two+ modules share a construct.

### Phase 3 — Move “domain boundary” concerns into `src/domain/**`
1. Move/replace `src/orpc/deps.ts` → `src/domain/deps.ts`.
2. Move `src/orpc/errors.ts` → `src/domain/shared/errors.ts`.
3. Move `src/orpc/internal-errors.ts` → `src/domain/shared/internal-errors.ts`.
4. Create `src/domain/base.ts` (“the file everyone imports”):
   - It is the single domain kit instance:
     - imports `createOrpcKit` (or equivalent) from `../orpc.ts`,
     - defines domain-authored `baseMetadata` (domain/audience/idempotent defaults),
     - exports `ocBase` and `osBase` (domain-authored base builders).
   - **Hard rule**: `domain/base.ts` must not import module code.
5. Create `src/domain/middleware/with-read-only-mode.ts`:
   - Move logic from `src/orpc/middleware/with-read-only-mode.ts`,
   - Build from `osBase`/middleware builder exported by `domain/base.ts`,
   - Import `READ_ONLY_MODE` from `domain/shared/errors.ts`.
6. Create `src/domain/boundary.ts`:
   - Export a domain-wide middleware chain primitive (e.g. `domainBoundary = os.use(withReadOnlyMode)`),
   - **No final attach** here.
7. Create `src/domain/router.ts`:
   - Move `src/modules/router.ts` composition manifest to this file,
   - Update imports to `./modules/<mod>/router`.

### Phase 4 — Nest modules under `domain/modules/**` and update module imports
1. Move `src/modules/**` → `src/domain/modules/**` (folders intact).
2. For each module:
   - Update `contract.ts` to import `ocBase` from `../../base` (i.e., `domain/base.ts`), not `orpc/base.ts`.
   - Update `setup.ts` to derive its implementer subtree from the central implementer (`src/orpc.ts`).
   - Update any error imports to `../../shared/errors`.
   - Update internal error imports to `../../shared/internal-errors`.
3. Update relative imports inside module files (`./schemas`, `./repository`, etc.) if path depth changed.

### Phase 5 — Move “package boundary” concerns into `src/boundary/**`
1. Move `src/orpc/router.ts` → `src/boundary/router.ts` and rewrite it to:
   - import `domainRouter` from `../domain/router`,
   - import `domainBoundary` from `../domain/boundary`,
   - apply package middleware (telemetry, etc.),
   - perform the **single final attach** to the domain router.
2. Move `src/orpc/middleware/with-telemetry.ts` → `src/boundary/middleware/with-telemetry.ts`:
   - Update it to build from a builder exported by `domain/base.ts` (or use `domainBoundary` if your pattern supports that).
   - Ensure it remains observability-only and doesn’t remap errors.

### Phase 6 — Convert `src/orpc/**` into a proto-SDK kit (and add `src/orpc.ts` seam)
1. Replace `src/orpc/base.ts` with `src/orpc/factory.ts` (or refactor it in place, but end state must be “factory-ified”):
   - Export `createOrpcKit<Deps>(options)` that returns:
     - `oc` (contract builder),
     - `os` (middleware builder).
   - The factory accepts `baseMetadata` (domain-authored values supplied by `domain/base.ts`).
   - **Hard rule**: no domain concretes inside `orpc/**`.
2. Add `src/orpc.ts`:
   - Re-export `createOrpcKit` (and only the kit API surface needed by domain).
   - This is the seam we later replace with “import from SDK”.

### Phase 7 — Update root public surfaces (`index.ts`, `router.ts`, `client.ts`)
1. `src/router.ts`:
   - Re-export from `./boundary/router` (keep the stable `@rawr/example-todo/router` entry).
2. `src/index.ts`:
   - Keep exports stable: `createClient`, `Client`, `router`, `Router`.
3. `src/client.ts`:
   - Update `Deps` import to `./domain/deps`,
   - Confirm `defineDomainPackage(router)` still uses the boundary router.

### Phase 8 — Update tests to new paths (no behavior changes)
1. Update `packages/example-todo/test/helpers.ts`:
   - `Deps` import from `../src/domain/deps`,
   - Schema imports from `../src/domain/modules/<mod>/schemas`.
2. Update tests importing module contracts:
   - `../src/domain/modules/<mod>/contract`.
3. Ensure the read-only + telemetry tests still validate the intended behavior (no change in semantics).

### Phase 9 — Verification (hard gate)
Run in `packages/example-todo/`:
1. `bun run typecheck`
2. `bun test`

Static audits (grep-based):
- Ensure there is exactly one final attach:
  - Search for the boundary attach call pattern; verify only `src/boundary/router.ts` does it.
- Ensure forbidden imports do not exist:
  - `domain/modules/**` importing `boundary/**` must be zero.
  - `orpc/**` importing `domain/**` or `boundary/**` must be zero.

### Phase 10 — Final review + cleanup
1. Orchestrator reviews diffs end-to-end (not just green tests):
   - Does the directory topology read cleanly?
   - Are the “front doors” obvious (`domain/base.ts`, `domain/router.ts`, `boundary/router.ts`)?
   - Is module-local middleware still a first-class pattern?
2. Delete temporary per-agent working pads if desired (per your “throw away” requirement), **but keep** `PLAN_SCRATCH.md` as the canonical plan copy.
3. Ensure the worktree is clean and branch state is consistent with Graphite expectations (no half-finished moves).

---

## Flow / Case Coverage (what the new structure must support)
This refactor must preserve (and we’ll explicitly validate) these authoring flows:

1) **Add a new procedure to an existing module**
- Edit: `domain/modules/<mod>/contract.ts` → `setup.ts` (if deps needed) → `router.ts`.

2) **Add a new module**
- Create: `domain/modules/<new>/{contract,setup,router}.ts`
- Mount: `domain/router.ts` (explicit manual composition).

3) **Add module-local middleware**
- Implement under `domain/modules/<mod>/middleware/*`
- Apply in `domain/modules/<mod>/setup.ts` via `.use(...)`.

4) **Add domain-wide middleware**
- Implement under `domain/middleware/*`
- Apply once in `domain/boundary.ts`.

5) **Add package-wide middleware**
- Implement under `boundary/middleware/*`
- Apply once in `boundary/router.ts` (ordering relative to domain boundary is explicit here).

---

## Docs Updates (planned, but gated)
Per requirement: we will **not** immediately lock doc changes without discussion.

1. Draft proposed updates (as diffs) to:
   - `docs/projects/orpc-ingest-domain-packages/DECISIONS.md`
   - `docs/projects/orpc-ingest-domain-packages/guidance.md`
   - `docs/projects/orpc-ingest-domain-packages/examples.md`
2. Present the proposed doc changes for review.
3. After approval, apply them.

### What must be captured
- **DECISIONS.md (hard rules only)**:
  - The DAG constraints (no forbidden imports).
  - Single-shot final attach rule.
  - “domain/base.ts is the one shared import” rule.
  - “orpc/** contains no domain concretes” rule.
- **guidance.md (soft guidance + rationale)**:
  - Authoring journey by task type (module vs domain vs boundary).
  - When to promote artifacts to `domain/shared/` vs keep module-local.
  - Middleware taxonomy (domain-wide vs module-local vs boundary-wide) and why.
- **examples.md**:
  - Update to show small/medium/large examples in the new topology (including where middleware/errors live).

---

## Assumptions (explicit defaults chosen for implementers)
- We will create `domain/shared/README.md` immediately, but we will only create shared files when needed.
- In this package, `errors.ts` and `internal-errors.ts` are already cross-module, so they will live under `domain/shared/`.
- `with-read-only-mode` is a **domain semantic**, not a package boundary concern, so it lives under `domain/middleware/` and is applied via `domain/boundary.ts`.
- `with-telemetry` is **package wiring**, so it lives under `boundary/middleware/` and is applied via `boundary/router.ts`.
- Composition remains manual and explicit; no auto-discovery.
