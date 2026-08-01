import type { Client } from "@habitat-ai/service/client";
import { Command, Flags } from "@oclif/core";
import { habitatClientFrom } from "../lib/binding.js";

type CheckResult = Awaited<ReturnType<Client["catalog"]["check"]>>;

/** Projects one selected Habitat catalog check into Oclif. */
export default class Check extends Command {
  static description = "Check resolved Habitat applications";

  static flags = {
    instance: Flags.string({ description: "Exact Habitat instance identity" }),
    owner: Flags.string({ description: "Repository project whose applications enter the check" }),
    rule: Flags.string({
      description: "Habitat rule identity; repeat to select a rule set",
      multiple: true,
    }),
    runner: Flags.string({ description: "Mechanical runner identity" }),
  } as const;

  async run(): Promise<CheckResult> {
    const { flags } = await this.parse(Check);
    const rules = Array.isArray(flags.rule) ? flags.rule : flags.rule ? [flags.rule] : [];
    const selectors = {
      ...(flags.instance !== undefined ? { instance: flags.instance } : {}),
      ...(flags.owner !== undefined ? { owner: flags.owner } : {}),
      ...(rules.length === 1 ? { rule: rules[0] } : {}),
      ...(rules.length > 1 ? { rules } : {}),
      ...(flags.runner !== undefined ? { runner: flags.runner } : {}),
    };
    const result = await habitatClientFrom(this.config).catalog.check(
      Object.keys(selectors).length === 0 ? {} : { selectors }
    );
    this.log(JSON.stringify(result, null, 2));
    if (result._tag !== "Completed" || !result.ok) this.exit(1);
    return result;
  }
}
