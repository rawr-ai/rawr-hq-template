import { createWorkspaceTemplate } from "./helpers/template";
import { module } from "./module";

const describeTemplate = module.describeTemplate.handler(async () => {
  return createWorkspaceTemplate();
});

const initialize = module.initialize.handler(async ({ context }) => {
  const template = createWorkspaceTemplate();
  const scaffold = await context.repo.initialize(template);

  return {
    workspaceRef: context.workspaceRef,
    createdEntries: scaffold.createdEntries,
    existingEntries: scaffold.existingEntries,
    managedFiles: template.managedFiles.map(({ fileId, relativePath }) => ({
      fileId,
      relativePath,
    })),
  };
});

export const router = module.router({
  describeTemplate,
  initialize,
});
