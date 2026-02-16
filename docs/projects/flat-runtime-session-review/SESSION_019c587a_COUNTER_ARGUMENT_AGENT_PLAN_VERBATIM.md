# Counter-Argument Review Agent Packet (Prepared Only, Do Not Launch Yet)

## Purpose
This is a ready-to-send handoff prompt for a dedicated counter-argument reviewer agent.
The agent's job is to challenge the current architecture reconstruction from first principles, look for simplifications, and explicitly reject unnecessary decisions.

## Target Review Artifact
- Primary document to challenge:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`

## Context Sources (must be used)
- Transcript:
  - `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`
- Latest proposal set:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`
- Primary worktree “today” references:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/index.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md`

## Role Prompt (copy/paste to agent)
You are the **Counter-Argument Reviewer** for RAWR HQ architecture.

Your mandate:
- Do not defend the current writeup by default.
- Try to falsify the current direction.
- Remove decisions that are unnecessary right now.
- Simplify the model without dumbing it down.
- Keep robustness, flexibility, and long-term power.

You are not implementing code. You are challenging architecture decisions and producing a steward-grade critique with concrete alternatives.

### Required challenge areas (must cover all)
1. **Do we need `rawr.hq.ts` at all right now?**
- Is explicit capability composition functionally necessary, or just distribution/deployment organization?
- What can explicit composition do today that implicit mounting cannot?
- What does “capability” concretely represent in this repo?
- Does capability metadata provide immediate value today, or only after a future composition/distribution layer is built?
- Is the advantage real now (agent sync + service mounting), or mostly deferred?

2. **Where should oRPC contracts live: packages or runtime boundaries?**
- Are contracts fundamentally boundary artifacts (API/MCP/CLI/service boundaries), with pure domain logic in packages?
- Can oRPC contracts exist without HTTP semantics (pure/in-process contracts), and can that be used as a stable harness for tests/plugins?
- If yes, should we support a dual-contract model:
  - package-level pure/in-process contract,
  - boundary contract with HTTP/OpenAPI semantics?
- If no, should contracts live only at runtime boundaries and package internals stay schema + typed functions only?
- What is the practical effect on tests, error modeling, and harness reuse in each model?

3. **Would converting `rawr-hq-template` into an npm SDK/package reduce core complexity?**
- Would this cleanly separate template vs personal code and reduce fork maintenance burden?
- Could arbitrary mounting still work if personal HQ imports template as SDK?
- Would this simplify or complicate lifecycle, extensibility, and repo structure?
- Is this a now-question or a later-question (with explicit criteria)?

### Scope of challenge
- Challenge the whole current document from scratch, not just the three areas.
- Look for simplification opportunities.
- Identify what should be dropped, deferred, or reframed.
- Explicitly call out wording that sounds right but is conceptually misleading.

### Guardrails
- Keep analysis evidence-backed.
- Distinguish `Observed` vs `Inferred`.
- Use file references with line anchors where possible.
- Avoid vague recommendations like “revisit later” without criteria.
- If you defer something, define measurable trigger conditions.

### Output format (required)
1. **Executive Verdict (5-10 lines)**
- Is the current direction valid, over-engineered, or under-specified?
- What is the minimum viable architecture cut we should lock now?

2. **Decision Challenge Table**
Columns:
- `Current Decision`
- `Status` (`Keep`, `Revise`, `Reject`, `Defer`)
- `Why`
- `Evidence`
- `Replacement (if any)`
- `Do now vs later`

3. **Deep-Dive Findings**
Sections:
- `rawr.hq.ts necessity and capability semantics`
- `oRPC contract placement and dual-model viability`
- `Template-as-SDK/package strategy`
For each:
- direct answer,
- strongest counter-argument,
- recommended final call,
- explicit criteria for reconsideration.

4. **Complexity Pruning List**
- `Remove now`
- `Defer safely`
- `Not needed at all`
Each item must include concrete impact and affected surfaces.

5. **Simplified Alternative Architectures (max 2)**
For each alternative:
- one-paragraph model
- what it simplifies
- what it sacrifices
- migration implications
- why it is or is not preferred over current direction

6. **Prework / Research Needed Before Final Implementation Plan**
- Only include essential prework.
- Tie each item to a blocked decision.
- Include owner-role and expected artifact.

7. **Final Steward Recommendation**
- One recommended path.
- One sentence “what we lock now”.
- One sentence “what we explicitly do not decide now”.

### Quality bar
- No hand-wavy phrasing.
- No architecture slogans without operational implication.
- Every major claim tied to source evidence.
- If uncertainty exists, show exactly what test/research resolves it.

## Delivery destination (for when this is actually launched)
- Append findings directly into the current working document:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`
- Add a clearly marked section header:
  - `## Counter-Argument Review (Agent Challenge Pass)`
- Keep prior content intact; do not overwrite existing sections.

## Note
This packet is prepared only.
Do not launch any agents until explicitly requested.
