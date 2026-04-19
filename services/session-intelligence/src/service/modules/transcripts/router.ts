import { module } from "./module";

const detect = module.detect.handler(async ({ context, input }) => {
  return { source: await context.repo.detect(input.path) };
});

const extract = module.extract.handler(async ({ context, input, errors }) => {
  const extracted = await context.repo.extract(input.path, input.options);
  if ("error" in extracted) {
    throw errors.UNKNOWN_SESSION_FORMAT({
      message: extracted.error,
      data: { message: extracted.error },
    });
  }
  return extracted;
});

export const router = module.router({
  detect,
  extract,
});
