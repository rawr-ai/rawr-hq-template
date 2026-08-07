# Whole-Board Stack Cut Sheet

This cut sheet is the operational companion to [[design]] and [[tasks]]. It
classifies the complete local Graphite board by semantic ownership before any
stack is restacked, merged, transferred, or retired.

## Authority

The board contains 61 non-main branches in ten true Graphite roots. Canonical Habitat `main` at
`7457505fc5dc068c1ff80a06ca78f713ebe3a954` is the semantic ledger. The wide
`gt ls` view is repository-wide fanout, not one nested implementation stack.
Branch names, transient restack commits, PR order, and file similarity do not
decide product ownership.

Each stack receives one disposition:

- **Habitat**: restack onto current `main`, conform to current Habitat law, and
  merge here.
- **Rawr**: make the source lineage coherent, transfer it once to the Rawr
  repository, and retire the Habitat source.
- **Marketplace**: transfer only curated agent-plugin content or governed
  content records, then retire the Habitat source.
- **Retire**: prune merged residue or delete superseded work after its unique
  accepted intent is accounted for.
- **Held**: another live owner controls the worktree; coordinate the recorded
  disposition without mutating that checkout.

## Consumer Gate

Civ7 has installed Habitat `0.5.2` and selected `app@1`, `package@1`,
`plugin@1`, `plugin-nx@1`, `provider@1`, and `resource@1`. Its refusal on the
absent `service@1` member is correct: it neither leaves services ungoverned nor
authors a local generic substitute. Task 2.8 owns the next versioned Habitat
handoff and its installed-consumer evidence.

## Stack Dispositions

| Stack | Semantic destination | Disposition | Landing condition |
|---|---|---|---|
| `codex/classify-habitat-runtime-inventory` | Habitat | Active retained lineage | Land this whole-board cut and the exact project/capability inventory as one small direct child of `main`. |
| `codex/correct-app-runtime-authority` | none | Retire merged residue | PR #882 is already on `main`; allow normal Graphite sync to prune the unoccupied branch. |
| `codex/close-hq-ops-journal-module` | none as a branch | Retire merged residue after the protected local note is accounted for | PR #708 is already on `main`; do not remove its dirty occupied worktree until its owner releases it. |
| `codex/frame-native-platform-telemetry` through `codex/prove-native-telemetry-receipt` | Habitat | Held while occupied, then adopt through the ledger below and retire the complete predecessor root | The provider-neutral resource/provider implementation lands through one qualified Habitat sink. Host integrations are behavior inputs for fresh runtime-owner acceptance, not branches to merge. The receipt tip has another owner's staged work; do not restack, edit, or partition this lineage before handoff. |
| `codex/integrate-habitat-frame-lineage` through `codex/project-habitat-temporal-inquiry` | mixed Habitat/Rawr/repository semantics | Held until the runtime provider-plan checkpoint and the path-level sieve below | Admit only generic temporal resource/provider and opt-in Nx behavior after reshaping process acquisition as a cold app-selected provider plan. Remove the `apps/habitat` reexport/public package surface. Rawr rollout discovery transfers only with a proven product owner; repository-local `post-it.md` attestation is deleted. Do not restack or merge the stack as a unit. |
| `codex/consolidate-research-experiment-sdk` through `codex/reframe-research-experiment-platform` | Rawr | Preserve the accepted service design, transfer once, and retire the obsolete source lineage | This is one two-node Graphite root. Research experimentation is a downstream product capability. The old package-shaped SDK is reference-only source, not an import unit. Re-author the service in Rawr after the canonical TypeBox bridge and runtime-owned provider provisioning are released; do not transfer copied Habitat law, controller code, or stale app changes. |
| `codex/close-research-experiment-design-review` | Rawr | Held as the accepted design tip, then transfer once and retire | This is a separate Graphite root whose clean worktree is the occupied repository primary. Do not edit, restack, release, or infer source authority from that checkout. Transfer only the reviewed design after the owner hands it off and the released Habitat prerequisites exist. |
| `codex/session-intelligence-metrics-openspec` through `codex/session-metrics-orchestration-guidance` | Rawr | Restack to the current session service law, transfer once, retire source | Move with `session-intelligence` and `session-tools`; Codex/Claude transcript discovery, indexing, search, and metrics are downstream product behavior, not Habitat substrate. |
| `fluree-workstream-experiment` through `fluree-ws-port-shape-law` | adoption source; two recorded sinks | Held; do not partition or restack the mixed branches | Apply the exact sink ledger below. Habitat and Rawr each adopt only their path-qualified capability; excluded research remains excluded. Retire the complete source stack only after both adoption sinks land. Temporal inquiry is governed by its separate two-branch stack, not this lineage. |
| `agent-af-authority-freeze-execution-frame` through `codex/spec-toolbox-reference` | Rawr | Transfer unique current product-governance references, then retire | Main PRs #879 and #880 supersede the branch copies of canonical specs. Move only the unique authority-freeze frame and specification-toolbox reference to Rawr; transfer no stale Habitat authority or runtime implementation. |

