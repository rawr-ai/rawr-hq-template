## Context

C4 began from valid migration evidence: web-plugin membership was split across `rawr plugins web`, persisted repo state, a state API/UI, workspace scanning/filtering, and runtime mount paths, while the mixed scaffold family created several unrelated output species. The lifecycle packet requires those invalid relationships to disappear and authoring capabilities to have qualified owners.

The initial implementation frame made a categorical mistake. It interpreted removal of legacy app-composition authority as a requirement to build a replacement composition engine inside C4. That produced plans for a custom source editor, projection generator, immutable snapshot domain, role materializers, web mount readiness, and live composition status. The user clarified that the old composition system is already being torn down and its successor belongs to the dedicated canonical architecture migration. Completing that mini-runtime would make a temporary second architecture more durable, not advance the core agent-plugin/repository lifecycle outcome.

This correction changes the shape of C4 from "replace and retire" to "retire and defer." The positive product work retained here is three source-only creators needed by repository lifecycle. Everything else is semantic absence and regression preservation.

## Goals

- Make the legacy state-backed web membership/mounting model unreachable.
- Remove its CLI web/scaffold producers without aliases, wrappers, or compatibility readers.
- Remove the superseded C4 replacement runtime work instead of hardening it.
- Retain exactly three qualified source creators for curated agent plugins, official CLI commands, and external CLI extensions.
- Keep each source species under one authority-specific application with deterministic, truthful, idempotent publication.
- Preserve C1/C2/C3 owners and existing unrelated runtime behavior without claiming app-composition completion.

## Non-Goals

- Implementing or completing `defineApp(...)`, SDK derivation, an app compiler, process runtime, adapters, harnesses, `RuntimeCatalog`, or `startApp(...)`.
- App composition show/select/unselect/check commands or source editing.
- App-projection generation.
- Web plugin mounting, mount readiness, role realization, runtime snapshots, live composition observation, or runtime composition status.
- Repairing, migrating, or importing `.rawr/state` membership.
- Agent release/build/package/export/provider/promotion behavior, lifecycle command activation, external Oclif registry mutation, controller activation, or personal runtime code.
- Re-evaluating the protected oRPC/effect-oRPC baseline or the `HF01_PENDING` Inngest lane.

## Decisions

### 1. Retirement does not imply replacement

C4 deletes the active producers and consumers of the legacy membership model. It does not introduce a temporary owner for the same state under a new name. Where removal exposes a missing future composition capability, that absence is recorded as a handoff to the canonical architecture migration rather than filled locally.

Consequences:

- stale `.rawr/state/state.json` is ignored, not read, repaired, migrated, or deleted by a compatibility operation;
- `rawr plugins web ...` and state-driven mounting have no replacement command in C4;
- existing unrelated server/RPC behavior may be preserved for compilation and regression, but it is not evidence of a new C4 runtime architecture;
- no C4 test may require the superseded composition editor, snapshot, mount, or status implementation.

### 2. The canonical architecture migration owns the future runtime

The future composition and realization chain is referenced, not implemented:

`defineApp(...) -> SDK derivation -> compiler -> process runtime -> adapters -> harness -> RuntimeCatalog`

Applications enter that system through `startApp(...)`. The ownership and contracts live in:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

C4 therefore removes or defers its custom AppDefinition parser/editor, `@rawr/hq-sdk/app-composition` domain, app role materializers, web mount loader/readiness, composition observation endpoint, status integration, and app-projection generator. It does not attempt to partially realize the canonical design.

### 3. Legacy membership is removed as one semantic unit

The state service, state API/plugin/client, state-driven UI, server workspace scan/filter/mount path, ID-derived module route, and `rawr plugins web` commands are one invalid relationship even though they span projects. Removing only one layer would leave another producer, consumer, or fallback able to recreate membership.

The semantic-absence oracle covers active source, command discovery, aliases, help, package exports, workspace metadata, tests, architecture inventories, and active documentation. Historical Git provenance needs no compatibility code.

### 4. Artifact creation has exactly three qualified owners

The retained commands are:

| Command | Authority | Output only |
| --- | --- | --- |
| `rawr agent plugins create <id> --content-workspace <path>` | verified personal curated-content workspace | canonical curated agent-plugin source and declarative content inputs |
| `rawr cli command create <topic> <name>` | verified Template controller workspace | official command source, behavior test, and required command metadata |
| `rawr cli extension create <id> --destination <path>` | explicit operator destination | self-contained external Oclif extension source |

