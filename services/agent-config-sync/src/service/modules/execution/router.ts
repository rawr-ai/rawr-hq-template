import { module } from "./module";

const runSync = module.runSync.handler(async ({ context, input }) => {
  return context.repo.runSync(input);
});

export const router = module.router({
  runSync,
});
