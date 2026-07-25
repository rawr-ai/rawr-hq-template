/**
 * @fileoverview `rawr workstream open` — declare a frame's shape.
 */
import { Args, Command, Flags } from "@oclif/core";
import { ledgerFlags } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamOpen extends Command {
  static description = "Declare a work stream and the ordered boundaries work must clear.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
  };

  static flags = {
    ...ledgerFlags,
    boundary: Flags.string({
      multiple: true,
      required: true,
      description: "Tag required to clear a boundary. Repeat in order.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamOpen);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const stream = await client.streams.open(
      {
        streamId: args.stream,
        boundaries: flags.boundary.map((requires: string) => ({ requires })),
      },
      invocation(`cli-open-${args.stream}`)
    );

    if (flags.json) return this.logJson(stream);
    this.log(`opened ${stream.streamId}`);
    stream.boundaries.forEach((boundary: { requires: string }, index: number) => {
      this.log(`  ${index}. requires ${boundary.requires}`);
    });
  }
}
