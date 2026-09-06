import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { channelFlags } from "../flags.js";
import { locator } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Observes the explicit channel and homes through the read-only provider operation. */
export const statusCommand = createOclifCommand({
  id: "agent:plugins:status",
  description: "Observe native provider convergence",
  args: {},
  flags: channelFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof channelFlags, typeof services>) {
    return {
      operation: "providers.status" as const,
      json: flags.json === true,
      result: yield* clients.lifecycle.withInvocation({ invocation: undefined }).providers.status({
        channel: flags.channel,
        locator: locator(flags),
        targets: flags.target,
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
