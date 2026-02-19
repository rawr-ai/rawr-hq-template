# Agent D Scratchpad

## Skill intake (mandatory)
- `information-design` (mandatory): improve hierarchy, purpose labeling, and read-path scent without changing meaning.
- `docs-architecture`: keep canonical authority obvious and avoid duplicate/ambiguous canonical surfaces.
- `architecture`: preserve target-state semantics while separating architecture policy from implementation sequencing artifacts.
- `deep-search`: verify concern coverage and routing for D-013/D-014/D-015 across packet docs.

## Corpus-read checkpoints
Read in full:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
- all files under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/`
- all files under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/`

## Cross-agent alignment checkpoints
Read:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_A_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_B_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_C_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_T_SCRATCHPAD.md`

## No-drift anchors
1. Preserve canonical authority model: `ARCHITECTURE.md` (integrative policy), `DECISIONS.md` (decision register), leaf axes/examples (focused policy/examples).
2. Preserve D-005..D-012 semantics and wording intent.
3. Preserve D-013 semantics (legacy metadata runtime simplification obligations).
4. Preserve D-014 lock-ready seams (package-first/shared infra + deterministic import direction).
5. Preserve D-015-ready testing-doc contract posture as implementation-adjacent, not architecture-policy mutation.

## Gaps observed (information design)
1. `README.md` still routes primarily through axes 01..09 and does not give first-screen discoverability for axes 10/11/12 or implementation-adjacent spec purpose.
2. `README.md` lacks explicit purpose labeling that separates:
   - normative policy docs,
   - reference examples,
   - implementation-adjacent downstream update contract.
3. `ARCHITECTURE.md` leaf list and coverage map are stale vs expansion additions (10/11/12 coverage not consistently surfaced).
4. D-013/D-014/D-015 concern routing is distributed and requires too much inference.

## Decisions for Agent D pass
1. Reshape first-screen routing in `README.md` to make canonical authority + concern-based paths explicit.
2. Reshape `ARCHITECTURE.md` structural/navigation sections only; avoid semantic changes to policy bullets.
3. Add optional `CANONICAL_EXPANSION_NAV.md` as a compact concern-to-source index for expansion additions.

## Acceptance checks to run after edits
1. First screen of `README.md` clearly identifies canonical source-of-truth docs and purpose labels.
2. First screen of `ARCHITECTURE.md` clearly states document role and where to go for D-013/D-014/D-015 concerns.
3. New axes/docs are discoverable via explicit labels and links.
4. No policy content changes (structure/clarity only).
