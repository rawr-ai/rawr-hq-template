/**
 * @fileoverview Tag entity schema and inferred type.
 *
 * @remarks
 * Keep this as the canonical shape for tag records in this domain module. Procedure contracts may be
 * more specific in input form but should resolve to this output entity shape.
 *
 * @agents
 * If tag semantics change (for example color format rules), update this schema
 * and the procedures that accept/normalize input accordingly.
 */
import { type Static, Type } from "typebox";
import { TodoIdentifierSchema } from "#example-todo-service/model/dto/identifier";
import { WorkspaceIdSchema } from "#example-todo-service/model/dto/workspace-id";

export const TagSchema = Type.Object(
  {
    id: TodoIdentifierSchema,
    workspaceId: WorkspaceIdSchema,
    name: Type.String({
      minLength: 1,
      maxLength: 50,
      description: "Display label for the tag.",
    }),
    color: Type.String({
      pattern: "^#[0-9a-fA-F]{6}$",
      description: "Hex color associated with the tag.",
    }),
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the tag was created.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical persisted tag entity.",
  }
);

export type Tag = Static<typeof TagSchema>;
