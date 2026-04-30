# Runtime Production Capability Foundry Workflow

Status: active workstream opening packet.
DRA: Codex.
Opened: 2026-04-30.
Repo: RAWR HQ-Template.

## Frame

This workstream moves runtime realization from contained lab proof to production
migration readiness in the template repo. The prior
`tools/runtime-realization-type-env` program is closed and remains evidence
only. It is not production SDK code, not production runtime code, and not a
migration implementation.

The goal is a submitted Graphite stack that makes the canonical runtime spine
real enough to migrate against:

- public runtime laws are accepted in code and gates;
- `@rawr/sdk` exists at `packages/core/sdk`;
- private runtime machinery exists under `packages/core/runtime/**`;
- real Elysia/oRPC and Inngest host mounting no longer flows through legacy
  host authority;
- first production resources/providers, profile config, secret/config redaction,
  catalog, and telemetry semantics are shaped;
- capability foundry tooling can generate and validate a real service plus
  server/async projection slice;
- stale runtime authority packages and imports are deleted or made non-live;
- Graphite submission, validation, and cleanup are complete.

Template repo is the program boundary. Downstream RAWR HQ receives an
integration packet after template closure; this program does not mutate the
downstream personal repo.

## Authority

1. Canonical architecture spec:
   `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`.
2. Canonical runtime realization spec:
   `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`.
3. Repo code, package configs, Nx project truth, tests, and gates.
4. Runtime lab manifest, diagnostic, and workstream reports as proof and
   coordination evidence only.
5. Quarantine ledgers and archived docs as source-mining provenance only.

The pinned runtime spec hash verified at workstream open is:

```text
483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b
```

## Current Verified State

- Branch: `codex/runtime-research-program-closeout`.
- PR #272: open, non-draft, head `codex/runtime-research-program-closeout`,
  base `codex/runtime-migration-control-plane-observation`, Graphite
  mergeability check in progress.
- Worktree at open: clean.
- Existing current-findings gate passes and records known red/yellow state:
  `bun run phase-2:gate:u00:current-findings`.
- Effect 4 is the runtime target. At workstream time, `npm view effect` reports
  `4.0.0-beta.59` on the beta dist-tag while the repo still pins `3.21.2`;
  the dependency and lockfile move belongs in the runtime substrate slice with
  API fallout proven there.
- Closure state: the production SDK and runtime substrate pin
  `effect@4.0.0-beta.59`; the closed lab remains explicit Effect 3 evidence.
  `@rawr/bootgraph`, `@rawr/runtime-context`, `apps/hq/legacy-cutover.ts`, and
  `apps/server/src/host-composition.ts` are retired from active source. The
  remaining live migration substrate is named below and is not claimed away.

## DRA Operating Rules

- Own scope, branch hygiene, proof labels, source-mine disposition, agent
  prompts, synthesis, verification, and Graphite submission.
- Use default agents for reasoning, judgment, strategy, critique, and
  evaluation. Use explorer agents only for bounded fact finding. Explorer
  conclusions are evidence, not decisions.
- Ask the user only for real public API/DX or durable architecture decisions
  that cannot be resolved from canonical specs, repo truth, or obvious
  production defaults.
- Never promote vendor proof, simulation proof, local comments, or lab artifacts
  into production readiness.
- Keep the repo clean at phase boundaries. Use Graphite for stack mutation and
  `gt submit --stack --ai` for submission.

## Graphite Plan

Preferred branch stack:

1. `codex/runtime-prod-00-workflow-authority`
2. `codex/runtime-prod-01-topology-gates`
3. `codex/runtime-prod-02-sdk-public-law`
4. `codex/runtime-prod-03-runtime-spine`
5. `codex/runtime-prod-04-resources-providers-config`
6. `codex/runtime-prod-05-host-mounting`
7. `codex/runtime-prod-06-capability-foundry`
8. `codex/runtime-prod-07-cleanup-closure`

If PR #272 is still open, this stack starts above
`codex/runtime-research-program-closeout` and claims submitted/verified, not
merged, until the inherited stack drains.

