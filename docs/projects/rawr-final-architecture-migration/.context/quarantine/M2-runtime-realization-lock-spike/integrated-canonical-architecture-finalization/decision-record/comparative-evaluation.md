# Integrated Canonical Architecture Comparative Evaluation

Status: Complete
Recommendation: `accept-version-b-after-bounded-edits`

## Decision

Use **Version B** as the baseline for the restored Integrated Canonical Architecture document, after bounded repairs and selected transplants from Version A.

Version B is not accepted as-is. It has several precise defects that must be repaired before adoption. Those defects are bounded and do not require architecture reopening. Version A is not rejected as low quality; it is the main transplant source for missing architecture anchors. Version A is not the baseline because its repair surface is broader: it carries too much runtime-subsystem detail into the integrated architecture layer and introduces `SurfaceRuntimeAccess` as an architecture-level live access noun.

Migration planning can begin after the bounded edits in the modification packet are applied. No broad resynthesis, candidate averaging, or pre-migration sub-spec extraction is required.

## Candidate Packet

| Label | Path | Lines | Bytes | SHA-256 | Source note |
| --- | --- | ---: | ---: | --- | --- |
| Version A | `/Users/mateicanavra/Downloads/RAWR_Canonical_Architecture_Spec_Alt-X-1.md` | 3060 | 117003 | `b9393162a6eaebb97c2d301120630b1ed45db2d808fb13cf615c89753e0e9388` | Returned integrated architecture candidate; Alt-X numbering is arbitrary. |
| Version B | `/Users/mateicanavra/Downloads/RAWR_Canonical_Architecture_Spec_Alt-X-2.md` | 2838 | 102781 | `2db9f9cd4b5de808df43fbe238403405dfa02f69a0aee26e8f61265e293418d0` | Returned integrated architecture candidate; Alt-X numbering is arbitrary. |

## Authority And Exclusions

Authority order:

1. Original objective: restore the Integrated Canonical Architecture as whole-system plug-and-play authority.
2. `01-integrated-architecture-alignment-authority.md`.
3. `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` for runtime overlap.
4. Prior integrated architecture document under revision as stale-source context and broad-content preservation substrate.
5. Version A and Version B as candidates to accept, repair, mine, or reject.

The Runtime Realization System specification remains binding overlap authority. The alignment authority states that the integrated document remains the canonical plug-and-play architecture layer and that subsystem specs attach to it at explicit boundaries. It also says the integrated document must not copy the full runtime component catalog, TypeScript interfaces, detailed runtime package tree, or all runtime examples.

Excluded as authority: prior agents, raw reports, old alternates, repository zips, current implementation reality, migration docs, chat transcripts, and unprovided cloud memory.

## Evidence Anchor Register

The required repairs and accepted transplants below are anchored to the two candidate documents and the binding overlap authorities.

| Finding | Evidence anchors | Authority implication |
| --- | --- | --- |
| Integrated architecture role must be explicit | A:25; alignment authority:16-18,24-35 | The final document is the plug-and-play architecture layer, not a runtime-spec replacement. |
| Runtime detail must stay bounded | alignment authority:185-202; runtime spec:20-48 | Runtime lifecycle/ownership belongs in the integrated architecture; full runtime catalog, interfaces, file tree, and examples stay in the runtime spec. |
| B service-boundary sequence skips runtime realization | B:481-487; runtime spec:20-46 | The correct chain places runtime realization between composition and placement/host details. |
| B resource/provider/profile shorthand collapses ownership | B:1112-1116; runtime spec:1458-1473; A:1271-1327 | `RuntimeResource`, `RuntimeProvider`, and `RuntimeProfile` must remain separate layers. |
| B extension seam is temporally framed | B:601-610 | The rule must be expressed as durable extension-class law, not "future/later" roadmap language. |
| B app section needs stronger process/surface separation | B:1458-1482; A:1651-1695; runtime spec:20-22 | App membership, profile selection, process shape, placement, role, and surface must not collapse. |
| B final diagram collapses resource/provider edges | B:2764-2766; A:2945-2950; runtime spec:1458-1473 | Resources declare contracts and dependencies; providers are selected by profiles. |
| A cannot be used as baseline without broader pruning | A:1763-2050; alignment authority:185-202 | A carries too much detailed runtime subsystem material into the integrated architecture layer. |
| A extra architecture-level live access noun is not acceptable | A:224-233,1930,2782; alignment authority:82-90; runtime spec:2294-2358 | The integrated document should expose only `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` as top-level live access nouns. |

