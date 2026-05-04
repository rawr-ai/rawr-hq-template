---
title: Source Analysis — RAWR Canonical Architecture Specification
id: source-analysis-rawr-canonical-architecture-specification
tags:
- runtime-canon-arch-align
- spec-analysis
- arch-spec-analysis
created: '2026-05-02T20:53:19.225168Z'
status: draft
type: source-analysis
deprecated: false
summary: 'Full analytical digest of the RAWR Canonical Architecture Spec (2955 lines,
  20 H2 sections). The spec is the integration-layer document for the entire RAWR
  platform, correctly establishing durable ontology, phase vocabulary, role/surface
  taxonomy, and harness-technology binding. Key findings: (1) Section 10 (Runtime
  realization) crosses into runtime-internal detail that the runtime spec owns — provisioning
  kernel primitive list and SDK derivation artifact list are the highest duplication
  risks. (2) Critical integration gaps: no formal harness-mount interface contract,
  no companion-spec attachment-points registry, Inngest integration mode (serve vs
  connect-worker) unspecified. (3) Effect v3 forbidden-pattern list is substantially
  accurate. (4) The spec claims authority over ''the runtime realization lifecycle''
  in its scope section, creating tension with the runtime spec''s authority over runtime
  concerns.'
---

# Source Analysis — RAWR Canonical Architecture Specification

**Original source:** [[rawr-canonical-architecture-spec-source]]
**Source type:** specification document (internal canonical spec)
**Source word count:** ~14,940 (2955 lines)
**Your judgment:** System-integration and ontology anchor for the entire RAWR platform. Establishes the durable vocabulary, ownership laws, canonical lifecycle phases, role/surface taxonomy, and harness-technology binding that companion subsystem specs (including the runtime realization spec) are supposed to plug into. Its authority is wide but deliberately shallow on runtime internals.

*Suggested by [[rawr-canonical-architecture-spec-source]] — source analyst's digest of the full source body*

---

## 1. Document Identity & Authority Claims

### Stated scope (arch-spec L4–L24)

The spec opens with a direct statement of what it "fixes":

> "This specification defines the canonical integrated architecture for RAWR HQ and for apps built on the same shell."

It claims to fix (arch-spec L9–L22):
- the durable ontology
- the semantic authoring model
- "the package, resource, service, plugin, app, SDK, compiler, bootgraph, process runtime, adapter, harness, diagnostics, and topology seams"
- "the role and surface model"
- "the service-boundary and runtime-resource ownership model"
- "the public SDK posture"
- "the app composition and entrypoint model"
- **"the runtime realization lifecycle"** (load-bearing: the arch-spec claims this as its own territory)
- **"the process-local runtime substrate"** (same: claims this)
- "the relationship between the `agent` role and the `async` role"
- "the operational mapping on service-centric platforms"
- "the default topology and growth model"
- "the enforcement orientation"

The integration role claim (arch-spec L24):

> "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach."

### What the spec defers / explicitly excludes

The spec does NOT contain an explicit exclusions list (no "out of scope" section). Deference to other docs is implicit:
- **Effect internals** are explicitly quarantined: "The hidden execution substrate beneath bootgraph and process runtime is Effect-backed. It is process-local runtime machinery and not a peer public ontology layer." (arch-spec L217–L218)
- **Native harness interiors** are explicitly deferred: "Native framework interiors own native execution semantics after RAWR hands them runtime-realized payloads." (arch-spec L436)
- **Subordinate implementation details** are delegated to Section 19 ("What remains flexible"), arch-spec L2791–L2818

The spec has no explicit pointer to the runtime realization spec by name. It does not say "see the runtime realization specification for X." The integration boundary is asserted through ownership law and lifecycle phase names without citing a companion doc.

---

## 2. Full Table of Contents with Line Numbers

