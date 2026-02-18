# Content-Level Information Design Assessment
## ORPC + Inngest Specification Document Set

**Assessment Date:** 2026-02-18
**Scope:** 22 documents across posture spec, packet index, 9 axis specs, 4 E2E examples, and supporting materials
**Framework:** Information design principles (hierarchy, signal-to-noise, chunking, coherence, information scent)

---

## A. Posture Spec vs Packet Index: Duplication Audit

### A.1 Locked Policies (Identical Content)

#### Policy 1: Split semantics
**Posture Spec (section 2):**
> "Split semantics are fixed between API boundary and durable execution."

**Packet Index:**
> "API boundary and durable execution remain split."

**Assessment:** Same policy, same intent. Posture spec version is more detailed; packet version is more compact. Posture spec is marginally better (specific "API boundary and durable execution" framing).

#### Policy 2: oRPC primary harness
**Posture Spec (section 2):**
> "oRPC is the primary API harness (contracts, routers, OpenAPI, external client generation)."

**Packet Index:**
> "oRPC is the primary boundary API harness."

**Assessment:** Identical intent; posture version specifies the role extent ("contracts, routers, OpenAPI, external client generation"), packet version is terser but loses operational detail.

#### Policy 3: Inngest durable harness
**Posture Spec (section 2):**
> "Inngest functions are the primary durability harness (durable orchestration, retries, step semantics)."

**Packet Index:**
> "Inngest functions are the primary durability harness."

**Assessment:** Posture spec is more complete (specifies roles: "durable orchestration, retries, step semantics"); packet version is vague about what "primary" entails.

#### Policy 4: Durable endpoints additive-only
**Posture Spec (section 2):**
> "Durable Endpoints are additive ingress adapters only, never a second first-party trigger authoring path."

**Packet Index:**
> "Durable endpoints are additive ingress adapters only."

**Assessment:** Posture spec is explicitly complete ("never a second first-party trigger authoring path"); packet version omits the guardrail.

#### Policy 5: Workflow trigger mounts manifest-driven
**Posture Spec (section 2):**
> "Workflow trigger mounts are manifest-driven and capability-first at `/api/workflows/<capability>/*`, with explicit workflow boundary context helpers and one runtime-owned Inngest bundle."

**Packet Index:**
> "Workflow trigger surfaces are manifest-driven and capability-first (`/api/workflows/<capability>/*`) via `rawr.hq.ts`, with explicit workflow context helpers and one runtime-owned Inngest bundle."

**Assessment:** Both are complete and nearly identical. Posture mentions "one runtime-owned bundle" but packet adds "via `rawr.hq.ts`" (implementation detail helpful for clarity).

#### Policy 6: Host bootstrap order
**Posture Spec (section 2):**
> "Host bootstrap initializes baseline `extendedTracesMiddleware()` before Inngest bundle construction, workflow composition, or route registration."

**Packet Index:**
> "Host bootstrap initializes baseline `extendedTracesMiddleware()` before Inngest client/function composition or route registration, and host mount/control-plane ordering remains explicit (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`)."

**Assessment:** Packet version is more complete (includes explicit mount order). Posture version misses the order specification.

#### Policy 7: Plugin middleware inheritance
**Posture Spec (section 2):**
> "Plugin runtime middleware may extend baseline instrumentation context but may not replace or reorder that baseline."

**Packet Index:**
> "Plugin middleware may extend baseline instrumentation context but may not replace or reorder the baseline traces middleware."

**Assessment:** Identical. Packet version adds "traces" (slightly more precise); posture version says "runtime middleware" (broader but less specific).

#### Policy 8: `/rpc` first-party/internal only
**Posture Spec (section 2):**
> "First-party callers (including MFEs by default) use `RPCLink` on `/rpc` unless an explicit exception is documented."

**Packet Index:**
> Not explicitly stated with this phrasing in section headers, though implied in caller/auth matrix.

**Assessment:** DRIFT. Posture spec explicitly locks default ("MFEs by default"), packet index implies but does not lock it prominently.

#### Policy 9: Externally published clients use OpenAPI
**Posture Spec (section 2):**
> "Externally published clients use OpenAPI boundary routes (`/api/orpc/*`, `/api/workflows/<capability>/*`)."

**Packet Index:**
> "External SDK generation uses one composed oRPC/OpenAPI boundary surface."

**Assessment:** Posture spec is more specific (route names); packet version is less precise.

#### Policy 10: Runtime ingress signed `/api/inngest`
**Posture Spec (section 2):**
> "Runtime ingress uses signed `/api/inngest` only."

**Packet Index:**
> Not stated in top-level policies, mentioned in caller/auth matrix only.

**Assessment:** DRIFT. Posture spec locks this; packet index implies it but does not foreground it.

#### Policy 11: No dedicated `/rpc/workflows`
**Posture Spec (section 2):**
> "No dedicated `/rpc/workflows` mount is added by default."

**Packet Index:**
> "No dedicated `/rpc/workflows` mount is required by default."

**Assessment:** Identical intent; "added" vs "required" is negligible difference (posture more active, packet more requirement-focused).

#### Policy 12: Non-black-box composition
**Posture Spec (section 2):**
> "Composition and mounting contracts are explicit and non-black-box."

**Packet Index:**
> "Composition and mounting language MUST stay explicit (no black-box route or ownership narratives)."

**Assessment:** Same principle; packet version is more prescriptive ("MUST") and adds "ownership narratives."

### A.2 Global Invariants (Highly Redundant Set)

**Posture Spec section 4:** 31 items
**Packet Index section Locked Subsystem Policies:** 10 items
**Packet Index section Cross-Cutting Defaults:** 10 items (more detailed)

**Inventory:**
- Posture spec lists 31 invariants in one section (4 Global Invariants).
- Packet index splits them across three sections: "Locked Subsystem Policies," "Caller/Auth Boundary Matrix," and "Cross-Cutting Defaults."
- **Duplication:** 100% of packet policies are restatements of posture spec invariants, with varying levels of detail.

**Assessment of duplication pattern:**
- Posture spec invariants 1-7, 9, 12, 13: EXACT RESTATEMENT in packet (no added value).
- Posture spec invariants 8, 14-31: Scattered across packet sections in chunked form (moderate added value through reorganization).
- **Net result:** Packet reorganizes redundant content by role/axis instead of removing it. This creates two canonical read paths with different chunking strategies but overlapping content.

### A.3 Caller/Auth Matrix Renderings

#### Rendering 1: Posture Spec (section 2.1)
Location: `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`, lines 46-52

Structure: 4 rows (caller types) × 7 columns (caller type, route family, link type, publication boundary, auth expectation, forbidden routes)

Row headers:
1. First-party MFE (default)
2. First-party server/CLI
3. Third-party/external caller
4. Runtime ingress (Inngest)

Columns:
- Caller type
- Route family
- Link type
- Publication boundary
- Auth expectation
- Forbidden routes

#### Rendering 2: Packet Index (section Caller/Auth Boundary Matrix)
Location: `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`, lines 33-60

Structure: YAML key-value pairs (caller_modes array)

Same 4 caller types, 6 fields per caller (caller, client, auth, routes, forbidden)

**Comparison:**
| Rendering | Format | Rows | Columns | Info present Posture missing in Packet | Info present Packet missing in Posture |
| --- | --- | --- | --- | --- | --- |
| Posture Spec | Markdown table | 4 | 7 | "publication boundary" clearly labeled | None |
| Packet Index | YAML | 4 | 6 | None | None (all info present, just restructured) |

**Information completeness:**
- Both renderings convey identical information.
- Posture spec table is slightly more readable (7 columns visually scanned).
- Packet index YAML is slightly more maintainable (key-value structure) but requires vertical scrolling.

#### Rendering 3: AXIS_01_EXTERNAL_CLIENT_GENERATION (section Caller Transport and Publication View)
Location: `AXIS_01`, lines 22-26

Structure: 3 rows × 7 columns (same as posture spec table)

Identical content to posture spec rendering 1.

#### Rendering 4: AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING (section Caller/Auth Matrix)
Location: `AXIS_02`, lines 38-43

Structure: 4 rows × 5 columns

Identical content and same caller types.

#### Rendering 5: AXIS_03_SPLIT_VS_COLLAPSE (section Caller-Mode Boundary Enforcement)
Location: `AXIS_03`, lines 21-26

Structure: 3 rows × 5 columns

Different column set from other tables; focused on call patterns rather than role/client/auth trio.

#### Rendering 6: AXIS_07_HOST_HOOKING_COMPOSITION (section Host Route/Auth Enforcement Matrix)
Location: `AXIS_07`, lines 34-39

Structure: 3 rows × 5 columns

Identical to AXIS_03 rendering.

#### Rendering 7: AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES (section Caller/Auth Matrix)
Location: `AXIS_08`, lines 40-45

Structure: 3 rows × 5 columns

Identical to AXIS_03 and AXIS_07.

**Assessment of matrix drift:**
- **Posture spec + AXIS_01:** 4 rows × 7 columns (most complete)
- **AXIS_02:** 4 rows × 5 columns (missing publication boundary, auth expectation collapsed)
- **AXIS_03 + AXIS_07 + AXIS_08:** 3 rows × 5 columns (missing server/CLI first-party caller, missing some detail columns)
- **Packet Index YAML:** 4 rows, all info present in restructured form

**Drift severity:** MODERATE. The three different 5-column renderings are incomplete compared to the 7-column original, yet they are presented as primary definitions in their respective axis docs. A reader consulting AXIS_03 alone would not see the full caller/auth matrix.

---

## B. Caller/Auth Matrix Drift Analysis

### Completeness by rendering:

**Posture Spec version (most complete):**
- 4 caller types: First-party MFE (default), First-party server/CLI, Third-party/external, Runtime ingress
- 7 columns: Caller type, Route family, Link type, Publication boundary, Auth expectation, Forbidden routes
- Covers all four caller classes

