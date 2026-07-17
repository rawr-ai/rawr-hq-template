## Context

C1 made one installed Template controller authoritative and C2 made curated Git input produce immutable provider-neutral release artifacts, complete sets, deterministic packages/exports, and one controller-owned inverse capsule. The remaining aggregate (`services/agent-config-sync`, `packages/agent-config-sync-node`, and `@rawr/plugin-plugins`) still mixes mutable source scanning, provider rendering, native installation, generic projection, receipts, and undo. It is migration evidence, not an owner to preserve.

C3 starts from clean Template `main` `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2`. Personal packet commit `cc631f60c9254802be647d66662823ae47d5e7db` and project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3` are design provenance only. The superseding personal authority amendment at commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba` (blob `10bb040317d62834806b86b36a3a14f13c539fbc`) requires fully separate repositories: Template owns all executable controller, schema, validator, renderer, and provider logic; personal owns curated content and governed records. An explicit content/record workspace is a read-only Git locator, never code sharing or runtime selection.

The oRPC/effect-oRPC lane is a landed read-only baseline and Inngest remains `HF01_PENDING`. C3 neither re-evaluates nor mutates either lane. Stateful acceptance uses generated fixtures and explicit disposable homes until C7 authorizes operational settlement.

## Goals / Non-Goals

**Goals:**

- Close desired-state parsing before any filesystem, Git, artifact, receipt, capsule, or provider call.
- Bind provider-visible bytes and semantic capability predicates to immutable release artifacts.
- Separate mechanical test evidence from repository-governed acceptance and promotion authority.
- Converge selected native provider homes from live inventory with truthful per-target outcomes, receipt-bounded retirement, and zero-write repeated convergence.
- Extend the existing controller capsule with one provider-owned inverse protocol rather than adding service-local undo state.
- Keep C3 applications inert until C5 activates the complete qualified command tree.

**Non-Goals:**

- Public command files, controller-manifest entries, aliases, or compatibility routing.
- Source-worktree rendering, implicit artifact rebuild, direct standalone-skill fallback, generic export, Cowork provider semantics, Oclif mutation, or app composition.
- Issuing an accepted result, approving policy, mutating personal lifecycle records, or choosing canonical content on a worker's behalf.
- Cross-home coordination, provider-wide uniqueness storage, operation history, PKI, or hostile same-user source/runtime defenses.

## Decisions

### Closed mode algebra precedes ports

One pure parser returns `ProviderDeploymentRequest = TargetedTest | CompleteTest | CanonicalSync`. Targeted mode accepts explicit release artifact refs, selected providers, and explicit disposable homes; it cannot claim set completeness or retire omitted members. Complete mode accepts exactly one complete-set artifact ref, selected providers, explicit disposable homes, and an evaluation profile; it emits mechanical evidence only. Canonical sync accepts only the fixed policy channel, explicit homes, and an explicit read-only content/record Git locator; release, acceptance, projection, or promotion overrides are invalid. Unknown/path-shaped channels and mixed-mode fields reject before dependency construction or calls.

Read-only canonical status and explicit retirement are separate exact request types, not more deployment modes. `CanonicalStatusRequest` contains only the fixed channel, explicit Git locator, and selected targets. `ManagedRetireRequest` contains one curated plugin ID plus one or more explicit targets and can remove only state proven independently by each target's live receipt. Neither accepts release/set/evidence/projection overrides.

Alternative rejected: a shared request with optional flags. It preserves the aggregate's illegal mixed states and makes side-effect ordering unprovable.

### Promotion authority is a separate Template service

`services/agent-plugin-promotion` owns bounded schemas and canonical encodings for `AcceptanceRequest`, immutable mechanical-evidence observations/handles, `AcceptanceEvidence`, promotion attestations, channel policy, and the fixed `current-main` record. It does not generate mechanical evidence. Its consumer-owned `MechanicalEvidenceReader` receives verified immutable observations through the CLI composition adapter. A repository reader obtains governed records only from exact Git commit/tree/blob objects under closed lifecycle paths and returns a governance observation. The validator requires issuer protocol `independent-agent-plugin-acceptance/v1`, exact hosted human approval, complete release-set and projection/capability/adapter-protocol bindings, and a repository-governed accepted outcome. Schema-valid caller bytes or a test result are insufficient.

Promotion compares the exact canonical tracked release-input blob at the accepted source and landed main commits through its own injected read-only Git verifier, decodes it with the pure release package, and compares its verified digest. It does not import or invoke the build service. Equal release-input identity emits an attestation that keeps the original artifact/projection provenance; unequal, dirty, unreachable, wrong-repository, record-only, or content-ahead states are classified without rebuilding. Canonical resolution is one fixed operation over the landed `current-main` record and its transitive governed records.

Alternative rejected: acceptance flags or caller-supplied evidence objects. They let the actor that tests or deploys self-authorize.

