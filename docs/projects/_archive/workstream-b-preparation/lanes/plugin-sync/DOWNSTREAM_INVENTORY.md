# Plugin Sync Downstream Inventory

Status: scan-backed inventory for future downstream sunset.
Downstream repo: `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq`
Downstream branch observed: `main` tracking `origin/main`, clean when scanned.

This inventory treats downstream `RAWR HQ` as read-only evidence and content/source input. It does not authorize downstream deletion. Final removal belongs to the downstream sunset lane after upstream parity proof and DRA approval.

## Scan Basis

Active scan commands:

```bash
rg -l "@rawr/agent-sync|@rawr/plugin-agent-sync|rawr plugins sync|rawr plugins status|plugins sync|plugins status|source-workspace|rawr undo|runUndoForWorkspace|beginPluginsSyncUndoCapture|agent-sync" \
  apps packages plugins docs AGENTS.md \
  --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/.turbo/**' \
  --glob '!docs/_archive/**' \
  --glob '!plugins/agents/hyperresearch/skills/hyperresearch-codex/references/evidence/**'

rg -n "@rawr/agent-sync|@rawr/plugin-agent-sync" package.json apps packages plugins \
  --glob '!**/dist/**' --glob '!**/node_modules/**' --glob '!**/.turbo/**'
```

`docs/_archive/**`, generated `dist/**`, package-manager caches, and Hyperresearch evidence blobs are excluded from active sunset classification. They remain provenance unless a later lane intentionally audits archives.

## Remove Later As Duplicate Authority

Remove or replace these only after the upstream template lane is merged into downstream and the downstream sunset lane has confirmed parity.

