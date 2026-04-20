/**
 * chatgpt-corpus: source-materials module.
 *
 * This router owns ingestion-normalization of raw exports into a stable
 * `SourceSnapshot` shape. Validation errors are intentionally surfaced at the
 * contract boundary so projections can present actionable diagnostics without
 * duplicating parsing rules.
 */
import { buildSourceSnapshot } from "./helpers/normalize";
import { SOURCE_MATERIAL_DIRECTORIES } from "../../../shared/layout";
import { module } from "./module";

const readSnapshot = module.readSnapshot.handler(async ({ context, errors }) => {
  const materials = await context.workspaceStore.readSourceMaterials({
    workspaceRef: context.workspaceRef,
    sourceDirectories: SOURCE_MATERIAL_DIRECTORIES,
  });
  const snapshotResult = await buildSourceSnapshot(context.workspaceRef, materials);
  if (!snapshotResult.ok) {
    if (snapshotResult.error.code === "INVALID_CONVERSATION_JSON") {
      throw errors.INVALID_CONVERSATION_JSON({
        message: snapshotResult.error.reason,
        data: {
          path: snapshotResult.error.sourcePath,
          reason: snapshotResult.error.reason,
        },
      });
    }

    throw errors.INVALID_CONVERSATION_EXPORT({
      message: snapshotResult.error.reason,
      data: {
        path: snapshotResult.error.sourcePath,
        reason: snapshotResult.error.reason,
      },
    });
  }
  const snapshot = snapshotResult.snapshot;

  return {
    workspaceRef: context.workspaceRef,
    sourceCounts: {
      jsonConversations: snapshot.jsonRecords.length,
      markdownDocuments: snapshot.markdownDocCount,
      totalSources: snapshot.records.length,
    },
    snapshot,
  };
});

export const router = module.router({
  readSnapshot,
});
