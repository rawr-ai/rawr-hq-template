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

/**
 * Report produced by HQ Ops after comparing service-owned expected command
 * plugin links with the concrete oclif manager state observed by a projection.
 */
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

/**
 * Semantic repair plan for projection-side command execution.
 *
 * The service returns intent; the CLI translates intent to local rawr commands.
 */
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

/**
 * Public HQ command-plugin install health API.
 *
 * Expected command links are derived from the HQ catalog here, not passed in
 * from the CLI, which keeps oclif eligibility and legacy-provider policy in the
 * service domain.
 */
export const contract = {
  /**
   * Assesses drift between catalog-derived expected links and actual manager
   * entries read by the CLI from the local oclif installation.
   */
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
  /**
   * Converts an install-state report into semantic repair actions that the
   * projection can execute with local process privileges.
   */
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
