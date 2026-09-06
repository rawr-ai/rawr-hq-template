import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { doctorFlags } from "../flags.js";
import { repositoryPath } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Reports native observations without treating their human rendering as authority. */
export const doctorCommand = createOclifCommand({
  id: "dev:stack:doctor",
  description: "Inspect the current Git checkout, worktrees, and native Graphite ancestry",
  args: {},
  flags: doctorFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof doctorFlags, typeof services>) {
    return {
      operation: "stack.doctor" as const,
      json: flags.json === true,
      noFail: flags["no-fail"] === true,
      result: yield* clients.dev.withInvocation({ invocation: undefined }).stack.doctor({
        repositoryPath: repositoryPath(flags),
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
