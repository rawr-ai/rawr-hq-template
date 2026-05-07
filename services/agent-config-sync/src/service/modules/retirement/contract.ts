import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { SyncScopeSchema } from "../../common/entities";
import {
  CleanupBehindCandidateSchema,
  RetainedResidueSchema,
  RetireActionSchema,
  RetiredPluginRefSchema,
} from "./entities";

/**
 * Cleanup request scoped to the active workspace and selected provider homes.
 */
const RetireStaleManagedInputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    scope: SyncScopeSchema,
    codexHomes: Type.Array(Type.String({ minLength: 1 })),
    claudeHomes: Type.Array(Type.String({ minLength: 1 })),
    activePluginNames: Type.Array(Type.String({ minLength: 1 })),
    dryRun: Type.Boolean(),
  },
  { additionalProperties: false },
);

/**
 * Managed-artifact cleanup ledger returned after planning or applying
 * retirement.
 */
const RetireStaleManagedResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    stalePlugins: Type.Array(RetiredPluginRefSchema),
    actions: Type.Array(RetireActionSchema),
  },
  { additionalProperties: false },
);

const CleanupBehindProviderSyncInputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    claimCheckCodexHomes: Type.Array(Type.String({ minLength: 1 })),
    candidates: Type.Array(CleanupBehindCandidateSchema),
    dryRun: Type.Boolean(),
  },
  { additionalProperties: false },
);

const CleanupBehindProviderSyncResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    cleanedPlugins: Type.Array(RetiredPluginRefSchema),
    retainedResidue: Type.Array(RetainedResidueSchema),
    actions: Type.Array(RetireActionSchema),
  },
  { additionalProperties: false },
);

export type RetireStaleManagedInput = Static<typeof RetireStaleManagedInputSchema>;
export type RetireStaleManagedResult = Static<typeof RetireStaleManagedResultSchema>;
export type CleanupBehindProviderSyncInput = Static<typeof CleanupBehindProviderSyncInputSchema>;
export type CleanupBehindProviderSyncResult = Static<typeof CleanupBehindProviderSyncResultSchema>;

export const contract = {
  retireStaleManaged: ocBase
    .meta({ idempotent: false, entity: "retirement" })
    .input(schema(RetireStaleManagedInputSchema))
    .output(schema(RetireStaleManagedResultSchema)),
  cleanupBehindProviderSync: ocBase
    .meta({ idempotent: false, entity: "retirement" })
    .input(schema(CleanupBehindProviderSyncInputSchema))
    .output(schema(CleanupBehindProviderSyncResultSchema)),
};
