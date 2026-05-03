# Evidence digest — runtime-canon-arch-align

> High-fidelity evidence index for the draft sub-orchestrators. Grouped by the six required terminal sections. Every claim cites its source-of-truth artifact (source-analysis note, contradiction-graph cluster, source-tensions entry, depth interim note) AND the original spec line refs. Verbatim quotes are blockquoted with arch-spec L# / runtime-spec L# refs.

---

## Section 1: Document scope and structural diff

### Spec identities and line counts
- Runtime realization spec: 5264 lines, 80 ToC headings (1 H1 + 14 H2 + 65 H3). Source: [[source-analysis-rawr-runtime-realization-system-canonical-spec]].
- Canonical architecture spec: 2955 lines, ~119 ToC headings (1 H1 + 20 H2 + ~99 H3). Source: [[source-analysis-rawr-canonical-architecture-specification]].

### Self-declared scope (runtime spec — runtime-spec L1-L11)
> "Status: Canonical
> Scope: Runtime realization, selected authoring declarations, SDK derivation, runtime compilation, bootgraph ordering, Effect-backed provisioning and process-local execution, process runtime binding, process execution, adapter lowering, harness mounting, diagnostics, telemetry, and deterministic finalization"
> "Authority note: once locked, this document supersedes older indexed runtime/effect documents for runtime realization."
> "It does not own service domain authority, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, web framework semantics, or native host interiors."

### Self-declared scope (arch-spec — arch-spec L4-L24)
> "This specification defines the canonical integrated architecture for RAWR HQ and for apps built on the same shell."
> "[fixes] the durable ontology; the semantic authoring model; the package, resource, service, plugin, app, SDK, compiler, bootgraph, process runtime, adapter, harness, diagnostics, and topology seams; the role and surface model; the service-boundary and runtime-resource ownership model; the public SDK posture; the app composition and entrypoint model; the runtime realization lifecycle; the process-local runtime substrate; the relationship between the `agent` role and the `async` role; the operational mapping on service-centric platforms; the default topology and growth model; the enforcement orientation."
> "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries."

### Structural diff highlights (per source-analysis comparisons)
- Runtime spec is larger (~32K words vs ~15K words) and denser on mechanics.
- Both specs use IDENTICAL canonical phase names (definition → selection → derivation → compilation → provisioning → mounting → observation) — see consensus-claims.json:lifecycle-7-phase-names.
- Arch-spec has 13 explicit canonical laws (§4.1–§4.13); runtime-spec has the equivalent law set distributed across §1, §3 (planes), §11 (service boundary), §17 (bootgraph), §21 (harness), §25 (enforcement).
- Arch-spec has a closing canonical-picture mermaid diagram (§20, L2824-L2895); runtime-spec has 4 detailed flow walkthroughs (§24.3–§24.6) plus a sequence diagram (§24.1).
- Arch-spec section 10 ("Runtime realization") at L1577-L1825 is the single highest-overlap region with the runtime spec — see source-tensions.json entries 1, 2 and contradiction-graph clusters lifecycle-naming-vs-mechanics-authority + provisioning-kernel-primitive-inventory + sdk-derivation-artifact-list-depth + runtime-compiler-validation-list-depth.

### Authority overlap surface
- Source: contradiction-graph.json has 10 ranked fight clusters; consensus-claims.json has 19 settled-ground claims.
- 6 of 10 fights resolve cleanly under the user heuristic ("runtime spec is authoritative on runtime concerns").
- 4 of 10 are gaps the heuristic does not resolve (companion-spec-attachment-points, harness-mount-interface-contract, inngest-mode, portable-plan-as-control-plane) — these become arch-spec ADDITIONS, not deference exercises.

---

## Section 2: Integration surface the canonical architecture spec must own

### Runtime spec's enumeration of integration boundaries it touches (source: source-analysis-rawr-runtime-realization-system-canonical-spec §4)

