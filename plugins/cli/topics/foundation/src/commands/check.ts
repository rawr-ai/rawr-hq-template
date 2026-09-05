import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Flags } from "@oclif/core";
import { writeJsonResult } from "../output.js";
import type { services } from "../services.js";

const checkFlags = {
  instance: Flags.string({ description: "Exact Habitat instance identity" }),
  owner: Flags.string({ description: "Repository project whose applications enter the check" }),
  rule: Flags.string({
    description: "Habitat rule identity; repeat to select a rule set",
    multiple: true,
  }),
  runner: Flags.string({ description: "Mechanical runner identity" }),
};

export const checkCommand = createOclifCommand({
  id: "check",
  description: "Check resolved Habitat applications",
  args: {},
  flags: checkFlags,
  effect: function* ({
    clients,
    flags,
  }: OclifCommandContext<{}, typeof checkFlags, typeof services>) {
    const rules = flags.rule ?? [];
    const selectors = {
      ...(flags.instance !== undefined ? { instance: flags.instance } : {}),
      ...(flags.owner !== undefined ? { owner: flags.owner } : {}),
      ...(rules.length === 1 ? { rule: rules[0] } : {}),
      ...(rules.length > 1 ? { rules } : {}),
      ...(flags.runner !== undefined ? { runner: flags.runner } : {}),
    };
    return yield* clients.catalog
      .withInvocation({ invocation: undefined })
      .catalog.check(Object.keys(selectors).length === 0 ? {} : { selectors });
  },
  async present(result, command) {
    await writeJsonResult(result);
    if (result._tag !== "Completed" || !result.ok) command.exit(1);
  },
});
