import { rethrowAsOrpcError } from "../../shared/errors";
import { buildFamilyGraphs, buildRelationships, buildUnifiedThread } from "./families";
import { buildIntermediateGraph, buildManifest } from "./manifest";
import { module } from "./module";
import { buildAmbiguityFlags, buildCanonicalitySummary, buildDecisionLog, buildMentalMap, buildValidationReport, detectAnomalies } from "./reports";
import { buildInventory, loadSources } from "./sources";
import { buildInitWorkspaceResult, WORKSPACE_GITIGNORE, WORKSPACE_README } from "./workspace";
import type { SourceRecord } from "./types";

const initWorkspace = module.initWorkspace.handler(async ({ context }) => {
  const createdPaths: string[] = [];
  const existingPaths: string[] = [];

  const ensureDir = async (dirPath: string) => {
    const status = await context.repo.ensureDirectory(dirPath);
    if (status === "created") createdPaths.push(dirPath);
    else existingPaths.push(dirPath);
  };

  const writeFileIfChanged = async (filePath: string, contents: string) => {
    const status = await context.repo.writeFileIfChanged(filePath, `${contents.trimEnd()}\n`);
    if (status === "created") createdPaths.push(filePath);
    else existingPaths.push(filePath);
  };

  await ensureDir(context.paths.workspaceRoot);
  await ensureDir(context.paths.sourceJsonDir);
  await ensureDir(context.paths.sourceDocsDir);
  await writeFileIfChanged(context.paths.readmePath, WORKSPACE_README);
  await writeFileIfChanged(context.paths.gitignorePath, WORKSPACE_GITIGNORE);

  return buildInitWorkspaceResult(context.paths, createdPaths, existingPaths);
});

const consolidateWorkspace = module.consolidateWorkspace.handler(async ({ context }) => {
  try {
    const records = await loadSources(context.repo, context.paths);
    const jsonRecords = records.filter((record): record is SourceRecord & { type: "json_conversation" } =>
      record.type === "json_conversation" && Array.isArray(record.messages),
    );
    const markdownDocCount = records.filter((record) => record.type === "markdown_document").length;
    const inventory = buildInventory(records);
    const anomalies = detectAnomalies(jsonRecords);
    const familyGraphs = buildFamilyGraphs(jsonRecords);
    const relationships = buildRelationships(familyGraphs);
    const jsonRecordsById = new Map(jsonRecords.map((record) => [record.sourceId, record]));
    const normalizedThreads = familyGraphs.map((family) => buildUnifiedThread(family, jsonRecordsById, anomalies));
    const intermediateGraph = buildIntermediateGraph(normalizedThreads, relationships);
    const manifest = buildManifest({
      inventory,
      familyGraphs,
      normalizedThreads,
      relationships,
      anomalies,
      paths: context.paths,
    });
    const ambiguityFlags = buildAmbiguityFlags(familyGraphs, relationships, markdownDocCount);
    const validationReport = buildValidationReport({
      inventory,
      familyGraphs,
      normalizedThreads,
      manifest,
    });
    const warnings: string[] = [];
    if (jsonRecords.length === 0) warnings.push("No conversation exports were found under source-material/conversations/raw-json.");
    if (markdownDocCount === 0) warnings.push("No curated Markdown source docs were found under work/docs/source.");

    const stagedJsonWrites = [
      { filePath: `${context.paths.corpusDir}/inventory.json`, payload: inventory },
      { filePath: `${context.paths.corpusDir}/family-graphs.json`, payload: familyGraphs },
      { filePath: `${context.paths.corpusDir}/intermediate-graph.json`, payload: intermediateGraph },
      { filePath: `${context.paths.corpusDir}/corpus-manifest.json`, payload: manifest },
      { filePath: `${context.paths.reportsDir}/anomalies.json`, payload: anomalies },
      { filePath: `${context.paths.reportsDir}/ambiguity-flags.json`, payload: ambiguityFlags },
      { filePath: `${context.paths.reportsDir}/validation-report.json`, payload: validationReport },
      ...normalizedThreads.map((thread) => ({
        filePath: `${context.paths.normalizedDir}/${String(thread.thread_id)}.json`,
        payload: thread,
      })),
    ];
    const stagedMarkdownWrites = [
      {
        filePath: `${context.paths.reportsDir}/canonicality-summary.md`,
        text: buildCanonicalitySummary(familyGraphs),
      },
      {
        filePath: `${context.paths.reportsDir}/decision-log.md`,
        text: buildDecisionLog(),
      },
      {
        filePath: `${context.paths.reportsDir}/mental-map.md`,
        text: buildMentalMap(familyGraphs, anomalies),
      },
      {
        filePath: context.paths.readmePath,
        text: WORKSPACE_README,
      },
    ];

    await context.repo.ensureGeneratedDirectories();
    await Promise.all([
      ...stagedJsonWrites.map((write) => context.repo.writeJson(write.filePath, write.payload)),
      ...stagedMarkdownWrites.map((write) => context.repo.writeMarkdown(write.filePath, write.text)),
    ]);

    if (!validationReport.all_passed) {
      throw new Error(`Validation failed; see ${context.paths.reportsDir}/validation-report.json`);
    }

    return {
      workspaceRoot: context.paths.workspaceRoot,
      sourceCounts: {
        jsonConversations: jsonRecords.length,
        markdownDocuments: markdownDocCount,
        totalSources: records.length,
      },
      familyCount: familyGraphs.length,
      normalizedThreadCount: normalizedThreads.length,
      anomalyCount: anomalies.length,
      warnings,
      outputPaths: {
        inventory: `${context.paths.corpusDir}/inventory.json`,
        familyGraphs: `${context.paths.corpusDir}/family-graphs.json`,
        intermediateGraph: `${context.paths.corpusDir}/intermediate-graph.json`,
        manifest: `${context.paths.corpusDir}/corpus-manifest.json`,
        reportsDir: context.paths.reportsDir,
        normalizedThreadsDir: context.paths.normalizedDir,
        validationReport: `${context.paths.reportsDir}/validation-report.json`,
      },
    };
  } catch (error) {
    rethrowAsOrpcError(error);
  }
});

export const router = module.router({
  initWorkspace,
  consolidateWorkspace,
});