```
H1: RAWR Canonical Architecture Specification                 L0
H2: 1. Scope                                                  L4
H2: 2. Architectural posture                                  L91
  H3: 2.1 Universal shape                                     L121
  H3: 2.2 Truth, surfaces, and selection                      L140
H2: 3. Core ontology                                          L163
  H3: 3.1 Canonical repository roots                          L164
  H3: 3.2 Stable semantic nouns                               L181
  H3: 3.3 Runtime realization nouns                           L198
  H3: 3.4 Resource and boundary nouns                         L218
  H3: 3.5 Service-boundary lanes                              L234
  H3: 3.6 Agent subsystem nouns                               L246
  H3: 3.7 Core definitions                                    L257
    (bootgraph sub-definition)                                 L363
    (process runtime sub-definition)                           L383
    (shell gateway sub-definition)                             L399
H2: 4. Canonical laws                                         L415
  H3: 4.1 Ownership law                                       L417
  H3: 4.2 Semantic direction                                   L438
  H3: 4.3 Stable architecture versus runtime realization       L447
  H3: 4.4 Service boundary first                              L478
  H3: 4.5 Bind, project, compose, realize, observe law        L492
  H3: 4.6 Projection and assembly law                         L507
  H3: 4.7 Shared infrastructure is not shared semantic ownership L524
  H3: 4.8 Namespace is not ownership                          L543
  H3: 4.9 Harness and substrate choice are downstream         L558
  H3: 4.10 Ingress and execution law                          L568
  H3: 4.11 Shell versus steward authority law                  L587
  H3: 4.12 Extension seam                                     L602
  H3: 4.13 Scale continuity                                    L612
H2: 5. Canonical repo topology                               L635
  H3: 5.1 Public SDK surfaces                                 L715
  H3: 5.2 Services may be flat or family-nested               L739
  H3: 5.3 Service family rules                                L759
  H3: 5.4 Repositories are not a top-level architectural kind  L782
  H3: 5.5 Plugin roots are role-first and surface-explicit    L815
  H3: 5.6 Runtime internals stay under packages/core/runtime/* L832
  H3: 5.7 No file-tree encoding of operational topology       L845
H2: 6. Service model                                          L859
  H3: 6.1 Service posture                                     L860
  H3: 6.2 What services own                                   L881
  H3: 6.3 What services do not own                            L899
  H3: 6.4 Canonical service-boundary lanes                    L920
  H3: 6.5 Service dependency helpers                          L934
  H3: 6.6 defineService(...)                                  L952
  H3: 6.7 Service procedure contracts                         L963
  H3: 6.8 Golden service shell                                L975
  H3: 6.9 Service-internal ownership law                      L1016
  H3: 6.10 Repository, DB, and policy seams                   L1028
  H3: 6.11 Shared DB versus shared ownership                  L1049
  H3: 6.12 Cross-service calls preserve service ownership     L1068
  H3: 6.13 Service truth versus machine capabilities          L1077
H2: 7. Resource, provider, and profile model                  L1087
  H3: 7.1 Resource posture                                    L1088
  H3: 7.2 What resources own                                  L1128
  H3: 7.3 Resource requirements                               L1143
  H3: 7.4 Provider posture                                    L1158
  H3: 7.5 Provider selection                                  L1195
  H3: 7.6 RuntimeProfile posture                              L1199
  H3: 7.7 Resource/provider/profile laws                      L1231
  H3: 7.8 Resource catalog topology                           L1248
H2: 8. Plugin model                                           L1266
  H3: 8.1 Plugin posture                                      L1267
  H3: 8.2 Plugin definition                                   L1285
  H3: 8.3 Lane index: topology and builder agreement          L1293
  H3: 8.4 Service use and resource requirements inside plugins L1320
  H3: 8.5 Public server API projection                        L1328
  H3: 8.6 Trusted server internal projection                  L1342
  H3: 8.7 Async projection                                    L1349
  H3: 8.8 CLI projection                                      L1371
  H3: 8.9 Web projection                                      L1379
  H3: 8.10 Agent projection                                   L1388
  H3: 8.11 Desktop projection                                 L1404
  H3: 8.12 Plugin authoring invariants                        L1415
H2: 9. App model                                              L1429
  H3: 9.1 App posture                                         L1430
  H3: 9.2 App composition posture                             L1440
  H3: 9.3 App authoring law                                   L1473
  H3: 9.4 Runtime profiles and process defaults               L1496
  H3: 9.5 Entrypoints                                         L1515
  H3: 9.6 App selection, process shape, and surface remain distinct L1565
H2: 10. Runtime realization                                   L1577
  H3: 10.1 Runtime realization stance                         L1578
  H3: 10.2 Runtime realization lifecycle                      L1625
  H3: 10.3 Import safety and declaration discipline           L1643
  H3: 10.4 SDK derivation                                     L1651
  H3: 10.5 Runtime compiler                                   L1669
  H3: 10.6 Bootgraph and provisioning kernel                  L1699
  H3: 10.7 Runtime-owned lifetimes                            L1725
  H3: 10.8 Runtime access                                     L1753
  H3: 10.9 Service binding                                    L1771
  H3: 10.10 Workflow dispatcher and async integration         L1789
  H3: 10.11 Surface adapter lowering                          L1797
  H3: 10.12 Harness and native boundary                       L1804
  H3: 10.13 RuntimeCatalog, diagnostics, and telemetry        L1813
H2: 11. Runtime roles and surfaces                            L1828
  H3: 11.1 Canonical runtime roles                            L1829
  H3: 11.2 server                                             L1847
  H3: 11.3 async                                              L1864
  H3: 11.4 web                                                L1881
  H3: 11.5 cli                                                L1895
  H3: 11.6 agent                                              L1908
  H3: 11.7 desktop                                            L1936
  H3: 11.8 Shell versus stewards                              L1976
  H3: 11.9 One orchestrator, two ingress classes              L1999
  H3: 11.10 Trusted operator boundary rule                    L2007
H2: 12. Agent shell and steward activation                    L2021
  H3: 12.1 OpenShell posture                                  L2022
  H3: 12.2 Canonical runtime binding                          L2049
  H3: 12.3 Shell activation flow                              L2063
  H3: 12.4 Internal and product-triggered activation          L2074
  H3: 12.5 Direct work versus delegated work                  L2082
  H3: 12.6 Default shell posture                              L2105
  H3: 12.7 The shell is not the devplane                      L2116
  H3: 12.8 The shell is not a public concierge                L2124
H2: 13. Stack binding                                         L2133
  H3: 13.1 Server harness posture                             L2157
  H3: 13.2 Async harness posture                              L2177
  H3: 13.3 CLI harness posture                                L2195
  H3: 13.4 Web harness posture                                L2213
  H3: 13.5 Agent harness posture                              L2232
  H3: 13.6 Desktop harness posture                            L2253
  H3: 13.7 Harness law                                        L2272
H2: 14. Operational mapping and growth model                  L2280
  H3: 14.1 Default topology stance                            L2281
  H3: 14.2 Baseline local posture                             L2307
  H3: 14.3 Trusted shell placement posture                    L2322
  H3: 14.4 Optional cohosted dev mode                         L2334
  H3: 14.5 Service-centric platform mapping                   L2354
  H3: 14.6 Service-centric production default                 L2373
  H3: 14.7 Desktop operational mapping                        L2393
  H3: 14.8 Growth model                                       L2403
  H3: 14.9 Scale continuity                                   L2424
H2: 15. Schema, config, diagnostics, and policy boundaries    L2450
  H3: 15.1 RuntimeSchema                                      L2451
  H3: 15.2 Schema ownership split                             L2469
  H3: 15.3 Config and secrets                                 L2483
  H3: 15.4 Diagnostics                                        L2498
  H3: 15.5 Telemetry                                          L2525
  H3: 15.6 Policy primitives                                  L2539
  H3: 15.7 Cache and control-plane boundaries                 L2554
H2: 16. Mechanical enforcement orientation                    L2573
H2: 17. Canonical invariants                                  L2612
  H3: 17.1 Ontology invariants                                L2615
  H3: 17.2 Ownership invariants                               L2625
  H3: 17.3 Dependency invariants                              L2639
  H3: 17.4 App and entrypoint invariants                      L2647
  H3: 17.5 Resource/provider/profile invariants               L2658
  H3: 17.6 Bootgraph and provisioning invariants              L2668
  H3: 17.7 Service binding invariants                         L2679
  H3: 17.8 Runtime subsystem invariants                       L2691
  H3: 17.9 Plugin invariants                                  L2703
  H3: 17.10 Service ownership invariants                      L2714
  H3: 17.11 Shell and steward invariants                      L2725
  H3: 17.12 Control-plane invariant                           L2733
H2: 18. Forbidden patterns                                    L2743
H2: 19. What remains flexible                                 L2790
H2: 20. Final canonical picture                               L2822
```

**Total H2 sections: 20 | Total H3 sections: ~99 | Total headings: ~119**

---

## 3. Per-Section Digest

### Section 1: Scope (arch-spec L4–L89)

**What it establishes:** The architecture spec frames itself as the canonical integration layer that owns all top-level vocabulary, the runtime realization lifecycle, the process-local runtime substrate, and the durable ontology. Three durable separations are named: semantic separation (support matter ≠ capability contract ≠ semantic truth ≠ runtime projection ≠ app composition authority), realization separation (stable architecture ≠ runtime realization), and authority separation (shell authority ≠ steward execution authority). The runtime realization lifecycle is asserted here as a 7-phase chain: `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`. The `startApp(...)` operational chain is also sketched.

**Integration-surface vs runtime-internal classification:** This section is mostly **system-level architecture**. The lifecycle phase names and semantic separations are appropriately at this level. However, "the process-local runtime substrate" (L12) is claimed as something the arch-spec "fixes" — this blurs into territory that the runtime realization spec owns in more depth.

**Duplication-or-complementarity vs runtime spec:** The lifecycle phase names (`definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`) appear identically in the runtime realization spec. The arch-spec is establishing the canonical names so companion specs can attach to them — this is appropriate. There is a potential tension: the arch-spec claims to fix "the runtime realization lifecycle" itself (not just reference it), which may collide with the runtime spec's authority over runtime concerns.

---

### Section 2: Architectural posture (arch-spec L91–L160)

**What it establishes:** The load-bearing operational chain (`bind -> project -> compose -> realize -> observe`) and the critical result of "scale continuity." Restates the lifecycle phases. Introduces the universal shape table (Section 2.1) showing all output shapes (public API, internal API, durable workflow, schedule, consumer, shell, steward, CLI, web, desktop) with their projection paths. Section 2.2 fixes the truth/surface/composition axioms.

**Integration-surface vs runtime-internal:** The universal shape table (arch-spec L124–L138) is **integration-surface level**: it maps output shapes to plugin paths and role assignments, which is the right level for an integration document. The lifecycle re-statement (arch-spec L103–L109) is appropriate as canonical vocabulary.

**Duplication-or-complementarity:** The universal shape table is a strong integration anchor that the runtime spec should not need to repeat. The role → surface → harness mapping sketched here is appropriate here and not a duplication of runtime internals.

---

### Section 3: Core ontology (arch-spec L163–L413)

**What it establishes:** The canonical repository roots (packages, resources, services, plugins, apps), stable semantic nouns glossary (L181–L215), runtime realization nouns glossary (L198–L215), resource/boundary nouns glossary (L218–L232), service-boundary lanes (L234–L244), agent subsystem nouns (L246–L255), and extended definitions of each noun (L257–L412 for packages, resources, providers, services, plugins, apps, bootgraph, process runtime, shell gateway).

**Integration-surface vs runtime-internal:** The noun definitions are appropriately at the integration level: they define what each concept IS (authority and ownership), not HOW each is implemented. The bootgraph definition (arch-spec L363–L380) and process runtime definition (arch-spec L383–L398) give ownership inventories that describe RAWR's boundary with Effect — this is load-bearing for integration. The statement "The hidden execution substrate beneath bootgraph and process runtime is Effect-backed. It is process-local runtime machinery and not a peer public ontology layer." (arch-spec L217–L218) appropriately defers the Effect interior.

