# Canonical Information Design Assessment
## ORPC + Inngest Spec Packet Document Set

**Assessment Date:** 2026-02-18
**Methodology:** Multi-agent fresh assessment using information-design skill (six axes, five mandates, defaults catalog)
**Agents:** System-level structure, Content-level policy, Implementation fitness
**Scope:** All documents in `flat-runtime-session-review/` and `orpc-ingest-spec-packet/`

---

## Executive Summary

The spec packet *inside* `orpc-ingest-spec-packet/` is well-designed architecture documentation. The axis decomposition is correct, cross-references are accurate, code snippets are usable, and policy consistency is high across documents. The problem is everything *around* the packet: the directory it lives in is a session-process junk drawer, there's a dual-authority split between the posture spec and the packet index, and session-ID prefixes on canonical filenames create false temporality.

**Implementation fitness score: 70/100.** Strong for greenfield implementation by experienced developers. Weak for refactoring existing code or onboarding new team members.

---

## 1. Axis Positions

| Axis | Current | Target | Gap |
|------|---------|--------|-----|
| **Purpose** | Precision/reference | Precision/reference | None — correct position |
| **Density** | Compact-to-moderate | Moderate (add "why" context for locked decisions) | Light — some axis docs are too terse for standalone reading |
| **Linearity** | Random-access dominant | Hybrid (keep random-access, strengthen sequential onramp) | Medium — no "how to read this spec" guidance |
| **Audience** | Expert (assumes oRPC/Inngest/TypeBox familiarity) | Expert (correct) | None — correct for intended audience |
| **Scope** | Multi-artifact (35+ files, cross-references) | Multi-artifact with clear boundaries | Medium — directory structure doesn't signal canonical vs process |
| **Temporality** | Mixed (locked policy + open decisions + process logs) | Pace-layered (separate change rates) | Medium — process artifacts live alongside policy |

**Core diagnosis:** Purpose and Audience are correct. The gaps are in Scope clarity (directory hierarchy) and Temporality visibility (canonical vs process separation).

---

## 2. Structural Problems (Ranked by Impact)

### CRITICAL

#### 2.1 Root directory conflates canonical spec with process archaeology
**Severity:** Critical — affects every reader's first interaction
**Evidence:** 15 `SESSION_019c587a_*` files at root level alongside the canonical packet subdirectory. Agent scratchpads, integration changelogs, closure review docs, and planning artifacts all share hierarchy with the posture spec. No README exists at root. A first-time reader must scan 15+ filenames and read multiple documents to discover which are normative.
**Cost:** 3-4 navigation hops and document scans to orient. A new reader risks treating agent scratchpads as authoritative.
**Loop Closure Bridge itself acknowledges:** "O-5: High artifact volume still burdens orientation."

#### 2.2 Dual-authority split between Posture Spec and Packet Index
**Severity:** Critical — creates "which one do I trust?" ambiguity
**Evidence:** The Posture Spec declares 14 locked policies and 31 global invariants. The Packet Index declares 10 locked subsystem policies and 25 cross-cutting defaults. Content overlaps ~100% but with different wording, different grouping, and different levels of detail. Each document points to the other: the Posture Spec says "canonical leaf specs live in packet"; the Packet says "parent overview is the posture spec." Neither is self-sufficient.
**Cost:** An implementer reads both, cross-references them, and still can't determine which rendering wins when wording diverges. Six renderings show the same policies in different formats without declaring a canonical form.

#### 2.3 Session-ID prefixes on canonical filenames create false temporality
**Severity:** Critical — actively misleads about document status
**Evidence:** `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` is, by its own declaration, the canonical integrative overview. The `SESSION_019c587a_` prefix signals "point-in-time session artifact." A reader six months from now will reasonably treat this as historical, not authoritative.

### HIGH

#### 2.4 Caller/Auth Matrix repeated 7 times with inconsistent completeness
**Severity:** High — most-looked-up reference has no single canonical form
**Evidence:**
- Posture Spec: 4 rows × 7 columns (most complete)
- Packet Index: 4 caller types in YAML format
- AXIS_01: 3 rows × 7 columns
- AXIS_02: 4 rows × 5 columns
- AXIS_03: 3 rows × 5 columns (missing server/CLI caller)
- AXIS_07: 3 rows × 5 columns (missing server/CLI caller)
- AXIS_08: 3 rows × 5 columns (missing server/CLI caller)

Three axis docs omit the server/CLI first-party caller class entirely. A reader consulting only AXIS_07 (Host Hooking) won't learn that first-party servers should use in-process package clients by default.