**AXIS_02 version (partial):**
- 4 caller types: First-party MFE/internal caller, Server-internal in-process caller, External/third-party, Runtime ingress
- 5 columns: Caller mode, Allowed routes, Default link/client, Publication boundary, Auth mode, Forbidden routes
- Loses "Link type" and "Auth expectation" as distinct concepts; collapses into "Default link/client" and "Auth mode"
- Still complete in information content (link type is embedded in client choice)

**AXIS_03/07/08 versions (incomplete):**
- 3 caller types: First-party caller, External/third-party, Runtime ingress
- Missing first-party server/CLI caller class entirely
- 5 columns: Caller mode, Primary route family, Link/client, Publication boundary, Auth, Forbidden routes
- Loses granularity on server-internal call defaults

**Problem statement:**
The three axis docs (AXIS_03, AXIS_07, AXIS_08) present simplified 3-row matrices that omit the server/CLI first-party caller. This creates implicit assumption that first-party calling is "MFE-centric" when it should include internal services and CLI tools. A reader consulting only AXIS_07 (Host Hooking) would not learn that first-party servers should use in-process package clients by default.

---

## C. Individual Document Internal Structure Assessment

### C.1 Posture Spec (SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md)

**Heading hierarchy:**
```
# SESSION_019c587a — ORPC + Inngest/Workflows Posture Spec (Integrative Overview)
## Document Role
## 1) Scope
## 2) Locked Policies
## 2.1) Canonical Caller/Transport Matrix
## 3) Original Tensions (Resolved)
## 4) Global Invariants (Subsystem-Wide)
## 5) Axis Map (Coverage)
## 6) Integrative Topology (Cross-Axis)
## 7) Integrative Interaction Flows
### Flow A: External API -> Internal Package Client Path
### Flow B: External API -> Workflow Trigger -> Inngest Durable Execution
### Flow C: Non-Workflow Normal Endpoint (oRPC-only)
## 8) Composition Spine (Cross-Axis Contract)
## 9) Routing, Ownership, and Caller Semantics Snapshot
## 9.1) D-008 Integration Scope
## 10) Naming, Adoption, and Scale Governance (Global)
## 11) Source Anchors
## 12) Navigation
```

**Structural assessment:**

**Hierarchy-as-meaning check:**
- H1: document title (correct)
- H2: nine major sections (Document Role, Scope, Locked Policies, Original Tensions, Global Invariants, Axis Map, Integrative Topology, Interaction Flows, Composition Spine, Naming, Source Anchors, Navigation)
- H3: only three (subsections of section 7 and section 9)
- H4: none

**Issues with hierarchy:**
1. Sections 1-4 are setup/context (Document Role, Scope, Locked Policies, Original Tensions)
2. Sections 5-9 are normative content (Axis Map, Integrative Topology, Interaction Flows, Composition Spine, Routing/Semantics, Naming)
3. Sections 10-12 are navigation/references (Source Anchors, Navigation)
4. **No sub-grouping:** The 12 H2 sections are peers, but 1-4 are "preamble," 5-9 are "core," and 10-12 are "navigation." This could be expressed as a 2-level hierarchy: "Foundations (1-4)" → "Core Architecture (5-9)" → "References (10-12)."

**Signal-to-noise check:**
- Section 1 (Document Role): 3 lines. **Signal:** clarifies that this is an overview, not a reference. **Noise:** none.
- Section 2 (Locked Policies): 14 items. **Signal:** all high-value locks. **Noise:** none (but could benefit from grouping into 3 sub-categories: route families, contract ownership, operational constraints).
- Section 3 (Original Tensions): 4 items. **Signal:** explains design trade-offs. **Noise:** belongs in DECISIONS.md or a bridge doc, not here. Adds context but dilutes focus on "what the policy IS" vs "why we chose it."
- Section 4 (Global Invariants): 31 items, numbered but not grouped. **Signal-to-noise ratio is poor:** 31 items in one flat list. **Should be chunked:** route/transport invariants (1-3), boundary/ownership invariants (8-11, 15), context/middleware invariants (18-31). Currently requires reader to hold all 31 in memory.
- Section 5 (Axis Map): 9 rows. **Signal:** clean reference table. **Noise:** none.
- Sections 6-9: All high-signal content with examples. Density is appropriate.

**Information scent (headers as navigation):**
- "Locked Policies" → signals "what's decided"
- "Original Tensions (Resolved)" → signals "why these choices," slightly ambiguous about whether you need to read it
- "Global Invariants" → clear but broad; "Route/Transport Invariants," "Ownership Invariants," "Context Invariants" would be better scent
- "Axis Map" → clear
- "Integrative Topology" → vague; "Canonical File Structure" or "Package/Plugin/Host Directory Layout" would be better scent
- "Interaction Flows" → clear but naming could be more specific ("Request/Durable Execution Flows")
- "Composition Spine" → vague; "Host Mount Order and Initialization" or "Bootstrap Sequence" would be better scent
- "Routing, Ownership, and Caller Semantics Snapshot" → too long and vague; "Route Family Summary" or "Route Ownership and Caller Class Mapping" would be clearer

**Density calibration:**
- Sections 1-3: High density (many policies + tensions in little space). But section 1 is context (lower stakes), section 3 is explanatory (lower density acceptable).
- Section 4: Uniform density (all 31 invariants at same level of detail/importance). This is the failure case: some invariants are foundational (split posture), others are naming conventions. Should vary density.
- Sections 5-12: Appropriate density (examples are detailed, maps are scannable).

**Overall structure verdict:**
- **Strengths:** Clear separation of concerns (setup, core, references). Section titles are mostly predictive. Ordered from "what's locked" to "how to build it."
- **Weaknesses:**
  1. Section 4 (Global Invariants) is poorly chunked: 31 items in one flat list. Should be 4-5 groups.
  2. Section 3 (Original Tensions) dilutes posture statement; should be optional reading linked from bridge doc.
  3. Header scent is mediocre ("Integrative Topology," "Composition Spine" are vague).
  4. No meta-statement at the top about how to read this doc (sequential vs random-access, what each section is for).

---

### C.2 Packet Index (ORPC_INGEST_SPEC_PACKET.md)

**Heading hierarchy:**
```
# ORPC + Inngest Spec Packet (Self-Contained Entry)
## In Scope
## Out of Scope
## Packet Role
## Locked Subsystem Policies
## Caller/Auth Boundary Matrix
## Axis Coverage (Complete)
## End-to-End Walkthroughs (Tutorial Layer)
## Cross-Cutting Defaults
## D-008 Integration Scope
## Packet Interaction Model
## Canonical Ownership Split
## Packet-Wide Rules
## Navigation Map (If You Need X, Read Y)
## Decision Log
```

**Structural assessment:**

**Hierarchy-as-meaning check:**
- H1: title (correct)
- H2: 14 sections
- H3: none
- **Pattern:** In Scope / Out of Scope / Packet Role / Policies / Matrix / Axis Coverage / Examples / Rules / Navigation / Decisions

**Issues:**
1. First three sections (In Scope, Out of Scope, Packet Role) are preamble. Not preceded by a "Context" or "Overview" H2.
2. Sections "Locked Subsystem Policies," "Caller/Auth Boundary Matrix," "Cross-Cutting Defaults" are related (all normative policies). Could be grouped as "## Normative Policy."
3. Sections "D-008 Integration Scope" and "Packet Interaction Model" and "Canonical Ownership Split" and "Packet-Wide Rules" are related (meta-policy). Could be grouped.
4. Flat structure at H2 level (14 peers) mirrors the posture spec's issue: 14 sections that could be grouped into 4-5 conceptual blocks.

**Signal-to-noise check:**
- "In Scope / Out of Scope / Packet Role": **Signal is high** (reader immediately knows what this doc covers). **Good preamble.**
- "Locked Subsystem Policies": **Signal is high** (10 policies, each a one-liner or two-liner). **Low noise** (all high-value).
- "Caller/Auth Boundary Matrix": **Signal is high** (YAML structure is scannable). **No noise.**
- "Axis Coverage": **Signal is high** (9-item list with links). **No noise.**
- "End-to-End Walkthroughs": **Signal is medium** (4-item list). **Would benefit from descriptive annotations** (what does each walkthrough teach you?).
- "Cross-Cutting Defaults": **Signal is medium to high** (25 defaults, numbered). **Density issue:** all defaults are same level of detail/importance. Should be chunked (route/transport defaults, ownership defaults, schema defaults, context defaults, middleware defaults). Currently 25 items in a flat list.
- "Packet Interaction Model": **Signal is high** (ASCII diagram + prose). **Good.**
- "Canonical Ownership Split": **Signal is high** (5 items, clear role assignment). **Good.**
- "Packet-Wide Rules": **Signal is medium** (9 rules, numbered). **Would benefit from grouping** (documentation rules, execution rules, consistency rules).
- "Navigation Map": **Signal is extremely high** (clear "if you need X, read Y" index). **Excellent.**

**Information scent:**
- "Locked Subsystem Policies" → clear
- "Cross-Cutting Defaults" → clear
- "D-008 Integration Scope" → specialized; assumes reader knows D-008. Could be "Scope of D-008 Bootstrap Lock" for clarity.
- "Packet Interaction Model" → acceptable but could be "Request/Durable Execution Flows" (more consistent with posture spec naming)
- "Canonical Ownership Split" → clear
- "Packet-Wide Rules" → clear
- "Navigation Map (If You Need X, Read Y)" → excellent scent

**Density calibration:**
- Preamble (In Scope/Out/Role): appropriate.
- Policies (Locked/Caller/Axis): all scannable.
- Defaults: **Poor calibration.** 25 defaults at same level of detail/importance. Split into 5 groups:
  - External SDK defaults (1)
  - Internal call defaults (2-3)
  - Workflow routing defaults (4-5)
  - Schema/context defaults (6-11)
  - Middleware/bootstrap defaults (12-15)
