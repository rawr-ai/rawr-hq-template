# Authority Consolidation Reshape Plan
**Phase 2 Deliverable: Authority Structure Design for ORPC + Inngest Spec Consolidation**

---

## Executive Summary

This plan consolidates two overlapping authority documents (Posture Spec + Packet Index) into a single canonical ARCHITECTURE.md that eliminates dual-authority ambiguity, deduplicates 14 locked policies, chunks 31 invariants and 25 defaults into meaningful groups, consolidates 7 caller/auth matrix renderings into one canonical form, and reorganizes AXIS_07 for clarity.

The merged document preserves all policy content (nothing is deleted), reorganizes for accessibility, and establishes clear semantics for what changes and why. This plan shows the complete section-by-section structure with source mapping.

---

## Part 1: Six-Axis Position Assessment for Merged Document

| Axis | Position | Rationale | Structural Impact |
|------|----------|-----------|-------------------|
| **Purpose** | Precision/reference | Implementers need to look up specific policies; the matrix is looked up 7+ times; policy specificity is the core value. Random-access lookup dominates over narrative flow. | Lead each policy with the decision, not build-up. Headings as lookup targets. Tables for comparisons. Minimal connective prose. |
| **Density** | Moderate (currently compact, needs light expansion) | Current Posture Spec is terse on causality (bootstrap order declared but not explained). Packet Index adds "why" context. Merged document should preserve terse form for skimmable reference but add 1-2 sentence causal context for locked decisions. | Define/fact first. Add 1-2 sentence "why" only where causal chain matters. Keep examples separate from core policy. |
| **Linearity** | Hybrid (sequential overview + random-access detail) | Readers follow recommended order: Scope → Locked Policies → Caller/Auth Matrix → Global Invariants → Composition Spine. But experienced readers jump to AXIS index. | Lead with orientation section. Use strong headings. Provide "If you need X, go to Y" navigation map. Section order mirrors learning progression. |
| **Audience** | Expert (oRPC/Inngest/TypeBox/Elysia assumed) | This is a spec, not an onboarding guide. Readers are implementers with 1+ architecture review already done. Jargon is efficient. | Skip 101-level explanations. Use consistent terminology. Assume readers know what "middleware," "durable execution," "split semantics" mean. |
| **Scope** | Multi-artifact system | This document is one of a system: DECISIONS.md for decision log, examples/ for walkthroughs, AXIS_0X for deep policy slices. Cannot and should not duplicate all content from axes. | Establish scope boundary: "This document covers locked policy and topology. For technology-specific implementation details, see AXIS_0X. For worked examples, see examples/." Cross-reference heavily. |
| **Temporality** | Point-in-time policy (immutable until next session) | Session-ID-prefixed naming will be removed. This document becomes the canonical posture as-of the current date. Future changes go through DECISIONS.md → incorporated into new version. | Include "Last updated: [date]" header. Note "Posture as of [session/phase]." Decision links point to DECISIONS.md. No placeholder sections. |

---

## Part 2: Complete Section-by-Section Outline of Merged Document

### **ARCHITECTURE.md**

