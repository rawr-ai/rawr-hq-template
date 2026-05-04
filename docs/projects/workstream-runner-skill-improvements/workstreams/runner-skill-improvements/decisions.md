# Decisions — Workstream-Runner Skill Improvements Workstream

Status: Phase 0 complete (2026-05-04). Six DRA-default decisions seeded from meta-design passes; brief-borderline items resolved at framing time. Phase 1 unblocked.

This document is the canonical record of every workstream-level execution-scope choice the brief explicitly leaves to the executing DRA, plus the meta-design pass output the brief mandates (Recommendation #1). It is the dogfooded `decisions.md` for this workstream — the same artifact Recommendation #2 promotes to a core canonical artifact.

For each decision the entry records: the question, the options considered, the option chosen, the rationale, and the downstream effect on lanes / phases / output.

---

## Meta-design pass output (Recommendation #1, dogfooded)

Per the brief §5.1 and Rec #1, the four meta-design passes are mandatory before framing. Each pass below records what the concept produced. Where a `cognition:*` skill exists in this environment, the skill name is noted; where it does not, the pass was applied conceptually. Either way, the four passes are non-negotiable.

### Pass 1 — Team design

Concept: roles, count, model tier, coordination pattern, failure mode per role. Available skill: `cognition:team-design`.

Output:

- **DRA:** 1 (this session). Owns synthesis, scope, canonicality, repo state, finding disposition, closure.
- **Worker:** 1, single-thread serial. Sees Decision D-1 below. Failure mode: voice drift; mitigated by per-lane self-check + Phase 2 voice review lane.
- **Reviewers:** 2 — `skill-authoring-quality` (custom, not registered as steward) + `habitat:workstream-closure-steward` (registered). Failure mode: coverage theater on no-evidence claims; mitigated by Decision D-3 (skip proof-ledger auditor).
- **Stewards:** `habitat:workstream-opening-steward` (Phase 0), `habitat:workstream-closure-steward` (Phase 2). Both read-only.

### Pass 2 — Perspective cycling

Concept: walk the workstream from at least three lenses; each lens generates concrete preflight / gate / output-contract items. Available skill: `cognition:perspective`.

Output (preflight + gate items folded into stop conditions and verification §):

- **Future DRA cold-start.** Step 0 in improved `SKILL.md` must name the four conceptual passes by name (not by skill name). `before-you-frame.md` must include a one-line "if the four passes return one-DRA, document that as a decision, not a skip." Asset Map row for `decisions.md` must say *when*, not just *what*.
- **User reviewing PR.** Group commits by recommendation, not by file. PR body must map each rec → files touched. The dogfooded `decisions.md` for THIS workstream must be in the PR so the user can audit the meta-design output.
- **Reviewer auditing for hidden ambiguity.** Every new "must"/"mandatory" phrasing in new content has a matching item in Quality Gates or in a Step. Brittleness-guard wording (Rec #1) appears verbatim from brief §3.1 — no paraphrase. Pattern A and Pattern B in `coordination-patterns.md` each cite the working-reference path.

### Pass 3 — System design

Concept: second-order effects + failure-mode table feeding stop conditions. Available skill: `cognition:system-design`.

Output:

| Failure | Trigger | Detection | Mitigation |
|---|---|---|---|
| Voice drift on >2 recs | Worker reaches for hedge language | Voice reviewer P1 count | Stop condition; refactor brief before re-attempt |
| Rec #5 drifts into team-design territory | Worker imports role/agent vocabulary into `coordination-patterns.md` | Voice reviewer canonicality check | Rec #5 talks about *artifacts and serialization*, not *who does the work* |
| Deployed-copy drift | In-repo source edited, deployed plugin not re-synced | Manual; future-DRA confusion | Next Packet names sync command + path; flagged sub-question to user |
| SKILL.md merge conflicts across Recs #1/#2/#3/#4 | Naive parallel lane execution | Edit conflicts at commit | Single-worker serialization (Decision D-1) |
| README brief drift mid-execution | Recommendation reinterpretation | DRA notices mismatch | Per brief §7, change brief first, not the workstream |

### Pass 4 — Information assessment

Concept: evaluate input artifacts as inputs before designing on top of them. Identify whether the input typed-distinguishes or whether the DRA must produce that extraction as a Phase 0 output. Available skill: `cognition:information-design`.

Output: the brief is **research-grade and decision-locked**. It typed-distinguishes — decisions = §3 recommendations; ready = §3 with Where/What/Why fields populated; borderline = §4 deliberate non-inclusions; audit = §1 provenance; control = §5 stop conditions. Phase 0 does not need to extract or re-decide. Phase 0's only information-design output is this `decisions.md` capturing the workstream-level choices the brief deliberately leaves to the executing DRA.

---

## Workstream-level execution-scope decisions

### D-1 — Worker count and lane parallelism

**Question:** Run six lanes single-worker serial, or split L5+L6 to a second worker for parallelism?

**Options:**

- **A — Single worker, serial across all six lanes (DRA-default).** SKILL.md is the shared spine of four of six recs (Recs #1, #2, #3, #4). Two workers force Pattern B (lane-X-patch serialization) for nearly every commit; coordination overhead exceeds parallelism win at this size.
- **B — Single worker for SKILL.md-touching lanes (L1–L4); second worker for SKILL.md-free lanes (L5–L6).** L5 and L6 are conflict-free with SKILL.md edits. Could shave ~30% of execution time at the cost of a second packet brief.

**Chosen:** **Option A.**

**Rationale:** the brief explicitly says "resist over-decomposition." At six small file edits, Option B's coordination cost dominates its parallelism benefit. Single-worker serial gives clean atomic commits and sequential voice continuity, which the voice review lane benefits from (a coherent worker voice is easier to grade than two workers' voices interleaved).

**Downstream effect:** Phase 1 runs as one worker brief covering all six lanes in SKILL.md write order (L1 → L2 → L3 → L4 → L5 → L6). Pattern B (lane-X-patch) is on standby, not active.

### D-2 — Lane ordering

**Question:** Order the six lanes by recommendation number, by file proximity, or by SKILL.md write order?

**Options:**

- **A — By recommendation number (1→6).** Simplest; matches the brief's enumeration. But Rec #4 is the smallest contained edit and Rec #3 needs other SKILL.md edits in place to renumber correctly — running 1 first risks renumbering churn.
- **B — By file proximity (cluster SKILL.md edits, then references, then assets).** Minimizes file switches. But conflates write-order concerns and creates a large mid-stack SKILL.md commit instead of atomic per-rec commits.
- **C — By SKILL.md write order (Rec #4 → #1 → #2 → #3 → #5 → #6).** L4 (Rec #3 — DRA Finalize step insertion) lands after L1–L3 SKILL.md edits so step renumbering is correct on first write. L5–L6 land last, conflict-free.

**Chosen:** **Option C.**

**Rationale:** atomic per-rec commits + correct step renumbering on first write. L1 (Rec #4) is the smallest contained edit and warms up voice match. L2 (Rec #1) lands the brittleness-guard verbatim wording while voice match is fresh. L3 (Rec #2) touches stable Asset Map and Quality Gates. L4 (Rec #3) inserts the DRA Finalize step into a Default Workflow that already has Step 0 and the new Quality Gate, so renumbering is correct. L5–L6 close out conflict-free.

**Downstream effect:** the lane plan in `lane-plan.md` enumerates lanes in this order. PR commit history is review-friendly per-rec.

### D-3 — Skip workstream-proof-ledger-auditor

**Question:** Invoke `habitat:workstream-proof-ledger-auditor` in Phase 2?

**Options:**

- **A — Invoke it (full steward set).** Defensive default; matches the prior architecture-alignment workstream's posture.
- **B — Skip it.** This workstream produces no evidence-bearing claims, no waivers, no skipped checks with risk classes. Claims are "the file now contains text X" — verifiable by diff.

**Chosen:** **Option B.**

**Rationale:** invoking the proof-ledger auditor on a no-evidence workstream is coverage theater. The auditor's checks (claim strength, evidence homes, waivers, deferred inventory, promotion boundaries, finding disposition) all return trivially pass or N/A when the workstream's claims are diff-verifiable text edits. The auditor's value is on workstreams with proof boundaries; this one has none. Per `workstream-review-loops` Lane Menu, "use the smallest set that covers the risk" — proof-ledger is not a risk here.

**Downstream effect:** Phase 2 review lane set = `skill-authoring-quality` + `closure-readiness`. Recorded in record.md §Review.

### D-4 — Edits to workstream-review-loops/

**Question:** Light edit `workstream-review-loops/references/review-lanes.md` to acknowledge `skill-authoring-quality` as a lane pattern, or leave it unchanged?

**Options:**

- **A — Light edit: add `skill-authoring-quality` row to the lane patterns list.** Costs ~2 lines. Brief §6 explicitly permits "light edits to `workstream-review-loops/`" under DRA judgment.
- **B — Leave unchanged.** Avoids touching a sibling skill. The custom lane is documented in this workstream's record and decisions; future DRAs will see the pattern in the workstream artifacts.
- **C — Defer to Phase 2.** Decide based on whether the voice-review lane's design surfaces other minor edits; bundle them or skip together.

**Chosen:** **Option C — defer to Phase 2.**

**Rationale:** the brief makes this DRA judgment, and the right judgment depends on whether the voice reviewer's design surfaces a concrete one-line addition that genuinely belongs in `review-lanes.md`. If it does, A is cheap and adds discoverability. If it does not, B avoids an unnecessary touch. Defer to Phase 2 framing.

**Downstream effect:** Phase 2 voice-review lane definition triggers a re-decision of A vs B. Record outcome here at that point.

### D-5 — Sync question disposition

**Question:** How to handle the brief §5.6 deployed-copy sync question?

**Options:**

- **A — Resolve in this workstream.** Investigate `install-local-codex-pack.ts` and confirm the sync command for `~/.claude/plugins/local/plugins/habitat/`. Add to closure verification.
- **B — Escalate as Next-Packet finding with all data the user needs.** Investigate enough to confirm sync is manual and to identify the path mismatch; surface the unresolved sub-question to user.
- **C — Defer entirely without investigation.** Note as a follow-up; let user discover at next session.

**Chosen:** **Option B.**

**Rationale:** the install script is manual (no watcher, no hook, no auto-sync), confirmed from `tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts` and `tools/workstream-plugin-pack/notes/downstream-port-notes.md`. But the script's `--target=downstream` writes to `<downstream-root>/plugins/agents/habitat/`, which does not match the deployed copy at `~/.claude/plugins/local/plugins/habitat/`. The mismatch is a real question that requires user input on what `~/.claude/plugins/local/...` is governed by. Option A would expand scope beyond the brief; Option C would leave the user without context. Option B answers what the code permits and surfaces what only the user knows.

**Downstream effect:** Next Packet entry at closure includes (a) confirmed: sync is manual; (b) sub-question: is `~/.claude/plugins/local/plugins/habitat/` the same target as `<downstream-root>/plugins/agents/habitat/` via configured `--downstream-root`, or is it a different sync mechanism?

### D-6 — Record sizing

**Question:** Use `assets/workstream-record.md` (full) or `assets/minimal-workstream-record.md` (minimal) for this workstream's record?

**Options:**

- **A — Full record.** 11 sections; matches the prior architecture-alignment workstream's posture.
- **B — Minimal record + selective child artifacts (`decisions.md`, `findings/`).** Per Rec #6's three-question rubric: this workstream is single-worker serial (no delegation across multiple agents → A is no), single execution phase (Phase 1 has six sequential lanes inside one phase, not multiple phases → B is no), and produces ≤ 8 child artifacts (1 record + 1 decisions + ~6 lane findings + 1 voice review + 1 closure steward = 10, borderline; trimmed: voice review and closure steward are findings, so 1 record + 1 decisions + 8 findings → child-artifact threshold met but with negligible margin). All three rubric questions answer *no* → minimal record.

**Chosen:** **Option B — minimal record.**

**Rationale:** dogfoods Rec #6 itself. The full record's 11 sections include phase teams, agent packets, wave packets, leaf loops, composed loops, and deferred inventory — most of which would be empty or N/A here. The minimal record's spine plus sibling `decisions.md` and `findings/` is exactly the right size for a single-worker, single-phase-of-execution workstream.

**Downstream effect:** record.md follows minimal scaffold. decisions.md (this file) and findings/ are sibling artifacts, not subsections. Closure-steward verifies sibling artifacts exist; minimal record's "Outputs / Evidence / Review findings" sections cite them by reference.

---

## Brief-level decisions (already locked by the brief — recorded for traceability)

These items were decided by the prior session and locked in `docs/projects/workstream-runner-skill-improvements/README.md`. They are not re-opened here; this section exists so a future DRA can audit the full decision set in one place.

- §3.1: brittleness-guard wording verbatim. Locked.
- §3.2: `decisions.md` template promoted to core canonical artifact + new Quality Gate. Locked.
- §3.3: DRA Finalize step inserted between Review and Close. Locked.
- §3.4: preflight categories tool-agnostic, inline under "Ground the workstream." Locked.
- §3.5: Pattern A (cross-phase state propagation) + Pattern B (parallel-lane patches) in new `coordination-patterns.md`. Locked.
- §3.6: three-question sizing rubric replaces binary minimal-vs-full guidance. Locked.
- §4: deliberate non-inclusions (no `fleet-patterns.md`, no `preflight-checklist.md` listing tool names, no `worker-brief-templates.md`, no schema restructure). Locked.
