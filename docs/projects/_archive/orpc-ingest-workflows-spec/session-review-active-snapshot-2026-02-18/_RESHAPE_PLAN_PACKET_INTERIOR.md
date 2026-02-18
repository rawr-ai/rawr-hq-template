# Reshape Plan: Packet Interior Quality
## ORPC + Inngest Spec Packet — Interior Architecture Improvements

**Date:** 2026-02-18
**Agent Focus:** Packet interior quality (axis docs, E2E examples, decisions register, cross-references)
**Scope:** Content restructuring within canonical packet files; no directory moves or authority consolidation
**Methodology:** Information-design six-axis assessment → per-document improvement plan → cross-reference validation

---

## PART 1: Six-Axis Assessment of the Packet as a System

This section establishes the structural position the packet should occupy and evaluates the current state.

### Axis Positions

| Axis | Target Position | Current State | Assessment |
|------|-----------------|---------------|------------|
| **Purpose** | Precision/reference | Precision/reference | Correct. Axis docs function as lookup targets for policy seekers. Content is definition-first, not narrative-led. |
| **Density** | Compact-to-moderate | Compact with gaps | **Issue:** Policy statements are terse; causal explanations are sparse. AXIS_02 lacks "why policy helps" depth. AXIS_07 overloads six concepts, forcing readers to parse dense sections. Solution: Add brief causal prose and split AXIS_07. |
| **Linearity** | Hybrid (sequential overview + random-access policy) | Random-access dominant | **Issue:** No "how to read this packet" guidance. Reader doesn't know whether to start with a specific axis or read sequentially. Solution: Add onramp section to PACKET_INDEX clarifying reading paths. |
| **Audience** | Expert (oRPC/Inngest/TypeBox) | Expert | Correct. Vocabulary assumes framework familiarity. |
| **Scope** | Multi-artifact (9 axes + E2E + decisions) | Multi-artifact with weak boundaries | **Issue:** Each axis doc is self-contained but doesn't declare how it fits the system. E2E examples reference axes without explicit "which axes are covered here" statements. Solution: Add "Key Axes Covered" section to each E2E. |
| **Temporality** | Living (policy + open decisions, separately marked) | Mixed (locked + open + explanatory) | **Issue:** "Original Tensions" section in Posture Spec reads like background (explanatory) but sits between policy statements. Open decisions are scattered across DECISIONS.md and inline axis policy. Solution: Separate locked vs open more explicitly; move explanatory content to bridge docs. |

### Cross-Axis Policy Coherence

| Concern | State |
|---------|-------|
| Caller/auth matrix consistency | 7 renderings with material differences (3 axes omit server/CLI caller) |
| Context envelope scoping | Explicit in AXIS_04; AXIS_06 assumes readers know context split |
| Middleware placement consistency | Clear in AXIS_06; AXIS_07 doesn't reference the placement matrix |
| Schema ownership (procedure I/O) | Clear in AXIS_02, D-011; weaker scent in AXIS_08 |
| Split posture enforcement | Well-covered in AXIS_03; AXIS_07 could reinforce mount enforcement |

### Verdict

**The packet's internal structure is logically sound; the content presentation gaps are moderate and fixable without restructuring the axis decomposition.**

---

## PART 2: AXIS_07 Split/Reorganization Plan

AXIS_07 is overloaded with 6-7 concerns spanning 300+ lines. Current structure conflates policy, inventory, fixtures, and naming guidance.

### Current Concerns in AXIS_07

1. **Host mount boundaries** (In/Out, Policy)
2. **Runtime/host glue inventory** (4 canonical files)
3. **Required root fixtures** (TypeBox adapter + rawr.hq.ts stub)
4. **Canonical file tree** (directory structure policy)
5. **Naming rules** (11 canonical items)
6. **Optional composition helpers** (4 helpers with code)
7. **Host bootstrap ordering** (D-008 integration scope)

### Proposed Split Strategy

**Option A (Recommended): Subsection Grouping Within AXIS_07**

Keep AXIS_07 as one document but add prominent H3 sub-groups:

```
## AXIS_07: Host Hooking and Composition
  (In/Out, Policy statements)

### Mount Boundaries and Composition Spine
  (section covers policies 1-7, 9-11)

### Runtime/Host Inventory (Reference)
  (section covers canonical files, no policy change)

### Canonical File Tree (Reference)
  (section covers directory structure guidance)

### Naming Rules and Conventions (Reference)
  (section covers 11 naming items, no policy change)

### Optional Composition Helpers (Reference)
  (section covers 4 helpers, examples only)
```

**Rationale for Option A:**
- Preserves axis decomposition (no new file)
- Keeps policy enforcement unified (host composition is one domain)
- Adds visual chunking without splitting navigation
- Readers can jump to "Naming Rules" subsection without reading fixtures
- Naming conventions stay co-located with their application context (host files)

**Option B (If aggressive restructuring is preferred): Split into two files**

- `AXIS_07_HOST_COMPOSITION_POLICY.md` (policy only, 80 lines)
- `REFERENCE_HOST_INVENTORY_AND_NAMING.md` (fixtures + naming, 150 lines, not an axis)

**Rationale against Option B:**
- Creates a non-axis reference file, violating the nine-axis design
- Host inventory and naming are not optional details; they're part of composition policy
- Naming conventions only make sense in the context of what they name (host files)

**Recommendation: Proceed with Option A.** It improves scannability without restructuring the axis model.

### Implementation for AXIS_07

1. Add H3 subheadings before "Runtime/Host Inventory" section
2. Reorder sections: Policy first (In/Out + Policies 1-11), then Reference (Inventory, Tree, Naming, Helpers)
3. Add a 1-line intro to each Reference subsection explaining its role ("This section documents the canonical files required for composition" vs "This section lists the role-based naming defaults")
4. Keep all content; no deletion, no merger

---

## PART 3: Per-Axis Improvement Table

This table details structural improvements to each axis document. **All content is preserved; only structure and scent are improved.**

