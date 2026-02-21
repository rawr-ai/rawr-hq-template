# Agent Q2 Final Packaging/Domain Organization Review

## Structural Call
Structural change is needed now, but only as targeted consolidation (not additional domain splitting).

- Do now: consolidate duplicate shared logic so package ownership is real.
- Defer: broader manifest/host decoupling and stronger gate semantics, unless Phase A scope budget allows a small extraction.

## Severity-Ranked Findings

### 1) [High] Shared-domain logic is duplicated across package and plugin-local libs, creating split authority
**Why this matters**
- Axis 11 and architecture lock package-owned shared infrastructure and deterministic import direction, but current structure keeps near-identical implementations in two domains (`packages/hq` and `plugins/cli/plugins/src/lib`).
- This creates immediate drift risk for Phase B+ changes (one side updates, the other side silently diverges).

**Evidence**
- Package ownership/export surface exists for shared modules: `packages/hq/package.json:13`, `packages/hq/package.json:17`, `packages/hq/package.json:21`, `packages/hq/package.json:25`, `packages/hq/package.json:29`, `packages/hq/package.json:33`.
- Architecture/package ownership policy: `docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:27`, `docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:29`, `docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:48`.
- Duplicate pairs (identical or import-path-only diffs):
  - `packages/hq/src/workspace/plugins.ts:1` vs `plugins/cli/plugins/src/lib/workspace-plugins.ts:1`
  - `packages/hq/src/install/state.ts:1` vs `plugins/cli/plugins/src/lib/install-state.ts:1`
  - `packages/hq/src/install/reconcile.ts:1` vs `plugins/cli/plugins/src/lib/install-reconcile.ts:1`
  - `packages/hq/src/lifecycle/process.ts:1` vs `plugins/cli/plugins/src/lib/plugins-lifecycle/process.ts:1`
  - `packages/hq/src/lifecycle/policy.ts:1` vs `plugins/cli/plugins/src/lib/plugins-lifecycle/policy.ts:1`
  - `packages/hq/src/lifecycle/lifecycle.ts:1` vs `plugins/cli/plugins/src/lib/plugins-lifecycle/lifecycle.ts:1`
  - `packages/hq/src/lifecycle/types.ts:1` vs `plugins/cli/plugins/src/lib/plugins-lifecycle/types.ts:1`
  - `packages/hq/src/lifecycle/fix-slice.ts:1` vs `plugins/cli/plugins/src/lib/plugins-lifecycle/fix-slice.ts:1`
  - `packages/hq/src/scaffold/factory.ts:1` vs `plugins/cli/plugins/src/lib/factory.ts:1`
  - `packages/hq/src/journal/context.ts:1` vs `plugins/cli/plugins/src/lib/journal-context.ts:1`
  - `packages/hq/src/security/module.ts:1` vs `plugins/cli/plugins/src/lib/security.ts:1`

**Restructuring options**
- `do now`:
  - Make plugin-local libs thin adapters/re-exports over `@rawr/hq/*`.
  - Keep local files only where CLI-specific adaptation is truly needed.
  - Extend import-boundary checks to ban duplicated implementations in plugin-local lib.
- `defer`:
  - Keep duplicates, but add strict equivalence checks in CI (hash/diff guard).
  - Tradeoff: lower immediate churn, but ownership ambiguity and maintenance tax remain.

**Recommendation**
- Do now in this phase window. This is consolidation, not reinvention.

### 2) [Medium] Commands already mix two authorities (`@rawr/hq/*` and plugin-local lifecycle modules)
**Why this matters**
- Mixed imports show uncertain ownership and increase accidental divergence during future edits.

**Evidence**
- Mixed authority in same command: `plugins/cli/plugins/src/commands/plugins/improve.ts:3`, `plugins/cli/plugins/src/commands/plugins/improve.ts:5`.
- Local install/workspace lifecycle usage across command surface: `plugins/cli/plugins/src/commands/plugins/status.ts:18`, `plugins/cli/plugins/src/commands/plugins/status.ts:20`, `plugins/cli/plugins/src/commands/plugins/doctor/links.ts:4`.
- Reference pattern already exists for pure re-export wrappers in app CLI: `apps/cli/src/lib/workspace-plugins.ts:1`, `apps/cli/src/lib/journal-context.ts:1`, `apps/cli/src/lib/security.ts:1`.

**Restructuring options**
- `do now`:
  - Standardize command imports to package-owned modules (`@rawr/hq/workspace`, `@rawr/hq/install`, `@rawr/hq/lifecycle`, etc.).
  - Keep plugin-local adapters only for CLI runtime specifics.
- `defer`:
  - Keep mixed imports temporarily and enforce a documented boundary map.
  - Tradeoff: less immediate change, but boundary confusion persists.

**Recommendation**
- Do now, bundled with Finding #1.

### 3) [Medium] `rawr.hq.ts` composition authority is coupled to server app internals
**Why this matters**
- Manifest authority should be stable composition input; importing `apps/server/src/orpc.ts` couples it to one host implementation file and makes future host variations harder.

**Evidence**
- Manifest imports server router constructor: `rawr.hq.ts:7`.
- Manifest constructs both orpc + workflow trigger routers from same constructor: `rawr.hq.ts:9`, `rawr.hq.ts:10`, `rawr.hq.ts:14`, `rawr.hq.ts:22`.
- Host consumes manifest for both route families: `apps/server/src/rawr.ts:225`, `apps/server/src/rawr.ts:258`.
- Policy target for plugin-owned workflow boundaries: `docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:39`, `docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:50`.

