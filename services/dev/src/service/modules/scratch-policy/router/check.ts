import { module } from "../module";

/** Observes scratch artifacts and evaluates the service-owned admission policy. */
export const check = module.check.handler(async ({ context, input }) => {
  return context.checkScratchPolicy(input);
});
