/**
 * @fileoverview Canonical tag record shared across the Todo capability suite.
 *
 * @remarks
 * Tags owns tag operations and policy. The service root owns this inert record
 * vocabulary because tag records cross the Tags, Assignments, and persistence
 * boundaries without transferring operation ownership.
 */
import { type Static, Type } from "typebox";
import { TodoIdentifierSchema } from "./identifier";
import { WorkspaceIdSchema } from "./workspace-id";

/** Structural authority for a persisted tag record. */
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

/** Tag record type generated from the canonical TypeBox schema. */
export type Tag = Static<typeof TagSchema>;
