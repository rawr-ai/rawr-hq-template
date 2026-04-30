# Runtime Prod Contamination Lessons

Status: preservation packet after aborting the `runtime-prod-*` direction.
DRA: Codex.
Date: 2026-04-30.

## Purpose

This packet preserves the few useful lessons from the contaminated
`codex/runtime-prod-00-workflow-authority` through
`codex/runtime-prod-07-cleanup-closure` stack without preserving that stack as
runtime authority.

The runtime-prod stack moved into production app/package migration before the
contained mini-runtime had proven the next production-critical spine. That was
the wrong target for this phase. The correct continuation is:

> production-level contained proof of the runtime-critical spine inside
> `tools/runtime-realization-type-env`.

Nothing in this packet authorizes copying production `packages/core/sdk`,
`packages/core/runtime`, `resources`, `apps/*`, host seams, generated foundry
code, or runtime-prod gates into the lab.

## Review Loop

This packet was rewritten after six read-only review lanes:

| Lane | Review focus | Synthesis outcome |
| --- | --- | --- |
| Canonical/spec boundary | Compare runtime-prod claims against the canonical spec, proof manifest, diagnostic, and lab runbook. | Most provider, refs-only, and negative fixture claims were already lab/spec owned. Preserve only gate/process pressure. |
| Public law/type gates | Inspect SDK public-law tests, negative type fixtures, and Effect facade gates. | Preserve the gate matrix pattern and a few absence categories; reject concrete SDK syntax and support-seam types. |
| Provider/config/resource lifecycle | Compare provider/config/resource work against lab evidence. | Demote provider lifecycle rows to lab-owned proof; preserve only scenario pressure for a future representative resource/provider fixture. |
| Host/vendor/observability | Inspect app host, harness markers, telemetry, Elysia/oRPC/Inngest, and HyperDX claims. | Mark host/vendor work do-not-reuse; preserve proof-label failure modes. |
| Capability foundry/source hygiene | Inspect generator, generated artifacts, slice gates, topology gates, and workflow doc. | Preserve source-mine ledger and generator proof-strength lessons, including that runtime-prod idempotency was claimed but not proven by a committed gate; reject generated syntax and grep-gate authority. |
| Graphite/GitHub/worktree cleanup | Inspect branch, refs, worktrees, and PR state. | Preserve four-layer cleanup discipline: Git refs, Graphite metadata, GitHub PR state, worktree ownership. |

## Authority Boundary

