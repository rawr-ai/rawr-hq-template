import { module } from "./module";

const previewSync = module.previewSync.handler(async ({ context, input }) => {
  return context.repo.preview(input);
});

const assessWorkspace = module.assessWorkspace.handler(async ({ context, input }) => {
  return context.repo.assessWorkspace(input);
});

export const router = module.router({
  previewSync,
  assessWorkspace,
});