Graphite limit rule: if the stack approaches or hits the 50-branch Graphite
limit, stop new branch creation and switch to a deliberate drain/restructure
cycle. Do not use Git-only rewrites as a substitute for Graphite metadata
state. Re-read `docs/process/GRAPHITE.md`,
`docs/process/runbooks/STACK_DRAIN_LOOP.md`, the local Graphite skill, and
Graphite docs/help as needed before mutating branch order or metadata. The
acceptable outcomes are a patient stack drain, a smaller follow-on stack based
on the drained tip, or an explicitly documented Graphite-safe alternative.

## Progress Ledger

- `codex/runtime-prod-00-workflow-authority`: workflow authority packet opened.
- `codex/runtime-prod-01-topology-gates`: canonical runtime topology, workspace
  globs, aliases, inventory, and topology gates established.
- `codex/runtime-prod-02-sdk-public-law`: `@rawr/sdk` public law established
  with SDK-scoped Effect 4, negative type fixtures, and public seam guards.
- `codex/runtime-prod-03-runtime-spine`: private runtime spine established in
  topology, substrate, process-runtime, compiler, and bootgraph. This is
  intentionally pre-provider/pre-host-mounting; timeout policy is enforced at
  the process-runtime boundary, raw Effect execution remains inside the
  substrate runtime access, and bootgraph finalization is idempotent.
- `codex/runtime-prod-04-resources-providers-config`: first production resource,
  provider/config, secret-store, provider dependency graph, redacted catalog,
  and provider lifecycle cut established. `@rawr/resource-clock` is the first
  resource package, provider acquisition/release uses Effect 4 through the
  runtime substrate, and catalog persistence is redacted/file-backed.
- `codex/runtime-prod-05-production-host-mount`: `apps/hq` entrypoints now bind
  role selection through `@rawr/sdk/app` without server-internal imports; the
  concrete server app owns the production `startApp(...)` host adapter; legacy
  cutover and `host-composition` are deleted from live source; hard gates
  reject their return.
- `codex/runtime-prod-06-capability-foundry`: complete. Scope is intentionally
  generator-owned scaffolding plus one generated declaration-cold exemplar
  (`foundry-proof`). It proves service/server/async projection generation,
  inventory, idempotency, and gates. The generated async workflow projection
  uses the catalog-valid `foundry-proof-workflow` directory while preserving the
  `foundry-proof` capability id. It does not claim generated async durable
  execution or full `@rawr/hq-sdk` adapter retirement.
- `codex/runtime-prod-07-cleanup-closure`: complete before Graphite submission.
  Retired the old `@rawr/bootgraph` and `@rawr/runtime-context` support
  packages, moved host/request context support types into `@rawr/sdk/execution`,
  added a production Effect 4 and retired-support gate, hardened the capability
  foundry exemplar against active plugin catalog law, and refreshed stale
  phase-a scaffold checks.

## Closure Outcome

This stack reaches production migration readiness for the runtime realization
arc, not a claim that every historical package name in the template is gone.
The defensible closure line is:

- `@rawr/sdk` is the public runtime-law surface and resolves Effect 4.
- `packages/core/runtime/**` owns the private runtime packages and the runtime
  substrate resolves Effect 4.
- real app/server host entrypoints flow through `startApp(...)`; the legacy app
  cutover and `host-composition` authority are deleted and hard-gated.
- first resource/provider/config/catalog cuts are present and verified.
- capability foundry generation is idempotent, catalog-valid, and proven by the
  `foundry-proof` service, server API projection, and async workflow projection.
- the closed `tools/runtime-realization-type-env` lab still passes, but remains
  evidence only and is not counted as production runtime proof.

The named residuals after closure are:

- `@rawr/hq-sdk` remains live for the older oRPC service helpers, schema
  adapters, host adapters, and plugin service-binding utilities. It is
  transition substrate, not target public runtime law.
- `@rawr/core` remains live for CLI/OCLIF command support, workspace-root, and
  telemetry support.
