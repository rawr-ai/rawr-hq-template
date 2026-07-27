import { type Static, Type } from "typebox";

/** Runtime schema for the workspace scope that owns Example Todo records. */
export const WorkspaceIdSchema = Type.String({
  minLength: 1,
  description: "Stable workspace scope that owns Example Todo records.",
});

/** Workspace identity shared across the Example Todo capability suite. */
export type WorkspaceIdType = Static<typeof WorkspaceIdSchema>;
