import path from "node:path";
import { HabitatCommand } from "@habitat-ai/cli/command";
import { Args } from "@oclif/core";
import {
  type CorpusMaterializeOptions,
  createCorpusClient,
  describeServiceError,
} from "../../lib/client";
import { projectConsolidateResult } from "../../lib/projection";

export default class CorpusConsolidate extends HabitatCommand {
  static description = "Consolidate a ChatGPT corpus workspace";

  static args = {
    path: Args.string({ required: false, description: "Workspace root path" }),
  } as const;

  static flags = {
    ...HabitatCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parse(CorpusConsolidate);
    const baseFlags = HabitatCommand.extractBaseFlags(flags);
    const workspaceRoot = path.resolve(args.path ? String(args.path) : process.cwd());
    const client = createCorpusClient(workspaceRoot);

    try {
      const options = {
        context: { invocation: { traceId: `corpus-consolidate-${Date.now()}` } },
      } satisfies CorpusMaterializeOptions;
      const data = await client.corpusArtifacts.materialize({}, options);
      const resultData = projectConsolidateResult(workspaceRoot, data);
      const result = this.ok(
        resultData,
        undefined,
        resultData.warnings.length > 0 ? resultData.warnings : undefined
      );
      await this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const warning of resultData.warnings) this.warn(warning);
          this.log(
            `consolidated ${resultData.sourceCounts.jsonConversations} conversation export(s) into ${resultData.familyCount} family/families`
          );
          this.log(`wrote outputs to ${resultData.outputPaths.reportsDir}`);
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