- `apps/server/src/host-seam.ts`, `host-realization.ts`,
  `host-satisfiers.ts`, and `rawr.ts` remain the host-local production adapter
  path. They no longer route through `host-composition`, but further harness
  extraction can still mine them.
- generated async workflow declarations are cold/catalog-valid; durable async
  execution, retry/idempotency, and native Inngest durability are not claimed by
  the foundry exemplar.
- root `devDependencies.effect` remains Effect 3 for the closed lab lane.
  Production runtime proof is package-scoped to `@rawr/sdk` and
  `@rawr/core-runtime-substrate`.

Closure gates run:

```sh
bun run runtime-prod:gates:exit
bun run lint:boundaries
bun run architecture:gates:permanent
bun run runtime-realization:type-env
bun run typecheck
bun run build
bun run test
```

The first full `bun run test` rerun exposed a single suite-load timeout in
`apps/cli/test/journal.test.ts`; the isolated journal test passed, and the next
full `bun run test` passed all 83 files and 266 tests.

## Source-Mine Ledger

Live code remains in place until replaced. Each row must gain a replacement
gate and deletion/non-live gate before the source is retired.

| Source path | Current role | Mine for | Target owner | Conflict rule | Replacement gate | Deletion/non-live gate | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `apps/hq/legacy-cutover.ts` | sanctioned Phase 1 executable bridge | entrypoint handoff and boot smoke expectations | `@rawr/sdk/app` plus process runtime | target `startApp(...)` wins | HQ server/async/dev entrypoints boot through runtime | no `legacy-cutover` file/export/import | 5 |
| `apps/server/src/host-composition.ts` | live executable composition authority | manifest intake and bound role plan shape | runtime compiler/process runtime | compiler/process runtime wins | compiled process plan drives host mounting | no active `host-composition` import | 3,5 |
| `apps/server/src/host-seam.ts` | host binding seam | API/workflow binding expectations | process runtime service/surface binding | process runtime owns live binding | service/surface plans bind through process runtime | no active `host-seam` import | 3,5 |
| `apps/server/src/host-realization.ts` | host realization | oRPC/workflow surface materialization | surface adapters plus process runtime | adapters lower compiled plans only | adapters delegate to `ProcessExecutionRuntime` | no active `host-realization` import | 5 |
| `apps/server/src/host-satisfiers.ts` | concrete client/resource satisfiers | service binding cache, deps/scope/config, clock/sql/logger adapters | resources, providers, process runtime | providers/resources own runtime values | provider-backed service clients pass tests | no live satisfier authority outside runtime | 4,5 |
| `apps/server/src/rawr.ts` | route mount and Inngest bundle | route family order, ingress signatures, web plugin serving | Elysia/Inngest harnesses | harness consumes lowered payloads only | real HTTP and Inngest worker tests pass | no legacy runtime import path | 5 |
| `packages/hq-sdk` | transitional SDK/helper package | service authoring, schema helpers, plugin registration, binding, adapters | `packages/core/sdk`, process runtime, resources, standard providers | `@rawr/sdk` public law wins | active services/plugins import `@rawr/sdk` | no active `@rawr/hq-sdk` package/import | 2,3,7 |
| `packages/core` | current CLI/telemetry support package | `RawrCommand`, workspace root, telemetry bootstrap | CLI/OCLIF SDK lane and runtime topology/standard telemetry | `packages/core` becomes namespace | consumers migrated to target owners | no active `@rawr/core` package/import | 2,7 |
| `packages/bootgraph` | reservation shell | structural expectations only | `packages/core/runtime/bootgraph` | canonical runtime bootgraph wins | runtime bootgraph tests pass | old package removed | 3,7 |
| `packages/runtime-context` | type-only runtime context seam | request/runtime context type expectations | process runtime and harness context modules | runtime context is not an alias sink | adapters/harnesses typecheck without package | old package removed | 3,7 |
| `tools/runtime-realization-type-env` | contained proof lab | fixtures, proof matrix, negative cases | evidence only | never imported by production code | lab gate still passes | remains contained, not production dependency | all |

## Public Law Defaults

