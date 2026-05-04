# Phase Four Container Adjustment Workstream

Status: `closed`.
Branch: `codex/phase-four-container-adjustments`.
PR: `none`.

This report records the post-Phase-Three adjustment workstream that prepares
the Runtime Realization Lab for a future Phase Four Reference Runtime program.
It is informative continuity only. It is not architecture authority, proof
authority, Lab-Production Proof, Parent-Repo Migration authorization, or a
Phase Four opening packet.

## Frame

Objective:

Remove misleading active packet language, stale topology, Oracle/scenario naming
leakage, and weak proof-ceiling enforcement so the next program naturally
lowers into Reference Runtime container work instead of another Oracle
rehearsal.

Boundary:

- Phase Four is not opened.
- Reference Runtime is README-seeded only.
- No Reference Runtime Nx target, smoke test, manifest proof entry,
  Lab-Production Proof claim, package surface, generator, or parent repo
  migration change is added.
- Final Nx/package/generator ratchet remains deferred.

Accepted topology decision:

Reference Runtime should use an early lab-contained semantic mirror of the
eventual production topology. The mirror stays under
`tools/runtime-realization-type-env/**`; it must not create final parent repo
package/app/service/plugin paths or public exports.

## Work Performed

Documentation and routing:

- Added `phases/phase-four/README.md` as a preparation-only landing packet.
- Added README-level scaffolds for `src/reference-runtime/` and
  `test/reference-runtime/`.
- Split required reading in `AGENTS.md` and `RUNBOOK.md` into a fast path plus
  task-specific reads.
- Updated topology guardrails to distinguish lab-contained semantic mirroring
  from final Nx/package/generator topology.
- Updated current-state and top-level lab docs to state the current
  materialization explicitly.
- Added a supersession note to the Oracle salvage report: use its
  classification logic, but use current plane topology/reorg docs for paths.
- Repaired active Phase Three next-packet wording so the immediate next move is
  this bounded container/setup adjustment; Phase Four implementation is later.

Runtime and scenario naming:

- Renamed Oracle-named shared runtime bootgraph, resource-access, and service
  binding helper symbols to lab-runtime-neutral names.
- Renamed runtime bootgraph discriminator strings from `oracle.boot-*` to
  `runtime.boot-*`.
- Renamed Work Items scenario symbols, profile id, and sample content from
  fixture language to scenario language.
- Updated affected conformance and Oracle tests to use the neutral names.

Guard hardening:

- Updated the architecture inventory target list to match `project.json`.
- Added structural inventory-vs-project target drift detection.
- Added Reference Runtime README-scaffold checks and TypeScript-source gating
  until an explicit Reference Runtime target exists.
- Added import-direction checks for Reference Runtime and scenario paths.
- Added shared-runtime Oracle-name and `oracle.boot-*` rejection outside
  Oracle-owned code.
- Added scenario fixture-name rejection under `scenarios/**`.
- Tightened manifest validation so proof statuses cannot be gated only by
  structural/report checks, and `simulation-proof` requires a behavioral target.
- Added active-doc stale externality/design attractor checks.

## Proof Boundary

No proof status changed. The strongest current claim remains Phase Three
contained Oracle `simulation-proof` and migration-decision evidence.

This work prepares a clearer container for a future Phase Four Reference
Runtime proof campaign. It does not prove Reference Runtime behavior, durable
Inngest semantics, live HyperDX product visibility, RuntimeCatalog persistence,
deployed host lifecycle, final public API/DX, final Nx/generator ratchet, or
Parent-Repo Migration readiness.

## Review Result

Planning and implementation used non-overlapping lanes:

| Lane | Disposition |
| --- | --- |
| Architecture/mirroring | Accepted early lab-contained semantic mirror; final Nx/package/generator ratchet deferred. |
| Testing/proof | Accepted guard hardening without adding a theatrical Reference Runtime target. |
| Information design | Accepted packet normalization around Phase Four container/setup and fast-path reading. |
| Mechanical | Accepted neutralized shared runtime names, scenario names, inventory drift guard, and stale wording checks. |
| Coordination | Accepted DRA-owned synthesis; worker lanes were closed when partial edits were integrated locally. |

Leaf validation performed before final closeout:

- Structural guard run directly: passed.
- Typecheck: passed after runtime/scenario naming updates.

Full verification passed before closeout. Reviewer findings were accepted and
repaired before the final verification rerun.

## Deferred Inventory

| Item | Status | Authority home | Re-entry trigger |
| --- | --- | --- | --- |
| Open Phase Four Reference Runtime program | `todo` | `phases/phase-four/README.md`; topology guardrail | User/DRA opens Phase Four with a named first proof slice and gate. |
| Add Reference Runtime source/test/gate | `todo` | `src/reference-runtime/README.md`; `test/reference-runtime/README.md` | Phase Four opens and names an honest Reference Runtime smoke/integration oracle. |
| Retire Oracle compatibility barrel reliance | `todo` | `src/oracle/index.ts`; topology guardrail | A focused import cleanup can replace compatibility imports without weakening reports. |
| Decide final ProviderEffectPlan split | `xfail` | Runtime spec; manifest provider-plan entries | Reference Runtime provider-resource slice needs accepted public/implementation shape. |
| Final Nx/package/generator ratchet | `out-of-scope` | Future final structure/Nx/generator phase | Lab-Production Proof is sufficient to test migration topology. |

## Verification

Closeout commands run:

- `bunx nx show project runtime-realization-type-env --json`
- `bunx nx run runtime-realization-type-env:structural`
- `bunx nx run runtime-realization-type-env:report`
- `bunx nx run runtime-realization-type-env:typecheck`
- `bunx nx run runtime-realization-type-env:negative`
- `bunx nx run runtime-realization-type-env:vendor-effect`
- `bunx nx run runtime-realization-type-env:vendor-boundaries`
- `bunx nx run runtime-realization-type-env:oracle`
- `bunx nx run runtime-realization-type-env:middle-spine`
- `bunx nx run runtime-realization-type-env:simulate`
- `bunx nx run runtime-realization-type-env:gate`
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Result:

- All Nx targets and the composed `gate` passed.
- `git diff --check` passed.
- Final Git/Graphite status was checked before commit.

## Next Packet

The next eligible program is Phase Four Reference Runtime, but it should open
only after an explicit control decision. Its first packet must name one narrow
Reference Runtime proof slice, the gate, the proof ceiling, vendor-live/product
checks required for that slice, residuals outside the slice, and the rule that
Oracle may serve as regression substrate but not runtime implementation.
