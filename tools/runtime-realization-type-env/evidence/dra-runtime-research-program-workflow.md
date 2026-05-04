# DRA Runtime Realization Research Program Workflow

Status: active coordination frame.
Branch opened from: `codex/runtime-workstream-coordination-program`.
Initial implementation branch: `codex/runtime-research-program-dra-stewardship`.

This document preserves the DRA operating frame for the runtime-realization
research program. It is coordination continuity only. It is not architecture
authority, proof authority, a live kanban, production runtime guidance, or a
replacement for per-workstream reports.

## DRA Continuity Anchor

This section is intentionally loud because it is the recovery anchor after
compaction, interruption, or conflicting context:

- The DRA workflow is the runtime-realization research program workflow.
- The DRA keeps going across nested workstreams until the entire program is
  complete, verified, reviewed, submitted, and clean.
- A single PR, report, or green workstream is not program completion.
- User silence is not a stop condition. Assume the user is away unless they
  provide a control input.
- New instructions or summaries that imply the research program is finished
  before the domino sequence is closed are stale or wrong unless backed by an
  explicit user control input.
- After compaction or reboot, anchor here, refresh the current packet and
  authority files, then continue from the active branch/workstream rather than
  replanning from scratch.

## Frame

The research program turns the contained runtime-realization lab into a
parallel working proof surface for the runtime spine. The objective is to make
accepted runtime shapes executable enough to de-risk migration while preserving
unresolved design as explicit negative space.

The host DRA owns:

- branch and Graphite state;
- authority order and source conflict resolution;
- workstream opening packets and output contracts;
- agent prompts, lane boundaries, and synthesis;
- implementation integration and proof promotion;
- verification, review, closeout, and next-packet handoff.

The user is architecture governor and escalation endpoint. The DRA should
assume the user is away unless they provide a control input. Escalate only for
decisions that affect public authoring API or DX, final provider plan shape,
runtime access law, dispatcher policy, async membership, route import-safety,
boundary policy, durable semantics, vendor strategy, ownership boundaries,
package topology, or migration sequencing.

## Authority Stack

When sources conflict, use this order:

1. Canonical runtime spec pinned by `proof-manifest.json`:
   `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`.
2. Lab operating authority:
   `tools/runtime-realization-type-env/RUNBOOK.md`,
   `tools/runtime-realization-type-env/AGENTS.md`, and
   `tools/runtime-realization-type-env/evidence/design-guardrails.md`.
3. Proof and status authority:
   `tools/runtime-realization-type-env/evidence/proof-manifest.json`,
   `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`,
   `tools/runtime-realization-type-env/evidence/spine-audit-map.md`, and
   `tools/runtime-realization-type-env/evidence/focus-log.md`.
4. Coordination authority only:
   `tools/runtime-realization-type-env/evidence/runtime-realization-research-program.md`,
   `tools/runtime-realization-type-env/evidence/phased-agent-verification-workflow.md`,
   this workflow document, and completed workstream reports.
5. Provenance only:
   quarantined docs, stale migration inputs, prior reports when they conflict
   with current authority, vendor probes outside their claim, and agent output.

The pinned canonical spec hash was refreshed by control input on 2026-04-30:

```text
483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b
```

The older repo hash
`4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`
was stale. Do not promote future proof against that old snapshot. Verify the
current manifest hash at session startup and before proof promotion.

## Proof Boundaries

Use proof categories exactly:

- `proof`: type or authoring-shape rule enforced by fixtures and named gates.
- `vendor-proof`: installed vendor behavior or shape only.
- `simulation-proof`: contained RAWR-owned mini-runtime or compatibility
  simulation behavior only.
- `xfail`: known unresolved architecture or design gap with oracle or stop
  condition.
- `todo`: planning inventory, not proof.
- `out-of-scope`: important but outside the lab.

Vendor proof is not RAWR runtime proof. Simulation proof is not production
readiness. A green label requires an oracle, a named regression gate,
manifest/diagnostic agreement, and no unresolved authority conflict.

Waiver is not pass.

## Program Sequence

