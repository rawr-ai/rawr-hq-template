# Cross-locus comparisons

These are the load-bearing dynamics across the six depth investigations that the draft (step 10) and synthesizer (step 11) must visibly engage. Each tension below names: the loci involved, what each investigator committed to, the cross-locus dynamic, the calibration the draft should weight, and how the draft must make the dynamic visible — not gesture at it.

---

## Tension 1: The lifecycle authority principle is the foundation; everything else flows from it

- **Locus A** ([[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]) commits: the arch-spec must reword L9-L22 to formalize the "names vs mechanics" carve-out — arch-spec owns canonical lifecycle phase vocabulary and integration-boundary handoffs; the runtime realization spec owns phase mechanics, sub-sequencing, artifact shapes, and substrate internals. Confidence: high.
- **Locus B** ([[depth-investigation-provisioning-kernel-inventory-depth-reduction]]) commits: compress arch-spec §10.4-§10.6 enumerations (SDK derivation 9-item artifact list; runtime compiler 8-item validation + 9-item emission lists; Effect kernel primitive list of queues/pubsub/refs/schedules/caches/fibers/semaphores) to integration-level statements + cross-references to runtime-spec §15/§16/§17/§14. Drop the same primitive enumeration from §17.6 invariants. Do NOT name the four `Process*HubResource` types in arch-spec — the category is integration-level vocabulary; the names are runtime-spec territory. Confidence: high.
- **Locus C** ([[depth-investigation-companion-spec-attachment-points-registry]]) commits: a NET-NEW arch-spec §10.14 (Companion specifications and integration-boundaries registry) with an 11-boundary table, a 6-rule attachment protocol, and a worked example using the runtime realization spec as the canonical companion. Confidence: high.

- **The cross-locus dynamic:** **convergence with strict dependency direction.** Locus A's principle ("arch-spec owns names; runtime-spec owns mechanics") IS the load-bearing rule that Locus B applies to §10.4-§10.6 and that Locus C codifies in the new §10.14 attachment protocol. There is no disagreement — but neither Locus B nor Locus C makes any sense without Locus A's principle being adopted first. If the user accepts Locus A's L9-L22 rewrite, Locus B's compressions become trivially correct and Locus C's protocol has the principle to enforce. If the user rejects Locus A and keeps the arch-spec's "fixes the runtime realization lifecycle" claim, then Locus B's compressions look like demotions and Locus C's protocol has no principle to point at.

- **How the draft must engage this:** terminal section 4 (Recommended changes) must lead with the Locus A scope-language rewrite as Recommendation #1, then present Locus B's compressions and Locus C's new §10.14 as Recommendations #2-#5 grounded in the principle. Do not present them as parallel independent recommendations — make the dependency explicit: "Recommendation #1 (rewording arch-spec §1 scope to formalize the names-vs-mechanics carve-out) is the load-bearing change; the remaining recommendations apply that principle to specific arch-spec sections."

- **Calibration:** all three investigators are high-confidence. The principle-and-application dependency is unambiguous. The only uncertainty is whether the user accepts the principle — once accepted, the downstream work is mechanical.

---

## Tension 2: "Remove type names" (Locus B) and "add type names" (Locus D) are not contradictory — they operate on different categories

- **Locus B** ([[depth-investigation-provisioning-kernel-inventory-depth-reduction]]) commits: REMOVE the primitive enumeration "queues, pubsub, refs, schedules, caches, fibers, semaphores" from arch-spec §10.6 and §17.6; do NOT name the `Process*HubResource` types in arch-spec.
- **Locus D** ([[depth-investigation-harness-mount-interface-contract-named-types]]) commits: ADD 7 boundary type names to arch-spec §10.12 (`CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`) plus the `EffectBoundaryContext.traceId` invariant. Classify 5 other types (`CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`) as runtime-internal — do NOT name them.

- **The cross-locus dynamic:** **complementary application of the same principle, surfacing two different categories of named entity.** Locus B and Locus D agree on the underlying rule (Locus A's principle): the arch-spec names integration-surface concepts and defers mechanics. They disagree only in which side of the boundary the specific names sit. Locus B treats `ProcessQueueHubResource` and the Effect-internal primitive bag as substrate / runtime-internal because authors and harness implementers do not consume those names directly — only the runtime-spec does. Locus D treats `FunctionBundle`, `HarnessDescriptor`, `MountedSurfaceRuntimeRecord` as integration-surface because companion harness specs and vendor integration authors must reference those names to attach. The two committments do not collide; they jointly demonstrate that the principle requires per-name classification, not blanket application.

- **How the draft must engage this:** terminal section 6 (Division-of-responsibility guidance for companion subsystem documents) must explicitly state the per-name classification rule: "Names exposed to companion subsystem authors live in the arch-spec's integration vocabulary; names consumed only inside the runtime-spec's mechanical pipeline live in the runtime-spec." Use the contrast — `FunctionBundle` (named at arch-spec §10.12) vs `ProcessQueueHubResource` (deferred to runtime-spec §14) — as the worked example. The draft must NOT present Locus B and Locus D as independent decisions; they're two applications of one classification rule.

- **Calibration:** both investigators high-confidence. Locus D's "minimal-viable subset" (`HarnessDescriptor`, `StartedHarness`, `FunctionBundle`) is a useful fallback if the user wants a smaller change set.

---

## Tension 3: Locus C's registry is the anchor; the other five loci each populate one of its rows

- **Locus C** ([[depth-investigation-companion-spec-attachment-points-registry]]) commits: arch-spec §10.14 contains an 11-row registry table mapping each integration boundary to the runtime-spec section that owns the contract.
- **Locus D** ([[depth-investigation-harness-mount-interface-contract-named-types]]) commits: 7 boundary type names + 6 per-harness integration-contract paragraphs at arch-spec §10.12 and §13.1-§13.6.
- **Locus E** ([[depth-investigation-platform-external-interfaces-table]]) commits: a 4-row Platform External Interfaces table at new arch-spec §15.8 covering `PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`.
- **Locus F** ([[depth-investigation-inngest-integration-mode-at-architecture-level]]) commits: one paragraph + diagram annotation + invariant at arch-spec §13.2 and §17.8 describing Inngest's serve-mode vs connect-worker mode as a process-start harness-selection fact.

- **The cross-locus dynamic:** **strict containment, not overlap.** Locus C's registry table contains rows for "Harness and native boundary" (populated by Locus D's named types and per-harness paragraphs), "Control-plane and deployment interface" / "Diagnostics, telemetry, and observation" (populated by Locus E's 4 artifacts), and a row whose mode-binding sub-rule is supplied by Locus F. Each downstream locus's deliverable IS one column-cell or one row of the registry. The risk is publication: if the four deliverables ship as four parallel sections without explicit cross-reference, the registry promises one thing and the rest of the spec delivers a fragmented mirror.

- **How the draft must engage this:** terminal section 4's recommendation list must be ordered: (1) lifecycle scope rewrite (Locus A); (2) §10.14 registry section (Locus C — naming the rows by boundary); (3) §10.12 named types + §13.x per-harness contracts (Locus D — populating the harness row); (4) §15.8 platform external interfaces table (Locus E — populating the control-plane and observation rows); (5) §13.2 + §17.8 Inngest mode amendment (Locus F — refining the harness row's async harness sub-contract); (6) §10.4-§10.6 + §17.6 compressions (Locus B — applying Locus A's principle to existing sections). The draft must use phrases like "this populates the X row of the §10.14 registry" so the cross-references are explicit and survive future spec evolution.

- **Calibration:** all four investigators high-confidence on their own commitments. The containment relationship was explicitly noted in 4 of the 6 return reports — there is no disagreement; the orchestration challenge is purely sequential publication.

---

## Tension 4: Where does the registry section sit — under §10 (runtime-realization-adjacent) or as a top-level section (e.g., §21, globally visible to all companion spec types)?

- **Locus C** ([[depth-investigation-companion-spec-attachment-points-registry]]) commits to §10.14 as the recommended insertion point but explicitly flags this as an open user decision in its return report.
- **Locus A** ([[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]) implicitly favors §10 placement because its scope-language rewrite at L17-L18 cross-references "the canonical runtime realization specification" but does not name a registry section by location.

- **The cross-locus dynamic:** **structural choice with no clean technical winner.** Both placements are defensible: §10.14 keeps the registry next to the runtime-realization material that comprises most of its rows (lifecycle, SDK derivation, runtime compiler, bootgraph, runtime access, service binding, workflow dispatcher, surface adapter lowering, harness mount, RuntimeCatalog) and reads naturally as the closing subsection of the runtime-realization chapter. A top-level §21 (or §0.5 / §21A) signals that the registry governs ALL future companion specs — not just runtime-realization-adjacent ones — and is more visible to a reader scanning the table of contents.

- **How the draft must engage this:** terminal section 4 must present this as a **user decision**, not a unilateral recommendation. Show both options with their tradeoffs. Recommend §10.14 (the more conservative choice — keeps the change inside the existing chapter) but explicitly note that if the platform expects deployment, observability, or vendor-integration companion specs to exceed runtime-realization-adjacent ones, a top-level placement is the better long-term structure. This is also a candidate for terminal section 5 (Flagged contradictions) if the user heuristic does not resolve it — but more accurately it's a placement decision the user must make.

- **Calibration:** Locus C medium confidence on placement; high confidence on the section's content. The decision does not change the content, only its location and the cross-reference style.

---

## Tension 5: Open user decisions surfaced by depth investigation (must be flagged in terminal section 5, not silently resolved)

- **Locus A** ([[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]) flags: does the runtime-spec §29 supersession clause's scope ("older indexed runtime/effect documents") include the arch-spec on runtime mechanics? The investigator notes this as subtle but worth user clarification. Confidence: high on the recommendation; low on the supersession-scope question.
- **Locus F** ([[depth-investigation-inngest-integration-mode-at-architecture-level]]) flags: should serve-mode be declared the default Inngest mode (lab uses only serve-mode; all production examples use serve-mode via `inngest.cloud(...)`)? Investigator recommends NOT declaring a default in the arch-spec because that's a profile concern, but flags as user decision.
- **Skipped locus** (`openshell-vendor-status-and-integration-shape`, demoted to `skip_loci` because depth investigation cannot resolve it): both specs explicitly defer OpenShell's vendor status (RAWR-internal vs third-party vs hybrid) and treat the boundary as "reserved with locked integration hooks." Cited contradiction-graph cluster: `agent-openshell-shell-governance-vs-harness-adapter-shape`.
- **Skipped locus** (`registry-placement`, surfaced under Tension 4 above): §10.14 vs new top-level section.

- **The cross-locus dynamic:** **none of these are technical contradictions; all are deferred design choices that no amount of further evidence resolves.** Each must be flagged in terminal section 5 with the recommended option set and the tradeoffs, but each is the user's call.

- **How the draft must engage this:** terminal section 5 (Flagged contradictions requiring user resolution) must list each as a discrete user-decision item with: (a) the question stated cleanly; (b) the option set with each option's pros/cons; (c) the recommended option (where the depth investigators had a recommendation); (d) why the runtime-authoritative heuristic does not resolve it. Do NOT silently pick a side on any of these.

- **Calibration:** these are not low-confidence findings — they are high-confidence identifications of decisions the user must make. The depth investigators correctly stopped at recommendation; they did not invent authority to decide.

---

## Calibration summary

| Locus | Recommendation confidence | Surfaced user-decision items |
|---|---|---|
| Lifecycle authority (A) | high | scope of runtime-spec §29 supersession |
| Provisioning-kernel reduction (B) | high | none |
| Companion-spec registry (C) | high (content) / medium (placement) | §10.14 vs new top-level placement |
| Harness-mount types (D) | high | minimal-viable subset choice (3 vs 7 types) |
| Platform external interfaces (E) | high | whether to add `RuntimeDiagnosticContributor` as a 5th row |
| Inngest mode (F) | high | whether to declare serve-mode the default |
| (Skipped) OpenShell vendor status | n/a (deferred) | declare RAWR-internal / declare third-party / formally defer to OpenShell companion spec |

The corpus is univocal where the depth investigators committed; user decisions cluster on placement and on default-selection that no spec-internal evidence resolves.
