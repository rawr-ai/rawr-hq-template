import type {
  SourceContent,
  SourcePlugin,
  SyncRunResult,
  SyncScope,
  SyncTargetResult,
  TargetHomes,
  WorkspaceSkip,
} from "../../shared/schemas";

export type SyncPreviewInput = {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
  codexHomes: string[];
  claudeHomes: string[];
  includeCodex: boolean;
  includeClaude: boolean;
  includeAgentsInCodex?: boolean;
  includeAgentsInClaude?: boolean;
  force: boolean;
  gc: boolean;
};

export type WorkspaceSyncable = {
  sourcePlugin: SourcePlugin;
  content: SourceContent;
};

export type SyncAssessment = {
  status: "IN_SYNC" | "DRIFT_DETECTED" | "CONFLICTS";
  includeMetadata: boolean;
  scope: SyncScope;
  summary: {
    totalPlugins: number;
    totalTargets: number;
    totalConflicts: number;
    totalMaterialChanges: number;
    totalMetadataChanges: number;
    totalDriftItems: number;
  };
  skipped: WorkspaceSkip[];
  plugins: Array<{
    dirName: string;
    absPath: string;
    conflicts: number;
    materialChanges: number;
    metadataChanges: number;
    driftItems: Array<Pick<SyncTargetResult["items"][number], "action" | "kind" | "target" | "message">>;
  }>;
};

export type SyncPreviewResult = SyncRunResult;
export type WorkspaceAssessmentTargetHomes = TargetHomes;
