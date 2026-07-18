---
description: Create or update skills, workflows, agents, hooks, or whole agent plugins using HQ canonical authoring guidance
argument-hint: "T=<skill|workflow|agent|hook|plugin> P=<plugin> N=<name> [notes]"
---

# Create Content (HQ Orchestrator)

This is the HQ orchestrator entrypoint for authoring:
- skills
- workflows (slash commands)
- agents
- hooks
- full agent plugins

It composes HQ canonical authoring skills and delegates work to HQ authoring agents when useful.

<core_rules>
- Don’t overwrite/rename/delete existing content unless the user explicitly asks.
- Author only in the explicit content workspace under `plugins/agents/<plugin>/...`.
- Authoring stops at source, review, and repository verification. It never builds,
  exports, syncs, retires, or edits provider homes automatically.
- External Oclif extensions use `rawr plugins ...`; curated agent-plugin lifecycle
  uses `rawr agent plugins ...`. Do not mix the channels.
</core_rules>

<inputs>
Content type: `$T`
Plugin: `$P`
Name: `$N`
Notes: `$ARGUMENTS`
</inputs>

<workflow>

<step name="route-and-discover">
1. If `$T` (type) is missing or not one of: `skill`, `workflow`, `agent`, `hook`, `plugin`:
   - Ask one routing question and stop.
2. If `$P` (plugin) is missing: ask which plugin under `plugins/agents/` and stop.
3. If `$N` (name) is missing for `skill|workflow|agent|hook`: ask for it and stop.
4. Run a short discovery interview (adapt from `pm-methodology` / `docs:interview`):
   - What does this do and who is it for?
   - What triggers it (user text, tool boundary, file location)?
   - What are explicit non-goals?
   - What does “done” look like (acceptance criteria)?
   - Any safety constraints (destructive actions, secrets, network, command surfaces)?
5. Output a concise spec (1-2 paragraphs + bullets).
</step>

<step name="research" condition="the content depends on external facts or unfamiliar subsystems">
1. If the task needs research, delegate to `research-agent` on 2-4 axes (in parallel), for example:
   - “in-repo prior art” (paths, invariants, existing patterns)
   - “official external docs” (primary sources)
   - “edge cases / failure modes”
2. Wait for the evidence packs, then synthesize:
   - constraints/invariants to encode
   - terms/glossary to define
   - what to link vs what to inline
</step>

<step name="design-and-author">
1. Load the canonical HQ authoring skill for the chosen type:
   - `skill` -> `skill-authoring`
   - `workflow` -> `command-authoring`
   - `agent` -> `agent-authoring`
   - `hook` -> `hook-authoring`
   - `plugin` -> `plugin-architecture`
2. Decide whether to draft directly or delegate drafting:
   - If multiple independent files: delegate drafting to `content-creator` by artifact (no overlap).
   - If a single small artifact: draft directly.
3. Author content in the repo under `plugins/agents/$P/...`:
   - keep entrypoints small
   - put deep content in `references/`
   - add templates/checklists in `assets/` when needed
</step>

<step name="review">
1. Invoke `content-reviewer` on the changed/new files.
2. Fix critical issues immediately.
3. Present any non-critical warnings and ask the user whether to address them now.
</step>

<step name="lifecycle-gate">
1. Treat `$P` as the release and distribution owner for every authored skill,
   workflow, agent, hook, or script beneath it.
2. Complete source-level tests, documentation, and dependent-reference checks.
3. Do not start a release operation automatically. If the user explicitly asks
   for lifecycle verification, hand off to
   [[plugins/agents/hq/workflows/lifecycle-agent-plugin]], whose first controller
   operation is `rawr agent plugins check`.
</step>

<step name="report">
1. Report:
   - files created/modified
   - source verification performed
   - parent agent-plugin identity
   - whether an explicit lifecycle handoff remains
</step>

</workflow>
