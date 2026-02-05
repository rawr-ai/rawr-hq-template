import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { openJournalDb, searchSnippetsFts } from "@rawr/journal";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class JournalSearch extends RawrCommand {
  static description = "Search journal snippets";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({ description: "FTS query", required: true }),
    limit: Flags.integer({ description: "Max snippets to return", default: 10, min: 1, max: 200 }),
    semantic: Flags.boolean({
      description: "Semantic search (optional; falls back to keyword search if unavailable)",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(JournalSearch);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const query = String(flags.query);
    const limit = Number(flags.limit);
    const semantic = Boolean(flags.semantic);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const warnings: string[] = [];
    if (semantic) warnings.push("semantic search not configured; falling back to keyword search");

    const db = openJournalDb(workspaceRoot);
    try {
      const snippets = searchSnippetsFts(db, query, Number.isFinite(limit) ? limit : 10);
      const result = this.ok({ query, snippets }, undefined, warnings.length ? warnings : undefined);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          if (warnings.length) for (const w of warnings) this.warn(w);
          for (const s of snippets) this.log(`${s.id}  ${s.title}  (${s.preview})`);
        },
      });
    } finally {
      db.close();
    }
  }
}
