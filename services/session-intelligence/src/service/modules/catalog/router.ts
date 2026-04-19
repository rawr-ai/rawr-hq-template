import { module } from "./module";

const list = module.list.handler(async ({ context, input }) => {
  return { sessions: await context.repo.list(input) };
});

const resolve = module.resolve.handler(async ({ context, input, errors }) => {
  const resolved = await context.repo.resolve(input);
  if ("error" in resolved) {
    throw errors.SESSION_NOT_FOUND({
      message: resolved.error,
      data: { message: resolved.error },
    });
  }
  return resolved;
});

export const router = module.router({
  list,
  resolve,
});