**Duplication-or-complementarity:** The `RuntimeResource`, `RuntimeProvider`, `RuntimeProfile`, `ProviderSelection`, `ResourceRequirement`, `ResourceLifetime` nouns (arch-spec L220–L232) are defined at the level of "what they are" — this is appropriate for the integration layer. The runtime spec presumably defines HOW they are implemented. The `bootgraph` definition in the arch-spec (arch-spec L363–L380) includes "bootgraph input to the Effect-backed provisioning kernel" which is a dependency-direction statement (appropriate here). The concern is whether the runtime spec adds more phases, sub-phases, or operational sequencing inside those nouns that the arch-spec is unaware of.

---

### Section 4: Canonical laws (arch-spec L415–L633)

**What it establishes:** 13 laws governing ownership, semantic direction, stable architecture vs runtime realization (4.3), service boundary priority ordering (4.4), the operational chain (4.5), assembly/dependency law (4.6), shared infrastructure semantics (4.7), namespace law (4.8), harness/substrate choice law (4.9), ingress/execution split (4.10), shell vs steward authority (4.11), extension seam constraint (4.12), and scale continuity (4.13).

**Integration-surface vs runtime-internal:** These are all **system-level architecture** — boundary ownership and direction rules. Section 4.3 (arch-spec L447–L476) is the most load-bearing: it states the stable architecture and the runtime realization lifecycle as separate facts, and draws the concrete process stack as:
```
entrypoint -> @rawr/sdk derivation -> runtime compiler -> bootgraph -> Effect provisioning kernel -> process runtime -> surface adapters -> harnesses -> process -> machine
```
This is an integration-level diagram. It is appropriate here. It does NOT describe what happens inside Effect provisioning kernel — that is correctly deferred.

**Duplication-or-complementarity:** Section 4.9 (arch-spec L558–L567) names Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts as "native interiors behind RAWR-shaped boundaries." This is the correct integration posture. The arch-spec correctly states WHAT these technologies are (downstream harnesses/substrates) without describing their internal mechanics.

---

### Section 5: Canonical repo topology (arch-spec L635–L857)

**What it establishes:** The canonical file tree (full directory structure), public SDK surfaces table, services flat vs. family-nested rules, service family rules, repositories as service-internal, plugin roots as role-first, runtime internals under `packages/core/runtime/*`, and the "no file-tree encoding of operational topology" rule.

**Integration-surface vs runtime-internal:** The file tree is **system-level architecture** (structural schema). The public SDK surfaces table (arch-spec L719–L733) is an **integration contract**: it names every public import path as `@rawr/sdk/*` — this is exactly what companion specs and harness authors need to know.

**Duplication-or-complementarity:** Section 5.6 (arch-spec L832–L843) lists what runtime internals live under `packages/core/runtime/*` — this is an integration boundary statement (the arch-spec says where runtime internals LIVE, not what they do). The runtime spec presumably describes what happens inside those packages. No duplication concern here.

---

### Section 6: Service model (arch-spec L859–L1085)

**What it establishes:** Service posture (oRPC as default callable boundary), what services own and don't own, canonical service-boundary lanes (`deps`/`scope`/`config`/`invocation`/`provided`), dependency helpers (`resourceDep`, `serviceDep`, `semanticDep`), `defineService(...)` contract, service procedure contracts, golden service shell file structure, service-internal ownership law, repository/DB/policy seams, shared DB, cross-service calls, and service truth vs machine capabilities.

**Integration-surface vs runtime-internal:** The service model is mostly **system-level architecture** (what services own and how they relate to other parts). The service boundary lanes section (arch-spec L920–L933) is also an **integration contract**: the lanes define what the runtime must carry, which is information the runtime realization spec needs. Specifically: "Service binding is construction-time over `deps`, `scope`, and `config`. Invocation does not participate in construction-time binding and never participates in `ServiceBindingCacheKey`." (arch-spec L243–L244) — this is both integration-contract and runtime-internal, straddling the boundary.

**Duplication-or-complementarity:** Section 6.6 (`defineService(...)`, arch-spec L952–L962) describes what the SDK does with service declarations: "The SDK normalizes resource dependencies, service dependencies, semantic dependencies, runtime-carried schemas, metadata, and boundary identity into the normalized authoring graph." This is stated at the appropriate integration level — what the SDK output IS, not how it works internally. No problematic duplication.

---

### Section 7: Resource, provider, and profile model (arch-spec L1087–L1265)

**What it establishes:** Resource posture, what resources own (stable identity, consumed value shape, allowed lifetimes, runtime config schema, diagnostic snapshot hooks, provider selector surfaces), resource requirements contract, provider posture and what providers own, provider selection, RuntimeProfile posture, resource/provider/profile laws, and resource catalog topology.

**Integration-surface vs runtime-internal:** This is **integration-contract level** — it defines the API surface between app authors and the runtime provisioning system. The provider laws (arch-spec L1231–L1247) are particularly load-bearing: "the SDK derives normalized `ProviderSelection` artifacts; the runtime compiler validates provider coverage and provider dependency closure; Bootgraph receives provider ordering input; the provisioning kernel loads config, redacts secrets, and acquires selected providers." This correctly assigns each step to the right owner without descending into implementation.

**Duplication-or-complementarity:** Section 7.4 (Provider posture, arch-spec L1158–L1191) states "A provider may use Effect directly inside provider/runtime implementation." This is appropriate as an integration permission statement. The concern: the runtime spec may describe Effect layer composition rules that constrain HOW providers use Effect — the arch-spec stays appropriately at "may use Effect" without specifying the internals.

---

### Section 8: Plugin model (arch-spec L1266–L1427)

**What it establishes:** Plugin posture (runtime projection only), plugin definition and factory contract, lane index table (topology + builder agreement), service use and resource requirements inside plugins, per-surface-type plugin descriptions (server API, internal, async, CLI, web, agent, desktop), and plugin authoring invariants.

**Integration-surface vs runtime-internal:** The lane index table (arch-spec L1299–L1314) is a **critical integration contract**: it maps plugin topology path to builder family to projection identity. The async projection lowering chain (arch-spec L1358–L1368): `WorkflowDefinition -> SDK normalized async surface plan -> runtime compiled async surface plan -> async SurfaceAdapter -> FunctionBundle -> Inngest harness` — this is at the right level (shows the chain without Inngest internals).

**Duplication-or-complementarity:** The mention of `FunctionBundle` as "harness-facing and internal" (arch-spec L1367) is an appropriate integration note: the arch-spec is telling plugin authors NOT to construct it, which is an integration boundary. The runtime spec presumably defines what `FunctionBundle` is internally.

---

### Section 9: App model (arch-spec L1429–L1574)

**What it establishes:** App posture, app composition file (`defineApp(...)`), app authoring law, runtime profiles and process defaults, entrypoints (`startApp(...)`), and the distinctness of app selection/process shape/surface.

**Integration-surface vs runtime-internal:** This section is **system-level architecture + integration contract**. The entrypoint code example (arch-spec L1542–L1551) is the canonical example of how `startApp(...)` is called — this is an integration contract showing the public API shape. The statement "Each `startApp(...)` invocation starts exactly one process runtime assembly" (arch-spec L1528) is an important integration invariant.

**Duplication-or-complementarity:** The arch-spec (arch-spec L1514) says "The SDK derives normalized `ProviderSelection` artifacts from the profile. The runtime compiler validates provider coverage and provider dependency closure. Bootgraph receives provider ordering input. The provisioning kernel loads config, redacts secrets, and acquires selected providers." — this accurately describes the integration handoff chain without duplicating runtime internals.

---

### Section 10: Runtime realization (arch-spec L1577–L1825)

**What it establishes:** Runtime realization stance (RAWR owns semantic meaning, Effect owns provisioning mechanics), what runtime realization owns vs does not own, the 7-phase lifecycle table (with producer/consumer columns), import safety, SDK derivation ownership list, runtime compiler validation list and emission list, bootgraph/provisioning kernel description with the RAWR-vs-Effect control split, 4 runtime-owned lifetimes, runtime access nouns, service binding (construction-time, cache key), workflow dispatcher, surface adapter lowering rule, harness/native boundary, and RuntimeCatalog/diagnostics/telemetry.

