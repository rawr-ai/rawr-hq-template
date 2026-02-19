# Agent A Scratchpad

## Skill intake (mandatory)
- `information-design` (mandatory): shape policy into clear target-state contract with explicit changed/unchanged boundaries.
- `architecture`: keep target-state policy separate from migration/implementation details.
- `docs-architecture`: keep canonical authority in packet-level docs and avoid spreading policy outside packet.
- `decision-logging`: add explicit D-013 lock to avoid silent interpretation drift.
- `deep-search`: multi-angle corpus scan for metadata/lifecycle references and no-drift anchors.
- `orpc`: preserve caller/transport/publication semantics and contract ownership language.
- `inngest`: preserve runtime ingress and durability boundaries while defining lifecycle implications.

## Grounded corpus checkpoints
- Canonical packet read:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
  - all files under `axes/`
  - all files under `examples/`
- Archive extractions read:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_METADATA_REMOVAL.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_TESTING_SYNC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_DECISIONS_APPENDIX.md`

## Existing locks that must stay unchanged (D-005..D-012)
- D-005 route split and manifest-driven workflow trigger composition.
- D-006 plugin ownership of boundary contracts (packages remain transport-neutral and domain-focused).
- D-007 caller transport/publication boundaries (`/rpc` internal; OpenAPI published; `/api/inngest` runtime ingress only).
- D-008 baseline traces bootstrap + explicit mount order.
- D-009/D-010 remain open operational guidance (no new strict lock there).
- D-011 procedure I/O schema ownership and metadata placement in context modules, not `domain/*`.
- D-012 inline-I/O docs default and extracted `{ input, output }` exception shape.

## Legacy metadata/lifecycle evidence distilled
1. Runtime-driving metadata should be minimal and inferable from:
   - plugin surface root,
   - `rawr.kind`,
   - `rawr.capability`,
   - manifest registration in `rawr.hq.ts`.
2. Legacy fields to remove from runtime semantics now:
   - `templateRole`,
   - `channel`.
3. Legacy release posture fields should not drive runtime composition:
   - `publishTier`,
   - `published`.
4. One composition authority requirement remains:
   - manifest-first `rawr.hq.ts`; no dual composition narratives.
5. Lifecycle/testing implications required by policy (inside packet, not external edits in this pass):
   - metadata validation contract for required keys,
   - import-boundary enforcement,
   - host-composition guard,
   - manifest smoke expectations,
   - downstream runbook/docs/testing updates as obligations.

## Target-state policy to encode
- Runtime decisions are derived only from canonical metadata (`rawr.kind`, `rawr.capability`) + manifest registration.
- Removed legacy metadata has no runtime behavioral effect.
- Keep optional fields as descriptive/release metadata only (non-runtime).
- Document lifecycle impact as required downstream obligations without changing external docs in this pass.

## Planned canonical edits
1. Add `D-013` as `locked` in `DECISIONS.md` with:
   - removed runtime semantics,
   - retained canonical metadata,
   - lifecycle policy obligations,
   - explicit unchanged guarantees for D-005..D-012.
2. Extend `ARCHITECTURE.md` with:
   - locked subsystem policy entry for legacy metadata simplification,
   - global invariant for runtime metadata minimalism,
   - explicit downstream obligations section (docs/runbooks/testing) inside packet boundaries.
3. Create axis doc:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md`.
