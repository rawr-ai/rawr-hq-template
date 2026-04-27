# Phase 4 Testing Plan Semantic Diff Verification

- Document: `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md`
- Ontology graph: `rawr-core-architecture-layered-graph`
- Aligned findings: `116`
- Stale/forbidden findings: `0`
- Candidate-new findings: `0`
- Review-needed findings: `36`
- Underrepresented gates: `14`

## Verdict

The testing plan aligns with core ontology language, but several validation gates are underrepresented and should be reviewed before migration planning.

## Stale Or Forbidden Findings

None.

## Candidate-New Findings

None.

## Review-Needed Normative Claims

- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:6` `normative testing claim did not resolve to ontology entity` - It is normative only for test/proof design after the target architecture has been established by:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:22` `normative testing claim did not resolve to ontology entity` - canon -> graph -> proof -> ratchet
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:28` `normative testing claim did not resolve to ontology entity` - - **proof** (lint, structural checks, and tests) proves what the graph cannot
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:29` `normative testing claim did not resolve to ontology entity` - - **ratchet** means every new seam ships with a non-optional proof that stays in place going forward
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:40` `normative testing claim did not resolve to ontology entity` - Testing MUST preserve the canonical ontology and authority laws:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:52` `normative testing claim did not resolve to ontology entity` - - lifecycle guarantees must hold:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:54` `normative testing claim did not resolve to ontology entity` - - canonical identity dedupe
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:59` `normative testing claim did not resolve to ontology entity` - - raw Effect vocabulary MUST remain quarantined inside support/runtime layers
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:60` `normative testing claim did not resolve to ontology entity` - - public author-facing surfaces MUST NOT expose raw Effect primitives
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:123` `normative testing claim did not resolve to ontology entity` - - Minimal end-to-end smoke of composed roles (only enough to prove the stack is real).
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:135` `normative testing claim did not resolve to ontology entity` - Testing MUST select harnesses based on caller mode and route family. Tests MUST NOT blur planes.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:146` `normative testing claim did not resolve to ontology entity` - | Exploratory automation (Stagehand) | Discovery and evals only | exploratory evidence, flow discovery, non-blocking signals | merge gating; canonical pass/fail truth |
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:153` `normative testing claim did not resolve to ontology entity` - - Browser/first-party callers MUST NOT use runtime-ingress routes (`/api/inngest`).
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:154` `normative testing claim did not resolve to ontology entity` - - External/third-party callers MUST NOT use internal-only routes (`/rpc`).
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:155` `normative testing claim did not resolve to ontology entity` - - Runtime-ingress verification MUST NOT claim caller-boundary guarantees for `/rpc` or published OpenAPI routes.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:183` `normative testing claim did not resolve to ontology entity` - The canonical suite is a portfolio of lanes. Not everything is “unit tests”, and not everything should block merges.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:198` `normative testing claim did not resolve to ontology entity` - - Canonical anchors: `bun run phase-*:gate:*`, `bun run phase-*:gates:*`
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:214` `normative testing claim did not resolve to ontology entity` - - Stagehand output is evidence; it is not canonical pass/fail truth.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:219` `normative testing claim did not resolve to ontology entity` - - `bun run test:quick` (fast loop; no build gate)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:222` `normative testing claim did not resolve to ontology entity` - Proof-band / ratchet suites:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:231` `normative testing claim did not resolve to ontology entity` - - it MUST be exposed as an Nx target (for example `nx run @rawr/web:e2e`) and a root script (for example `bun run test:e2e:web`), and it MUST NOT be coupled into `bun run test:vitest`.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:243` `normative testing claim did not resolve to ontology entity` - - forbidden legacy key usage and other “must not appear” contracts
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:250` `normative testing claim did not resolve to ontology entity` - - signature verification and ingress hardening that must be exercised at runtime
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:255` `normative testing claim did not resolve to ontology entity` - Testing effort MUST be risk-proportional.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:265` `normative testing claim did not resolve to ontology entity` - - Broad boundary/network suites beyond what is required to prove policy.
- ... 11 more omitted from this summary; see `document-diff.json` in the run output.

## Underrepresented Gates

- `gate.binding-cache`: binding cache gate - validation gate not directly represented in testing plan terminology
- `gate.catalog-emission`: catalog emission gate - validation gate not directly represented in testing plan terminology
- `gate.classifier-operational-consequence`: classifier operational consequence gate - validation gate not directly represented in testing plan terminology
- `gate.controlled-predicate`: controlled predicate gate - validation gate not directly represented in testing plan terminology
- `gate.forbidden-term-not-canonical`: forbidden term not canonical gate - validation gate not directly represented in testing plan terminology
- `gate.import-safety`: import safety gate - validation gate not directly represented in testing plan terminology
- `gate.projection-classification`: projection classification gate - validation gate not directly represented in testing plan terminology
- `gate.provider-coverage`: provider coverage gate - validation gate not directly represented in testing plan terminology
- `gate.provider-dependency-closure`: provider dependency closure gate - validation gate not directly represented in testing plan terminology
- `gate.public-sdk-import-surface`: public SDK import surface gate - validation gate not directly represented in testing plan terminology
- `gate.relation-endpoint-resolution`: relation endpoint resolution gate - validation gate not directly represented in testing plan terminology
- `gate.review-promotion-required`: review promotion required gate - validation gate not directly represented in testing plan terminology
- `gate.runtime-access-boundary`: runtime access boundary gate - validation gate not directly represented in testing plan terminology
- `gate.source-ref-required`: source reference required gate - validation gate not directly represented in testing plan terminology

## Representative Aligned Findings

- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:5` `core.root.apps` - This document defines the canonical testing system for RAWR HQ and later apps built on the same shell.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:8` `authority.doc.canonical-architecture-spec` - - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:8` `core.root.resources` - - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:9` `authority.doc.effect-runtime-realization-spec` - - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:9` `core.root.resources` - - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:12` `core.kind.package` - This testing plan does not define target architecture, package layout, migration scope, or M2 sequencing. If it conflicts with the final architecture/runtime specs or the regenerated M2 migration plan, those documents win.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:12` `core.lane.scope` - This testing plan does not define target architecture, package layout, migration scope, or M2 sequencing. If it conflicts with the final architecture/runtime specs or the regenerated M2 migration plan, those documents win.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:27` `core.kind.role` - - the **Nx graph** encodes those seams as kind/app/role/surface/capability law
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:27` `core.kind.surface` - - the **Nx graph** encodes those seams as kind/app/role/surface/capability law
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:36` `runtime.machine.process` - Testing MUST prefer placement-invariant harnesses by default (in-process and contract-driven tests) and use network/browser tests only when the behavior is inherently boundary-defined.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:42` `core.root.services` - - `services/` own **semantic capability truth**
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:43` `core.kind.surface` - - `plugins/` own **runtime projection** (surface adapters and boundary contracts)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:43` `core.root.plugins` - - `plugins/` own **runtime projection** (surface adapters and boundary contracts)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:44` `core.kind.app-composition` - - `apps/` own **composition authority** (manifest selection and entrypoints)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:44` `core.root.apps` - - `apps/` own **composition authority** (manifest selection and entrypoints)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:44` `runtime.phase.selection` - - `apps/` own **composition authority** (manifest selection and entrypoints)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:45` `core.root.resources` - - harnesses consume booted resources and mounted surfaces; harnesses MUST NOT define the ontology
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:47` `runtime.machine.bootgraph` - ### 1.4 Bootgraph invariants (support/runtime)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:49` `runtime.machine.bootgraph` - Testing MUST preserve bootgraph and process-runtime invariants:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:49` `runtime.machine.process` - Testing MUST preserve bootgraph and process-runtime invariants:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:51` `core.kind.role` - - lifetimes are only `process` and `role` (no cross-process lifetime fiction)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:51` `runtime.machine.process` - - lifetimes are only `process` and `role` (no cross-process lifetime fiction)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:58` `core.kind.role` - - typed context assembly for both process and role resources
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:58` `core.root.resources` - - typed context assembly for both process and role resources
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:58` `runtime.machine.process` - - typed context assembly for both process and role resources
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:62` `core.role.agent` - ### 1.5 Agent/shell trust boundary invariants
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:64` `core.role.agent` - Testing MUST preserve the agent/shell trust boundary:
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:73` `core.role.async` - Durable governed work MUST be delegated to the async steward plane. The shell is not the devplane.
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:79` `core.root.services` - ### 2.1 `services/*` (semantic truth)
- `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md:83` `core.kind.service` - - In-process integration tests proving service procedures behave correctly under a trusted context.
- ... 50 more omitted from this summary; see `document-diff.json` in the run output.
