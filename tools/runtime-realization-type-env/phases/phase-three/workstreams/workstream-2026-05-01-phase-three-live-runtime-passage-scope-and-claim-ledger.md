# Phase Three Live Runtime Passage Scope And Claim Ledger

Status: `closed`.
Branch: `codex/runtime-phase-two-closeout-handoff`.
PR: `none`.
Commit: `pending`.

This report is informative continuity for the runtime-realization lab. It is
not architecture authority, runtime proof authority, or Parent-Repo Migration
authorization.

## Frame

Objective:

- Open Phase Three child 1 after explicit user approval and decide what
  contained live-runtime passage Phase Three should prove before implementation.
- Preserve the Phase Two correction: Phase Two proved contained spine
  composition, not Lab-Production Proof.
- Produce a live-passage matrix, proof ceilings, residual routing, and exactly
  one first executable proof-slice recommendation for DRA disposition.

Containment boundary:

- Work stays inside `tools/runtime-realization-type-env/**`.
- This child is coordination and scoping only. It does not edit runtime source,
  production code, root workspace config, production topology, or final
  Nx/generator ratchets.

Non-goals:

- Do not implement Elysia, Inngest durability, HyperDX product visibility,
  RuntimeCatalog persistence, production host lifecycle, final public API/DX
  law, or final structure/Nx/generator ratchet.
- Do not promote Phase Two simulation or vendor evidence beyond its earned
  category.

## Opening Packet

Opening input:

- User approved implementation of the Phase Three DRA mission workflow on
  2026-05-01.
- Phase Three program workstream requires child 1 to map live passage and
  recommend exactly one first executable proof slice.

Runtime/proof authority inputs:

- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/guidance/guardrails-design.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/systems/effect-integration-map.md`
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- manifest-pinned runtime spec:
  `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

Coordination inputs:

- active DRA workflow reference:
  `../workflow-phase-three-program-dra.md`
  (filename still contains `draft`; contents are the active operating reference)
- `workstream-2026-05-01-phase-three-program-workstream.md`
- `tools/runtime-realization-type-env/phases/phase-two/handoffs/handoff-2026-05-01-post-phase-two-runtime-reframe.md`
- `workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`
- `README.md`
- `TEMPLATE.md`
- `tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md`

Evidence inputs:

- Four explorer lanes:
  - authority/proof terrain;
  - live-runtime-passage dimensions;
  - domino/leverage and deferral containers;
  - felt experience and inspectability.
- Local source/test inspection of the Phase Two integrated rehearsal, provider
  spine, oRPC boundary, Inngest boundary, observation spine, harnesses,
  bootgraph, catalog, process runtime, and vendor-boundary notes.

Excluded or stale inputs:

- Runtime-prod branch topology, generated syntax, package layout, or stale
  migration-plan language unless re-derived from current authority.
- Phase Two wording that implies Lab-Production Proof.
- Explorer conclusions as final judgment.

Control inputs:

- Phase Three opened by explicit user approval on 2026-05-01.
- DRA accepted this child recommendation after synthesis: the first executable
  proof slice is the started process assembly plus stop/finalization passage.

Selected skill lenses:

- `team-design`: non-overlapping evidence lanes and DRA-owned synthesis.
- `architecture`: current/target/transition separation and lifecycle ordering.
- `target-authority-migration`: proof ceilings, domino sequencing, and clean
  residual containers.
- `testing-design`: falsifier-first proof-slice recommendation.
- `information-design`: durable claim-ledger shape.
- `graphite` and `nx-workspace`: repo, stack, and target preflight.

Refresher:

- Workstream template refreshed: `yes`.
- Phased workflow refreshed: `yes`.
- Program and DRA workflow refreshed: `yes`.

## Prior Workstream Assimilation

Previous report consumed:

- `workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`

Prior final output accepted or rejected:

- Accepted: Phase Two closed as contained spine-composition proof and
  migration-decision evidence.
- Accepted: strongest Phase Two claims are contained `simulation-proof` for
  provider/config/Effect, oRPC Fetch, Inngest function/step, telemetry/catalog
  observation, and integrated rehearsal.
