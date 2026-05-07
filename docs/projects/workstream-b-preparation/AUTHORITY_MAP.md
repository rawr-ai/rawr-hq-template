# Workstream B Authority Map

This map decides how future Workstream B lane sessions should rank inputs. It
exists to stop fresh agents from treating stale split-model or coordination
canvas docs as current architecture.

## Authority Order

1. Current user decisions in the Workstream B preparation request.
2. Current upstream `RAWR HQ-Template` code on `main`.
3. Current downstream `RAWR HQ` code on `main` after Workstream A.
4. Accepted findings in `REVIEW_LEDGER.md`, only where grounded in current
   files.
5. Prior session findings only when revalidated against current files.
6. Old docs only as stale/evidence inputs unless explicitly accepted again.

## Repo Roles

`RAWR HQ-Template` is the future architecture and implementation authority for
shared CLI/tooling behavior.

`RAWR HQ` is downstream personal/content/customization material. It can be mined
for behavior, plugin content, and proven local workflows, but it is not a
continuing architecture authority for shared tooling after migration.

Workstream A landed downstream in commit `408f9d69` and removed abandoned
downstream surfaces. Workstream B starts from that downstream baseline and
prepares upstream migration/reconciliation before downstream duplicates are
sunset.

## Input Typing

| Input | Type | Use |
| --- | --- | --- |
| User's Workstream B plan | Authority | Locked frame, lanes, non-goals, target repo, and artifact contract. |
| `RAWR HQ-Template` current code | Authority/evidence | Target architecture owner and implementation destination. |
| `RAWR HQ` current code after Workstream A | Evidence | Behavior to import, parity expectations, and duplicate downstream authority to sunset later. |
| `RAWR HQ-Template` active docs | Evidence or stale input | Trust only when consistent with current code and locked decisions. |
| `REVIEW_LEDGER.md` | Review evidence | Use accepted findings as repair requirements and future handoff context. |
| `LESSONS.md` | Preservation control | Capture hard-won lessons before future lanes delete or sunset material. |
| DevOps split-model docs | Stale input | Record as docs-to-change; do not debate the locked DevOps migration. |
| Coordination canvas docs | Stale input | Record as docs-to-change; coordination canvas has been removed. |
| Inngest runtime files and tests | Evidence/control | Preserve. Do not remove as fallout from coordination cleanup. |
| Quarantined/archived docs | Provenance only | Mine only when a lane explicitly needs history. |
| Prior session snippets | Coordination input | Useful for orientation, never sufficient proof without current repo checks. |

## Locked Target Decisions

- Upstream becomes sole authority for reusable CLI/tooling behavior.
- Downstream becomes content/source input during migration and then loses
  duplicate implementation authority.
- DevOps moves upstream. Docs saying it remains personal-owned are stale for
  this target.
- Session tooling should use upstream service/projection shape:
  `services/session-intelligence` plus `plugins/cli/session-tools`.
- Root `rawr undo` should bind to `services/agent-config-sync`, not revive
  downstream `@rawr/agent-sync`.
- Plugin sync/tooling substrate remains upstream-canonical through
  `services/agent-config-sync`, `packages/agent-config-sync-node`, and
  `plugins/cli/plugins`.
- Coordination canvas docs and claims should be removed or rewritten.
- `plugins/web/mfe-demo` can be removed upstream, while `plugins/web/.gitkeep`
  must remain.
- Inngest is future platform architecture and must be preserved.
- Deletion/sunset work must preserve important operational and design lessons
  in `LESSONS.md` or a lane-local lesson artifact before removal.

## Lane Authority Notes

### Workstream Setup

Current user decisions and workstream-runner conventions own the artifact
shape. Repo state commands provide evidence, not broader architecture claims.

### Session Tools

Upstream service/projection shape owns the target architecture. Downstream
`packages/session-tools` and downstream CLI flags are behavior evidence. Upstream
README claims about structured facets are not enough because current upstream
code does not implement the advertised flags.

### Undo

`services/agent-config-sync` owns undo semantics. Downstream
`@rawr/agent-sync` proves user-facing command behavior and lifecycle semantics
but should not be promoted as the target package.

### DevOps

The user decision owns the target authority. Existing upstream docs that route
`packages/dev/**` and `plugins/cli/devops/**` to personal ownership are stale
for this lane and should become docs cleanup targets when implementation lands.

### Plugin Sync / Tooling Substrate

Upstream `agent-config-sync` owns service semantics. Downstream `packages/agent-sync`
is duplicate legacy authority to reconcile and remove after parity is proven.
`source-workspace` is a content-routing input, not a claim that upstream already
owns all plugin content.

### Upstream Fallout

User decision owns the cleanup split: remove MFE demo and stale coordination
docs/claims; preserve Inngest and generic future runtime hooks.

## Non-Goals Across All Lanes

- Do not run global plugin sync.
- Do not run link repair.
- Do not redesign future coordination/workflow systems.
- Do not preserve MapGen/Civ 7 material.
- Do not implement code changes inside this preparation workstream.
- Do not treat old docs as a reason to reopen locked authority decisions.
