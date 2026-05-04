# Coverage matrix — rawr-spec-landscape

Maps the 10 atomic items from `prompt-decomposition.json` to the corpus sources that answer them. Every cell shows: source note id → relevance.

## Q1 — platform-level decomposition (3 vs 4 tiers)

| Source | Relevance |
|---|---|
| [[locus-interim-platform-level-shape]] | Primary — committed FOUR-tier position, full per-spec self-location table, evidence synthesis. |
| [[habitat-sdk-layers-spec-analysis-draft]] | Strong — explicit 9-layer model (L0-L9) and §1 three-line summary that the steelman three-tier reading cites. |
| [[rawr-system-architecture-spec-analysis]] | Strong — ownership-axis decomposition; §4.11 canonical authority law ("shell drives what / stewards drive how / governance decides whether"). |
| [[rawr-authoring-classifier-system-spec-analysis]] | Anchor for Semantic-Composition tier defense (the "doesn't fit clean 3-tier" boundary case). |
| [[rawr-factory-bundle-export-spec-analysis]] | Anchor for Semantic-Composition tier defense (the second "doesn't fit clean 3-tier" boundary case; L9 in Habitat SDK Layers). |
| [[rawr-workstream-system-spec-analysis]] | Confirms Coordination/Governance distinction; durable work objects vs authority. |
| [[rawr-workstream-review-subsystem-spec-analysis]] | Confirms Governance acceptance machinery distinct from durable work coordination. |
| [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] | Confirms Core Runtime tier's 7-phase realization chain. |

Coverage: COMPLETE. 8 of 13 specs surface tier-relevant evidence; 5 remaining specs reside in tiers without challenging the structural take.

## Q2 — methodology / grading rubric

| Source | Relevance |
|---|---|
| [[locus-interim-authoritative-vs-shape-correct-reconciliation]] | Primary — distinguishes per-spec grade from system-level grade; defines "policy-level subordination vs. integration-law-level reconciliation"; classifies gaps as (a) realized, (b) implied-not-realized, (c) contradicted, (d) deferred-with-owner. |
| [[locus-interim-dont-own-still-manage-frontier-coverage]] | Primary — 10-rule descriptor-first checklist as Grade A/B/C/D rubric. |
| [[rawr-service-package-effect-vendor-integration-shape-reference]] | Source of the 10-rule checklist itself. |
| [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] | Defines "authoritative on runtime semantics" — the only spec carrying `runtime_authority: yes`. |

Coverage: COMPLETE. The rubric is constructively defined by L4 (system-level seam closure) and L3 (per-cell integration-law grade); the 10-rule source is in vault.

## Q3 — Core Runtime concerns

| Concern | Source(s) |
|---|---|
| Compiler / bootgraph / Effect kernel | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] |
| Resource/provider/profile model | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-authentication-subsystem-spec-analysis]] |
| Service binding cache | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-authentication-subsystem-spec-analysis]] §10.1 |
| Process-local coordination resources (Queue/PubSub/Cache/ConcurrencyLimiter) | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] §14 |
| Execution spine (EffectExecutionDescriptor, ExecutionRegistry, ProcessExecutionRuntime, EffectRuntimeAccess, ManagedRuntimeHandle) | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] §9 |
| Managed Agent Workspace runtime resource | [[rawr-managed-agent-workspace-execution-spec-analysis]] |
| Service authoring shape (oRPC × Effect) | [[rawr-service-package-effect-vendor-integration-shape-reference]] |
| Forbidden patterns / import gates | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] §18 |

Coverage: COMPLETE.

## Q4 — Coordination concerns

| Concern | Source(s) |
|---|---|
| Async / durable signal plane (Inngest connect worker, WorkflowDispatcher, FunctionBundle) | [[rawr-async-runtime-spec-analysis]] [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] §19 |
| HTTP server ingress (Elysia harness, oRPC adapter) | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-service-package-effect-vendor-integration-shape-reference]] |
| Conversational ingress (OpenShell, agent role, steward activation) | [[rawr-openshell-agent-runtime-and-steward-activation-spec-analysis]] |
| Deployment / placement / control plane | [[rawr-deployment-subsystem-spec-analysis]] |
| Authentication ingress (verifier resource, surface admission, VerifiedPrincipal) | [[rawr-authentication-subsystem-spec-analysis]] |
| Workstream system as durable work coordination object | [[rawr-workstream-system-spec-analysis]] |

Coverage: COMPLETE.

## Q5 — Governance concerns

| Concern | Source(s) |
|---|---|
| Workstream review acceptance machinery | [[rawr-workstream-review-subsystem-spec-analysis]] |
| Durable governance objects (workstreams, charters, runs, artifacts) | [[rawr-workstream-system-spec-analysis]] |
| Authority decomposition (shell-what / stewards-how / governance-whether) | [[rawr-system-architecture-spec-analysis]] §4.11 |
| Forbidden patterns / authority law enforcement | [[rawr-system-architecture-spec-analysis]] [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] |
| Habitat SDK Layers L7 + L8 (review + governance) | [[habitat-sdk-layers-spec-analysis-draft]] |