1. `startApp(...)` → one process contract (runtime-spec L139-L141)
2. `@rawr/sdk` public import surface (~25 paths, runtime-spec L598-L630)
3. Execution ownership law (runtime-spec L37-L47)
4. Per-harness input/output contracts (runtime-spec §21 L4241-L4333)
5. `WorkflowDispatcher` as server-internal → async bridge (runtime-spec L3992-L3994)
6. `PortableRuntimePlanArtifact` as control-plane / deployment touchpoint (runtime-spec L3409-L3437)
7. `RuntimeCatalog` as observation / control-plane interface (runtime-spec L4470-L4511)
8. Topology + builder = projection classification rule (runtime-spec L2172-L2192)
9. `EffectBoundaryContext.traceId` required at every invocation boundary (runtime-spec L1193)
10. Inngest SDK integration shape — durable async semantics (runtime-spec L131-L133, L4149)
11. oRPC integration shape — contract mechanics owner (runtime-spec L1914-L1948, L2358-L2371)
12. Effect SDK integration shape — single managed runtime per process (runtime-spec L3676-L3703)
13. Elysia integration shape — HTTP host lifecycle owner (runtime-spec L4278-L4282)
14. OCLIF integration shape — command execution semantics owner (runtime-spec L4297-L4302)

### Arch-spec's current integration-surface coverage (source: source-analysis-rawr-canonical-architecture-specification §4)
- Public SDK surfaces table (arch-spec L719-L733) — 12 import paths with owner column
- Lifecycle table with producer/consumer columns (arch-spec L1633-L1641)
- Per-harness stack diagrams (arch-spec L2157-L2270) — six harnesses
- Schema ownership split table (arch-spec L2469-L2481)
- Telemetry layer ownership table (arch-spec L2526-L2536)
- Policy primitives table (arch-spec L2539-L2553)
- Cache and control-plane boundaries table (arch-spec L2554-L2570)
- Final canonical picture mermaid diagram (arch-spec L2824-L2895)
- Companion-spec attachment promise (arch-spec L24) — UNFULFILLED

### Critical gaps in arch-spec's integration-surface coverage (source: source-analysis-rawr-canonical-architecture-specification §6)
1. No formal harness-mount interface contract (no named boundary types) — gap §6.1
2. Inngest integration mode unspecified (serve vs connect-worker) — gap §6.2
3. Runtime↔oRPC procedure boundary contract under-specified — gap §6.3
4. No phase-transition trigger conditions — gap §6.4
5. No error-propagation contract across phase boundaries — gap §6.5
6. No formal observability protocol (named telemetry backend) — gap §6.6
7. No companion-spec attachment-points registry — gap §6.7 (PRIMARY)
8. RuntimeSchema adapter boundary not described in runtime context — gap §6.8

---

## Section 3: Runtime-driven additions the canonical architecture spec is missing

### Top 10 from runtime-spec source-analysis §6
1. Five-phase platform chain + seven-phase lifecycle as canonical vocabulary (runtime-spec L21-L29) — already in arch-spec §4.5 + §1.
2. Execution ownership law (runtime-spec L37-L47) — covered diffusely in arch-spec, not as compact statement.
3. Topology + builder → projection classification (runtime-spec §12.3) — covered in arch-spec §8.3 lane index table. CONSENSUS.
4. Harness enumeration and vendor assignments (runtime-spec §21) — covered in arch-spec §13. CONSENSUS at high level; per-harness contract types missing.
5. WorkflowDispatcher as async-to-server bridge (runtime-spec §19.1, §12.6, §24.4) — mentioned at arch-spec §10.10 L1789-L1795 but interface contract undefined.
6. PortableRuntimePlanArtifact as control-plane / deployment integration surface (runtime-spec L3409-L3437) — MISSING from arch-spec entirely. See source-tensions.json entry 5.
7. RuntimeCatalog as observation / control-plane read interface (runtime-spec §22.3) — mentioned briefly at arch-spec §10.13 L1813-L1823 but not as part of an external-interfaces table.
8. Cohosting model (single semantic vs multiple physical processes) (runtime-spec L154) — covered in arch-spec §14.4 + §14.9. CONSENSUS.
9. Process-local coordination resources as a distinct category (runtime-spec §14) — implicit in arch-spec §10.7 but the named four-resource catalogue is not surfaced (correctly — see source-tensions.json entry 2 / Locus B committed position: "do NOT name `Process*HubResource` in arch-spec").
10. `traceId` required at every invocation boundary (runtime-spec L1193) — MISSING from arch-spec entirely. See depth-investigation-harness-mount-interface-contract-named-types.

### Quotes for terminal section 3
> Runtime-spec L37-L47: "RAWR owns semantic/runtime boundaries. oRPC owns callable contract mechanics. Effect owns local execution mechanics. Inngest owns durable async. Native hosts own host interiors after RAWR adapter lowering. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe."
>
> Runtime-spec L3409-L3437 (§15.7 PortableRuntimePlanArtifact): "allows inspection, control-plane handoff, and reproducible runtime planning without live resources or executable closures... consumed by runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints."
>
> Runtime-spec L1193: "EffectBoundaryContext.traceId is required for RAWR-owned executable invocation boundaries. If the native host does not supply a trace, the adapter or process execution runtime must mint one before invoking `descriptor.run(...)`."

