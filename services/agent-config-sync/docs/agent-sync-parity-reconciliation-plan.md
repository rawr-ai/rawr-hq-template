# Agent Sync Parity Reconciliation Plan

## Status

This document began as the durable reconciliation spec for the accidental split between:

- `agent-codex-agent-sync-parity-closure`
- `codex/agent-config-sync-parity-semantics`

The reconciliation has now been implemented on this same branch in
`1f26392b feat(agent-config-sync): report semantic support residuals`. Treat the
branch as the reconciled agent-config-sync parity implementation, not a
planning-only stop.

For the current operational state of direct sync vs Codex package/install, read
`services/agent-config-sync/docs/CURRENT_STATE.md` first. That document captures
the temporary two-track model and the future package-parity/reconciliation work.

The winning base is `agent-codex-agent-sync-parity-closure` at `ee91644b`. The semantics branch is evidence-only. Its useful semantic modeling lives in `f24253f0 feat(agent-sync): model agent projection semantics`, but its branch topology is wrong and its tree is older than the closure lane.

## Product Definition

Parity means material sync plus semantic residual reporting.

It does not mean perfect runtime equivalence across Claude, Codex, Cowork, and future consumers. RAWR source material is authoritative. Each provider receives a projection of that source material. A provider projection can be materially synced while still carrying semantic residuals, such as Claude-only orchestration, unsupported frontmatter, adapter-required task spawning, tool-lock semantics, or provider-specific runtime behavior.

`IN_SYNC` means no modeled material drift or conflicts for the selected sync targets. It must not mean "runtime-equivalent." The reconciled capability must report semantic caveats alongside sync status so an operator can see: files are converged, but these semantics remain unsupported, adapter-required, or unknown.

## Capability Reconciliation

| Capability | Closure branch contribution | Semantics branch contribution | Reconciled decision | Why |
| --- | --- | --- | --- | --- |
| Provider projection model | Implements service-owned provider projections and projection residuals. | Adds richer semantic support records and support vocabulary. | Keep closure implementation shape and add semantic support records beside material projection status. | Closure is current and has later fixes; semantics adds useful vocabulary. |
| Source workspace sync | Adds external source workspace support and tests. | No winning contribution. | Closure wins. | This is implemented only on the closure lane. |
| Codex runtime skill destination | Writes Codex skills to runtime `.agents/skills`. | Older code/docs can point back toward root `skills`. | Closure wins completely; do not resurrect root skill sync. | Root skill sync is legacy output and a product regression. |
| Retired root Codex skill cleanup | Reports/removes managed retired root skill copies while preserving unclaimed files. | No winning contribution. | Closure wins, with an added implementation risk around cross-plugin claim guards. | This is central to the cutover and must be hardened rather than replaced. |
| Hooks, MCP, settings, and config sync | Implements direct Codex material sync and retirement for these surfaces. | Treats more surfaces as residuals in an older model. | Closure wins on behavior; semantics contributes warning language only. | Directly managed Codex material should stay native when the service writes it. |
| Codex agents | Projects markdown agents into Codex TOML and drops Claude-only fields. | Adds granular semantic support ideas for model/tool/hook/MCP/color metadata. | Preserve closure TOML behavior and classify dropped semantics more precisely. | Closure has safer writer behavior; semantics improves operator honesty. |
| Claude-only orchestration | Reports orchestration gaps. | Adds detection ideas for `Skill(...)`, `Task(...)`, TodoWrite, hook references, artifact references, tool locks, and model selection. | Manually port semantic detection/classification into closure. | These are semantic gaps, not material drift. |
| Codex package/install lane | Separates direct sync from official package/runtime install handling. | No winning contribution. | Closure wins; direct home sync and package/runtime install remain separate claims. | Package/runtime install and direct sync are different product surfaces. |
| Support statuses | Uses material support statuses including `legacy_or_deprecated`. | Uses semantic support status concepts. | Material projection may keep `legacy_or_deprecated`; semantic support should use `native`, `adapter_required`, `unsupported`, and `unknown`. | Legacy/deprecated is material-output classification, not a semantic-support state. |

