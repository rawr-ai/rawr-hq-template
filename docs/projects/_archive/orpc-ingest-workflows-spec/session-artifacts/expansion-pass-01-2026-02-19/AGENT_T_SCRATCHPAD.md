# AGENT_T_SCRATCHPAD

## Drift lock
- Preserve D-005..D-012 semantics.
- No runtime code changes.
- No process/runbook/testing doc edits outside packet.
- Testing-harness additions must be additive and D-015-ready.

## Canonical findings to carry into edits
1. Route/caller split is already stable and repeated across packet:
   - first-party default: `RPCLink` on `/rpc`
   - external publication: `OpenAPILink` on `/api/orpc/*` and `/api/workflows/<capability>/*`
   - runtime ingress only: `/api/inngest`
2. Existing docs define middleware and observability semantics but do not centralize a reusable testing harness model.
3. E2E-04 has rich runtime/context detail and is the right place for concrete verification blueprints.
4. Archive `LEGACY_TESTING_SYNC.md` reinforces need for manifest-first route verification and CI policy checks.

## Decisions for this pass
1. Create new Axis 12 as canonical testing authority (instead of scattering test policy across older axes).
2. Keep Axis 05 and Axis 06 focused on their current semantics; add only targeted testing contracts + cross-links.
3. Add route-forbidden negative-test language explicitly in canonical docs to prevent implicit `/api/inngest` caller drift.
4. Capture downstream update directives in a dedicated packet doc (`IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`) so no external docs are edited now.

## D-015-ready lock intent (draft)
- The packet must define a canonical testing harness matrix and layered verification boundaries tied to caller modes and route families.
- Downstream docs/runbooks/testing references must align to that matrix.
- `/api/inngest` is runtime ingress verification only; no caller harness treats it as a public caller API.
