# System-Level Reshape Plan: Directory Architecture, Naming, and Wayfinding
**Agent 1 Focus: System-level directory architecture, file naming, wayfinding, and canonical vs session-lineage separation**

**Status:** Phase 1 (Understand) + Phase 2 (Design) Complete
**Date:** 2026-02-18
**Scope:** Directory tree restructuring, file disposition, wayfinding strategy, and mandate compliance

---

## PHASE 1: UNDERSTAND — Six-Axis Assessment

### 1.1 Axis Position Analysis

| Axis | Current Position | Target Position | Rationale |
|------|-----------------|-----------------|-----------|
| **Purpose** | Precision/reference | Precision/reference | Correct position — readers need to look up policies, verify implementations, find specific decisions. No change needed. |
| **Density** | Compact-to-moderate (mixed) | Moderate with progressive disclosure | Session artifacts are unnecessarily dense; canonical docs need more "why" context for locked decisions; chunking of flat lists will improve scannability. |
| **Linearity** | Random-access dominant (no sequential path) | Hybrid with sequential onramp | Canonical architecture should have preferred reading order (big picture first, then axis deep-dives); examples demonstrate that order; process artifacts can stay random-access. |
| **Audience** | Expert (assumes oRPC/Inngest/TypeBox knowledge) | Expert (preserved) | Correct position — intended for experienced developers implementing the flat-runtime pattern. No change. |
| **Scope** | Multi-artifact system (35+ files), but boundaries unclear | Multi-artifact with filesystem-visible canonical/process split | Current problem: a reader can't tell which files are normative just by looking at directory structure. Session-ID prefixes and mixed locations create ambiguity. Target: canonical in root directories, process in `_session-lineage/`. |
| **Temporality** | Mixed (locked policy + open decisions + process logs side-by-side) | Pace-layered (separate by change rate and status) | Current problem: process artifacts (scratchpads, changelogs, reviews) live alongside frozen canonical docs. Target: canonical never changes; decisions get revisited in DECISIONS.md; process is explicitly archived. |

### 1.2 The Problem Statement

**Root cause (from CANONICAL_ASSESSMENT):** The directory conflates three artifact categories:
1. **Canonical policy** — normative, locked, implementation guidance (the Posture Spec, Packet Index, Axis docs, Examples, Decisions)
2. **Process archaeology** — session scratchpads, agent logs, planning documents, closure reviews (SESSION_019c587a_* files)
3. **Bridge/context** — explanatory documents that connect process to policy (Loop Closure Bridge)

A reader landing in the directory sees 15+ SESSION_* files at the same level as the canonical `orpc-ingest-spec-packet/` subdirectory, with no README to explain the distinction. The filename format ("SESSION_019c587a_POSTURE_SPEC") signals point-in-time artifacts, not living policy.

Additionally:
- Two canonical entry points (Posture Spec + Packet Index) declare mutual authority
- Session prefixes on canonical filenames create false temporality
- No single wayfinding document

**Desired outcome:** A structure where:
- Canonical documents are discoverable without reading everything
- Session/process artifacts are explicitly separate
- Reading order is clear
- File names predict content without requiring context

### 1.3 Current State: Detailed Inventory

