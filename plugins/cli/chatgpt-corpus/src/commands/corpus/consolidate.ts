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
    const client = createCorpusClient(workspaceRoot);

    try {
      const data = await client.corpusArtifacts.materialize(
        {},
        createInvocation(`corpus-consolidate-${Date.now()}`),
      );
      const byFileId = new Map(data.outputEntries.map((entry) => [entry.fileId, entry.relativePath]));
      const outputDirs = new Set(data.outputDirectories);
      const resolveRelative = (relativePath: string) => path.join(workspaceRoot, ...relativePath.split("/"));
      const resultData = {
        workspaceRoot,
        sourceCounts: data.sourceCounts,
        familyCount: data.familyCount,
        normalizedThreadCount: data.normalizedThreadCount,
        anomalyCount: data.anomalyCount,
        warnings: data.warnings,
        outputPaths: {
          inventory: resolveRelative(byFileId.get("inventory") ?? "work/generated/corpus/inventory.json"),
          familyGraphs: resolveRelative(byFileId.get("familyGraphs") ?? "work/generated/corpus/family-graphs.json"),
          intermediateGraph: resolveRelative(byFileId.get("intermediateGraph") ?? "work/generated/corpus/intermediate-graph.json"),
          manifest: resolveRelative(byFileId.get("manifest") ?? "work/generated/corpus/corpus-manifest.json"),
          reportsDir: resolveRelative(
            outputDirs.has("work/generated/reports") ? "work/generated/reports" : "work/generated/reports",
          ),
          normalizedThreadsDir: resolveRelative(
            outputDirs.has("work/generated/corpus/normalized-threads")
              ? "work/generated/corpus/normalized-threads"
              : "work/generated/corpus/normalized-threads",
          ),
          validationReport: resolveRelative(
            byFileId.get("validationReport") ?? "work/generated/reports/validation-report.json",
          ),
        },
      };
      const result = this.ok(resultData, undefined, resultData.warnings.length > 0 ? resultData.warnings : undefined);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const warning of resultData.warnings) this.warn(warning);
          this.log(
            `consolidated ${resultData.sourceCounts.jsonConversations} conversation export(s) into ${resultData.familyCount} family/families`,
          );
          this.log(`wrote outputs to ${resultData.outputPaths.reportsDir}`);
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