There is no C4 `rawr app projection create` command. Projection creation belongs with the canonical app/runtime architecture once its final contract is settled.

### 5. Shared authoring mechanics cannot become a factory

Each creator owns raw argument parsing, identity grammar, repository/destination qualification, templates, and product decisions. Shared code may receive only an already-qualified destination plus a deterministic relative-path/byte plan. It may enforce containment, compare exact bytes, publish with no replacement, and return a closed result.

Shared code cannot accept raw product identity, select a kind, choose a template family, infer repository authority, install/activate output, or import a sibling creator. This prevents a renamed version of the mixed scaffold factory.

### 6. Source creation is inert and truthful

Each creator computes the complete ordered plan before writing. Divergent collisions reject the whole plan before mutation. Exact-existing files return converged with zero writes and no metadata churn. Dry run returns the same plan with zero writes. Publication failure reports either an empty newly-published subset or the exact nonempty ordered subset completed by this invocation; it never claims the artifact complete.

Creation cannot build, package, export, synchronize, install, enable, select, mount, restart, promote, or change the next controller invocation. Output availability remains governed by the owning later lifecycle.

### 7. Repository separation is structural

Template contains every generic creator and verifier implementation. Personal is only an explicit content-workspace locator for the agent-plugin creator. Verification may inspect Git/repository identity through a versioned interface, but no Template implementation is copied into personal and no merge, ancestry, worktree, runtime path, or tree-equivalence relationship is established.

### 8. C4 hands lifecycle activation to C5

C4 may expose the three source-only create commands after their legacy scaffold equivalents are gone. It does not expose C2/C3 provider or release applications, repurpose `rawr plugins`, or finish the aggregate lifecycle cutover. C5 consumes landed C3 and C4 semantics and activates `rawr agent plugins` while keeping `rawr plugins` external-only.

## Failure Handling

- Wrong repository or destination fails before a write plan is published.
- Invalid identity or path containment fails before filesystem mutation.
- Divergent existing bytes reject the complete plan before the first write.
- First-write failure returns an empty published subset; later failure returns the exact proper prefix newly published by that invocation.
- A legacy state file or command path is never repaired through fallback behavior.
- Missing app/runtime behavior after retirement is deferred to the canonical migration, not handled by a local compatibility owner.
- A regression in surviving unrelated server/RPC behavior is fixed without reintroducing legacy membership or designing the future runtime.

## Migration Plan

1. Remove the superseded C4 composition editor, app-projection creator, snapshot/role realization, web mount/readiness, composition observation, and runtime-status changes.
2. Delete the legacy `rawr plugins web` commands, repo-state membership service, state API/UI/client, workspace scan/filter/mount path, and their positive guards/metadata.
3. Implement and verify the three qualified creators with separate identity/application owners and narrow shared write-plan mechanics.
4. Delete `rawr plugins scaffold`, the mixed factory, obsolete tests/exports/help, and all active routes back to it.
5. Run behavior-first owner suites, semantic-absence gates, command discovery, foreign-directory acceptance, Nx affected proof, strict OpenSpec validation, and all four standing reviews.
6. Land through Graphite, rerun exact post-main proof, archive the truthful record, and drain the branch/worktree.

Rollback during development is source-only because C4 performs no provider, registry, runtime, or lifecycle activation. After landing, rollback is an ordinary Template source revert; stale state remains non-authoritative either way.

## Verification Strategy

- Command ontology proves exactly the three qualified creators and rejects every former web/scaffold ID plus composition/app-projection commands introduced by the superseded draft.
- Semantic absence proves no active repo-state membership, state API/UI/client, workspace scan/filter/mount, ID-derived module route, mixed factory, compatibility importer, or C4 replacement runtime.
- Per-kind behavior tests cover identity, repository/destination qualification, exact planned bytes, collision preflight, dry run, exact-existing convergence, first/later publication failure, retry, and zero adjacent mutation.
- A foreign-directory fixture with isolated HOME/XDG and no Nx/RAWR checkout builds/tests the generated external extension while trapping native Oclif mutation.
- Exact Template and personal Git fixtures prove official-command versus curated-content repository boundaries.
- Existing server/RPC/OpenAPI/Inngest tests are regression evidence only; they must not import or exercise protected candidate bytes.
- Permanent architecture gates inspect only structural contracts: three command/application owners, forbidden cross-kind imports, absence of retired/replacement owners, and repository separation.

## Open Questions

None for C4. Any request for app composition, projection generation, mounting, realization, or runtime status is routed to the canonical architecture migration rather than resolved in this record.