Coverage: COMPLETE for what the corpus contains. The Habitat SDK Layers L8 governance spec (RFDs, tensions, autonomy thresholds, escalation) is named but the dedicated governance spec is not in this corpus — flagged as a known boundary in `locus-interim-platform-level-shape`.

## Q6 — Semantic / Composition concern set

| Source | Relevance |
|---|---|
| [[rawr-authoring-classifier-system-spec-analysis]] | Classification engine (Habitat SDK Layers L2 mapping). |
| [[rawr-factory-bundle-export-spec-analysis]] | Capability bundle / retargeter (L9 mapping). |
| [[habitat-sdk-layers-spec-analysis-draft]] | Provides L0-L9 layer model that motivates the fourth tier. |
| [[locus-interim-platform-level-shape]] | Argued committed defense of the FOUR-tier choice. |

Coverage: COMPLETE.

## Q7 — Vendor integration assessment

| Vendor | Source(s) | Grade per [[locus-interim-vendor-integration-pattern-universality]] |
|---|---|---|
| oRPC | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-service-package-effect-vendor-integration-shape-reference]] | A |
| Effect | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-service-package-effect-vendor-integration-shape-reference]] | A |
| Inngest | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] §19 [[rawr-async-runtime-spec-analysis]] | A on used-at-strength; B on integration-cashed |
| Bun/Elysia | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] [[rawr-service-package-effect-vendor-integration-shape-reference]] | B |
| OCLIF | [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] | B |
| Drizzle | [[rawr-service-package-effect-vendor-integration-shape-reference]] | B |
| HyperDX / OTel | [[rawr-service-package-effect-vendor-integration-shape-reference]] [[rawr-effect-runtime-realization-system-spec-analysis-authoritative]] | B |
| Auth provider families | [[rawr-authentication-subsystem-spec-analysis]] | A |
| Deployment targets (Railway/Railpack/OCI) | [[rawr-deployment-subsystem-spec-analysis]] | A |
| MAWE provider | [[rawr-managed-agent-workspace-execution-spec-analysis]] | B |
| Factory Bundle TargetProfile | [[rawr-factory-bundle-export-spec-analysis]] | B |
| Authoring Classifier LLM | [[rawr-authoring-classifier-system-spec-analysis]] | C (outside runtime pattern scope) |

Coverage: COMPLETE.

## Q8 — Bookmarked deferrals vs real coverage gaps

Source: [[locus-interim-operational-substrate-gaps]] §"Bookmarked deferrals vs. real gaps" + [[locus-interim-dont-own-still-manage-frontier-coverage]] §"Classification of silences".

- **8 bookmarked deferrals identified** (named reserved seam + named owner + trigger).
- **14 real gaps identified** (no seam, no owner, no integration law).

Coverage: COMPLETE.

## Q9 — Heatmap structure

The heatmap renders Q3-Q6 (per-tier × per-concern) with grades from Q3-Q8. Two-axis grading per [[locus-interim-vendor-integration-pattern-universality]] applies to the §7 vendor sub-heatmap. Coverage: COMPLETE — every required cell has primary source + grade.

## Q10 — Open gaps / next specs

Source: [[locus-interim-operational-substrate-gaps]] top-5 list + [[locus-interim-authoritative-vs-shape-correct-reconciliation]] top-3 blocking seams + [[locus-interim-dont-own-still-manage-frontier-coverage]] three flagged gaps.

Top P0/P1 next-spec recommendations (consolidated):
1. Bundle signing/attestation seam on `CapabilityBundle` (cosign/sigstore-shaped).
2. OTel/HyperDX W3C TraceContext propagation contract across server→async→MAWE chain.
3. MFA / step-up authentication flow (close `assurance`-field hook).
4. Idempotency-key naming convention + dead-letter policy (async plugin contract).
5. MAWE profile→manifest mapping (8 canonical providers, illustrative → normative).
6. Inngest connect worker as named bootgraph `BootResourceModule` with explicit Effect Layer (close blocking integration-law seam).
7. Per-role WorkflowDispatcher emission rights (lock agent-role direct-emission claim in runtime spec §19).
8. Auth-specific compiler gate enumeration in runtime compiler section (close third blocking integration-law seam).

Coverage: COMPLETE.

## Atomic-item coverage summary

| Item | Coverage |
|---|---|
| Q1 (decomposition) | COMPLETE |
| Q2 (methodology) | COMPLETE |
| Q3 (Core Runtime) | COMPLETE |
| Q4 (Coordination) | COMPLETE |
| Q5 (Governance) | COMPLETE (within corpus scope) |
| Q6 (Semantic-Composition) | COMPLETE |
| Q7 (Vendor integration) | COMPLETE |
| Q8 (Deferrals vs gaps) | COMPLETE |
| Q9 (Heatmap) | COMPLETE |
| Q10 (Next specs) | COMPLETE |

Zero uncovered atomic items. Corpus is closed.
