## Why

The repository currently treats CLI, server, web, and HQ process roles as peer
apps, so app selection, provider acquisition, native mounting, and shutdown are
reconstructed in entrypoints instead of flowing through the canonical runtime
realization system. The frozen predecessor runtime lineage plus later admitted
resource, product, and distribution amendments define the correct kinds and
seven-phase lifecycle; this change first removes product and dead source from
the platform repository, then realizes that law once so Habitat can self-host
and downstream products can consume a released substrate.

The exact sectional source ledger is [[authority-amendment]].

## What Changes

- Establish one closed Habitat application contract: the Habitat platform owns
  the substrate and realizes its non-core tooling through a self-hosted app,
  while downstream product apps own their composition, profiles, process
  declarations, and thin entrypoints. Runtime owns compilation, provisioning,
  execution, mounting coordination, and process finalization for both. Preserve
  immutable `app@1` byte-for-byte and add a complete, independently resolvable
  `app@2` as its future successor. One semantic app and Nx project own one cold,
  finite `ProcessCatalog`; each thin entrypoint selects exactly one process
  record and calls `startApp(...)` once. A process is not an app, kind, child Nx
  project, supervisor, or deployment unit.
- Apply a semantic sieve before runtime implementation: a current Rawr name
  conveys no ownership. Retain reusable platform capability in Habitat, move
  only proven downstream product capability to Rawr, and delete duplicate,
  obsolete, weak, or unclear machinery.
- Move the proven ChatGPT corpus, Hyperresearch, and Codex/Claude session
  intelligence product closures to the existing independent Rawr repository
  before the Habitat runtime spine opens.
  Use native Nx history-preserving import, retire Habitat-side Rawr application
  law, and leave Marketplace as an independent content repository.
- Implement the minimum generic runtime spine that preserves every canonical
  phase: definition, selection, derivation, compilation, provisioning,
  mounting, and observation.
- Keep compilation as one private, package-less, synchronous planning phase.
  It consumes only the exact selected `Entrypoint` and complete
  `NormalizedAuthoringGraph`, returns the compiled plan, cold reference table, and
  observation seed defined by canonical runtime law, projects only the selected
  process-role closure rather than sibling app-role facts, and refuses invalid
  input with built-in `TypeError` before any result. It exposes no compiler package or
  public face, diagnostic API, live value, provisioning behavior, native mount,
  or observation-port dependency; a later terminal composition source may
  establish a direct compiler edge only when it really consumes that operation.
  Task 5.0 closes this authority across the two canonical system documents and
  six active OpenSpec artifacts without implementation or `.habitat` mutation;
  task 5.1 is the sole next source node, and task 10.6 alone materializes the
  final SDK-to-compiler edge from its real terminal composition call. Canonical
  `HABITAT_RUNTIME_REALIZATION` §16 alone owns exact mechanics and closed DTO
  fields; the active capability spec retains archive-safe acceptance.
- Close provider-effect-plan authority before implementation. Task 6.0 is a
  documentation-only nine-document gate: canonical runtime §13.4 and its
  directly affected provisioning, enforcement, and contract-summary sections
  alone own exact mechanics, while the active capability spec retains
  archive-safe acceptance. Task 6.1 then adds only the flat independent
  `runtime-definition@2` successor, evolves the existing SDK provider root, and
  adds only the provider Effect subpath. A cold provider build returns a curated
  `HabitatEffect`-backed plan with typed acquire, required infallible release,
  a requirement-preserving typed resource-map contract, frozen public boundary
  metadata, and private body witness; it does not construct a map, acquire,
  lower raw Effect, own boot order, expose a Promise result, or create another
  kind, project, package, or runtime phase. Later substrate tasks alone own the
  concrete exact-reference map and live outcomes: task 7.2 constructs and uses
  the real beta.101 `Effect.acquireRelease(acquire, release)` adapter, registers
  release immediately after successful acquire, and classifies acquisition;
  task 7.3 executes cleanup, rollback, reverse continuation, repeated disposal,
  and close through that adapter. Bootgraph carries only identity, dependency,
  deduplication, rollback, and release-order metadata; exact provider references
  plus provider-owned decoder/redaction metadata remain in the compiler
  reference handoff for the substrate to join. The two qualified Fluree
  provider tasks stay cold, while task 7.4 alone proves their single
  acquisition/release and failure cleanup through the real substrate.