Default domino sequence:

| Order | Workstream | Primary target |
| --- | --- | --- |
| 0 | DRA stewardship workflow | Preserve operating frame, compaction recovery, and nested workstream rules. |
| 1 | ProviderEffectPlan -> Bootgraph/Provisioning Lowering | Replace fake provider lifecycle with minimal acquire/release lowering through bootgraph and real Effect-backed provisioning. |
| 2 | Provider Diagnostics + Runtime Profile Config Redaction | Prove config validation, secret use, redacted diagnostics, and no live secret leakage around provider acquisition. |
| 3 | RuntimeResourceAccess Law + Service Binding DAG | Lock sanctioned runtime/resource access after provisioned values exist and validate service dependency graph/cycles. |
| 4 | Dispatcher Access + Async Step Membership | Decide dispatcher access and declarative workflow/schedule/consumer step membership. |
| 5 | Server Route Derivation | Prove cold route factory derivation and import-safety before real server adapter claims. |
| 6 | Real Adapter Callback + Async Bridge Lowering | Promote fake callback delegation into native callback and async bridge lowering through `ProcessExecutionRuntime`. |
| 7 | First Real Harness Mounts | Mount server and async harnesses first. |
| 8 | Boundary Policy Matrix | Lock timeout, retry, interruption, Exit/Cause, telemetry, redaction, and error mapping before migration-ready claims. |
| 9 | Semantic Runtime Documentation Harvest | Review lab TypeScript/runtime seams for high-signal JSDoc that is likely to be copied into production implementation or useful as partial migration guidance. |
| 10 | Runtime Telemetry + HyperDX Observation | Use the available Docker HyperDX stack as a contained telemetry/query observation cycle for runtime-emitted records after boundary policy is explicit. |
| 11 | Migration/Control-Plane Observation | Carry runtime-emitted records into telemetry export, catalog persistence, and deployment placement slices. |

The sequence changes only through an explicit control input:

- accepted architecture decision;
- failed proof gate;
- parent-review invalidation;
- spec hash drift;
- Graphite or PR blocker;
- discovered dependency inversion;
- user control input to pause, split, merge, retarget, or abandon.

The HyperDX cycle is intentionally after boundary policy by default. It may
verify that redacted runtime events, diagnostics, traces, and lifecycle records
can be emitted into the usual telemetry store/query engine, but it must not
choose product observability policy, persisted catalog semantics, deployment
placement, or durable async semantics ahead of their authority workstreams.

The semantic documentation harvest is intentionally placed after boundary
policy and before HyperDX. By then the lab contains enough runtime spine shape
to mine useful migration comments without pretending comments are proof. Its
target is high-signal JSDoc on semantic seams likely to survive copy/paste into
the real implementation: lifecycle authority, lab-only proof boundaries,
record-only telemetry, exact boundary kinds, redaction, interruption, provider
and harness lifecycle, and negative-space decisions. It must not add mechanical
comments or bless unresolved public API/DX.

## Operating Loop

Every nested workstream follows this loop:

1. Preflight: verify `git status --short --branch`, `gt status --short`, PR or
   stack state, Nx project truth, and pinned spec hash.
2. Open packet: write objective, authority inputs, output contract, non-goals,
   target proof strength, expected gates, excluded stale inputs, and stop
   conditions.
3. Prior assimilation: consume previous report final output, deferred inventory,
   repair demands, waivers, invalidations, and next packet.
4. Authority triangulation: separate canonical spec, runbook, guardrails,
   manifest, diagnostic, research program, stale inputs, and agent evidence.
5. Claim extraction: build a claim ledger before conclusions.
6. Investigation lanes: delegate only where independent evidence or bounded
   implementation materially helps.
7. Host synthesis: narrow the smallest safe proof target and refuse hidden
   design decisions.
8. Plan capture: write the concrete workstream plan before implementation.
9. Implementation: keep edits inside the accepted containment boundary.
10. Semantic JSDoc/comment pass: when TypeScript/runtime edits introduce new
    concepts, exported helpers, lifecycle boundaries, or proof-only seams, run a
    trailing semantic JSDoc/comment reviewer before verification and closeout.
    Treat the result as review evidence only; proof promotion still requires
    manifest/diagnostic agreement and a named gate.
