import { type Static, Type } from "typebox";

/**
 * agent-config-sync: retirement cleanup entities.
 *
 * @remarks
 * The retirement module performs destructive cleanup of *managed* artifacts in
 * agent homes. These entities describe stale managed plugins and the cleanup
 * actions planned or applied for each destination.
 */

/**
 * One managed-artifact retirement action planned or applied by the module.
 */
export const RetireActionSchema = Type.Object(
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

export type RetireAction = Static<typeof RetireActionSchema>;

/**
 * Managed plugin identity that retirement found stale in a destination home.
 */
export const RetiredPluginRefSchema = Type.Object(
  {
    agent: Type.Union([Type.Literal("codex"), Type.Literal("claude")]),
    home: Type.String({ minLength: 1 }),
    plugin: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type RetiredPluginRef = Static<typeof RetiredPluginRefSchema>;