**Integration-surface vs runtime-internal classification:** This is the most complex section. Parts of it are appropriately at integration level; parts may be duplicating runtime internals. Key judgements:

- The 7-phase lifecycle TABLE (arch-spec L1633–L1641) with Producer/Consumer columns is **load-bearing integration contract**: it defines what each phase must output, who produces it, who consumes it. Appropriate here.
- Section 10.6 (bootgraph/provisioning kernel, arch-spec L1699–L1723) lists what the provisioning kernel owns: "one root managed runtime per started process; process scope and role child scopes; resource acquisition and release from compiled provider plans; config loading, validation, and redaction; structured runtime errors; runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics; runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry; reverse-order deterministic disposal." — This is detailed enough that it may overlap significantly with what the runtime realization spec describes as the Effect Layer substrate. The arch-spec is asserting OWNERSHIP at the level of "what it is responsible for," which is appropriate, but the level of detail (queues, pubsub, refs, fibers, semaphores) starts to look like internal runtime mechanics that the runtime spec owns.
- The 4 runtime-owned lifetimes (arch-spec L1725–L1751): `process / role / invocation / call-local` — this is an **integration contract**: callers across the system need to know which lifetime their resources use. Appropriate here.
- Runtime access nouns (arch-spec L1753–L1768): `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess` — these are **public integration surface names** that plugin/service/harness authors need. Appropriate.
- Service binding section (arch-spec L1771–L1786) repeats `ServiceBindingCacheKey` excludes invocation — appropriate as invariant enforcement.
- Section 10.10 (WorkflowDispatcher, arch-spec L1789–L1795): calls out `WorkflowDispatcher` as "a live runtime/SDK integration artifact materialized by the process runtime" — this is an integration surface concept, appropriate.
- Section 10.13 (RuntimeCatalog, diagnostics, telemetry, arch-spec L1813–L1824): describes the three observability constructs and their owners. Appropriate integration-level description.

**Duplication-or-complementarity:** The arch-spec describes runtime realization to a depth that may overlap with the runtime spec — particularly the provisioning kernel ownership list (arch-spec L1712–L1722). If the runtime spec defines these same items with a different authority model (e.g., it has a different name for some of the sub-primitives, or it has added sub-phases to "provisioning"), there is a risk of contradiction. This is the highest-risk section for conflict.

---

### Section 11: Runtime roles and surfaces (arch-spec L1828–L2019)

**What it establishes:** The 6 canonical runtime roles (`server`, `async`, `web`, `cli`, `agent`, `desktop`) as peer roles. Per-role ownership descriptions. Agent role's 3 surfaces (`channels`, `shell`, `tools`). Desktop role's 3 surfaces (`menubar`, `windows`, `background`). Shell vs stewards boundary. One orchestrator / two ingress classes. Trusted operator boundary rule.

**Integration-surface vs runtime-internal:** This is **system-level architecture**: it defines the role taxonomy, surface names, and their respective authorities. The Inngest callout (arch-spec L1878–L1880): "For business-level async work that benefits from retries, durability, scheduling, and execution timelines, Inngest is the default durability harness." — This is a **vendor integration claim** at an appropriate level (naming the harness, not its internals).

**Duplication-or-complementarity:** The async role description (arch-spec L1864–L1880) describes coverage categories (workflows, schedules, consumers, background jobs, durable steward execution, observation-driven activation, internal feedback loops). The runtime spec may have a more precise characterization of the async role's internal mechanics. The arch-spec stays at the right level (WHAT the async role covers, not HOW it is internally realized).

---

### Section 12: Agent shell and steward activation (arch-spec L2021–L2130)

**What it establishes:** OpenShell posture (default substrate beneath shell-facing `agent` role, what it provides and what it does NOT replace), canonical runtime binding table (L2050–L2061), shell activation flow (6-step sequence), internal vs product-triggered activation, direct vs delegated work categories, default shell posture, "shell is not devplane," "shell is not public concierge."

**Integration-surface vs runtime-internal:** The canonical runtime binding table (arch-spec L2050–L2061) is a strong **integration contract**: it maps each concern to its canonical binding. This belongs in the arch-spec. The shell activation flow (arch-spec L2065–L2072) is a **system-level orchestration description** — appropriate here as the integration doc.

**Duplication-or-complementarity:** OpenShell is named here (arch-spec L2022–L2046) as "the default runtime substrate and policy envelope beneath the shell-facing part of the `agent` role." The arch-spec lists what OpenShell does NOT replace (app composition file, SDK derivation, runtime compiler, bootgraph, Effect-backed provisioning kernel, process runtime, async role, Inngest, domain stewards, repo governance, service ownership). This is a correct boundary-drawing exercise appropriate to the integration doc.

---

### Section 13: Stack binding (arch-spec L2133–L2277)

**What it establishes:** Names the full canonical technology stack (Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, OpenShell/agent, desktop hosts, shell gateway). Per-harness process stack diagrams for server, async, CLI, web, agent, and desktop. Harness law.

**Integration-surface vs runtime-internal:** The per-harness stack diagrams (arch-spec L2158–L2270) are **integration contracts**: they show the end-to-end flow from services through to native hosts for each role. These are appropriate in the arch-spec because they define the integration shape that companion specs attach to. The stack diagrams are thin (they show the chain, not the internals of each step).

**Duplication-or-complementarity:** The async process stack (arch-spec L2178–L2192) shows `FunctionBundle -> Inngest harness` as the harness boundary. The runtime spec may describe what `FunctionBundle` contains internally. The arch-spec correctly leaves `FunctionBundle` as an internal artifact ("harness-facing and internal," arch-spec L1367) — no duplication as long as that boundary is respected.

---

### Section 14: Operational mapping and growth model (arch-spec L2280–L2448)

**What it establishes:** Default topology (one `hq` app, 4 long-running roles), baseline local posture (split processes on one machine), trusted shell placement posture, optional cohosted dev mode, service-centric platform mapping (role → platform service → replicas), service-centric production default (one platform service per long-running role), desktop operational mapping, growth model (split at app boundary), scale continuity.

**Integration-surface vs runtime-internal:** This section is **system-level architecture** — deployment topology and growth model. The platform mapping (arch-spec L2354–L2371) is an integration contract for the deployment/control plane: "the app controls identity, roles, surfaces, valid process shapes, runtime profiles, and selected providers; the platform controls which entrypoint a service runs, build/start behavior, networking, supervision, and replica count."

**Duplication-or-complementarity:** No significant duplication risk here. This is deployment-level content the runtime spec does not own.

---

### Section 15: Schema, config, diagnostics, and policy boundaries (arch-spec L2450–L2570)

**What it establishes:** `RuntimeSchema` as the canonical schema facade for runtime-owned schema declarations. Schema ownership split table (who owns which schema, in what form). Config and secrets locked behavior. Runtime diagnostics enumeration (what diagnostics cover). Telemetry layer ownership table. Policy primitives table. Cache and control-plane boundaries table.

**Integration-surface vs runtime-internal:** The schema ownership split table (arch-spec L2469–L2481) is a definitive **integration contract**: it specifies exactly which boundary owns which schema in what form. This is the correct level for the arch-spec. The diagnostics enumeration (arch-spec L2499–L2521) describes what the runtime MUST diagnose — this is an integration requirement that harness/service authors need. The telemetry table (arch-spec L2526–L2536) appropriately assigns telemetry layers to owners.

**Duplication-or-complementarity:** The config locked behavior (arch-spec L2490–L2496) describes "config loads once per process unless a provider declares refresh behavior; config validates through `RuntimeSchema`; secrets redact at the config boundary; supported source kinds include environment, dotenv, file, memory, and test." The runtime spec may describe these mechanics in more detail. The arch-spec is at the right level (policy, not mechanism).

---

### Section 16: Mechanical enforcement orientation (arch-spec L2573–L2608)

