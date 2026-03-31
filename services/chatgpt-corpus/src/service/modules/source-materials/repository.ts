import type { WorkspaceStore } from "../../shared/workspace-store";

export function createRepository(workspaceStore: WorkspaceStore, workspaceRef: string) {
  return {
    async readSourceMaterials() {
      return await workspaceStore.readSourceMaterials({ workspaceRef });
    },
  };
}
