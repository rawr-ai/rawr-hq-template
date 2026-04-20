import { buildSourceSnapshot } from "../source-materials/helpers/normalize";
import { SOURCE_MATERIAL_DIRECTORIES } from "../../../shared/layout";
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
