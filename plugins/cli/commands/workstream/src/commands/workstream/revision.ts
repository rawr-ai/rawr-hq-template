/**
 * @fileoverview `rawr workstream revision` — manage candidate revisions.
 *
 * @remarks
 * One command with an action argument rather than five sibling commands,
 * because these five operations are only meaningful as a set: you fork to get
 * somewhere to work, preview to see what it would cost, and then either promote
 * or abandon. Splitting them across the command tree would hide that shape.
 */
import { Args, Command } from "@oclif/core";
import { ledgerFlags, noteFlag } from "../../lib/flags";
import { createWorkstreamClient, invocation } from "../../lib/workstream-client";

export default class WorkstreamRevision extends Command {
  static description = "Fork, preview, promote, abandon, or list revisions of the work stream.";

  static args = {
    action: Args.string({
      required: true,
      description: "One of: fork, preview, promote, abandon, list.",
      options: ["fork", "preview", "promote", "abandon", "list"],
    }),
    revision: Args.string({ description: "Revision name. Required for all actions but list." }),
  };

  static flags = { ...ledgerFlags, ...noteFlag };

  static examples = [
    "<%= config.bin %> <%= command.id %> fork try-new-gate",
    "<%= config.bin %> <%= command.id %> preview try-new-gate",
    "<%= config.bin %> <%= command.id %> promote try-new-gate --note 'reviewed and accepted'",
    "<%= config.bin %> <%= command.id %> abandon try-new-gate --note 'wrong approach'",
    "<%= config.bin %> <%= command.id %> list",
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WorkstreamRevision);
    const client = await createWorkstreamClient({
      ledgerUrl: flags["ledger-url"],
      ledgerName: flags.ledger,
    });
    const trace = invocation(`cli-revision-${args.action}`);

    if (args.action === "list") {
      const listed = await client.revisions.list({}, trace);
      if (flags.json) return this.logJson(listed);
      this.log(`revisions of ${listed.committed}'s work stream`);
      for (const revision of listed.revisions) {
        const marker = revision.committed ? "*" : " ";
        this.log(`  ${marker} ${revision.revision.padEnd(24)} ${revision.status}  t=${revision.t}`);
      }
      return;
    }

    if (args.revision === undefined) {
      this.error(`'${args.action}' needs a revision name`, { exit: 2 });
    }

    if (args.action === "fork") {
      const forked = await client.revisions.fork({ revision: args.revision }, trace);
      if (flags.json) return this.logJson(forked);
      this.log(`forked ${forked.revision} at t=${forked.t} — isolated until promoted`);
      return;
    }

    if (args.action === "preview") {
      const preview = await client.revisions.preview({ revision: args.revision }, trace);
      if (flags.json) return this.logJson(preview);
      this.log(`${preview.revision} → ${preview.into}`);
      this.log(
        `  ahead ${preview.ahead}, behind ${preview.behind}, conflicts ${preview.conflicts}`
      );
      this.log(
        `  ${preview.fastForward ? "fast-forward" : "diverged"} — ${preview.mergeable ? "mergeable" : "NOT mergeable"}`
      );
      return;
    }

    if (args.action === "promote") {
      const promoted = await client.revisions.promote(
        { revision: args.revision, note: flags.note },
        trace
      );
      if (flags.json) return this.logJson(promoted);
      this.log(`promoted ${promoted.revision} → ${promoted.into} at t=${promoted.t}`);
      this.log(`  carried ${promoted.copied} commit(s), ${promoted.conflicts} conflict(s)`);
      return;
    }

    const abandoned = await client.revisions.abandon(
      { revision: args.revision, note: flags.note },
      trace
    );
    if (flags.json) return this.logJson(abandoned);
    this.log(`abandoned ${abandoned.revision} — history kept, not deleted`);
  }
}
