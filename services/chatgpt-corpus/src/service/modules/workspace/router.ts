/**
 * chatgpt-corpus: workspace module.
 *
 * This router owns workspace scaffolding for corpus operations. The service
 * defines the managed file set and template structure so tools can initialize
 * a workspace without encoding the template in projections.
 */
import { createWorkspaceTemplate } from "./helpers/template";
import { module } from "./module";

const describeTemplate = module.describeTemplate.handler(async () => {
  return createWorkspaceTemplate();
});

const initialize = module.initialize.handler(async ({ context }) => {
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

export const router = module.router({
  describeTemplate,
  initialize,
});