## Engineering Reconciliation

Use `agent-codex-agent-sync-parity-closure` as the base. Create the implementation branch as a child of this plan branch after this plan is accepted.

Do not cherry-pick `f24253f0` as a code commit. The semantics branch is a sibling with stale topology. A wholesale cherry-pick or `gt move` would risk deleting or rolling back closure-owned behavior, including:

- `packages/agent-config-sync-node`
- source workspace sync
- Codex package/runtime install behavior
- Codex runtime skill path fixes
- root Codex skill mirror retirement
- hook, MCP, settings, config, and registry handling

Manual porting is required. Use `git show f24253f0 -- <path>` only as read-only source material.

### Planned Type/API Shape

Separate material projection status from semantic support status.

- Keep material projection status on `ProviderProjection.supportStatus`.
- Add `semanticSupport: ProjectionSupport[]` or the equivalent closure-native field.
- Use semantic support statuses: `native`, `adapter_required`, `unsupported`, `unknown`.
- Keep `legacy_or_deprecated` only for material projection status, because closure uses it for legacy prompt/workflow mirror reporting.
- Add separate residual summaries:
  - `totalMaterialProjectionResiduals`
  - `totalSemanticSupportResiduals`
  - `materialProjectionResiduals`
  - `semanticSupportResiduals`
- Keep a transitional aggregate only if downstream CLI compatibility requires it; do not let aggregate naming blur material sync with runtime semantic parity.

### Implementation File Inventory

Expected service files:

- `services/agent-config-sync/src/service/common/entities.ts`
- `services/agent-config-sync/src/service/common/entities/sync-results.ts`
- `services/agent-config-sync/src/types.ts`
- `services/agent-config-sync/src/service/common/helpers/projections.ts`
- `services/agent-config-sync/src/service/common/source-content/helpers/codex-agent.ts`
- `services/agent-config-sync/src/service/modules/planning/entities.ts`
- `services/agent-config-sync/src/service/modules/planning/helpers/assessment-summary.ts`
- `services/agent-config-sync/src/service/modules/planning/helpers/preview-sync-run.ts`
- `services/agent-config-sync/src/service/modules/execution/router.ts`

Possible new helper:

- `services/agent-config-sync/src/service/common/source-content/helpers/claude-semantics.ts`

Expected CLI/plugin display files:

- `plugins/cli/plugins/src/commands/plugins/status.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/drift.ts`
- `plugins/cli/plugins/agent-pack/skills/agent-sync/SKILL.md`
- `plugins/cli/plugins/agent-pack/skills/agent-sync/references/layout-and-mapping.md`

Expected tests:

- `services/agent-config-sync/test/helpers.ts`
- `services/agent-config-sync/test/sync-behavior.test.ts`
- `services/agent-config-sync/test/workspace-planning.test.ts`
- `plugins/cli/plugins/test/plugin-plugins.test.ts`

## Implementation Sequence

1. Create an implementation branch as a child of `codex/agent-config-sync-parity-reconciliation-plan`.
2. Update schemas and public aliases first in the common entity/type files.
3. Manually port semantic parsing ideas from `f24253f0`, especially `Skill(...)`, `Task(...)`, TodoWrite, model selection, tool locks, hooks, MCP/settings, and cosmetic metadata.
4. Update `codex-agent.ts` so generated Codex TOML writes only safe native fields while dropped Claude-only fields become classified semantic support records.
5. Update `projections.ts` to preserve closure material statuses and attach semantic support arrays beside them.
6. Update planning summaries and CLI output so semantic residuals warn without making materially converged sync look failed.
7. Extend existing tests instead of replacing them.
8. Update agent-pack docs with semantic caveats while preserving closure's runtime skill root, Codex package/install language, `.claude-plugin/plugin.json` path, and Cowork/ZIP wording.
9. Run focused tests and dry-runs.
10. Submit the implementation stack through Graphite.

## Review Loops

The plan requires two review passes before implementation:

1. Capability review:
   - Verify the product matrix against branch/session evidence.
   - Confirm "material sync plus semantic residual reporting" is the product contract.
   - Reject any language that implies perfect runtime equivalence.

