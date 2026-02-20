# ORPC + Inngest Workflows Specification Packet

## Scope
This directory is the canonical packet for ORPC + Inngest workflow architecture posture in this initiative. It keeps one integrative policy source while preserving leaf-policy depth and reference examples.

## Canonical Source of Truth (Read First)
1. `ARCHITECTURE.md` — **normative integrative architecture policy** (caller/auth matrix, invariants, cross-axis contract).
2. `DECISIONS.md` — **normative decision register** (locked/open decision status and decision-level authority).
3. `axes/*.md` — **normative leaf policy slices by concern**.
4. `examples/*.md` — **reference walkthroughs** (implementation-shaped examples, not policy authority).
5. `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` — **implementation-adjacent downstream update contract** (execution directives for later docs/runbook/testing updates).
6. `CANONICAL_EXPANSION_NAV.md` — **concern-based expansion index** for D-013/D-014/D-015/D-016 routing.

The canonical caller/auth matrix is defined in `ARCHITECTURE.md` only; matrix variants in leaf docs are contextual views.

## If You Need X, Read Y
- Canonical locked subsystem posture and caller/auth matrix: `ARCHITECTURE.md`
- Open vs closed decisions and decision IDs: `DECISIONS.md`
- D-013 runtime metadata simplification obligations: `axes/10-legacy-metadata-and-lifecycle-simplification.md`
- D-014 core infrastructure packaging/composition guarantees: `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
- D-015 testing harness and downstream update contract: `axes/12-testing-harness-and-verification-strategy.md`, `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
- D-016 distribution default and instance lifecycle boundary: `axes/13-distribution-and-instance-lifecycle-model.md`
- External OpenAPI publication rules: `axes/01-external-client-generation.md`
- Internal client default and package layering: `axes/02-internal-clients.md`
- Split-vs-collapse guardrails: `axes/03-split-vs-collapse.md`
- Context envelope and propagation contract: `axes/04-context-propagation.md`
- Error/timeline observability split: `axes/05-errors-observability.md`
- Middleware placement and dedupe guidance: `axes/06-middleware.md`
- Host composition and mount order: `axes/07-host-composition.md`
- Workflow trigger boundary vs runtime ingress: `axes/08-workflow-api-boundaries.md`
- Durable endpoint additive-only constraints: `axes/09-durable-endpoints.md`

## Axis Index (Normative Leaf Policy)
1. `axes/01-external-client-generation.md`
2. `axes/02-internal-clients.md`
3. `axes/03-split-vs-collapse.md`
4. `axes/04-context-propagation.md`
5. `axes/05-errors-observability.md`
6. `axes/06-middleware.md`
7. `axes/07-host-composition.md`
8. `axes/08-workflow-api-boundaries.md`
9. `axes/09-durable-endpoints.md`
10. `axes/10-legacy-metadata-and-lifecycle-simplification.md`
11. `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
12. `axes/12-testing-harness-and-verification-strategy.md`
13. `axes/13-distribution-and-instance-lifecycle-model.md`

## Reference Walkthroughs (Non-Normative)
1. `examples/e2e-01-basic-package-api.md`
2. `examples/e2e-02-api-workflows-composed.md`
3. `examples/e2e-03-microfrontend-integration.md`
4. `examples/e2e-04-context-middleware.md`

## Source Preservation Note
This packet is a clarity/authority reshape. Policy meaning is preserved from:
- `ARCHITECTURE.md` (integrative canonical source)
- `DECISIONS.md` (decision register source)
- `../_archive/orpc-ingest-workflows-spec/session-lineage-from-ongoing/redistribution-traceability.md` (lineage/provenance map)
