# Workstream Plugin Pack

This is the Template-owned generic tooling pack for reusable workstream
operation. Its skills, role briefs, hooks, and reusable assets are maintained
here independently from any curated-content repository.

Mental model: the workstream is durable coordination state. Sessions, threads,
worktrees, tickets, workflows, and transcripts are useful projections or
resources, but they do not own continuity by themselves.

## Contents

| Surface | Path | Status |
| --- | --- | --- |
| Workstream runner skill | `skills/workstream-runner/` | Generic Template tool |
| Review-loop skill | `skills/workstream-review-loops/` | Generic Template tool |
| Provider-neutral steward roles | `agents/` | Generic Template tool |
| Reusable hook scripts | `hooks/` | Generic Template tool |
| Local install script | `scripts/` | Template-local projection helper |
| Copy-forward scaffolds | `skills/workstream-runner/assets/` | Generic Template tool |
| Immediate follow-up | `notes/next-work.md` | Current review notes |

## Local Activation

The pack can project local runtime surfaces when this Template checkout needs
to use or test Workstream material in Codex.

- `scripts/install-local-codex-pack.ts` projects pack content into this
  checkout's local Codex runtime surfaces. `--dry-run` reports the exact
  destinations without changing them.
- Pack skills copy to `.agents/skills/`.
- Pack agent briefs generate `.codex/agents/*.toml`.
- Pack hook scripts/config copy to `.codex/hooks/` and `.codex/hooks.json`.

Hook event availability is provider/runtime-specific. This pack currently
activates only `SessionStart` and `Stop`; unavailable events such as
`PreCompact` are portability notes, not guard failures.

Do not keep checked-in placeholder activation files for skills, agents, hooks,
or hook config. When local testing is needed, run the installer from this
checkout. It rejects destinations outside its closed Template-local allowlist,
including aliases, before any recursive removal.

## Repository Boundary

The installer has no personal-checkout, repository-sync, or copy target.
Personal RAWR HQ owns curated agent-plugin content and its own lifecycle
records; this pack remains Template-owned generic tooling. Any future exchange
must use an explicit versioned data or immutable-artifact interface rather than
a repository path, copied implementation, or tree-equivalence rule.

## Boundary

This pack defines one bounded workstream primitive. It does not define a
program layer, subordinate workstreams, recursive workstream structure, or
cross-workstream sequence authority.

Runtime-specific proof classes, lab authority order, phase dossiers, evidence
homes, and Nx gates belong in `tools/runtime-realization-type-env/**` as
specialization overlays that point back to this pack.
