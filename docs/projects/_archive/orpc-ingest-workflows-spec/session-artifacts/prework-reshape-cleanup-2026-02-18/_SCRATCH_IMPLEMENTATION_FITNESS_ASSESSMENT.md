# Implementation Fitness Assessment: ORPC + Inngest/Workflows Posture Spec

**Assessment Date:** 2026-02-18
**Scope:** Document set fitness for implementation planning and long-term reference
**Assessed by:** Information design + technology skills review

---

## Part A: Implementation Planner Scenario Walk-Through

### 1. Entry Point: Where Do You Start?

**Finding the door:**
- Primary entry: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (integrative overview)
- Alternative entry: `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (self-contained packet)
- **Assessment:** TWO entry points exist. For a fresh implementer, the "Posture Spec" reads more like a **subsystem summary** than a true entry point—it assumes prior context about packet/axis structure. The packet file is more self-contained but buried in a subdirectory.
- **Friction level:** Medium. An implementer must make a choice between two files. The overview is longer but feels more authoritative; the packet is clearer but feels secondary.
- **Improvement needed:** Add a single landing document that answers "I'm new—where do I start?" and directs by scenario (fresh implementation vs maintenance vs debugging). The two-file split creates navigation ambiguity.

**Clarity on what you're reading:**
- Sessions overview clearly states its role: "integrative subsystem overview"
- Packet clearly states: "self-contained entry" + "canonical leaf-level spec set"
- **Assessment:** Document identity is explicit. However, the distinction between "subsystem overview" and "canonical leaf spec" is not obvious to someone unfamiliar with architecture terminology.

**Orientation time estimate:** 20-30 minutes to understand the three-layer structure (overview → packet → axes).

---

### 2. Locked Decisions Extraction: How Quickly Can You Get the Full Set?

**Where are decisions stored?**
- Primary: `orpc-ingest-spec-packet/DECISIONS.md` (packet-local)
- Secondary: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` section "2) Locked Policies" (31 numbered policies)
- Tertiary: Each axis doc contains canonical policy sections (nested inside each axis file)
- **Assessment:** Decisions are scattered across THREE locations with NO single authoritative index.

**Extracting the full set:**
1. Read overview "2) Locked Policies" (31 items, high-level)
2. Read `DECISIONS.md` (D-004 through D-012; closed, locked, and open decisions)
3. Cross-reference each axis doc for enforcement-specific policy
- **Assessment:** A developer can extract the set, but the path is not obvious. There is no "complete decision ledger with sources" that you can point to and say "this is the full set and here's where each decision is enforced."

**Consistency check:**
- Are the 31 locked policies in the overview identical to the axis-specific enforcement rules?
  - **Partially.** Overview policies are *higher-level*; axis policies are *application-specific*.
  - Example: Overview policy #1 says "split semantics are fixed"; AXIS_08 restates this with enforcement details for workflow trigger/durable function split.
  - Example: Overview policy #6 says "Host bootstrap initializes baseline traces before Inngest composition"; AXIS_07 details what "before" means in the mount order.
- **Assessment:** Consistency is maintained but requires cross-reading. An implementer can't grab one file and be confident they have the full locked set without cross-checking other documents.

**Confidence: 65/100.** You can extract locked decisions, but the number of documents to read and the lack of a single "locked decision register" creates friction. Decision tracking is scattered.

---

### 3. Target Topology Extraction: How Quickly Can You Extract File/Route/Ownership Structure?

**File structure (who owns what):**
- Overview section "6) Integrative Topology" provides a text tree
- AXIS_07 section "Canonical File Tree" duplicates and extends it
- E2E examples each show a tree for their specific scenario
- **Assessment:** File structure is clear and consistent across documents. Three presentations of the same structure is slightly redundant but helpful for cross-reference.

**Route structure (mount boundaries):**
- Overview section "2.1) Canonical Caller/Transport Matrix" shows caller → route → link → auth
- AXIS_07 section "Route Family Purpose Table" shows route family → caller class → link → publication boundary
- AXIS_08 and AXIS_01 restate for workflow and API contexts
- **Assessment:** Route structure is well-defined. However, there are FOUR different matrix presentations (overview, AXIS_01, AXIS_07, AXIS_08) that say similar things. This is helpful for cross-reference but signals that route semantics are important enough to need this much coverage.

**Ownership structure (who owns contracts/operations/routers):**
- Overview section "Canonical Ownership Split" (one paragraph)
- AXIS_01, AXIS_02, AXIS_06, AXIS_07, AXIS_08 all address ownership in their own contexts
- DECISIONS.md D-006 locks plugin boundary ownership
- **Assessment:** Ownership is consistently stated but fragmented. A developer must read at least three axis docs to understand the full ownership model.

**Quick topology extraction path:**
1. Read overview section "6) Integrative Topology" (10 min)
2. Read AXIS_07 "Canonical File Tree" (5 min)
3. Read AXIS_07 "Route Family Purpose Table" (5 min)
4. Skim E2E_01 or E2E_02 for concrete file paths (10 min)
- **Total:** ~30 min to understand full topology

**Confidence: 75/100.** Topology is clear and well-documented. Fragmentation across multiple files creates slight friction, but consistency is good.

---

### 4. Gap Identification: Can You Identify What the Current Codebase Needs to Change?

