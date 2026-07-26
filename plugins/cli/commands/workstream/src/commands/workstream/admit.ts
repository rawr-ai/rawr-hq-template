/**
 * @fileoverview `rawr workstream admit` — put one item into the frame.
 */
import { Args, Command, Flags } from "@oclif/core";
import { ledgerFlags, revisionFlag } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamAdmit extends Command {
  static description = "Admit one item into a work stream with its opening tags.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
    item: Args.string({ required: true, description: "Item identifier." }),
  };

  static flags = {
    ...ledgerFlags,
    ...revisionFlag,
    title: Flags.string({ required: true, description: "Human-readable item title." }),
    tag: Flags.string({ multiple: true, description: "Tag the item carries on admission." }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamAdmit);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const item = await client.streams.admit(
      {
        streamId: args.stream,
        revision: flags.revision,
        itemId: args.item,
        title: flags.title,
        tags: flags.tag ?? [],
      },
      invocation(`cli-admit-${args.item}`)
    );

    if (flags.json) return this.logJson(item);
    this.log(`admitted ${item.id} — ${item.title}`);
    this.log(`  tags: ${item.tags.join(", ") || "(none)"}`);
  }
}
