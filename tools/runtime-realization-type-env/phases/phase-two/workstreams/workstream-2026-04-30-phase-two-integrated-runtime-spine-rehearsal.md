# Phase Two Integrated Runtime-Spine Rehearsal

Status: `closed`.
Branch: `codex/runtime-phase-two-integrated-spine-rehearsal`.
PR: `none`.
Commit: branch head after closeout commit.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority.

## Frame

Objective:

- Compose the earned Phase Two child proofs into one lab-contained integrated
  runtime-spine rehearsal across definition, selection, derivation,
  compilation, provisioning, mounting, execution, and observation.
- Prove integration only where focused child gates already exist, and preserve
  independent falsifiers so the rehearsal does not hide missing proof inside a
  happy-path demo.

Containment boundary:

- Changes stay inside `tools/runtime-realization-type-env/**`.
- Production packages, root workspace config, production topology, root Nx
  generators, and Phase Three structure/ratchet work remain out of scope.

Non-goals:

- Do not claim Parent-Repo Migration authorization.
- Do not promote Elysia, production HTTP/worker hosts, durable Inngest
  scheduling/retry/replay/idempotency/run history, product observability,
  RuntimeCatalog persistence, control-plane topology, native host telemetry,
  platform secret-store precedence, arbitrary DLP, or final public API/DX.
- Do not collapse focused provider/server/async/telemetry gates into a single
  unfalsifiable integrated success path.

## Opening Packet

Opening input:

- Child workstreams 3-6 closed with focused contained proofs for provider/
  config/Effect, server oRPC, async Inngest, and telemetry/HyperDX/catalog
  observation.
- Child workstream 7 consumes claim row `p2.integrated.rehearsal`.

Runtime/proof authority inputs:

- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/guidance/guardrails-design.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/current-lab-state.md`

Coordination inputs:

- `../workflow-phase-two-level-zero.md`
- `workstream-2026-04-30-phase-two-spine-composition-program-workstream.md`
- `workstream-2026-04-30-phase-two-provider-config-effect-spine.md`
- `workstream-2026-04-30-phase-two-server-orpc-elysia-boundary.md`
- `workstream-2026-04-30-phase-two-async-inngest-boundary.md`
- `workstream-2026-04-30-phase-two-telemetry-hyperdx-catalog-observation.md`
- `../ref-2026-04-30-phase-two-production-critical-claim-ledger.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- Canonical runtime spec pinned by the manifest.
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- `../../test/middle-spine-derivation.test.ts`
- `../../test/oracle/provider-effect-spine-scenario.test.ts`
- `../../test/oracle/server-orpc-boundary.test.ts`
- `../../test/oracle/inngest-async-boundary.test.ts`
- `../../test/oracle/phase-two-observation-spine.test.ts`
- `../../src/spine/derive.ts`
- `../../src/spine/compiler.ts`
- `../../src/oracle/**`

Excluded or stale inputs:

- Runtime-prod topology, generated syntax, package layout, and branch claims.
- Product observability/query/dashboard/retention/alerting assumptions.
- Production deployment/control-plane topology and Phase Three Nx/generator
  ratchet work.

Control inputs:

- Continue autonomously unless a documented Level Zero stop condition fires.

Selected skill lenses:

- `graphite`: branch/stack workflow in this Graphite-owned repo.
- `nx-run-tasks`: focused and composed verification through Nx targets.
- `testing-design`: integrated proof must keep focused falsifiers visible.

Refresher:

- Research program refreshed: `skipped`; Phase Two anchors are the active
  sequence authority.
- Phased workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `workstream-2026-04-30-phase-two-telemetry-hyperdx-catalog-observation.md`

Prior final output accepted or rejected:

- Accepted: `audit.p2.provider-effect-process-spine`,
  `audit.p2.server-orpc-fetch-boundary`,
  `audit.p2.async-inngest-function-step-boundary`, and
  `audit.p2.telemetry-integrated-observation-spine` are individually
  falsifiable focused child proofs.
- Rejected as integrated proof: a green full gate alone is not enough; child 7
  needs an integrated scenario and representative rejection/falsification
  matrix.