- Rejected: any interpretation that Phase Two proves Lab-Production Proof,
  Reference Runtime passage, durable async semantics, product HyperDX
  observability, RuntimeCatalog persistence, or final Nx/generator ratchet.

Deferred items consumed:

- Production host lifecycle.
- Durable Inngest semantics.
- Product HyperDX/query/dashboard/retention policy.
- RuntimeCatalog persistence and control-plane topology.
- Production config precedence and platform secret stores.
- Native host telemetry/error mapping.
- Final public API/DX laws.
- First production resource/provider catalog.
- Final structure/Nx/generator ratchet.

Deferred items explicitly left fenced:

- All production-only and public-law residuals above remain fenced until a
  later child or later phase opens them explicitly.

Repair demands consumed:

- None.

Next packet changes:

- The next child is not Elysia, async durability, observation policy, or
  structure/Nx work. It is a started process assembly plus stop/finalization
  passage proof slice.

Invalidations from prior assumptions:

- Historical Phase Three structure/Nx/generator sequencing remains invalidated
  as the immediate next default by the post-Phase-Two reframe.

## Output Contract

Required outputs:

- Live-runtime-passage matrix.
- Proof target and proof ceiling ledger.
- Ranked domino candidates.
- Exactly one recommended first executable proof slice with claim, falsifier,
  focused gate, residuals, and stop conditions.
- Deferred inventory with authority homes and re-entry triggers.
- Next workstream packet.

Optional outputs:

- None.

Target proof strength:

- This child is `out-of-scope` coordination only.
- The recommended next child may target contained `simulation-proof`.

Expected gates:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash check
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `git diff --check`

Stop/escalation conditions:

- Stop if the recommended slice requires Parent-Repo Migration.
- Stop if the slice depends on unaccepted public API/DX, durable async,
  product observability, config/secret, control-plane, or topology law.
- Stop if a claim would sound production-ready while relying on lab or vendor
  evidence.
- Stop if vendor or telemetry behavior is investigated without skill
  introspection, a dedicated official-docs lane, and explicit separation of
  vendor constructibility, local installed behavior, local integration docs, and
  RAWR-owned runtime passage.

## Acceptance / Closure Criteria

This workstream may close only when:

- required outputs are present;
- the DRA has accepted, rejected, or revised the first proof-slice
  recommendation;
- every residual has an authority home, unblock condition, and re-entry
  trigger;
- leaf and parent review loops are recorded;
- manifest/focus/report status reflects coordination-only proof strength;
- repo and Graphite state are recorded;
- the next packet is usable by a zero-context agent.

## Workflow

Preflight:

- Verified branch `codex/runtime-phase-two-closeout-handoff`.
- Verified clean repo state before edits.
- Verified Nx project metadata for `runtime-realization-type-env`.
- Verified manifest-pinned runtime spec hash:
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.

Investigation lanes:

| Lane | Agent | Output consumed | DRA disposition |
| --- | --- | --- | --- |
| Authority/proof terrain | Explorer | Manifest counts, proof ceilings, relevant entries, status drift note. | Accepted as evidence pointers; not judgment authority. |
| Live passage dimensions | Explorer | Matrix across lifecycle, provider, runtime, adapter, server, async, observation, control-plane, falsifiers, integrated rehearsal. | Accepted as evidence pointers; DRA synthesized scope. |
| Domino/leverage | Explorer | Ranked candidate dominoes and clean deferrals. | Accepted the top recommendation after local verification. |
| Felt experience | Explorer | Audience inspectability map and wording guardrails. | Accepted as artifact/design input. |

Phase teams:

- `discovery`: DRA plus four explorer lanes. This was justified because child 1
  had broad independent evidence axes and the outputs were non-overlapping.
- `synthesis`: DRA only. Explorer conclusions were not used as final judgment.

Agent scratch documents:

- Not used. Agent outputs were bounded and integrated directly into this
  report.

Design lock:

- Phase Three should prove a contained live passage as an inspectable lab
  runtime story, not as Lab-Production Proof.
- The first proof slice should make the already-integrated spine passage into
  a first-class started/stopped process assembly proof.

Implementation summary:

- Added this child-1 scope/claim-ledger report.
- Updated manifest/focus current experiment to this child as `out-of-scope`
  coordination.
