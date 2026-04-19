import path from "node:path";
import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createCorpusClient, describeServiceError, type CorpusInitializeOptions } from "../../lib/client";
import { projectInitResult } from "../../lib/projection";

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
    const client = createCorpusClient(workspaceRoot);

    try {
      const options = {
        context: { invocation: { traceId: `corpus-init-${Date.now()}` } },
      } satisfies CorpusInitializeOptions;
      const data = await client.workspace.initialize(
        {},
        options,
      );
      const resultData = projectInitResult(workspaceRoot, data);
      const result = this.ok(resultData);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`initialized corpus workspace at ${workspaceRoot}`);
          this.log(`created ${resultData.createdPaths.length} path(s), confirmed ${resultData.existingPaths.length} existing path(s)`);
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