### AXIS_01: External Client Generation

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Add "Why this matters" prose | Density | After "Canonical Policy," add 2-3 sentence paragraph explaining why OpenAPI publication determinism prevents drift (currently only one sentence in "Why"). | Improve clarity for standalone reading |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/...` to repo-relative paths (e.g., `packages/core/src/orpc/hq-router.ts:5`). | F-08 from Reshape Proposal |
| Add "Related Normative Rules" intro | Scent | Rename section header from "Related Normative Rules" to "Related Normative Rules — How This Connects to Contract Ownership and Transport Publication" (brief descriptive scent). | Improve navigation scent |
| Verify cross-references | Coherence | Confirm all references to AXIS_02, AXIS_08 are correct. Check that examples link to E2E_01 (API-only) and E2E_03 (first-party). | Validate system coherence |

**Total changes: 4. Lines affected: ~10 added (prose), ~5 changed (paths). No content moved or deleted.**

### AXIS_02: Internal Clients and Internal Calling

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Add "Policy coherence" note after Caller/Auth Matrix | Density | Add 2-3 sentences explaining that "server-internal in-process caller" is the default AND that packages may reuse their own internal clients across boundaries with trusted service context. Currently reads as two separate patterns without explicit "both exist together" framing. | Improve clarity for first-time readers |
| Strengthen "Domain module scope" | Scent | AXIS_02 section "Internal Package Default" lists "domain/*: TypeBox-first entities/value objects/invariants with co-located static type exports." Add one sentence: "Transport-independent domain concepts only; do NOT place procedure I/O schemas or boundary request metadata in domain/*." | Reinforce D-011 ownership boundaries |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` to repo-relative (e.g., `packages/core/src/orpc/hq-router.ts:5`). | F-08 from Reshape Proposal |
| Verify cross-references to E2E | Coherence | Confirm E2E_02 and E2E_03 are appropriate examples for "internal client usage." Check that snippets use `schema({...})` convention consistently. | Validate examples match policy |

**Total changes: 4. Lines affected: ~15 added (prose + clarification), ~5 changed (paths). No content moved or deleted.**

### AXIS_03: Split vs Collapse

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Add "Why split matters" context | Density | After "Why," add 2-3 sentences explaining that external API contracts and durable execution contracts have non-equivalent semantics (request/response vs event/step), so conflating them risks breaking caller assumptions. | Improve understanding of split rationale |
| Strengthen "Practical Red Flags" | Clarity | Red flags are listed but not numbered. Add numbers (1-7) and add one reinforcing sentence after the list: "Any proposal matching these patterns requires redesign before adoption; they indicate semantic collapse is happening." | Improve enforceability |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/...` to repo-relative. | F-08 from Reshape Proposal |
| Verify cross-references | Coherence | Confirm AXIS_08, AXIS_09 are correctly referenced in "Out of Scope." Check that E2E_02 and E2E_03 show the split being enforced at host. | Validate system coherence |

**Total changes: 4. Lines affected: ~15 added (context + numbers). No content moved or deleted.**

### AXIS_04: Context Creation and Propagation

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Add context-envelope visual | Density/Scent | After "Two-Envelope Contract" table, add a visual diagram (mermaid or ASCII) showing "Request lifecycle" arrow and "Run/attempt lifecycle" arrow as distinct flows converging on correlation metadata. This is implicit in the table but makes the split visual. | Improve mental model formation |
| Clarify "request/correlation/principal/network metadata types" scope | Density | Policy §6 says "SHOULD live in context.ts." Add one clarifying sentence: "These are layer contracts—they model the request/execution envelope, not domain state. They belong in context modules, not in domain/* modules." | Strengthen D-011 boundaries |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` to repo-relative. | F-08 from Reshape Proposal |
| Verify E2E references | Coherence | Confirm E2E_04 reference is accurate and shows context envelope separation. Check that code snippets match current context contract shape. | Validate examples |

**Total changes: 4. Lines affected: ~20 added (visual + clarification). No content moved or deleted.**

### AXIS_05: Errors, Logging, and Observability

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Improve D-008 prose | Clarity | "D-008 Integration Scope" section is currently a bullet list. Convert to prose: "D-008 closes on the following: baseline trace initialization order is now explicit at host bootstrap and applies to both `/api/workflows/*` and `/api/inngest` execution paths. Typed boundary error semantics and runtime timeline/status recording remain unchanged; route ownership/publication boundaries from D-005/D-006/D-007 are unchanged." | Improve readability |
| Add "Two shapes coexist" note | Density | After "Trade-Offs," add 2-3 sentences explaining that one error shape cannot represent request/response semantics AND run/timeline state semantics, so two shapes are intentional and correct. | Reduce reader confusion |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` to repo-relative. | F-08 from Reshape Proposal |
| Verify E2E_04 reference | Coherence | Check that E2E_04 examples show timeline recording and trace continuation. | Validate examples |

**Total changes: 4. Lines affected: ~15 added (prose improvements). No content moved or deleted.**

### AXIS_06: Middleware and Cross-Cutting Concerns

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Add "Placement Matrix" visual intro | Scent | Before the Placement Matrix table, add 1-2 sentences: "Middleware is not one literal stack. Boundary middleware and durable runtime controls live in separate harnesses because request/response policy and retry/idempotency policy serve different audiences. The placement matrix shows where each concern belongs." | Clarify why two harnesses exist |
| Subsection the dedupe contract | Structure | The "Middleware Dedupe Contract" (items 1-4) is dense. Add an H3 header and brief intro: "Manual dedupe is canonical; built-in dedupe is constrained. Why this split?" | Improve scannability |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` to repo-relative. | F-08 from Reshape Proposal |
| Cross-check dedupe guidance against D-009 | Coherence | Verify that "SHOULD" language in AXIS_06 matches DECISIONS.md D-009 status (open, non-blocking). Confirm consistency. | Validate consistency with decision register |

**Total changes: 4. Lines affected: ~15 added (intro + subsection header). No content moved or deleted.**

