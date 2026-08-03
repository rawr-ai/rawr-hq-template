import { service } from "../../impl";

/** Curates only the service-derived scratch admission capability. */
export const module = service.scratchPolicy.use(async ({ context, next }) =>
  next({
    context: {
      checkScratchPolicy: context.provided.checkScratchPolicy,
    },
  })
);
