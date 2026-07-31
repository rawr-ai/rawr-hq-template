import type { Client } from "@habitat/service/client";
import { Command } from "@oclif/core";
import { habitatClientFrom } from "../lib/binding.js";

type ResolveResult = Awaited<ReturnType<Client["catalog"]["resolve"]>>;

/** Projects current-workspace Habitat catalog resolution into Oclif. */
export default class Resolve extends Command {
  static description = "Resolve the current Habitat authority catalog";

  async run(): Promise<ResolveResult> {
    await this.parse(Resolve);
    const result = await habitatClientFrom(this.config).catalog.resolve({});
    this.log(JSON.stringify(result, null, 2));
    if (result._tag === "Rejected") this.exit(1);
    return result;
  }
}
