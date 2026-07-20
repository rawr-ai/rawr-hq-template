import { attestPromotion } from "./attest-promotion.router";
import { currentMainRecord } from "./current-main-record.router";
import { resolveCurrentMainProcedure } from "./resolve-current-main.router";
import { validateAcceptance } from "./validate-acceptance.router";

export const router = Object.freeze({
  currentMainRecord,
  validateAcceptance,
  attestPromotion,
  resolveCurrentMain: resolveCurrentMainProcedure,
});