- Updated Phase Three control state to open and recorded the DRA slice
  acceptance.
- No runtime source edits were made in this child.

Semantic JSDoc/comment trailing pass:

- Skipped; no TypeScript/runtime source edits were made.

Verification:

- Recorded in `Final Output`.

Review loops:

- Recorded in `Review Result`.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Phase Two proved contained spine composition, not Lab-Production Proof. | `tools/runtime-realization-type-env/evidence/proof-manifest.json`, `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`, `workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`, `tools/runtime-realization-type-env/phases/phase-two/handoffs/handoff-2026-05-01-post-phase-two-runtime-reframe.md`. | Phase Three proof language stays lab-contained. | High |
| The live-passage dimensions are lifecycle, provider/config/Effect, process runtime/invocation, adapter/native callbacks, server, async, observation, handoff/control-plane, and falsifiers. | `workstream-2026-05-01-phase-three-program-workstream.md`; manifest entries listed in current experiment; local source/tests. | Use these dimensions as the child-1 claim ledger. | High |
| The highest-leverage first executable slice is started process assembly plus stop/finalization. | Runtime spec sections 17, 18, 21, 24; Phase Two integrated rehearsal test; bootgraph/harness/process-runtime code. | DRA accepts this as next child. | High |
| Elysia, durable Inngest, product HyperDX, RuntimeCatalog persistence, control-plane topology, final public API/DX, and Nx/generator ratchet are not first. | Manifest residuals; vendor fidelity notes; Phase Two closeout deferred inventory. | Keep each behind an explicit residual container. | High |

## Live-Passage Claim Ledger

| Dimension | Current evidence | Phase Three claim target | Proof ceiling | Residual fence |
| --- | --- | --- | --- | --- |
| Lifecycle passage | Derivation/compilation, bootgraph, harness start/invoke/stop, finalization records exist in lab tests. | Prove one selected toy passage can be started, invoked, observed, stopped, and finalized as one contained story. | `simulation-proof` | Production host lifecycle remains fenced. |
| Provider/config/Effect | Provider acquire/release, config validation/redaction, shared runtime-owned Effect access, and finalization are proven in Phase Two. | Reuse provider passage as part of the started process assembly. | `simulation-proof` plus `vendor-proof` for Effect mechanics | Final provider API, config precedence, secret stores, refresh/retry remain fenced. |
| Process runtime/invocation | Registry, descriptor identity, runtime access facade, and `ProcessExecutionRuntime` invocation are proven. | Show server and async invocations share the assembled process runtime and provider resources coherently. | `simulation-proof` | Final `RuntimeAccess` method law and dispatcher public law remain fenced. |
| Adapter/native callbacks | Lab adapters lower server/async payloads and delegate into the process runtime. | Keep adapter delegation visible in the passage. | `simulation-proof` | Native host callback lifecycle and host error mapping remain fenced. |
| Server boundary | Real `@orpc/server/fetch` path crosses a Fetch request into the Oracle server harness. | Include contained oRPC Fetch request as the server ingress for the passage. | `simulation-proof` | Elysia mount, OpenAPI, production HTTP, auth/logging remain fenced. |
| Async boundary | Real `inngest/bun` serve/function/step path crosses into the Oracle async harness. | Include contained Inngest function/step request as the async ingress for the passage. | `simulation-proof` | Scheduling, retry, replay, idempotency, run history remain fenced. |
| Observation passage | Redacted OTLP-shaped export and non-persistent control-plane packet exist. | Emit inspectable run/trace/correlation, source, export, finalization, and candidate-only placement records. | `simulation-proof` or supporting `vendor-proof` | Product dashboards/query/retention and RuntimeCatalog persistence remain fenced. |
| Handoff/control-plane passage | Non-persistent packet summarizes safe deployment/catalog/telemetry facts. | Keep packet as migration-review summary only. | `simulation-proof` | Placement, orchestration, storage, topology remain fenced. |
| Failure/falsifier passage | Existing falsifiers cover invalid config, unmatched oRPC path, unknown Inngest function, and telemetry run drift. | Add or preserve falsifiers for invalid config, wrong ingress, telemetry drift, and post-stop invocation rejection. | Same as target slice | Native error mapping, retry/backoff, arbitrary DLP remain fenced. |

