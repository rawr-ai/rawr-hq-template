import { attestPromotion } from "./attest-promotion.router";
import { resolveCurrentMainProcedure } from "./resolve-current-main.router";
import { validateAcceptance } from "./validate-acceptance.router";

export const router = Object.freeze({
  validateAcceptance,
  attestPromotion,
  resolveCurrentMain: resolveCurrentMainProcedure,
});
