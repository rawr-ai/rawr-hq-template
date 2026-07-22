# Complete Agent-Plugin Lifecycle Public Interface

## Status

`EXECUTING_STANDARD_CLI_ARCHITECTURE`

The user rejected the custom controller distribution and custom Oclif extension
manager after an installed-system audit showed that they form a private CLI
package/version manager rather than a necessary agent-plugin lifecycle boundary.
[[authority-amendment]] is now controlling.

Implementation is proceeding as independently green Graphite checkpoints.
Provider settlement remains closed until the conventional installed CLI and
bounded lifecycle path land. No canonical provider home, Personal record,
repository release, or HF01 candidate was mutated by this correction.

## Canonical Repositories

| Repository | Canonical identity at correction | Role |
| --- | --- | --- |
| RAWR HQ-Template | `main` / `b7a98c567f4519e5d84229fafacd0a4179875c9c` | Executable code, Oclif CLI, services, resources, generic tooling |
| Personal RAWR HQ | `main` / `a4201247795d1fa18d46ecab206515e33660a171` | Curated agent content, provenance, policy/evaluation, governed records |

Active Template execution is isolated on Graphite branch
`codex/agent-root-simplify-cli-lifecycle` in
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-root-simplify-cli-lifecycle`.
The branch started clean from canonical Template `main`. The clean Personal
primary and unrelated worktrees remain outside this initiative's write set.

The packet provenance remains Personal commit
`cc631f60c9254802be647d66662823ae47d5e7db`, project tree
`97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`. The superseding repository
separation record remains Personal commit
`43a49d48ab6c6a29b4877f20576b42b533fc82ba`, blob
`10bb040317d62834806b86b36a3a14f13c539fbc`. These are provenance, not Git
ancestry or executable inputs.

## Corrected Product

```text
Template source
  -> Nx build and release
  -> ordinary Oclif package and installer
  -> rawr
     -> rawr plugins          (@oclif/plugin-plugins)
     -> rawr agent plugins    (bounded oRPC lifecycle service)
        -> Personal closed release input
        -> exact selected Git objects
        -> in-memory closed release model and provider projection
        -> native Codex/Claude inspect and reconcile
        -> verify live state
