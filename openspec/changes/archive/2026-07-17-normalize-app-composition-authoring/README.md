# C4 Legacy Membership Retirement And Qualified Authoring Execution Record

**Status:** CLOSED

**Change:** `normalize-app-composition-authoring`

## Scope Amendment

The user categorically corrected C4 on 2026-07-16. C4 does not repair, extend, or replace the legacy web-plugin mounting and app-composition system. Its app-facing result is removal: retire the mixed repository-state/web-mount lifecycle and leave future composition and runtime realization to the dedicated canonical architecture migration.

The superseded C4 draft treated removal of a false authority as a requirement to construct its successor. That was the categorical error. It expanded an adjacent future architecture into this lifecycle container, creating a custom composition editor, projection generator, snapshot/role realization path, mount path, and runtime-status model. Those are not prerequisites for agent-plugin or repository lifecycle normalization and are removed or deferred rather than hardened.

C4 now has two bounded outcomes:

1. Remove `rawr plugins web`, `rawr plugins scaffold`, repository-state membership, the state API/UI, and workspace scan/filter/mount paths without a compatibility bridge or replacement runtime.
2. Preserve source creation through exactly three qualified, source-only owners: `rawr agent plugins create`, `rawr cli command create`, and `rawr cli extension create`.

## Authority Binding

Authority is applied in this order:

1. The user's categorical C4 scope correction recorded above: retire the legacy mixed web/state lifecycle; do not build app composition, app-projection generation, mounting, runtime realization, or runtime status in this initiative.
2. Repository separation amendment at personal RAWR HQ `main` commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, file `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md`, blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
3. Accepted lifecycle packet provenance at personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
4. The packet normative proposal and C4 lifecycle rows, limited by items 1-2. They establish removal and qualified ownership, not a mandate to implement the future runtime platform.
5. The canonical future owners documented in `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md` and `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`.
6. Landed C1 controller/external-extension and C2 release/build/artifact/export/package/capsule specifications and execution records.
7. This Template-owned OpenSpec execution record, its legacy-membership retirement delta, and its qualified-authoring delta.
8. Current code, tests, history, live processes, and installed tooling as migration or proof evidence only.

The personal commit and project-tree OID are design-packet provenance only. C4 starts from clean Template `main` and creates no ancestry, merge, cherry-pick, transplant, executable import, workspace link, runtime selection, standing equivalence check, or source-local controller relationship with personal RAWR HQ.

## Repository Record

