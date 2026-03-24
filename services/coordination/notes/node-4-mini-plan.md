# Node 4 Coordination Mini-Plan

0. Audit and classify every owned seam before moving code:
   - mark each current file as service truth, plugin/runtime projection, or temporary residue
   - specifically remove route metadata and transport-shaped contract concerns from the service design
   - keep a running list of non-owned imports that force temporary compatibility shims

1. Move authoritative service assembly under `src/service/*`:
   - preserve the already-added `src/service/base.ts`
   - preserve the already-added `src/service/contract.ts`
   - preserve the already-added `src/service/impl.ts`
   - preserve the already-added `src/service/router.ts`
   - keep package root as thin `index.ts` / `router.ts` / `client.ts`

2. Pull semantic capability truth into the service:
   - keep workflow/run types, schemas, ids, graph, validation, and node storage in service
   - move lifecycle event/status contract into `services/coordination/src/events.ts` and keep plugin event-id/timestamp helpers in the workflow plugin
   - define service dependency ports for queueing and other runtime-only effects without importing runtime context or transport metadata
   - keep the service contract transport-free: no route metadata, no HTTP/request/runtime context, no transport-shaped wrappers

3. Make the plugin layer the runtime projection boundary:
   - make plugin contract/projected router own route metadata and transport wrapping
   - keep API transport wrapping under `plugins/api/coordination`
   - keep Inngest execution wiring, trace-link composition, and workflow-kit/browser projection helpers under `plugins/workflows/coordination`
   - adapt runtime context to the service client in plugin surfaces, not in the service package

4. Reduce leftover packages to obvious residue only:
   - delete residue packages once the proofs and callers move to canonical service/plugin homes
   - do not leave temporary package names as the authority for coordination semantics

5. Verify only owned work:
   - run coordination service build/typecheck/test
   - run plugin lint/structural checks
   - report remaining fallout outside ownership, especially the runtime assembly seam in host/server and the later state-package follow-on
