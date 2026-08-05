# Native CLI And Bounded Reconciler Authority Amendment

## Authority

This amendment records the user's categorical correction after the installed
CLI distribution audit. It supersedes every active or archived initiative
clause that makes a custom RAWR controller, controller release store,
controller selector, per-file runtime envelope, or reconstructed Oclif plugin
manager part of the target architecture.

The accepted design-packet provenance and repository-separation amendment remain
historical inputs. They do not preserve an implementation after its underlying
model has been rejected. This amendment controls the remaining implementation,
review, landing, settlement, and closure recorded in [[README]], [[proposal]],
[[design]], and [[tasks]].

## Categorical Correction

The initiative conflated three different concerns:

1. installation and versioning of the RAWR CLI;
2. lifecycle selection for curated agent plugins; and
3. native provider reconciliation.

The bespoke controller distribution then made its own digest, launcher, release
store, retained versions, per-file manifest, and Oclif extension reconstruction
look authoritative because later code was written to consume them. That is
circular complexity, not a product requirement.

The ordinary requirement is narrower: run one normal private `rawr` Oclif application,
keep one bounded agent-plugin reconciler inside it, and delegate provider
mutation to the providers' native commands. Habitat's separately released SDK
and Oclif CLI supply the platform tooling without making the private `rawr`
application graph public. Local accidental
checkout/worktree confusion does not justify a private package manager or a
hostile-local-tamper model.

The operating environment is one local operator. Production code resolves
ordinary tools such as `git`, `codex`, and `claude` through the process
environment and inherits the operator's configuration. Disposable homes isolate
test state; they are not security sandboxes. This initiative does not
authenticate local executables, neutralize local Git configuration, probe known
tools through help output, or add a second verification protocol around a
successful native command.

## Director Frame

- **Objective:** keep `rawr` a private Nx-built Oclif application with uniform
  command plugins and one bounded oRPC agent-plugin lifecycle service; keep
  Personal RAWR HQ content-only; then prove native Codex and Claude convergence
  and a mutation-free repeat.
- **Hard core:** Oclif owns CLI dispatch and external extension mechanics; Nx
  owns project builds, checks, and releases; Habitat owns positive source and
  topology policy; Personal review selects desired curated membership; the
  lifecycle service validates and derives it; provider homes and native provider
  commands own installed state.
- **Exterior:** custom CLI selectors and release stores, app/runtime
  composition, destination/export realization, provider installer
  reimplementation, repository equivalence, protected candidate release, and
  adversarial local-tamper resistance.
- **Falsifiers:** a reachable custom launcher or controller store; RAWR wrapping
  Oclif's extension registry; lifecycle records that bind CLI-install identity;
  provider mutation outside native commands; Template executable code in
  Personal; an omitted managed member left reachable; or a converged repeat
  that mutates.
- **Closure:** the private Oclif application builds and runs through Nx; custom
  controller and extension-manager code is unreachable and deleted; Habitat,
  lint, typecheck, and focused behavior checks are required and green; Personal
  contains only its content and governed records; disposable and approved homes
  converge through native commands; the repeat is read-only; repositories,
  Graphite stacks, and owned worktrees are clean and drained.

## Working Vocabulary

Use standard operational engineering terms. A compound term is permitted only
when it establishes a different kind of object or invariant.

| Bag | Terms |
| --- | --- |
| Identity | CLI, package, version, plugin, content, provider, source |
| Boundary | app, service, resource, plugin, repository, provider home |
| Flow | build, package, install, invoke, inspect, reconcile, verify |
| Authority | Oclif package configuration, Nx project/release configuration, Git record, native provider state |
| Guarantee | closed, explicit, deterministic, idempotent, observable |
| Derived artifact | in-memory release set, generated Oclif command manifest |
| Evidence | caller-retained test result, CI artifact, release verification record |
| Cache/index | standard-tool generated manifest or build cache |
| Retired mechanism | controller, selector, launcher, runtime envelope, aggregate, fallback |
| State | source, built, released, installed, selected, converged |

Do not use semantically ambiguous project vocabulary. Use test result,
verification record, evidence artifact, dependency graph, release manifest, or
another standard term that names the actual thing.

## Authority Ledger

