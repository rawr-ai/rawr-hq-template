# Server Route Derivation

Status: `closed`.
Branch: `codex/runtime-server-route-derivation`.
PR: https://github.com/rawr-ai/rawr-hq-template/pull/264.
Commit: `1287c85e`.

This report is informative continuity for the runtime-realization lab. It is not
architecture authority.

Active drafts may exist inside an implementation branch, but committed reports
must be closed or abandoned snapshots. Do not use this file as live kanban.

## Frame

Objective:

- Prove, inside the contained runtime-realization lab, the narrowest acceptable
  cold server route derivation and import-safety artifact before real server
  adapter callback lowering or Elysia/oRPC harness mounting claims.

Containment boundary:

- All edits stay under `tools/runtime-realization-type-env/**`.
- Any server-route derivation helper is lab-local unless the user accepts a
  public route import-safety law or final route authoring API/DX change.

Non-goals:

- Do not mount real Elysia, native oRPC, HTTP, OpenAPI, or production server
  harness paths.
- Do not decide final public route import-safety law, production route module
  topology, route discovery, deployment placement, telemetry export, or
  boundary policy.
- Do not change public authoring API/DX unless escalated and accepted.
- Do not treat route descriptor construction, vendor oRPC shape smoke, or fake
  adapter delegation as production server runtime readiness.

## Opening Packet

Opening input:

- DRA continuation after PR #263
  (`Dispatcher Access + Async Step Membership`).
- Default program sequence from
  `../dra-runtime-research-program-workflow.md`: workstream 5 is
  `Server Route Derivation`.

Runtime/proof authority inputs:

- `../../RUNBOOK.md`
- `../design-guardrails.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../spine-audit-map.md`
- `../focus-log.md`
- canonical runtime spec pinned by `../proof-manifest.json`:
  `../../../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Coordination inputs:

- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../phased-agent-verification-workflow.md`
- `README.md`
- `TEMPLATE.md`

Evidence inputs:

- `2026-04-30-dispatcher-access-async-step-membership.md`
- `../../src/sdk/plugins/server.ts`
- `../../src/spine/artifacts.ts`
- `../../src/spine/derive.ts`
- `../../src/spine/compiler.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../test/middle-spine-derivation.test.ts`
- `../../test/mini-runtime/process-runtime.test.ts`
- `../../fixtures/positive/server-api-plugin.ts`
- `../../fixtures/positive/app-and-plan-artifacts.ts`
- `../../fixtures/inline-negative/descriptor-refs.ts`
- `../../fixtures/todo/server-route-derivation.todo.ts`
- `../../src/vendor/boundaries/orpc.ts`
- `../../test/vendor-boundaries/boundary-shapes.test.ts`

Excluded or stale inputs:

- Quarantined or archived runtime docs if they conflict with the pinned
  canonical spec.
- Native oRPC `.effect(...)` assumptions. RAWR `.effect(...)` is a lab SDK
  authoring terminal, not a native oRPC claim.
- Fake server adapter delegation as proof of route derivation. It can remain
  downstream evidence for callback delegation only.
- Explicit route paths already present on execution refs as proof of cold route
  factory derivation. Those are input artifacts until this workstream proves the
  derivation operation and import-safety diagnostics.

Control inputs:

- User control signal on public route authoring API/DX, route import-safety law,
  native server adapter shape, or production route module topology.
- Spec hash drift.
- Failed focused or composed gate.
- Parent review invalidation.
- Graphite/PR blocker.
- Discovered dependency inversion that requires adapter callback lowering before
  route derivation can be stated honestly.

Selected skill lenses:

- `graphite`: branch and stack mutation in a Graphite-required repo.
- `nx-workspace`: project target truth and gate selection.
- `architecture`: lifecycle boundary between derivation, adapter lowering, and
  harness mounting.
- `testing-design`: focused proof oracle, negative coverage, and anti-theater
  gates.
- `typescript`: discriminated route ref shape, widened invalid input checks, and
  comment-worthy semantic seams.
- `information-design`: report and manifest wording that keeps proof boundaries
  durable across compaction.

Refresher:

- Research program refreshed: yes.
- Phased workflow refreshed: yes through DRA workflow and current template.

## Prior Workstream Assimilation

