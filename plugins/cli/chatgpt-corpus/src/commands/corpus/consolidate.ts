import path from "node:path";
import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createCorpusClient, createInvocation, describeServiceError } from "../../lib/client";

export default class CorpusConsolidate extends RawrCommand {
  static description = "Consolidate a ChatGPT corpus workspace";

  static args = {
    path: Args.string({ required: false, description: "Workspace root path" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(CorpusConsolidate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = path.resolve(args.path ? String(args.path) : process.cwd());
    const client = createCorpusClient();

    try {
      const data = await client.corpus.consolidateWorkspace(
        { workspaceRoot },
        createInvocation(`corpus-consolidate-${Date.now()}`),
      );
      const result = this.ok(data, undefined, data.warnings.length > 0 ? data.warnings : undefined);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const warning of data.warnings) this.warn(warning);
          this.log(
            `consolidated ${data.sourceCounts.jsonConversations} conversation export(s) into ${data.familyCount} family/families`,
          );
          this.log(`wrote outputs to ${data.outputPaths.reportsDir}`);
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
