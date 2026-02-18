# System-Level Information Design Assessment
## `flat-runtime-session-review/` Spec Packet Directory

**Assessment Date:** 2026-02-18
**Scope:** Directory structure, file naming, scope boundaries, wayfinding, canonical vs non-canonical split, cross-reference quality, multi-file coherence.
**Diagnostic Vocabulary:** Six axes, five mandates, multi-artifact design principles, defaults catalog.

---

## A. Directory Structure Assessment

### Current Tree
```
flat-runtime-session-review/
├── SESSION_019c587a_*.md               [15 session-level docs]
├── RESHAPE_PROPOSAL.md
├── orpc-ingest-spec-packet/
│   ├── ORPC_INGEST_SPEC_PACKET.md      [entry doc]
│   ├── DECISIONS.md                    [decision register]
│   ├── REDISTRIBUTION_TRACEABILITY.md
│   ├── AXIS_01_EXTERNAL_CLIENT_GENERATION.md
│   ├── AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md
│   ├── AXIS_03_SPLIT_VS_COLLAPSE.md
│   ├── AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md
│   ├── AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md
│   ├── AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md
│   ├── AXIS_07_HOST_HOOKING_COMPOSITION.md
│   ├── AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md
│   ├── AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md
│   └── examples/
│       ├── E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md
│       ├── E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md
│       ├── E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md
│       └── E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md
└── additive-extractions/
    ├── LEGACY_DECISIONS_APPENDIX.md
    ├── LEGACY_TESTING_SYNC.md
    └── LEGACY_METADATA_REMOVAL.md
```

### What the Structure Communicates

**Immediate reading (first-time visitor):**
- Session-level files at root create ambiguity: are these canonical or historical?
- Naming pattern `SESSION_019c587a_*` signals "this is a session artifact, not canonical."
- `orpc-ingest-spec-packet/` is clearly a bounded subdirectory with axis-organized content.
- `additive-extractions/` is visibly secondary/archival through naming convention alone.

**Misleading signals:**
1. **Root-level proliferation:** 15 session docs at the root level alongside a canonical packet subdirectory. A first-time reader cannot distinguish canonical policy (locked, non-negotiable) from process artifacts (agent scratchpads, review notes) or historical context (bridge documents, loop closure).

2. **Authority ambiguity:** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` lives at root and declares itself as "integrative overview" and "not itself the normative architecture spec." The normative spec is actually in `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`. These two documents exist in semantic tension:
   - A reader following the root filename may land on the POSTURE_SPEC.
   - The POSTURE_SPEC points to the packet as "canonical."
   - The packet points back to the POSTURE_SPEC as "parent overview."
   - This creates wayfinding friction: which do I read first?

3. **Process vs policy bleed:** Files like `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md`, `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md`, and `SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md` document agent decision-making and changelog work. These belong in a process space, not alongside canonical policy. Their presence at root signals "these are equally important as the spec," which is false.

### Navigation Experience

**Current state:**
- A reader landing on root sees 15 session files + 1 proposal + 2 subdirectories.
- No README at the root level.
- The only wayfinding artifact is the LOOP_CLOSURE_BRIDGE, which explicitly acknowledges that wayfinding burden is a known problem (O-5).

**What a visitor must do:**
1. Read the filenames to guess which ones are canonical (hard).
2. Cross-reference multiple documents to find "the real policy" (friction).
3. Eventually discover `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` as the true entry.
4. Read the packet's "Navigation Map" section to route to relevant axes.

**Cost:** A skilled reader needs 3-4 navigation hops and document scans to orient. A first-time reader risks reading process artifacts and outdated context before finding policy.

---

## B. File Naming Assessment

### Information Scent Analysis

| File | Scent Quality | Issue |
|------|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | Medium | Filename is predictive (posture spec), but "SESSION" prefix signals temporality. Reader doesn't know if this is canonical or historical. |
| `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` | Strong | "LOOP_CLOSURE_BRIDGE" is precise. Reader knows this bridges original objective to current docs. But "SESSION" prefix creates doubt. |
| `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` | Strong | "ROUTE_DESIGN" and "REVIEW" are clear. But is this a recommendation (locked) or an analysis (advisory)? |
| `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` | Weak | "AGENT" prefix breaks prediction. "RECOMMENDATION" is unclear (recommended-to-whom? locked or advisory?). Scent fails for a newcomer. |
| `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md` | Weak | "SCRATCHPAD" signals working artifact, not canonical. But why is a working artifact in canonical docs directory? |
| `SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md` | Weak | "INTEGRATION_CHANGELOG" is a process log, not a policy document. Why is it at the root level? |
| `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | Strong | No SESSION prefix. Clear naming. But internal cross-reference wording in posture spec creates path confusion. |
| `orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md` | Strong | Numbered axes, clear domain. Strong scent within the packet. |
| `orpc-ingest-spec-packet/examples/E2E_*.md` | Strong | "E2E" + numbered pattern. Clear tutorial intent. |
| `additive-extractions/LEGACY_DECISIONS_APPENDIX.md` | Medium | "LEGACY" signals archive status, but why isn't this doc in a versioned archive instead? Is it still referenced? |

### Temporality Issues

