/**
 * @fileoverview Narrow public undo helper surface for projection-owned sync command setup.
 */
export {
  beginPluginsSyncUndoCapture,
} from "./service/modules/undo/repositories/capsule-capture-repository";
export {
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoCapsule,
  type UndoProvider,
} from "./service/modules/undo/entities";
export type { UndoRunResult } from "./service/modules/undo/contract";
