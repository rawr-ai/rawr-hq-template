# Target-Authority Evaluator Report

## Verdict

The first spike's synthesis recommendation is correct, but its topology and compatibility posture were too conservative. Alt-X-1 and Alt-X-2 should be treated as target architecture inputs that intentionally supersede current repo reality. The current repo is useful because it reveals the migration substrate and the existing semantic seams, not because its package names or verifiers should constrain the target architecture.

The target direction should be:

- RAWR platform code under `packages/core/*`, specifically `packages/core/sdk` and `packages/core/runtime`.
- Public SDK package/imports as `@rawr/sdk`, sourced from `packages/core/sdk`.
- Runtime realization implementation under `packages/core/runtime`, not top-level `core/`, not top-level `runtime/`, and not target `packages/runtime/*`.
- Developer/app-authored provisionable capability families under top-level `resources/`.
- App-specific runtime selection under `apps/<app>/runtime/*`.

That is not a compromise between the specs and repo reality. It preserves the specs' ownership geometry while correcting their physical placement for this repo: packages remain packages; platform packages are visibly segmented from developer-authored roots.

## Prior Conclusions

| Prior conclusion | Classification | Target-authority correction |
| --- | --- | --- |
| Synthesize rather than adopt Alt-X-1 or Alt-X-2 verbatim. | keep | Correct. Use Alt-X-2 as the law/DX spine and Alt-X-1 for lifecycle/catalog/flexibility language. |
| M2 remains the right macro domino order. | revise | The order survives, but U00 must first be realigned to target topology/imports. Do not implement current M2 names just because they are already in gates. |
| Keep `packages/runtime/*` and `@rawr/hq-sdk` for M2. | reverse | These are transient repo facts. Replace the M2 target with `packages/core/runtime`, `packages/core/sdk`, and `@rawr/sdk` before production runtime implementation. |
| Treat `@rawr/sdk` as future packaging work. | reverse | `@rawr/sdk` is target public authority. There are no external consumers requiring a long compatibility bridge. |
| Use `startAppRole(...)` as M2 public seam. | replace | Target canonical API is `startApp({ app, profile, roles })`. `startAppRole(...)` may exist only as a temporary wrapper with a same-milestone off-ramp. |
| Use `RuntimeAccess`, but possibly keep `ProcessView`/`RoleView` as adapter views. | replace | Use `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` as canonical live-access names. Reserve "view" for diagnostics/topology only. |
| Prefer `useService(...)` for authors and `bindService(...)` under the hood. | keep | This is a real layer distinction, not split-the-difference naming. |
| Treat full resource/provider/profile catalog as contingent. | revise | The full model must be spec-locked now; implementation can be sliced. Do not leave caching, telemetry, config, provider selection, or resource lifetimes as unnamed "later" concerns. |
| Defer `serviceDep(...)` as non-blocking for U00. | revise | It need not be in the first executable server cut, but the target semantic model should be locked before compiler/process-runtime generalization or any cross-service proof. |
| Move cache behavior under runtime/process substrate. | keep and expand | `BoundaryCache` is one cache kind. The target also needs a resource-family story for app-selected cache providers and a distinction from Effect's internal Cache primitive. |

## Target Locks

### 1. Physical Topology