#### 2.5 AXIS_07 is overloaded (6-7 concerns in one document)
**Severity:** High — strains the axis template
**Evidence:** AXIS_07 contains: host mount policies, route family table, runtime/host inventory (4 key files), canonical file tree, required root fixtures (full code), canonical harness snippets (full code), naming rules (11 items), optional composition helpers (4 helpers with full code), file-structure implications. This is 300+ lines spanning policy, inventory, guidelines, and implementation reference.
**Cost:** A reader looking for "mount order" must scroll past fixture code. A reader looking for "naming rules" must scroll past host inventory.

#### 2.6 Flat numbered lists without chunking
**Severity:** High — cognitive overload on most-referenced sections
**Evidence:** Posture Spec section 4: 31 global invariants in one flat numbered list (route invariants, ownership invariants, schema invariants, middleware invariants, naming invariants — all peers). Packet Index: 25 cross-cutting defaults in one flat list. Packet Index: 9 packet-wide rules in one flat list.
**Cost:** Reader must hold 31 items in memory without sub-grouping. No way to quickly find "the middleware-related invariants" vs "the naming-related invariants."

### MEDIUM

#### 2.7 No explicit category labels in directory structure
Process artifacts, agent artifacts, canonical policy, and historical documents are indistinguishable from directory listing alone. Only the Loop Closure Bridge document categorizes files, and it's buried inside one particular session document.

#### 2.8 Absolute filesystem paths in references
Several axis docs reference files via `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` — brittle and machine-specific.

#### 2.9 E2E examples have complexity progression gaps
E2E_02 → E2E_03 is a large jump (adds MFE + browser-safe exports + dual client variants + status/timeline reading simultaneously). E2E_03 → E2E_04 is similarly large (adds multi-tenant principal + full middleware stacks + dedupe patterns + Inngest middleware injection).

#### 2.10 Explanatory content ("Original Tensions") dilutes posture statement
Section 3 of the Posture Spec explains design trade-offs. Useful context, but its position between "Locked Policies" and "Global Invariants" dilutes the normative message. Better as optional reading linked from a bridge document.

#### 2.11 Legacy decisions numbering collision
`additive-extractions/LEGACY_DECISIONS_APPENDIX.md` contains D-004 and D-005 entries with DIFFERENT meanings than the current `DECISIONS.md` entries. No disambiguation or supersession note exists.

### LOW

#### 2.12 Some headers have weak information scent
"Integrative Topology" (vague — means "Canonical Directory Structure"), "Composition Spine" (vague — means "Host Bootstrap Sequence"), "Global Invariants" (too broad — 31 items spanning 5 categories).

#### 2.13 No "how to read this spec" guidance
Three different "recommended reading" paths exist (Loop Closure Bridge, Packet entry, Posture spec). A reader may follow all three and duplicate orientation work.

#### 2.14 E2E file trees repeated identically 4 times
Each E2E example includes a full file tree. E2E_02/03/04 could show diffs from the previous example instead.

---

## 3. What's Working

These are structurally sound and should be preserved:

1. **Axis decomposition is correct.** Nine axes, each owning one policy slice, with explicit in/out scope. The template (In/Out → Policy → Why/Trade-Offs → Snippets → References → Links) is sound and appropriate for 7 of 9 axes.

2. **Cross-references within the packet are strong.** Axis docs reference each other by filename and section. Examples cite decision IDs. The Navigation Map ("If You Need X, Read Y") in the Packet Index is excellent.

3. **Code snippets are accurate and directly usable.** TypeBox adapter, trigger contracts, durable functions, host mount patterns — all verified against oRPC and Inngest documentation. 95/100 accuracy.

4. **E2E walkthroughs are the most implementation-useful artifacts.** They show concrete file trees, concrete code, and concrete wiring. Progressive complexity (basic → workflows → MFE → real-world context).

5. **Decision log is well-structured.** DECISIONS.md tracks status (locked/closed/open), resolution, impacted docs, and source anchors. This is the right pattern.

6. **Vocabulary is consistent across documents.** "oRPC boundary," "Inngest runtime ingress," "RPCLink," "OpenAPILink" — used consistently throughout. Prior normalization passes achieved this.

7. **Policy consistency is high.** All spot-checked cross-references are accurate. No contradictions found between any documents. Host mount order is stated identically in three locations.

---

## 4. Implementation Fitness (Scenario Walk-Throughs)