| Field | Value |
| --- | --- |
| Owning repository | RAWR HQ-Template |
| C4 parent `main` | `feb311b41cb6b18c132c680781967a24976b60b5` |
| C4 parent tree | `9e2b55ab1207349ad509fb406147cc4eb556dad8` |
| C2 reviewed source / landed `main` | `e8bf7b31a673def65c04f1246cdc8a08a04482e3` / `dac4c6407dcc8d75adc34738f5ae9995a43a1810` (PR #336) |
| C2 reviewed archive / landed `main` | `bba27c52941ef8cb5f66e1b801c446eb7378349e` / `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2` (PR #337) |
| C3 source / archive / closeout landed `main` | `3f09e6a4fa1614d218317b411b60719a2603f5e3` / `7e208f4b87aee24c35bc8dbf015d131c9d955a93` / `feb311b41cb6b18c132c680781967a24976b60b5` (PRs #338-#340) |
| C4 source worktree / branch | `wt-template-c4-app-composition-authoring` / `codex/c4-app-composition-authoring` (drained after source landing) |
| C4 reviewed source / landed `main` | `42d52acb4afb76872b287da335804c4038428011` / `2371d9b989c5d9ff92cc4fb799365634f2634e2e` (PR #341) |
| C4 reviewed/landed source tree | `765bf9cbb028d3013b46c67733cdf1e542f8be28` |
| C4 archive worktree / branch | `wt-template-c4-app-composition-authoring-archive` / `codex/c4-app-composition-authoring-archive` |
| C4 reviewed archive / landed `main` | `cb4d01c52039af11eee13dcdfc45fb5909f0dce5` / `5350f81f2e4181105e8c60efd3d693e40fa6b348` (PR #342) |
| C4 reviewed/landed archive tree | `e12b87508f2276af3d84af0506e432402a8f2f6d` |
| C4 closeout worktree / branch | `wt-template-c4-app-composition-authoring-closeout` / `codex/c4-app-composition-authoring-closeout` |
| Graphite parent | `main` |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Dependency shape | landed C1-C3; C4 removes only legacy membership/scaffold ownership and does not activate C3; C5 waits for C4 |
| Current gate | Source and archive are landed on canonical Template `main`; exact C4 proof is dispositioned, source/archive nodes are drained, and this record closes C4 |

Record-only proof on 2026-07-16: `bunx @fission-ai/openspec@1.3.1 validate normalize-app-composition-authoring --strict` passed, and a no-index whitespace check passed for every untracked record file. These results validate the amendment shape only; implementation, behavior proof, standing review, landing, and closure remain open.

## Director Frame

### Objective

Make the legacy mixed web/state membership model unreachable and preserve only three qualified source-authoring capabilities, without creating a temporary app-composition or runtime-realization authority that the canonical architecture migration would later remove.

### Hard Core

- External Oclif extensions remain under `rawr plugins`; C4 adds no curated lifecycle or app-composition behavior there.
- `rawr plugins web ...` and `rawr plugins scaffold ...` have no active command, alias, forwarder, help row, or implementation route.
- `.rawr/state/state.json`, `plugins.enabled`, repo-state membership, the state API/UI, workspace package scan/filter mounting, ID-derived module routes, and legacy web mount paths have no active producer or consumer. Stale state is inert and ignored, not migrated.
- C4 does not add composition editing, an AppDefinition parser, an app-projection generator, runtime snapshots, role realization, mount orchestration, live composition observation, or runtime status.
- Future composition and runtime realization remain owned by the canonical `defineApp(...) -> SDK derivation -> compiler -> process runtime -> adapters -> harness -> RuntimeCatalog` path, started through `startApp(...)`.
- Exactly three create commands remain: `rawr agent plugins create`, `rawr cli command create`, and `rawr cli extension create`.
- Each creator owns one source species through a distinct request and application module. No creator installs, selects, builds, packages, exports, synchronizes, mounts, or activates its output.
- Shared authoring code receives qualified destinations and deterministic write plans only. It cannot parse raw product identity, select a product kind, infer authority, or import a sibling creator.
- Exact-existing output converges read-only. Divergent collisions reject before writes; partial publication reports only the exact newly published subset.
- Template owns controller and generic tooling implementation. Personal receives curated content only through an explicit content-workspace interface and receives no copied executable implementation.
- C4 does not activate C2/C3 lifecycle applications or perform C5 semantic cutover.
- The inherited mixed `rawr plugins sync` aggregate and root `rawr undo` remain frozen migration evidence. C5 owns their semantic cutover; C4 does not claim that bare `rawr plugins` is external-only yet.

### Exterior

The dedicated app/runtime architecture migration; `defineApp`, SDK derivation, compilation, process realization, adapters, harnesses, `RuntimeCatalog`, `startApp`, app-projection generation, app composition authoring, mounting, runtime observation/status, and hot reload are outside C4. C3 provider convergence, C2 release/artifact/export behavior, C5 lifecycle command activation and aggregate deletion, C6 personal content/records, C7 canonical operational settlement, external Oclif registry mutation, and protected-lane subject bytes are also outside C4.

### Falsifiers And Redesign Triggers

- Removing a legacy owner introduces a C4-owned replacement composition registry, editor, snapshot, mount plan, runtime realization, or status schema.
- Server or web startup still reads repo state, scans workspace packages, filters membership, derives a module path from an ID, or uses a compatibility fallback.
- A stale enablement file is imported, repaired, synchronized, or treated as migration input.
- A C4 change adds web mounting, scaffolding, curated agent lifecycle, or composition behavior to bare `rawr plugins`, or claims that C4 completed the inherited aggregate cutover assigned to C5.
- An app-projection creator or composition command remains discoverable as a C4 product.
- A creator selects its output kind through a flag, uses an aggregate factory, imports a sibling creator, or combines source creation with install, selection, lifecycle, controller, provider, export, or runtime mutation.
- Official command creation writes outside verified Template; external extension creation requires an Nx/RAWR checkout or mutates Oclif; agent-plugin creation writes anything beyond verified curated personal content.
- A repeated converged create changes bytes, metadata, workspace membership, lifecycle records, controller state, provider state, export state, or runtime state.
- C4 imports C2/C3 stateful applications, the legacy mixed aggregate, protected-lane candidate bytes, or personal executable code.

Any such finding pauses the affected slice before a compatibility layer or new state owner is added. A need for runtime composition functionality is a handoff to the canonical architecture migration, not permission to reconstruct it here.

## Authority Ledger

| State or fact | Sole owner | C4 use | Forbidden C4 owner or path |
| --- | --- | --- | --- |
| future app definition and role derivation | canonical `defineApp(...)` and SDK/compiler architecture | deferred reference only | CLI composition editor, repo-state, workspace scan |
| future process realization | process runtime, adapters, harnesses, `RuntimeCatalog`, `startApp(...)` | deferred reference only | C4 snapshot/mount/status service |
| legacy repo-state membership | no target owner; retired | semantic absence proof | compatibility reader, migration importer, replacement registry |
| official command source | verified Template workspace | one qualified source creator | personal repo, Oclif registry, controller selection |
| external extension source | explicit operator destination | portable qualified source creator | native Oclif mutation, Template app/runtime state |
| curated agent-plugin source | verified personal content workspace | content-only qualified source creator | Template runtime copy, release/provider/export/record state |
| external extension registry | native Oclif manager | never read or mutated by creation | authoring applications |
| agent release/artifact/export truth | C2 qualified owners | never read or mutated | source authoring |
| provider/receipt/promotion truth | C3 qualified owners | never read or mutated | source authoring |
| controller selection | C1 installer/selector | unchanged | official command creator |
| repository relationship | none between Template and personal | explicit versioned content interface only | merge, ancestry, executable mirror, equivalence gate |

## Current-State Disposition

| Current path or owner | C4 disposition |
| --- | --- |
| `rawr plugins web ...` | delete; no replacement command in C4 |
| `rawr plugins scaffold ...` and mixed factory | delete after the three qualified source creators own the retained capabilities |
| repo-state membership service and `.rawr/state/state.json` consumers | delete; stale state remains inert |
| state API/plugin/browser client and state-driven mounts UI | delete |
| workspace scan/filter/mount and ID-derived web module routes | delete without compatibility fallback |
| C4 composition editor, parser, snapshot/domain, role realization, mount readiness, observation, and status work | remove or defer to the canonical architecture migration |
| C4 app-projection creator | remove or defer to the canonical architecture migration |
| inherited `rawr plugins sync` aggregate and root `rawr undo` | preserve unchanged as migration evidence; C5 owns final command-surface cutover |
| `rawr agent plugins create` | retain as content-only source authoring |
| `rawr cli command create` | retain as Template-only official source authoring |
| `rawr cli extension create` | retain as portable external-extension source authoring |
| C1/C2 owners and C3 parallel work | preserve unchanged |

## Corpus And Proof Boundary

| Rows | Oracle | C4 proof |
| --- | --- | --- |
| B04 | command ontology | exact discovery of three creators; negative legacy web/scaffold, composition, and app-projection invocation |
| B05 | authority-local applications | one per-kind creator; adjacent mutation ports remain zero; no replacement runtime owner |
| B21 | zero-mutation convergence | exact-existing creators inspect and validate with unchanged bytes and metadata |
| B30 | `SemanticAbsenceOracle` | no active persisted membership, state API/UI, workspace scan/filter/mount, legacy command/alias/factory, compatibility path, or C4 mini-runtime |
| B31 | `ScaffoldBoundaryOracle` | Template-only official command source, content-only agent source, portable foreign-directory extension source |

Behavior tests own source transitions, failures, output bytes, command discovery, call absence, and idempotence. Source-shape checks are limited to semantic absence, command/module topology, repository separation, and forbidden dependency direction where shape is the contract. Existing unrelated server/RPC/Inngest behavior is regression proof only and does not expand the C4 product boundary.

## Write Set And Activation Boundary

- Legacy command, repo-state, state API/UI, web scan/filter/mount, mixed scaffold/factory, and their exact tests/metadata are deletion candidates.
- `apps/cli/src/commands/agent/plugins/create.ts`, `apps/cli/src/commands/cli/{command,extension}/create.ts`, and their per-kind authoring applications are the only new command families retained.
- Shared authoring primitives may cover containment, deterministic write planning, exact-byte comparison, and truthful publication results only.
- OpenSpec, semantic-absence gates, command discovery, and owner behavior tests record and prove the corrected boundary.

No C4 command activates a controller, external extension, agent release, provider projection, app projection, mount, or process. C5 may activate the qualified agent lifecycle only after C3 and corrected C4 land.

## Protected Lanes

The landed oRPC/effect-oRPC evidence is a read-only baseline. Existing surviving RPC/OpenAPI behavior may be used as regression proof, but C4 does not redesign that lane. Inngest remains `HF01_PENDING`; C4 may preserve the current accepted mount/function identities but must not materialize, build, package, export, synchronize, release, distribute, or rewrite candidate bytes.

## Gate And Proof Log

The complete corrected implementation was reviewed at clean Template commit `fb5f9ebcf4b9f109c19fc63f872843fb7fc6c4ca` against landed C3 main `feb311b41cb6b18c132c680781967a24976b60b5`.

- Pinned strict OpenSpec validation, `git diff --check`, the C4 legacy-membership/authoring gate, the C2 release-product gate, and the C3 native-convergence gate passed.
- Focused creator and command-surface proof passed 28 tests. Surviving server, web, HQ app, HQ Ops, and mixed-plugin deletion-boundary suites passed; the complete CLI suite passed 43 files and 292 tests.
- Exact uncached Nx affected `build,typecheck,lint,test` passed for all 38 affected projects. The first post-restack attempt found only missing local workspace links; `bun install --ignore-scripts` restored the C3 workspace links and removed the stale deleted web `@rawr/ui-sdk` lock row, after which the exact graph passed.
- TypeScript/refactoring, architecture/authority, behavior-first testing, and structural-quality reviewers approved the corrected slice. Structural review found that the first permanent gate accidentally froze every future `agent` and `cli` command; the repaired gate closes only the three `create.ts` owners, so C5 lifecycle commands remain reachable without reopening aggregate creation.
- A production controller built from the clean reviewed commit materialized immutable digest `849d27883d8dba95be35f91faa13e171d12135dbb1098493bbc3079625f33e99`. From a foreign disposable directory it discovered exactly the three creators and rejected all 14 retired composition, web, scaffold, and forge command IDs.
- Installed external-extension creation returned `AuthoringDryRun`, `AuthoringAuthored`, then `AuthoringConverged`. The 11-entry generated tree retained identical digest, size, mode, and file/directory/link mtimes on repeat; the package independently installed, built, and tested with no workspace dependency.
- Controller selection/digest, native Oclif state, disposable HOME/XDG/Codex/Claude state, and isolated release/build/package/export/provider/promotion/process/personal-record sentinels were byte-, link-, mode-, and mtime-identical before and after. Guarded cleanup removed only the owned prefixed temporary root; no shell recursive removal, `fs.rm`, canonical path, or global state was used.

### Landed-Main Proof And C5 Handoff

- PR #341 landed the exact reviewed tree on canonical Template `main` at `2371d9b989c5d9ff92cc4fb799365634f2634e2e`. Post-main strict OpenSpec validation, all three lifecycle architecture gates, `git diff --check`, and the 28-test focused creator/semantic-absence suite passed.
- The landed immutable controller materialized digest `8a6f3dd9b8e658e1fdb0bef688008bca1cd5d2ccb8e53eb7e98c32023685c8fd`. Its foreign-directory acceptance again found exactly three creators, rejected all 14 retired IDs, returned `AuthoringDryRun -> AuthoringAuthored -> AuthoringConverged`, preserved the exact 11-entry output tree and all mtimes, independently installed/built/tested the extension, and left every disposable adjacent authority unchanged.
- The pre-landing exact 38-project uncached affected graph passed on the same landed tree. A post-main rerun passed every non-CLI project and 290 of 292 CLI tests; the two failures were the inherited `plugins-sync-drift` and `plugins-status` cases concurrently invoking the mixed `rawr plugins sync` aggregate against one shared workspace export. A single isolated diagnostic invocation completed its planned apply, confirming the failure belongs to the old aggregate's shared-output test model rather than the C4 tree.
- C4 does not serialize, repair, or harden that invalid aggregate. C5 owns deletion of the two legacy tests together with `rawr plugins sync`, its shared workspace output, and the mixed owner. This is an explicit C5 migration oracle, not a green claim for legacy lifecycle behavior.
- The diagnostic used a disposable provider home, performed no native install, and removed its guarded temporary root. The Template checkout remains tracked-clean; no canonical controller or provider state changed.

## Closure

C4 settles only when the superseded mini-runtime work is absent, legacy web/state membership is unreachable, the three source-only creators and their failure/idempotence contracts pass, all four standing review roles have no unresolved invariant-threatening finding, source lands on canonical Template `main`, the OpenSpec record is archived truthfully, and the Graphite branch/worktree is drained. C4 closure makes no claim that the aggregate lifecycle cutover, app composition, or runtime realization is complete.

C4 is closed. Legacy web/state membership, the state API/UI, workspace mounting, mixed scaffold ownership, and the superseded C4 mini-runtime are unreachable. Exactly three qualified source creators remain. The mixed agent lifecycle aggregate and its two shared-output tests are intentionally left only as C5 deletion evidence; app composition and runtime realization remain owned by the separate canonical architecture migration. After this record lands, the closeout branch/worktree is drained before C5 opens from clean Template `main`.