## Hard Gates

| Gate | Version A | Version B | DRI disposition |
| --- | --- | --- | --- |
| Runtime overlap authority | pass-with-repair | pass-with-repair | A must demote `SurfaceRuntimeAccess`; B must repair resource/provider shorthand and service-boundary ordering. |
| Canonical architecture role | pass-with-risk | pass-with-repair | A states the role best at A:25; B needs that wording transplanted. |
| Stale carry-over | pass-with-repair | pass-with-repair | Both cleared direct stale target names; both need title repair away from `Architecture and Runtime Specification`. |
| Repo leakage | pass | pass | No direct repository-zip/current-repo authority leak found. |
| Philosophy drift | pass | pass | Both preserve bounded-foundry and scale-continuity framing. |
| Runtime over-duplication | pass-with-repair | pass | A duplicates too much runtime-subsystem detail; B is cleaner. |
| Normative fitness | pass-with-repair | pass-with-repair | A is dense; B needs extension/resource wording repairs. |
| Migration usability | pass-with-repair | pass-with-repair | B is the better planning baseline after bounded repairs. |

No candidate fails hard enough to require broad resynthesis. The final option is `accept-version-b-after-bounded-edits`.

## Comparative Matrix

| Dimension | Version A | Version B | Decision |
| --- | --- | --- | --- |
| Whole-system philosophy | Stronger opening and universal-shape detail | Cleaner document flow, but needs A:25 role transplant | B baseline with A transplant |
| Runtime authority | Stronger broad runtime mapping, but extra `SurfaceRuntimeAccess` | Cleaner runtime abstraction, but two precise blockers | B after repairs |
| Information design | Dense and runtime-heavy | Clearer, more navigable, better cross-cutting boundaries | B |
| Carry-forward quality | Better broad frame, less prior exact carry-forward | More compact but has some stale-assembly artifacts | B after repairs because A over-duplicates runtime |
| Visuals/examples/tables | Richer but heavier and render-risk in final Mermaid | Cleaner, needs edge repairs and optional A diagram material | B |
| Migration derivability | Rich but over-sequences runtime internals | Better planning frame after bounded repair | B |

## Reviewer Results

| Layer | Recommendation | DRI resolution |
| --- | --- | --- |
| 1 Architecture coherence and philosophy | Version A after bounded edits | Accept the A transplants but not A baseline; A's runtime-detail duplication is a wider baseline liability. |
| 2 Runtime authority and ownership | Version A after bounded edits | Accept the B blockers as required repairs; they are narrower than A's extra access noun plus runtime-detail spread. |
| 3 Information design and canonical language | Version B after bounded edits | Accepted. |
| 4 Carry-forward and stale content | Version A after bounded edits | Accept the stale-title and runtime-detail findings; choose B because its repair surface is smaller. |
| 5 Visuals/examples/tables | Version B after bounded edits | Accepted. |
| 6 Migration derivability and finalization fitness | Version B after bounded edits | Accepted. |

## Required Repairs Before Adoption

1. Retitle the final document to `RAWR Integrated Canonical Architecture Specification` or `RAWR Canonical Architecture Specification`; do not preserve `and Runtime Specification`.
2. Add the explicit plug-and-play architecture role from A:25 to B's Scope.
3. Replace B:481-487 with: service boundary first -> projection second -> composition third -> runtime realization fourth -> placement fifth -> transport/native host details downstream.
4. Replace B:1112-1116 so `RuntimeResource`, `RuntimeProvider`, and `RuntimeProfile` remain separate.
5. Rename B:601-610 from `Future refinement seam` to durable extension-class language.
6. Add a compact app selection/process shape/surface rule from A:1651-1695.
7. Repair B's final Mermaid resource/provider/profile edges using A:2945-2950 relationship semantics, matching the repaired B:1112-1116 formula.
8. Remove or demote B:1458-1479 TypeScript examples unless retained as one explicitly illustrative architecture-level example.
9. Repair B:2704 so it does not introduce an undefined `composed service` architecture kind.

## Optional Improvements

These are useful if the final editing pass can include them without expanding the architecture document into a runtime subsystem spec:

1. Add a compact public SDK family summary from A:3023-3058, normalized to avoid an exhaustive low-level API contract.
2. Add a compact shell/steward or role/surface table from A if it improves navigation without carrying over A's heavy runtime section.
3. Add A:2032-2050 cache/control-plane distinctions as short boundary statements, not detailed runtime APIs.

