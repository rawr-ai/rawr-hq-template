/**
 * @fileoverview `rawr workstream close` — seal a stream against further work.
 */
import { Args, Command } from "@oclif/core";
import { ledgerFlags, noteFlag, revisionFlag } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamClose extends Command {
  static description =
    "Seal a stream. Writes stop; every read, including into the past, keeps working.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
  };

  static flags = { ...ledgerFlags, ...revisionFlag, ...noteFlag };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamClose);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const stream = await client.streams.close(
      { streamId: args.stream, revision: flags.revision, note: flags.note },
      invocation(`cli-close-${args.stream}`)
    );

    if (flags.json) return this.logJson(stream);
    this.log(`closed ${stream.streamId} at ${stream.closedAt}`);
    if (stream.closedNote !== null) this.log(`  ${stream.closedNote}`);
  }
}
