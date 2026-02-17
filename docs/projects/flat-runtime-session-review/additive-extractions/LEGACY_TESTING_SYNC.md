# Legacy System, Testing, Lifecycle, and Sync Guidance (Extraction)

> Content extracted from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`. The canonical ORPC/Inngest posture is recorded at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` and the posture spec.

## Source anchor
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`

## Why this axis matters
This architecture only works if enforcement and operations evolve with it. Without test and sync changes, `rawr.hq.ts` becomes optional in practice, and boundaries erode.

## System Changes with Rationale and Implications

### S1: Manifest-first host contract
**Change:**
- hosts mount only `rawr.hq.ts` outputs for ORPC/Inngest/web/cli/agent/mcp surfaces.

**Rationale:**
- one assembly authority reduces wiring ambiguity.

**Implication:**
- host fixtures become thinner and safer to maintain; manifest quality becomes critical.

### S2: Metadata contract validation
**Change:**
- validate required plugin metadata (`rawr.kind`, `rawr.capability`).

**Rationale:**
- lifecycle tooling requires consistent identity and surface typing.

**Implication:**
- plugin authors must supply minimal metadata; tooling can provide clearer errors.

### S3: Import-boundary enforcement
**Change:**
- lint/CI check prevents plugin-to-plugin runtime imports.

**Rationale:**
- avoids hidden runtime coupling and brittle composition.

**Implication:**
- shared helpers move to package layer when needed.

### S4: Lifecycle command alignment by surface
**Change:**
- lifecycle tooling and status checks treat new surfaces explicitly.

**Rationale:**
- surface-split roots only help if operational commands understand them.

**Implication:**
- command/status output becomes clearer for multi-surface capabilities.

## Testing Matrix

### Unit tests
1. manifest shape test (`RawrHqManifest` presence and fields).
2. plugin registration contract tests by surface.

### Integration tests
1. `/rpc/*` and `/api/orpc/*` mounted from manifest ORPC exports.
2. `/api/inngest` mounted from manifest workflow bundle.
3. web and CLI registries sourced from manifest.

### End-to-end tests
1. Case A/B/C from `AXIS_03_END_TO_END_EXAMPLES.md`.
2. capability enable/disable behavior remains coherent across surfaces.

### CI policy checks
1. `manifest-smoke`: fail if manifest missing/empty ORPC/Inngest exports.
2. `import-boundary`: fail on plugin-to-plugin runtime imports.
3. `metadata-contract`: fail when required metadata missing.
4. `host-composition-guard`: fail when fixture apps author cross-surface composition directly.

## Sync and Lifecycle Implications
1. sync/status flows must report by `rawr.capability` and `rawr.kind`.
2. template/personal ownership checks must include `api`, `workflows`, `mcp` roots.
3. migration should preserve operator trust through explicit health checks and parity validation.

## Rollout Policy

### Recommended sequence
1. **Phase 1**: introduce manifest and compatibility bridge.
2. **Phase 2**: require new capability onboarding through manifest only.
3. **Phase 3**: remove legacy composition and deprecated metadata runtime usage.

### Why phased instead of flag day
- lower blast radius,
- preserves delivery velocity,
- allows enforcement to harden before removal.

## Acceptance gates
1. New capability can be onboarded without adding host composition logic outside `rawr.hq.ts`.
2. CI catches boundary and metadata violations before merge.
3. Integration tests prove runtime routes are sourced from manifest outputs.
4. Operational runbooks reflect the new lifecycle model.
