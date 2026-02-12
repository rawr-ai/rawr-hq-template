---
description: Create a new agent plugin under plugins/agents and compose it from canonical HQ authoring workflows/skills
argument-hint: "P=<plugin> [optional notes]"
---

# Create Agent Plugin (HQ)

Create a new **agent plugin** under `plugins/agents/<plugin>/` and then compose its contents (skills/workflows/agents/scripts) using the HQ authoring workflow.

This command is intentionally thin: it scaffolds the plugin container, then delegates creation of each component to `/hq:create-content`.

<core_rules>
- Don’t overwrite/rename/delete existing content unless the user explicitly asks.
- Keep scaffolds minimal; add only what the plugin needs now.
- Use the external plugin sync surface: `bun run rawr -- plugins sync ...` (dry-run first).
</core_rules>

<inputs>
Plugin: `$P`
Notes: `$ARGUMENTS`
</inputs>

<workflow>

<step name="discover">
1. If `$P` is missing: ask for the new plugin directory name (kebab-case) and stop.
2. Ask 3-5 discovery questions:
   - What domain does this plugin own (one sentence)?
   - Who uses it (which tool surfaces: Claude, Codex, both)?
   - What content types will it ship now (skills, workflows, agents, scripts)?
   - Any non-goals or constraints (no network, safety gates, etc.)?
3. Output a short spec (purpose + initial contents).
</step>

<step name="scaffold-plugin">
1. Check if `plugins/agents/$P/` exists:
   - If yes: ask whether to update the existing plugin instead of creating a new one.
2. Create a minimal agent plugin skeleton:
   - `plugins/agents/$P/package.json` (copy the standard agent-plugin shape from existing plugins)
   - `plugins/agents/$P/skills/`
   - `plugins/agents/$P/workflows/`
   - `plugins/agents/$P/agents/` (only if the plugin will ship agents)
   - `plugins/agents/$P/scripts/` (only if needed)
</step>

<step name="compose-content">
1. For each requested component, run the HQ orchestrator:
   - `/hq:create-content T=skill P=$P N=<skill-name>`
   - `/hq:create-content T=workflow P=$P N=<workflow-name>`
   - `/hq:create-content T=agent P=$P N=<agent-name>`
   - `/hq:create-content T=hook P=$P N=<hook-name>`
2. Prefer many small, focused skills over one monolith.
</step>

<step name="review-and-deploy">
1. Run a plugin-level review using `content-reviewer` (critical issues first).
2. Dry-run sync:
   ```bash
   bun run rawr -- plugins sync $P --dry-run --json
   ```
3. Run lifecycle gate before apply:
   ```bash
   rawr plugins sync all --dry-run --json
   rawr plugins sync drift --json
   rawr plugins lifecycle check --target "plugins/agents/$P" --type composed --json
   ```
4. If lifecycle check fails, fix tests/docs/dependents gaps before apply.
5. Apply if preview + lifecycle gate are correct:
   ```bash
   bun run rawr -- plugins sync $P --json
   ```
6. If Claude agents aren’t discoverable after sync, verify marketplace registration:
   - `~/.claude/plugins/local/.claude-plugin/marketplace.json` contains an entry for `$P`.
</step>

</workflow>
