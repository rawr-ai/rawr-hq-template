import { type Static, Type } from "typebox";

/**
 * HQ Ops workspace plugin catalog entities.
 *
 * @remarks
 * These entities are shared across multiple HQ Ops modules (catalog, install,
 * lifecycle). Keeping them service-owned (not module-owned) prevents cross-module
 * imports from reaching into another module's internals.
 */

/**
 * Plugin kinds that HQ recognizes as first-class workspace inventory.
 *
 * These are domain entities, not command inputs: contracts compose the schemas
 * when they need validation, while routers and repositories use the inferred
 * TypeScript types from the same TypeBox source of truth.
 */
export const WORKSPACE_PLUGIN_KINDS = ["toolkit", "agent", "web", "api", "workflows", "schedules"] as const;

/**
 * Canonical plugin inventory roots owned by HQ Ops.
 *
 * Keeping this beside the entity schemas makes the catalog's root-to-kind
 * authority explicit and avoids reviving a shared plugin-workspace package.
 */
export const WORKSPACE_PLUGIN_DISCOVERY_ROOTS = [
  "cli",
  "agents",
  "web",
  "server/api",
  "async/workflows",
  "async/schedules",
] as const;

/**
 * Legacy rawr metadata keys that would reintroduce old publication/channel
 * semantics into plugin manifests if accepted by the catalog.
 */
export const FORBIDDEN_LEGACY_RAWR_KEYS = ["templateRole", "channel", "publishTier", "published"] as const;

export const WorkspacePluginKindSchema = Type.Union([
  Type.Literal("toolkit"),
  Type.Literal("agent"),
  Type.Literal("web"),
  Type.Literal("api"),
  Type.Literal("workflows"),
  Type.Literal("schedules"),
]);

export const WorkspacePluginDiscoveryRootSchema = Type.Union([
  Type.Literal("cli"),
  Type.Literal("agents"),
  Type.Literal("web"),
  Type.Literal("server/api"),
  Type.Literal("async/workflows"),
  Type.Literal("async/schedules"),
]);

export const PluginCapabilityEligibilitySchema = Type.Object(
  {
    eligible: Type.Boolean(),
    reason: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

/**
 * Reusable catalog entity returned by HQ Ops procedures and consumed by
 * projections that need to render inventory or execute local resource work.
 */
export const WorkspacePluginCatalogEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.Optional(Type.String({ minLength: 1 })),
    dirName: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    relPath: Type.String({ minLength: 1 }),
    packageJsonPath: Type.String({ minLength: 1 }),
    discoveryRoot: WorkspacePluginDiscoveryRootSchema,
    kind: WorkspacePluginKindSchema,
    capability: Type.String({ minLength: 1 }),
    commandPlugin: PluginCapabilityEligibilitySchema,
    runtimeWeb: PluginCapabilityEligibilitySchema,
  },
  { additionalProperties: false },
);

export type WorkspacePluginKind = Static<typeof WorkspacePluginKindSchema>;
export type WorkspacePluginDiscoveryRoot = Static<typeof WorkspacePluginDiscoveryRootSchema>;
export type ForbiddenLegacyRawrKey = (typeof FORBIDDEN_LEGACY_RAWR_KEYS)[number];
export type PluginCapabilityEligibility = Static<typeof PluginCapabilityEligibilitySchema>;
export type WorkspacePluginCatalogEntry = Static<typeof WorkspacePluginCatalogEntrySchema>;

