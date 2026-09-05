import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { writeJsonResult } from "../output.js";
import type { services } from "../services.js";

export const resolveCommand = createOclifCommand({
  id: "resolve",
  description: "Resolve Habitat applications",
  args: {},
  flags: {},
  effect: function* ({ clients }: OclifCommandContext<{}, {}, typeof services>) {
    return yield* clients.catalog.withInvocation({ invocation: undefined }).catalog.resolve({});
  },
  async present(result, command) {
    await writeJsonResult(result);
    if (result._tag !== "Resolved") command.exit(1);
  },
});