**What it establishes:** The `canon -> graph -> proof -> ratchet` enforcement direction. What the graph encodes. The enforcement consequences list (13 enforcement implications).

**Integration-surface vs runtime-internal:** This is **system-level architecture** — enforcement philosophy. The enforcement consequences list names rules that apply across all boundaries. No runtime internal detail is exposed here.

---

### Section 17: Canonical invariants (arch-spec L2612–L2740)

**What it establishes:** 12 invariant groups: ontology, ownership, dependency, app/entrypoint, resource/provider/profile, bootgraph/provisioning, service binding, runtime subsystem, plugin, service ownership, shell/steward, control-plane.

**Integration-surface vs runtime-internal:** These invariants are the **most load-bearing integration contracts** in the document. They define what MUST be true across the system for any companion spec to correctly attach. Section 17.8 (runtime subsystem invariants, arch-spec L2691–L2700) names the lifecycle, runtime access nouns, and harness/adapter contract. These are appropriate as invariants — they don't describe how bootgraph works internally, they describe what must be observable as output.

**Duplication-or-complementarity:** The bootgraph/provisioning invariants (arch-spec L2668–L2678) state: "each started process owns one root managed runtime; process, role, invocation, and call-local remain distinct runtime lifetimes; runtime-local queues, pubsub, schedules, refs, fibers, and caches are process-local mechanics." If the runtime spec has evolved this (e.g., added sub-scopes to the managed runtime, or changed the fiber model), these invariants could be stale. This is a live concern.

---

### Section 18: Forbidden patterns (arch-spec L2743–L2787)

**What it establishes:** 37 named forbidden patterns across all architecture layers.

**Integration-surface vs runtime-internal:** These are **architectural enforcement rules** spanning all layers. Critically, several forbidden patterns name raw Effect vocabulary as forbidden in ordinary authoring: "public raw `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring for ordinary service, plugin, app, or entrypoint work" (arch-spec L2775–L2776). This is an **integration boundary enforcement rule** — appropriate here because it defines what the public SDK boundary protects against.

---

### Section 19: What remains flexible (arch-spec L2790–L2818)

**What it establishes:** Explicit list of ~25 implementation details that may vary without reopening the architecture.

**Integration-surface vs runtime-internal:** Appropriate at this level — it draws the boundary between what the arch-spec owns (fixed) and what it defers (flexible). Notably: "exact internal shape of runtime-owned Effect services and low-level tags" (arch-spec L2799) is listed as flexible — this is correct deference to the runtime spec.

---

### Section 20: Final canonical picture (arch-spec L2822–L2955)

**What it establishes:** Mermaid flowchart of the full system (Support → Truth → Projection → App → SDK → Runtime → Harnesses), textual re-statement of each phase's meaning, canonical public SDK family, and the canonical system summary.

**Integration-surface vs runtime-internal:** This is **system-level architecture** — the canonical synthesis. The flowchart (arch-spec L2824–L2895) is an integration diagram that makes the cross-system dependencies explicit. It includes the `durable steward handoff` edge from `AG` (OpenShell/agent host) to `IH` (Inngest) — this is an important integration relationship the arch-spec exposes.

---

## 4. Integration Surfaces the Spec Currently Exposes

### 4a. Public SDK Integration Surface

The arch-spec defines the public SDK import surface (arch-spec L719–L733):

| Surface | Owner |
|---|---|
| `@rawr/sdk/app` | App and entrypoint authoring |
| `@rawr/sdk/service` | Service authoring |
| `@rawr/sdk/plugins/server` | Server projection authoring |
| `@rawr/sdk/plugins/async` | Async projection authoring |
| `@rawr/sdk/plugins/cli` | CLI projection authoring |
| `@rawr/sdk/plugins/web` | Web projection authoring |
| `@rawr/sdk/plugins/agent` | Agent projection authoring |
| `@rawr/sdk/plugins/desktop` | Desktop projection authoring |
| `@rawr/sdk/runtime/resources` | Runtime resource declarations |
| `@rawr/sdk/runtime/providers` | Runtime provider declarations |
| `@rawr/sdk/runtime/profiles` | Runtime profile declarations |
| `@rawr/sdk/runtime/schema` | `RuntimeSchema` facade |