| Concern | Owner |
| --- | --- |
| Distributed product | Habitat |
| Supported public distribution artifacts | `@habitat-ai/sdk` and `@habitat-ai/cli` only |
| Private application and command namespace | `rawr`; built and tested through Nx, absent from Nx Release and public publication |
| CLI command discovery and dispatch | Oclif package configuration, core-plugin composition, and installed plugin state |
| External Oclif extension install/update/remove | `@oclif/plugin-plugins` |
| Workspace build, task dependencies, and caching | Nx project targets |
| Versioning, changelog, and publication orchestration | Top-level Nx Release configuration and commands |
| Source topology and source relationship policy | Habitat blueprints and Grit patterns |
| Executable implementation and generic lifecycle tooling | RAWR HQ-Template |
| Curated agent content, provenance, policy/evaluation, channel records | Personal RAWR HQ and its Git review |
| Desired curated release membership and unique skill ownership | One closed Personal release input selected by its governed record |
| Closed desired content | Exact immutable Git objects selected by the reviewed Personal record |
| Provider-specific installable bytes | Selected Personal Git marketplace; native provider owns its snapshot/cache |
| Codex installed state | Native Codex marketplace/plugin commands and live inventory |
| Claude installed state | Native Claude marketplace/plugin commands and live inventory |
| Operational evidence | Caller or ordinary CI/release tooling; never a lifecycle store or selector |
| Inngest skills | `accepted-landed-read-only` on Personal `main`; `dev:inngest` and `dev:effect-inngest` enter only through the normal closed release set, while `inngest-orpc` and research/candidate roots remain excluded |

A Git checkout is a versioned-content and inspection input. Its path is never
CLI, controller, provider, or release identity; Git ancestry between repositories
and repository or symlink synchronization are not lifecycle channels.

Personal source skills reject repository-local `.repos` prerequisites and
symlinks. Current Inngest guidance provides an explicit caller-owned cache-root
source oracle; oRPC, effect-oRPC, and Effect accept exact caller-owned source
roots only when a claim requires implementation inspection. Governed
vendor-content sync copies only redistributed skill bytes. None of these bounded
inputs creates a checkout, repository, or symlink synchronization subsystem.

## Target Flow

```text
RAWR HQ-Template source
  -> Nx builds the private Oclif application
  -> an ordinary development or application host exposes `rawr`
     -> `rawr plugins` delegates to @oclif/plugin-plugins
     -> `rawr agent plugins` calls one oRPC lifecycle service
        -> read the selected Personal content record
        -> read exact selected Personal Git objects
        -> derive one closed release model and unique ownership in memory
        -> select and verify declared provider-visible content in memory
        -> inspect the explicit provider home
        -> reconcile the selected immutable Git marketplace through native Codex or Claude commands
        -> inspect and verify the result
```

Development and application hosts use the same Oclif application through Nx
without an installed controller. This workstream does not publish the RAWR
workspace graph or reserve a later RAWR distribution. Habitat SDK and CLI are
the only supported public artifacts in the current Nx Release group; older
implementation-package versions remain registry-visible but unsupported.

## Component Disposition

| Component | Disposition |
| --- | --- |
| `scripts/controller/**` | Delete after direct source/built Oclif equivalence and native extension acceptance |
| `packages/controller-release/**` | Delete |
| `resources/controller-authority/**` | Delete; rehome only narrow surviving checks at their actual owner |
| `apps/cli/src/lib/controller/**` | Delete |
| `packages/core/src/cli/controller-reentry.ts` | Delete |
| Controller release workflow, installer, selector, launcher, diagnostics | Replace with ordinary Nx/Oclif build and host composition; `rawr` remains private |
| `apps/cli/src/lib/external-extensions/**` | Delete |
| Local wrappers for Oclif `plugins` commands | Delete; enable `@oclif/plugin-plugins` directly |
| `apps/cli/bin/run.js` and `apps/cli/src/index.ts` | Restore to ordinary Oclif entrypoints |
| `services/agent-plugin-lifecycle` | Keep one service; simplify to bounded desired-set validation, native reconciliation, and justified adjacent capabilities |
| `resources/native-agent-provider` | Keep as thin native Codex/Claude process adapters |
| `resources/content-workspace` | Keep explicit local Git and workspace observation or mutation mechanics |
| `resources/versioned-content` | Keep bounded remote observation, materialization, and ancestry mechanics |
| Persistent agent artifact repository, projection store, and retention planner | Delete; canonical operations derive from selected immutable Git objects and use native Git marketplace distribution |
| Provider target receipts and identity sidecars | Delete; disposable tests return inline per-target observations |
| Custom mechanical-evidence store | Delete; ordinary CI may retain the command result as an external artifact |
| Export destination resource | Transfer to the dedicated destination architecture or delete after its owner decides; never revive legacy export here |
| Personal controller pinning and per-file runtime envelope | Delete and replace with content membership, ownership, and governed records |

