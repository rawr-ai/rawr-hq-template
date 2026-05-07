# Workstream Record: agent-config-sync router-native reshape

Status: closing
Started: 2026-05-07
Closed: pending semantic repository repair commit/submission
DRA: Codex
Branch: `codex/agent-config-sync-router-native-reshape`
Parent branch at opening: `codex/workstream-b-preparation`
Graphite PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/320
Parent Graphite PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/319
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template`

## Objective

Refactor `@rawr/agent-config-sync` so the service stays oRPC-native,
router-centered, and structurally resistant to future helper-bucket drift.

Done means:

- Public contracts, package exports, CLI behavior, test behavior, and service
  client shape remain unchanged.
- `planning`, `execution`, `retirement`, and `undo` remain real modules because
  they are current contract namespaces with distinct capability boundaries.
- Module `helpers/` directories are removed from canonical shape.
- Callable implementation is exposed through `router/index.ts` and cohesive
  `router/*.router.ts` fragments. `router/index.ts` is the single
  `module.router({ ... })` attach point.
- Module-owned repositories remain only where they encapsulate real source,
  destination, or persistence state. Policy, path helpers, orchestration, and
  replay flow are not repositories. Cross-module support stays in `common/`.
  Router roots do not contain nested support directories.
- Structural ratchets enforce the new shape so future agents do not drift back
  to `helpers/`, `operations/`, or one-procedure-file sprawl.
- Repo is clean, green, and Graphite stack is ready and published after review
  and repair.

## Authority Order

1. Active runtime realization spec:
   `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
2. SDK ergonomics change doc:
   `/Users/mateicanavra/Documents/projects/RAWR/_inbox/RAWR_SDK_Ergonomics_Change_Doc.md`
3. Current `@rawr/agent-config-sync` contracts and tests.
4. `scripts/phase-03/verify-agent-config-sync-service-shape.mjs`.
5. Repo Graphite/Nx process, especially `docs/process/GRAPHITE.md`.

Authority conflict rule:

- The runtime/SDK target authority remains `.effect(...)` for canonical future
  service authoring.
- This workstream preserves existing `.handler(...)` only as current
  implementation compatibility. It must not reframe `.handler(...)` as target
  canonical authoring.
- If implementation pressure appears to migrate `.handler(...)` to
  `.effect(...)`, stop and open a separate SDK/service-authoring workstream.

## Scope

In scope:

- `services/agent-config-sync/src/service/**`
- `services/agent-config-sync/test/**` when path assertions need updates
- `scripts/phase-03/verify-agent-config-sync-service-shape.mjs`
- service-local docs that describe the old helper topology
- this workstream record and review findings under this directory

Out of scope:

- `.handler(...)` to `.effect(...)` migration
- public contract or package export changes
- CLI behavior changes
- new custom service taxonomy
- one-procedure-per-file router sprawl
- unrelated service topology changes outside `agent-config-sync`

## Opening Packet

Opening input:

- User requested implementation of the team-led router-native reshape plan and
  explicitly required the plan to be recorded verbatim/readably for compaction
  continuity.

Authority input:

- Active runtime realization spec.
- SDK ergonomics change doc.
- Current service contracts, routers, tests, and structural verifier.
- Graphite/Nx workflow docs.

Coordination input:

- DRA owns edits and decisions.
- Opening steward, router-native architecture peer, structural-ratchet peer,
  behavior-preservation peer, and closure steward are read-only.
- Peer findings must be accepted, rejected, repaired, waived, or deferred here.

Evidence input:

- Current module routers under `services/agent-config-sync/src/service/modules/*/router.ts`.
- Current module helper directories under `services/agent-config-sync/src/service/modules/*/helpers`.
- Current structural verifier at `scripts/phase-03/verify-agent-config-sync-service-shape.mjs`.
- Current public contract test at `services/agent-config-sync/test/service-shape.test.ts`.
- Current schema boundary test at `services/agent-config-sync/test/schema-boundary.test.ts`.

Stale/excluded input:

- Older service-package snapshots that treat `.handler(...)` as final target
  authoring.
- Quarantine/archive docs unless explicitly referenced by the active authority
  chain.
- Current `helpers/` layout as evidence of present state, not as target
  authority.
- Prior peer suggestions that introduced custom service DSL folders such as
  `law`, `state`, `execute`, `operations`, or one-procedure router files.

Control input:

- Preserve public API/CLI behavior.
- Keep service modules real only where contract namespaces already establish
  boundaries.
- Keep router gravity; router fragments may group multiple procedures.
- End clean, green, and ready/published through Graphite.

## Output Contract and Design Lock

Output contract:

- One Graphite branch/stack item containing the workstream record, router-native
  topology refactor, ratchet updates, and any minimal docs/tests needed.
- No contract, package export, or CLI behavior changes.
- All peer findings disposed in this record.
- Required gates recorded with results.
- Closure packet states repo/Graphite state and exact next action.

Implementation entry conditions:

- Opening steward findings disposed.
- Router-fragment move map recorded.
- Structural-ratchet move map recorded.
- Current Graphite state recorded.

Stop or escalate if:

- Public API/export drift appears.
- CLI behavior drift appears.
- `.effect(...)` migration pressure appears.
- `service/common/**` starts becoming a junk drawer for module-owned behavior.
- A helper move crosses module contract boundaries.
- A peer finding identifies a behavior-preservation gap that existing tests do
  not cover and cannot be fixed in-scope.

Design refinement after user correction:

- The original phrase "router-local support next to the owning router fragment"
  was too loose. The locked shape is stricter:
  `modules/<name>/router/index.ts` plus cohesive `router/*.router.ts`
  fragments only.
- Router fragments export implemented procedures; only `router/index.ts` calls
  `module.router({ ... })`, because oRPC module routers require the full module
  contract at the attach point.
- Non-callable implementation that has real persistence/apply/discovery
  gravity is not called a helper and does not live under `router/`. It lives in
  `repositories/*-repository.ts` under the owning module unless multiple
  modules need the same behavior, in which case it belongs under
  `service/common/**`.

Semantic repository correction after user clarification:

- User clarified that `repositories/` is acceptable; the bug was naming
  non-repositories as repositories.
- Accepted rule: repositories own real source, destination, or persistence
  state boundaries. Routers own callable story, orchestration, policy,
  planning simulation, cleanup flow, and undo replay behavior.
- Rejected peer recommendation: blanket removal of module-level repositories.
  Rationale: the user explicitly allowed real repositories, and execution,
  retirement, planning source discovery, and undo capsule storage have real
  repository gravity.
- Correction loop scope: keep real module repositories by explicit allowlist,
  fold fake repository files into router fragments or `service/common/helpers`,
  update ratchets/tests/docs, add direct undo replay coverage, recommit and
  republish PR #320.

## Verbatim Plan

```md
# Workstream Plan: Team-Led Router-Native Reshape of `agent-config-sync`

## Summary

Refactor `@rawr/agent-config-sync` so the service stays oRPC-native, router-centered, and structurally resistant to future helper-bucket drift.

This is a small team workstream, not a single-agent refactor. The DRA owns synthesis, edits, commits, gates, review disposition, closure record, and Next Packet. Peer agents are read-only reviewers and planning/verification lanes; they do not write code or decide completion.

Authority order: active runtime realization spec → SDK ergonomics change doc → current `@rawr/agent-config-sync` contracts/tests → structural verifier → repo Graphite/Nx process.

Non-goals:
- No public API or CLI behavior changes.
- No `.handler(...)` to `.effect(...)` migration in this workstream.
- No new custom service taxonomy.
- No one-procedure-per-file router sprawl.

## Team Design

Team axes:
- Objective precision: specified/verifiable.
- Coupling: moderately interdependent; design and ratchet reviews feed implementation.
- Autonomy: DRA-directed with guardrailed read-only peers.
- Composition stability: fixed for the workstream.
- Context distribution: shared framing packet, partitioned lane packets.
- Verification mode: process-traced plus outcome-checked.

Team roles and interfaces:
- **DRA / implementer:** owns final plan, edits, Graphite state, commits, gates, review disposition, closure record, and Next Packet.
- **Opening steward:** read-only workstream setup review. Receives objective, authority order, intended lanes, stop conditions. Returns findings before edits.
- **Router-native architecture peer:** read-only design review. Checks module vs leaf-router boundaries, router gravity, oRPC-native composition, and no fake DSL.
- **Structural-ratchet peer:** read-only verifier review. Checks `verify-agent-config-sync-service-shape.mjs`, service-shape tests, forbidden paths, and future-agent constraints.
- **Behavior-preservation peer:** read-only test/evidence review. Checks that planning, execution, retirement, and undo behavior are covered by existing tests and identifies missing targeted assertions.
- **Closure steward:** read-only closure review. Checks output contract, gates, repo/Graphite state, deferred inventory, and zero-context Next Packet.

Accountability:
- DRA is singly accountable for all decisions and final output.
- Peer findings must be accepted, rejected with rationale, fixed, waived, or deferred in the workstream record.
- No peer may mutate repo state.

## Key Implementation Changes

- Create a workstream record at `docs/projects/rawr-final-architecture-migration/workstreams/agent-config-sync-router-native-reshape/record.md` with authority inputs, team lanes, findings disposition, gate results, and Next Packet.

- Preserve current real modules: `planning`, `execution`, `retirement`, `undo`. These are contract namespaces and capability boundaries, not just organization folders.

- Reshape module router topology:
  - Keep `router.ts` when a module remains readable as one callable story.
  - Use `router/index.ts` plus cohesive `*.router.ts` fragments only when a module needs multiple router story clusters.
  - Router fragments may contain multiple related procedures.
  - `router/index.ts` composes fragments with `module.router({ ... })`.

- Retire module helper buckets:
  - Remove `modules/*/helpers` from canonical shape.
  - Move router-local support next to the owning router fragment.
  - Move genuinely shared support to `service/common/**`.
  - Do not introduce `procedures/`, `operations/`, `support/`, `utils/`, or example-specific taxonomy folders.

- Update structural enforcement:
  - Allow either `modules/<name>/router.ts` or `modules/<name>/router/index.ts`.
  - Forbid `modules/*/helpers`.
  - Forbid module-root behavior buckets beyond canonical files.
  - Ratchet new router-fragment paths and old-path absence.

## Workstream Lanes

1. **Open**
   - Confirm branch, stack, clean state, authority inputs.
   - Create one Graphite branch for this workstream.
   - Create record and lane packets.
   - Run opening steward before edits.

2. **Design Review**
   - Router-native architecture peer reviews planned module/router split.
   - Structural-ratchet peer reviews planned verifier/test changes.
   - DRA locks decisions in the record before implementation.

3. **Implement**
   - DRA applies topology refactor and import updates.
   - DRA updates structural verifier and any affected service-shape tests/docs.
   - DRA keeps public contract and test behavior unchanged.

4. **Review and Repair**
   - Behavior-preservation peer reviews diff and existing coverage.
   - Structural-ratchet peer reviews final ratchet behavior.
   - DRA disposes findings and repairs accepted issues.

5. **Close**
   - Run gates.
   - Closure steward reviews record, gates, repo/Graphite state, deferred items, and Next Packet.
   - DRA finalizes closure.

## Test Plan

Required gates:

```sh
git diff --check
bunx nx run @rawr/agent-config-sync:typecheck --skip-nx-cache
bunx nx run @rawr/agent-config-sync:test --skip-nx-cache
bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache
bunx nx run @rawr/agent-config-sync:build --skip-nx-cache
```

Add if import movement touches CLI binding or package consumers:

```sh
bunx nx run-many -t typecheck -p @rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli --output-style=stream --skip-nx-cache
```

Acceptance scenarios:
- Planning results remain unchanged.
- Execution writes Codex/Claude homes as before.
- Retirement cleanup and retained-residue behavior remain unchanged.
- Undo capsule replay behavior remains unchanged.
- Structural suite fails if `modules/*/helpers` reappears.

## Assumptions

- Team peers are read-only review/design agents; DRA performs all edits.
- This is one bounded workstream and one Graphite branch unless review discovers an independent prerequisite.
- `.handler(...)` is preserved as current implementation compatibility in this checkout; the runtime/SDK target authority remains `.effect(...)` and that migration is out of scope.
- Skills used: `habitat:workstream-runner`, `team-design`.
```

## Team Lanes

| Lane | Agent | Interface | Status |
| --- | --- | --- | --- |
| Opening steward | `workstream-opening-steward` | Reviews objective, authority order, lanes, stop conditions before edits. | completed; findings accepted |
| Router-native architecture peer | read-only peer | Reviews module vs leaf-router boundaries, router gravity, oRPC-native shape, no fake DSL. | original peer timed out/closed; replacement classifier completed |
| Structural-ratchet peer | read-only peer | Reviews verifier/test shape before and after implementation. | design pass and watcher pass completed; findings accepted |
| Behavior-preservation peer | read-only peer | Reviews coverage and final diff for behavior drift. | completed; findings accepted/deferred below |
| Closure steward | `workstream-closure-steward` | Reviews output contract, gates, repo/Graphite state, deferred inventory, Next Packet. | warn; no code blocker, record/commit/submission cleanup required |

## Agent Packets

Opening steward packet:

- Evidence base: this record, authority order, branch/worktree state.
- Forbidden scope: edits, implementation decisions.
- Required output: readiness finding with concrete repair recommendations.
- Done condition: findings returned and DRA disposition recorded.

Router-native architecture peer packet:

- Evidence base: module routers, contracts, helper files, this record.
- Forbidden scope: edits, one-procedure-per-file recommendation, custom DSL
  taxonomy.
- Required output: exact module router topology and helper/support move map.
- Done condition: move map returned and DRA disposition recorded.

Structural-ratchet peer packet:

- Evidence base: structural verifier, service-shape test, schema-boundary test,
  current helper paths.
- Forbidden scope: edits, schema ownership changes unless forced by moved code.
- Required output: verifier/test change map.
- Done condition: ratchet map returned and DRA disposition recorded.

Behavior-preservation peer packet:

- Evidence base: final diff, sync behavior tests, workspace planning tests,
  service-shape tests.
- Forbidden scope: edits.
- Required output: behavior-risk findings and missing gate/test recommendations.
- Done condition: findings returned and DRA disposition recorded.

Closure steward packet:

- Evidence base: final record, diff, gate results, peer findings, Graphite
  status.
- Forbidden scope: edits, completion decision.
- Required output: closure-readiness findings.
- Done condition: findings returned and DRA disposition recorded.

Wave packet: N/A. Lanes run under DRA coordination; read-only peers are invoked
as targeted review lanes, not as a parallel implementation wave.

## Progress Log

- 2026-05-07: Preflight clean on `codex/workstream-b-preparation`.
- 2026-05-07: Created Graphite branch `codex/agent-config-sync-router-native-reshape`.
- 2026-05-07: Created this workstream record and copied plan verbatim.
- 2026-05-07: Verified Graphite stack: `main` -> `codex/workstream-b-preparation`
  -> `codex/agent-config-sync-router-native-reshape`; sibling
  `align-arch-spec-with-runtime-realization` remains frozen.
- 2026-05-07: Opening steward returned warn; accepted all findings and repaired
  record framing, opening packet, design lock, agent packets, and gate list.
- 2026-05-07: Structural-ratchet peer returned design findings; accepted.
- 2026-05-07: User corrected the intermediate `router/helpers` and nested
  router-support shape. Locked stricter native shape:
  `router/index.ts` + `router/*.router.ts`; module repositories for real
  non-callable behavior.
- 2026-05-07: Implemented router-native topology:
  - planning: `workspace-sync.router.ts`, `full-sync-policy.router.ts`
  - execution: `provider-sync.router.ts`,
    `codex-native-agent-roles.router.ts`
  - retirement: `retire-stale-managed.router.ts`,
    `cleanup-behind-provider-sync.router.ts`
  - undo: `run-undo.router.ts`
- 2026-05-07: Moved former helper files into explicit module repositories
  where they owned discovery, destination sync, retirement, cleanup, or undo
  capsule mechanics.
- 2026-05-07: Updated structural verifier and service-shape test to prevent
  `modules/*/helpers`, router subdirectories, and non-router files in router
  roots.
- 2026-05-07: Ran full gates, self-review, and closure steward review.
- 2026-05-07: Committed work as `86e89c2e`
  (`refactor(agent-config-sync): reshape modules around routers`).
- 2026-05-07: Published Graphite stack:
  - parent preparation PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/319
  - router-native reshape PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/320
- 2026-05-07: User clarified the semantic repair target: `repositories/` is
  fine, but only for things that are actually repositories.
- 2026-05-07: Implemented semantic repository repair:
  - kept real source/destination/persistence repositories by explicit allowlist
  - folded planning policy, assessment, preview orchestration, and target
    selection out of fake planning repositories and into router fragments
  - moved shared retirement write/delete mechanics to
    `service/common/helpers/retirement-filesystem-actions.ts`
  - kept cleanup-behind Codex state repair as a real retirement repository
    after classifier review
  - folded undo apply behavior into `run-undo.router.ts`
  - folded undo capsule paths into `capsule-store-repository.ts`
  - deleted unused command-expiration code
  - added direct public undo replay coverage

## Findings Disposition

Opening steward:

- P1 `.handler(...)` authority conflict: accepted. Record now preserves
  `.handler(...)` only as current compatibility and leaves `.effect(...)` as
  target authority.
- P2 incomplete opening packet: accepted and repaired.
- P2 incomplete design lock: accepted and repaired.
- P2 missing delegation packets: accepted and repaired.
- P2 Graphite state not in record: accepted and repaired.
- P3 add node consumer check: accepted; gate list updated below.

Structural-ratchet peer:

- Old verifier hard-requires helper paths: accepted.
- Verifier does not forbid module helper/generic subdirectories: accepted.
- Failure message still recommends helpers: accepted.
- Add lightweight service-shape filesystem topology assertion: accepted.
- Leave schema-boundary test unchanged unless schema declarations move: accepted.

Router-native architecture peer:

- Original read-only peer timed out and was closed without findings.
- Replacement classifier/watcher finding: `router/helpers` was preserving the
  old semantic blur and several files were repositories or router fragments in
  disguise. Accepted. Repaired by removing router support subdirectories,
  creating cohesive `router/*.router.ts` fragments, and moving non-callable
  mechanics to `repositories/*-repository.ts`.

Structural watcher:

- Finding: router roots had `helpers/` and zero real fragments during the first
  intermediate move. Accepted and repaired.
- Finding: verifier and service-shape test must reject module helper buckets,
  router subdirectories, and generic behavior buckets. Accepted and repaired.

Behavior-preservation peer:

- Finding: structural verifier still read old `router.ts` and helper paths.
  Accepted and repaired.
- Finding: `src/undo.ts` is public API-adjacent and should keep exporting
  `beginPluginsSyncUndoCapture` and `PLUGINS_SYNC_UNDO_PROVIDER`. Accepted;
  added service-shape assertion.
- Finding: add plan-vs-execution dry-run parity assertion. Deferred; existing
  planning and sync behavior suites cover the current behavior and this
  topology workstream is not changing sync semantics.
- Finding: add dry-run stale retirement assertion. Deferred for the same reason.
- Finding: add direct `client.undo.runUndo` replay assertion. Deferred for the
  same reason; existing undo capsule capture exports remain asserted and full
  sync behavior gates cover current service behavior.

Closure steward:

- Finding: code shape is closure-ready; no `modules/*/helpers`, no router
  subdirectories, router roots contain only `index.ts` and cohesive
  `*.router.ts`, repositories use `*-repository.ts`, and public undo export
  drift is mechanically contained. Accepted.
- Blocking gap: deferred inventory did not list behavior-preservation deferrals.
  Accepted and repaired below.
- Blocking gap: Next Packet was stale and not zero-context usable. Accepted and
  repaired below.
- Blocking gap: work was not yet committed or published. Accepted; commit and
  Graphite publish remain the next action after this record repair.

Semantic repository repair closure steward:

- Finding: no code-shape blocker before commit/submit. Accepted.
- Finding: record status and closure lane were stale because semantic repair was
  dirty/unsubmitted while the record still said closed. Accepted and repaired
  before commit.
- Finding: after commit/submit, record final commit hash, PR state, and clean
  Git/Graphite state. Accepted; this is the final closure action.

Semantic repository repair peers:

- Repository classifier: finding that remaining module repositories all earned
  the repository name after the initial repair. Accepted.
- Repository classifier: finding that `cleanup-behind-provider-sync.router.ts`
  still contained Codex destination state repair and should remain a
  repository-grade boundary. Accepted; restored
  `codex-cleanup-behind-repository.ts` as an allowed retirement repository and
  kept the router thin.
- Repository classifier: finding that `workspace-sync.router.ts` remains large
  after folding preview mechanics into it. Accepted as non-blocking. Rationale:
  the preview flow is read-only planning simulation/orchestration, not a source
  or destination repository; creating a new non-repository bucket would
  reintroduce the semantic blur this repair is removing.
- Structural-ratchet peer: finding that the repository allowlist was not
  self-enforcing because required repository files were duplicated in
  `REQUIRED_PATHS`. Accepted; verifier now derives required real repository
  paths directly from `MODULE_REPOSITORY_FILES`.
- Structural-ratchet peer: note that `service/common/helpers` remains
  open-ended. Accepted as non-blocking. Rationale: this workstream targets
  module repository semantics; common helper allowlisting is a broader common
  boundary hygiene question and current common helpers already existed as an
  allowed shared service boundary.
- Behavior-preservation peer: no findings. Accepted. The added direct public
  undo replay test was judged adequate for this repair.

## Gate Results

Final gates:

```sh
git diff --check
# pass

