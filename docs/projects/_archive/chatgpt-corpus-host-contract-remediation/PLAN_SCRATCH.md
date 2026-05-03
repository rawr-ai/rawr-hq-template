# Plan: Remediate Package-Specific Host Contract Placement for `chatgpt-corpus`

## Summary

Standardize the rule this way:

- **package-specific host contracts stay with the owning service package**
- they do **not** live in `src/service/**`
- they do **not** leak through the root/client shell
- they are exposed only through a **dedicated non-root package subpath**
- only **generic/shared** host contracts move to top-level `packages/`

For `chatgpt-corpus`, the remediation is to move `workspaceStore` out of `service/shared` into a package-local host-contract seam, then have the CLI plugin and tests consume that seam directly. The root shell stays hard and unchanged.

When implementation starts, the **first step** is to write this exact plan verbatim to:
- `docs/projects/chatgpt-corpus-host-contract-remediation/PLAN_SCRATCH.md`

Also create/update:
- `docs/projects/chatgpt-corpus-host-contract-remediation/WORKING_PAD.md`

That satisfies the scratch-first requirement and preserves the plan during implementation.

## Key Changes

### 1. Canonicalize the contract home
Move the `workspaceStore` contract and its related transport-agnostic data types out of:
- `services/chatgpt-corpus/src/service/shared/workspace-store.ts`

and into:
- `services/chatgpt-corpus/src/orpc/ports/workspace-store.ts`

This file becomes the canonical home for the package-specific host contract:
- `WorkspaceStore`
- `WorkspaceTemplate`
- `RawSourceMaterials`
- `WorkspaceArtifactBundle`
- related input/output support types needed by that contract

Reason:
- it is package-specific
- it is host-facing
- it is not concrete adapter code
- it is not service-internal domain semantics like errors/invariants

### 2. Add a dedicated non-root export path
Do **not** export this contract from package root or `client.ts`.

Instead, add a package export in `services/chatgpt-corpus/package.json`:

- `./orpc/ports/workspace-store`

The intended import for external consumers becomes:

- `@rawr/chatgpt-corpus/orpc/ports/workspace-store`

This keeps the hard shell intact while still giving runtime projections one canonical contract to implement.

### 3. Keep the root/client shell hard
Keep these files in the `example-todo` shape:

- `src/index.ts`
  - exports only `createClient`, `Client`, `router`, `Router`
- `src/client.ts`
  - exports only the standard boundary helper types already accepted in the repo:
    - `Deps`
    - `Scope`
    - `Config`
    - `CreateClientOptions`
    - `Client`

Do not reintroduce:
- result aliases
- host contract types
- workspace/artifact/template types
- module schema aliases

### 4. Rewire service internals to the new seam
Update `chatgpt-corpus` service internals so they import the host contract from the new package-local port seam, not from `service/shared`:

- `service/base.ts`
- module middleware/repository files that currently reference `WorkspaceStore`

After the move, `service/shared/` should keep only true shared service semantics:
- typed boundary errors
- other semantic-only shared material if any

`workspace-store.ts` should no longer exist under `service/shared`.

### 5. Remove duplicated structural typing in the CLI plugin
Update the CLI plugin filesystem adapter so it stops maintaining its own copy of the workspace-store contract shape.

Instead, import the canonical contract from:
- `@rawr/chatgpt-corpus/orpc/ports/workspace-store`

The plugin should:
- implement that contract locally
- continue to instantiate the filesystem-backed concrete adapter at the plugin boundary
- keep all Node/filesystem code local to the plugin

This removes duplication without softening the root shell.

### 6. Align service tests with the same seam
Update service test helpers so they also use the canonical package-local host contract seam rather than:
- root exports
- or a stale `service/shared/workspace-store.ts` path

Test-only in-memory adapters should implement the same contract from the new local port seam.

## Test Plan

Run:
- `bunx nx run @rawr/chatgpt-corpus:typecheck`
- `bunx nx run @rawr/chatgpt-corpus:build`
- `bunx nx run @rawr/chatgpt-corpus:test`
- `bunx nx run @rawr/plugin-chatgpt-corpus:typecheck`
- `bunx nx run @rawr/plugin-chatgpt-corpus:build`
- `bunx nx run @rawr/plugin-chatgpt-corpus:test`

Acceptance checks:
- package root still exports only `createClient`, `Client`, `router`, `Router`
- `client.ts` stays limited to the standard client-boundary helper types
- `workspaceStore` is no longer under `service/shared`
- plugin compiles against `@rawr/chatgpt-corpus/orpc/ports/workspace-store`
- service tests compile against the same canonical host-contract seam
- no runtime behavior changes in `rawr corpus init` / `rawr corpus consolidate`

## Assumptions

- The docs already settle the ownership rule: package-specific host contracts stay with the owning service package; only generic/shared contracts move to top-level `packages/`.
- The unresolved part is only the concrete file/export seam, and this remediation settles it as:
  - package-local `src/orpc/ports/*`
  - dedicated non-root package export
  - never root/client shell export
- This slice does **not** re-open the broader transport-agnostic redesign. It only fixes the canonical placement and exposure of the package-specific host contract.
- This slice does **not** recreate a full package-local proto SDK. It adds only the minimal package-local port seam needed for this package-specific contract.