```
1. DOCUMENT HEADER
   - Title: "ORPC + Inngest Workflows Architecture"
   - Scope statement (2-3 sentences)
   - Last updated: [DATE]
   - Supersedes: SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md (moved to _session-lineage/)
   - For decision log: see DECISIONS.md
   - For implementation examples: see examples/

2. 1. SCOPE
   Source: Posture Spec §1 (Scope) + Packet Index (In Scope) merged
   Content: This subsystem posture defines composition of:
   - oRPC boundary APIs
   - Workflow trigger APIs
   - Inngest durable execution
   - Optional Durable Endpoint ingress adapters
   Under TypeBox + oRPC + Elysia + Inngest.
   Policy artifact, not migration checklist.

3. 2. LOCKED POLICIES (Deduplicated Authority List)
   Source: Posture Spec §2 (14 items) + Packet Index "Locked Subsystem Policies" (10 items)
   Merger strategy: Both lists describe the same 10 core policies with different wording/grouping.
   Preserve Packet Index as primary (more precise), use Posture Spec as historical context.
   Use the fuller/clearer wording from each pair.

   2.1 Locked Policies (10 items, deduplicated)
   — Split between API and Durable Execution remains fixed
   — oRPC is primary API harness
   — Inngest functions are primary durability harness
   — Durable Endpoints are additive ingress adapters only
   — Workflow trigger surfaces are manifest-driven capability-first at /api/workflows/<capability>/*
   — Workflow/API boundary contracts are plugin-owned
   — Browser/network callers use boundary clients on /api/orpc/* and /api/workflows/<capability>/*
   — Host bootstrap initializes baseline extendedTracesMiddleware() before Inngest and route registration
   — Plugin middleware extends baseline but does not replace baseline traces
   — These define canonical target-state behavior independent of implementation sequencing

   [Source mapping visible in structure but not explicitly marked in document]
   [Rationale: 10 non-negotiable facts. Each follows: MUST/SHALL statement + 1-2 sentence why.]

4. 2.2 CANONICAL CALLER/AUTH MATRIX (Consolidated Single Rendering)
   Source: Consolidation of 7 renderings (Posture Spec §2.1, Packet Index YAML, AXIS_01 table, AXIS_03 table, AXIS_07 table, AXIS_08 table, plus embedded text in several axis docs)
   Merger strategy: Use Posture Spec 4-row × 7-column table as canonical (most complete, clear row labels)
   [Re-render to ensure exact consistency with AXIS_07 "Route Family Purpose Table"]

   | Caller type | Route family | Link type | Publication boundary | Auth expectation | Forbidden routes |
   | --- | --- | --- | --- | --- | --- |
   | First-party MFE (default) | /rpc | RPCLink | internal only | first-party boundary session/auth | /api/inngest |
   | First-party server/CLI | in-process package client (default), optional /rpc | createRouterClient / RPCLink | internal only | trusted service context | /api/inngest |
   | Third-party/external caller | /api/orpc/*, /api/workflows/<capability>/* | OpenAPILink | externally published | boundary auth/session/token | /rpc, /api/inngest |
   | Runtime ingress (Inngest) | /api/inngest | Inngest callback transport | runtime-only | signed ingress verification + gateway allow-listing | /rpc, /api/orpc/*, /api/workflows/<capability>/* |

   Note: Simplified renderings in AXIS_03, AXIS_07, AXIS_08 are valid views of this matrix for specific policy axes.
         They answer narrower questions (split semantics, host composition, workflow boundaries) without duplicating this canonical form.

5. 3. ORIGINAL TENSIONS (RESOLVED) — Optional Context Section
   Source: Posture Spec §3 (Original Tensions)
   Placement decision: MOVE to optional footer/appendix linked from main doc, not in primary flow.
   Rationale: Useful context for understanding *why* the architecture is this way, but not essential for implementing.
              Progressive disclosure: readers who want the trade-off story can follow a link.
   Content preserved as-is (4 tensions, 2-3 sentences each).

6. 4. SUBSYSTEM-WIDE CONSTRAINTS (Previously "Global Invariants")
   Source: Posture Spec §4 (31 Global Invariants) + Packet Index "Cross-Cutting Defaults" (25 items)
   Merger strategy: Deduplicate by content, chunk into named groups (5 groups of 5-7 items each).
   Rationale: 31 flat items exceed cognitive load. Chunking is mandatory per information-design principles.

   4.1 ROUTING & TRANSPORT CONSTRAINTS (7 items)
   1. /api/inngest is runtime ingress only
   2. Caller-triggered workflow APIs stay on oRPC workflow trigger surfaces (/api/workflows/<capability>/*)
   3. /rpc is first-party/internal transport only
   4. First-party callers (including MFEs by default) use RPCLink on /rpc unless explicit exception is documented
   5. External SDK generation comes from published OpenAPI surfaces (/api/orpc/*, /api/workflows/<capability>/*), never from RPC clients
   6. No dedicated /rpc/workflows mount exists by default
   7. One runtime-owned Inngest client bundle exists per process in host composition

   [Consolidates Posture Spec invariants 1, 3, 4, 5, 12 + Packet Index defaults 2, 3, 6, 7 + AXIS-07 mount order]

   4.2 OWNERSHIP & BOUNDARY CONTRACTS (5 items)
   1. Plugin runtime middleware may extend baseline instrumentation context but may not replace/reorder baseline traces middleware
   2. Workflow/API boundary contracts are plugin-owned; packages do not own workflow boundary contracts
   3. Domain packages stay transport-neutral
   4. Workflow trigger/status I/O schemas remain workflow boundary owned
   5. Durable Endpoints are additive ingress adapters only, never a second first-party trigger authoring path

   [Consolidates Posture Spec invariants 7, 8, 9, 10 + Packet Index defaults 5, 8, 9]

   4.3 SCHEMA & PROCEDURE OWNERSHIP (6 items)
   1. TypeBox-only schema authoring is required for contract/procedure surfaces (no Zod-authored contract/procedure schemas)
   2. Procedure input/output schemas live with owning procedures or boundary contracts, not in domain modules
   3. Domain modules (domain/*) hold transport-independent domain concepts only (entities/value objects/invariants/state shapes)
   4. Domain filenames inside one domain/ folder omit redundant domain-prefix tokens
   5. Shared context contracts live in context.ts (or equivalent dedicated context module)
   6. Request/correlation/principal/network metadata contracts belong in context modules, not domain/*

   [Consolidates Posture Spec invariants 13, 14, 15, 16, 18, 19 + Packet Index defaults 12, 13, 14, 15, 16, 17]

   4.4 NAMING & DIRECTORY CONVENTIONS (5 items)
   1. Naming defaults prefer concise, unambiguous domain identifiers for package/plugin directories and namespaces
   2. Canonical role names: contract.ts, router.ts, client.ts, operations/*, index.ts
   3. Internal package layered defaults may include domain/*, service/*, procedures/*, errors.ts
   4. Keep role context in prose, not context-baked filename suffixes
   5. Domain schema modules are TypeBox-first and co-export static types from the same file

   [Consolidates Posture Spec invariants 17, naming section + Packet Index defaults 15, 18]

   4.5 DOCS, SCHEMA EXTRACTION & MIDDLEWARE POLICY (6 items)
   1. Docs helper default for object-root schemas is schema({...}), where schema({...}) means std(Type.Object({...}))
   2. For non-Type.Object roots, docs/snippets keep explicit std(...) (or typeBoxStandardSchema(...)) wrapping
   3. Spec docs/examples default to inline procedure/contract I/O schema declarations at .input(...) and .output(...) callsites
   4. Schema extraction is exception-only for shared schemas or large readability cases
   5. Extracted schema shape is paired as { input, output }
   6. oRPC middleware dedupe assumptions stay explicit: use context-cached markers for heavy checks; built-in dedupe remains constrained to leading-subset/same-order chains

   [Consolidates Posture Spec invariants 20, 21, 22, 23, 24, 31 + Packet Index defaults 18, 19, 20, 21, 22, 25]

7. 5. COMPOSITION SPINE (Host Bootstrap & Mount Order)
   Source: Posture Spec §8 (Composition Spine) + Packet Index (Packet Interaction Model) + AXIS_07 (Host Bootstrap details)
   Merger strategy: Use Posture Spec structure, annotate with AXIS_07 causality from F-02.

   5.1 Bootstrap Sequence (6 steps with causality)
   Step 1: Initialize baseline extendedTracesMiddleware()
       Why: Trace middleware must initialize before Inngest client construction so Inngest's internal telemetry captures baseline context.
   Step 2: Compose one runtime-owned Inngest bundle (client + functions)
       Why: Single bundle ensures one canonical runtime identity per process.
   Step 3: Mount /api/inngest explicitly
       Why: Mount must occur before workflow trigger routes to ensure ingress is reachable when durable functions attempt to enqueue.
   Step 4: Mount /api/workflows/* with explicit workflow boundary context helpers
       Why: Helpers keep /api/workflows/<capability>/* caller-facing while /api/inngest stays runtime-only.
   Step 5: Mount /rpc with parse-safe forwarding and injected context
       Why: Parse-safe forwarding prevents request corruption; injected context establishes first-party auth scope.
   Step 6: Register /api/orpc/* with parse-safe forwarding and injected context
       Why: Same as /rpc; /api/orpc/* is the published OpenAPI surface.

   [Note: F-02 causality explanation added; step sequencing preserved from Posture Spec]

8. 6. INTEGRATIVE TOPOLOGY (Canonical Directory Structure)
   Source: Posture Spec §6 (Integrative Topology) + AXIS_07 "Canonical File Tree"
   Merger strategy: Show complete file tree; note file ownership (package vs plugin vs host).

   [Same content as Posture Spec §6, preserved as-is]

9. 7. INTEGRATIVE INTERACTION FLOWS
   Source: Posture Spec §7 (Integrative Interaction Flows)
   Content: Three canonical flows (External API → Internal Client, External API → Workflow → Inngest, oRPC-only state read)
   Preserved as-is.

10. 8. OWNERSHIP SPLIT & ROUTING SUMMARY
    Source: Posture Spec §9 (Routing, Ownership, and Caller Semantics Snapshot)
    Merger strategy: Reorganize as 5 summary statements + 1 decision note.

    8.1 Host/Route Spine
        Capability-first /api/workflows/<capability>/* remains caller-facing.
        /api/inngest remains runtime-only ingress.

    8.2 Bootstrap Order
        Hosts initialize baseline traces first, compose runtime-owned Inngest bundle, mount /api/inngest,
        mount /api/workflows/*, then register /rpc + /api/orpc/*.

    8.3 Internal Transport
        /rpc is first-party/internal only; no dedicated /rpc/workflows mount is required by default.

    8.4 Manifest Composition
        rawr.hq.ts exposes canonical orpc and workflows namespaces plus shared Inngest bundle.
        Hosts mount rawrHqManifest.workflows.triggerRouter and rawrHqManifest.inngest explicitly.

    8.5 Ownership Split
        Workflow/API boundary contracts are plugin-owned.
        Packages remain transport-neutral and own shared domain logic/domain schemas plus internal client/service layers only.

    8.6 Caller-Mode Split
        First-party callers (including MFEs by default) use RPCLink on /rpc.
        External callers use published OpenAPI clients (/api/orpc/*, /api/workflows/<capability>/*).
        Runtime ingress remains signed /api/inngest.

    [Note: Each statement is 1-2 sentences. Mapping to Posture Spec preserved mentally but not shown in doc.]

11. 9. DECISION HISTORY & D-008 INTEGRATION
    Source: Posture Spec §9.1 (D-008 Integration Scope) + DECISIONS.md synthesis
    Merger strategy: Brief summary here; full decision log lives in DECISIONS.md.

    Baseline traces initialization order, single runtime-owned bundle ownership, and explicit mount/control-plane ordering are locked as of D-008.
    D-005 route split semantics, D-006 plugin boundary ownership, and D-007 caller transport/publication boundaries remain unchanged.
    For full decision history and open questions, see DECISIONS.md.

12. 10. NAMING, ADOPTION, & SCALE GOVERNANCE
    Source: Posture Spec §10 (Naming, Adoption, and Scale Governance) + AXIS_07 §Naming Rules
    Merger strategy: Consolidate into 4 sub-sections (role names, directory structure, schema authoring, adoption exceptions).

    10.1 Canonical Role Names
        contract.ts, router.ts, client.ts, operations/*, index.ts

    10.2 Internal Package Layering (Optional Defaults)
        May include domain/*, service/*, procedures/*, errors.ts

    10.3 Schema Authoring (TypeBox-First)
        Domain schema modules are TypeBox-first and co-export static types.
        Procedure input/output schemas belong next to procedures (internal) or in contract.ts (boundary).
        Extracted shape paired as { input, output }.

    10.4 Adoption Exceptions
        Allowed only for true 1:1 overlap between boundary and internal surface.
        Must be explicitly documented with three-part criteria from AXIS_03:
        (1) 1:1 overlap documented
        (2) why overlap is 1:1 documented
        (3) return-trigger to boundary-owned contracts documented

    [Consolidates Posture Spec §10 items 1-13 + AXIS_07 naming rules + AXIS_03 adoption exception criteria]

13. 11. AXIS COVERAGE MAP
    Source: Posture Spec §5 (Axis Map) + Packet Index (Axis Coverage)
    Merger strategy: Preserve as-is; note that each axis doc owns a slice of policy.

    | Axis | Policy Surface | Canonical Leaf Spec |
    | 1 | External client generation | 01-external-client-generation.md |
    | 2 | Internal clients/internal calling | 02-internal-clients.md |
    | 3 | Split vs collapse posture | 03-split-vs-collapse.md |
    | 4 | Context creation/propagation | 04-context-propagation.md |
    | 5 | Errors/logging/observability | 05-errors-observability.md |
    | 6 | Middleware/cross-cutting concerns | 06-middleware.md |
    | 7 | Host composition policy | 07-host-composition.md |
    | 8 | Workflow vs API boundaries | 08-workflow-api-boundaries.md |
    | 9 | Durable endpoints vs durable functions | 09-durable-endpoints.md |

14. 12. NAVIGATION MAP (If You Need X, Read Y)
    Source: Packet Index "Navigation Map" (word-for-word preserved)
    Merger strategy: As-is; this is a high-value reference section.

15. APPENDIX A: ORIGINAL TENSIONS (Optional Reading)
    Source: Posture Spec §3 (moved here as optional context)
    Content: Four design trade-offs that drove policy decisions (collapse vs semantic correctness, flexible vs deterministic, boilerplate vs ownership, client-generation reuse vs contract guarantees)
    Rationale: Useful for understanding *why*, not essential for *how*. Readers who want context can find it; implementation doesn't require it.

16. APPENDIX B: SOURCE ANCHORS & REFERENCES
    Source: Posture Spec §11 (Source Anchors)
    Content: Links to oRPC, Inngest, Elysia, TypeBox documentation.
    Merger strategy: Preserve as-is.
```

