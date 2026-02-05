import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { openJournalDb, tailSnippets } from "@rawr/journal";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class JournalTail extends RawrCommand {
  static description = "Show the most recent journal snippets";

  static flags = {
    ...RawrCommand.baseFlags,
    limit: Flags.integer({ description: "Max snippets to return", default: 10, min: 1, max: 15 }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(JournalTail);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const limit = Number(flags.limit);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const db = openJournalDb(workspaceRoot);
    try {
      const snippets = tailSnippets(db, Number.isFinite(limit) ? limit : 20);
      const result = this.ok({ snippets });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const s of snippets) this.log(`${s.id}  ${s.title}  (${s.preview})`);
        },
      });
    } finally {
      db.close();
    }
  }
}
