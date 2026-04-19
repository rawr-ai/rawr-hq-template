## Settled facts from canon and V5

- Canon already fixes the ontology: `packages = support matter`, `services = semantic capability truth`, `plugins = runtime projection`, `apps = app identity + manifest + entrypoints`.
- Canon already fixes the shell: `app -> manifest -> role -> surface` is the stable architecture, `entrypoint -> bootgraph -> process` is downstream runtime realization, and Railway/service placement is operational mapping only.
- V5 `Executive Summary`, `Non-Negotiable Architecture Stances`, and `Tier 1/Tier 2` make service promotion a hard classification claim, not a suggestion: if code owns contracts, domain model, invariants, or write authority, it must converge to `services/*`.
- V5 `Tier 3` makes the inverse claim hard: support residue may stay in `packages/*`, but only if it does not own capability truth. That is a real enforcement boundary, not naming hygiene.
- V5 `Tier 4/Tier 5`, reinforced by canon and Guardrails Decisive, settle that plugins are projections only and that the canonical plugin tree is `plugins/<role>/<surface>/<capability>`, including `plugins/agent/tools/*`.
- V5 `Proposed App Changes` plus Guardrails Decisive settle that `hq` is one app with multiple roles. Current `apps/server`, `apps/web`, and `apps/cli` are transitional runtime homes, not enduring app identities.
- V5 `Bootgraph reservation` and `What This Does NOT Cover` are a hard negative constraint: `packages/bootgraph/` is reserved as a narrow downstream seam, but V5 does not settle bootgraph API, internals, or migration mechanics.

## Exact enforcement implications

- Service promotions. Hard requirement from V5 `Non-Negotiable`, `Tier 1`, and `Tier 2`: `coordination`, `state`, `journal`, `security`, `session-intelligence`, `agent-config-sync`, `plugin-management`, and `hq-operations` cannot be left under package/app-local classification once the slice lands. Enforcement must classify by owned truth, not consumer count or current filesystem home.
- Service promotions. Hard requirement from V5 `core split`: service handlers cannot remain in `packages/core/src/orpc/runtime-router.ts`. Enforcement must reject service implementation living in support matter, even if the router shell stays thin elsewhere.
- Service promotions. Hard requirement from V5 `support-example authority collapse`: workflow/runtime projection cannot remain a co-owner of support truth. Enforcement must require one truth owner in `services/support-example`, with any retained workflow plugin reduced to async projection only.
- Support-matter residue. Hard requirement from canon plus V5 `Tier 3`: allowed packages are only support packages and transitional residue such as `coordination-observability`, `orpc-client`, `ui-sdk`, `test-utils`, `control-plane`, `scaffold`, and reserved `bootgraph`. Enforcement must reject contracts, business invariants, policy engines, or authoritative writes under these homes.
- Support-matter residue. Hard requirement from V5 `packages/hq` breakdown: `workspace`, `install`, and `lifecycle` logic cannot remain buried in `packages/hq`; `packages/hq` is transitional residue to be decomposed and retired, not a sanctioned long-term mixed bucket.
- Support-matter residue. Hard requirement from V5 `coordination-inngest` stance: mixed async/runtime support cannot be merged wholesale into `services/coordination`. Enforcement must preserve the service-truth vs runtime-support split even before final package names are chosen.
- Plugin projection structure. Hard requirement from canon, V5 `Tier 4/Tier 5`, and Guardrails Decisive: every plugin must be role-first and surface-qualified. Enforcement must check path/tag coherence for `role`, `surface`, and `capability`, and fail legacy roots once the cutover slice claims convergence.
- Plugin projection structure. Hard requirement from V5 `plugins are projections`: plugins may depend on services and packages, but must not own capability truth, policy truth, or duplicated lifecycle/install logic. The copied `plugins/cli/plugins` lifecycle/install code is therefore an enforcement failure, not just cleanup debt.
- App/manifest/role/surface seams. Hard requirement from canon plus V5 `Proposed App Changes`: enforcement must model one `app:hq` with `role:server|async|web|cli|agent`. It must not preserve `apps/server`, `apps/web`, or `apps/cli` as target-state app identities in metadata, inventory, or policy.
- App/manifest/role/surface seams. Hard requirement from canon plus Guardrails Decisive `Manifest authority`: the manifest is upstream of entrypoints and bootgraph. Enforcement must treat `rawr.hq.ts` as composition-only target state, reject host wiring/service implementation in the manifest seam, and keep entrypoint role selection explicit.
- App/manifest/role/surface seams. Hard requirement from V5 `@rawr/cli -> @rawr/plugin-plugins dependency`: app code may compose plugins only at manifest/entrypoint/runtime-helper seams. Ad hoc direct app-to-plugin imports outside composition seams are structural violations.
- Bootgraph reservation. Hard requirement from canon and V5 reservation language: enforcement today is boundary protection, not bootgraph feature design. It must keep bootgraph downstream, process-local, and free of app identity, manifest authority, plugin discovery, or repo policy responsibilities.
- Bootgraph reservation. Hard requirement from Guardrails Decisive: shell validation must start before bootgraph internals exist. The enforceable part now is app identity, manifest ownership, role/entrypoint mapping, plugin placement, and semantic dependency direction; bootgraph dependency modeling is only required when those relations become import-invisible.

## What this lane proves

- It proves V5’s service promotions are not “maybe-service” suggestions. They are direct consequences of canon’s truth/projection/support split.
- It proves support-matter residue is enforceable as a negative boundary: packages may remain only by not owning truth.
- It proves plugin topology is not cosmetic. `role -> surface -> capability` is the structural projection model the repo must enforce.
- It proves the HQ shell is already settled enough to enforce now: one app, multiple roles, manifest upstream, entrypoints explicit, bootgraph narrow.
- It proves the bootgraph lane is currently a reservation-and-boundary lane, not an API-design lane.

## Where another lane must supply the mechanism

- The Nx guardrails lane must encode the metadata and fences: tags, `depConstraints`, path/tag coherence, `type:app` tightening, and hard-fail policy removal for current escapes.
- The graph/sync lane must supply the architecture inventory and `nx sync:check` mechanism that validates app identity, manifest ownership, role/entrypoint mapping, and plugin placement.
- The task-orchestration lane must supply `structural` targets, `targetDefaults`, `namedInputs`, `run-many`, `affected`, and CI ratchets.
- The implementation slices must supply the per-service contract design, SDK promotion, exact file moves, and the actual extraction/deduplication work.
- The future bootgraph lane must supply bootgraph API, internals, and any project-graph modeling for import-invisible boot dependencies once that becomes real.

## Open only if canon is genuinely unresolved

- Exact Nx tag names and exact `depConstraints` syntax are open. The required dimensions are not.
- Exact sync-generator or project-graph-plugin implementation is open. The need for graph-derived shell validation is not.
- Exact per-service contract surfaces and service-internal folder laws are open. Service ownership classification is not.
- Exact landing package for extracted Inngest auth support and final decomposition names around `coordination-inngest` are open.
- Exact bootgraph API, internal decomposition, and migration steps are open.
- The threshold for when runtime-specific multi-service composition should become a composed service remains open, as V2 explicitly leaves that frontier downstream.
- Nothing else in this memo is genuinely unresolved by canon plus V5.
