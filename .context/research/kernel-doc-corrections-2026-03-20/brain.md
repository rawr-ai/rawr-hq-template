# Canonical Kernel Doc Corrections

## What We Are Doing
- Implement the already-approved `Canonical Kernel Doc Corrections` plan for:
  - `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec.md`
  - `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md`
- Keep the future architecture direction and load-bearing semantics locked.
- Correct precision, consistency, and canonical-spec quality without reopening the kernel design.

## What We Are Not Doing
- We are not renegotiating the architecture.
- We are not using transitional repo layout as an argument against the target state.
- We are not turning these docs into migration plans.
- We are not doing naive string replacement. Every wording change must preserve or improve semantic clarity.

## Canonical Doc Intent
- These docs are standalone, canonical target-state specifications.
- They should describe destination-state behavior, mechanisms, boundaries, and load-bearing semantics.
- They should not carry migration steps, implementation to-do lists, or session-history cleanup narrative in the main body.

## Why This Is Sensitive
- Small wording changes can silently shift ownership, authority, or lifecycle semantics.
- The most important seams to preserve are:
  - `app -> manifest -> role -> surface`
  - `entrypoint -> bootgraph -> process`
  - `services` as semantic capability truth
  - `plugins` as runtime projection
  - `apps` as composition authority and runtime identity
  - `bootgraph` as a process-local lifecycle engine
- The docs must remain cohesive across shell-level architecture and seam-level boot detail.

## High-Signal Findings To Preserve
- No repo or Arc detail found so far forces a change to the locked kernel direction.
- The biggest repo-vs-doc issues are target-state wording problems:
  - docs can sound like they describe current checked-in layout
  - docs can overstate role-first plugin topology as present fact
- The main Arc issue is precision:
  - `tsdkarc` is a generic lifecycle manager
  - `packages/bootgraph` is a RAWR derivative that narrows and patches Arc semantics
- The main cross-doc semantic mismatch is service-boundary wording:
  - boot spec currently overstates oRPC as part of service identity
  - V2 correctly treats service boundaries as transport-neutral with oRPC as the default callable harness
- One repo-grounded nuance should be preserved explicitly:
  - hosts may augment manifest-owned bundles at mount time with runtime-owned adapters/wrappers without taking over manifest authority

## Editing Priorities
1. Fix semantic precision first.
2. Preserve cohesion between the two docs.
3. Remove migration / implementation-program content from canonical bodies.
4. Keep explicitness where it protects correctness.
5. Use reviewer passes to catch drift, flattening, or overgeneralization.

## Ratcheting Workflow
1. Patch the docs precisely.
2. Run architecture-focused review for semantic drift.
3. Run information-design review for cohesion and readability.
4. Tighten again based on concrete findings only.

## Active Assumptions
- `apps/hq/*`, role-first plugin layout, and `packages/bootgraph` remain valid target-state expressions unless implementation later proves otherwise.
- Transitional repo structure is not evidence against the destination architecture.
- If an example is illustrative rather than normative, label it that way instead of weakening the architecture.