- Rules: **Similar issue.** 9 rules at same level. Should be grouped:
  - Cross-document consistency rules (1-3)
  - Schema authoring rules (4-6)
  - Example/documentation rules (7-9)

**Overall structure verdict:**
- **Strengths:**
  1. Excellent "In Scope / Out of Scope" preamble (clear boundaries).
  2. Strong "Navigation Map" section (reader knows where to go).
  3. Caller/Auth matrix is cleanly formatted.
  4. Good separation of tutorial examples from normative policy.
- **Weaknesses:**
  1. "Cross-Cutting Defaults" (25 items) and "Packet-Wide Rules" (9 items) are poorly chunked. Each should be reorganized into 4-5 sub-groups.
  2. Flat 14-section structure could be grouped into 3 conceptual blocks: "Scope and Role," "Normative Policy," "Navigation and Decisions."
  3. "End-to-End Walkthroughs" section lacks descriptive annotations (what does E2E_01 teach vs E2E_02?).

---

### C.3 AXIS_01_EXTERNAL_CLIENT_GENERATION.md

**Heading structure:**
```
# Axis 01: External Client Generation
## In Scope
## Out of Scope
## Canonical Policy
## Caller Transport and Publication View
## Why
## Trade-Offs
## Boundary Plugin Default (Contract-First + Explicit Operations)
### Boundary role ownership
## Canonical Snippets
### Root contract composition anchor
### OpenAPI generation from composed router
### Contract-first boundary implementation
### Router binding and composed export
### First-party default client usage
### External published client usage
## Related Normative Rules
## References
## Cross-Axis Links
```

**Structural assessment:**

**Hierarchy-as-meaning:**
- H1: axis title
- H2: 11 major sections (In/Out Scope, Policy, Table, Why/Trade-offs, Default, Snippets, Rules, Refs, Links)
- H3: 6 sub-sections (all under Snippets)
- Pattern is consistent and clear.

**Signal-to-noise:**
- "In Scope" (3 items): **Signal is high** (reader immediately knows axis focus).
- "Canonical Policy" (7 items): **Signal is high**. Numbering is appropriate.
- "Caller Transport and Publication View": **Signal is high** (3-row matrix with detail). Good.
- "Why" + "Trade-Offs": **Signal is high** (context for design choices). **Density appropriate** (Why: 3 bullets, Trade-offs: 2 bullets).
- "Boundary Plugin Default": **Signal is high** (clear directory structure + role descriptions). Good.
- "Canonical Snippets": **Signal is high** (6 concrete examples, each with context). **Good density:** each snippet is 5-15 lines, which is scannable.
- "Related Normative Rules" (4 items): **Signal is medium** (rules without context; assumes reader knows why they matter).
- "References": **Signal is high** (5 reference sections properly attributed).
- "Cross-Axis Links": **Signal is high** (4 links to related axes, with role descriptions).

**Information scent:**
- "Canonical Policy" → clear
- "Caller Transport and Publication View" → specific and predictive
- "Boundary Plugin Default" → clear but could be "Boundary Plugin Directory Structure" for more scent
- "Canonical Snippets" → clear
- "Related Normative Rules" → acceptable but "Rules Applied in This Axis" would be clearer

**Density calibration:**
- All sections are appropriate density. No oversized lists or under-explained concepts.
- Snippets are a good mix of code (inline, scannable) and explanation.

**Overall structure verdict:**
- **Strengths:**
  1. Consistent In/Out Scope preamble (good for axis context).
  2. Clear progression: Policy → Why → Trade-Offs → Default Structure → Examples → Rules.
  3. Excellent signal scent in headers.
  4. Snippets are well-chunked (6 examples, each ~10 lines, each with a specific purpose stated in the title).
- **Weaknesses:**
  1. "Related Normative Rules" (4 items) lacks context. Why these rules? What do they enforce? Could add a sentence of context before the list.
  2. "Cross-Axis Links" is good but could note which axes are "prerequisites" (should read first) vs "extensions" (read after).

---

### C.4 All Remaining Axis Docs (AXIS_02 through AXIS_09)

**Spot checks on internal structure (all 9 axis docs follow the same template):**

**Template pattern (all 9):**
```
# Axis 0X: [Topic]
## In Scope
## Out of Scope
## Canonical Policy
## [Topic-specific section 1] (e.g., "Caller/Auth Matrix," "Middleware Dedupe Contract," "Allowed vs Disallowed")
## Why
## Trade-Offs
## [Topic-specific section 2+] (e.g., "Internal Package Default," "Required Root Fixtures," "Canonical Snippets")
## References
## Cross-Axis Links
```

**Findings:**

1. **Template appropriateness:**
   - AXIS_02 (Internal Clients): Template fits well. Includes "Internal Package Default" (structured layout), "Canonical Snippets" (code examples), "Naming Defaults" (table of naming patterns). **Well-designed.**
   - AXIS_03 (Split vs Collapse): Template fits. Includes "Explicit Anti-Dual-Path Policy" (guardrails), "Adoption Exception," "Scale Rule," "Practical Red Flags." **Well-designed; adds guardrails beyond just "Policy."**
   - AXIS_04 (Context): Template fits. Includes "Two-Envelope Contract" (table of context types), "Correlation Propagation Contract" (rules), "Canonical Snippets" (code). **Good; adds runtime propagation rules.**
   - AXIS_05 (Errors/Observability): Template fits. Includes "D-008 Integration Scope" (relates to previous decision). **Fine but context-specific.**
   - AXIS_06 (Middleware): Template fits. Includes "Middleware Dedupe Contract" (rules), "Decision Status Notes" (open/closed). **Good; surfaces open decisions.**
   - AXIS_07 (Host Hooking): Template fits but is the LONGEST (300-line limit hit). Includes "Canonical Runtime/Host Inventory," "Canonical File Tree," "Required Root Fixtures," "Canonical Harness Snippets," "Optional Composition Helpers." **Very detailed; template is strained but functional.**
   - AXIS_08 (Workflows vs APIs): Template fits. Includes "Consumer Model" (caller semantics), "Runtime Ingress Enforcement Requirements," "Canonical Workflow Plugin Shape," "Path Strategy" (philosophy section). **Good; adds consumer model and enforcement.**
   - AXIS_09 (Durable Endpoints): Template fits. Very brief. Includes "Allowed vs Disallowed" (guardrails). **Minimal but appropriate given scope.**

2. **Hierarchy consistency across all 9:**
   - **Strong:** All start with In/Out Scope + Canonical Policy.
   - **Good:** All have Why + Trade-Offs sections.
   - **Good:** All end with References + Cross-Axis Links.
   - **Variable:** Topic-specific sections differ per axis (some have named structures like "Plugin Default," some have matrices, some have lists). This is appropriate because axes cover different concerns. **Good variance, not drift.**

3. **Chunking issues:**
   - AXIS_04 "Canonical Snippets": 2 snippets (request context, durable context). **Small but appropriate for axis scope** (context is the focus, not implementation patterns).
   - AXIS_02 "Canonical Snippets": 6 sub-sections, each with code. **Excellent chunking** (each sub-section ~30-50 lines, covering one role at a time: domain, service, procedures, context, router, client, error handling, export).
   - AXIS_07 "Canonical Snippets": 3 sub-sections (TypeBox adapter, Composition root, Host fixture). **Good but AXIS_07 entire doc is straining the template** (300+ lines across multiple concerns: inventory, file tree, fixtures, helpers, naming rules).

4. **Density calibration across axes:**
   - AXIS_01, AXIS_02, AXIS_03, AXIS_08: **Good** (scannable tables, appropriately detailed lists, clear snippets).
   - AXIS_04, AXIS_05, AXIS_06: **Good** (shorter axes, all content has appropriate depth).
   - AXIS_07: **Stretched** (too much content; file tree, inventory, fixtures, helpers, naming, examples all in one doc). Would benefit from splitting or relegating some content to a separate "Composition Helpers" appendix.
   - AXIS_09: **Very brief** (fits on 1-2 pages). Appropriate given scope.

