---
description: Create, update, rename, or audit curated agent-plugin source without mutating lifecycle or provider state
argument-hint: "CONTENT_WORKSPACE=<absolute path> PLUGIN=<id> [request]"
---

# Curated Agent-Plugin Content Ops

Use this workflow for skills, workflows, agents, hooks, and scripts owned by a
curated agent plugin. The explicit content workspace is source authority for the
edit; it is never controller, artifact, channel, or provider identity.

<invariants>
<invariant name="source-only-authoring">Authoring changes repository source only. It does not build, package, export, sync, retire, promote, or undo.</invariant>
<invariant name="one-distribution-owner">Every content unit belongs to exactly one parent agent plugin under `plugins/agents/&lt;plugin&gt;`.</invariant>
<invariant name="qualified-lifecycle">Curated lifecycle uses `rawr agent plugins ...`; external Oclif extensions use `rawr plugins ...`.</invariant>
<invariant name="no-provider-edits">Never author in provider homes, caches, marketplaces, registries, or generated exports.</invariant>
</invariants>

## Source Shape

```text
plugins/agents/<plugin>/
├── skills/<skill>/SKILL.md
├── workflows/<workflow>.md
├── agents/<agent>.md
├── hooks/
├── scripts/
└── package.json
```

Create only the directories and files required by the request. Do not overwrite,
rename, or delete existing content without explicit user authorization.

<workflow>

<step name="clarify">
1. Require an absolute content workspace and parent plugin identity.
2. Identify the requested content type and exact source paths.
3. State non-goals, especially any lifecycle or provider mutation not requested.
</step>

<step name="read-baseline">
1. Read the target plugin manifest and nearby content of the same type.
2. Load the matching canonical authoring guidance:
   - skill: `skill-authoring`
   - workflow: `command-authoring`
   - agent: `agent-authoring`
   - hook: `hook-authoring`
   - plugin topology: `plugin-architecture`
3. Audit collisions and dependent references before renaming or deleting.
</step>

<step name="author">
1. Edit only source below the explicit content workspace.
2. Keep entrypoints small and place deep guidance in one-hop `references/` or
   reusable templates in `assets/`.
3. Match existing manifests, frontmatter, naming, and test conventions.
4. Keep provider-specific behavior out of source unless it is an intentional
   content requirement.
</step>

<step name="review-and-verify">
1. Invoke `content-reviewer` on every changed content unit.
2. Fix critical findings and run source-level tests, lint, or parsers owned by
   the content repository.
3. Audit references to renamed, moved, or deleted identities.
</step>

<step name="lifecycle-handoff">
1. Stop after source verification unless the user explicitly requests lifecycle
   work.
2. For an explicit lifecycle request, identify the governed release input and
   hand the parent plugin to [[lifecycle-agent-plugin]]. Its first operation is
   the read-only `rawr agent plugins check`.
3. Never chain `build`, `package`, `export`, `test`, `sync`, `retire`,
   `attest-promotion`, or `undo` from authoring.
</step>

<step name="report">
1. List source files changed and verification run.
2. Name the parent agent-plugin distribution owner.
3. State whether no lifecycle operation ran or name the explicit handoff.
</step>

</workflow>

## Command Boundary

- `rawr agent plugins create` is the controller-owned source scaffold command.
  It does not grant authority to build or sync automatically.
- `rawr agent plugins check` verifies an explicit governed candidate.
- `rawr plugins inspect`, `rawr plugins install`, `rawr plugins link`,
  `rawr plugins list`, `rawr plugins reset`, `rawr plugins uninstall`, and
  `rawr plugins update` are external Oclif extension operations and are not
  agent-plugin fallbacks.

Now begin by resolving the explicit content workspace, parent plugin, and source
paths. If any are ambiguous, ask one focused question before editing.
