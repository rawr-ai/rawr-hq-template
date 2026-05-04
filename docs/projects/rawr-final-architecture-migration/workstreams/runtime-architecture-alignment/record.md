# Workstream Record — Runtime-Architecture Alignment

Status: active-draft
Branch: `align-arch-spec-with-runtime-realization`
PR: pending (opens at Phase 4 close)
Commit: HEAD on branch
DRA: Claude Opus 4.7 (this session)
Dates: 2026-05-04 → active

## Workstream State

- Workstream record path: `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/record.md`
- Status: active-draft
- DRA: Claude Opus 4.7 (current session, autonomous mode active)
- Branch/stack: feature branch `align-arch-spec-with-runtime-realization` off `main`; no graphite stack
- Current phase: Phase 0 (Internalization & Decision Resolution)
- Selected skills: `habitat:workstream-runner`, `habitat:workstream-review-loops`
- Selected agents: `workstream-opening-steward` (Phase 0 close), `workstream-proof-ledger-auditor` (Phase 5), `workstream-closure-steward` (Phase 5); ad-hoc Sonnet workers + Opus inquisitors via Agent tool per fleet design
- Selected hooks: none (no automated hooks govern this workstream)

## Frame

- **Objective:** Apply the seven recommendations in `docs/projects/rawr-final-architecture-migration/resources/research/runtime-architecture-alignment-plan.md` to the canonical architecture spec (and minimally to the runtime-realization spec for Rec #7 Option B), with all six user-decision items explicitly resolved, all downstream-audit items addressed, and verification that the post-edit arch-spec functions as the integration document the plan describes.
- **Containment boundary:** Edits to `RAWR_Canonical_Architecture_Spec.md`; cross-reference-only edits to `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`; workstream record + decisions doc + closure + Next Packet; updating `SPEC_UPDATE_BACKLOG.md` to mark alignment item complete; adding deferred-inventory items to `deferrals.md`.
- **Primitive boundary:** This is one workstream, not a program. Each recommendation is a lane inside one of three waves; companion-spec authoring is downstream (Next Packet target), not nested workstreams. No subordinate workstreams are spawned.
- **Non-goals:** any edits to `packages/**` code; resolving the four P0/P1 audit items from `04-runtime-realization-core-spine-audit.md` (separately tracked runtime-spec defects); broader spec-landscape audit follow-ups (Inngest durable workflow, MAWE, bundle signing); regenerating M2 migration plan; authoring deployment / observability / profile / OpenShell companion specs; mining quarantined M2 docs.
- **Done means:** all seven recs applied or formally deferred; six user decisions recorded with chosen option + rationale; downstream-audit items resolved; per-edit leaf reviews dispositioned; per-cohort composed reviews pass; cross-spec integrated review passes; closure steward + proof ledger auditor pass; PR opened for user merge gate; Next Packet hands off to the four downstream workstreams.

## Opening Packet

### Opening input

User invocation of `/habitat:workstream-runner` with the directive: "design a workstream with multiple Opus x Sonnet agent fleets and layered review loops that takes the runtime-architecture-alignment-plan.md and deeply internalizes it, then designs a phased canonical system architecture document alignment plan and executes it all the way through."

This is the material reframing that creates the workstream. Output contract: applied alignment of the canonical specs per the seven recommendations, with explicit resolution of the six user-decision items, executed via multi-fleet layered-review architecture.

### Authority inputs

1. **`docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`** — current text is ground truth for current state.
2. **`docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`** — current text is ground truth for runtime-realization concerns; only L37–L47 region is edited (Rec #7 Option B).
3. **`docs/projects/rawr-final-architecture-migration/resources/research/runtime-architecture-alignment-plan.md`** — research authority for alignment direction (the seven recs, the per-name rule, the registry contents, the downstream audit list).
4. **`docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/01-primary-authorities.md`** — authority order precedent.

### Authority order (conflict resolution)

When the above conflict on a borderline call:
- Current spec text loses to alignment-plan recommendations when the recommendation is the explicit purpose of the workstream.
- Alignment plan loses to user-decision resolutions in `decisions.md` (which themselves implement plan-recommended options or escalate to user).
- DRA judgment synthesizes when a recommendation has multiple defensible readings (e.g., `PortableRuntimePlanArtifact` borderline at §15.8; `ProcessQueueHubResource` category borderline at §10.6).

### Coordination inputs

- `docs/projects/rawr-final-architecture-migration/resources/research/README.md` — research index; informs scope but does not decide truth.
- `docs/projects/rawr-final-architecture-migration/resources/research/SPEC_UPDATE_BACKLOG.md` — backlog tracking.
- `docs/projects/rawr-final-architecture-migration/resources/research/_provenance/2026-05-03-spec-alignment-inputs/runtime-canon-arch-align/notes/` — depth-investigation notes referenced by the alignment plan as `[[depth-investigation-...]]` and `[[source-analysis-...]]`. Sonnet workers cite these by name as evidence in finding records; they do not decide truth.

### Evidence inputs

- The alignment plan's per-recommendation BEFORE/AFTER blocks (§4 of the plan) — verbatim source for Sonnet workers' patches.
- Vendor verification notes referenced in the plan ([[vendor-verification-inngest-integration-mode-2]], [[vendor-verification-effect-v3-api-surface-2]]) — supports recs #5 and #7.

### Excluded / stale inputs

- `.context/quarantine/` and all subdirectories — quarantined M2 execution + lock-spike packets; informative only, not authoritative per `.context/quarantine/AGENTS.md`.
- `_archive/` directories under `issues/`, `milestones/`, `resources/research/`, `resources/spec/` — historical records; do not promote to authority.
- M1 execution materials (M1-U00 through M1-U08 issues, M1 milestone) — completed prior phase; not applicable here.

### Control inputs

User has provided two control inputs at plan exit:
1. Decisions posture: "bake all defaults; escalate only OpenShell" → DRA picks plan-recommended options for decisions #1, #3, #4, #5, #6 silently; gates Phase 0 close on user OpenShell answer (decision #2).
2. Release shape: "one PR for all seven recs" → single feature branch, single PR at Phase 4 close.

### Stop / escalation conditions

- **Stop:** if Phase 0 OpenShell answer cannot be obtained, workstream pauses (does not proceed to Phase 1).
- **Stop:** if Phase 4 cross-spec review surfaces a P1 finding that requires a sixth user decision (e.g., a new contradiction between specs not anticipated by the plan), workstream escalates to user before Phase 5 closure.
- **Stop:** if the alignment plan's BEFORE-block does not match current spec text within reasonable similarity (i.e., specs have drifted since the plan was written), DRA halts the lane and flags the divergence as a finding before any patch lands.
- **Escalate:** discovery of a missing authority input, a contradicted invariant, or a need to edit `packages/**` code → escalate to user; do not silently expand scope.

## Output Contract

- **Required outputs:**
  - Edited `RAWR_Canonical_Architecture_Spec.md` with all seven recommendations applied (or formally deferred per user decision).
  - Edited `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` at L37–L47 region only (Rec #7 Option B cross-reference).
  - `decisions.md` resolving all six user decisions + workstream-level execution-scope choices.
  - This workstream record (kept current through closure).
  - Updated `SPEC_UPDATE_BACKLOG.md` marking the runtime-architecture alignment item complete.
  - Updated `deferrals.md` with deferred companion-spec entries.
  - PR opened on branch `align-arch-spec-with-runtime-realization` summarizing changes, decisions, and review ledger.
  - Next Packet at end of record.
- **Optional outputs:** none beyond required.
- **Claim strength:** every applied edit has evidence link to alignment plan section number + named source investigation note. Cross-references verified (tested via grep). Prose-level edits observed via leaf review. Borderline-case dispositions inferred with reasoning recorded.
- **Surfaces touched:** two spec files; one workstream-record directory (new); one backlog file; one deferrals file; one PR; one feature branch.
- **Expected gates:** Layer-1 leaf review per edit (Opus inquisitor); Layer-2 composed per cohort (Opus integrator); Layer-3 cross-spec integrated (single Opus integrator); Layer-4 closure mechanics (Closure Steward + Proof Ledger Auditor); user gate at Phase 0 close (OpenShell decision); user gate at Phase 4 close (PR approval before merge).

## Workflow

### Preflight (complete)

- Repo state: clean working tree on `main`, up-to-date with origin.
- Branch created: `align-arch-spec-with-runtime-realization`.
- Workstream directory scaffolded: `workstreams/runtime-architecture-alignment/{record.md, decisions.md, findings/}`.
- Alignment plan read in full by DRA.
- Workstream-runner skill assets surveyed; finding-record + agent-packet + wave-packet schemas confirmed.

### Investigation lanes

Not applicable — this is execution work, not exploratory.

### Phase teams

| Phase | Fleet | Owner |
|---|---|---|
| Phase 0 | F0 (Opus DRA solo + Opening Steward) | DRA |
| Phase 1 | F1 (4× Sonnet workers + 4× Opus inquisitors + 1× Opus integrator) | DRA |
| Phase 2 | F2 (3× Sonnet workers + 3× Opus inquisitors + 1× Opus integrator) | DRA |
| Phase 3 | F3 (6× Sonnet workers + 3× Opus inquisitors + 1× Opus integrator) | DRA |
| Phase 4 | F4 (1× Opus integration reviewer + repair workers if needed) | DRA |
| Phase 5 | F5 (Closure Steward + Proof Ledger Auditor, both Opus read-only) | DRA |

### Design lock

- **Output contract:** as stated above.
- **Gates:** four review layers + two user gates.
- **Review lanes:** named per phase; lane outputs become finding records under `findings/`.
- **Scratch policy:** running notes during workstream stay in chat; if ad-hoc scratch files are needed they go under `findings/scratch-*.md` with non-authority header and are deleted/archived at closure.
- **Stop conditions:** as stated under Opening Packet.
- **Entry condition:** Phase 0 user gate must be answered before Phase 1 begins.

### Agent packets

Per-phase agent packets are inlined into `findings/` as work proceeds; the Sonnet worker spawn briefs follow the `agent-packet.md` schema (allowed surfaces, forbidden files, evidence paths, output artifact path, expected diff shape, required output, lane done condition).

### Wave packets

Per-phase wave packets are recorded under `findings/wave-N-packet.md` as each wave opens.

### Scratch policy

No long-form scratch documents. All evidence flows through finding records or this workstream record. Sonnet worker output is captured as commit messages + finding records, never as ephemeral scratch.

## Findings

(Populated during execution. Each finding follows the `finding-record.md` schema.)

## Outcome Record

(Populated at Phase 5.)

## Deferred Inventory

(Populated at Phase 5. Provisional entries — confirmed at closure:)

- Regenerate M2 migration plan against aligned arch-spec.
- Author deployment companion spec.
- Author observability companion spec.
- Author profile companion spec.
- Lock OpenShell vendor status (conditional — only if user picks Option C in Phase 0 and no implementation slice has triggered yet).

## Review Result

(Populated as review loops complete.)

## Final Output

(Populated at Phase 5.)

## Next Packet

(Populated at Phase 5.)