---

## Part 3: Policy Deduplication Strategy

### The Overlap

Both Posture Spec §2 and Packet Index list the same 10 core locked policies with different wording:

| Policy | Posture Spec Item(s) | Packet Index Item(s) | Merged Strategy |
|--------|----------------------|----------------------|-----------------|
| Split semantics fixed | 1 | 1 | Use Packet Index wording (crisper) |
| oRPC primary harness | 2 | 2 | Posture Spec (equivalent) |
| Inngest primary durability | 3 | 3 | Posture Spec (equivalent) |
| Durable Endpoints additive only | 4 | 4 | Packet Index (more specific) |
| Workflow trigger surface manifest-driven | 5 | 5 | Use combined: Packet adds "capability-first /api/workflows/<capability>/*" |
| Workflow/API boundary plugin-owned | 8 | 6 | Use Packet Index (more precise on ownership split) |
| Browser/network caller boundary | 11 | 7 | Use Packet Index ("composed boundary clients" is clearer) |
| Bootstrap order locked | 6 + Composition Spine | 8 + D-008 | Use Posture Spec structure + Packet D-008 clarification on "why" |
| Plugin middleware extends baseline | 7 | 9 | Use Packet Index (already clear) |
| Target-state policy independent of sequencing | N/A | 10 | Add as policy 10 (important for implementation clarity) |

