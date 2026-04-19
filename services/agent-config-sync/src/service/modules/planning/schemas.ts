import { type Static, Type } from "typebox";
import type {
  SourceContent,
  SourcePlugin,
  SyncRunResult,
  SyncScope,
  SyncTargetResult,
} from "../../shared/schemas";
import { SyncAgentSchema } from "../../shared/schemas";

export const SyncAgentSelectionSchema = Type.Union([
  SyncAgentSchema,
  Type.Literal("all"),
]);

export const TargetHomesSchema = Type.Object(
  {
    codexHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeHomes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const WorkspaceSkipSchema = Type.Object(
  {
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type SyncAgentSelection = Static<typeof SyncAgentSelectionSchema>;
export type TargetHomes = Static<typeof TargetHomesSchema>;
export type WorkspaceSkip = Static<typeof WorkspaceSkipSchema>;

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