Alt-X-1 and Alt-X-2 both correctly separate RAWR system machinery from authored services/plugins/apps/resources, but both put platform machinery under top-level `core/` (`Alt-X-1:361-478`; `Alt-X-2:218-346`). The current intermediate spec chooses top-level `runtime/` and explicitly labels it load-bearing (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:240-329`, `:3799-3831`). The prior spike chose current M2's `packages/runtime/*` and `@rawr/hq-sdk` (`forward-evaluation.md:75-95`).

Target correction:

```text
packages/
  core/
    sdk/       # publishes @rawr/sdk
    runtime/   # runtime compiler, bootgraph, substrate, process runtime, harnesses, topology, standard resources/providers
  db-support/
  shared-types/
  test-fixtures/
  ...other non-platform support packages...

resources/
  <capability>/
    resource.ts
    providers/
    select.ts
    index.ts

services/
plugins/
apps/
```

`packages/runtime/*` should not be implemented as target code if the next step is still ahead of us. If some current gate or transition wrapper requires the old path briefly, the wrapper must expire during M2-U00 or the next gate-alignment commit. `runtime/` should not become a top-level root because it would mix platform implementation, authored resources/providers, and app profile concepts in one place. Top-level `core/` should not become a root because this repo keeps packages in `packages/`.

### 2. `resources/` Versus `runtime/resources/`

Use top-level `resources/` for provisionable capability families. Do not use top-level `runtime/resources/` as the target authoring root.

The reason is ownership, not aesthetics. Alt-X-1 defines resources as provisioned host capabilities including telemetry, config, database pools, filesystem, queues, caches, provider clients, and machine capabilities (`Alt-X-1:266-272`, `:660-684`). Alt-X-2 says `resources/` is the authored provisionable capability catalog and apps select providers through selectors (`Alt-X-2:336-346`, `:353-378`). That category is developer/app-authored, while runtime realization internals are platform-owned.

Storage, config, keys, policies, caching, and telemetry should be classified this way:

| Concern | Target home | Reason |
| --- | --- | --- |
| SQL/object/blob/KV/cache/queue/email/filesystem/provider clients | `resources/<capability>` | These are provisionable capabilities selected by app profiles and acquired by runtime providers. |
| Standard platform implementations | `packages/core/runtime/standard/*`, surfaced through `resources/<capability>` selectors when public | RAWR can ship defaults without making platform internals an authoring root. Alt-X-2 already shows standard resources internally and public selectors externally (`Alt-X-2:380-402`, `:777-815`). |
| App provider selection and config source policy | `apps/<app>/runtime/profiles/*` and `apps/<app>/runtime/config.ts` | Profiles select providers; they do not acquire resources (`Alt-X-1:859-914`; `Alt-X-2:951-1018`). |
| Runtime config loading/redaction mechanics | `packages/core/runtime/substrate/effect` or a runtime-internal config module | Runtime kernel owns loading/redaction before provider acquisition (`Alt-X-1:2466-2481`; `Alt-X-2:2530-2560`). |
| Secrets/keys/KMS handles | `resources/secrets`, `resources/keys`, or provider-specific families when app-selected; runtime-internal only for kernel mechanics | Secrets are capabilities when selected; redaction/loading mechanics are runtime internals. |
| Service policies/invariants | owning `services/<service>` | Alt-X-2 is explicit that repositories, schemas, migrations, policies, and invariant-preserving writes stay inside services (`Alt-X-2:194-202`). |
| Runtime access/provider policy | `apps/<app>/runtime/*` for selection, `packages/core/runtime/*` for enforcement | No evidence yet supports a top-level `runtime/policies` authoring root. |
| Runtime catalog storage backend | a runtime-internal module plus optional `resources/runtime-catalog-storage` only if app-selectable | Storage backend is flexible; exact backend is not load-bearing in the intermediate spec (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:3780-3797`). |

So the recommendation is not "`resources/` alone forever" in a vague sense. It is: top-level authored provisionable capabilities live in `resources/`; runtime-internal implementations live in `packages/core/runtime`; app/environment selection lives in `apps/<app>/runtime`. Add new top-level roots only when a new authored category exists that is neither semantic service, projection plugin, provisionable resource, app selection, nor platform runtime internals.

### 3. Public SDK and Entrypoint API

The target public SDK is `@rawr/sdk`, not `@rawr/hq-sdk`. Alt-X-1 names `@rawr/sdk` and its public surfaces directly (`Alt-X-1:581-610`). Alt-X-2 examples consistently import authoring helpers from `@rawr/sdk` and resources from `@rawr/resources/*` (`Alt-X-2:353-378`, `:2287-2415`). `@rawr/hq-sdk` is a transitional package name in current code and M2 docs, not target architecture.

The target entrypoint API is:

```ts
await startApp({
  app,
  profile: "production",
  roles: ["server"],
});
```

Alt-X-2 frames entrypoints as process-shape selection from app composition, not distinct role-specific operations (`Alt-X-2:2375-2415`). `startAppRole(...)` makes role selection sound like a separate operation. If retained for migration, it should be a wrapper over `startApp(...)` and removed or demoted before M2 closes.

### 4. Runtime Access, Catalog, and Service Binding

Use `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` for live access. Alt-X-2 explicitly reserves "view" for diagnostics/topology and names live access `RuntimeAccess` (`Alt-X-2:178-184`, `:1022-1113`). Alt-X-1 separates `RuntimeAccess` from `RuntimeCatalog` (`Alt-X-1:298-304`, `:2358-2398`, `:2483-2495`). The current code's `ProcessView`/`RoleView` and SDK-local service cache are transition scaffolding (`packages/hq-sdk/src/plugins.ts:12-31`, `:84-114`).

Keep `RuntimeCatalog` as the diagnostic/read-model noun. "Topology catalog" describes its contents, not a second public authority.

Use `useService(...)` for author declarations and `bindService(...)` for runtime binding. This is not compromise naming. It matches the layer distinction:

- Authors declare dependency/use intent.
- SDK/compiler derives service binding plans.
- Process runtime executes binding and owns cache behavior.

Alt-X-2's `serviceDep(...)` should be locked as the target way to express semantic service dependencies; those dependencies are not runtime resources and are not selected through runtime profiles (`Alt-X-2:1360-1393`). The first server cut can implement only what it consumes, but the spec must not leave semantic dependency handling as an unnamed future choice.

## Synthesis Corrections

Use Alt-X-2 as the target-authority spine:

- Ownership, direction, topology, native interior, runtime access, shared infrastructure, one process runtime, and durable async laws (`Alt-X-2:131-214`).
- Three authoring levels and operational naming discipline (`agent-terminology-dx.report.md:20-38`).
- App composition and entrypoint model with `defineApp(...)` and `startApp(...)` (`Alt-X-2:2287-2415`).
- Runtime compiler, bootgraph, Effect kernel, process runtime, harness, topology catalog, and diagnostics split (`Alt-X-2:2448-2658`).

Carry forward from Alt-X-1:

- The concise thesis and system boundary (`Alt-X-1:131-182`, `:266-304`).
- `RuntimeCatalog` as the named diagnostic artifact.
- The stable-flexibility language (`Alt-X-1:2914-2937`).
- Profile field precision: if the array contains provider selections, the field is `providers` or `providerSelections`, not `resources` (`Alt-X-1:859-914`; `agent-terminology-dx.report.md:37-38`).

Correct or reject:

- Reject top-level `core/`; replace with `packages/core/*`.
- Reject top-level `runtime/` as the canonical root; preserve runtime realization ownership under `packages/core/runtime`.
- Reject target `packages/runtime/*`; treat it as obsolete M2 wording/gate text unless temporarily wrapped with explicit expiration.
- Reject `@rawr/hq-sdk` as target public import; replace with `@rawr/sdk`.
- Reject live-access "runtime view" terminology and `view` callbacks on resources; use `RuntimeAccess` and diagnostic contributors instead.
- Reject service-family directories as semantic owners. Alt-X-2's flat service law should supersede the current intermediate spec's `services/<family>/<service>` allowance (`Alt-X-2:186-192`; `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:268-271`).

## Runtime-Deep Details That Must Not Disappear

These are not "minor discrepancies." They need either target design now or explicit milestone hooks:

| Component | Target posture | Latest acceptable lock |
| --- | --- | --- |
| Boundary/service binding cache | Runtime-owned process/role/surface/capability/service/scope/config cache in process runtime. SDK-local `Map` dies. | M2-U00 for first server binding. |
| App-selected cache capability | `resources/cache` or narrower resource families, provider-selected by app profile. Distinct from internal Effect Cache. | Before any service/plugin uses a cache dependency. |
| Telemetry | Runtime substrate owns instrumentation roots; oRPC/Inngest keep native telemetry inside harnesses; app-selected exporters may be `resources/telemetry`. | M2-U00 minimal runtime telemetry, richer exporter model by M2-U03/U05. |
| Config/secrets | Profiles select config sources; runtime kernel loads, validates, and redacts; services receive service config lanes. | M2-U00 for runtime config needed by server resources. |
| Keys/secrets providers | Resource family if app-selected, runtime-internal if only used for substrate redaction. | Before first external secret/KMS-backed provider. |
| Error taxonomy | Runtime compiler, bootgraph, provisioning, binding, projection, harness errors are distinct. | M2-U01, when rollback/shutdown hardening lands. |
| Provider selection | App/runtime profile authority. Services/plugins declare requirements only. | M2-U00 minimal; full profile model before M2-U02 generalization. |
| RuntimeCatalog | Diagnostic topology/read model, not composition authority. Minimal emitted shape is enough early; schema must be named. | Minimal in U00/U01 if used for proof output; fuller by M2-U05/U06. |

## Migration Implications

Before production runtime implementation, update M2/U00 docs and gates so agents do not lay new code into known-wrong target paths. The first runtime cut should create or move toward:

- `packages/core/sdk` publishing `@rawr/sdk`.
- `packages/core/runtime` containing compiler, bootgraph, substrate/effect, process runtime, harnesses, topology/catalog, and standard runtime resources/providers.
- Top-level `resources/` only for resource families consumed by the current slice or explicitly locked for the runtime resource catalog.
- `apps/hq/server.ts` calling `startApp({ app, profile, roles: ["server"] })`.

The old paths can exist only as transition debt with an expiration:

- `@rawr/hq-sdk`: remove/rename or alias only until M2-U00 gates are rewritten and the app starts through `@rawr/sdk`.
- `packages/runtime/*`: do not use as target implementation path; if a compatibility package is unavoidable, delete by M2-U00 close or M2-U01 at latest.
- `runtime-context`: absorb into `RuntimeAccess`/resource declarations; delete by M2-U06 or earlier if imports naturally disappear.
- `legacy-cutover` and `apps/server/src/host-*`: mine for behavior, then delete as runtime authority; do not hide them behind a facade.

M2 still starts with the server runtime path because current code proves the old runtime authority is still live (`apps/hq/server.ts:1-5`, `apps/server/src/bootstrap.ts:69-133`, `apps/server/src/host-satisfiers.ts:58-147`). But the first production domino should be target-shaped, not current-M2-shaped.

## Evidence Notes

- Current workspace globs still reserve `packages/runtime/*`, proving this is current substrate but not target authority (`package.json:6-18`).
- M2-U00 currently names `packages/runtime/*`, `packages/hq-sdk`, and `startAppRole(...)`, so it must be updated before implementation if the target locks above are accepted (`M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md:18-50`, `:64-70`).
- Narsil repo `rawr-hq-template#5c717202` confirmed current code reality around `bindService`, live legacy cutover imports, and workspace runtime globs.

Skills used: `team-design`, `spike-methodology`, `graphite`, `git-worktrees`, `narsil-mcp`.
