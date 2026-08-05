# Complete Agent-Plugin Lifecycle Public Interface

## Status

`EXECUTING_CONTENT_AND_PROVIDER_ACCEPTANCE`

The user rejected the custom controller distribution and custom Oclif extension
manager after an installed-system audit showed that they form a private CLI
package/version manager rather than a necessary agent-plugin lifecycle boundary.
[[authority-amendment]] is now controlling.
[[service-domain-frame]] records the system-level service invariants, flows,
state owners, failure boundaries, and deletion-first implementation sequence.

The private `rawr` Oclif application and bounded lifecycle path are now landed on
canonical Template `main`. Habitat is the platform distribution; the private
`rawr` application is not a release objective. Disposable native-provider
acceptance and independent Personal record closure are the next execution
boundaries. Approved provider homes remain closed until explicit operational
authorization.

## Canonical Repositories

| Repository | Checkpoint base identity | Role |
| --- | --- | --- |
| RAWR HQ-Template | `main` / `093334ff22f47ce864e15b87dd6ca01b1ba0fb0b` | Habitat platform source, private Oclif application, services, resources, generic tooling |
| Personal RAWR HQ | `main` / `7c25bb4b09b3400f6c76913dccfa181171824fed` | Curated agent content, provenance, policy/evaluation, governed records |

Active Template execution uses isolated Graphite worktrees descended from
canonical Template `main`; Git and Graphite retain exact branch/worktree
identity for each independently green checkpoint. The clean Personal primary
and unrelated worktrees remain outside this initiative's write set.

The packet provenance remains Personal commit
`cc631f60c9254802be647d66662823ae47d5e7db`, project tree
`97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`. The superseding repository
separation record remains Personal commit
`43a49d48ab6c6a29b4877f20576b42b533fc82ba`, blob
`10bb040317d62834806b86b36a3a14f13c539fbc`. These are provenance, not Git
ancestry or executable inputs.

## Service Law And Habitat Landing

Canonical Template `main` at
`093334ff22f47ce864e15b87dd6ca01b1ba0fb0b`, tree
`955b5a0041d7f3c00e4db0d72d6ae2c6125d28b8`, contains the complete reviewed
service-law stack from PRs #789, #790, #791, #803, #792, #794, #795, #796,
#798, and #801. The six service-construction laws are enforced with empty
baselines and the complete admitted service corpus reports zero findings. All
186 Nx build/check/test tasks, the warm repository check, all 18 strict
OpenSpec items, and standing architecture, oRPC/TypeBox, TypeScript, testing,
and structural reviews are green.

Habitat SDK and CLI `0.4.2` are the supported public distribution artifacts. npm reports
`@habitat-ai/sdk@0.4.2` and `@habitat-ai/cli@0.4.2` as `latest`; Template
consumes the same exact CLI release through its lockfile. The private `rawr`
application and its internal Template dependency graph remain private and
absent from Nx Release. This closes the platform release boundary without
creating or promising a RAWR distribution.

The supported consumer handoff is exactly
`npx nx add @habitat-ai/cli@0.4.2 --no-interactive`; it acquires
`@habitat-ai/sdk@0.4.2`. The release, tag-publish, registry-install, and
canonical-main checks are green. All eighteen names in the rejected RAWR
`0.1.0` cohort, including the sole historically published
`@habitat-ai/rawr-hq-sdk`, now return `404` from the public npm package and
version endpoints. Consumers MUST NOT install or reconstruct that cohort.

## Target Architecture

The target architecture is:

