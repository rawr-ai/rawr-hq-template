# Legacy Metadata Reduction and Simplification (Extraction)

> This document preserves the simplicity/legacy-removal reasoning originally captured in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`. The canonical ORPC/Inngest posture is `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`.

## Source anchor
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`

## Why this axis matters
Complexity debt here is primarily semantic: too many metadata concepts, too many implied wiring paths, and too many places where runtime intent can be encoded.

## Simplicity Principle
A runtime decision should be inferable from:
1. plugin surface root,
2. `rawr.kind`,
3. `rawr.capability`,
4. manifest registration in `rawr.hq.ts`.

If a concept is not needed for one of those, it should not drive runtime behavior.

## Complexity hotspots with implications

### H1: `templateRole` and `channel` as runtime-driving semantics
**Problem:**
- duplicate intent and conflicting interpretations.

**Implication:**
- plugin authors must over-specify semantics, increasing drift risk.

**Action:**
- remove from runtime semantics now.

### H2: publish posture fields coupled to runtime semantics
**Problem:**
- release posture and runtime composition are separate concerns.

**Implication:**
- runtime model inherits release-process complexity.

**Action:**
- deprecate runtime usage now; centralize release policy; remove later.

### H3: dual composition paths
**Problem:**
- architecture says one composition authority, docs/process still imply older fixture-centric composition paths.

**Implication:**
- onboarding and debugging require searching multiple wiring locations.

**Action:**
- keep only manifest-first composition in written target model.

## Removal plan with rationale

### Remove now
1. runtime semantics from `templateRole`.
2. runtime semantics from `channel`.
3. written guidance that composes capabilities outside `rawr.hq.ts`.

**Rationale:**
- immediate ambiguity reduction with minimal runtime behavior risk.

### Deprecate then remove
1. runtime usage of `publishTier` / `published`.

**Rationale:**
- avoids breaking release workflows while central policy replacement lands.

## Minimal end-state model
1. surface-split runtime roots.
2. shared package capability core.
3. one composition authority (`rawr.hq.ts`).
4. required metadata only: `rawr.kind` + `rawr.capability`.
5. machine-enforced import and metadata boundaries.

## Acceptance checks
1. target docs no longer require runtime decisions from removed fields.
2. process docs do not present dual composition authority.
3. deprecation targets have explicit closure criteria in `DECISIONS.md`.
4. model can be explained to implementers in a single sentence:
- "author capability in package, expose in surface plugin(s), compose in `rawr.hq.ts`, mount from hosts."
