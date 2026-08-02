import type { HabitatClient } from "@habitat-ai/sdk";
import { Command } from "@oclif/core";
import { habitatClientFrom } from "../lib/binding.js";
import { writeJsonResult } from "../lib/output.js";

type ResolveResult = Awaited<ReturnType<HabitatClient["catalog"]["resolve"]>>;

/** Projects current-workspace Habitat catalog resolution into Oclif. */
export default class Resolve extends Command {
  static description = "Resolve the current Habitat authority catalog";

  async run(): Promise<ResolveResult> {
    await this.parse(Resolve);
    const result = await habitatClientFrom(this.config).catalog.resolve({});
    await writeJsonResult(result);
    if (result._tag === "Rejected") this.exit(1);
    return result;
  }
}
