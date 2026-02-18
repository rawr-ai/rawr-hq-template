# ORPC + Inngest Workflows Specification Packet

## Scope
This directory is the canonical entrypoint for the ORPC + Inngest workflows architecture posture for this initiative. It consolidates overview authority while preserving leaf-spec policy detail in the existing axis and example corpus.

## Authority Model
1. `ARCHITECTURE.md` is the canonical integrative architecture authority.
2. `DECISIONS.md` is the canonical decision register authority.
3. Leaf policy depth remains in `axes/*.md` and implementation walkthroughs in `examples/*.md`.
4. The canonical caller/auth matrix is defined in `ARCHITECTURE.md` only; axis/example renderings are contextual views.

## Recommended Reading Order
1. `ARCHITECTURE.md` (locked posture, matrix, subsystem constraints, topology, flow contract)
2. `DECISIONS.md` (decision status, lock/open scope, source anchors)
3. Axis docs by concern:
   - `axes/01-external-client-generation.md`
   - `axes/02-internal-clients.md`
   - `axes/03-split-vs-collapse.md`
   - `axes/04-context-propagation.md`
   - `axes/05-errors-observability.md`
   - `axes/06-middleware.md`
   - `axes/07-host-composition.md`
   - `axes/08-workflow-api-boundaries.md`
   - `axes/09-durable-endpoints.md`
4. End-to-end walkthroughs:
   - `examples/e2e-01-basic-package-api.md`
   - `examples/e2e-02-api-workflows-composed.md`
   - `examples/e2e-03-microfrontend-integration.md`
   - `examples/e2e-04-context-middleware.md`

## If You Need X, Read Y
- Canonical locked subsystem posture: `ARCHITECTURE.md`
- Canonical caller/auth matrix: `ARCHITECTURE.md`
- Open vs closed decisions and decision IDs: `DECISIONS.md`
- External OpenAPI publication rules: `axes/01-external-client-generation.md`
- Internal client default and package layering: `axes/02-internal-clients.md`
- Split-vs-collapse guardrails: `axes/03-split-vs-collapse.md`
- Context envelope and propagation contract: `axes/04-context-propagation.md`
- Error/timeline observability split: `axes/05-errors-observability.md`
- Middleware placement and dedupe guidance: `axes/06-middleware.md`
- Host composition and mount order: `axes/07-host-composition.md`
- Workflow trigger boundary vs runtime ingress: `axes/08-workflow-api-boundaries.md`
- Durable endpoint additive-only constraints: `axes/09-durable-endpoints.md`

## Source Preservation Note
This directory is a clarity/authority reshape output. Policy meaning is preserved from:
- `ARCHITECTURE.md` (integrative canonical source)
- `DECISIONS.md` (decision register source)
- `../_archive/orpc-ingest-workflows-spec/session-lineage-from-ongoing/redistribution-traceability.md` (lineage/provenance map)
