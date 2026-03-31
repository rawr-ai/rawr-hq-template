import { rethrowAsOrpcError } from "../../shared/errors";
import { buildSourceSnapshot } from "../source-materials/helpers/normalize";
import { buildCorpusArtifacts } from "./helpers/build";
import { module } from "./module";

const build = module.build.handler(async ({ input }) => {
  return buildCorpusArtifacts(input.snapshot).result;
});

const materialize = module.materialize.handler(async ({ context }) => {
  try {
    const materials = await context.repo.readSourceMaterials();
    const snapshot = await buildSourceSnapshot(context.workspaceRef, materials);
    const built = buildCorpusArtifacts(snapshot);

    if (!built.result.validationReport.all_passed) {
      throw new Error("Validation failed while building corpus artifacts.");
    }

    const persisted = await context.repo.writeArtifacts(built.bundle);

      return {
        workspaceRef: context.workspaceRef,
        sourceCounts: built.result.sourceCounts,
        familyCount: built.result.familyCount,
        normalizedThreadCount: built.result.normalizedThreadCount,
        anomalyCount: built.result.anomalyCount,
        warnings: built.result.warnings,
        outputDirectories: persisted.outputDirectories,
        outputEntries: persisted.writtenEntries,
      };
  } catch (error) {
    rethrowAsOrpcError(error);
  }
});

export const router = module.router({
  build,
  materialize,
});