**At root (`flat-runtime-session-review/`):**
- 2 canonical analysis docs: `CANONICAL_ASSESSMENT.md`, `RESHAPE_PROPOSAL.md`
- 3 session-prefixed agent work artifacts (scratchpads, plans, recommendations)
- 12 session-prefixed decision/closure docs
- 3 session-prefixed changelogs/reviews
- 1 session-prefixed canonical spec (should be unprefixed): `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- 1 Loop Closure Bridge (process-lineage document)
- 1 subdirectory: `orpc-ingest-spec-packet/`
- 1 subdirectory: `additive-extractions/`
- 3 scratch assessment files (not yet archived)

**In `orpc-ingest-spec-packet/`:**
- 1 Packet index: `ORPC_INGEST_SPEC_PACKET.md` (entry point)
- 9 Axis documents: `AXIS_01.md` through `AXIS_09.md`
- 1 Decision register: `DECISIONS.md` (buried here, not discoverable from root)
- 4 E2E examples: `E2E_01.md` through `E2E_04.md` (in `examples/` subdirectory)
- 1 Traceability doc: `REDISTRIBUTION_TRACEABILITY.md`

**In `additive-extractions/`:**
- 3 legacy/archived docs: `LEGACY_DECISIONS_APPENDIX.md`, `LEGACY_METADATA_REMOVAL.md`, `LEGACY_TESTING_SYNC.md`

### 1.4 Default Patterns Observed (from Assessment)

| Pattern | Severity | Location | Impact |
|---------|----------|----------|--------|
| Flat hierarchy at root | Critical | Root directory | 15 session files as peers, no grouping; impossible to distinguish canonical from process at a glance |
| Session-ID prefixes on canonical filenames | Critical | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | Signals point-in-time artifact, not living policy; misleads readers about document status |
| Dual-authority split (Posture Spec vs Packet Index) | Critical | Root + subdirectory | Creates "which one do I trust?" ambiguity; no clear canonical form for caller/auth matrix |
| Buried decision register | High | `orpc-ingest-spec-packet/DECISIONS.md` | Not discoverable from root; new readers must navigate through intermediate directory to find the decision ledger |
| No README or wayfinding | High | Root and subdirectories | Reader must infer structure; no guidance on "how to read this spec" or categories of artifacts |
| Flat numbered lists without chunking | High | Posture Spec, Packet Index | 31 global invariants + 25 cross-cutting defaults + 9 packet rules in single flat lists; cognitive overload |
| Absolute filesystem paths in references | Medium | Several axis docs | `/Users/mateicanavra/Documents/...` breaks everywhere except one machine |
| AXIS_07 overloaded | High | `AXIS_07_HOST_HOOKING_COMPOSITION.md` | 6-7 distinct concerns in one document; strains the axis template |
| Redundant scaffolding | Medium | Posture Spec, Packet Index, multiple axes | Caller/auth matrix repeated 7 times with slight variations |

### 1.5 Information-Design Mandate Expectations

By the end of this reshape:
- **Logic test:** Strip all filenames and directory structure. Does the conceptual flow hold? Yes — canonical policy leads to axis deep-dives, examples apply axes, decisions track trade-offs, process is archived context.
- **Skim test:** Reading only filenames (treating them as headers), can a reader answer "what is this" in 30 seconds? Currently no. Target: yes.
- **Swap test:** Could this structure apply to a different spec packet (different technologies)? Yes — the pattern (canonical + axes + examples + decisions + process archive) is generalizable.
- **Noise test:** Every file and directory should earn its place. Process scratchpads don't earn a place in the canonical directory — move them out.
- **Scent test:** Every filename should predict content. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` fails scent — "SESSION_..." predicts "point-in-time artifact" not "canonical living policy."

---

## PHASE 2: DESIGN — Target Directory Structure and File Disposition

### 2.1 Proposed Target Structure

```
docs/projects/flat-runtime/
├── README.md                                    # Entry point: scope, reading order, file categories
├── ARCHITECTURE.md                              # Merged posture spec + packet index (canonical overview)
├── DECISIONS.md                                 # Decision register (promoted from subdirectory)
│
├── axes/
│   ├── 01-external-client-generation.md        # Axis 1 (renamed from AXIS_01_*)
│   ├── 02-internal-clients.md                  # Axis 2
│   ├── 03-split-vs-collapse.md                 # Axis 3
│   ├── 04-context-propagation.md               # Axis 4
│   ├── 05-errors-observability.md              # Axis 5
│   ├── 06-middleware.md                        # Axis 6
│   ├── 07-host-composition.md                  # Axis 7 (overload addressed by chunking)
│   ├── 08-workflow-api-boundaries.md           # Axis 8
│   └── 09-durable-endpoints.md                 # Axis 9
├── axes/README.md                              # [Optional] Axis navigation guide
│
├── examples/
│   ├── README.md                               # [Optional] Example progression guide
│   ├── e2e-01-basic-package-api.md             # E2E 1 (renamed)
│   ├── e2e-02-api-workflows.md                 # E2E 2
│   ├── e2e-03-microfrontend-integration.md     # E2E 3
│   └── e2e-04-context-middleware.md            # E2E 4
│
└── _session-lineage/                           # Explicitly non-normative process artifacts
    ├── README.md                               # Index: what's in here, why it's archived
    ├── loop-closure-bridge.md                  # Session context and evolution narrative
    ├── route-design-review.md                  # Detailed architectural debate
    ├── d008-closure-review.md                  # Specific decision closure work
    ├── surface-packet-integration.md           # Integration work documentation
    ├── redistribution-traceability.md          # Traceability/source mapping
    │
    ├── agent-work/                            # Agent scratchpads, plans, recommendations
    │   ├── d008-plan-verbatim.md
    │   ├── d008-recommendation.md
    │   ├── d008-scratchpad.md
    │   ├── agent-route-design-plan.md
    │   ├── agent-route-design-scratchpad.md
    │   └── ...
    │
    ├── closures/                              # Closure and integration changelogs
    │   ├── d006-correction-review.md
    │   ├── d008-orchestrator-scratchpad.md
    │   ├── d008-closure-plan.md
    │   ├── d008-d010-closure-review.md
    │   ├── d008-integration-changelog.md
    │   └── surface-packet-execution-changelog.md
    │
    └── additive-extractions/                  # Legacy and supplementary material
        ├── LEGACY_DECISIONS_APPENDIX.md       # Old decision numbering (for reference only)
        ├── LEGACY_METADATA_REMOVAL.md         # Metadata deprecation plan
        └── LEGACY_TESTING_SYNC.md             # Testing requirements (archived)
```

