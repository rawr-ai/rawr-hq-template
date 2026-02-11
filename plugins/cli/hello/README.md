# @rawr/plugin-hello

Sample oclif plugin shipped by `RAWR HQ-Template`.

## Local usage

```bash
bun run rawr -- plugins link plugins/cli/hello --install
bun run rawr -- hello --json
```

> **Heads-up: the “disposable worktree” trap**
> - `rawr plugins link` stores an **absolute path** to the plugin directory.
> - If you link from a **disposable git worktree** and later delete it, `rawr` can fail at startup (missing `package.json`).
> - Prefer linking from a **stable checkout path** (your primary worktree), using an absolute path.
> - Recovery: `rawr plugins uninstall <plugin>` (or `rawr plugins reset` to wipe all user-linked plugins).
> - If available, prefer the repo-root helper: `rawr plugins install all`.
