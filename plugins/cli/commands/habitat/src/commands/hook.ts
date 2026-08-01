import type { Client } from "@habitat-ai/service/client";
import { Args, Command } from "@oclif/core";
import { habitatClientFrom } from "../lib/binding.js";

type HookResult = Awaited<ReturnType<Client["catalog"]["check"]>>;

/** Runs one bounded Habitat operation for a repository-owned local hook. */
export default class Hook extends Command {
  static description = "Run a Habitat local-hook entrypoint";

  static args = {
    name: Args.string({
      required: true,
      options: ["agent-stop"],
      description: "Named Habitat hook operation",
    }),
  } as const;

  async run(): Promise<HookResult> {
    await this.parse(Hook);
    const result = await habitatClientFrom(this.config).catalog.check({
      selectors: { runner: "habitat" },
    });

    if (result._tag !== "Completed" || !result.ok) {
      this.log(JSON.stringify(result, null, 2));
      this.exit(1);
    }
    return result;
  }
}