---

## Section 4: Recommended changes to the canonical architecture specification

### The 7 recommendations (source: depth investigation interim notes + cross-locus reconcile in comparisons.md)

**Recommendation #1 (lifecycle scope rewrite — Locus A) — high confidence**
- Source: [[depth-investigation-lifecycle-authority-boundary-arch-vs-runtime]]
- BEFORE (arch-spec L17): `- the runtime realization lifecycle;`
- AFTER: `- the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization (definition → selection → derivation → compilation → provisioning → mounting → observation); phase mechanics, sub-sequencing, artifact shapes, and substrate internals are defined in the canonical runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec);`
- BEFORE (arch-spec L18): `- the process-local runtime substrate;`
- AFTER: `- the canonical name and ownership split of the process-local runtime substrate (RAWR plans identity, order, dependency, lifetime, and boundary policy; Effect executes scoped acquisition, release, runtime ownership, and process-local coordination); substrate internals, named coordination resources, and kernel mechanics are defined in the canonical runtime realization specification;`
- Add a §4.3a (or amend §4.3) carve-out principle: "arch-spec owns canonical names and integration-boundary vocabulary; runtime-spec owns mechanics within each phase."

**Recommendation #2 (companion-spec attachment-points registry — Locus C) — high confidence on content; medium on placement**
- Source: [[depth-investigation-companion-spec-attachment-points-registry]]
- NEW section: arch-spec §10.14 "Companion specifications and integration-boundaries registry" (or top-level section — see Tension 4 in comparisons.md / user decision item).
- Contains: 11-row registry table (lifecycle vocabulary, SDK derivation, runtime compiler, bootgraph + Effect kernel, runtime access, service binding, workflow dispatcher, surface adapter lowering, harness and native boundary, RuntimeCatalog/diagnostics/telemetry, control-plane and deployment) + 6-rule attachment protocol + worked example using the runtime realization spec as the canonical companion at every row.
- Upgrade arch-spec L24 from promise to pointer.

**Recommendation #3 (harness-mount named types + per-harness contracts — Locus D) — high confidence**
- Source: [[depth-investigation-harness-mount-interface-contract-named-types]]
- Name 7 boundary types in arch-spec §10.12: `CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`. Plus the `EffectBoundaryContext.traceId` invariant.
- Do NOT name 5 runtime-internal types: `CompiledExecutionPlan`, `CompiledProcessPlan`, `SurfaceRuntimePlan`, `WorkflowDispatcherDescriptor`, `CompiledExecutionRegistryInput`.
- Add per-harness integration-contract paragraphs to arch-spec §13.1-§13.6 referencing the named types and deferring mechanics to runtime-spec §21.x.
- Minimal-viable subset: `HarnessDescriptor`, `StartedHarness`, `FunctionBundle`.

**Recommendation #4 (platform external interfaces table — Locus E) — high confidence**
- Source: [[depth-investigation-platform-external-interfaces-table]]
- NEW section: arch-spec §15.8 "Platform external interfaces"
- 4-row table: PortableRuntimePlanArtifact (control-plane / deployment planning), RuntimeCatalog (diagnostic readers / control-plane observation), RuntimeDiagnostic (structured failures), RuntimeTelemetry (chain context).
- Amend §17.12 (Control-plane invariant) to name all four artifacts.
- Cross-reference from §10.13 to §15.8.

**Recommendation #5 (Inngest mode amendment — Locus F) — high confidence**
- Source: [[depth-investigation-inngest-integration-mode-at-architecture-level]]
- Add one paragraph to arch-spec §13.2 naming both modes (serve-mode, connect-worker mode) and stating mode is a process-start harness-selection fact, with mechanics deferred to runtime-spec §21.2.
- Annotate the §13.2 stack diagram with `Inngest harness [serve-mode | connect-worker mode]`.
- Add §17.8 invariant: "an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process."

