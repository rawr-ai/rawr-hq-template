# Workstream Plugin Pack

This pack is a deprecated bridge and recovery copy for reusable workstream
operation. The downstream Habitat plugin is now the distributable source of
truth for Workstream skills, role briefs, hooks, and reusable assets:

`/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/agents/habitat/`

Do not make new durable Workstream content changes here. If this bridge
contains useful material, migrate it downstream first and then remove the
bridge in the template cleanup pass.

Mental model: the workstream is durable coordination state. Sessions, threads,
worktrees, tickets, workflows, and transcripts are useful projections or
resources, but they do not own continuity by themselves.

## Contents

| Surface | Path | Status |
| --- | --- | --- |
| Workstream runner skill | `skills/workstream-runner/` | Deprecated bridge copy |
| Review-loop skill | `skills/workstream-review-loops/` | Deprecated bridge copy |
| Provider-neutral steward roles | `agents/` | Deprecated bridge copy |
| Reusable hook scripts | `hooks/` | Deprecated bridge copy |
| Local install scripts | `scripts/` | Projection helpers |
| Copy-forward scaffolds | `skills/workstream-runner/assets/` | Deprecated bridge copy |
| Downstream port notes | `notes/downstream-port-notes.md` | Porting guide |
| Immediate follow-up | `notes/next-work.md` | Current review plan |

## Local Activation

This bridge copy can still project local runtime surfaces when the template repo
needs to test recovered Workstream material in Codex.

- `scripts/install-local-codex-pack.ts --target local` projects pack content
  into local Codex runtime surfaces when local activation is needed. This is
  also the default when no target is provided.
- Pack skills copy to `.agents/skills/`.
- Pack agent briefs generate `.codex/agents/*.toml`.
- Pack hook scripts/config copy to `.codex/hooks/` and `.codex/hooks.json`.

Hook event availability is provider/runtime-specific. This pack currently
activates only `SessionStart` and `Stop`; unavailable events such as
`PreCompact` are portability notes, not guard failures.

Do not keep checked-in placeholder activation files for skills, agents, hooks,
or hook config. When local testing is needed, run the install script so active
runtime files are real projections of pack content.

## Downstream Projection

The downstream Habitat plugin should be edited directly. The install script's
downstream projection mode is retained only as a recovery bridge:

```bash
bun tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts \
  --target downstream \
  --downstream-root /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq
```

Do not use this projection path as the normal authoring workflow. Remove this
bridge when the template-side migration no longer needs a recovery copy.

## Boundary

This pack defines one bounded workstream primitive. It does not define a
program layer, subordinate workstreams, recursive workstream structure, or
cross-workstream sequence authority.

Runtime-specific proof classes, lab authority order, phase dossiers, evidence
homes, and Nx gates belong in `tools/runtime-realization-type-env/**` as
specialization overlays that point back to this pack.