| Downstream path | Disposition | Reason / prerequisite |
| --- | --- | --- |
| `packages/agent-sync/package.json` | remove later | Downstream duplicate package identity for `@rawr/agent-sync`; upstream authority is `services/agent-config-sync` plus `packages/agent-config-sync-node`. |
| `packages/agent-sync/src/index.ts` | remove later | Exports downstream duplicate sync and undo APIs. |
| `packages/agent-sync/src/lib/claude-cli.ts` | compare then remove | Claude marketplace/register/install behavior; compare against upstream node package before removal. |
| `packages/agent-sync/src/lib/cowork-package.ts` | compare then remove | Cowork ZIP behavior; upstream package owns packaging after parity. |
| `packages/agent-sync/src/lib/effective-content.ts` | compare then remove | Provider-specific content shaping; compare against upstream content model. |
| `packages/agent-sync/src/lib/fs-utils.ts` | remove later | Support utility internal to duplicate package. |
| `packages/agent-sync/src/lib/layered-config.ts` | compare then remove | Config layering and target-home behavior should be matched upstream before removal. |
| `packages/agent-sync/src/lib/marketplace-claude.ts` | compare then remove | Claude marketplace manifest behavior. |
| `packages/agent-sync/src/lib/plugin-content.ts` | compare then remove | Source content scanning/shaping evidence. |
| `packages/agent-sync/src/lib/plugin-yaml.ts` | compare then remove | Legacy plugin metadata parsing; reject or port if still relevant. |
| `packages/agent-sync/src/lib/registry-codex.ts` | compare then remove | Codex registry semantics and managed claims. |
| `packages/agent-sync/src/lib/resolve-source-plugin.ts` | compare then remove | Single-plugin reference resolution evidence. |
| `packages/agent-sync/src/lib/retire-stale-managed.ts` | compare then remove | Stale managed plugin retirement behavior. |
| `packages/agent-sync/src/lib/scan-canonical-content.ts` | compare then remove | Canonical content scan behavior. |
| `packages/agent-sync/src/lib/scan-source-plugin.ts` | compare then remove | Source plugin discovery and `@rawr/plugin-agent-sync` skip behavior. |
| `packages/agent-sync/src/lib/scan-tools-composed.ts` | compare then remove | Composed tools behavior; preserve only if upstream still needs it. |
| `packages/agent-sync/src/lib/source-scope.ts` | compare then remove | Scope filtering behavior. |
| `packages/agent-sync/src/lib/sync-all.ts` | remove later | Duplicate full-sync orchestration. |
| `packages/agent-sync/src/lib/sync-cli.ts` | remove later | Duplicate CLI helper surface. |
| `packages/agent-sync/src/lib/sync-engine.ts` | compare then remove | Provider write engine and conflict semantics. |
| `packages/agent-sync/src/lib/sync-undo.ts` | compare then remove | Old sync undo capsule behavior; upstream root undo lane owns replacement. |
| `packages/agent-sync/src/lib/targets.ts` | compare then remove | Target-home/environment precedence evidence. |
| `packages/agent-sync/src/lib/types.ts` | remove later | Internal duplicate package DTOs. |
| `packages/agent-sync/src/lib/workspace.ts` | compare then remove | Workspace-root/source-path semantics. |
| `apps/cli/package.json` | edit downstream sunset | Remove dependency on `@rawr/agent-sync` after root undo and plugin sync imports are replaced by upstream template code. |
| `apps/cli/src/commands/undo.ts` | replace downstream sunset | Imports `runUndoForWorkspace` from `@rawr/agent-sync`; should be replaced by upstream root undo implementation after integration. |
| `plugins/cli/plugins/package.json` | edit downstream sunset | Remove dependency on `@rawr/agent-sync` after sync/status/converge command implementations are replaced. |
| `plugins/cli/plugins/src/commands/plugins/sync.ts` | replace downstream sunset | Duplicate single-plugin sync command importing `@rawr/agent-sync`. |
| `plugins/cli/plugins/src/commands/plugins/sync/all.ts` | replace downstream sunset | Duplicate full-sync command importing `@rawr/agent-sync`. |
| `plugins/cli/plugins/src/commands/plugins/sync/drift.ts` | replace downstream sunset | Duplicate drift command importing `@rawr/agent-sync`. |
| `plugins/cli/plugins/src/commands/plugins/status.ts` | replace downstream sunset | Duplicate status command importing downstream sync substrate and install-state helpers. |
| `plugins/cli/plugins/src/commands/plugins/converge.ts` | compare then replace | Converge runs sync/status paths; preserve behavior only if upstream converge intentionally carries it. |
| `plugins/cli/plugins/src/lib/install-state.ts` | compare then replace | Local legacy-overlap logic for `@rawr/plugin-agent-sync`; upstream equivalent must own final behavior. |
| `packages/hq/package.json` | edit downstream sunset | Remove dependency on `@rawr/agent-sync` after HQ install/status authority moves to upstream service package. |
| `packages/hq/src/install/state.ts` | compare then replace | Duplicate `@rawr/plugin-agent-sync` legacy-overlap detection. |
| `packages/dev/src/repo-sync/upstream.ts` | update downstream sunset | Automation invokes `plugins status` and `plugins sync all`; preserve only if command semantics remain the same after upstream integration. |

## Port Or Compare Tests Before Removal

These tests are evidence. Do not delete their scenarios until each is covered upstream, explicitly rejected as stale, or deferred with owner/trigger.

