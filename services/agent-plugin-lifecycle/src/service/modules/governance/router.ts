import { router as currentMainRecordOperations } from "./router/current-main-record.router";
import { router as currentMainSelectionOperations } from "./router/current-main-selection.router";

/** Composes Governance's authored operations into its single public module face. */
export const router = {
  ...currentMainRecordOperations,
  ...currentMainSelectionOperations,
};
