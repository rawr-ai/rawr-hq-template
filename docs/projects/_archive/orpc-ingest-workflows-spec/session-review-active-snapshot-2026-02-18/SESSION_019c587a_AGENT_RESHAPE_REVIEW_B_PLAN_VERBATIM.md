# Flat Runtime Spec Packet — Unified Reshape Proposal

**Status:** Awaiting approval
**Date:** 2026-02-18
**Supersedes:** Previous RESHAPE_PROPOSAL.md (F-01 through F-13 preserved and expanded)
**Source:** Synthesized from three independent reshape analyses:
- System Architecture (directory, naming, wayfinding)
- Authority Consolidation (merge strategy, policy dedup, chunking)
- Packet Interior (axis quality, E2E progression, cross-references)

---

## 1. What This Proposal Does

Reshapes the flat-runtime spec packet into a structure that serves two purposes: (a) implementation planning against the current codebase, and (b) long-term canonical architecture reference.

Three categories of work:

1. **System-level** — directory restructure, file renames, canonical/session separation, wayfinding
2. **Authority consolidation** — merge Posture Spec + Packet Index into single ARCHITECTURE.md, deduplicate policies, chunk flat lists, consolidate caller/auth matrix
3. **Interior quality** — per-axis improvements, E2E progression fixes, DECISIONS.md cleanup, cross-reference repair

All content (including examples) is preserved. Nothing is deleted. Policy is reorganized, not rewritten.

---

## 2. Target Directory Structure

```
docs/projects/flat-runtime/
├── README.md                              # Entry point: scope, reading order, file categories
├── ARCHITECTURE.md                        # Merged posture spec + packet index (single authority)
├── DECISIONS.md                           # Decision register (promoted from subdirectory)
│
├── axes/
│   ├── 01-external-client-generation.md
│   ├── 02-internal-clients.md
│   ├── 03-split-vs-collapse.md
│   ├── 04-context-propagation.md
│   ├── 05-errors-observability.md
│   ├── 06-middleware.md
│   ├── 07-host-composition.md
│   ├── 08-workflow-api-boundaries.md
│   └── 09-durable-endpoints.md
│
├── examples/
│   ├── e2e-01-basic-package-api.md
│   ├── e2e-02-api-workflows-composed.md
│   ├── e2e-03-microfrontend-integration.md
│   └── e2e-04-context-middleware.md
│
└── _session-lineage/                      # Explicitly non-normative process artifacts
    ├── README.md
    ├── loop-closure-bridge.md
    ├── route-design-review.md
    ├── redistribution-traceability.md
    ├── agent-work/                        # Agent scratchpads, plans, recommendations
    ├── closures/                          # Decision closure work, integration changelogs
    └── additive-extractions/              # Legacy material (old decisions, metadata, testing)
```

### Why This Structure