| Downstream test | Disposition | Scenario to preserve or compare |
| --- | --- | --- |
| `packages/agent-sync/test/claude-cli.test.ts` | compare/port | Claude CLI marketplace/register/install idempotence. |
| `packages/agent-sync/test/cowork-package.test.ts` | compare/port | Cowork package structure. |
| `packages/agent-sync/test/plugin-kinds.test.ts` | compare/port | `rawr.kind` enforcement. |
| `packages/agent-sync/test/resolve-source-plugin.test.ts` | compare/port | Single-plugin source resolution. |
| `packages/agent-sync/test/retire-stale-managed.test.ts` | compare/port | Stale managed plugin retirement and source-area scoping. |
| `packages/agent-sync/test/scan-source-plugin.test.ts` | compare/port | Source plugin discovery behavior. |
| `packages/agent-sync/test/source-scope.test.ts` | compare/port | Scope filtering. |
| `packages/agent-sync/test/sync-all-plan.test.ts` | compare/port | Full-sync planning and partial-mode behavior. |
| `packages/agent-sync/test/sync-claude.test.ts` | compare/port | Claude projection, manifests, GC, unmanaged-neighbor preservation. |
| `packages/agent-sync/test/sync-codex.test.ts` | compare/port | Codex projection, conflicts, GC, unmanaged-neighbor preservation. |
| `packages/agent-sync/test/sync-undo.test.ts` | compare/port | Old undo capsule behavior and expiration semantics. |
| `packages/agent-sync/test/targets.test.ts` | compare/port | Environment/config/flag precedence including provider homes. |
| `packages/agent-sync/test/tools-composition.test.ts` | compare/port | Toolkit composition from agent-pack material. |
| `apps/cli/test/plugins-command-surface-cutover.test.ts` | compare/port | CLI command surface, dry-run variants, sync source management. |
| `apps/cli/test/plugins-status.test.ts` | compare/port | Status command behavior. |
| `apps/cli/test/plugins-sync-drift.test.ts` | compare/port | Drift command behavior. |
| `apps/cli/test/reference-audit.test.ts` | compare/port | Reference audit around legacy plugin path removal. |
| `plugins/cli/plugins/test/install-state.test.ts` | compare/port | Legacy overlap, stale links, install-state behavior. |
| `plugins/cli/plugins/test/lifecycle-check.test.ts` | preserve if still shared | Lifecycle policy behavior, not sync substrate itself. |
| `plugins/cli/plugins/test/lifecycle-override.test.ts` | preserve if still shared | Lifecycle override behavior. |
| `plugins/cli/plugins/test/policy-decision.test.ts` | preserve if still shared | Lifecycle policy decision evidence. |
| `plugins/cli/plugins/test/fix-slice.test.ts` | preserve if still shared | Fix-slice operator behavior. |
| `plugins/cli/plugins/test/plugin-plugins.test.ts` | compare/port | Plugin plugin command/helper invariants. |
| `packages/hq/test/install-state.test.ts` | compare/port | HQ-side install-state legacy overlap behavior. |

## Preserve As Downstream Content / Source Input

These files are active downstream content or operator guidance. They are not deletion targets in this upstream lane. Some may need wording updates during downstream sunset so they point at upstream-owned substrate instead of `@rawr/agent-sync`.

| Downstream path/pattern | Disposition | Notes |
| --- | --- | --- |
| `plugins/agents/hq/skills/agent-plugin-management/**` | preserve, update wording later | Agent-facing plugin management skill. Keep content, but update authority language after upstream integration. |
| `plugins/agents/hq/workflows/create-content.md` | preserve, update wording later | Operational workflow uses sync commands. |
| `plugins/agents/hq/workflows/create-plugin.md` | preserve, update wording later | Operational workflow uses sync commands. |
| `plugins/agents/hq/workflows/create-skill.md` | preserve, update wording later | Operational workflow uses sync commands. |
| `plugins/agents/hq/workflows/lifecycle-*.md` | preserve, update wording later | Lifecycle workflows teach sync/drift gates. |
| `plugins/agents/hq/workflows/manage.md` | preserve, update wording later | Agent plugin management workflow. |
| `plugins/agents/hq/workflows/manage-content.md` | preserve, update wording later | Content authoring workflow with sync guidance. |
| `plugins/agents/hq/agents/content-reviewer.md` | preserve, update wording later | Review guidance references sync. |
| `plugins/agents/dev/skills/claude-code-platform/**` | preserve, update wording later | Interop docs mention `rawr plugins sync ...`. |
| `plugins/agents/dev/skills/resource-skill-builder/SKILL.md` | preserve, update wording later | Uses sync guidance for resource skill propagation. |
| `plugins/agents/dev/skills/openai-sdk/references/rawr-hq-integration-notes.md` | preserve, update wording later | Integration note only. |
| `plugins/agents/cognition/skills/information-design/todo.md` | preserve or prune TODO later | Local TODO mentions agent-sync propagation. |
| `plugins/agents/cognition/skills/ontology-design/todo.md` | preserve or prune TODO later | Local TODO mentions `rawr plugins sync all`. |
| `plugins/agents/cognition/skills/perspective/references/examples.md` | preserve | Conceptual example. |
| `plugins/agents/design/tmp/README.md` | preserve or prune temp later | States tmp is ignored by sync. |
| `plugins/agents/hyperresearch/**` scan hits | preserve as content; update caveats if needed | Hyperresearch material depends on downstream content being a sync source. Hook/MCP projection caveats remain evidence, not proof. |
| `plugins/agents/meta/AGENTS.md` | preserve, update wording later | Meta plugin instructions use sync commands. |
| `plugins/agents/meta/legacy/scripts/sync_utils.py` | legacy/provenance | Legacy script under `legacy`; do not promote as authority. |