### 2.2 File-by-File Disposition Table

| Current Path | New Path | Content Type | Rationale |
|---|---|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | (merge) → `ARCHITECTURE.md` | Canonical | Posture Spec is the integrative overview. Merge with Packet Index into single `ARCHITECTURE.md` to eliminate dual-authority ambiguity. Remove SESSION prefix. |
| `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | (merge) → `ARCHITECTURE.md` | Canonical | Packet Index provides structure. Merge policies + matrix with Posture Spec. Callable/Auth Matrix becomes single canonical rendering. |
| `orpc-ingest-spec-packet/DECISIONS.md` | `DECISIONS.md` | Canonical | Decision register is crucial for long-term reference. Promote to project root so it's discoverable from README. Apply F-06, F-09 fixes. |
| `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md` | `axes/01-external-client-generation.md` | Canonical | Rename to human-readable name (01-* prefix maintains sort order). Apply F-08 fix (absolute paths → repo-relative). No content changes. |
| `orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` | `axes/02-internal-clients.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md` | `axes/03-split-vs-collapse.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md` | `axes/04-context-propagation.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md` | `axes/05-errors-observability.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md` | `axes/06-middleware.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md` | `axes/07-host-composition.md` | Canonical | Rename. ADDRESSED OVERLOAD: Add prominent H3 sub-sections grouping the 6-7 concerns (mount policies | route family table | runtime inventory | file tree | required fixtures | naming rules | optional composition helpers). Apply F-08 fix. |
| `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` | `axes/08-workflow-api-boundaries.md` | Canonical | Rename. Apply F-11 fix: Move path strategy debate to DECISIONS.md entry; replace with reference + one-sentence statement. |
| `orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md` | `axes/09-durable-endpoints.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` | `examples/e2e-01-basic-package-api.md` | Canonical | Rename to human-readable format. No content changes. |
| `orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md` | `examples/e2e-02-api-workflows.md` | Canonical | Rename. Apply F-12 fix: Add 2-sentence explanatory note for internal client divergence vs E2E_03. |
| `orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md` | `examples/e2e-03-microfrontend-integration.md` | Canonical | Rename. Apply F-13 fix: Ensure `schema()` export naming consistency. |
| `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` | `examples/e2e-04-context-middleware.md` | Canonical | Rename. No content changes. |
| `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` | `_session-lineage/redistribution-traceability.md` | Process/Reference | Move to session-lineage (useful context but not policy; supports traceability). |
| `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` | `_session-lineage/loop-closure-bridge.md` | Process/Context | Move to session-lineage. Apply F-07 fix: Add "as-of" timestamp to prevent confusion with current state. Preserve content as-is. |
| `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` | `_session-lineage/route-design-review.md` | Process/Context | Move to session-lineage. Valuable architectural debate; preserve for context, not policy. |
| `SESSION_019c587a_D006_CORRECTION_FINAL_REVIEW_REPORT.md` | `_session-lineage/closures/d006-correction-review.md` | Process/Work Log | Move to closures subdirectory. |
| `SESSION_019c587a_D008_CLOSURE_ORCHESTRATOR_SCRATCHPAD.md` | `_session-lineage/agent-work/d008-orchestrator-scratchpad.md` | Process/Agent Log | Move to agent-work subdirectory. |
| `SESSION_019c587a_D008_CLOSURE_PLAN_VERBATIM.md` | `_session-lineage/agent-work/d008-closure-plan.md` | Process/Agent Log | Move to agent-work subdirectory. |
| `SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md` | `_session-lineage/closures/d008-d010-closure-review.md` | Process/Work Log | Move to closures subdirectory. |
| `SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md` | `_session-lineage/closures/d008-integration-changelog.md` | Process/Changelog | Move to closures. |
| `SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md` | `_session-lineage/agent-work/agent-d008-plan.md` | Process/Agent Log | Move to agent-work. |
| `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` | `_session-lineage/agent-work/agent-d008-recommendation.md` | Process/Agent Log | Move to agent-work. |
| `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md` | `_session-lineage/agent-work/agent-d008-scratchpad.md` | Process/Agent Log | Move to agent-work. |
| `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md` | `_session-lineage/agent-work/agent-route-design-plan.md` | Process/Agent Log | Move to agent-work. |
| `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_SCRATCHPAD.md` | `_session-lineage/agent-work/agent-route-design-scratchpad.md` | Process/Agent Log | Move to agent-work. |
| `SESSION_019c587a_SURFACE_PACKET_EXECUTION_CHANGELOG.md` | `_session-lineage/closures/surface-packet-execution-changelog.md` | Process/Changelog | Move to closures. |
| `SESSION_019c587a_SURFACE_PACKET_INTEGRATION_FINAL_REVIEW.md` | `_session-lineage/closures/surface-packet-integration-review.md` | Process/Work Log | Move to closures. |
| `additive-extractions/LEGACY_DECISIONS_APPENDIX.md` | `_session-lineage/additive-extractions/LEGACY_DECISIONS_APPENDIX.md` | Archive/Reference | Move to session-lineage/additive-extractions. Preserve as-is. Apply F-06 fix: Add migration note to canonical DECISIONS.md linking this. |
| `additive-extractions/LEGACY_METADATA_REMOVAL.md` | `_session-lineage/additive-extractions/LEGACY_METADATA_REMOVAL.md` | Archive/Reference | Move to session-lineage. Useful context for implementation; not policy. |
| `additive-extractions/LEGACY_TESTING_SYNC.md` | `_session-lineage/additive-extractions/LEGACY_TESTING_SYNC.md` | Archive/Reference | Move to session-lineage. Testing requirements may migrate to DECISIONS.md if they become canonical policy. |
| `CANONICAL_ASSESSMENT.md` | `_session-lineage/assessment-canonical-2026-02-18.md` | Analysis/Record | Move to session-lineage. This is a timestamped assessment artifact, not ongoing policy. Rename to include date. |
| `RESHAPE_PROPOSAL.md` | `_session-lineage/reshape-proposal-2026-02-18.md` | Analysis/Plan | Move to session-lineage. Timestamped plan document; kept for traceability. |
| `_SCRATCH_SYSTEM_STRUCTURE_ASSESSMENT.md` | DELETE or move to `_session-lineage/agent-work/` | Scratch/Archive | If valuable for traceability, move to agent-work and timestamp. Otherwise delete (it's replaced by CANONICAL_ASSESSMENT.md). |
| `_SCRATCH_CONTENT_POLICY_ASSESSMENT.md` | DELETE or move to `_session-lineage/agent-work/` | Scratch/Archive | Same as above. |
| `_SCRATCH_IMPLEMENTATION_FITNESS_ASSESSMENT.md` | DELETE or move to `_session-lineage/agent-work/` | Scratch/Archive | Same as above. |
| (Create) `README.md` | `README.md` | Canonical/Navigation | New file. Entry point with scope, reading order, file categories, navigation flowchart. |
| (Create) `axes/README.md` | `axes/README.md` | Canonical/Navigation | Optional. Brief guide to axis progression and dependencies. |
| (Create) `examples/README.md` | `examples/README.md` | Canonical/Navigation | Optional. E2E example progression and complexity growth. |
| (Create) `_session-lineage/README.md` | `_session-lineage/README.md` | Process/Context | Index: what's in here, why it's archived, how to use it for reference. |

### 2.3 Directory-Level Navigation Strategy

**Root Directory (`flat-runtime/`):**
- Purpose: Entry point for canonical architecture specification
- Files: README.md, ARCHITECTURE.md, DECISIONS.md only (+ subdirectories)
- README structure:
  - 1-paragraph scope statement
  - "How to Read This Spec" (sequential recommended path: ARCHITECTURE → 2-3 key axes → examples → DECISIONS for trade-offs)
  - File categories legend:
    - **Canonical policy** (ARCHITECTURE, DECISIONS, axes/*, examples/*)
    - **Process artifacts** (_session-lineage/ — historical context, not policy)
  - Quick-reference navigation map: "If You Need X, Read Y"

**axes/ Subdirectory:**
- Purpose: Policy deep-dives organized by concern
- 9 axis documents with consistent structure (In/Out scope → Policy → Why/Trade-Offs → Snippets → References)
- Optional README.md for axis progression guidance

**examples/ Subdirectory:**
- Purpose: Concrete implementation walkthroughs applying axis policies
- 4 E2E examples in progressive complexity (basic → workflows → microfrontend → real-world)
- Optional README.md for progression notes

**_session-lineage/ Subdirectory (Explicitly Non-Normative):**
- Purpose: Archive of process, decision-making, and context
- Three categories:
  - **agent-work/** — Agent scratchpads, plans, recommendations (explicitly not finalized)
  - **closures/** — Decision closure work, integration logs, reviews
  - **additive-extractions/** — Legacy material, deprecated decisions, historical records
- README.md in this directory explains why it exists and how to use it

### 2.4 Information Scent: Filename Improvements

| Current Name | Proposed Name | Scent Improvement |
|---|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | `ARCHITECTURE.md` | Strong: "ARCHITECTURE" immediately signals "overview of system structure" |
| `AXIS_01_EXTERNAL_CLIENT_GENERATION.md` | `01-external-client-generation.md` | Improved: removes AXIS prefix (redundant in `/axes/` dir), keeps sort order, shorter |
| `AXIS_07_HOST_HOOKING_COMPOSITION.md` | `07-host-composition.md` | Improved: shorter, clearer focus |
| `E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` | `e2e-01-basic-package-api.md` | Improved: kebab-case is standard for web; "e2e-01" clearly signals "example 1" |
| `orpc-ingest-spec-packet/` | `axes/` and `examples/` (split) | Critical improvement: current name "orpc-ingest-spec-packet" doesn't describe structure; "axes" + "examples" clearly indicate the contents |
| `ORPC_INGEST_SPEC_PACKET.md` | (merged into `ARCHITECTURE.md`) | Obsolete — merged |

### 2.5 Addressing High-Impact Structural Problems

**Problem #1: Dual-authority split (Posture Spec vs Packet Index)**
- **Fix:** Merge both documents into single `ARCHITECTURE.md` with unified structure:
  1. Scope statement
  2. Locked policies (deduplicated from both sources)
  3. Caller/Auth Matrix (one canonical 4-row rendering; other renderings in axes become "simplified views" with references)
  4. Ownership split
  5. Topology diagram
  6. Composition spine (bootstrap sequence with causality explanation)
  7. Interaction flows
  8. Cross-axis index (pointer to each axis)
  9. Example index (pointer to each E2E walkthrough)
- **Result:** One document of authority; no ambiguity about which wins.

**Problem #2: Session-ID prefixes on canonical filenames**
- **Fix:** Remove all `SESSION_019c587a_` prefixes from canonical documents.
- **Mechanism:** Use directory structure (`_session-lineage/` for temporal artifacts) instead of filename format to signal temporality.
- **Example:** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` → `ARCHITECTURE.md` (in canonical root)

