import type { WorkspaceStore, WorkspaceArtifactBundle } from "../../shared/workspace-store";

export function createRepository(workspaceStore: WorkspaceStore, workspaceRef: string) {
  return {
    async readSourceMaterials() {
      return await workspaceStore.readSourceMaterials({ workspaceRef });
    },
    async writeArtifacts(bundle: WorkspaceArtifactBundle) {
      return await workspaceStore.writeArtifactBundle({
        workspaceRef,
        bundle,
      });
    },
  };
}