## Stale-Doc Cleanup Targets

These should be rewritten or removed in the downstream sunset phase because they present the downstream/local sync substrate as the operator authority or include split-root/mutating examples.

| Downstream path | Disposition | Notes |
| --- | --- | --- |
| `plugins/cli/plugins/README.md` | stale-doc cleanup | Describes downstream sync defaults, undo, Cowork, partial mode. Update to upstream authority after integration. |
| `plugins/cli/plugins/AGENTS.md` | stale-doc cleanup | Verification commands and build filters include `@rawr/agent-sync`. |
| `plugins/cli/plugins/agent-pack/skills/agent-sync/AGENTS.md` | stale-doc cleanup | Contains `--source-workspace` commands including mutating examples; use only as evidence. |
| `plugins/cli/plugins/agent-pack/skills/agent-sync/SKILL.md` | stale-doc cleanup or replace | Legacy operator skill for downstream sync. Replace with upstream-owned wording after parity. |
| `plugins/cli/plugins/agent-pack/skills/agent-sync/references/layout-and-mapping.md` | stale-doc cleanup or archive | Old direct projection mapping evidence. |
| `docs/process/PLUGIN_AUTONOMY_READINESS_SCORECARD.md` | stale-doc cleanup | Mentions legacy overlap and sync/status gates. |
| `docs/process/PLUGIN_E2E_WORKFLOW.md` | stale-doc cleanup | Contains sync/convergence instructions. |
| `docs/process/runbooks/SOURCE_PLUGIN_PATH_MATRIX.md` | stale-doc cleanup | Source path and undo examples need upstream-authority wording. |
| `docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md` | update after integration | Status/sync commands remain useful, but authority should point upstream. |
| `docs/process/runbooks/LIFECYCLE_AGENT_PLUGIN.md` | update after integration | Sync/drift gates. |
| `docs/process/runbooks/LIFECYCLE_CLI_PLUGIN.md` | update after integration | Sync/drift gates. |
| `docs/process/runbooks/LIFECYCLE_COMPOSED_CHANGES.md` | update after integration | Sync/drift gates. |
| `docs/process/runbooks/LIFECYCLE_SKILL.md` | update after integration | Sync/drift gates. |
| `docs/process/runbooks/LIFECYCLE_WEB_PLUGIN.md` | update after integration | Sync/drift gates. |
| `docs/process/runbooks/LIFECYCLE_WORKFLOW.md` | update after integration | Sync/drift gates. |
| `docs/system/PLUGINS.md` | update after integration | Canonical plugin topology docs mention sync. |
| `docs/projects/plugin-lifecycle-quality/**` scan hits | stale/project provenance | Project scratch/plans explain old transition; keep as provenance or archive cleanup. |
| `docs/projects/plugin-lifecycle-promotion/**` scan hits | stale/project provenance | Project scratch/plans; do not treat as runtime authority. |
| `docs/spikes/claude-cowork-plugin-update-flow-2026-02-26.md` | stale/spike provenance | Cowork sync spike, not current authority. |

## Explicit Residual Risks

- Mixed oclif/dependency drift remains downstream-sunset risk. This lane can claim sync substrate parity only, not full CLI/install parity.
- Downstream hook/MCP projection claims in Hyperresearch docs remain explicitly unclaimed unless upstream adds install/update/dry-run/drift/removal proof for hook material.
- Mutating downstream `--source-workspace` examples in old skill docs are operator intent evidence only. This lane validates non-mutating smoke against downstream content.
- `packages/dev/src/repo-sync/upstream.ts` may continue to be useful as downstream automation, but it must be checked after upstream integration because command semantics and authority will change.
