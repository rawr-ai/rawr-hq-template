import type { WorkspaceArtifactBundle } from "../../../../orpc/ports/workspace-store";
import {
  ARTIFACT_OUTPUT_DIRECTORIES,
  STATIC_ARTIFACT_FILE_REFS,
  createNormalizedThreadArtifactRef,
} from "../../../../shared/layout";
import type {
  AmbiguityFlag,
  Anomaly,
  FamilyGraph,
  IntermediateGraph,
  InventoryItem,
  Manifest,
  NormalizedThread,
  ValidationReport,
} from "../entities";

export function createArtifactFiles(input: {
  inventory: InventoryItem[];
  familyGraphs: FamilyGraph[];
  intermediateGraph: IntermediateGraph;
  manifest: Manifest;
  anomalies: Anomaly[];
  ambiguityFlags: AmbiguityFlag[];
  canonicalitySummary: string;
  decisionLog: string;
  mentalMap: string;
  validationReport: ValidationReport;
  normalizedThreads: NormalizedThread[];
}): WorkspaceArtifactBundle {
  const staticFileContents = {
    inventory: `${JSON.stringify(input.inventory, null, 2)}\n`,
    familyGraphs: `${JSON.stringify(input.familyGraphs, null, 2)}\n`,
    intermediateGraph: `${JSON.stringify(input.intermediateGraph, null, 2)}\n`,
    manifest: `${JSON.stringify(input.manifest, null, 2)}\n`,
    anomalies: `${JSON.stringify(input.anomalies, null, 2)}\n`,
    ambiguityFlags: `${JSON.stringify(input.ambiguityFlags, null, 2)}\n`,
    canonicalitySummary: `${input.canonicalitySummary.trimEnd()}\n`,
    decisionLog: `${input.decisionLog.trimEnd()}\n`,
    mentalMap: `${input.mentalMap.trimEnd()}\n`,
    validationReport: `${JSON.stringify(input.validationReport, null, 2)}\n`,
  } as const;

  const files = [
    ...STATIC_ARTIFACT_FILE_REFS.map((file) => ({
      ...file,
      contents: staticFileContents[file.fileId],
    })),
    ...input.normalizedThreads.map((thread) => ({
      ...createNormalizedThreadArtifactRef(String(thread.thread_id)),
      contents: `${JSON.stringify(thread, null, 2)}\n`,
    })),
  ];

  return {
    outputDirectories: [...ARTIFACT_OUTPUT_DIRECTORIES],
    files,
  };
}