```text
Template source
  -> Nx build
     -> @habitat-ai/sdk      (one public runtime SDK)
     -> @habitat-ai/cli      (one ordinary Oclif release)
     -> private rawr app
     -> rawr plugins          (@oclif/plugin-plugins)
     -> rawr agent plugins    (bounded oRPC lifecycle service)
        -> Personal closed release input
        -> exact selected Git objects
        -> in-memory closed release model and selected native content
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

## Conventional Release Grounding

The current supported Nx Release group contains exactly two public artifacts. One
`@habitat-ai/sdk` package contains Habitat's TypeBox bridge, blueprint catalog,
and runtime capabilities. One `@habitat-ai/cli` package is the Habitat Oclif
CLI release that consumes that SDK and exposes the Nx initializer. Nx builds and
publishes those two packages. npm transports them. The private `rawr`
application and its complete internal Template dependency graph remain private
workspace owners rather than public package products.

After controller and persistent lifecycle-state deletion, the Nx graph exposed
one remaining false edge: `@rawr/cli` declared `@rawr/orpc-client` despite no
tracked source consumer. The deletion checkpoint removes that dependency, the
unused package, root build references, and lockfile entries together. It also
removes duplicate direct CLI dependencies on `@rawr/dev` and `@rawr/dev-node`;
the DevOps command plugin remains their qualified consumer. That historical
source-reachability result contained seventeen projects. At that checkpoint,
the package-manifest runtime closure contained exactly nineteen package roots:
the CLI, four first-party Oclif plugins, six services, four support packages,
and four resources. Three consumers declared their direct `@rawr/hq-sdk`
dependency. The SDK's workflow client was vendor-neutral, while the server host
retained concrete Inngest ownership, so the CLI closure no longer installed
Inngest for a type-only edge. `@rawr/plugin-hello` remained outside as the
native external-install fixture. Archived architecture records retain their
historical package claims as provenance rather than live guidance. The fixed Nx
Release group gave all nineteen runtime members ordinary version and publication
metadata. Installed tarball acceptance remained separately owned by task 3.4;
that metadata checkpoint did not manufacture the result. The later independent
TypeBox adapter release removed that package from the RAWR group, leaving the
current eighteen-member closure recorded below.

Task 3.7b replaced the predecessor compatibility release and installed
acceptance with the SDK and CLI in one disposable Nx consumer. The landed
`0.4.1` release proves `nx add`, generated command discovery, runtime execution,
TypeBox adaptation, blueprint resolution, registry installation, and repeated
initialization without a change. It rewrites no packed metadata, emulates no
registry, publishes no private implementation owner, and introduces no retained
release store, selector, per-file envelope, or source-checkout renaming.

## Durable Decisions

| Concern | Decision |
| --- | --- |
| CLI dispatch | Oclif |
| External CLI extensions | Direct `@oclif/plugin-plugins` |
| Build, cache, version, release | Nx and Nx Release for `@habitat-ai/sdk` and `@habitat-ai/cli` only |
| Architecture policy | Habitat closed topology plus Grit source relationships |
| Package classification | Pure support matter only; external capabilities use resource/provider boundaries, runtime owns acquisition, and resourced product behavior belongs to a service |
| Curated desired state | Personal Git-reviewed closed release input/channel record |
| Installed provider truth | Native Codex/Claude inventory in the explicit home |
| Provider mutation | Native provider commands through thin adapters |
| Provider package bytes | Selected Personal Git marketplace; native provider owns its snapshot/cache |
| App/runtime composition | Separate architecture migration |
| Destination/export realization | Separate architecture migration |
| Inngest content | Accepted and landed on Personal `main`; `dev:inngest` and `dev:effect-inngest` use the normal closed release set, while `inngest-orpc` and research/candidate roots remain excluded |

The public Oclif package decision belongs to Habitat CLI `0.4.2`. The private
`rawr` application remains Nx-built internal tooling; this lifecycle neither
publishes nor installs it. Any future first-class RAWR product requires a
separate authority amendment and may not revive a selector, release store, or
private workspace publication.

## Habitat Provenance

Magic Migration commit `5a974f0047f0667c2e429fdb4193a0e237b067c4`
is the historical import source for the API-plugin and agent-router packets.
The current service packet follows the later committed Magic lineage:

- closed service faces:
  `822aa36d3f951a81d94292bcbce5d8fdc38fe1f7`;
- native oRPC middleware decorators:
  `1c6c128f772fdfc9db6d794424bbdd171ac30600`;
- service platform-independence direction:
  `60434ed1cfaa8d3a9d5e77ea275df4b0d0482419`;
- named native middleware:
  `9a91951603cbe942708bf0d971608af8ffc3bdbd`;
- direct model topology:
  `b359029512d40d42dd7adb5b983d6a286ce9bbdd`;
- normalized owner/module alias closure:
  `1968e0b89e1cf55a8befd817bf9ec4fea82a9795`;
- one canonical public module router:
  `beac5efed773cd772e76649e514d646d4f4d7bf9`; and
- current root router composition:
`52873620ffe0b8b6e60527cd399076fc13ab86a7`, service-blueprint tree
`e8f0d548fba17936bf39084607c3cf12c5c97ee0`.

At the historical Civ7 `0.1.0` consumer checkpoint, the portable evaluator was
available as release
`habitat-cli-v0.1.0`. Its reviewed source candidate is
`d51e8c7454e301bcaba56c8364f5c714d5febca3`, tree
`5b35c34f2fa13e0eece1ea4cea7e6b1000df71dc`; canonical Civ7 main is
`ebf5bbcab1e754a17a63999747f80c5e60b28fb7`. Template pinned the release asset
`habitat-cli-0.1.0.tgz` by immutable GitHub URL and lockfile integrity; the
asset SHA-256 is
`d21f7ab85d9895666174003b7024aa2473e83db047f42bc2c801666e0dd448f5`.
Template owned no copied Habitat SDK source, executable selector, or second
rule inventory at that checkpoint.

That landed consumer installed `@habitat/cli/nx-plugin`, which inferred one
cacheable target per registered rule and one owner-local policy aggregate.
Thirty-three active laws across six owners passed with zero findings; 25
belonged to the `habitat` project. The contract-authority law acquired only its
contract and reusable-DTO corpus and completed in 2.9 seconds; the complete
uncached Habitat policy graph completed in 44.8 seconds, and an unchanged
repeat restored from Nx cache in 18 milliseconds. Seven unfinished service
laws then remained explicit candidate packets under `.habitat/staged/**`; they
were not compatibility paths or active registry members. The current 41-rule
candidate state and its six-law activation gate are recorded in the gate table
below; public-consumer sealing retains its independent classifier gate.

Two further Magic boundary laws are now part of the enforced RAWR service
packet. Commit `21497500629f6b77ccbd6b0e983f2cc7c16ca663` isolates production
from proof: proof may consume production, while production cannot import the
proof corpus. Commit
`60320c47ff3b1ca582bf918c35127f7b86b6a847` seals literal module paths that
enter a standalone service implementation tree. The existing
`require_service_private_alias_ownership` rule remains the sole owner of
private-alias edges. Template adapts the new packet placement, limits sibling
shortcuts to lowercase-kebab owners named from standalone production source,
and applies literal-path sealing through the JavaScript-family workspace gate
so root, script, and TSX consumers remain covered. Both new empty-baseline rules
run exactly once in the existing source-law batch; the fixture suite proves
rejected and admitted edges without a scanner or second policy runner.

The final service-blueprint suite passes 15 cases and 192 assertions. The
focused alias, proof, and consumer laws report zero findings, and the complete
required batch passes all 22 selected source laws with empty baselines. The
repository gate passes 115 tasks in 55.8 seconds, including 36 Habitat tests
and 225 assertions. Strict OpenSpec validation, formatting, and diff hygiene
pass. Standing architecture/Habitat and structural code-quality/test reviews
report no unresolved P0, P1, P2, or P3 finding. Template PR #603 landed this
preceding source-boundary checkpoint on canonical `main` at `396b3214`.

The active Habitat checkpoint is
[[tasks#1. Positive Habitat And Nx Checks|task 1.1f]]. It adds one optional
service-owned database at `services/<service>/src/service/db`, positively
closed to owner-issued SQL migrations, named schema leaves, and store
implementations. The service spine admits `db` only at a standalone service
root. The database topology's own closed-empty placement scopes reject tracked
DB content under standalone modules, embedded API service roots, and embedded
API modules without activating the still-advisory full service-spine rule. A
matching Grit law admits literal database-source imports only from
database-owned source and named root middleware. Modules and handlers receive
store capabilities through inherited oRPC context; external acquisition
remains resource/provider-owned.

The two empty-baseline rules are selected once in the existing Habitat batch.
The focused fixture suite passes 19 cases and 217 assertions. Separate fixtures
prove canonical service topology without a database, the exact valid root
shape, rejected incomplete/provider/helper interiors, and database-rule-only
rejection of all three invalid placement classes. Loader proof covers quoted
and substitution-free template `import()`, `require()`, and
`require.resolve()` for both relative and matching-owner alias sources. Exact
per-file diagnostic counts bind all twelve refused loader forms plus the four
static import/re-export edges, while admitted root-middleware and database
source exercise both literal forms and computed-import/ordinary-path data stay
excluded. The full repository gate passes all 115 tasks in 1 minute 6 seconds,
including 40 Habitat tests with 250 assertions and all 24 selected source laws
with zero findings. Strict OpenSpec, Biome, and diff hygiene pass. Standing
architecture/Habitat and structural-quality/testing reviews report no
unresolved P0, P1, P2, or P3 finding. No Nx project or target, SDK change,
scanner, wrapper, baseline debt, or runtime implementation enters this
checkpoint. Template PR #604 landed the preceding Habitat checkpoint on
canonical `main` at `861e7337`.

## Example Todo Public Face

The preceding bounded checkpoint was
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e11]]. Example Todo's
source root now contains only `client.ts` and the private `service/` spine, and
the package manifest exposes only `@rawr/example-todo/client`. That face exports
exactly the runtime values `contract` and `createClient`, the `Contract` and
`Client` types, and the deliberate `Deps`, `Scope`, `Config`, `Invocation`, and
`CreateClientOptions` lane vocabulary. The named lanes preserve the service's
construction and per-call language without exposing its router, authoring
surface, or composed execution context.

The former bare root, types, service-contract, and router subpaths are deleted
without aliases or forwarding files, and their redundant TypeScript path
mappings are gone. The API plugin derives its projection from the public client
contract and retains its existing `api.ts`, `client.ts`, and host-injected
`ClientResolver` boundaries. The finite Server host and proof callers cross the
same client face. An existing Server typecheck now owns positive resolution,
positive lane types, exact public runtime values, private router/service/context
symbols, and retired-subpath assertions; no new project, checker, target,
dependency, or compatibility surface is introduced.

Example Todo passes all 6 files and 36 behavior tests; the two focused Server
projection suites pass 6 cases. Example Todo, the API plugin, and Server
typechecks pass, including the compile-time package-surface oracle. The API
plugin and Server structural targets pass. The enforced private-alias
configuration, private-alias ownership, and public-consumer sealing laws report
zero findings. The advisory service-spine topology no longer reports an Example
Todo public-face violation; its 16 existing internal `common`, module-shell,
and middleware findings remain outside this checkpoint. Strict OpenSpec,
touched Biome, and diff hygiene pass. The full repository gate passes all 115
Nx tasks in 52.9 seconds, with 63 cache hits. Standing
architecture/Habitat/oRPC and TypeScript/structural/testing reviews report no
unresolved P0, P1, P2, or P3 finding. The parent workstream retains final
closure-gate ownership. Template PR #605 landed the checkpoint on canonical
`main` at `07ff505ff781ee2f27af700e25beb1032cb53d37`.

## Example Todo Root Model

The preceding bounded checkpoint was
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e12]]. Example Todo's
service root now owns only the identity, scope, and host-capability meanings
that survive the complete capability suite. Direct TypeBox DTO leaves own todo
identifier and workspace-id structure; the identifier policy retains candidate
admission; and direct port leaves declare only the clock and identifier
generator capabilities. `base.ts` keeps its initial, invocation, metadata,
scope, configuration, and policy-event shapes private. Observability consumes
the policy events injected by that base and no longer imports their vocabulary.

The package import map now declares
`#example-todo-service/* -> ./src/service/*.ts`. Modules use that private alias
only for exact `service/model/**` leaves, while root-to-root and module-local
edges remain relative. Task, tag, and assignment schemas reuse the workspace
and todo-identifier DTOs without promoting their module-owned entity schemas.
The existing public `/client` face and its `Deps`, `Scope`, `Config`,
`Invocation`, and `CreateClientOptions` lanes remain unchanged.

The unowned `service/common` area is deleted. Tasks and Assignments each own
their exact `RESOURCE_NOT_FOUND` declaration; all three module contracts own
their exact `READ_ONLY_MODE` declaration; and Assignments alone owns
`ASSIGNMENT_LIMIT_REACHED`. Root read-only middleware emits the same defined
409 failure and compatible path data without importing contract or error
authority. The three impossible missing-row states now throw native `Error`
directly, and no error map, facade, wrapper, barrel, shared/internal area, or
replacement abstraction takes the deleted aggregate's place.

Example Todo passes its focused typecheck and build plus all 6 files and 36
behavior tests. The read-only proof exercises Tasks create, Tags create, and
Assignments assign independently and binds defined `READ_ONLY_MODE`, status
409, and each exact operation path. The enforced private-alias configuration,
private-alias ownership, and platform-independence Habitat rules pass with zero
findings. Strict OpenSpec, touched Biome, exact residual-import searches, and
diff hygiene pass. The full repository gate passes all 115 Nx tasks in 50.8
seconds, with 62 cache hits. Standing architecture/Habitat/oRPC and
TypeScript/structural/testing reviews report no unresolved P0, P1, P2, or P3
finding. No operation-handler body, module topology, provider, database/store
boundary, Effect integration, HQ SDK surface, or public package export changes.
Template PR #606 landed the checkpoint on canonical `main` at
`339979f59d2b8267ad1f67c24569c766d7332c58`.

### Example Todo Record Model

The preceding bounded checkpoint was
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e13]]. Task, tag,
and assignment records are stable inert vocabulary shared by module contracts
and the planned service-owned persistence boundary. Their TypeBox schemas and
generated types therefore move into direct `service/model/dto/**` leaves.
This ownership does not move operation policy, normalization, sequencing,
errors, or handlers out of Tasks, Tags, or Assignments.

Every current contract, handler, and persistence adapter imports the exact
root-model leaf through the owner-private service alias. The three loose
module `schemas.ts` files are deleted without an index barrel, compatibility
export, schema clone, or alternate type authority. The public `/client` face,
context lanes, runtime result shapes, database queries, and provider wiring
remain unchanged. Persistence extraction, router authorship, middleware,
Effect integration, and HQ SDK changes remain later independent checkpoints.

Example Todo passes its focused typecheck and build plus all 6 files and 36
behavior tests. The private service-model alias Habitat rule, strict OpenSpec,
Biome, residual old-path and duplicate-authority searches, and diff hygiene
pass. The full repository gate passes all 115 Nx tasks in 1 minute 5 seconds,
with 63 cache hits. Standing architecture/Habitat/oRPC and
TypeScript/TypeBox/structural/testing reviews report no unresolved P0, P1, P2,
or P3 finding. The service's construction-time `Deps`, `Scope`, and `Config`
lanes and per-call `Invocation` lane remain implemented and documented by the
unchanged `base.ts`, `/client` boundary, and context-typing proof. Graphite
landing completed through Template PR #607 on canonical `main` at
`ce7540939680a5bacf82c1ecd41dedadcde01614`.

### Example Todo Context Lanes

The preceding bounded checkpoint was
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e14]]. Example Todo
remains the canonical worked construction and invocation reference. `Deps` carries stable
host capabilities, `Scope` carries stable binding identity, and `Config`
carries stable externally selected behavior for the lifetime of a client.
`Invocation` carries per-call request facts. Those are the four
service-declared input lanes. The owner-local native client resolver starts an
empty execution-local `provided` bucket, and provider middleware grows its
qualified capabilities for downstream modules and handlers.
Static procedure metadata remains outside execution context.

The exact flow remains `host binding -> client construction -> invocation ->
base context -> service middleware -> provided capabilities -> module ->
handler`. The public client, private base, HQ SDK context types, service-package
boundary, Example Todo context-typing fixture, and Server package-surface proof
already implement and verify the construction and invocation lanes. Current
module composition still copies selected lane and provided values into flat
handler fields. The later explicit correction in task 5.7e16 establishes that
selection as module-owned context curation: it is a pattern to reproduce when
the selected fields form the module's smallest useful router vocabulary. It
does not create another lane, construct dependencies, or remove the inherited
context. This checkpoint records the lane owners, lifetimes, and rationale in
the Example Todo and HQ SDK routers and the Habitat service frame, and corrects
an overbroad sentence that treated legitimate handler access to inherited
context as an upward reach. No runtime, SDK, service, module, middleware,
provider, schema, export, or test changes enter this checkpoint. The public
lane surface remains anchored to Template commit
`07ff505ff781ee2f27af700e25beb1032cb53d37`.

Noncached HQ SDK, Example Todo, and Server typechecks pass as one Nx invocation
in 12.6 seconds, including their required build dependencies. Strict OpenSpec,
link-target validation, and diff hygiene pass. Standing Habitat/architecture
and oRPC/TypeScript reviews report no unresolved P0, P1, P2, or P3 finding.
Only the Habitat service frame, Example Todo and HQ SDK context routers, active
OpenSpec record, and rolling mental model change. PR #608 landed this checkpoint
on canonical `main` at merge commit
`1c1ebbf195fccb45befac35498bcbfaf1b17246d`.

### Schema-Optional Service Database

The preceding bounded checkpoint was
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e15]]. A standalone
service database still has one positively closed service-root interior. When
that interior exists, owner-issued SQL migrations and named store
implementations are required. A separately closed physical-schema directory is
optional because TypeBox already owns logical record structure and only some
database technologies require another physical mapping.

The topology therefore admits exactly `migrations/*.sql` and
`stores/*.store.ts`, plus optional `schema/*.schema.ts`. It continues to reject
module databases, embedded API databases, generated clients, memory
substitutes, repositories, sessions, helpers, indexes, providers, and alternate
source shapes. The existing import-funnel law, Habitat runner, Nx scheduling,
and source-law batch do not change. No Example Todo source, runtime, SDK,
resource, provider, package, application, or service import relationship enters
this checkpoint.

The focused Habitat service-blueprint suite passes all 21 tests in 9.25
seconds. It proves both admitted shapes and injects red fixtures for missing
migrations, missing stores, a malformed optional schema leaf, noncanonical
database interiors, and forbidden module/API placement. The targeted live
`require_service_database_topology` and
`require_service_database_import_funnel` rules pass with zero findings in 561
and 3,133 milliseconds respectively. Strict OpenSpec, touched Biome, and diff
hygiene pass. Standing Habitat/architecture and structural/testing reviews
report no unresolved P0, P1, P2, or P3 finding. No source or import-funnel rule
changes, red-corpus suppressions, compatibility shapes, new scripts, runners,
runtime code, or generated artifacts enter the checkpoint. PR #609 landed this
checkpoint on canonical `main` at merge commit
`56cb5bfaeff7f7a39e040ff3b1185aa67d247fd8`.

### Module Context Curation

The preceding bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e16]]. The service
context law now admits one optional terminal curation in `module.ts`. Its
nonempty explicit fields select direct noncomputed member paths rooted below
`deps`, `scope`, `config`, `invocation`, or `provided`; reserved lane keys, whole-lane
copies, literals, spreads, shorthand, calls, construction, guards, control
flow, and nonterminal or repeated curation remain red. Native oRPC composition
is additive, so curation gives handlers a module-owned vocabulary without
claiming the inherited lanes disappeared.

This checkpoint proves source shape only. The immediately following Example
Todo runtime slice owns TypeScript and behavior proof that native context
composition remains additive at the realized service boundary.

For standalone services, the same correction permits one exact provider author:
`base.ts` exports
`service.createProvider<Service["ExecutionContext"]>` as
`createServiceProvider`. Duplicate or renamed authors remain red. Only
documented named root service middleware may import it from `../base` and call
its zero-generic builder to add qualified `provided` capabilities; `impl.ts`,
routers, helpers, modules, wrong-depth imports, and local generic restatement
remain red. Direct qualified or computed `createServiceProvider` calls and
bracket or destructured `createProvider` access are also red. This structural
checkpoint intentionally does not trace arbitrary assignment or alias flow.
Embedded API provider authorship is not admitted by this slice.
Imported named middleware remains the owner of guards and capability
enrichment.

The existing Habitat service-blueprint suite structurally proves the admitted
curation and standalone provider shapes plus the exact rejected curation and
provider-owner classes: all 24 cases and 275 expectations pass. Targeted
context and native-composition rules pass with zero failures; their broader
pre-existing advisory corpus remains outside this slice. Touched Biome, strict
OpenSpec, and diff hygiene pass. Standing architecture and structural-quality
review report no unresolved P0, P1, or P2 finding. Only Habitat service
authority, its existing executable fixture, HQ SDK routing guidance, the
rolling mental model, and this execution record change. Service runtime,
providers, apps, plugins, Nx wiring, and research paths do not. The checkpoint
is committed locally at `70cab16b`; Graphite submission and landing remain
open.

That checkpoint admitted curation but did not yet make it mandatory. Task
5.7e19 supersedes only that optionality after Example Todo established terminal
module curation as the canonical route-authorship boundary; the earlier
provider-author and additive-runtime observations remain historical evidence.

### Example Todo Service Database

The active bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e17]]. Example Todo
now owns persistence inside its optional service-root `db` boundary. One SQL
migration declares the physical tables. Three workspace-bound stores implement
the task, tag, and assignment ports declared by the service-root model. A
single documented `stores` middleware acquires the host `DbPool` once per
operation, binds the client workspace, constructs all three stores, and adds
them under `provided` through the provider author specialized in `base.ts`.

Each module removes its repository provider and ends with one deliberate
context curation. The selected handler vocabulary contains only the inherited
clock, identity, logging, scope, invocation, policy, and store capabilities the
module's routes use. Routers remain the authoring site for validation, policy,
failure decisions, sequencing, and persistence calls. The deleted repository
files and generic SQL middleware attachment have no compatibility reader,
alias, or fallback.

The additive-context type fixture observes both a curated field and the
retained `deps`, `scope`, `config`, `invocation`, and `provided` lanes after
native `.use(...)` composition. Database behavior records the workspace in
every query and observes exactly four pool connections for four operations,
which pins one root acquisition per operation rather than one per store. The
existing task, tag, and assignment behavior remains unchanged. The migration
is declared but not executed here: a concrete provider and migration runner
belong to a qualified host, not this reference service slice.

One uncached Nx graph completes Example Todo build, typecheck, and all seven
files and 37 behavior tests in 6.3 seconds. The two enforced Habitat database
rules pass with zero findings in 3.1 seconds, and workspace Biome lint completes
in 525 milliseconds. Imported exports introduced by this slice carry the
required documentation, and strict OpenSpec validation passes.

The Example Todo checkpoint exposed a pre-existing
`habitat:check:documentation` Nx input parser failure before checker execution.
That foundation defect was not a service behavior failure; the separate
checkpoint below owns its repair. Standing architecture and structural-quality
review report no unresolved P0, P1, or P2 finding. Graphite landing remains
open.

### Documentation Target Admission

[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e18]] repairs the
pre-existing Nx input parser defect in the now-retired manual documentation
leaf. [[tasks#1. Positive Habitat And Nx Checks|task 1.6c10b5]] supersedes that
execution mechanism: the TypeScript resolver script, direct Nx target, and
script-specific tests are deleted.

The shared Magic `require_exported_value_declarations_have_jsdoc` Grit law now
owns the public lifecycle boundary directly in Habitat. It deliberately checks
the authored value-export superset on the admitted command, SDK, resource, and
service-client faces; Knip and review own reachability and prose quality. The
bounded corpus is burned to an empty baseline and the native rule runs in the
required local policy batch. No second parser, source walker, or manual
documentation target remains.

### Runtime Lab Structural Authority

[[tasks#1. Positive Habitat And Nx Checks|task 1.6c10b4]] removes the final
non-Habitat source walker. The Runtime Realization lab no longer exposes a
`structural` target or carries a script that inventories current files,
blacklists retired names, treats its Nx target list as structural policy,
parses imports with regular expressions, or treats phase records as repository
law.

Two owner-qualified Habitat rules retain the durable meaning. A closed
`structure.toml` rule admits the lab's root containers, source planes, test
planes, and two operational scripts. A Grit rule owns literal parser-visible
containment edges between shared source, Oracle, Reference Runtime, scenarios,
and parent-repository production owners. Both rules have empty baselines and
run through repository Habitat policy; no lab-local wrapper or replacement
checker exists. Evidence reporting, type checks, negative fixtures, vendor
behavior, Oracle behavior, and simulation remain ordinary Nx targets.

The evidence manifest remains a behavior-owned input rather than structural
law. Its report command uses TypeBox to fail closed on the manifest schema,
pinned specification, fixture existence, TODO coverage, entry identity, and
the exact owner targets scheduled by the lab gate. Ten focused cases cover the
valid report and corrupted manifests. This validation reads evidence inputs; it
does not inventory implementation topology or enforce source relationships.

The shared Magic semantics keep one direct standalone Effect-oRPC base, derive
every module from its exact `service.<module>` branch, remove model `index.ts`
authority, preserve direct semantic leaves, and close normalized owner-alias
traversal. RAWR deliberately refines the single public module `router.ts` with
named `router/<name>.ts` operation leaves or semantic groups beneath it;
module `router.ts` only composes their plain values, and `router/index.ts` is
structurally inadmissible. The remaining user-authorized Template extensions
require a completed-module-router-only root, make base and optional module
context ownership explicit, close raw handler transport lanes and
context-assembly destinations, document router groups and module boundaries,
preserve platform independence and exact private aliases, require `AGENTS.md`
at every service-module boundary, admit only the separately closed optional
root database boundary, and close junk-drawer destinations. The
six staged topology, anchor, isolation, context, composition, and
router-authorship rules remain outside repository admission until the admitted
service corpus conforms and task 5.7e22 installs the upstream owner-local Nx
execution boundary.
The generic agent-router packet retains the imported document source law. Its
cross-kind placement relation is reclassified under `rawr/repository` because
it inspects package and module roots without defining their topology; the rule
ID, matched corpus, empty baseline, and enforced behavior are unchanged.
Magic Migration worktree revision
`c45affc77b48e9851b26f51f3ef4920e173a9e96` also supplies the standing
Habitat Designer, Habitat Engineer, and Codex hook form. Template keeps the two
role contracts while replacing Collect-specific language with Habitat platform
authority, the private `rawr` boundary, and the positive-closure invariant.
Checked-in `.codex/hooks.json`
is now the single hook-composition owner: it invokes the canonical workstream
startup and closure sources directly and adds Stop-time workspace lint plus
the selected Habitat source laws. The workstream installer projects only its
skills and agent briefs; it no longer rewrites hook config or copies hook
sources. Pre-push `bun run check` and protected `bun run ci` remain the
non-skippable repository admission owners.

Future generic support for kinds that intentionally admit multiple positive
forms is recorded as a Template-owned Habitat capability in
[[HABITAT_BLUEPRINT_VARIANT_CAPABILITY_HANDOFF]]. It is not yet implemented and
is not emulated by this definition checkpoint; it does not block this
single-shape service law.

Magic commit `fb91606db1c63dad92d3d4945bbb21bc92f9d1c3` supplies the shared
TypeBox/oRPC contract-property-description law. Template adopts its pattern
verbatim and applies it through bounded standalone-service and API-service
rules, adapting only the `rawr` placement identity. Directly authored contract
properties declare nonblank static meaning or delegate to a named schema
authority. Within directly authored object literals, canonical TypeBox bindings
and property grammar remain closed; nonliteral shape provenance remains a
TypeScript and review concern. Both baselines are empty, both rules are enforced
through the existing Habitat batch, and no script or second pattern exists.

The import audit found 42 undocumented object sites across ten standalone
module contracts and no API-service violation. The same checkpoint burns those
sites down with domain descriptions while preserving every validation
constraint, generated static type, router, and handler behavior. Session
Intelligence passes 15 tests, ChatGPT Corpus 10, HQ Ops 11, and Hyperresearch
Codex 47; all four owner typechecks pass. The complete 20-rule Habitat source
law, its 33-test owner suite, repository formatting, strict OpenSpec validation,
and both focused applications report zero findings. The Habitat suite exercises
standalone and API rejection plus described and named-schema admission through
the existing guarded fixture harness; it adds no scanner or policy runner. The
server's 44-test suite and typecheck also prove that representative TypeBox
property meaning survives the generated OpenAPI boundary.

The narrower API-plugin face and Grit-helper documentation laws are now active
repository admission checks. The API kind positively requires only
`client.ts`, `api.ts`, and one embedded `service` under `src`; the live Example
Todo plugin conforms without root wrappers or a second package manifest. API
surfaces name operations while oRPC implementation code retains its native
procedure vocabulary. Every named Grit helper carries a directly preceding
semantic comment. Both checks have empty baselines and run in the selected
green local batch behind `habitat:check`. The public `bun run check` command
starts one Nx `check` scheduler graph over every admitted project. Shared target defaults
connect each public check to one workspace lint task, project typecheck,
owner-local verification, Habitat policy, and dependency checks. Habitat owns
the selected topology batch, CLI
owns Oclif source/build parity, and the repository project owns only repository
admission and separation.
Required Oclif structure laws and the lifecycle command-channel law run in the
selected Habitat batch. Registered rules with known live-corpus violations are
not yet required. See [[tasks]] 1.5f.

The lifecycle service-law migration begins at the release module's declarative
boundary. Its four operations now derive directly from Effect-oRPC `eoc`
instead of importing the root service builder, while preserving the effective
domain, audience, idempotence, audit, and module metadata on every operation.
The existing TypeBox request and result schemas remain the structural source.
The release schema boundary and root telemetry behavior pass 14 focused tests;
uncached lifecycle lint and typecheck pass; and the staged
`require_service_contract_authority` diagnostic is green. The remaining service
rules stay diagnostic until the admitted corpus conforms, as required by
[[tasks#1. Positive Habitat And Nx Checks|task 1.5e]]. This checkpoint advances
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.2]] without claiming
the releases module shell or the full service is sealed.

The corrected service authority packet is now sealed as the first half of the
categorical service-law repair. Every module has one public composition face at
`router.ts` and named operation-authoring leaves under `router/<name>.ts`;
`router/index.ts`, `shared`, `internal`, `dependencies`, loose `schemas.ts`,
and a service-wide `model/index.ts` are outside the positive shape. Magic
`52873620ffe0b8b6e60527cd399076fc13ab86a7` initially supplied the direct local
`Router<typeof contract, never>` root relation and rule-qualified Grit helpers.
The later pinned-N1 runtime oracle supersedes that root-specific relation with
exact configured `service.router(...)` completion while retaining Magic's
module topology and qualified-helper law.
The six staged service laws remain advisory until [[tasks#5. Bounded Agent-Plugin
Lifecycle Service|task 5.7e2]] burns the live service corpus to green and task
5.7e22 installs their upstream Nx execution boundary. Their disposable fixture suite already proves the
combined rule catalog, so this staging checkpoint creates no alternate
repository checker or local Habitat SDK fork.

The first [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2]]
burn-down checkpoint promotes the release selection and in-memory derivation
used by release eligibility and packaging into neutral root model leaves.
Release identity, issues, packaging failure, and settlement remain
module-owned projections authored in their oRPC handlers. The checkpoint
deletes the releases-to-packaging derivation edge, duplicate package
selection type, loose release and packaging schema barrels, router indexes,
detached package runner, and generic dependency-Promise adapter from the two
touched operations. Native Effect adapts each external call, with
uninterruptibility limited to output publication after mutation may begin.
Five focused behavior suites pass 34 tests without changing check JSON,
packaging failure text, Cowork bytes, package digests, or output settlement.
Provider derivation, the packaging source-reader edge, and the legacy
release-family placement remained explicitly open at that checkpoint.

The next burn-down checkpoint promotes clean-content observation into one
service-owned port and policy used by release eligibility, packaging, and
local provider tests. Packaging now contributes that ready capability through
a named module-owned middleware authored from the base factory instead of
importing a releases-module implementation. Native oRPC context merging remains
additive; later owner-local resource and handler cuts remove raw inherited lanes
rather than pretending `.use<Context>` is subtractive. The old clean reader and
declared-tree policy paths disappear with no alias or compatibility reader; provider
selection, eligibility-binding bytes, Cowork output, and settlement behavior
remain unchanged. Seven focused behavior suites pass 62 tests, including exact
initial-inspection and revalidation failures with zero output publication; the
complete service suite passes 238 tests across 32 files. Root context assembly,
staged observation, provider derivation, legacy release-family placement,
`node:crypto`, and the remaining service corpus stay explicitly open.

The following owner-local checkpoint moves staged-index observation fully into
Releases. Its opening and closing DTOs, ready reader port, resource adapter, and
failure normalization now live beside the staged eligibility policy that
interprets them. The false root dependency leaf and staged repository adapter
disappear without aliases. Exact entry, index-byte, and blob-byte bounds remain
observable; a changed closing anchor or index returns the same source-change
result after one read. The move changes no oRPC context, handler authorship,
provider selection, clean-content behavior, or external resource
implementation. Selected-content placement, root context assembly, provider
derivation, and the legacy release family remain open under [[tasks#5. Bounded
Agent-Plugin Lifecycle Service|task 5.7e2]].

The next owner-local checkpoint moves provider-selected content fully into
Providers. Its TypeBox DTOs, narrowed content-workspace read port, native
marketplace validation, and exact-Git resolution helper now live beside the
status, test, and sync operations that alone consume them. Providers constructs
the resolver from the host capability in its named capability middleware; the
root selected-content middleware, root dependency re-exports, Releases
repository adapter, and Releases native marketplace leaves disappear without
aliases. Releases no longer declares unused current-main or selected-content
prerequisites. Exact selection results, marketplace refusal, provider modes,
root current-main, oRPC/Effect semantics, and provider mutation remain
unchanged. Root context assembly, broad dependency-lane removal, provider
operation authorship, and the legacy release family remain open under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2]].

The focused Provider and service-spine run passed 45 cases, and the complete
lifecycle service passed 239 cases. Lifecycle source/test typecheck, workspace
lint, strict OpenSpec validation, and diff hygiene passed. The focused advisory
Habitat service-law audit reports no isolation finding in the moved model
leaves; its existing context, topology, and legacy-corpus findings remain open
rather than baselined. Standing architecture, oRPC/Effect-oRPC/TypeScript, and
testing/structural-quality reviews report no unresolved P0/P1 finding. The
single repository admission graph then passed 110 tasks across 37 projects in
one minute and seven seconds, including all 15 enforced Habitat rules with no
failing or advisory result.

The next semantic checkpoint gives Providers its one canonical public router
composition face. Module `router.ts` now composes the existing `test`, `status`,
and `sync` leaves as one plain object, while the inadmissible
`router/index.ts` path disappears without an alias. Root routing, inferred
client branches, operation behavior, context, and native mutation remain
unchanged. The loose Provider schema barrel, middleware shape, detached
operation runners, non-operation router buckets, and broad dependency-lane
authoring remain open under [[tasks#5. Bounded Agent-Plugin Lifecycle
Service|task 5.7e2]] rather than being misreported as sealed.

The focused service-spine suite passes all 3 cases, and the complete lifecycle
service passes all 239 cases. Uncached source/test typecheck, workspace Biome
lint, strict OpenSpec validation, and diff hygiene pass. Advisory Habitat
topology no longer reports a missing Provider `router.ts` or the removed
`router/index.ts`; router-authorship reports no finding for the new composition
face while retaining the declared leaf debt. Exact TypeScript comparison
confirms the Provider router, root router, oRPC client, service boundary,
public client, and host context types remain unchanged. Standing architecture,
oRPC/Effect-oRPC/TypeScript, testing, and structural-quality reviews report no
P0/P1/P2 finding.

The following owner-local checkpoint normalizes Packaging without moving its
transition out of the oRPC authoring boundary. The package handler still owns
inspect, derive, encode, revalidate, publish, and settlement order; a direct
module policy leaf now owns only release-identity projection, resource-failure
classification, the prior-output observation bound, and bounded public
diagnostics. The observation bound retains its exact value without borrowing
release-set payload authority. The named operation router exports one plain
package subrouter, and module `router.ts` composes that value through its single
public face. The loose module telemetry file disappears because it repeated
the service-owned trace fields without adding a Packaging capability or
policy; required service analytics and observability remain.

Packaging now authors its ready capability enrichment in one named middleware
from the base factory and attaches it in `module.ts` through inferred
`.use(capabilities)` composition. Native oRPC context still merges additively,
so this checkpoint does not claim an exact handler view or close root context
assembly. It also replaces Packaging's other upward relative imports with its
current owner alias without moving the legacy release family. Exact TypeBox
request and result shapes, Cowork bytes, package identity, failure text, output
settlement, and idempotent repeat remain the behavioral gate under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2f]].
The 21-case focused boundary passed in 37.4 seconds, the complete lifecycle
owner passed all 242 cases in 1 minute 34 seconds, and uncached source/test
typecheck passed in 16.8 seconds. The selected Habitat topology, context,
module-isolation, and router-authorship laws report no Packaging finding;
Biome, strict OpenSpec validation, and diff hygiene pass. Standing
architecture, testing, and TypeScript/structural reviews accept the checkpoint
with no P0/P1/P2 finding. The public repository check then admitted all 37
projects and 110 scheduled tasks in 54.6 seconds, including Oclif manifest
parity and all 15 enforced Habitat laws.

The next owner-local checkpoint gives Governance the same one-face authorship
shape without reopening its already sealed behavior. The current-main record
and exact-Git selection transitions move into named router leaves through the
service's admitted native Effect-returning handler form; module `router.ts` now
only composes those completed values. The one same-owner DTO edge uses the
service-private owner alias rather than upward path arithmetic. Current-main
middleware, context, shared selection ownership, TypeBox request and result
schemas, record bytes, selection outcomes, inferred client branches, and
Provider collaboration remain unchanged under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2g]].

The 28-case focused Governance and service-spine boundary passes, the complete
lifecycle owner passes all 242 cases in 1 minute 40 seconds, and uncached
lifecycle source/test typecheck passes in 17.5 seconds. The selected advisory
Habitat topology, router-authorship, and module-isolation laws report no
Governance finding while retaining unrelated admitted-corpus diagnostics.
Workspace Biome also passes. Root context assembly, broad dependency-lane
authoring, shared release-family placement, and the remaining module shells
stay open under [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2]].
Standing
architecture, oRPC, testing, TypeScript, and structural-quality reviews accept
the corrected checkpoint with no unresolved P0/P1/P2 finding.

The middleware-provenance checkpoint preserves the contextual native
`implementEffect` root and exposes one separate complete base-owned native
author through `createMiddleware`. Packaging, Providers, Releases, and Vendors
author their documented capability middleware from that factory, and each
matching module branch attaches its named middleware through inferred
`.use(...)` composition. SDK-owned baseline observability and analytics
builders remain distinct extension points. Because native context merging is
additive, the checkpoint introduces no `.use<Context>` narrowing claim,
adapter, witness, or shadow context. Habitat proves factory provenance and
named attachment only. The Promise adapter, detached Provider runners, and
broad resource lanes remain open for their owner-local cuts.

The content-workspace checkpoint removes its duplicate Promise port and
detached production runner. The concrete Git/Effect Platform provider now
binds only its exact filesystem layer and exposes one ready
`ContentWorkspaceResource<never>`. The CLI host selects that provider and
passes the same lazy Effect operations through service context; clean, staged,
selected-content, current-main, release, packaging, provider, and Vendor
consumers no longer adapt or execute a second resource form. Typed resource
failure and cancellation remain native. The Vendor capture, mutation,
verification, restoration, and settlement transition retains its existing
uninterruptible boundary, while read-only current-main selection stays
cancellable. Exact Git bounds, closed public results, package bytes, provider
behavior, and Vendor reviewable-change behavior remain the proof boundary
under [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4a]].

This cut changes no native provider state, content repository, Oclif surface,
or resource ownership. Resource-shaped Vendor observation and authoring
assemblies that still sit in module policy remain explicitly open for the next
owner-local deletion; this checkpoint does not promote them into another
service abstraction.

The content-workspace provider passes all 25 mechanics tests and the complete
lifecycle owner passes all 244 behavior tests. Resource, provider, lifecycle,
and CLI typechecks pass through the affected Nx graph; Oclif source/compiled
command parity, the locked lifecycle command topology, the selected service
Habitat laws, strict OpenSpec validation, Biome, and diff hygiene also pass.
Standing architecture, oRPC/Effect-oRPC, TypeScript, Effect, testing, and
structural-quality reviews report no unresolved P0/P1/P2 finding.

The Vendor authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4c]]. Vendor
`status` and `update` now sequence the ready content-workspace,
versioned-content, and clock capabilities directly inside their Effect-oRPC
handlers. Query construction, record decoding, fact validation, payload
comparison, receipt validation, and transition classification remain pure
module policy. The effectful policy facades, detached update transaction, and
`router/index.ts` second face are deleted; module `router.ts` only composes the
named source-lifecycle router.

The shared opening observation remains visibly authored in both operations.
It combines Vendor record and release semantics with two existing resources,
so it is neither a provider-neutral resource nor context-projection
middleware. The installed effect-oRPC input-mapped middleware path accepts
native oRPC middleware only; moving this Effect work there would recreate a
Promise/runtime bridge and would not satisfy update's required post-capture
and post-apply observations. No Vendor observation resource, adapter, runner,
or Layer replaces the deleted facades. The categorical `service/shared`
release-family violation remains the whole-service red corpus owned by
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2]] rather than
being duplicated or partially relocated in this checkpoint.

The focused Vendor suite passes 35 cases, including held-source refusal,
non-fast-forward classification, service-clock provenance, recovery,
cancellation, and repeated convergence. The complete lifecycle suite passes
246 cases; lifecycle source and test typechecks, the full Habitat suite,
owner-scoped router-authorship and imported-export documentation laws, Biome,
and diff hygiene pass. Architecture, oRPC/Effect-oRPC, TypeScript, and
behavior-first testing reviews report no unresolved P0/P1/P2 finding. This
checkpoint changes no provider home, Personal repository, Oclif surface, or
live lifecycle state.

A bounded follow-up closes four transaction-test gaps without changing
production. Vendor update now explicitly proves that an undeclared source
cannot reach remote observation, cancellation during preflight cannot open a
capture, cancellation after capture waits for terminal apply/verification/
settlement before reaching the caller, and a failed first settlement restores
the prior workspace and settles the restored state. The post-capture retry is
read-only and performs no mutation. The focused 26-case suite and lifecycle
source/test typecheck pass on the current resource-owned implementation; no
helper facade or predecessor production code is carried forward.

The import-law checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2h]]. Every
same-module lifecycle edge now uses a normalized relative path, while upward
module edges into genuinely service-wide `service/model/**` meaning use the
one service-private owner alias. Root contract and router composition remain
exact relative module edges, and cross-package capabilities remain package
exports. Nx still sees one lifecycle project; the spelling exposes colocality
and ownership rather than changing the project graph.

The generic Habitat module-isolation packet now detects the same relation for
standalone services and API-plugin service interiors. Same-module, sibling,
root-runtime, and legacy shared owner aliases are inadmissible from modules;
the exact `module.ts`-to-`impl.ts` and middleware-to-base edges remain the only
root runtime exceptions. The packet stays advisory with the other staged
service laws until the repository-wide red corpus is removed. This checkpoint
does not move or legitimize the still-red `service/shared` family, narrow the
lifecycle package import map, or alter any resource, operation, public
contract, provider state, or Personal content.

The Habitat service-blueprint fixture passes 10 cases with 151 assertions,
lifecycle source and test typechecks pass, and all 269 lifecycle behavior
tests pass. The full native module-isolation scan remains advisory and reports
the already-owned service-topology migration corpus rather than allowing it
through a baseline.

The Packaging policy checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2i]]. Cowork v1
entry projection, protocol bounds, and digest derivation now live in
`modules/packaging/model/policy`; the file no longer occupies a generic helper
destination. The package-output resource still owns byte encoding and
publication, and the operation handler still owns sequencing. No public
contract, package bytes, digest, resource call, or provider state changes. The
focused Cowork suite passes all 7 cases, lifecycle source and test typechecks
pass, strict OpenSpec validation passes, and diff hygiene is clean.

The Releases resource-authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2j]]. One named
module middleware now projects the ready content-workspace resource without
constructing clean or staged adapters. The `check`, clean `checkRepository`,
staged `checkRepository`, and `refreshReleaseInput` operations directly author
their resource calls and preserve the exact observation bounds and final
revalidation order.

The direct Releases boundary now consumes only typed classification,
preparation, and finalization decisions over resource facts, while the
explicitly transitional reader still composes them for the open Packaging and
Providers migrations. Releases no longer consumes that reader. A second concrete
clean refusal retains precedence, while two internally eligible captures with
different bindings return the existing `SourceChanged` eligibility issue.
Typed failures remain closed domain results, and defects, interruption, and
resource finalizers remain native Effect behavior. No public contract,
release identity, resource implementation, provider state, or Personal
content changes.

The focused Releases suite passes all 78 cases, including exact six-call clean
sequences, concrete-refusal precedence, binding-only source change, typed
failure mapping, defects, cancellation, and finalization. Lifecycle source and
test typechecks and strict OpenSpec validation pass. The complete lifecycle
suite passes all 272 cases across 31 files.

The Packaging resource-authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2k]]. Separate named
middleware contributions now project the ready content-workspace and
package-output resources without constructing a reader or adapter. The package
operation authors both complete six-call source observations around encoding,
honors a concrete second refusal before comparing eligibility bindings, and
keeps only publication uninterruptible.

Packaging no longer consumes the transitional clean-content reader. Expected
content-workspace failures remain the existing `SourceIneligible` closed
result, while defects, interruption, and finalizers remain native Effect
behavior. The unreachable `SourceReadFailed` TypeBox literal and unknown-error
diagnostic machinery are deleted; the public schema now rejects that code. No
resource implementation, public result kind, Cowork bytes, output settlement,
provider state, or Personal content changes.

The focused Packaging suite passes 30 cases, including exact call order and
bounds, typed failure mapping, defects, cancellation/finalization, concrete
second-refusal precedence, repeat behavior, and publication settlement.
Lifecycle source and test typechecks and strict OpenSpec validation pass. The
complete lifecycle suite passes all 275 cases across 31 files.

The package-output checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4d]]. The neutral
contract now exposes only its Effect resource. The Cowork Effect Platform Node
provider attaches Node platform services to each returned operation and gives
one ready `AgentPluginPackageOutputResource<never>` to the selecting CLI runtime.
Packaging consumes that Effect capability directly through service and module
context; the Promise port, detached runner, result envelope, unwrapping
exception, and both production Promise-to-Effect reconstructions are deleted.

Typed resource failures remain in Effect's failure channel and pure Packaging
policy maps them into the same closed public results and bounded diagnostics.
Output publication remains uninterruptible only at the existing Packaging
transition boundary; the ready provider otherwise preserves caller
cancellation. No service-local adapter, helper, Layer, alternate runtime, or
second resource form replaces the deleted bridge.

The provider suite passes 14 cases with 44 assertions, including typed failure
and cancellation through the ready Node resource. The focused Packaging suite
passes 27 cases, including delayed cancellation across the handler's
uninterruptible publication boundary, and the complete lifecycle suite passes
247 cases.
Resource, provider, lifecycle, and CLI typechecks, `habitat:check` with 31
Habitat tests plus 17 selected source laws, workspace Biome, strict OpenSpec,
and diff hygiene pass. This checkpoint changes no provider home, Personal
repository, Oclif command surface, or live lifecycle state.

The native-provider checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4e]]. The neutral
contract now exposes one closed Codex-and-Claude catalog of discriminated
Effect resources. Each concrete Node provider binds its configured executable
outside the per-session `{ home }` input and supplies `NodeServices.layer` only
behind acquisition. The CLI app selects that catalog once; the service base and
Providers middleware pass and narrow the same value, and provider status, test,
and sync compose its Effects directly. The service host export, Promise
resolver DTOs, Promise-to-Effect helper, and synthetic admission consumer are
deleted.

Target order and bounded probe/inventory concurrency remain explicit. Typed
native failures retain the existing closed provider results, while defects and
interruption propagate through the Effect runtime. Live mutation uncertainty
and exact missing-executable diagnostics are unchanged. The ready-resource
tests cover cold selection, cancellation/finalization, typed failures, and one
real child interruption that returns only after its termination event is
recorded and its PID and process group are no longer addressable. The resource
contract passes 8 tests, the Codex and Claude providers pass 13 tests, the
complete lifecycle service passes 247 tests, and the CLI passes 84 tests.
Resource, provider, lifecycle, and CLI typechecks, `habitat:check` with 31
Habitat tests plus 17 selected source laws, workspace Biome, strict OpenSpec,
and diff hygiene pass. This checkpoint changes no provider home, Personal
repository, Oclif command surface, or live lifecycle state.

The typed Git-tree checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4f]]. The
content-workspace contract now derives its regular-file modes and tree entries
from TypeBox and exposes one bounded typed result. `maxEntries` limits returned
entry allocation while `maxBytes` independently limits native Git stdout. The
Git Effect Platform Node provider owns `ls-tree` framing, fatal UTF-8 decoding,
mode/type and object-format checks, generic path admission, exact duplicate
refusal, and code-unit ordering before freezing the result.

Lifecycle no longer decodes Git tree bytes or revalidates provider-owned object
identifiers. Clean-source and selected-content consumers brand repository paths,
translate modes into payload modes, defensively reject substituted duplicate
facts, and own canonical release paths plus portable case/normalization
collision policy. Unsupported non-regular tree entries become domain
ineligibility; malformed Git protocol remains a source-read failure with its
resource detail intact. No raw-byte compatibility result, parallel DTO, generic
Git facade, or new resource replaces the deleted parsers.

The content-workspace provider suite passes 25 cases. The three focused
lifecycle files pass 39 cases and the complete lifecycle suite passes 250
cases. Resource, provider, and lifecycle typechecks, strict OpenSpec, touched
file formatting, and diff hygiene pass. This checkpoint changes no provider
home, Personal repository, Oclif command surface, or live lifecycle state.

The typed staged-index checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4g]]. The
content-workspace contract now derives one closed staged-entry structure from
TypeBox and returns frozen mode, object ID, stage, and path facts. The Git
Effect Platform Node provider owns terminal-NUL framing, fatal UTF-8 decoding,
object ID width for the repository format, generic path admission, exact
path-and-stage duplicate refusal, entry and byte bounds, and path-then-stage
ordering. Conflict stages and nonregular modes cross as facts; only regular
selected entries contribute blob materialization.

Releases middleware passes the same ready resource through one narrowed
reference. `checkRepository` and `refreshReleaseInput` invoke it inside their
Effect-oRPC handlers and translate its typed failures there. Pure module policy
classifies a nonregular mode as `InvalidTree` before a conflict stage as
`DirtyIndex`, and retains release path branding, case/NFC collision refusal
among distinct paths, membership and payload exactness, opening/closing
identity, and deterministic staged-binding construction from the complete
typed entry set. The mirrored staged anchor, binding, blob, observation,
request, result, reader factory, and port are deleted. Raw index bytes remain
only in the separately owned ordinary workspace evidence observation.

No provider home, Personal repository, Oclif command surface, or live
lifecycle state changes in this checkpoint. The Git provider suite passes 27
tests with 126 assertions; the focused Releases suites pass 31 tests, and the
complete lifecycle suite passes 258 tests. Resource, provider, and lifecycle
typechecks, Habitat source law and formatting, strict OpenSpec, and diff hygiene
pass. The repository-wide imported-export documentation target remains red on
its pre-existing corpus and its Nx input glob is invalid; neither condition is
changed or bypassed here.

The typed tracked-path checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4h]]. The
content-workspace contract now derives one closed tracked-path flag structure
from TypeBox and returns frozen path, cached/skip-worktree/unmerged status, and
assume-unchanged facts. The Git Effect Platform Node provider owns terminal-NUL
framing, fatal UTF-8 decoding, native tag interpretation, generic path
admission, selected-path containment, and deterministic code-unit ordering. A
cached or skip-worktree path has exactly one stage-zero fact; an unmerged path
has one to three repeated facts. Impossible tags or path-state combinations
fail at the native protocol boundary. `maxBytes` bounds native output; the
selected-path set and per-path native cardinality structurally cap allocated
facts without a second counter. `maxPaths` caps only the caller's selected-path
input.

Clean-source policy alone decides whether the complete fact set exactly names
the admitted paths with ordinary cached state independent of provider order,
classifies every noncanonical state as `DirtyIndex`, preserves existing
transition precedence and diagnostic text, compares opening and closing fact
sets, and includes the typed facts in the eligibility binding. Raw tracked-flag
decoding and equality are deleted without changing the separately sequenced
porcelain-status or ordinary-index byte observations. No compatibility field,
facade, helper framework, or new resource replaces them.

No provider home, Personal repository, Oclif command surface, or live lifecycle
state changes in this checkpoint. The Git provider suite passes 31 tests with
162 assertions; the focused Releases suites pass 47 tests, and the complete
lifecycle suite passes 267 tests. Resource, provider, and lifecycle typechecks,
Habitat lint, strict OpenSpec, touched-file formatting, and diff hygiene pass.

The direct current-main checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4i]]. Governance and
Providers now receive the ready content-workspace resource through their
module middleware and sequence the exact Git observations inside their
Effect-oRPC procedure handlers. One successful selection preserves the
existing ordered four ref inspections, two bounded blob reads, and one ancestry
observation. Shared current-main policy is now pure: it parses, canonicalizes,
classifies typed resource facts, bounds public diagnostics, and decides the
final result without executing an Effect.

The root current-main middleware, current-main reader interface, resource
reader, and exact-Git repository facade are deleted together with their
facade-specific tests. Expected content-workspace failures retain their public
classification, while defects and interruption remain outside domain results
and scoped resource finalizers still run. Provider sync obtains a second
complete current-main selection before native mutation. Status and sync author
their orchestration directly in the typed Effect-oRPC handlers; no exported
runner or caller-assembled dependency bag remains. No replacement reader,
repository, helper, port, resource, compatibility path, provider mutation,
Personal mutation, or live settlement is introduced.

The exact ordered resource boundary passes 50 focused Governance and Provider
tests. Public clients prove refusal reaches neither selected-content nor native
state, and that two complete seven-call selections finish before the first
native mutation. The boundary also covers containing-commit and ancestry
refusals, digest and authority mismatch, canonical-main races, typed resource
failure mapping, exact-blob identity, interruption, defects, finalizers, and
pre-mutation revalidation. The complete lifecycle owner passes all 269 tests.
Uncached source/test typecheck, Habitat lint, strict OpenSpec validation, and
diff hygiene pass.

The governance module now owns the same direct declarative boundary. Its two
operations derive directly from Effect-oRPC `eoc` and state their complete
domain, audience, idempotence, audit, and module metadata without importing the
root service builder. The existing TypeBox request and result schemas remain
the contract source. The governance schema and public-client behavior, lint,
typecheck, and staged `require_service_contract_authority` diagnostic form the
checkpoint gate. The remaining governance shell and service-wide laws stay
open under [[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.2 and
5.7]].

The packaging operation also derives directly from Effect-oRPC `eoc`. Its
explicit metadata preserves the existing `basic` audit level and idempotent
repeat contract rather than copying the release or governance audit policy.
TypeBox remains the request and result source, while public-client behavior
continues to prove that an identical repeated package request converges without
rewriting output. The packaging module shell and its remaining ownership edges
stay open under [[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.2 and
5.7]].

The vendor status and update operations now derive directly from Effect-oRPC
`eoc` with their complete `full` audit and idempotent metadata stated at the
module boundary. The public API remains `vendors.status` and `vendors.update`;
this checkpoint does not rename or widen the command surface. TypeBox remains
the request/result source, and the existing public-client behavior continues to
cover read-only status, reviewable updates, restoration outcomes, and
idempotent repeat. The remaining vendors shell stays open under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.2 and 5.7]].

The provider test, status, and sync operations now derive directly from
Effect-oRPC `eoc`. Their explicit metadata preserves the existing distinction:
read-only status uses `basic` audit, while disposable testing and canonical
sync use `full` audit. TypeBox remains the request/result source, and the
provider-local behavior keeps live status observation, disposable-home tests,
canonical convergence, omitted-member retirement, partial-failure reporting,
and mutation-free repeat under their existing owners. Native adapters and the
remaining providers shell stay open under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.2 and 5.7]].

A standing architecture review found that the first Oclif command-plugin
blueprint had incorrectly classified every `plugins/cli/*` package and required
`rawr.kind=toolkit`, contradicting the canonical
`plugins/cli/commands/<capability>` projection topology. The corrected packet
uses placement as identity, removes the second metadata classification, and
keeps the CLI family, package, and source roots closed. Command-plugin manifest contracts
execute the official generator through Bun. All 24 Grit fixtures,
the blueprint-packet topology check, and the live direct-entrypoint rule pass;
the package move is recorded separately by task 2.3a and the verb-first vendor
command move completes task 2.3 without an alias.

The Oclif configuration rules now anchor their JSON constraints at the parsed
document root. This preserves the positive package and compiler constraints
without diagnosing nested `scripts`, dependency, `oclif`, or `compilerOptions`
objects as package roots. The app rule currently locks installed identity,
binary, the declared and composed native extension owner, command discovery,
and the TypeScript mapping. Task 3.3 tightens generated-manifest packaging only
when that behavior exists. The
configuration fixtures and both live rules pass with zero diagnostics.

At the historical consumer checkpoint, the Template `habitat` project pinned
the published Civ7 package:

| Field | Value |
| --- | --- |
| Release | `habitat-cli-v0.1.0` |
| Reviewed source | `d51e8c7454e301bcaba56c8364f5c714d5febca3` |
| Source tree | `5b35c34f2fa13e0eece1ea4cea7e6b1000df71dc` |
| Canonical Civ7 main | `ebf5bbcab1e754a17a63999747f80c5e60b28fb7` |
| Package SHA-256 | `d21f7ab85d9895666174003b7024aa2473e83db047f42bc2c801666e0dd448f5` |

That package supplied the CLI and Nx plugin through the ordinary Bun dependency
graph. Task 5.7e22b supersedes the source-ownership part of this checkpoint;
the table remains exact transfer provenance rather than current package
authority.

## Core Toolchain Grounding

The current Template candidate keeps one explicit workspace toolchain:

| Concern | Template disposition |
| --- | --- |
| Node | supported Node 24 LTS range beginning at `24.18.1`; CI pins `24.18.1` |
| Bun | `1.3.14` package manager and runtime |
| Biome | `2.5.3` workspace hygiene and formatting |
| lintEffect | `@catenarycloud/linteffect@0.0.6` as a separate owner command |
| Nx | `23.1.0` task graph |
| TypeScript | `5.9.3` compiler and compiler API |
| TypeBox | `1.3.8` schema and type authority |
| Oclif | `4.23.29` toolchain with `@oclif/core@^4.13.2` |
| oRPC | `2.0.0-beta.23` contract, server, client, OpenAPI, and Effect bridge |
| Effect / Platform | `4.0.0-beta.101` |

Biome owns ordinary hygiene; Habitat owns positive topology and source
relationships. Full-corpus lintEffect remains outside the required push check.
The strict packed-package consumer rejected Effect beta 102 because its public
declarations reference an absent `SchemaAST.Sentinel`. Native TypeScript 6 and
7 remain a separate migration: TypeScript 6 currently fails six repository
`rootDir` boundaries, while Bun 1.3.14 cannot realize the vendor-prescribed
TypeScript 7 CLI plus TypeScript 6 compiler-API graph without a circular alias.

### Historical Checkpoint Ledger

The remaining entries in this section preserve superseded vendor-migration
observations. They do not override the current package and version selection
above.

That migration now resolves one physical vendor realm:

| Package family | Exact selected version |
| --- | --- |
| Effect | `effect@4.0.0-beta.100` |
| Effect Platform | `@effect/platform-node@4.0.0-beta.100`; transitive `@effect/platform-node-shared@4.0.0-beta.100` |
| Effect-oRPC bridge | `effect-orpc@1.0.0-effect-v4.8` |
| oRPC | `@orpc/client`, `@orpc/contract`, `@orpc/server`, and `@orpc/shared` at `1.14.8` |
| TypeBox | `typebox@1.3.6` |

oRPC `1.14.8` remains the stable N1 profile in the current `dev:orpc` skill.
The `2.0.0-beta` family is a separate preview with different bridge, context,
error, and provider semantics, so it is not imported into this checkpoint.
Published bridge `v4.8` is byte-identical to the skill-frozen `v4.7` source,
tests, and distribution; only its Effect peer floor moves from beta 83 to beta
98, which directly admits the selected beta 100 runtime. The focused admission
fixture originally included Promise-backed failure and cancellation probes as
migration evidence. Those probes retired with the duplicate Promise resource
mirrors. The surviving fixture proves only TypeBox input and output validation
around a native Effect handler. Current typed-failure, defect, interruption,
and finalization evidence belongs to the ready resource checkpoints under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.4a, 5.4d, and
5.4e]]. This is an exact E3-compatible admission, not a claim that `v4.8` is the
frozen profile or that a local cause crosses a wire boundary.

The surviving filesystem and process providers now use Effect 4 Node services,
filesystem, path, child-process, semaphore, result, and finalization APIs.
Provider process timeout cleanup has an explicit force-kill bound. A frozen Bun
install, the lifecycle suite (210 tests), resource/provider suites (71 tests),
CLI binding/context tests (8 tests), the full runtime-realization gate, and
uncached owner lint/typecheck/build all pass. The installed dependency inventory
contains no Effect 3 runtime, direct `@effect/platform`, or mixed oRPC version.

The Biome tooling checkpoint pins Biome `2.5.3` and lintEffect `0.0.6`, carries
the narrow upstream severity compatibility patch byte-for-byte from Civ7, and
exposes both commands through the Habitat project's Nx project. A frozen Bun
install applied the patch; the Biome lint leaf inspected 1,180 files in
327 ms; the Habitat project's lint, typecheck, four tests, and bounded packet
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

The original exact Nx migration pinned `nx` and `@nx/eslint-plugin` to
`23.1.0`, refreshed the lockfile, and applied the official required migration
set. The later Habitat ownership checkpoint removes the ESLint graph adapter
and its synthetic fixture project rather than preserving structural authority
in a lint configuration. The only durable
migration output outside dependency metadata is the official
`.claude/worktrees` ignore entry; the release-tag migration made no semantic
configuration change. At that migration checkpoint the workspace remained at
47 projects with 35 build, 47 lint, 44 typecheck, and 32 test owners. Project
discovery, graph generation, sync checking, all applicable non-root affected
lint/typecheck owners, the CLI build, and the Habitat project tests pass. The
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

At that historical scheduler checkpoint, the required command had explicit
hierarchical owner boundaries. Public
`bun run check` invokes one `nx run-many -t check` scheduler. All 37 current
non-root projects expose a public check, and shared target defaults connect
those checks to one workspace-owned `habitat:lint`, project-owned typecheck,
optional owner verification, Habitat `check:policy`, and dependency checks.
Habitat composes workspace lint, its own typecheck and tests, the selected
local policy batch, and one rule-owned Nx project admission adapter. The later
Manual Phase-Gate Retirement checkpoint below deletes that adapter rather than
preserving a manual graph scanner. CLI adds
Oclif source/build parity through its own `verify` target. The repository
project no longer schedules either owner; it retains repository separation.
TypeBox-validated project-graph admission requires exactly one `type:*` kind
and one public check on every non-root project, plus typecheck on every code
project, with only content and fixture projects exempt from that project-local
target. The resolved check dependency list must retain exactly one shared
`habitat:lint` edge, and every code-project check must retain exactly one
`typecheck` edge, so a project-local Nx override cannot replace the required
foundation. Domain behavior and exact-Git tests remain owner-local rather than
hidden inside merge admission.

The resolved required task graph contains 37 public `check` tasks and exactly
one lint task, `habitat:lint`. The root scheduler law is active in the same
selected Habitat policy invocation as the existing repository laws.

Injected failure checks reject a noncanonical root script, a wrong or missing
shared lint owner, both string and object duplicate lint edges, a package-level
Nx lint target, a root-owned foundational target, and empty, partial, or
duplicate project-local check dependency overrides. The restored graph passes
all 110 required
tasks from an invalidated local cache in 1 minute 46 seconds; an exact unchanged
repeat restores 68 cacheable tasks and completes in 345 ms inside Nx and 0.95
seconds at the shell. The uncached workspace lint takes 331 ms. Fourteen
Habitat project-admission and release-consumer behavior tests pass. The
remaining cold-path cost is the already-declared shared service-rule
diagnostic group, not duplicate Nx or lint scheduling.

An initial diagnostic bound the pre-existing strict `lint:effect` target to
that required edge and exposed 133 existing Effect-style findings. That is a
separate migration corpus, not the foundational lint contract, so the required
edge uses the green repository-wide Biome baseline and retains `lint:effect` as
an explicit later burn-down surface.

This completed the Civ-style scheduler cutover without importing Civ's
repo-local Habitat Nx plugin. Root `lint` now routes directly to the one
workspace lint owner, and the selected Habitat local policy batch enforces that
exact scheduler surface. The selected batch still does not imply that every
registered rule is active. Project admission is now a separate Habitat packet;
its `check.mjs` was an explicit narrow bridge at this checkpoint. The later
Manual Phase-Gate Retirement checkpoint deletes that bridge; Template does not
emulate the pinned consumer's unavailable native Nx runner.

The first [[tasks#1. Positive Habitat And Nx Checks|task 1.6c]] checkpoint now
gives every one of the 38 non-root Nx projects an explicit `project.json` and
public `nx:noop` `check` target. The CLI target retains its Oclif source/build
parity dependency, and the Oclif app and command-plugin topology blueprints now
require the project manifest. The following 1.6c2 checkpoint switches the root
to one project-owned scheduler graph, removes repository-owned cross-scheduling,
and preserves each specialized check at its qualified owner. A changed-policy
input run completes in 5.9 seconds; the immediate unchanged run takes 171 ms in
Nx and 0.54 seconds at the shell. Native Habitat project admission remained
open at that checkpoint and is closed by task 1.6c11 below.

Task 1.6c3 applies the target-composition law from Civ7 branch
`codex/mapgen-final-ratchet-strategy-kind-law` at `64463d1abf` without copying
repository-specific dependency edges. All project kinds use `build`, `lint`,
`typecheck`, `test`, and `check` for foundational CI. Shared Nx defaults compose
optional `check:test` and `check:tools` typecheck leaves, and qualified
`acceptance:<capability>` names identify distinct acceptance behavior. The CLI
now owns `acceptance:oclif` and `acceptance:oclif-native-plugins`; its `verify`
edge reaches the former. The lifecycle service's standard `test` command runs
the complete serial corpus, including both exact-Git suites, instead of routing
through three target aliases. Five package-backed build projects now inherit
the same build cache and output policy rather than repeating it locally. Each
resolved task has one command owner. The lifecycle service retains an
owner-local `cache: false` override for its standard `test` target because the
exact-Git cases exercise the live Git executable; the package script remains
the sole command owner. That paragraph records the 1.6c3 checkpoint; task
1.6c7c later supersedes its project-local lint ownership with one workspace
`habitat:lint` task.

The normalized seven-project source/test typecheck graph passes fourteen tasks
in 14.0 seconds with ten cache hits. Oclif source/build parity plus native
extension install/list/invoke/remove passes in 13.5 seconds. The lifecycle
service passes all 30 files and 209 tests in 88.39 seconds uncached, including
16 Git-eligibility and four repository-selection cases. That target remains
uncached because it observes the live Git executable. The complete required
check passes 134 tasks in 57.3 seconds from the partially cold state. The final
unchanged repeat restores 92 cacheable tasks and completes in 206 ms inside Nx
and 0.70 seconds at the shell.

This checkpoint does not claim the remaining cleanup early. Legacy `sync` and
`structural` targets stay reachable until native Habitat laws replace their
contracts. Native Habitat project inference awaits a published upgraded Civ7
artifact. Root `build`, `test`, and CI script normalization follows in separate
owner-correct checkpoints. See
[[design#Required checks follow the Nx graph|the target composition boundary]].

Task 1.6c4 removes the last duplicate build-output writers. The two nested
provider projects no longer expose `build`; their parent resource packages are
the sole owners of each `dist` tree. An uncached two-parent build completes in
1.9 seconds and emits both provider entrypoints under the parent outputs. Each
parent's production input explicitly includes its nested provider source, so a
provider change invalidates the package build without creating a second build
command or output owner. Provider lint, typecheck, test, and public check
boundaries remain intact.

The focused provider-test run also surfaced an unrelated red baseline in
unchanged `main` source. Package output passes all 12 cases. Export destination
passes 11 cases, while its watcher-based same-path temporary-substitution race
fails reproducibly before reaching the intended assertion. This is not repaired
with a more elaborate race harness.
[[tasks#1. Positive Habitat And Nx Checks|Task 1.6c5]] applies the accepted
local-user threat model and deletes adversarial-only behavior before the root
test aggregate is enabled.

Task 1.6c5 removes that watcher race and its supporting inode-substitution
machinery. Atomic publication still uses exclusive temporary-file creation,
file sync, mode application, and rename. After a temporary file opens, failure
cleanup is limited to its generated, prefix-checked, destination-contained path
and uses `recursive: false`; removal failure remains a typed `CleanupFailed`
result. This branch is carried by the narrow filesystem contract rather than a
replacement-race test harness.
The provider no longer reads file-descriptor and path identities to defend
against a concurrent actor replacing that private temporary path. Its 11
ordinary export, rollback, containment, symlink, nonrecursive-removal, and
pre-open publication-failure cases now pass uncached in 1.2 seconds. The export
capability remains owned for transfer to the dedicated destination architecture;
this record does not claim a current production caller.

The first complete root `test` graph then exposed one native-provider contract
assertion that had never run through the prior hand-selected root script. The
public TypeBox schema admitted an out-of-order sparse-path list even though the
resource contract and test already required canonical distinct ordering. Task
1.6c6 moves that existing invariant into `NativeMarketplaceSourceSchema` and
adds duplicate-path coverage. The owner-local contract suite passes 7/7 before
root script normalization proceeds.

Task 1.6c7 makes each root foundational command a thin selector over the same
named Nx target. It removes the hard-coded build and pretest project lists, the
flattened root Vitest scheduler, unused affected aliases, and comparison-SHA
workflow setup that the all-project required graph never consumed. The existing
CLI integration moves out of the test-helper package and into `@rawr/cli:test`,
so its cache inputs and dependency graph follow the behavior owner. The root
test graph covers 30 project owners. Native Oclif installation stays under
`@rawr/cli:acceptance:oclif-native-plugins`; it is distinct acceptance behavior,
not an implicit part of every project test. No foundational test automatically
starts a workspace-wide build. Existing project-graph admission
now requires the workspace root to remain scheduler-only, so a future inferred
root target cannot recursively enter its own `run-many` graph. The same law
positively asserts the five exact root script mappings. The contained runtime
lab's qualified gate now composes owner targets through `nx:noop` dependencies
instead of starting eleven nested Nx schedulers.

The normalized build graph covers 26 owners and completed in 17.5 seconds from
a partially cold cache. Lint covered 38 owners in 2.0 seconds, and typecheck
covered 36 owners plus seven internal compiler leaves in 2.3 seconds. The first
uncached owner-correct test graph covered 30 owners plus six prerequisite tasks
and passed in 1 minute 42 seconds; its CLI owner passed 83 cases, including the
moved integration behavior. The intentionally uncached lifecycle corpus was the
1 minute 37 second critical path. The changed-input required
check passed 134 tasks in 6.1 seconds; the unchanged repeat restored all
cacheable work and completed in 261 ms. The focused web test and moved CLI
integration both pass through their Nx targets.
The contained runtime-realization lab now records its existing public `check`
target in its architecture inventory and treats that no-op composition face as
admission rather than a proof-bearing lab gate. Its owner-local composed gate
passed all eleven dependencies uncached in 7.2 seconds.

Task 1.6c7a adopts the current Civ7 foundation at
`975d12d143bc64d6ed9f1f9189e6f03616d4da0f`: required CI is one
`nx run-many -t build,check,test` invocation, while shared target defaults own
build prerequisites and Nx owns ordering, deduplication, caching, and
parallelism. Habitat remains a project-owned `check` dependency; CI does not
start a second structural runner, and ESLint remains source hygiene rather than
topology authority. The first cold graph passed 181 tasks across 37 projects in
4 minutes 54 seconds. An unchanged repeat restored 139 tasks and passed in
1 minute 45 seconds; the explicitly uncached lifecycle test target was the
1 minute 44 second critical path. Cache admission for that deterministic suite
and CI cache persistence are therefore a separate performance checkpoint, not
extra scheduling machinery in this foundation node.

Task 1.6c7b admits the deterministic lifecycle suite to that shared cache and
persists Nx's task payloads and database index in required CI using the cited
Civ7 foundation's operating-system and repository-configuration cohort. Both
paths are required by the database-backed cache in the admitted Nx version. The
save key also carries the Git revision so GitHub's immutable cache can advance
after source-only changes. The uncached owner run passed 215 cases and all four
prerequisite builds in 1 minute 35 seconds; the unchanged repeat restored all
five tasks and completed in 76 ms. This adds no remote cache service, retry,
lock, explicit parallel batch, or second Habitat invocation.

The first clean CI graph also exposed one omission in the earlier package-less
API-plugin conversion: the deleted plugin manifest's public
`@rawr/example-todo` dependency had not moved to the root package that now owns
package resolution for that source project. The root now declares the existing
workspace package, while Nx retains the project dependency edge. No alias,
resolver patch, source-path import, or plugin package is introduced. With the
stale plugin-local workspace links removed, the HQ app passed 10 cases and the
server passed 44 cases against ordinary root package resolution.

The active policy batch now contains twelve green laws: packet topology, the
repository AGENTS placement relation, agent-router shape, Grit helper
documentation, the API-plugin boundary, the lifecycle command-channel law, all
three Oclif app laws, and all three Oclif command-plugin laws. Rewriting the
AGENTS shape query from six repository
traversals to one reduced its uncached runtime from 71.3 seconds to 2.7 seconds;
the complete policy target passes uncached in 5.2 seconds. The Example Todo
public client now calls through the real external API boundary, and explicit Nx
edges connect both app hosts to the package-less API project and that project
to its service, SDK, and runtime context owners. A change to the API face
therefore selects both consumers.

Before this hierarchy-only recut, the first recorded complete run covered 47
projects and restored all 93 lint/typecheck tasks in 85 ms. The Nx admission
tests restored in 19 ms; Biome checked all 1,184 admitted files in 652 ms after
the record changed; the Habitat project tests restored in 17 ms; repository
separation passed; and live Habitat completed in 577 ms. Total wall time was
4.9 seconds. The immediate unchanged repeat restored the Nx admission tests in
15 ms, all 93 lint/typecheck tasks in 77 ms, Biome in 15 ms, and the Habitat
consumer tests in 14 ms. The project-graph law and repository-separation guard
reran, as did live Habitat in 322 ms; total wall time was 3.25 seconds. A
separate uncached run of the five Nx admission tests plus their lint and
typecheck owners completed in 952 ms.

The first restacked service-law candidate exposed a nondeterministic provider
failure in `require_grit_helper_comments`: identical Git trees both passed and
failed when pinned Grit returned malformed diagnostic output. The helper law
already ran in its own native Grit invocation, so no Nx split, retry, scheduling
lock, or parser recovery was added. The law instead removed
its embedded JavaScript parser and now expresses first-fence selection and the
adjacent non-empty comment relation directly in GritQL over the Markdown AST.
At that checkpoint, `habitat:check:policy` composed one selected source-law
batch, including the lifecycle command-channel law, with the rule-owned Nx
project admission adapter. The later Manual Phase-Gate Retirement checkpoint
removes the adapter rather than retaining a direct script invocation. Its
cache inputs included each rule's owner tree. `repository:check`
does not start a redundant owner process; the
service's required `check` path no longer starts its legacy `structural`
Habitat invocation a second time. Every selected rule remains required through
the hierarchy described by
[[scripts/habitat/AGENTS#Flow|the Habitat execution boundary]]. Before the
native-rule correction, the combined policy target passed uncached in 5.4
seconds with one shared structure traversal across six laws. Three uncached
repository checks passed in 15.3, 16.0, and 12.9 seconds with 17 dependencies
instead of 18; the cached public `bun run check` completed in 7.7 seconds.

Task 1.6c7d corrects the remaining consumer-side concurrency gap without
weakening admission. The six package-inferred Habitat owner batches previously
entered the Nx graph as independent tasks, which let six native Grit processes
compete during a cold hosted run. Five filtered Nx dependencies now form one
owner-batch lane while preserving every inferred dependency through Nx's
`"..."` merge token. All other tasks remain parallel-capable, and protected CI
continues to run the complete `build,check,test` graph. The portable package
also removes the historical Darwin-only prerequisite, so the protected job now
uses the same standard Linux runner as the Civ7 source repository. No lock,
retry, wrapper, alternate policy runner, or Habitat SDK fork is introduced. The
resolved cold graph retains all 165 tasks. It passed locally without cache in 2
minutes 34 seconds; the critical path was 1 minute 11 seconds and 1 minute 24
seconds remained parallelizable. Nx has no target-scoped concurrency group, so
direct execution of a later owner batch also schedules its lane predecessors.
That is an accepted bounded execution cost, not a new subject dependency or
authority relation.

The workflow remains named `Repository Ratchet`; its job publishes the context
`Required lint, typecheck, and topology`. It checks the exact candidate and
runs the complete project-owned `check` graph without constructing an unused
affected comparison. Live ruleset `19508824` is active on `main`,
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

Personal source skills keep repository mechanics outside content authority:
they reject repository-local `.repos` prerequisites and symlinks. Current
Inngest guidance provides an explicit caller-owned cache-root source oracle;
oRPC, effect-oRPC, and Effect accept exact caller-owned source roots only when a
claim requires implementation inspection. Governed vendor-content sync copies
only redistributed skill bytes into reviewed Personal content. None of those
inputs is a controller, provider identity, repository synchronization path, or
symlink channel.

## Standing Reviews

Architecture, TypeScript/structural quality, and behavior/testing review every
semantic slice. These subject roles remain standing and join a review when the
slice touches their boundary:

- Oclif/Nx release architecture for CLI build/package/release;
- oRPC and Effect-oRPC for contract/router/context/integration;
- Effect/Platform for filesystem, process, and resource lifetime;
- TypeBox for schema and generated-type authority;
- canonical Personal-main Inngest compatibility for accepted subject content,
  package closure, or provider settlement.

The Inngest review uses historical accepted review input
`1e7f346b9b0fb7b356675d3e837295256bda7d0d`, now contained by current
canonical Personal `main` `7c25bb4b09b3400f6c76913dccfa181171824fed`, and reads
`plugins/agents/dev/skills/inngest/SKILL.md`, then
`plugins/agents/dev/skills/effect-inngest/SKILL.md` when Effect adaptation is
present. Live provider caches remain stale until ordinary settlement. The
review does not authorize a separate release path.

## Current Gates

| Gate | State |
| --- | --- |
| Corrected authority record | Landed; next boundaries are Personal content closure and provider acceptance |
| Generic Habitat blueprint port | Six service-construction laws are landed and enforced with empty baselines and zero findings across the admitted corpus |
| Generic Oclif blueprint source | Source and built application conformance are landed; disposable provider acceptance remains |
| Complete Nx check/typecheck population and shared lint | Complete and wired through one all-project check graph on the active Template stack |
| Habitat product realization | Template-owned resource, provider, service, Oclif/Nx projections, app composition, policy-pack construction, registry publication, idempotent consumer initialization, native version-two execution, released consumer cutover, and the complete service-law admission are landed |
| Workspace toolchain | Node 24.18.1, Bun 1.3.14, Biome 2.5.3, Nx 23.1.0, TypeScript 5.9.3, TypeBox 1.3.8, Oclif 4.23.29/core 4.13.2, oRPC 2 beta 23, and Effect 4 beta 101 are explicit |
| Required Habitat/Nx check hierarchy | Public `bun run check` schedules every project check once; one workspace lint task, owner-local typecheck/verification, and 41 inferred enforced Habitat rules across six owners are active; the required gate and canonical landing are green |
| Mandatory module context curation | The complete standalone and embedded-API service corpus curates route vocabulary through the downward context funnel; all six shared service laws are enforced with empty baselines and zero findings |
| Habitat execution normalization | The portable package removes the provisioner, hand-maintained selectors, and second Stop graph on canonical `main`; the service-law admission is landed |
| TypeBox contract property descriptions | Complete; one shared Magic pattern, bounded standalone/API applications, empty baselines, and zero live findings |
| Direct Oclif development and external extension path | Complete; source/built entrypoints, native ownership, disposable round trip, and controller-embedded custom-manager deletion are green |
| Public distribution | The private `rawr` application and its internal Template dependency graph are absent from Nx Release. Habitat SDK and CLI `0.4.2` are the only supported public distribution artifacts; all eighteen names in the rejected RAWR `0.1.0` candidate cohort return `404` from npm. |
| Custom controller/extension deletion | Distribution, selector, release package, authority resource, reentry, workflow, diagnostics, and persistent data root deleted; exact canonical deltas are aligned and archive-time application plus aggregate absence proof remain |
| Persistent agent artifact/projection store deletion | Complete; the store remains absent and task 5.5d1 proves the caller-root-bounded provider-test marketplace without adding replacement state |
| oRPC 2 and Effect 4 runtime realm | Complete and green on the active node: exact oRPC beta 23, official Effect bridge beta 23, Effect/Platform beta 101, TypeBox 1.3.8, and Standard Schema 1.1.0 form one native realm with no community bridge, predecessor facade, or mixed checkpoint |
| Bounded lifecycle simplification | Direct exact-Git native reconciliation, state deletion, positive module topology, the context funnel, operation-use audit, and disposable provider acceptance are complete; governed current-main and approved-home settlement remain |
| Personal content-only recut | Pending |
| Disposable provider acceptance | Complete; real Codex and Claude v1, targeted v2, retained-inventory, and mutation-free repeat proof passed in one caller-owned root |
| Approved-home settlement and read-only repeat | Pending |
| Repository/stack/worktree closure | Pending |

The initial generic Habitat blueprint port remains a separate historical
checkpoint: twenty-six logical files followed Magic Migration commit
`5a974f0047f0667c2e429fdb4193a0e237b067c4`; nineteen are byte-verbatim and the
seven historical rule manifests adapt only RAWR identity, formatting, and the
local canonical `pattern.md` source name. The committed service-law checkpoint
identified above supersedes both that initial port and the later relaxed
working-snapshot adaptation. The current packet requires a closed module
`contract/` directory whose `index.ts` composes direct semantic leaves, a
closed `router/` directory containing named operation-authoring leaves without
a barrel, and module-root `router.ts` as the sole router composition face.
Optional module middleware uses an indexed catalog, while service-root
middleware remains a direct leaf set without a barrel. It puts domain matter in direct owner-local model leaves, derives
modules from exact service branches, and closes alias traversal without
baseline entries or compatibility paths. The shared current-main checkpoint moved its complete locator, record,
exact-Git, and selection closure into the shared service model. The later
provider ownership checkpoint removes the remaining release-owned
selected-content import and root middleware edge without creating a third
shared collaboration. Three sibling-module
imports, other module-to-root domain leakage, and a public root release surface
remain migration inputs, not accepted debt or baseline entries.
Central activation remains governed by
[[tasks#1. Positive Habitat And Nx Checks]] task 1.5e, the complete task 5.7e2
live-corpus burn-down, and task 5.7e22's upstream Habitat Nx-plugin boundary.

[[tasks#1. Positive Habitat And Nx Checks|Task 1.1d]] refreshes the three
shared laws without changing that activation gate. `base.ts` remains a required
API boundary/type anchor rather than a standalone runtime export; oRPC ownership
bindings are runtime imports; and one exported module contract may use only
bounded private support that is syntactically reachable from that contract.
The two byte-identical Magic laws and the contract law adapted only through the
RAWR TypeBox bridge carry no ESLint or `.mjs` source authority.

Habitat owner test, typecheck, and repository hygiene passed through Nx; strict
OpenSpec validation and whitespace validation passed. A focused live invocation
of the three refreshed rules did not terminate in Grit and was stopped by exact
process identity, so it contributes no admission result. The laws remain
inactive while the Nx/Habitat execution boundary and remaining lifecycle
topology, context, and module-isolation disagreements are burned down; none is
baselined.

The earlier lifecycle composition checkpoint implemented the now-superseded
task 5.2a shape: the standalone Effect-oRPC root exported `impl`, the root
router and five modules consumed that name, and middleware order remained
unchanged. Its focused live run reported eleven source files below nested
module router directories; owner-local lint/typecheck completed through Nx in
11.8 seconds, and the then-current six service-spine and Effect-oRPC admission
cases passed in 2.25 seconds. Those observations remain migration evidence, not
current authority. The corrected service law instead requires `base.ts` to own
the complete context declaration and an `os.$context<Context>()` author only
when context-authored middleware consumes it. `impl.ts` owns the sole native
`implement(contract).$context<Context>()`, the official Effect extension when
Effect procedures require it, the unconfigured `impl`, and the configured
`service`. Each module descends from its exact `service.<module>` branch,
terminally curates its handler vocabulary, and composes completed operation
leaves through its module-root `router.ts`. The root router imports those
completed plain module routers and performs the sole aggregate implementation
through `impl`.
The lifecycle service does not yet conform, so the rules remain outside the
selected policy batch until tasks 5.2b and 5.7 seal the live corpus.

The former v0.1.1 live-tree probe exposed an unbounded wildcard walk and was
interrupted without repository mutation. At the superseded standalone
checkpoint, the v0.1.6 binary added a
single fail-closed Git-visible inventory, bounded Picomatch-aware traversal,
Effect Platform no-follow reads, and non-baselinable acquisition failures.
The immutable Civ7 release workflow rebuilt and published the exact source with
Bun 1.4. Template invoked the verified executable directly from Nx; no
JavaScript check wrapper, SDK source, or worktree path remains in the gate.
Habitat delegates pattern execution to the pinned Grit dependency, so the
required workflow provisions Grit explicitly after its `--ignore-scripts`
install; the repository check itself remains read-only.
Repository-owned router placement under `rawr/repository` rereads the live
Git-visible inventory on every required run and completes in under a second.
The generic agent-router blueprint owns only document source shape. The
independent Grit router-shape target runs
cold in roughly 70-95 seconds, then restores from the local Nx cache in under
50 ms until a router, its rule packet, or its toolchain changes. Live canaries
proved that a new routerless package and an incomplete blueprint packet both
miss the prior successful cache entry and fail their owning rule. A separate
ordinary-source canary reran live placement while reusing the router-shape
result, completing the repository topology gate in under one second.
Task 1.5 still owns the native packet-fixture gap.

The RAWR-authored Oclif blueprint source is a separate positive checkpoint. It
defines one closed executable app shell, one uniform host-composed
command-plugin shell, direct production/development entrypoints, compiled
command discovery, an explicit TypeScript source-to-output mapping, a
package-owned `oclif manifest` command inferred by Nx, default command exports,
no command-plugin-to-command-plugin dependency, and rejection of mechanical
package-directory imports. Habitat owns admitted source and graph policy,
TypeScript package exports own public compatibility, and Nx observes resolved
edges while scheduling checks. The packet does not encode a product command
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
Nx targets. The standard `typecheck` target depends on `check:test` through the
shared target defaults, so package manifests do not repeat the same graph or
cache policy. The ten-task uncached run passes in 12.8 seconds; after cache
population, the unchanged repeat is a 100% cache hit in 25 ms.

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

The vendor CLI projection is now verb-first at
`rawr agent plugins status vendors` and `rawr agent plugins update vendors`.
The oRPC owner and procedure identities remain `vendors.status` and
`vendors.update`; only the Oclif word order changed. Exact command inventory,
compiled/source discovery, the exported command catalog, and explicit refusal
of both old paths are green across 21 focused cases. The CLI build, lint, and
typecheck targets pass, and the closed command-channel Habitat rule passes in
23 ms. No alias or compatibility command was added.

The CLI app now composes `@oclif/plugin-plugins` directly. Its current native
surface is `plugins`, `plugins:{add,inspect,install,link,remove,reset,uninstall,unlink,update}`,
and Oclif reports `@oclif/plugin-plugins` as the owner of every command. The
app-local wrappers, bootstrap, registry reconstruction, staging, import
sandbox, recovery path, custom doctor projection, and their tests are deleted:
roughly 7,900 lines removed with no replacement manager. CLI extension source
authoring remains separate and non-mutating. The required repository check runs
the two selected Oclif Habitat rules and one isolated source/compiled ownership
suite. It requires Oclif's canonical operations and native ownership of every
discovered `plugins` command without freezing upstream convenience aliases. The
uncached ownership target and its five builds complete in 13.2 seconds,
including 2.6 seconds for the isolated behavior case; the selected Habitat
rules complete in 117 ms. The unchanged combined repeat is a 100% cache hit in
28 ms. CLI build, lint, and typecheck pass together uncached in 12.5 seconds.
Copies embedded only in the rejected controller distribution remain pending
deletion with task 4 rather than being adapted to this native path.

The owner-local native extension acceptance runs the built Oclif entrypoint in
one disposable state root. It gives Oclif and npm explicit `HOME`, XDG data,
config, and cache roots; npm cache, prefix, user/global configuration, and
registry inputs; and inert Codex and Claude homes. The native manager requires
a `file:` URL for a local package because a bare filesystem path is repository
shorthand. It observes the Hello fixture absent, installs and lists it as an
Oclif user plugin, invokes `hello`, uninstalls it, and observes both inventory
and command absence. The fixture package manifest and provider sentinels remain
byte-identical. Cleanup is registered before setup and refuses recursive
removal unless the canonical path is a non-symlink directory directly under
the canonical temporary parent with the exact acceptance prefix.

The CLI declares Bun `>=1.3.14` for its entrypoint and Node
`^20.19.0 || >=22.9.0` for the bundled npm `11.9.0` used by native extension
installation. Task 3 re-derives these requirements from the packed closure.
The stateful target is uncached and composes the cached source/built ownership
oracle with the Hello manifest owner. Its behavior case completes in 4.6
seconds; an uncached dependency graph including CLI/core-plugin builds and the
fixture manifest completes in 21.5 seconds. It remains outside the fast
repository check and becomes a mandatory publication predecessor in task 3.
The native case has its own Vitest project, while the cacheable `cli` project
continues to discover only the 129 deterministic behavior cases.

The final task-2 gate passed the native acceptance again in 4.5 seconds, the
Hello behavior and manifest owners in 1.6 seconds, and uncached CLI/Hello build,
lint, and typecheck in 12.9 seconds. A complete pre-separation CLI run passed
all 129 deterministic cases plus the native case; project discovery now proves
the native file is absent from the cacheable suite and present exactly once in
the uncached acceptance project. The required repository check passed with
91 of 98 affected lint/typecheck tasks restored from Nx cache, both Oclif
Habitat rules enforced, repository separation intact, and the source/built
native ownership oracle restored. Strict OpenSpec, Biome, and diff hygiene are
green. Standing Oclif architecture, Nx structure, and behavior/testing reviews
found no blocker.

The post-cut CLI suite is green at 129 tests, but its uncached target still
takes 3 minutes 16 seconds. The rejected artifact-store vertical alone takes
87.2 seconds. This is not accepted as healthy test
infrastructure: tasks 4 and 5 delete the custom distribution and persistent
artifact verticals that dominate it rather than optimizing rejected machinery.

The first controller-deletion checkpoint removes the complete private
distribution: 36 controller build/selection files, the installed-release
workflow, global install/activate wrappers, obsolete Phase C distribution gate,
controller classification and `doctor global`, the dead release inspector and
runtime context, and the 17-file `@rawr/controller-release` package. The release
package had no live runtime caller after global diagnostics were removed; its
remaining context chain was unused, so retaining it for a later bridge would
have manufactured reachability. The agent-plugin layout now accepts only the
plain data-root value it actually consumes.

At this first checkpoint Nx reported 46 projects and no
`@rawr/controller-build` or `@rawr/controller-release`; the controller
authority resource was still explicit for task 4.2b. The
post-deletion CLI suite passes all 109 remaining tests. Uncached CLI lint and
typecheck pass in 14.3 seconds. The source/built Oclif inventory and direct
invocation both reject
`doctor:global`, and the full native extension install-list-invoke-remove
acceptance passes in 4.8 seconds within its guarded disposable root. Active
operator guidance now uses `bun run rawr -- ...` and truthfully records the
fixed Nx Release package group as pending. No repository release, provider home,
Personal repository, or old global installation was mutated.

This first checkpoint does not claim lifecycle decoupling: the service runtime client
still resolves controller reentry and its data root through `@rawr/core` and the
controller-authority resource. Task 4.2b removes that live identity together
with the persistent lifecycle roots; task 4.6 remains open until direct status
execution is green without it.

The next bounded CLI checkpoint removes controller reentry from the unrelated
`routine check`, `routine snapshot`, and `workflow harden` commands. Recursive
commands now invoke the current Oclif entrypoint with the current process
runtime, operator working directory, and inherited environment. Source and
built Oclif entrypoints exercise this path without controller variables;
`routine snapshot` reads the current Oclif version directly and avoids two
redundant child processes. Focused behavior tests pass in 9.7 seconds, and
uncached CLI lint and typecheck pass in 14.9 seconds. Agent-plugin lifecycle
reentry remains explicitly pending under task 4.2b rather than being hidden by
this generic CLI correction.

The bounded lifecycle-state deletion removes that remaining controller
authority and reentry together with `rawr agent plugins build`, the persistent
release/set repository, custom evidence publication, retention planning, and
every associated reader, writer, context field, and test fixture. Release check
now returns only bounded derivation facts. Packaging and native provider
operations independently read the selected immutable Git objects and derive
their release model in memory. The CLI supplies ordinary explicit Git and
provider executable bindings and owns no lifecycle data root.

The deletion is intentionally one reader-and-writer checkpoint: separating the
CLI reader from the service writer would leave a reachable half-migrated state
owner. It adds no compatibility command, retained handle, alternate root, or
cleanup scan. Task 4.6 remains open until the integrated source/built command
surface and read-only status path pass after the Effect-backed service migration.

The resulting source checkpoint removes 8,000-plus lines and both rejected Nx
projects. The regenerated Bun lockfile contains neither resource package. The
source Oclif help exposes exactly check, create, package, test, sync, status,
status vendors, and update vendors; build is absent. Uncached Nx build, lint,
and typecheck for the service, CLI, and core pass in 17.2 seconds. The complete
service behavior set passes 206 tests in about 75 seconds across its parallel and
serialized exact-Git owners. The complete CLI/core Nx test run passes 94 tests
in 91 seconds, down from the pre-deletion multi-minute path. No live provider,
repository release, Personal source, or global CLI state was touched.

A later deletion closes the stale DevOps tail of that same diagnostic surface.
`dev repo sync-upstream` no longer accepts `--inspect-after`, and the service no
longer accepts `inspectAfter` or returns `followUpCommands`. Both planned
commands were already invalid: `doctor global` had been deleted and external
extension inspection belongs to native Oclif rather than `plugins list`. The
worktree-cleanup follow-up contract remains a separate capability. Owner lint,
typecheck, behavior, manifest generation, closed TypeBox input/result checks,
and the public [[scripts/habitat/AGENTS#Flow|repository check hierarchy]] are
green; no command replacement or new state owner was introduced.

### Canonical Spec Disposition

The canonical-spec audit records this exact disposition:

- Delete `rawr-controller-authority`, `agent-plugin-build-artifact-store`,
  `agent-plugin-managed-export`, `agent-plugin-promotion`,
  `agent-provider-projection`, and `agent-plugin-undo-capsule`.
- Rewrite `agent-plugin-command-lifecycle`,
  `agent-plugin-lifecycle-mode-selection`,
  `agent-plugin-lifecycle-service-topology`, `agent-plugin-packaging`,
  `agent-plugin-release-product`, `agent-provider-deployment`,
  `external-cli-extension-boundary`, `legacy-membership-retirement`,
  `mixed-plugin-lifecycle-retirement`, and `qualified-artifact-authoring` so
  ownership belongs to native Oclif or provider state where applicable.
- Retain `agent-plugin-vendor-management`.
- Add `agent-plugin-channel-selection`, `agent-plugin-release-derivation`, and
  `rawr-cli-application`.

The active removal deltas now use the canonical requirement names exactly.
Canonical specs remain unchanged while this change is active;
[[tasks#8. Closure|task 8.3]] applies the complete validated delta set atomically
when the change archives instead of maintaining duplicate active and canonical
edits.

The persistent-state audit found no remaining release/set repository,
projection store, provider receipt or identity sidecar, custom evidence store,
retention planner, or controller data root. Task 5.5d1 is closed: provider tests
converge the exact selected marketplace at one reserved child below the explicit
disposable root and perform no write when the exact tree already exists. Each
live call exclusively owns that root; sequential calls may reuse it after
settlement, while concurrent calls use distinct roots. The caller's Git checkout,
disposable parent, and provider homes remain outside service deletion authority;
no handle or store is created.

The earlier owner-qualified lifecycle dependency mega-pattern is retired rather
than carried into the corrected required check. It enumerated package names, exact
composition files, and the now-rejected artifact/evidence repositories. Those
are transient implementation details, not one reusable structural axis. The
generic service and Oclif blueprints carry their exact source relationships,
TypeScript package exports carry public compatibility, and the remaining
lifecycle niche rule is limited to the curated command channel until task 2
replaces that topology. The coarse ESLint project-kind matrix is retired rather
than claimed as migrated. The remaining resolved project-quality axis is
separately admitted by Habitat over the Nx graph through task 1.6c11.

The generic blueprint packet filename set is now closed: every current packet
contains its rule, locked baseline, and only canonical `pattern.md` or
`structure.toml` executable source. The current structure rule proves the
closed allowed filename set; it cannot prove that `rule.json` selects exactly
one present native source. The pinned Habitat binary also does not expose a
native packet-fixture runner, and its live wildcard walk is not bounded against
installed dependency trees, so this repository does not add a parallel
Markdown fixture parser or wrapper. Exact selected-runner participation,
native pattern fixtures, and full live-tree policy activation remain open
until a suitable standalone asset is published.

The private service-alias checkpoint uses workspace-gate acquisition for both
manifest declarations and source edges. Only an exact top-level
`services/<owner>` or `plugins/server/api/<owner>` may declare and consume its
matching private alias; root files, tools, scripts, foreign owners, cross-kind
owners, and nested lookalike paths are rejected. Introduction probes placed an
invalid declaration and source import under `tools/` and observed each rule
fail on the exact file, then placed an owner-local service import and observed
the source rule pass. All probes were removed. Embedded pattern examples remain
authoring evidence because the pinned Habitat binary has no native example
runner; this checkpoint does not call them executable fixtures.

The earlier [[tasks#1. Positive Habitat And Nx Checks|task 1.6c8a]]
checkpoint replaced the only independent behavior worth retaining from the
dead HQ Ops boundary scanner with one generic declaration-level Habitat source
law. The current service-law checkpoint strengthens that rule across the full
production service surface: concrete `node:` and `bun:` acquisition belongs in
resources/providers, while services consume ready capabilities through context.
The stronger rule remains advisory and outside the selected repository batch
until task 5.7e2 removes the known live-corpus violations. The old scanner
remains deleted rather than becoming a second evaluator, and its helper-name
blacklist is intentionally not migrated because filenames do not establish an
infrastructure boundary.

Personal PR #182 (`9378d33b`) and child PR #183 (`852702b8`) are not valid
settlement inputs in their controller-bound form. They remain unlanded; prior
required jobs were blocked before runner allocation by account billing. Do not
bypass the gate. Recut or close them under [[tasks#6. Personal Content-Only Settlement]].

The existing repository `immutable-releases` setting was enabled during the
earlier controller work. It authorized no release dispatch. This correction
does not churn the setting or perform another repository mutation; any future
repository release action waits for the conventional CLI release container.

The selected-content packaging checkpoint is
`8f4ea80979776319279d6c68632b0515b154010c`. Packaging no longer reads a
persistent artifact repository or accepts an artifact handle. The typed
operation takes one exact Git selection, derives the targeted release or
complete release set in memory, renders deterministic Cowork ZIP bytes, then
revalidates the exact Git selection before the explicit output can change.
TypeBox owns the canonical non-root output path and every request/result shape;
the Cowork projection policy accepts only releases plus an optional release
set, while the package-output resource owns byte encoding. Neither boundary
carries a retired handle.

The focused lifecycle run passed 38 cases, including 20 packaging-owner cases
that observe targeted and complete-set ZIP membership and bytes, unknown-member
refusal before encoding or publication, read-only repeat, source-change
rejection before output, and exact pre-mutation failure mapping. Two focused
CLI parser cases, uncached CLI and service lint/typecheck, the service and Oclif
Habitat topology checks, and diff hygiene are green. Standing TypeScript,
TypeBox, oRPC-structure, testing, and state-transition reviews approved the
slice. This closes only task 5.5a in
[[tasks#5. Bounded Agent-Plugin Lifecycle Service]]; persistent build,
provider, retention, and controller readers remain open under task 5.5.

The canonical `@rawr/hq-sdk` TypeBox bridge now uses TypeBox 1.3.6 native
`Value.Check` and `Value.Errors` without reconstructing Standard Schema paths.
That TypeBox version emits raw, unescaped `instancePath` strings, so slash keys
and nested keys as well as numeric keys and array indices are observationally
ambiguous. The bridge therefore returns message-only issues instead of
URI-decoding or guessing. Its owner-local Nx test proves exact native TypeBox
message mapping with no invented paths; build, lint, typecheck, Biome, and diff
checks are green. See
[[tasks#5. Bounded Agent-Plugin Lifecycle Service]] task 5.6b.

The content-workspace provider now resolves `git` through the ordinary process
environment. The CLI no longer accepts or requires `--git-executable`, and the
resource no longer authenticates an executable path, rewrites Git
configuration, injects local-read command configuration, or defers command
binding through a retry state machine. The optional constructor command remains
only as a focused-test seam. Provider tests pass 25 cases; the affected CLI
tests pass 19 cases; the exact-Git service target passes 209 behavior cases
including its declared dependencies. CLI and provider lint/typecheck, CLI
build, Biome, and diff hygiene are green. See
[[tasks#5. Bounded Agent-Plugin Lifecycle Service]] task 5.6c.

The first module-sealing checkpoint implements the governance boundary described
in [[service-domain-frame#Module Capability Set]]. Governance now owns only its
two public operation DTOs, codec policy, narrow current-main middleware, and
flat router. That router shape records the historical checkpoint, not final
service-law admission: task 5.7e now requires module `router.ts` to compose
named `router/*.router.ts` operation leaves. Current-main selection remains a
shared service collaboration because providers consume the same resolved
selection; the module projects the host-provided reader instead of acquiring
Git a second time. The duplicate repository middleware, telemetry, and schema
barrel remain deleted.

The governance gate passes 32 focused behavior cases across the record codec,
selection policy, exact-Git typed client, closed TypeBox schemas, and provider
service spine. Service source/test typecheck, workspace Biome, the complete
selected Habitat source-law batch, the lifecycle owner gate, and diff hygiene
pass.
Standing architecture, TypeScript/oRPC/Effect, testing, and structural-quality
reviews closed without unresolved P0/P1. This completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7a]] without claiming
the remaining module or root-service work complete.

The narrow release-input checkpoint now removes the implementation-bearing
`@rawr/agent-plugin-lifecycle/release` package export. External code receives
only two input limits and six TypeBox-backed CLI value parsers through
`@rawr/agent-plugin-lifecycle/input`; release schemas, constructors, codecs,
serialization, digests, payloads, releases, and release sets remain private.
The package-surface typecheck rejects the retired export. CLI integration tests
author and validate release-input bytes through the real
`releases.releaseInputRecord` operation, and the obsolete 143-line product
fixture is deleted rather than relocated.

The checkpoint passes 16 focused service cases and 19 focused CLI cases,
service and CLI source/test typecheck, workspace Biome, the complete selected
Habitat source-law batch, the lifecycle owner gate, and diff hygiene. Standing
architecture, TypeScript/TypeBox/oRPC/Effect, testing, and structural-quality
reviews closed without unresolved P0/P1. This completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7b]] and the narrow
package-export checkpoint in [[service-domain-frame#Burn-Down Design]]. The
pre-existing private release parsers still participate in TypeBox refinements;
their deletion is explicitly the next TypeBox release-family checkpoint, not a
claim made here.

The first private release-family checkpoint implements the primitive contract
boundary from [[service-domain-frame#Burn-Down Design]]. Branded repository,
Git, plugin, ownership, path, digest, and file-mode schemas now live beside
their `Static`-derived types in the shared release model. Public input adapters
validate through those schemas, while the domain layer retains only nominal
brands, path semantics, canonical byte ordering, and digest construction.
Parser-backed scalar refinements and duplicate scalar, path, and digest schemas
are deleted rather than retained as compatibility authorities. Unused weaker
identity schemas and higher-level primitive re-exports are also gone, so
consumers name the shared release owner directly.

The checkpoint passes the complete 228-case lifecycle service suite, the
owner-local public-input behavior table, 17 focused CLI boundary cases, service
and CLI source/test typecheck, workspace Biome, the complete selected Habitat
source-law batch, the lifecycle owner gate, and diff hygiene. Standing architecture,
TypeScript/TypeBox/oRPC/Effect, testing, and structural-quality reviews found no
unresolved P0/P1. This completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7c]] without claiming
the ownership, payload, release-input, release, or release-set aggregates
complete under tasks 5.3 and 5.7.

The ownership-family checkpoint implements the closed flow recorded in
[[service-domain-frame#Ownership Family]]. TypeBox now owns the full and
content-declared claim kinds, closed claim records, bounded arrays, ownership
index record, and generated structural types. Domain code retains only member
plugin-claim synthesis, the post-synthesis bound, canonical ordering and
projection, defensive immutability, member coverage, duplicate/conflict
classification, and the shared plugin/alias routing namespace.

Manual object, claim-kind, and scalar parsing, the release-input-local schema
and type guard, duplicate canonical projection, and internal facade exports are
deleted. A wire record receives the trusted ownership-index brand only when
structural, bound, and semantic validation add no issue. Structural failures use
the documented owner-local diagnostic rather than reconstructing ambiguous
TypeBox paths; exact bounded-array diagnostics remain intact.

The checkpoint passes the complete 236-case lifecycle service suite, 32 focused
ownership/release-input/release-set cases, service source/test typecheck,
workspace Biome, the complete selected Habitat source-law batch, the lifecycle owner
gate, strict OpenSpec, and diff hygiene. Standing architecture,
TypeScript/TypeBox, testing, and structural-quality reviews found no unresolved
P0/P1. This completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7d]] without claiming
the payload, release-input, release, or release-set aggregates complete under
tasks 5.3 and 5.7.

The resource/provider structure checkpoint closes the generic package kinds
needed for the next service correction. It follows Magic Migration commit
`e58cbebbee0755faf644aa36c0bd2d2527b79ee5`, resource tree
`c057cfd7a6f7ae310a1e6e6de0b78dbecb607da8`, and provider tree
`218afe721e58774f56af2b9a0d40fefb3d068dc1`. RAWR adapts only packet identity
and its existing Bun workspace resource shell; provider topology is unchanged.
Each resource now has one closed provider-neutral contract/package face, and
each concrete provider has one closed typed implementation face.

Both baselines remain empty and both rules run once through the existing
Habitat source-law target. No custom runner, hook, inventory, or package
exception was added. Direct evaluation passed both rules with zero findings;
the complete selected source-law batch passed 17 rules with zero findings; and
the Habitat project typecheck passed uncached. This completes
[[tasks#1. Positive Habitat And Nx Checks|task 1.4]] and establishes the
structural prerequisite for extracting remote versioned-content mechanics. It
does not claim that loose cross-provider implementation files in the existing
native-provider family are normalized.

The versioned-content checkpoint starts from Template `845d96df` and completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4b]]. Remote tree
observation, materialization, and ancestry now belong to one
`@rawr/resource-versioned-content` contract and one Git Effect Platform Node
provider. Content-workspace retains only local repository observation and
mutation. The CLI app selects both ready resources, service base receives them,
and Vendors narrows them through module middleware. Explicit Nx relations make
provider changes affect the selecting CLI and contract changes affect the
resource, provider, lifecycle service, and CLI.

TypeBox compiled validators own the closed request, result, and failure
structures, including canonical ref and path refinements. Effect owns
filesystem, path, child-process, interruption, and scoped cleanup mechanics.
The provider inherits ordinary local Git configuration and adds no generic Git
framework, session, cache, persistent clone, or product policy. Its guarded
temporary-root finalizer proves cleanup after post-allocation validation
failure and proves interrupted child processes settle before cleanup.

The checkpoint passes the complete 244-case lifecycle suite across 32 files,
the 20-assertion resource contract suite, the 33-assertion provider suite, the
19-case focused Vendor suite, resource/provider/service/CLI typechecks, strict
OpenSpec validation, workspace Biome, and `habitat:check` with 31 Habitat tests
plus 17 selected source laws and zero findings. Standing Habitat architecture,
native/Effect, TypeScript/TypeBox, and behavior-first testing reviews closed
without unresolved P0/P1/P2. Vendor router authorship remains open under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.4c]]; this checkpoint
does not claim that effectful Vendor policy has been retired.

The disposable Provider-test authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2l]]. The typed
`providers.test` operation now performs exact local source selection in its
Effect handler over the ready content-workspace capability. Every selection
performs a complete clean-content observation, validates both native marketplace
manifests against the release input, compares the local manifest bytes, and
repeats those checks before any native mutation. Targeted and complete tests
still preserve omitted members.

The exported test runner, caller dependency bag, root clean-content reader and
port, Provider workspace-resolver branch, duplicate test-mode schema, and
direct helper tests are deleted together. Provider policy retains pure source
interface classification and selected-content projection, while the
service-root release policy owns release and release-set derivation. Those
policy concerns now occupy separate direct model leaves, and the formerly
nested content-workspace DTO is a direct root-model leaf. The channel resolver
and its narrowed read port remain only for status and sync, so this checkpoint
does not claim the complete Providers shell is sealed. Native observation and
mutation still run through the existing reconciliation functions and remain
open for their later operation-authorship checkpoint; this slice does not alter
their behavior.

The focused Provider plus release check/eligibility run passes 77 cases, and
the complete Releases module passes 62 cases. The complete lifecycle service
passes 272 cases. Service source and test typechecks, touched-source Biome,
strict OpenSpec validation, diff hygiene, and the 115-task repository check are
green; the repository gate completed in 44.4 seconds. No Personal repository,
provider home, Oclif surface, Nx graph, Habitat policy, or live lifecycle state
changes in this checkpoint.

The governed Provider-channel authorship checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2m]]. Provider status
and sync consume the same ready content-workspace resource as disposable test,
but each operation owns its channel-specific sequencing. Status performs one
complete current-main and selected-content observation before native
acquisition. Sync performs the same selection lazily, repeats it only when a
mutation may be required, and refuses a rejected or changed second selection
before any native command.

This cut deletes the selected-content resolver, its narrowed read port, the
selection router, resolver context contribution, and resolver-only input
schema. Separate named Provider middleware values pass the ready
content-workspace and native-provider resources downward without adapting
them. Provider policy retains only typed source-interface classification and
selected-content projection. Native observation and mutation remain in the
existing reconciliation functions for the next operation-authorship
checkpoint, so this record does not yet claim the complete Providers shell is
sealed.

Proof is 280 lifecycle tests, production and test TypeScript checks, the
Provider-owned Habitat law, strict OpenSpec validation, and the uncached
repository check across 39 projects and 76 dependency tasks. The repository
check completed in 1 minute 50 seconds. Architecture, behavior-first testing,
and TypeScript/TypeBox/structural standing reviews passed after repairing
release-input/manifest failure precedence and strengthening the cross-resource
ordering and fast-path oracles. No Personal repository, provider home, Oclif
surface, Nx graph, Habitat policy, or live lifecycle state changed in this
checkpoint.

The Provider result-policy checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2n]]. A router leaf
must author an oRPC operation. Target ordering, rejected-target projection,
bounded issue collection, and aggregate classification are inert Provider
policy, so this cut moves them into `model/policy/operation-result.ts` and
deletes `router/result.router.ts`. It also deletes the pass-through selection
observation wrapper and calls the existing selected-content policy directly.
Native observation and mutation remain unchanged for the next atomic
operation-authorship checkpoint.

Proof is 280 lifecycle tests, production and test TypeScript checks, the
Provider Habitat law, strict OpenSpec validation, Biome, and diff hygiene.
Architecture, behavior-first testing, and TypeScript/structural standing
reviews passed with no findings. No Personal repository, provider home, Oclif
surface, Nx graph, Habitat policy, or live lifecycle state changed.

The native Provider operation-authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2o]]. Provider
`status`, `sync`, and disposable `test` now acquire and retain native sessions
inside their own oRPC handlers. Those handlers visibly sequence TypeBox
admission, native observation, whole-target preflight, source revalidation,
ordered mutation, immediate postcondition observation, and final verification.
Pure Provider policy receives only typed facts and returns assessments, bounded
plans, postconditions, issues, and public result projections.

The detached reconciliation engine is deleted rather than renamed or wrapped.
No runner, resolver, facade, compatibility path, state store, or resource
failure surrogate replaces it. The retained behavior includes sequential
all-target preflight, concurrent probe and inventory within each target,
final-preflight session reuse, exact marketplace and member ordering,
Claude-only enablement, test-local omitted-member preservation, sync retirement,
command-phase uncertainty, exact confirmed prefixes, later-target refusal,
interruption, defects, and scoped finalization. An unavailable target cannot be
classified as converged, and an impossible provider command becomes a typed
Provider refusal rather than a fabricated native-resource failure.

The focused Provider suite passes 79 cases and the complete lifecycle service
passes 289 cases across 31 files. Uncached production and test typechecks,
Biome, the Provider-owned Habitat law, strict OpenSpec validation, and diff
hygiene pass. Architecture, behavior-first testing, and
TypeScript/Effect/structural standing reviews closed with no unresolved P0 or
P1 findings. No Personal repository, provider home, Oclif surface, Nx graph,
Habitat policy, or live lifecycle state changed.

The Provider schema-ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2p]]. The module
contract and its boundary tests now import the TypeBox request and result
schemas directly from their owning `model/dto/provider-lifecycle.ts` leaf. The
loose `schemas.ts` re-export facade is deleted, so the module has one schema
authority and no alternate public model face. Schema object identity, generated
oRPC input and output types, runtime validation, and package exports remain
unchanged.

The seven Provider schema-boundary cases, lifecycle production and test
typechecks, the Provider-owned Habitat law, Biome, strict OpenSpec validation,
and diff hygiene pass. Habitat architecture and
TypeScript/TypeBox/oRPC/structural reviews closed without unresolved P0 or P1
findings. No Personal repository, provider home, Oclif surface, resource,
provider command, or live lifecycle state changed.

The Vendor payload-ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2q]]. The
versioned-content and content-workspace resources now remain the sole owners of
Git object shape, object-format coupling, canonical entry mechanics, and the
relation between reported blob identifiers and materialized bytes. Vendor
policy no longer rehashes resource bytes or revalidates those mechanical facts.

Vendor still compares the complete independently observed and materialized
remote identities before authoring. It retains declaration matching, the root
`SKILL.md` requirement, payload digest and provenance, defensive byte cloning,
update classification, and exact authoring settlement. The old fake-resource
case returned unrelated bytes under an unchanged blob identifier and is
replaced by owner-correct oracles for a missing skill entry and a valid remote
advance between the two resource calls.

The 22 Vendor router cases, four versioned-content contract cases, six Git
provider cases, and complete 290-case lifecycle suite pass. Uncached lifecycle
production and test typechecks, resource and provider typechecks, the lifecycle
Habitat owner gate, Biome, strict OpenSpec validation, and diff hygiene pass.
Architecture, behavior-first testing, and TypeScript/Effect/oRPC/structural
reviews closed without unresolved P0, P1, or P2 findings. No new resource,
provider, adapter, facade, state owner, Habitat law, Personal repository
mutation, native provider command, or live lifecycle mutation is introduced.
The required repository check passed 39 projects and 76 dependency tasks in
43.6 seconds, including all 17 enforced Habitat laws with zero findings.

The aggregate payload-accounting checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2r]]. The maximum
decoded bytes admitted for a release set, its checked addition, and its result
type now have one service-root policy owner. Clean and staged observation,
release-input admission and refresh, Packaging, and Provider selection consume
that owner directly. The former `shared/release/payload-bounds.ts` leaf, its
barrel exports, its primitive constant, and two module-flavored pass-through
constants are deleted without aliases or compatibility exports.

Exact-bound and one-byte-over behavior remain unchanged. The focused policy
oracles also reject negative, fractional, and unsafe operands. Release-input
diagnostics retain their exact aggregate facts, and refresh retains its
saturating diagnostic total; those are local observations rather than alternate
limit authorities. The complete lifecycle suite passes 290 cases across 31
files. Uncached production and test typechecks, Biome, strict OpenSpec
validation, and diff hygiene pass. Architecture, behavior-first testing, and
TypeScript/Effect/oRPC/structural reviews closed without unresolved P0, P1, or
P2 findings. No resource, provider, state owner, Habitat law, Oclif surface,
Personal repository, native command, or live lifecycle state changed.

The required repository check passed 39 projects and 76 dependency tasks in
39.0 seconds, including all 17 enforced Habitat laws with zero findings.

The refresh snapshot-authorship checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2s]]. The
`refreshReleaseInput` oRPC handler now takes its invocation-owned defensive
snapshot before planning or the first resource yield. Planning and
post-observation classification consume that same snapshot, so caller mutation
cannot change the in-flight authority or selected members. The one-use detached
router function and its type-only import are deleted without creating a model
export, helper, alias, or compatibility face.

The focused 11-case refresh suite and complete 290-case lifecycle suite pass.
Production and test TypeScript checks, Biome, strict OpenSpec validation, diff
hygiene, and the repository check across 39 projects and 76 dependency tasks
are green. The cached repository graph completed in 42.3 seconds and enforced
all 17 Habitat laws with zero findings. Architecture/oRPC, behavior-first
testing, and TypeScript/structural standing reviews found no P0, P1, or P2
issues. No resource, provider, schema, public result, Personal repository,
native command, or live lifecycle state changed.

The release-diagnostic ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2t]]. The stable
code vocabulary, closed TypeBox schema, inferred types, bounds, construction,
and canonical ordering now have direct service-root DTO and policy owners.
Release codecs and every touched remap or legacy reader construct through that
policy, including empty or oversized paths, nested paths, non-finite numbers,
and sparse claimant arrays. The old `shared/release/issues.ts` owner, its
barrel exports, its generic `issue` name, and the release-refresh duplicate
constructor are deleted without an alias or compatibility face.

The exact vocabulary and numeric bounds are locked by owner-local contract
oracles. Canonical ordering covers every schema field and precomputes each key
once without mutating the caller. The final focused model, release-set,
ownership, and refresh suites pass 37 cases; the complete lifecycle suite
passes 298 cases across 32 files. Production and test TypeScript checks,
Biome on all 19 affected TypeScript files, strict OpenSpec validation, and
diff hygiene pass. Architecture/oRPC, behavior-first testing, and
TypeScript/TypeBox/structural standing reviews closed without unresolved P0,
P1, or P2 findings. The repository check passed 39 projects and 76 dependency
tasks in 38.5 seconds, including all 17 enforced Habitat laws with zero
findings. No resource, provider, result algebra, parser authority, Habitat law,
Oclif surface, Personal repository, native command, or live lifecycle state
changed.

The internal release-result ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2u]]. The generic
success-or-failure algebra now has one service-root DTO leaf, while its plain
constructors and nonempty narrowing have one service-root policy leaf. Concrete
caller-facing operation results remain bounded TypeBox contracts in their
owning modules; no generic transport schema was introduced. Every consumer
imports the direct owner, and `shared/release/result.ts`, its barrel export,
and the redundant exported tuple name are deleted without an alias or
compatibility face.

Owner-local tests lock both discriminants, `never` branch inference, nonempty
failure typing, diagnostic order, exact object shape, identity preservation,
and existing unfrozen behavior. The focused release corpus passes 37 cases;
the complete lifecycle suite passes 302 cases across 33 files. Production and
test TypeScript checks, Biome on all 18 affected TypeScript files, strict
OpenSpec validation, diff hygiene, and standing architecture/oRPC,
behavior-first testing, and TypeScript/TypeBox/structural reviews pass without
an unresolved P0, P1, P2, or P3 finding. The repository check passed 39
projects and 76 dependency tasks, including all 17 enforced Habitat laws with
zero findings. No public result, resource, provider, parser, Oclif surface,
Personal repository, native command, or live lifecycle state changed.

The canonical-encoding ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2v]]. Serializer
admissibility, canonical JSON, canonical Base64, and byte equality now have
four exact service-root model leaves. Concrete persisted records retain their
TypeBox schemas and runtime validation; decoding still returns `unknown` for
the owning policy to admit. Every consumer imports its direct owner, the old
`shared/release/canonical.ts` file is deleted, and three private byte-comparison
copies are removed without a compatibility face.

Owner-local tests lock exact JSON bytes, envelope bounds and diagnostics,
fatal UTF-8 handling, byte comparison, empty and tail-length Base64 roundtrips,
padding and alphabet refusal, and noncanonical trailing-bit refusal. The
complete lifecycle suite passes 310 cases across 34 files. Production and test
TypeScript checks, Biome, strict OpenSpec validation, diff hygiene, and
standing architecture/oRPC, behavior-first testing, and
TypeScript/TypeBox/structural reviews pass without an unresolved P0, P1, P2,
or P3 finding. The repository check passed 39 projects and 76 dependency
tasks, including all 17 enforced Habitat laws with zero findings. No public
result, resource, provider, parser, Oclif surface, Personal repository, native
command, or live lifecycle state changed.

The canonical-text-ordering ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2w]]. Release-wide
UTF-8 byte ordering now has one service-root policy leaf. Root model,
Releases, Providers, Packaging, and transitional release records import it
directly; the old primitive/barrel export and Cowork duplicate are deleted
without a compatibility face.

Owner-local tests distinguish UTF-8 from JavaScript UTF-16 ordering with
U+E000 and U+10000 and lock equality, prefix, ASCII, and multibyte direction.
The complete lifecycle suite passes 314 cases across 35 files. Production and
test TypeScript checks, repository Biome, strict OpenSpec validation, diff
hygiene, and standing architecture/oRPC,
behavior-first testing, and TypeScript/TypeBox/structural reviews pass without
an unresolved P0, P1, P2, or P3 finding. The repository check passed 39
projects and 76 dependency tasks in 54.6 seconds, including all 17 enforced
Habitat laws with zero findings. No TypeBox schema, digest implementation,
`node:crypto` use, resource, provider, oRPC surface, Personal repository,
native command, or live lifecycle state changed.

The agent-plugin-payload ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2x]]. Payload DTO,
manifest policy, canonical codec, and construction/verification policy now
have direct service-root leaves. Root model, Releases, Packaging, Providers,
transitional release records, and tests import the exact owner; the old
`shared/release/payload.ts` file, its barrel exports, and repeated manifest
comparators are deleted without a compatibility face.

Owner-local tests preserve canonical bytes and payload identity, UTF-8 scalar
ordering, cloning and deep freezing, bounded traversal, exact duplicate
diagnostics, and field-exact manifest equality. Full TypeBox payload admission
remains a separate contract decision because replacing granular parsing here
would change the established diagnostic vocabulary. The complete lifecycle
suite passes 317 cases across 36 files. Production and test TypeScript checks,
service and repository Biome, strict OpenSpec validation, diff hygiene, and
standing architecture/oRPC, behavior-first testing, and
TypeScript/TypeBox/structural reviews pass without an unresolved P0, P1, P2,
or P3 finding. The repository check passed 39 projects and 76 dependency tasks
in 37.1 seconds, including all 17 enforced Habitat laws with zero findings. No
digest implementation, resource, provider, router, oRPC surface, Personal
repository, native command, or live lifecycle state changed.

The distribution-ownership checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2y]]. The closed
TypeBox schemas and admitted index brand now have one direct service-root DTO
owner. Claim synthesis, admission, bounds, canonical ordering and projection,
immutability, member coverage, conflict classification, and owner-local
selection now have one direct policy owner. Release-input, release, and
release-set records import those exact leaves; the old
`shared/release/ownership.ts` owner and owner-local test paths are deleted
without a compatibility face.

Owner-local behavior proves deterministic mixed-conflict diagnostics,
same-owner plugin and alias collisions, seeded diagnostic preservation,
exact-limit admission, one-over-limit refusal without tail traversal, canonical
ordering, defensive copying, and deep freezing. The focused ownership corpus
passes 32 cases across three files, and the complete lifecycle suite passes
319 cases across 36 files. Production and test TypeScript checks, targeted
Biome, strict OpenSpec validation, diff hygiene, and standing architecture,
behavior-first testing, and TypeScript/structural reviews pass without an
unresolved P0, P1, P2, or P3 finding. The repository check passed 39 projects
and 76 dependency tasks in 34.8 seconds, including all 17 enforced Habitat laws
with zero findings.
Primitive identity, parsing, and digest mechanics remain separate. No resource,
provider, runtime, router, oRPC surface, Personal repository, native command,
or live lifecycle state changed.

The raw-value-admission checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e2z]]. Raw JavaScript
value defects and traversal bounds now map to the established release
diagnostic vocabulary in one direct service-root policy leaf, while TypeBox
remains aggregate structural authority. Identity-preserving release-result
elimination now lives beside result construction and nonempty narrowing.
Payload, manifest, ownership, release-input, release, and release-set policy
import the exact owners directly; `shared/release/parse.ts` is deleted without
a compatibility face.

Owner-local tests preserve unknown-then-missing diagnostic order, bounded
prefix admission, exact over-limit facts, canonical UTF-8 and NFC handling,
safe-integer admission, successful value identity, and failed diagnostic
identity and order. The focused owner corpus passes eight cases across two
files, and the complete lifecycle suite passes 323 cases across 37 files.
Production and test TypeScript checks, targeted Biome, diff hygiene, and
standing architecture, behavior-first testing, and TypeScript/structural
reviews pass without an unresolved P0, P1, P2, or P3 finding. No TypeBox
schema, primitive, digest, resource, provider, runtime, router, oRPC surface,
Personal repository, native command, or live lifecycle state changed.
The required repository check passed 39 projects and 76 dependency tasks in
35.3 seconds, including all 17 enforced Habitat laws with zero findings.

The release-input-model checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e3]]. The closed
release-input body and envelope schemas, generated declaration types, member
expectation, completeness witness, and admitted release-input brand now have
one direct service-root DTO owner. Root model, capability modules,
transitional release records, and tests name that owner directly. The
transitional barrel no longer exports those identities, the unused
builder-version alias is deleted, and the body serializer is private.

The parser-backed provenance refinement was redundant with its bounded ASCII
TypeBox schema. Focused parity covers accepted 512-byte and refused 513-byte
protocol values through both structural checking and release-input admission.
The focused release-input corpus passes 36 cases across four files, and the
complete lifecycle suite passes 324 cases across 37 files. Production and test
TypeScript checks, targeted Biome, diff hygiene, and standing architecture,
behavior-first testing, and TypeScript/structural reviews pass without an
unresolved P0, P1, P2, or P3 finding. The import graph contains 113 source
files, 450 internal edges, and no cycle. Parsing, construction,
canonicalization, diagnostics, ordering, digests, primitives, resources,
providers, routers, oRPC, the public package surface, Personal, native
commands, and live lifecycle state are unchanged.
The required repository check passed 39 projects and 76 dependency tasks in
37.6 seconds, including all 17 enforced Habitat laws with zero findings.

The provenance-binding-policy checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e4]]. Bounded
admission, canonical ordering, duplicate-identity refusal, defensive freezing,
and canonical projection now have one direct service-root policy owner. The
release-input DTO remains the TypeBox structure and generated-type authority.
Release-input, individual-release, and complete-set policy import the exact
owner directly; the transitional release-input file no longer defines or
exports that policy, and no barrel, alias, facade, or duplicate format replaces
it.

Owner-local tests cover canonical projection and ordering, empty admission,
defensive copying and freezing, seeded diagnostic identity, duplicate
refusal independent of declaration order, exact-bound admission, overflow
refusal without tail traversal, and the existing granular diagnostic
vocabulary. The focused corpus passes 38 cases across four files, and the
complete lifecycle suite passes 328 cases across 38 files in 65.22 seconds.
Production and test TypeScript checks, targeted Biome, strict OpenSpec, and
diff hygiene pass. The source graph contains 114 files, 461 internal
import/export edges, and no cycle. Standing architecture, behavior-first
testing, and TypeScript/structural reviews report no P0, P1, P2, or P3 finding.

No TypeBox schema, completeness-witness behavior, primitive, digest, canonical
byte, resource, provider, runtime, router, oRPC surface, public package
contract, Personal repository, native command, or live lifecycle state changed.
The required repository check passed 39 projects and 76 dependency tasks in
34.9 seconds, including all 17 enforced Habitat laws with zero findings.

The completeness-witness-policy checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e5]]. Expected-member
and persisted-witness structure now derive from closed TypeBox schemas in the
release-input DTO. One direct service-root policy owns witness construction,
bounded admission, canonical ordering, duplicate refusal, ownership-member
closure, defensive freezing, and canonical projection. Release-input and
release-set policy import that exact leaf directly; the transitional
release-input file no longer defines or exports witness policy.

Release-set policy retains the relationships between a witness, its containing
set header and members, and the actual derived release payloads. The root
witness owner therefore stays intrinsic rather than becoming a generic
relationship engine. Owner-local tests cover closed schema admission,
canonical projection and ordering, defensive copying and freezing, duplicate
refusal, exact-bound admission, overflow refusal without tail traversal,
ownership mismatch, seeded diagnostic identity, malformed input, and refusal
to brand fully typed duplicate, mismatched, or overbound construction facts.
The focused corpus passes 29 cases across three files in 4.45 seconds, and the
complete lifecycle suite passes 334 cases across 39 files in 65.91 seconds.
Nx completed the uncached lifecycle target and its five dependencies in 71.43
seconds.

Production and test TypeScript checks, targeted Biome, and diff hygiene pass.
Standing architecture/Habitat, behavior/TypeBox, and
TypeScript/refactor/structural reviews report no remaining P0, P1, P2, or P3
finding. The source graph contains 115 files, 474 internal import/export edges,
466 unique edges, and no cycle.
The required repository check passed 39 projects and 76 dependency tasks in
33.89 seconds, including all 17 enforced Habitat laws with zero findings. No
canonical byte, digest, diagnostic vocabulary, bound, primitive, resource,
provider, runtime, router, oRPC surface, public package contract, Personal
repository, native command, or live lifecycle state changed.

The release-input-policy checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e6]]. The existing
TypeBox DTO remains the structural authority. One direct service-root policy
owns construction, verification, decoding, bounded admission, defensive
freezing, and diagnostics; one direct codec owns canonical body and envelope
projection and bytes. Consumers name those exact leaves, while
`shared/release/release-input.ts` and its release-barrel exports are deleted.

The checkpoint preserves canonical bytes and digests, issue codes and order,
bounds, and public oRPC behavior. It does not move primitives, resources,
providers, routers, or native state. The new owner corpus passes six cases; the
focused release-input corpus passes 42 cases across five files in 13.61
seconds; and the complete lifecycle suite passes 340 cases across 40 files in
64.49 seconds. Nx completed the uncached lifecycle test and its five
dependencies in 69 seconds.

Production and test TypeScript, targeted Biome, strict OpenSpec, Oclif
source/compiled command parity, and diff hygiene pass. The source import graph
contains 116 files and no cycle. Standing architecture/Habitat,
behavior/TypeBox/testing, and TypeScript/refactor/structural reviews report no
P0, P1, P2, or P3 finding. The required repository check passed 39 projects
and 76 dependency tasks in 33.4 seconds, including all 17 enforced Habitat laws
with zero findings.

The individual-release checkpoint in
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e7]] is complete.
The checkpoint replaces the transitional individual-release owner with direct
TypeBox DTO, policy, and codec leaves and treats the verified release as
in-memory domain data. Artifact body, artifact digest, artifact protocol, local
store-handle identity, and artifact identity in the public Releases check and
release-set members are deleted rather than renamed. Release-set policy
temporarily retains cross-member relationships.

The first behavior review found that composed constructors projected enriched
in-memory values before closed admission, allowing unknown fields to disappear
before validation. The corrected boundary gives wire and in-memory payload,
release-input, and release values distinct closed TypeBox schemas in their
existing DTO owners. Policy projects only after in-memory admission, then
reconstructs derived observations from identity-bearing bodies and exact
payload bytes. Regression tests prove refusal at request, release-input body,
release body, payload, and payload-entry boundaries through release
construction, set construction, and complete-set verification.

The uncached lifecycle suite passed 41 files and 349 tests in 1 minute 14
seconds. Lifecycle typecheck passed its seven-task graph in 13.8 seconds. The
required repository check passed 39 projects and 76 dependency tasks in 37.7
seconds, including all 17 enforced Habitat laws with zero findings. Strict
OpenSpec validation and diff hygiene passed. Final architecture/Habitat,
behavior/TypeBox/testing, and TypeScript/refactor/structural reviews report no
P0, P1, P2, or P3 finding. Graphite PR
[#590](https://github.com/rawr-ai/rawr-hq-template/pull/590) landed the
checkpoint on canonical `main` at
`d3e7428529c77511b874c4e501425bd9e4ceabd9`.

The next bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e8]]. It gives the
complete in-memory release set direct service-root TypeBox DTO, policy, and
codec owners, then deletes both the transitional release-set implementation
and the release barrel. `ReleaseSetDigest` remains a verification value rather
than storage identity. The cut preserves complete membership, ownership,
provenance, ordering, release-input identity, release-digest binding, canonical
bytes, diagnostics, and bounds without adding persistence or changing
resources, providers, routers, native state, or public behavior. Implementation
and proof are complete.

The checkpoint now owns closed TypeBox member, body, and envelope schemas,
generated types, policy, and canonical encoding directly. Production admits
reconstructed bodies and envelopes through those schemas before the sole brand
refinement. A private bounded diagnostic candidate preserves established
witness and stale-digest diagnostics for empty or malformed membership without
making invalid state admissible. The transitional release-set implementation,
aggregate barrel, dead construction interface, and public value projections
are deleted; remaining primitive consumers import the one explicit
transitional primitive leaf directly.

The first standing reviews found that TypeBox was initially descriptive rather
than authoritative and that early nonempty narrowing suppressed existing
malformed-member diagnostics. Both findings were repaired and received final
architecture/Habitat, behavior/TypeBox/testing, and
TypeScript/refactor/structural acceptance with no remaining P0, P1, P2, or P3
finding. Owner-local release-set proof passes 19 cases and 126 assertions. The
complete lifecycle suite passes 41 files and 357 tests in 1 minute 11 seconds;
the uncached lifecycle typecheck graph passes in 14 seconds. The required
repository check passes 39 projects and 76 dependency tasks in 34.2 seconds,
including all 17 enforced Habitat laws with zero findings. Strict OpenSpec,
Biome, Oclif source/compiled command parity, stale-import scans, and diff
hygiene pass. Graphite PR
[#591](https://github.com/rawr-ai/rawr-hq-template/pull/591) landed the
checkpoint on canonical `main` at
`7b8ffaa9d3b55fca2868ee4c73c1b76c344d26e7`.

The next bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e9a]]. It returns
protocol versions and structural bounds to the exact TypeBox DTOs they
constrain, moves normalized file-mode structure to the payload DTO and its
diagnostic admission to payload-manifest policy, and deletes unused version
aliases. Consumers import qualified owners directly, while the existing public
input subpath re-exports its two release-input limits without a local alias.
Release identity and digest meanings remain in the transitional primitive leaf
for later complete cuts. No barrel, facade, compatibility path, resource,
provider, router, native state, or public behavior changes. Implementation and
proof are complete.

The checkpoint gives payload, release-input, ownership, individual-release,
and complete-set structural constants one qualified DTO owner each.
Payload-manifest policy retains the exact normalized-mode diagnostic split
while delegating structural admission to the payload TypeBox schema. The
public `./input` subpath directly re-exports its existing byte and member
limits. Six unused version aliases and every relocated primitive declaration
are deleted; the residual primitive leaf contains only identity, path, and
digest meanings reserved for the next cuts.

Owner-local proof adds normalized-mode schema/type parity, exact admitted and
refused modes, stable caller paths and issue vocabulary, and unsupported
payload-protocol refusal. The complete lifecycle suite passes 41 files and 360
tests in 1 minute 7 seconds; the uncached lifecycle typecheck graph passes in
15.9 seconds. The required repository check passes 39 projects and 76
dependency tasks in 34.8 seconds, including all 17 enforced Habitat laws with
zero findings. Strict OpenSpec, Biome, Oclif source/compiled command parity,
stale-import scans, and diff hygiene pass. Final architecture/Habitat,
behavior/TypeBox/testing, and TypeScript/refactor/structural reviews report no
P0, P1, P2, or P3 finding. Graphite PR
[#592](https://github.com/rawr-ai/rawr-hq-template/pull/592) landed the
checkpoint on canonical `main` at
`753922936e10cdbb93d21c46db4d4d3719c8308b`.

The bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e9b]]. It gives
service-wide release identities and release-relative paths one direct TypeBox
DTO owner and one direct diagnostic-admission policy owner, then rewires
consumers and deletes the current-main identity alias facade. Current-main Git
shapes remain qualified current-main meaning; live parsing and construction
move to the matching policy rather than another primitive file, while an
unused comparison is deleted.
Digest meanings remain untouched in the transitional leaf for the following
complete cut. Canonical public inputs, path semantics, brands, bounds,
diagnostics, current-main behavior, resources, providers, routers, and native
state remain unchanged. Vendor workspace values formerly admitted only by its
duplicate, looser identity vocabulary now fail at the CLI and oRPC boundary;
upstream repository locators remain qualified locator values.

The checkpoint now gives the seven service-wide release identities and
release-relative path one direct TypeBox DTO owner with generated branded
types. One matching policy owns their exact diagnostic admission. Current-main
Git shapes remain qualified current-main DTO meaning, while their parsing and
selection construction move to the matching policy. Vendor workspace
operations consume the same service-wide repository, content-authority,
commit, and tree schemas. Vendor upstream records retain a qualified
repository locator because that value locates versioned content rather than
identifying the reviewed content repository; their exact commit and tree still
consume the service-wide schemas. Every identity consumer imports the
qualified owner directly, the `current-main-primitives` alias facade is
deleted, and the residual
transitional primitive leaf contains digest meaning only.

Identity and direct Vendor contract proof passes 77 focused cases across seven
files; the native CLI Vendor runtime passes two cases. The complete lifecycle
suite passes 42 files and 366 tests in 1 minute 26 seconds; its uncached Nx
graph passes in 1 minute 35 seconds. The uncached lifecycle typecheck graph
passes in 16.2 seconds and the CLI typecheck graph passes in 31.4 seconds. The
required repository check passes 39 projects and 76 dependency tasks in 39.9
seconds, including all 17 enforced Habitat laws with zero findings. Strict
OpenSpec, Biome, Oclif source/compiled command parity, stale-import scans, and
diff hygiene pass. TypeScript review found and closed the competing Vendor
identity vocabulary before final proof. Final architecture/Habitat,
behavior/TypeBox/testing, and TypeScript/refactor/structural reviews report no
P0, P1, P2, or P3 finding. Graphite PR
[#593](https://github.com/rawr-ai/rawr-hq-template/pull/593) landed the
checkpoint on canonical `main` at
`8d4075517d289ba985b543ecf1521b8f02415c89`.

The active bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e9c]]. It gives the
five service-wide content, release-input, payload, individual-release, and
complete-set digest domains one direct root-model TypeBox DTO owner. One
matching policy owns exact diagnostic admission and deterministic SHA-256 byte
construction. Every consumer names the qualified owner directly, and the
production `service/shared` aggregate is deleted as one complete cut.

The checkpoint preserves the exact `sha256_`, `ri1_`, `pd1_`, `rd1_`, and
`rs1_` prefixes, brands, generated types, diagnostics, caller paths, and
canonical digest preimages. A digest remains a verification value rather than
a persistence key, address, lookup handle, provider
identity, or installation identity. No barrel, alias, facade, compatibility
path, or exported generic digest framework replaces the deleted aggregate.

The service uses the pinned portable `@noble/hashes` `2.2.0` implementation
rather than importing a Node runtime primitive. The CLI's supported Node 20
floor is correspondingly truthful at `^20.19.0`, while the existing
`>=22.9.0` lane remains unchanged. Focused digest and Vendor proof passes 33
cases. The complete lifecycle suite passes 43 files and 370 tests in 1 minute
17 seconds; its uncached Nx graph completes in 1 minute 23 seconds. The
uncached lifecycle typecheck graph passes in 17.8 seconds, the CLI test
typecheck graph passes in 29.1 seconds, and Oclif source/compiled parity passes
through the ordinary built CLI in 26.8 seconds. Frozen installation, strict
OpenSpec, Biome, repository separation, and diff hygiene pass. The enforced
Habitat source-law gate passes all 17 locked rules with zero findings in 19.3
seconds. The broader imported-export JSDoc target still exposes its existing
repository baseline and is not claimed green by this checkpoint; every new
imported digest export is documented.

Final architecture/Habitat, behavior/TypeBox/testing, and
TypeScript/refactor/structural reviews report no P0, P1, P2, or P3 finding.
Implementation and proof landed through Template PR #594 at canonical main
commit `95f2a23ff27089485296f1a6f86434aeec1cfa3b`.

The active bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e9d]]. It removes the
five remaining concrete platform imports from the complete admitted
production-service corpus. Each lifecycle workspace policy uses the pinned
portable SHA-256 implementation locally without changing its raw 64-character
binding encoding or preimage and without misclassifying that binding as a
release content digest. Example Todo receives UUID generation from its host
through the service and module context funnel. One service-root TypeBox model
owns the UUID structure reused by module entities and contracts and admits each
untrusted candidate before repository mutation, while its handlers retain
ownership of identity timing.

Once the corpus is green, the existing Habitat
`require_service_boundary_platform_independence` law becomes enforced and
joins the Habitat-owned source-law gate with an empty baseline. This cut adds
no resource, provider, facade, runtime abstraction, source-law script, public
contract, or native-provider behavior.

Exact staged and clean workspace bindings remain
`4a4d21e4ac6583e825f0eb4821872c9d5b376a0362ce98daabc255e59abf7e75`
and
`9101b1506c82dd7015cc631cf0ae1ed6be8310e9d61d1a632dc72b68d076e02a`.
The lifecycle suite passes 43 files and 370 tests; Example Todo passes six
files and 36 tests. Its behavior proof binds exact task, tag, and assignment
identities to the host generator, refuses an invalid candidate before storage,
and proves read-only, validation, duplicate, and assignment-limit refusals do
not consume an identity. Lifecycle, Example Todo, and Server typechecks pass.
Habitat passes all 31 fixture tests and all 18 enforced source laws with zero
findings. Strict OpenSpec, Biome, and diff hygiene pass. Implementation and
behavior proof are complete. Standing architecture/Habitat, testing/oRPC, and
TypeScript/refactor reviews report no P0, P1, P2, or P3 finding. Graphite
landing remains open.

The next bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.6d]]. Production now
constructs the Codex and Claude adapters with the operator's ordinary `codex`
and `claude` commands. The public `--provider-executable` flag, lifecycle
executable-binding DTO and selector, executable-path admission, executable
identity in provider sessions and capability results, and help-output parsing
are deleted together. A constructor-local `command` option remains only as the
focused fake-executable test seam; it is not projected through the CLI,
lifecycle service, or public resource contract.

Provider acquisition still requires an explicit canonical home. Probe and
inventory retain native version, adapter capability, marketplace, plugin, and
file observations. Unsupported native operations therefore fail through the
ordinary provider command rather than a help-derived admission model. Native
exit, timeout, interruption, process-group finalization, mutation refusal,
serialization, exact applied-prefix, and lifecycle status behavior remain
covered without ambient home discovery.

The resource contract and Codex/Claude adapters pass 22 tests, including the
zero-option constructors through hermetic PATH fixtures. The lifecycle
Providers module passes 79 tests, and the complete CLI passes 23 files and 85
tests through the built Oclif application, including rejection of the retired
executable flag on all three former owner commands. All five changed Nx owners pass
source and test typecheck in 17.6 seconds. Biome checks all 1,088 files in less
than one second, and Habitat passes all 18 enforced rules with zero findings in
27.9 seconds. Strict OpenSpec validation and diff hygiene pass. Implementation
and repository proof landed on Template `main` as PR #596 at `11e79950`.

The adapter supplies `HOME` plus `CODEX_HOME` or `CLAUDE_CONFIG_DIR` and does
not discover another home. It deliberately trusts the operator-selected PATH
command to honor that native contract rather than reintroducing executable
identity or wrapper admission. The current local `~/.codex-switch/bin/codex`
selector overwrites a supplied `CODEX_HOME`; it is therefore ineligible for
disposable-home settlement until the local selector is retired or the
settlement environment selects the native Codex command. No live provider
mutation was used for this checkpoint.

Standing architecture, TypeScript/refactor, testing, and structural-quality
reviews are complete. The TypeScript review's stale capability-probe router
language and the testing review's two missing behavioral oracles were repaired;
no P0-P3 finding remains.

The disposable provider-marketplace checkpoint completed
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.5d]] with an
operation-lifetime source. Test derives one complete Codex-and-Claude marketplace
closure from the exact selected Git tree; targeted mode narrows native actions
only and does not create a partial catalog. The checkout locator is a
versioned-content and inspection input. It is never passed as controller or
provider identity and never becomes a repository or symlink synchronization
channel. No persistent projection, receipt, handle, or provider identity is
created.

Standing review found that an operation-lifetime source was too narrow for a
provider that can retain a local marketplace path. Task 5.5d1 replaces that
shape and is complete. TypeScript/structural, oRPC/behavioral, Effect/resource,
and final architecture reviews report no remaining P0-P3 finding.

The correction converges one reserved marketplace child at a stable path below
the caller-owned disposable root. Each live test call exclusively owns its
root. A later call may reuse that root only after the preceding call settles;
overlapping calls use distinct roots. Exact repeats compare without rewriting;
changed path, mode, or bytes replace only the reserved child through private
same-parent staging; and provider homes remain disjoint native installed-state
authorities. The caller removes the whole disposable root only after no call is
live. No receipt, handle, symlink, projection store, cleanup service, or
next-invocation authority is introduced.

Focused automated coverage exercises exact executable-mode materialization,
flat canonical UTF-8 ordering, targeted and complete omission preservation,
source drift, materialization failure, full Effect-cause preservation, stage
cleanup, prior-tree restoration, final-observation ordering, and sequential
repeat behavior. The service owns no cleanup authority over the reserved child
or disposable root; those remain caller-owned.

Real native acceptance ran from source against absolute Codex
`/opt/homebrew/bin/codex` 0.146.0 and Claude
`/Users/mateicanavra/.local/bin/claude` 2.1.220 in
`/private/tmp/habitat-agent-plugin-final2-acceptance.RRHCvE`. V1 selected commit
`52938874a09c195d64c20480b8feba040ce0242b`, tree
`dedd8396901afaa574b6880603d9f37e3ca8986b`, release input
`ri1_6eb743cc1b240ed880cce224d1cc47a76b5098d02fb4d2a5c720cd091efd2cab`,
and complete set
`rs1_c091bca45407c69aed1dd0e78cde46f5795ea25182deea00a4dd7ce11913788c`.
Both providers added `rawr-hq` and installed the same eleven members. V2 selected
commit `59bb297dd5ac1135c6f0e1d9f2595c46afd6975e`, tree
`07bce29358b96f5abaf2c9ffb1db4e2974c86cce`, and release input
`ri1_3f5e3f76e3de192cc7b67abea2437b1167ee4eae9f1a3f14931de7bcd6ed814a`.
Its targeted `dev` transition removed and reinstalled only `dev@rawr-hq` on
each provider. Direct native inventory then retained all eleven installed
members on both providers. The exact V2 repeat returned `Converged` with zero
operations and preserved the reserved marketplace directory's inode, mtime,
ctime, and mode exactly.

The final closure gate passes without cache reuse: the content-workspace
provider passes 45 tests with 275 assertions; the complete lifecycle suite
passes 45 files and 444 tests; the CLI passes 25 files and 89 tests; and the
four affected owners plus their 27 Nx prerequisites pass test and typecheck in
1 minute 13 seconds. Repository Biome checks 1,245 files, the complete native
Habitat owner policy passes every enforced application in 2 minutes 29 seconds,
strict OpenSpec validation passes, and diff hygiene is clean. Repository
landing remains open.

## Lifecycle Public Face

The active bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e10]]. The package
source root now contains only `client.ts` and the private `service/` spine, and
the manifest exposes only `@rawr/agent-plugin-lifecycle/client`. The client face
constructs the typed local client and deliberately exposes the service contract,
the two existing release-input bounds, and the six existing TypeBox-backed
input admissions. It does not expose the executable router, host context lanes,
schemas, model, modules, or concrete providers.

The former bare root, input, router, and contract subpaths are deleted without
aliases or forwarding files. Callers derive the one required dependency shape
from `CreateClientOptions` rather than importing `Deps`, `Scope`, or `Config`.
Positive and independent negative type assertions bind that package surface;
the finite CLI and test consumers now cross the same `/client` boundary.

The uncached lifecycle-and-CLI typecheck graph passes 19 tasks in 37.5 seconds.
Their uncached builds pass with sixteen dependency tasks in 26.6 seconds. The
TypeBox input suite passes 12 cases, and the three focused CLI suites pass 20
cases. Strict OpenSpec validation, touched Biome formatting, and diff hygiene
pass. The service-spine topology law reports no lifecycle finding; its known
violations in other service packages remain advisory and are not claimed
repaired by this cut.

The full repository gate passes all 115 tasks in 37.3 seconds, including all 20
enforced source laws with zero findings and all 33 Habitat owner tests. Standing
TypeScript/refactor, architecture/Habitat, and behavior/oRPC/testing reviews
report no unresolved P0, P1, P2, or P3 finding. Graphite landing remains open.

## Historical Interim Habitat Scheduling Boundary

The interim Habitat source-law batch retained one Nx task, one native Habitat
acquisition, and the same twenty selected rules. Nx constructs task inputs from
a file inventory filtered through optional `.nxignore`; Habitat structure and
Grit evaluation retain their own native Git/Grit visibility. A cacheable Nx
fileset cannot therefore represent the evaluator's complete read surface.

The task is intentionally uncached rather than introducing a second file
enumerator, digest, ignore synchronizer, or root-file exception. Its former
target-wide `parallelism: false` declaration is also gone: Nx may schedule
independent repository work beside the task while Habitat keeps bounded rule
execution inside one process. This followed the scheduling direction proven by
Civ7 commits
`b2cefe47f98d482f8514adb5d34f282a347b1412` and
`9544e538b8937604a8f76e58b555e05c00170e7e`. It did not copy Civ7's Nx plugin
at that historical checkpoint. Task 5.7e22 remains open to supersede the
hand-maintained selection only after an upstream Nx-plugin package is actually
distributable to Template, without a local SDK fork or a change to which green
laws Template requires.

A foreign private service alias under `docs`, hidden only from Nx by a temporary
`.nxignore`, must still execute and fail the owning Habitat rule. The public
graph remains 39 project checks and 115 total tasks with exactly one Habitat
lint, source-law, project-admission, and test task.

The disposable `.nxignore` probe did execute and failed
`require_service_private_alias_ownership` in 37.9 seconds; removing the probe
returned the same source-law task to green in 38.6 seconds. Nx resolves the
target as `cache: false` and `parallelism: true`. A full cache-disabled
repository check then passed all 115 tasks in 1 minute 38 seconds; Nx reported
a 42.3-second critical path and 57% recoverable time, confirming that the
source-law task no longer serializes independent graph work. The probe and
temporary ignore file were removed after proof.

## Interim Habitat Structure Feedback Boundary

The bounded [[tasks#1. Positive Habitat And Nx Checks|task 1.5l]] checkpoint
separates task identity without changing evaluation authority. The existing
22-rule native Habitat command is renamed `check:policy:local` and remains the
only CLI leaf under `check:policy`, beside the rule-owned project-admission
adapter. A new independent `check:structure` leaf asks the same pinned Habitat
CLI to evaluate exactly nine green structure rules: blueprint packets, agent
router placement, API-server plugins, the lifecycle command channel, Oclif app
and command-plugin topology, service databases, resources, and providers.

Codex Stop now runs only `habitat:check:structure` after the workstream closure
guard. It does not run lint, Grit, the complete local policy batch, or the
repository scheduler graph. Pre-push and protected CI retain the complete
graph. Both direct CLI leaves remain intentionally uncached: the standalone
consumer still has no distributable Habitat Nx-plugin boundary that can own
registry discovery, exact Nx cache inputs, caching, and one acquisition. The
selected rule scopes are exact. Task 5.7e22 is that future upstream integration,
not a boundary claimed by this checkpoint.

No production source, blueprint pattern, release manifest, provider, Personal
repository, Habitat SDK source, custom runner, or cache scheme changes here.

At that historical checkpoint, resolved Nx project and task-graph inspection
showed exactly one
`habitat:check:policy:local` task, with `check:policy` depending only on it and
`check:project-admission`; `check:structure` has no policy dependency. After an
Nx reset, cold and immediate repeat structure runs pass all nine selected rules
in 2.4 and 2.1 seconds with zero cache hits. Both retain the same three existing
advisory database-store topology findings and no failing rule; that red corpus
is not production movement or deletion authority for this scheduling cut. Hook
inspection excludes lint, Grit, complete policy, the retired source-law target,
the root check command, and `run-many`. Strict OpenSpec validation, focused
Biome, and diff hygiene pass.

## Mandatory Module Context Curation

The active bounded checkpoint is
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e19]]. Example Todo's
terminal module projection is the canonical curation pattern to propagate, not
migration residue. Each `module.ts` must select the smallest route-facing
vocabulary from direct descendants of `deps`, `scope`, `config`, `invocation`,
or `provided`; router leaves must use those curated names rather than reopen a
raw service lane. Native oRPC composition remains additive at runtime. Curation
therefore closes authorship without claiming that inherited context was removed.

The Habitat context-boundary law and its existing service fixture own this
source contract. The law stays advisory during burn-down: this checkpoint does
not change service runtime, the selected repository rule batch, hooks, Nx
wiring, or the pinned Habitat SDK. Lifecycle modules are the next independent
runtime checkpoint, followed by the remaining HQ Ops and embedded API modules.
The six staged service laws become required only after that corpus is green and
Template consumes the upstream Civ7-style Habitat Nx-plugin execution boundary.
No local Habitat fork, rule-list generator, wrapper, or raw Grit runner is an
admitted substitute.

The temporary emergency note and sentinel file flagged handwritten `--rule`
enumeration and unbounded raw-Grit fan-out as an execution-design failure and
directed comparison with the active Magic Migration and Civ7 stacks. Task
5.7e22 is their durable disposition; the transient files are deleted rather
than becoming another authority surface.

The existing service-blueprint suite passes all 24 cases and 283 assertions,
including dedicated red fixtures for missing terminal curation and dotted,
computed, destructured, or renamed raw-lane access from a router source. Strict
OpenSpec validation, touched Biome checks, and diff hygiene pass. That law-only
checkpoint claimed no runtime behavior; the subsequently landed lifecycle
runtime and its proof are recorded under task 5.7e20 below.

## Lifecycle Module Context Curation

The active bounded checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e20]]. Governance,
Packaging, Providers, Releases, and Vendors now finish their exact service
branches with one terminal curation of the smallest route vocabulary already
used by their handlers. Seven projection-only module middleware files are
deleted together with the now-unreferenced native middleware authoring factory.
Qualified acquisition, guards, and enrichment remain separate middleware
concerns when a concrete consumer needs them; no resource is constructed,
policy moved, public contract changed, or runtime lane removed.

One staged Habitat acquisition runs the six advisory service laws in 2.9
seconds. The five Grit laws pass, the closed topology reports only the known
outside-lifecycle corpus, and no rule reports an agent-plugin-lifecycle path.
Nx runs lifecycle typecheck and all 43 behavior files together with their six
build prerequisites: all 377 tests pass in 1 minute 26 seconds with the cache
intentionally disabled. This checkpoint changes no provider home, Personal
repository, Oclif surface, or live lifecycle state.

## Lifecycle Context Funnel Closure

[[tasks#5. Bounded Agent-Plugin Lifecycle Service|Task 5.4]] is complete through
its owner-specific resource checkpoints and the later sealed-service burn-down.
The service base declares the complete `deps`, `scope`, `config`, `invocation`,
and `provided` context once and owns the sole native middleware author. The
native Effect-oRPC implementer attaches root middleware once; the plain root
router only composes completed module routers and cannot replay that middleware.
Client construction fixes host dependencies, scope, and configuration, then
creates fresh invocation context and empty provided context for each call.

Governance, Packaging, Providers, Releases, and Vendors each derive their branch
from the service implementer and terminally curate only the vocabulary authored
by their route handlers. Qualified acquisition, guard, and enrichment
middleware remains available where behavior needs it; projection-only
middleware is retired. Every operation is authored directly as an Effect-oRPC
handler. Ready filesystem, Git, package-output, and native-provider Effects
remain resource-owned. The provider-test marketplace is bounded to the caller's
disposable root rather than the invocation scope. One live call owns that root
exclusively; sequential calls may reuse it after settlement and overlapping
calls use distinct roots. Its stable derived tree remains until the caller
removes the root.

The lifecycle owner typecheck and test-typecheck prerequisites pass. Focused
service-spine and Effect-oRPC admission pass 2 files and 4 tests, Habitat lint
passes, and standing architecture/oRPC review reports no shadow context,
detached runner, duplicate implementer, platform acquisition, or handler
indirection. This ledger closure changes no runtime source, provider state,
Personal repository, or public result. See
[[service-domain-frame#Request And Context Flow|the context flow]],
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|the task ledger]], and
[[authority-amendment#Positive Architecture Ratchet|the architecture ratchet]].

## HQ Ops Module Context Curation

The bounded HQ Ops checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21a]]. Config,
journal, and security now finish their existing observability and analytics
composition with terminal curation of `resources` and `repoRoot`. Their routers
author only against those module-owned names; the service's inherited lanes,
resource object identity, middleware order, persistence behavior, and public
contracts remain unchanged.

Uncached HQ Ops typecheck and all 11 owner behavior tests pass in 5.9 seconds.
At that checkpoint, the staged context-law probe reported only six existing
flat middleware-file findings, two per module; it reported no missing curation
or raw-lane router access. Task 5.7e21b below resolves those placeholders as a
separate owner-local cut rather than folding them into the curation change.
The embedded Example Todo API remains a separate task 5.7e21 checkpoint because
its host still supplies flat request context and must establish service lanes
before module curation can honestly consume them. No provider home, Personal
repository, Oclif surface, or live lifecycle state changes in this checkpoint.

## HQ Ops Empty Middleware Retirement

The follow-up checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21b]]. The config,
journal, and security `middleware.ts` files exported only empty module-level
observability and analytics middleware plus unused factory aliases. They are
deleted rather than relocated. Each module now proceeds directly from its root
implementer branch to terminal context curation, while the real required
observability and analytics behavior remains attached once at the service root.
Removing the six empty middleware attachments also intentionally removes their
framework-generated wrapper spans; those wrappers contributed no RAWR span
attributes, lifecycle events, analytics payload, or capability.

The staged context law now reports no HQ Ops finding. Owner typecheck and all
11 behavior tests pass without a new source-shape test or replacement
abstraction. Public contracts, resource identity, repository scope, persistence,
and required service telemetry remain unchanged; only those redundant wrapper
spans are gone.

## Embedded API Middleware Authority

The bounded structural checkpoint advances
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21c]]. An embedded
API service may now elect the same single base-owned native middleware author
as a standalone service: one private `os.$context<NamedContext>()` value in
`base.ts`, exposed only through `createMiddleware()`. This is ordinary native
oRPC middleware provenance. It does not add embedded
`createServiceProvider`, another implementer, or another context authority.

The focused Habitat fixture proves the admitted embedded factory and keeps
aliased `os`, untyped context roots, fresh authors per factory call,
disconnected returns, non-base `os` imports, and embedded provider authorship
red. The complete service-blueprint suite passes all 25 cases and 305
assertions, and the Habitat project typecheck passes uncached in 1.3 seconds.
A full-repository two-rule scan was canceled after two minutes without a
result; it is not claimed as proof, and task 5.7e22 remains the owner of that
slow transitional execution boundary.

Runtime source, the HQ SDK, provider selection, application composition, Nx
wiring, the pinned Habitat executable, and live provider state do not change.
The following embedded API runtime checkpoint consumes this admission to move
the host resolver through `deps`, service middleware, `provided`, and terminal
module curation.

## Embedded API Request Context

The bounded runtime checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21d]]. The server now
owns one request-context projection with ready capabilities under `deps`,
repository selection under `scope`, host-selected values under `config`, and
request identity under `invocation`. Each request starts with an empty
`provided` lane. The embedded Example Todo service derives one named client
middleware from its base-owned native oRPC author, resolves the Todo client at
request time, and contributes it under `provided`.

The `example-todo` API module matches the service's `exampleTodo` contract
branch and terminally curates only the resolved client and correlation
identity. Its task operation group authors both handlers in `tasks.router.ts`;
module and service routers composed completed plain objects upward at this
checkpoint, with the root carrying the then-current
`Router<typeof contract, never>` check. The later pinned-N1 root correction
requires configured native completion instead, so this embedded root remains a
visible parent-task residual rather than a compatibility form. Plugin
registration is static and captures no repository resolver.

Uncached typecheck covers runtime context, the API plugin, the server host, and
their six build prerequisites. Seven focused server files pass all 29 behavior
tests for RPC and OpenAPI calls against different repository roots, zero
pre-request resolution, one resolution per request, cross-root isolation,
request correlation, middleware multiplicity, typed failure, and success. The
five staged Grit service laws report zero findings in 2.1 seconds. The staged
closed topology reports no embedded API finding in 1.5 seconds while retaining
the known standalone-service corpus. The 25-case Habitat fixture passes all
305 assertions, and repository Biome lint passes.

An unstaged full-corpus context scan also passed but required 4 minutes 49
seconds. That disproportional execution is not normalized here; task 5.7e22
owns the inferred, cacheable Habitat boundary. No provider home, Personal
repository, Oclif surface, or live lifecycle state changes.

## Example Todo Module Shells

The bounded follow-up completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21e]]. Example
Todo's three modules retain the canonical downward lane flow and terminal
context curation in `module.ts`. Tasks deletes its empty observability and
analytics placeholders rather than preserving a false middleware surface.
Tags and Assignments keep their real module telemetry in qualified
`middleware/telemetry.middleware.ts` leaves, observing inherited context before
curation.

Each module now authors behavior in one named `router/*.router.ts` group and
uses `router.ts` only to compose that completed group. The contract-first
service root closes those completed module routers through the native
`service.router(...)` operation, preserving oRPC's runtime contract attachment
without authoring behavior there. The owning Habitat composition law now
admits only that exact configured root completion and rejects detached,
chained, computed, remapped, or unimported branches. Existing root middleware
uses the closed `*.middleware.ts` naming law. The public `/client` face,
contract, database, stores, context lanes, middleware order, procedure-local
telemetry, operation results, and host responsibilities do not change.

Uncached Example Todo typecheck and all seven owner test files pass 38 cases;
the normalized owner `check` target and repository Biome lint also pass. The
25-case service-blueprint fixture passes all 324 assertions, and the closed
service topology reports no Example Todo finding. Focused staged
source-law execution with deleted predecessor paths excluded passes the
anchor-export and router-authorship laws. Its remaining advisory context,
isolation, and composition findings identify the existing HQ SDK/native-
middleware boundary and are not disguised as shell failures or widened into
this checkpoint. The canonical staged runner still dependency-refuses deleted
paths instead of ignoring them; task 5.7e22 owns that upstream
execution-boundary repair, so this record does not claim a canonical staged
pass. Strict OpenSpec validation passes. Standing oRPC/TypeScript,
behavior/testing, and Habitat authority reviews report no unresolved P0, P1,
or P2 finding; repository landing remains open.

## Example Todo Native Contract Detachment

The bounded follow-up completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21f]]. Example Todo's
six module procedures now originate directly from the runtime `oc` imported
from `@orpc/contract`. Each procedure carries the previously effective `todo`
domain, `internal` audience, `basic` audit, `service` entity, and its existing
idempotence explicitly through native `$meta<TodoProcedureMetadata>`. That one
service-owned policy model extends the SDK's neutral `BaseMetadata` and remains
the public procedure metadata type. The three contracts no longer import
`base.ts`, and the unused `ocBase` runtime export is deleted. Schemas, errors,
routes, root `service.router(...)` completion, middleware, handlers, and
observable results remain unchanged.

This checkpoint proves the detachment at the owned code, type, and behavior
boundaries: the public procedure metadata normalizes to the service-owned type,
all six runtime metadata values remain exact, and the completed router retains
its root contract relation. Uncached Example Todo typecheck and all 38 owner
tests pass, as does its normalized five-dependency `check` graph, strict
OpenSpec validation, and diff hygiene. It adds no transitional flat-contract
matcher. The immediately following Magic directory/oRPC2 authority checkpoint
owns the durable contract source law.

## Magic Service And Database Authority

The authority checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21g]] before the
production oRPC 2/Effect 4 migration begins. It imports the stable Magic
service tree `53cd340b859e660ad6a0cc1619b283edfb025e13` and database tree
`8ec14dbad5244f0725978e31b7e3c53f54b0bdbb` from commit
`2374baa937466fe794e424c700fdd9d8ac7d64cd`; both trees remain unchanged
through reviewed Magic head `01ea4c3ac534dc624bd7f769fc6eee994a38752a`.
Every imported `pattern.md` remains byte-identical. Template adapts its
required package metadata, service-module `AGENTS.md`, existing API path, rule
niche from `magic` to `rawr`, repository JSON formatting, and the strengthened
consumer law's temporary advisory lane.

The destination is one closed funnel. Each module exposes `contract/index.ts`
and `router/index.ts` over semantic leaves, with an optional equivalent
`middleware/index.ts` face. Root `contract.ts` and `router.ts` remain the sole
service composition spines. The former flat module contract/router faces and
the two duplicate private-alias packets have no compatibility owner and are
removed from authority. The imported packets are registered with Habitat, but
the required Nx target retains the previously green selected laws while the
expanded service batch remains advisory; no SDK fork, raw Grit command, parser,
or second scheduler is introduced.

RAWR adds one bounded generic ontology extension. An entity has stable domain
identity that survives attribute changes and participates in domain
transitions. Persistence is supporting evidence, never sufficient
classification. TypeBox owns the canonical entity schema and generated type.
A service-root entity owns identity or invariants that genuinely span modules;
access alone never promotes module meaning. A module entity remains
subdomain-specific. DTOs remain operation and boundary projections and may
compose entity schemas. Database schema is physical mapping, and a store is a
private persistence implementation whose native record type is inferred from
that mapping. Stores may map records into entities when the domain models
continuing identity, or return value and snapshot projections. Entities never
import DTO, contract, database, store, transport, provider, or persistence
concerns. There is no `db/dto` destination.

[[tasks#5. Bounded Agent-Plugin Lifecycle Service|Task 5.7e21h]] closes the
shared entity admission gate. The existing TypeBox authority and
platform-independence laws now scan service- and module-owned entity leaves;
no RAWR-local rule or scanner was added. Hyperresearch supplies the first
production corpus: `HyperresearchRunLedger` is a cross-module identity-bearing
aggregate, while the Runs-owned V8 ledger remains module-local. Integrity and
agent-output results are DTOs, CLI execution is a port, and step definitions
are policy. `AgentPluginRelease` and `AgentPluginReleaseSet` remain immutable
values or snapshots, not entities.

Authority lands before source movement on purpose. The native Habitat topology
fixture admits the new directory entrypoints and entity destinations, then
rejects flat module faces, missing entrypoints, junk model kinds, module
database ownership, `db/dto`, and role-suffixed store residue. The real
advisory topology scan exposes 197 service findings across legacy public faces,
flat module contracts/routers, missing directory indexes, open model
destinations, and proof placement, plus 3 database findings. Empty baselines
preserve that complete 200-finding red corpus. Expanding the selected
source-law batch exceeded five minutes in its single native Grit scan and was
terminated as a performance failure. Previously green contract-property,
proof, and platform laws remain enforced.
Database laws stay selected as advisory migration evidence. The strengthened
consumer law is also advisory because its imported relative-sibling matcher
currently classifies owner-local `../../src/service` test imports as foreign;
task 5.7e21i owns the shared correction before enforcement. Activating the
remaining imported laws waits for the separate Nx/Habitat performance
correction. This checkpoint moves no service, resource, provider, app, plugin,
or package implementation.

## Service Capability Funnel Authority Refresh

The current authority checkpoint refreshes the shared service law from Magic
Migration's committed activation checkpoint
`2928a2c772edaced527e4cc856d1260c94105456`. Seven service/database Grit
patterns are byte-identical to that accepted source. Template adapts only its
`rawr` niche and its stronger entity, metadata, package-manifest, TypeBox, and
service-module `AGENTS.md` authority; it adds no local Habitat SDK, runner,
parser, baseline, or implementation path.

The frame now treats a service as a narrowing capability funnel. Awkward
service composition is specifically a cohesion falsifier: inspect for a hidden
repository resource, sibling domain service, plugin exposure/orchestration, or
app runtime/configuration owner. Size alone proves none of those moves. Policy
attaches at its owned service, module, group, or operation depth. Router/module
policy remains input-independent; reused validated-input policy attaches at
each consuming procedure after its schema. Terminal curation stays one inline
stage and may use either a direct expression or a block with one terminal
`next(...)` call. Contract leaves retain canonical direct acquisition while
nested contract/router composition remains ordinary TypeScript, Knip, and
behavior authority. Router handlers remain the operation-authoring site.

The Habitat owner passed 23 tests with 47 assertions plus typecheck. Strict
OpenSpec, JSON manifests, exact shared-pattern identity, and diff hygiene pass.
Focused live scans of the unchanged topology, database, and anchor laws retain
their advisory evidence: the database import funnel is green, database
topology reports the three existing store-suffix findings, service topology
exposes the legacy service/module shapes, and anchor law reports seven
findings. The refreshed context, contract, and router laws are exact bytes from
Magic's activated checkpoint; this node makes no separate complete Template
live-corpus conformance claim for them. The common law remains advisory while
source conformance and the upstream owner-local Habitat/Nx execution boundary
are completed. No production source moves in this checkpoint. The required
repository check passed 40 projects and 118 tasks in 41.5 seconds, with 71
tasks restored from Nx cache; the 41.4-second Habitat policy target remains the
critical path rather than another scheduler or duplicate owner process.

## Vendor Clock Ownership

The Vendor clock checkpoint moves only the inert clock contract out of
service-root declaration and into the Vendors module model. `base.ts`
type-imports that exact port solely because the host must bind it. Runtime
values still flow from host assembly through `deps`, terminal Vendors curation,
and the status/update handlers. The public client shape and every host or test
binding remain structurally unchanged.

Vendors is the clock's sole production consumer and owns the meaning of the
observation timestamp written during admitted upstream authoring. The clock has
no independent state, acquisition or release lifecycle, provider selection, or
repository-wide failure protocol. It therefore does not justify a resource,
sibling service, plugin concern, or app-owned contract. The app owns only the
ordinary wall-clock implementation it supplies.

The focused Vendors suite passes 26 cases, including supplied-clock provenance,
and the focused CLI context suite passes 3 cases. Lifecycle and CLI source/test
typechecks pass. The selected module-isolation law admits the type-only
`base.ts` port edge and the closed model topology admits the direct port leaf;
the remaining topology findings are the already-declared advisory migration
corpus. The repository-wide imported-export documentation check remains a
separately owned pre-existing red corpus, while the new cross-file port itself
has declaration-site ownership and flow documentation. Strict OpenSpec and
diff hygiene pass. The required repository check passes all 40 projects and
118 tasks in 47.5 seconds. This checkpoint changes no operation, resource
implementation, provider home, Personal repository, Oclif surface, or live
lifecycle state.

## Nx Target Ownership

The lifecycle service now exposes only its ordinary owner-local package scripts:
`build`, `typecheck`, `check:test`, and `test`. Nx infers those targets from the
package manifest, while `project.json` retains only the explicit `check` target;
root `targetDefaults` supply its graph dependencies. The test command resolves
its declared Vitest dependency by package name and preserves the existing Bun
host; it no longer depends on the current workspace `node_modules` layout.

The unreachable `sync` and `structural` aliases, the matching first-cohort
inventory expectations, and the dead structural-suite registration are removed
together in the same checkpoint. The retained root Habitat owner gate remains
the single source and topology authority for this service. This records the
existing repository execution model rather than introducing a runner or a
repo-wide target migration.
The separately owned TypeScript 7, current Node LTS, and centralized vendor
declaration work remains pending in [[tasks#1. Repository-Native Structural
Ratchet|tasks 1.5d and 1.5d1]].

The resolved lifecycle project exposes the four inferred targets and the explicit
`check` target with no `sync` or `structural` target. The generator and
`nx sync:check` converge; lifecycle typecheck completes in 16 seconds; all 377
lifecycle cases pass in 44.6 seconds; strict OpenSpec passes; and the repository
check completes all 40 projects and 118 resolved tasks in 1 minute 43 seconds
from a reset cache and 46.6 seconds with ordinary cache reuse.

This checkpoint is the first deletion, not the repo-wide target migration. The
current scheduler is stable enough to land it independently: required admission
is singular, all 118 resolved tasks pass, and the required graph contains no
lifecycle `sync` or `structural` task. The remaining repository normalization is
a hard prerequisite to the next production service burn-down and is tracked in
[[tasks#1. Repository-Native Structural Ratchet|task 1.6c10b]].

## Architecture Inventory Sync Retirement

The repository now takes project and target truth directly from Nx's resolved
graph. This checkpoint removes the custom sync generator, copied architecture
inventory JSON, parity verifier, and the project-local `sync` aliases that only
replayed that verifier. Writers and readers leave together rather than keeping a
generated representation as a second authority.

This retires the redundant architecture-inventory parity gate while preserving
every remaining Habitat structural and behavioral gate. It does not change
project tags, alter Habitat policy, or complete the broader repository target
normalization.
The runtime-realization lab keeps its qualified gate while dropping only its
inventory dependency. Edited JSON parses, native `nx sync:check` reports no
pending generator work, the resolved `sync` target set is empty, all 69 runtime
lab cases pass, strict OpenSpec and diff hygiene pass, and the required
repository check passes all 40 projects and 118 resolved tasks in 39.4 seconds
with ordinary cache reuse. The repository CI graph passes all 155 build,
check, and test tasks in 1 minute 24 seconds. The optional
`architecture:gates:permanent`
aggregate remains pre-existing red on manifest-order and projection-context
source assertions whose inputs are unchanged from the parent; this checkpoint
removes only its retired sync tail and does not relabel that aggregate green.

## Procedure Metadata Ownership

The procedure-metadata checkpoint moves the lifecycle service's shared
metadata defaults out of `contract.ts` and into the service model's policy
layer. The five metadata values and their `BaseMetadata` constraint remain
unchanged. `contract.ts` is again only the service contract-composition anchor;
the contract and the two root middleware leaves now consume the same inert
policy directly rather than reaching back through that anchor.

This is an ownership-only source move. It changes no contract schema, metadata
inheritance, middleware order, client shape, operation behavior, provider
state, or live lifecycle state. Lifecycle typecheck, the service-spine and
Effect-oRPC admission behavior, the five module schema-boundary suites, the
selected service-anchor Habitat law, strict OpenSpec, diff hygiene, and the
required repository check form the checkpoint proof.

## Native Middleware Authorship

The middleware-authorship checkpoint removes the HQ SDK's hidden oRPC context
builders. The SDK now supplies only stateless analytics and observability
middleware callbacks. Each consuming service decorates those callbacks through
its one local `base`, exposes each direct middleware leaf through the generic
`middleware` anchor, and imports that value into `impl.ts` by its semantic
role. The old constructor names are deleted rather than retained as aliases.

This preserves the useful shared analytics and observability behavior while
making context ownership visible and singular:

```text
service base -> service middleware -> service impl -> module curation -> operation
```

The cut changes no metadata values, middleware order, signal payload, failure
authority, service contract, client shape, resource binding, provider state,
or live lifecycle state. HQ SDK behavior covers once-only signals and failure
non-interference; Lifecycle and Example Todo cover real service composition,
Effect-backed execution, metadata inheritance, and service-specific signal
fields. TypeScript covers every consuming service, Habitat owns the root
middleware source shape, and the required repository check remains the final
landing gate.

Final proof is green: the eight-owner Nx typecheck completed in 12 seconds;
the HQ SDK, Lifecycle, and Example Todo boundary suites passed 6, 4, and 19
tests respectively; the selected service-context Habitat rule reported zero
failures; and `bun run check` completed all 40 project checks and 118 resolved
tasks in 1 minute 2 seconds. The architecture, TypeScript/oRPC, and behavioral
standing reviews accepted the checkpoint without P0 or P1 findings.

## Service Law Regrounding

The service ratchet adopts the indexed capability funnel instantiated by
Magic's Jobs and Candidates services. Template now asserts closed `contract/`
and `router/` directories with composition-only `index.ts` faces, optional
indexed middleware, one configured `module.ts`, and semantic authoring leaves
as its one target. The current flat production corpus remains visible red for
the next burn-down container; no second module router form or Template-specific
service topology is introduced.

Task 5.7e21o removes the stale source-law selections that still treated a flat
module `contract.ts` or `router.ts` as a valid contract, schema owner, anchor,
composer, or executable error boundary. It also narrows module isolation to
its actual owner: service-root composition, declared base/impl crossings,
sibling entry, and the first relative path that escapes a closed module.
Contract, context, and router laws own executable direction inside that sealed
module without turning isolation into a second import grammar.

The checkpoint changes no production service, public contract, runtime,
resource, provider, Personal content, Nx graph, or Habitat SDK. Habitat
typecheck and its 30-case suite pass; focused fixtures prove contract, context,
router, and module-isolation direction at their owning boundaries. The
production corpus remains intentionally red against the one indexed
destination; this checkpoint does not recast that migration work as a passing
baseline or recognize the retired flat composer as another form.

## Governance Module Burn-Down

Governance is the first production module moved through the indexed service
law from [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21p]]. Its
two contract operations and two authored handlers now occupy semantic leaves;
`contract/index.ts` and `router/index.ts` only compose the public objects. The
flat contract and router files and the `.router.ts` compatibility names leave
in the same cut.

This is a topology migration, not a behavior or authority change. Public
operation keys, TypeBox schemas, module-curated content-workspace context,
handler bodies, exact Git observation order, and returned result variants are
unchanged. The module typecheck passes, and six focused Governance/service
files pass all 38 behavior cases. The native Habitat topology scan reports no
Governance finding; no runtime, resource, provider, Personal content, or live
provider state changes.

## Releases Module Burn-Down

Releases now follows the same indexed module law under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21q]]. Four
TypeBox-backed contract leaves and four authored operation leaves retain the
existing `check`, `releaseInputRecord`, `refreshReleaseInput`, and
`checkRepository` surface. The two indexes only compose those leaves; the flat
faces and `.router.ts` names leave in the same cut.

The move preserves module-curated content-workspace context, clean and staged
observation order, final revalidation, canonical release-input encoding,
result variants, and typed failures. No model, policy, resource, provider,
public key, or live state changes. The module typecheck passes, and the six
Releases files plus the service-spine proof pass all 63 focused cases. The
complete service suite passes all 377 cases across 43 files.

## Packaging Module Burn-Down

Packaging now follows the indexed module law under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21r]]. Its one
TypeBox-backed contract operation and one authored handler occupy semantic
leaves; `contract/index.ts` and `router/index.ts` only compose the public
`package` key. The flat faces and `.router.ts` name leave in the same cut.
Because `package` is an ECMAScript-reserved binding name, the shared contract
and router laws admit only the exact `packageContract` and `packageOperation`
local bindings with a named `package` export. The corresponding indexes import
that exact public name into the same qualified locals. No general alias or
second operation name is admitted. At that checkpoint, the contract law bound
Template's canonical adapter package rather than Magic Migration's
repository-local alias. This namespace correction binds the same owner to
`@habitat-ai/typebox-adapter` without changing the law's contract behavior.

The move preserves module-curated content-workspace and package-output
context, source observation and final revalidation order, deterministic Cowork
bytes, the uninterruptible publication boundary, result variants, typed
failures, defects, and interruption. No model, policy, resource, provider,
public key, Personal content, or live state changes. The module typecheck
passes, the four Packaging files plus service-spine proof pass all 33 focused
cases, and the complete service suite passes all 377 cases across 43 files.

## Service Proof Root Resolution

The proof-isolation law now classifies a literal relative source by its lexical
destination under the owning service package. Only a destination below that
package's root `test/` directory is proof. An ordinary operation leaf such as
`router/test.ts` therefore remains production source, while imports,
re-exports, dynamic imports, `require`, and `require.resolve` into package-root
proof remain rejected.

This is a generic Habitat source-law correction, not a Providers exception.
The pattern examples retain every supported source form, add the production
`./test` counterexample, distinguish a source-local test path owned by the
separate closed topology law, and correct the deep-router positive examples to
reach the actual package root. No runtime source, service behavior, alias,
runner, registry, or live state changes.

The native Habitat fixture admits the production `./test` operation and a
relative import into another package's test tree, then rejects the same deep
router importing its own package-root proof. The complete service blueprint
fixture passes all 14 cases and 53 assertions; the live proof and helper-comment
rules, strict OpenSpec validation, and focused formatting checks also pass.

## Providers Module Burn-Down

Providers now follows the indexed module law under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21t]]. Its
TypeBox-backed `test`, `status`, and `sync` contract operations occupy matching
semantic leaves. The three existing Effect handlers move byte-for-byte into
unsuffixed router leaves; `contract/index.ts` and `router/index.ts` only compose
the same public keys. The flat faces and `.router.ts` names leave in the same
cut.

The move preserves the module's curated content-workspace and native-provider
context, exact selection and revalidation order, operation-local native
sessions, ordered mutation and immediate confirmation, result variants, typed
failures, defects, and interruption. No handler body, model, policy,
middleware, resource, provider, public key, Personal content, or live state
changes. The uncached service typecheck passes in 13.2 seconds, all 85 focused
Providers and service-spine cases pass in 3.2 seconds, and the service
blueprint fixture passes all 50 assertions across 11 cases. The complete
service suite passes all 377 cases across 43 files in 37.3 seconds. Every new
cross-file export has declaration-site JSDoc; the repository-wide documentation
target still exposes its separately tracked pre-existing red corpus.

## Vendors Module Burn-Down

Vendors now follows the indexed module law under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21u]]. Its
TypeBox-backed `status` and `update` contract operations occupy matching
semantic leaves. The former source-lifecycle router group is split into the
two filename-mapped Effect operation leaves; `contract/index.ts` and
`router/index.ts` only compose the same public keys. The flat faces and
`.router.ts` group name leave in the same cut.

This is a topology migration, not a behavior or authority change. Syntax-token
comparison proves both extracted handler initializers equal their previous
forms. The move preserves the module's curated clock, content-workspace, and
versioned-content context; read-only status observation; interruptible update
preflight; the uninterruptible capture, apply, restore, and settlement
boundary; result variants; failures; defects; and interruption. No module
model, policy, context, resource, provider, public key, Personal content, or
live state changes. The uncached service typecheck passes in 12.8 seconds, and
all 43 focused Vendors and service-spine cases pass in 1.9 seconds. The
complete service suite passes all 377 cases across 43 files in 36.1 seconds.
The repository check completes all 40 project checks and 118 resolved tasks in
1 minute 8 seconds. The oRPC/Effect-oRPC, behavior/testing, and
TypeScript/structural standing reviews accept the checkpoint without P0, P1,
or P2 findings.

## Service Proof Ownership Correction

The service topology now gives service-root behavior and compile-only contract
relations their own positive proof destinations under
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21v]].
`test/behavior/*.test.ts` sits beside real
`test/behavior/modules/<module>/*.test.ts`, so root-owned policy is not
misclassified as a sixth module. `test/mechanics/contract/*.typecheck.ts`
preserves TypeScript-only contract relations without making Vitest execute
ambient proof values or hiding them in support.

The existing module behavior, runtime mechanics, integration, and support
owners remain closed and unchanged. The native Habitat fixture exercises both
new positive forms and passes all 14 cases and 53 assertions. Strict OpenSpec
validation and focused formatting checks also pass. This is a two-destination
law correction, not a topology variant, SDK feature, runner, parser,
compatibility path, or production service change.

## Lifecycle Service Root Closure

The Agent Plugin Lifecycle service root now closes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e21w]] against the
positive service law. Its exported `Context` declares the five readonly
`deps`, `scope`, `config`, `invocation`, and `provided` lanes directly; the
host-bound values, module curation, middleware order, and operations are
unchanged.

The existing proof corpus now occupies its owning closed destinations:
service-root and module behavior, client and contract mechanics, integration,
and service- or module-owned support. The predecessor flat, `shared`, model,
vendor, module, and support-root test shapes leave in the same cut. Assertions
are unchanged; only paths and the relative imports required by those moves
change.

The focused service topology and context laws report zero Lifecycle
diagnostics. The uncached service typecheck passes in 13.7 seconds. The
final service suite passes all 377 cases across 43 files in 66.2 seconds
(1 minute 7 seconds through Nx). This checkpoint changes no runtime capability,
provider state, Personal content, resource, policy, compatibility path, or
proof framework. The standing oRPC/Effect-oRPC, behavior/testing, and
TypeScript/structural reviews accept the complete checkpoint without P0, P1,
or P2 findings. A categorical search finds no remaining predecessor test-path
consumer, and the uncached CLI test typecheck passes after its sole external
fixture import follows the service-owned support destination.

## Effect And TypeBox Vendor Preparation

The vendor-preparation checkpoint moves every direct Effect and Effect
Platform declaration from `4.0.0-beta.100` to the aligned
`4.0.0-beta.101` realm and every direct TypeBox declaration from `1.3.6` to
`1.3.8`. The regenerated lock resolves one `effect`, one
`@effect/platform-node`, one transitive `@effect/platform-node-shared`, and one
`typebox` version, with no older transitive copy. A categorical source search
found no lifecycle import of `@orpc/shared`, so its direct manifest declaration
is deleted; `@orpc/shared@1.14.8` remains only as an ordinary transitive member
of the unchanged oRPC family.

This is preparation for the separately owned oRPC 2 switch, not that switch
and not a compatibility layer. The canonical
[[packages/hq-sdk/src/orpc/schema|TypeBox adapter]] still uses the
native Validator behavior and returns message-only issues without reconstructing
paths. Sixteen affected owners typecheck, the twelve affected owner suites pass
650 tests, the five Effect resources pass 81 provider cases, and the contained
Effect vendor lane passes five cases. See
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.6e]]. Historical
sections retain their exact then-current version evidence.

## Native Service Client Authority

The seven standalone service clients now use oRPC's native
`createRouterClient` and `InferRouterInitialContext` directly. Each client
destructures `deps`, `scope`, and `config` at construction, accepts only
`invocation` from each call, and explicitly reconstructs a fresh initial
context with a copied invocation and empty `provided` carrier. Example Todo
proves that replacing top-level construction options after client creation and
passing a wider call-context variable cannot override the fixed lanes.

The shared HQ SDK client facade, its package export, and its source-shape
assertions are deleted in the same checkpoint. Trace-forwarding and the rest of
the SDK's contract, middleware, and composition ownership remain unchanged.
Hyperresearch declares the native oRPC dependency it consumes directly. All
seven public client signatures and lifecycle parsing/contract exports remain
unchanged. See [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task
5.7e21j]].

The eight owner projects typecheck and build. Their 62 test files pass 511
tests, including the full 43-file, 377-case lifecycle suite and all Example
Todo context, concurrency, frozen-invocation, error, and lane-isolation cases.
The nine dependent CLI, server, API-plugin, command-plugin, application, and
package owners typecheck; the eight owners with behavior suites pass 46 files
and 169 tests. Clean isolated repeats of Server's 44 cases and DevOps' five
cases also pass after one duplicate local test launch was terminated and
excluded from evidence. The lifecycle CLI client-context and qualified-command
suites pass 18 focused cases. Strict OpenSpec, Biome, the categorical live
facade search, diff hygiene, and the single physical `@orpc/server@1.14.8`
realm pass. The repository check is green.

## Native oRPC 2 And Effect 4 Runtime Boundary

The atomic runtime checkpoint completes
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.6f]]. Every direct
oRPC declaration now selects `2.0.0-beta.20`; the Effect integration is the
official `@orpc/experimental-effect@2.0.0-beta.20`; Effect and Platform use
`4.0.0-beta.101`; TypeBox uses `1.3.8`; and Standard Schema uses `1.1.0`.
Community `effect-orpc`, the retired OpenAPI-client and telemetry package
names, and the HQ SDK contract, implementer, context, router, schema, and
service facades leave in the same checkpoint. The surviving TypeBox adapter is
product-free and delegates validation and JSON Schema projection to TypeBox.

Contracts, implementers, middleware, routers, and linked clients now use the
native oRPC 2 APIs. Effect-backed operations alone cross the official Effect
handler bridge. HTTP status remains native transport policy; local and linked
errors expose `defined`, `inferable`, code, message, and data without copying
status into the error object or wire body. Service-owned metadata vocabulary
is attached and read through typed native `defineMeta` plugins rather than a
second metadata store. The server's generated OpenAPI document and checked-in
types match live generation, and real RPC and OpenAPI links preserve declared
domain failures.

The server extracts inbound W3C context before opening its host span and runs
the oRPC instrumentation below that span without a second extraction. The
integrated trace oracle proves one remote-to-host-to-native parent chain.
Telemetry shutdown disables instrumentation before exporter shutdown and
releases process-local ownership even when exporter cleanup fails.

The complete repository check passes 40 projects and 118 tasks in 1 minute 29
seconds. The uncached test graph passes all 32 tested projects in 1 minute 33
seconds, including 377 lifecycle, 85 CLI, 47 server, 33 Example Todo, and 14
core cases. A canonical uncached lifecycle repeat also passes all 377 cases;
the two slow Git/packaging cases remain within the owner-defined 30-second
budget. Strict OpenSpec, diff hygiene, checked-in OpenAPI drift, and categorical
old-version and retired-package searches pass. Standing native-authority,
architecture, TypeScript, structural-quality, and behavior-first testing
reviews report no P0 or P1 findings. This checkpoint does not mutate Personal,
a native provider home, or any live release channel.

## Template Content Compatibility Retirement

Template no longer carries a curated agent-content workspace. The
`@rawr/plugin-hq` project, its 48 content and publication files, its workspace
and lockfile identity, and the obsolete phase-one freeze gates leave together.
The repository AGENTS law remains generic; only its now-invalid
`plugins/agents/*` application is removed. Personal remains the sole content
owner and receives no copy, comparison, merge, or edit from this checkpoint.

The Hyperresearch hook no longer grants special source-capture treatment to the
retired `rawr plugins sync hyperresearch` spelling. A behavioral oracle proves a
URL-bearing legacy command is blocked while the qualified Hyperresearch command
keeps its existing behavior. Active operator guidance now names the ordinary
Oclif application and the retired custom distribution precisely rather than
calling both a controller.

Nx reports 40 projects with no `@rawr/plugin-hq`. Habitat's nine-rule structure
batch and project-admission check pass, as do frozen lock resolution, the
affected architecture gates, strict OpenSpec, and diff hygiene. The uncached
CLI, lifecycle, and Hyperresearch build/typecheck/test graph passes 28 tasks in
1 minute 16 seconds. Source and built Oclif inventories agree, and the
disposable native extension round trip installs, lists, invokes, and removes
the fixture through `@oclif/plugin-plugins`.

The legacy aggregate architecture script still reports two unchanged
non-lifecycle findings owned by later app/runtime containers:
`apps/hq/src/manifest.ts` and `apps/server/src/request-context.ts`. This
checkpoint neither masks nor repairs them. No Personal repository, provider
home, release channel, or app/runtime composition state is mutated.

## Explicit CLI Runtime Closure

The ordinary package release now starts from one truthful package dependency
graph. `@rawr/cli`, `@rawr/plugin-hyperresearch`, and
`@rawr/plugin-session-tools` declare their direct `@rawr/hq-sdk` use instead of
relying on workspace hoisting. The SDK no longer imports Inngest merely to type
an opaque workflow client: `WorkflowRuntimeInput` is vendor-neutral and the
server host names its concrete `Inngest` client at the owning application
boundary.

Manifest traversal from the CLI and its four first-party Oclif plugins yields
exactly nineteen workspace packages and no Inngest runtime dependency. The
uncached targeted typecheck and behavior graph passes 26 tasks, including the
complete 85-case CLI suite, 47 server cases, seven HQ SDK cases, and both
targeted command-plugin suites. Frozen lock resolution and diff hygiene pass.
This checkpoint adds no version, package archive, publish target, installer,
retained store, provider mutation, or protected content change.

## Ordinary Nx Release Group

This section preserves the historical one-group checkpoint and is not current
operator guidance. The repository now has four release groups; the first
Habitat release selects `typebox-adapter`, `habitat-cli`, and
`habitat-blueprints` explicitly and never invokes unfiltered publication.

The nineteen-package CLI runtime closure is now one fixed `rawr-cli` Nx Release
group at version `0.1.0`. Every member is public, carries ordinary registry
metadata, owns a build target, and receives the native
`@nx/js:release-publish` target inferred by Nx 23.1. The CLI and four composed
first-party command plugins additionally own production-fixed Oclif manifest
targets. Shared target defaults order build and manifest work before the
publisher without adding a RAWR package, archive, or publication executor.

`@rawr/test-utils` remains private and outside the release group. Its local
`0.1.0` version lets Bun resolve the CLI's semver-qualified development-only
test dependency while Nx continues to expose no publisher for it. It is not a
twentieth runtime or release member.

The one-group repository uses unfiltered `nx release publish`. Nx 23
intentionally prunes task dependencies when a publish is filtered by project or
group, so `--group rawr-cli` is not the repository release invocation. The
unfiltered task graph contains exactly nineteen builds, five production
manifests, and nineteen inferred publishers. The dry version operation moves
all fixed members from `0.1.0` to `0.1.1` together and preserves workspace
protocols without changing source.

The uncached manifest graph completes twenty-four tasks in 20.8 seconds. Every
generated command path begins at `dist`. The native dry publication passes for
all nineteen packages, and `bun pm pack --dry-run` produces the CLI's ordinary
69-file, 231 KiB package including `bin`, `dist`, and
`oclif.manifest.json`. Frozen lock resolution, the two locked Oclif Habitat
rules, strict OpenSpec validation, and diff hygiene pass. Generated manifests
remain ignored build outputs. No registry publication, release dispatch,
Personal repository, provider home, or protected content state is mutated.

The first clean CI run exposed one missing test prerequisite rather than a
release defect: manifest-free parity inspected the external Hello fixture before
its compiled output existed. The acceptance target now depends explicitly on
that fixture's ordinary build. An uncached rerun executes the complete
twenty-five-task prerequisite graph and passes all three Oclif inventory
oracles. Both CLI behavior targets also hash the fixture's project-scoped
production input, so cache correctness does not require a false CLI runtime
dependency.

> [!CAUTION]
> The release-readiness sections from this point through the RAWR registry
> substrate are chronological execution evidence. They describe superseded
> package models and are not current architecture or operator authority.

## Ordinary Installed Oclif Acceptance

The qualified, uncached
`@rawr/cli:acceptance:oclif-installed-package` target reads the fixed
nineteen-member release group from `nx.json`, uses the existing build and Oclif
manifest prerequisites, and packs every member with `bun pm pack`. A normal
`npm install` then installs those local tarballs into one disposable prefix.
Bun 1.3.14 attempted registry resolution for unpublished internal dependencies
even when all nineteen tarballs were direct file dependencies; using npm avoids
that pre-publication limitation without rewriting packed manifests or
emulating a registry.

The acceptance proves that the CLI's complete `@rawr/*` runtime closure is
installed as ordinary package directories with no workspace links or nested
copies. It verifies version and help output, generated command-module
containment, the first-party command inventory, and native
`@oclif/plugin-plugins` ownership. It installs the ordinary Hello fixture,
lists and invokes it, removes it, and observes the command disappear. One
read-only lifecycle status call returns a typed blocked result for missing
Personal content while every explicit provider and configuration home remains
unchanged.

TypeBox validates the external JSON boundaries used by the test. Each tarball
receives an ordinary SHA-256 annotation bound to the current revision and
working-tree status; no receipt or retained artifact store is created. The
final local target passes in 53.6 seconds. Guarded cleanup is limited to the
exact real directory created under the canonical temporary parent. No registry,
Personal repository, provider home, or release channel is mutated.

The complete CLI behavior suite passes 82 cases, and the uncached CLI
typecheck passes its nineteen-task dependency graph. The required repository
check passes all 124 tasks in 2 minutes 13 seconds, including Habitat's 26-rule
policy batch and 35 behavior cases; its only findings are the already-recorded
advisory service migration corpus. Strict OpenSpec, Biome, and diff hygiene
pass. Standing behavioral, native-authority, and TypeScript/structural reviews
report no unresolved P0, P1, or P2 finding.

## Canonical Release Readiness

Template merge `b0a975727c618d007ac4be7003e7a4379106dcbd` contains the
ordinary fixed Nx Release group, its complete packed-install acceptance, the
retired custom distribution, and the Habitat-only structural policy boundary.
Required canonical-main push run `30477436378` passed. This closes
[[tasks#3. Conventional CLI Package And Release|task 3.6a]].

The release publisher now has the same acceptance boundary as the product
record. Every inferred `nx-release-publish` task depends through Nx on the
single `@rawr/cli:acceptance:oclif-installed-package` and
`@rawr/cli:acceptance:oclif-native-plugins` tasks. Nx deduplicates those
cross-project predecessors across the fixed nineteen-package group, so no
publisher can begin before the ordinary packed installation and native Oclif
extension round trip pass. This is one task-graph relation at the workspace
owner, not a wrapper, phase gate, script, registry emulator, or alternate
release path.

The generated Nx task graph contains 48 tasks and 162 dependency edges. All
nineteen publishers have both acceptance tasks as direct predecessors. An
uncached `nx release publish --dry-run` then ran the two acceptances once,
published nothing, and completed all nineteen dry-run publishers plus their 29
predecessor tasks in 55.9 seconds. Standing Nx-architecture and behavior-first
reviews accepted the boundary with no P0, P1, or P2 finding.

Active product and process guidance now follows the same ownership model. The
runbook index describes reviewed `current-main`, exact Git verification,
in-memory release-set derivation, and native provider delegation as the curated
path. It preserves creation, packaging, vendor update, and destination export as
qualified adjacent capabilities rather than lifecycle state owners. The process
gateways, maintenance cadence, and cross-repository workflow record the fixed Nx
Release group and packed-install acceptance as active while keeping publication,
registry-installed smoke, and cross-repository settlement pending in that order.
Lifecycle-authority and operational-truth reviews accepted the aligned guidance
with no P0, P1, or P2 finding.

Task 3.7 remains a real release operation rather than another implementation
slice. The npm registry currently reports no authenticated operator and
`@rawr/cli@0.1.0` is not published. No repository publish workflow or npm token
is configured. Publication therefore remains blocked on `@rawr` scope
authorization and any required 2FA credential; it is not repaired with a local
registry, package rewrite, custom installer, or release store. Once authorized,
the unfiltered Nx publish graph owns all nineteen packages and a guarded
disposable prefix owns the registry-installed version, help, and command
inventory smoke.

## Manual Phase-Gate Retirement

Habitat now owns the repository's structural and source-law surface without a
parallel phase-runner layer. This checkpoint deletes all 61 hand-written
architecture, observability, phase, runtime, and repository-separation MJS
scanners; their root aliases; twelve package-local `structural` wrappers; the
stale Nx input group; and the script-backed repository project. Executed
behavior remains in owner tests. The one behavioral contract embedded in the
old repository scanner now has a two-case Workstream Plugin Pack test that
executes outside-root and symlink refusal before replacement. The
Habitat-backed Example Todo API target and contained Runtime Realization lab
target remain qualified; the latter verifies its isolated evidence plane
rather than acting as repository architecture authority.

One enforced, empty-baseline Habitat structure rule positively closes
`scripts/` to its five admitted mechanics or content roots. Two enforced,
empty-baseline Grit rules own the remaining parser-visible relations: curated
agent-plugin commands cannot acquire `@oclif/plugin-plugins`, and browser
environment access passes through the web-owned public projection. Their
superseded source-reading tests and helpers are deleted. The root
`package.json` exposes no inferred Nx targets, so ordinary operator commands do
not become a second lint or scheduler owner. Nx resolves 39 non-root projects,
with Habitat as the sole lint and repository-policy owner.

At that checkpoint, the ten-rule native structure leaf passed in 2.3 seconds.
The selected 26-rule policy leaf passed with only its pre-existing advisory
service findings.

The final follow-up deletes the two remaining direct `check.mjs` policy
bypasses. The coarse Nx project-kind matrix is retired rather than translated;
Nx and its module-boundary lint remain project graph authority. Magic's native
Grit JSDoc law replaces the TypeScript import/export scanner on the admitted
public lifecycle faces. The Runtime Realization lab's former 1,023-line walker
is replaced by its closed Habitat topology and parser-visible source law, while
the manifest validation above remains executable owner behavior. Native Grit
fixtures pass all fifteen positive and negative samples.

The final required check passes 39 projects and 84 prerequisite tasks in
1 minute 15 seconds, with 78 of 123 tasks served from the Nx cache. Habitat's
29-rule policy batch passes with only its two pre-existing advisory service
corpora; its eighteen owner tests, TypeScript checks, the ten evidence-manifest
cases, strict source-law fixtures, Workstream installer behavior, Oclif
inventory acceptance, and retained owner behavior suites are green. A
categorical live-tree audit finds no active hand-written repository source,
structure, or topology authority outside Habitat. No provider, Personal
repository, channel, release, or live installation state is touched.

## Module Router Authority Restoration

The service blueprint again has one module router face. Named
`router/*.router.ts` leaves author native oRPC operations and cohesive groups;
module-root `router.ts` imports those completed values and exports one plain
router object. `router/index.ts` is structurally inadmissible. Contract and
optional middleware catalogs retain their qualified `index.ts` faces.

This checkpoint corrects Habitat authority before moving production source. It
updates only `structure.toml`, parser-visible Grit laws, the service frame, and
this execution record. The six service laws remain advisory with empty
baselines so the current production corpus stays visibly red until migrated.
The native Habitat invocation parsed and evaluated all six laws successfully;
its findings are the expected predecessor topology, not accepted debt. No
manual checker, local SDK change, runtime helper, compatibility face, provider
mutation, or production service edit is part of this checkpoint.

## Governance Router Migration

Governance is the first production module to consume the restored router law.
Its `currentMainRecord` and `currentMainSelection` operation bytes move
unchanged into the required `router/*.router.ts` leaves. The former router
barrel becomes module-root `router.ts`, and only its two relative import paths
change. Root service composition, the Governance module branch and context,
TypeBox contracts, Effect handlers, public operation keys, Git observation
order, failures, defects, interruption, and results remain unchanged.

The old router barrel and unsuffixed leaf paths disappear in the same
checkpoint without aliases. No policy, resource, provider, middleware,
contract, test, Personal repository, or live provider state changes.
The first consumer also replaces the rule's ineffective text matcher with
Grit's native function-expression nodes so inline native and Effect handlers
are admitted while detached ordinary and generator callables remain findings.

## Packaging Router Migration

Packaging is the second production module to consume the restored router law.
Its `package` operation bytes move unchanged to
`router/package.router.ts`. The former router barrel becomes module-root
`router.ts`, and only its leaf import path changes. The exact
language-required `packageOperation` local binding, named `package` export,
public router key, module context, TypeBox contract, Effect handler,
observation and revalidation order, publication boundary, failures, defects,
interruption, and results remain unchanged.

The old router barrel and unsuffixed leaf path disappear in the same
checkpoint without aliases. Focused Packaging and service-spine proof passes
all 19 cases, owner typecheck passes, and Habitat reports no Packaging router
or topology finding. No policy, resource, provider, middleware, contract,
test, Personal repository, or live provider state changes.

## Vendors Router Migration

Vendors is the third production module to consume the restored router law. Its
`status` and `update` operation bytes move unchanged to
`router/status.router.ts` and `router/update.router.ts`. Their SHA-256 digests
remain `4bdf31b7c3033676315960dc8fcc4182525c62c6dda088391d3812b3d18abb7c`
and `724f7a05194b16fad17ae6ef92e2ccf6c3af47f72ebefa56feb09454d73da896`.
The former router barrel becomes module-root `router.ts`, and only its two
relative leaf imports change. The root service retains its
`./modules/vendors/router` import.

The module branch and curated context, TypeBox contracts, inline Effect
handlers, public keys, status observation, held and diverged classification,
materialization clock, capture/revalidation/apply/restore/settlement order,
results, failures, defects, and interruption remain unchanged. The old router
barrel and unsuffixed leaf paths disappear without aliases. Three focused
Vendors and service-spine files pass all 37 tests, owner typecheck passes, and
the six advisory service laws report no Vendors finding. Their 359 unaffected
advisory diagnostics remain outside Vendors: 13 in the predecessor Providers
and Releases router shapes and 346 elsewhere in the service corpus. Strict
OpenSpec, Biome on the three TypeScript destinations, and diff hygiene pass.
No policy, resource, provider, middleware, contract, test, Personal repository,
or live state changes.

## Providers Router Migration

Providers is the fourth production module to consume the restored router law.
Its `status`, `sync`, and `test` operation bytes move unchanged to
`router/status.router.ts`, `router/sync.router.ts`, and
`router/test.router.ts`. Their SHA-256 digests remain
`b3d78d64f322a2164653ee81bb6556db4fb4eceea57e64b8085e8ccf50e46b4f`,
`fada4dd3b5c2202c566081479886a3e625417354bc34e64feea3c3df2a23462d`,
and `a9a6ece029f9a4208674b1cdb00785483c8f524511ad02123797d841ba4cb24b`.
The former router barrel moves from `router/index.ts` to module-root
`router.ts`; its SHA-256 changes from
`9623a3b85f5c62cec76c43aa0ffa73dfe3ecfd9b5d797e2788fa3c9bbf924deb`
to `4039b34dd39f83043ee2cd0ddda1ae5db2484262ed821e0910f42c86b5aff94b`
only because its three relative leaf imports change. The root service retains
its `./modules/providers/router` import.

The module branch and curated context, TypeBox contracts and schemas, inline
Effect handlers, public `test`, `status`, and `sync` keys, selected-content
derivation and revalidation, source-interface and marketplace validation,
native observation and mutation order, operation-local sessions, targeted and
canonical retirement policy, disposable workspace scope, results, failures,
defects, and interruption remain unchanged. The old router barrel and
unsuffixed leaf paths disappear without aliases. Seven focused Providers
behavior, schema-boundary, and service-spine files pass all 85 tests in 2.47
seconds. Owner typecheck and its seven prerequisites pass uncached in 12.2
seconds. The six advisory service laws report no Providers finding; their 353
unaffected diagnostics remain outside Providers: seven in the predecessor
Releases router shape and 346 elsewhere in the service corpus. Strict OpenSpec,
Biome on the four TypeScript destinations, and diff hygiene pass. No policy,
resource, provider, middleware, contract, test, Personal repository, provider
home, native command, or live-state change.

## Releases Router Migration

Releases is the fifth production module to consume the restored router law.
Its former `router/index.ts` composition face moves to module-root `router.ts`,
which changes only its four imports to the named
`router/check.router.ts`, `router/check-repository.router.ts`,
`router/refresh-release-input.router.ts`, and
`router/release-input-record.router.ts` leaves. The root service retains its
`./modules/releases/router` import and the same `check`,
`releaseInputRecord`, `refreshReleaseInput`, and `checkRepository` public keys.

The refresh and input-record leaves are exact R100 renames: their SHA-256
digests remain
`beda9d8776aaeac7f92226361d639cf6af74f8d8e32cbbd335cefc1a895858aa`
and `ee5a1a31fd11484d38b45fc7f9c7a5c0cb984f4a5ed339d99cc1973093cf3a65`.
The check leaf changes from
`22c25989c1ec1f4c5a14184b4b51f5f273bbf8c8954c976c5a9d665e0bb6e5f7`
to `f0ae2f8eb94e2e55b9d7031a1f763f64deb942aed2e7ce02d0879b7741fc1d30`,
and the repository-check leaf changes from
`159efca0e43ea50c6714be928b4433e3e905a15d57542d422e2e7e024168607a`
to `86dc2863a82600bfeb641816a54858c5e8b8e5b1a69db78960a208dc015e5a74`.
Those two changes move only Effect-free result construction into
`model/policy/eligibility-result.ts`: release derivation identity projection,
the repeated release-check ineligible result with its source-issue projection
inlined, and the staged source-changed result. The composer's digest changes
from `7704886acea65d9310fe4f595f9621654bc18cabe8e92f14e8bd935b71adfd7c`
to `bae37d08cce9666d97b110bfab0a5844463649699be741cc1fcd551d0328db62`
only because of its four relative leaf imports.

The one-use staged-ineligible object now remains directly at its handler
branch, and the exhaustive switch default uses a local `never` binding while
preserving the exact `Unreachable repository check variant: ...` runtime
message. The nested `inspectStagedRepository` and `inspectCleanRepository`
closures remain in the handler with the same context and resource sequencing.
The release-check projection receives the operation mode and refuses an
impossible complete-set derivation or any targeted derivation that does not
contain exactly one release. Its ineligible and repository source-change
constructors retain their exact TypeBox-derived union branches rather than
widening to the complete public result unions.
Resource calls and bounds, clean and staged observation and final revalidation
order, release-input encoding, result shapes and freezing, contracts, module
context, failures, defects, interruption, and root composition remain
unchanged. Predecessor paths and one-use helpers disappear without aliases.

The seven focused Releases behavior, schema-boundary, and service-spine files
pass the same 75 tests in 15.25 seconds. The full uncached lifecycle target and
its six build prerequisites pass all 385 tests across 42 files in 38.78
seconds. Owner typecheck and its seven prerequisites pass uncached in 15.0
seconds. The exact six advisory service laws pass with zero Releases finding;
their 346 unaffected diagnostics remain elsewhere in the service corpus.
Strict OpenSpec, Biome on the six touched TypeScript destinations, and diff
hygiene pass. No generalized rule, resource, provider, middleware,
compatibility face, Personal repository, provider home, native command, or
live state changes.

## Git-Backed Declarative Release Input

The unpublished version-1 release input is recut in place as a declaration
rather than a second content index. Its canonical bytes contain members,
ownership claims, provenance, locks, and `qualityPolicies`. They contain no
skill inventory, payload or per-file manifest, payload or per-file digest,
path/mode/length row, or completeness witness. The reviewed Git commit and tree
close selected bytes.

Clean, staged, package, test, status, and sync paths enumerate every regular
file below each declared member root from the exact selected Git objects. They
derive payload manifests and digests, skill inventory, ownership completeness,
release identity, and complete-set identity during the invocation. An
additional ordinary file becomes content and changes the applicable derived
identity. A toolkit `agent-pack/**` unit, root `plugin.yaml`, missing skill
claim, or stale skill claim rejects before package output or provider mutation.

The release-input parser rejects the removed fields rather than admitting a
compatibility shape. A payload-only byte change preserves release-input bytes
and `ReleaseInputDigest` while changing the selected tree and applicable
payload, release, and release-set digests. The release set uses its one ordered
plugin-ID/release-digest member list as its completeness witness; it does not
serialize a second content or member graph. No persistent artifact store,
projection store, migration reader, alias, or retained local copy is added.
This supersedes the historical completeness-witness extraction recorded in
tasks 5.7e5 and 5.7e6 without rewriting those landed checkpoints.
The complete lifecycle suite passes 42 files and 384 tests uncached; lifecycle
and test typechecks plus diff hygiene pass. Personal content and native provider
settlement remain unopened until this Template checkpoint lands through the
required repository gate.

## Cross-Module Release Schema Authority

The first bounded task 5.3 checkpoint gives the existing release-derivation and
clean content-workspace collaborations one structural owner each. Closed
TypeBox schemas now define the derivation source, constructed selection,
neutral failure and result, clean snapshot, and clean inspection. Their
TypeScript types descend from those schemas and layer only the admitted
release-input, payload, release, and release-set brands that structural
validation alone cannot establish.

The content snapshot reuses the exact derivation-source properties rather than
restating them. Clean Git object bindings use the existing normalized file-mode
domain, one service-owned workspace-binding schema, and the existing clean-tree
cardinality. Clean-content policy consumes those admitted facts and carries the
normalized mode from tree classification through snapshot construction. The
existing release-member cardinality likewise closes derivation arrays. No
generic parser, schema walker, context lane, module result, persistent record,
or new state owner appears.

The owner-local schema boundary passes 13 tests. The complete lifecycle target
passes 42 files and 387 tests uncached in 42.2 seconds; the lifecycle owner
typecheck and its seven Nx prerequisites pass uncached in 12.2 seconds. Biome
passes, and the five relevant Habitat laws complete without an enforced
finding. The service topology and router laws retain their existing advisory
corpus outside this change.

This is an intermediate semantic checkpoint, not task 5.3 closure. The separate
current-main Git family and the six release parser families still retain their
handwritten structural authority and remain the next owner-specific deletions.
See [[service-domain-frame#Burn-Down Design|the burn-down design]],
[[tasks|the active task ledger]], and
[[authority-amendment#Positive Architecture Ratchet|the architecture ratchet]].

## Current-Main Git Schema And Type Authority

[[tasks#5. Bounded Agent-Plugin Lifecycle Service|Task 5.3b]] is a schema/type
authority checkpoint only. The current-main Git DTO now owns closed TypeBox
schemas and generated types for canonical refs, exact blob identities,
repository locators, Git path selections, exact blob pointers, and observed
bytes. Blob identity reuses the service-wide Git object schema, pointer shape
composes the selection fields, and the governance locator directly reuses the
same Git locator schema. The channel record's separate tag-only `sourceRef`
contract remains unchanged.

Primitive ref and blob admission now uses the owning TypeBox schemas while
retaining the established parser functions, diagnostics and order, exact-record
checks, locator and blob bounds, byte copying, freezing, ancestry, equality,
and cross-field policy. Owner schema proof covers static parity, both Git
object formats, invalid refs and object identities, closed-object membership,
missing fields, extra fields, and the `Uint8Array` refinement. Caller behavior
proves a malformed observed blob remains `FORGED_RECORD` and stops before
ancestry.

The focused schema, current-main selection, diagnostic, and byte-consumer
suites pass 5 files and 43 tests; the owner typecheck passes. This does not
complete task 5.3
or alter providers, callers, resource sequencing, operation results, or live
state. See [[service-domain-frame#Burn-Down Design|the remaining burn-down]],
[[tasks|the active task ledger]], and
[[authority-amendment#Positive Architecture Ratchet|the architecture ratchet]].

## Current-Main Git Aggregate Admission

The bounded follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3c]] deletes the
current-main Git family's handwritten exact-record parser and manual field
arrays. `GitBlobSelectionSchema` and `ExactGitBlobPointerSchema` now own
aggregate shape admission. The unchanged `UNKNOWN_FIELD` messages derive their
field lists from each schema's sorted properties rather than a second
structural declaration.

Aggregate admission reads TypeBox `Value.Errors` and treats only root
`instancePath` errors as shape failures. An exact-shape input with invalid field
values therefore continues through the established repository, ref, commit,
tree, path, and blob parsers in the same order. Successful selections and
pointers are still reconstructed and frozen rather than returning caller
objects.

The new owner behavior suite passes all 3 cases; the four focused current-main,
schema, and diagnostic files pass all 39 tests. The lifecycle owner source and
test typechecks pass with their seven Nx prerequisites uncached. Strict
OpenSpec validation, touched-file Biome, and diff hygiene pass. No generic
schema helper or walker, proxy or prototype hardening, provider change,
resource sequencing change, caller change, or live-state mutation enters this
checkpoint. The six release aggregate parser families remain open, so this
does not complete task 5.3.

## Payload Aggregate Admission

The bounded payload follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3d]] deletes four
manual closed-record field arrays from payload and payload-manifest policy.
The new `PayloadEntryInputSchema` directly composes release-relative path,
normalized mode, and `Uint8Array` authorities and derives the raw entry type;
the existing wire-entry schema is now exported for its policy owner. The one
staged-tree annotation that previously widened an already-normalized mode to
`number` now retains the exact normalized-mode type emitted by its classifier,
and the payload construction collection uses the schema-derived raw entry type
instead of repeating and widening its shape.

One root-only TypeBox admission adapter projects plain objects to enumerable
key presence before reading `Value.Errors`. It therefore delegates required
and additional membership to the owner schema without traversing raw field
values or becoming a nested error walker. Non-objects retain their established
`EXPECTED_OBJECT` diagnostic. Missing or extra membership deliberately
normalizes to one `UNKNOWN_FIELD` diagnostic at the aggregate path with the
schema-derived sorted field list, and field parsing stops for that malformed
record. The older granular key-array helper remains for the five untouched
release parser families.

Raw construction arrays remain bounded before entry admission. Payload wire
entries and manifests are independently bounded before child parsing, so an
excluded tail getter is never evaluated despite TypeBox 1.3.8 traversing array
items before reporting `maxItems` in ordinary aggregate checks. A structurally
refused wire entry or manifest entry marks its parsed collection incomplete:
the structural diagnostic is retained, while dependent manifest and payload
digest comparisons do not run against a partial projection. Canonical
ordering, bytes and digests, duplicate detection, defensive copying and
freezing, aggregate byte limits, and field-exact manifest comparison remain
unchanged for complete collections.

The focused payload and release regression corpus passes 58 tests across six
files, and the complete lifecycle owner passes 397 tests across 43 files.
Lifecycle source and test typechecks, touched-file Biome, strict OpenSpec
validation, diff hygiene, and the four applicable Habitat source laws pass.
Final architecture, TypeBox/testing, and TypeScript/structural reviews report
no unresolved P0, P1, or P2 finding. No nested schema-error framework, proxy
hardening, router, resource, provider, caller implementation, canonical format,
or live-state behavior enters this checkpoint. Five release aggregate parser
families remain open, so this does not complete task 5.3.

## Provenance And Release-Input Aggregate Admission

The bounded release-input follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3e]] deletes four
manual closed-record field arrays from provenance-binding and release-input
policy. The existing `ProvenanceBindingSchema`,
`ReleaseInputEnvelopeSchema`, `ReleaseInputBodySchema`, and
`ReleaseMemberDeclarationSchema` now own exact aggregate membership through the
same root-only TypeBox admission adapter. No local shape copy or new schema was
needed; the policies continue to construct their TypeBox-generated binding,
member, body, and envelope types.

Missing or extra membership produces one schema-derived `UNKNOWN_FIELD`
diagnostic at the aggregate path, while non-objects retain `EXPECTED_OBJECT`.
Exact-shape values still reach the established primitive parsers in their
existing order. A structurally refused provenance child marks its collection
incomplete, so envelope verification preserves the structural issue without a
derivative release-input digest mismatch. Release-input member parsing
propagates an incomplete or non-array nested `vendor` or `curation` collection
into member-collection incompleteness. Ownership-index derivation, release-input
digest comparison, and the derived zero-member diagnostic therefore never run
against a member omitted by nested provenance structure.

Provenance and member arrays remain bounded before child admission. Canonical
ordering, duplicate refusal, ownership-index construction, canonical bytes and
digests, envelope reconstruction, defensive freezing, and the existing
post-reconstruction TypeBox checks remain unchanged. The focused provenance,
release-input, release-input-record, canonical release-input, and
individual-release regression corpus passes 37 tests across five files.
The complete lifecycle owner passes 405 tests across 43 files. Lifecycle source
and test typechecks, touched-file Biome, strict OpenSpec validation, and diff
hygiene pass. No schema mapper, nested error walker, parser framework, proxy
hardening, router, resource, provider, caller implementation, or live-state
behavior enters this checkpoint. The ownership, individual-release, and
complete-set aggregate parser families remain open, so this does not complete
task 5.3.

## Lifecycle Service Cohesion Decision

The service-boundary reassessment considered both serious destinations. One
reading split Vendors, Packaging, and Providers because they consume different
resources and mutate different external owners. The opposing reading kept the
five modules together because they interpret one release domain. The decisive
evidence is change coupling and invariant ownership, not file count or
destination count.

Release derivation, clean-content eligibility, current-main selection,
release-input admission, payload, ownership, and complete-set identity form one
release domain whose coordinated subsets cross module branches and have changed
together. Splitting would either duplicate that kernel, turn it into a new
shared package, or place service calls across the strongest collaboration. The
one-service decision therefore stands. Independent domain meaning and cadence,
a qualified consumer that does not need the shared release truth, or durable
sequencing outside one request reopens placement; it does not predetermine a
sibling service rather than a plugin or workflow.

The concrete fatness is in the CLI command path, which currently constructs the
full concrete resource set through a hidden production fallback before
selecting one typed operation. A bounded app-owned profile instead stores exact
factory references without constructing them. After closed input admission, a
command materializes those ready dependencies once, constructs one local
lifecycle client, and invokes one selected operation. Resource acquisition and
cleanup remain operation-local. This change adds no managed runtime, process
finalizer, cache, registry, controller, workflow engine, app composition layer,
or second service.

That checkpoint completes the lifecycle production boundary: the canonical
TypeBox adapter uses TypeBox's native validator and omits ambiguous
issue paths, while the CLI owns cold provider selection and direct local
lifecycle-service binding. A consumer's additional need for a production
compiler, bootgraph, process-runtime binding, or harness belongs to the
separately governed runtime-realization migration; it does not make this
lifecycle boundary incomplete. The exact landed handoff below is lifecycle
evidence, not research BUILD or restack authorization; no moving branch head is
a handoff.

## CLI Production Profile Handoff

The CLI now has one cold production profile containing the exact factory
references selected by the app. A lifecycle command admits its input, materializes
the selected ready dependencies once, creates one local service client through
the service's public `createClient` boundary, and selects one synchronous
operation surface. The old hidden production fallback and the redundant SDK
binding map are absent. No factory runs when the profile is imported.

This checkpoint changes no resource implementation or Effect behavior. Native
provider sessions, temporary Git roots, content captures, child processes, and
package publication cleanup remain owned by the operations that acquire them.
There is no process runtime, finalizer, client cache, provider registry,
controller, or second service.

The focused profile, provider binding, client-context, command-local binding,
and command-boundary regression passes 28 tests. The complete CLI suite passes
86 tests across 25 files. CLI source and test typechecks, the exact closed
Habitat command-channel rule, strict OpenSpec validation, source/compiled Oclif
inventory acceptance, and the installed-package round trip pass. The installed
package exposes 46 first-party commands and exercises the real
`rawr agent plugins` surface from the packed Nx release group.

Standing architecture, Effect/oRPC, TypeScript/structural, and testing reviews
accepted the final diff. Template PR #678 landed the checkpoint on canonical
`main` at `a25f72da1505f90206c6ff14bcb0ab5de77cbbec`; its exact candidate head was
`60dd2f7dd97e5c5b30c3aba4310ab99aa38414b3`. The required
`Required lint, typecheck, and topology` check passed for that head in
Repository Ratchet run `30530555544`, job `90831615094`.

This exact landed checkpoint also contains the canonical TypeBox adapter
lineage: the native-validator, message-only bridge correction landed at
`0854024afe9a76ef0ae4ae3f427182be25fe8420`, and its package owner directory
landed at `3b142e560f3b3cefa255356fa7343c56cac18d99`. The public
`@habitat-ai/typebox-adapter` identity belongs to the later namespace
correction and is not attributed to either historical commit. The landed `main` commit
`a25f72da1505f90206c6ff14bcb0ab5de77cbbec` is lifecycle implementation
evidence; `60dd2f7dd97e5c5b30c3aba4310ab99aa38414b3` is review/check provenance
only. The handoff means app-owned cold provider selection, direct local service
binding, and operation-owned cleanup. It does not implement or authorize the
separate production compiler, bootgraph, process-runtime binding, or harness
boundary required by a full runtime-realization consumer.

## Lifecycle Integration Closure

The final service/CLI integration boundary now admits every command input before
the production profile can materialize a resource. The current-main body flag
uses the governance module's TypeBox schema through the public client face; a
schema-invalid body exits with `LIFECYCLE_INPUT_INVALID` and makes zero binding
calls. The service's empty `scope`, `config`, and `provided` lanes are exact
empty types, with negative compile-time assertions rejecting added keys.

The CLI no longer erases service results to `unknown` and reconstructs their
shape. Each operation remains correlated with its TypeBox-derived client result
through invocation, exit classification, byte-to-text presentation, and human
output. Exhaustive switches make a new operation or changed result variant a
compiler-visible integration change. Binding failure still performs no
selection or invocation; a rejected selected operation is invoked once without
retry; both produce the typed `LIFECYCLE_PROCEDURE_FAILED` terminal and exit
one.

The uncached lifecycle and CLI gate passes 412 tests across 43 service files and
89 tests across 25 CLI files, together with source and test typechecks. The
uncached native Oclif extension round trip passes in a disposable environment.
The ordinary installed Nx release-package round trip also passes and exposes 46
first-party commands. Touched-file Biome, diff hygiene, and strict OpenSpec
validation pass. No live provider state was read or mutated by this closure.

Standing architecture/oRPC/Effect, TypeScript/TypeBox/structural, and
behavior/testing reviews accepted the composed diff with no P0-P2 findings.
The exact installed experimental tuple is
`@orpc/experimental-effect@2.0.0-beta.20` with
`effect@4.0.0-beta.101`. That tuple is outside the skill's frozen beta.17
profile, so the review is exact-source-recovered evidence for this repository,
not a portable Effect 4 conformance claim. The preexisting service-bootstrap
`.effect` bridge remains unchanged.

Template PRs #680 through #682 landed this closure on canonical `main` at
`7d126548ebffe9fd84a8da8010f6a3d8aa0014f2`. The exact-main Repository Ratchet
passed in run `30534802970`, job `90845419520`. The earlier profile checkpoint
`a25f72da1505f90206c6ff14bcb0ab5de77cbbec` and handoff record
`abc8f16fba7c9c2b125d4e088101872582573fa3` remain lineage, not a downstream
runtime restack authorization. Task 5.8 strengthens integration around that
landed lifecycle boundary; it does not create a compiler, bootgraph, process
runtime, provider registry, persistent client, second service, or new provider
authority. A consumer requiring those production runtime owners remains held
for the separately governed runtime-realization migration.

## Distribution Ownership Aggregate Admission

The bounded ownership follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3f]] deletes the
ownership-index parser's handwritten object guard and unsafe record cast. The
existing `DistributionOwnershipIndexRecordSchema` now owns exact root
membership through the same root-only TypeBox admission boundary used by the
other release aggregates.

Root structural refusal remains the ownership family's documented single
`EXPECTED_OBJECT` diagnostic. Exact-shape values still bound `claims` before
the full schema validator sees them, so TypeBox never traverses a caller-owned
array beyond the protocol ceiling. Primitive-invalid values retain that
owner-local aggregate classification, while structurally valid records continue
to reach member coverage, plugin synthesis, duplicate and routing conflict
policy, canonical ordering, and immutable reconstruction.

The cut adds no schema, parser framework, nested error walker, proxy hardening,
router, resource, runtime, caller implementation, or public terminal
classification. It intentionally normalizes a missing `claims` member and the
non-object message to the ownership family's documented aggregate
`EXPECTED_OBJECT` diagnostic. Individual-release and complete-set aggregate
parser deletion remain open, so this checkpoint does not complete task 5.3.

The focused ownership, release-input, and release-set regression passes 44
tests across three files; the complete lifecycle owner passes 405 tests across
43 files. Lifecycle source and test typechecks, touched-file Biome, strict
OpenSpec validation, and diff hygiene pass. Standing TypeScript/TypeBox,
testing, and structural-quality reviews accepted the final cut after exact-bound
and root-refusal child-traversal proofs were added.

## Individual Release Aggregate Admission

The bounded individual-release follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3g]] deletes the four
manual closed-record field arrays from individual-release construction,
envelope admission, body admission, and source admission. The existing release
envelope, body, and source TypeBox schemas now own those aggregate boundaries.
One new closed construction schema names the already-supported input shape,
including the admitted in-memory and canonical wire alternatives for embedded
release inputs and payloads; its TypeScript type is derived from that schema.

Missing or extra aggregate membership now produces one `UNKNOWN_FIELD` issue at
the owning aggregate path, while non-objects retain `EXPECTED_OBJECT`.
Exact-shape values continue through the existing primitive and semantic policy,
so schema versions, identities, canonical ordering, payload binding, digest
verification, copying, and freezing keep their established owners. Root
membership projection does not inspect child values. Alias arrays remain
bounded before child admission, including the exact ceiling and an over-limit
array whose excluded value is never read.

The focused individual-release, release-set, and value-admission regression
passes 38 tests across three files; the complete lifecycle owner passes 408
tests across 43 files. Lifecycle source and test typechecks and touched-file
Biome pass. The cut adds no nested TypeBox error walker, parser framework,
resource, provider, runtime, router, caller implementation, or native-state
behavior. Complete-set aggregate parser deletion remains open, so task 5.3
remains open. Standing TypeScript/TypeBox and structural reviews accepted the
cut directly; the testing review accepted after canonical wire alternatives,
missing aggregate membership, and the complete primitive diagnostic were pinned.

## Complete Release-Set Aggregate Admission

The final owner-local TypeBox follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.3h]] deletes the
complete-set family's four remaining manual closed-record field arrays and the
now-unused handwritten admission helper. One closed construction schema names
the already-supported in-memory and canonical wire alternatives for the
embedded release input and releases. The existing complete-set envelope, body,
and member schemas own their aggregate boundaries; all corresponding
TypeScript types derive from those schemas.

Missing or extra membership produces one `UNKNOWN_FIELD` issue at the owning
aggregate path, while non-objects and exact-shape primitive failures retain
their established diagnostics. Root membership projection does not inspect
child values. A structurally refused member marks the collection incomplete,
so ownership, completeness, and set-digest policy do not run against a partial
projection. Release and member arrays remain bounded before traversal, and an
over-limit release array does not read its excluded tail.

Canonical ordering, embedded-value re-verification, ownership closure,
complete membership, canonical bytes, digest verification, copying, and
freezing keep their existing policy owners. The cut adds no nested TypeBox
error walker, parser framework, resource, provider, runtime, router, caller
implementation, or native-state behavior. With the handwritten closed-record
helper and its sole direct test deleted, this checkpoint completes task 5.3.
The focused complete-set and value-admission regression passes 30 tests across
two files, and the complete lifecycle owner passes 412 tests across 43 files.
Lifecycle source and test typechecks, touched-file Biome, the applicable
contract-property Habitat law, strict OpenSpec validation, and diff hygiene
pass. Standing TypeScript/TypeBox, behavior-first testing, and
architecture/structural-quality reviews accepted the final cut after canonical
wire construction, independent missing and extra membership, exact primitive
diagnostics, and both bounded member collections were pinned.

## Vendor Content Workspace Identity

The bounded Vendor interface correction
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.9]] distinguishes the
Personal content repository's logical identity from the exact URL reported by
Git. The public Vendor request now carries both `repositoryIdentity` and
`remoteUrl`. Status and update compare native workspace observations with the
URL while retaining the logical identity in release and authoring semantics.

The CLI reuses its existing `--remote-url` flag for
`rawr agent plugins status vendors` and
`rawr agent plugins update vendors`. The correction does not broaden the
logical identity schema, infer identity from transport syntax, alter persisted
Vendor records, add a compatibility reader, or change the content-workspace
resource.

The complete lifecycle suite passes 413 tests across 43 files and the complete
CLI suite passes 89 tests across 25 files. Source and test typechecks,
touched-file Biome, the service contract-property Habitat law, and diff hygiene
pass. A behavior case proves a mismatched URL rejects before record reads,
upstream observation, capture, or mutation; the Node integration uses a
logical identity and a distinct HTTPS remote.

## Dev Mechanics Capability Narrowing

The bounded Dev follow-on
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e29]] narrows shared
mechanics before changing module context or router topology. The command
executor now accepts only the existing process capability, and its identity
`execText` alias is absent. Command exit, output decoding, timeout, and thrown
adapter behavior remain one `DevCommandStep` contract.

Scratch discovery now accepts only the existing filesystem and path
capabilities. A pure policy function owns deterministic ordering,
missing-record classification, and blocking; it copies observed arrays before
sorting. The async coordinator still owns recursive discovery and still avoids
filesystem reads entirely when policy is off or explicitly bypassed.

The public `DevResources` host-construction bundle, service base, module
contexts, contracts, routers, host adapters, and operation results are
unchanged. This checkpoint adds no resource, provider, middleware, compatibility
surface, or runtime owner. Module context curation and the known native oRPC
beta.20 `module.router(...)` middleware replay remain separate topology work;
this cut neither blesses nor repairs that behavior.

Dev source typecheck and all 15 owner-local behavior tests pass. The tests pin
active `warn` and `block` observation, off and bypass no-observation, dry-run
admission versus applied mutation refusal, ordinary nonzero exits versus
adapter throws, deterministic output order, and preservation of both observed
path arrays. Touched-file Biome, the complete 34-rule Habitat policy, strict
OpenSpec validation, and diff hygiene pass. Standing architecture/oRPC,
TypeScript/structural, and behavior-first testing reviews accepted the final
cut after those mutation-boundary oracles were added.

## Dev Module Context Curation

The next bounded Dev checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e30]] keeps the
complete host capability bundle at the service boundary while removing it from
operation authorship. Each `module.ts` now projects the vocabulary its branch
authors against: Scratch Policy receives workspace root, filesystem, and path;
Stack receives workspace root and process; Repo receives workspace root,
process, and clock; Worktree receives workspace root, process, and path.

Guarded modules also receive one request-scoped scratch-policy checker. That
checker binds the existing service-owned policy to the root workspace,
filesystem, and path capabilities during module curation. Stack, Repo, and
Worktree handlers author against scratch admission without reaching back into
raw construction lanes that their operations do not use. The Scratch Policy
module remains the direct artifact-observation surface.

Native oRPC beta.20 context merging is additive, so module curation does not
erase the initial service context at runtime or from the inferred handler type.
This is an authorship boundary, not a capability sandbox. The staged Habitat
source law is its service-wide enforcement owner when that law activates; the
current cut keeps handler reach-backs absent without pretending that the law is
already active. A context wrapper or second implementation boundary would add
machinery without improving this request-bounded service.

The service base, public `DevResources` construction contract, root
implementer, contracts, router topology, result types, host adapter, and
operation behavior are unchanged. No service middleware, resource, provider,
context wrapper, or compatibility path is added. The native beta.20
`module.router(...)` middleware replay remains a separate, explicitly
unresolved topology correction.

Uncached Dev source typecheck and all 15 behavior tests pass in 3.7 seconds.
Touched TypeScript passes Biome; all 34 active Habitat rules, strict OpenSpec
validation, and diff hygiene pass. Standing architecture/oRPC,
TypeScript/structural, and behavior-first testing reviews accepted the cut
after the additive-context correction above.

## Dev Scratch Policy Router Authority

The next bounded Dev checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e31]] closes one
module without widening the service. Scratch Policy now declares its operation
in `contract/check.ts`, curates observation capabilities in `module.ts`,
authors discovery and policy evaluation in `router/check.router.ts`, and
composes the completed operation through module-root `router.ts`.

The module composer is a plain object. It no longer calls
`module.router(...)`, so root `impl.router(...)` is the only native router
completion on the `scratchPolicy.check` lineage and service observability and
analytics execute once per scratch-policy call. Behavior proof covers both
successful active policy modes and a retained filesystem failure, including
exact analytics and lifecycle-log cardinality. Sibling module lineages retain
their existing completion shape until their own bounded checkpoints.

The public `scratchPolicy.check` key, TypeBox schemas, metadata, result shape,
failure identity, service-owned policy, client construction, and service-root
composition remain unchanged. This checkpoint changes no Habitat law, sibling
module, public export, resource, provider, Effect boundary, or compatibility
path.

The red behavior proof observed four success signals for two calls and two
error signals for one failing call. The closed lineage now carries three
middleware entries rather than the legacy replay's six; uncached source
typecheck and all 16 Dev tests pass in 3.4 seconds. All 34 active Habitat rules
pass, and direct staged composition, authorship, context, anchor, and isolation
probes report zero findings on the Scratch Policy lineage. Strict OpenSpec,
focused Biome, and diff hygiene pass. Standing architecture/oRPC,
TypeScript/structural, and behavior-first testing reviews report no P0-P2.

## Dev Worktree Router Authority

The next bounded Dev checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e32]] closes the
Worktree module without widening the service. Worktree now declares cleanup in
`contract/cleanup.ts`, retains terminal context curation in `module.ts`,
authors admission, planning, and removal in `router/cleanup.router.ts`, and
composes the completed operation through module-root `router.ts`.

The module composer is a plain object. It no longer calls
`module.router(...)`, so root `impl.router(...)` is the only native router
completion on the `worktree.cleanup` lineage. One dry-plan call and one thrown
admission failure each emitted two analytics entries and two lifecycle logs
before the correction; each now emits exactly one of each. The closed lineage
carries three middleware entries rather than the predecessor's six. Scratch
Policy is already closed; Stack retains its predecessor completion shape until
its own bounded checkpoint.

Cleanup semantics remain intact: selection uses the strict worktree basename
prefix, protects the current worktree and explicit pins, refuses detached,
trunk, and unmerged entries, defaults to a dry plan, and applies admitted
removals sequentially. A removal command failure remains an exact execution
result, while a scratch-admission adapter failure retains its thrown identity.
Review removed one dead planned-removal computation; the public
`followUpCommands` result remains the same empty array. The public operation
key, TypeBox schemas, metadata, result shape, service-owned scratch policy,
client, and service-root composition do not change.

Uncached source typecheck and all 17 Dev tests pass in 3.6 seconds. All 33
active Habitat rules pass, and direct staged composition, authorship, context,
anchor, and isolation probes report zero Worktree findings. Strict OpenSpec,
focused Biome, and diff hygiene pass. Standing architecture/oRPC,
TypeScript/structural, and behavior-first testing reviews report no P0-P2.
This checkpoint is not the production compiler, bootgraph, or runtime-provider
boundary awaited by the separate research service; it makes no such peer
handoff claim.

## Dev Repo Router Authority

The next bounded Dev checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e33]] closes the Repo
module without widening the service. Repo now declares upstream synchronization
in `contract/sync-upstream.ts`, retains terminal context curation in
`module.ts`, authors target resolution, admission, planning, and ordered
execution in `router/sync-upstream.router.ts`, and composes the completed
operation through module-root `router.ts`.

The module composer is a plain object. It no longer calls
`module.router(...)`, so root `impl.router(...)` is the only native router
completion on the `repo.syncUpstream` lineage. One structured merge failure
and one thrown admission failure each emitted two analytics entries and two
lifecycle logs before the correction; each now emits exactly one of each. The
closed lineage carries three middleware entries rather than the predecessor's
six. Scratch Policy, Worktree, and Repo are closed; Stack retains its
predecessor completion shape until its bounded checkpoint.

Repository semantics remain intact: an explicit upstream ref outranks Git
configuration and the `origin/main` default; branch naming remains
clock-derived; dirty, detached, missing-ref, branch-collision, worktree,
Graphite, and scratch observations complete before mutation. Apply mode
executes the fixed Git and Graphite plan sequentially. The behavior proof pins
the exact fetch, switch, and failed-merge prefix, the skipped result suffix,
and the absence of any post-failure command. A command failure remains a
structured execution result, while a scratch-admission adapter failure retains
its thrown identity.

The public operation key, TypeBox schemas, metadata, result shape, client, and
service-root composition do not change. Uncached source typecheck and all 18
Dev tests pass in 3.4 seconds. All 33 active Habitat rules pass, and direct
staged composition, authorship, context, anchor, and isolation probes report
zero Repo findings. Strict OpenSpec, focused Biome, and diff hygiene pass.
Standing architecture/oRPC, TypeScript/structural, and behavior-first testing
reviews report no P0-P2 after the ordered-tail proof correction.

Like the preceding Dev checkpoints, this landed boundary is independently
usable but is not the production compiler, bootgraph, or runtime-provider
checkpoint awaited by the separate research service.

## Dev Stack Router Authority

The final bounded Dev topology checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e34]] closes the
Stack module without widening the service. Stack now declares diagnosis and
drain through `contract/doctor.ts` and `contract/drain.ts`, retains terminal
context curation in `module.ts`, authors each operation in its matching
`router/*.router.ts` leaf, and composes those leaves through module-root
`router.ts`.

The module composer is a plain object. It no longer calls
`module.router(...)`, so root `impl.router(...)` is the only native router
completion on the `stack.doctor` and `stack.drain` lineages. Before the
correction, one healthy diagnosis, one dry drain plan, and one thrown
scratch-admission failure each emitted two analytics entries and two lifecycle
logs. Each now emits exactly one of each while preserving the original thrown
failure identity and zero process calls before failed scratch admission.

The public operation keys, TypeBox schemas, metadata, result shapes, Stack
policy, module context, public client, and service-root composition remain
unchanged. Focused proof also pins healthy diagnosis observations, exact dry
plan command order, TypeBox-valid results, and the absence of mutating
Graphite commands during planning. This checkpoint adds no resource, provider,
Effect boundary, compatibility path, or runtime owner.

Uncached source typecheck and all 20 Dev behavior tests pass. All 33 active
Habitat rules and the staged-file gate pass. Direct candidate-law probes report
no Stack finding for the spine, anchor, context, isolation, composition, and
authorship boundaries; the wider service corpus remains staged and is not
claimed green by this module checkpoint. Strict OpenSpec, focused Biome, and
diff hygiene pass. Standing architecture/oRPC, TypeScript/structural, and
behavior-first testing reviews report no P0-P2.

Review identified a separate pre-existing observation-authority defect:
unreadable initial Git status does not yet block an applied drain, and an
unreadable closing Graphite observation can be mistaken for convergence.
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e35]] owns that
behavioral correction after this topology checkpoint lands; it is not hidden
inside a file move.

Like the preceding Dev checkpoints, this boundary contributes no app/profile
provider selection, compiler coverage, runtime acquisition/finalization, or
production host binding. It is not the runtime-provisioning checkpoint awaited
by the separate research service.

## Dev Stack Observation Authority

The follow-up behavior checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e35]] makes external
command status authoritative wherever Stack uses command output to admit
mutation or claim convergence. A failed initial `git status --short --branch`
now makes doctor report `NEEDS_ATTENTION` and makes an applied drain return a
failed preflight before its first mutating command. A failed closing `gt ls`
becomes a structured execution issue and stops the applied drain without
claiming convergence or beginning another cycle.

The correction remains inside the existing `doctor` and `drain` router leaves.
It adds no operation, schema, context member, resource, provider, fallback, or
durable state. These command failures remain TypeBox-valid domain results, so
each operation emits one successful oRPC middleware lifecycle; genuinely thrown
resource failures retain their existing identity and error lifecycle.

The three behavior proofs pin the exact read-only admission prefix, the exact
applied prefix through the failed closing observation, the absence of a second
cycle or sleep, diagnostic stderr, result validity, and one analytics plus one
log event per call. Before the source correction, all three proofs failed for
the intended semantic reason. Afterward, all 23 Dev tests and uncached Dev
typecheck pass. The repository's single Nx `check` graph passes across its 39
projects and dependencies, all 25 active repository Habitat rules pass, and
focused Biome plus diff hygiene pass. Fresh oRPC/architecture, behavior-first
testing, and TypeScript/structural completion reviews report no P0-P2 after the
failed-status proof was strengthened with misleading stdout.

This is Stack operation correctness only. It provides no compiler, bootgraph,
runtime acquisition/finalization, service binding, or production-host migration
and therefore is not the exact upstream checkpoint awaited by the separate
research service.

## Dev Proof Categories

The bounded follow-up
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e36]] places Dev's
existing proof in the closed service-package categories without changing what
it proves. The aggregate service suite moves to
`test/behavior/dev-service.test.ts`; its reusable client and fake-resource
construction moves to `test/support/service/helpers.ts`. The existing
compile-only contract relation remains under `test/mechanics/contract`.

Only relative imports change. The 23 behavior tests, production source,
public contract, resources, router lineages, and operation outcomes remain
unchanged. This removes Dev's final two service-topology findings but does not
activate a staged construction law or claim the remaining service corpus is
green. Uncached Dev behavior and typecheck pass, all 25 active Habitat rules
report zero findings, the active OpenSpec change validates strictly, focused
Biome passes, and diff hygiene is clean.

## HQ Ops Proof Categories

The next bounded checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e37]] categorizes HQ
Ops proof before production topology changes. Config behavior moves under its
module behavior category, configured resource-backed behavior moves to
integration, the public service-spine relation moves to contract mechanics,
and reusable client/resource construction moves to service support.

Only relative imports change. All 11 test cases, production source, public
contract, resource behavior, and current router lineages remain unchanged.
The suite therefore continues to expose the predecessor module-router shape;
the next module checkpoints own the already-observed duplicate root middleware
lifecycle rather than hiding a behavior correction in proof movement.

Uncached HQ Ops behavior and typecheck pass. This checkpoint removes the
package's flat proof-topology findings but does not claim its production
service corpus green or activate any staged construction law. All 25 active
Habitat rules report zero findings, the active OpenSpec change validates
strictly, focused Biome passes, and diff hygiene is clean.

## HQ Ops Root Model Authority

The next bounded checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e38]] closes the HQ
Ops service-root model before any module topology changes. The host capability
contract moves from the predecessor `service/common` bucket to
`service/model/ports`; service-wide procedure metadata moves from contract
composition to `service/model/policy`. The base keeps one explicit immutable
five-lane context, and the package-private service alias gives modules one
qualified route to genuinely service-owned model types.

The unused common error placeholders disappear with the invalid bucket.
Operation handlers, module routers, root middleware order, concrete provider
construction, the package export map, and callers remain unchanged. This
checkpoint does not migrate a module or activate a staged service law.
The former contract-local metadata export has no repository caller and is not
retained as an alias. One contract-mechanics proof verifies that service
metadata still composes with operation-owned overrides.

All 12 owner tests and the uncached owner typecheck and build pass. All 25
active Habitat rules, strict OpenSpec, focused Biome, and diff hygiene pass. A
fresh architecture/oRPC/Effect/TypeScript/TypeBox review reports no P0 or P1 in
the bounded root-model change.

## HQ Ops Config Module Closure

The next checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e39]] closes Config
without widening into another HQ Ops module. Config owns its TypeBox model,
validation policy, capability curation, contracts, and three operation
handlers. Its module-root router becomes plain composition; the service root
remains the only native aggregate router closure.

One behavior-first oracle holds the architectural outcome directly: a
successful workspace-config call emits one analytics event and one procedure
log. It observes the predecessor configured module-router replay first, then
must pass exactly once after the module closure. Journal and Security retain
their visible predecessor shape for their own checkpoints.

The oracle failed deterministically in two predecessor runs with two matching
analytics entries, then passed after Config's module-root router became plain
composition. Config now curates only filesystem, path, and repository-root
capabilities; its contracts, TypeBox DTOs, validation policy, pure mechanics,
and three operation handlers are module-owned. All 13 owner tests and the
uncached owner typecheck and build pass. Active Habitat policy, the three
staged Config construction laws, strict OpenSpec, focused Biome, and diff
hygiene pass. Fresh architecture/oRPC and TypeScript/TypeBox/testing reviews
report no P0 or P1.

## HQ Ops Journal Module Closure

The active checkpoint
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e40]] closes Journal
without inventing module-local persistence or a migration framework. Journal
JSON records remain canonical operational history. SQLite remains a derived
tail/search index, but its physical migration and store implementation move to
the standalone service database boundary because physical persistence belongs
to the service regardless of current module count.

The Bun CLI and server hosts lazily resolve the one versioned package SQL
asset, apply it while preparing a fresh Journal index handle, and supply that
ready capability through the service context. Direct service-root middleware
projects a narrow store; the Journal module curates only that store and
embeddings. Operation handlers retain JSON-first best-effort indexing,
canonical JSON reads, tail, FTS, semantic ranking, and fallback policy.
Contracts, DTOs, ports, and policy are module-owned, while entity schemas stay
at the pre-existing module-root authority until the shared entity source law
lands. The module-root router is plain composition, so root observability and
analytics execute once.

This boundary deliberately adds no migration registry, scanner, runner,
version table, generic database framework, detached handler, or new runtime
resource. Migration `0002` is the trigger for separately deciding whether
ordered migration state is actually required.

The checkpoint passes all 21 HQ Ops tests, owner typecheck/build, CLI and
server typecheck/build, focused CLI Journal/config tests, server host tests,
direct host migration smokes, package inclusion proof, all 25 active Habitat
rules, strict OpenSpec validation, focused Biome, and diff hygiene. Fresh
architecture/oRPC, TypeScript/TypeBox, and behavior-first reviews report no P0,
P1, or P2. Template PR #708 landed the byte-identical candidate tree on
canonical `main` at `58e005878d4ca69bbeaafc1f5cca990c941a1643`; candidate
head `c4d81b060b4c7ffb5d08873f77aee2d361c31d2f` remains review
provenance only. The required repository ratchet passed in run `30602570035`,
job `91068208363`.

## Habitat Product And Release Authority

Before transferring any Habitat source, the authority record makes this
repository the sole owner of the Habitat product source, the `@habitat-ai/cli`
release identity, releases, generic policy distribution, and ordinary consumer
integration.
Magic Migration and Civ7 remain design, implementation, and consumer evidence;
they are not standing package owners or runtime dependencies.

The Habitat product owns one idempotent initializer for Nx plugin
registration, inferred repository targets, one named Habitat hook
contribution, and pinned Grit acquisition. The consumer repository owns its
hook files and final composition. Initialization preserves unrelated hooks,
updates only its own older contribution, refuses an incompatible Habitat
contribution, changes nothing on a converged repeat, and removes its
contribution only through an explicit removal operation. Consumers select
exact package and policy versions plus their own repository instances. They do
not copy Habitat source or reproduce its wiring.
The data-only `@habitat-ai/blueprints` pack remains distinct from executable
mechanics, but both are bound through one exact package protocol and one
consumer entrypoint.

Exact Civ7 implementation inputs and exclusions are recorded in
[[docs/projects/shared-habitat-substrate/CORPUS|the controlled transfer corpus]].
The transfer is scoped extraction, not a wholesale `tools/habitat` transplant:
Civ7 host policy, product roots, product generator/taxonomy/doc paths, and
manual consumer wiring do not move. Combined source intake/deproductization,
vendor modernization, initializer closure, policy-pack construction, and
release remain separate semantic checkpoints. Template ownership is already
effective; the historical Civ7 releases retain provenance only.

This checkpoint changes authority and execution records only. No Habitat
source, release, consumer configuration, provider home, Personal repository,
or live state moves until the separately reviewed transfer and release
containers land.

## Habitat Product Realization Correction

Task [[tasks#1. Positive Habitat And Nx Checks|5.7e22b]] first produced a
behaviorally green staging candidate under `packages/habitat-cli`. Standing
architecture review rejected that placement before landing. The directory
combined a semantic service, resource contracts, concrete providers, Oclif and
Nx projections, runtime selection, and the executable app under one
`type:package` owner. Its bespoke `habitat-cli` blueprint then validated the
exception rather than the repository's canonical product kinds.

The rejected staging tree remains historical migration evidence only and is
absent from this definition checkpoint. Green source tests proved the imported
behavior, not architectural fitness. That container is not accepted and must
not return in the recut.

The accepted target will realize Habitat through the ordinary product funnel:

```text
resources -> providers -> service -> plugins -> app -> runtime -> entrypoint
```

Product-free support matter may remain in packages. `@habitat-ai/cli` is the
single assembled Oclif release identity, not a semantic source owner. The
release may contain compiled output from several Nx projects without erasing
their boundaries. The data-only policy artifact is `@habitat-ai/blueprints`.

The current repository remains the source and release home. It is becoming the
Habitat product suite, with RAWR retained as one governed realization. Creating
another repository would add a synchronization boundary without adding a
truthful owner. The physical repository and directory rename waits for a clean,
drained Graphite boundary so it cannot disturb active worktrees or ancestry.

The recut carries three bounded behavioral corrections discovered by review:

1. local blueprint discovery admits only
   `.habitat/blueprints/<kind>/blueprint.toml` and validates path identity;
2. public owner selection includes resolved v3 applications;
3. blueprint-only execution does not require a v2 compatibility registry.

Consumer Git-hook, Biome, Graphite, and repository scheduling policy does not
belong to the Habitat evaluator service. The initializer and consumer-owned
hook composition project those workflows without creating another semantic
service owner.

Magic Migration and Civ7 remain exact provenance and implementation evidence.
No product root, host policy, manual consumer target chain,
generator/taxonomy/doc path, branch ancestry, or wholesale `tools/habitat`
tree enters the product graph. No initializer, release, consumer repository,
provider home, Personal repository, or live state has moved.

## Habitat Rule Evaluation Resource

The first executable source checkpoint realizes one narrow link in the Habitat
product funnel. `@habitat-ai/resource-rule-evaluation` owns only the
provider-neutral request, finding, result, and typed mechanical-failure
contracts. Its nested Grit Effect Platform Node provider owns one
invocation-scoped temporary catalog, one native check process, bounded output,
wire validation, timeout, interruption, and cleanup. The application will
select that provider; the Habitat service will later own rule discovery,
admission, selection, baselines, aggregate interpretation, and public
operations.

The provider accepts an already-resolved evaluator program and caller-resolved
absolute subject paths. TypeBox is the sole structural authority. Effect owns
filesystem, child-process, timeout, interruption, and scope lifecycles. The
provider verifies its local Grit result identity, returns findings in
deterministic order, and retains no catalog, output, evidence, or policy state
after the invocation.

Focused uncached Nx proof completes in 5.8 seconds: repository lint, resource
and provider typecheck, parent package build, three contract tests, eight
provider behavior tests, and both owner check targets pass. The parent
production input includes nested provider source, so a provider change
invalidates the package artifact that emits it. Standing architecture,
TypeScript/Effect, structural-quality, and behavior-first reviews report no
remaining P0 or P1. At this resource checkpoint, task 5.7e22b2 remained open
for the separate service operation that would consume the rule-evaluation
resource.

## Habitat Self-Hosting Boundary

Habitat is built through the same resource, provider, service, plugin, and app
chain it enforces. Self-hosting does not make candidate source its own merge
authority. The installed Habitat release remains the repository checker while
the replacement source is constructed; a candidate self-check is additional
compatibility evidence, not the required gate.

The reviewed version-three product-kind definitions therefore remain inert
until an ordinary new Habitat app release can parse and evaluate them. The
service, plugins, and app may land first without `habitat.toml` product
instances so the existing required check is neither bypassed nor asked to
interpret a protocol it does not support. The released replacement then checks
and activates those definitions and instances as its first governed successor
change. This is a bounded bootstrap sequence, not a `habitat-cli` kind
exception, second checker, private selector, or permanent compatibility path.
This checkpoint carries the reviewed inert definition set. Its earlier blocked
repository check did not transfer merge authority to candidate source.

At the first service checkpoint, the Habitat service owned catalog resolution
only. Generic callers requested resolution; the service enumerated the finite
repository authority surface, classified exact blueprint and instance paths,
admitted their TypeBox-backed documents, resolved applications, retained
version-two records as resolution-only compatibility data, and returned
deterministic rejection or catalog results. Effect filesystem and path
capabilities entered ready through service context. The later
[[README#Habitat Version-Two Service Execution Checkpoint|native service-execution checkpoint]]
supersedes only that historical execution boundary.

### Habitat Catalog Service Checkpoint

[[services/habitat/AGENTS|The Habitat catalog service]] now exposes one closed
`catalog.resolve` operation. The caller supplies no repository listing or
invocation ceremony. The handler enumerates ordinary and hidden instance
manifests through ready Effect filesystem/path capabilities, confines and reads
each authority document once, and hands schema-admitted facts to pure catalog
policy. An absent version-two index yields exact empty compatibility; orphan
version-two rules remain unread.

The uncached Nx typecheck, build, test, and service check pass. The behavior
suite reports 18 passing tests, the OpenSpec validates strictly, repository
Biome passes, and the 25 required Habitat policy rules report no findings.
Architecture, behavior-first testing, and TypeScript/Effect reviews report no
remaining P0, P1, or material P2 findings.

### Habitat Catalog Check Checkpoint

The next service-owned operation is `catalog.check`, not a parallel checker or
runtime host. It consumes the same admitted catalog, intersects optional
owner/rule/runner selectors, and evaluates the resulting applications in stable
rule/instance/owner order. Empty authority completes successfully without
resource calls. Unknown values, wrong selector namespaces, and cross-selector
empty intersections refuse before evaluation; a sole recognized runner with
no current applications preserves the predecessor's successful empty result.

The host supplies one ready provider-neutral rule-evaluation resource through
the service dependency lane. The catalog module neither selects a provider nor
constructs a runtime. Its grouped router handler reads the admitted Grit
program, passes resolved absolute subjects to the resource, confines returned
paths to those subjects, and interprets findings through service-owned lane
policy. Typed evaluator failures become application errors; defects and
interruptions remain Effect failures.

This checkpoint executes only Grit applications whose acquisition kind is
`check`. Native structure and Grit `apply-dry-run` applications are refused
before resource invocation. They cannot silently pass, and they do not acquire
transitional runners. TypeBox owns the closed request and total result shapes;
version-three reports preserve `locked: false` and `baselined: false` without
acquiring predecessor baseline state. The operation retains no catalog,
provider, finding, or result state.

The focused behavior suite reports 15 passing check tests and the complete
service suite reports 33 passing tests. Uncached Nx typecheck and build pass,
with dependency and operation boundaries unchanged outside the Habitat service
and rule-evaluation resource.

### Native Structure Ownership Correction

The first native-structure implementation candidate correctly used Effect
Platform filesystem mechanics, but placed structure meaning in a new
rule-evaluation provider. Review rejected that classification before commit.
Unlike Grit, native structure matching does not execute a foreign evaluation
program. `allowEmpty`, root kinds, direct-child admission, closure, and
diagnostic classification are Habitat domain policy and remain in the catalog
module.

The source universe is the repository's Git-visible workspace, not every live
filesystem entry. A live-filesystem-only evaluator treated ignored `dist` and
`node_modules` output as governed source and broke the existing ranged Grit
result consumer by widening its contract prematurely. The candidate was
deleted uncommitted.

Task [[tasks#5. Bounded Agent-Plugin Lifecycle Service|5.7e22b2a]] now lands one
generic source-inventory resource and ordinary local-Git provider. It reports
bounded visible paths and tracked non-file facts without knowing Habitat. Task
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|5.7e22b2b]] then consumes
those facts through ready service context and authors native structure
semantics inside the existing catalog procedure and module policy. This is the
same narrowing product funnel recorded in
[[../../../post-it#2026-07-31 - Source Is Observed, Structure Is Interpreted|the active mental-model ledger]];
it adds no compatibility runner, retained inventory, hostile Git hardening, or
second rule authority.

### Source Inventory Checkpoint

`@habitat-ai/resource-source-inventory` now owns one TypeBox-derived mechanical
contract for a bounded visible-entry inventory. Its local-Git Effect Platform
Node provider runs the ordinary inherited `git ls-files` observation, drains
the process under Effect scope, normalizes sorted unique entry paths, and
identifies tracked symlink and Gitlink entries without consulting the live
filesystem. Contract proof and provider proof are separate Nx targets.

Standing architecture, TypeScript, structural-quality, and behavior reviews
closed the embedded-repository sentinel, mixed-mode index aggregation,
Unicode-path parity, provider-option admission, defect and interruption
preservation, bounded diagnostics, Gitlink classification, duplicate-aware
limits, and target-ownership findings. No P0, P1, or P2 remains. Uncached Nx
typecheck, test, and build complete in 3.9 seconds with 4 contract tests and 17
provider tests passing; Habitat lint, the resource/provider/agent/Nx blueprint
rules, strict OpenSpec validation, and diff hygiene also pass. The checkpoint
does not inspect or mutate provider homes, Personal content, release channels,
or live lifecycle state.

### Native Structure Checkpoint

`catalog.check` now executes admitted schema-version-two structure applications
alongside its existing Grit checks. The host supplies the ready
`SourceInventoryResource` through service base context; the catalog module
curates that capability downward, and the procedure handler acquires at most one
fresh inventory for each invocation that contains a bound structure scope.
Invalid assets, unbound optional roots, refused selection, and Grit-only checks
do not acquire an inventory. No inventory, observation, report, or result is
retained between invocations.

TypeBox is the sole structure-document admission authority. Pure catalog policy
binds each scope's literal `rootRole` base to its `relativePath`, interprets the
Git-visible universe, evaluates root kind and direct-child requirements, and
produces deterministic path-only diagnostics. The handler owns TOML reading,
live no-follow path observation, Effect failure boundaries, and result
sequencing. Inventory selects the candidate source universe; request-local live
observation reconciles ordinary candidate existence and kind before policy
decides the result. Git-owned symlink and Gitlink identities remain `other`
while present and keep their descendants pruned, but become missing when absent.
Grit reports retain their ranged finding contract; native Habitat reports are
runner-discriminated and cannot acquire source ranges or predecessor baseline
state. Exact `instance` selection is now available for the later Nx projection
without adding another operation or runner.

The behavior suite passes 45 tests, including 27 `catalog.check` cases covering
closed and open scopes, empty matching, distinct root roles, tracked non-file
pruning, deleted and type-replaced inventory entries, one-inventory repeat
isolation, one live observation per candidate path and request, mixed
Grit/Habitat results, and typed, defect, and interruption observation
boundaries. Uncached Nx typecheck, test, and build pass. The 25-rule local
Habitat policy batch, strict OpenSpec validation, Biome, and diff hygiene are
clean. Standing architecture, TypeScript/TypeBox, structural-quality, and
behavior reviews report no P0 or P1 finding. The checkpoint does not select a
provider, create runtime or retained state, mutate provider homes, read Personal
content, or touch release channels.

### Habitat Boundary Migration Closure

Task [[tasks#5. Bounded Agent-Plugin Lifecycle Service|5.7e22b2]] is complete.
The two previously indirect boundary corrections now have direct public behavior proof: a
blueprint whose declared id disagrees with its authority-directory kind is
rejected, and a known owner selector evaluates only that owner's resolved v3
applications. The complete focused Habitat service suite passes 47 tests.

The service imports only provider-neutral resource contracts and retains
authority, selection, and structure meaning. Concrete Git and Grit providers
remain in their resource-owned projects. Positive provider selection and Oclif
or Nx projection do not exist at this checkpoint; the Habitat app and its two
qualified plugins remain task 5.7e22b3.

### Habitat Blueprint Definition Checkpoint

The definition-only checkpoint records seven ordinary v3 kinds: `package`,
`resource`, `provider`, `service`, `plugin`, `plugin-nx`, and `app`. Each
definition owns one blueprint-root `structure.toml` and one authoring
`skill.md`; there is no `habitat-cli` kind. The source catalog schema-admits all
seven definitions. They have zero repository instances, zero resolved
applications, and no released-pack acceptance, so they add no executing policy
path and cannot replace the installed merge checker.

At this definition-only checkpoint, the released v2 compatibility registry was
the sole executing authority and retained exactly its prior 33 live rules. The
six service-construction laws
remain under `.habitat/staged/**`; this checkpoint does not copy or promote
them while source migration is incomplete and their corpus is red. The
schema-admitted `service@1` definition therefore declares only its native
structure rule; RAWR-path-qualified Grit rules stay outside the generic
definition until location-independent service laws are ready.
Public-consumer sealing remains staged and outside service-local v3 application
until resolution can acquire foreign consumers across the workspace. The v2
nested schema-1 structure assets remain temporarily executable because the
released evaluator cannot consume the blueprint-root schema-2 form. They are
removed atomically only when release-accepted v3 instances and source migration
activate; until then the new root assets are inert and do not compete with them.
Every closed project structure requires its own `habitat.toml`, so the manifest
that selects a kind cannot become an unexpected child of that kind.

Only the `package@1` proof-axis grammar is frozen: manifest-selected `contract`
and `semantics` ids map to their exact proof files. The kind remains outside
release-pack acceptance until resolution proves equality between selected ids
and all present proof members. Every other kind's proof axes remain candidates.
The definitions also lack an enforceable blueprint-declared root relation:
manifests can name `project` and `source` independently even where service, app,
and plugin structures require exactly `source = project/src`. The first
`@habitat-ai/blueprints` pack therefore precommits neither `package@1` nor the six
service laws; no definition activates before its root relations are derived or
positively bounded, and those contents wait for exact-member closure, completed
source migration, and a green complete corpus.

Three constructibility relations remain deliberately open in task 5.7e22b1:
exact selected-member equality for hierarchical proof and nested provider
families; blueprint-declared root relations that derive or bound `source` to
`project/src` where the topology assumes it; and a workspace-wide application
boundary for foreign service consumer sealing. The Habitat-owned requirement is
recorded in [[HABITAT_BLUEPRINT_VARIANT_CAPABILITY_HANDOFF]]. RAWR does not
emulate any relation with a script, glob convention, local SDK fork, or
knowingly partial application. The definition checkpoint may land
independently, but the closed source graph is not claimed complete until those
relations or an equally owner-correct simplification are available and the
first instances pass.

This definition record completes only
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e22b1a]]. Task
5.7e22b1 and the remaining source, pack, release, and consumer checkpoints
remain open.
See [[docs/projects/shared-habitat-substrate/CORPUS#Definition Checkpoint|the controlled corpus]]
and [[.habitat/AUTHORITY-ONTOLOGY#Current Realization|the authority ontology]].

### Habitat Oclif Projection Decision

The first task 5.7e22b3 checkpoint projects the sealed Habitat service through
one ordinary `@habitat-ai/plugin-cli` Oclif package. The plugin owns argv
translation and result rendering only. The Habitat app will construct one
ready client and carry it through Oclif's invocation-local `Config.options`;
the plugin does not select providers, locate the repository, or construct a
runtime. A missing binding refuses rather than falling back to a checkout,
ambient singleton, or second implementation.

`resolve` and `check` invoke the existing service operations directly. The
check command maps owner, instance, rule, and runner flags into the
TypeBox-owned request and derives its process exit from the total service
result. The sibling Nx projection remains the next separate checkpoint, and
the Habitat app composes both only after their owner-local contracts are
sealed. No initializer, release, consumer configuration, provider home,
Personal content, or live lifecycle state changes in this slice.

The owner proof runs native Oclif discovery and dispatch against the built
plugin. It observes exactly `check` and `resolve`, preserves the app-selected
client by identity, proves single and repeated selector translation without
erasing explicit empty values, renders each complete total result before a
nonzero exit, and refuses dispatch when the app binding is absent. The
package build emits the published binding declaration. The four registered
Oclif Habitat rules, package typecheck/test/build/manifest graph, repository
lint, strict OpenSpec validation, and diff hygiene are green. Architecture,
behavior, TypeScript, and structural reviews found no remaining material
issue in the production boundary.

The widened `@habitat-ai/plugin-*` Grit laws have current-tree execution and
representative embedded cases. Native injected-fixture execution remains
bounded upstream Habitat proof debt; this slice does not introduce a one-off
fixture harness or alternate evaluator as a substitute for that capability.

### Habitat Nx Projection Decision

The second task 5.7e22b3 checkpoint introduces the package-less
`@habitat-ai/plugin-nx` source project. It exports a factory over an app-owned
`clientForWorkspace(workspaceRoot)` capability and non-empty runtime input set
because native Nx plugin options are serialized data and cannot carry a ready
service client. The later Habitat app calls that factory inside the Nx worker
and remains the sole owner of provider selection, resource construction,
service scope, and the cache facts for its selected runtime.

One graph construction resolves the catalog once. Each resolved application
becomes one cacheable `habitat check --instance ... --rule ...` leaf. Complete
catalog authority and app-selected runtime facts invalidate every leaf, while
runner assets and inspected subjects remain application-scoped; each owner
receives one dependency-only `check:policy` aggregate. The projection returns
target augmentations at instance manifest roots without a project name, so it
cannot create a second project identity. Catalog rejection, missing instance
lineage, owner mismatch, duplicate target identity, or an application outside
the matched authority files fails graph construction rather than producing an
empty or partial graph. Referenced-path existence, kind, and confinement are
therefore graph-admission facts, not duplicated task-cache inputs. The aggregate
is the fixed `check:policy` target; no
serialized option can reinterpret it as an Nx target glob.

The sealed source proof is `@habitat-ai/plugin-nx:typecheck`, six owner-local
behavior tests, the composed `@habitat-ai/plugin-nx:check` graph, repository lint,
and strict OpenSpec validation.

This source checkpoint does not register itself in `nx.json`, replace the
released Civ7 checker, activate a version-three instance, compose the Habitat
app, initialize a consumer, or publish an artifact. It imports no provider,
constructs no runtime, calls no check operation during graph construction,
starts no nested Nx scheduler, and retains no catalog or result state.

### Habitat App Composition Checkpoint

The third task 5.7e22b3 checkpoint introduces the ordinary `apps/habitat`
Oclif app with package identity `@habitat-ai/cli`. One app-owned construction
function selects the ready Node filesystem, path, Grit evaluation, and Git
inventory capabilities, fixes the workspace scope, and constructs the public
Habitat client. The Oclif entrypoint binds that client through native
`Config.options`; the Nx entrypoint supplies the same function to the landed
package-less projection factory.

The Nx entrypoint is conventional bundled application output. Bundling the
qualified package-less projection into `@habitat-ai/cli/nx-plugin` makes one
installable artifact without copying source, transferring plugin authority, or
inventing a loader. Oclif command ownership remains in
`@habitat-ai/plugin-cli`; the app manifest correctly has no app-local commands.
The app has no controller, release store, selector, daemon, provider registry,
or retained domain state.

Source development uses Oclif's native development mode. Production uses the
compiled app and plugin manifests. The app resolves its pinned Grit executable
from its own dependency closure, and the TypeBox-admitted command timeout is an
explicit Nx runtime input. Until installed acceptance and consumer cutover,
the candidate app remains outside Bun's workspace set while Nx owns its source
project. The root therefore keeps the exact released Civ7 `@habitat/cli` as
merge checker without creating a package alias or a second CLI identity.
Build-only root dependencies expose the candidate's already-owned internal
packages to its Nx tasks and leave the packed manifest on ordinary versions.
The first-release cutover admits the app to the Bun workspace and deletes that
temporary build wiring atomically.

The source checkpoint passed app typecheck, build, Oclif manifest generation,
the six-test Oclif/Nx/provider/configuration boundary suite, repository Biome,
the then-current repository Habitat check, and diff hygiene. Installed tarball
acceptance, the Habitat Nx release group, and task completion were still open
at that checkpoint. The successor below closed those package-construction
gates; later settlement sections close registry release and consumer cutover.

### Habitat Installed Artifact Checkpoint

Task 5.7e22b3 now closes through three semantic package checkpoints:

- `883cdaef` emits ordinary public TypeBox and Habitat resource artifacts;
- `45eebd1a` emits the portable `@habitat-ai/service/client` declaration and
  runtime surface; and
- `025869eb` defines the fixed Habitat release group and proves its installed
  Oclif and Nx behavior.

The release closure is exactly `@habitat-ai/cli`, `@habitat-ai/plugin-cli`, the two
Habitat resources, `@habitat-ai/service`, and the independently versioned
`@habitat-ai/typebox-adapter`. The acceptance packs those six ordinary package
tarballs, installs them as real package directories without workspace links,
typechecks every Habitat-owned public declaration under strict NodeNext,
imports every public runtime entry, discovers the installed Oclif commands,
executes `habitat --help`, `resolve`, and `check`, then registers the installed
Nx plugin in a separate fixture and executes its inferred application target.
The app contains no controller, selector, release store, or private installer.

Nx Release keeps the TypeBox adapter and Habitat as independently selected
groups. Build, manifests, and installed acceptance run before publication;
each publication command uses an explicit `--groups` selection. Nx 23 excludes
task dependencies for a scoped publication, and the real Habitat dry-run
executed exactly its five package publishers without invoking the adapter
publisher. The graph-only view includes dependency targets that scoped
execution intentionally excludes, so it is not publication proof.

At this pre-publication checkpoint, the repository still consumed the pinned
Civ7 Habitat artifact at Nx graph bootstrap. That pin was a
compiler-bootstrap input, not a second Habitat product identity. The
authenticated npm session identified `mateicanavra` as an accepted
`habitat-ai` owner. The user confirmed that Template does not own the `rawr`
npm organization, so the shared adapter joined the same public substrate as
`@habitat-ai/typebox-adapter`. There was no predecessor alias, compatibility
package, or dual release. The later
  [[README#Habitat Registry Settlement|registry settlement]] closed task 5.7e22e,
  and [[README#Habitat Consumer Cutover|consumer cutover]] closed task 5.7e22f.

The separate `rawr-cli` release group remains outside this Habitat release.
Its RAWR-specific public-configured packages require an independently owned
product namespace before publication; this checkpoint neither publishes nor
bulk-renames them. Private RAWR workspace coordinates are not registry
identities and remain unchanged.
See [[tasks#5. Bounded Agent-Plugin Lifecycle Service|tasks 5.7e22e and 5.7e22f]].

### Habitat Registry Settlement

Task 5.7e22e settled from canonical Template commit
`2898d4f8e1d4ebf35ee92f61c64eed2639d90369`, tree
`2e7b34e2175b7ce7a9c5177c5beab5d3251beddd`. Nx published the explicit groups
in the accepted order: `typebox-adapter`, `habitat-cli`, then
`habitat-blueprints`. The three annotated release tags all peel to that exact
commit:

- `typebox-adapter-v0.1.0`;
- `habitat-cli-v0.2.0`; and
- `habitat-blueprints-v0.2.0`.

The public registry release contains exactly seven artifacts. Their npm
tarball SHA-1 values are:

- `@habitat-ai/typebox-adapter@0.1.0` —
  `fedabc24f3648b310ba0f8557479c72a0cf3884b`;
- `@habitat-ai/resource-rule-evaluation@0.2.0` —
  `661f2bc91ff611b960716351ba5c617b3d293825`;
- `@habitat-ai/resource-source-inventory@0.2.0` —
  `729ea4872a140d110ed5071e850a862cc4d524e4`;
- `@habitat-ai/service@0.2.0` —
  `de0d1ebb1b5e5e7761fec8ad072996cd6e269b6f`;
- `@habitat-ai/plugin-cli@0.2.0` —
  `84e4ffcd47de9461994824969523002f6a9b0ecb`;
- `@habitat-ai/cli@0.2.0` —
  `3e751d69c06b052808a9a98971a16eb7af6c52b7`; and
- `@habitat-ai/blueprints@0.2.0` —
  `698133fbbb8ed9bbac141282d0abfbf248912080`.

Registry manifests resolve every Habitat workspace dependency to an exact
published version and contain no `workspace:` protocol. Direct tarball
verification reproduced all seven publish hashes and the accepted file counts.
A fresh Nx 23.1.0 workspace then installed `@habitat-ai/cli@0.2.0` through
native `nx add`, acquired the complete seven-package closure, discovered the
four Oclif commands, registered `@habitat-ai/cli/nx-plugin`, installed only the
named Habitat Stop hook, passed a frozen reinstall, and produced byte-identical
`package.json`, `nx.json`, and `.codex/hooks.json` on a repeated initializer.
The disposable consumer locally exempted only these exact packages from the
operator's three-day Bun minimum-release-age policy; the release did not weaken
that machine-global supply-chain gate.

The bootstrap publication used the accepted `mateicanavra` npm identity and a
single write OTP. That interaction is first-release setup, not the steady-state
release process. Task 5.7e22e1 now owns the bounded replacement: one native Nx
GitHub Actions workflow using npm trusted publishing and no stored write token.

### Habitat Trusted Publishing Settlement

Canonical Template merge `37c8eb2a` (PR #751) installed the tag-triggered
`Publish Habitat` workflow. Canonical merge `2064a431` (PR #752) then versioned
the first trusted-published release set and selected npm as Nx Release's hosted
publisher without changing the repository's Bun package-manager authority.
Candidate `57a78705` passed prerequisite Repository Ratchet run `30730569887`,
job `91450116475`, before Graphite landed the release. The three annotated tags
all peel to `2064a431032ac0600e805ddafba6fd17a6b7deb4` and settled in the
accepted order:

- `typebox-adapter-v0.1.1` — run `30730782469`, job `91450723011`;
- `habitat-cli-v0.2.1` — run `30730814965`, job `91450811883`; and
- `habitat-blueprints-v0.2.1` — run `30730880516`, job `91450987246`.

Each run admitted the tagged canonical-main commit, matched one tag to one Nx
release group, and left every other publisher step skipped. The CLI run also
passed the installed-package acceptance before publication. npm reports the
same Git head for all seven artifacts, a SLSA v1 provenance attestation for
each artifact, and these tarball SHA-1 values:

- `@habitat-ai/typebox-adapter@0.1.1` —
  `df512eb5130b062d179b7440616a50d77cd38eb2`;
- `@habitat-ai/resource-rule-evaluation@0.2.1` —
  `222af7dc1b2e720f27e087963cd98459b0c3d3eb`;
- `@habitat-ai/resource-source-inventory@0.2.1` —
  `5a29fcc1f8e3688dca27fa7d4edd1f5d99aacd0a`;
- `@habitat-ai/service@0.2.1` —
  `8b634ed539f143f2f8dee321333cc3493ea65f70`;
- `@habitat-ai/plugin-cli@0.2.1` —
  `c3745a513f301cfdfe620b2a342e630001acf42e`;
- `@habitat-ai/cli@0.2.1` —
  `c9aaf4b35c1b61a37a32060b7dd0b5add16167a5`; and
- `@habitat-ai/blueprints@0.2.1` —
  `50bab41e0a34b745a8d860545de4ac3090fd8b93`.

The successful hosted publications prove all seven package bindings to the one
repository workflow. Steady-state publication requires neither a stored npm
write token nor an interactive OTP. Task 5.7e22f remains the separate consumer
cutover; this settlement changes no consumer repository and creates no Habitat
release wrapper, selector, or retained local release state.

### Proportional Nx Repository Gate

Canonical Template merge `d4c1f8a2` (PR #733) makes the protected pull-request
check use the exact Nx affected graph for GitHub's checked-out merge candidate.
`NX_BASE` is the pull request base SHA and `NX_HEAD` is `github.sha`; the stable
required context remains `Required lint, typecheck, and topology`. Merge-queue
candidates, when used, and pushes to `main` retain the full `bun run ci` graph.

Graph-only proof selected four Habitat tasks for a documentation change, 91
tasks for one lifecycle-service source change including its real prerequisites
and dependents, and the complete 198-task graph for repository scheduler
configuration. Required PR run `30682277467` passed in 1m37s, and canonical-main
full run `30682357885` passed in 1m49s. The checkpoint adds no Nx Cloud service,
distributed runner, package transport, or custom selector. Bun lockfile changes
remain conservatively broad while root toolchain inputs require that breadth;
the ineffective dependency-update tuning knob was not retained.

### Habitat Consumer Initializer

Canonical Template merge `11c83f08` (PR #737) closes task 5.7e22c through the
ordinary Nx plugin installation path:
the npm registry carries the versioned `@habitat-ai/cli` package, and
`nx add @habitat-ai/cli@<exact-version>` discovers and runs its native `init`
generator. Nx owns consumer activation and graph projection; the package adds
no installer, downloader, release selector, or retained consumer state.

The initializer plans every admission before its first Nx `Tree` write. It
registers the fixed `@habitat-ai/cli/nx-plugin` face, replaces the repository's
exact unmarked predecessor Stop hook with one marked package-owned
contribution, and admits the exact Grit dependency already carried by the app.
Duplicate or incompatible owned entries refuse without a partial write. A
converged repeat performs no write, while `remove-hook` removes only the named
hook and leaves Nx registration plus unrelated consumer configuration intact.

Nx 23 loads generator factories synchronously, so the type-module app emits
two qualified CommonJS generator entries while retaining its ESM runtime and
Nx-plugin faces. Installed-package acceptance packs the ordinary release
closure, installs and initializes it through native `nx add`, discovers both
generators, initializes twice with byte-stable
Nx, hook, and package documents, executes the installed pinned Grit command and
an inferred target, runs the emitted hook from below the repository root,
removes the hook twice, and preserves the installed Nx face. Focused
TypeScript, 17 Nx-plugin behavior tests, three
installed-package acceptance tests, and the complete repository check are
green. Required `Repository Ratchet` run `30685033753` passed on the exact PR
head before Graphite landed the checkpoint. No package was published and no
consumer repository was changed.

### Habitat Version-Two Service Execution Checkpoint

Canonical Template merge `0107f908` (PR #748) closes the service-execution
child [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e22f1]] without
closing the consumer cutover. Candidate `b9d637f8` passed required Repository
Ratchet run `30719253578`, job `91420154104`, before Graphite landed it.

The catalog admits the repository's 33 unique retained version-two rules across
six owners. One `catalog.check` operation now executes admitted compatibility
Grit checks and native schema-version-one structure rules through the same
provider-neutral resource and Habitat policy paths used by version-three
applications. Compatibility reports remain locked and instance-free; exact
owner, rule, and runner selectors cannot cross the version-two/version-three
identity boundary. Exact subject coverage, empty baselines, hidden literal
paths, nested dependency exclusion, and acquisition or subject symlink refusal
are behavioral contracts rather than a second checker or transitional runtime.

The service suite passed 60 cases: 28 catalog-resolution cases, including the
complete six-owner/33-rule admission oracle, and 32 check cases covering the
representative Grit and structure execution paths. The service test target now
declares the complete `.habitat` authority corpus as an Nx cache input. At this
child checkpoint, native version-two Nx target projection, released initializer
application, predecessor-chain deletion, byte-stable repeat initialization, and
repeated parallel native policy proof remained open; the later
[[README#Habitat Consumer Cutover|consumer cutover]] closes them.

### Habitat Blueprint Pack Admission

Canonical Template merges `d898aaa5` (PR #739), `7ba8fb7d` (PR #740), and
`5de49c16` (PR #741) close task 5.7e22d. The first
`@habitat-ai/blueprints@0.2.0` candidate is an ordinary data-only package with
exactly `LICENSE`, `README.md`, `habitat-pack.json`, and `package.json`. Its
protocol-one manifest admits an empty member set, exports no runtime, contains
no executable code, and does not precommit a later blueprint corpus.

The Habitat app selects one exact policy-pack package from the consumer
workspace. The service admits its package metadata and manifest through
TypeBox-owned schemas and Effect filesystem access, requires package identity
and protocol agreement, rejects malformed or nonempty candidates, and has no
fallback pack. The CLI and Nx faces receive that same app-owned selection.

Nx owns release orchestration through separate `habitat-cli` and
`habitat-blueprints` release groups. Installed acceptance is an explicit gate
before publication. The proof invokes it explicitly before native release
dry-runs because scoped Nx publication deliberately excludes ordinary target
dependencies. Those dry-runs selected exactly the five executable Habitat
publishers and the one policy-pack publisher in their respective groups.

The five directly changed projects passed their uncached `check` targets. The
service, CLI app, CLI plugin, Nx plugin, and complete installed package suites
passed 54, 6, 4, 17, and 4 cases respectively. Strict OpenSpec validation
passed, and the packed policy artifact contained exactly the four declared
files. Required `Repository Ratchet` runs `30689258768` and `30689342081`
passed on the exact implementation and record candidates before Graphite
landed them. Registry publication and registry-installed consumer proof later
closed under task 5.7e22e; the Template bootstrap cutover then closed under
[[README#Habitat Consumer Cutover|task 5.7e22f]].

### Habitat Release Transport Decision

Nx owns the Habitat release lifecycle inside this workspace: it selects the
fixed package groups, runs their owned gates, and invokes their ordinary npm
publishers. npm carries those versioned packages across repository boundaries,
and a consuming Nx workspace activates the released plugin through `nx add`.
Neither tool is replaced or wrapped by a Habitat-specific distributor.

The first Template release therefore remains one conventional Oclif and Nx
package set requiring installed Bun. It does not add a separately compiled
native executable. Such an artifact would be another distribution form, not
the missing transport for Nx consumers, and can be evaluated later only after
proving the same Oclif command discovery and Nx plugin behavior without
creating a second Habitat identity.

The first package versions are already present in reviewed source, so the
publication operation does not run a no-op version rewrite. After all three Nx
release groups publish and registry inspection verifies their exact versions,
integrities, and file inventories, the ordinary annotated release tags
`typebox-adapter-v0.1.0`, `habitat-cli-v0.2.0`, and
`habitat-blueprints-v0.2.0` point to that same canonical-main commit. Those
tags and the registry metadata bind source provenance; they do not create a
second installer, channel, version selector, or retained local release state.

### Habitat Consumer Cutover

Template PR #758 landed the released Habitat consumer on canonical `main` at
`b040e316d7089890d4e59c52af93ea2f9a4b08cc`, closing
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7e22f]]. The workspace
now acquires exact registry releases `@habitat-ai/cli@0.2.3` and
`@habitat-ai/blueprints@0.2.1`; explicit `workspace:*` edges continue to select
local source only where one Template producer consumes another. The installed
CLI supplies the Oclif entrypoint, Nx plugin, initializer, hook contribution,
and one registry-resolved dependency closure without a copied executable,
consumer-owned checker, or second distribution identity.

The cutover removes the Civ7 tarball pin, manual Nx policy target chain,
explicit CI Grit acquisition, and copied hook locator. Nx now infers exactly 33
locked rule targets across the six declared owners. Two initializer runs were
byte-stable; two uncached parallel policy passes completed in 26.5s and 22.2s;
installed Oclif/Nx acceptance and a clean-checkout registry-closure check were
green. Required PR run `30733763031`, job `91458544658`, passed on candidate
`f821148757659273aee85f7de1aca8e1b9e06fa0`. Canonical-main run
`30734030390`, job `91459296678`, then passed the complete repository gate on
the landed merge from a cold Nx cache. The unchanged follow-up record candidate
passed the affected gate in 50 seconds on run `30734381904`, job `91460326705`,
so the cold full-run duration does not establish a steady-state CI defect or
reopen the settled package boundary.

### Habitat 0.2.4 Release Settlement

Template PR #763 landed the steady-state publication correction at
`6ea15e2e22f798471a2910ebdcf873c3451efe3e`: committed Habitat producers keep
their ordinary `workspace:*` edges, while the tag workflow asks Nx to
materialize exact versions only in its ephemeral publish manifests and then
uses npm 12 for trusted OIDC publication. PR #762 landed the fixed five-package
`0.2.4` cohort at `6b48478026fddf5b822728e74dbd30201f1e708b`.

Annotated tag `habitat-cli-v0.2.4` points to that canonical source commit.
Publish run `30737904634`, job `91469948417`, passed installed Oclif and Nx
acceptance before publishing `@habitat-ai/cli`, `@habitat-ai/plugin-cli`,
`@habitat-ai/resource-rule-evaluation`,
`@habitat-ai/resource-source-inventory`, and `@habitat-ai/service`. Registry
metadata gives every package the same `gitHead`, exact internal `0.2.4`
dependencies, integrity, and SLSA provenance. The consumer still installs one
CLI package; npm resolves its ordinary package closure.

Template PR #764 then advanced only the external CLI dependency and registry
lock entries. Canonical `main` at
`1b86282c61c8e222a3d424fcd33031ebc4ec6e90` resolves the installed CLI from
`node_modules/.bun/@habitat-ai+cli@0.2.4...`, not `apps/habitat`; the installed
entrypoint reports `@habitat-ai/cli/0.2.4` and passed a real
`require_repository_script_topology` evaluation. The five owner checks passed
uncached in 19.1 seconds, installed-package acceptance passed four cases, and
required candidate run `30738229951` plus canonical-main run `30738486466`
were green. This settlement adds no bundle, release selector, retained local
version store, or second Habitat identity.

## RAWR Registry Namespace Checkpoint

The historical candidate moved the fixed eighteen-package RAWR release group from
the unowned `@rawr` namespace into `@habitat-ai`. The installed application is
`@habitat-ai/rawr`; its four built-in command packages are
`@habitat-ai/rawr-plugin-*`; and the remaining services, resources, and support
packages retain ordinary package identities under the
`@habitat-ai/rawr-*` prefix. Package names, Nx project identities, TypeScript
paths, Oclif composition, workspace dependencies, and live operator guidance
move together. Historical evidence keeps the names it actually observed.

This checkpoint deliberately retains the existing eighteen-package Nx release
group. Workspace dependencies are links, not a bundling mechanism. A disposable
`bundleDependencies` probe against the Bun-linked workspace packed 63.5 MB,
expanded to 525 MB, and contained 68,774 entries, including source, tests, and
external `.bun` paths. That application-image shape is rejected. Collapsing the
thirteen internal libraries into the CLI and four Oclif command packages would
require a separate compiled-output change with its own installed-package proof;
no bundler or private package manager enters this namespace checkpoint.

The candidate builds the complete RAWR application closure in 26.1 seconds,
typechecks its 18 release projects and dependencies in 37.1 seconds, and passes
the 16 available release-project test targets plus dependencies in 1 minute 1
second. The namespace-native Habitat rule for Oclif command packages and the
repository Biome check also pass. The uncached installed-package gate then
packed the exact eighteen-package group, installed it without workspace links,
and passed both acceptance cases plus the 46-command first-party inventory in 1
minute 6 seconds. These are pre-landing candidate results: no RAWR package has
been published, no release tag has been created, and no native provider state
has been changed.

## RAWR Registry Release Substrate

> [!CAUTION]
> This section records a rejected release premise. It is historical evidence,
> not current authority. Publishing the RAWR workspace graph was a categorical
> scope error.

Template PR #775 landed the existing fixed `rawr-cli` Nx group as an
ordinary npm release cohort. It adds one `rawr-cli-v{version}` tag pattern to Nx,
qualified repository metadata and bounded file inventories to the eighteen
package manifests, and one new tag branch in the already-proven
`publish-habitat.yml` workflow. The workflow lets Nx materialize workspace
protocols, runs the installed Oclif and native-extension acceptances, and uses
npm trusted publishing for the selected group. It adds no release wrapper,
bundler, application image, local version selector, retained artifact store, or
second package graph.

This is intentionally eighteen published implementation packages but one
consumer installation: operators install `@habitat-ai/rawr`, and npm resolves
the other seventeen through ordinary dependency metadata. Workspace links do
not bundle package bytes; the rejected single-package probe instead captured a
large linked dependency tree and recreated the private application-image model.
Candidate `e98da179e97b62136c02cd8c54be1794150749b7` passed the required
Repository Ratchet on run `30745429578`, attempt 2, before Graphite landed merge
`e78e5765302363aa632e9a213863114d2b430ef5`. Canonical-main run
`30745934424` then passed the complete repository gate at that exact merge.
That rejected candidate cohort was never completely published. Only
`@habitat-ai/rawr-hq-sdk@0.1.0` escaped to the registry; task 3.7a records its
retraction and the repository's absence of a replacement release path.

## Public Distribution Correction

The public product boundary is Habitat, not the RAWR implementation graph.
`@habitat-ai/rawr` and all `@habitat-ai/rawr-*` projects are private workspace
identities. They are absent from Nx Release and from the tag-triggered publish
workflow. The sole escaped package from the rejected eighteen-name candidate
cohort has been retracted. All eighteen names return `404`; the repository
contains no RAWR release group, publication workflow, replacement version,
compatibility package, or alias.

Habitat now converges on two ordinary artifacts: one runtime SDK containing the
TypeBox bridge, blueprint catalog, and runtime capabilities, plus one Oclif CLI
that consumes the SDK and exposes the Nx initializer. Consumers install through
one Nx command. Internal services, resources, plugins, and packages remain
visible to the workspace graph without becoming public products.

### Historical Habitat SDK And CLI Candidate Proof

The candidate starts from canonical Template `main` at `1d0734dc`. Commit
`e4a47451` collapses the public product boundary into `@habitat-ai/sdk` and
`@habitat-ai/cli`; commit `c5206e64` admits the vendor cohort recorded above;
commit `b41f91b6` versions both products at `0.4.0`; and commit `4b27be5d`
binds the supported runtime cohort into packed-consumer acceptance.

The fixed `habitat-cli` Nx release group contains exactly those two projects.
Only their manifests are public, and the CLI's only `@habitat-ai/*` dependency
is the same-version SDK. Internal services, resources, plugins, adapters, and
RAWR projects remain private. The release contains no controller, custom
installer, retained release store, selector, or implementation-package cohort.

The candidate passed the uncached 45-project TypeScript graph in 67 seconds,
37 Habitat CLI tests, 47 server tests, and the installed two-tarball Oclif/Nx
acceptance. An Nx publication dry-run selected and packed only the SDK (115
files, 0.41 MB) and CLI (31 files, 45.79 KB). Because this workspace has one
release group, the tag workflow invokes Nx publication without a group filter;
that preserves both inferred publish targets' build, manifest, and installed
acceptance predecessors instead of pruning them during task selection. At this
candidate checkpoint, registry release, exact-version `nx add`, and
canonical-main CI remained open.

The authenticated bootstrap subsequently established the SDK package, bound
the GitHub Actions publisher, and advanced the same two-package group to
`0.4.1`. The exact registry-installed `nx add` path and canonical-main CI are
green. The bootstrap selected no package outside Nx and created no second
publisher, release group, or installation surface.

### Habitat Husky Activation Candidate

Task 5.7e22i extends the existing native `@habitat-ai/cli:init` generator rather
than adding another installer. The candidate installs exact Husky `9.1.7` as a
direct consumer development dependency, uses the vendor's ordinary
`prepare = husky` lifecycle, and invokes bare Husky after dependency installation
so the local dispatcher and `core.hooksPath` converge even when package scripts
are disabled. A consumer without a `check` command receives the normalized Nx
default `nx run-many -t check`; an existing nonempty command remains the
repository's scheduler authority. npm, pnpm, and Bun use Husky's supported
`prepare` lifecycle; Yarn refuses before any initializer write rather than
silently receiving a lifecycle it does not execute.

The initializer supplies `.husky/pre-push` only when that event has no tracked
consumer policy. The default clears Git's documented repository-local
environment before delegating to `bun run check`; it does not read or write Git
identity. Existing nonempty hooks remain consumer-owned. Exact predecessor
prepare scripts may be replaced, while incompatible Husky versions or
dependency placement, prepare, or empty hook state refuses before the first Nx
`Tree` write. The source implementation landed on canonical Template `main` as
`b3d3255b5e3fd9558f0f2e836bcc2faca74d1bb4` through PR #812. This checkpoint
advances the fixed `@habitat-ai/sdk` and `@habitat-ai/cli` Nx release group to
`0.4.2`. The canonical `habitat-cli-v0.4.2` tag workflow is green in run
`30982694580`: Linux and Windows installed-package acceptance, repeat-safe OIDC
Nx publication, and a fresh registry-installed `nx add` consumer all passed.
`@habitat-ai/cli@0.4.2` and its exact SDK dependency are now the registry
authority. Template consumes that release directly and uses Husky for its three
repository-owned events; Personal and Magic Migration remain independent
consumer checkpoints.

The source candidate passes 47 Habitat CLI behavior tests, the installed
two-package `nx add` acceptance, the 18-task owner check, TypeScript, Biome, and
strict OpenSpec validation. Installed acceptance verifies exact local Husky and
lockfile resolution, ignored-dispatcher and `core.hooksPath` repair on a
byte-stable repeat, Windows-faithful `git hook run` execution, inherited
absolute-`GIT_DIR` isolation, unchanged outer repository identity, and
consumer-hook preservation. Template's cutover additionally preserves its
remote guard, main-branch dependency refresh, and exact public Nx check while
deleting the predecessor hook installer and script root. Architecture,
TypeScript/structural, and
behavior-first test reviews report no P0 or P1 findings. The landed source
candidate also passed the required remote repository ratchet and installed
package acceptance on Ubuntu and Windows.

The Template consumer cutover passes the focused closed hook/script topology,
shell syntax, repeated byte-stable initializer, native Husky dispatch and
non-origin refusal, strict OpenSpec validation, and the complete 46-project Nx
check graph. Independent architecture/Nx, behavior-first testing, and
structural/code-quality reviews found no remaining P0 or P1 issue.

## Lifecycle Model Topology Closure

Task 5.2 is complete. Every one of the lifecycle service's thirteen present
root or module model kinds now exposes its required `index.ts` import face over
direct semantic leaves. The model root still has no aggregate barrel, and no
empty `entities` or `errors` category was introduced. The byte-equality policy
moved byte-for-byte from the invalid `helpers` kind into the existing
service-root `policy` kind; all nine consumers now name that single qualified
owner without an alias or compatibility path.

Independent architecture and structural reviews found no remaining root versus
module ownership violation in this task's scope, no sibling-module production
import, and no second byte-equality owner. The workspace lint passed, lifecycle
typecheck passed with its test contract check, and the focused canonical
encoding suite passed eight cases. The staged
`require_service_spine_topology` packet produced zero lifecycle diagnostics
when evaluated through Habitat's native structure policy against the live
Git-visible tree. At that checkpoint the packet remained staged; canonical
commit `23c8b1841` later activated the complete zero-red service-law set.

## Lifecycle Native Context Funnel Closure

Task 5.2b is complete without a production source change. `base.ts` declares
the five service context lanes and owns the sole native
`os.$context<Context>()` middleware author. `impl.ts` owns the sole
`implement(contract).$context<Context>()`, the official Effect-oRPC extension,
the unconfigured `impl`, and the root-configured `service`. Each of the five
modules descends from its exact `service.<module>` branch and terminally curates
the smallest handler vocabulary in `module.ts`; the root router composes the
completed module routers through the unconfigured implementer.

The installed vendor lane is `@orpc/*@2.0.0-beta.23` with
`effect@4.0.0-beta.101`. Its native context merge is additive and right-biased,
so module curation seals the operation authoring vocabulary without claiming
that inherited runtime lanes disappear. A categorical source audit found no
router leaf reopening the five broad lanes, sibling-module import, module use
of the raw base or root middleware, or alternate runtime authority. The one
service-base type import of the host-bound Vendors clock port remains the
explicit type-only isolation exception established by task 5.7e21l.

The focused service-spine and Effect-oRPC admission suites passed two files and
four tests. They prove five-module composition, curated provider-resource flow,
exactly-once root observability around an Effect procedure, exact-vendor
execution, and TypeBox request/result validation. The subsequent complete
service-corpus burn-down moved all six construction laws into the enforced
candidate with empty baselines and zero findings. Canonical Template
`093334ff22f47ce864e15b87dd6ca01b1ba0fb0b` closes required admission,
standing review, and landing.

## TypeBox Publication Closure

Three semantic checkpoints separate public structure from runtime policy
without changing lifecycle behavior. Habitat catalog checkpoint `01d778e17`
publishes draft-2020-12 arrays and leaves glob and uniqueness decisions in
Catalog policy. Lifecycle core checkpoint `595fc3403` makes service-root wire
schemas projectable while retaining a policy-derived, byte-precise local client.
Lifecycle module checkpoint `6a3e46024` applies the same ownership to Packaging,
Providers, Governance, and Releases.

The accompanying Habitat rule split keeps native oRPC contract construction and
public error authority in `require_service_contract_authority`. The new
`require_service_schema_publication` law owns the projectable TypeBox authoring
surface for service and embedded-API contracts, DTOs, error data, and entities.
Runtime and cross-field semantics remain in model policy or procedure authorship. Exact
Habitat rules, real Grit finding counts, Catalog compatibility, 430 Lifecycle
tests, the uncached CLI consumer check, TypeScript checks, Biome, and diff
hygiene pass. No scanner, custom runner, schema facade, or additional state
owner was introduced.

## Native Error Closure

The complete repository gate then exposed five Lifecycle branches that still
constructed `ORPCError` directly and one overloaded client implementation without
its own declaration-site documentation. Checkpoint
`01fae1f0e60c6ba3960f88825394e4afd530760f` declares each `BAD_REQUEST` at its
owning Packaging or Provider contract and raises the injected native constructor
from the Effect procedure. It adds no error adapter, shared map, dispatch portal,
or middleware authority.

The exact native-error, contract-authority, schema-publication, and JSDoc Habitat
rules pass. The uncached Lifecycle graph passes source and test typechecks plus 432
behavior cases, including existing BAD_REQUEST code and message observations.

## Settlement Oracles

The current acceptance candidate makes the private application's `rawr` Nx
target an explicit `nx:run-commands` boundary with native argument forwarding.
This is required because Nx's inferred `nx:run-script` target expands an inline
JSON flag into multiple arguments. The explicit target preserves this
candidate's canonical current-main body as one Oclif flag without adding a
wrapper, file transport, installed RAWR package, or second command path. A real
`current-main-record` invocation through the candidate target returned the
canonical 446-byte v3 record.

The lifecycle settlement must prove:

1. source and Nx-built private `rawr` application expose the same Oclif core
   commands;
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

No compatibility layer connects the retired controller model to the private
application. Exact Nx build and manifest generation plus repository-local
`--version` and `--help` invocation passed before the known live predecessor was
removed. The uncached post-removal `@habitat-ai/rawr:acceptance:oclif` graph
then passed all 25 build/manifest predecessors and its three source/compiled
command-inventory tests in 34.1 seconds.

The bounded operational preimage was
`/Users/mateicanavra/.local/share/rawr/controller`, selected digest
`3e1a8a4cc16640171ef546811eb6c922a6a0c59ac22300b08d9c9c79f2726d5d`,
ten retained releases, 2,360,216 KiB, launcher SHA-256
`1081f70d25fe7f36ff0e22a275088dce3a819d10bd7d60a5cd1d19de13399835`,
and the exact `~/.bun/bin/rawr` symlink. Literal-root, realpath, directory,
parent, release-count, selector-shape, and symlink-target guards passed before
deletion. The alias, controller root, obsolete Habitat SDK release store,
agent-plugin artifact store, provider projection store, target receipt store,
and now-empty RAWR data root are absent. This was one explicit settlement, not
a product scanner or cleanup authority.

A standing review then found the separate legacy Oclif data root
`/Users/mateicanavra/.local/share/@rawr/cli`: 4,664 KiB and 798 entries, with a
root `package.json` identifying `@rawr/cli` and no open file handles. Exact
literal-root, realpath, parent, directory, non-symlink, package-identity,
entry-count, size, and open-file guards passed before bounded deletion. The
root and its now-empty `@rawr` parent are absent. The same checkpoint removed
the active controller-authority specification and synchronized surviving
canonical command, authoring, native-state, private-application, and direct-Oclif
requirements; historical archived specifications remain evidence only.

## Related

- Controlling correction: [[authority-amendment]].
- Service domain frame: [[service-domain-frame]].
- Target architecture and decisions: [[design]].
- Change summary: [[proposal]].
- Active execution: [[tasks]].
