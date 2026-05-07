import { type Static, Type } from "typebox";

/**
 * Undo module entities.
 *
 * @remarks
 * The undo module persists a narrow capsule describing how to reverse the last
 * plugin sync, then reports per-operation apply results when the capsule is
 * replayed.
 */

/**
 * Provider id for undo capsules written by the plugin sync workflow.
 */
export const PLUGINS_SYNC_UNDO_PROVIDER = "plugins.sync" as const;

/**
 * Narrow undo provider namespace.
 *
 * Capsules from other workflows must not replay through plugin-sync undo.
 */
export type UndoProvider = typeof PLUGINS_SYNC_UNDO_PROVIDER;

/**
 * Filesystem target kind captured for restore operations.
 */
export type UndoPathKind = "file" | "dir";

/**
 * Readiness state for a captured undo capsule.
 *
 * `ready-partial` means replay is still possible, but capture skipped at least
 * one operation during the original sync.
 */
export type UndoCapsuleStatus = "ready" | "ready-partial";

/**
 * Reversible filesystem operation captured during sync execution.
 *
 * Operations replay in reverse sequence: `create-path` removes a path created
 * by sync, while `restore-path` restores a backed-up file or directory.
 */
export type UndoOperation =
  | {
      seq: number;
      type: "create-path";
      target: string;
    }
  | {
      seq: number;
      type: "restore-path";
      target: string;
      pathKind: UndoPathKind;
      backupRel: string;
    };

/**
 * Persisted undo manifest for the most recent plugin sync command.
 */
export type UndoCapsule = {
  version: 1;
  capsuleId: string;
  provider: UndoProvider;
  createdAt: string;
  createdBy: {
    commandId: string;
    argv: string[];
  };
  workspaceRoot: string;
  status: UndoCapsuleStatus;
  operations: UndoOperation[];
};

/**
 * Status emitted after planning or applying one undo operation.
 *
 * `planned` is the dry-run state; terminal states describe the filesystem
 * effect attempted during a real undo.
 */
export type UndoApplyStatus = "planned" | "restored" | "deleted" | "skipped-missing" | "failed";

/**
 * Per-operation undo result authored by undo helpers and returned in undo
 * success output.
 */
export const UndoApplyItemSchema = Type.Object(
  {
    seq: Type.Number(),
    type: Type.Union([Type.Literal("create-path"), Type.Literal("restore-path")]),
    target: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal("planned"),
      Type.Literal("restored"),
      Type.Literal("deleted"),
      Type.Literal("skipped-missing"),
      Type.Literal("failed"),
    ]),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type UndoApplyItem = Static<typeof UndoApplyItemSchema>;