**Problem #3: Flat numbered lists without chunking**
- **Fix:** When merging Posture Spec + Packet Index into ARCHITECTURE.md, break flat lists into named sub-groups:
  - **31 Global Invariants** → 5 groups: Route/Transport Invariants | Ownership Invariants | Schema/Context Invariants | Middleware Invariants | Naming Invariants
  - **25 Cross-Cutting Defaults** → 5 groups: Client/Caller Defaults | Boundary Defaults | Workflow Defaults | Bootstrap Defaults | Metadata Defaults
  - **9 Packet-Wide Rules** → 3 groups: Policy Rules | Ownership Rules | Compatibility Rules
- **Result:** Reader can hold 5 categories (4±1 rule) instead of 31 items.

**Problem #4: AXIS_07 Overload**
- **Fix:** Add prominent H3 sub-sections in `axes/07-host-composition.md` to chunk the 6-7 concerns:
  1. Mount Policies (why order matters, causal explanation)
  2. Route Family Table (canonical reference view)
  3. Host Runtime Inventory (files, responsibilities)
  4. Required Root Fixtures (code examples)
  5. Naming Rules (11 rules organized into categories)
  6. Optional Composition Helpers (4 helpers with code)
  7. File-Structure Implications (summary)
- **Alternative (not proposed here):** Split into separate documents. But assessment recommends chunking as less disruptive.
- **Result:** Reader can navigate by concern within the document without scrolling past unrelated content.