2. Engineering/adversarial review:
   - Verify the implementation inventory against actual branch diffs.
   - Confirm no stale topology from `codex/agent-config-sync-parity-semantics` is imported.
   - Confirm the plan preserves source workspace sync, Codex package/runtime install handling, runtime skill destination, root mirror retirement, hooks/MCP/settings/config behavior, and provider projections.
   - Confirm retirement logic handles cross-plugin claim safety before declaring the cleanup path hardened.

## Test Plan

Run after implementation:

```bash
bun run --cwd services/agent-config-sync typecheck
bun run --cwd services/agent-config-sync test
bun run --cwd plugins/cli/plugins typecheck
bun run --cwd plugins/cli/plugins test
bun scripts/phase-03/run-structural-suite.mjs --project @rawr/agent-config-sync
bun scripts/phase-03/run-structural-suite.mjs --project @rawr/plugin-plugins
git diff --check
gt submit --dry-run --stack --no-interactive
```

Focused assertions:

- Codex agent TOML emits only safe native fields.
- `Skill(...)`, `Task(...)`, and TodoWrite appear as semantic residuals.
- Direct Codex hook, MCP, settings, and config material remains native when directly synced.
- Semantic residuals are reported even when material sync status is `IN_SYNC`.
- Default-on Codex agent behavior remains true unless `includeAgentsInCodex: false`.
- Root Codex skill sync under `<codex-home>/skills` is not reintroduced.
- Retirement does not delete a runtime skill still claimed by another active registry entry.

## Graphite Handling

### Spec Branch

The spec branch is:

```bash
codex/agent-config-sync-parity-reconciliation-plan
```

Its parent is:

```bash
agent-codex-agent-sync-parity-closure
```

Preflight before submit:

```bash
git status --short --branch
gt ls --stack
git diff --stat agent-codex-agent-sync-parity-closure..HEAD
git diff --check
```

Submit:

```bash
gt submit --dry-run --no-interactive --branch codex/agent-config-sync-parity-reconciliation-plan
```

Do not publish this spec branch until the surrounding stack shape is intentionally ready. At the time this plan was written, `gt submit --dry-run --branch codex/agent-config-sync-parity-reconciliation-plan` showed the spec branch as creatable, but also showed many downstack runtime branches as `Create`. That means a naive submit from this branch would publish more than the agent-sync spec branch. Publishing belongs in the later Graphite normalization/drain step, not in this doc-only planning stop.

When the stack is normalized, publish with:

```bash
gt submit --publish --ai --no-edit --no-interactive --branch codex/agent-config-sync-parity-reconciliation-plan
```

### Implementation Branch

Create the implementation branch on top of the accepted spec branch. After implementation and tests:

```bash
git status --short --branch
gt ls --stack
gt submit --dry-run --stack --no-interactive
gt submit --publish --ai --stack --no-edit --no-interactive
```

### Obsolete Semantics Branch Cleanup

Do not delete `codex/agent-config-sync-parity-semantics` until the reconciled implementation has landed and its semantic content is verified.

Cleanup sequence:

```bash
git worktree list --porcelain | rg 'codex/agent-config-sync-parity-semantics'
gt sync --no-restack
gt delete codex/agent-config-sync-parity-semantics --force --no-interactive
```

If an open PR exists for the semantics branch, close it first with a superseded note. Do not use raw `git branch -D` or remote deletion as the primary cleanup path unless Graphite metadata is already gone and Graphite refuses to act.

## Failure Conditions

Stop implementation if any of these occur:

- The implementation branch is not based on `agent-codex-agent-sync-parity-closure` or this plan branch.
- A cherry-pick or rebase attempts to import the semantics branch wholesale.
- Runtime skill sync regresses from `.agents/skills` to `<codex-home>/skills`.
- Source workspace support is removed or bypassed.
- Codex package/runtime install behavior disappears.
- Material sync status and semantic support status are collapsed into one claim.
- Tests cannot prove semantic residuals are visible while material sync remains converged.
