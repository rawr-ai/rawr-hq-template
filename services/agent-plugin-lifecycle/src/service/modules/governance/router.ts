import { currentMainRecord } from "./router/current-main-record";
import { currentMainSelection } from "./router/current-main-selection";

/** Governance operation tree composed for aggregate implementation at the service root. */
export const router = {
  currentMainRecord,
  currentMainSelection,
};
