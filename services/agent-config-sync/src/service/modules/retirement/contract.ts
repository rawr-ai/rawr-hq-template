import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { SyncScopeSchema } from "../../shared/entities";
import { RetireActionSchema, RetiredPluginRefSchema } from "./entities";

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

const RetireStaleManagedResultSchema = Type.Object(
  {
    ok: Type.Boolean(),
    stalePlugins: Type.Array(RetiredPluginRefSchema),
    actions: Type.Array(RetireActionSchema),
  },
  { additionalProperties: false },
);

export type RetireStaleManagedInput = Static<typeof RetireStaleManagedInputSchema>;
export type RetireStaleManagedResult = Static<typeof RetireStaleManagedResultSchema>;

export const contract = {
  retireStaleManaged: ocBase
    .meta({ idempotent: false, entity: "retirement" })
    .input(schema(RetireStaleManagedInputSchema))
    .output(schema(RetireStaleManagedResultSchema)),
};
