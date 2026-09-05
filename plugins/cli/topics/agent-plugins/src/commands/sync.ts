import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { channelFlags } from "../flags.js";
import { locator } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Converges only the reviewed channel against caller-selected provider homes. */
export const syncCommand = createOclifCommand({
  id: "agent:plugins:sync",
  description: "Converge native providers to the reviewed channel",
  args: {},
  flags: channelFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof channelFlags, typeof services>) {
    return {
      operation: "providers.sync" as const,
      json: flags.json === true,
      result: yield* clients.lifecycle
        .withInvocation({ invocation: undefined })
        .providers.sync({ channel: flags.channel, locator: locator(flags), targets: flags.target }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