### AXIS_07: Host Hooking and Composition

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| **Reorganize with H3 subsections** | Structure | See PART 2 (AXIS_07 Split Plan). Add H3 headers: "Mount Boundaries and Composition Spine," "Runtime/Host Inventory (Reference)," "Canonical File Tree (Reference)," "Naming Rules and Conventions (Reference)," "Optional Composition Helpers (Reference)." Reorder so policy comes first, references follow. | Improve scannability without restructuring axis model |
| Strengthen "Why" context | Density | Add 2-3 sentences after "Why": "Mount boundaries are the clearest expression of harness ownership. Explicit wiring prevents hidden coupling between boundary policy and host implementation." | Improve understanding of mount-first design |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/...` to repo-relative. | F-08 from Reshape Proposal |
| Verify naming rules aren't duplicated elsewhere | Coherence | Confirm naming rules in AXIS_07 don't duplicate AXIS_02 naming defaults. Check for conflicts (should be none; each section owns different naming scope). | Validate non-redundancy |
| Cross-reference AXIS_04, AXIS_06 | Coherence | Add explicit cross-references in footnotes: "See AXIS_04 for context envelope scoping" and "See AXIS_06 for middleware placement by mount." | Improve navigation |

**Total changes: 5. Lines affected: ~30 added/reordered (subsection structure + context). No content moved or deleted.**

### AXIS_08: Workflows vs APIs Boundaries

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Move "Path strategy" debate to DECISIONS.md | Curation | The "Path strategy: capability-first vs surface-first" section (near end of doc) reads like a resolved debate. This is a closed decision and belongs in DECISIONS.md, not in AXIS_08 policy. Move to DECISIONS.md as a brief closed-decision entry; replace AXIS_08 section with a reference: "Path strategy is capability-first ([see D-012 decision entry](../DECISIONS.md#d-012-path-strategy-capability-first))." This is F-11 from Reshape Proposal. | Separate policy from debate archive |
| Add "Consumer model coherence" note | Density | After "Consumer model" list, add 2-3 sentences explaining that this model prevents "two ways to trigger" drift and keeps caller expectations clear. | Improve understanding |
| Verify inline-I/O schema examples | Coherence | Confirm all procedure/contract examples use inline `.input(...)` and `.output(...)` per D-012. Check "extracted exception form" code block matches D-012 guidance. | Validate D-012 compliance |
| Fix absolute path references | Correctness | Convert `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/...` to repo-relative. | F-08 from Reshape Proposal |
| Cross-verify with AXIS_07 mount enforcement | Coherence | Confirm host split-path enforcement snippet in AXIS_08 aligns with AXIS_07 policy. Both should describe `/api/workflows/*` and `/api/inngest` as separate mounts. | Validate system coherence |
| Verify E2E examples | Coherence | Check that E2E_02, E2E_03, E2E_04 show the consumer model in action (first-party on `/rpc`, external on `/api/workflows/...`). | Validate examples |

**Total changes: 6. Lines affected: ~10 removed (path strategy debate), ~15 added (coherence notes), ~3 changed (references). No policy content deleted; debate moved to DECISIONS.md.**

### AXIS_09: Durable Endpoints vs Durable Functions

| Change | Type | Detail | Mandate |
|--------|------|--------|---------|
| Expand "Allowed vs Disallowed" section | Density | Current section is terse (3 bullets, 4 lines). Add explanation: "Durable endpoints may adapt ingress semantics for non-overlapping use cases (e.g., webhook ingress from external service). But they must never create a parallel first-party trigger path for the same workflow behavior. This prevents caller confusion and maintains one contract story." | Improve policy clarity |
| Add reference to AXIS_03 anti-dual-path | Coherence | After "Allowed vs Disallowed," add cross-reference: "See AXIS_03 for the full anti-dual-path policy and red flags." | Improve navigation |
| Verify scope boundaries against D-009/D-010 | Coherence | Confirm that D-009 (dedupe) and D-010 (finished hook) are not AXIS_09 concerns. They belong in AXIS_06. This axis owns durable execution model choice only, not implementation details. | Validate scope boundaries |

**Total changes: 3. Lines affected: ~20 added (expanded explanation + references). No content moved or deleted.**

---

## PART 4: Caller/Auth Matrix Strategy

The caller/auth matrix appears 7 times with material differences. The canonical form should be established once; other renderings should reference it.

### Matrix Appearances and Completeness

| Document | Format | Rows | Columns | Completeness |
|----------|--------|------|---------|--------------|
| Posture Spec §2.1 | Prose table | 4 | 7 | Most complete (includes server/CLI) |
| AXIS_01 | Markdown table | 3 | 6 | Missing server/CLI caller |
| AXIS_02 | Markdown table | 4 | 6 | **Canonical form (includes all caller classes)** |
| AXIS_03 | Markdown table | 3 | 6 | Missing server/CLI caller |
| AXIS_07 | Two tables: Route Family Purpose + Host Route/Auth | 4 + 3 | 7 + 5 | Complete; route-centric perspective complements caller-centric |
| AXIS_08 | Markdown table | 3 | 6 | Missing server/CLI caller |
| E2E_03 | Embedded table | 4 | 6 | Complete (includes all caller classes) |

### Recommendation

**Declare AXIS_02's Caller/Auth Matrix as canonical.** It is the most complete four-row, six-column form:

| Caller mode | Allowed routes | Default link/client | Publication boundary | Auth mode | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party MFE/internal caller | `/rpc` | `RPCLink` | internal only (never published) | first-party session/auth or trusted service context | `/api/inngest` |
| Server-internal in-process caller | in-process only | package internal client (`createRouterClient`) | internal only | trusted service context | local HTTP self-calls as default |
| External/third-party caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | externally published OpenAPI clients | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | `/api/inngest` | Inngest callback transport | runtime only | signed runtime ingress | browser/API caller traffic |

### Matrix Improvement Actions

| Document | Action | Change | Rationale |
|----------|--------|--------|-----------|
| **AXIS_01** | Add note + reference | Add sentence after table: "See AXIS_02 for the canonical caller/auth matrix. This matrix shows external client generation implications of the canonical policy." Add link to AXIS_02. | AXIS_01 is about external generation, so it references the canonical policy but adds its own generation-focused context. |
| **AXIS_03** | Add note + reference | Same as AXIS_01: "For the canonical caller/auth matrix, see AXIS_02. This section focuses on enforcement policies that prevent dual-path emergence." | AXIS_03 is about anti-dual-path, which is enforcement; it references canonical policy but keeps its own focus. |
| **AXIS_07** | Keep both tables | Route Family Purpose Table and Host Route/Auth Enforcement Matrix are complementary (caller-centric vs route-centric). Keep both. Add intro: "The following tables show mount enforcement from a route perspective (complementing AXIS_02's caller perspective)." | Route-family perspective is specific to host composition and cannot be merged with caller perspective without losing clarity. |
| **AXIS_08** | Add note + reference | Add sentence after table: "For the canonical caller/auth matrix, see AXIS_02. This view shows consumer-facing implications." | AXIS_08 focuses on consumer model; it references canonical policy but adds consumer-specific context. |
| **E2E_03, E2E_04** | Verify consistency | Check that embedded tables match or reference the AXIS_02 canonical form. If they show a simplified view, add note: "Simplified view; see AXIS_02 for complete matrix." | E2E examples should be consistent with canonical policy. |

### Implementation

1. Do not merge or delete any existing tables
2. Add reference notes to AXIS_01, AXIS_03, AXIS_08 pointing to AXIS_02 as canonical
3. Strengthen AXIS_07 intro explaining route-family perspective as complementary
4. Verify E2E examples are consistent
5. Create a glossary entry or sidebar note: "Where to find the caller/auth matrix: AXIS_02 (canonical, caller-perspective), AXIS_07 (route-perspective), other axes (context-specific renderings with references)."

---

## PART 5: E2E Example Improvement Plan

The E2E examples are well-structured but have progression gaps and some repetition. All content is preserved; structure and progression are improved.

### Progression Analysis

| Example | Focus | Size | Progression from prior |
|---------|-------|------|------------------------|
| E2E_01 | Basic package + API boundary (API-only) | ~250 lines | **Entry point.** Shows one capability, one API plugin, no workflows. |
| E2E_02 | API + workflows composed (split posture) | ~350 lines | **Large jump.** Adds: workflow plugin, Inngest function, trigger operation, coordination. No MFE, no middleware. |
| E2E_03 | Micro-frontend integration (first-party routing) | ~380 lines | **Large jump.** Adds: MFE with `/rpc` transport, browser-safe helpers, view projections, two caller types. No context metadata, no middleware. |
| E2E_04 | Real-world context and middleware | ~450 lines | **Large jump.** Adds: multi-tenant principal, request metadata, context middleware, base traces, full middleware stacks. This is "everything." |

### Identified Gaps

**Gap 1: E2E_01 → E2E_02**
- E2E_01 shows API boundary only (no Inngest, no workflows)
- E2E_02 suddenly introduces workflows, Inngest functions, durable execution
- Missing: "How do I add a workflow to an existing API capability?"

**Gap 2: E2E_03 → E2E_04**
- E2E_03 adds MFE and first-party routing
- E2E_04 adds context, metadata, and middleware across **all surfaces** simultaneously
- Missing: "How does context flow in a multi-surface capability?" (API + workflow without full middleware)

### Repetition Analysis

| Aspect | E2E_01 | E2E_02 | E2E_03 | E2E_04 |
|--------|--------|--------|--------|--------|
| File tree | Full | Full (diffs noted) | Full | Full (diffs noted) |
| Topology diagram | Mermaid flowchart | Mermaid flowchart | Mermaid flowchart | Mermaid flowchart |
| Quick coordinates table | Yes | Implied | Implied | Yes |
| Context module export | No | No | No | Yes |
| Domain layer example | Yes | Yes | Yes | Yes |

**Identified redundancy:** File trees in E2E_02, E2E_03, E2E_04 repeat 80% of E2E_01's tree. Solution: Show tree diffs (new files added from prior example) instead of full trees for E2E_02+.

### Improvement Plan

#### Option A (Recommended): Keep 4 examples, add bridge notes + diffs

**E2E_01 → E2E_02 bridge:** After E2E_01, add a note:
> "**Next step:** To add durable workflow capability to this API, see E2E_02. It shows how the same `packages/invoicing` capability can be extended with a workflow plugin and Inngest integration without duplicating domain logic."

**E2E_02 topology improvement:** Add note near end:
> "Key insight: The same `packages/invoicing/src/client.ts` serves both API operations and workflow durable functions. This prevents semantic duplication."

**E2E_02 → E2E_03 bridge:** After E2E_02, add a note:
> "**Next step:** To add first-party micro-frontend support, see E2E_03. It shows how browser callers use `/rpc` (internal transport) by default, while external callers use `/api/workflows/<capability>/*` (published boundary)."

**E2E_03 → E2E_04 bridge:** After E2E_03, add a note:
> "**Next step:** To add multi-tenant context, request metadata, and middleware across all surfaces, see E2E_04. It shows context flow through API operations, workflow triggers, and durable functions simultaneously."

**File tree in E2E_02, E2E_03, E2E_04:** Replace full trees with:
```
### New files in E2E_02 (compared to E2E_01)
  plugins/workflows/invoicing/src/
    contract.ts
    operations/trigger-reconciliation.ts
    router.ts
    functions/reconciliation.ts
  packages/coordination-inngest/src/
    adapter.ts

[Rest of file tree from E2E_01 remains unchanged; see E2E_01 for full tree]
```

**Rationale for Option A:**
- Preserves all content (nothing deleted)
- Adds ~20 lines of bridge notes
- Reduces file-tree repetition without loss of clarity
- Maintains non-linear reading (each E2E is still self-contained)

#### Option B (If more aggressive compression is desired): Consolidate to 3 examples

- **E2E_01:** Basic package + API boundary (unchanged)
- **E2E_02:** API + workflows + MFE (merge current E2E_02 and E2E_03, ~500 lines)
- **E2E_03:** Real-world with context/middleware (current E2E_04, ~450 lines)

**Rationale against Option B:**
- Loses the important pedagogical step of "API first, workflows second"
- Loses the clear boundary between "multi-surface capability" and "production-scale middleware"
- Violates the "keep E2E examples intact" mandate

**Recommendation: Proceed with Option A.** It improves progression without deletions.

### Implementation Checklist for E2E Improvements

- [ ] Add bridge notes between E2E_01 ↔ E2E_02 ↔ E2E_03 ↔ E2E_04
- [ ] Convert full file trees to diff-view (new files only) in E2E_02, E2E_03, E2E_04
- [ ] Add "Key Axes Covered" section to each E2E (see below)
- [ ] Verify internal client usage patterns are consistent across examples
- [ ] Verify `schema({...})` convention is used consistently
- [ ] Verify caller/auth matrix renderings match AXIS_02 canonical form
- [ ] Verify E2E cross-references in axis docs are accurate

### "Key Axes Covered" Section for Each E2E

Add a new subsection after the Goal section in each E2E:

**E2E_01:**
> **Key Axes Covered**
> - AXIS_01: Contract-first API boundary generation
> - AXIS_02: Internal package structure and client usage
> - AXIS_07: Host mount and composition for API-only capability

**E2E_02:**
> **Key Axes Covered**
> - AXIS_02: Package internal client usage across plugin boundaries
> - AXIS_03: Split posture (API boundary ≠ durable execution)
> - AXIS_05: Status/timeline recording for durable runs
> - AXIS_07: Host composition with Inngest bundle
> - AXIS_08: Workflow trigger router and durable function split

**E2E_03:**
> **Key Axes Covered**
> - AXIS_01: External client publication (OpenAPI)
> - AXIS_02: Browser-safe helper exports from packages
> - AXIS_03: Caller-mode boundaries (first-party `/rpc` vs external published)
> - AXIS_04: Context envelope split between request and runtime
> - AXIS_07: Multi-caller host composition
> - AXIS_08: Consumer model (MFE vs external)

**E2E_04:**
> **Key Axes Covered**
> - AXIS_04: Full context envelope scope (principal, request metadata, network policy)
> - AXIS_05: Error handling + timeline recording + trace correlation
> - AXIS_06: Middleware placement (boundary vs durable runtime) + dedupe patterns
> - AXIS_07: Baseline traces middleware initialization order
> - All prior examples' axes

---

## PART 6: DECISIONS.md Improvements

DECISIONS.md is well-structured (status, resolution, impacted docs, source anchors). Recommended improvements are mechanical and light.

### Current Structure

- Decision ID (D-NNN)
- `status` (closed, locked, open)
- `resolution` or `question` (depending on status)
- `closure_scope` or `why_open`
- `impacted_docs`
- `source_anchors`

### Identified Issues

1. **Field naming inconsistency (F-09 from Reshape Proposal):**
   - Some entries use `why_closed`, others use `closure_scope`
   - Some entries use `non_blocking_guidance`, others omit it
   - Solution: Standardize on `why_closed` (rationale for closure) + `closure_scope` (scope limitation if any)

2. **D-008 section title:** "D-008 Integration Scope" reads like changelog, not decision. Should be "D-008 — Extended Traces Middleware Initialization Order Standard" (more specific).

3. **Legacy decision collision note missing (F-06 from Reshape Proposal):**
   - Current DECISIONS.md D-004/D-005 are different from `LEGACY_DECISIONS_APPENDIX.md` D-004/D-005
   - Solution: Add a migration note at top of DECISIONS.md

4. **D-012 field naming:** The extracted schema form is defined in D-012, but the field name is not consistent with other decisions (uses `locked_decision` instead of `resolution`).

5. **Loop Closure Bridge timestamp missing (F-07 from Reshape Proposal):** Not a DECISIONS.md issue, but related. Skip here; handle in session-lineage phase.

### Improvement Actions

| Issue | Change | Lines affected |
|-------|--------|----------------|
| Standardize field naming | Convert all `why_closed` → `why_closed` (consistent). Convert `closure_scope` → `closure_scope` (consistent). Standardize open-decision entries to include `why_open` + `non_blocking_guidance`. | ~15 |
| Improve D-008 scent | Rename "D-008 Integration Scope" section header to "D-008 — Extended Traces Middleware Initialization Order Standard". Add 1-sentence intro explaining what the section is. | ~3 |
| Add migration note at top | Add new section before "Current Status": "**Migration Note (Legacy Decision Numbering):** This register supersedes the legacy decision numbering in `additive-extractions/LEGACY_DECISIONS_APPENDIX.md`. Legacy D-004 and D-005 have no direct equivalents in this register; they were resolved through the metadata simplification work." | ~4 |
| Standardize D-012 field name | Change `locked_decision` → `resolution` in D-012 to match D-005, D-006, D-007, D-011 format. | ~1 |

### Implementation

1. Update DECISIONS.md field naming to be consistent across all entries
2. Rename D-008 section header and add intro sentence
3. Add migration note at top of file
4. Verify all decision entries follow the same format (closed: why_closed + closure_scope; open: why_open + non_blocking_guidance)

**Total changes: ~23 lines. All mechanical, no content deletion, no policy change.**

---

## PART 7: Cross-Reference Cleanup Plan

### Broken or Brittle References

| Reference | Type | Location | Issue | Fix |
|-----------|------|----------|-------|-----|
| Absolute paths `/Users/mateicanavra/...` | F-08 | AXIS_01, 02, 03, 07 (8 instances) | Machine-specific, breaks on any other machine | Convert to repo-relative paths (e.g., `packages/core/src/orpc/hq-router.ts:5`) |
| Session IDs in cross-references | Future proofing | Within axis docs | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` references are outdated if file is renamed | Use relative path references (`.././SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`) instead of full path |
| Loop Closure Bridge timestamp | F-07 | Bridge doc in session-lineage | Document says D-005/006/008 are open but DECISIONS.md shows them closed. No timestamp to explain the divergence. | Add as-of header to Bridge: "Decision statuses reflect the state at time of writing (pre-D008 integration pass). See DECISIONS.md for current status." (Handle in session-lineage phase) |

### Cross-Reference Validation Checklist

After improvements, verify:

- [ ] All AXIS_NN.md files reference correct related axes by filename
- [ ] E2E examples reference correct axis numbers
- [ ] DECISIONS.md decision entries list correct impacted docs
- [ ] REDISTRIBUTION_TRACEABILITY.md entries are still accurate after axis improvements
- [ ] All internal links use relative paths (no absolute paths)
- [ ] Footnote references are consistent (some use `[Link text](./file.md)`, others use `See file.md`)

### Absolute Path Fix List

| File | Count | Example old | Example new |
|------|-------|------------|-------------|
| AXIS_01 | 2 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5` | `packages/core/src/orpc/hq-router.ts:5` |
| AXIS_02 | 2 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5` | `packages/core/src/orpc/hq-router.ts:5` |
| AXIS_03 | 2 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md:11` | `DECISIONS.md#D-008` (anchor link instead of line number) |
| AXIS_04 | 2 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:41` | `apps/server/src/orpc.ts:41` |
| AXIS_05 | 5 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:80` | `apps/server/src/orpc.ts:80` |
| AXIS_06 | 3 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339` | `apps/server/src/orpc.ts:339` |
| AXIS_07 | 4 | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts` | `apps/server/src/orpc.ts` |

**Total absolute paths to fix: 22 instances across 7 axis docs.**

---

## PART 8: Mandate Checks Against Proposed Changes

This section runs the five information-design mandate checks on the proposed reshape plan to ensure quality before execution.

### 1. Logic Test: Raw Content (Stripped Formatting)

**Question:** Remove all headers, bold, bullets, tables. Does the argument still hold?

**Raw content summary:**
- AXIS_07 overload reduces scannability; subsection grouping improves chunking without restructuring
- Caller/auth matrix appears 7 times; canonical form eliminates ambiguity
- E2E examples have progression gaps; bridge notes improve learning flow
- DECISIONS.md has field inconsistencies; standardization improves usability
- Absolute paths are machine-specific; repo-relative paths improve portability
- All content is preserved; only structure and references change

**Verdict: PASS.** The logical argument holds. The reshape is a structural improvement, not a content change.

### 2. Skim Test: Headers and First Sentences

**Question:** Read only headers and first sentence of each section. In 30 seconds, can you understand what's being reshaped?

**Skim result:**
- PART 1: Six-axis assessment shows density and density gaps → recommendation to add prose and split AXIS_07
- PART 2: AXIS_07 is overloaded with 6-7 concerns → subsection grouping recommended (Option A preferred)
- PART 3: Each axis gets 3-5 specific improvements (adds prose, fixes paths, improves scent)
- PART 4: Caller/auth matrix appears 7 times → AXIS_02 declared canonical; others reference it
- PART 5: E2E examples have progression gaps → bridge notes added; file trees converted to diffs
- PART 6: DECISIONS.md has field inconsistencies → standardization applied; migration note added
- PART 7: Cross-references include absolute paths → converted to repo-relative
- PART 8: Mandate checks validate the plan

**Verdict: PASS.** Headers predict content. A reader can quickly scan the plan and understand the scope.

### 3. Swap Test: Is This a Template or Design?

**Question:** Could this plan apply unchanged to a different spec packet?

**Answer:** No. The plan is specific to this packet:
- AXIS_07 overload is unique to this architecture (host composition concerns)
- The 7 caller/auth matrix renderings are specific to this packet's axis decomposition
- The E2E progression gaps (API-only → API+workflows → MFE → real-world) are specific to this learning path
- The 22 absolute paths reference this specific repository structure
- The decision field inconsistencies are specific to this DECISIONS.md

If a different packet had these same problems, the *approach* would transfer (identify overload, declare canonical form, add progression bridges), but the *specifics* would not.

**Verdict: PASS.** This is a design, not a template.

### 4. Noise Test: Does Every Element Earn Its Place?

**Question:** For every recommendation, what is lost if removed?

| Recommendation | What is lost if removed |
|---|---|
| AXIS_07 subsection grouping | Readers looking for "naming rules" must scan past 50+ lines of fixture code |
| Caller/auth canonical form | Implementers cross-reference 7 documents to understand policy; inconsistencies persist |
| E2E bridge notes | Readers don't know when to move from E2E_01 to E2E_02; progression feels arbitrary |
| E2E diff-view file trees | Repetition suggests the examples are more different than they are; reduces information scent |
| DECISIONS.md field standardization | Format inconsistency suggests decisions are ad hoc; interoperability between decision entries is harder |
| Absolute path fixes | Plan is not portable to other environments; breaks deployment in new machines |
| "Key Axes Covered" sections | Readers don't know which axes to read for a specific example; navigation is weak |

**Verdict: PASS.** Every recommendation removes observable friction. None are decorative.

### 5. Scent Test: Do Headers Predict Content?

**Section headers and predictions:**

| Header | Prediction | Reality match |
|---|---|---|
| "AXIS_07 Split/Reorganization Plan" | Detailed plan for splitting or restructuring AXIS_07 | ✓ Proposes Option A (subsections) and Option B (two files), recommends A |
| "Caller/Auth Matrix Strategy" | Explanation of which matrix is canonical and how others relate | ✓ Identifies 7 renderings, declares AXIS_02 canonical, provides reference actions |
| "E2E Example Improvement Plan" | Identifies gaps and progression issues in the four examples | ✓ Analyzes progression from E2E_01→04, identifies two gaps, proposes bridge notes + diff-view |
| "Mandate Checks Against Proposed Changes" | Validation that the reshape plan is sound and well-designed | ✓ Runs the five information-design checks; all pass |

**Verdict: PASS.** Headers predict their sections accurately.

### Overall Mandate Verdict

**All five checks PASS.** The reshape plan is logically sound, well-scoped, specific, non-redundant, and clearly scented.

---

## PART 9: Flags and Decisions for the User

This section identifies decisions that require user input before execution.

### F-01: AXIS_07 Restructuring Approach

**Question:** Should AXIS_07 be reorganized with H3 subsections (Option A) or split into two files (Option B)?

**Recommendation:** Option A (subsections)
- Preserves the nine-axis model (no new file)
- Keeps policy unified (host composition is one domain)
- Adds scannability without breaking navigation
- Simpler to execute

**User input needed:** Approve Option A, or prefer Option B?

---

### F-02: E2E Example Progression

**Question:** Should E2E examples keep full file trees repeated (current state), or use diff-view for E2E_02+ (proposed)?

**Recommendation:** Use diff-view for E2E_02, E2E_03, E2E_04
- Reduces repetition (full tree in E2E_01 only)
- Clarifies what changes between examples
- Improves progression narrative
- All content is preserved (reference to E2E_01 tree)

**User input needed:** Approve diff-view approach?

---

### F-03: Caller/Auth Matrix Canonical Location

**Question:** Should AXIS_02 be the canonical caller/auth matrix, with other docs referencing it?

**Recommendation:** Yes, AXIS_02
- AXIS_02 is the most complete (4 rows × 6 columns)
- Includes "server-internal in-process caller" (missing from AXIS_01, 03, 08)
- Stays true to AXIS_02's scope (internal clients)
- Other docs can contextualize it (route-centric, external-generation, etc.)

**User input needed:** Confirm AXIS_02 as canonical?

---

### F-04: DECISIONS.md Field Standardization

**Question:** Standardize field naming to `why_closed` (rationale) + `closure_scope` (scope limits) for closed decisions, and `why_open` + `non_blocking_guidance` for open decisions?

**Recommendation:** Yes
- Improves consistency
- Clarifies the difference between "why closed" and "scope limits"
- Makes open decisions easier to scan
- Mechanical change (no policy content affected)

**User input needed:** Approve field standardization?

---

### F-05: Migration Note for Legacy Decisions

**Question:** Add a note at the top of DECISIONS.md explaining that legacy D-004/D-005 (from `LEGACY_DECISIONS_APPENDIX.md`) have no direct equivalent in the current register?

**Recommendation:** Yes
- Prevents confusion from stale references
- Acknowledges the legacy history
- Explains what happened to legacy decisions

**User input needed:** Approve migration note?

---

### F-06: Absolute Path Conversion

**Question:** Convert all absolute paths (`/Users/mateicanavra/...`) to repo-relative paths (e.g., `apps/server/src/orpc.ts:41`)?

**Recommendation:** Yes
- Improves portability
- Reduces machine-specific references
- Aligns with best practices for documentation

**User input needed:** Approve absolute path fixes?

---

### F-07: AXIS_07 Subsection Ordering

**Question:** When reorganizing AXIS_07 with subsections (Option A), should policy come first (In/Out, Policies 1-11) or should inventory come first?

**Recommendation:** Policy first
- Follows the axis template pattern (In/Out → Policy → Why/Tradeoffs → Snippets)
- Readers looking for policy don't have to scroll past reference material
- Maintains consistency with other axis docs

**User input needed:** Confirm policy-first ordering?

---

### F-08: Bridge Notes in E2E Examples

**Question:** Add transition notes between E2E_01 ↔ E2E_02 ↔ E2E_03 ↔ E2E_04 explaining the progression and how to sequence learning?

**Recommendation:** Yes
- Improves pedagogical flow
- Helps readers know when to move to the next example
- Typically 2-3 sentences per transition

**User input needed:** Approve bridge notes?

---

### F-09: "Key Axes Covered" Sections in E2E Examples

**Question:** Add a new subsection to each E2E listing which axes are covered and how they apply?

**Recommendation:** Yes
- Improves navigation (readers can find examples for specific axes)
- Clarifies which policies are demonstrated in each E2E
- Helps implementers find relevant examples

**User input needed:** Approve "Key Axes Covered" sections?

---

### F-10: AXIS_08 Path Strategy Debate

**Question:** Move the "Path strategy: capability-first vs surface-first" debate from AXIS_08 to DECISIONS.md as a closed decision (D-012)?

**Recommendation:** Yes (this is F-11 from Reshape Proposal)
- Debate is a resolved decision, not active policy
- Belongs in decision archive, not in policy doc
- AXIS_08 can reference the decision instead of restating debate

**User input needed:** Approve moving path strategy to DECISIONS.md?

---

## PART 10: Summary and Execution Roadmap

### What This Reshape Does

1. **Improves scannability** of axis docs through subsectioning and field standardization
2. **Reduces cognitive load** by establishing canonical forms (caller/auth matrix, field naming)
3. **Clarifies progression** through E2E examples with bridge notes and progression analysis
4. **Fixes portability** by converting absolute paths to repo-relative
5. **Strengthens cross-document coherence** through reference cleanup and "Key Axes Covered" sections
6. **Preserves all content** — no information is deleted, only restructured

### What This Reshape Does NOT Do

1. Does not split the nine-axis model (preserves original decomposition)
2. Does not merge or delete axis documents
3. Does not delete or move E2E examples
4. Does not delete DECISIONS.md entries
5. Does not change any policy statements
6. Does not restructure the directory hierarchy

### Execution Sequence

**Phase 1: Axis Document Improvements** (10-15 minutes per axis × 9 = 90-135 minutes)
1. AXIS_01: Add prose, fix paths, improve scent
2. AXIS_02: Strengthen domain module scope, fix paths
3. AXIS_03: Add split rationale, number red flags, fix paths
4. AXIS_04: Add context-envelope visual, clarify metadata scope, fix paths
5. AXIS_05: Improve D-008 prose, add "two shapes coexist" note, fix paths
6. AXIS_06: Add placement matrix intro, subsection dedupe contract, fix paths
7. AXIS_07: Reorganize with H3 subsections (Option A), strengthen "Why," fix paths
8. AXIS_08: Move path strategy debate to DECISIONS.md, add consumer model note, fix paths
9. AXIS_09: Expand allowed/disallowed section, add cross-references

**Phase 2: DECISIONS.md Improvements** (20 minutes)
1. Standardize field naming across all entries
2. Rename D-008 section header
3. Add migration note at top
4. Verify consistency

**Phase 3: E2E Example Improvements** (30-40 minutes)
1. Add bridge notes between examples (E2E_01→02, 02→03, 03→04)
2. Convert file trees to diff-view in E2E_02, E2E_03, E2E_04
3. Add "Key Axes Covered" section to each example
4. Verify caller/auth matrix consistency
5. Verify `schema({...})` convention

**Phase 4: Cross-Reference Cleanup** (30 minutes)
1. Fix 22 absolute path references
2. Verify internal links
3. Validate E2E cross-references
4. Run comprehensive link checker

**Phase 5: Validation** (20 minutes)
1. Re-run all five mandate checks on reshaped documents
2. Verify no content was accidentally deleted
3. Test navigation flow (can readers find what they need?)
4. Spot-check code snippets for accuracy

**Total estimated time: 3.5–4.5 hours**

### Success Criteria

After execution, the packet should:

- [ ] Have one canonical caller/auth matrix (AXIS_02) with all other references pointing to it
- [ ] Have consistent DECISIONS.md field naming across all entries
- [ ] Have AXIS_07 reorganized into logical subsections with improved scannability
- [ ] Have E2E examples with clear progression notes and diff-view file trees
- [ ] Have all absolute filesystem paths converted to repo-relative
- [ ] Have "Key Axes Covered" sections in each E2E example
- [ ] Have improved scent (headers predict content better)
- [ ] Maintain 100% of original content (nothing deleted, only restructured)
- [ ] Pass all five mandate checks (logic, skim, swap, noise, scent)

### Known Limitations and Future Work

These improvements do **not** address:

1. **Directory restructuring** (moving session artifacts to `_session-lineage/`, merging Posture Spec + Packet Index into `ARCHITECTURE.md`) — that's Phase 2 work
2. **Missing implementation guidance** (migration from current codebase, testing strategy, error handling contracts) — that's implementation-planning work
3. **New E2E examples for progression gaps** (E2E_2.5 for "add workflows to existing API," E2E_3.5 for "multi-surface without middleware") — optional enhancement
4. **Automated policy checking** (linting for policy compliance) — that's tooling work

These are orthogonal to the interior reshape and can be addressed separately.

---

## PART 11: File Manifest (What Gets Changed)

### Files to Modify (Order of Execution)

1. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
   - Add "Why" prose (~3 sentences)
   - Fix 2 absolute paths
   - Add "Related Normative Rules" scent improvement
   - Verify cross-references
   - **Lines affected:** +10, ~0 deletions

2. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
   - Add policy coherence note (~3 sentences)
   - Strengthen domain module scope (1 sentence)
   - Fix 2 absolute paths
   - Verify E2E cross-references
   - **Lines affected:** +10, ~0 deletions

3. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
   - Add split rationale prose (~3 sentences)
   - Number red flags (1-7) and add reinforcement sentence
   - Fix 1 absolute path
   - Verify cross-references
   - **Lines affected:** +15, ~0 deletions

4. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
   - Add context-envelope visual (mermaid or ASCII)
   - Clarify metadata scope (1 sentence)
   - Fix 2 absolute paths
   - Verify E2E_04 reference
   - **Lines affected:** +20, ~0 deletions

5. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
   - Convert D-008 bullets to prose (~5 sentences)
   - Add "two shapes coexist" note (~3 sentences)
   - Fix 5 absolute paths
   - Verify E2E_04 reference
   - **Lines affected:** +15, ~0 deletions

6. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
   - Add placement matrix visual intro (~2 sentences)
   - Add H3 header + intro for dedupe contract section
   - Fix 3 absolute paths
   - Cross-check dedupe against D-009
   - **Lines affected:** +15, ~0 deletions

7. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
   - **Major reorganization:** Add H3 subsection headers (Mount Boundaries, Inventory, File Tree, Naming, Helpers)
   - Add "Why" context prose (~3 sentences)
   - Fix 4 absolute paths
   - Add cross-references to AXIS_04, AXIS_06
   - Reorder sections (policy first, then references)
   - **Lines affected:** +30 (subsection structure), ~0 deletions

8. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
   - Move path strategy debate section to DECISIONS.md (create D-012 entry)
   - Replace moved section with reference: "Path strategy is capability-first (see D-012)"
   - Add consumer model coherence note (~3 sentences)
   - Verify inline-I/O examples match D-012
   - Fix absolute paths
   - **Lines affected:** -20 (removed debate), +15 (reference + notes), net ~-5

9. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
   - Expand "Allowed vs Disallowed" section (~20 lines added explanation)
   - Add cross-reference to AXIS_03 anti-dual-path
   - Verify scope boundaries
   - **Lines affected:** +20, ~0 deletions

10. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
    - Add migration note at top (4 lines)
    - Standardize field naming across all entries (~15 line edits, mostly renames)
    - Rename D-008 section header (1 line)
    - Add D-012 entry (path strategy, moved from AXIS_08) (~12 lines)
    - **Lines affected:** +31, ~0 deletions

11. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
    - Add "Key Axes Covered" section after Goal (~5 lines)
    - No other changes
    - **Lines affected:** +5, ~0 deletions

12. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
    - Add bridge note after goal ("**Next step:** To add first-party MFE support...")
    - Add "Key Axes Covered" section (~8 lines)
    - Replace full file tree with diff-view (show only new files compared to E2E_01) (~15 lines vs 50 lines previous)
    - Verify internal client usage consistency
    - **Lines affected:** net -20 (replaced file tree with diff), +25 (bridge + axes), net ~+5

13. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
    - Add bridge note after goal ("**Next step:** To add real-world context/middleware...")
    - Add "Key Axes Covered" section (~8 lines)
    - Replace full file tree with diff-view (~15 lines vs 60 lines previous)
    - **Lines affected:** net -45 (replaced file tree), +30 (bridge + axes), net -15

14. `/sessions/intelligent-sweet-shannon/mnt/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
    - Add "Key Axes Covered" section (~8 lines)
    - Replace full file tree with diff-view (~15 lines vs 70 lines previous)
    - Verify context-envelope examples match AXIS_04
    - **Lines affected:** net -55 (replaced file tree), +15 (axes), net -40

### Summary of Changes

| Category | Count | Lines added | Lines removed | Net change |
|----------|-------|-------------|---------------|----|
| Axis docs (AXIS_01-09) | 9 | ~120 | ~0 | +120 |
| E2E examples | 4 | ~70 | ~130 | -60 |
| DECISIONS.md | 1 | +31 | ~0 | +31 |
| **Total** | **14** | **~221** | **~130** | **+91** |

**Files unchanged:** REDISTRIBUTION_TRACEABILITY.md, ORPC_INGEST_SPEC_PACKET.md (no changes needed — these are integration/navigation docs)

---

## Conclusion

This reshape plan improves the packet's interior quality across all dimensions (scannability, coherence, progression, portability) without restructuring the fundamental axis decomposition or deleting any content. The changes are backward-compatible (readers can still navigate the same way) and forward-compatible (the improved structure makes future updates easier).

**Execution can begin immediately upon user approval of the nine flag decisions in PART 9.**

