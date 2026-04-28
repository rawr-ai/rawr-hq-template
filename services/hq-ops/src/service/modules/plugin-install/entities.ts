import { type Static, Type } from "typebox";

/**
 * Canonical CLI plugin package name for command-plugin management.
 */
export const CANONICAL_SYNC_PLUGIN_NAME = "@rawr/plugin-plugins";

/**
 * Previously installed providers that HQ install policy should retire.
 */
export const LEGACY_SYNC_PLUGIN_NAMES = ["@rawr/plugin-agent-sync"] as const;

/**
 * Reusable install-state entities shared by install assessment and repair
 * contracts. Contract IO shapes remain in the contract; these entities describe
 * durable domain concepts that multiple procedures compose.
 */
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

export const PluginInstallRuntimeSnapshotSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    alias: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Optional(Type.String({ minLength: 1 })),
    root: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
  },
  { additionalProperties: false },
);

export const PluginInstallManagerEntrySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
    root: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const PluginInstallExpectedLinkSchema = Type.Object(
  {
    pluginName: Type.String({ minLength: 1 }),
    root: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const PluginInstallDriftIssueSchema = Type.Object(
  {
    kind: PluginInstallDriftKindSchema,
    pluginName: Type.Optional(Type.String({ minLength: 1 })),
    message: Type.String({ minLength: 1 }),
    expectedRoot: Type.Optional(Type.String({ minLength: 1 })),
    actualRoot: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    autoFixable: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const PluginInstallActionSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("uninstall-plugin"),
      pluginName: Type.String({ minLength: 1 }),
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("reconcile-cli-command-plugin-links"),
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
]);

export type PluginInstallWorkspaceSource = Static<typeof PluginInstallWorkspaceSourceSchema>;
export type PluginInstallStateStatus = Static<typeof PluginInstallStateStatusSchema>;
export type PluginInstallDriftKind = Static<typeof PluginInstallDriftKindSchema>;
export type PluginInstallRuntimeSnapshot = Static<typeof PluginInstallRuntimeSnapshotSchema>;
export type PluginInstallManagerEntry = Static<typeof PluginInstallManagerEntrySchema>;
export type PluginInstallExpectedLink = Static<typeof PluginInstallExpectedLinkSchema>;
export type PluginInstallDriftIssue = Static<typeof PluginInstallDriftIssueSchema>;
export type PluginInstallAction = Static<typeof PluginInstallActionSchema>;
