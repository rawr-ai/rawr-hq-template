import { module } from "./module";

const metadata = module.metadata.handler(async ({ context, input }) => {
  return { hits: await context.repo.metadata(input) };
});

const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    return { hits: await context.repo.content(input) };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw errors.INVALID_REGEX({
        message: err.message,
        data: { message: err.message },
      });
    }
    throw err;
  }
});

const reindex = module.reindex.handler(async ({ context, input }) => {
  return context.repo.reindex(input);
});

const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  await context.repo.clearIndex(input);
  return { cleared: true };
});

export const router = module.router({
  metadata,
  content,
  reindex,
  clearIndex,
});