Authoritative for the next program:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/AGENTS.md`
- `tools/runtime-realization-type-env/evidence/design-guardrails.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-runtime-research-program-closeout.md`

Contaminated evidence only:

- `docs/projects/rawr-final-architecture-migration/.context/runtime-production-capability-foundry-workflow.md`
- `apps/hq/**` and `apps/server/**` changes from the runtime-prod stack
- `packages/core/sdk/**`, `packages/core/runtime/**`, `resources/**`, and
  `tools/nx/capability-foundry/**` changes from the runtime-prod stack
- `scripts/runtime-prod/**` gates
- generated `services/foundry-proof/**`,
  `plugins/server/api/foundry-proof/**`, and
  `plugins/async/workflows/*foundry-proof*`
- PRs #273-#280 and their branch claims

Rule: if a claim would already be true after reading the canonical spec,
`proof-manifest.json`, and the runtime spine diagnostic, it is not preserved as
a runtime-prod lesson.

## Runtime-Prod Provenance

The branch refs may be deleted during cleanup, so the abandoned stack is
recorded here by PR and head commit for later archaeology only:

| PR | Abandoned branch | Head commit | Title |
| --- | --- | --- | --- |
| #273 | `codex/runtime-prod-00-workflow-authority` | `3f3d0814e6f0d1b9bd784c8ecfb644e5d2746784` | `docs(runtime): add production capability foundry workflow packet` |
| #274 | `codex/runtime-prod-01-topology-gates` | `f6832a0ecf8fb1c5e49aeab3b78393028390c3eb` | `chore(runtime): scaffold canonical runtime production packages under packages/core` |
| #275 | `codex/runtime-prod-02-sdk-public-law` | `c39c686f80253bf005474ca4aca79fbf2cf39052` | `feat(sdk): build out public runtime SDK seam with full plugin surface and Effect facade` |
| #276 | `codex/runtime-prod-03-runtime-spine` | `f69b2487982a14aaaabb2d2b518995cd2dfc81b8` | `feat(runtime): establish private runtime spine across topology, substrate, process-runtime, compiler, and bootgraph` |
| #277 | `codex/runtime-prod-04-resources-providers-config` | `283426d611a89263aa7981eac7e95ab629416869` | `feat(runtime): implement standard provider provisioning runtime` |
| #278 | `codex/runtime-prod-05-production-host-mount` | `53a85ef418cc262b8fec64eab7c759bf1bc556e8` | `refactor(hq): replace legacy-cutover bridge with sdk startApp runtime authority` |
| #279 | `codex/runtime-prod-06-capability-foundry` | `faba9485e017dd97b5829d58cd1c269ee874e1d4` | `feat(capability-foundry): scaffold foundry-proof exemplar with generator, service, server API, and async workflow plugins` |
| #280 | `codex/runtime-prod-07-cleanup-closure` | `6122cd45cf75187ba7b129bcfaf493860175e49a` | `chore(runtime): retire @rawr/runtime-context and @rawr/bootgraph, move context types into @rawr/sdk/execution` |

## Code Retention Decision

No runtime-prod source files are retained in lab quarantine from this cleanup
pass.

The six review lanes found reusable gate/scenario pressure, not reusable source
code. Copying files such as `packages/core/sdk/**`,
`packages/core/runtime/**`, `resources/clock/**`, app host files, or generated
foundry slices into a lab quarantine would make contaminated syntax look more
important than the canonical spec. The only retained inspectable material is
the immutable PR/head-commit table above and the gate/scenario descriptions in
this packet.

If a later workstream needs code archaeology, it should fetch the exact PR head
commit listed above and re-derive the target lab fixture from the canonical
spec before copying any snippet. Any copied snippet must land under a clearly
marked lab quarantine/resource path and remain non-authoritative.

## Preserve As Lesson

These are lessons about gate shapes, process discipline, and failure modes.
They are not implementation authority.

| Lesson | Runtime-prod evidence | What to keep |
| --- | --- | --- |
| Public-law gates should combine import facade, runtime shape, cold-declaration witness, absence checks, and boot smoke. | `packages/core/sdk/test/public-law.test.ts` | When the lab publishes any local `@rawr/sdk/*` facade, add one consolidated gate that asserts enumerated subpath imports, spec-owned literal witnesses/kind tags, cold-declaration witness fields, Effect facade runtime absence such as no `runPromise`/`ManagedRuntime`, and a `defineApp` to `startApp` or derivation smoke with an explicit canary proving descriptor bodies are not executed. The canonical spec owns the surface; the gate only checks it. |
| Effect facade absence should be checked at both type and runtime shape levels. | `packages/core/sdk/test/types/public-law-negative.ts`, `packages/core/sdk/test/public-law.test.ts` | The lab already owns async owner and boundary-field negatives. The incremental pattern worth keeping is pairing `@ts-expect-error` import/property negatives with runtime-shape absence checks for categories such as `Effect.runPromise`, `ManagedRuntime`, and `Context`. Re-derive the symbol list from the spec/lab facade, not from runtime-prod code. |
| A literal cold-declaration witness is easier to gate than comments or phantom types. | `packages/core/sdk/src/plugins/*/index.ts` | If the spec keeps a public import-safety witness, prefer a runtime-visible literal field that both `tsc` and tests can check. Re-derive the field name/value from the spec; do not copy runtime-prod builder syntax. |
| Retired authority needs layered absence gates. | `scripts/runtime-prod/verify-effect4-runtime.mjs`, `scripts/runtime-prod/verify-canonical-runtime-topology.mjs` | Preserve the gate layering: manifest pin, resolved dependency walk, raw vendor import quarantine, file existence checks, source-text checks for retired names, and root-script checks. Do not keep the runtime-prod package names, Nx tags, topology, or Effect version constant as target truth. |
| Capability generation proof must separate generator mechanics from generated syntax authority. | `tools/nx/capability-foundry/generator.cjs`, `scripts/runtime-prod/verify-capability-foundry-slice.mjs` | If a future lab workstream introduces a generator, prove structural mechanics with explicit dry-run, write, rerun, and zero-diff checks, plus inventory updates, catalog-valid paths, and expected projection files. Runtime-prod did not actually prove idempotency: the audited slice gate mostly checked generated files, string markers, inventory membership, and later catalog kind/path; it did not run the generator or compare pre/post trees. Generated authoring syntax still needs independent spec-terminal validation. |
| Migration/source-mining ledgers should pair replacement gates with deletion/non-live gates. | `runtime-production-capability-foundry-workflow.md` source-mine table | Keep the ledger shape: source path, current role, mine-for value, target owner, conflict rule, replacement gate, deletion/non-live gate, phase. No retired-authority row should close without both a replacement gate and a deletion/non-live gate. The contents of that runtime-prod ledger are not authority. |
| Host/vendor/observability claims need proof labels strict enough to prevent readiness laundering. | `apps/server/src/hq-app-host.ts`, `apps/server/test/hq-app-host.test.ts`, `packages/core/runtime/harnesses/*`, generated foundry server/workflow files, and the lab HyperDX report | A harness marker package is topology only, mocked `app.listen` proves bootstrap wiring only, generated server/workflow declarations do not prove Elysia/oRPC request paths or Inngest durability, mocked telemetry order is not OTLP/HyperDX proof, and accepted OTLP ingest is not dashboard/query/retention/product observability. Keep these as named anti-theater checks. |
| Cleanup must distinguish Git refs, Graphite metadata, GitHub PR state, and worktree ownership. | Runtime-prod branch/PR cleanup state | Future cleanup must close remote PRs, delete remote head refs, delete Graphite metadata/local branches with `gt`, verify local refs, verify remote refs, and confirm no worktree owns the deleted branches. These are separate layers and must be checked separately. |

## Mine Later Only Through Spec-Led Reinterpretation

These may contain useful pressure, but only after the canonical spec and current
lab evidence are read first. Do not copy code or signatures.

| Area | Runtime-prod evidence | How to mine safely |
| --- | --- | --- |
| Public-law facade gate matrix | `packages/core/sdk/test/public-law.test.ts` | Mine only the matrix shape: import enumeration, spec-owned literal witness round-trips, cold-declaration witness, Effect facade absence, boot smoke. Do not mine package subpaths, builder/factory shapes, or support-seam types. |
| Representative resource/provider fixture cut | `resources/clock/**`, `packages/core/sdk/src/runtime/resources/**`, `packages/core/sdk/src/runtime/providers/**`, `packages/core/runtime/standard/test/provider-provisioning.test.ts` | Re-derive a lab-only fixture under `tools/runtime-realization-type-env/fixtures/**` from canonical provider/resource sections. Goal is pressure for the first contained resource/provider cut, not a public catalog or production provider package. |
| Provider/config failure-mode names | `packages/core/runtime/standard/test/provider-provisioning.test.ts` | Mine only failure-mode names if the lab lacks one: exact-before-unscoped dependency matching and ambiguous fallback diagnostics if the spec accepts fallback semantics, secret-backed config value, release failure shape, and unsafe catalog filename. The lab already owns missing/ambiguous coverage broadly, in-memory no-leakage, rollback, and finalization; implementation and final public shapes stay spec-led. |
| Catalog persistence hardening if persistence enters the lab | `persistRuntimeCatalogSnapshot(...)` in `packages/core/runtime/standard/src/index.ts` | If a future contained proof touches file-backed catalog persistence, add path escape and unsafe filename negatives. Do not import the implementation, storage layout, or persistence policy. |
| Dependency version proof | `scripts/runtime-prod/verify-effect4-runtime.mjs` | If the canonical spec/current lab authority changes the runtime dependency target, prove the actual resolved package version inside the contained lab. Mine the resolved-version gate pattern, not `4.0.0-beta.59` or the production package allowlist. |

## Do Not Reuse

These are abandoned contamination. Do not cite them as proof, do not copy them
into the mini-runtime, and do not treat their APIs as target shapes.

| Area | Why not |
| --- | --- |
| `apps/server/src/hq-app-host.ts`, `apps/server/src/index.ts`, `apps/hq/server.ts`, `apps/hq/async.ts`, `apps/hq/dev.ts`, `apps/hq/rawr.hq.ts` | Production app host integration was the wrong target for this phase. `apps/hq/test/runtime-router.test.ts` and `apps/server/test/hq-app-host.test.ts` checked selection and mocked listen behavior, not real Elysia/oRPC/Inngest host paths. |
| `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`, `apps/server/src/workflows/harness.ts`, `host-seam.ts`, `host-realization.ts`, `runtime-authority.ts`, `testing-host.ts` | These are legacy-plus-migration seams fused with production server code. Only route order, ingress signature-before-side-effects, and web plugin path safety are candidate failure-mode pressure, and all must be re-derived from the spec/lab. |
| `packages/core/runtime/harnesses/elysia/**` and `packages/core/runtime/harnesses/inngest/**` | The packages were topology markers. Their `src/index.ts` files were one-line constants and did not exercise Elysia, oRPC, Inngest function/serve, step behavior, worker paths, durable retry, or host lifecycle. |
| `apps/server/test/hq-app-host.test.ts`, `apps/server/test/phase-a-gates.test.ts`, `apps/server/test/telemetry-bootstrap.test.ts`, `apps/server/test/orpc-metrics.test.ts` | Mocked boot/listen/order checks and string-grep import gates are guardrails at best. They are not harness, telemetry, vendor, HyperDX/OTLP, or product observability proof. |
| Generated `services/foundry-proof/**`, `plugins/server/api/foundry-proof/**`, `plugins/async/workflows/*foundry-proof*` | The generated service is not reusable except as scenario pressure, the generated server API did not prove Elysia/oRPC request paths or preserve the spec terminal shape, and async workflows authored as `async run() { ... }` returning literals do not prove static step membership, durable execution, retry, replay, or Inngest behavior. |
| `tools/nx/capability-foundry/generator.cjs` and `verify-capability-foundry-slice.mjs` as implementation/gate authority | The generator hard-coded public API syntax and the slice gate mostly grepped for those same strings. This creates accidental API authority instead of spec validation. It also is not an idempotency gate. |
| `packages/core/sdk/src/effect/index.ts` | The Effect facade body is not safe to copy. One observed shape mapped `catchAll` to a non-authoritative vendor member. Rebuild any facade from the lab/spec and the actual installed Effect API. |
| Runtime-prod private runtime-spine package sketches under `packages/core/runtime/compiler/**`, `process-runtime/**`, `topology/**`, `substrate/**`, and `bootgraph/**` | The lab already owns the corresponding descriptor, registry, refs-only, process-runtime, bootgraph, boundary, and compiler proof categories. These package sketches are not the source of truth. |
| Runtime-prod support-seam types such as `WorkflowRuntimeSupportSeam`, `BoundaryMiddlewareSupportState`, `HostRuntimeSupportContext`, and `BoundaryRequestSupportContext` in `packages/core/sdk/src/execution/index.ts` | These later-stack support types mix legacy host concerns and vendor-shaped Inngest details into a public execution facade. Public runtime law must be decided from the spec. |
| `packages/core/sdk/src/runtime/providers/**`, `packages/core/sdk/src/runtime/resources/**`, `packages/core/sdk/src/runtime/schema/**`, `packages/core/runtime/standard/src/index.ts` | These may contain scenario pressure, but public field names, precedence rules, secret-store naming, provider internals, and schema contracts are architecture decisions or already lab-owned. |
| Any runtime-prod config source precedence, platform secret-store binding, provider field naming, or `ProviderEffectPlan` shape | These are fenced by the manifest/diagnostic as unresolved public or production semantics. Importing them would silently lock user-owned decisions. |
| `EFFECT4_VERSION = "4.0.0-beta.59"`, `migration-slice:runtime-production`, and runtime-prod package/topology names | These are contaminated identity pins. Keep only the idea that dependency and topology claims need gates. |
| Root `package.json`, `bun.lock`, `tsconfig.base.json`, `vitest.config.ts` churn | Stack mechanics and package churn, not lessons. |
| `runtime-production-capability-foundry-workflow.md` as a workflow | It opened the wrong program. Mine only the source-mine ledger and operating-shape lessons named above. |

## Not Captured Because The Spec Or Lab Already Owns It

These must be read directly from the canonical spec, proof manifest, runtime
diagnostic, and existing lab workstream reports.

- Provider acquire/release ordering, rollback, reverse finalization,
  release-failure recording, provider graph diagnostics, and redacted lifecycle
  records. The lab already owns this through contained provider bootgraph and
  config/redaction proof. Exact-before-unscoped fallback matching remains
  scenario pressure only if the spec accepts fallback semantics.
- Provider config validation through `RuntimeSchema`, diagnostic-safe invalid
  config failure, and no-leakage records. The lab already owns the contained
  version; production config precedence and platform secret stores remain
  unresolved.
- Descriptor refs, descriptor tables, refs-only portable artifacts, and
  executable descriptor separation. The canonical spec and lab negative/fixture
  gates already own this.
- Async owner identity, boundary-specific ref fields, dispatcher operation
  inventory, and route import-safety artifacts. Existing lab fixtures and
  workstreams own the contained proof and residuals.
- Final public `ProviderEffectPlan` shape.
- Final `RuntimeAccess` law.
- Final dispatcher access policy.
- Final async workflow/schedule/consumer membership syntax.
- Final route import-safety law.
- Boundary policy API/DX, retry/backoff, timeout defaults, native host error
  mapping, and durable async policy.
- oRPC/Elysia harness contract, OpenAPI publication, and real request path.
- Inngest durable execution, retry, replay, idempotency, run history, and
  worker/serve path.
- HyperDX/product observability policy, query semantics, retention, dashboards,
  alerting, correlation naming, and production OpenTelemetry bootstrap. Current
  lab authority remains `audit.telemetry.hyperdx-observation`, not product
  observability proof.
- RuntimeCatalog storage backend, indexing, retention, rehydration, exact
  persistence format, and control-plane topology.
- Production package topology and ownership.
- Production app/server migration sequence.

## Corrected Next-Program Frame

The next program is not production app readiness. It is production-level
contained proof of the runtime-critical spine inside
`tools/runtime-realization-type-env`.

Validation authority:

1. Canonical runtime spec pinned by `proof-manifest.json`.
2. `tools/runtime-realization-type-env/**` source, fixtures, tests, manifest,
   diagnostic, and workstream reports.
3. This lessons packet only as cautionary context.

The next contained program should prove, as far as the lab can honestly prove:

- public authoring law through lab-owned facades, positive fixtures, and
  negative fixtures;
- descriptor refs, descriptor tables, registry identity, and refs-only
  artifacts;
- derivation and compilation into process-local execution plans without
  executing descriptor bodies during derivation;
- provider/config/resource selection, acquire/release, rollback, finalization,
  safe diagnostics, and redacted catalog records;
- process runtime invocation through real Effect execution under runtime-owned
  boundary policy;
- adapter and harness seams that delegate through `ProcessExecutionRuntime`;
- vendor integration proof where feasible and correctly labeled;
- OTLP/HyperDX/local observability proof where feasible and correctly labeled;
- honest residuals for vendor/product semantics that the lab cannot prove.

Use the term `production-level contained proof` instead of `production
readiness` for this next mini-runtime program.

## Next Proof Goals

Fresh planning should start from the canonical spec and current lab diagnostic,
using this packet only as context.

1. Re-ground the lab proof contract and update the handoff so future agents do
   not treat production packages or app host code as authority.
2. Open a new contained workstream under
   `tools/runtime-realization-type-env/evidence/workstreams/`.
3. If public facade work is needed, add a lab-owned public-law gate matrix and
   negative facade absence checks without importing runtime-prod SDK code.
4. Build any foundry-shaped capability fixture inside the lab only. It should
   be a proof fixture, not a production generator or production package.
5. Prove vendor-adjacent seams only when the test actually uses the vendor
   boundary:
   - oRPC/Elysia: contained real request path if feasible, otherwise
     vendor-shape proof only.
   - Inngest: contained function/serve/step proof if feasible, otherwise
     handoff-shape proof only.
   - HyperDX/OTLP: local redacted OTLP projection/export and optional ingest
     smoke only; query/dashboard/product semantics require an explicit accepted
     observability policy.
6. Keep all production app/package migration outside the program until the lab
   evidence is green at the relevant proof strength.

Effect version note: if the canonical spec/current lab authority changes target
version, move it through a contained lab dependency-proof workstream. Do not
reuse the runtime-prod Effect 4 pin or production allowlist.

## Fresh-Agent Handoff Snippet

Start from `codex/runtime-research-program-closeout` or a branch stacked
directly on it. Treat PRs #273-#280 and `runtime-prod-*` branches as abandoned
contamination. The only retained artifact from that direction is this lessons
packet.

Do not copy production `packages/core/sdk`, `packages/core/runtime`,
`resources`, app host, or foundry code into the lab. Mine runtime-prod only
through the canonical spec and only as scenario pressure.

Before mutation, run:

```sh
git status --short --branch
gt status --short
gt ls
bunx nx show project runtime-realization-type-env --json
```

Then verify the manifest-pinned runtime spec hash and open a fresh contained
workstream under `tools/runtime-realization-type-env/evidence/workstreams/`.

## Cleanup Checklist

Cleanup must explicitly account for four independent layers:

- Git refs: local and remote-tracking branch pointers.
- Graphite metadata: stack parent/child state used by `gt`.
- GitHub PR state: open/closed draft PRs and remote head refs.
- Worktree ownership: whether any on-disk worktree has a branch checked out.

Expected cleanup:

1. Preserve this lessons packet on `codex/runtime-lessons-preservation`.
2. Close PRs #273-#280 as contaminated draft work with the agreed comment.
3. Delete remote head refs for the runtime-prod PRs.
4. Delete the local `codex/runtime-prod-00-workflow-authority` stack segment
   with Graphite `--upstack`, after confirming the lessons branch is not a
   child of that stack.
5. Fetch/prune/sync without broad restack thrash.
6. Verify no `codex/runtime-prod-*` local or remote refs remain.
7. Leave the active checkout on `codex/runtime-research-program-closeout` or
   `codex/runtime-lessons-preservation`.
8. Leave the worktree clean.
