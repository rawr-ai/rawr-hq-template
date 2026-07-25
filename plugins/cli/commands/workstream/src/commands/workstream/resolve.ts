/**
 * @fileoverview `rawr workstream resolve` — close one feedback loop.
 */
import { Args, Command } from "@oclif/core";
import { ledgerFlags } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamResolve extends Command {
  static description = "Resolve a derived item, granting its tag to the item it blocked.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
    item: Args.string({ required: true, description: "Derived item identifier." }),
  };

  static flags = { ...ledgerFlags };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamResolve);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const item = await client.streams.resolve(
      { streamId: args.stream, itemId: args.item },
      invocation(`cli-resolve-${args.item}`)
    );

    if (flags.json) return this.logJson(item);
    this.log(`resolved ${item.id} → granted '${item.grants}' to ${item.derivedFrom}`);
  }
}
