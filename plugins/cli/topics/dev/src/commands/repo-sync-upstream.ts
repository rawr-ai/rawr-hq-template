import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { syncUpstreamFlags } from "../flags.js";
import { mutationInput } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

/** Updates only the current checkout through the service's admitted fast-forward operation. */
export const syncUpstreamCommand = createOclifCommand({
  id: "dev:repo:sync-upstream",
  description: "Plan or apply a native Git fast-forward update of the current checkout",
  args: {},
  flags: syncUpstreamFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof syncUpstreamFlags, typeof services>) {
    return {
      operation: "repo.syncUpstream" as const,
      json: flags.json === true,
      result: yield* clients.dev.withInvocation({ invocation: undefined }).repo.syncUpstream({
        ...mutationInput(flags),
        ...(flags.remote === undefined || flags.branch === undefined
          ? {}
          : { upstream: { remote: flags.remote, branch: flags.branch } }),
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
