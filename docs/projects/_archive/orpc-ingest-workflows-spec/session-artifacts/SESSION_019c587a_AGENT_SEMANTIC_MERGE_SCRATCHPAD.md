# Scratchpad: Semantic/Contextual Merge Analysis

## Skills introspection log
- `orpc`: Reviewed canonical reference focusing on contract-first workflow, transports, documentation references, and pitfalls (version context Feb 5, 2026).
- `inngest`: Captured durable execution best practices, local vs cloud, reliability, security, AI workflows (Feb 9, 2026 context).
- `elysia`: Logged Fetch-based server architecture, schema-driven typing, plugin/lifecycle insights, and deployment patterns.
- `typebox`: Note JSON Schema-first orientation, Standard Schema + TypeMap context, best practices for schema sharing.
- `architecture`: Emphasized separation of current/target/transition, decision packet templates, migration slices.
- `graphite`: Reminder: prefer `gt` commands for Graphite workflows; treat references as canonical.
- `git-worktrees`: Worktree naming, root conventions, patch guard; all edits must use absolute paths.

## Initial orientation
- Worktree path: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
- Branch: `codex/pure-package-e2e-convergence-orchestration` (Graphite stack). All artifacts must respect branch/worktree conventions.
- Task: semantic/contextual analysis between old `docs/system` spec packet and authoritative `orpc-ingest-spec-packet` docs.
- Hard constraints: analysis only, no modifications to canonical spec docs; only create plan, scratchpad, final analysis.
- Need to produce plan file (`SESSION_019c587a_AGENT_SEMANTIC_MERGE_PLAN_VERBATIM.md`) with plan, then final analysis file.

## To do next
1. Gather authoritative baseline docs (posture spec, spec packet, axes, decisions) for context mapping.
2. Gather old system spec documents and axes.
3. Cross-map axes/policies/structure into keep/replace/merge lists.
4. Document findings and produce final plan/analysis files.

## Authoritative baseline snapshot
- Posture spec covers scope (oRPC APIs + workflow APIs + Inngest durable execution + optional Durable Endpoint adapters) with locked split/invariants/naming/TypeBox/ownership details, plus axis map linking to dedicated leaf specs for axes 01-09.
- ORPC/Inngest spec packet is the entrypoint with packet-wide rules (TypeBox-only schemas, inline `.input/.output`, context separation, global invariants), canonical ownership split, cross-cutting defaults, docs examples (E2Es), and a decision register for outstanding questions (D-005 .. D-012, etc.).
- Each axis doc drills into policy (external client generation, internal calling, split posture, context propagation, errors/observability, middleware, host composition, workflows vs APIs boundary, durable endpoints) with cross-axis links, canonical snippets, and references.

## Alignment/contextual maps summary
- Alignment matrix already categorizes old docs into keep-unique (42 rows), replace (23), merge-align (39), retire (3), with explicit rows referencing specific sections (e.g., P001..R010, Y001..Y016, Z001..Z011). It also outlines replacements referencing authoritative docs for host composition, E2E examples, TypeBox policy, etc.
- Docs archive sweep matrix recommends moving old `/docs/system` files to `/docs/projects/_archive/flat-runtime-session-review/system/` after authority handoff, with blockers referencing need to incorporate unique content before moving.
- Cleanup synthesis lists ready-to-execute mutation order (declare authority, preserve uniques, replace overlaps, archive in order, validate links) and enumerates keep/replace/merge focus areas for metadata, testing/rollout, composition, acceptance gates, etc.

## Immediate observations
- Old `spec-packet` axis docs map roughly onto authoritative axes but also contain unique governance/test/rollout guidance that must be retained elsewhere.
- The decision register difference (old vs new) means we should treat authoritative register as source of truth; old decision content likely becomes keep-unique or relocation items.
- Need to record which old sections are purely archival vs still relevant for retention of unique guidance in new packet.

## Legacy system packet snapshot
- `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md` enshrines high-level governance (plugin surface split, capability packaging, `rawr.hq.ts` composition), + contains high-level metadata/removal stances (templateRole/channel/published semantics). Portions marked archival/conflict in sweep matrix.
- `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md` currently indexes axis docs, examples, decisions; its axis docs (`AXIS_01_TECH_CORRECTNESS`, etc.) duplicate the authoritative axes and are flagged for archival migration once unique sections are preserved.
- Axis-specific docs under `/docs/system/spec-packet` mix policy (internal calling, architecture lifecycle, E2E examples, testing sync, simplicity/legacy removal) with unique pieces (CI policies, rollout strategy, metadata removal plan) that need rehoming or referencing when final authoritative packet is built.
- Old decision register near `DECISIONS.md` has open/resolution statuses now superseded; we should treat new packet's decision register as canonical while preserving unique items somewhere (maybe referencing keep-unique in final plan).
