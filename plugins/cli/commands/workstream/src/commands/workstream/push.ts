/**
 * @fileoverview `rawr workstream push` — run the iterator once.
 */
import { Args, Command } from "@oclif/core";
import { ledgerFlags } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamPush extends Command {
  static description =
    "Advance every item as far as the frame allows, peeling off what does not fit.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
  };

  static flags = { ...ledgerFlags };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamPush);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const result = await client.streams.push(
      { streamId: args.stream },
      invocation(`cli-push-${args.stream}`)
    );

    if (flags.json) return this.logJson(result);
    this.log(`push ${result.streamId} → t=${result.t}`);
    for (const advance of result.advances) {
      const detail =
        advance.outcome === "blocked" || advance.outcome === "waiting"
          ? ` at boundary ${advance.blockedAt} needing '${advance.requires}' → ${advance.derivedItemId}`
          : "";
      this.log(`  ${advance.itemId}: ${advance.outcome} (cleared ${advance.clearedTo})${detail}`);
    }
    if (result.atEquilibrium) this.log("  equilibrium — nothing moved");
  }
}