### Decision Authority

**Locked Policies section source mapping:**
- Posture Spec is historical (SESSION ID suggests point-in-time documentation of decisions)
- Packet Index is canonical (explicitly says "This packet is the canonical leaf-level spec set")
- DECISIONS.md is the authority for *when* policies were locked and *why*

**Merge approach:**
- Use Packet Index wording as the primary source (already reviewed, already canonical)
- Cross-check against Posture Spec for additional nuance
- When both are equivalent, use the clearer version
- When they diverge, note both and choose the more specific one
- Add D-008 causality from F-02 to bootstrap section

---

## Part 4: Invariants & Defaults Chunking Plan

### Challenge: 31 Invariants + 25 Defaults = 56 unrelated items

Reading 31 items in a flat list exceeds working memory. Chunking is non-negotiable.

### Chunking Strategy: 5 Groups of 6-7 Items Each

**Group 1: ROUTING & TRANSPORT CONSTRAINTS (7 items)**
- Route access control: /api/inngest (runtime only), /rpc (first-party only), /api/orpc/* (external)
- No dedicated /rpc/workflows mount
- One Inngest bundle per process
Source items: Posture invariants 1, 3, 4, 5, 12 + Packet defaults 2, 3, 6, 7

**Group 2: OWNERSHIP & BOUNDARY CONTRACTS (5 items)**
- Plugin owns boundary contracts
- Packages stay transport-neutral
- Durable Endpoints are additive only
- Baseline middleware not replaced
Source items: Posture invariants 7, 8, 9, 10 + Packet defaults 5, 8, 9

**Group 3: SCHEMA & PROCEDURE OWNERSHIP (6 items)**
- TypeBox-only for contracts/procedures
- I/O schemas co-located (not in domain/*)
- Domain/* is transport-independent concept-only
- Context ownership (context.ts)
Source items: Posture invariants 13, 14, 15, 16, 18, 19 + Packet defaults 12, 13, 14, 15, 16, 17

**Group 4: NAMING & DIRECTORY CONVENTIONS (5 items)**
- Concise domain identifiers (packages/invoicing, not packages/invoice-plugin)
- Canonical role names (contract.ts, router.ts, client.ts, operations/*, index.ts)
- No redundant domain prefixes within domain/ folder
- TypeBox schema modules are self-contained
Source items: Posture invariants 17 + naming section + Packet defaults 15

**Group 5: DOCS & SCHEMA EXTRACTION POLICY (6 items)**
- schema({...}) shorthand for Type.Object root
- Inline I/O schemas by default in docs
- Extract only for shared/large cases
- Extract shape is { input, output }
- Dedupe markers explicit for heavy middleware
Source items: Posture invariants 20, 21, 22, 23, 24, 31 + Packet defaults 18, 19, 20, 21, 22, 25

### Naming Clarity

Old names (weak scent):
- "Global Invariants" (too broad — 31 unrelated items)
- "Cross-Cutting Defaults" (unclear — defaults for what?)

New names (strong scent):
- "ROUTING & TRANSPORT CONSTRAINTS" — tells you exactly what these are about
- "OWNERSHIP & BOUNDARY CONTRACTS" — ownership is the theme
- "SCHEMA & PROCEDURE OWNERSHIP" — schema rules is the focus
- "NAMING & DIRECTORY CONVENTIONS" — naming is the concern
- "DOCS & SCHEMA EXTRACTION POLICY" — documentation guidelines

---

## Part 5: Caller/Auth Matrix Consolidation Strategy

### The 7 Renderings Problem

| Source | Rows | Cols | Completeness | Issue |
|--------|------|------|---------------|----- |
| Posture Spec §2.1 | 4 | 7 | Complete | Canonical (most columns, all rows) |
| Packet Index (YAML) | 3 | 4 | Simplified | Loses server/CLI row; metadata-only |
| AXIS_01 (table) | 3 | 7 | Incomplete | Missing server/CLI row |
| AXIS_03 (table) | 3 | 7 | Incomplete | Missing server/CLI row |
| AXIS_07 "Route Family" (table) | 4 | 5 | Complete but different | Route-centric perspective (valid but different question) |
| AXIS_07 "Host Route/Auth" (table) | 3 | 5 | Incomplete | Missing runtime row; missing some columns |
| AXIS_08 (embedded) | 3 | 5 | Incomplete | Missing runtime row |

### Decision

**One canonical 4×7 table in ARCHITECTURE.md §2.2**, based on Posture Spec rendering (most complete).

**All other renderings become references:**
- AXIS_01, AXIS_03, AXIS_07 "Route Family" table is a valid *complementary view*, not a duplicate
  - AXIS_07's "Route Family Purpose Table" answers: "What is the purpose of each route family?" (different question than "who can call what")
  - These coexist without conflict because they answer different questions
- AXIS_03, AXIS_07, AXIS_08 incomplete renderings: add a note "This simplified matrix applies to [specific axis policy]. See ARCHITECTURE.md §2.2 for the full 4×7 canonical matrix."

### Deduplication at Source

- F-01 in the Reshape Proposal already identified this problem
- Execute F-01: Declare the Posture Spec 4×7 as canonical
- All axis docs reference it rather than re-rendering
- Simple renderings in axes stay but are labeled as simplified views

---

## Part 6: Header Renaming Table

| Old Header | New Header | Rationale | Impact |
|------------|------------|-----------|--------|
| "Global Invariants" | "Subsystem-Wide Constraints" | "Global" is too vague; "constraints" is more specific and emphasizes that these are boundaries/requirements, not just descriptions | Readers immediately understand this section is about what *must not* happen, not just what *is* |
| "Integrative Topology" | "Canonical Directory Structure" | "Integrative topology" is architectural jargon; "canonical directory structure" says what it actually contains | Implementer looking for file tree immediately finds this section |
| "Composition Spine" | "Host Bootstrap & Mount Order" | "Spine" is vague metaphor; "Bootstrap & Mount Order" describes the actual content (what happens first, in what order) | Readers know whether this section covers what they need |
| "Cross-Cutting Defaults" (in Packet) | "Subsystem-Wide Constraints" (merged into ARCHITECTURE.md) | Not renamed, merged into consolidated constraints section | Reduces document multiplicity |
| "D-008 Integration Scope" (section heading in Packet) | REMOVED (merged into Decision History section) | This was a temporal changelog entry ("Changes: ... Unchanged: ...") that doesn't belong in canonical docs | Cleans up temporal noise |
| (new) "Original Tensions (Resolved)" | Moved to Appendix A | Trade-off context is useful for understanding *why*, not for understanding *what to do*; progressive disclosure via optional appendix | Preserves content without cluttering primary flow |

---

## Part 7: Mandate Checks Against Proposed Structure

### Logic Test (Does the structure hold without formatting?)

Strip all formatting from proposed ARCHITECTURE.md:

1. Scope: defines what the subsystem is
2. 10 locked policies: non-negotiable facts
3. Canonical caller/auth matrix: who can call what
4. 5 constraint groups (30 total): subsystem rules by category
5. Bootstrap & mount order: composition sequence with causality
6. Directory structure: file ownership
7. Interaction flows: canonical patterns
8. Ownership summary: who owns what
9. Decision history: link to log
10. Naming & governance: conventions
11. Axis map: index into deeper specs
12. Navigation map: "if you need X, read Y"
13. Appendix: optional context

**Logic holds.** Progression is: scope → locked facts → enforcement → structure → conventions → navigation. Without headers, the argument remains coherent.

### Skim Test (Do headers predict content?)

Read only headers:
- "Scope" → you'll learn what this covers
- "Locked Policies" → 10 non-negotiable facts
- "Canonical Caller/Auth Matrix" → caller access table
- "Subsystem-Wide Constraints" → rules and invariants
- "Host Bootstrap & Mount Order" → initialization sequence
- "Canonical Directory Structure" → file layout
- "Navigation Map" → where to find things

**Headers pass.** Each predicts its content. No vague headers ("Overview," "Details," "Notes").

### Swap Test (Could this structure apply to a different document?)

Could this outline work for, say, a Stripe API spec or a React architecture?

**No.** The structure is *specific to this project*:
- The 10 locked policies are specific to split semantics + oRPC/Inngest choice
- The constraint groups are specific to TypeBox + workflow manifest model
- The bootstrap sequence is specific to Elysia mount order
- The directory structure is specific to packages/ + plugins/ layout

Structure is not a template; it's shaped for this content.

### Noise Test (Does every element earn its place?)

- Locked Policies §2.2 (canonical caller matrix): **Signal.** This is looked up 7 times across the packet. One canonical form eliminates ambiguity.
- Appendix A (Original Tensions): **Signal, but optional.** Moved to appendix for progressive disclosure. Doesn't clutter primary narrative but available for context-seeking readers.
- Navigation Map: **Signal.** Referenced multiple times in the canonical assessment as essential.
- Axis Map: **Signal.** Cross-reference tool for readers who need deep policy.
- Naming Rules: **Signal.** Implementers need to know role names to write code.

No section is pure noise. Even the appendix serves a purpose (context).

### Scent Test (Do headings have strong scent?)

| Heading | Scent Strength | Predicted Content |
|---------|---|---|
| "Locked Policies" | Strong | 10-15 non-negotiable architectural facts |
| "Subsystem-Wide Constraints" | Strong | Rules and invariants grouped by category |
| "Canonical Caller/Auth Matrix" | Very Strong | Table of who (caller types) can call what (routes) and what auth is needed |
| "Host Bootstrap & Mount Order" | Strong | Initialization sequence and mount order for host startup |
| "Canonical Directory Structure" | Very Strong | File tree showing package/plugin/app layout |
| "Navigation Map (If You Need X, Read Y)" | Very Strong | Cross-reference index to deeper docs |
| "Original Tensions (Resolved)" | Medium | Design trade-offs and alternatives considered |

**Scent is strong throughout.** Readers with a specific goal can scan headings and confidently decide whether to read each section.

---

## Part 8: AXIS_07 Reorganization Strategy

### The Overload Problem

AXIS_07 currently contains:
1. Host mount boundaries and composition spine (policy)
2. Runtime/host glue inventory (reference)
3. Required root fixtures (code)
4. Naming rules (conventions)
5. Optional composition helpers (code)
6. File structure implications (reference)

All in one 300+ line document. A reader looking for "mount order" must scroll past fixture code. A reader looking for "naming rules" must find them buried in rule list.

### Option A: Split AXIS_07

**New structure:**
- `AXIS_07_HOST_COMPOSITION.md` (policy only): In/Out scope, canonical policy (11 items), route family table, host bootstrap sequence, ownership split
- `REFERENCE_HOST_COMPOSITION_INVENTORY.md` (reference): Runtime/host inventory, canonical file tree, fixture code, naming rules
- Separate `REFERENCE_COMPOSITION_HELPERS.md` for optional composition helpers (if needed)

**Pros:**
- Each artifact has a clear purpose (policy vs reference)
- Readers find what they need faster
- Aligns with axis template (one axis = one policy slice)

**Cons:**
- Splits related content; requires cross-reference discipline
- Adds more files to navigate

### Option B: Reorganize AXIS_07 (Chunking + Sub-headers)

**New structure within AXIS_07:**
```
1. In Scope / Out of Scope
2. Canonical Policy (11 bullet points)
3. Route Family Purpose Table (shows purpose of each route)
4. Host Route/Auth Enforcement Matrix (caller access enforcement)
5. Why & Trade-Offs
6. --- REFERENCE SECTION (prominent separator) ---
7. Naming Rules (Canonical)
8. Canonical Runtime/Host Inventory (4 key files listed)
9. Canonical File Tree
10. Required Root Fixtures (code)
11. Optional Composition Helpers
12. Why
13. Trade-Offs
14. References
```

**Pros:**
- All related content in one place
- Preserves current file structure
- Clear visual separation between policy and reference
- Allows readers to jump to reference section if needed

**Cons:**
- Still one large file; may feel cluttered
- Distinction between "part to read" and "reference" only visual, not structural

### Recommendation

**Execute Option B (reorganize with chunking + sub-headers).**

Rationale:
- The policy and reference are genuinely related (host composition requires understanding both policy *and* the current inventory of what files do what)
- One file keeps that relationship visible
- Sub-headers and a prominent visual separator satisfy the "clear chunks" requirement
- Less file system churn; existing cross-references remain valid
- Readers can read policy, then drop down to reference for implementation details

**Implementation detail for ARCHITECTURE.md:**
- Point readers to AXIS_07: "For host composition policy, see AXIS_07_HOST_COMPOSITION.md. This axis covers both policy (mount order, ownership) and reference material (canonical file inventory, fixture code)."

---

## Part 9: Flags & Decisions for User

### F-xx Fixes Status

All 13 "Confident Decisions" from the Reshape Proposal should be executed as part of this consolidation:

- **F-01: Consolidate caller/auth matrix** → Part 5 strategy above
- **F-02: Explain bootstrap order causality** → §5.1 in Part 2; adds why clause to each step
- **F-03: Fix "domain packages stay transport-neutral" scope** → Already correct in Packet Index; Posture Spec language will be aligned
- **F-04: Settle middleware dedupe at SHOULD** → Use D-009 (SHOULD) language, not stricter interpretation
- **F-05: Use AXIS_03's detailed adoption exception criteria** → Part 4 §10.4 incorporates three-part criteria
- **F-06: Add decision numbering migration note** → Add to DECISIONS.md header
- **F-07: Timestamp the Loop Closure Bridge** → Move to _session-lineage/ with as-of header
- **F-08: Convert absolute paths to repo-relative** → Scan axes; convert `/Users/mateicanavra/...` to repo-relative
- **F-09: Standardize DECISIONS.md field naming** → Standardize why_closed vs closure_scope
- **F-10: Remove D-008 Integration Scope from Packet Index** → Merge its content into ARCHITECTURE.md §9
- **F-11: Move AXIS_08 path strategy to DECISIONS.md** → Create closed decision entry
- **F-12: Add E2E internal client divergence note** → Annotate E2E_03
- **F-13: Resolve schema export naming** → Ensure canonical form is schema, add note to AXIS_07

### Q-xx Open Questions Status

From the Reshape Proposal, these require owner decision before execution:

- **Q-01: Inngest ingress security specificity** — Not blocking this consolidation; can be deferred to ops/security doc
- **Q-02: Forbidden route enforcement behavior** — Not blocking; can be 403 at app level or defer to implementation planning
- **Q-03: Promote legacy testing requirements?** — Recommend: archive as implementation context (not spec policy)
- **Q-04: Promote legacy metadata removal plan?** — Recommend: archive as implementation context (not spec policy)
- **Q-05: Are view/projection helpers allowed in domain/*?** — Recommend: allow with note ("transport-independent projections acceptable")
- **Q-06: Is rawr.hq.ts generated or hand-authored?** — Recommend: specify as "generated with hand-edit opportunities at integration points" (pending technology decision)

None of these block consolidation. They can be resolved post-consolidation and incorporated into DECISIONS.md.

---

## Part 10: Execution Sequence

Once this plan is approved, execution follows this sequence:

1. **Create ARCHITECTURE.md structure** per Part 2 outline
   - Merge Posture Spec + Packet Index using strategy from Part 3
   - Apply deduplication strategy from Part 4 (5 constraint groups)
   - Apply consolidation from Part 5 (one canonical caller/auth matrix)
   - Reorganize AXIS_07 per Part 8 (Option B)

2. **Update AXIS docs** to reference canonical forms:
   - AXIS_01, AXIS_03: "For the complete caller/auth matrix, see ARCHITECTURE.md §2.2"
   - AXIS_07: Restructure with prominent reference section separator
   - AXIS_08: Move path strategy debate to DECISIONS.md as closed decision

3. **Execute F-xx fixes** from Part 9

4. **Update DECISIONS.md:**
   - Add migration note (F-06)
   - Standardize field naming (F-09)
   - Add closed decision for path strategy (F-11)

5. **Move session artifacts** to _session-lineage/:
   - Posture Spec becomes _session-lineage/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md (with timestamp)
   - Packet Index removed from root (content merged into ARCHITECTURE.md)

6. **Verify cross-references:**
   - All axis docs correctly point to ARCHITECTURE.md for locked policies
   - All examples correctly reference canonical forms
   - No orphaned references to merged content

7. **Write README.md** (out of scope for this plan, but needed for full project consolidation)

---

## Summary

This consolidation plan:
- **Eliminates dual authority** by merging Posture Spec + Packet Index into one ARCHITECTURE.md
- **Deduplicates 14 policies** using the clearer Packet Index wording where it diverges from Posture Spec
- **Chunks 31 invariants + 25 defaults** into 5 meaningful groups (routing, ownership, schema, naming, docs) with strong-scent headers
- **Consolidates 7 caller/auth matrix renderings** into one canonical 4×7 table with simplified views in axes as references
- **Reorganizes AXIS_07** with prominent chunking and clear separation between policy and reference
- **Passes all five mandate checks**: logic, skim, swap, noise, scent
- **Preserves all policy content** (nothing deleted, only reorganized)
- **Maintains cross-reference validity** through careful section naming and numbering

The result is a canonical document that serves both as a reference lookup tool (precise, indexed, scannable) and as a sequential orientation guide (scope → locked policy → constraints → structure → conventions).
