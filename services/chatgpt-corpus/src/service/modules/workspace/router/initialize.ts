import { createWorkspaceTemplate } from "../model/policy";
import { module } from "../module";

export const initialize = module.initialize.handler(async ({ context }) => {
  const template = createWorkspaceTemplate();
  const scaffold = await context.workspaceStore.scaffoldWorkspace({
    workspaceRef: context.workspaceRef,
    template,
  });

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
