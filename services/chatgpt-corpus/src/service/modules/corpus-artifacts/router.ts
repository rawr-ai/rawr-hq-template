/**
 * chatgpt-corpus: corpus-artifacts module.
 *
 * This router builds derived artifacts (inventory/manifest/threads/graphs/etc.)
 * from a normalized `SourceSnapshot`. The procedure body intentionally owns the
 * authored build flow so callers can treat this as a single capability, while
 * helper files remain narrow utilities for individual transforms.
 */
import { SOURCE_MATERIAL_DIRECTORIES } from "../../../shared/layout";
import type { SourceSnapshot } from "../source-materials/entities";
import { buildSnapshotRecords } from "../../shared/helpers/source-records";
import { createArtifactFiles } from "./helpers/artifact-bundle";
import { detectAnomalies } from "./helpers/anomalies";
import { buildFamilyGraphs, buildRelationships } from "./helpers/families";
import { buildInventory, buildWarnings } from "./helpers/inventory";
import {
  buildAmbiguityFlags,
  buildCanonicalitySummary,
  buildDecisionLog,
  buildManifest,
  buildMentalMap,
  buildValidationReport,
} from "./helpers/reports";
import { buildIntermediateGraph, buildUnifiedThread } from "./helpers/threads";
import { module } from "./module";

const build = module.build.handler(async ({ input }) => {
  const snapshot = input.snapshot;
  const warnings = buildWarnings(snapshot);
  const inventory = buildInventory(snapshot.records);
  const anomalies = detectAnomalies(snapshot.jsonRecords);
  const familyGraphs = buildFamilyGraphs(snapshot.jsonRecords);
  const relationships = buildRelationships(familyGraphs);
  const jsonRecordsById = new Map(snapshot.jsonRecords.map((record) => [record.sourceId, record]));
  const normalizedThreads = familyGraphs.map((family) => buildUnifiedThread(family, jsonRecordsById, anomalies));
  const intermediateGraph = buildIntermediateGraph(normalizedThreads, relationships);
  const manifest = buildManifest({
    inventory,
    familyGraphs,
    normalizedThreads,
    relationships,
    anomalies,
  });
  const ambiguityFlags = buildAmbiguityFlags(familyGraphs, relationships, snapshot.markdownDocCount);
  const canonicalitySummary = buildCanonicalitySummary(familyGraphs);
  const decisionLog = buildDecisionLog();
  const mentalMap = buildMentalMap(familyGraphs, anomalies);
  const validationReport = buildValidationReport({
    inventory,
    familyGraphs,
    normalizedThreads,
    manifest,
  });
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

  return {
    workspaceRef: snapshot.workspaceRef,
    sourceCounts: {
      jsonConversations: snapshot.jsonRecords.length,
      markdownDocuments: snapshot.markdownDocCount,
      totalSources: snapshot.records.length,
    },
    familyCount: familyGraphs.length,
    normalizedThreadCount: normalizedThreads.length,
    anomalyCount: anomalies.length,
    warnings,
    inventory,
    familyGraphs,
    relationships,
    normalizedThreads,
    intermediateGraph,
    manifest,
    anomalies,
    ambiguityFlags,
    validationReport,
    canonicalitySummary,
    decisionLog,
    mentalMap,
    outputDirectories: bundle.outputDirectories,
    outputEntries: bundle.files.map(({ fileId, relativePath }) => ({ fileId, relativePath })),
  };
});

const materialize = module.materialize.handler(async ({ context, errors }) => {
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
  const normalizedThreads = familyGraphs.map((family) => buildUnifiedThread(family, jsonRecordsById, anomalies));
  const intermediateGraph = buildIntermediateGraph(normalizedThreads, relationships);
  const manifest = buildManifest({
    inventory,
    familyGraphs,
    normalizedThreads,
    relationships,
    anomalies,
  });
  const ambiguityFlags = buildAmbiguityFlags(familyGraphs, relationships, snapshot.markdownDocCount);
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

export const router = module.router({
  build,
  materialize,
});
