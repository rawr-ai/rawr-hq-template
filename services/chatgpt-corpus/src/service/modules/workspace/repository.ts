import type { WorkspaceStore, WorkspaceTemplate } from "../../shared/workspace-store";

export function createRepository(workspaceStore: WorkspaceStore, workspaceRef: string) {
  return {
    async initialize(template: WorkspaceTemplate) {
      return await workspaceStore.scaffoldWorkspace({
        workspaceRef,
        template,
      });
    },
  };
}
