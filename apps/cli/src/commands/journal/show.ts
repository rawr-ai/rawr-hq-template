import { RawrCommand } from "@rawr/core";
import { Args } from "@oclif/core";
import { createHqOpsClient, createHqOpsInvocation } from "../../lib/hq-ops-client";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

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
    const response = await createHqOpsClient(workspaceRoot).journal.getSnippet(
      { id },
      createHqOpsInvocation("cli.journal.show"),
    );
    const snippet = response.snippet;
    if (!snippet) {
      const result = this.fail(`Snippet not found: ${id}`, { details: { id } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({ snippet });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(snippet.body);
      },
    });
  }
}