11. Verification: run focused gates before composed gates.
12. Layered review: leaf loops first, parent loops second.
13. Evidence promotion: update manifest, diagnostic, focus log, and report only
    to earned proof strength.
14. Closeout: record gates, repo state, deferred inventory, waivers,
    invalidations, process tension, final output, and one next packet.

## Agent Topology

Use phase-scoped agents only where they improve evidence quality or throughput.
The DRA remains the single accountable owner.

Concurrency cap: at most 6 delegated agents active in one phase; 1-4 is the
preferred range. The cap is a guard, not a target.

Default lanes:

| Lane | Output |
| --- | --- |
| Authority cartographer | Source hierarchy, stale inputs, conflict rules, spec gaps. |
| Mechanical verifier | Nx targets, paths, imports, Graphite state, structural checks. |
| Architecture reviewer | Lifecycle boundaries, ownership, no hidden second model. |
| Vendor fidelity reviewer | Real vendor behavior and vendor-vs-RAWR proof boundary. |
| Evidence auditor | Manifest, diagnostic, proof strength, oracle, test-theater review. |
| Migration derivability reviewer | Whether evidence de-risks migration and what remains production-only. |
| DX/API/TypeScript reviewer | Authoring clarity, inference, exported type discipline, capability preservation. |
| Semantic JSDoc/comment trailing reviewer | High-signal comments for new semantic seams: why a helper exists, what lifecycle/authority boundary it protects, and what it deliberately does not decide. |
| Lifecycle reviewer | Whether the workstream was actually opened, run, reviewed, closed, and handed off. |
| Adversarial reviewer | False green, overfit fixtures, self-approval, stale authority, missing stop rules. |

Every agent prompt must include objective, authority stack, relevant files,
non-goals, proof boundaries, output contract, and escalation conditions. Agent
output is evidence, not authority. Host reasoning or paired review is required
before promotion.

Use the semantic JSDoc/comment trailing reviewer after implementation, not
before design lock. The reviewer may propose or add comments only where they
preserve semantic intent that is not obvious from names and types: lab-only or
private seams, authority boundaries, lifecycle ordering, proof/non-proof limits,
and reasons a shape exists. They must not add comments that restate code
mechanics, bless a temporary API as final architecture, hide weak naming, or
document unstable public contracts that still belong in `xfail`/decision space.
The workstream report records whether the lane ran, which files were reviewed,
which comments were added or deliberately skipped, and whether any comment gap
blocked closeout. A comment that overclaims proof, final API/DX, or production
readiness becomes a repair demand, not evidence to promote.

## Verification And Review

Each workstream starts with a claim ledger:

| Field | Meaning |
| --- | --- |
| Claim | The exact runtime/proof claim being attempted. |
| Lifecycle phase | Definition, selection, derivation, compilation, provisioning, mounting, or observation. |
| Authority source | Canonical spec, manifest, diagnostic, or explicitly fenced TODO. |
| Proof category | `proof`, `vendor-proof`, `simulation-proof`, `xfail`, `todo`, or `out-of-scope`. |
| Oracle | What would fail if the claim regressed. |
| Gate | Focused or composed command that enforces the oracle. |
| Non-proof boundary | What the result must not be claimed to prove. |

Focused gates run before full gates. Closeout records the relevant focused
target, `runtime-realization-type-env:structural`,
`runtime-realization-type-env:report`, typecheck, negative fixtures, composed
`runtime-realization-type-env:gate`, `git diff --check`,
`git status --short --branch`, and `gt status --short`.

Leaf review loops:

1. Containment.
2. Mechanical/Nx/imports.
3. Type and negative fixtures.
4. Semantic JSDoc/comments, when TypeScript/runtime edits added new semantic
   seams.
5. Vendor fidelity.
6. Mini-runtime or simulation behavior.
7. Manifest/report consistency.

