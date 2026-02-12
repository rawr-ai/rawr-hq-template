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
- Author in the workspace plugin tree: `plugins/agents/<plugin>/...`
- Use the external plugin sync surface: `bun run rawr -- plugins sync ...` (dry-run first).
- Do not mix plugin command surfaces in examples.
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
1. Route the authored unit to a lifecycle type:
   - `skill` -> `skill`
   - `workflow` -> `workflow`
   - `agent` -> `agent`
   - `hook` -> `composed`
   - `plugin` -> `composed`
2. Run lifecycle checks before sync apply:
   ```bash
   rawr plugins sync all --dry-run --json
   rawr plugins sync drift --json
   rawr plugins lifecycle check --target "plugins/agents/$P" --type <mapped-type> --json
   ```
3. If lifecycle check fails, fix tests/docs/dependents gaps before deploy.
4. For large changes spanning multiple artifact types, switch to composed mode:
   - `plugins/agents/hq/workflows/lifecycle-composed.md`
</step>

<step name="deploy">
1. Dry-run sync the plugin you edited:
   ```bash
   bun run rawr -- plugins sync $P --dry-run --json
   ```
2. If preview + lifecycle gate are green, apply:
   ```bash
   bun run rawr -- plugins sync $P --json
   ```
3. Report:
   - files created/modified
   - sync status summary
</step>

</workflow>
