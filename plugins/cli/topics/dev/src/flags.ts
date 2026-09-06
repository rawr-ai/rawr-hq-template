import { Flags } from "@oclif/core";

const text = Flags.custom<string>({
  allowStdin: false,
  async parse(value) {
    if (
      value.trim().length === 0 ||
      value.length > 16_384 ||
      /[\u0000-\u001f\u007f]/u.test(value)
    ) {
      throw new Error(
        "Expected nonempty text without control characters (at most 16384 characters)."
      );
    }
    return value;
  },
});

/** Native admission preserves the explicit locator; Git resolves it in the service. */
export const repositoryFlags = {
  json: Flags.boolean({ description: "Output machine-readable JSON" }),
  repository: text({ description: "Repository path (defaults to the invoking directory)" }),
};

/** Mutation and scratch controls belong only to commands that implement them. */
export const mutationFlags = {
  ...repositoryFlags,
  apply: Flags.boolean({ description: "Apply the admitted operation", default: false }),
  "dry-run": Flags.boolean({
    description: "Plan without mutation, overriding --apply",
    default: false,
  }),
  "scratch-file": text({
    description: "Explicit scratch evidence file (repeatable)",
    multiple: true,
    multipleNonGreedy: true,
  }),
  "scratch-mode": Flags.option({
    description: "Missing scratch evidence policy (defaults to warn when files are supplied)",
    options: ["warn", "block"] as const,
    dependsOn: ["scratch-file"],
    allowStdin: false,
  })(),
};

export const syncUpstreamFlags = {
  ...mutationFlags,
  remote: text({ description: "Git remote override (requires --branch)", dependsOn: ["branch"] }),
  branch: text({
    description: "Upstream branch override (requires --remote)",
    dependsOn: ["remote"],
  }),
};

export const doctorFlags = {
  ...repositoryFlags,
  "no-fail": Flags.boolean({
    description: "Return zero for an observed needs-attention result",
    default: false,
  }),
};

export const drainFlags = mutationFlags;

export const cleanupFlags = {
  ...mutationFlags,
  prefix: text({ description: "Required worktree basename prefix", required: true }),
  trunk: text({ description: "Local trunk branch protected from removal", required: true }),
  "merged-only": Flags.boolean({
    description: "Remove only worktrees whose branches are merged into trunk",
    default: true,
    allowNo: true,
  }),
  "pin-path": text({
    description: "Worktree path to preserve (repeatable)",
    multiple: true,
    multipleNonGreedy: true,
  }),
  "pin-branch": text({
    description: "Branch to preserve (repeatable)",
    multiple: true,
    multipleNonGreedy: true,
  }),
};