Delete each obsolete writer and reader in the same semantic change. Add no
compatibility alias, dual format, migration state, cleanup authority, or
fallback. After the direct application replacement is proven, remove the known
predecessor installation explicitly. The corrected product does not acquire a
scanner or cleanup service merely to find historical copies.

## Positive Architecture Ratchet

The ratchet narrows possibility by kind rather than listing forbidden legacy
names.

- **Service:** one closed service spine; module-owned
  `model/{dto,policy,ports,...}` with TypeBox schemas colocated with DTO
  authorities; module contracts and routers; root contract, implementation,
  context, and router composition. No `db` directory is admitted until a
  separately owned database blueprint closes its topology. Operation handlers
  own domain behavior. Concrete acquisition and mechanics remain at
  resource/provider boundaries; handlers may execute Effect programs without
  acquiring those capabilities directly.
- **CLI app:** one Oclif entrypoint, one binary declaration, one Oclif package
  configuration and core-plugin composition; Nx project targets own build and
  generated-manifest work. RAWR workspace projects are private and absent from
  Nx Release configuration.
- **CLI command plugin:** one closed package shell and command root; no binary;
  no cross-plugin internal import; commands project through public service or
  client boundaries.
- **Resource:** one capability contract with provider implementations under
  `providers/`; provider mechanics do not become service policy.
- **Repository checks:** Nx owns graph observation and schedules one cached
  workspace lint task plus project typecheck work; Habitat owns admitted
  structure, source, and graph policy; required CI exposes one non-skippable
  result for the candidate revision.

[[README#Habitat Provenance]] is the single commit-and-tree ledger for the
historical imports and current Magic service lineage. RAWR adaptations preserve
those shared laws while qualifying repository identity, the canonical
`@habitat-ai/rawr-hq-sdk` TypeBox bridge, and one module-router composition face
over named authored router leaves. Template-owned extensions cover platform
independence and private-alias configuration/ownership. Civ7 release
`habitat-cli-v0.1.0` and reviewed source
`d51e8c7454e301bcaba56c8364f5c714d5febca3` remain transfer evidence only.
Template owns the Habitat product source and realizes it through the ordinary
resource, provider, service, plugin, and app graph. Distribution composes those
private owners into the target runtime SDK; the TypeBox bridge and blueprint
catalog are SDK facets rather than separate public product identities.
`@habitat-ai/cli` is the ordinary Oclif release candidate consuming that SDK.
The Habitat Nx projection owns version-three application discovery, exact
inputs, caching, and execution without acquiring service or provider authority.
The idempotent consumer initializer, policy-pack construction, bootstrap
publication, and native version-two service execution are landed. Version-two
Nx projection and the predecessor released-package cutover are landed migration
evidence. Nx owns the SDK/CLI release graph and npm trusted publishing; the
earlier multi-package substrate is migration evidence, not the target package
model.

## Behavioral Boundary

Tests assert the private application and lifecycle transitions:

- ordinary Oclif development invocation and packaged invocation expose the
  same core commands;
- `rawr plugins` uses Oclif-provided extension state in a disposable home;
- `rawr agent plugins status` inspects without mutation;
- sync refreshes a stale same-ID selected plugin;
- sync removes omitted RAWR-managed residue, including native enablement state;
- unmanaged collisions block without mutation;
- partial native failure reports the exact applied prefix and retry converges
  from live state;
- a repeated converged operation invokes no native mutating command and writes
  no lifecycle-owned state.

Source-shape tests are not substitutes for these behaviors. Habitat owns
topology, TypeBox owns public structure and generated types, module policy owns
cross-field semantics, and behavior tests own transitions and outcomes.

## Standing Review Roles

Standing architecture, TypeScript/structural-quality, and behavior/testing roles
review every semantic slice. Subject roles remain standing and are invoked when
the slice touches their boundary:

- Oclif/Nx for CLI composition, build, package, or release;
- oRPC and Effect-oRPC for contracts, routers, context, or integration;
- Effect/Platform for resource, filesystem, process, or lifetime mechanics;
- TypeBox for schema and generated-type changes;
- protected-lane/Inngest for release-input, dependency-closure, or provider
  settlement changes.

The Inngest role remains a subject compatibility reviewer. It does not create a
one-off materialization, package, export, release, or provider path; the accepted
Personal skill bytes move only through the governed closed release set.

## Execution Rule

Remaining work follows [[tasks]]: close Personal content records independently;
run the exact private `rawr` application through Nx against disposable provider
homes; after explicit authorization, reconcile approved homes and verify a
read-only repeat; then archive and drain the workstream. Habitat package
publication is already complete and remains separate.
