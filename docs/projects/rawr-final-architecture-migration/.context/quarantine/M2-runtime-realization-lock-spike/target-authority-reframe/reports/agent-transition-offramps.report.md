# Transition and Off-Ramp Policy Report

## Verdict

The prior spike correctly identified the stable runtime shape, but its transition posture was too conservative around current repo topology and current public seams. Current repo reality is evidence of what must be replaced, not a default compatibility target. The policy should be:

- Target specs are architectural authority unless they leave a concrete design gap.
- Current runtime/host code may be mined for behavior and tests, but not preserved as a live fallback.
- Any bridge, wrapper, shim, compatibility alias, allow-findings gate, or transitional public API must have a named owner, latest removal slice, verification gate, and failure mode if it survives too long.
- No dual runtime authority is allowed. A bridge either dies in the slice that replaces it, or it becomes a bug.

Evidence: the prior integration doc recommends preserving `packages/runtime/*` and `@rawr/hq-sdk` for M2 by default (`forward-evaluation.md:12-15`, `:89-95`), while the M2 milestone already says the bridge must die first and temporary wrappers must not become authority (`M2-minimal-canonical-runtime-shell.md:121-155`). The target specs define the runtime chain, top-level resources, public SDK direction, and runtime-owned provisioning as the model to converge on, not optional future cleanup (`Alt-X-2:220-346`, `Alt-X-2:622-669`, `Alt-X-1:916-975`).

## Prior Recommendations To Reverse

1. **Reverse default preservation of current package names.** The prior spike says to keep `packages/runtime/*` and `@rawr/hq-sdk` for M2 unless topology is reopened (`forward-evaluation.md:156-164`). Under the target-authority frame, M2 should be realigned toward platform package zoning: `packages/core/runtime` and `packages/core/sdk`, with top-level `resources/`. If a current-name alias is used during implementation, it is a temporary migration bridge, not target topology.

2. **Reverse `startAppRole(...)` as the canonical M2 public seam.** The prior spike treats `startAppRole(...)` as the M2 seam/wrapper (`forward-evaluation.md:62-65`). Alt-X-2's target entrypoint is `startApp({ app, profile, roles })`, where roles are selected data, not separate operations (`Alt-X-2:2375-2415`). `startAppRole(...)` may exist only as a U00 migration helper and should expire by M2-U02 at the latest.

3. **Reverse soft layering around `RuntimeAccess` vs `ProcessView`/`RoleView`.** The prior spike allows `ProcessView`/`RoleView` as transitional or public adapter views if needed (`forward-evaluation.md:64-65`). The target should lock `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` for live runtime access, while reserving view/catalog nouns for diagnostics (`Alt-X-2:1022-1113`; terminology report: `agent-terminology-dx.report.md:25-32`, `:68-80`).

4. **Reverse vague deferral of runtime deep details.** The prior spike marks resource/profile catalog, full `RuntimeCatalog`, runtime-context deletion, observability storage, rich telemetry export, and diagnostics UI as contingent/non-blocking (`forward-evaluation.md:121-135`). They may be sequenced later inside M2, but each needs a named integration hook and latest lock slice. Caching and telemetry are not minor boundary questions; they are runtime subsystem components.

5. **Reverse treating U06 as the default cleanup bucket.** U06 is the final ratchet (`M2-U06:18-56`), not a license to leave active transition seams in place until the end. If `runtime-context`, host composition, or SDK-local service caching sits on the active runtime path after U00/U02, it must be removed earlier.

## Topology Policy

Do not introduce `runtime/resources` as a top-level root. Use:

```text
packages/
  core/
    sdk/
    runtime/
      compiler/
      bootgraph/
      substrate/
      harnesses/
      standard/
        resources/
        providers/

resources/
  <capability>/
    resource.ts
    providers/
    select.ts
    index.ts

apps/<app>/runtime/
  profiles/
  config.ts
  processes.ts
```

`resources/` is top-level because it is an authored provisionable capability catalog. Runtime owns provisioning, lifetimes, validation, and access, but it does not need to own the authored resource catalog root. Alt-X-2 explicitly says `resources/` contains descriptors, provider implementations, and selectors used by services/plugins/apps (`Alt-X-2:340-346`), and standard runtime/platform capabilities are surfaced through that same public catalog (`Alt-X-2:380-427`). Alt-X-1 gives the clean rule: generic host capability belongs in `resources/`; service-domain language or invariant-bearing policy belongs in `services/<service>/` (`Alt-X-1:2606-2611`).

Storage, cache, config, telemetry, keys, queues, filesystem, and similar concerns should be placed by what they are:

| Concern | Target placement | Policy |
| --- | --- | --- |
| SQL/storage/object store/filesystem/cache/queue/email/SMS/analytics/browser handles | `resources/<family>` plus providers/selectors | Generic provisioned capabilities. Runtime acquires and scopes them; services/plugins declare requirements; apps select providers. |
| Runtime-internal provider implementations for standard capabilities | `packages/core/runtime/standard/{resources,providers}` | RAWR-owned implementation stock. Public authoring still imports through `resources/<family>`. |
| Runtime config loading, validation, redaction | `packages/core/runtime/substrate/config` | Runtime-owned mechanics when config affects resource/provider/process/harness startup. |
| App profile/provider selection and config source policy | `apps/<app>/runtime/{config.ts,profiles/*}` | App boundary chooses profile and provider selections. |
| Secrets/keys | provider config source or `resources/secrets` if it is a generic key/secret capability | Do not create top-level `runtime/keys`. Runtime consumes redacted/validated secret sources; apps select source policy. |
| Boundary service cache | `packages/core/runtime/substrate/process-runtime` / `BoundaryCache` | Internal runtime cache for service binding identity, scope, config, dependency instances. Not SDK-local public state. |
| RuntimeCatalog persistence/export | `packages/core/runtime/topology` plus optional storage resource if persistence is external | Diagnostic/read model, not app composition authority. |
| oRPC/service telemetry | service boundary / oRPC middleware, wrapped by runtime telemetry context | Delegated where native; runtime adds provisioning/process spans around it. |

## Transition Ledger

| Bridge / shim / fallback | Why it exists | Allowed scope | Latest removal point | Verification / gate | Risk if kept longer |
| --- | --- | --- | --- | --- | --- |
| `apps/hq/legacy-cutover.ts` | Phase 1 executable bridge into pre-runtime server boot. | None after U00 begins replacing server boot. It can only be used as pre-cut evidence. | **M2-U00** | `verify-no-legacy-cutover`; app package export/import audit; no `@rawr/hq-app/legacy-cutover` imports. | Dual app/runtime authority; new runtime becomes facade. |
| `apps/server/src/host-composition.ts`, `host-seam.ts`, `host-realization.ts`, `host-satisfiers.ts` as live authority | Current host chain already acts like compiler + binding + process runtime (`agent-m2-repo-reality.report.md:49-57`). | May be mined for behavior/tests; must not remain on active `apps/hq/server.ts` runtime path. | Server authority removed in **M2-U00**; leftover test/archive references removed by **M2-U05/U06**. | Server runtime path verifier rejects host-composition imports from active boot path; proof-slice verifier proves compiled plan path. | Hidden second compiler, hidden service binding, hidden resource cache. |
| `packages/runtime/*` current topology | Existing M2 docs/gates assumed this path (`M2:60-85`). | Not target by default. Use only if the reframe explicitly chooses it as a migration alias. | Prefer direct target in **M2-U00 doc/gate update**; if alias used, remove by **M2-U02**. | Sync/project graph verifies `packages/core/runtime`; import audit rejects new canonical imports from old runtime path. | Large package/import rewrite after runtime work lands. |
| `@rawr/hq-sdk` public import surface | Current package name and verifier target. | Temporary alias/re-export while internal imports migrate to `@rawr/sdk` / `packages/core/sdk`. | **M2-U04** at latest, when public builder grammar is canonical. | Public import audit rejects active authoring imports from `@rawr/hq-sdk`; SDK package exports point to target package. | Public API drift and double SDK authority. |
| `startAppRole(...)` | M2 issue currently names it (`M2-U00:27-33`, `:74-87`). | Optional thin wrapper over `startApp({ roles: [...] })` during first server cut. | **M2-U02** before multi-lane compiler/process runtime becomes canonical. | Public seam verifier requires `startApp`; wrapper either absent or marked deprecated/internal. | Entrypoints encode role-specific operations instead of selected process shapes. |
| `ProcessView` / `RoleView` live-access names | Current SDK binding seam uses them (`packages/hq-sdk/src/plugins.ts:12-45`). | Transitional implementation names only. Public target is scoped `RuntimeAccess`; diagnostic "view" nouns belong to catalog/read models. | **M2-U02** | Type/export audit rejects public live-access `*View` exports; runtime access tests prove process/role access. | Confuses live access with diagnostics and preserves current repo vocabulary as authority. |
| Public `bindService(...)` for plugin authors | Current SDK exposes `bindService` and owns a local `Map` cache (`packages/hq-sdk/src/plugins.ts:84-114`). | Runtime/internal SDK binding operation only. Authors use `useService(...)` (`Alt-X-2:1718-1733`). | Author-facing removal by **M2-U04**; SDK-local cache removed by **M2-U00** if BoundaryCache lands there. | Canonical builder verifier rejects plugin imports of `bindService`; BoundaryCache verifier owns memoization. | Service binding semantics split between SDK and runtime substrate. |
| SDK-local service binding `Map` cache | Current memoization for bound service clients (`packages/hq-sdk/src/plugins.ts:93-114`). | None as canonical behavior. It may inform BoundaryCache tests. | **M2-U00** | BoundaryCache service exists in runtime substrate; import/static audit rejects SDK-local process cache. | Incorrect lifetime ownership and cache key drift. |
| `packages/runtime-context` | Type-only support seam, not executable runtime (`packages/runtime-context/src/index.ts:3-14`). | Only until the active runtime path has target context/access types. | **M2-U02** if touched by compiler/process runtime; absolute latest **M2-U06** dead-package check. | Import graph audit rejects `@rawr/runtime-context`; U06 dead-package check. | Alias sink and second context vocabulary. |
| Transitional plugin builders (`defineApiPlugin`, `defineWorkflowPlugin`) | Existing active plugin grammar precedes canonical role/surface builders. | May feed a normalized internal adapter only until public builders are replaced. | **M2-U04** | `verify-canonical-plugin-builders`; plugin typecheck/audit imports only canonical builders. | Compiler has to support old and new authoring shapes indefinitely. |
| `--allow-findings` Phase 2 helpers | Current-state diagnostics before the slice lands. | Diagnostics only; never active validation. | **M2-U00** for U00 gates; later helpers expire when each slice ratchets. | Guardrail says allow-findings helpers are not active proof (`m2-guardrails-and-enforcement.md:97-113`). | Red state appears green and hides unremoved transition debt. |
| Known baseline lint/boundary failures | Practical comparison during cutover. | Ledgered baseline only, not a free pass. | Each touched boundary closes in its owning slice; all gone by **M2-U06**. | Boundary gate compares against baseline and rejects new or still-owned regressions. | New dual paths hide under "known failures." |
| Deferred resource/provider/profile catalog | Broad target surface not all needed for first server boot. | U00 may implement internal target-shaped resources consumed immediately; public catalog/helper policy locks in **M2-U02**. | Design lock by **M2-U02**, author-facing cleanup by **M2-U04**, proof by **M2-U05**. | Resource lowering tests; profile/provider selection audit; proof slices select real providers. | Runtime substrate lands without a coherent resource story. |
| Runtime telemetry/caching/diagnostics storage | Deep runtime system components not fully implemented by first cut. | Minimal hooks in U00; component design lock in U02; proof in U05. | Latest design lock **M2-U02**; plateau verification **M2-U06**. | RuntimeCatalog/telemetry/caching verification; redaction and diagnostic contributor tests. | Invisible operational gaps become architectural drift. |