**Problem #5: Buried decision register**
- **Fix:** Promote `orpc-ingest-spec-packet/DECISIONS.md` to `docs/projects/flat-runtime/DECISIONS.md`
- **Result:** Discoverable from root README; not buried behind intermediate directory.

**Problem #6: No wayfinding / "How to read this spec"**
- **Fix:** Create root `README.md` with:
  1. 1-paragraph scope + out-of-scope statement
  2. "How to Read This Spec" section with recommended reading path
  3. File categories legend (canonical policy vs process artifacts)
  4. Quick-reference navigation map ("If You Need X, Read Y")
  5. Decision-making conventions (what "locked" means, how DECISIONS.md is used)
- **Result:** First-time reader has clear entry point and orientation.

---

## PHASE 3: MANDATE CHECKS

Running the five information-design mandates against the proposed structure:

### Logic Test: Strip All Formatting

**Question:** Does the logical flow hold without directory structure or filenames?

**Argument:**
1. The specification has a canonical overview (ARCHITECTURE.md) that establishes locked policies and invariants.
2. Nine axes provide policy deep-dives organized by concern (client generation, internal clients, boundaries, etc.).
3. Four E2E examples apply these policies in concrete scenarios of increasing complexity.
4. A decision register (DECISIONS.md) tracks trade-offs and resolutions.
5. Historical context and process artifacts are archived separately to avoid confusion with policy.

**Result:** ✓ **PASS.** The logical flow holds. Canonical policy → axis detail → concrete examples → decision record. Process artifacts are deliberately separated. The argument is sound without any reference to filenames or formatting.

### Skim Test: Read Only Filenames (Treat as Headers)