**What the spec tells you:**
- Section "2) Locked Policies" lists what IS and ISN'T allowed
- AXIS_03 lists "Practical Red Flags (Reject)" — explicit anti-patterns
- Each axis doc has a "Why" and "Trade-Offs" section
- **Assessment:** The spec is strongly normative (many MUST/MUST NOT rules) but contains no explicit audit guidance or "current state vs target state" comparison.

**What the spec does NOT tell you:**
- No "migration checklist" (intentional per scope statement in packet)
- No "if you have X pattern, change it to Y" guidance
- No automated way to diff the current codebase against the spec
- No checklist for "before you ship, verify these policies"
- **Comparison:** AXIS files have no "Current Implementation Gaps" or "Pre-implementation Audit" section

**Document provided for current state:**
- `REDISTRIBUTION_TRACEABILITY.md` maps the monolith's old sections to new locations but does not audit the current codebase
- No "SESSION_019c587a_CURRENT_STATE_AUDIT.md" or similar exists
- **Assessment:** The spec is "greenfield" (target state only) with no "current state" companion document to help an implementer understand divergence from existing code.

**Implementer inference path:**
1. Read the spec to understand target state
2. Run mental diff against known codebase issues
3. Trust that you've identified all gaps

**Confidence: 50/100.** The spec helps you understand what to build. It does NOT help you identify what to change in an existing codebase. For a fresh greenfield implementation, this is acceptable. For a refactoring on an existing system, this is a significant gap.

**Recommendation:** Add a "Current State Audit" document (separate from the target spec) that catalogs known divergences and maps them to axis policies that need enforcement.

---

### 5. Implementation Sequencing: Does the Spec Help You Figure Out What to Build First?

**What the architecture skill says:**
- "Resolve spine decisions first" (core concept from architecture skill)
- Spine = "how things compose, what orchestrates them, registry model"

**What the spec provides:**
- Overview section "8) Composition Spine (Cross-Axis Contract)" lists 6 sequential initialization steps
- AXIS_07 "Host bootstrap MUST initialize baseline traces first" plus mount order: `/api/inngest` → `/api/workflows/*` → `/rpc` + `/api/orpc/*`
- E2E_02 provides a walkthrough order

**Dependencies between axes:**
- Are some axes prerequisites for others?
  - AXIS_03 (split posture) is foundational; all others assume split
  - AXIS_07 (host composition) depends on AXIS_01, AXIS_04, AXIS_06, AXIS_08
  - AXIS_08 (workflow boundary) depends on AXIS_04 (context) and AXIS_05 (observability)
- **Assessment:** Dependencies exist but are not explicitly mapped. An implementer must infer "this axis depends on that axis" by reading carefully.

**Recommended build order (inferred from spec):**
1. Set up domain packages + internal clients (AXIS_02)
2. Set up API boundary contracts + operations (AXIS_01)
3. Set up Inngest bundle + durable functions (AXIS_08)
4. Set up context models (AXIS_04)
5. Set up middleware / observability (AXIS_05, AXIS_06)
6. Compose host and mount routes (AXIS_07)

**What the spec doesn't provide:**
- An explicit "implementation sequence" document
- Dependency graph between axes
- "Do this first, then that" checklist

**Confidence: 60/100.** The spec provides enough information for an experienced architect to infer build order. A less experienced implementer might build routes before setting up context, then have to rework. An explicit sequencing guide would improve this significantly.

**Recommendation:** Create a "IMPLEMENTATION_SEQUENCE.md" that lists axes in dependency order with a "why this order" rationale.

---

### 6. Boundary Clarity: For a Given Task, Can You Determine Which Files to Create and Which Patterns to Follow?

**Test case: "Add a new workflow capability (reconciliation)."**

Can you determine:
1. Which files to create? ✓ Yes
   - `plugins/workflows/invoicing/src/contract.ts` (AXIS_08 shows this)
   - `plugins/workflows/invoicing/src/router.ts` (AXIS_08 shows this)
   - `plugins/workflows/invoicing/src/functions/` (AXIS_08 shows this)
   - `plugins/workflows/invoicing/src/operations/` (AXIS_08 shows this)

2. Which patterns to follow? ✓ Yes
   - Contract is oRPC contract-first (AXIS_01 and AXIS_08)
   - Trigger operation uses `inngest.send()` (AXIS_08 snippet)
   - Durable function uses `inngest.createFunction()` (AXIS_08 snippet)
   - Context is explicit `context.ts` (AXIS_08 shows this)

