import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { SyncScopeSchema, SyncAgentSchema } from "../../shared/entities";
import {
  FullSyncPolicyInputSchema,
  FullSyncPolicyResultSchema,
  SyncAgentSelectionSchema,
  SyncAssessmentSchema,
  TargetHomeCandidatesSchema,
  WorkspaceSkipSchema,
  WorkspaceSyncPlanSchema,
  WorkspaceSyncableSchema,
} from "./entities";

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

export type PlanWorkspaceSyncInput = Static<typeof PlanWorkspaceSyncInputSchema>;
export type AssessWorkspaceSyncInput = Static<typeof AssessWorkspaceSyncInputSchema>;
export type { FullSyncPolicyInput, FullSyncPolicyResult, SyncAgentSelection, SyncAssessment, TargetHomeCandidates, WorkspaceSkip, WorkspaceSyncPlan, WorkspaceSyncable } from "./entities";

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
