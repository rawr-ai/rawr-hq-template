import type { WorkspaceStore } from "../../../orpc/ports/workspace-store";

export function createRepository(workspaceStore: WorkspaceStore, workspaceRef: string) {
  return {
    async readSourceMaterials() {
      return await workspaceStore.readSourceMaterials({ workspaceRef });
    },
  };
}
