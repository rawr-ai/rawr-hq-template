export const PLUGINS_SYNC_UNDO_PROVIDER = "plugins.sync" as const;

export type UndoProvider = typeof PLUGINS_SYNC_UNDO_PROVIDER;
export type UndoPathKind = "file" | "dir";
export type UndoCapsuleStatus = "ready" | "ready-partial";

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

export type UndoApplyStatus = "planned" | "restored" | "deleted" | "skipped-missing" | "failed";

export type UndoApplyItem = {
  seq: number;
  type: UndoOperation["type"];
  target: string;
  status: UndoApplyStatus;
  message?: string;
};