### Provider projection is deterministic and artifact-only

`services/agent-provider-deployment` declares a narrow consumer-owned `VerifiedReleaseReader` over snapshot/ref types from the pure `@rawr/agent-plugin-release` package. The CLI composition root adapts C2's sole production artifact reader to that port without creating a provider-to-build service dependency. Architecture gates forbid provider deployment from importing build, export, packaging, promotion, or legacy services. The service renders one canonical `AgentProviderProjection` per provider and complete/targeted member selection. Its digest binds provider identity, renderer protocol, adapter protocol, release/set refs, exact native package files and metadata, visible capability claims, and a semantic capability predicate. Paths, mtimes, provider homes, receipts, and lifecycle records are excluded. A renderer or adapter implementation refactor under unchanged protocols that produces identical canonical bytes retains the digest; any provider-visible or adapter-protocol change requires new acceptance.

Canonical projection bytes materialize below a stable Template runtime projection root keyed only by their verified digest. This is provider-deployment-owned derived state, not release authority: a missing entry is reproduced only from verified immutable artifacts, an existing entry is verified, and a converged repeat writes nothing. Native provider installation never points at a content or implementation worktree.

Codex and Claude adapters implement the same closed target protocol. Provider-specific package layouts and native command/API calls remain behind their adapter. No generic projection fallback exists, and Cowork has no adapter.

Alternative rejected: adapting the legacy aggregate or reading source plugins during deployment. Both create a second release/distribution authority.

### Every selected home owns one live observation and receipt

A `ProviderTarget` is the provider ID plus one canonical explicit home. The adapter exposes capability inspection, live plugin/skill/hook inventory, native mutation, and visible-state verification for only that target. The deployment service canonicalizes and deduplicates targets, then creates an independent plan from the target's live observation and target-scoped receipt.

Receipts are bounded canonical generation/digest records keyed by provider and a digest of canonical home identity below the Template runtime data root when the provider cannot store RAWR metadata natively. Their `scope` is a closed union: targeted-member test scope, complete-test candidate-set scope, or canonical accepted/promoted-set scope. `CompleteTestScope` binds only its target-local request/evaluation identity, set/projection/profile/adapter protocol, visible fingerprint, and verified member identities; it never binds the later cross-target evidence digest and never authorizes absent-member retirement. `CanonicalAcceptedScope` records canonical acceptance, promotion, and channel settlement, but absent-member authority comes only from the currently resolved accepted desired set; any prior same-target receipt scope supplies ownership proof only. A test request encountering canonical receipt scope blocks rather than reclassifying a canonical home. A receipt never substitutes for live reads and never authorizes another home. The workstream phrase "test-home policy only" is resolved under normative proposal section 4.5 as disposable-harness teardown outside provider lifecycle ownership, not receipt-authorized cleanup.

When a mutating plan first selects a target with no identity sidecar, the provider owner includes `AdmitTargetIdentity` as that target's first typed action in the controller capsule candidate. After capsule begin, the action atomically publishes one visible sidecar keyed by provider plus canonical real home identity, binds prior absence and exact post bytes, and completes before native mutation. The sidecar grants export-overlap exclusion only; it is not convergence, receipt, cleanup, or selection authority. Canonical aliases deduplicate to the same target. Ordinary plugin retirement retains admitted sidecars: it does not silently convert a provider home into an export destination, and C3 exposes no home-decommission transition. Exact undo of the first admitting operation may remove only that action-owned sidecar after native state and receipt restore to their prior state. A future general conversion feature is a redesign trigger. The complete known-native-homes snapshot enumerates and verifies every sidecar, fails closed on malformed/unreadable entries, and never infers health or cleanup from them.

Missing live managed state makes a receipt stale. Status reports drift without writing. A mutating sync may plan `NormalizeReceipt` only after live verification, removing only unsupported receipt claims and never provider state. The receipt write is reported as a mutation, carries its prior bytes in the controller capsule, and cannot return `ReadOnlyConverged`; the next identical sync is read-only.

Alternative rejected: an ambient home scan or shared provider registry. It would make one observation or receipt authoritative for targets it did not inspect.

### Marketplace registration is explicit target state

Native marketplace registration is explicit target-global state, not a hidden side effect of per-member install. Inventory observes either absence or one registration state bound to provider, adapter protocol, content identity, effective-member projection digest, and source digest. The target receipt records that exact state alongside each managed member's source projection. A targeted or complete test computes the effective registration as desired members plus receipt-owned omitted members, preserving each omitted claim's prior source projection.

