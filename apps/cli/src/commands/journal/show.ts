import { RawrCommand } from "@rawr/core";
import { Args } from "@oclif/core";
import fs from "node:fs/promises";
import path from "node:path";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";
import type { JournalSnippet } from "@rawr/journal";

export default class JournalShow extends RawrCommand {
  static description = "Show a single journal snippet by id";

  static args = {
    id: Args.string({ required: true, description: "Snippet id" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(JournalShow);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const id = String(args.id);
    const snippetPath = path.join(workspaceRoot, ".rawr", "journal", "snippets", `${id}.json`);

    try {
      const snippet = JSON.parse(await fs.readFile(snippetPath, "utf8")) as JournalSnippet;
      const result = this.ok({ snippet });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(snippet.body);
        },
      });
    } catch (err) {
      const result = this.fail(`Snippet not found: ${id}`, { details: { path: snippetPath, err: String(err) } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