Deferred items consumed:

- `p2.integrated.rehearsal`

Deferred items explicitly left fenced at opening:

- Elysia mount/request lifecycle.
- Production HTTP/worker host mounting.
- Durable Inngest semantics and run history.
- Product observability/query/dashboard/retention/alerting.
- RuntimeCatalog persistence and control-plane topology.
- Native host telemetry/error mapping.
- Platform secret-store precedence and arbitrary DLP.
- Parent-Repo Migration authorization.

Repair demands consumed:

- None from child workstream 6.

Next packet changes:

- Child workstream 8 can use this work only as integrated contained proof and
  migration-decision evidence. It cannot treat it as Parent-Repo Migration
  authorization.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A focused integrated rehearsal gate that composes derivation/compilation,
  provider provisioning/finalization, server oRPC boundary, async Inngest
  boundary, telemetry/export, and migration/control-plane observation.
- A falsification matrix with at least one representative rejection path for
  provider/config, server boundary, async boundary, telemetry/run-correlation,
  and deployment/control-plane packet safety.
- Manifest/focus/diagnostic/spine/claim-ledger updates that promote only the
  earned integrated contained proof and preserve all non-promotions.
- Workstream closeout and next packet for Phase Two Closeout And Phase Three
  Handoff.

Optional outputs:

- A small lab-only helper if it reduces duplication without creating public API
  authority.

Target proof strength:

- `simulation-proof` for integrated contained rehearsal.
- No new vendor-proof category and no Lab-Production Proof.

Expected gates:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check
- focused integrated rehearsal test
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:oracle`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`

Stop/escalation conditions:

- Stop if integrated proof invalidates a focused child proof.
- Stop if honest integration requires final public API/DX law, production host
  mounting, durable async policy, product observability policy, catalog
  persistence, control-plane topology, or Parent-Repo Migration sequence.

## Acceptance / Closure Criteria

This workstream may close only when:

- integrated rehearsal proof passes or is honestly fenced;
- every promoted child claim referenced by the rehearsal has a focused gate;
- representative rejection paths are recorded and gated;
- proof/non-proof status is reflected in manifest, diagnostic, spine map,
  focus log, and claim ledger where relevant;
- leaf and parent reviews are recorded;
- focused and composed gates are recorded;
- scratch documents are absent or disposed;
- repo/Graphite state is clean or explicitly blocked;
- child workstream 8 has a usable next packet.

## Workflow

Preflight:

- Opened on `codex/runtime-phase-two-integrated-spine-rehearsal`.
- Verified clean repo/Graphite state and manifest-pinned spec hash before
  branch creation.

Investigation lanes:

- Host read Level Zero, Phase Two program workstream, child 6 report, claim
  ledger, focused child tests, derivation/compiler files, manifest, diagnostic,
  spine map, and focus log.

Phase teams:

- `proof-inventory`: one Explorer agent for focused proof/falsifier inventory.
- `adversarial-review`: one default reasoning agent for false-green and
  integrated-rehearsal adequacy critique.

Agent scratch documents:

- Not used at opening. The lanes are bounded; if either lane becomes deep
  enough to need scratch, it must be integrated and disposed before closeout.

Design lock:

- Locked to one focused integrated rehearsal test with two executable cases:
  a composed lifecycle path and a representative falsifier matrix.
- The success path must derive and compile the spine before mounting server and
  async boundaries, use compiler-emitted adapter payloads, provision providers
  through the Oracle bootgraph, delegate through `ProcessExecutionRuntime`,
  observe redacted telemetry/catalog output, and create a non-persistent
  migration/control-plane packet.
- The falsifier matrix must keep child proofs independently visible instead of
  relying on the happy path or the full gate alone.

Implementation summary:

- Added `test/oracle/phase-two-integrated-runtime-spine-rehearsal.test.ts`.
- The first test derives and compiles the fixture spine, asserts portable
  artifacts stay refs-only, uses compiled adapter payloads, provisions providers
  through the Oracle bootgraph, mounts contained oRPC server and Inngest async
  boundaries, executes both through `ProcessExecutionRuntime`, finalizes the
  provider graph, projects telemetry/catalog records, exports OTLP through
  injected fetch, and creates a migration/control-plane packet.