Real Codex and Claude behavior separates same-ID refresh from omitted-member cleanup. A changed enabled release cannot be proven active from fresh catalog or plugin-list metadata: the controller first applies typed `RetireMember` against the old registration and verifies that both native membership and provider configuration residue are absent. It then applies `SetMarketplace(role: transition)` containing the changed desired release plus exact same-target receipt-owned omissions and installs the new release. Only after desired visibility and full transition ownership/catalog verification may it retire exact omitted members, verify their membership/config absence, apply `SetMarketplace(role: final)` for the desired-only set, verify final visibility and managed state, and publish the receipt last. Explicit managed retirement instead verifies the current receipt registration, retires against it, then applies the final narrowed or absent registration. Provider adapters replace marketplace source in place; they do not remove and recreate the marketplace as preparation.

Each marketplace capsule action carries its distinct transition/final role, exact prior registration member table, and exact desired registration. Every install, update, enable, or retire action carries the registration active for that mutation. Reverse replay therefore restores the final registration action, member inverses, and transition registration in exact reverse action order. Desired and preserved member archives materialize new registrations before capsule preflight, while an already-live current registration need not be rematerialized merely to retire from it. Missing or altered inverse bytes still block before capsule admission. An exact repeat performs live reads with zero marketplace materialization or mutation.

The Codex native contract installs a newly added plugin enabled. Fresh deployment therefore emits one install action with an enabled postcondition rather than an install-plus-enable sequence; explicit enable remains only for an already present disabled member or a disabled post-update member.

Alternative rejected: treating each plugin install as an independent marketplace owner. It creates target-global last-writer state, loses omitted-member source authority, and makes crash recovery depend on hidden provider history.

### One plan/apply/verify/retire state machine owns mutation truth

Planning is read-only and emits canonically ordered per-target actions plus planned/blocked/skipped events. Apply refreshes a changed same-ID native member through typed retire, residue verification, source transition, and install; it does not treat catalog metadata as installed-state proof. Provider visibility is verified before a receipt advances. Targeted and complete tests preserve every omitted member; complete tests evaluate and emit mechanical evidence but cannot retire receipt-owned omitted state or make a canonical record claim. Only canonical accepted desired state authorizes absent-member retirement; after the full accepted replacement set is visible, canonical sync may retire exact same-target receipt-owned omissions from any prior receipt scope. The accepted set supplies retirement authority while the receipt supplies ownership proof. Unmanaged state is never adopted or deleted by name, path, or byte equality alone.

A multi-target run completes every read-only plan first. If no admitted mutation exists, it returns before capsule preflight. Otherwise it preflights capsule bounds, begins one controller candidate for the complete mutating plan, and applies targets in canonical order. Actions are staged and observed individually; the receipt write is each target's final action. Failure leaves already verified targets truthful, failed targets unadvanced, and the capsule bound to the exact applied subset. A repeated converged run still inspects capabilities, inventory, visibility, and receipts but invokes no mutation, write, cleanup, rendering publication, capsule preflight/replacement, or receipt update.

After target-local settlement, provider deployment canonically constructs one aggregate `MechanicalProviderEvidence` body over immutable inputs and each selected target's final provider-visible verification facts or failure facts. It binds procedures and results, not applied/skipped transaction history, timestamps, or mutation events, so an exact publication retry after a read-only reinspection has the same digest. The body includes no receipt authority and target receipts never bind its later digest. A consumer-owned `MechanicalEvidencePublisher` sends canonical bytes to the build/artifact owner's immutable evidence adapter under the stable artifact home. Existing exact evidence converges read-only. Publication failure is an explicit aggregate failure after target truth and does not rewrite provider state, receipts, or capsule settlement. Promotion consumes only the resulting verified handle/observation through its own reader port.

Alternative rejected: per-target transactions with aggregate success. They allow later failures to erase or overstate earlier target truth.

### Provider undo remains controller-owned

The provider service supplies one closed owner codec, applying-recovery classifier, exact inverse executor, and prior-state verifier to the existing capsule registry. Inverse actions contain bounded provider-owned prior observations and exact target receipt generations/digests. They may restore or remove only receipt-proven native state and the matching receipt. The provider service stores no independent capsule, operation ID, or history.

Alternative rejected: retaining the legacy service undo module. It creates a second last-operation authority.

### Status is a read-only join, not a registry

Status joins governed channel/promotion facts through a provider-consumer-owned `CanonicalChannelReader` port, artifact/projection availability, target capability/live inventory, and the target receipt at read time. The CLI composition root binds the promotion implementation; the provider package does not import promotion. Status returns exactly one target-local classification: `CONTENT_AHEAD_OF_ACCEPTANCE`, `ACCEPTED_PENDING_CONVERGENCE`, `CONVERGED`, `DRIFTED`, `BLOCKED_COLLISION`, or `INCOMPATIBLE_PROVIDER`. It never repairs records, providers, receipts, Oclif state, or source.

### Activation and migration are delayed atomically to C5