**Question:** In 30 seconds, can a reader answer "what is this about, who is it for, and what are the key points"?

**Current structure headings:**
```
ARCHITECTURE.md                    (tells you: integrative overview)
DECISIONS.md                       (tells you: decision record)
axes/01-external-client-generation.md  (tells you: specific policy slice)
axes/02-internal-clients.md            (tells you: another slice)
...
examples/e2e-01-basic-package-api.md   (tells you: concrete example)
_session-lineage/README.md             (tells you: this is process, not policy)
```

**30-second skim:**
- "ARCHITECTURE" = "system overview"
- "DECISIONS" = "trade-off record"
- "axes/*" = "policy details by concern"
- "examples/e2e-*" = "concrete applications"
- "_session-lineage/" = "archived process, for reference only"

**Result:** ✓ **PASS.** A reader in 30 seconds can answer all three questions. The structure is self-documenting.

### Swap Test: Could This Apply to a Different Spec Packet?

**Question:** Could the same directory structure and naming conventions apply to a different architectural specification (e.g., authentication system, payment processing, deployment strategy)?

**Analysis:**
- The pattern (canonical overview + axis deep-dives + examples + decision record + archived process) is independent of specific technology (oRPC, Inngest, TypeBox).
- A different spec could use the same structure: `ARCHITECTURE.md` + `axes/` + `examples/` + `DECISIONS.md` + `_session-lineage/`.
- The axis names would change, but the structure would not.
- The filename conventions (kebab-case, numbered sorting, `e2e-*` prefix for examples) are generalizable.

**Result:** ✓ **PASS.** This is a genuine structural pattern, not a template fitted to this specific content.

### Noise Test: Does Every File and Directory Earn Its Place?

**Evaluation by category:**