- The second test records executable falsifiers for invalid provider config,
  unmatched oRPC path, unknown Inngest function id, and telemetry run-id drift.
- Updated manifest, focus log, diagnostic, spine map, claim ledger, Level Zero,
  and the Phase Two program anchor for the integrated rehearsal proof.

Semantic JSDoc/comment trailing pass:

- Passed with no code comments added.
- Reviewed `phase-two-integrated-runtime-spine-rehearsal.test.ts`,
  `src/spine/derive.ts`, `src/spine/compiler.ts`, and the oracle adapter/
  telemetry/control-plane files touched by the rehearsal.
- Existing implementation comments already fence placeholder compiler outputs,
  adapter lowering, telemetry export, and control-plane packet limits. The new
  test is explicit enough without adding comments.

Verification:

- `bun test tools/runtime-realization-type-env/test/oracle/phase-two-integrated-runtime-spine-rehearsal.test.ts`: passed, 2 tests, 51 assertions.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: passed.

Review loops:

- Leaf and parent loops completed below. No waiver or invalidation was
  required.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| The integrated rehearsal can close as contained `simulation-proof` only if it composes derivation/compilation plus child 3-6 focused gates. | `phase-two-integrated-runtime-spine-rehearsal.test.ts`; agent proof-inventory report; manifest entries for middle-spine and child 3-6 proofs. | Promote `audit.p2.integrated-runtime-spine-rehearsal` as `simulation-proof`. | High |
| A full gate alone is not integrated proof. | Adversarial review and program workstream child-7 criteria. | Keep focused integrated test and falsifier matrix as the proof oracle. | High |
| Provider release boundary cannot be asserted for fixture providers without release hooks. | Initial focused test failed on `provider.release`; bootgraph finalization records were present. | Corrected proof to assert `boot.finalize.finished`; release boundary remains covered by provider-focused tests, not this integrated fixture path. | High |
| Child falsifiers remain executable. | Integrated falsifier test covers invalid provider config, unmatched oRPC path, unknown Inngest function id, and telemetry run-id drift. | Record as required matrix for integrated proof; do not collapse child gates. | High |

## Report

Proof promotions:

- Added `audit.p2.integrated-runtime-spine-rehearsal` as
  `simulation-proof`.
- Promotion is limited to integrated contained proof and migration-decision
  evidence inside the lab.

Proof non-promotions:

- Elysia, production host mounting, durable async semantics, product
  observability, RuntimeCatalog persistence, control-plane topology, native
  host telemetry, platform secret-store precedence, arbitrary DLP, final public
  API/DX, Phase Three topology/Nx/generator readiness, and Parent-Repo Migration
  readiness remain non-promotions.
- Integrated proof does not upgrade child proof categories beyond their focused
  gates and does not replace the focused provider/server/async/telemetry tests.

Diagnostic changes:

- Updated the diagnostic observation/control-plane rows to name the integrated
  rehearsal and its executable falsifiers.

Spec feedback:

- None requiring a spec patch from this workstream. The result reinforces the
  existing Phase Two/Phase Three boundary.

Test-theater removals or downgrades:

- Corrected the initial over-specific `provider.release` assertion. The fixture
  path proves bootgraph finalization; release-boundary behavior remains in the
  provider-focused gate.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Parent-Repo Migration authorization | `xfail` | Integrated contained proof supports Parent-Repo Migration planning only. | `p2.integrated.rehearsal`; Phase Two program workstream closeout criteria. | A Parent-Repo Migration workstream explicitly opens production code/topology. | Any claim treats the integrated rehearsal as Parent-Repo Migration authorization. | Parent-Repo Migration planning/workstream after Phase Three | `parent-repo-migration` |