## Policy Additions For The Reframe

- Add a **Transition Debt Ledger** section to the synthesized runtime spec and M2 milestone. Every temporary name/path/API must appear there before implementation can use it.
- Add a **No Dual Authority Gate** per slice. U00 should reject live imports from `legacy-cutover` and host-composition on the server path. U02 should reject host compiler/process-runtime fallbacks. U04 should reject transitional public builders. U06 should reject all remaining transition seams.
- Add a **Target Topology Lock** before code implementation. The target package shape should be `packages/core/runtime` and `packages/core/sdk`, with top-level `resources/`; current `packages/runtime/*`/`@rawr/hq-sdk` names are transition aliases only if explicitly carried.
- Add a **Runtime Deep Components Ledger** for caching, telemetry, config/secrets, provider selection, resource lifecycle, RuntimeCatalog, diagnostics export, and error boundaries. Each entry needs owner, integration hook, first implementation slice, and latest proof slice.
- Require every shim to include an in-code/doc `expires_at_m2_slice` equivalent in its issue text or verifier. If the verifier cannot detect expiration, the shim is not approved.

## Bottom Line

The clean migration path is not "keep the current repo shape until the runtime is real." It is "make the target shape real slice by slice, with temporary bridges permitted only when they are named, tested, and already scheduled for deletion." The runtime system can still be sequenced by M2-U00 through M2-U06, but the target-authority reframe should update the M2 docs before implementation so agents build toward `packages/core/runtime`, `packages/core/sdk`, top-level `resources/`, canonical `startApp(...)`, `RuntimeAccess`, `RuntimeCatalog`, `useService(...)` authoring, runtime-owned `bindService`/`BoundaryCache`, and no hidden host/runtime fallback.

Skills used: team-design, spike-methodology, graphite, git-worktrees, narsil-mcp.
