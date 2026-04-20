import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncActionSchema,
  SyncAgentSchema,
  SyncScopeSchema,
} from "../../shared/entities";

const SyncAgentSelectionSchema = Type.Union([
  SyncAgentSchema,
  Type.Literal("all"),
]);

const DestinationConfigSchema = Type.Object(
  {
    rootPath: Type.Optional(Type.String({ minLength: 1 })),
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const TargetHomeCandidatesSchema = Type.Object(
  {
    codexHomesFromFlags: Type.Array(Type.String({ minLength: 1 })),
    claudeHomesFromFlags: Type.Array(Type.String({ minLength: 1 })),
    codexHomesFromEnvironment: Type.Array(Type.String({ minLength: 1 })),
    claudeHomesFromEnvironment: Type.Array(Type.String({ minLength: 1 })),
    codexHomesFromConfig: Type.Array(DestinationConfigSchema),
    claudeHomesFromConfig: Type.Array(DestinationConfigSchema),
    codexDefaultHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeDefaultHomes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const TargetHomesSchema = Type.Object(
  {
    codexHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeHomes: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const WorkspaceSkipSchema = Type.Object(
  {
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const WorkspaceSyncableSchema = Type.Object(
  {
    sourcePlugin: SourcePluginSchema,
    content: SourceContentSchema,
  },
  { additionalProperties: false },
);

const FullSyncPolicyInputSchema = Type.Object(
  {
    agent: SyncAgentSelectionSchema,
    scope: SyncScopeSchema,
    coworkEnabled: Type.Boolean(),
    claudeInstallEnabled: Type.Boolean(),
    claudeEnableEnabled: Type.Boolean(),
    installReconcileEnabled: Type.Boolean(),
    retireOrphansEnabled: Type.Boolean(),
    force: Type.Boolean(),
    gc: Type.Boolean(),
    allowPartial: Type.Boolean(),
  },
  { additionalProperties: false },
);

const FullSyncPolicyResultSchema = Type.Object(
  {
    allowed: Type.Boolean(),
    partialReasons: Type.Array(Type.String({ minLength: 1 })),
    canonical: Type.Literal("rawr plugins sync all"),
    failure: Type.Optional(
      Type.Object(
        {
          code: Type.Literal("PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL"),
          message: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

const WorkspaceRootErrorDataSchema = schema(
  Type.Object(
    {
      cwd: Type.String({ minLength: 1 }),
      workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
      resolvedPath: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
);

const INVALID_WORKSPACE_ROOT = {
  status: 400,
  message: "Configured workspace root is not a RAWR workspace",
  data: WorkspaceRootErrorDataSchema,
} as const;

const WORKSPACE_ROOT_NOT_FOUND = {
  status: 404,
  message: "Unable to locate workspace root",
  data: WorkspaceRootErrorDataSchema,
} as const;

const WorkspacePlanningBaseInputSchema = Type.Object(
  {
    cwd: Type.String({ minLength: 1 }),
    workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
    sourcePaths: Type.Array(Type.String({ minLength: 1 })),
    includeMetadata: Type.Boolean(),
    scope: SyncScopeSchema,
    agent: SyncAgentSelectionSchema,
    targetHomeCandidates: TargetHomeCandidatesSchema,
    includeAgentsInCodex: Type.Optional(Type.Boolean()),
    includeAgentsInClaude: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const PlanWorkspaceSyncInputSchema = Type.Object(
  {
    cwd: Type.String({ minLength: 1 }),
    workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
    sourcePaths: Type.Array(Type.String({ minLength: 1 })),
    includeMetadata: Type.Boolean(),
    scope: SyncScopeSchema,
    agent: SyncAgentSelectionSchema,
    targetHomeCandidates: TargetHomeCandidatesSchema,
    includeAgentsInCodex: Type.Optional(Type.Boolean()),
    includeAgentsInClaude: Type.Optional(Type.Boolean()),
    fullSyncPolicy: FullSyncPolicyInputSchema,
  },
  { additionalProperties: false },
);

const AssessWorkspaceSyncInputSchema = WorkspacePlanningBaseInputSchema;

const DriftItemSchema = Type.Object(
  {
    action: SyncActionSchema,
    kind: Type.Union([
      Type.Literal("workflow"),
      Type.Literal("skill"),
      Type.Literal("script"),
      Type.Literal("agent"),
      Type.Literal("metadata"),
    ]),
    target: Type.String({ minLength: 1 }),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const SyncAssessmentSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("IN_SYNC"),
      Type.Literal("DRIFT_DETECTED"),
      Type.Literal("CONFLICTS"),
    ]),
    includeMetadata: Type.Boolean(),
    scope: SyncScopeSchema,
    summary: Type.Object(
      {
        totalPlugins: Type.Number(),
        totalTargets: Type.Number(),
        totalConflicts: Type.Number(),
        totalMaterialChanges: Type.Number(),
        totalMetadataChanges: Type.Number(),
        totalDriftItems: Type.Number(),
      },
      { additionalProperties: false },
    ),
    skipped: Type.Array(WorkspaceSkipSchema),
    plugins: Type.Array(
      Type.Object(
        {
          dirName: Type.String({ minLength: 1 }),
          absPath: Type.String({ minLength: 1 }),
          conflicts: Type.Number(),
          materialChanges: Type.Number(),
          metadataChanges: Type.Number(),
          driftItems: Type.Array(DriftItemSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

const WorkspaceSyncPlanSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    syncable: Type.Array(WorkspaceSyncableSchema),
    skipped: Type.Array(WorkspaceSkipSchema),
    agents: Type.Array(SyncAgentSchema),
    targetHomes: TargetHomesSchema,
    includeAgentsInCodex: Type.Boolean(),
    includeAgentsInClaude: Type.Boolean(),
    activePluginNames: Type.Array(Type.String({ minLength: 1 })),
    fullSyncPolicy: FullSyncPolicyResultSchema,
    assessment: SyncAssessmentSchema,
  },
  { additionalProperties: false },
);

export type PlanWorkspaceSyncInput = Static<typeof PlanWorkspaceSyncInputSchema>;
export type WorkspaceSyncPlan = Static<typeof WorkspaceSyncPlanSchema>;
export type AssessWorkspaceSyncInput = Static<typeof AssessWorkspaceSyncInputSchema>;
export type SyncAssessment = Static<typeof SyncAssessmentSchema>;
export type FullSyncPolicyInput = Static<typeof FullSyncPolicyInputSchema>;
export type FullSyncPolicyResult = Static<typeof FullSyncPolicyResultSchema>;
export type SyncAgentSelection = Static<typeof SyncAgentSelectionSchema>;
export type TargetHomeCandidates = Static<typeof TargetHomeCandidatesSchema>;
export type TargetHomes = Static<typeof TargetHomesSchema>;
export type WorkspaceSkip = Static<typeof WorkspaceSkipSchema>;
export type WorkspaceSyncable = Static<typeof WorkspaceSyncableSchema>;

export const contract = {
  planWorkspaceSync: ocBase
    .meta({ idempotent: true, entity: "planning" })
    .input(schema(PlanWorkspaceSyncInputSchema))
    .output(schema(WorkspaceSyncPlanSchema))
    .errors({ INVALID_WORKSPACE_ROOT, WORKSPACE_ROOT_NOT_FOUND }),
  assessWorkspaceSync: ocBase
    .meta({ idempotent: true, entity: "planning" })
    .input(schema(AssessWorkspaceSyncInputSchema))
    .output(schema(SyncAssessmentSchema))
    .errors({ INVALID_WORKSPACE_ROOT, WORKSPACE_ROOT_NOT_FOUND }),
  evaluateFullSyncPolicy: ocBase
    .meta({ idempotent: true, entity: "planning" })
    .input(schema(FullSyncPolicyInputSchema))
    .output(schema(FullSyncPolicyResultSchema)),
};
