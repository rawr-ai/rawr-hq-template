# Post-Phase-Three Runtime Lab Plane Reorg Plan

Status: `closed`.
Branch: `codex/runtime-lab-plane-reorg`.
PR: `none`.
Commit: `pending at report close`.

This report is informative continuity for the Runtime Realization Lab. It is
not architecture authority, proof authority, or Parent-Repo Migration
authorization.

## Frame

Objective:

Reorganize the Runtime Realization Lab around the four operational planes that
will make the next Reference Runtime phase easier to run: shared SDK/runtime
source, Oracle, Reference Runtime, and scenario packs.

Containment boundary:

All changes stay under `tools/runtime-realization-type-env/**`. No parent repo
`apps/*`, `packages/*`, `services/*`, `plugins/*`, package exports, deployment
topology, or public surfaces change.

Non-goals:

- Do not open Phase Four.
- Do not claim Lab-Production Proof.
- Do not add the Reference Runtime gate before a real Reference Runtime exists.
- Do not rewrite closed phase reports as if they were current source.

## Opening Packet

Opening input:

- User-approved Runtime Realization Lab Plane Reorg Workstream Plan.
- Post-Phase-Three finding that Oracle was valuable regression substrate but
  should not remain mixed with runtime implementation and scenario material.

Runtime/proof authority inputs:

- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/guidance/guardrails-design.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/current-lab-state.md`

Coordination inputs:

- `tools/runtime-realization-type-env/guidance/workflow-phased-agent-verification.md`
- `tools/runtime-realization-type-env/phases/phase-three/workflow-phase-three-program-dra.md`
- `tools/runtime-realization-type-env/phases/phase-three/handoffs/ref-2026-05-01-oracle-salvage-to-reference-runtime-report.md`

Selected skill lenses:

- `team-design`: non-overlapping review lanes.
- `testing-design`: test placement by proof ceiling, not source-tree habit.
- `architecture`: target/current/transition separation and dependency direction.
- `information-design`: operator-readable topology and report structure.

## Output Contract

Required outputs:

- Canonical topology guardrail at `guidance/guardrails-lab-plane-topology.md`.
- Concrete reorg plan/report in this file.
- Source ownership split:
  - `src/runtime/**` for shared runtime substrate.
  - `src/adapters/**` for shared adapter lowering/delegation seams.
  - `src/vendor/effect/**` for vendor-native Effect probes.
  - `src/oracle/**` for Oracle-controlled harness and mounted vendor hosts.
- Scenario pack split:
  - `scenarios/work-items/**` for positive business capability examples.
  - `fixtures/**` only for inline negative, fail, and todo mechanics.
- Test topology split:
  - `test/conformance/**`
  - `test/vendor/**`
  - `test/oracle/harness/**`
  - `test/oracle/falsification/**`
- Updated routing docs, guards, manifest paths, project targets, and tsconfig
  aliases.

Plane(s) touched:

- Shared SDK/runtime source.
- Oracle.
- Scenario packs.
- Conformance/vendor/Oracle test lanes.
- Reference Runtime only as a future topology target in documentation.

Proof ceiling claimed:

No new proof promotion. Existing proof categories remain as recorded in
`proof-manifest.json`. The reorg preserves current gates and keeps Phase Three
closed as contained Oracle `simulation-proof`.

Parent-Repo Migration impact:

None. This change reduces future migration planning confusion but does not
authorize or perform Parent-Repo Migration.

## Work Performed

Topology lock:

- Added `guidance/guardrails-lab-plane-topology.md`.
- Updated `AGENTS.md`, `README.md`, `RUNBOOK.md`, `guidance/README.md`, and
  `guidance/template-workstream-report.md` so future operators route by plane,
  proof ceiling, and scenario-vs-fixture ownership.
- Tightened active guidance so Lab-Production Proof requires a future Reference
  Runtime gate plus required vendor-live/product gates. Oracle metadata or
  simulation-proof cannot upgrade itself into Lab-Production Proof.
- Generalized phase naming guidance to `phase-<phase-slug>` and updated the
  structural guard to inspect `phases/phase-*` dynamically.

Dependency hygiene:

- Moved runtime-shaped Oracle files into `src/runtime/**`:
  process execution, Effect runtime access, bootgraph, provider lowering,
  provider-plan internals, runtime access, service binding cache, boundary
  policy, diagnostics, catalog, deployment handoff, telemetry export, and
  migration/control-plane observation.
- Moved shared adapter seams into `src/adapters/**`: delegation, server, and
  async lowering.
- Moved Effect process-local resource probe into `src/vendor/effect/**`.
- Left vendor-specific Oracle mounted hosts in `src/oracle/adapters/**`:
  oRPC, Elysia, and Inngest remain Oracle-controlled until a later Reference
  Runtime workstream rewrites them into production-shaped integrations.
- Kept `src/oracle/index.ts` as a compatibility barrel only; new topology docs
  mark it as temporary source ownership, not authority.

Testing topology split:

- Moved conformance tests into `test/conformance/**`.
- Moved vendor probes into `test/vendor/**`.
- Moved Oracle regression tests into `test/oracle/harness/**`.
- Moved Oracle failure-mode tests into `test/oracle/falsification/**`.
- Moved positive Work Items material into `scenarios/work-items/**`.
- Updated `project.json`, `tsconfig.json`, fail fixtures, inline-negative
  imports, manifest fixture paths, and evidence pointers to the new locations.

Reference Runtime disposition:

No Reference Runtime smoke or Nx target was added. That is deliberate. The
Reference Runtime plane is now canonically named and routed, but the first
honest Reference Runtime gate belongs to a later bounded Phase Four proof
campaign.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| Oracle had become the accidental home for shared runtime substrate. | Runtime files previously under `src/oracle/**` now compile from `src/runtime/**`. | Moved shared substrate out of Oracle; kept Oracle as harness. | High |
| Positive business examples were mislabeled as fixtures. | Work Items declarations moved from `fixtures/positive/**` to `scenarios/work-items/**`. | Scenario pack vocabulary and guardrails now make this distinction explicit. | High |
| Test directories should express proof ceiling. | `test/conformance`, `test/vendor`, `test/oracle/harness`, and `test/oracle/falsification` all pass focused gates. | Accepted topology. | High |
| `src/sdk/runtime/providers.ts` and `src/runtime/provider-plan-internals.ts` still form a lab-internal bridge. | Dependency review flagged the SDK/runtime cycle. | Accepted transitional seam; documented as not final SDK law. | Medium |
| `src/spine/simulate.ts` still re-exports runtime helpers for compatibility simulation. | Dependency review flagged `spine -> runtime`. | Accepted transitional seam; documented as compatibility simulation support. | Medium |
| Lab-Production Proof wording was too easy to over-promote from simulation proof. | Proof/vendor review flagged `guardrails-design.md`. | Tightened promotion language around Reference Runtime gates. | High |

## Deferred Inventory

| Item | Status | Why deferred | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Build the Reference Runtime plane | `todo` | This cleanup is not Phase Four and should not create a false Reference Runtime gate. | `guidance/guardrails-lab-plane-topology.md`; future Phase Four dossier | Phase Four opens as a bounded Lab-Production Proof campaign. | User/DRA opens Reference Runtime proof phase. | Phase Four Reference Runtime program workstream | `lab` |
| Remove Oracle compatibility barrel reliance | `todo` | Tests remain green through `src/oracle/index.ts`; removing the barrel needs a focused import cleanup. | `src/oracle/index.ts`; topology guardrail | Direct imports can replace compatibility imports without weakening reports. | Next shared-source cleanup or Reference Runtime seed. | Runtime source hygiene workstream | `lab` |
| Decide final ProviderEffectPlan split | `xfail` | Current provider-plan internals are lab-internal and cyclic by design. | Runtime spec; `proof-manifest.json` provider-plan entries | Public/implementation ProviderEffectPlan shape is accepted. | Reference Runtime provider-resource slice. | Reference Runtime provider proof slice | `spec/lab` |
| Retire compatibility simulation exports from spine | `todo` | Existing conformance simulation still uses runtime helpers. | `src/spine/simulate.ts`; topology guardrail | Reference Runtime or runtime-owned conformance path supersedes compatibility simulation. | Phase Four conformance redesign. | Conformance lane cleanup | `lab` |

## Review Result

Leaf loops:

- Mechanical/source integrity: path moves preserved with `git mv`; stale active
  paths updated; structural guard now requires new topology and rejects old
  Oracle-as-runtime paths, old vendor test dirs, old positive fixtures, and
  hard-coded phase lists.
- Type/negative: `typecheck` and `negative` pass after fixing the moved
  deployment handoff fail fixture.
- Test topology: conformance, vendor, and Oracle focused targets pass on the
  new locations.

Parent loops:

- Architecture/dependency direction: no shared source plane imports Oracle.
  Transitional seams are documented.
- Proof honesty/vendor fidelity: no proof categories changed; Lab-Production
  Proof now requires Reference Runtime gates and cannot be promoted from Oracle
  metadata alone.
- Information design: active docs now lead with the plane topology and route
  work by operator task.
- Program/coordination: this remains post-Phase-Three cleanup. It prepares a
  future Phase Four without silently opening it.

Waivers:

| Waiver | Accepted risk | Authority | Rationale | Scope | Follow-up |
| --- | --- | --- | --- | --- | --- |
| Keep `src/oracle/index.ts` compatibility barrel | Some tests can still import shared runtime through Oracle aggregation. | Topology guardrail | Avoids noisy import-only churn in the same reorg while source ownership is now correct. | Current Lab only | Prefer direct shared-plane imports in new work. |
| Keep `spine -> runtime` compatibility simulation seam | Spine is not purely portable yet. | Topology guardrail | Existing conformance simulation gate stays green; later work can move compatibility helpers. | Simulation lane only | Conformance cleanup before or during Phase Four. |

## Final Output

Artifacts:

- `guidance/guardrails-lab-plane-topology.md`
- `phases/phase-three/workstreams/workstream-2026-05-01-post-phase-three-runtime-lab-plane-reorg-plan.md`
- Reorganized `src/runtime/**`, `src/adapters/**`, `src/vendor/effect/**`,
  `src/oracle/**`, `scenarios/work-items/**`, and `test/**` lanes.

Verification run:

- `bunx nx run runtime-realization-type-env:middle-spine`: passed.
- `bunx nx run runtime-realization-type-env:simulate`: passed.
- `bunx nx run runtime-realization-type-env:vendor-effect`: passed.
- `bunx nx run runtime-realization-type-env:vendor-boundaries`: passed.
- `bunx nx run runtime-realization-type-env:typecheck`: passed.
- `bunx nx run runtime-realization-type-env:negative`: passed.
- `bunx nx run runtime-realization-type-env:oracle`: passed.
- `bunx nx run runtime-realization-type-env:structural`: passed.
- `bunx nx run runtime-realization-type-env:report`: passed.
- `bunx nx run runtime-realization-type-env:gate`: passed.

Repo/Graphite state:

- Branch: `codex/runtime-lab-plane-reorg`.
- Unrelated untracked files from another agent are intentionally untouched:
  `.claude/skills/`, `.hyperresearch/`, `CLAUDE.md`, `research/`.

## Next Workstream Packet

Recommended next workstream:

Open a Phase Four Reference Runtime program workstream only when ready to earn
Lab-Production Proof. Its first proof slice should consume shared runtime
source and `scenarios/work-items/**`, avoid Oracle implementation as runtime
substrate, and prove one production-shaped contained flow through app, service,
provider resource, Elysia/oRPC request, Inngest step passage,
telemetry/control-plane observation, ordered stop/finalization, and post-stop
non-delegation.
