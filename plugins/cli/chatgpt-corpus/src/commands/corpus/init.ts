import path from "node:path";
import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createCorpusClient, createInvocation, describeServiceError } from "../../lib/client";

export default class CorpusInit extends RawrCommand {
  static description = "Initialize a ChatGPT corpus workspace";

  static args = {
    path: Args.string({ required: false, description: "Workspace root path" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(CorpusInit);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = path.resolve(args.path ? String(args.path) : process.cwd());
    const client = createCorpusClient();

    try {
      const data = await client.corpus.initWorkspace(
        { workspaceRoot },
        createInvocation(`corpus-init-${Date.now()}`),
      );
      const result = this.ok(data);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`initialized corpus workspace at ${data.workspaceRoot}`);
          this.log(`created ${data.createdPaths.length} path(s), confirmed ${data.existingPaths.length} existing path(s)`);
        },
      });
    } catch (error) {
      const parsed = describeServiceError(error);
      const result = this.fail(parsed.message, { code: parsed.code, details: parsed.details });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
