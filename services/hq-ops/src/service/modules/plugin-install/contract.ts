import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import {
  PluginInstallActionSchema,
  PluginInstallDriftIssueSchema,
  PluginInstallExpectedLinkSchema,
  PluginInstallManagerEntrySchema,
  PluginInstallRuntimeSnapshotSchema,
  PluginInstallWorkspaceSourceSchema,
  PluginInstallStateStatusSchema,
} from "./entities";

const PluginInstallStateReportSchema = Type.Object(
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
);

const PluginInstallRepairPlanSchema = Type.Object(
  {
    action: Type.Union([Type.Literal("skipped"), Type.Literal("planned")]),
    beforeStatus: PluginInstallStateStatusSchema,
    actions: Type.Array(PluginInstallActionSchema),
    summary: Type.Object(
      {
        issueCount: Type.Number(),
        actionCount: Type.Number(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type PluginInstallStateReport = Static<typeof PluginInstallStateReportSchema>;
export type PluginInstallRepairPlan = Static<typeof PluginInstallRepairPlanSchema>;

export const contract = {
  assessInstallState: ocBase
    .meta({ idempotent: true, entity: "pluginInstall" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        canonicalWorkspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        canonicalWorkspaceSource: Type.Optional(PluginInstallWorkspaceSourceSchema),
        pluginManagerManifestPath: Type.String({ minLength: 1 }),
        actualLinks: Type.Array(PluginInstallManagerEntrySchema),
        runtimePlugins: Type.Optional(Type.Array(PluginInstallRuntimeSnapshotSchema)),
      },
      { additionalProperties: false },
    )))
    .output(schema(PluginInstallStateReportSchema)),
  planInstallRepair: ocBase
    .meta({ idempotent: true, entity: "pluginInstall" })
    .input(schema(Type.Object(
      {
        report: PluginInstallStateReportSchema,
      },
      { additionalProperties: false },
    )))
    .output(schema(PluginInstallRepairPlanSchema)),
};

export type PluginInstallModuleContract = typeof contract;