C3 adds no discoverable command file or manifest row. Tests call application factories directly. Legacy aggregate packages remain temporarily for old command compilation but no new C3 owner imports or delegates to them. C5 activates qualified commands and deletes the old command, service, node package, flags, aliases, and semantic residue in one container.

### Module and protocol topology is fixed and acyclic

The two services are siblings over the pure release domain. They never import one another or another stateful lifecycle service.

| Owner/module | Inward dependencies | Curated exports |
| --- | --- | --- |
| provider `domain` | pure release value/snapshot types only | mode parsers, projection/profile/adapter-protocol values, target/receipt/action/outcome/evidence schemas and canonical functions |
| provider `ports` | provider domain types | `VerifiedReleaseReader`, `CanonicalChannelReader`, `MechanicalEvidencePublisher`, target adapter, projection/receipt/sidecar stores, capsule writer/runtime |
| provider `applications` | provider domain and ports | distinct minimal-port `createTargetedTest`, `createCompleteTest`, `createCanonicalSync`, `createCanonicalStatus`, `createManagedRetire`, and provider-owned verified complete-home observation reader factories; no umbrella lifecycle object |
| provider `adapters` | provider domain and ports | explicit `./adapters/codex`, `./adapters/claude`, `./node-state` factories; applications never import them |
| provider `owner-protocol` | provider domain and narrow runtime ports | closed provider codec/recovery/replay registration factory |
| promotion `domain` | pure release values only | acceptance/policy/promotion/channel schemas, digests, and result unions |
| promotion `ports` | promotion domain types | exact Git record/release-input reader, hosted approval reader, immutable mechanical-evidence reader |
| promotion `applications` | promotion domain and ports | governed validation, attestation, fixed-channel resolver factories |
| promotion `adapters` | promotion domain and ports | explicit read-only Git and hosted-governance adapter factories; applications never import them |

The CLI root contains only narrow adapters and factory composition:

- build artifact reader -> provider `VerifiedReleaseReader`;
- build evidence store -> provider `MechanicalEvidencePublisher`;
- build evidence reader plus provider pure evidence verifier -> promotion `MechanicalEvidenceReader` observation;
- promotion fixed-channel resolver -> provider `CanonicalChannelReader`;
- provider complete-home observation reader -> export-owned `KnownNativeHomesReader` snapshot constructor and digest verifier;
- provider owner-protocol registration -> controller capsule registry.

No CLI adapter chooses product policy or sequences lifecycle transitions; each application remains in its owning service. Test, sync, status, and retire entrypoints receive exact minimal port sets even when they share pure parser, planner, or state-machine modules internally. In particular, status construction cannot receive mutation, capsule, evidence-publisher, or state-writer ports. Root package exports expose curated domain values, port types, and distinct application factories only. Node/provider/Git/owner adapters are explicit subpath exports, preventing a public umbrella lifecycle object, broad barrel, or hidden aggregate.

## Risks / Trade-offs

- [Native provider protocols can drift] -> Bind semantic capability profiles, fail closed on missing capabilities, and prove adapters against deterministic fixtures plus disposable-home live acceptance.
- [Partial multi-home mutation can be misreported] -> Persist only verified per-target receipts, expose event phases, and bind one capsule to the exact applied action subset.
- [Provider state can change between inventory and apply] -> Re-inventory and verify action preconditions at mutation boundaries; generation/digest mismatches block rather than infer ownership.
- [Promotion verification could accidentally rebuild] -> The promotion service receives only Git release-input observation and artifact verification ports; artifact publication and provider rendering are absent from its dependency graph.
- [Repository governance cannot be proven by schema alone] -> Require an exact Git-governance observation from the configured locator and policy approver; return `BLOCKED_ACCEPTANCE_AUTHORITY` when it is unavailable.
- [C3 can become another aggregate] -> Keep mode parsing, promotion, deployment, provider adapters, receipt store, and capsule owner protocol as explicit modules with architecture dependency gates and standing reviews.

## Migration Plan

1. Complete and review this strict-valid execution record with C2's exact archive/drain attestation on the C3 branch.
2. Implement closed mode and promotion contracts, then deterministic projections and provider state machines behind internal factories.
3. Add Codex/Claude adapters, target receipt storage, and provider capsule registration; prove fixtures and disposable homes without touching canonical state.
4. Keep legacy callers and public discovery unchanged in C3. C5 switches the complete command surface to C2/C3 and deletes the legacy aggregate atomically.
5. C6 creates personal declarative policy/record instances through installed Template validators. C7 alone performs approved canonical settlement.

Rollback before C5 is repository-only because C3 is inert. After C5, rollback is the C5 semantic-cutover rollback plus the controller-owned provider undo operation for the last applied native mutation; no C3 compatibility path remains.

## Open Questions

None that changes the accepted product boundary. Provider-version fixture details and exact native command encodings are implementation evidence owned by the adapter tests.