```

Personal never becomes equivalent to Template. A Personal repository path is
only a content locator. Template implementation is neither merged nor copied
into Personal.

## Audit Result

The rejected controller installation contains approximately:

| Item | Observed scale |
| --- | ---: |
| Manifested entries per release | 18,568 |
| Size per retained release | 238 MiB |
| Bun runtime per release | 60 MiB |
| Application/dependency data per release | 175 MiB |
| Per-file integrity envelope | 3.1 MiB |
| Retained local versions | 10 |
| Retained storage | 2.3 GiB |

The entrypoint ultimately loads the ordinary `@rawr/cli` Oclif application.
The legitimate agent-plugin reconciler lives inside that application; Codex and
Claude do not consume the custom controller format.

Static source audit found approximately 20,000 lines across the controller
builder, release format, selector/launcher, authority resource, CLI bootstrap,
and custom extension manager. Their circular downstream references do not make
them product authority.

## Durable Decisions

| Concern | Decision |
| --- | --- |
| CLI dispatch | Oclif |
| External CLI extensions | Direct `@oclif/plugin-plugins` |
| Build, cache, version, release | Nx and Nx Release |
| Architecture policy | Habitat closed topology plus Grit source relationships |
| Curated desired state | Personal Git-reviewed closed release input/channel record |
| Installed provider truth | Native Codex/Claude inventory in the explicit home |
| Provider mutation | Native provider commands through thin adapters |
| Provider package bytes | Selected Personal Git marketplace; native provider owns its snapshot/cache |
| App/runtime composition | Separate architecture migration |
| Destination/export realization | Separate architecture migration |
| Inngest HF01 | Pending; exact skill identities, payload paths, and repository candidate roots must be excluded and proven by Personal content policy |

The conventional CLI package decision remains bounded by current Bun runtime
use. A registry-published Oclif package whose executable requires installed Bun
is acceptable. Oclif standalone Node archives require Node-compatibility
verification. Bun compilation requires Oclif-provided extension behavior
verification. None permits another selector or release store.

## Habitat Provenance

Magic Migration commit `31c4e1ac1944d88b5ae867e46603eddff36142fc`
is the committed source for generic service, API server plugin, and agent-router
patterns. Its current `.habitat` tree is unchanged at the latest inspected
worktree head.

One generic correction is required before adoption: the older service structure
allows only one module `router.ts`, while current Magic modules also use composed
`router/` directories. RAWR will admit either sealed form and reject mixed/open
forms. Magic-specific import aliases and constructor spellings are adapted to
generic relationships rather than copied as false RAWR law.

A standing architecture review found that the first Oclif command-plugin
blueprint had incorrectly classified every `plugins/cli/*` package and required
`rawr.kind=toolkit`, contradicting the canonical
`plugins/cli/commands/<capability>` projection topology. The corrected packet
uses placement as identity, removes the second metadata classification, and
keeps the CLI family, package, and source roots closed. Command-plugin manifest contracts
execute the official generator through Bun. All 24 Grit fixtures,
the blueprint-packet topology check, and the live direct-entrypoint rule pass;
the package move is recorded separately by task 2.3a while the verb-first vendor
command move keeps task 2.3 open.

The Oclif configuration rules now anchor their JSON constraints at the parsed
document root. This preserves the positive package and compiler constraints
without diagnosing nested `scripts`, dependency, `oclif`, or `compilerOptions`
objects as package roots. The app rule currently locks installed identity,
binary, the declared native extension dependency, command discovery, and the
TypeScript mapping. Task 2.2 tightens native extension composition and task 3.3
tightens generated-manifest packaging only when those behaviors exist. The
configuration fixtures and both live rules pass with zero diagnostics.

The Template Habitat consumer already pins the newest published Civ7 artifact:

| Field | Value |
| --- | --- |
| Release | `habitat-sdk-v0.1.1` |
| Source commit | `177d08eafcaf270daec31d76524065de99aeaff8` |
| Bun | `1.4.0` / `a215285063c9b7b0d4b3f87bd298d4fecfd93897` |
| Darwin arm64 SHA-256 | `6a73c416233f2190c57ff4ff9236609e6611e953c3d18b16885052b7be2737fd` |
| Linux x64 SHA-256 | `b795af90bb08384c4c1c606121ba4306c2cc700e1bd7ca686e1301508a8a72c5` |

Newer Civ7 SDK source is not yet published as a compiled artifact and is not
claimed or vendored here.

## Core Toolchain Grounding

The current Civ7 studio-refactor and final-ratchet tips (`f9345ee958` and
`80c1637f5e`) share one core toolchain baseline. RAWR adopts the responsibilities
rather than copying configuration blindly:

| Concern | Civ7 baseline | Template disposition |
| --- | --- | --- |
| Bun runtime | `1.3.14` | Keep; the separately pinned Habitat artifact remains a Bun 1.4 build |
| Biome | `2.5.3` | Adopt required workspace hygiene and formatting |
| lintEffect | `@catenarycloud/linteffect@0.0.6` | Expose as an advisory owner command, not a universal push gate |
| Nx | `23.1.0` | Adopted as exact `nx` and `@nx/eslint-plugin` pins |
| TypeScript compiler | native `7.0.2` | Make normal `tsc`/typecheck authority |
| TypeScript compiler API | `6.0.3` | Keep as the `typescript` package for build-tool consumers |
| TypeScript fallback | `6.0.2` | Expose only the narrow `tsc6` compatibility command |
| ESLint / parser | `9.39.2` / `8.54.0` | Keep Template's newer `10.0.3` / `8.57.1`; do not downgrade for parity |
| TypeBox | `1.3.6` | Already aligned |
| oRPC | `1.14.6` | Upgrade as a separate behavior-reviewed vendor change |
| Effect / Platform | `3.21.3` / `0.96.1` | Already aligned; add Effect-oRPC only where consumed |

TypeScript 6 and 7 are a split of responsibilities, not a doubled CI matrix.
Biome owns fast general hygiene; ESLint remains the boundary-rule leaf; Habitat
owns positive architecture topology and source relationships. Full-corpus
lintEffect is intentionally not part of the required push ratchet because its
cold-run cost is an upstream limitation rather than repository admission logic.

The Biome tooling checkpoint pins Biome `2.5.3` and lintEffect `0.0.6`, carries
the narrow upstream severity compatibility patch byte-for-byte from Civ7, and
exposes both commands through the Habitat consumer's Nx project. A frozen Bun
install applied the patch; the Biome lint leaf inspected 1,180 files in
327 ms; the Habitat consumer's lint, typecheck, four tests, and bounded packet
check passed. A focused disposable lintEffect source produced the expected
patched diagnostic and was removed without recursive cleanup. lintEffect
remains advisory.

The separately reviewed mechanical checkpoint formatted 1,178 files in 660 ms,
changing 817, and organized imports across 1,180 files in 318 ms, changing 467.
The changes were split by application, lifecycle service, remaining services,
packages/resources, and tooling; repeated formatter and import checks are
idempotent. Changed-owner lint, typecheck, and completed non-CLI behavior suites
pass. A source-order review found no reordered side-effect registration. Two
existing Nx target-graph defects remain explicit inputs to task 1.6 rather than
being hidden in the mechanical change: the DevOps Oclif fixture requires its
build output but its test target does not declare that prerequisite, and the
native-provider aggregate duplicates its nested provider test ownership when Nx
runs both scopes in parallel. Build-then-test and each non-overlapping provider
owner pass. A separate semantic checkpoint realigned the stale
runtime-realization structural and evidence literals from Effect `3.21.2` to
the installed `3.21.3`; its structural gate and focused vendor behavior now
pass together. The full CLI test target remained live without output beyond
three minutes and was stopped; its focused 40-test command smoke passed. The
following Nx topology checkpoint made the same complete owner observable and
green in 89 seconds without weakening its serialized filesystem execution. The
admission checkpoint now makes the complete Biome formatting, lint, and import
organization check required, so task 1.5b is complete without putting advisory
lintEffect in the required gate.

The exact Nx migration pins `nx` and `@nx/eslint-plugin` to `23.1.0`, refreshes
the lockfile, and applies the official required migration set. The only durable
migration output outside dependency metadata is the official
`.claude/worktrees` ignore entry; the release-tag migration made no semantic
configuration change. At that migration checkpoint the workspace remained at
47 projects with 35 build, 47 lint, 44 typecheck, and 32 test owners. Project
discovery, graph generation, sync checking, all applicable non-root affected
lint/typecheck owners, the CLI build, and the Habitat consumer tests pass. The
root `lint` owner exposed the already
present recursive aggregate that task 1.6 removes; it is not hidden as an Nx
23 regression or folded into this dependency-only checkpoint. No Nx Release
configuration or controller-coupled publication target was added.

The following task-topology checkpoint removes the recursive root `lint` owner
while retaining the root operator command over the 46 actual lint owners. Its
cached full lint run completes in 3.1 seconds. The DevOps plugin test now
declares and executes its build prerequisite; build plus four behavior tests
complete in 6.0 seconds. Native-provider testing is disjoint: the resource owns
seven contract tests while the Codex and Claude projects own eight adapter tests
each, and all three owners complete together in 1.2 seconds. The CLI project
retains serialized file execution; an explicit Nx stream run reports file-level
progress, and all 254 tests complete in 89 seconds. The remaining duration is
dominated by the 17-test controller artifact-store file scheduled for deletion,
so this checkpoint does not optimize that rejected mechanism. The provider
adapter projects also declare their dependency on the shared provider contract,
so an affected run cannot omit their behavior tests after a shared change.

The required admission command now has explicit owner boundaries. A
TypeBox-validated Nx project-graph check requires exactly one `type:*` kind on
every non-root project, then requires lint and typecheck on every code project;
only content and fixture projects are exempt from those targets. Five Nx-owned
tests prove accepted, missing-kind, ambiguous-kind, missing-target, and
invalid-graph transitions. Nx then selects the affected lint/typecheck task set.
Biome verifies repository formatting, lint, and import organization; its cache
key covers the complete candidate tree so formatter configuration and supported
file classes cannot restore a stale result. Four Habitat consumer tests protect
manifest validation and provisioning; the repository-separation guard preserves
the independent-repository boundary; and the lifecycle Habitat rule evaluates
the live command-channel topology without using the Nx cache. Domain behavior
and exact-Git tests remain owner-local rather than hidden inside merge admission.

Against the final owner topology, the first recorded complete run covered 47
projects and restored all 93 lint/typecheck tasks in 85 ms. The Nx admission
tests restored in 19 ms; Biome checked all 1,184 admitted files in 652 ms after
the record changed; the Habitat consumer tests restored in 17 ms; repository
separation passed; and live Habitat completed in 577 ms. Total wall time was
4.9 seconds. The immediate unchanged repeat restored the Nx admission tests in
15 ms, all 93 lint/typecheck tasks in 77 ms, Biome in 15 ms, and the Habitat
consumer tests in 14 ms. The project-graph law and repository-separation guard
reran, as did live Habitat in 322 ms; total wall time was 3.25 seconds. A
separate uncached run of the five Nx admission tests plus their lint and
typecheck owners completed in 952 ms.

The workflow remains named `Repository Ratchet`; its job publishes the context
`Required lint, typecheck, and topology`. Full-history checkout plus
`nrwl/nx-set-shas@v5` provides the candidate comparison for pull requests,
merge groups, and main pushes. Live ruleset `19508824` is active on `main`,
strictly requires that exact job context, has no bypass actors, and reports that
the current user can never bypass it. Local pre-push remains feedback; the
remote result is merge authority.

## Native Marketplace Grounding

A disposable Codex 0.144.6 probe used the absolute native binary and an isolated
home. A local marketplace registration retained the exact source directory and
became unreadable after that directory moved. This disproves immediate cleanup
of a registered local source. The same native CLI accepts Git marketplace
sources and an exact `--ref`; canonical convergence therefore uses the selected
Personal Git marketplace and provider-owned clone. Claude's native CLI accepts
URL/GitHub marketplace sources, but exact immutable tag/SHA resolution remains a
required Personal-settlement proof before approved-home mutation. A disposable
local source is valid only for the same bounded lifetime as its disposable home.

## Standing Reviews

Architecture, TypeScript/structural quality, and behavior/testing review every
semantic slice. These subject roles remain standing and join a review when the
slice touches their boundary:

- Oclif/Nx release architecture for CLI build/package/release;
- oRPC and Effect-oRPC for contract/router/context/integration;
- Effect/Platform for filesystem, process, and resource lifetime;
- TypeBox for schema and generated-type authority;
- newest Personal-worktree Inngest compatibility for protected content,
  package closure, or provider settlement.

The Inngest review uses
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/7d03/rawr-hq/plugins/agents/dev/skills/inngest/SKILL.md`
at commit `75053b308f10dc3b37f94fdf774980b4febf24c9`, not the stale installed
skill. It cannot authorize HF01 materialization or release.

## Current Gates

| Gate | State |
| --- | --- |
| Corrected authority record | Complete on the active Template branch; pending Graphite submission |
| Generic Habitat blueprint port | Complete on the active Template stack; bounded generic live-tree activation remains pending |
| Generic Oclif blueprint source | Complete on the active Template stack; implementation conformance pending |
| Complete Nx lint/typecheck target population | Complete and wired through affected admission on the active Template stack |
| Typechecked Habitat consumer and TypeBox release manifest | Complete on the active Template stack |
| Civ-aligned Biome/Nx/TypeScript toolchain | Biome admission, bounded CLI proof, and exact Nx 23.1 migration complete; TypeScript remains pending |
| Positive Habitat/Nx ratchet | Required lifecycle topology active; broader generic live-tree policy remains task 1.5 |
| Direct Oclif development and external extension path | Direct source/built entrypoints complete; native extension-manager activation pending |
| Conventional CLI package/release | Pending |
| Custom controller/extension deletion | Pending |
| Persistent agent artifact/projection store deletion | Pending |
| Bounded lifecycle simplification | Pending |
| Personal content-only recut | Pending |
| Disposable provider acceptance | Pending |
| Approved-home settlement and read-only repeat | Pending |
| Repository/stack/worktree closure | Pending |

The generic Habitat blueprint port is a separate checkpoint. Twenty-six files
come from Magic Migration commit `31c4e1ac1944d88b5ae867e46603eddff36142fc`;
rule identity changes are limited to the RAWR niche and
`@rawr/habitat-consumer` owner. The one intentional source-law extension admits
a closed optional module `router/`, requires a plain map in `router/index.ts`,
and validates a canonical authored import/use edge through module `router.ts`.
The pinned Grit engine cannot prove optional cross-file participation without
emitting collection diagnostics, so that remains an explicit native-tool gap
and review responsibility rather than a custom parser.

The first live generic-owner probe exposed the broader policy-execution gap that
remains in task 1.5: the published Habitat v0.1.1 consumer ran longer than four
minutes without completing a full generic check, and a structure-only probe ran
longer than one minute. Both probes were interrupted without repository
mutation. Civ7 has unreleased exact-root batching and traversal reuse, but no
new compiled artifact exists; Template does not call a worktree or vendor that
source. The source port therefore does not claim task 1.2 or ratchet activation
complete before executable verification is both green and bounded.

The RAWR-authored Oclif blueprint source is a separate positive checkpoint. It
defines one closed executable app shell, one uniform host-composed
command-plugin shell, direct production/development entrypoints, compiled
command discovery, an explicit TypeScript source-to-output mapping, a
package-owned `oclif manifest` command inferred by Nx, default command exports,
no command-plugin-to-command-plugin dependency, and rejection of mechanical
package-directory imports. TypeScript package exports and Nx own the remaining
public dependency boundary. The packet does not encode a product command
inventory, retired mechanism names, or `nx release` as a project target.

Four Grit patterns pass all twenty-four canonical and rejection samples. Isolated
Habitat structure fixtures accept both app and plugin shells with generated
`oclif.manifest.json` files present, then reject a second app entrypoint and a
plugin-owned `bin` directory with exact closed-topology diagnostics. The
app/plugin structure work completes in 7-19 ms inside the bounded fixture. The
five command-plugin packages now inhabit the closed
`plugins/cli/commands/<capability>` topology. Task 1.5 still owns the remaining
workspace-wide Habitat activation and an honest disposition for the published
SDK's unbounded wildcard walk on the live dependency tree.

The package checkpoint uses the official Oclif pattern-discovery manifest
generator as an Nx cached output after `build`. Oclif does not sort asynchronous
filesystem discovery and exposes no ordering flag, so the generated manifest is
ignored development output and its sorted command IDs and structure are the
contract; byte-order identity is not. The manifest and build hashes include the
root TypeScript configuration. This follows
[[design#Nx owns build and release|the conventional release boundary]] without
a command registry, canonicalizer, or build-twice gate.

The uncached five-package build, test, lint, typecheck, and manifest matrix passes
27 behavior tests in 23.8 seconds. Repeating its ten build/manifest tasks is a
100% Nx cache hit in 27 ms. The four selected Habitat rules pass in 10.1 seconds,
with the two structure rules sharing one 8.8-second traversal. The closed
`plugins/cli` scope admits only `commands`, so an old sibling package topology
cannot return.

Each package now exposes production and test typechecking as separate inferred
Nx targets. The admitted `typecheck` target depends on `typecheck-tests`, while
its production-only inputs keep a test edit from invalidating the source check.
The ten-task uncached run passes in 12.8 seconds; after cache population, the
unchanged repeat is a 100% cache hit in 25 ms.

The direct-entrypoint checkpoint replaces the controller bootstrap with Oclif's
standard `execute` call in both development and compiled entrypoints. A focused
behavior test runs both forms with an allowlisted process environment and one
guarded disposable home, rejects an app-root generated manifest, compares the
complete sorted command-ID inventory, and observes `agent:plugins:status` in
both modes. A third case loads every command plugin with Oclif's manifest cache
disabled and proves that development discovers `src/commands` while production
discovers the same IDs from `dist/commands`. The three-case suite passes in 6.0
seconds. The pre-existing integration oracle now exercises ordinary Oclif help
and unknown-command behavior instead of requiring controller identity. CLI lint
and typecheck pass in 14.7 seconds. App manifest generation and publish metadata
stay deferred to task 3.3, so a partial generated manifest cannot hide missing
or stale plugin output.

The complete CLI suite is green at 254 tests, but its uncached target takes 3
minutes 30 seconds. A predecessor artifact-store file alone took 98.3 seconds in
the preceding diagnostic run. This is not accepted as healthy test
infrastructure: tasks 4 and 5 delete the custom distribution and persistent
artifact verticals that dominate it rather than optimizing rejected machinery.

The earlier owner-qualified lifecycle dependency mega-pattern is retired rather
than carried into the corrected ratchet. It enumerated package names, exact
composition files, and the now-rejected artifact/evidence repositories. Those
are transient implementation details, not one reusable structural axis. The
generic service and Oclif blueprints, TypeScript package boundaries, and Nx
project graph now carry the applicable reusable constraints; the remaining
lifecycle niche rule is limited to the curated command channel until task 2
replaces that topology.

The generic blueprint packet filename set is now closed: every current packet
contains its rule, locked baseline, and one canonical `pattern.md` or
`structure.toml` runner source. The current structure rule proves only the
closed allowed filename set; it cannot prove that `rule.json` selects exactly
one present runner source. The pinned Habitat binary also does not expose a
native packet-fixture runner, and its live wildcard walk is not bounded against
installed dependency trees, so this repository does not add a parallel
Markdown fixture parser or wrapper. Exact selected-runner participation, native
pattern fixtures, and full live-tree policy activation remain open until a
suitable standalone asset is published.

Personal PR #182 (`9378d33b`) and child PR #183 (`852702b8`) are not valid
settlement inputs in their controller-bound form. They remain unlanded; prior
required jobs were blocked before runner allocation by account billing. Do not
bypass the gate. Recut or close them under [[tasks#6. Personal Content-Only Settlement]].

The existing repository `immutable-releases` setting was enabled during the
earlier controller work. It authorized no release dispatch. This correction
does not churn the setting or perform another repository mutation; any future
repository release action waits for the conventional CLI release container.

## Settlement Oracles

The final product must prove:

1. source and installed CLI expose the same Oclif core commands;
2. native external Oclif extension lifecycle works in a disposable home;
3. one closed Personal release set has unique skill ownership;
4. `cognition:state-machine-design` refreshes under the same provider plugin ID;
5. omitted RAWR-managed enablement/configuration residue is removed;
6. unmanaged collisions are preserved and block before mutation;
7. partial failure reports its exact applied prefix and retry converges from
   live inspection;
8. a converged repeat writes no lifecycle state and calls no native mutating
   command.

Fresh-process visibility does not alone prove an already-running Codex Desktop
task refreshed. Record that operational limit without building app/runtime
composition.

## Historical Disposition

Earlier C1-C6 commits and their tests remain Git history and migration evidence.
They do not bind the corrected design. Useful provider behavior, TypeBox models,
service topology, and test cases may be retained. Controller identities,
launcher proofs, transfer mechanisms, export/undo machinery, issuer/promotion
ceremony, and app-composition work are not preserved merely because they landed.

No custom compatibility layer connects old and new installations. Once the
ordinary CLI is installed and smoke-tested, old controller-store bytes are
inert. The initiative does not acquire authority to scan or erase them.

## Related

- Controlling correction: [[authority-amendment]].
- Target architecture and decisions: [[design]].
- Change summary: [[proposal]].
- Active execution: [[tasks]].