bunx nx run @rawr/agent-config-sync:typecheck --skip-nx-cache
# pass

bunx nx run @rawr/agent-config-sync:test --skip-nx-cache
# pass before semantic repair: 4 files, 43 tests
# pass after semantic repair: 4 files, 44 tests

bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache
# pass

bunx nx run @rawr/agent-config-sync:build --skip-nx-cache
# pass

bunx nx run @rawr/agent-config-sync-node:typecheck --skip-nx-cache
# pass

bunx nx run-many -t typecheck -p @rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli --output-style=stream --skip-nx-cache
# pass

bunx nx run-many -t typecheck,test -p @rawr/agent-config-sync,@rawr/plugin-plugins --output-style=stream --skip-nx-cache
# pass
```

## Deferred Inventory

- Add a focused plan-vs-execution dry-run parity assertion for prompt, runtime
  skill, registry, hook/MCP/config, and agent TOML target alignment.
  - Owner: future behavior-hardening workstream.
  - Trigger: next change to planning preview, execution destination sync, or
    registry/config projection semantics.
  - Rationale: useful coverage, but not required for this topology-only
    workstream because existing planning and sync behavior suites passed.
- Add a dry-run stale retirement assertion for Codex and Claude that proves
  stale paths/registry/marketplace remain unchanged while actions report
  `planned`.
  - Owner: future behavior-hardening workstream.
  - Trigger: next change to retirement stale-managed semantics.
  - Rationale: useful coverage, but this workstream did not change retirement
    behavior and retained-residue tests passed.
- Add a cleanup-backed `client.undo.runUndo` replay assertion.
  - Owner: future behavior-hardening workstream.
  - Trigger: next change to cleanup filesystem mutation or undo capsule replay.
  - Rationale: this workstream added direct public undo replay coverage for a
    captured write/restore capsule; cleanup-backed undo is useful follow-up
    coverage but not required to prove this semantic repository repair.

## Next Packet

Current state:

- Branch: `codex/agent-config-sync-router-native-reshape`.
- Parent branch: `codex/workstream-b-preparation`.
- Commit: `86e89c2e`
  (`refactor(agent-config-sync): reshape modules around routers`).
- Follow-up commit to create: `refactor(agent-config-sync): classify module
  repositories semantically`.
- Graphite PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/320
- Parent Graphite PR: https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/319
- Closure steward found no code-shape blocker.
- Semantic repair gates listed above passed locally before final commit.

Exact next action:

1. Commit semantic repair with
   `gt modify -c -m "refactor(agent-config-sync): classify module repositories semantically"`.
2. Submit updated stack with
   `gt submit --stack --publish --no-edit --no-ai --no-interactive`.
3. Verify `git status`, `gt status`, `gt ls`, and PR #320.
4. Monitor/respond to PR review or CI if needed.

Inspect first:

- this record
- `services/agent-config-sync/src/service/modules/*/router/index.ts`
- `services/agent-config-sync/src/service/modules/*/router/*.router.ts`
- `services/agent-config-sync/src/service/modules/*/repositories/*-repository.ts`
- `scripts/phase-03/verify-agent-config-sync-service-shape.mjs`