## Ranked Domino Candidates

| Rank | Candidate | Why it matters | DRA disposition |
| --- | --- | --- | --- |
| 1 | Started process assembly plus stop/finalization passage | Pulls derivation, compilation, provisioning, mounting, invocation, observation, and finalization into one inspectable runtime story without Parent-Repo Migration. | Accepted as next child. |
| 2 | Provider/config/Effect runtime-access passage | Important, but already strongly backed by Phase Two and narrower than live passage. | Keep as component evidence inside the accepted slice. |
| 3 | Server oRPC request passage | Useful for later host work, but lane-specific and still fenced from Elysia. | Defer as a focused follow-up only if accepted slice exposes a server-specific gap. |
| 4 | Async Inngest function/step passage | Useful but high false-green risk around durable semantics. | Defer durable semantics; reuse contained function/step crossing only. |
| 5 | Observation/control-plane passage | Necessary for inspectability, but should observe the started passage rather than lead it. | Reuse inside accepted slice. |
| 6 | Structure/Nx/generator ratchet | Important later; wrong first move before live passage is shaped. | Defer to later phase unless program closeout changes sequence. |

## First Executable Proof Slice

Recommended next child:

- `workstream-2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`

Claim:

- A selected contained Oracle app/runtime story can derive and compile its runtime
  spine, provision provider resources through the Oracle bootgraph, assemble one
  process runtime, mount contained server and async harnesses, cross real
  oRPC-Fetch and Inngest-Bun ingress paths into `ProcessExecutionRuntime`,
  project redacted observation/control-plane evidence, stop the mounted
  runtime, finalize providers, and reject post-stop invocation without leaking
  live handles or secrets.

Proof target:

- contained `simulation-proof`.

Focused gate:

- new focused oracle test for the started process assembly passage;
- `bunx nx run runtime-realization-type-env:oracle`;
- `bunx nx run runtime-realization-type-env:middle-spine` if the slice touches
  derivation/compiler artifacts;
- `bunx nx run runtime-realization-type-env:report`;
- full `runtime-realization-type-env:gate` before proof promotion.

Required falsifiers:

- invalid provider config fails before provider build/acquire and does not leak
  secrets;
- unmatched oRPC route does not invoke the server harness;
- unknown Inngest function id does not invoke the async harness;
- telemetry run-id drift is rejected;
- post-stop server and async invocations reject before runtime delegation and
  produce stop/finalization records.

Stop conditions:

- stop if proof requires production code mutation;
- stop if Elysia, durable Inngest, HyperDX product semantics,
  RuntimeCatalog persistence, final public API law, or Nx/generator ratchet
  becomes required;
- stop if the focused test can pass without crossing the runtime path it
  claims to prove.

DRA control decision:

- Accepted. Open the recommended next child unless a later control input
  retargets the program.

## Report

Proof promotions:

- None. This child is coordination only.

Proof non-promotions:

- Parent-Repo Migration authorization.
- Real Elysia serving and production HTTP lifecycle.
- Durable Inngest scheduling, retry, replay, idempotency, and run history.
- HyperDX product query/dashboard/retention/alerting semantics.
- RuntimeCatalog persistence and control-plane topology.
- Native host telemetry/error mapping.
- Final public API/DX laws.
- Final structure/Nx/generator ratchet.

Diagnostic changes:

- No runtime-spine diagnostic status changes are earned by this child alone.

Spec feedback:

- No spec patch is required. Later children may emit decision packets if a
  scoped proof target hits an actual design wall.

Test-theater removals or downgrades:

- None. The next child must avoid a demonstration that replays Phase Two
  fixtures without adding the explicit started/stopped passage oracle.

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Routing owner / DRA decision home | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parent-Repo Migration authorization | `out-of-scope` | Phase Three remains lab-contained. | Manifest `audit.p2.phase-two-program-closeout`; Phase Two closeout; Phase Three program. | A later Parent-Repo Migration workstream explicitly opens production code/topology as accepted control state. | Any claim says Phase Three authorizes Parent-Repo Migration. | Post-Phase-Three migration planning | Phase Three DRA until Parent-Repo Migration DRA accepts handoff. | `parent-repo-migration` |
| Elysia and production HTTP host lifecycle | `xfail` | Current lab proves contained oRPC Fetch only. | `audit.p2.server-orpc-fetch-boundary`; `vendors/README.md`. | Real Elysia mount/request lifecycle is installed and gated in the Lab, or explicitly deferred to Parent-Repo Migration. | Started-passage child needs Elysia wording. | Server host passage or Parent-Repo Migration host workstream | Phase Three DRA; server-host child DRA if opened. | `lab/migration` |
| Durable Inngest semantics | `xfail` | Current lab proves contained function/step crossing only. | `audit.p2.async-inngest-function-step-boundary`; diagnostic async row. | Durable retry/replay/idempotency/run-history policy is accepted and gated. | Async child needs durability claim. | Async durability decision packet | Phase Three DRA; async decision-packet DRA if opened. | `spec/migration` |
| Product HyperDX observability | `xfail` | Current lab proves OTLP-shaped export/local ingest support only. | `audit.telemetry.hyperdx-observation.residual`. | Product query/dashboard/retention gates are accepted. | Observation child tries to green product visibility. | Product observability decision packet | Phase Three DRA; observability decision-packet DRA if opened. | `spec/migration` |
| RuntimeCatalog persistence and control-plane topology | `xfail` | Current packet is non-persistent and candidate-only. | `audit.migration.control-plane-observation.residual`. | Storage/index/retention/rehydration/topology decisions are accepted and gated. | Child treats packet as durable or placement authority. | Control-plane decision packet | Phase Three DRA; control-plane decision-packet DRA if opened. | `spec/migration` |
| Native host telemetry/error mapping | `xfail` | Contained boundary records do not settle native host error taxonomy or host-native telemetry mapping. | `audit.p1.effect-boundary-policy-matrix.residual`; diagnostic observation row; program deferred inventory. | Native host telemetry/error mapping policy is accepted and gated. | Server/async/telemetry child needs native host error behavior. | Host passage child or Parent-Repo Migration integration | Phase Three DRA; host-passage child DRA if opened. | `parent-repo-migration` |
| Production config/secret policy | `xfail` | Lab config/redaction is scoped and not platform precedence/secrets. | `audit.p1.effect-boundary-policy-matrix.residual`; runtime spec config sections. | Platform source order and secret-store policy are accepted and gated. | Proof needs platform-secret behavior. | Config/secret decision packet | Phase Three DRA; config/secret decision-packet DRA if opened. | `spec/migration` |
| Final public API/DX law | `xfail` | Started passage can proceed through lab internals without accepting public law. | Manifest residuals for provider plan, runtime access, dispatcher access, async membership, route derivation. | A child cannot proceed without accepting a public authoring decision. | Proof target hits a public-DX blocker. | Decision packet | Phase Three DRA; decision-packet DRA if opened. | `spec/lab` |
| First production provider catalog | `todo` | Representative provider resources are enough for the first passage; final provider ids are not. | `audit.p2.first-resource-provider-cut`. | Started-passage or Phase Three closeout evidence shows representative resource identity semantics are stable, and a later structure or migration phase explicitly needs production ids. | Structure/migration needs real provider inventory. | Later provider catalog | Phase Three DRA until provider-catalog DRA accepts handoff. | `lab/migration` |
| Final structure/Nx/generator ratchet | `out-of-scope` | Live-passage shape must be proven before ratcheting structure. | Phase Three program; current lab state. | Phase Three closeout says structure is the next domino. | Closeout or child evidence changes sequence. | Later structure/Nx/generator phase | Phase Three DRA until structure/Nx phase opens. | `lab` |

## Review Result

Leaf loops:

- Containment: passed; this child stays inside
  `tools/runtime-realization-type-env/**`.
- Mechanical: passed after review repairs; final command verification is
  recorded in `Final Output`.
- Type/negative: not applicable; no runtime source or type fixtures changed.
- Semantic JSDoc/comments: skipped; no runtime source edits.
- Vendor: passed as proof-boundary review; vendor claims stay supporting only.
- Vendor research protocol: added after user correction; future
  vendor/telemetry children must use relevant skills, a dedicated official-docs
  lane, local integration-doc mining, and durable authority-labeled reports
  where findings need to survive handoff.
