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

The ordinary requirement is narrower: install one versioned RAWR Oclif CLI from
RAWR HQ-Template, run one bounded agent-plugin reconciler inside it, and delegate
provider mutation to the providers' native commands. Local accidental
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

- **Objective:** make RAWR HQ-Template a normal Nx-built Oclif application with
  uniform command plugins and one bounded oRPC agent-plugin lifecycle service;
  keep Personal RAWR HQ content-only; then prove native Codex and Claude
  convergence and a mutation-free repeat.
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
- **Closure:** conventional CLI package is landed and installable; custom
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
| Inngest candidate | `HF01_PENDING`; excluded from this workstream's selected Personal release input and every initiative mutation path while pending |

A repository path is a content locator. It is never CLI identity, provider
identity, release identity, or Git ancestry between repositories.

## Target Flow

```text
RAWR HQ-Template source
  -> Nx build and release
  -> registry-published Oclif application package group requiring installed Bun
  -> normal installer exposes `rawr`
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

Development uses the same Oclif application through Nx without an installed
controller. This release uses a fixed Nx Release package group whose executable
requires installed Bun because surviving first-party runtime code uses Bun-only
APIs. Oclif's Node-bearing standalone archives and whole-application Bun
compilation are outside this workstream. The selected package group does not
authorize another selector or version store.

## Component Disposition

| Component | Disposition |
| --- | --- |
| `scripts/controller/**` | Delete after direct source/built Oclif equivalence and native extension acceptance |
| `packages/controller-release/**` | Delete |
| `resources/controller-authority/**` | Delete; rehome only narrow surviving checks at their actual owner |
| `apps/cli/src/lib/controller/**` | Delete |
| `packages/core/src/cli/controller-reentry.ts` | Delete |
| Controller release workflow, installer, selector, launcher, diagnostics | Replace with Nx/Oclif build, package, release, and ordinary installation |
| `apps/cli/src/lib/external-extensions/**` | Delete |
| Local wrappers for Oclif `plugins` commands | Delete; enable `@oclif/plugin-plugins` directly |
| `apps/cli/bin/run.js` and `apps/cli/src/index.ts` | Restore to ordinary Oclif entrypoints |
| `services/agent-plugin-lifecycle` | Keep one service; simplify to bounded desired-set validation, native reconciliation, and justified adjacent capabilities |
| `resources/native-agent-provider` | Keep as thin native Codex/Claude process adapters |
| `resources/content-workspace` | Keep only explicit Git read and repository validation |
| Persistent agent artifact repository, projection store, and retention planner | Delete; canonical operations derive from selected immutable Git objects and use native Git marketplace distribution |
| Provider target receipts and identity sidecars | Delete; disposable tests return inline per-target observations |
| Custom mechanical-evidence store | Delete; ordinary CI may retain the command result as an external artifact |
| Export destination resource | Transfer to the dedicated destination architecture or delete after its owner decides; never revive legacy export here |
| Personal controller pinning and per-file runtime envelope | Delete and replace with content membership, ownership, and governed records |

Delete each obsolete writer and reader in the same semantic change. Add no
compatibility alias, dual format, migration state, cleanup authority, or
fallback. Existing obsolete bytes on disk may become inert; the corrected
product does not acquire a scanner merely to erase them.

## Positive Architecture Ratchet

The ratchet narrows possibility by kind rather than listing forbidden legacy
names.

- **Service:** one closed service spine; module-owned `model/{dto,policy,schema}`;
  module contracts and routers; root contract, implementation, context, and
  router composition. Procedure handlers own domain behavior. Effect remains at
  resource/provider boundaries unless a procedure genuinely requires an Effect
  program.
- **CLI app:** one Oclif entrypoint, one binary declaration, one Oclif package
  configuration and core-plugin composition; Nx project targets own build,
  generated-manifest, and package work, while top-level Nx Release configuration
  owns version/changelog/publish orchestration.
- **CLI command plugin:** one closed package shell and command root; no binary;
  no cross-plugin internal import; commands project through public service or
  client boundaries.
- **Resource:** one capability contract with provider implementations under
  `providers/`; provider mechanics do not become service policy.
- **Repository checks:** Nx owns graph observation and schedules one cached
  workspace lint task plus project typecheck work; Habitat owns admitted
  structure, source, and graph policy; required CI exposes one non-skippable
  result for the candidate revision.

Magic Migration commit `5a974f0047f0667c2e429fdb4193a0e237b067c4`
is the source for the API plugin and agent-router patterns. The generic service
packet was founded from committed Magic Migration source
`543e78eddd00ef6cfccfdf3ae366143b6034f012`, service-blueprint tree
`2a9160183b80badacedbb6006b95829bd166470a`. Its anchor, contract, and oRPC
composition laws now follow the corrections at Magic Migration commit
`32edafcbdcd84132da2e6eb8844ce9d0530ddcce`, service-blueprint tree
`89446f8be81b1f417aa4f292034a20851c796561`. RAWR adaptations to shared laws
are limited to `ownerProject`, `placement.niche`, the canonical
`@rawr/hq-sdk` TypeBox bridge, and RAWR prose identity. The RAWR packet contains
the six shared source laws and one shared topology law, plus three
Template-owned extensions for platform independence and private-alias
configuration/ownership. The compiled Habitat consumer pins Civ7
`habitat-sdk-v0.1.6`, source
`ca5fe0eafb14a310a310bb2ebc49ca1dbe84860b`, built natively with Bun 1.4 for the
temporary Darwin arm64 lane.

## Behavioral Boundary

Tests assert the product transitions:

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

The Inngest role is compatibility-only. It cannot materialize, package, export,
release, or mutate HF01 candidate bytes.

## Execution Rule

The next durable changes follow [[tasks]]. First land this correction and the
positive Habitat/Nx ratchet, then restore conventional Oclif execution and native
extension management. Inventory the release form, delete the superseded
distribution and persistent lifecycle state, migrate the surviving resource
family to Effect 4, and only then package the actual surviving runtime closure.
Simplify Personal records after the ordinary CLI release lands. No provider or
repository release mutation occurs until the replacement path is landed and its
owning behavior checks pass.