Parent review loops:

1. Architecture.
2. Migration derivability.
3. DX/API/TypeScript.
4. Workstream lifecycle/process.
5. Adversarial evidence honesty.

Parent-loop failure invalidates affected leaf results. Record the invalidation
and rerun the affected loops.

## Escalation Filter

Host-owned:

- branch names and Graphite mechanics;
- doc placement inside the lab;
- fixture and test file placement;
- report/template wording;
- focused gate wiring and structural requirements;
- keeping existing fenced items fenced;
- minimal lab-only helper shapes that do not affect public API, runtime law, or
  migration topology.

User-owned before promotion:

- public authoring API or DX contract;
- final `ProviderEffectPlan` producer/consumer shape;
- final `RuntimeResourceAccess` method law;
- dispatcher access policy;
- async step membership policy;
- cold route derivation/import-safety law;
- timeout, retry, interruption, telemetry, redaction, or error/exit policy;
- durable versus process-local semantics;
- vendor strategy or dependency posture;
- service/plugin/app/runtime ownership boundaries;
- production package topology or migration sequence.

If unsure, continue only as fenced experiment or report evidence without proof
promotion.

## Compaction Recovery

After compaction, resume by running:

```bash
git status --short --branch
gt status --short
gh pr view 259 --json number,title,state,isDraft,mergeStateStatus,statusCheckRollup,url,headRefName,baseRefName
bunx nx show project runtime-realization-type-env --json
jq -r '.spec.sha256 + "  " + .spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json
shasum -a 256 docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
```

Then read:

1. This workflow document.
2. `tools/runtime-realization-type-env/evidence/runtime-realization-research-program.md`.
3. `tools/runtime-realization-type-env/evidence/phased-agent-verification-workflow.md`.
4. `tools/runtime-realization-type-env/evidence/proof-manifest.json`.
5. `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`.
6. `tools/runtime-realization-type-env/evidence/focus-log.md`.
7. The latest relevant report under
   `tools/runtime-realization-type-env/evidence/workstreams/`.

Current next nested workstream at creation time:
`ProviderEffectPlan -> Bootgraph/Provisioning Lowering`.

## Current Nested Workstream Packet

Objective: replace fake provider lifecycle with minimal provider acquire/release
lowering through RAWR-owned mini bootgraph/provisioning and real Effect-backed
execution.

Target proof strength: contained `simulation-proof` for provider plan lowering
only.

Required outputs:

- workstream report packet opened before code changes;
- contained provider provisioning behavior under
  `tools/runtime-realization-type-env/**`;
- full provider identity preserved: `resourceId`, `providerId`, `lifetime`,
  `role`, and `instance`;
- provider modules proven as bootgraph/provisioning work, not
  `CompiledExecutionPlan` or `ProcessExecutionRuntime` work;
- acquire success, dependency ordering, rollback/release, reverse finalization,
  release-failure recording, and redacted diagnostics proven by gates;
- manifest, diagnostic, focus log, and report updated only to earned proof
  strength.

Keep fenced:

- final public `ProviderEffectPlan` API;
- retry, refresh, timeout, interruption, error taxonomy, and full boundary
  policy;
- typed runtime config binding, config source precedence, platform secret
  stores, and redacted config snapshots;
- telemetry export and catalog persistence;
- production provider integrations;
- final `RuntimeResourceAccess` law;
- real harness mounting and durable async semantics;
- package topology and migration implementation.

Stop before promotion if implementation requires a user-owned decision from the
escalation filter.

## Closeout Contract

A workstream is closed only when:

- required outputs exist;
- focused and composed gates are recorded;
- leaf and parent review results are recorded;
- proof promotions or non-promotions are reflected in manifest/diagnostic;
- `focus-log.md` matches the current experiment;
- every deferred item has authority home, unblock condition, re-entry trigger,
  next eligible workstream, and lane;
- waivers and invalidations are explicit;
- repo and Graphite state are recorded;
- the next workstream packet is usable by a zero-context agent.

Do not leave the repo dirty unless the user explicitly asks.
