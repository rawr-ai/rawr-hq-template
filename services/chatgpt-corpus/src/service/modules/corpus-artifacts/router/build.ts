/**
 * chatgpt-corpus: corpus-artifacts module.
 *
 * This router builds derived artifacts (inventory/manifest/threads/graphs/etc.)
 * from a normalized `SourceSnapshot`. The procedure body intentionally owns the
 * authored build flow so callers can treat this as a single capability, while
 * policy leaves remain narrow transformations behind that operation boundary.
 */
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

export const build = module.build.handler(async ({ input }) => {
  const snapshot = input.snapshot;
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
