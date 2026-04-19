import { type Static, Type } from "typebox";
import type {
  PluginInstallAction,
  PluginInstallAssessInput,
  PluginInstallDriftIssue,
  PluginInstallExpectedLink,
  PluginInstallManagerEntry,
  PluginInstallRepairInput,
  PluginInstallRepairPlan,
  PluginInstallRuntimeSnapshot,
  PluginInstallStateReport,
} from "./model";

export const PluginInstallWorkspaceSourceSchema = Type.Union([
  Type.Literal("global-owner"),
  Type.Literal("workspace-root"),
]);

export const PluginInstallStateStatusSchema = Type.Union([
  Type.Literal("IN_SYNC"),
  Type.Literal("DRIFT_DETECTED"),
  Type.Literal("STALE_LINKS"),
  Type.Literal("LEGACY_OVERLAP"),
]);

export const PluginInstallDriftKindSchema = Type.Union([
  Type.Literal("missing_link"),
  Type.Literal("not_linked"),
  Type.Literal("stale_link"),
  Type.Literal("path_mismatch"),
  Type.Literal("legacy_present"),
  Type.Literal("legacy_overlap"),
  Type.Literal("missing_core_plugin"),
]);

export const PluginInstallRuntimeSnapshotSchema = Type.Unsafe<PluginInstallRuntimeSnapshot>(
  Type.Object(
    {
      name: Type.String({ minLength: 1 }),
      alias: Type.Optional(Type.String({ minLength: 1 })),
      type: Type.Optional(Type.String({ minLength: 1 })),
      root: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallManagerEntrySchema = Type.Unsafe<PluginInstallManagerEntry>(
  Type.Object(
    {
      name: Type.String({ minLength: 1 }),
      type: Type.String({ minLength: 1 }),
      root: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallExpectedLinkSchema = Type.Unsafe<PluginInstallExpectedLink>(
  Type.Object(
    {
      pluginName: Type.String({ minLength: 1 }),
      root: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallDriftIssueSchema = Type.Unsafe<PluginInstallDriftIssue>(
  Type.Object(
    {
      kind: PluginInstallDriftKindSchema,
      pluginName: Type.Optional(Type.String({ minLength: 1 })),
      message: Type.String({ minLength: 1 }),
      expectedRoot: Type.Optional(Type.String({ minLength: 1 })),
      actualRoot: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
      autoFixable: Type.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallActionSchema = Type.Unsafe<PluginInstallAction>(
  Type.Object(
    {
      command: Type.String({ minLength: 1 }),
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallStateReportSchema = Type.Unsafe<PluginInstallStateReport>(
  Type.Object(
    {
      status: PluginInstallStateStatusSchema,
      inSync: Type.Boolean(),
      canonicalWorkspaceRoot: Type.String({ minLength: 1 }),
      canonicalWorkspaceSource: PluginInstallWorkspaceSourceSchema,
      pluginManagerManifestPath: Type.String({ minLength: 1 }),
      expectedLinks: Type.Array(PluginInstallExpectedLinkSchema),
      actualLinks: Type.Array(PluginInstallManagerEntrySchema),
      issues: Type.Array(PluginInstallDriftIssueSchema),
      actions: Type.Array(PluginInstallActionSchema),
      summary: Type.Object(
        {
          expectedLinkCount: Type.Number(),
          actualLinkCount: Type.Number(),
          issueCount: Type.Number(),
          staleLinkCount: Type.Number(),
          legacyIssueCount: Type.Number(),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallAssessInputSchema = Type.Unsafe<PluginInstallAssessInput>(
  Type.Object(
    {
      workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
      canonicalWorkspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
      canonicalWorkspaceSource: Type.Optional(PluginInstallWorkspaceSourceSchema),
      pluginManagerManifestPath: Type.String({ minLength: 1 }),
      expectedLinks: Type.Array(PluginInstallExpectedLinkSchema),
      actualLinks: Type.Array(PluginInstallManagerEntrySchema),
      runtimePlugins: Type.Optional(Type.Array(PluginInstallRuntimeSnapshotSchema)),
    },
    { additionalProperties: false },
  ),
);

const PluginInstallRepairCommandSchema = Type.Object(
  {
    args: Type.Array(Type.String()),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const PluginInstallRepairPlanSchema = Type.Unsafe<PluginInstallRepairPlan>(
  Type.Object(
    {
      action: Type.Union([Type.Literal("skipped"), Type.Literal("planned")]),
      beforeStatus: PluginInstallStateStatusSchema,
      commands: Type.Array(PluginInstallRepairCommandSchema),
      summary: Type.Object(
        {
          issueCount: Type.Number(),
          commandCount: Type.Number(),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);

export const PluginInstallRepairInputSchema = Type.Unsafe<PluginInstallRepairInput>(
  Type.Object(
    {
      report: PluginInstallStateReportSchema,
    },
    { additionalProperties: false },
  ),
);

export type PluginInstallAssessInputDto = Static<typeof PluginInstallAssessInputSchema>;
export type PluginInstallStateReportDto = Static<typeof PluginInstallStateReportSchema>;
export type PluginInstallRepairInputDto = Static<typeof PluginInstallRepairInputSchema>;
export type PluginInstallRepairPlanDto = Static<typeof PluginInstallRepairPlanSchema>;
