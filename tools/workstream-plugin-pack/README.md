# Workstream Plugin Pack

This pack is the local source of truth for reusable workstream operation while
the workstream plugin is recovered and reviewed in this repository.

The pack owns generic workstream mechanics: skills, role briefs, reusable
templates, and mechanical hook scripts. Repo docs, runtime-lab docs, and Codex
project files may point here, but they must not redefine the generic
workstream model.

Mental model: the workstream is durable coordination state. Sessions, threads,
worktrees, tickets, workflows, and transcripts are useful projections or
resources, but they do not own continuity by themselves.

## Contents

| Surface | Path | Status |
| --- | --- | --- |
| Workstream runner skill | `skills/workstream-runner/` | Canonical source |
| Review-loop skill | `skills/workstream-review-loops/` | Canonical source |
| Provider-neutral steward roles | `agents/` | Canonical source |
| Reusable hook scripts | `hooks/` | Canonical source |
| Local install scripts | `scripts/` | Projection helpers |
| Copy-forward scaffolds | `skills/workstream-runner/assets/` | Canonical source |
| Downstream port notes | `notes/downstream-port-notes.md` | Porting guide |
| Immediate follow-up | `notes/next-work.md` | Current review plan |

## Local Activation

The pack is source. Local runtime surfaces are projections used only when this
repo needs to test the pack in Codex.

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

For temporary faster iteration, the install script can also project this pack
into downstream `rawr-hq/plugins/agents/habitat`:

```bash
bun tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts \
  --target downstream \
  --downstream-root /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq
```

This downstream plugin is a working copy, not the source of truth. Remove this
bridge after `agent-config-sync` supports hook projection and the Workstream
plugin has been used successfully a few times without issues.

## Boundary

This pack defines one bounded workstream primitive. It does not define a
program layer, subordinate workstreams, recursive workstream structure, or
cross-workstream sequence authority.

Runtime-specific proof classes, lab authority order, phase dossiers, evidence
homes, and Nx gates belong in `tools/runtime-realization-type-env/**` as
specialization overlays that point back to this pack.
