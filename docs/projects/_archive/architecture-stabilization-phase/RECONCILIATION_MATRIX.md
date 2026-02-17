# Reconciliation Matrix (Template vs Personal)

This matrix drives conflict resolution and long-term placement.

| Area | Owner | Rule | Action |
|---|---|---|---|
| Shared CLI contracts (`apps/cli`, shared packages) | Template | Baseline for all users | Land in template first; sync down |
| Template fixture/example plugins | Template | Baseline validation only | Keep in template with role metadata |
| Operational plugins | Personal | Default authoring home | Create and evolve in personal repo |
| Global wiring script defaults | Template | Shared baseline behavior | Land in template first; personal may add local overrides only |
| Personal local workflows/runbooks | Personal | Downstream customization | Keep in personal only |
| CLI publishing process (`@rawr/cli`) | Template | Single-source ownership | Document and enforce template-only |
| Plugin publish flows | Personal | Downstream product ownership | Keep in personal runbooks |
| Cross-repo sync protocol | Shared (canonical in template) | One truth with mirrored downstream copy | Maintain in `docs/process/CROSS_REPO_WORKFLOWS.md` |

## Conflict Policy

1. If a change affects all downstream users, resolve in favor of template.
2. If a change is machine-local or project-local, resolve in favor of personal.
3. If a change alters plugin authoring destination, enforce personal-first unless explicitly fixture/example in template.
4. If uncertain, do not merge blindly; add an explicit placement decision note.