- Close bootgraph authority before its owner lands and repair its input boundary
  without reopening the sealed owner receipt. Completed documentation-only task
  6.1a routes exact bootgraph mechanics solely to canonical
  `HABITAT_RUNTIME_REALIZATION` §17, and completed task 6.2 created the complete
  private package-less `runtime-bootgraph@1` owner and full synchronous
  `orderBootgraph(...)` implementation from compiler-owned `BootgraphInput`.
  Documentation-only task 6.2a now freezes Proxy admission across the exact two
  canonical system documents and these six active OpenSpec artifacts; the active
  `app-runtime-realization` capability spec alone retains archive-safe acceptance
  without copying the canonical TypeScript block. Pending documentation-only
  task 6.2a.1 corrects the build-config law across that same exact
  eight-document corpus and is the sole active documentation node. Canonical
  runtime §17 remains the sole mechanics owner: source keeps the emitted
  `node:util/types` subpath import, while pinned tsdown 0.22.14 audits the
  package-root allowance, so the retained neutral `deps.onlyImport` array gains
  `node:util` exactly once after `node:crypto` and never contains literal
  `node:util/types`. The correction changes no implementation or config. After
  it lands, task 6.2b resumes as the same three-file repair: exact `isProxy`
  from `node:util/types` refuses active and revoked
  Proxies at the shell or any nested record/array, and refuses a proxied
  prototype, before any caller-trapping operation, result, trap, getter,
  callback, or external work. It preserves the neutral build, exact owner
  closure and sole compiler edge, and absent public/SDK/task-7 surfaces. Only
  after that repair does unchanged one-file task 6.3 resume its exhaustive
  reachable-input and successful-output proof. The owner gains the real
  `@habitat-ai/sdk -> runtime-bootgraph` edge only in task 10.6 when terminal
  `startApp(...)` composition imports and calls the operation.
- Keep Effect lifetime authority with the app/process and native execution
  authority with the selected bridge. Public `effect/context` and `effect/wrap`
  carry the process-owned Context, resource lifetime, policy, and telemetry;
  synchronous or Promise-returning oRPC operations use inline `.handler`, while
  Effect-backed operations use the official implementation-owned
  `@orpc/experimental-effect` `.effect` extension installed once in the service
  implementation. Its internal `handlerGen` is mechanism evidence, not a
  Habitat-authored or directly callable API, and
  `ProcessExecutionRuntime` never executes oRPC service Effects. Reject manual
  or custom Effect runners.
- Define harness as one platform kind with a shared lifecycle contract, then
  realize Oclif first and retain explicit Elysia and Inngest extension points
  without encoding their native semantics in runtime mounting or observation.
  Export the import-safe descriptor, native-handle, and process-local
  liveness/readiness contract needed by external companion harnesses. Each
  `startApp(...)` invocation owns only its selected process lease, managed
  runtime, resources, native handles, immutable
  `{ app, process, entrypoint, deployment, source }` launch identity, and stop;
  it cannot control a sibling invocation. MCP remains a `server` surface and
  process projection, never a role, kind, app, service, provider, deployment
  unit, or lifecycle owner. Habitat authors no MCP face or native MCP SDK
  implementation in the runtime spine. A later conditional fixture may attach
  independently versioned `mcp-openapi@1.0.0` through the public companion
  contract, but never from Magic's copied tarball or with an unsupported prompts
  claim.
- **BREAKING** Remove the flattened `apps/cli`, `apps/server`, `apps/hq`, and
  `apps/web` identities from Habitat. Platform capability moves to the Habitat
  self-host, its control-plane API plugin, or another qualified platform owner;
  proven product capability moves to Rawr; the rest is deleted. Retain no
  compatibility app, alias, fallback, or duplicate Nx identity.
