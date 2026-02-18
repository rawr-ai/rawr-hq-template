# SESSION_019c587a Agent B D-005 Stability Plan

## Scope
- Mission scope is limited to walkthrough stabilization for examples only.
- Editable files:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

## Preconditions Completed
- Required skills loaded and applied for posture checks:
  - `architecture`
  - `orpc`
  - `inngest`
  - `elysia`
  - `typebox`
  - `typescript`
  - `docs-architecture`
- Full packet + posture corpus read before edits:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_D005_HOSTING_COMPOSITION_COHESIVE_RECOMMENDATION.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`

## Locked D-005 Targets
- Canonical host mount and manifest posture:
  - Capability-first workflow trigger mounts on `/api/workflows/<capability>/*`.
  - Runtime ingress remains `/api/inngest` only.
  - Canonical manifest key is `rawrHqManifest.workflows.triggerRouter`.
- Stabilization requirements:
  - Replace all stale `rawrHqManifest.workflows.router` references with `rawrHqManifest.workflows.triggerRouter`.
  - Remove or align stale unresolved text that contradicts locked D-005 posture.
  - Remove wording that implies `/api/inngest` is caller-facing.
  - Preserve content depth and walkthrough comprehensiveness.

## Execution Plan
1. Gate first:
- Write a comprehension checkpoint to `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D005_STABILITY_B_SCRATCHPAD.md` before examples edits.

2. Targeted stabilization in each example:
- Normalize manifest router references to `rawrHqManifest.workflows.triggerRouter`.
- Align mount snippets and prose with capability-first D-005 composition language.
- Remove any caller-facing interpretation of `/api/inngest`; keep ingress-runtime wording only.
- Keep all major sections, diagrams, sequence narratives, and checklist depth.

3. Coverage recording:
- Update `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D005_WALKTHROUGH_COVERAGE.yaml` with:
  - file-level fixes,
  - requirement mapping,
  - unresolved-item handling decisions,
  - evidence anchors.

4. Verification pass:
- Run string checks for stale keys and ingress wording.
- Review diffs to confirm examples-only changes plus required artifacts.

## Verification Commands
- `rg -n "rawrHqManifest\.workflows\.router" /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples`
- `rg -n "caller(-| )facing|browser.*?/api/inngest|external.*?/api/inngest" /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples`
- `git -C /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal status -sb`
- `git -C /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal diff --stat`

## Non-Goals
- No runtime source-code implementation changes under `apps/`, `packages/`, or `plugins/` outside walkthrough docs.
- No decision re-opening for closed D-005.