There is no current Marketplace stack on this board. Marketplace remains an
independent content-only repository and receives no executable, runtime,
telemetry, research, session, or Fluree source from these branches.

## Temporal Inquiry Adoption Ledger

The temporal-inquiry root is mixed at source and runtime-authority boundaries.
Its branches are evidence for these destination-owned units, not merge units:

| Source capability | Destination and status | Admission rule |
|---|---|---|
| Temporal inquiry semantics plus generic Fluree/checkpoint/model/query algorithms | Habitat temporal-inquiry resource/provider candidate; held until runtime provider plans exist | Re-author rather than import the current files. The public contract becomes a `RuntimeResource` whose operations stay in `HabitatEffect`; app/profile input supplies provider config and the cold Fluree plan. App/harness owns process signals. Admit generic algorithms only after removing frame, session, repository, and concrete-provider policy. |
| Opt-in Nx projection and installed-consumer behavior | Habitat Nx/CLI behavior oracle; needs re-authoring | Attach targets only to the manifest's proven existing `ownerProject` and root, keep mutable targets uncached, and invoke the canonical Habitat CLI/runtime vertical. Retain only init/remove/inert-projection/install observations from the seven-package predecessor acceptance; do not retain its package cohort or public runtime/library faces. |
| `apps/habitat` temporal-inquiry reexport and public package surface | no sink | Delete it. The selected resource/provider enters through app composition after the canonical runtime owns selection and acquisition. |
| `session.ts`, `session-resolver.ts`, and their Codex/Claude transcript tests | Rawr session-intelligence candidate; not admitted yet | Compare against the already admitted session-intelligence product at the Rawr owner. Transfer only unique behavior through that owner-local record; otherwise delete it. It never enters the generic resource. |
| `frame-attestation.ts`, `frame.ts`, frame tests, and frame-linked receipt/policy portions of checkpoint/model/query | no source sink | Delete the repository-specific Working Frame Ledger policy. Recreate only independently accepted generic temporal behavior in the Habitat owner; repository notes are not temporal-inquiry platform policy. |
| `.codex/agents/fluree-steward.toml`, `apps/habitat/TEMPORAL_INQUIRY_PROVENANCE.md`, stale lifecycle OpenSpec edits, and root release metadata | no source sink | Preserve source identities only in this cut ledger; do not ship the steward, provenance carrier, stale change edits, or predecessor root wiring. Any future repository agent is authored and reviewed under its own Habitat tooling owner. |

Exact temporal source admission is path- and behavior-qualified:

- From `602b1207a51c`, rewrite the bounded read/write idea from `contract.ts`;
  provider-internal guards from `fluree-client.ts` and `sparql.ts`; process,
  lease, lock, and cleanup behavior from `fluree-process.ts`; generic Git-history
  algorithms from `history.ts` through the released source-inventory resource;
  immutable projection/materialization behavior; and only frame-free
  checkpoint/model/query/hash slices. `definition.ts`, `operation.ts`, `index.ts`,
  package metadata, and their tests are mixed inputs, never transplant units.
- From the same commit, `session.ts`, `session-resolver.ts`, and their session
  tests are Rawr candidates after destination deduplication. `frame.ts`,
  `frame-attestation.ts`, and their tests have no sink.
