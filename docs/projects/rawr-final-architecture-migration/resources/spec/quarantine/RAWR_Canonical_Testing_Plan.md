# RAWR Canonical Testing Plan

Status: supporting testing guidance, subordinate to the final architecture and runtime realization specs.

This document defines the canonical testing system for RAWR HQ and later apps built on the same shell.
It is normative only for test/proof design after the target architecture has been established by:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/`

This testing plan does not define target architecture, package layout, migration scope, or M2 sequencing. If it conflicts with the final architecture/runtime specs or the regenerated M2 migration plan, those documents win.

## 1. Objectives and Invariants

### 1.1 Mechanical enforcement direction

RAWR testing exists to make the architecture mechanically enforceable.
The enforcement direction is:

```text
canon -> graph -> proof -> ratchet
```

Where:
- **canon** fixes nouns and authority seams
- the **Nx graph** encodes those seams as kind/app/role/surface/capability law
- **proof** (lint, structural checks, and tests) proves what the graph cannot
- **ratchet** means every new seam ships with a non-optional proof that stays in place going forward

### 1.2 Placement invariance

The architecture is allowed to change placement.
It is not allowed to corrupt meaning.

Testing MUST prefer placement-invariant harnesses by default (in-process and contract-driven tests) and use network/browser tests only when the behavior is inherently boundary-defined.

### 1.3 Ontology and authority invariants (testing must preserve)

Testing MUST preserve the canonical ontology and authority laws:

- `services/` own **semantic capability truth**
- `plugins/` own **runtime projection** (surface adapters and boundary contracts)
- `apps/` own **composition authority** (manifest selection and entrypoints)
- harnesses consume booted resources and mounted surfaces; harnesses MUST NOT define the ontology

### 1.4 Bootgraph invariants (support/runtime)

Testing MUST preserve bootgraph and process-runtime invariants:

- lifetimes are only `process` and `role` (no cross-process lifetime fiction)
- lifecycle guarantees must hold:
  - dependency-first startup
  - canonical identity dedupe
  - fatal startup on failure
  - rollback of successfully started modules if later startup fails
  - reverse-order shutdown
  - typed context assembly for both process and role resources
- raw Effect vocabulary MUST remain quarantined inside support/runtime layers
  - public author-facing surfaces MUST NOT expose raw Effect primitives

### 1.5 Agent/shell trust boundary invariants

Testing MUST preserve the agent/shell trust boundary:

```text
broad read
narrow write
no direct governed repo mutation
selected special actions only by policy
```

Durable governed work MUST be delegated to the async steward plane. The shell is not the devplane.

## 2. Test Taxonomy Mapped to the Ontology

This section defines “who owns what tests” and what each layer is allowed to claim.

### 2.1 `services/*` (semantic truth)

Primary tests:
- Unit tests for domain invariants, mapping logic, and deterministic error branches.
- In-process integration tests proving service procedures behave correctly under a trusted context.

Must prove:
- semantic correctness and stability of the capability truth
- invariants that downstream projections depend on

Must not prove:
- route-family policy or publication constraints (that belongs at boundary layers)

### 2.2 `packages/*` (support matter, runtime substrate, shared tooling)

Primary tests:
- Lifecycle and substrate behavioral guarantees (bootgraph/process runtime fault-injection tests).
- API-surface quarantine proofs (no raw Effect primitives leak into public exports).
- Determinism and stability for core infrastructure utilities.

Must prove:
- bootgraph and process-runtime guarantees (ordering, rollback, shutdown)
- quarantine boundaries (Effect stays internal)

Must not prove:
- domain semantics (belongs in services)

### 2.3 `plugins/*` (runtime projections and boundary contracts)

Primary tests:
- Boundary policy and surface-specific behavior (route-family policy, publication constraints, ingress security posture).
- Adapter correctness: projection does not become a truth owner; it binds and exposes.

Must prove:
- route-family behavior and forbidden routes (negative assertions)
- boundary error shapes and publication behavior

Must not prove:
- full business correctness of the capability truth (belongs in services)

### 2.4 `apps/*` (composition authority and entrypoints)

Primary tests:
- Composition proofs (manifest purity, entrypoint thinness, canonical role/surface selection).
- Minimal end-to-end smoke of composed roles (only enough to prove the stack is real).

Must prove:
- app manifest is composition-only
- entrypoints are thin (delegate to runtime compiler/bootgraph/process runtime/harness)

Must not prove:
- capability-level truth (belongs in services)

## 3. Harness Selection Matrix (Correct Boundary per Claim)

The same capability can be realized across multiple output shapes without changing what it means.
Testing MUST select harnesses based on caller mode and route family. Tests MUST NOT blur planes.

### 3.1 Canonical harnesses (by purpose)

| Harness | What it is for | What it must prove | What it must not prove |
| --- | --- | --- | --- |
| In-process (`createRouterClient`) | Deterministic server-internal behavior | semantic correctness under trusted context; middleware effects that are internal | HTTP routing/mount correctness; published OpenAPI behavior; durability ingress semantics |
| First-party boundary (`RPCLink` on `/rpc`) | First-party caller boundary semantics | session/auth expectations; internal-only route behavior | published API guarantees; runtime-ingress guarantees |
| Published boundary (`OpenAPILink` on `/api/orpc/*` and `/api/workflows/<capability>/*`) | External/third-party contract behavior | OpenAPI-facing I/O contracts; publication constraints | internal-only guarantees; runtime-ingress semantics |
| Runtime ingress (`/api/inngest`) | Signed runtime callback traffic only | signature verification; durable lifecycle transitions; ingress hardening | caller-boundary contract semantics; internal-first-party semantics |
| Browser E2E (Playwright) | Real web surface behavior | a small number of golden flows; browser-visible policy compliance | broad coverage of domain logic already proven in-process |
| Exploratory automation (Stagehand) | Discovery and evals only | exploratory evidence, flow discovery, non-blocking signals | merge gating; canonical pass/fail truth |

### 3.2 Mandatory negative assertions (non-optional)

These are architectural tests, not convenience tests.

Caller planes:
- Browser/first-party callers MUST NOT use runtime-ingress routes (`/api/inngest`).
- External/third-party callers MUST NOT use internal-only routes (`/rpc`).
- Runtime-ingress verification MUST NOT claim caller-boundary guarantees for `/rpc` or published OpenAPI routes.

In-process plane:
- In-process suites MUST NOT default to local HTTP self-calls for ordinary server-internal verification.

## 4. Runner Boundary Contract (Prevent Test-System Drift)

Runner boundaries are part of the architecture. They prevent false confidence and flake.

### 4.1 Canonical runners

- **Vitest**: unit + in-process integration + executable policy/proof-band tests.
- **Bun scripts**: AST/graph proofs and structural ratchets (`scripts/phase-*`).
- **Playwright**: deterministic browser E2E only (merge gating allowed only for a small smoke + policy suite).
- **Stagehand**: exploratory/evals only (never merge-gating).

### 4.2 Directory conventions (enforced by convention + tooling)

These conventions are mandatory to keep runners from colliding:

- Vitest tests live under: `*/test/**/*.test.ts(x)` and `*/test/**/*.spec.ts(x)`
- Playwright tests live under: `*/e2e/**/*.spec.ts` (never under `test/`)
- Stagehand assets live under: `*/stagehand/**` (automation/evals; not “tests”)

If a runner needs additional patterns, add a new dedicated directory rather than expanding `test/**` globs.

## 5. Canonical Lanes (What blocks merges vs what runs nightly)

The canonical suite is a portfolio of lanes. Not everything is “unit tests”, and not everything should block merges.

### 5.1 Lane definitions

**Lane A: Graph Law (fast, gating)**
- Nx dependency constraints, tags, and structural suites that encode ontology law.
- Canonical anchor: `nx run <project>:structural`

**Lane B: Proof Band (fast, gating)**
- AST scripts + targeted policy tests proving what the graph cannot:
  - manifest purity
  - entrypoint thinness
  - harness/route negative assertions
  - Effect quarantine surface checks
  - agent/shell authority boundary proofs
- Canonical anchors: `bun run phase-*:gate:*`, `bun run phase-*:gates:*`

**Lane C: Behavioral Guarantees (gating for support/runtime layers)**
- bootgraph/process runtime fault-injection tests proving lifecycle guarantees (rollback, reverse shutdown, dedupe).
- These tests are expected to be deterministic and fast enough to gate merges for runtime realization packages, runtime compiler/process runtime packages, and any harness adapters they power.

**Lane D: Boundary/Network (selective gating)**
- Only for claims that are boundary-defined (auth/publication/route-prefix semantics).
- Keep this lane small and explicit.

**Lane E: Browser E2E (small gating, larger nightly)**
- PR gating: 1–5 Playwright smokes + route-family policy assertions from the browser POV.
- Nightly: expanded Playwright flows, device/browsers, optional visual diffs (if adopted).

**Lane F: Stagehand (nightly/manual, non-gating)**
- Exploratory automation and evals; non-blocking signals only.
- Stagehand output is evidence; it is not canonical pass/fail truth.

### 5.2 Canonical command anchors (repo contract)

Root Vitest suite:
- `bun run test:quick` (fast loop; no build gate)
- `bun run test` (full canonical test entrypoint)

Proof-band / ratchet suites:
- `bunx nx run <project>:structural`
- `bun scripts/phase-03/run-structural-suite.mjs --project <project> [--suite <suite>]`
- `bun run phase-a:gates:baseline` (and other `phase-*` aggregations)

Web-specific:
- `bun run test:web` (Vitest web project)

When Playwright is introduced:
- it MUST be exposed as an Nx target (for example `nx run @rawr/web:e2e`) and a root script (for example `bun run test:e2e:web`), and it MUST NOT be coupled into `bun run test:vitest`.

Stagehand:
- MUST NOT run in the default `test` entrypoint.

## 6. Proof Band Patterns (When to use AST proofs vs executable tests)

### 6.1 Prefer structural proofs when the claim is about architecture law

Use AST/structural scripts for:
- manifest purity and entrypoint thinness
- import boundary and ownership direction
- forbidden legacy key usage and other “must not appear” contracts
- public API surface quarantine checks (e.g., no raw Effect export leakage)

### 6.2 Prefer executable tests when the claim is a behavioral guarantee

Use executable tests for:
- bootgraph lifecycle behavior (rollback and shutdown ordering)
- signature verification and ingress hardening that must be exercised at runtime
- middleware behavior that depends on execution-time composition

## 7. Risk-Prioritized Coverage (What matters most)

Testing effort MUST be risk-proportional.

Highest priority (always-on gating):
- Graph law and import direction (prevents entire classes of architectural bugs).
- Proof-band ratchets for manifest purity and entrypoint thinness.
- Route-family negative assertions and runtime ingress hardening.
- Support/runtime lifecycle guarantees (bootgraph/process runtime).
- Agent/shell trust boundary negative proofs (no direct governed mutation).

Lower priority (nightly or selective):
- Broad boundary/network suites beyond what is required to prove policy.
- Large browser E2E suites (keep gating minimal; expand nightly).
- Stagehand evals and exploratory runs (never gating).

## 8. “Add a Capability” Checklist (Decision-Complete)

This checklist is mandatory when adding a new capability, surface, or seam.

### 8.1 When adding a new service capability (`services/<capability>`)

You MUST:
1. Add unit tests proving domain invariants and deterministic error branches.
2. Add in-process integration tests using `createRouterClient` (trusted context), proving semantic behavior without HTTP.
3. Add any required shared fixtures in a package-first location (service-local test helpers or `packages/test-utils` for generic helpers).

You MUST NOT:
- create a new plugin-like boundary contract under services
- test published-route behavior from inside service tests

### 8.2 When adding a new runtime projection (`plugins/<role>/<surface>/<capability>`)

You MUST:
1. Add boundary tests for the projection’s route-family behavior and publication constraints.
2. Add mandatory negative-route assertions for forbidden planes (caller vs ingress).
3. Add or extend proof-band checks if the projection introduces a new seam or a new category of forbidden drift.

You MUST NOT:
- pull semantic truth into the plugin
- make plugin tests depend on app runtime modules in the reverse direction (package tests must not depend on plugins)

### 8.3 When changing manifests or entrypoints (`apps/*`)

You MUST:
1. Update/extend manifest purity proofs if composition shape changes.
2. Update/extend entrypoint thinness proofs if entrypoint wiring changes.
3. If a new role/surface is introduced, add the smallest possible smoke proof that the composed stack is real.

You MUST NOT:
- embed runtime realization logic in a manifest
- embed business logic in an entrypoint

### 8.4 When adding new route-family behavior

You MUST:
1. Add explicit positive and negative assertions for route-family behavior.
2. Update the harness/policy enforcement so coverage is mechanically tracked (suite IDs and assertion keys).

### 8.5 Ratchet rule (“enough evidence”)

A seam change is not complete until it is mechanically verifiable.

“Enough evidence” means:
- at least one proof-band check (structural or executable) that would fail if the seam regressed
- the proof is wired into the relevant structural suite and/or gating lane
- the proof is deterministic and not dependent on exploratory tooling
