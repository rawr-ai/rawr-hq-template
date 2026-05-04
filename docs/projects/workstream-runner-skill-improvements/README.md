# Workstream-Runner Skill Improvements — Recommendation Set

Status: intermediate artifact / handoff brief / ready for execution as a new workstream.
Date authored: 2026-05-04.
Authored by: prior session DRA (Claude Opus 4.7).

---

## Purpose of this artifact

This document is the **handoff brief** between two sessions:

- **Prior session:** ran the runtime-architecture alignment workstream end-to-end (PR #308), then critiqued the workstream-runner skill itself across multiple dimensions, then produced the recommendation set in §3 below.
- **Next session:** picks up from this artifact and executes the recommendations as a new workstream (with review loops, skill-authoring-quality review, in-place edits to the existing plugin source).

The next session must read this file in full before framing. Everything needed to start cold is here.

---

## 1. Background: how this recommendation set was generated

The prior session ran a multi-phase, multi-fleet workstream that applied the seven recommendations from `docs/projects/rawr-final-architecture-migration/resources/research/runtime-architecture-alignment-plan.md` to the canonical architecture spec. The workstream used the `habitat:workstream-runner` skill as its operating scaffold. After closure (PR #308 open + Graphite-tracked), a meta-conversation surfaced four observations:

1. The workstream went well largely because the **input** (the alignment plan) was research-grade, not because the workstream design was robust.
2. The prior session's workstream **design** had four real gaps: no project-convention preflight (caused a Graphite miss), no DRA-finalize step before closure stewards (caused a steward warn), fleet sizing was over-spec'd in Phase 2/3 then quietly consolidated at execution time, and dependency-lattice handling within Phase 1 was implicit.
3. Most of those gaps mapped to **planning-level meta-design** that the prior session failed to invoke: `cognition:team-design`, `cognition:perspective`, `cognition:system-design`, `cognition:info-assess`, `cognition:testing-design`. The skills exist; the prior session skipped them and improvised meta-design inside workstream-runner instead.
4. Once that displacement was named, most of the prior session's critique of the workstream-runner skill **dissolved** into "planner gap, not skill gap." A small set of critiques **survived** as genuine skill-layer improvements.

The recommendation set in §3 is the surviving load-bearing changes — the ones that would meaningfully improve the skill regardless of how well a planner composes it with meta-design skills.

---

## 2. Constraints the recommendations must respect

Stated by the user during the conversation that produced this set:

- **Small set, high leverage.** Not every detail. Pick the changes that move the skill the most.
- **No brittle external dependencies.** Specifically: do not hard-code dependencies on specific skill / plugin / tool names that may change later (e.g., do not require `cognition:team-design` or `gt` by name).
- **Conceptual dependencies are non-optional; named-tool dependencies are optional.** The skill must require the four meta-design passes (team design / perspective cycling / system design / information assessment) **conceptually**, with a guard that says "if your environment provides skills implementing these, invoke them; if not, apply the concept manually." Specific skill names may change; the four conceptual passes do not.
- **Fit the existing skill structure.** Edits should land in `SKILL.md`, `references/`, and `assets/`. Don't restructure the skill's overall shape; close loops, sharpen framing, add the small set of missing patterns.
- **Match existing authoring style.** The skill is written in a particular voice (concise, imperative, tool-agnostic where it can be, opinionated where it has reason to be). New content should match.

---

## 3. Recommendation set (six items, prioritized by leverage)

### Recommendation #1 — Add a non-optional "Before You Frame" meta-design pass *(highest leverage)*

**Where:** New `references/before-you-frame.md` + a new top-of-workflow step (Step 0) in `SKILL.md`'s Default Workflow.

**What it requires (concepts, not skills):** Before drafting the Frame, the DRA must complete four meta-design passes:

- **Team design.** What roles, how many, what model tier (heavyweight / lightweight / read-only), what coordination pattern between roles, what failure mode per role. Required even for a one-DRA workstream — the answer can be "single role: me," but the question must be answered.
- **Perspective cycling.** Walk the workstream from at least three lenses: future DRA picking up cold; user reviewing PR / merge gate; reviewer auditing for hidden ambiguity. Each lens generates concrete preflight items, gate items, or output-contract items.
- **System design.** Map second-order effects: what fails if each user-decision goes the other way; what fails if each review layer surfaces P1; what fails if input artifacts have drifted. The output is a small failure-mode table feeding into stop conditions.
- **Information assessment.** Evaluate input artifacts *as inputs* before designing on top of them. Identify whether the input typed-distinguishes (decisions / ready / borderline / audit) or whether the DRA must produce that extraction as a Phase 0 output.

**Brittleness guard (verbatim wording the skill should carry):**

> If your environment provides skills implementing these (e.g., team design / perspective / system design / information assessment skills), invoke them. If those skills are unavailable, the four passes are still mandatory — apply them conceptually before framing. Specific skill names may change; the four conceptual passes do not.

**Why this is #1:** Most of the critique surface generated against this skill in the prior session turned out to be displaced criticism of a missing meta-design pass. Codifying the pass into the skill text closes the largest single gap by far. It also reframes what the skill is *for*: discipline, not meta-design — which makes the boundary cleaner and the composition with meta-design skills explicit.

### Recommendation #2 — Promote `decisions.md` to a core canonical artifact

**Where:** New `assets/decisions.md` template + Asset Map entry in `SKILL.md` + new Quality Gate.

**What the asset contains:** for each user-decision item or workstream-level execution-scope choice — the question, options considered, option chosen, rationale, and downstream effect on lanes / phases / output. The shape used in `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/decisions.md` is a working reference.

**Workflow integration:** named in Default Workflow Step 4 ("Create the record") as a sibling artifact, not buried inside the workstream record. New Quality Gate: *"Every borderline call has explicit rationale recorded in `decisions.md` or in a finding record."*

**Why:** Decisions are first-class to almost every workstream of consequence. Today they leak into the workstream record's freeform sections, which makes them hard to cite and easy to forget. A typed artifact promotes them to the same status as findings and deferrals.

### Recommendation #3 — Add an explicit "DRA Finalize" step before closure stewards fire

**Where:** New step in `SKILL.md` Default Workflow between the existing "Review and repair" step and the "Close or hand off" step; reinforced in `references/closure.md`.

**What the step requires:**

- Stage and commit any pending edits (decisions register / deferrals / backlog updates).
- Update the workstream record header (status, current phase, branch/commit pointer).
- Populate the Findings index, Outcome Record, Review Result, Final Output, and Next Packet sections from the now-complete child artifacts.
- *Then* invoke the closure-readiness stewards.

**Why:** The closure-steward agent's job is to catch what the DRA missed; today the workflow ordering lets the steward catch what the DRA *hasn't done yet*, which is the wrong job for an audit role. This is a one-step ordering fix that prevents a recurring "warn → DRA repairs → re-audit" round-trip.

### Recommendation #4 — Inline preflight categories under "Ground the workstream"

**Where:** Expand Default Workflow Step 1 in `SKILL.md` (no new asset — this is two paragraphs).

**What to check (categories, not tools):**

- Repo state (branch, working tree, recent history, related branches).
- **Repo conventions** (any `docs/process/*` runbooks; any local stacking / submission tooling; any project-specific AGENTS.md or CLAUDE.md; hook configuration; lint / CI conventions; permission boundaries the user has configured).
- Authority inputs (canonical specs, governing docs, prior decisions).
- Project-local quarantine / archive directories (so they get fenced as stale-input rather than silently consumed).

**Brittleness guard:** the categories are tool-agnostic. The skill says "check whether the repo uses a stacking convention" — not "check whether `gt` is installed." Project-specific runbooks fill in the names. (This is what would have caught the Graphite miss in the prior session without binding the skill to a specific tool.)

### Recommendation #5 — Add a `references/coordination-patterns.md` reference

**Where:** New reference file. Two patterns, both at workstream-runner's actual layer (not duplicated in meta-design skills).

**Pattern A — Cross-phase state propagation.** When a Phase 0 decision must reach Phase 2 worker briefs, the state lives in `decisions.md` as a *live-state header* that worker briefs cite by reference, not by copy-paste. Worker briefs include a `Decisions in effect for this lane:` slot that names which decisions apply, so a state change in `decisions.md` is detectable as a brief invalidation. Concrete enough to ship; covers the gap that team design doesn't fill.

**Pattern B — Parallel-lane coordination on a shared artifact.** When multiple lanes edit one file in parallel, workers write *patch files* (BEFORE/AFTER blocks in a `findings/lane-X-patch.md`) and the DRA serializes application via `Edit`. Avoids race conditions, gives auditable provenance, and keeps lane-level commits atomic. Optional alternative: dedicated lane branches that the DRA merges in order.

**Why:** These two patterns survived the "what genuinely belongs in workstream-runner" filter. They're internal-to-one-workstream coordination concerns that no upstream meta-design skill produces. Both patterns were invented ad-hoc during the prior session's runtime-architecture alignment workstream (see commit history on branch `align-arch-spec-with-runtime-realization` for evidence).

### Recommendation #6 — Replace the binary "minimal vs full record" guidance with a sizing rubric

**Where:** Edit `references/records-and-packets.md` (small expansion, no new file).

**Three-question rubric, in order:**

1. *Will this workstream delegate work to other agents?* → If no, agent-packet asset is unused; record stays minimal.
2. *Will this workstream span more than one logical phase or wave?* → If no, use minimal record; the Frame + Output Contract + Findings + Next Packet are sufficient.
3. *Will this workstream produce ≥ 5 child artifacts (findings / patches / decisions)?* → If no, inline child content into the record's sections rather than maintaining an index.

If all three answer yes, use the full record. If only some answer yes, use the minimal record + selective child artifacts.

**Why:** Today the choice between minimal and full is binary and DRA-judgment-only. The rubric closes the over-engineering critique — most workstreams don't need the full 11-section record, and a sizing rubric prevents the record from competing with its own children.

---

## 4. What is deliberately *not* in this set (and why)

- **A `fleet-patterns.md` asset.** Belongs in team-design territory, not workstream discipline. Adding it here would create exactly the brittle layer-crossing dependency the constraints forbid.
- **A `preflight-checklist.md` asset listing tool names.** Listing `gt`, `npm`, `bun`, etc. ages badly. Categories age well; tool names don't.
- **A `worker-brief-templates.md` asset.** Overlaps with team-design's per-role brief authoring; would duplicate.
- **Restructuring the workstream record schema itself.** The schema is fine; the issue was sizing guidance, addressed by Recommendation #6.

---

## 5. Next-session execution brief

The next session should run the implementation as a **workstream**, using the workstream-runner skill. This is slightly recursive (improving the skill via the skill) but appropriate.

### Required posture

1. **Apply the meta-design pass before framing.** The next session is the first chance to dogfood Recommendation #1. Before writing the workstream's Frame, run team design + perspective cycling + system design + information assessment as planning passes. If `cognition:*` skills are available, invoke them; if not, apply the concepts manually.
2. **Edit in-place.** The plugin source is at `tools/workstream-plugin-pack/skills/workstream-runner/` (in this repo). Edit those files directly. Do not duplicate-and-deprecate.
3. **Compose with `workstream-review-loops` for review-lane design.** The sibling skill at `tools/workstream-plugin-pack/skills/workstream-review-loops/` is canonical for review lane design + finding disposition + repair loops. Use it.
4. **Include a skill-authoring-quality review lane.** In addition to the standard review lanes (proof ledger, integration state, closure readiness), add a lane that checks new content against the existing skill files for: voice consistency, conciseness, imperative phrasing, opinionated-where-it-has-reason-to-be tone, tool-agnostic phrasing where appropriate. The reviewer should read existing `SKILL.md` + a sample of existing references / assets before grading new content.
5. **Run as a small workstream.** This is six recommendations across roughly six to eight files in one skill plus light edits to a sibling skill. A 3-4 phase workstream with a small fleet (1-2 worker roles + 1-2 reviewer roles + the standard stewards) is the right size. Resist over-decomposition.

### Required first reads (cold start)

In order:

1. This file (`docs/projects/workstream-runner-skill-improvements/README.md`).
2. `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` and all files in its `references/` and `assets/` subdirectories.
3. `tools/workstream-plugin-pack/skills/workstream-review-loops/SKILL.md` and `references/review-lanes.md`.
4. The companion steward agent files at `tools/workstream-plugin-pack/agents/` (workstream-opening-steward, workstream-proof-ledger-auditor, workstream-closure-steward).
5. **Evidence of the patterns this set asks the skill to canonicalize:** `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/` — the prior workstream's record, decisions.md, and findings/ directory. The decisions.md there is the working reference for Recommendation #2; the lane-X-patch.md files are working references for the parallel-lane pattern in Recommendation #5; the wave-1-packet.md is a working reference for cross-phase state propagation in Recommendation #5.
6. The prior workstream's PR (`gh pr view 308`) — context for the kind of work the skill is being improved to scaffold.

### Required output contract

- Edits applied in-place to `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md`, `references/`, `assets/`, and (where Recommendation #5 / #6 / #2 require it) sibling files.
- Light edits to `tools/workstream-plugin-pack/skills/workstream-review-loops/` if review-lane design needs to acknowledge the new "skill-authoring-quality" lane pattern (DRA judgment).
- A workstream record + decisions.md + findings/ directory at `docs/projects/workstream-runner-skill-improvements/workstreams/<workstream-slug>/` documenting the improvement work itself. (This mirrors the prior workstream's pattern.)
- A PR ready for user review.
- Closure with a Next Packet pointing at the `~/.claude/plugins/local/plugins/habitat/` deployed copy: confirm whether the in-repo source automatically syncs to the deployed copy, or whether a manual sync step is needed before the improved skill takes effect in subsequent sessions.

### Stop / escalation conditions

- If the four meta-design passes surface a question this brief doesn't answer, escalate to user before framing.
- If editing `workstream-review-loops/` would expand the change set beyond "light edits," surface to user before proceeding (might warrant a separate workstream).
- If the skill-authoring-quality reviewer raises P1 voice / style findings on more than two of the six recommendations, pause and consider whether the brief itself needs to be refactored before continuing.

### What success looks like

The deployed `habitat:workstream-runner` skill, after improvement, would have caught the four design gaps the prior session surfaced (Graphite miss, missing DRA-finalize step, fleet over-spec'ing, implicit dependency-lattice handling) **without requiring the planner to bring meta-design skills explicitly** — but would also be unmistakably clearer that meta-design composition is mandatory and that the skill is the discipline layer underneath it.

---

## 6. Pointers (file paths, in priority order)

| Path | Role |
|---|---|
| `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` | Primary edit target |
| `tools/workstream-plugin-pack/skills/workstream-runner/references/` | Where new references land (`before-you-frame.md`, `coordination-patterns.md`) |
| `tools/workstream-plugin-pack/skills/workstream-runner/assets/` | Where `decisions.md` template lands |
| `tools/workstream-plugin-pack/skills/workstream-review-loops/` | Sibling skill; light edits possible |
| `tools/workstream-plugin-pack/agents/` | Companion stewards; reference only |
| `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/` | Working reference for the patterns being canonicalized |
| `docs/projects/rawr-final-architecture-migration/resources/research/runtime-architecture-alignment-plan.md` | Optional context — what the prior workstream operated on |
| GitHub PR #308 | Optional context — prior workstream's output |

---

## 7. Authoring conventions to match

When drafting new content, match the existing skill's voice. Observed conventions from the current `SKILL.md`:

- **Concise, imperative.** "Use this skill when..." / "Open `references/...` when..." / "Update the record at..."
- **Tool-agnostic where the skill can be.** Says "stacking convention" not `git` or `gt`; says "scoping" not specific permission models.
- **Opinionated where the skill has earned the right.** The disposition vocabulary in `finding-record.md`, the typed-input taxonomy, the primitive-boundary stance — these are all flat assertions, not "consider whether you might..." hedge language. Match that confidence where the new content has earned it (e.g., the four meta-design passes are mandatory; do not phrase them as suggestions).
- **Reference Map and Asset Map are tabular.** New references and assets get rows in those tables.
- **Quality Gates are bullet checklists.** New gates get added as bullets.

---

This artifact is durable. The next session can rely on it as a complete handoff brief without re-reading the conversation that produced it. If anything in the recommendation set needs to change, change it here first; the next session's workstream is bound to this artifact, not to the conversation behind it.
