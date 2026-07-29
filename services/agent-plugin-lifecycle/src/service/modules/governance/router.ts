import { currentMainRecord } from "./router/current-main-record.router";
import { currentMainSelection } from "./router/current-main-selection.router";

/** Governance operation tree composed for aggregate implementation at the service root. */
export const router = {
  currentMainRecord,
  currentMainSelection,
};