The arch-spec also lists the canonical public SDK function family (arch-spec L2929–L2934): `defineApp(...)`, `startApp(...)`, `defineService(...)`, `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, role/surface builders + `useService(...)`, `defineRuntimeResource(...)`, `defineRuntimeProvider(...)`, `defineRuntimeProfile(...)`, `providerSelection(...)`, `RuntimeSchema`.

### 4b. Runtime lifecycle integration hooks

The lifecycle table (arch-spec L1633–L1641) defines the producer/consumer handoff chain — each entry is an integration point:
- **Definition → SDK derivation**: App, plugin, resource, provider, profile declarations → `@rawr/sdk`
- **SDK derivation → Runtime compiler**: Normalized authoring graph, plan artifacts → Runtime compiler
- **Runtime compiler → Bootgraph/process runtime/adapters**: Compiled process plan, provider graphs, surface plans
- **Bootgraph/kernel → Process runtime**: Provisioned process, live process/role access, startup records
- **Process runtime/adapters/harnesses → Native hosts + catalog**: Bound services, mounted surface records, adapter-lowered payloads, started harness handles
- **Runtime + diagnostics → Diagnostic readers + control-plane touchpoints**: RuntimeCatalog, diagnostics, telemetry, topology records

### 4c. Harness integration boundaries

Per-role stack diagrams (arch-spec L2157–L2270) define the integration contract for each harness:
- **Elysia + oRPC**: Consumes mounted server surfaces from process runtime/adapters (arch-spec L2170)
- **Inngest**: Consumes `FunctionBundle` from async surface adapter (arch-spec L2189)
- **OCLIF**: Consumes OCLIF command payloads from process runtime/adapters (arch-spec L2207)
- **Web hosts**: Consume web host payloads from process runtime/web adapters (arch-spec L2228)
- **OpenShell/agent host**: Consumes mounted agent surfaces from process runtime/agent adapters (arch-spec L2248)
- **Desktop host**: Consumes mounted desktop surfaces from process runtime/desktop adapters (arch-spec L2265)

### 4d. Companion-subsystem integration contract

The arch-spec states explicitly (arch-spec L24): "Subsystem specifications attach to it at explicit integration boundaries." However, it does NOT enumerate what those integration boundaries are for companion specs. This is a gap: there is no formal "companion-spec attachment points" section that tells a companion doc author exactly where/how to attach.

### 4e. Vendor SDK integration shapes named

- **Effect**: "Effect owns provisioning mechanics inside runtime." (arch-spec L1581–L1582); `packages/core/runtime/substrate` as the hidden Effect-backed provisioning substrate (arch-spec L2136–L2137). Effect use is permitted inside provider/runtime implementation only (arch-spec L1189–L1190).
- **Inngest**: Default durability harness for async (arch-spec L1878–L1880); appears in per-role stack diagram as terminal harness (arch-spec L2189–L2192).
- **oRPC**: Local-first callable boundary for services (arch-spec L864–L878); service procedure contracts may use oRPC primitives (arch-spec L963–L969).
- **Elysia**: Default HTTP harness for server runtime (arch-spec L2140–L2141).
- **OCLIF**: Default CLI command harness (arch-spec L2142).
- **OpenShell**: Default runtime substrate for shell-facing `agent` role (arch-spec L2022–L2046); OpenShell-backed agent runtime (arch-spec L2247).

### 4f. Deployment / control-plane integration

The arch-spec names control-plane touchpoints but defers their architecture (arch-spec L2568–L2569): "Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy. Runtime realization emits the records that allow placement systems to reason; it does not decide placement."

The spec does NOT name a specific control-plane technology or protocol — this is intentionally deferred.

### 4g. Observability integration

The arch-spec names the three observability constructs:
- `RuntimeCatalog` — diagnostic read model (arch-spec L1816–L1818)
- `RuntimeDiagnostic` — structured findings (arch-spec L1820–L1821)
- `RuntimeTelemetry` — carries context through all phases (arch-spec L1822–L1823)

These are integration surfaces for observability tooling. The arch-spec does not name the observability backend (telemetry backend is listed as flexible, arch-spec L2813).

---

## 5. Runtime-Internal Concepts the Architecture Spec Might Be Duplicating

The following places in the arch-spec describe mechanics that belong primarily inside the runtime realization spec. These are duplication-risk candidates:

### 5.1 Provisioning kernel ownership inventory (arch-spec L1712–L1722)

The arch-spec lists what the Effect provisioning kernel owns:
> "one root managed runtime per started process; process scope and role child scopes; resource acquisition and release from compiled provider plans; config loading, validation, and redaction; structured runtime errors; runtime-local queues, pubsub, refs, schedules, caches, fibers, and semaphores as process-local mechanics; runtime annotations, spans, lifecycle telemetry, and provider acquisition telemetry; reverse-order deterministic disposal."

This is a detailed operational inventory that the runtime realization spec presumably also describes in its own terms (using Effect-specific vocabulary like `ManagedRuntime`, `Layer`, `Scope`). The arch-spec is asserting what it is responsible for, but the level of detail (queues, pubsub, refs, fibers) arguably belongs in the runtime spec's Effect Layer description. If the runtime spec has added or renamed any of these primitives, the arch-spec's list is stale.

**Why it looks like duplication:** The arch-spec's job is to name the bootgraph/kernel as an entity and assign its boundary — not enumerate its internal Process-Effect runtime primitives. The primitive list (queues, pubsub, refs, fibers, semaphores) is runtime-internal detail.

### 5.2 Runtime compiler validation and emission lists (arch-spec L1673–L1695)

The arch-spec lists every item the runtime compiler validates and emits. This is a detailed contract that likely duplicates what the runtime realization spec describes as the runtime compiler's output contract.

**Why it looks like duplication:** The arch-spec should name the runtime compiler and state what role it plays in the chain, but the exhaustive validation list (topology and builder agreement, provider coverage, provider dependency closure, service dependency closure, service binding DAG shape, harness targets, surface adapter targets) is a runtime-internal implementation contract. The arch-spec could say "the runtime compiler validates coverage and dependency closure and emits one compiled process plan" without listing every item it validates.

### 5.3 SDK derivation ownership list (arch-spec L1655–L1665)

The arch-spec lists every artifact the SDK produces:
> "normalized authoring graph; canonical identities; resource requirements; normalized provider selections; service binding plans; surface runtime plan descriptors; workflow dispatcher descriptors; portable plan artifacts; derivation diagnostics."

The runtime spec likely also describes these artifacts because the runtime compiler depends on them. This is a case where both specs need to describe the interface — the arch-spec at the "what the SDK produces" level, the runtime spec at the "what the runtime compiler consumes" level. If they use different terminology or a different set of artifacts, this is a latent conflict.

### 5.4 WorkflowDispatcher internal description (arch-spec L1789–L1795)

The arch-spec says: "`WorkflowDispatcher` is a live runtime/SDK integration artifact materialized by the process runtime from selected workflow definitions plus the provisioned process async client." It goes on to describe what the dispatcher does and does not do. This is arguably a runtime-internal artifact whose description belongs in the runtime spec.

### 5.5 Service binding cache details (arch-spec L1771–L1786, L2681–L2689)

The arch-spec describes the service binding cache in operational detail: "compiled service binding plan consumption; resource dependency resolution; sibling service client resolution; semantic adapter resolution; service binding cache; live service client construction." The cache-key exclusion rule (`ServiceBindingCacheKey` excludes invocation) is a runtime implementation contract. Whether this belongs in the arch-spec depends on whether it is needed by service authors — arguably the cache key is a runtime concern that service authors only need to know the boundary rule for (not the mechanism).

---

## 6. Integration Concepts the Architecture Spec Is Missing

The following are integration touchpoints where the arch-spec is silent or under-specified, which the runtime spec implies are needed:

### 6.1 Runtime↔harness boundary contract (what harnesses receive)

The arch-spec states harnesses "consume mounted surface runtime records and adapter-lowered payloads" (arch-spec L1804–L1808) and names per-role stack diagrams. However, it does NOT define what a "mounted surface runtime record" IS as an interface type — what fields it must expose, what contract a harness implementer can rely on, and what RAWR guarantees about its shape before handing off. A companion harness spec or vendor integration guide would have no formal interface definition to attach to.

**Gap:** No formal integration contract for the harness-mount input shape. The arch-spec should define (at minimum by reference to a type name) the boundary contract that adapters produce and harnesses consume.

### 6.2 The Inngest connect-worker lifecycle shape

The arch-spec names Inngest as the async harness but does not describe the integration shape: how does the Inngest harness mount? What does the Inngest harness receive from the async surface adapter? What is the connect-worker model (serve-mode vs. connect-worker mode) at RAWR's boundary? The async stack diagram (arch-spec L2178–L2192) terminates at `FunctionBundle -> Inngest harness` without defining the FunctionBundle contract or the Inngest serve API contract.

**Gap:** The arch-spec should specify (at integration level) whether Inngest runs in serve-mode (HTTP endpoint) or connect-worker mode, because these are architecturally different integration shapes. The runtime spec presumably makes this choice; the arch-spec should reflect it at the system level.

### 6.3 The runtime↔oRPC procedure boundary contract

The arch-spec says oRPC is the local-first callable boundary (arch-spec L864–L878) and that service procedure contracts "may be expressed through oRPC primitives" (arch-spec L963–L969). However, it does NOT define the integration contract between the RAWR process runtime and oRPC at the point of harness mounting: specifically, how an oRPC router is provided to Elysia at the server harness, and what the server surface adapter produces as a harness payload (the Elysia server stack terminates at "Elysia HTTP runtime and oRPC handlers" without describing the binding shape).

**Gap:** The arch-spec should describe the oRPC-Elysia integration shape as an integration contract, even if minimally (e.g., "the server surface adapter produces an oRPC router tree that the Elysia harness mounts as HTTP handlers").

### 6.4 Phase-transition trigger conditions

The lifecycle table (arch-spec L1633–L1641) names phases, producers, and consumers. But the arch-spec does NOT define the conditions under which phases transition — e.g., what triggers compilation vs. derivation, what triggers provisioning, whether compilation is eager or lazy, whether the phases are synchronous or have async gaps. A companion spec integrating at the runtime level needs to know when to expect each phase's output.

**Gap:** No phase-transition triggering or sequencing contract. The arch-spec should state (at minimum) whether the lifecycle is linear/sequential and what starts it.

### 6.5 Error propagation and failure behavior across phase boundaries

The arch-spec describes startup failure in Section 17.6 ("startup failure is fatal for the selected process shape; rollback applies to already-started components in the failed startup subset") but does NOT describe how errors propagate across phase boundaries (e.g., what happens when SDK derivation fails: does the runtime compiler receive a partial plan or no plan? Does the error surface to the entrypoint immediately?).

**Gap:** No error-propagation contract across the lifecycle chain. The arch-spec's Section 15.4 (diagnostics) lists what diagnostics cover but does not specify whether diagnostics are the only error channel or whether phases throw exceptions directly to the entrypoint.

### 6.6 Runtime↔external-system boundary (observability, identity, deployment)

The arch-spec mentions "control-plane touchpoints" (arch-spec L2568–L2569) and names the RuntimeCatalog/diagnostic/telemetry constructs but does NOT define the format, protocol, or endpoint shape of any control-plane or observability integration. There is no named observability backend integration contract (e.g., OpenTelemetry protocol version, health-check endpoint shape, readiness probe contract).

**Gap:** The arch-spec should specify, at an integration level, what observability and control-plane records RAWR emits and in what form — even if only naming that the telemetry backend and catalog storage are configurable (which it does implicitly in Section 19). It should also name whether a standard protocol (e.g., OTLP) is the default.

### 6.7 The runtime↔companion-subsystem attachment protocol

The arch-spec asserts "Subsystem specifications attach to it at explicit integration boundaries" (arch-spec L24) but does NOT enumerate what those attachment points are. A companion spec author reading this document cannot determine:
- Which sections define attachment points
- What formal structure a companion spec must follow to correctly attach
- How naming conflicts between the arch-spec vocabulary and a companion spec's vocabulary are resolved

**Gap:** The arch-spec should have a "companion-spec attachment points" or "integration boundaries registry" section that maps subsystem type → attachment section → required interface contract.

### 6.8 The `RuntimeSchema` adapter boundary

The arch-spec defines `RuntimeSchema` as the schema facade (arch-spec L2451–L2467) but does not describe the runtime spec's internal use of `RuntimeSchema` for Effect codec composition. The runtime spec (if it uses `RuntimeSchema` internally to produce Effect `Schema`-typed validated configs) would create an integration dependency that the arch-spec is silent on.

---

## 7. Vendor-Integration Claims

### 7.1 Effect

**Claims in arch-spec:**
- "Effect owns provisioning mechanics inside runtime." (arch-spec L1581–L1582) — **load-bearing**
- "Effect stays inside runtime realization." (arch-spec L2153) — **load-bearing**
- "`packages/core/runtime/substrate` as the hidden Effect-backed provisioning substrate beneath bootgraph and process runtime" (arch-spec L2136–L2137) — **load-bearing**
- "A provider may use Effect directly inside provider/runtime implementation." (arch-spec L1189) — **load-bearing** (defines who can use Effect)
- "public raw `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring for ordinary service, plugin, app, or entrypoint work" is forbidden (arch-spec L2775–L2776) — **load-bearing** (forbidden pattern)
- "RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination." (arch-spec L1708–L1709) — **load-bearing**