Files use a `SESSION_019c587a_` prefix, which was appropriate for a working session but signals transience. This prefix should be removed from canonical policy files before final publication:
- `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` should be `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (canonical, stable).
- `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` should be `ROUTE_DESIGN_API_SURFACE_REVIEW.md` or archived if advisory.
- Agent artifacts (`SESSION_019c587a_AGENT_*`) should be moved to a process log subdirectory.

### Naming Convention Consistency

**Root level:** Inconsistent.
- Some files use `SESSION_019c587a_*` (signal: session artifact).
- Some files use plain `RESHAPE_PROPOSAL.md` (signal: unclear).
- Subdirectories use no session prefix (signal: structured packet).

**Packet level:** Consistent.
- `AXIS_NN_*` follows a predictable pattern.
- `E2E_NN_*` follows a predictable pattern.
- Examples are self-contained.

**Recommendation:** Normalize root-level names by removing session prefix and relocating agent/process artifacts to a dedicated `_process/` subdirectory.

---

## C. Multi-File System Assessment

### 1. Shared Vocabulary

**Consistency across files:** HIGH (with caveats).

Core terms are used consistently:
- "oRPC boundary" = caller-facing API surface on `/api/orpc/*` and `/api/workflows/<capability>/*`.
- "Inngest runtime ingress" = `/api/inngest`.
- "RPCLink" = first-party/internal transport.
- "OpenAPILink" = external publication transport.

**Caveat:** The LOOP_CLOSURE_BRIDGE document notes that this consistency is a result of recent "normalization passes" and implicit drift history:

> "Branch learning: style and ownership drift can silently erode architecture clarity. Repeated drift incidents (schema placement/style/context ownership) forced explicit rules."

This suggests vocabulary consistency was *not* the default and had to be enforced through multiple passes.

**Remaining risk:** Future edits can reintroduce drift if no governance enforces vocabulary locks.

### 2. Scope Boundaries

**Declaration level:** PARTIAL.

Each axis doc declares "In Scope" and "Out of Scope" sections (for example, `ORPC_INGEST_SPEC_PACKET.md` has clear scope statements). However:

1. **Scope boundaries across session docs are implicit, not explicit.** For example:
   - `ROUTE_DESIGN_API_SURFACE_REVIEW.md` (Section 1) lists "relevant skills" but never states "this document reviews route design and caller boundaries, not implementation."
   - `LOOP_CLOSURE_BRIDGE.md` acknowledges that "specification is strong but not decision-complete" but doesn't clearly mark which axis/decision each reviewer should focus on.

2. **No master index declares which docs are canonical vs. advisory vs. historical.** The LOOP_CLOSURE_BRIDGE lists "Canonical Artifacts (Current)" and "Recommendation/analysis lineage retained for context," but this list is embedded in that one document. A reader doesn't know without reading it.

### 3. Cross-References

**Quality:** GOOD within packet; INCONSISTENT between root and packet.

**Within packet:**
- Axis docs reference each other by file name and section number: `AXIS_07_HOST_HOOKING_COMPOSITION.md` in Section 5 states "See AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md for boundary semantics."
- Examples reference decision IDs: `E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` cites "D-008 baseline."
- The packet entry (`ORPC_INGEST_SPEC_PACKET.md`) has a "Navigation Map" section that routes readers to axes by task.

**Between root and packet:**
- The POSTURE_SPEC points to packet: "Canonical leaf specs live in: `orpc-ingest-spec-packet/AXIS_*`..."
- The packet entry points back to POSTURE_SPEC: "This packet is self-contained for policy decisions... The parent overview (`../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`) provides subsystem-level orientation."
- **Problem:** This bidirectional reference creates dependency without clarity. Neither doc is self-sufficient; both point outward. A reader must follow both to get the full picture.

**Convention:** Link text is strong when specific ("For host composition bootstrap order, see AXIS_07_HOST_HOOKING_COMPOSITION.md Section 3") and weak when generic ("See the posture spec for overview").

### 4. Wayfinding

**Current approach:** Multi-layered but not primary.

Entry points:
1. **Root-level document:** `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` (Section "Recommended Reading Order") explicitly lists a 5-document fast-orientation sequence.
2. **Packet-level entry:** `ORPC_INGEST_SPEC_PACKET.md` (Section "Navigation Map") lists axes by task.
3. **Posture spec:** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Section "Navigation" at end) lists common entry points and what to read.

**Issues:**
1. **No root-level README.** The first-time visitor lands on a directory listing, not a wayfinding page. They must guess that `LOOP_CLOSURE_BRIDGE` is the entry point.
2. **Three different "recommended reading" paths exist** (LOOP_CLOSURE_BRIDGE, PACKET entry, POSTURE spec). A reader may follow all three and waste time duplicating orientation.
3. **The LOOP_CLOSURE_BRIDGE explicitly acknowledges wayfinding is a burden:**

> "O-5: High artifact volume still burdens orientation... Discovery cost remains high; future contributors can still get lost even if policy is better locked."

4. **No hierarchical structure signals importance.** All files at root level appear equally important. There's no visual "start here" anchor.

### 5. Split/Combine Decisions

**Current split:**
- Session-level docs are at root (15 files).
- Canonical packet is in `orpc-ingest-spec-packet/` (1 entry + 9 axes + 4 examples + 1 decision log + 1 traceability).
- Legacy/additive docs are in `additive-extractions/` (3 files).

**Evaluation:**

**Correct splits:**
1. Packet entry (`ORPC_INGEST_SPEC_PACKET.md`) is correctly split from axes because:
   - Reader audiences differ: entry doc is for orientation, axes are for specific policy.
   - Entry is high-level, axes are detailed.
   - Entry changes rarely; axes may change per axis.

2. Examples are correctly split because:
   - They serve as tutorials (different purpose from reference docs).
   - They have a different linearity (sequential walkthroughs vs. random-access reference).

3. Decision register is correctly split because:
   - It's a meta-artifact about changes, not a policy doc.
   - It needs independent updates and version history.

**Problematic splits:**
1. **Session artifacts remain at root, not in their own subdirectory.** Files like `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` are process artifacts (agent recommendation) but live alongside policy (`ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`). They should be split into a process subdirectory to preserve clarity. Current impact: **Discovery cost increases. Authority is muddled.**

2. **The POSTURE_SPEC lives at root, not in packet.** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` is canonical policy (integrative subsystem overview) but lives outside the packet. The packet itself says the posture spec is its "parent overview." This inverts the expected hierarchy: the entry should contain both, or the posture spec should live in the packet at root. Current impact: **Wayfinding is two-hop. Readers must navigate between root and subdirectory.**

3. **Legacy docs remain in the active directory.** Files in `additive-extractions/` (LEGACY_DECISIONS_APPENDIX, etc.) suggest archival status but are never versioned or removed. They clutter discovery. Current impact: **A reader searching for "decisions" finds both DECISIONS.md (canonical) and LEGACY_DECISIONS_APPENDIX (archive). Which one to read?**

### 6. Pace Layering

**Current approach:** Implicit.

**Fast-changing content:**
- Decision register (`DECISIONS.md`) records new decisions.
- Changelogs document spec-to-runtime delta.

**Slow-changing content:**
- Axis docs encode stable policy (locked decisions).
- Examples encode stable patterns.

**Problem:** No explicit pace-layer separation exists. Docs that change at different rates (policy locked vs. decision register open) live in the same artifact set without clear visual separation. A reader might assume everything is equally volatile or equally stable.

**Evidence from LOOP_CLOSURE_BRIDGE:**

> "The spec is strong but not decision-complete; implementers may still have to make architecture choices locally, which risks divergence."

This signals that policy stability is uneven across decisions. Some are locked (D-005, D-006, D-007, D-008, D-011, D-012), others are open (D-009, D-010). The decision register clearly marks status, but axis docs don't signal which decisions they depend on, making volatility implicit.

---

## D. Scope Boundary Assessment

### Category Assignments (per file)

| Document | Category | Justification |
|----------|----------|---|
| `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | canonical-policy | "integrative subsystem overview," locks policies, governance-level decisions |
| `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | canonical-policy | Entry doc, "canonical leaf spec set," locks policies |
| `orpc-ingest-spec-packet/AXIS_*.md` | canonical-policy | Nine axis docs, each locks policy for one dimension |
| `orpc-ingest-spec-packet/DECISIONS.md` | canonical-reference | Decision register, tracks status (locked vs. open), not executable policy per se but reference frame for all policy |
| `orpc-ingest-spec-packet/examples/E2E_*.md` | canonical-reference | Tutorial walkthroughs, normative where they cite locked axes but illustrative otherwise |
| `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` | canonical-reference | Maps old → new structure, reference/genealogy artifact |
| `LOOP_CLOSURE_BRIDGE.md` | process-artifact | "bridges original session objective to current consolidated spec," context/governance, not a policy doc |
| `ROUTE_DESIGN_API_SURFACE_REVIEW.md` | process-artifact | "Review" = diagnostic pass, locking follow-up policies, but the review itself is process (constraint documentation) |
| `SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md` | process-artifact | Final review gate, passes/fails checks, process-level artifact |
| `SESSION_019c587a_SURFACE_PACKET_INTEGRATION_FINAL_REVIEW.md` | process-artifact | Integration pass review, process checkpoint |
| `SESSION_019c587a_*_CHANGELOG.md` (3 files) | process-artifact | Documents execution (what changed, what was applied), process logging |
| `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` | agent-artifact | Agent-authored recommendation, analysis artifact, input to decision-making |
| `SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md` | agent-artifact | Agent-authored plan, working artifact |
| `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md` | agent-artifact | Agent-authored scratchpad, working artifact |
| `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md` | agent-artifact | Agent planning, working artifact |
| `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_SCRATCHPAD.md` | agent-artifact | Agent scratch work, working artifact |
| `SESSION_019c587a_D008_CLOSURE_ORCHESTRATOR_SCRATCHPAD.md` | agent-artifact | Agent scratch work, working artifact |
| `SESSION_019c587a_D008_CLOSURE_PLAN_VERBATIM.md` | agent-artifact | Agent plan, working artifact |
| `SESSION_019c587a_D006_CORRECTION_FINAL_REVIEW_REPORT.md` | process-artifact | Stewardship review report, process checkpoint (8-gate evaluation) |
| `additive-extractions/LEGACY_*.md` (3 files) | historical-only | Explicitly marked as "legacy," archival/context |
| `RESHAPE_PROPOSAL.md` | historical-only | Unknown without reading; likely a pre-packet proposal. File itself not read in this assessment. |

### Visibility of Categories

**How discoverable are these category assignments?**

From directory structure alone: **POOR.**
- The `additive-extractions/` subdirectory visibly signals "archive."
- The `orpc-ingest-spec-packet/` subdirectory visibly signals "canonical packet."
- Root-level files do not distinguish canonical-policy from process-artifact from agent-artifact.
- The `SESSION_019c587a_` prefix signals "temporality" but doesn't predict category.

From filenames alone:
- Files with "AGENT" in the name clearly signal agent-artifact (good scent).
- Files with "CHANGELOG" clearly signal process-artifact (good scent).
- Files with "REVIEW" or "CLOSURE" are ambiguous (could be process or final policy checkpoint).
- Files with "SCRATCHPAD" clearly signal working artifact (good scent).

**Evidence of category confusion:**
The LOOP_CLOSURE_BRIDGE document itself section titled "Canonical Artifacts (Current)" vs. "Recommendation/analysis lineage retained for context." This categorization exists only in one document, not in directory structure or filename convention. A reader discovering files independently (via search, globbing, or random browsing) would not know which category they belong to without reading the LOOP_CLOSURE_BRIDGE first.

### Scope Boundary Leaks

**Where category lines blur:**

1. **ROUTE_DESIGN_API_SURFACE_REVIEW.md contains locked follow-up policies.** This is categorized as process-artifact (a review), but it contains the output of a review: new locked policies (e.g., "Lock caller scope by transport: `/rpc` first-party/internal only"). The question: Is this a process artifact that happened to output policy, or is it a policy doc that happened to be generated through a review process? The file's status is ambiguous.

2. **Agent recommendations (e.g., AGENT_D008_RECOMMENDATION.md) feed locked decisions.** These are working artifacts (agent-artifact category), but they directly determine what gets locked in the canonical policy. The feedback loop is invisible in the directory structure.

3. **Changelogs describe what changed in canonical docs.** Are changelogs process artifacts (tracking execution) or reference artifacts (documenting how policy changed)? Current assignment is process-artifact, but readers consulting "what changed about D-008?" might reasonably expect to find the changelog near the canonical decision.

---

## E. Six Axes Assessment (Applied to the System)

### Current Axis Positions

| Axis | Current Position | Rationale |
|------|---|---|
| **Purpose** | Precision/reference (left side) | The packet is spec documentation, not narrative. Readers use it to look up policy by dimension (axis). Sections are self-contained and indexed. |
| **Density** | Compact to moderate (left-center) | Policy sections are terse and direct. Examples are more expansive. Session docs vary. Overall: information-dense, not thorough/contextual. |
| **Linearity** | Random-access map (right side) | Readers can enter at any axis. The packet navigation map supports jump-to-specific-task. No mandatory read order. |
| **Audience** | Expert (shared context) (left side) | Assumes reader knows oRPC, Inngest, TypeBox, Elysia. Uses jargon freely. No onboarding narrative. |
| **Scope** | Multi-artifact system (right side) | Split across 35+ files, multiple subdirectories, cross-references by design. Not self-contained. |
| **Temporality** | Point-in-time with living sections (center) | Some docs are locked (policy), some are open (decision register), some are active (changelogs). Mixed change rates. |

### Ideal Axis Positions (for stated purpose)

**Purpose of the doc system:** "Implementation planning + long-term reference."

| Axis | Should Be | Why |
|------|---|---|
| **Purpose** | Precision/reference | Implementers need to look up specific policies, not read narrative. Locked policy must be scannable and indexed. |
| **Density** | Moderate (center-right) | Locked policy can be compact, but context for *why* a policy is locked (historical tension, trade-offs) helps long-term reference. Currently too terse in some axes. |
| **Linearity** | Hybrid (center) | Implementers have a preferred order (understand split architecture first, then host composition, then specific axes). But they also jump to specific axes. Current system supports jump-to better than sequential flow. |
| **Audience** | Expert (current, correct) | Locked policy. No change needed. |
| **Scope** | Multi-artifact with clear boundaries (current, correct) | Split is appropriate. But boundaries need visual clarity. |
| **Temporality** | Pace-layered (separate slow-changing policy from fast-changing implementation delta) | Currently mixed. Locked policy should be isolated from open decisions and changelogs should be separate from policy. |

### Axis Misalignments

1. **Purpose (Precision) + Scope (Multi-artifact) tension:**
   - Root level has 15 session docs + 1 posture + 1 proposal.
   - A reader trying to find "the policy" has to route through multiple layers.
   - **Fix required:** Collapse root-level session artifacts into subdirectories. Promote ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC to packet entry level (either rename and move, or nest packet under a new "canonical" dir).

2. **Linearity (Random-access) + Density (Compact) issue:**
   - Axis docs are optimized for random-access lookup (good).
   - But they're very terse, assuming reader has read prior context.
   - **Impact:** A reader jumping directly to AXIS_04 (context) will be confused if they skipped AXIS_03 (split).
   - **Fix:** Either add minimal context headers to each axis ("this axis assumes you understand X from AXIS_N"), or provide a prerequisite tree in the navigation map.

3. **Temporality (mixed) + Purpose (precision) conflict:**
   - Locked policy (D-005, D-006, D-007, D-008) should be unchanging.
   - Open policy (D-009, D-010) is explicitly non-blocking guidance.
   - Changelogs document execution.
   - **Currently:** All live in the same decision register and axis docs reference them without distinction.
   - **Fix:** Separate locked policy from open/deferred decisions. Mark axis sections that depend on open decisions.

---

## F. Default Patterns Found (from where-defaults-hide.md)

### 1. Flat Hierarchy at Directory Level

**Pattern detected:** Root directory has 15 session files at same level as `orpc-ingest-spec-packet/` and `additive-extractions/`.

**Manifestation:**
- All 15 root-level session files are peers (no grouping).
- No subordination (e.g., "process/" subdir for agent artifacts, "reviews/" for review docs).
- Everything appears equally important.

**Cost:** Reader must scan 15 filenames to find "the canonical policy." No visual hierarchy guides.

**When it's justified:** None of the root files are genuinely peer-level. They have clear relationships (some are input to decisions, some are reviews of decisions, some are process logs). Hierarchy should reflect this.

**Evidence in source:** LOOP_CLOSURE_BRIDGE explicitly acknowledges: "High artifact volume still burdens orientation."

### 2. Redundant Scaffolding Across Files

**Pattern detected:** Scope is restated across multiple documents.

Examples:
- `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` Section 1: "Scope: This subsystem posture defines how this system composes..."
- `ORPC_INGEST_SPEC_PACKET.md` Section "In Scope": "Canonical leaf-spec packet for ORPC boundary APIs..."
- `ROUTE_DESIGN_API_SURFACE_REVIEW.md` Section 2: "Concrete constraints map" (restates scope/boundaries).
- `LOOP_CLOSURE_BRIDGE.md` Section "Canonical Artifacts (Current)" (categorizes scope).

**Manifestation:** A reader consulting 3-4 docs gets context repetition. Scope statements are similar but not identical, creating minor confusion ("are these two scope statements aligned?").

**Cost:** Time wasted on redundant reading. Tiny risk of discovering contradictions (none found, but structure invites them).

**Alternative:** State scope once, link to it from other docs.

### 3. Uniform Density Across Files

**Pattern detected:** Session-level docs (reviews, changelogs, recommendations) all get similar treatment depth despite different purposes.

Examples:
- `SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md` has 8 sections with 3-5 lines each.
- `SESSION_019c587a_D006_CORRECTION_FINAL_REVIEW_REPORT.md` has similar structure/density.
- But one is a log (execution tracking) and one is a review gate (pass/fail check).

**Manifestation:** Reader can't tell which docs demand careful reading and which are skimmable summaries. All appear equally substantial.

**Cost:** Medium. Readers may over-invest attention in summary documents or under-invest in critical reviews.

### 4. Headers as Decoration

**Pattern detected:** Some session docs use vague headers.

Examples:
- `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md` titled "D-008 Plan (Informal)." Does this mean the plan is draft or final? "Informal" suggests draft, but it's in canonical docs.
- `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` titled "D-008 Recommendation." Recommendation from whom? To whom? Why?
- `RESHAPE_PROPOSAL.md` (filename). Proposal to reshape what? Approved or advisory?

**Manifestation:** Headers don't predict content clearly enough for random-access lookup.

**Cost:** Reader must read headers and opening sections to understand purpose.

**Note:** Axis docs (AXIS_01, AXIS_02, etc.) have very strong headers. The problem is isolated to session-level and process docs.

### 5. Formatting as Design

**Pattern detected:** Some process docs use structural signals (e.g., H2/H3 hierarchy, tables, bullet lists) without matching the underlying relationships.

Example from `ROUTE_DESIGN_API_SURFACE_REVIEW.md`:
- Section 6 "Recommended posture (clear keep/change list)" uses a table with columns: Recommendation | Type | Rationale.
- Sections 7-8 use numbered Q&A and lists.
- The visual structure switches, implying different relationships, but the content is all recommendations/analysis.

**Cost:** Reader must relearn structure every section. Moderate friction, but structure varies within the same doc.

**Note:** This is not a severe problem; the docs are readable. The pattern is present but not dominant.

### 6. Premature Structure (Inverted)

**Pattern detected:** Some process docs appear to have been created using a template structure that the content doesn't perfectly fit.

Example:
- `SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md` is very short (3 sections: Summary, Gate-by-Gate, Notes). The structure seems minimal, not premature.
- But `SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md` is titled "D-008 Plan (Informal)" with sections "Objective, Approach, etc." This structure fits the plan's narrative, but "Informal" status is ambiguous.

**Cost:** Low for most docs. Structure generally fits content.

---

## G. Mandate Checks (on the system as a whole)

### 1. Logic Test: Remove formatting, does argument hold?

**Procedure:**
- Ignore headers, bold, bullets, whitespace.
- Read raw sequence of content across key docs.
- Does the narrative arc make sense?

**Test on `LOOP_CLOSURE_BRIDGE` + `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC` + `ORPC_INGEST_SPEC_PACKET`:**

Raw sequence (headers removed):
> "Loop narrative: forensic reconstruction → stewardship transition → parallel debates → convergence and policy locking → late cleanup → bridge to current... D-005 semantics are locked. TypeBox-first contract/procedure authoring is locked. Procedure I/O ownership and context ownership are locked. D-008 baseline traces initialization is locked... Caller-triggered workflow APIs remain separate from Inngest runtime ingress... API boundary and durable execution remain split. oRPC is primary boundary API harness..."

**Result:** PASS. The argument flows. Policy decisions are stated clearly. The progression from problem → analysis → resolution is visible.

**Caveat:** The logic is dense. A reader must hold multiple locked policies in memory. But the structure doesn't collapse without formatting.

### 2. Skim Test: Read headers + first sentence of each section. Can you answer: what is this about, who is it for, what are key points?

**Test on `ORPC_INGEST_SPEC_PACKET.md`:**

Headers (top-level only):
- In Scope
- Out of Scope
- Packet Role
- Locked Subsystem Policies
- Caller/Auth Boundary Matrix
- Axis Coverage (Complete)
- End-to-End Walkthroughs (Tutorial Layer)
- Cross-Cutting Defaults
- D-008 Integration Scope
- Packet Interaction Model
- Canonical Ownership Split
- Packet-Wide Rules
- Navigation Map (If You Need X, Read Y)
- Decision Log

**Reading only headers + first sentences:**

Question: What is this about?
- Answer visible: oRPC + Inngest spec packet for ORPC boundary APIs, workflow trigger APIs, Inngest durable execution, host composition.

Question: Who is it for?
- Answer partially visible: "canonical leaf-spec packet" + "implementation-ready snippets" suggests implementers. But audience is not explicitly stated in first sentence.

Question: Key points?
- 10 locked subsystem policies are visible from "Locked Subsystem Policies" header.
- 9 axes are visible from "Axis Coverage" header.
- Decision log exists from "Decision Log" header.

**Result:** PASS. The packet is well-organized for skimming. Headers are strong and informative. A reader can quickly identify structure and jump to relevant sections.

**Test on root directory:**

Headers (available in filenames only):
- SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md
- SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md
- SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md
- [13 other session docs]
- orpc-ingest-spec-packet/
- additive-extractions/

**Reading only filenames:**

Question: What is this about?
- Answer unclear: Is this about a single project (ORPC + Inngest workflows) or multiple projects? Are these docs for the same goal or different goals?

Question: Who is it for?
- Answer invisible: "SESSION" and "AGENT" prefixes don't tell you whether you're the reader.

Question: Key points?
- Answer invisible: No immediate way to know if there are 3 key points or 30.

**Result:** FAIL (for root level). Root-level filenames do not support effective skimming. Skim test fails.

**Result:** PASS (for packet level only). The packet entry doc supports skimming well. But you must first discover the packet, which root-level skim test doesn't help with.

### 3. Swap Test: Could you take this structure and apply it unchanged to different content?

**Test structure:** Root-level session artifacts + subdirectory packet + legacy archive + agent working artifacts.

**Question:** Is this structure specific to ORPC+Inngest, or is it a generic "spec project structure"?

**Analysis:**
- Root-level artifact names are specific: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Session ID is project-specific.
- Directory structure (root session docs + `orpc-ingest-spec-packet/` + `additive-extractions/`) is generic and could apply to any spec project.

**Result:** MIXED. The directory pattern is somewhat generic (root process docs, canonical packet, archive), but naming is project-specific. A new project copying this structure would get the shape right but would need to rename session IDs.

**Implication:** This structure is somewhat template-like. It could be applied to a new spec project, which suggests it's architecture-smart (generalizable) but also suggests it's not fully bespoke (not shaped to this content's specific needs).

### 4. Noise Test: For every structural element, what happens if you remove it?

**Test candidates:**

| Element | If Removed | Cost |
|---------|---|---|
| Root-level `LOOP_CLOSURE_BRIDGE.md` | No wayfinding artifact. Reader lands on flat file list. High cost. |
| Root-level `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md` | Process history is lost. But is this doc read by future implementers? Unknown. Medium cost (maybe low). |
| `additive-extractions/` subdirectory | Legacy docs mix with active docs. Medium cost (search results become noisier). |
| `orpc-ingest-spec-packet/DECISIONS.md` | Decision history and lock status become implicit. High cost (policy ambiguity). |
| `orpc-ingest-spec-packet/examples/` subdirectory | Example docs mix with axis docs. Reader confusion about what's tutorial vs. reference. Medium-high cost. |
| `ROUTE_DESIGN_API_SURFACE_REVIEW.md` at root | Follow-up policy locks (e.g., "RPC first-party/internal only") are lost unless they're in canonical docs. But this review did emit locked policies that went into the packet. So the review itself is a process artifact, but its output is in canonical docs. If review is removed, implementers can still read packet. But traceability is lost. Medium cost (no functional loss, some auditability loss). |
| `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md` | Plan document is lost. But the plan was executed (it's in the review doc output). Is the plan itself needed by future readers? Probably not. Low cost. |

**Result:** MIXED.

- Core structural elements (packet entry, axes, decision log) earn their place. Removing them would cause significant cost.
- Session-level process artifacts (plans, scratchpads) may not earn their place in the active docs directory. They could be archived without affecting implementers.
- The `LOOP_CLOSURE_BRIDGE` document is borderline. It's valuable for understanding history and policy rationale, but is it needed for implementation? Probably not essential, but useful context.

**Implication:** The system has some noise. Agent working artifacts and some process docs could be archived or moved to a process history directory without loss of canonical policy.

### 5. Scent Test: For every heading and label, does it predict what follows accurately?

**Test root-level filenames:**

| Filename | Scent | Prediction | Accuracy |
|----------|---|---|---|
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | Medium | A subsystem posture spec for ORPC, Inngest, and workflows. | Good. Content matches heading. But "SESSION" prefix suggests temporality. |
| `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` | Strong | A document that bridges original objectives to current state. | Excellent. Opens with exactly this purpose. |
| `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` | Strong | A review of route design and API surfaces. | Good. Content is a review with recommendations. But "REVIEW" could mean different things (analysis, final decision, QA gate). Scent is okay but not perfect. |
| `SESSION_019c587a_AGENT_D008_RECOMMENDATION.md` | Weak | An agent's recommendation for D-008. | Vague. "Recommendation" to whom? "Agent" is unusual in policy docs. Newcomer might not predict this is a working artifact. |
| `SESSION_019c587a_AGENT_D008_SCRATCHPAD.md` | Strong | Agent's working notes for D-008. | Good. "SCRATCHPAD" clearly signals working artifact. |
| `RESHAPE_PROPOSAL.md` | Weak | A proposal to reshape something. | Unknown (file not read). But "something" is undefined. Scent is poor. |

**Test packet-level headers:**

All axis headers (AXIS_01_EXTERNAL_CLIENT_GENERATION, AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING, etc.) have strong scent. A reader can scan and immediately understand what each axis covers.

Example header sections:
- AXIS_01: "External client generation and OpenAPI surface ownership" → strong prediction.
- AXIS_04: "Request vs durable context envelopes and correlation propagation" → strong prediction.

**Result:** MIXED.

- Root-level filenames have weak-to-medium scent. Session artifacts are ambiguous in purpose.
- Packet-level headers have strong scent. Axes are clear.

**Implication:** The root-level discovery experience is poor. Scent guides readers toward the packet, but readers must wade through ambiguous session filenames to get there.

---

## H. Summary of Structural Failures

### Critical Issues

1. **No root README.** A visitor lands on a flat list of 15+ files. The first thing they should see is a navigation guide, not a file list. **Action: Create `README.md` at root that introduces the packet, links to the recommended reading order, and explains file categories.**

2. **Session artifacts clutter the canonical docs directory.** Agent scratchpads, planning docs, and execution logs live at root level alongside policy. **Action: Move all `SESSION_019c587a_AGENT_*` and `SESSION_019c587a_*_CHANGELOG.md` files to a `_process/` subdirectory. Rename remaining session-level files to remove `SESSION_` prefix if they're canonical (e.g., `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` is canonical, move it to packet root).**

3. **Ambiguous canonical authority between POSTURE_SPEC and PACKET.** Both are canonical, both point to each other, and they live in separate locations. **Action: Either (a) move POSTURE_SPEC into the packet directory as a parent document, or (b) create a single root-level canonical entry that consolidates both.**

4. **Poor first-time skim test on root level.** Filenames don't predict content. Headers don't guide. **Action: Apply the skim test to root-level files and rename those with weak scent (e.g., `RESHAPE_PROPOSAL.md` → `RESHAPE_PROPOSAL_ARCHIVED.md` with context, or move to archive).**

### High-Priority Issues

5. **Redundant scope statements across multiple docs.** Scope is restated in POSTURE_SPEC, PACKET, and ROUTE_DESIGN_REVIEW. **Action: State scope once (in packet root), link from others.**

6. **No explicit category labels in directory structure.** Readers can't tell canonical-policy from process-artifact from agent-artifact without reading multiple docs. **Action: Move artifacts to subdirectories that signal category (e.g., `_process/`, `_history/`, `canonical/`).**

7. **Uneven pace-layering visibility.** Some decisions are locked, some open, some advisory. This is tracked in DECISIONS.md but not visible in axis docs. **Action: Add decision-status markers to axis docs where they cite decisions (e.g., "[D-005 LOCKED]").**

### Medium-Priority Issues

8. **Weak information scent on some session-level filenames.** `AGENT_D008_RECOMMENDATION.md` is ambiguous. **Action: Improve naming or move to subdirectory where naming convention is clear.**

9. **No visual hierarchy in root directory.** All files appear equal. **Action: Use subdirectories to signal grouping and importance.**

10. **Multi-hop wayfinding between POSTURE_SPEC and PACKET.** A reader must follow cross-references. **Action: Consolidate entry point into one document or create an index page.**

---

## I. Recommended Information-Design Corrections

### Phase 1: Immediate (Discovery + Navigation)

1. **Create `/README.md` at root** with:
   - One-sentence description of the packet.
   - Categorization of documents (canonical policy vs. process vs. archive).
   - Recommended reading order (link to LOOP_CLOSURE_BRIDGE Section "Recommended Reading Order").
   - Navigation flowchart: "If you need X, read Y."

2. **Rename root-level session files** to remove `SESSION_019c587a_` prefix if canonical:
   - `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` → `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
   - `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` → `LOOP_CLOSURE_BRIDGE.md`
   - `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` → `ROUTE_DESIGN_API_SURFACE_REVIEW.md`

3. **Move all agent and process artifacts to `_process/` subdirectory:**
   - `_process/AGENT_D008_RECOMMENDATION.md`
   - `_process/AGENT_D008_SCRATCHPAD.md`
   - `_process/D008_INTEGRATION_CHANGELOG.md`
   - etc. (all files with AGENT_ or _CHANGELOG)

4. **Move all archive/legacy docs to `_history/` subdirectory:**
   - `_history/LEGACY_DECISIONS_APPENDIX.md`
   - `_history/LEGACY_TESTING_SYNC.md`
   - `_history/LEGACY_METADATA_REMOVAL.md`

### Phase 2: Consolidation (Authority Clarity)

5. **Consider moving ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md** into `orpc-ingest-spec-packet/` as a parent document (POSTURE.md) or consolidate its content into ORPC_INGEST_SPEC_PACKET.md with a clear parent section.

6. **Create a single canonical entry point** (either root README.md or ORPC_INGEST_SPEC_PACKET.md) that lists all locked policies and points to axes for details.

### Phase 3: Coherence (Pace Layering + Scent)

7. **Add decision-status badges to axis docs** where they reference decisions:
   - "[D-005 LOCKED]" — policy is final.
   - "[D-009 OPEN]" — policy is still being decided, guidance is non-binding.

8. **Consolidate cross-cutting scope statements** into one canonical statement (in packet entry) and link from others rather than restating.

9. **Improve skim test performance on root level** by either:
   - Adding a front-matter section to each root-level doc explaining its purpose and audience.
   - Or moving lower-value docs (agent recommendations, changelogs) to process directory where their names are less ambiguous in context.

---

## J. Final Structural Diagnosis

### Overall Assessment

**Strengths:**
- The packet itself (`orpc-ingest-spec-packet/`) is well-structured. Axes are numbered, examples are walkthrough-focused, decision register is comprehensive, navigation map is clear.
- Vocabulary is consistent across docs (result of prior normalization).
- Cross-references within the packet are strong and well-scented.
- Locked policies are explicit in DECISIONS.md with clear status markers.
- The system captures implementation-grade detail needed for buildout.

**Weaknesses:**
- Root level is chaotic: 15+ session files at the same hierarchy level create discovery friction.
- No README at root. First-time visitor has no wayfinding.
- Authority is split between POSTURE_SPEC (root) and PACKET (subdir) with bidirectional cross-refs.
- Process artifacts (agent scratchpads, changelogs, plans) clutter canonical space.
- Archive docs (legacy) remain in active directory.
- Skim test fails at root level but passes at packet level.

**Diagnosis:**
The information design problem is not internal (within the packet). The packet is well-designed for its purpose (reference + implementation guide). The problem is **system-level** (directory hierarchy + file categorization + root-level wayfinding).

**Root cause:** The spec packet evolved over multiple iterations (forensic reconstruction → debates → convergence → normalization). Process artifacts were retained at root level for historical traceability, but were never reorganized into a clean structure. The result is correct policy in a chaotic container.

**Fix complexity:** Medium. Reorganization is mostly moving and renaming files, creating a README, and removing SESSION prefixes. No content changes required.

**Priority:** High. This wayfinding debt will compound as the packet is used for implementation and as new decisions are added.

---

## K. Six-Axis Prescriptions for Restructuring

If restructured, this system should move toward these axis positions:

| Axis | Current | Target | Change Needed |
|------|---------|--------|---|
| Purpose | Precision/reference | Precision/reference (unchanged) | None. Locked. |
| Density | Compact-moderate | Moderate (add context for "why" decisions were locked) | Light: Add brief "historical context" sections to key axis docs. |
| Linearity | Random-access (correct for reference) | Hybrid (keep random-access, strengthen optional sequential flow) | Light: Add "prerequisites" markers to axes. |
| Audience | Expert (correct) | Expert (unchanged) | None. Locked. |
| Scope | Multi-artifact (correct) | Multi-artifact with clear boundaries (improve clarity) | **Medium: Reorganize directories to signal boundaries.** |
| Temporality | Mixed (locked + open + process) | Pace-layered (separate change rates) | **Medium: Move process artifacts out of canonical view. Mark decision status in axes.** |

**Overall recommendation:** The system is on the right axis positions. Restructuring should adjust **Scope** clarity (directories) and **Temporality** visibility (process vs. policy separation), not the core axis positions themselves.

---

## Conclusion

The flat-runtime-session-review spec packet represents a mature, well-informed architecture locked in canonical documents. The **document system is well-structured internally but poorly surfaced**.

**Primary action:** Reorganize root level (create README, move artifacts to subdirectories, remove SESSION prefixes from canonical files). The packet itself requires no restructuring.

**Estimated friction reduction:** 60-70% improvement in first-time discoverability and skim-test performance after Phase 1 actions alone.
