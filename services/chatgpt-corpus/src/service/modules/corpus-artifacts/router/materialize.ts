import type { SourceSnapshot } from "../../../model/entities";
import { buildSnapshotRecords, SOURCE_MATERIAL_DIRECTORIES } from "../../../model/policy";
import {
  buildAmbiguityFlags,
  buildCanonicalitySummary,
  buildDecisionLog,
  buildFamilyGraphs,
  buildIntermediateGraph,
  buildInventory,
  buildManifest,
  buildMentalMap,
  buildRelationships,
  buildUnifiedThread,
  buildValidationReport,
  buildWarnings,
  createArtifactFiles,
  detectAnomalies,
} from "../model/policy";
import { module } from "../module";

export const materialize = module.materialize.handler(async ({ context, errors }) => {
  const materials = await context.workspaceStore.readSourceMaterials({
    workspaceRef: context.workspaceRef,
    sourceDirectories: SOURCE_MATERIAL_DIRECTORIES,
  });
  const recordsResult = await buildSnapshotRecords(materials);
  if (!recordsResult.ok) {
    const message = recordsResult.error.reason;
    if (recordsResult.error.kind === "invalid-json") {
      throw errors.INVALID_CONVERSATION_JSON({
        message,
        data: { path: recordsResult.error.sourcePath, reason: message },
      });
    }
    throw errors.INVALID_CONVERSATION_EXPORT({
      message,
      data: { path: recordsResult.error.sourcePath, reason: message },
    });
  }
  const snapshot: SourceSnapshot = {
    workspaceRef: context.workspaceRef,
    records: recordsResult.records,
    jsonRecords: recordsResult.conversationRecords,
    markdownDocCount: recordsResult.documentRecords.length,
  };

  const warnings = buildWarnings(snapshot);
  const inventory = buildInventory(snapshot.records);
  const anomalies = detectAnomalies(snapshot.jsonRecords);
  const familyGraphs = buildFamilyGraphs(snapshot.jsonRecords);
  const relationships = buildRelationships(familyGraphs);
  const jsonRecordsById = new Map(snapshot.jsonRecords.map((record) => [record.sourceId, record]));
  const normalizedThreads = familyGraphs.map((family) =>
    buildUnifiedThread(family, jsonRecordsById, anomalies)
  );
  const intermediateGraph = buildIntermediateGraph(normalizedThreads, relationships);
  const manifest = buildManifest({
    inventory,
    familyGraphs,
    normalizedThreads,
    relationships,
    anomalies,
  });
  const ambiguityFlags = buildAmbiguityFlags(
    familyGraphs,
    relationships,
    snapshot.markdownDocCount
  );
  const canonicalitySummary = buildCanonicalitySummary(familyGraphs);
  const decisionLog = buildDecisionLog();
  const mentalMap = buildMentalMap(familyGraphs, anomalies);
  const validationReport = buildValidationReport({
    inventory,
    familyGraphs,
    normalizedThreads,
    manifest,
  });

  if (!validationReport.all_passed) {
    throw errors.CORPUS_ARTIFACT_VALIDATION_FAILED({
      message: "Validation failed while building corpus artifacts.",
      data: { reason: "Generated artifact validation report did not pass." },
    });
  }

  const bundle = createArtifactFiles({
    inventory,
    familyGraphs,
    intermediateGraph,
    manifest,
    anomalies,
    ambiguityFlags,
    canonicalitySummary,
    decisionLog,
    mentalMap,
    validationReport,
    normalizedThreads,
  });
  const persisted = await context.workspaceStore.writeArtifactBundle({
    workspaceRef: context.workspaceRef,
    bundle,
  });

  return {
    workspaceRef: context.workspaceRef,
    sourceCounts: {
      jsonConversations: snapshot.jsonRecords.length,
      markdownDocuments: snapshot.markdownDocCount,
      totalSources: snapshot.records.length,
    },
    familyCount: familyGraphs.length,
    normalizedThreadCount: normalizedThreads.length,
    anomalyCount: anomalies.length,
    warnings,
    outputDirectories: persisted.outputDirectories,
    outputEntries: persisted.writtenEntries,
  };
});