**Recommendation #6 (compress §10.4-§10.6 + §17.6 enumerations — Locus B) — high confidence**
- Source: [[depth-investigation-provisioning-kernel-inventory-depth-reduction]]
- Compress arch-spec §10.4 SDK derivation 9-item artifact list to a 2-category statement + cross-reference to runtime-spec §15.
- Compress arch-spec §10.5 runtime compiler 8-item validation list + 9-item emission list to summary + cross-reference to runtime-spec §16.
- Compress arch-spec §10.6 provisioning kernel primitive enumeration ("queues, pubsub, refs, schedules, caches, fibers, semaphores") — preserve the irreducible "RAWR plans, Effect executes" split + one-managed-runtime-per-process + high-level guarantees + non-durability boundary; defer named coordination resources to runtime-spec §14 and Effect kernel substrate to runtime-spec §17.3.
- Compress arch-spec §17.6 invariant primitive enumeration similarly.
- Do NOT name `Process*HubResource` types in arch-spec.

**Recommendation #7 (promote execution-ownership-law to single compact statement) — medium confidence**
- Source: contradiction-graph cluster `execution-ownership-law-restated-diffusely` (skipped from depth-loci because mechanical)
- Either restate runtime-spec L37-L47 verbatim near top of arch-spec §4 as "Execution ownership law", or consolidate arch-spec §4.1 + §4.9 + §13.7 into a single compact "Vendor ownership and execution-layer law" subsection.

### Strengthening evidence (source: corpus-critic-results.md)
- The M2 migration packet (`.context/M2-migration-planning-packet/01-primary-authorities.md`) already establishes informally the authority order Recommendation #1 + #2 formalize. Quote: arch-spec is authority #1 with lane "Top-level ontology, ownership laws, system geometry, terminology, subsystem boundaries, and integration points"; runtime-spec is authority #2 with lane "Runtime realization topology, lifecycle, SDK/runtime split, resource/provider/profile model, runtime compiler/provisioning/process runtime, live access, diagnostics, and finalization."

---

## Section 5: Flagged contradictions requiring user resolution

### Items where the user heuristic does not resolve the choice (source: comparisons.md Tension 5 + source-tensions.json entry 7)

1. **Registry placement**: arch-spec §10.14 (under §10) vs new top-level §21 (globally visible). Recommendation: §10.14 unless the platform expects multiple non-runtime-realization companion specs, in which case top-level placement is the better long-term structure.

2. **OpenShell vendor status**: declare RAWR-internal / declare third-party / formally defer to OpenShell companion spec. Both specs use "reserved boundary with locked integration hooks" — neither resolves the vendor-status question. Source: contradiction-graph cluster `agent-openshell-shell-governance-vs-harness-adapter-shape`; source-tensions.json entry 7.
   - Quote (arch-spec L1398-L1399): "Agent/OpenShell governance is a reserved boundary with locked integration hooks."
   - Quote (runtime-spec L4322): same phrasing.
   - Quote (runtime-spec L11): runtime-spec excludes "shell governance" from runtime realization scope.
   - Recommended option: formally defer to a forthcoming OpenShell companion spec listed as a placeholder row in the §10.14 registry, per the runtime-spec L4637 reserved-detail-boundaries model.

3. **Inngest mode default**: should serve-mode be declared the default Inngest mode? Lab uses only serve-mode; production examples use serve-mode via `inngest.cloud(...)`. Recommendation (Locus F depth investigator): NOT declare a default at architecture level — mode-selection is a profile/deployment concern.

4. **Minimal-viable harness-mount-types subset**: 7 (full) vs 3 (minimum: `HarnessDescriptor`, `StartedHarness`, `FunctionBundle`). Recommendation (Locus D): full subset. Fallback is the 3-type minimum if the user wants a smaller change set.

5. **Whether to add `RuntimeDiagnosticContributor` as a 5th row in the platform-external-interfaces table** (Locus E open question). Recommendation: omit — it is resource-authored, not system-authored.

6. **Runtime-spec §29 supersession scope**: does "older indexed runtime/effect documents" in runtime-spec L5 include the arch-spec on runtime mechanics? Subtle wording question that the lifecycle-authority depth investigator (Locus A) flagged.

---

## Section 6: Division-of-responsibility guidance for companion subsystem documents

### Per-name classification rule (source: comparisons.md Tension 2)
> Names exposed to companion subsystem authors and vendor integration authors live in the arch-spec's integration vocabulary; names consumed only inside the runtime-spec's mechanical pipeline live in the runtime-spec.

### Worked examples
- `FunctionBundle` → arch-spec NAMES it (companion async-spec authors / Inngest integration authors must reference it). [source: depth-investigation-harness-mount-interface-contract-named-types]
- `ProcessQueueHubResource` → runtime-spec OWNS it; arch-spec acknowledges category only ("process-local coordination resources exist"). [source: depth-investigation-provisioning-kernel-inventory-depth-reduction]
- `PortableRuntimePlanArtifact` → arch-spec NAMES it as a control-plane interface (Locus E); runtime-spec OWNS the field shape. [source: depth-investigation-platform-external-interfaces-table]

