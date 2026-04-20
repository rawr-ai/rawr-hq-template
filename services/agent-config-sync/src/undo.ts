/**
 * @fileoverview Narrow public undo helper surface for projection-owned sync command setup.
 */
export {
  beginPluginsSyncUndoCapture,
} from "./service/modules/undo/helpers/capture";
export {
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoCapsule,
  type UndoProvider,
} from "./service/modules/undo/entities";
export type { UndoRunResult } from "./service/modules/undo/contract";