**Restructuring options**
- `do now`:
  - Extract router construction to package-level composition factory (host-neutral), then wire manifest from that package surface.
- `defer`:
  - Keep current shape for Phase A closure; schedule this as first packaging step in Phase B.
  - Tradeoff: protects short-term velocity, keeps host coupling risk temporarily.

**Recommendation**
- Defer unless a small extraction can be done without destabilizing current test/gate closure.

### 4) [Low] Phase A scaffold checks are mostly string-presence checks, not structural ownership checks
**Why this matters**
- Current checks can pass while packaging boundaries regress semantically.

**Evidence**
- String/include checks in smoke/scaffold scripts: `scripts/phase-a/manifest-smoke.mjs:23`, `scripts/phase-a/manifest-smoke.mjs:69`, `scripts/phase-a/verify-gate-scaffold.mjs:25`.

**Restructuring options**
- `do now`:
  - Add one structural check for duplicate core modules (or disallowed local implementation paths).
- `defer`:
  - Keep scaffold checks as-is and harden in Phase B gate work.

**Recommendation**
- Defer, unless Finding #1 is not addressed now (then add a temporary anti-drift check).

## Consolidation/Splitting Guidance (Pragmatic)
- Consolidate now:
  - Shared workspace/install/lifecycle/scaffold/journal/security logic into `packages/hq` as the single authority.
  - Plugin-local `lib` should be adapters and command glue only.
- Do not split now:
  - Do not introduce more packages/domains in Phase A.
  - Do not split `apps/server/src/orpc.ts` aggressively during closeout; only extract if needed for clear ownership.

## Do Now vs Defer (Summary)
- `do now`
  - Consolidate duplicated shared logic (Findings #1 and #2).
  - Keep plugin-local files only where they are true CLI adapters.
- `defer`
  - Manifest/host decoupling extraction (Finding #3) if not low-risk in current phase.
  - Gate semantic hardening (Finding #4).

## Skills Introspected
- `solution-design`
- `system-design`
- `domain-design`
- `plugin-architecture`
- `rawr-hq-orientation`
- `typescript`

## Evidence Map
- Spec/Policy grounding:
  - `docs/projects/orpc-ingest-workflows-spec/README.md:1`
  - `docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:65`
  - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:157`
  - `docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md:1`
  - `docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md:104`
  - `docs/projects/orpc-ingest-workflows-spec/axes/11-core-infrastructure-packaging-and-composition-guarantees.md:27`
  - `docs/projects/orpc-ingest-workflows-spec/axes/08-workflow-api-boundaries.md:39`
- Runtime/host surfaces:
  - `apps/server/src/rawr.ts:5`
  - `apps/server/src/rawr.ts:225`
  - `apps/server/src/rawr.ts:258`
  - `apps/server/src/orpc.ts:123`
  - `rawr.hq.ts:7`
  - `rawr.hq.ts:9`
  - `rawr.hq.ts:10`
- Workspace and plugin library surfaces:
  - `packages/hq/src/workspace/plugin-manifest-contract.ts:1`
  - `packages/hq/src/workspace/plugins.ts:1`
  - `plugins/cli/plugins/src/lib/workspace-plugins.ts:1`
  - `packages/hq/src/install/state.ts:1`
  - `plugins/cli/plugins/src/lib/install-state.ts:1`
  - `packages/hq/src/install/reconcile.ts:1`
  - `plugins/cli/plugins/src/lib/install-reconcile.ts:1`
  - `packages/hq/src/lifecycle/lifecycle.ts:1`
  - `plugins/cli/plugins/src/lib/plugins-lifecycle/lifecycle.ts:1`
  - `packages/hq/src/scaffold/factory.ts:1`
  - `plugins/cli/plugins/src/lib/factory.ts:1`
  - `packages/hq/src/journal/context.ts:1`
  - `plugins/cli/plugins/src/lib/journal-context.ts:1`
  - `packages/hq/src/security/module.ts:1`
  - `plugins/cli/plugins/src/lib/security.ts:1`
- Command-level authority usage:
  - `plugins/cli/plugins/src/commands/plugins/improve.ts:3`
  - `plugins/cli/plugins/src/commands/plugins/improve.ts:5`
  - `plugins/cli/plugins/src/commands/plugins/status.ts:18`
  - `plugins/cli/plugins/src/commands/plugins/doctor/links.ts:4`
  - `apps/cli/src/lib/workspace-plugins.ts:1`

## Assumptions
- Phase A still prioritizes convergence with minimal architecture churn.
- `packages/hq` is intended to be the canonical shared domain for plugin lifecycle/workspace/install/scaffold helpers.
- Existing server routing behavior is functionally acceptable for Phase A; this review is structural, not behavioral.

## Risks
- If duplication remains, future phase changes can silently diverge across surfaces.
- Mixed authority imports increase maintenance overhead and reviewer ambiguity.
- Manifest-to-host coupling can slow future host evolution and plugin-boundary maturation.

## Unresolved Questions
1. Is plugin-local duplication intentionally retained for publish/runtime isolation, or only transitional?
2. Should `rawr.hq.ts` be host-agnostic composition authority, or is host-coupled authority acceptable long-term?
3. For Phase B, should workflow trigger routers become plugin-owned contract routers directly (axis-08 target), or stay mapped from a shared admin contract with capability filtering?