### The 6-rule attachment protocol (source: depth-investigation-companion-spec-attachment-points-registry — to be drafted in Recommendation #2)
1. Companion spec must reference the boundary by its registry name; no internal re-naming.
2. Companion spec must not redefine boundary types — refer by name to runtime-spec §X.
3. Companion spec must not duplicate mechanics covered by runtime-spec.
4. Companion spec must declare its own reserved-detail boundaries at lock time per runtime-spec L4637 model.
5. Companion spec must not use "fixes" language on mechanics — only on its own integration vocabulary.
6. Arch-spec vocabulary is the canonical naming source; companion spec names that conflict must yield.

### Existing companion docs in the repo (source: corpus-critic-results.md)
- RAWR_Canonical_Testing_Plan.md (subordinate; references both target specs)
- RAWR_Architecture_Migration_Plan.md (migration plan)
- M2-guardrails-and-enforcement.md (M2-specific; has stale spec-name reference)
- M2 milestone + M2 issue docs

None of these are companion subsystem specs in the user's sense. The runtime realization spec is the only existing companion subsystem spec; future companions will be deployment, observability, OpenShell, etc.

### Reserved-detail-boundaries pattern (source: runtime-spec §23.5 / L4637)
> Runtime spec lists reserved detail boundaries (config precedence, provider refresh mechanics, call-local memoization, generic cache resources, process-local coordination provider details, runtime telemetry backend, RuntimeCatalog storage backend, etc.) and states each "must be locked no later than the first implementation slice that makes its dedicated specification trigger true." Companion subsystem docs follow the same lock-on-trigger model.

---

## Consensus claims (settled — source: consensus-claims.json)

For brevity, list of the 19 settled claims that the draft can assert without hedging. Full evidence in consensus-claims.json. Headlines:

- 7-phase lifecycle names (definition → selection → derivation → compilation → provisioning → mounting → observation)
- bind → project → compose → realize → observe platform chain
- `startApp(...)` is the only canonical app-start verb; one process per invocation
- topology + builder = projection classification
- vendors are native interiors, not peer semantic owners
- raw Effect imports forbidden in ordinary authoring; no public Effect ontology
- ServiceBindingCacheKey excludes invocation
- 4 runtime-owned lifetimes (process / role / invocation / call-local)
- cohosting changes placement, not species
- schema ownership split (service-owned for procedures; RuntimeSchema for runtime-carried)
- 6 canonical runtime roles (server / async / web / cli / agent / desktop)
- agent/OpenShell is a reserved boundary
- RAWR-vs-Effect control split (RAWR plans; Effect executes)
- diagnostics minimum shape
- workflow plugins do not expose product APIs (server internal wraps WorkflowDispatcher)
- harnesses consume mounted records, not graphs
- scale continuity (semantic identity ≠ runtime placement)
- canonical monorepo roots (packages/, resources/, services/, plugins/, apps/)
- public SDK rooted at @rawr/sdk/* import paths

---

## Source ID quick reference (for citations)

| Artifact | Note ID |
|---|---|
| Runtime spec source | rawr-effect-runtime-realization-system-canonical-spec-source |
| Arch spec source | rawr-canonical-architecture-spec-source |
| Runtime spec analysis | source-analysis-rawr-runtime-realization-system-canonical-spec |
| Arch spec analysis | source-analysis-rawr-canonical-architecture-specification |
| Vendor: Effect v3.21.2 | vendor-verification-effect-v3-api-surface-2 |
| Vendor: Inngest 4.2.6 modes | vendor-verification-inngest-integration-mode-2 |
| Vendor: oRPC | vendor-verification-orpc-context-lanes-and-local-first-callable-boundary-2 |
| Depth: lifecycle authority | depth-investigation-lifecycle-authority-boundary-arch-vs-runtime |
| Depth: companion-spec registry | depth-investigation-companion-spec-attachment-points-registry |
| Depth: harness-mount types | depth-investigation-harness-mount-interface-contract-named-types |
| Depth: platform external interfaces | depth-investigation-platform-external-interfaces-table |
| Depth: Inngest mode | depth-investigation-inngest-integration-mode-at-architecture-level |
| Depth: provisioning kernel reduction | depth-investigation-provisioning-kernel-inventory-depth-reduction |
