import type { HabitatConsumerBinding } from "./nx/initialization.js";

/** Exact app-owned identities projected by the public Habitat Nx generators. */
export const habitatConsumerBinding = {
  defaultCheckScript: "nx run-many -t check",
  gitHook: {
    path: ".husky/pre-push",
    contents: `# Nested Git work must discover its own repository.
unset $(git rev-parse --local-env-vars)
bun run check
`,
  },
  gritPackage: "@getgrit/cli",
  husky: {
    package: "husky",
    version: "9.1.7",
    prepare: "husky",
    predecessorPrepareScripts: [
      "./scripts/dev/install-repository-hooks.sh",
      "git config core.hooksPath scripts/githooks",
    ],
  },
  nxPlugin: "@habitat-ai/cli/nx-plugin",
  predecessorNxPlugins: [
    {
      plugin: "@habitat/cli/nx-plugin",
      options: { checkTargetName: "check:policy" },
    },
  ],
  hook: {
    _habitat: { identity: "@habitat-ai/cli:agent-stop", revision: 1 },
    hooks: [
      {
        type: "command",
        command:
          'bash -lc \'repo="${CODEX_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-}}"; if [ -n "$repo" ]; then repo="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)"; else repo="$(git rev-parse --show-toplevel 2>/dev/null)"; fi && cd "$repo" 2>/dev/null || { printf "%s\\n" "Habitat agent-stop hook must run inside the repository worktree." >&2; exit 2; }; bunx --bun --no-install --package @habitat-ai/cli habitat hook agent-stop\'',
        timeout: 120,
        statusMessage: "Checking Habitat structure laws",
      },
    ],
  },
  predecessorHooks: [
    {
      hooks: [
        {
          type: "command",
          command:
            'bash -lc \'repo="${CODEX_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-}}"; if [ -n "$repo" ]; then repo="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)"; else repo="$(git rev-parse --show-toplevel 2>/dev/null)"; fi && cd "$repo" 2>/dev/null || { printf "%s\\n" "Habitat agent-stop hook must run inside the repository worktree." >&2; exit 2; }; bun habitat hook agent-stop\'',
          timeout: 120,
          statusMessage: "Checking Habitat structure laws",
        },
      ],
    },
  ],
} as const satisfies HabitatConsumerBinding;