- **Canonical boundary is filesystem-visible.** Everything in `_session-lineage/` is non-normative. Everything outside it is authoritative.
- **One overview document.** Posture Spec + Packet Index merge into `ARCHITECTURE.md`. One place for every policy statement, one canonical caller/auth matrix.
- **Session IDs gone from canonical filenames.** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` → `ARCHITECTURE.md`. Content is living policy; filename should say so.
- **Human-readable axis names.** `AXIS_07_HOST_HOOKING_COMPOSITION.md` → `07-host-composition.md`. Kebab-case, numeric prefix for sort order, redundant AXIS_ prefix dropped (directory says "axes").
- **DECISIONS.md promoted to project root.** Discoverable alongside ARCHITECTURE.md, not buried in a subdirectory.
- **Examples separated from axes.** `orpc-ingest-spec-packet/` splits into peer-level `axes/` and `examples/` — semantically clearer.

### Mandate Checks on Target Structure

All five information-design mandates pass:

- **Logic:** Canonical policy → axis detail → concrete examples → decision record. Process is archived. Holds without formatting.
- **Skim:** `ARCHITECTURE.md` = overview. `axes/07-*` = policy slice. `examples/e2e-01-*` = walkthrough. `_session-lineage/` = archived process. Readable in 30 seconds.
- **Swap:** Pattern (canonical + axes + examples + decisions + process archive) is technology-independent. A different spec could reuse this shape.
- **Noise:** Every file earns its place. Process scratchpads don't earn canonical space — moved out.
- **Scent:** Every filename predicts content. `ARCHITECTURE.md` signals "system overview," not "SESSION_019c587a_..." which signals "point-in-time artifact."

---

## 3. File-by-File Disposition

### Canonical Files (Merge/Rename/Promote)

| Current | New | Action |
|---|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | → merge into `ARCHITECTURE.md` | Merge with Packet Index; remove SESSION prefix |
| `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | → merge into `ARCHITECTURE.md` | Merge with Posture Spec; dissolve intermediate directory |
| `orpc-ingest-spec-packet/DECISIONS.md` | → `DECISIONS.md` | Promote to root; apply F-06, F-09 fixes |
| `orpc-ingest-spec-packet/AXIS_01_*.md` | → `axes/01-external-client-generation.md` | Rename; fix absolute paths (F-08) |
| `orpc-ingest-spec-packet/AXIS_02_*.md` | → `axes/02-internal-clients.md` | Rename; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_03_*.md` | → `axes/03-split-vs-collapse.md` | Rename; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_04_*.md` | → `axes/04-context-propagation.md` | Rename; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_05_*.md` | → `axes/05-errors-observability.md` | Rename; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_06_*.md` | → `axes/06-middleware.md` | Rename; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_07_*.md` | → `axes/07-host-composition.md` | Rename; reorganize with H3 subsections; fix absolute paths |
| `orpc-ingest-spec-packet/AXIS_08_*.md` | → `axes/08-workflow-api-boundaries.md` | Rename; move path debate to DECISIONS.md (F-11); fix paths |
| `orpc-ingest-spec-packet/AXIS_09_*.md` | → `axes/09-durable-endpoints.md` | Rename |
| `orpc-ingest-spec-packet/examples/E2E_01_*.md` | → `examples/e2e-01-basic-package-api.md` | Rename; add "Key Axes Covered" section |
| `orpc-ingest-spec-packet/examples/E2E_02_*.md` | → `examples/e2e-02-api-workflows-composed.md` | Rename; add bridge notes, diff-view tree, axes covered |
| `orpc-ingest-spec-packet/examples/E2E_03_*.md` | → `examples/e2e-03-microfrontend-integration.md` | Rename; add bridge notes, diff-view tree, axes covered; F-12 |
| `orpc-ingest-spec-packet/examples/E2E_04_*.md` | → `examples/e2e-04-context-middleware.md` | Rename; add diff-view tree, axes covered |

### Session/Process Artifacts (Archive to `_session-lineage/`)

| Current | New | Category |
|---|---|---|
| `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` | `_session-lineage/loop-closure-bridge.md` | Context (add as-of timestamp per F-07) |
| `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` | `_session-lineage/route-design-review.md` | Architectural debate |
| `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` | `_session-lineage/redistribution-traceability.md` | Reference (not policy) |
| All `SESSION_019c587a_D008_*` files | `_session-lineage/closures/d008-*.md` | Closure work logs |
| All `SESSION_019c587a_AGENT_*` files | `_session-lineage/agent-work/*.md` | Agent scratchpads |
| All `SESSION_019c587a_D006_*` files | `_session-lineage/closures/d006-*.md` | Closure work logs |
| `SESSION_019c587a_SURFACE_PACKET_*` files | `_session-lineage/closures/surface-packet-*.md` | Integration logs |
| `additive-extractions/LEGACY_*.md` (3 files) | `_session-lineage/additive-extractions/LEGACY_*.md` | Legacy reference |

### Reshape Artifacts (Archive After Execution)

| Current | New | Note |
|---|---|---|
| `CANONICAL_ASSESSMENT.md` | `_session-lineage/assessment-canonical-2026-02-18.md` | Timestamped assessment |
| `RESHAPE_PROPOSAL.md` | `_session-lineage/reshape-proposal-2026-02-18.md` | This document, post-execution |
| `_SCRATCH_*.md` (3 files) | `_session-lineage/agent-work/` | Move with dates |
| `_RESHAPE_PLAN_*.md` (3 files) | `_session-lineage/agent-work/` | Move with dates |

### New Files to Create

| File | Purpose |
|---|---|
| `README.md` | Entry point: scope, reading order, file categories, "If You Need X, Read Y" |
| `ARCHITECTURE.md` | Merged canonical overview (see §4) |
| `_session-lineage/README.md` | Index: what's archived, why, how to use |

---

## 4. ARCHITECTURE.md — Merged Document Design

### Section Outline with Source Mapping

```
1. DOCUMENT HEADER
   - Title, scope (2-3 sentences), last updated, supersedes note
   - Pointers: DECISIONS.md for decision log, examples/ for walkthroughs

2. LOCKED POLICIES (10 items, deduplicated)
   Source: Packet Index locked policies (primary wording) + Posture Spec §2 (cross-check)
   Strategy: Use Packet Index wording where crisper; Posture Spec where more precise.
   Each follows: MUST/SHALL statement + 1-2 sentence why.

3. CANONICAL CALLER/AUTH MATRIX
   Source: Posture Spec §2.1 (4×7, most complete) cross-checked with AXIS_02 (4×6, full caller coverage)
   One definitive 4-row × 7-column table:
   - First-party MFE/internal → /rpc → RPCLink → internal only → session/auth → forbidden: /api/inngest
   - Server-internal in-process → package client → createRouterClient → internal only → trusted service → forbidden: local HTTP self-calls
   - External/third-party → /api/orpc/*, /api/workflows/<cap>/* → OpenAPILink → published → boundary auth → forbidden: /rpc, /api/inngest
   - Runtime ingress → /api/inngest → Inngest callback → runtime-only → signed ingress → forbidden: /rpc, /api/orpc/*, /api/workflows/*
   Note: Axis-specific tables in AXIS_02 (caller perspective), AXIS_07 (route perspective) are complementary views.

4. SUBSYSTEM-WIDE CONSTRAINTS (5 chunked groups, ~30 items total)
   Source: Posture Spec §4 (31 invariants) + Packet Index cross-cutting defaults (25 items), deduplicated

   4.1 Routing & Transport Constraints (7 items)
       Route access control, no /rpc/workflows mount, one Inngest bundle per process, etc.

   4.2 Ownership & Boundary Contracts (5 items)
       Plugin owns boundary contracts, packages transport-neutral, Durable Endpoints additive only, etc.

   4.3 Schema & Procedure Ownership (6 items)
       TypeBox-only contracts, I/O schema co-location, domain/* transport-independent only, context.ts ownership, etc.

   4.4 Naming & Directory Conventions (5 items)
       Concise domain identifiers, canonical role names (contract/router/client/operations/index), etc.

   4.5 Docs & Schema Extraction Policy (6 items)
       schema({...}) shorthand, inline I/O default, extraction exceptions, dedupe markers, etc.

5. HOST BOOTSTRAP & MOUNT ORDER (6 steps with causality)
   Source: Posture Spec §8 + Packet Index D-008 + AXIS_07
   Each step: what happens + WHY it must happen in this order (F-02)

6. CANONICAL DIRECTORY STRUCTURE
   Source: Posture Spec §6 + AXIS_07 file tree
   Complete tree with ownership annotations (package vs plugin vs host)

7. INTEGRATIVE INTERACTION FLOWS
   Source: Posture Spec §7
   Three canonical flows preserved as-is

8. OWNERSHIP SPLIT & ROUTING SUMMARY
   Source: Posture Spec §9
   6 sub-sections: Host/Route Spine, Bootstrap Order, Internal Transport, Manifest Composition, Ownership Split, Caller-Mode Split

9. DECISION HISTORY (brief)
   Source: Posture Spec §9.1
   Summary with pointer to DECISIONS.md for full log

10. NAMING, ADOPTION & SCALE GOVERNANCE
    Source: Posture Spec §10 + AXIS_07 naming rules + AXIS_03 adoption criteria
    Sub-sections: Role Names, Package Layering, Schema Authoring, Adoption Exceptions (3-part from AXIS_03 per F-05)

11. AXIS COVERAGE MAP
    Source: Both docs' axis lists
    Table: Axis number → policy surface → canonical leaf spec filename

12. NAVIGATION MAP (If You Need X, Read Y)
    Source: Packet Index navigation map
    Preserved as-is (high-value reference)

APPENDIX A: ORIGINAL TENSIONS (Optional)
    Source: Posture Spec §3
    Moved from primary flow to appendix — useful for "why," not needed for "what to do"

APPENDIX B: SOURCE ANCHORS
    Source: Posture Spec §11
    Links to oRPC, Inngest, Elysia, TypeBox docs
```

### Policy Deduplication Strategy

Both Posture Spec §2 (14 items) and Packet Index (10 items) describe the same 10 core locked policies with different wording:

- **Packet Index is primary** — it's explicitly canonical ("This packet is the canonical leaf-level spec set"), more precise, already reviewed
- **Posture Spec is cross-check** — use for additional nuance; when both are equivalent, use the clearer version
- **Result:** 10 deduplicated policies, each with the best wording from either source

### Header Renaming

| Old Header | New Header | Why |
|---|---|---|
| "Global Invariants" | "Subsystem-Wide Constraints" | "Global" too vague; "constraints" emphasizes boundaries |
| "Integrative Topology" | "Canonical Directory Structure" | Says what it contains |
| "Composition Spine" | "Host Bootstrap & Mount Order" | Describes actual content |
| "Cross-Cutting Defaults" | merged into §4 | Eliminated as separate concept |
| "D-008 Integration Scope" | removed | Temporal changelog, not policy (F-10) |
| "Original Tensions" | Appendix A | Progressive disclosure — useful context, not primary flow |

---

## 5. Caller/Auth Matrix Consolidation

### The Problem

7 renderings with material differences:

| Source | Rows | Complete? | Issue |
|---|---|---|---|
| Posture Spec §2.1 | 4 | Yes | Most columns (7) |
| Packet Index YAML | 3 | No | Loses server/CLI; metadata-only |
| AXIS_01 table | 3 | No | Missing server/CLI |
| AXIS_02 table | 4 | Yes | Full caller coverage (6 cols) |
| AXIS_03 table | 3 | No | Missing server/CLI |
| AXIS_07 (2 tables) | 4+3 | Mixed | Route-centric (different question) |
| AXIS_08 table | 3 | No | Missing server/CLI |

### Resolution

**ARCHITECTURE.md §3** gets the single canonical 4×7 table (synthesized from Posture Spec structure + AXIS_02 completeness).

Axis-specific tables become labeled views:
- **AXIS_02:** Detailed caller-perspective view (adds implementation context). Note: "See ARCHITECTURE.md §3 for the canonical matrix."
- **AXIS_07:** Route-centric view (answers "what is each route family for?" — different question). Kept as complementary. Intro strengthened.
- **AXIS_01, 03, 08:** Add reference note: "For the complete 4-row canonical matrix, see ARCHITECTURE.md §3. This shows the [axis-specific] implications."

No tables deleted. All simplified views gain reference notes pointing to canonical form.

---

## 6. AXIS_07 Reorganization

### The Problem

300+ lines covering 6-7 concerns: mount policies, runtime inventory, fixtures, file tree, naming rules, composition helpers. Reader looking for "naming rules" must scroll past fixture code.

### Resolution: Subsection Grouping (Keep One File)

Add H3 sub-headers within `axes/07-host-composition.md`:

```
## In Scope / Out of Scope
## Canonical Policy (11 items)
### Mount Boundaries and Composition Spine
### Route Family Purpose Table
### Host Route/Auth Enforcement Matrix
## Why & Trade-Offs
## --- REFERENCE SECTION ---
### Naming Rules and Conventions
### Canonical Runtime/Host Inventory (4 files)
### Canonical File Tree
### Required Root Fixtures (code)
### Optional Composition Helpers
## References
```

**Policy first, reference after.** Prominent separator between the two halves. Preserves the nine-axis model (no new file), keeps related content co-located, adds scannability.

---

## 7. Per-Axis Interior Improvements

All content preserved. Only structure, scent, and density are improved.

### AXIS_01: External Client Generation
- Add 2-3 sentence "Why this matters" after policy (OpenAPI determinism prevents drift)
- Fix 2 absolute paths → repo-relative (F-08)
- Improve "Related Normative Rules" header scent
- Verify cross-references to AXIS_02, AXIS_08, E2E_01, E2E_03

### AXIS_02: Internal Clients
- Add "policy coherence" note explaining server-internal + package-reuse coexistence
- Strengthen domain module scope: "Transport-independent only; do NOT place procedure I/O or boundary metadata in domain/*"
- Fix 2 absolute paths (F-08)
- Verify E2E_02, E2E_03 references

### AXIS_03: Split vs Collapse
- Add 2-3 sentence "Why split matters" (request/response ≠ event/step semantics)
- Number the 7 red flags; add reinforcement sentence
- Fix 2 absolute paths (F-08)
- Verify AXIS_08, AXIS_09, E2E references

### AXIS_04: Context Propagation
- Add context-envelope visual (mermaid or ASCII) showing request vs run/attempt lifecycle
- Clarify metadata scope: "Layer contracts model the request/execution envelope, not domain state"
- Fix 2 absolute paths (F-08)
- Verify E2E_04 reference

### AXIS_05: Errors, Logging, Observability
- Convert D-008 bullet list to prose (readability)
- Add "two shapes coexist" note: request/response ≠ run/timeline, so two error shapes are intentional
- Fix 5 absolute paths (F-08)
- Verify E2E_04 reference

### AXIS_06: Middleware
- Add placement matrix intro: "Middleware is not one literal stack. Boundary and durable runtime controls live in separate harnesses."
- Add H3 header + intro for dedupe contract subsection
- Fix 3 absolute paths (F-08)
- Cross-check dedupe against D-009 (SHOULD language)

### AXIS_07: Host Composition
- **Major:** Reorganize with H3 subsections (see §6 above)
- Add "Why" context: mount boundaries are the clearest expression of harness ownership
- Fix 4 absolute paths (F-08)
- Add cross-references to AXIS_04 (context envelope), AXIS_06 (middleware placement)

### AXIS_08: Workflow vs API Boundaries
- Move path strategy debate to DECISIONS.md as D-012 (F-11)
- Replace with reference + one-sentence statement
- Add "consumer model coherence" note (prevents "two ways to trigger" drift)
- Fix absolute paths (F-08)
- Cross-verify mount enforcement with AXIS_07

### AXIS_09: Durable Endpoints
- Expand "Allowed vs Disallowed" with explanation (adapters for non-overlapping use cases OK; parallel first-party trigger paths not OK)
- Add cross-reference to AXIS_03 anti-dual-path policy
- Verify scope boundaries against D-009, D-010

### Summary

| Category | Files | Lines added | Lines removed | Net |
|---|---|---|---|---|
| Axis docs (01-09) | 9 | ~120 | ~0 | +120 |
| Total absolute paths fixed | 7 files | — | — | 22 instances |

---

## 8. E2E Example Improvements

### Progression Gaps

| Transition | Gap |
|---|---|
| E2E_01 → E2E_02 | Large jump: API-only → suddenly workflows + Inngest + durable execution |
| E2E_03 → E2E_04 | Large jump: MFE + routing → full context + metadata + middleware across all surfaces |

### Fix: Bridge Notes + Diff-View Trees + Axes Covered

**Bridge notes** (2-3 sentences each) between examples explaining what the next example adds and why.

**Diff-view file trees** for E2E_02, E2E_03, E2E_04: show only new files compared to prior example, with reference to E2E_01 for the full tree. Reduces repetition without losing clarity.

**"Key Axes Covered"** section added to each E2E:

- **E2E_01:** AXIS_01 (contract-first generation), AXIS_02 (internal package structure), AXIS_07 (API-only composition)
- **E2E_02:** AXIS_02 (cross-plugin client usage), AXIS_03 (split posture), AXIS_05 (status/timeline), AXIS_07 (Inngest composition), AXIS_08 (workflow trigger split)
- **E2E_03:** AXIS_01 (OpenAPI publication), AXIS_02 (browser-safe helpers), AXIS_03 (caller-mode boundaries), AXIS_04 (context envelope), AXIS_07 (multi-caller composition), AXIS_08 (consumer model)
- **E2E_04:** AXIS_04 (full context scope), AXIS_05 (error handling + traces), AXIS_06 (middleware placement + dedupe), AXIS_07 (baseline traces init order), all prior

### Additional E2E Fixes

- **F-12:** Add 2-sentence note to E2E_03 explaining internal client divergence vs E2E_02 (full context vs minimal deps — both valid)
- **F-13:** Ensure `schema({...})` naming consistency; add note to AXIS_07 fixture that package exports both `typeBoxStandardSchema` and `schema` convenience alias
- Verify caller/auth matrix renderings in E2E_03, E2E_04 match canonical form

### Summary

| Files | Lines added | Lines removed | Net |
|---|---|---|---|
| 4 E2E examples | ~70 | ~130 (tree dedup) | -60 |

---

## 9. DECISIONS.md Improvements

- **F-06:** Migration note at top: "This register supersedes legacy numbering in `_session-lineage/additive-extractions/LEGACY_DECISIONS_APPENDIX.md`. Legacy D-004/D-005 have no direct equivalents."
- **F-09:** Standardize field naming across all entries: `why_closed` + `closure_scope` for closed; `why_open` + `non_blocking_guidance` for open
- **D-008 header rename:** "D-008 Integration Scope" → "D-008 — Extended Traces Middleware Initialization Order Standard"
- **D-012 field fix:** Change `locked_decision` → `resolution` for format consistency
- **F-11:** Add new closed D-012 entry for path strategy (capability-first, moved from AXIS_08)

Lines affected: ~23 mechanical changes + ~12 for new D-012 entry

---

## 10. Cross-Reference Cleanup

### Absolute Path Fixes (F-08)

22 instances across 7 axis docs. All `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` → repo-relative (e.g., `packages/core/src/orpc/hq-router.ts:5`).

| File | Count |
|---|---|
| AXIS_01 | 2 |
| AXIS_02 | 2 |
| AXIS_03 | 2 |
| AXIS_04 | 2 |
| AXIS_05 | 5 |
| AXIS_06 | 3 |
| AXIS_07 | 4 |

### Reference Updates After Rename

All inter-document references update to new filenames. Session-ID-prefixed references to Posture Spec become references to ARCHITECTURE.md. Packet Index references become ARCHITECTURE.md references.

### Validation Checklist

- All AXIS_NN references use new filenames
- All E2E references use new filenames
- DECISIONS.md impacted_docs fields updated
- No orphaned references to merged/moved content
- All internal links use relative paths
- Footnote reference style consistent

---

## 11. Confident Fixes (Preserved from Original + Expanded)

All 13 original fixes are incorporated into the sections above. Summary with locations:

| Fix | Description | Where Applied |
|---|---|---|
| F-01 | Collapse caller/auth matrix to one canonical rendering | §5 |
| F-02 | Explain bootstrap order causality | §4 (ARCHITECTURE.md §5) |
| F-03 | Fix "domain packages stay transport-neutral" scope | §4 (ARCHITECTURE.md §4.2) + AXIS_02 |
| F-04 | Settle middleware dedupe at SHOULD | §4 (ARCHITECTURE.md §4.5) + AXIS_06 |
| F-05 | Use AXIS_03 detailed adoption exception criteria | §4 (ARCHITECTURE.md §10) |
| F-06 | Add decision numbering migration note | §9 |
| F-07 | Timestamp the Loop Closure Bridge | §3 (archive disposition) |
| F-08 | Convert absolute paths to repo-relative | §10 |
| F-09 | Standardize DECISIONS.md field naming | §9 |
| F-10 | Remove D-008 Integration Scope from Packet Index | §4 (merge absorbs it) |
| F-11 | Move AXIS_08 path strategy to DECISIONS.md | §7 (AXIS_08) + §9 |
| F-12 | Add E2E internal client divergence note | §8 |
| F-13 | Resolve schema export naming | §8 + §7 (AXIS_07) |

---

## 12. Open Questions (Need Owner Decision)

None of these block the reshape. They can be resolved post-execution and incorporated into DECISIONS.md.

### Q-01. Inngest `/api/inngest` ingress security — how specific?

**Context:** Spec says "signed runtime ingress only" but no mechanism specified (signing keys, dev-mode behavior, gateway allow-listing).

**Options:** (a) Add concrete security requirements to ARCHITECTURE.md, (b) Keep at "signed ingress" assertion and defer to ops/security doc, (c) Track as open decision D-014.

**Agent recommendation:** (b) — defer to ops/security doc. Not spec-level concern.

### Q-02. Forbidden route enforcement behavior?

**Context:** Matrix declares boundaries but not what happens on violation. 403? 404? Gateway block?

**Options:** (a) 403 at app level, (b) 404 at app level, (c) Gateway-level block, (d) Defer to implementer.

**Agent recommendation:** (d) — spec declares boundary, implementer chooses enforcement.

### Q-03. Promote legacy testing requirements?

**Context:** `LEGACY_TESTING_SYNC.md` has concrete testing requirements not captured canonically.

**Options:** (a) Create open decision tracking these, (b) Archive as implementation context.

**Agent recommendation:** (b) — archive as implementation context, not spec policy.

### Q-04. Promote legacy metadata removal plan?

**Context:** `LEGACY_METADATA_REMOVAL.md` describes removing `templateRole`, `channel`, `publishTier`.

**Options:** (a) Create deprecation decisions in DECISIONS.md, (b) Archive as implementation context.

**Agent recommendation:** (b) — handle during implementation.

### Q-05. Are view/projection helpers allowed in `domain/*`?

**Context:** E2E_03 shows `domain/view.ts` with `toRunBadge()`. D-011 says domain/* holds "transport-independent domain concepts only."

**Options:** (a) Expand D-011 scope to include projections, (b) Move view.ts to service/, (c) Allow with note: "transport-independent projections acceptable."

**Agent recommendation:** (c) — allow with explicit note.

### Q-06. Is `rawr.hq.ts` generated or hand-authored?

**Context:** AXIS_07 implies generation; Posture Spec §8 shows hand-authored code.

**Options:** (a) Generated (don't edit manually), (b) Hand-authored with generated inputs, (c) Aspirationally generated, currently hand-authored.

**Agent recommendation:** Pending technology decision. Note target state in ARCHITECTURE.md.

---

## 13. Execution Sequence

### Phase 1: Create Structure (30 min)

1. Create `docs/projects/flat-runtime/` directory tree
2. Move and rename all canonical files (axes, examples, DECISIONS.md)
3. Move session artifacts to `_session-lineage/` with organized subdirectories

### Phase 2: Merge into ARCHITECTURE.md (1-2 hours)

1. Create ARCHITECTURE.md structure per §4 outline
2. Merge Posture Spec + Packet Index using dedup strategy
3. Chunk 31 invariants + 25 defaults into 5 named groups
4. Consolidate caller/auth matrix to single canonical form
5. Add bootstrap causality explanation (F-02)
6. Apply header renames
7. Move "Original Tensions" to Appendix A

### Phase 3: Interior Quality (2-3 hours)

1. AXIS_07 reorganization with H3 subsections
2. Per-axis improvements (all 9 axes, ~10-15 min each)
3. E2E improvements (bridge notes, diff-view trees, axes covered)
4. DECISIONS.md cleanup (field standardization, migration note, D-012)

### Phase 4: Cross-Reference Repair (30 min)

1. Fix 22 absolute paths across 7 files
2. Update all inter-document references to new filenames
3. Add canonical matrix reference notes to axis tables
4. Validate no orphaned references

### Phase 5: Navigation & Wayfinding (30 min)

1. Write root README.md (scope, reading order, categories, "If You Need X")
2. Write `_session-lineage/README.md` (index of archived artifacts)

### Phase 6: Verification (30 min)

1. Re-run all five mandate checks on reshaped structure
2. Spot-check code snippets for accuracy
3. Verify no content was dropped
4. Test navigation flow (can readers find what they need?)

**Total estimate: 5-7 hours**

---

## 14. Risk Assessment

**Risk: LOW.** This is structural reorganization. No policy changes, no content deletion, no breaking changes to decision IDs.

**What could go wrong:**
- Orphaned cross-references after rename → mitigated by validation checklist in Phase 4
- Content accidentally dropped during merge → mitigated by diff-check in Phase 6
- ARCHITECTURE.md too long after merge → mitigated by progressive disclosure (appendices, axis pointers, navigation map)

**What does NOT change:**
- All 10 locked policies (content identical, wording improved)
- All 9 axis policy statements
- All 4 E2E examples (content intact, structure improved)
- All decision entries in DECISIONS.md (format standardized, content preserved)
- The nine-axis decomposition model
