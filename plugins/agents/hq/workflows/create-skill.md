---
description: Create a canonical skill with references/assets following quality patterns
argument-hint: "P=<plugin> S=<skill-name> [optional notes]"
---

# Create Skill

Create a **new** skill directory that follows the Agent Skills spec and quality patterns:
- `SKILL.md` is a slim entrypoint with tables for reference/asset maps
- long-form guidance lives in `references/` with XML structure for workflows/gates/failures
- templates/checklists/examples live in `assets/` with instructive HTML comments

<core_rules>
- Never overwrite, rename, or delete existing content unless the user explicitly asks.
- Author in the workspace plugin tree: `plugins/agents/<plugin>/...`
- Sync via: `bun run rawr -- plugins sync <plugin-ref> --dry-run --json`, then apply.
- Keep `SKILL.md` small; prefer one-hop references from `SKILL.md`.
- Apply quality patterns from the `skill-authoring` skill and its references.
</core_rules>

<quality_patterns>
Apply these patterns for production-ready skills (load `skill-authoring` for full reference):

**SKILL.md:**
- Reference/asset maps as **tables** (not bullets) with Purpose column
- Core invariants wrapped in `<invariants>` XML with named invariants
- Anti-patterns section with named patterns (e.g., "**Hybrid soup**: mixing...")
- Grounding section for target repo application

**Reference files:**
- Cross-references at top (`> **Related**: see X for Y`)
- Semantic XML tags: `<quality-gates>`, `<failure-modes>`, `<step n="1" name="...">`, `<section name="..." required="true">`
- Failure modes with **Symptom** / **Fix** structure

**Asset templates:**
- Header comment block (purpose, principles, link to guidance doc)
- Inline HTML comments explaining each section
- Checkboxes for acceptance/tracking criteria
- Tables for structured data (risks, tracking)

**Naming:**
- Skill names are **canonically oriented** (domains/nouns): `skill-authoring`, `linear-method`
- Use kebab-case: `arch-spike-to-spec`, not `archSpikeToSpec`
</quality_patterns>

<inputs>
Plugin: $P
Skill name: $S
Notes: $ARGUMENTS
</inputs>

<workflow>

<step name="scope-and-collision-check">
1. If `$P` or `$S` is missing: ask for it and stop.
2. Resolve plugin dir: `plugins/agents/$P/` (ask if it doesn't exist).
3. Check if `skills/$S/` already exists:
   - If yes: propose a new skill name or ask whether to update the existing one.
4. Restate what you will touch (paths) before writing.
</step>

<step name="gather-source-material">
1. Identify any existing local templates/docs to reuse (repo docs, plugin files, prior skills).
2. Read only the relevant sections; keep context small.
3. Capture a short "source map" (local file paths + any external URLs used).
</step>

<step name="design-split">
1. Propose an initial split of topics into separate reference files (e.g., `references/<topic>.md`).
2. Propose which artifacts should be templates in `assets/` (checklists, issue templates, examples).
3. If there are meaningful alternatives (different splits): ask the user to choose.
</step>

<step name="author-skill">
1. Create `plugins/agents/$P/skills/$S/` with:
   - `SKILL.md` (entrypoint: purpose, triggers, how to use, and an index of references/assets as tables)
   - `references/` (long-form docs by topic; prefer smaller files with cross-references)
   - `assets/` (templates/checklists with instructive HTML comments)
2. Use a block scalar (`description: |`) in SKILL.md frontmatter when the text includes `:` or quotes.
3. Ensure `SKILL.md` references at most one hop into `references/` or `assets/` (avoid deep chains).
4. Apply quality patterns from `skill-authoring`.
</step>

<step name="review">
1. Invoke `content-reviewer` on the new/modified files under `plugins/agents/$P/skills/$S/`.
2. Fix critical issues before syncing.
</step>

<step name="sync-to-codex">
1. Dry-run sync: `bun run rawr -- plugins sync $P --dry-run --json`
2. If the preview looks correct, apply sync: `bun run rawr -- plugins sync $P --json`
</step>

<step name="report-back">
1. List every file touched (clickable paths).
2. One-line summary per file (what/why).
3. Note any follow-ups or open questions (optional).
</step>

</workflow>
