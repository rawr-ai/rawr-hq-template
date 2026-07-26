/**
 * @fileoverview `rawr workstream inspect` — read durable truth, optionally past.
 */
import { Args, Command, Flags } from "@oclif/core";
import { ledgerFlags, revisionFlag } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamInspect extends Command {
  static description =
    "Read a work stream at head, or reconstruct it exactly as it stood at an earlier position.";

  static args = {
    stream: Args.string({ required: true, description: "Stream identifier." }),
  };

  static flags = {
    ...ledgerFlags,
    ...revisionFlag,
    at: Flags.integer({
      description: "Ledger position to reconstruct. Omit to read head.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamInspect);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });

    const observed = await client.streams.inspect(
      {
        streamId: args.stream,
        revision: flags.revision,
        ...(flags.at === undefined ? {} : { at: flags.at }),
      },
      invocation(`cli-inspect-${args.stream}`)
    );

    if (flags.json) return this.logJson(observed);
    this.log(`${observed.stream.streamId} @ t=${observed.observedAt} (head t=${observed.head})`);
    this.log(
      `  shape: ${observed.stream.boundaries.map((boundary: { requires: string }) => boundary.requires).join(" → ")}`
    );
    for (const item of observed.stream.items) {
      const origin = item.derivedFrom === null ? "" : ` ←peeled from ${item.derivedFrom}`;
      const owed = item.grants === null ? "" : ` grants '${item.grants}'`;
      const state = item.resolved ? " resolved" : "";
      this.log(
        `  ${item.id} [${item.position}/${observed.stream.boundaries.length}]${origin}${owed}${state}`
      );
    }
  }
}
