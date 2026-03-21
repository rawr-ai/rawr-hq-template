<proposed_plan>
## Canonical Kernel Doc Corrections

### Summary
Yes, changes are needed, but not to the locked direction. The investigation did **not** find repo or `tsdkarc` details that force a redesign of the kernel, ontology, or boot cycle.

The needed changes are narrower:
- make both docs read as **target-state canonical specs**, not as descriptions of current repo layout
- tighten the boot spec’s Arc language so `packages/bootgraph` is clearly a **RAWR derivative of Arc/`tsdkarc`**, not Arc-as-is
- normalize one semantic wording gap around service boundaries and oRPC
- remove migration/implementation-program material from the canonical boot spec body

Grounding used:
- [RAWR_App_Boot_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec.md)
- [RAWR_Future_Architecture_V2.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md)
- [rawr.hq.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/rawr.hq.ts)
- [apps/server/src/rawr.ts](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/apps/server/src/rawr.ts)
- [docs/SYSTEM.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/SYSTEM.md)
- [docs/system/PLUGINS.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/system/PLUGINS.md)
- https://arc.tsdk.dev/docs
- https://raw.githubusercontent.com/tsdk-monorepo/tsdkarc/main/src/index.ts
- https://raw.githubusercontent.com/tsdk-monorepo/tsdkarc/main/README.md

### Changes Needed
For [RAWR_App_Boot_Spec.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec.md):
- Rephrase all Arc references so the doc says `bootgraph` is a RAWR package that vendors/ports useful `tsdkarc` core and then narrows/patches it.
- Explicitly mark `BootModuleKey`, `RoleBootManifest`, `processModules`, `roleModules`, `defineBootModule`, `startBootGraph`, and `dedupeBootModules` as **RAWR target bootgraph interfaces**, not Arc-native APIs.
- Normalize the service posture wording so services remain transport-neutral semantic boundaries, with oRPC described as the default local-first callable harness rather than part of service identity.
- Add one short invariant that hosts/entrypoints may apply **mount-time runtime augmentation** around manifest-owned bundles without taking over manifest authority.
- Soften service package examples that currently imply one exact package/export shape if those examples are only illustrative.
- Re-label `apps/hq/*`, `apps/hq/rawr.hq.ts`, `packages/bootgraph`, and role-first plugin paths as **target-state topology**, not current repo fact.
- Remove the canonical-body migration/implementation sections:
  - `Required implementation work`
  - `Minimum test surface` should stay only if reframed as target acceptance criteria
  - `Source basis and operational references` should move out unless reduced to a short note

For [RAWR_Future_Architecture_V2.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md):
- Keep the architecture direction unchanged.
- Reword `Arc-derived` so it cannot be read as “Arc already has RAWR’s public bootgraph model.”
- Add one short clarification that bootgraph lifetime/identity semantics are RAWR policy layered on Arc core lifecycle ideas.
- Re-label `apps/hq/*` and the role-first plugin tree as destination-state organization rather than current repo convention.
- Tighten provisional/meta language so the doc reads as fully canonical, not as an in-flight shell.
- Remove or demote open-program / pressure-test / sequencing language that does not belong in a canonical destination doc.

### Implementation Plan
1. Create the required research workspace under `context/`, including an orchestrator scratchpad, `team/` directory, one subdirectory and scratchpad per agent, and a verbatim copy of this plan.
2. Edit the boot spec first, because it carries the most precision drift.
3. Apply the Arc/bootgraph wording corrections, service-boundary wording correction, host-augmentation clarification, and target-state-vs-current-layout wording pass.
4. Remove migration/implementation content from the canonical boot spec body and preserve it separately as temporary migration notes or a follow-on implementation artifact.
5. Edit V2 second with the lighter wording pass so it stays aligned with the boot spec and reads as canonical shell architecture.
6. Run a final cross-doc consistency pass to ensure both docs agree on:
   - service boundary semantics
   - manifest vs entrypoint vs bootgraph authority
   - target-state topology wording
   - workflow exposure vs execution split
7. Validate the resulting docs with lightweight repo checks and targeted searches.

### Test Plan
- Search both docs for `Arc-derived`, `tsdkarc`, `BootModuleKey`, `startBootGraph`, `defineBootModule`, `processModules`, `roleModules`, `Required implementation work`, `pressure-test`, and `not the final word` to confirm the wording cleanup landed.
- Re-run manifest/documentation-adjacent checks:
  - `bun scripts/phase-a/manifest-smoke.mjs`
  - `bunx vitest run --project server apps/server/test/rawr.test.ts`
- Manual review scenarios:
  - reader can understand the target kernel without inferring current repo layout is already in final form
  - reader cannot mistake Arc for already exposing the RAWR bootgraph API
  - reader sees services as transport-neutral semantic boundaries with local-first oRPC harness, not as “oRPC-is-the-service”
  - reader sees manifest authority and host mount-time augmentation as distinct, compatible responsibilities

### Assumptions
- The locked architecture direction is correct and will not be renegotiated in this pass.
- Current repo layout is transitional and does not by itself justify changing the canonical target.
- Role-first plugin organization and `apps/hq/*` remain valid target-state expressions unless implementation later proves otherwise.
- Migration notes do not belong in the canonical docs and will be split into separate artifacts.
</proposed_plan>