Previous report consumed:

- `2026-04-30-dispatcher-access-async-step-membership.md`

Prior final output accepted or rejected:

- Accepted as the current parent proof: dispatcher operation inventory and async
  owner-to-step membership artifacts are contained `simulation-proof`.
- Rejected as overclaim: final dispatcher access policy, final async membership
  authoring syntax, durable async semantics, and real host bridge lowering remain
  unresolved.

Deferred items consumed:

- `audit.p2.server-route-derivation`

Deferred items explicitly left fenced:

- `audit.p2.adapter-effect-callback-lowering`
- `audit.p2.async-effect-bridge-lowering`
- `audit.p1.effect-boundary-policy-matrix`
- real Elysia/oRPC harness mounting
- OpenAPI publication and real HTTP request path

Repair demands consumed:

- Run a trailing semantic JSDoc/comment pass after TypeScript/runtime edits that
  add route derivation helpers, import-safety checks, or proof-only seams.

Next packet changes:

- The prior next packet listed both server and async adapter files as first
  reads. This workstream narrows the active target to server route derivation;
  async bridge files remain background only unless a dependency inversion is
  discovered.

Invalidations from prior assumptions:

- None at opening.

## Output Contract

Required outputs:

- A lab-local route derivation artifact or diagnostic path that distinguishes
  explicit route refs from cold route factory derivation.
- Positive tests proving route factory derivation does not execute descriptor
  bodies and preserves route path identity.
- Negative/runtime diagnostics for import-unsafe or widened invalid route inputs
  without choosing production module topology.
- Manifest, focus log, diagnostic, spine map, research program, and report
  updates that promote only earned proof strength.
- Semantic JSDoc/comment trailing review after implementation.

Optional outputs:

- A route derivation helper that can later feed real server adapter callback
  lowering without becoming public API.
- A small TODO fixture rewrite if the old TODO no longer describes the current
  negative space.

Target proof strength:

- Contained `simulation-proof` for cold server route derivation/import-safety
  artifacts only.
- Keep final route import-safety law, production adapter mounting, native oRPC
  adaptation, OpenAPI publication, and HTTP serving as `xfail` or downstream
  non-proof.

Expected gates:

- `bunx nx show project runtime-realization-type-env --json`
- focused target(s):
  - `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Stop/escalation conditions:

- Public route authoring API/DX must change.
- Final cold route import-safety law must be decided beyond a fenced lab
  artifact.
- Native oRPC/Elysia adapter behavior must be asserted as production proof.
- Route derivation requires executing descriptor bodies, importing production
  packages, or scanning real app/plugin modules.
- Boundary timeout, retry, interruption, telemetry, redaction, or error mapping
  policy becomes necessary.
- The work requires package topology or migration sequence changes.

## Acceptance / Closure Criteria

This workstream may close only when:

- required outputs are present;
- proof/non-proof status is reflected in manifest and diagnostic where needed;
- every deferred item has an authority home, unblock condition, and re-entry
  trigger;
- leaf review loops and parent review loops are recorded;
- focused and composed gates are recorded;
- repo and Graphite state are recorded;
- the next workstream packet is usable by a zero-context agent.

## Workflow

Preflight:

- `git status --short --branch`: clean on
  `codex/runtime-dispatcher-async-membership`, then new Graphite child branch
  `codex/runtime-server-route-derivation`.
- `gt status --short`: clean before branch creation.
- `gt log short`: verified stack ancestry through PR #263 branch.
- `bunx nx show project runtime-realization-type-env --json`: verified targets.
- Pinned spec hash verified:
  `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`.

Investigation lanes:

- Authority cartographer: route proof boundary, stale inputs, stop rules.
- Implementation seam reviewer: smallest lab-local route derivation change.
- Testing/evidence auditor: focused tests, proof ledger, closeout gates.
- Semantic JSDoc/comment trailing reviewer: to run after implementation edits.

Phase teams:

- Opening/investigation: 3 explorer agents plus host; enough because this is a
  narrow derivation proof with known source seams.

Design lock:

- Locked to a contained `simulation-proof`: lab-local cold route factories may
  produce server route declarations during derivation; derivation may emit route
  descriptors, server execution refs, descriptor table inputs, surface runtime
  plans, and refs-only portable artifacts. Explicit server refs remain
  diagnostic inventory unless matched by a cold route declaration. Final public
  route import-safety law and native Elysia/oRPC behavior remain fenced.

Implementation summary:

- Added route declaration, route derivation input, and route descriptor
  artifacts under the contained spine.
- Made the server pseudo-SDK expose memoized cold route declarations while
  keeping `descriptors` as a compatibility view over the same inert metadata.
- Extended spine derivation to call cold route factories, validate route
  boundaries/import-safety/path identity, derive server refs and descriptor
  entries, and diagnose failed factories, invalid metadata, duplicate route
  identities, and explicit server refs without route-factory coverage.
- Updated portable artifact and positive/negative fixtures for the new
  refs-only route descriptor inventory.
- Promoted `simulation.server-route-derivation-import-safety` and retained a
  residual `audit.p2.server-route-derivation` `xfail` for final public law and
  production server path.

Semantic JSDoc/comment trailing pass:

- Passed after repair: the trailing reviewer required semantic comments in
  `src/spine/artifacts.ts`, `src/sdk/plugins/server.ts`, and
  `src/spine/derive.ts` to preserve the cold route/import-safety boundary and
  the explicit-ref non-inference rule.

Verification:

- Focused and composed gates passed; see Final Output.

Review loops:

- Leaf and parent loops passed with route derivation promoted only to contained
  simulation proof. Native adapter lowering, route payload construction, real
  HTTP request handling, OpenAPI publication, and final import-safety law stayed
  fenced.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Server route paths currently exist as explicit execution ref inputs, not as proven cold derivation outputs. | `src/spine/derive.ts` emits `runtime.server-route-derivation.reserved` whenever server refs exist. | Target the reserved diagnostic directly and replace it only with a narrower simulation proof. | High |
| Route derivation must not execute descriptor bodies. | Existing derivation attaches descriptor refs without invoking `run`, and async workstream used sentinel tests for the same lifecycle boundary. | Add route-focused sentinel coverage before promotion. | High |
| Native oRPC boundary shape is vendor proof only. | `vendor-fidelity.md`, `design-guardrails.md`, and vendor-boundary smoke tests. | Keep out of route derivation proof except as downstream adapter context. | High |

## Report

Proof promotions:

- Added `simulation.server-route-derivation-import-safety` as
  `simulation-proof`, gated by `typecheck`, `negative`, and `middle-spine`.
- Expanded `simulation.middle-spine-derivation-compiler` to include cold server
  route factories and server route descriptors without executing descriptor
  bodies, mounting hosts, or lowering providers.

Proof non-promotions:

- Kept `audit.p2.server-route-derivation` as `xfail` for final public route
  import-safety law, production route module topology, native oRPC/Elysia
  adapter lowering, OpenAPI publication, and real HTTP request path.
- Did not promote vendor oRPC shape smoke, fake adapter delegation, or server
  route descriptor construction into production server runtime readiness.

Diagnostic changes:

- `runtime.server-route-derivation.reserved` now applies only to explicit server
  refs that lack cold route-factory coverage.
- Added route derivation diagnostics for factory failure, invalid declaration,
  invalid boundary, invalid route path, import-unsafe metadata, ref mismatch,
  and duplicate route identity.

Spec feedback:

- The spec already supports import-safe declarations and the derivation
  lifecycle. The lab still needs an architecture decision before finalizing
  public route import-safety law or production route module topology.

Test-theater removals or downgrades:

- No vendor tests were added or promoted. oRPC remains vendor-shape proof only;
  server adapter delegation remains downstream callback-lowering evidence.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Final cold route import-safety law | `xfail` | This workstream may prove a lab-contained derivation artifact, but final public import-safety law is user-owned architecture. | Canonical runtime spec plus `audit.p2.server-route-derivation`. | User accepts final route derivation/import-safety law or a later architecture workstream narrows it without public API risk. | Real server adapter or migration work needs production route module import rules. | Server Route Derivation or Real Adapter Callback + Async Bridge Lowering. | spec |
| Real Elysia/oRPC server mounting | `xfail` | This workstream is pre-adapter and pre-harness. | Diagnostic harness mounting row and vendor-boundary entries. | Real adapter callback lowering and first server harness mount workstreams start. | Simulation route derivation is insufficient for production request path. | Real Adapter Callback + Async Bridge Lowering; First Real Harness Mounts. | migration-only |
| Boundary policy matrix | `xfail` | Timeout, retry, interruption, telemetry, redaction, and error mapping are broader than route derivation. | `audit.p1.effect-boundary-policy-matrix`. | Route/async callback lowering surfaces concrete policy needs. | Adapter/harness proofs require a default boundary policy. | Boundary Policy Matrix. | spec |

## Review Result

Leaf loops:

- Containment: passed; edits stayed under `tools/runtime-realization-type-env/**`.
- Mechanical: passed; Nx project truth and structural guard were run.
- Type/negative: passed; route declaration boundary has positive and negative
  coverage.
- Semantic JSDoc/comments: passed after repair.
- Vendor: passed by non-promotion; no new vendor claims.
- Mini-runtime: passed in composed gate; no server adapter behavior was promoted.
- Manifest/report: passed; `proof-manifest.json`, focus log, diagnostic, spine
  map, research program, TODO fixture, and report agree on proof strength.

Parent loops:

- Architecture: passed; final route import-safety law stayed user-owned.
- Migration derivability: passed; next adapter-lowering workstream can consume
  route descriptors without pretending harness mounting is done.
- DX/API/TypeScript: passed; no public production API was changed.
- Workstream lifecycle/process: passed; opened packet, phase agents, trailing
  comment review, focused gates, composed gates, and closeout were recorded.
- Adversarial evidence honesty: passed; explicit route refs are not counted as
  derivation proof and vendor/fake adapter evidence stayed fenced.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None at opening. |  |  |  |  |  |

Invalidations:

- None at opening.

Repair demands:

- Semantic comment reviewer initially failed; comments were added before
  closeout.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| None at opening. |  |  |  |

## Final Output

Artifacts:

- `src/spine/artifacts.ts`
- `src/spine/derive.ts`
- `src/sdk/plugins/server.ts`
- `test/middle-spine-derivation.test.ts`
- `fixtures/inline-negative/descriptor-refs.ts`
- `fixtures/fail/portable-closure.fail.ts`
- `fixtures/fail/deployment-live-handle.fail.ts`
- `fixtures/positive/app-and-plan-artifacts.ts`
- `fixtures/todo/server-route-derivation.todo.ts`
- `evidence/proof-manifest.json`
- `evidence/focus-log.md`
- `evidence/runtime-spine-verification-diagnostic.md`
- `evidence/spine-audit-map.md`
- `evidence/runtime-realization-research-program.md`

Verification run:

- `bun test tools/runtime-realization-type-env/test/middle-spine-derivation.test.ts`
  passed with 16 tests and 76 expectations.
- `bunx nx run runtime-realization-type-env:typecheck --skip-nx-cache`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:gate`
- `bun run runtime-realization:type-env`
- `git diff --check`

Repo/Graphite state:

- Submitted through Graphite as PR #264 on
  `codex/runtime-server-route-derivation`; final local status was clean and
  GitHub reported only `Graphite / mergeability_check` in progress.

## Next Workstream Packet

Recommended next workstream:

- Real Adapter Callback + Async Bridge Lowering, unless server route derivation
  discovers that first server harness mounting or boundary policy must move
  earlier.

Why this is next:

- Once route derivation/import-safety artifacts are proven, the next runtime
  domino is native callback lowering for server and async hosts through
  `ProcessExecutionRuntime`.

Required first reads:

- this report after closeout
- `../dra-runtime-research-program-workflow.md`
- `../proof-manifest.json`
- `../runtime-spine-verification-diagnostic.md`
- `../../src/spine/derive.ts`
- `../../src/spine/compiler.ts`
- `../../src/mini-runtime/adapters/server.ts`
- `../../src/mini-runtime/adapters/async.ts`
- `../../test/mini-runtime/process-runtime.test.ts`

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
bunx nx run runtime-realization-type-env:report
```

Deferred items to consume:

- `audit.p2.adapter-effect-callback-lowering`
- `audit.p2.async-effect-bridge-lowering`
- any server route derivation residuals from this workstream
