import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Args } from "@oclif/core";
import { writeJsonResult } from "../output.js";
import type { services } from "../services.js";

const args = {
  name: Args.string({
    required: true,
    options: ["agent-stop"],
    description: "Named Habitat hook operation",
  }),
};

export const hookCommand = createOclifCommand({
  id: "hook",
  description: "Run a Habitat local-hook entrypoint",
  args,
  flags: {},
  effect: function* ({ clients }: OclifCommandContext<typeof args, {}, typeof services>) {
    return yield* clients.catalog.withInvocation({ invocation: undefined }).catalog.check({
      selectors: { runner: "habitat" },
    });
  },
  async present(result, command) {
    if (result._tag !== "Completed" || !result.ok) {
      await writeJsonResult(result);
      command.exit(1);
    }
  },
});
