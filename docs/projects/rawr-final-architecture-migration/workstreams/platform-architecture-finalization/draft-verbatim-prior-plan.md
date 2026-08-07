The leverage-maximizing shape is: **extract the spec-system rules first, harvest `latest` second, integrate into frozen third**. That prevents `latest` from becoming the implicit authority just because it has useful language.

**Recommended Domino Sequence**

| Chunk | What It Freezes | What It Leaves Unresolved | Depends On |
|---|---|---|---|
| **1. Authority Freeze + Working Packet** | Freezes `frozen` as the baseline, `_inbox/latest` as harvest material, `main` as stale/superseded. Creates a short reconciliation packet with hashes, source paths, and the rule: no wholesale replacement. | Does not decide individual conflicts like `ProviderEffectPlan`, `Effect.Service`, or OpenShell wording. | Existing comparison evidence. |
| **2. Extract Spec-System Invariants** | Creates a standalone “RAWR Specification System” doc: hub/companion model, authority ownership, delegation, reserved boundaries, deferral-vs-gap rule, supersession/stale-copy rules, attachment protocol. This removes those rules from being owned by the platform spec. | Does not yet rewrite the platform spec deeply; only establishes the corpus rules it must reflect. | Chunk 1. |
| **3. Harvest `latest` Into a Transplant Packet** | Converts `latest` into a categorized harvest matrix: `adopt`, `adapt`, `reject`, `defer`. Separates Category A document/system improvements from Category B runtime/architecture decisions. | Does not integrate prose yet. Avoids accidental decisions by forcing every harvested item to name destination and authority owner. | Chunk 2, because harvest categories need the new spec-system rules. |
| **4. Platform Spec Reframe on Frozen Baseline** | Renames/reframes the frozen spec as the **Platform Architecture Specification**. Integrates the useful `latest` hub language: stronger scope/authority, hub posture, authority plane model, and clearer “owns vs defers vs reserves” framing. The platform spec reflects the spec-system rules but links to the standalone doc instead of listing the whole ruleset. | Does not settle runtime-detail conflicts beyond removing obvious overreach. | Chunks 2 and 3. |
| **5. Runtime Boundary Scrub** | Removes or demotes runtime-mechanics detail that `latest` pulled upward. Keeps compact architecture-level invariants: one RAWR execution terminal, no Promise-only business terminal, runtime realization owns mechanics. Pushes mechanics back to the runtime spec by reference. | Defers ambiguous terms where intent is unclear: `ProviderEffectPlan` as public authoring truth, `SurfaceRuntimeAccess`, `Effect.Service`, exact provider lowering language. | Chunk 4. |
| **6. Conflict Decision Packet** | Creates a small explicit packet for the few remaining real conflicts. Each item gets current evidence, likely authority, proposed default, and whether it blocks platform-spec finalization. Most should become deferred companion/runtime follow-ups, not platform blockers. | Leaves implementation/code migration work unresolved. This is only spec authority cleanup. | Chunk 5. |
| **7. Final Platform Spec Lock** | Produces the final platform spec as the single canonical baseline: coherent title, authority statement, corpus link, runtime boundary posture, platform laws, and no embedded spec-system sprawl. Runs semantic review against frozen, latest harvest packet, runtime spec, and spec-system doc. | Does not clean every stale external file yet. | Chunk 6. |
| **8. Cleanup + Distribution Pass** | Archives/subordinates stale copies, updates indexes/backlogs/deferrals, marks `_inbox/latest` as harvested/provenance, and defines where future cloud/external model packets should point. This ends with one clear platform spec authority. | Broader repo migration and companion-spec authoring remain future work. | Chunk 7. |

**Why This Order**

The dangerous move would be integrating `latest` directly into frozen. It has good language, but it also smuggles in runtime mechanics. The extraction step creates a neutral place for spec-system law, so the platform spec can say “I am a hub doc” without becoming the constitution for every spec in the corpus.

The harvest packet is the second safety valve. It prevents “useful wording” from carrying hidden authority changes. Every `latest` idea has to declare whether it is document structure, platform architecture, runtime mechanics, or deferred conflict.

**Low-Confidence Boundaries**

Only these should stay explicitly low-confidence for now:

- Whether `latest` intentionally reopened OpenShell vendor status.
- Whether `ProviderEffectPlan` was meant as architecture-level authoring truth or only runtime-spec truth.
- Whether `Effect.Service` remained listed because of stale baseline, cloud hallucination, or a deliberate broader forbidden-pattern category.
- Whether `SurfaceRuntimeAccess` belongs in platform vocabulary or remains runtime-only.

Those should not block the platform spec reframe. They belong in Chunk 6 unless earlier chunks make the answer obvious.

**Concrete End State**

You end with:

- One finalized **Platform Architecture Specification**, based on frozen plus selected `latest` improvements.
- One standalone **RAWR Specification System** doc that owns cross-spec rules.
- One harvest packet showing exactly what was taken from `latest`, rejected, or deferred.
- One conflict packet for the few runtime/detail questions that should not be smuggled into the platform spec.
- Stale `main`/external/inbox copies classified as current authority, harvested provenance, or obsolete.

Skills used: architecture.

<oai-mem-citation>
<citation_entries>
MEMORY.md:647-686|note=[used prior spec authority and runtime boundary context]
MEMORY.md:1005-1035|note=[used comparative workflow guidance for baseline selection and exact transplants]
</citation_entries>
<rollout_ids>
019de544-4684-7bb3-8513-ca5a25d3f5e7
019dc37c-3ee9-7d82-a40b-e0f442fab992
</rollout_ids>
</oai-mem-citation>