- From `5fcb3257933`, rewrite inert Nx discovery, containment, and input hashing;
  move idempotent init/remove behavior to the canonical CLI Nx owner; and
  exclude app reexports, provider-private imports, provenance, release/root
  metadata, public runtime assertions, and the seven-package predecessor
  acceptance. The Fluree steward is not admitted by this workstream.

## Telemetry Adoption Ledger

The telemetry branches form one native Graphite root and therefore receive one
root disposition above. Its internal semantic split is expressed only as
destination adoption units:

| Source capability | Destination and status | Admission rule |
|---|---|---|
| Provider-neutral telemetry resource, OpenTelemetry Node provider, vendor admission, and provider conformance through `codex/record-native-telemetry-provider` | Habitat telemetry resource/provider sink; needs adoption | Restack the path-qualified source onto current resource/provider law, remove predecessor app coupling, run the resource/provider behavior targets, and merge the sink as a small Habitat stack. |
| oRPC, Inngest, Oclif, correlation, shutdown, delivery/drop, and receipt behavior after `codex/record-native-telemetry-provider` | Fresh Habitat runtime-harness acceptance; source branches retire after adoption | Preserve the behavior as named acceptance obligations in [[classification-ledger#behavioral-acceptance-matrix]]. Do not merge changes to deleted HQ/server/example owners or copy their host wiring. Re-author each obligation beside its qualified app/process/harness owner once that owner exists. |
| `codex/retire-core-telemetry-singleton` and `codex/record-core-telemetry-retirement` | Habitat core-deletion sink; needs adoption immediately after the qualified provider | Move every surviving reader to the telemetry resource/provider, delete `packages/core/src/telemetry.ts` and its predecessor tests, and replace the Rawr-named retirement rule with qualified owner law. Adopt these exact deletion semantics without merging the obsolete host chain that precedes them. |
| Staged files at `codex/prove-native-telemetry-receipt` | Held by the current writer | No edit, restack, cleanup, or source admission occurs until the writer returns an exact clean handoff. |

## Fluree Adoption Ledger

The Fluree Graphite root is mixed at commit granularity, so its existing
branches are not merge or transfer units. The source remains held until these
finite sink units settle:

| Source capability | Destination and status | Exact source admission |
|---|---|---|
| `resources/semantic-ledger/**` provider-neutral contract, Fluree HTTP provider, and provider conformance | Habitat adoption sink; needs adoption | Admit the path-qualified behavior from `1466ded26`, `517e3db01`, `5aef5d458`, `be005ba63`, `d28639ae8`, `b45ffd14d`, `8d6609319`, `a3717cb89`, `d22796dc1`, `7536cf611`, `cc790fd21`, and the provider portion of `77b6c38e8`. Conform it to current resource/provider law before landing. Retain the memory implementation only as an owner-local conformance fixture. |
| `services/workstream-frame/**` and `plugins/cli/commands/workstream/**` domain behavior | Rawr adoption sink; needs adoption | Admit the path-qualified product behavior from `1466ded26`, `6765c7928`, `517e3db01`, `d28639ae8`, `b45ffd14d`, `a1062c421`, `d22796dc1`, and `cc790fd21`, plus only the final disposition conclusion from `465a2f9ff`. Move the topic to `plugins/cli/topics/workstream`, regenerate project/test metadata, and conform the service to a released Habitat semantic-ledger face and `service@1`. |
| Root `apps/cli/package.json`, `bun.lock`, `vitest.config.ts`, and mixed repository metadata | excluded | Recreate only destination-owned dependency, graph, and test wiring at each sink; do not adopt these source-root edits. |
| `c3afa259a`, `0542e0499`, `4b14d1a7b`, `c37b1162e`, `55e81bb5c`, `6f4a6d56e`, `387728bcf`, and `52648b391` | no direct sink | Regenerate any accepted ontology or SHACL assertion through Habitat's existing Semantica owner from current canonical specifications; import no stale generated/project-path output. |
| `7e464fee0`, `8083fec48`, `e700c1f59`, `d9d257708`, `09f25bffe`, `bf0bfb945`, `73739e2c6`, the non-ledger portion of `465a2f9ff`, `b3ddfc7da`, `a18d6e410`, `83c7fa6ab`, `6c12dd1ce`, `c73a50678`, `a1e160eaa`, the non-provider portion of `77b6c38e8`, `5df41b7c0`, `147b0517a`, `ec9bd1368`, and `56ee3b4e3` | no source sink | Exclude extraction scripts, scenario evidence, temporal scratch, replay, baselines, HTML, upstream issue drafts, and bulk research. An independently accepted assertion may be recreated as an owner-local test. |
| `3229ee800`, `ac5c054cb`, `35d1f450c`, `b0fc0e8d9`, `5790e864c`, and `85d8e0a37` | no sink | Exclude the complete `.fluree-memory`, voice, replay-defect, and patched-binary history. |

No sink uses a mixed commit or branch as authority. The listed commits identify
source behavior for owner review; each destination's landed implementation and
acceptance become its authority.

## Review Record

- The Graphite board census confirmed 61 non-main branches in ten true roots,
  with this classification branch as the sole child of current `main` in its
  own stack.
- Architecture review passed after the two release checkpoints, later Rawr
  adoption order, SDK resource integrations, and specification-toolbox timing
  were made explicit.
- Behavior-first review passed after every retained, moved, adopted, or
  behavior-preserving deletion received an owner-local Nx oracle, observable
  result, and falsifier in [[classification-ledger#behavioral-acceptance-matrix]].
- TypeScript, structural-quality, Nx, and Graphite review passed the ten-owner
  private graph, terminal SDK assembly, three optional integration pairs,
  two-package release group, initial `nx add`, later `nx migrate`, and one
  disposition per Graphite root.

No P0 or P1 remains open on this classification node.

## Execution Order

1. Land this classification node and obtain architecture, TypeScript,
   structural-quality, and behavior-first reviews of the cut.
2. Coordinate the recorded disposition with each occupied lane. Freeze its
   accepted intent; do not edit another owner's worktree.
3. Land the stable Habitat service/schema and CLI contracts required by
   downstream projects and make `service@1` constructible and selected in the
   SDK Habitat pack. Before any registry mutation, run
   `nx run @habitat-ai/cli:acceptance:oclif-installed-package` locally so the
   exact SDK and CLI tarballs are packed, installed in a disposable Nx
   consumer, and exercised through the generated service and installed Oclif
   paths. Only that accepted exact-main revision may release
   `@habitat-ai/sdk` and `@habitat-ai/cli` and then prove registry installation.
   Publish one exact version/commit/policy-pack/acceptance handoff to Civ7 and
   every waiting consumer; no consumer authors a local `service@1` substitute.
4. Restack the Session Metrics lineage onto the current session implementation,
   import the six admitted Rawr service/topic projects through the finite Nx
   migration, and land Rawr without a Habitat source dependency. Later
   research, workstream, and specification-toolbox sources remain outside this
   initial gate.
5. Remove the transferred Rawr source and all other product/dead owners from
   Habitat. Pass exact-main separation before private runtime implementation.
6. Land the generic telemetry resource/provider and exact core-singleton
   retirement without merging obsolete host changes.
7. Build and land the runtime spine one owner at a time. After the provider-plan
   checkpoint, adopt the path-qualified semantic-ledger and temporal-inquiry
   resource/provider behavior, assemble their provider-neutral contracts and
   optional Fluree integrations through the sole SDK package, and remove their
   product/repository-specific source. Re-author the admitted telemetry host
   obligations only after their required runtime checkpoints exist.
8. Release the exact-main final runtime through only `@habitat-ai/sdk` and
   `@habitat-ai/cli`, including installed-package proof for the semantic-ledger
   and temporal-inquiry subpaths, then migrate existing consumers through Nx.
9. In Rawr owner-local changes, adopt the workstream domain against the released
   semantic-ledger face, re-author the accepted research service against the
   released runtime, and transfer the unique current specification-toolbox
   references as non-executable governance guidance. Retire each Habitat source
   root only after destination acceptance; retire the mixed Fluree root only
   after both its Habitat and Rawr sinks have landed.
10. After every
   destination has accepted its source, record the remaining branch allowlist,
   release only clean completed worktrees, retire unsubmitted adopted or
   superseded sources explicitly, then let Graphite prune merged residue in one
   final cleanup.

No step uses repository-wide byte comparison, manual cross-repository ancestry,
or a continuing source synchronization relationship. Git and Graphite retain
ordinary history; the destination repository owns all work after a finite
transfer.
