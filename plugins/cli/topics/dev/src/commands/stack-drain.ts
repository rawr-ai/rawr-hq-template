import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { drainFlags } from "../flags.js";
import { mutationInput } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Requests one native asynchronous merge job, never completion or a cleanup sweep. */
export const drainCommand = createOclifCommand({
  id: "dev:stack:drain",
  description: "Plan or request a native Graphite merge of the current branch and its ancestors",
  args: {},
  flags: drainFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof drainFlags, typeof services>) {
    return {
      operation: "stack.drain" as const,
      json: flags.json === true,
      result: yield* clients.dev
        .withInvocation({ invocation: undefined })
        .stack.drain(mutationInput(flags)),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
