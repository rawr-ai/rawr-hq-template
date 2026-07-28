import { service } from "../../impl";

export const module = service.transcripts.use(async ({ context, next }) =>
  next({
    context: {
      sourceRuntime: context.deps.sessionSourceRuntime,
    },
  })
);
