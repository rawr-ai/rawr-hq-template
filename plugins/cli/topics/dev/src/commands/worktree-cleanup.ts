import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { cleanupFlags } from "../flags.js";
import { mutationInput } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Leaves prefix selection, physical path protection, and native removal with the service. */
export const cleanupCommand = createOclifCommand({
  id: "dev:worktree:cleanup",
  description: "Plan or remove admitted worktrees matching an explicit basename prefix",
  args: {},
  flags: cleanupFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof cleanupFlags, typeof services>) {
    return {
      operation: "worktree.cleanup" as const,
      json: flags.json === true,
      result: yield* clients.dev.withInvocation({ invocation: undefined }).worktree.cleanup({
        ...mutationInput(flags),
        prefix: flags.prefix,
        trunk: flags.trunk,
        mergedOnly: flags["merged-only"],
        pinnedPaths: flags["pin-path"] ?? [],
        pinnedBranches: flags["pin-branch"] ?? [],
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