## Accepted Transplants From Version A

| ID | Source anchor | Destination | Reusable material | Required normalization |
| --- | --- | --- | --- | --- |
| T1 | A:25 | B Scope | Plug-and-play architecture role and subsystem attachment frame. | Do not imply runtime subsystem details live in this doc. |
| T2 | A:129-144 | B 2.1 | Richer output-shape table, especially steward work on async. | Keep table architecture-level; avoid `FunctionBundle` as low-level detail unless necessary. |
| T3 | A:1271-1327 | B 7 | Resource owns contract; provider implements; profile selects. | Remove provider implementation from `RuntimeResource`. |
| T4 | A:1411-1526 | B 8 | Lane-specific plugin navigation. | Preserve B's topology-plus-builder wording. |
| T5 | A:1651-1695 | B 9 | App membership/profile/process/placement/surface separation. | Use B's `AppDefinition` language; avoid repeated `manifest` teaching. |
| T6 | A:2032-2050 | B 15/19 | Cache and control-plane owner distinctions. | Summarize; do not copy runtime internals. |
| T7 | A:2889-3060 | B 20 | Better resource/provider/profile diagram edges and optional SDK family summary. | Keep B's render-safe Mermaid style and make diagram semantics match the repaired resource/provider/profile formula; exclude `SurfaceRuntimeAccess`. |

## Rejected Material

- Version A `SurfaceRuntimeAccess` as an architecture-level live access noun at A:224-233, A:1930, and A:2782.
- Version A runtime-subsystem detail density from A:1763-2050 when it duplicates the runtime spec's component/catalog/detail authority.
- Version A repeated `publication artifacts` phrasing where it could be confused with forbidden projection-classification fields.
- Version A raw multiline Mermaid labels in A:2891-2970 unless rewritten in render-safe syntax.
- Version B resource/provider collapse at B:1112-1116.
- Version B service-boundary sequence at B:481-487 without runtime realization before placement.
- Version B `Future refinement seam` heading and temporal "later" framing at B:601-610.
- Version B undefined `composed service` flexibility language at B:2704.

## Canonical Phrasing To Preserve

- Services own truth.
- Plugins project.
- Apps select.
- Resources declare capability contracts.
- Providers implement capability contracts.
- The SDK derives.
- The runtime realizes.
- Harnesses mount.
- Diagnostics observe.
- Runtime placement changes process shape, not semantic species.
- Runtime realization follows `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`.
- `RuntimeCatalog` is a diagnostic read model, not live access and not app composition.
- Topology plus builder classifies projection identity.
- Native framework interiors keep native execution semantics after RAWR handoff.

## Subsystem Boundary Decisions

No new sub-specification is required before migration planning.

| Topic | Decision | Integration point to preserve |
| --- | --- | --- |
| Runtime realization | Keep as existing dedicated canonical spec. | Lifecycle, ownership law, package/SDK naming, runtime access vocabulary, SDK/runtime/harness/diagnostics relationships. |
| Schema/config/diagnostics/policy | Keep in integrated architecture as B Section 15. | `RuntimeSchema`, app profiles, diagnostics, telemetry, policy ownership. |
| Agent/OpenShell governance | Preserve boundary; defer deeper governance spec. | Agent harness, `plugins/agent/*`, resource/policy hooks, async steward handoff. |
| Desktop native internals | Preserve harness boundary; defer native detail. | Desktop role, desktop surfaces, desktop harness, process-local loops. |
| RuntimeCatalog persistence/telemetry backend | Preserve as flexible implementation detail. | Redacted catalog records, diagnostics, telemetry records, control-plane touchpoints. |
| Multi-process placement policy | Defer dedicated spec. | Entrypoint -> platform service -> replicas; runtime emits records but does not decide placement. |

## Migration-Readiness Verdict

Migration planning can begin after the required bounded edits are applied to Version B. The remaining work is not architectural discovery; it is a controlled document modification pass followed by migration-plan touch-up.

Real remaining design questions that do not block planning:

- exact config-source precedence algorithm before executable multi-source profile support;
- RuntimeCatalog storage/indexing/retention backend;
- telemetry backend/export protocol;
- provider refresh/retry policy details;
- deeper Agent/OpenShell governance mechanics;
- desktop native IPC/security details.

## Verification Notes

Scratch evidence and layer reports were written under `.context/.scratch/integrated-canonical-architecture-comparison/`, which is intentionally ignored and is not future authority.
