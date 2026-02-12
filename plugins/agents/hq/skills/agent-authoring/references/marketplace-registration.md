# Marketplace Registration (Why Agents Are Invisible)

If an agent file is correct but does not appear in Claude Code, the most common cause is plugin registration, not the agent itself.

## Registration chain

<workflow>
<step n="1" name="plugin-manifest">
Ensure the plugin has `.claude-plugin/plugin.json`.
</step>
<step n="2" name="marketplace-entry">
Ensure the plugin is listed in the marketplace manifest Claude Code is using.
</step>
<step n="3" name="layout">
Ensure the agent file is under `<plugin>/agents/` (plugin root).
</step>
</workflow>

## Failure modes

<failure-modes>
<failure name="not-listed">
Symptom: plugin files exist on disk but nothing is discoverable.
Fix: add the plugin to the marketplace manifest (or re-run sync that manages it).
</failure>
<failure name="wrong-layout">
Symptom: plugin is listed but agents do not appear.
Fix: ensure `agents/` is at plugin root (not under `.claude-plugin/`).
</failure>
</failure-modes>