- `ProviderEffectPlan` is opaque, cold, and authored via `providerFx`; public
  provider authoring returns plan values, not promises or handlers.
- Runtime and provider execution target Effect 4. Raw Effect imports stay
  quarantined to approved SDK internals and private runtime packages.
- `RuntimeResourceAccess` exposes only declared resource refs through `get`,
  `getOptional`, and redacted `metadata`.
- Dispatcher access is explicit opt-in from server API/internal plugin
  declarations, with operation inventory and no ambient broad dispatcher.
- Async workflow/schedule/consumer membership is declared through static step
  descriptors. Runtime derivation must not parse workflow bodies or execute
  `run(...)` to discover steps.
- Route import safety means declarations and route factories remain cold:
  imports cannot acquire resources, read secrets, connect providers, start
  processes, mutate composition, run effects, or mount hosts.
- Boundary policy is record-backed first: exact boundary kind, timeout, retry
  declaration, interruption, Exit/Cause classification, telemetry labels, and
  redacted attributes. Production retry/backoff and durable async retry remain
  owner-specific.

## Implementation Phases

### 0. Workflow and Authority

- Open this workflow packet.
- Verify spec hash, stack state, and current findings.
- Create Graphite branch `codex/runtime-prod-00-workflow-authority`.
- Commit the workflow and any active-doc routing needed to keep future agents
  from relying on quarantined or stale plans.

Exit gate:

```sh
git status --short --branch
gt ls
bun run phase-2:gate:u00:current-findings
```

### 1. Canonical Topology and Gates

- Replace stale `packages/runtime/*` gate expectations with
  `packages/core/runtime/**`.
- Add workspace globs for `packages/core/sdk`,
  `packages/core/runtime/*`, `packages/core/runtime/harnesses/*`, and
  `resources/*`.
- Regenerate architecture inventory and structural suites for canonical
  package names.
- Add static gates banning stale topology and live imports of old runtime
  authority once replacement phases land.

Exit gate:

```sh
bun run sync:check
bun scripts/runtime-prod/verify-canonical-runtime-topology.mjs
bun run phase-2:gate:u00:current-findings
bunx nx show projects --json
```

### 2. Public SDK Law

- Create `packages/core/sdk` as `@rawr/sdk`.
- Implement public surfaces required by the specs:
  app, effect, execution, service, service/schema, server plugins,
  async plugins, CLI plugins, web plugins, agent plugins, desktop plugins,
  runtime/resources, runtime/providers, runtime/providers/effect,
  runtime/profiles, and runtime/schema.
- Migrate service and plugin authoring imports from `@rawr/hq-sdk` to
  `@rawr/sdk` without preserving compatibility aliases.
- Add public import and cold-declaration tests.

Exit gate:

```sh
bunx nx run @rawr/sdk:typecheck
bunx nx run @rawr/sdk:test
bun run lint:boundaries
```

### 3. Runtime Spine

- Create private runtime packages under `packages/core/runtime/**`.
- Implement compiler, bootgraph, Effect substrate, process runtime, execution
  registry, service binding cache, execution runtime, runtime access, and
  topology diagnostics at production shape.
- Mine lab fixtures and current helper code for behavior, not authority.
- Keep raw Effect imports inside approved SDK internals and runtime internals.

Exit gate:

```sh
bunx nx run-many -t typecheck,test --projects=@rawr/core-runtime-compiler,@rawr/core-runtime-bootgraph,@rawr/core-runtime-substrate,@rawr/core-runtime-process,@rawr/core-runtime-topology
bun run runtime-realization:type-env
```

### 4. Resources, Providers, Config, and Catalog

- Add `resources/*` root and first resource/provider catalog:
  clock, logger, telemetry, catalog-store, workspace-fs, sql, inngest,
  config, and secret-store.
- Implement provider selections in app runtime profiles.
- Add config source loading, `RuntimeSchema` validation, secret redaction,
  provider dependency closure, acquire/release finalization, rollback records,
  and file-backed catalog persistence under `.rawr/runtime/catalog`.

Exit gate:

```sh
bunx nx run-many -t typecheck,test --projects=@rawr/core-runtime-substrate,@rawr/core-runtime-bootgraph,@rawr/core-runtime-topology,@rawr/core-runtime-standard,@rawr/resource-clock
bun run lint:boundaries
```

### 5. Production Host Mounting

- Replace `apps/hq` entrypoints with `startApp(...)`.
- Move Elysia/oRPC and Inngest mounting behind runtime adapters/harnesses.
- Preserve route family behavior, ingress signature policy, first-party RPC
  policy, OpenAPI publication, request context, workflow route policy, and web
  plugin serving behavior through production tests.
- Delete the legacy cutover when the replacement path passes.

Exit gate:

```sh
bunx vitest run --project hq-app apps/hq/test/runtime-router.test.ts
bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/route-boundary-matrix.test.ts apps/server/test/ingress-signature-observability.test.ts
bun run phase-2:gate:u00:no-legacy-cutover
```

### 6. Capability Foundry

- Add `tools/nx/capability-foundry` and register it in
  `tools/nx/generators.json`.
- Generate a complete capability slice: service, optional resources/providers,
  server API projection, async workflow projection, app membership, runtime
  profile selections, project inventory, structural gates, and tests.
- Prove dry-run, write, and idempotency.
- Generate one exemplar capability and verify it through real server and async
  runtime paths.

Exit gate:

```sh
bunx nx g ./tools/nx/generators.json:capability-foundry --dry-run
bunx nx g ./tools/nx/generators.json:capability-foundry --name foundry-proof
bunx nx g ./tools/nx/generators.json:capability-foundry --name foundry-proof
bun run sync:check
bunx nx run-many -t typecheck,test,structural --projects=@rawr/foundry-proof,plugin-server-api-foundry-proof,plugin-async-workflow-foundry-proof
```

### 7. Cleanup, Review, and Graphite Closure

- Retire every source-mine ledger row with evidence.
- Delete stale packages/imports/docs/gates.
- Run semantic/JSDoc trailing review for new runtime seams.
- Run final gates and submit with Graphite.

Final gates:

```sh
bun run sync:check
bun run lint:boundaries
bun run architecture:gates:permanent
bun run runtime-realization:type-env
bun run typecheck
bun run build
bun run test
bun run runtime-prod:gates:exit
git diff --check
git status --short --branch
gt status --short
```

Submit:

```sh
gt submit --stack --ai
```

Merge/prune when mergeable:

```sh
gt ss --publish --ai --stack --no-interactive
gt merge --no-interactive
gt sync --no-restack --force --no-interactive
gt ls
```

## Escalation

Escalate only for unresolved public authoring API/DX, final
`ProviderEffectPlan` public shape beyond the default above, final
`RuntimeAccess` law beyond declared-resource access, dispatcher policy beyond
explicit opt-in, async durable semantics, route import-safety law changes,
boundary policy semantics, vendor strategy, package ownership topology changes,
migration sequence changes, or product observability policy.

Do not escalate for file placement, test placement, internal helper names,
Graphite mechanics, fixture organization, obvious config scaffolding, source
hygiene, or focused gate choice.

## Closeout Criteria

This stack closes the template-side production migration readiness hop when:

- active docs point at this workflow, not stale quarantined plans;
- `@rawr/sdk` and `packages/core/runtime/**` own the production runtime law and
  Effect 4 substrate;
- legacy app cutover, `host-composition`, `@rawr/bootgraph`, and
  `@rawr/runtime-context` are deleted or made non-live with hard gates;
- server host mounting is production-backed through `startApp(...)`;
- first resource/provider/config/catalog/telemetry cuts are verified;
- capability foundry generation is idempotent, catalog-valid, and proven by a
  real exemplar;
- full gates pass;
- Graphite stack is submitted, and merge/prune state is recorded outside this
  source doc after Graphite accepts the stack.

It does not close the broader template modernization residuals named in
`Closure Outcome`: full `@rawr/hq-sdk` adapter retirement, `@rawr/core` CLI
support migration, final harness extraction from the remaining host-local
server files, or durable async execution semantics.
