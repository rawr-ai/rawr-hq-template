/**
 * chatgpt-corpus: source-materials module.
 *
 * This router owns ingestion-normalization of raw exports into a stable
 * `SourceSnapshot` shape. Validation errors are intentionally surfaced at the
 * contract boundary so projections can present actionable diagnostics without
 * duplicating parsing rules.
 */
import { SOURCE_MATERIAL_DIRECTORIES } from "../../../shared/layout";
import { buildSnapshotRecords } from "../../shared/helpers/source-records";
import { module } from "./module";

const readSnapshot = module.readSnapshot.handler(async ({ context, errors }) => {
  const materials = await context.workspaceStore.readSourceMaterials({
    workspaceRef: context.workspaceRef,
    sourceDirectories: SOURCE_MATERIAL_DIRECTORIES,
  });
  const recordsResult = await buildSnapshotRecords(materials);
  if (!recordsResult.ok) {
    const message = recordsResult.error.reason;
    if (recordsResult.error.kind === "invalid-json") {
      throw errors.INVALID_CONVERSATION_JSON({ message, data: { path: recordsResult.error.sourcePath, reason: message } });
    }
    throw errors.INVALID_CONVERSATION_EXPORT({ message, data: { path: recordsResult.error.sourcePath, reason: message } });
  }

  const snapshot = {
    workspaceRef: context.workspaceRef,
    records: recordsResult.records,
    jsonRecords: recordsResult.conversationRecords,
    markdownDocCount: recordsResult.documentRecords.length,
  };

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