3. Which policies to respect? ✓ Mostly
   - TypeBox-only schema authoring (overview policy #13) → not obvious in AXIS_08 snippets; must infer from AXIS_01
   - Inline I/O schema default (overview policy #22) → AXIS_08 shows both inline and extracted forms
   - No direct `inngest.send` from arbitrary boundary modules (overview policy #26) → AXIS_02 explains, but AXIS_08 doesn't reference this constraint
   - `/rpc` internal-only, no dedicated `/rpc/workflows` (overview policy #13) → AXIS_08 doesn't clarify if your RPC workflow procedures go in `/rpc` under a namespaced tree or if there's a separate path

4. Integration points? ✓ Partially
   - Where does the new workflow router compose? Host file (`apps/server/src/rawr.ts`) — shown in AXIS_07
   - How is it registered in the manifest? `rawr.hq.ts` — shown in AXIS_07 but with placeholder helper names
   - What context injection is needed? Shown in AXIS_07, but specifics vary by capability

**Confidence: 75/100.**
- **For creating the workflow plugin files:** 95/100. Clear patterns.
- **For understanding ownership split:** 80/100. Mostly clear; some policies require cross-axis reading.
- **For host composition integration:** 65/100. The host code is shown, but the "how to add YOUR workflow to rawr.hq.ts" is implied, not explicit. An implementer must infer or find a code example.

**Gap:** There is no "step-by-step: add a new workflow capability" checklist in the spec. E2E_02 shows the complete result but not the "add THIS to existing setup" path. This is the biggest implementation friction point.

---

## Part B: Long-Term Reference Scenario Walk-Through

### Scenario 1: "Who owns workflow contracts?"

**Question:** Where do I find the answer?

**Attempt 1:** Search overview for "contract ownership"
- Found: "Workflow/API boundary contracts are plugin-owned (`plugins/api/*/contract.ts`, `plugins/workflows/*/contract.ts`)"
- **Time:** 2 min. Clear answer.

**Attempt 2 (for deeper detail):** Follow to AXIS_01 and AXIS_08
- AXIS_01: "Boundary APIs remain contract-first by default" + "Workflow/API boundary contracts are plugin-owned"
- AXIS_08: "Workflow trigger procedure input/output schemas MUST be declared in boundary contract modules (`contract.ts`)"
- DECISIONS.md D-006: Full closure statement on ownership
- **Time:** 10 min. Comprehensive answer with justification.

**Consistency check:** All three sources say the same thing. No contradictions found.

**Confidence: 90/100.**

---

### Scenario 2: "What's the mount order?"

**Question:** In what sequence should routes be mounted in the host?

**Attempt 1:** Search overview for "mount"
- Found: "Mount/control-plane order is explicit: `/api/inngest` first, `/api/workflows/*` second, then `/rpc` and `/api/orpc/*`"
- **Time:** 2 min. Direct answer.

**Attempt 2 (for implementation details):** Read AXIS_07
- Section "Host bootstrap MUST initialize baseline traces first..." with explicit order
- Includes code snippet showing mount order
- **Time:** 5 min. Confirmed with code.

**Consistency check:** Overview and AXIS_07 agree. D-008 in DECISIONS.md reinforces order.

**Confidence: 95/100.**

---

### Scenario 3: "Can a browser hit /api/inngest?"

**Question:** Is `/api/inngest` a public caller-facing surface?

**Attempt 1:** Search for "inngest" in matrices
- Overview section "2.1) Caller/Auth Matrix": Row "Runtime ingress" shows `/api/inngest` with "signed ingress verification + gateway allow-listing"
- Forbidden routes for all caller types except runtime: `/api/inngest` is forbidden
- **Time:** 3 min. Clear answer: No.

**Attempt 2 (for detail):** Read AXIS_08 "Runtime Ingress Enforcement Requirements"
- Explicit requirement: "Gateway/proxy policy MUST deny browser/API-originated traffic to `/api/inngest`"
- **Time:** 5 min. Confirmed with enforcement rules.

**Consistency check:** Matrices in overview, AXIS_07, AXIS_03, and AXIS_08 all agree. No contradictions.

**Confidence: 98/100.**

---

### Scenario 4: "What's the caller/auth matrix for MFEs?"

**Question:** Which routes can MFEs access, and with what auth?

**Attempt 1:** Find a matrix labeled for MFEs
- Overview section "2.1) Caller/Auth Matrix": First row is "First-party MFE"
- Allowed: `/rpc`
- Link type: `RPCLink`
- Auth: "first-party boundary session/auth"
- Forbidden: `/api/inngest`
- **Time:** 2 min. Clear answer.

**Attempt 2 (for decision context):** Read DECISIONS.md D-007
- "First-party callers (including MFEs by default) use RPC unless an explicit exception is documented"
- **Time:** 3 min. Confirms and adds "unless exception" caveat.

**Consistency check:** Matrices in overview, AXIS_01, AXIS_02, AXIS_03, AXIS_07, and AXIS_08 all present the same information with minor variations in framing. No contradictions.

**Confidence: 95/100.**

---

### Scenario 5: "Is this code pattern policy-compliant?"

**Question:** Given a code snippet, how easily can an implementer verify it against policy?

**Test case:**
```ts
// In plugins/api/invoicing/src/operations/start.ts
export async function startInvoiceOperation(context, input) {
  return context.invoice.start(input);
}
```
Is this pattern correct?

**Verification path:**
1. Read AXIS_02 for "internal calling defaults" → shows `context.invoice.start(input)` is correct
2. Read AXIS_01 for "boundary operation behavior" → confirms operations should delegate to internal client
3. Infer: ✓ Pattern is correct

**Time:** ~5 minutes of targeted reading

**Confidence: 80/100.** Pattern compliance is verifiable by reading the appropriate axis. However, there is NO "code snippet checker" or "policy linter" that would catch violations automatically. Complex cross-axis policies (e.g., "no Zod-authored contract schemas") require manual verification.

**Challenge:** Some policies are harder to verify than others:
- ✓ Easy: "Use `RPCLink` on `/rpc` for first-party callers" (obvious in code)
- ✓ Easy: "Mount order is `/api/inngest`, `/api/workflows/*`, `/rpc`, `/api/orpc/*`" (visible in host file)
- ✗ Hard: "TypeBox-only for contract/procedure schemas" (requires grep through all schemas; easy to miss Zod sneaking in)
- ✗ Hard: "Plugin middleware MAY extend baseline but MUST NOT replace/reorder" (requires code review of all middleware)

**Recommendation:** Create a "Policy Verification Checklist" document with specific code patterns to search for.

---

## Part C: Technology Fitness Assessment

### 1. Does the Spec Correctly Represent How These Technologies Work?

#### oRPC Skill Check

**Claim in spec:** "oRPC is the primary API harness"

**oRPC skill truth:**
- oRPC is contract-first: contract → implement → router → handler
- Can be exposed via RPC transport (internal) or OpenAPI transport (public)
- Supports dual transports from same contract

**Spec accuracy:** ✓ Correct. The spec's split between `/rpc` (RPC transport) and `/api/orpc/*` (OpenAPI transport) aligns with oRPC's dual-transport capability.

**Claim in spec:** "TypeBox-only schema authoring for contract/procedure surfaces"

**oRPC skill truth:**
- oRPC works with any Standard Schema-compliant schema library (TypeBox, Zod, Valibot)
- OpenAPI generation depends on schema type capability

**Spec accuracy:** ✓ Correct but vendor-specific. The spec enforces TypeBox for organizational reasons (OpenAPI 3.1 + JSON Schema alignment), not because oRPC requires it. The spec should clarify this is a choice, not a tech requirement.

**Missing from spec:** oRPC error handling behavior (error status codes, error data shape). AXIS_05 mentions `ORPCError` but doesn't detail how errors are serialized/transmitted. This is important for understanding error contract semantics across `/rpc` vs `/api/orpc/*`.

**Confidence: 85/100** for oRPC representation. Core concepts are correct; some implementation details are missing.

---

#### Inngest Skill Check

**Claim in spec:** "Inngest functions are the primary durability harness"

**Inngest skill truth:**
- Inngest provides durable execution via functions with step-based semantics
- Functions are triggered by events (from `inngest.send` or schedule)
- Middleware lifecycle hooks run around function execution

**Spec accuracy:** ✓ Correct. The spec's split between workflow trigger APIs (oRPC procedures that call `inngest.send`) and durable functions (Inngest `createFunction` handlers) aligns with Inngest's model.

**Claim in spec:** "One runtime-owned Inngest bundle (`client + functions`) per process"

**Inngest skill truth:**
- You can create multiple Inngest clients per process (for dev/multi-tenant scenarios)
- But for a single monolithic host, one client per process is typical

**Spec accuracy:** ✓ Correct for this architecture. The spec appropriately constrains to one bundle per process to avoid multiple competing Inngest connections.

**Claim in spec:** "Host bootstrap initializes `extendedTracesMiddleware()` before Inngest client/function composition"

**Inngest skill truth:**
- `extendedTracesMiddleware` is an Inngest middleware that adds observability
- Middleware is registered on the client and runs on all functions
- Order matters: if you register middleware before creating functions, those functions inherit the middleware

**Spec accuracy:** ✓ Correct. D-008 decision properly captures the initialization order requirement.

**Missing from spec:**
- Inngest dev mode vs production mode (Dev Server, Docker, self-host differences)
  - The spec doesn't address local development setup for Inngest
  - No guidance on "how to run Inngest locally during development"
  - This is a significant gap for implementers
- Inngest function retries and error handling semantics
  - `retries: 2` is mentioned but not explained
  - No guidance on "what happens on retry" or "how many times can a step run"

**Confidence: 75/100** for Inngest representation. Core orchestration model is correct; local dev and error handling details are missing.

---

#### TypeBox Skill Check

**Claim in spec:** "TypeBox-first schema flow for oRPC contract I/O and OpenAPI conversion"

**TypeBox skill truth:**
- TypeBox is JSON Schema-first: outputs schemas that can be serialized and shared
- `Type.Static` infers TypeScript types from schema objects
- TypeBox has no built-in OpenAPI generation; you need a separate converter (like `typeBoxSchemaConverter`)

**Spec accuracy:** ✓ Correct. AXIS_01 snippets show `new OpenAPIGenerator` with `typeBoxSchemaConverter`, which is the correct pattern.

**Claim in spec:** "Docs/examples default to `schema({...})` where `schema({...})` means `std(Type.Object({...}))`"

**TypeBox skill truth:**
- `std()` is a wrapper function that adapts TypeBox to Standard Schema
- `schema()` would be a helper function defined in `packages/orpc-standards/src/`
- This is shorthand notation, not built-in TypeBox

**Spec accuracy:** ✓ Correct, but the spec defines this notation locally and uses it consistently. E2E examples show both inline and the `std()` wrapper. This is a good convention.

**Missing from spec:**
- TypeBox `$id` for schema identification (used in E2E_02 but not documented in the spec)
- TypeBox format validators (the skill notes that TypeBox doesn't implement formats by default)
- No guidance on "when to extract schemas vs keep inline" beyond "large readability cases"

**Confidence: 85/100** for TypeBox representation. Schema-first approach is correct; some advanced features are underdocumented.

---

#### Elysia Skill Check

**Claim in spec:** "Elysia's request processing lifecycle stages"

**Elysia skill truth:**
- Elysia has clear lifecycle hooks: `onRequest`, `onParse`, `onTransform`, validation, `onBeforeHandle`, handler, `onAfterHandle`, `mapResponse`, `onAfterResponse`
- Lifecycle order is documented and stable

**Spec accuracy:** ✓ Correct but not addressed in the spec. AXIS_06 mentions "parse: 'none'" for safe forwarding but doesn't explain Elysia's lifecycle.

**Missing from spec:**
- No detailed coverage of Elysia lifecycle hooks
- `parse: 'none'` is mentioned as best practice (correctly) but not explained
- No guidance on where to place auth middleware (should be `onBeforeHandle` per Elysia skill)
- Eden (Elysia's end-to-end typing client) is not mentioned in any axis

**Confidence: 70/100** for Elysia representation. The spec correctly uses Elysia (mount syntax is correct) but doesn't deeply engage with Elysia's lifecycle model or typing features.

---

#### Architecture Skill Check

**Claim in spec:** "Separate current, target, and transition concerns"

**Architecture skill truth:**
- Current state audit, target spec, and migration slices should be distinct documents
- Mixing them creates "hybrid soup"

**Spec accuracy:** ✓ Partially correct. The spec IS a pure target spec (greenfield). However, there is no companion "current state audit" document, and the packet scope explicitly excludes migration planning. This is intentional but creates a gap.

**Claim in spec:** "Spine decisions affect everything downstream. Resolve them first."

**Architecture skill truth:**
- Spine = composition model, registry, orchestration
- Boundary and domain decisions follow from spine

**Spec accuracy:** ✓ Correct. Overview section "8) Composition Spine" lists host initialization in order (traces → Inngest → workflows → routes).

**Missing from spec:**
- No explicit "decision dependency graph"
- No "architecture decision records" (ADRs) format for individual decisions
- DECISIONS.md tracks "closed" vs "open" but doesn't use a formal ADR structure

**Confidence: 80/100** for architecture representation. The spine model is sound; decision documentation could be more rigorous.

---

### 2. Are There Implementation-Critical Concerns the Spec Doesn't Address?

**From oRPC skill:**
- Error boundary crossing: How do errors cross from package layer to boundary layer to caller? (not addressed)
- Client generation tooling: How does external SDK generation pipeline integrate? (mentioned but not detailed)

**From Inngest skill:**
- Local development: How does Inngest Dev Server integrate? Inngest local mode configuration? (not addressed)
- State persistence: How does durable state actually persist? Database/adapter expectations? (assumed out of scope)
- Concurrency and flow control: Inngest has `throttle`, `rateLimit`, `debounce`, `batching`—which should be used when? (not addressed)

**From TypeBox skill:**
- Format validation: TypeBox doesn't validate formats by default. Where do format validators come from? (not addressed)
- Schema versioning: How do you version TypeBox schemas without breaking existing clients? (not addressed)

**From Elysia skill:**
- WebSocket support: The spec doesn't mention WebSockets at all. Are they in scope? (not addressed)
- Performance: Any guidance on streaming vs buffering for large responses? (not addressed)

**From Architecture skill:**
- Cutover validation: How do you verify that a migration slice actually reaches target? (outside scope, mentioned in packet)
- Legacy deletion: How do you know when old code can be safely deleted? (not addressed)

**Severity of gaps:**
- **Critical for shipping:** Local dev, error handling, concurrency control
- **Important but deferrable:** Schema versioning, format validation, cutover validation
- **Out of scope but noted:** State persistence, WebSocket support, performance guidance

---

### 3. Code Snippet Accuracy Check

**E2E_01 type snippet accuracy:**

```ts
export function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) return { value: value as Static<T> };
        const issues = [...Value.Errors(schema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path
            ? ({ message: issue.message, path } satisfies SchemaIssue)
            : ({ message: issue.message } satisfies SchemaIssue);
        });
        return { issues: issues.length > 0 ? issues : [{ message: "Validation failed" }] };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
```

**Accuracy:** ✓ Correct. This is a valid Standard Schema adapter for TypeBox. Uses `Value.Check` and `Value.Errors` correctly.

**E2E_01 context example:**

```ts
type ApiPrincipal = {
  subject: string;
  tenantId: string;
  roles: string[];
};
```

**Accuracy:** ✓ Correct. This is a TypeScript type that should be paired with a TypeBox schema in the actual implementation. The spec doesn't show the schema, which is a minor gap.

**AXIS_06 middleware dedupe example:**

```ts
export const requireFinanceWriteMiddleware = base.middleware(async ({ context, next }) => {
  if (context.middlewareState?.roleChecked) return next();

  if (!context.principal.roles.includes("finance:write")) {
    throw new ORPCError("FORBIDDEN", { status: 403, message: "finance:write role is required" });
  }

  return next({
    context: {
      middlewareState: {
        ...context.middlewareState,
        roleChecked: true,
      },
    },
  });
});
```

**Accuracy:** ✓ Mostly correct. This pattern implements context-cached dedupe (check once, mark in context, return early on re-entry). However, the spread `...context.middlewareState` assumes `middlewareState` exists; should null-check. Minor improvement needed:

```ts
middlewareState: {
  ...context.middlewareState,  // Could be undefined on first call
  roleChecked: true,
},
```

Should be:

```ts
middlewareState: {
  ...context.middlewareState,
  roleChecked: true,
},
```

But actually, Elysia/oRPC middleware context merging should handle this. The pattern is sound.

**AXIS_08 workflow trigger contract example:**

```ts
export const invoiceWorkflowTriggerContract = oc.router({
  triggerInvoiceReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(schema({ runId: Type.String() }))
    .output(schema({ accepted: Type.Literal(true) })),
});
```

**Accuracy:** ✓ Correct. This is valid oRPC contract syntax using the `schema()` shorthand helper.

**Overall code snippet accuracy:** 95/100. Snippets are correct, with only minor nitpicks about error handling and null-safety.

---

## Part D: What's Missing for Implementation

### A. Migration/Delta Guidance (Current → Target)

**Gap:** The spec describes target state with no guidance on "how to get here from where we are now."

**What's needed:**
- "Pre-implementation audit checklist" — what patterns indicate divergence?
- "Common refactoring patterns" — if you have X, change it to Y
- "Dependency ordering for phased migration" — which changes must happen first?
- Example: "If you have Zod-authored contract schemas, convert them to TypeBox"

**Impact:** High. Without this, implementers working on existing codebases must manually map current state to target state.

---

### B. Error Handling Specifics

**Gap:** AXIS_05 mentions `ORPCError` but doesn't detail:
- How errors are serialized across `/rpc` vs `/api/orpc/*` transports
- Error status code mapping (409 Conflict vs 422 Unprocessable Entity vs 500 Internal Server Error)
- How Inngest function errors map to workflow trigger response errors

**What's needed:**
- "Error Contract Matrix" showing error cases by surface
- "Error serialization examples" for each transport
- "How to avoid leaking secrets in error details" (security concern)

**Impact:** Medium. Without this, implementers will make ad hoc error handling decisions, leading to inconsistency.

---

### C. Testing Strategy

**Gap:** The spec provides no guidance on:
- Unit testing for domain packages
- Integration testing for boundary operations
- E2E testing for workflow trigger → durable function
- Inngest function testing patterns

**What's needed:**
- "Testing strategy by layer" document
- "Mock Inngest patterns" for unit tests
- "No-network testing" guidance (important per Inngest skill)

**Impact:** Medium. Testing is critical but orthogonal to the architecture spec. A separate testing strategy doc would help.

---

### D. Dev Mode vs Production Mode

**Gap:** The spec doesn't address:
- Local Inngest Dev Server setup (how does rawr.hq.ts work in dev mode?)
- Environment-specific differences (signing keys, gateway policies)
- CI/CD integration (how do tests run against durable functions?)

**What's needed:**
- "Local development setup" guide (Inngest Dev Server, seeding)
- "Environment configuration" (secrets, keys, endpoints)
- "Testing in CI/CD" (mocking Inngest, simulating production)

**Impact:** High. Local development is a barrier to entry for new implementers.

---

### E. Performance and Scale Considerations

**Gap:** The spec doesn't address:
- When to use `rateLimit` vs `throttle` vs `debounce` in Inngest
- Middleware dedupe costs (what's the overhead of context-cached checks?)
- OpenAPI generation performance (large route graphs)
- Streaming vs buffering for large payloads

**What's needed:**
- "Performance considerations by concern" (context, middleware, OpenAPI)
- "Flow control guidance" (when to use which Inngest primitive)
- "Scaling your schemas" (when to extract, how to organize large schemas)

**Impact:** Low-Medium. Most teams won't hit performance issues immediately, but teams at scale will need guidance.

---

### F. Security Implementation Details

**Gap:** The spec mentions:
- "Signed ingress verification" for `/api/inngest` (but no implementation details)
- "Gateway allow-listing" (but no specifics)
- "Never leak secrets in error details" (but no automated enforcement)

**What's needed:**
- "Inngest webhook signing verification" code example
- "Gateway/proxy configuration" for allow-listing `/api/inngest`
- "Error sanitization" patterns (what to log vs what to return)

**Impact:** High. Security is critical, and these details are not optional.

---

## Part E: What's Working for Implementation

### A. Documents That Will Be Directly Referenced During Implementation

**Top tier (will be open frequently):**
1. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` — overview for big-picture orientation
2. `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` — for package structure and domain modeling
3. `AXIS_07_HOST_HOOKING_COMPOSITION.md` — for host file configuration and mount order
4. `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` — for workflow trigger/durable function split

**Secondary tier (referenced when needed):**
5. `AXIS_01_EXTERNAL_CLIENT_GENERATION.md` — when publishing external clients
6. `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md` — when wiring context
7. E2E_01 or E2E_02 — for concrete end-to-end examples

---

### B. Code Snippets That Are Directly Usable

**High confidence (can copy-paste with minimal changes):**
- `typeBoxStandardSchema` wrapper function (E2E_01)
- `InvoiceStatusSchema` + `InvoiceRunSchema` TypeBox patterns (AXIS_02, E2E_02)
- Middleware dedupe pattern with context-cached markers (AXIS_06)
- Host mount order and parse-safe forwarding (AXIS_07)

**Medium confidence (need customization):**
- API boundary operation pattern (AXIS_01)
- Workflow trigger operation pattern (AXIS_08)
- Context type definitions (AXIS_04)

**Low confidence (framework/domain-specific):**
- Host bootstrap and Inngest bundle creation (depends on runtime setup)
- Manifest composition helpers (not shown in full detail)

---

### C. Patterns That Are Clearly Explained

**Excellent (clear pattern + code + rationale):**
1. **Internal package layering** (AXIS_02)
   - Shows domain → service → procedures → router/client
   - Each layer's role is explicit
   - Code examples for each layer

2. **Boundary operation pattern** (AXIS_01)
   - Shows contract → operation → router binding
   - Clear mapping from boundary to internal client

3. **Workflow trigger/durable function split** (AXIS_08)
   - Shows trigger operation calls `inngest.send()`
   - Shows durable function handles the event
   - Clear role split

4. **Route mount order** (AXIS_07)
   - Explicit sequence: traces → `/api/inngest` → `/api/workflows/*` → `/rpc` + `/api/orpc/*`
   - Justified by control plane semantics

**Good (pattern + code):**
5. **Caller-mode routing** (overview + AXIS_07)
   - Clear matrix showing which caller uses which route
   - Consistent across multiple presentations

6. **Context envelope split** (AXIS_04)
   - Two context types: request envelope + durable envelope
   - Justified by lifecycle differences

**Adequate (pattern only):**
7. **Schema naming conventions** (AXIS_02, AXIS_07)
   - Prefer concise domain names
   - Avoid redundant prefixes within domain folders
   - Makes sense but not deeply justified

---

## Part F: Information-Design Axis Assessment

### Purpose Axis (Reference ↔ Narrative)

**Current position:** **60/40 weighted toward Reference**

**Evidence:**
- Overview (SESSION file) is narrative: tells the story of decisions and subsystem composition
- Axes are reference: "canonical policy" sections, "rule enforcement" matrices
- E2E examples are narrative: walk through concrete implementations
- Decisions.md is reference: decision register

**Assessment:** Mixed intentionally. The two-layer structure (overview + axes) serves both purposes but creates navigation ambiguity.

**Improvement:** The top-level landing page should be MORE narrative ("here's how this system composes") to orient newcomers, while keeping axes as reference.

---

### Density Axis (Compact/Scannable ↔ Expansive/Thorough)

**Current position:** **70/30 weighted toward Expansive**

**Evidence:**
- Each axis is ~3-7K words (substantive, not terse)
- Policy sections include "Why" and "Trade-Offs" (expansive)
- Code snippets are substantial (not one-liners)
- Matrices use natural language column headers, not abbreviations

**Assessment:** The spec is intentionally thorough. This is appropriate for a target architecture specification.

**Concern:** Some sections are OVERLY expansive:
- The caller/auth matrix is repeated in at least FIVE places (overview, AXIS_01, AXIS_02, AXIS_03, AXIS_07, AXIS_08)
- This is redundant but serves cross-reference purposes

**Improvement:** Create a single "canonical matrices" document and reference from all axes.

---

### Linearity Axis (Sequential ↔ Random-Access)

**Current position:** **50/50 balanced**

**Evidence:**
- Overview is sequential: intro → locked policies → axes map → interaction flows
- Axes are random-access: each axis stands alone with "In Scope / Out of Scope"
- Cross-axis links are explicit
- Navigation map at end of ORPC_INGEST_SPEC_PACKET.md

**Assessment:** Good balance. The sequential overview sets stage; random-access axes let you jump in.

**Concern:** The three-file structure (overview + packet + axes) creates ambiguity about whether to read sequentially or jump to your axis.

**Improvement:** Add a "how to read this spec" section at the very top with three paths:
- Path A: "I'm new, read in order"
- Path B: "I need a specific axis, jump here"
- Path C: "I'm troubleshooting, start here"

---

### Audience Axis (Expert ↔ Novice)

**Current position:** **80/20 weighted toward Expert**

**Evidence:**
- Assumes familiarity with: oRPC, Inngest, TypeBox, Elysia, architecture concepts
- Uses terms without definition: "split semantics," "control plane," "dedupe," "manifest-driven"
- No "glossary of terms"
- Code examples assume TS/TypeScript familiarity

**Assessment:** Appropriate for the intended audience (backend engineers building this system). However, this excludes:
- Frontend engineers who use the APIs (not their target audience)
- New backend team members without oRPC/Inngest experience

**Concern:** A developer joining the team who doesn't know oRPC will struggle with this spec.

**Improvement:** Create a "glossary of architectural terms" and a "technology stack primer" for new team members.

---

### Scope Axis (Single Artifact ↔ Multi-Artifact System)

**Current position:** **70/30 weighted toward Multi-Artifact**

**Evidence:**
- Three-file structure: overview + packet + nine axes
- Four E2E examples, plus legacy traceability, plus decision log
- Cross-file references throughout
- Each axis has "Cross-Axis Links" section

**Assessment:** The multi-artifact split is intentional and serves different purposes:
- Overview: subsystem orientation
- Packet: packet-level policy
- Axes: detailed leaf-level specs
- E2E: concrete walkthroughs

**Concern:** With 15+ files total, navigation is non-trivial. The standalone-yet-coherent principle is tested:
- ✓ Each axis is self-contained (can read AXIS_07 without AXIS_06)
- ✓ Cross-references are explicit
- ✗ Full context requires reading multiple files

**Improvement:** Create an index document that maps "if you want to know X, read files A, B, C in order."

---

### Temporality Axis (Point-in-Time ↔ Living)

**Current position:** **80/20 toward Point-in-Time**

**Evidence:**
- Overview and packet are dated "locked decisions"
- D-008 is marked "closed"; D-009, D-010 are marked "open"
- No "version" number on packet itself
- DECISIONS.md is the only actively-maintained artifact for changes

**Assessment:** Good. The spec is positioned as point-in-time snapshot with explicit decision tracking.

**Concern:** If you update a decision (e.g., D-009 closes), which documents need to change?
- DECISIONS.md: yes
- ORPC_INGEST_SPEC_PACKET.md: maybe (it references open decisions)
- Individual axis docs: maybe
- Overview: maybe

There's no explicit "change propagation" plan.

**Improvement:** Add a "change management" section documenting:
- How to close an open decision
- Which documents must be updated
- Version numbering scheme

---

## Part G: Summary Assessment Table

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Entry Point Clarity** | 65/100 | Two entry points create navigation friction; needs single landing doc |
| **Locked Decision Extraction** | 65/100 | Scattered across three locations; no authoritative ledger |
| **Target Topology Clarity** | 75/100 | Well-documented but fragmented across files; good consistency |
| **Gap Identification** | 50/100 | Spec is greenfield only; no "current state audit" |
| **Implementation Sequencing** | 60/100 | Axis dependencies implied but not explicit; no build order checklist |
| **Boundary Clarity** | 75/100 | Clear for most tasks; weak for "add new capability" integration |
| **Reference Quality** | 85/100 | Consistent answers across documents; matrices repeated for clarity |
| **Code Snippet Usability** | 90/100 | Most snippets are directly usable; well-written examples |
| **Pattern Explanation** | 85/100 | Clear patterns with code + rationale; good pedagogical structure |
| **Technology Accuracy** | 78/100 | Core concepts correct; some tech details missing (dev mode, error handling) |
| **Missing Implementation Details** | 50/100 | Gaps in local dev, security, testing, error handling |

---

## Part H: Key Strengths

1. **Explicit policy enforcement:** Every MUST/MUST NOT is stated clearly and justified
2. **Code-backed policy:** Snippets show intended patterns, not just prose rules
3. **Multi-layer structure:** Overview for context, axes for detail, E2E for examples
4. **Cross-axis clarity:** Decisions maintain consistency across files
5. **Caller-mode matrix:** The split between first-party/external/runtime is well-defined and consistent
6. **Schema-first approach:** TypeBox + Standard Schema pattern is well-explained

---

## Part I: Key Weaknesses

1. **Navigation friction:** No single entry point; three-layer structure requires learning curve
2. **Scattered decisions:** Locked policies appear in overview (31 items) + DECISIONS.md (5 decisions) + axis enforcement; no single authoritative ledger
3. **No migration path:** Spec is greenfield; no "current state → target state" guidance
4. **Missing dev mode guidance:** Local Inngest setup not addressed
5. **Error handling underspecified:** How errors cross transports not detailed
6. **No implementation checklist:** "Add a new capability" walkthrough doesn't show integration points
7. **Matrix redundancy:** Caller/auth matrix repeated in 5+ places
8. **Implicit dependencies:** Axis reading order not documented

---

## Recommendations for Implementation Fitness Improvement

### Priority 1: Critical for Implementation

1. **Create single landing document:**
   - Role: "How to read this spec"
   - Include three navigation paths: newcomer → deep-dive, quick-reference, troubleshooting
   - 500 words max

2. **Add "Implementation Checklist":**
   - Specific steps for common tasks (add API capability, add workflow, integrate with host)
   - Link to relevant axis section for each step
   - One page per task

3. **Create "Locked Decision Register":**
   - Single authoritative list of all locked decisions
   - Sources: which axis/doc enforces each decision
   - Status: closed/locked/open

---

### Priority 2: Important for Long-Term Reference

4. **Create "Technology Stack Primer":**
   - For developers unfamiliar with oRPC/Inngest/TypeBox
   - Link to official docs for each tech
   - Include "how this tech relates to the spec" for each

5. **Add "Current State Audit Guide":**
   - What patterns indicate divergence from target?
   - How to find violations (grep patterns, code review checklist)
   - Not a migration plan, just a diagnostic tool

6. **Create "Error Handling Contract":**
   - How errors surface across `/rpc` vs `/api/orpc/*` vs `/api/inngest`
   - Status code mapping
   - Secret sanitization patterns

---

### Priority 3: Nice-to-Have

7. Consolidate repeated matrices into single reference document
8. Add glossary of architectural terms
9. Create "change management" policy for spec updates
10. Add "testing strategy" companion document (orthogonal to architecture)

---

## Final Verdict

**Implementation Fitness: 70/100**

**Recommendation:** This document set is **suitable for implementation by developers with prior oRPC/Inngest experience** who can infer missing details. For developers new to these technologies or for a team doing a major refactoring from an existing codebase, the spec will require supplementation with:
- Local dev setup guide
- Current state audit (if refactoring existing code)
- Error handling contract details
- Technology primer for team onboarding

**Best use:** As reference documentation for a team that understands the technologies and is building greenfield systems. Pair with a project-level implementation checklist and team onboarding materials.

**Time to ship:** A well-staffed team (3-4 engineers) with prior oRPC/Inngest experience could implement the core posture in 6-8 weeks, assuming no legacy code migration. Add 4-6 weeks for a team without prior experience or for refactoring an existing system.