**Verification needed:** The specific Effect constructs named (`Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, `FiberRef`) should be verified against current Effect v3 API to confirm they still exist by those names. Effect has undergone significant API changes between v2 and v3, and the runtime spec may use different Effect primitives. This claim is load-bearing for the alignment recommendation.

**Mark:** Load-bearing — verification recommended.

### 7.2 Inngest

**Claims in arch-spec:**
- "Inngest is the default durable async harness for workflow execution and steward activation" (arch-spec L2142–L2143) — **load-bearing**
- "For business-level async work that benefits from retries, durability, scheduling, and execution timelines, Inngest is the default durability harness." (arch-spec L1878–L1880) — **load-bearing**
- Inngest appears in per-role stack as the terminal consumer of `FunctionBundle` (arch-spec L2189) — **load-bearing**
- "Inngest owns durable async execution semantics." (arch-spec L2193) — **load-bearing**

**Verification needed:** The arch-spec implies Inngest is used in a mode where it consumes RAWR's `FunctionBundle` and mounts native async execution. Whether this is Inngest's serve-mode (HTTP handler) or the newer Inngest connect-worker mode (outbound persistent connection) is architecturally significant and NOT stated in the arch-spec. If the runtime spec uses Inngest connect-worker mode (which changes the harness integration shape from HTTP-in to outbound-persistent), the arch-spec's description of the async stack is incomplete.

**Mark:** Load-bearing — verification of Inngest integration mode recommended.

### 7.3 oRPC

**Claims in arch-spec:**
- "oRPC as the local-first callable boundary for services and synchronous callable surfaces" (arch-spec L2139) — **load-bearing**
- "a service may use oRPC primitives for procedure definition, callable contract shape, context lanes, local invocation, remote transport projection when placement changes" (arch-spec L869–L875) — **load-bearing**
- "oRPC owns procedure and transport mechanics; the service owns the meaning." (arch-spec L967) — **load-bearing**
- "Service semantic observability remains service-owned and oRPC-native inside the service boundary." (arch-spec L1824) — **load-bearing**

**Verification needed:** oRPC's context-lane API shape (whether `deps`/`scope`/`config`/`invocation`/`provided` lanes map to actual oRPC context types) and the local-first callable model need verification against oRPC docs.

**Mark:** Load-bearing — verification recommended.

### 7.4 Elysia

**Claims in arch-spec:**
- "Elysia as the default HTTP harness for server runtime composition" (arch-spec L2140–L2141) — **load-bearing**
- "Elysia HTTP runtime and oRPC handlers" at the terminal of the server stack (arch-spec L2171) — **load-bearing**
- "Elysia owns HTTP host lifecycle and request routing." (arch-spec L2174) — **load-bearing**
- Listed in Section 19 as flexible: "exact runtime harness wrappers around Elysia" (arch-spec L2800) — **name-drop for the internal wrappers, but integration role is load-bearing**

**Verification needed:** Elysia's integration with oRPC (specifically, whether oRPC mounts directly as an Elysia plugin or whether an adapter layer is required) is load-bearing for the server harness integration shape.

**Mark:** Load-bearing — verification recommended (especially oRPC-on-Elysia mounting shape).

### 7.5 OCLIF

**Claims in arch-spec:**
- "OCLIF as the default CLI command harness" (arch-spec L2142) — **load-bearing**
- "CLI command plugins live under `plugins/cli/commands/<capability>` and lower to OCLIF commands." (arch-spec L1371–L1372) — **load-bearing**
- "OCLIF owns command dispatch semantics." (arch-spec L1374) — **load-bearing**

**Verification needed:** OCLIF's plugin/command registration model and whether it supports programmatic command registration (as RAWR's surface adapter would need to do for compiled OCLIF command payloads) needs verification.

**Mark:** Load-bearing — verification recommended.

### 7.6 OpenShell

**Claims in arch-spec:**
- "OpenShell is the default runtime substrate and policy envelope beneath the shell-facing part of the `agent` role." (arch-spec L2022–L2023) — **load-bearing**
- "OpenShell-backed agent runtime behind `packages/core/runtime/harnesses/agent`" (arch-spec L2054) — **load-bearing**
- "Agent/OpenShell governance is a reserved boundary with locked integration hooks." (arch-spec L1398–L1399) — **load-bearing**
- "Agent plugins do not acquire providers, do not expose unredacted runtime internals, and do not become a second business execution plane." (arch-spec L1399–L1400) — **load-bearing**

**Verification needed:** OpenShell is named as an external technology but nothing is said about its API surface, integration model, or whether it is a RAWR-internal construct or a third-party technology. This is the most opaque vendor claim in the document.

**Mark:** Load-bearing — verification of OpenShell's external vs. internal status and integration shape needed.

### 7.7 Bun

**Claims in arch-spec:** Bun is NOT mentioned in the arch-spec. Zero references.

**Mark:** Not present — no claims to verify.

---

## 8. Authority Overlaps & Contradictions to Flag

### 8.1 Arch-spec claims to fix "the runtime realization lifecycle" (arch-spec L17)

The arch-spec's scope section states it "fixes... the runtime realization lifecycle." This claim puts the arch-spec in direct tension with the runtime realization spec's authority over runtime concerns. If the runtime spec has evolved the lifecycle (e.g., added internal sub-phases, renamed phases, changed phase boundaries), the arch-spec's claim to "fix" the lifecycle is either stale or creates a contradiction.

**Resolution heuristic applicability:** "Runtime realization spec is authoritative on runtime concerns" — this heuristic would say the runtime spec owns the lifecycle details. But the arch-spec's claim to fix it at the canonical level means it also owns the canonical naming. The tension is between owning the NAMES (arch-spec) vs. owning the MECHANICS (runtime spec). If the runtime spec uses the same phase names with the same 7-phase structure, there is no contradiction. If it adds phases or renames them, a contradiction exists that the heuristic alone cannot resolve.

### 8.2 Arch-spec claims to fix "the process-local runtime substrate" (arch-spec L12)

"The process-local runtime substrate" is named as something the arch-spec fixes. But the runtime realization spec is explicitly the authority on runtime concerns. "Process-local runtime substrate" sounds like a runtime concern. This overlap may be a benign vocabulary issue (the arch-spec fixes the name/concept boundary, the runtime spec fixes the implementation), but it is worth flagging.

### 8.3 Provisioning kernel details at runtime-internal depth (arch-spec L1712–L1722)

The provisioning kernel inventory (queues, pubsub, refs, schedules, caches, fibers, semaphores) is at a depth that the runtime spec may also own. If the runtime spec has a different or more evolved set of primitives (e.g., it no longer uses pubsub internally, or it has renamed how fibers are used), the arch-spec's list is contradictory and stale.

### 8.4 SDK derivation artifact list vs. runtime compiler input expectations (arch-spec L1655–L1665)

The arch-spec lists 8 SDK output artifacts. If the runtime spec's compiler has evolved to consume additional artifacts not listed here (or has dropped one of these), the arch-spec's derivation section is incomplete as an integration contract.

### 8.5 "FunctionBundle is harness-facing and internal" (arch-spec L1367) — no interface contract defined

The arch-spec calls `FunctionBundle` "harness-facing and internal" and forbids ordinary plugin authors from constructing it (arch-spec L1367). But it does not define what `FunctionBundle` IS as a boundary type. If the runtime spec defines `FunctionBundle` with a specific shape, and the arch-spec's description of the async stack (arch-spec L2189) is incomplete without that shape, there is an integration gap (not a contradiction, but a missing piece the arch-spec should expose as an integration contract).

### 8.6 Inngest integration mode not specified — risk of implicit assumption

The arch-spec shows the async stack as `FunctionBundle -> Inngest harness` without specifying whether this means HTTP serve-mode or connect-worker mode. If the runtime spec uses connect-worker mode (which requires an outbound connection from the async process to Inngest's infrastructure), the arch-spec's server-stack and agent-stack diagrams (which imply the async process is a listener) may not accurately reflect the network topology. This is not a direct contradiction but is an architecture-level omission that could mislead companion-spec authors.

---

## 9. Committed Position

The canonical architecture spec is well-written as a broad integration document: it correctly establishes the durable ontology, canonical phase vocabulary, role/surface taxonomy, and technology-binding rules without descending into Effect internals or Inngest internals. The three-layer boundary enforcement (RAWR owns semantic meaning → Effect owns provisioning mechanics → boundary frameworks keep their jobs) is clean and appropriate for a system-integration document. Sections 1–9 and 11–14 stay properly at the integration-surface level. Sections 16–19 (enforcement, invariants, forbidden patterns, flexible items) are good structural law.

The spec's weakest area is Section 10 (Runtime realization), where it crosses from integration-contract territory into runtime-internal ownership inventory — particularly the provisioning kernel primitive list (arch-spec L1712–L1722), the SDK derivation artifact list (arch-spec L1655–L1665), and the runtime compiler validation/emission lists (arch-spec L1673–L1695). These sections describe implementation ownership at a level of detail that the runtime realization spec likely also describes, creating a latent conflict surface. If the runtime spec has evolved these details, the arch-spec's invariants and ownership lists are stale without being visibly wrong.

The spec's structural gap is the absence of a formal "companion-spec attachment points" protocol. It asserts that companion specs attach "at explicit integration boundaries" (arch-spec L24) but never enumerates those integration boundaries. The harness integration shapes are described only to the level of "harnesses consume mounted surface runtime records and adapter-lowered payloads" — the actual interface contracts (what `mounted surface runtime records` and `adapter-lowered payloads` look like) are not defined, leaving companion harness specs and vendor integration authors without formal attachment points. As it stands, the arch-spec can serve as the system-integration document it claims to be, but it needs: (1) a reduction of runtime-internal detail from Section 10 into higher-level contract statements, and (2) an explicit integration-boundaries registry that names where companion subsystem specs attach and what each attachment requires.

---

## Key Findings / Claims

1. **The arch-spec claims authority over "the runtime realization lifecycle" in its scope section (arch-spec L17)**, which creates potential tension with the runtime realization spec's authority over runtime concerns. The lifecycle's 7 phase names (`definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`) are canonical in the arch-spec; if the runtime spec uses different phase names or adds sub-phases, a contradiction exists that the heuristic "runtime spec is authoritative on runtime concerns" cannot fully resolve because the arch-spec owns the canonical vocabulary.

2. **Section 10 (Runtime realization) is the highest-risk section for runtime-internal duplication.** The provisioning kernel primitive list (arch-spec L1712–L1722) enumerates process-local Effect mechanics (queues, pubsub, refs, fibers, semaphores) that are runtime-internal detail. The SDK derivation artifact list (arch-spec L1655–L1665) and runtime compiler validation/emission lists (arch-spec L1673–L1695) are detailed enough to create conflict if the runtime spec has evolved these contracts.

3. **The arch-spec correctly quarantines Effect vocabulary** (arch-spec L2153, L2775–L2776) and correctly assigns Effect to provisioning mechanics inside runtime only. The boundary rule is well-stated. The concern is only that the detailed ownership inventory of what Effect-backed primitives the kernel owns goes deeper than the arch-spec should reach.

4. **Critical integration gaps:** (a) No formal harness-mount interface contract (what shape adapters produce and harnesses consume); (b) No companion-spec attachment-points registry; (c) Inngest integration mode (serve vs. connect-worker) is unspecified; (d) No phase-transition trigger conditions or error-propagation contract across phase boundaries; (e) No formal observability protocol (just "telemetry backend is flexible" in Section 19).

5. **The public SDK import table (arch-spec L719–L733) and the lane index table (arch-spec L1299–L1314) are the two strongest integration contracts in the document** — they give companion spec authors and harness implementers a precise vocabulary for what they can depend on.

6. **OpenShell's integration shape is the least-defined vendor claim** in the arch-spec (arch-spec L2022–L2046). It is named as the default substrate for the agent role and as having "locked integration hooks" (arch-spec L1398), but no API surface, connect model, or policy contract is defined.

---

## Extracted Quotes

> "This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at explicit integration boundaries. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach." — arch-spec L24

The single most important authority claim in the document; establishes the integration role without defining how companion specs attach.

> "RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination." — arch-spec L1708–L1709

Load-bearing RAWR/Effect control split. The boundary between what the arch-spec owns and what the runtime spec owns (inside Effect) runs along this line.

> "The hidden execution substrate beneath bootgraph and process runtime is Effect-backed. It is process-local runtime machinery and not a peer public ontology layer." — arch-spec L217–L218

Correctly quarantines Effect as runtime machinery. Sets the scope boundary for companion specs.

> "Runtime realization exists below semantic composition and above native host frameworks. It owns only the bridge from selected declarations to a running process." — arch-spec L1591–L1592

Clearest statement of what runtime realization's scope is within the overall stack.

> "Harnesses consume mounted surface runtimes or adapter-lowered payloads. They do not consume SDK graphs or compiler plans directly." — arch-spec L2272–L2273

A concrete integration law that defines the harness integration contract. Critical for any harness companion spec.

> "Effect stays inside runtime realization. oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, and OpenShell keep their jobs." — arch-spec L2153–L2154 (from Section 13 boundary rule)

The canonical technology-scope rule. Defines what each vendor technology's scope is relative to RAWR's boundaries.

> "Ordinary services, plugins, apps, and entrypoints import public SDK surfaces, service boundary exports, plugin factories, resource descriptors, provider selectors, and app-owned profile helpers. They do not import Effect layer internals, concrete managed runtime handles, process runtime internals, harness mount code, adapter-lowered payload constructors, raw provider acquisition machinery, or unredacted provider config." — arch-spec L734–L737

The strongest statement of the public API boundary and what is forbidden from crossing it.

> "Finalizers, provider release, harness stop order, rollback of already-started subsets, managed runtime disposal, and final catalog records are deterministic runtime finalization and observation behavior. They are not an eighth top-level lifecycle phase." — arch-spec L1623–L1624

Explicitly fixes the lifecycle at 7 phases and blocks any companion spec from adding finalization as a new phase. Load-bearing for lifecycle alignment.

> "Agent/OpenShell governance is a reserved boundary with locked integration hooks." — arch-spec L1398

Names the OpenShell boundary as having special governance status without defining what "locked integration hooks" means — the least-defined integration contract in the document.