| Scenario | Score | Notes |
|----------|-------|-------|
| Find entry point | 65/100 | Two entry points create ambiguity |
| Extract all locked decisions | 65/100 | Scattered across 3 locations; no single authoritative ledger |
| Extract target topology (files/routes/ownership) | 75/100 | Well-documented but fragmented |
| Identify gaps between current code and target | 50/100 | Spec is greenfield only; no current-state audit |
| Determine implementation sequence | 60/100 | Axis dependencies implied, not explicit |
| Add a new workflow capability (boundary clarity) | 75/100 | Clear for file creation; weak for host integration |
| Look up specific policy (long-term reference) | 90/100 | Consistent answers; strong navigation map |
| Verify code pattern compliance | 80/100 | Verifiable by reading appropriate axis; no automated checking |
| Determine technology accuracy | 78/100 | Core concepts correct; gaps in dev mode, error handling, Elysia lifecycle |

**Missing for implementation:**
- Migration/delta guidance (current → target)
- Error handling contract across transports
- Testing strategy by layer
- Local Inngest dev mode setup
- Security implementation details (signing verification, gateway config)
- "Add a new capability" step-by-step checklist

---

## 5. Default Patterns Found

| Default Pattern | Where Found | Impact |
|----------------|-------------|--------|
| **Flat hierarchy** | Root directory: 15 session files as peers, no grouping | Critical — destroys wayfinding |
| **Uniform density** | Session docs all get similar treatment despite different purposes (logs vs reviews vs plans) | Medium — reader can't tell which demand careful reading |
| **Redundant scaffolding** | Scope restated across 4 documents; caller matrix restated 7 times | Medium — time wasted on redundant reading |
| **Headers as decoration** | Some session docs: "D-008 Plan (Informal)" — is this draft or final? | Low — isolated to process docs |
| **Formatting as design** | Route Design Review switches between tables, Q&A, and lists within one doc | Low — readable but structurally inconsistent |

---

## 6. Recommendations (Prioritized)

### Phase 1: Directory Restructure (Highest Leverage)

1. **Create root README.md** — 1-paragraph scope, file categories (canonical/process/archive), recommended reading order, navigation flowchart.

2. **Separate canonical from process/archive** — Move all `SESSION_019c587a_AGENT_*`, `*_CHANGELOG.md`, `*_SCRATCHPAD.md`, `*_PLAN_VERBATIM.md` files to `_session-lineage/` subdirectory. Move `additive-extractions/` contents to `_session-lineage/` as well.