- Oracle: no runtime proof added by this child.
- Manifest/report: manifest/focus updated as `out-of-scope` coordination only.

Parent loops:

- Architecture: passed by DRA synthesis; lifecycle order follows runtime spec
  and keeps architecture spec as larger-shape context.
- Migration derivability: passed; the next slice produces migration-decision
  evidence without production authorization.
- DX/API/TypeScript: passed; no public law accepted.
- Workstream lifecycle/process: passed; this report follows the template and
  records DRA disposition before next child.
- Adversarial evidence honesty: passed by DRA synthesis; no lab/vendor claim is
  promoted into Lab-Production Proof.
- Overall program health: passed after dedicated coordination review; child 1
  keeps Phase Three pointed at live-runtime-passage proof, and the accepted next
  child is still the highest-leverage contained domino before product,
  production, or structure/Nx forks.

Pattern Decisions:

| Pattern | Local fix | Structural remediation | Passive absorption target | DRA disposition |
| --- | --- | --- | --- | --- |
| Stale control-state drift across metadata, focus, startup contracts, and next packets. | Updated manifest, current lab state, program startup contract, DRA resume card, final output, and next packet to no-active-child plus accepted next child. | Require stale-state sweep and `Current focus after closeout` in child closeout. | DRA workflow closeout requirements and program child contract. | Accepted. |
| Vendor research rule can stay conditional even when the accepted next child is already vendor-affecting. | Added vendor/telemetry protocol and next-packet inheritance block. | Require `Vendor / Integration Inheritance` in every child opening packet. | DRA workflow pattern capture and child opening packet. | Accepted. |
| Review teams can omit overall-program-health despite user requirement. | Added mandatory overall-program-health lane to DRA workflow and this closeout. | Require owner, exclusions, verdict, and DRA disposition before next child opens. | DRA workflow review rules and child review result. | Accepted. |
| Deferred inventory can name lanes without routing owner. | Added routing-owner/DRA-decision-home column. | Require residual routing owner for every deferred item. | DRA workflow closeout requirements and deferred inventory shape. | Accepted. |

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None |  |  |  |  |  |

Invalidations:

- The immediate structure/Nx/generator ratchet assumption remains invalidated
  as the next default.

Repair demands:

- The next child must prove more than a repackaged integrated test: its oracle
  must include first-class started/stopped process assembly and post-stop
  rejection/finalization evidence.
- Post-review repairs accepted by DRA: stale manifest/program state was updated,
  the runtime spec authority path was corrected, native host telemetry/error
  mapping was authority-homed in this deferred inventory, final verification
  placeholders were replaced, and the resume card now opens the accepted next
  proof slice instead of reopening child 1.
- Pattern remediation accepted by DRA: repeated stale-state and missed-research
  risks are now handled structurally through the DRA workflow's pattern capture
  rule and vendor/telemetry research protocol.

Process tension notes:

| Tension | Impact | Proposed structural fix | Next owner/workstream |
| --- | --- | --- | --- |
| Phase Two integrated rehearsal can look like the whole live passage. | Risk of overclaiming old evidence or under-scoping Phase Three. | Next child must define a distinct started/stopped passage oracle and proof ceiling. | Started process assembly child |

## Final Output

Artifacts:

- `phases/phase-three/workstreams/workstream-2026-05-01-phase-three-live-runtime-passage-scope-and-claim-ledger.md`
- `phases/phase-three/workstreams/workstream-2026-05-01-phase-three-program-workstream.md`
- `phases/phase-three/workflow-phase-three-program-dra.md`
- `phases/phase-three/README.md`
- `evidence/proof-manifest.json`
- `evidence/current-lab-state.md`

Verification run:

- `jq empty tools/runtime-realization-type-env/evidence/proof-manifest.json`:
  passed.
- manifest spec hash check: passed; actual and expected hash both
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `bunx nx show project runtime-realization-type-env --json`: passed.
- `git diff --check`: passed.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed and reported
  current experiment
  `phase-three.program-open-ready-started-process-assembly-stop-finalization`.

Repo/Graphite state:

- Working tree contains this child/report repair's intended evidence edits until
  commit. No unrelated/user-owned changes were identified in this worktree.

Current focus after closeout:

- No active child. Accepted next child:
  `workstream-2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`.

## Next Workstream Packet

Recommended next workstream:

- `workstream-2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`

Why this is next:

- It is the maximum-leverage contained proof slice: broad enough to make the
  runtime passage inspectable, narrow enough to avoid production/repo risk, and
  positioned before server/async/observability/product/structure forks.

Required first reads:

- This child report.
- `workstream-2026-05-01-phase-three-program-workstream.md`
- active DRA workflow reference:
  `../workflow-phase-three-program-dra.md`
  (filename still contains `draft`; contents are the active operating reference)
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/evidence/vendors/README.md`
- `tools/runtime-realization-type-env/phases/phase-two/handoffs/handoff-2026-05-01-post-phase-two-runtime-reframe.md`
- `workstream-2026-04-30-phase-two-closeout-phase-three-handoff.md`
- Runtime spec pinned by the manifest, especially sections 17, 18, 21, and 24.
- Relevant local skills for vendor claims opened by the child, especially
  `orpc`, `inngest`, and any Effect/OpenTelemetry/HyperDX-adjacent skill that
  exists in the active environment.
- For telemetry or oRPC x HyperDX work, mine
  `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`,
  `docs/system/quarantine/TELEMETRY.md`, and discovered related telemetry docs
  such as `docs/system/quarantine/telemetry/orpc.md`,
  `docs/system/quarantine/telemetry/hyperdx.md`, and
  `docs/system/quarantine/telemetry/hq-runtime.md`.

Opening Team / Review Plan:

| Lane | Required? | Owner type | Exclusion boundary |
| --- | --- | --- | --- |
| DRA synthesis | Yes | DRA | Owns final scope/proof promotion; does not substitute for independent review. |
| Official vendor docs | Yes | Dedicated docs-reading agent | Reads broad-to-deep from docs navigation/sitemap; does not decide RAWR architecture truth. |
| Operational/mechanical | Yes | Reviewer or mechanical verifier | Checks commands, repo/Graphite/Nx, artifact hygiene; not architecture judgment. |
| Architecture/proof honesty | Yes | Default/strategy reviewer | Checks authority order and proof inflation; not prose or coordination polish. |
| Vendor fidelity | Yes | Reviewer/docs lane synthesis | Separates official docs, installed behavior, and RAWR runtime passage; not product readiness. |
| Overall program health | Yes | Default/strategy reviewer | Checks Phase Three direction and next-slice leverage; not local implementation detail. |
| Information design | Use if handoff grows | Reviewer | Checks recoverability and stale-state clarity; not proof judgment. |
| Coordination/accountability | Use if agents or residuals multiply | Reviewer | Checks owner/hand-off clarity; not vendor or runtime proof. |

Vendor / Integration Inheritance:

| Field | Value |
| --- | --- |
| Vendor touched? | `yes`: accepted slice crosses oRPC Fetch, Inngest Bun, Effect/runtime, and telemetry-adjacent surfaces. |
| Required skill introspection | `orpc`, `inngest`, and any available Effect/OpenTelemetry/HyperDX-adjacent skill; record explicit `none found` for missing skills. |
| Official-docs lane | Required. Start from each relevant docs hub/navigation/sitemap before narrow pages or searches. |
| Proof-category separation | Keep official docs, installed-package behavior, existing local integration docs, and RAWR-owned runtime passage separate. |
| Durable report disposition | Create/update a labeled vendor/integration research report if the child learns anything future children should reuse; otherwise record explicit no-op reason in the child closeout. |

First commands:

- `git status --short --branch`
- `git branch --show-current`
- `gt status --short`
- `bunx nx show project runtime-realization-type-env --json`
- manifest spec hash check
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`

Deferred items to consume:

- Every row in this child deferred inventory.
- Current manifest `xfail`, `todo`, and `out-of-scope` entries related to live
  passage.
- The repair demand that the next child must add a distinct started/stopped
  passage oracle rather than only replaying Phase Two rehearsal evidence.
- The vendor/telemetry research rule: any vendor-related investigation needs
  skill introspection, a broad-to-deep official-docs lane, clear proof-category
  separation, and a durable labeled research/integration artifact if the result
  will matter after the child closes.