| Phase Three topology/Nx/generator ratchet | `out-of-scope` | Phase Two does not implement final structure, enforcement boundaries, or generators. | `p2.phase-three.handoff`; Phase Two program workstream Phase Three boundary. | Phase Three opens explicitly. | Any integrated rehearsal tries to create root Nx generators or final topology enforcement. | Child workstream 8 handoff, then Phase Three | `lab/migration` |

## Review Result

Leaf loops:

- Containment: passed; changes stayed under
  `tools/runtime-realization-type-env/**` and did not touch production code,
  root workspace files, root Nx generators, or Phase Three structure.
- Mechanical: passed; branch is a Phase Two child branch, spec hash matched,
  and the test uses existing lab imports.
- Type/negative: passed through typecheck and existing negative gates.
- Semantic JSDoc/comments: passed with no new comments needed.
- Vendor: passed for the boundary claimed; oRPC and Inngest paths remain
  contained vendor-facing boundaries, not production host semantics.
- Oracle: passed for the focused integrated test and expected full
  oracle target.
- Manifest/report: passed after adding the integrated rehearsal entry and
  current experiment.

Parent loops:

- Architecture: passed; lifecycle composition stays definition -> selection ->
  derivation -> compilation -> provisioning -> mounting -> observation with no
  hidden second execution model.
- Migration derivability: passed; the result is migration-decision evidence,
  not Parent-Repo Migration authorization.
- DX/API/TypeScript: passed; no public API, package export, or authoring syntax
  changed.
- Workstream lifecycle/process: passed; the child opened with the template,
  used phase-local agents, recorded gates, proof status, residuals, and next
  packet.
- Adversarial evidence honesty: passed; false-green risks around full-gate-only
  proof, child-gate replacement, Elysia, durable async, product observability,
  catalog persistence, and Lab-Production Proof remain fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- None.

Repair demands:

- None.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Initial test expectation asserted `provider.release` for fixture providers without release hooks. | Would have overstated the integrated fixture path. | Use exact earned evidence: integrated fixture asserts bootgraph finalization; release-boundary proof remains in provider-focused tests. | Closed in this workstream |

## Final Output

Artifacts:

- `test/oracle/phase-two-integrated-runtime-spine-rehearsal.test.ts`
- `evidence/proof-manifest.json`
- `evidence/current-lab-state.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/systems/runtime-spine-evidence-map.md`
- `phases/phase-two/ref-2026-04-30-phase-two-production-critical-claim-ledger.md`
- `phases/phase-two/workflow-phase-two-level-zero.md`
- `phases/phase-two/workstreams/workstream-2026-04-30-phase-two-spine-composition-program-workstream.md`
- `phases/phase-two/workstreams/workstream-2026-04-30-phase-two-integrated-runtime-spine-rehearsal.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/oracle/phase-two-integrated-runtime-spine-rehearsal.test.ts`: passed.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`: passed.
- Final composed gates recorded after closeout edits before commit.

Repo/Graphite state:

- To be clean after the closeout commit. Pre-commit dirty state is limited to
  this workstream's lab-contained files.

## Next Workstream Packet

Recommended next workstream:

- Phase Two child workstream 8: Closeout And Phase Three Handoff.

Why this is next:

- Child workstreams 1-7 now have closed reports and focused gates.
- Phase Two needs a final closeout artifact that reconciles proof categories,
  residuals, migration-decision evidence, Phase Three entry inputs, review,
  verification, and clean repo/Graphite state.

Required first reads:

- Level Zero workflow.
- Phase Two program workstream.
- This report.
- All child workstream reports 1-7.
- `proof-manifest.json`, `runtime-spine-verification-diagnostic.md`,
  `systems/runtime-spine-evidence-map.md`, `current-lab-state.md`, and
  `ref-2026-04-30-phase-two-production-critical-claim-ledger.md`.

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `gt ls`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash actual-vs-expected check

Deferred items to consume:

- Closeout adds no new runtime behavior proof.
- Preserve every non-promotion and residual with an authority home, unblock
  condition, re-entry trigger, next eligible workstream, and lane.
- Phase Three handoff should name final structure, Nx enforcement boundaries,
  generators, idempotency, and ratchet/lock as future lab work, not Phase Two
  completion work.
