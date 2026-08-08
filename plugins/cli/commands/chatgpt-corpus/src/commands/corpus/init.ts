import path from "node:path";
import { HabitatCommand } from "@habitat-ai/cli/command";
import { Args } from "@oclif/core";
import {
  type CorpusInitializeOptions,
  createCorpusClient,
  describeServiceError,
} from "../../lib/client";
import { projectInitResult } from "../../lib/projection";

export default class CorpusInit extends HabitatCommand {
  static description = "Initialize a ChatGPT corpus workspace";

  static args = {
    path: Args.string({ required: false, description: "Workspace root path" }),
  } as const;

  static flags = {
    ...HabitatCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parse(CorpusInit);
    const baseFlags = HabitatCommand.extractBaseFlags(flags);
    const workspaceRoot = path.resolve(args.path ? String(args.path) : process.cwd());
    const client = createCorpusClient(workspaceRoot);

    try {
      const options = {
        context: { invocation: { traceId: `corpus-init-${Date.now()}` } },
      } satisfies CorpusInitializeOptions;
      const data = await client.workspace.initialize({}, options);
      const resultData = projectInitResult(workspaceRoot, data);
      const result = this.ok(resultData);
      await this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`initialized corpus workspace at ${workspaceRoot}`);
          this.log(
            `created ${resultData.createdPaths.length} path(s), confirmed ${resultData.existingPaths.length} existing path(s)`
          );
        },
      });
    } catch (error) {
      const parsed = describeServiceError(error);
      const result = this.fail(parsed.message, { code: parsed.code, details: parsed.details });
      await this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