**Canonical policy files:**
- ARCHITECTURE.md — ✓ Earns place (consolidated overview)
- DECISIONS.md — ✓ Earns place (essential for long-term reference)
- axes/* — ✓ All earn place (policy slices required for implementation)
- examples/* — ✓ All earn place (concrete walkthroughs demonstrate axis policies in real code)

**Navigation files:**
- README.md (root) — ✓ Earns place (essential wayfinding)
- axes/README.md (optional) — ✓ Would earn place if axis progression needs explanation; can omit if axes are self-explanatory
- examples/README.md (optional) — ✓ Would earn place if complexity jumps need explanation; can omit if examples are clearly progressive
- _session-lineage/README.md — ✓ Earns place (explains why non-normative artifacts are preserved)

**Process/context files:**
- _session-lineage/loop-closure-bridge.md — ✓ Earns place (essential context for why decisions were made)
- _session-lineage/route-design-review.md — ✓ Earns place (validates architectural choices through debate)
- _session-lineage/agent-work/* — ✓ Earn place (traceability of how decisions evolved)
- _session-lineage/closures/* — ✓ Earn place (closure work documentation)
- _session-lineage/additive-extractions/* — ✓ Earn place (legacy material useful for migration planning)

**Deletion candidates:**
- `_SCRATCH_*.md` files at root — ✗ Don't earn place in either canonical or session-lineage. Recommend delete or move to agent-work with dates. They're replaced by CANONICAL_ASSESSMENT.md.

**Result:** ✓ **PASS.** Every file in the proposed structure earns its place. Scratch assessment files should be deleted or explicitly archived.

### Scent Test: Does Every Label Predict Its Content?

**Evaluation by filename:**

| Filename | Predicted Content | Actual Content | Scent Quality |
|---|---|---|---|
| `ARCHITECTURE.md` | System structure, policies, topology | Yes, exactly that | Strong |
| `DECISIONS.md` | Record of decisions, trade-offs, status | Yes | Strong |
| `axes/01-external-client-generation.md` | Policy for external API client generation | Yes | Strong |
| `axes/07-host-composition.md` | Policy for host setup and composition | Yes | Strong |
| `examples/e2e-01-basic-package-api.md` | First E2E walkthrough, basic setup | Yes | Strong |
| `examples/e2e-03-microfrontend-integration.md` | E2E example with microfrontend | Yes | Strong |
| `_session-lineage/loop-closure-bridge.md` | Context bridge connecting session to current state | Yes | Strong |
| `_session-lineage/agent-work/` | Agent working documents, logs, plans | Yes | Strong |
| `_session-lineage/closures/` | Closure work and decision finalization docs | Yes | Strong |
| `_session-lineage/additive-extractions/` | Legacy, deprecated, or supplementary material | Yes | Strong |

**Comparison to current structure:**

| Current Filename | Current Scent | Proposed Filename | Proposed Scent | Improvement |
|---|---|---|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | "Point-in-time artifact" (weak) | `ARCHITECTURE.md` | "System overview" (strong) | Strong improvement |
| `AXIS_07_HOST_HOOKING_COMPOSITION.md` | "Axis 7, something about hooking" (medium) | `axes/07-host-composition.md` | "Axis about host composition" (stronger) | Moderate improvement |
| `E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` | "Example 1, lots of concepts" (weak) | `examples/e2e-01-basic-package-api.md` | "Example 1, basic API" (strong) | Strong improvement |
| `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` | "Point-in-time session doc" (weak) | `_session-lineage/loop-closure-bridge.md` | "Context bridge in process archive" (strong) | Strong improvement |

**Result:** ✓ **PASS.** All proposed filenames have strong, predictive scent. Several are significant improvements over current names.

---

## PHASE 2.5: MANDATE DOCUMENTATION

This document itself must pass the mandate:

**Logic test:** Strip formatting. Does "Six-axis assessment → Current state → Design target → Detailed disposition → Mandate checks → Decisions for user" hold as an argument? ✓ Yes.

**Skim test:** Read only headers. Can a reader understand the structure of this plan? ✓ Yes — phases, axis positions, file disposition, mandate checks.

**Swap test:** Could this plan apply to a different spec packet? Partially. The assessment methodology (six axes, mandate checks) is generalizable; the specific file names and disposition are not. This is appropriate — the plan is specific to this project.

**Noise test:** Does every section earn its place? ✓ Yes. The Phase 1 → Phase 2 → Mandate structure follows the information-design workflow. Each section builds on previous.

**Scent test:** Do headers predict content? ✓ Yes. "File-by-File Disposition Table" predicts a table showing current → new locations.

**Result:** This plan meets its own mandate requirements.

---

## KEY DECISIONS FOR THE USER

### D1: Merge Posture Spec + Packet Index vs Keep Separate?

**Proposal:** MERGE into single `ARCHITECTURE.md`

**Rationale:**
- Current dual authority creates ambiguity ("which one is canonical?")
- Content overlaps ~100% (same policies, same caller/auth matrix, same locked decisions)
- Merging eliminates redundancy and creates single source of truth
- The merge is a purely editorial operation — no policy changes
- Single document is easier to navigate and maintain

**If you disagree:** Keep both and add clear hierarchy statement ("Packet Index is primary; Posture Spec is deprecated historical context"). Not recommended.

---

### D2: Archive Process Artifacts in _session-lineage/ or Delete?

**Proposal:** ARCHIVE in `_session-lineage/` (organized into agent-work/, closures/, additive-extractions/)

**Rationale:**
- Process artifacts (scratchpads, changelogs, closure work) document *how decisions were made*
- Useful for long-term traceability, learning, and understanding trade-offs
- Archiving is better than deletion because it preserves context without polluting canonical space
- Explicit non-normative markers (`_session-lineage/` prefix) prevent confusion
- Loop Closure Bridge especially valuable — it connects original objectives to current state

**If you disagree:** Delete entirely (trades context for cleanliness). Only recommended if artifact preservation is truly undesired.

---

### D3: Remove SESSION_019c587a_ Prefixes from Canonical Filenames?

**Proposal:** YES, remove all SESSION prefixes

**Rationale:**
- Session-ID prefixes signal "point-in-time artifact," but ARCHITECTURE.md is living policy
- Directory structure (`_session-lineage/` for process) is a better signal than filename format
- Cleaner filenames improve scent and discoverability
- The session ID is preserved in git history anyway

**If you disagree:** Keep prefixes (trades clarity for traceability). Only recommended if tracing back to specific sessions is essential day-to-day.

---

### D4: Rename Axis Files (AXIS_01 → 01-external-client-generation)?

**Proposal:** YES, rename for human readability and sorting

**Rationale:**
- Current names are code-like (AXIS_01_EXTERNAL_CLIENT_GENERATION); proposed names are more readable (01-external-client-generation)
- Kebab-case is standard for web documentation
- Numeric prefix maintains sort order while being more lightweight
- Directories clarify "these are axes" without needing AXIS_ prefix in every filename

**If you disagree:** Keep AXIS_ prefix (trades brevity for explicit categorization). Minor impact either way.

---

### D5: Rename E2E Examples (E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY → e2e-01-basic-package-api)?

**Proposal:** YES, rename for consistency with other documentation conventions

**Rationale:**
- Shorter filenames improve scannability
- Kebab-case is standard
- `e2e-01` is clearer than `E2E_01`
- Examples directory clarifies that these are examples without needing a prefix

**If you disagree:** Keep current names (trades consistency for explicit status labeling).

---

### D6: Split orpc-ingest-spec-packet into axes/ and examples/?

**Proposal:** YES, split. Replace `orpc-ingest-spec-packet/` subdirectory with peer-level `axes/` and `examples/` directories

**Rationale:**
- Current directory name "orpc-ingest-spec-packet" doesn't describe its contents
- Splitting into `axes/` and `examples/` is semantically clearer
- It aligns with the logical structure of the content (policy deep-dives + implementation walkthroughs)
- Simplifies navigation from root

**If you disagree:** Keep `orpc-ingest-spec-packet/` as a containing directory (trades clarity for historical naming continuity). Less recommended.

---

### D7: Create README Files for Navigation?

**Proposal:** YES — root README essential; axes/README and examples/README optional but recommended

**Rationale:**
- Root README is essential: it's the entry point. Without it, first-time readers must guess structure.
- axes/README is optional: axes are self-explanatory IF they have human-readable names and strong scent. Useful if axis dependencies need explicit explanation.
- examples/README is optional: examples are naturally ordered by complexity. Useful if jumps between E2E walkthrough are significant (they are — from 2 to 3 is a large jump).

**If you disagree:** Omit optional READMEs (trades wayfinding for brevity). Acceptable if axis progression is self-explanatory.

---

### D8: Move Redistribution Traceability to _session-lineage/?

**Proposal:** YES

**Rationale:**
- REDISTRIBUTION_TRACEABILITY.md is useful context for understanding how the spec was built and what sources fed into it
- But it's not policy; it doesn't guide implementation decisions
- It supports long-term maintenance (traceability for future readers), but not day-to-day reference
- Moving it to _session-lineage/ keeps the canonical directories lean while preserving valuable context

**If you disagree:** Keep in root as reference documentation. Acceptable if cross-reference traceability is a day-to-day concern.

---

### D9: What About the Three _SCRATCH Assessment Files?

**Proposal:** DELETE or move to `_session-lineage/agent-work/` with dates

**Rationale:**
- These are intermediate work products that were used to generate CANONICAL_ASSESSMENT.md
- They're replaced by the canonical assessment
- If you want to preserve them for traceability, move them to agent-work with clear dating
- If you want a lean structure, delete them

**Recommendation:** Move with dates (e.g., `_SCRATCH_SYSTEM_STRUCTURE_ASSESSMENT_2026-02-18.md` → `_session-lineage/agent-work/assessment-system-structure-2026-02-18.md`). Minimal overhead and preserves traceability.

---

### D10: Are Open Questions (Q-01 through Q-06 from RESHAPE_PROPOSAL) In Scope for This Reshape?

**Proposal:** NO — outside scope of system-level architecture. These require content-level and implementation-level decisions.

**Rationale:**
- System-level reshape focuses on directory structure, file naming, and wayfinding
- Open questions (security specs, enforcement behavior, legacy testing requirements, etc.) are content and implementation concerns
- Those belong to Agent 2 (content-level policy) and Agent 3 (implementation fitness)
- This plan should note that open questions exist and need resolution, but not resolve them

**Action:** Preserve open questions (Q-01 through Q-06) in DECISIONS.md with "open" status and a note that Agent 2/3 will resolve them.

---

## FINAL DELIVERABLE SUMMARY

This reshape plan proposes:

1. **Merge Posture Spec + Packet Index** → Single `ARCHITECTURE.md` with unified caller/auth matrix and consolidated policies
2. **Promote DECISIONS.md** → Root level (from `orpc-ingest-spec-packet/`)
3. **Rename and reorganize axis files** → `axes/01-external-client-generation.md` through `axes/09-durable-endpoints.md`
4. **Rename and reorganize examples** → `examples/e2e-01-basic-package-api.md` through `e2e-04-context-middleware.md`
5. **Archive process artifacts** → `_session-lineage/` with sub-organization (agent-work/, closures/, additive-extractions/)
6. **Create navigation READMEs** → Root README (essential) + optional axes/examples READMEs
7. **Remove SESSION prefixes** → Use directory structure for temporality signals instead
8. **Address structural problems** → Chunk flat lists, chunk AXIS_07, add causal explanations, fix absolute paths

**Total file moves/renames:** 35-40 files
**Total new files:** 1-4 (README.md files)
**Total deletions:** 3 (_SCRATCH files, or move with dates)

**Timeline estimate:**
- File operations: 30 min (move, rename, organize)
- Content merges (Posture Spec + Packet Index): 1-2 hours
- Chunking and narrative fixes: 2-3 hours
- Testing and verification: 1 hour
- **Total: 4-7 hours**

**Risk:** LOW. This is purely structural reorganization. No policy changes, no content deletion, no breaking changes to decision ID references.

---

## NEXT STEPS (For User Decision)

1. **Review and approve** this plan (or request modifications)
2. **Confirm decisions D1-D10** (or override with different choices)
3. **Hand off to Agent 2** for content-level fixes (duplication audit, flat-list chunking, caller/auth matrix consolidation)
4. **Hand off to Agent 3** for implementation-fitness verification
5. **Execute the structural changes** (once content changes are complete)

**This plan does NOT execute changes — it only proposes them. Approval and execution are separate.**