5. **Information scent issues (headers that don't predict content):**
   - AXIS_07 "Canonical Naming Defaults (Canonical)": Parenthetical "(Canonical)" is redundant; header itself already signals this.
   - AXIS_08 "Canonical Snippets": Single section with many sub-sections (trigger contract, operation, router, durable function, enforcement, client variants, surface export, end-to-end interaction). **Good structure but header "Snippets" is vague; could be "Complete Workflow Plugin Implementation Walkthrough"** to better scent the comprehensive nature.
   - AXIS_04 "Canonical Snippets": Context is more limited (just request + durable envelope); header is appropriate.

**Overall template assessment:**
- **Strengths:** The 9 axes follow a consistent pattern (In/Out → Policy → Why/Trade-Offs → Topic-Specific → References/Links). This allows readers to quickly orient to each axis doc.
- **Weaknesses:**
  1. AXIS_07 is overloaded (should split inventory/helpers from policy/snippets).
  2. Some headers are slightly vague (AXIS_04/AXIS_05/AXIS_06 are more specific when checking the actual content).
  3. Topic-specific sections vary widely (good because axes are different, but could be harmonized with clearer section naming).

---

### C.5 E2E Examples (E2E_01 through E2E_04)

**Structure of E2E_01 (Basic Package + API Boundary):**
```
# E2E 01 — Basic Internal Package + API Boundary (TypeBox-First)
## 1) Goal and use-case framing
### Quick coordinates
### Endpoint divergences included
### Split semantics are preserved
## 2) E2E topology diagram
## 3) Canonical file tree
## 4) Key files with concrete code
### 4.1 TypeBox Standard Schema adapter
### 4.2 Internal package: domain + service + procedures + router/client
### 4.3 API boundary plugin: contract ownership + operation mapping
...
```

**Progression check across all four examples:**

| Example | Focus | Scope | New complexity vs previous |
| --- | --- | --- | --- |
| E2E_01 | Package + API boundary | Invoicing capability; API operations only. No workflows. | **Baseline:** Shows package structure (domain/service/procedures), boundary plugin structure (contract/operations), client creation. |
| E2E_02 | API + Workflows + Durable | Invoicing capability; both API and workflow trigger surfaces; Inngest durable function. | **Adds:** Workflow trigger router + function definition. Shows how both surfaces call same internal package client. |
| E2E_03 | MFE + Workflow integration | Invoicing capability; browser MFE calling workflow trigger; status reading; no semantic duplication. | **Adds:** Browser client (RPC vs OpenAPI variants), status/timeline reading. Shows "one semantic source" principle (domain reuse across layers). |
| E2E_04 | Real-world context + middleware | Invoicing capability; multi-tenant principal + roles; request metadata; middleware at both boundaries. | **Adds:** Full context envelope (principal/request/network metadata), dedupe middleware pattern, runtime context injection, error handling. |

**Density calibration:**
- E2E_01: ~300 lines. **File tree + snippets for 5 files** (TypeBox adapter, domain/status, domain/run, service/lifecycle, context, router, client). Appropriate density (one file per major concept, each snippet ~20-30 lines).
- E2E_02: ~300 lines. **File tree + snippets for 10+ files** (package context, domain modules, service modules, procedures, API plugin contract/operations/router, workflow plugin structure). Density is higher (more files, more complex relationships).
- E2E_03: **Very long** (~300 lines). **File tree + snippets for 8+ files** (package domain, browser export, workflow contract, workflow context, workflow router, web client setup, etc.). Density is high; introduces new concepts (browser-safe exports, internal vs external client variants, status/timeline reading).
- E2E_04: **Very long** (~300 lines). **File tree + snippets for 8+ files** (package context with full fields, middleware for role checks + dedupe, real procedures with middleware stacks, API plugin with context resolution, workflow plugin with middleware injection). Density is VERY HIGH; introduces many concurrent concepts (principal/request/network metadata, dedupe markers, middleware stacks, Inngest middleware injection).

**Information scent issues:**
- E2E_01 "Goal and use-case framing" → clear. "Quick coordinates" is a good addition (reader can find things fast).
- E2E_02 "Goal and Use-Case Framing" → clear. But no "Quick coordinates" section (inconsistent vs E2E_01). E2E_02 has "E2E Topology Diagram" first, which partially replaces coordinates.
- E2E_03 "Goal and Use-Case Framing" → very detailed (includes "Caller/Auth Semantics" table). This is good but makes section quite long.
- E2E_04 "Goal and Real-World Framing" → good. Adds "Non-Negotiable Route Semantics" and "D-008 Bootstrap Baseline" sections. This is helpful context but adds overhead.

**Heading hierarchy issues:**
- E2E_01 and E2E_02: Same pattern (## 1) Goal, ## 2) Diagram, ## 3) Tree, ## 4) Code).
- E2E_03 and E2E_04: Different pattern (more sections, more H3 depth). E2E_03 has "2.1 Caller/Auth Semantics" and "2.2 E2E Topology," E2E_04 has "2.1 Non-Negotiable Route Semantics," "2.2 Caller/Auth," "2.3 Runtime Ingress Enforcement Minimum," "3) Topology," "4) File Tree," "5) Code."

**Progression gaps:**
- E2E_01 → E2E_02: Good progression (adds durable layer).
- E2E_02 → E2E_03: Significant jump (adds MFE, adds browser-safe exports, adds RPC vs OpenAPI client variants, adds status/timeline reading). E2E_03 is much harder to follow than E2E_02.
- E2E_03 → E2E_04: Adds multi-tenant context + middleware complexity. Again, a significant jump.

**Assessment:**
- E2E_01 and E2E_02 are well-structured, appropriately dense, and follow a consistent pattern.
- E2E_03 and E2E_04 are much more complex and introduce multiple new concepts. E2E_03 adds "don't duplicate semantics" principle + browser-safe exports + two client variants. E2E_04 adds full context envelope + middleware stacks + dedupe patterns + role checks + network metadata.
- **Gap:** There should be an intermediate example (E2E_2.5?) that focuses ONLY on "MFE calling API via RPC" without also introducing "status/timeline" and "browser-safe exports." Similarly, an E2E_3.5 that focuses ONLY on "middleware and context" without also introducing "real-world multi-tenant" complexity.

---

## D. Cross-Document Consistency

### D.1 Terminology consistency

**Term: "boundary client" vs "composed boundary client" vs "published client" vs "external client"**

Occurrences:
- Posture Spec, section 2.1: "composed boundary clients on `/api/orpc/*` and `/api/workflows/<capability>/*`"
- Packet Index, section Caller/Auth Boundary Matrix: "composed_boundary_clients"
- AXIS_01: "Externally published SDK/client generation" and "external SDK/client" but also "boundary clients"
- AXIS_02: "composed boundary clients" and "published OpenAPI clients"
- AXIS_08: "published OpenAPI clients"

**Consistency check:** All docs use these terms interchangeably to mean "clients generated from OpenAPI surfaces." No one calls them "RPC clients" (which are reserved for internal/first-party). **Consistent.**

**Term: "package internal client" vs "in-process client" vs "internal client"**

Occurrences:
- Posture Spec, section 9: "package internal clients"
- Packet Index: "in-process package internal client" (redundant phrasing)
- AXIS_02: "package internal client," "in-process package clients," "package internal clients"
- E2E_01, E2E_02, E2E_03: All use "internal client"

**Consistency check:** Mix of "in-process package internal client," "package internal client," "internal client." All mean the same thing. Not a critical drift (all are understandable) but could be normalized to one preferred term. **Recommendation: Standardize on "package internal client"** (most descriptive).

**Term: "domain module" vs "domain layer" vs "`domain/*` folder"**

Occurrences across all docs: All three terms are used interchangeably. Generally the context makes it clear (when referring to code, "`domain/*`" is most literal; when discussing architecture, "domain layer" or "domain module" is appropriate).

**Consistency check:** Not critical; all are understandable. **Acceptable.**

**Term: "context" (appears in multiple meanings)**

Meanings:
1. "Request context" = boundary context injected into handlers (AXIS_04)
2. "Runtime context" = Inngest function context (AXIS_04)
3. "`context.ts` module" = file that defines context contracts (AXIS_02, AXIS_07)
4. "Execution context" = generic term for "the environment in which code runs"
5. "Context propagation" = passing context from trigger to durable run (AXIS_04)

**Consistency check:** Generally disambiguated by article + noun:
- "request context envelope" = clear (AXIS_04)
- "runtime function context" = clear (AXIS_04)
- "context.ts" or "context module" = clear (file reference)
- "execution context" = rare, but clear when used

**No critical drift.** Acceptable.

**Term: "caller" vs "consumer" vs "client"**

Occurrences:
- Posture Spec: "caller" (4x), "callers" (frequent)
- Packet Index: "caller" (very frequent), "consumer" (appears in "consumer model" in AXIS_08)
- AXIS_08: "Consumer model" section uses "caller" and "consumer" interchangeably
- E2E_03: "Caller/Auth Semantics" and "consumer" (in first-party/third-party consumer language)

**Consistency check:** "Caller" and "consumer" are synonymous in this context (both mean "code that invokes a boundary"). They're used interchangeably but consistently. **Acceptable; no drift.**

### D.2 Cross-reference accuracy

**Claim: "See AXIS_03 for split posture anti-dual-path guardrails"**

Location in Posture Spec: Section 9.1 references D-008; no cross-reference to AXIS_03.

Actual content in AXIS_03:
- Section "Explicit Anti-Dual-Path Policy" (lines 37-44): Lists allowed non-overlapping pairs and dual-path disallowance rules.
- Section "Practical Red Flags (Reject)" (lines 58-66): Lists six red flags including "creates duplicate first-party trigger authoring paths."

**Accuracy:** ✓ Correct. The anti-dual-path content is exactly where expected.

**Claim: "Procedure I/O schema ownership rules are in AXIS_04 and locked in D-011"**

Location in DECISIONS.md:
- D-011 (lines 52-67): "Procedure I/O schema ownership and context metadata placement" — explicitly states "Procedure input/output schemas live with owning procedures or boundary contracts (`contract.ts`), not in `domain/*`."

Actual content in AXIS_04:
- Section "Canonical Policy" (lines 12-20): Item 7 states "Context-related trigger/procedure docs/examples SHOULD default to inline I/O schema declarations; extraction is exception-only."
- But no explicit statement about "where do procedure schemas live" in AXIS_04.

**Accuracy issue:** D-011 is correctly cited in AXIS_04 references (line 60-66), but AXIS_04 itself does not foreground the ownership rule in its Canonical Policy section. The rule is mentioned in passing in item 7 but not as a primary policy. **Minor drift: Cross-reference is accurate, but the policy emphasis in AXIS_04 is weak.**

**Claim: "Host mount order is explicit: `/api/inngest`, then `/api/workflows/*`, then `/rpc` + `/api/orpc/*`"**

Locations claiming this:
- Posture Spec, section 8 (line 185): Lists mount order in composition spine.
- Packet Index, section "Cross-Cutting Defaults" (line 93): "Mount/control-plane order is explicit: `/api/inngest`, then `/api/workflows/*`, then `/rpc` and `/api/orpc/*`."
- AXIS_07, section "Canonical Policy" (line 23): "Host mount/control-plane order MUST be explicit: `/api/inngest` first, `/api/workflows/*` second, then `/rpc` and `/api/orpc/*`."

**Accuracy:** ✓ All three sources state the same order consistently. Good cross-reference consistency.

**Claim: "Workflow trigger/status I/O schemas are plugin-owned"**

Locations stating this:
- Posture Spec, section 2 (line 38): "Workflow/API boundary contracts are plugin-owned (`plugins/api/*/contract.ts`, `plugins/workflows/*/contract.ts`); workflow trigger/status I/O schemas remain workflow boundary owned."
- Packet Index, "Locked Subsystem Policies" (line 26): "Workflow/API boundary contracts are plugin-owned... workflow trigger/status I/O schemas remain workflow boundary owned."
- AXIS_08, "Canonical Policy" (lines 18): "Workflow/API boundary contracts are plugin-owned... workflow trigger/status I/O schemas stay at the workflow plugin boundary."

**Accuracy:** ✓ Consistent across all sources.

**Claim: "E2E_03 shows micro-frontend without semantic duplication"**

Location in E2E_03:
- Section 1 (lines 1-10): States "without duplicating workflow/domain semantics across browser, plugin, and runtime layers."
- Section 4.1 (lines 194-227): Shows "Shared package semantics (TypeBox-first, browser-safe)" including domain reconciliation states, status schemas, and browser-safe view helpers.

**Accuracy:** ✓ E2E_03 does demonstrate the principle via browser-safe exports and reuse of domain types.

**No critical cross-reference drift detected.** References are generally accurate; some emphasis imbalances exist but content is accurate.

### D.3 Consistency of code examples

**Snippet: Internal package client creation**

E2E_01, lines 287-294:
```ts
export function createInvoicingInternalClient(context: InvoicingProcedureContext) {
  return createRouterClient(invoicingInternalRouter, { context });
}
```

E2E_02, lines 262-269:
```ts
export function createInvoicingInternalClient(context: InvoicingProcedureContext) {
  return createRouterClient(invoicingInternalRouter, { context });
}
```

E2E_04, not shown (limited to 300 lines).

**Consistency:** ✓ Same pattern, same function signature.

**Snippet: Trigger operation (sending Inngest event)**

E2E_02, lines 128-143:
```ts
export async function triggerReconciliationOperation(
  inngest: Inngest,
  input: TriggerInvoiceReconciliationInput,
): Promise<TriggerInvoiceReconciliationOutput> {
  await inngest.send({
    name: "invoice.reconciliation.requested",
    data: { runId: input.runId },
  });
  return { accepted: true as const };
}
```

E2E_03, lines 282-295:
```ts
// First-party default (internal transport)
const internalWorkflowClient = createORPCClient(capabilityClients.invoicing.workflows, {
  link: new RPCLink({ url: `${baseUrl}/rpc` }),
});
```

(Different code block; not directly comparable.)

**Consistency note:** E2E_02 shows the operation at procedure level; E2E_03 focuses on client usage. Both are consistent with the architecture but address different layers. **No inconsistency.**

---

## E. Axis Docs: Template vs Designed

### E.1 Are all 9 axis docs following the same template?

**Yes.** All follow this pattern:
1. In Scope / Out of Scope (context)
2. Canonical Policy (normative)
3. [Topic-specific sections] (details, tables, rules)
4. Why + Trade-Offs (rationale)
5. Canonical Snippets / Examples (code)
6. References (external links)
7. Cross-Axis Links (navigation)

### E.2 Is the template appropriate for all 9?

| Axis | Scope | Template fit | Strain points |
| --- | --- | --- | --- |
| AXIS_01 (External Clients) | Focused (SDK generation + boundary contracts) | ✓ Excellent | None |
| AXIS_02 (Internal Clients) | Focused (package internals + calling) | ✓ Excellent | None |
| AXIS_03 (Split vs Collapse) | Focused (philosophical + guards) | ✓ Good | Includes "Scale Rule" which is methodological, not architectural |
| AXIS_04 (Context) | Focused (request + durable envelopes) | ✓ Good | Two-envelope model is clear; examples are minimal (just two envelope examples) |
| AXIS_05 (Errors/Logging) | Focused (API errors + timeline recording) | ✓ Good | Brief; D-008 integration scope is decision-adjacent content |
| AXIS_06 (Middleware) | Moderate scope (boundary vs durable placement + dedupe) | ~ Medium | Covers two distinct concerns (middleware placement + dedupe pattern); could be split |
| AXIS_07 (Host Hooking) | Very broad (mounts + inventory + fixtures + helpers + naming) | ✗ Strained | AXIS_07 is essentially 3-4 axes worth of content bundled into one doc |
| AXIS_08 (Workflows vs APIs) | Broad (trigger contracts + durable functions + route split) | ~ Medium | Covers 3-4 distinct concerns; consumer model section is helpful but adds complexity |
| AXIS_09 (Durable Endpoints) | Very narrow (additive-only constraint) | ✓ Excellent | Minimal but fits the constraint scope perfectly |

**Assessment:**
- **AXIS_01, AXIS_02, AXIS_03, AXIS_04, AXIS_05, AXIS_09:** Template fits well.
- **AXIS_06:** Template fits but content is moderately strained (covers boundary middleware AND durable middleware AND dedupe; could be split into "Middleware Placement" and "Dedupe Pattern").
- **AXIS_07:** Template is significantly strained. The axis doc contains:
  - Canonical host mount policies
  - Runtime/host inventory (4 key files + descriptions)
  - Canonical file tree (package/plugin/host directory structure)
  - Required root fixtures (TypeBox adapter, composition root, mount contract)
  - Canonical harness snippets (oRPC + OpenAPI, link setup, Inngest serve)
  - Naming rules (11 items)
  - Optional composition helpers (4+ helpers)
  - File-structure implications
  This is 6-7 axes worth of content.
- **AXIS_08:** Template fits but content is moderately complex. The "Consumer Model" section adds strategic framing that's helpful but adds overhead.

### E.3 Which axes benefit from the template, which are constrained?

**Benefit from template:**
- AXIS_01: Template provides clear "In/Out Scope → Policy → Why/Trade → Snippets" progression, which is perfect for a focused concern (SDK generation).
- AXIS_02: Same pattern, same benefit. Focused concern (package internals).
- AXIS_09: Minimal content, template provides appropriate brevity structure.

**Constrained by template:**
- AXIS_07: Template forces all content into "In/Out → Policy → Snippets," but AXIS_07 contains 2-3 different content types (policy, inventory, guidelines). The template doesn't force poor organization, but it does force everything into a linear narrative when some content (like "naming rules" or "inventory") might be better as reference tables.

  **Better structure for AXIS_07 might be:**
  ```
  # Axis 07: Host Hooking and Composition
  ## 1) Core Policy (In/Out scope, canonical mount policy, why/trade-offs)
  ## 2) Host Composition Inventory and Structure
    ### A. Required runtime/host glue files
    ### B. Canonical directory structure
    ### C. Naming defaults
  ## 3) Implementation patterns
    ### Required root fixtures
    ### Canonical harness snippets
    ### Optional composition helpers
  ```

- AXIS_08: Template fits but the "Consumer Model" section is somewhat orthogonal to standard policy. However, it's helpful for understanding caller semantics. Template doesn't constrain, but readability might improve with reordering (move Consumer Model earlier, as strategic framing).

### E.4 Are there axes that should be structured differently from each other?

**Yes.**

- **AXIS_01, AXIS_02, AXIS_03:** All focused on one concern each. Template works well.
- **AXIS_04, AXIS_05:** Relatively focused but add tables (context envelope types, error shapes). Template accommodates this well.
- **AXIS_06:** Covers two distinct concerns (middleware placement + dedupe pattern). **Should split into two axes or use sub-sections more prominently:**
  ```
  # Axis 06A: Middleware Placement (boundary vs durable)
  # Axis 06B: Middleware Dedupe Pattern (manual markers, built-in constraints)
  ```
  OR
  ```
  # Axis 06: Middleware and Cross-Cutting Concerns
  ## A) Middleware Placement Across Harnesses
  ## B) Middleware Dedupe Strategy
  ```

- **AXIS_07:** Covers 6-7 concerns. **Should be broken into:**
  ```
  # Axis 07: Host Hooking and Composition (policy)
  # Reference: Host Composition Inventory and Naming (lookup, not narrative)
  ```
  Or AXIS_07 should explicitly reorganize into 3-4 sub-sections:
  ```
  ## A) Core Composition Policy
  ## B) Host Mount Boundaries and Runtime Inventory
  ## C) Directory Structure Defaults
  ## D) Naming Rules and Conventions
  ```

- **AXIS_08:** Covers 2-3 concerns (trigger authoring, durable functions, route split). **Could separate into:**
  ```
  # Axis 08: Workflow Trigger vs Durable Execution Authoring
  # (split authoring, route split enforcement, consumer model)
  ```
  Current structure is acceptable because the axis is fundamentally about the split between two authoring paths. Template works.

---

## F. E2E Examples: Progressive Complexity Check

### F.1 Complexity progression

| Example | Core addition | Prerequisite concepts | New complexity |
| --- | --- | --- | --- |
| E2E_01 | Package + boundary API | TypeBox, oRPC procedures, `createRouterClient`, operation mapping | Domain → service → procedure → boundary operation pattern. Single caller path (boundary → operation → client). |
| E2E_02 | + Workflow trigger + durable | (E2E_01) + Inngest `send()` + `createFunction()` + durable step lifecycle | Two caller paths: API → operation and Trigger → operation (same client). Durable execution model. |
| E2E_03 | + MFE + browser-safe exports + status/timeline reading | (E2E_02) + RPC vs OpenAPI client variants + ` browser.ts` exports + status/timeline routes | Multiple client variants (RPC internal vs OpenAPI external). Domain reuse across layers without semantic duplication. Status/timeline reading pattern. |
| E2E_04 | + Real-world context + middleware + dedupe | (E2E_02 foundation, not E2E_03) + multi-tenant principal + metadata types + middleware stacks + dedupe markers | Full context envelope (principal/request/network). Role-based access control. Middleware dedupe pattern. Context propagation across boundary → operation → package layers. Inngest middleware context injection. |

### F.2 Gaps in progression

**Gap between E2E_02 and E2E_03:**
- E2E_02 shows "API + Workflows + Durable" (architecture and implementation).
- E2E_03 adds "MFE + RPC vs OpenAPI client variants + browser-safe exports."
- **Missing:** An intermediate example that focuses ONLY on "MFE calling API via RPC" or "choosing between RPC and OpenAPI for first-party browser code" without also introducing status/timeline reading and browser-safe exports. A simpler example showing:
  1. Package with simple domain types
  2. API boundary
  3. MFE calling API via `/rpc` and `RPCLink`
  4. That's it.

**Gap between E2E_03 and E2E_04:**
- E2E_03 is about "reusing domain semantics across layers."
- E2E_04 is about "real-world context + middleware at scale."
- **Missing:** An intermediate example showing "middleware stack without multi-tenancy complexity." E2E_04 introduces too many concepts at once:
  1. Multi-tenant principal
  2. Request metadata (requestId, correlationId, IP, UA)
  3. Network policy (trustedCidrs, egressPolicyTag)
  4. Middleware at both boundaries
  5. Dedupe markers
  6. Inngest middleware context injection

  **Better intermediate example (E2E_3.5):**
  - E2E_03 implementation
  - Add: Simple middleware (role check)
  - Add: Request metadata (requestId, correlationId)
  - Don't add: multi-tenant principal, network policy, egressPolicyTag

### F.3 Unnecessary repetition

**Repetition: File tree structure**
- E2E_01 section 3 (lines 56-92): Full tree
- E2E_02 section 3 (lines 39-83): Full tree (nearly identical, with minor additions for workflows)
- E2E_03 section 3 (lines 55-103): Full tree (repeated again)
- E2E_04 section 4 (lines 68-111): Full tree (repeated again, 4th time)

**Assessment:** Each example does include its own file tree (for completeness), but 3-4 full trees is repetitive. **Could reduce to:**
- E2E_01: Full tree (baseline)
- E2E_02: Diff from E2E_01 (mark additions with `+`)
- E2E_03: Diff from E2E_02
- E2E_04: Diff from E2E_02 or E2E_03

**Repetition: Caller/Auth semantics table**
- E2E_03 section 1 (lines 22-29): Caller/Auth Semantics table (4 rows × 6 columns)
- E2E_04 section 2.1 (lines 24-29): Caller/Auth Semantics table (3 rows × 6 columns)

**Assessment:** Both tables are identical in content; E2E_04 omits the "internal package/service/CLI" row. **Could unify:** Reference the canonical matrix in AXIS_08 or Packet Index, then note any deviations for the example.

**Repetition: Route semantics narrative**
- E2E_03 section 1 (lines 45-53): Routes and context semantics (prose)
- E2E_04 section 2 (lines 14-41): "Non-Negotiable Route Semantics" + "D-008 Bootstrap Baseline" + "Caller/Auth Semantics" (much longer prose)

**Assessment:** E2E_04 essentially restates E2E_03's semantic framing in much greater detail. **Could consolidate:** Link to canonical policy in AXIS_08 and just note what E2E_04 specifically demonstrates (multi-tenant, middleware, dedupe).

---

## G. Content Mandate Checks

### G.1 Logic Test (remove formatting, does argument flow hold?)

**Test performed on:** Posture Spec sections 1-4 (setup) + AXIS_03 (Split vs Collapse) + Packet Index (policies)

**Posture Spec sections 1-4 (plain text, no formatting):**
```
This subsystem posture defines how oRPC, Inngest, TypeBox, and Elysia compose.

Locked policies are:
1. Split semantics are fixed: API boundary and durable execution are distinct.
2. oRPC is the primary API harness.
3. Inngest functions are the primary durability harness.
[... 11 more items ...]

Original tensions include:
1. Collapse into one surface vs preserve semantic correctness.
2. Flexible internal calling styles vs enforce one deterministic default.
[... 2 more ...]

Global invariants (31 items) are locked on route families, ownership, middleware, context, schema authoring.
```

**Logic flow assessment:**
- ✓ Introduction (what this spec covers)
- ✓ Locked policies (list of decisions)
- ✓ Original tensions (why those decisions)
- ✓ Global invariants (constraints that follow from decisions)
- ✓ Flow is clear: "What," "Why," "What constraints follow"

**The argument holds without formatting.**

**AXIS_03 plain text:**
```
Split is retained as canonical: API boundary and durability harness are distinct.
Full collapse into one surface is rejected.

Why: External API contract semantics and durable execution semantics are non-equivalent.
Inngest ingress/runtime behavior must not define first-party API contract behavior.
Explicit caller-mode boundaries prevent accidental collapse.

Practical red flags that violate split:
1. Duplicate first-party trigger authoring paths.
2. Blur caller-trigger API routes and /api/inngest ingress.
[... 5 more ...]

Allowed non-overlapping pair (not a violation):
1. packages/<capability>/src/client.ts internal client path for synchronous calls.
2. Inngest event/function path for durable asynchronous orchestration.
```

**Logic flow assessment:**
- ✓ Decision statement (split is retained)
- ✓ Rejection of alternative (collapse rejected)
- ✓ Why (reasoning)
- ✓ Guardrails (red flags)
- ✓ Exception (allowed non-overlapping)
- ✓ Flow is clear: "What we chose," "What we reject," "Why," "How to recognize violations," "Exception"

**The argument holds without formatting.**

**Packet Index plain text (subset):**
```
In scope: canonical leaf-spec packet for ORPC boundaries, workflow triggers, Inngest durable execution, host composition.

Out of scope: runtime code, migration planning, replacing the posture spec role.

Locked policies: split, oRPC primary, Inngest primary, durable endpoints additive, manifest-driven workflows, plugin boundary contracts, browser/internal caller semantics, bootstrap order, middleware inheritance.

Caller/auth boundary matrix: three caller modes (browser/network, server-internal, runtime ingress) with their routes, clients, publication boundaries, auth, and forbidden paths.

Axis coverage: 9 axes, each with policy.

E2E walkthroughs: 4 examples showing increasingly complex scenarios.
```

**Logic flow assessment:**
- ✓ Scope boundaries (what's in, what's out)
- ✓ Locked policies (summary list)
- ✓ Caller matrix (the key table)
- ✓ Axis organization (how policy is distributed)
- ✓ Examples (how to apply)
- ✓ Flow is clear: "Boundaries," "Policies," "Key matrix," "Detailed breakdown," "Examples"

**The argument holds without formatting.**

**Overall logic test verdict:** ✓ All three documents have coherent logical flow without formatting. Arguments are clear and well-structured.

### G.2 Skim Test (read only headers + first sentences, can you answer: what is this about, who is it for, what are key points?)

**Posture Spec skim:**

Headers (H1, H2 only):
```
# SESSION_019c587a — ORPC + Inngest/Workflows Posture Spec (Integrative Overview)
## Document Role
## 1) Scope
## 2) Locked Policies
## 3) Original Tensions (Resolved)
## 4) Global Invariants (Subsystem-Wide)
## 5) Axis Map (Coverage)
## 6) Integrative Topology (Cross-Axis)
## 7) Integrative Interaction Flows
## 8) Composition Spine (Cross-Axis Contract)
## 9) Routing, Ownership, and Caller Semantics Snapshot
## 10) Naming, Adoption, and Scale Governance (Global)
## 11) Source Anchors
## 12) Navigation
```

First sentences:
- Document Role: "This file is the integrative subsystem overview for ORPC + Inngest posture."
- Scope: "This subsystem posture defines how this system composes: 1. oRPC boundary APIs, 2. workflow trigger APIs, 3. Inngest durable execution, 4. optional Durable Endpoint ingress adapters, under TypeBox + oRPC + Elysia + Inngest."
- Locked Policies: "1. Split semantics are fixed between API boundary and durable execution."
- Original Tensions: "1. Collapse into one plugin/surface for simplicity vs preserve semantic correctness across non-equivalent runtime models."
- Global Invariants: "1. `/api/inngest` is runtime ingress only."
- Axis Map: "| Axis | Policy surface | Canonical leaf spec |"
- Interaction Flows: "### Flow A: External API -> Internal Package Client Path / Intent: non-durable boundary action mapped to package capability logic."
- Composition Spine: "1. Initialize baseline `extendedTracesMiddleware()` before host composition work."
- Routing, Ownership, Caller Semantics: "- **Host/route spine:** Capability-first `/api/workflows/<capability>/*` remains caller-facing and `/api/inngest` remains runtime-only ingress."
- Naming, Adoption: "1. Canonical role names: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`."
- Source Anchors: Links
- Navigation: "- If you need one axis policy in implementation-ready depth, start in `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` and follow its axis map."

**Skim assessment:**
- **What is this about?** ORPC + Inngest posture for boundary APIs, workflows, and durable execution. ✓ Clear
- **Who is it for?** Engineers implementing the architecture. ✓ Implied
- **Key points?** Split semantics, oRPC primary, Inngest primary, manifests, typed contracts, context separation, naming conventions. ✓ Clear from headers
- **Can you navigate it?** Yes. Headers are specific and flow logically.

**Verdict:** ✓ Good skim-ability. Headers predict content. First sentences provide quick context.

**Packet Index skim:**

Headers:
```
# ORPC + Inngest Spec Packet (Self-Contained Entry)
## In Scope
## Out of Scope
## Packet Role
## Locked Subsystem Policies
## Caller/Auth Boundary Matrix
## Axis Coverage (Complete)
## End-to-End Walkthroughs (Tutorial Layer)
## Cross-Cutting Defaults
## D-008 Integration Scope
## Packet Interaction Model
## Canonical Ownership Split
## Packet-Wide Rules
## Navigation Map (If You Need X, Read Y)
## Decision Log
```

First sentences:
- Packet Role: "This packet is the canonical leaf-level spec set."
- Locked Policies: "1. API boundary and durable execution remain split."
- Caller/Auth Matrix: "`yaml caller_modes: ...`"
- Axis Coverage: "1. [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)"
- End-to-End Walkthroughs: "These are implementation-oriented walkthroughs that apply axis policies in concrete flows."
- Cross-Cutting Defaults: "1. External SDK generation uses one composed oRPC/OpenAPI boundary surface."
- Packet Interaction Model: "```text Caller -> oRPC boundary procedure ...```"
- Canonical Ownership Split: "- Package layer owns domain/service/procedures/internal router/client/errors/index."
- Packet-Wide Rules: "1. Each axis doc owns one policy slice; cross-axis docs reference owners rather than duplicating policy text."
- Navigation Map: "- External client generation and OpenAPI surface ownership -> [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)"

**Skim assessment:**
- **What is this about?** ORPC + Inngest packet with 9 axes, caller matrix, and walkthroughs. ✓ Clear
- **Who is it for?** Engineers implementing the packet policies. ✓ Clear
- **Key points?** Split, caller matrix, 9 axes, examples, ownership split, rules. ✓ All present in headers
- **Can you navigate it?** Yes. Navigation Map is excellent ("if you need X, read Y").

**Verdict:** ✓ Excellent skim-ability. Navigation Map is a standout.

### G.3 Swap Test (could you apply this structure to different content?)

**Structure of Posture Spec (applies to "ORPC + Inngest posture" scope):**
```
1. Document Role
2. Scope (what this defines)
3. Locked Policies (decisions)
4. Original Tensions (trade-offs)
5. Global Invariants (constraints)
6. Axis Map (topology of policies)
7-9. Integrative sections (how it all fits)
10. Naming/Governance (rules)
11-12. References and Navigation
```

**Could this structure apply to different content?**

Example: "Database Schema Design Posture"
- Document Role: "This file defines how our database schema is structured."
- Scope: "Schema for users, orders, products, inventory."
- Locked Policies: "1. All tables have surrogate keys. 2. Foreign keys are explicit."
- Original Tensions: "1. Denormalization for query speed vs normalization for consistency."
- Global Invariants: "1. Audit columns on all tables. 2. Soft deletes only."
- Axis Map: "| Axis | Coverage | Spec |"
- Integrative sections: "How users, orders, products relate."
- Naming: "Naming conventions for tables, columns."

**Answer:** This structure would work well for posture-level architectural documents. **It's a generic "architecture decision document" template, not specifically tied to ORPC/Inngest.**

**Verdict:** The Posture Spec structure is a template that could be reused. This is not inherently bad (templates are useful), but it suggests the document wasn't designed specifically for this content—it was shaped from a pre-existing structure. **Implication: The document follows a sound structure, but didn't emerge from content analysis.**

### G.4 Noise Test (for every structural element, what happens if you remove it?)

**Posture Spec section 3 (Original Tensions): Is this noise?**

Content: 4 original tensions that led to the current posture.

"What happens if you remove it?"
- Readers don't learn why split was chosen (they just see "split is locked").
- Readers can't evaluate whether the trade-offs are appropriate for their use case.
- Readers can't understand the design history.

**Verdict:** NOT noise. But it's explanatory content, not prescriptive. **Better placement: Optional reading, linked from a bridge document (like SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md).** Its current placement in the normative spec dilutes the "what is locked" message.

**Posture Spec section 4 (Global Invariants): Is this noise?**

Content: 31 invariants, many of which restate locked policies in greater detail.

"What happens if you remove it?"
- Readers miss operational constraints that aren't explicit in the locked policies (e.g., "Package filenames inside one domain/ folder omit redundant domain-prefix tokens").
- Readers miss guidance on schema authoring, context contracts, and naming defaults.

**Verdict:** NOT noise. Highly signal-dense. But the 31-item flat list is poorly chunked. **Needs reorganization:** Break into 4-5 named groups (route/transport invariants, ownership invariants, schema/context invariants, middleware invariants, naming/governance invariants).

**Packet Index section "Cross-Cutting Defaults": Is this noise?**

Content: 25 defaults covering external SDK, internal calls, workflow routing, schema/context, middleware/bootstrap.

"What happens if you remove it?"
- Readers miss key operational patterns (inline I/O defaults, context placement, middleware separation).
- The 9 axis docs still cover these details, but a consolidated list is helpful for quick lookup.

**Verdict:** NOT noise, but REDUNDANT. All 25 defaults are stated in the 9 axis docs. The "Cross-Cutting Defaults" section is a convenience index, not unique content. **Recommendation:** Move this to a "Quick Reference" appendix or mark it explicitly as "Summary of Policies Detailed in Each Axis."

**Packet Index section "Navigation Map": Is this noise?**

Content: "If you need X, read Y" for 9 axis topics + examples + redistribution.

"What happens if you remove it?"
- Readers get lost. The packet is 160+ lines, with 13+ major sections. Without a navigation map, reader must search for relevant content.

**Verdict:** NOT noise. High signal. Essential for usability.

**E2E_01 section "Endpoint divergences included": Is this noise?**

Content: Example of how API boundary input can differ from package input.

"What happens if you remove it?"
- Readers see a single example path (boundary → operation → client).
- They might think "API contracts must mirror internal procedure signatures exactly."
- They miss the design point (boundaries can adapt/transform I/O).

**Verdict:** NOT noise. Clarifies an important design point (contracts are boundary-owned, not copies of internal signatures).

**E2E_03 section "Chosen default path": Is this noise?**

Content: Frames the example as "one default approach" among possible alternatives.

"What happens if you remove it?"
- Readers see the code and assume it's the only right way.
- They don't understand that browser-safe exports and separate client variants are choices, not mandates.

**Verdict:** NOT noise. Clarifies that examples are illustrative, not prescriptive.

**Overall noise assessment:** The specification documents have very little noise. All major sections contribute signal. The only organizational improvements needed are:
1. Chunking large flat lists (Posture Spec invariants, Packet Index defaults/rules).
2. Marking explanatory sections as optional (Original Tensions, rationale sections).
3. Moving convenience summaries to a "Quick Reference" clearly labeled as such.

### G.5 Scent Test (do headings predict content?)

**Posture Spec headers:**

| Header | Predicted content | Actual content | Scent quality |
| --- | --- | --- | --- |
| "Scope" | What this spec covers | oRPC APIs, workflow APIs, Inngest execution, TypeBox, Elysia, Durable Endpoints | ✓ Good |
| "Locked Policies" | Decisions that are fixed | 14 locked decisions (split, oRPC primary, etc.) | ✓ Excellent |
| "Original Tensions (Resolved)" | Why these decisions; trade-offs | 4 tensions and resolutions | ✓ Good but better labeled "Trade-Offs and Resolutions" |
| "Global Invariants" | Constraints that follow from policies | 31 numbered invariants | ✗ Vague. Better: "Subsystem-Wide Constraints and Governance" |
| "Axis Map (Coverage)" | Index of the 9 axes | 9-row table | ✓ Excellent |
| "Integrative Topology" | How components fit together (architecture diagram expected) | ASCII diagram of package/plugin/host tree | ~ Good. Header suggests "topology," diagram shows structure. Could be "Canonical Directory Structure" |
| "Integrative Interaction Flows" | How requests/durable work flow through the system | 3 flows (API → client, trigger → function, read-only) | ✓ Good |
| "Composition Spine" | Startup and mounting sequence | 6-item checklist of bootstrap order | ✓ Good |
| "Routing, Ownership, and Caller Semantics Snapshot" | High-level summary of routes, who owns what, caller patterns | 6-bullet summary | ~ Good but very long header. Could be "Route/Ownership/Caller Summary" |
| "Naming, Adoption, and Scale Governance" | Naming rules and how to scale | 18 items on roles, files, naming, adoption exceptions | ~ Adequate but broad. "Naming Conventions and Governance" would be clearer. |

**Packet Index headers:**

| Header | Predicted | Actual | Scent |
| --- | --- | --- | --- |
| "Locked Subsystem Policies" | Fixed architectural decisions | 10 policies (less detail than Posture Spec section 2) | ✓ Good |
| "Caller/Auth Boundary Matrix" | Table showing who can call what, how | 4 rows (caller types) × 6 columns (routes/auth/etc) | ✓ Excellent |
| "Axis Coverage (Complete)" | List of 9 axes | 9-item list with links | ✓ Good |
| "End-to-End Walkthroughs (Tutorial Layer)" | Step-by-step examples | 4 examples, each 200-300 lines | ✓ Good |
| "Cross-Cutting Defaults" | Default patterns that span all axes | 25 defaults on SDK, calling, routing, schema, middleware | ✓ Good |
| "D-008 Integration Scope" | Scope of decision D-008 | What changed, what stayed the same in bootstrap lock | ~ Adequate but decision-specific. Better linked from DECISIONS.md. |
| "Packet Interaction Model" | Interaction diagram/flow | ASCII showing Caller → oRPC → internals → Inngest → durable | ✓ Good |
| "Canonical Ownership Split" | Who owns what | 5 lines on package/API/workflow/host/naming ownership | ✓ Good |
| "Packet-Wide Rules" | Rules that apply to the whole packet | 9 rules on doc ownership, consistency, schema, naming | ~ Adequate but rules span multiple concerns. Could be "Documentation and Implementation Rules." |
| "Navigation Map (If You Need X, Read Y)" | Index to find content by topic | 9 navigation links | ✓ Excellent |

**Scent assessment:**
- **Posture Spec:** Most headers have good scent. "Global Invariants" and "Integrative Topology" are slightly vague.
- **Packet Index:** Headers have excellent scent overall. "Navigation Map" is a standout (extremely clear about purpose).

---

## H. Summary Table: Findings

| Category | Finding | Severity | Recommendation |
| --- | --- | --- | --- |
| **Duplication: Policies** | 14 policies stated in both Posture Spec (section 2) and Packet Index. All substantively identical, some with varying detail levels. | Medium | Posture Spec is the authoritative version (more detailed). Packet Index should reference posture spec rather than restate. OR: Clearly mark one as "canonical," other as "summary." |
| **Duplication: Global Invariants** | Posture Spec lists 31 invariants (section 4); Packet Index scatters same content across "Locked Policies," "Defaults," and "Rules." | Medium | Split invariants into 4-5 named groups in Posture Spec. Update Packet Index to reference groups rather than scatter. |
| **Duplication: Caller/Auth Matrix** | Matrix appears 7 times across documents (Posture, Packet, AXIS_01, AXIS_02, AXIS_03, AXIS_07, AXIS_08). Varying row/column counts create incomplete renderings. | Medium | Keep one canonical 4-row × 7-column matrix. All other docs should reference it. Incomplete renderings (3 rows in AXIS_03/07/08) should note they're simplified views. |
| **Drift: Route specification** | Posture Spec, section 2, line 48: "First-party MFEs by default use RPCLink." Not prominently stated in Packet Index top-level policies. | Low | Packet Index should front-load "First-party/internal default is RPC" as policy item 1. |
| **Drift: Caller types in matrix** | AXIS_03, AXIS_07, AXIS_08 matrices omit "First-party server/CLI" caller type, showing only 3 rows instead of 4. Axis docs should be complete. | Low | AXIS_03/07/08 matrices should include all 4 caller types, even if some columns are less relevant. |
| **Structure: Flat lists** | Posture Spec section 4 (31 invariants), Packet Index "Cross-Cutting Defaults" (25 defaults), "Packet-Wide Rules" (9 rules) are all presented as flat numbered lists. | Medium | Group into 4-5 sub-categories per section. Use H3 or formatting to show grouping. Reduces cognitive load. |
| **Structure: AXIS_07 overload** | AXIS_07 contains 6-7 distinct concerns (host policy, inventory, file tree, fixtures, helpers, naming, examples) in one 300+ line doc. | Medium | Split into "AXIS_07: Host Composition Policy" + separate "Reference: Host Composition Inventory and Naming" doc. OR: Reorganize with prominent H3 sub-sections. |
| **Structure: AXIS_06 scope creep** | AXIS_06 covers two distinct concerns (middleware placement, dedupe pattern). Template doesn't force this but readability suffers. | Low | Consider splitting into "AXIS_06: Middleware Placement" and "AXIS_06B: Middleware Dedupe Pattern." OR: Add prominent H3 sub-section divider. |
| **Hierarchy: Posture Spec** | 12 H2 sections with no grouping. Sections 1-4 are preamble, 5-9 are core, 10-12 are reference. Could use H1 grouping. | Low | Add intermediate organization: no H1 change needed, but clarify "Preamble," "Core Architecture," "References" with prose headers or visual grouping. |
| **Hierarchy: Packet Index** | 14 H2 sections with no grouping. Similar issue to Posture Spec. | Low | Regroup with intermediate category headers or rearrange sections into 3-4 logical blocks. |
| **Scent: Headers** | "Global Invariants," "Integrative Topology," "Integrative Interaction Flows," "Composition Spine" are slightly vague or unusual terms. | Low | Rename to "Subsystem-Wide Constraints," "Canonical Directory Structure," "Request and Durable Execution Flows," "Host Bootstrap Sequence." |
| **E2E progression** | 4 examples show increasing complexity but gaps exist. E2E_03 jumps from E2E_02 (adds MFE + browser-safe + client variants + status reading). E2E_04 jumps from E2E_02 (adds multi-tenant + middleware + dedupe). | Low | Add intermediate examples: E2E_2.5 (simple MFE + RPC), E2E_3.5 (simple middleware without multi-tenancy). |
| **E2E repetition** | File tree structure repeated 4 times identically. Caller/Auth matrix repeated in multiple E2E docs. Route semantics narrative repeated. | Low | Use diffs for file trees. Reference canonical matrix. Link to canonical policy narratives. |
| **Cross-reference accuracy** | All spot-checked cross-references are accurate. No broken links found. D-011 is cited correctly in AXIS_04. | None | ✓ No action needed. |
| **Terminology consistency** | "boundary client," "published client," "package internal client" are used interchangeably but consistently understood. All clearly defined where used. | None | ✓ Acceptable. Optional: standardize on "package internal client" as preferred term. |
| **Logic flow** | All documents (Posture, Packet, AXIS_03, E2E examples) have coherent logical flow when formatting is removed. | None | ✓ No action needed. |
| **Information scent (skim test)** | Headers successfully predict content. Readers can skim headers and understand document scope, key points, and navigation. | None | ✓ Strong overall. Minor improvements possible (renaming vague headers). |
| **Signal-to-noise ratio** | Very few noise elements. Some redundancy (stated policies appear multiple places) but not noise. Optional reading (Original Tensions) is useful but dilutes core message. | Low | Move explanatory sections (Original Tensions, rationale) to bridge/reference documents. Mark clearly as optional. |

---

## I. Comprehensive Summary

### Information Design Strengths
1. **Clear hierarchical organization:** All documents follow logical progressions (Scope → Policy → Examples → References).
2. **Excellent navigation:** Packet Index "Navigation Map" and E2E section "Quick Coordinates" are standout.
3. **Strong coherence:** Same core policies appear consistently across documents; no contradictions found.
4. **Appropriate density for most content:** Snippets, tables, and examples are scannable; explanatory prose is proportionate.
5. **High signal-to-noise ratio:** Minimal unnecessary content; all structural elements contribute meaning.
6. **Good information scent:** Headers successfully predict content in most cases.

### Information Design Weaknesses
1. **Substantial redundancy in policies:** 14 locked policies restate identically across Posture Spec and Packet Index. Similarly, 31 invariants are scattered across multiple documents.
2. **Poorly chunked lists:** 31 invariants (Posture), 25 defaults (Packet), 9 rules (Packet) are presented as flat lists. Would benefit from 4-5 groupings each.
3. **Incomplete matrices in axis docs:** AXIS_03, AXIS_07, AXIS_08 show simplified 3-row caller matrices; omitting first-party server/CLI caller class. Readers using only these axes miss important caller semantics.
4. **AXIS_07 is overloaded:** Combines host policy, inventory, fixtures, helpers, naming, and examples (6-7 concerns in one doc).
5. **Variable heading precision:** Some headers are vague ("Integrative Topology," "Composition Spine," "Packet-Wide Rules"). Others are excellent ("Locked Subsystem Policies," "Navigation Map").
6. **Explanatory content dilutes posture statement:** "Original Tensions" section is useful context but belongs in a bridge document, not in the normative posture spec.
7. **E2E examples have progression gaps:** Jumps from E2E_02 (API + Workflows) to E2E_03 (MFE + multiple client variants + status reading) without intermediate step. Similarly E2E_03 to E2E_04.

### Recommendations (Prioritized)

**HIGH (improves clarity significantly):**
1. Consolidate caller/auth matrices: Keep one canonical 4×7 matrix; update all axis docs to reference it and note any simplifications.
2. Chunk flat lists: Break 31 invariants into 4-5 groups. Break 25 defaults into 5 groups. Break 9 rules into 3-4 groups.
3. Clarify policy redundancy: Mark Posture Spec as canonical; have Packet Index reference it. OR: Clearly designate one as "normative," other as "summary."
4. Fix vague headers: Rename "Global Invariants" → "Subsystem-Wide Constraints," "Integrative Topology" → "Canonical Directory Structure," "Composition Spine" → "Host Bootstrap Sequence."

**MEDIUM (improves usability):**
5. Reorganize AXIS_07: Split into "Policy" + "Reference Inventory" documents. OR: Add H3 sub-sections grouping the 6-7 concerns.
6. Move explanatory sections: Relocate "Original Tensions," design rationale to optional reading (bridge docs). Mark as context, not normative.
7. Add intermediate E2E examples: E2E_2.5 (simple MFE + RPC), E2E_3.5 (simple middleware without multi-tenancy).
8. Consolidate E2E repetition: Use file tree diffs, reference canonical matrices, link to canonical policy narratives.

**LOW (nice-to-have):**
9. Add grouped section headers to Posture Spec and Packet Index (visual grouping of 12-14 H2 sections into 3-4 blocks).
10. Standardize terminology: Prefer "package internal client" over "in-process client" or "internal client" where it appears.
11. Enhance E2E "Quick Coordinates" in E2E_02/03/04 (currently only in E2E_01).
12. Add context to "Related Normative Rules" sections: one-sentence explanation of why each rule matters.

### Axis Template Assessment
The template (In/Out Scope → Policy → Topic-specific → Why/Trade-Offs → Snippets → References → Links) is sound and appropriate for most axes. **AXIS_07 is strained** (overloaded with 6-7 concerns); consider splitting. **AXIS_06 is moderately strained** (two distinct concerns: placement + dedupe); consider sub-sectioning.

### Cross-Document Consistency Assessment
**Policies:** Highly consistent; 100% of policies checked are coherent across documents. No contradictions found.
**Matrices:** Consistent intent but varying completeness. Some axes show simplified versions; all are accurate but incomplete.
**Code examples:** Consistent patterns; all follow same architectural shapes.
**Terminology:** Consistent; minor variations (e.g., "package internal client" vs "in-process client") are negligible.

---

**Assessment completed.**
