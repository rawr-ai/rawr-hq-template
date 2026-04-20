import { type Static, Type } from "typebox";

/**
 * Shared retirement entities.
 *
 * @remarks
 * The retirement module performs destructive cleanup of *managed* artifacts in
 * agent homes. These entities represent stable data shapes that:
 * - the contract exposes (procedure outputs), and
 * - the router authors (procedure implementations).
 *
 * Keeping these in `entities.ts` prevents the contract from becoming a type-bucket
 * that service code imports from.
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

export const RetiredPluginRefSchema = Type.Object(
  {
    agent: Type.Union([Type.Literal("codex"), Type.Literal("claude")]),
    home: Type.String({ minLength: 1 }),
    plugin: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type RetiredPluginRef = Static<typeof RetiredPluginRefSchema>;
