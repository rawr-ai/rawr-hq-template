/**
 * @fileoverview `rawr workstream trace` — how one item came to be where it is.
 */
import { Args, Command, Flags } from "@oclif/core";
import { ledgerFlags, revisionFlag } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamTrace extends Command {
  static description = "Show every recorded transition for one item, oldest first.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
    item: Args.string({ required: true, description: "Item identifier." }),
  };

  static flags = {
    ...ledgerFlags,
    ...revisionFlag,
    at: Flags.integer({ description: "Trace as it stood at this ledger position." }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamTrace);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const traced = await client.streams.trace(
      { streamId: args.stream, itemId: args.item, revision: flags.revision, at: flags.at },
      invocation(`cli-trace-${args.item}`)
    );

    if (flags.json) return this.logJson(traced);
    this.log(`trace ${traced.itemId} in ${traced.streamId} @ t=${traced.observedAt}`);
    for (const event of traced.events) {
      const subject = event.subject === null ? "" : ` ${event.subject}`;
      const requires = event.requires === null ? "" : ` '${event.requires}'`;
      const note = event.note === null ? "" : ` — ${event.note}`;
      this.log(`  ${event.at}  ${event.kind}${requires}${subject}${note}`);
    }
    if (traced.events.length === 0) this.log("  (nothing recorded)");
  }
}
