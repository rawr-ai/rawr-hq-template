import type { WorkspaceStore, WorkspaceTemplate } from "../../../orpc/ports/workspace-store";

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
