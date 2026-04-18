export const PLUGINS_SYNC_UNDO_PROVIDER = "plugins.sync" as const;

export type UndoProvider = typeof PLUGINS_SYNC_UNDO_PROVIDER;
export type UndoCapsuleStatus = "ready" | "ready-partial";
export type UndoPathKind = "file" | "dir";

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

export type UndoApplyItem = {
  seq: number;
  type: UndoOperation["type"];
  target: string;
  status: "planned" | "restored" | "deleted" | "skipped-missing" | "failed";
  message?: string;
};

export type UndoRunResult =
  | {
      ok: true;
      capsuleId: string;
      provider: UndoProvider;
      dryRun: boolean;
      status: UndoCapsuleStatus;
      operations: UndoApplyItem[];
      summary: {
        planned: number;
        restored: number;
        deleted: number;
        skippedMissing: number;
        failed: number;
      };
    }
  | {
      ok: false;
      code: "UNDO_NOT_AVAILABLE" | "UNDO_PROVIDER_UNSUPPORTED" | "UNDO_FAILED";
      message: string;
      details?: unknown;
    };

export interface UndoRuntime {
  beginSession(input: { workspaceRoot: string; commandId: string; argv: string[] }): Promise<void>;
  finalizeSession(input: { workspaceRoot: string; status: UndoCapsuleStatus }): Promise<UndoCapsule | null>;
  loadActiveCapsule(workspaceRoot: string): Promise<UndoCapsule | null>;
  clearActiveCapsule(workspaceRoot: string): Promise<void>;
  captureWriteTarget(target: string): Promise<void>;
  captureDeleteTarget(target: string): Promise<void>;
  runUndo(input: { workspaceRoot: string; dryRun: boolean }): Promise<UndoRunResult>;
}
