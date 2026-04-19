import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../lib/hq-ops-client";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class JournalSearch extends RawrCommand {
  static description = "Search journal snippets";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({ description: "FTS query", required: true }),
    limit: Flags.integer({ description: "Max snippets to return", default: 10, min: 1, max: 15 }),
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

    const response = await createHqOpsClient(workspaceRoot).journal.searchSnippets(
      {
        query,
        limit: Number.isFinite(limit) ? limit : 10,
        mode: semantic ? "semantic" : "fts",
      },
      createHqOpsCallOptions("cli.journal.search"),
    );

    const warnings = response.warning ? [response.warning] : undefined;
    const result = this.ok({ query, snippets: response.snippets }, undefined, warnings);
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (warnings) for (const warning of warnings) this.warn(warning);
        for (const snippet of response.snippets) {
          const score = typeof (snippet as any).score === "number" ? ` score=${(snippet as any).score.toFixed(3)}` : "";
          this.log(`${snippet.id}  ${snippet.title}  (${snippet.preview})${score}`);
        }
      },
    });
  }
}
