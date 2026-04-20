import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { SyncScopeSchema } from "../../shared/schemas";

const RetireActionSchema = Type.Object(
  {
    agent: Type.Union([Type.Literal("codex"), Type.Literal("claude")]),
    home: Type.String({ minLength: 1 }),
    plugin: Type.String({ minLength: 1 }),
    target: Type.String({ minLength: 1 }),
    action: Type.Union([
      Type.Literal("planned"),
      Type.Literal("deleted"),
      Type.Literal("updated"),
      Type.Literal("skipped"),
      Type.Literal("failed"),
    ]),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

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
    stalePlugins: Type.Array(
      Type.Object(
        {
          agent: Type.Union([Type.Literal("codex"), Type.Literal("claude")]),
          home: Type.String({ minLength: 1 }),
          plugin: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
    actions: Type.Array(RetireActionSchema),
  },
  { additionalProperties: false },
);

export type RetireAction = Static<typeof RetireActionSchema>;
export type RetireStaleManagedInput = Static<typeof RetireStaleManagedInputSchema>;
export type RetireStaleManagedResult = Static<typeof RetireStaleManagedResultSchema>;

export const contract = {
  retireStaleManaged: ocBase
    .meta({ idempotent: false, entity: "retirement" })
    .input(schema(RetireStaleManagedInputSchema))
    .output(schema(RetireStaleManagedResultSchema)),
};