- Cross one bounded publication barrier for the command migration: Gate A
  accepts and lands the sole public/candidate `HabitatCommand` contract while
  the remaining private `RawrCommand`/`RawrResult` source and readers remain
  unchanged; an earlier semantic sieve deletes only condemned closures with no
  retained capability and Gate A revives none of them. Gate B publishes and
  registry-smokes only the exact SDK/CLI pair from accepted main; Gate C starts
  only from that receipt, moves the root Nx bootstrap to that exact registry
  CLI, migrates surviving readers, and deletes both Rawr symbols and every
  predecessor reader without a shim, alias, fallback, or dual public authority.
  This is release ordering, not retained compatibility. Replace Habitat-side
  Rawr workspace discovery with explicit Habitat workspace input. Product-owned
  Rawr configuration transfers with its product owner. Agent-plugin lifecycle,
  development/repository
  operations, native Oclif plugin mechanics, and CLI generators are Habitat
  capabilities. Current doctor, HQ graph, reflect, routine, tools-export,
  workflow-harden, config, journal, security, hello, and the predecessor
  agent-plugin creation surfaces are deleted rather than renamed when their
  current implementation has no generic Habitat owner.
- Keep the runtime substrate inside the sole public runtime and authoring
  distribution, `@habitat-ai/sdk`. Keep `@habitat-ai/cli` as the separate
  public Oclif executable package and expose its one consumer Oclif host
  entrypoint for private downstream apps; do not publish internal runtime phases
  or harnesses as a package cohort.
- Hold the mixed native-telemetry source root as adoption evidence. Before core
  reservation, re-author its path-qualified OpenTelemetry resource/provider and
  core-singleton retirement into fresh Habitat-owned nodes; do not restack or
  merge the predecessor root. Distribute that selected provider through the
  optional `@habitat-ai/sdk/telemetry` integration subpath rather than another
  package or the CLI host. After runtime lands, re-author each admitted profile,
  process, and harness obligation beside its final owner, then retire the held
  source only after destination acceptance. Downstream products select only the
  released integration from their own repositories.

## Capabilities

### New Capabilities

- `blueprint-definition-composition`: Blueprint-owned authoring directories
  organize the existing ordered schema-v1 rule surface, recursively ship every
  referenced asset with byte parity, and reserve `include` / `contains` for a
  separately gated future extension without expanding instance authoring.
- `app-runtime-realization`: The constitutional app, profile, compiler,
  provisioning, process-runtime, adapter, and observation lifecycle.
- `runtime-harness-boundary`: The generic native-host mount and stop contract
  plus bounded Oclif, Elysia, and native Inngest realizations whose native stop
  operations own any drain semantics, and the public descriptor/health contract
  for independently versioned external companions.
- `repository-separation`: Habitat contains no downstream product source, Rawr
  owns its product closure, and Marketplace remains an independent content
  repository.

### Modified Capabilities

- `habitat-shared-blueprint-resolution`: Exact blueprint versions coexist as
  immutable complete closures; successor selection never inherits or falls back
  across versions.
- `repository-ratchet-runtime`: Subprocess acceptance moves from the deleted
  generic test-utils package to the CLI or semantic owner whose behavior it
  proves.

### Removed Capabilities

- `rawr-cli-application`: Habitat retires this product capability after an
  owner-local Rawr OpenSpec receives the application contract and the
  independent Rawr repository lands.

## Impact

- App and runtime Habitat blueprints, Nx project identities, import boundaries,
  and AGENTS routing.
- `@habitat-ai/sdk` public authoring and runtime surface plus private,
  package-less Nx runtime projects whose exact outputs assemble into that one
  public package.
- Habitat control-plane and Oclif source/compiled entrypoints, command mounting,
  error handling, cancellation, drain, the task 2.8 publication barrier, and
  official oRPC/Effect bridge ownership.
- Current peer app roots and the telemetry change's runtime prerequisite.
- No provider-home mutation, marketplace settlement, Marketplace-repository code
  sharing, app-composition repair outside the canonical runtime, or new public
  package cohort.
