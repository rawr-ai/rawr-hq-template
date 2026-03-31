import { rethrowAsOrpcError } from "../../shared/errors";
import { buildSourceSnapshot } from "./helpers/normalize";
import { module } from "./module";

const readSnapshot = module.readSnapshot.handler(async ({ context }) => {
  try {
    const materials = await context.repo.readSourceMaterials();
    const snapshot = buildSourceSnapshot(context.workspaceRef, materials);

    return {
      workspaceRef: context.workspaceRef,
      sourceCounts: {
        jsonConversations: snapshot.jsonRecords.length,
        markdownDocuments: snapshot.markdownDocCount,
        totalSources: snapshot.records.length,
      },
      snapshot,
    };
  } catch (error) {
    rethrowAsOrpcError(error);
  }
});

export const router = module.router({
  readSnapshot,
});