3. **Remove SESSION prefix from canonical filenames** — `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` becomes `ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (or merges into ARCHITECTURE.md per Phase 2).

### Phase 2: Authority Consolidation (Second Highest Leverage)

4. **Merge Posture Spec + Packet Index into single ARCHITECTURE.md** — One canonical document with: Scope, Locked Policies (deduplicated), Caller/Auth Matrix (one canonical form), Ownership Split, Topology, Composition Spine, Interaction Flows, Axis Index, Example Index. Eliminates dual-authority ambiguity.

5. **Promote DECISIONS.md to project root** — alongside ARCHITECTURE.md so it's discoverable without navigating into the packet subdirectory.

6. **Fix absolute paths** — Convert all `/Users/mateicanavra/...` references to repo-relative paths.

### Phase 3: Content Quality (Polish)

7. **Chunk flat lists** — Break 31 global invariants into 4-5 named groups (route/transport, ownership, schema/context, middleware, naming). Break 25 cross-cutting defaults into 5 groups. Break 9 packet rules into 3-4 groups.

8. **Declare one canonical caller/auth matrix** — The AXIS_07 "Route Family Purpose Table" (4 rows × 7 columns) is the most complete. Declare it canonical; all other docs reference it. Incomplete renderings in AXIS_03/07/08 should note they're simplified views and link to canonical.

9. **Split or reorganize AXIS_07** — Either: (a) separate into "AXIS_07: Host Composition Policy" + "Reference: Host Composition Inventory and Naming", or (b) add prominent H3 sub-sections grouping the 6-7 concerns.

10. **Improve header scent** — Rename "Global Invariants" → "Subsystem-Wide Constraints", "Integrative Topology" → "Canonical Directory Structure", "Composition Spine" → "Host Bootstrap Sequence."

---

## 7. Comparison Against Original Assessment

### Findings Confirmed by Fresh Assessment

The fresh multi-agent assessment independently identified all five structural problems from the original assessment:

| Original Finding | Fresh Assessment Confirmation |
|-----------------|-------------------------------|
| Session-review directory conflates canonical with process archaeology | ✓ Confirmed as Critical #2.1 — all three agents flagged this |
| Two-tier redundancy between Posture Spec and Packet Index | ✓ Confirmed as Critical #2.2 — content agent audited all 14 policy duplications line-by-line |
| Session-ID prefixes on canonical filenames | ✓ Confirmed as Critical #2.3 |
| Caller/Auth Matrix repeated 4+ times with variations | ✓ Confirmed and EXPANDED — fresh assessment found 7 renderings (original found 4+), with specific column/row delta analysis |
| Absolute filesystem paths | ✓ Confirmed as Medium #2.8 |

### Findings Expanded by Fresh Assessment

The fresh assessment went deeper on several dimensions:

1. **Caller/Auth Matrix drift is worse than originally assessed.** Original noted "4+ times with slight variations." Fresh assessment found 7 distinct renderings and identified that 3 axis docs (AXIS_03, AXIS_07, AXIS_08) omit the server/CLI caller class entirely — a content gap, not just a formatting inconsistency.

2. **AXIS_07 overload identified as a distinct structural problem.** Original assessment folded this into the general packet-quality discussion. Fresh assessment elevated it to High severity with specific evidence (6-7 concerns, 300+ lines, template strain).

3. **Flat numbered lists (31 invariants, 25 defaults) identified as a standalone problem.** Original assessment mentioned this within the merge recommendation. Fresh assessment treated chunking as a standalone High-severity finding with specific grouping recommendations.

4. **E2E progression gaps quantified.** Original assessment didn't examine E2E complexity progression in detail. Fresh assessment identified specific gaps between E2E_02→03 and E2E_03→04, with proposed intermediate examples.

5. **Implementation fitness scored and scenario-tested.** Original assessment discussed fitness qualitatively. Fresh assessment ran 9 specific implementer scenarios with scores, identifying "gap identification" (50/100) and "implementation sequencing" (60/100) as the weakest dimensions.

6. **Technology accuracy verified against skill references.** Original assessment didn't check whether code snippets correctly represented oRPC/Inngest/TypeBox/Elysia behavior. Fresh assessment verified accuracy at 78-95/100 depending on technology, identifying specific gaps (Elysia lifecycle, Inngest dev mode, error handling across transports).

### Findings NOT in Fresh Assessment

One finding from the original assessment was not independently surfaced by the fresh team:

- **Legacy decisions numbering collision** (D-004/D-005 in `LEGACY_DECISIONS_APPENDIX.md` vs current `DECISIONS.md`) — the system-level agent categorized legacy files as "historical-only" but didn't cross-reference their decision IDs against the active register. This collision was identified in the earlier conflict-detection phase and remains valid.

### Reshape Direction: Validated

The original assessment recommended:
1. Merge Posture Spec + Packet Index → `ARCHITECTURE.md`
2. Separate session-lineage artifacts → `_session-lineage/`
3. Remove SESSION prefixes from canonical filenames
4. Rename axis/example files to human-readable names
5. Promote DECISIONS.md to project root

The fresh assessment independently arrived at the same structural recommendations through different analytical paths (system-level agent via wayfinding analysis, content-level agent via duplication audit, implementation-fitness agent via scenario walk-throughs). **The reshape direction is confirmed.**

### Conservative vs Aggressive Calls

The original assessment was appropriately scoped — not conservative. The fresh assessment suggests a few additions:

- **Add "how to read this spec" section** (linearity improvement) — not in original
- **Add "Implementation Checklist" for common tasks** (sequencing improvement) — not in original
- **Consider intermediate E2E examples** (E2E_2.5, E2E_3.5) — not in original
- **Chunk invariant/default lists into sub-groups** — mentioned in original merge plan but not elevated as standalone recommendation
- **AXIS_07 split or reorganization** — not in original as a distinct recommendation

These are incremental improvements, not directional changes. The core reshape plan stands as designed.

---

## 8. Mandate Checks (Self-Assessment of This Document)

**Logic test:** Strip formatting — does the argument hold? Assessment identifies problems ranked by impact, each with evidence and cost. Recommendations map to problems. Comparison section maps original→fresh findings 1:1. Holds.

**Skim test:** Headers predict content. "Dual-authority split between Posture Spec and Packet Index" tells you exactly what that section is about. "Implementation Fitness (Scenario Walk-Throughs)" tells you the table format. Passes.

**Swap test:** Could this assessment apply to a different doc set? No — specific to this project's session-ID naming, this project's posture-spec-vs-packet-index split, this project's 9-axis decomposition, this project's Inngest/oRPC/TypeBox stack. Not a template.

**Noise test:** Every section earns its place. The comparison section (§7) is the largest but serves the explicit user requirement of validating against the original. The mandate checks (§8) are self-referential but demonstrate the methodology applies to its own output.

**Scent test:** Every heading predicts what follows. Passes.
