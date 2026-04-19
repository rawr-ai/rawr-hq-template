import type { WorkspaceStore, WorkspaceArtifactBundle } from "../../../orpc/ports/workspace-store";
import { SOURCE_MATERIAL_DIRECTORIES } from "../../../shared/layout";

export function createRepository(workspaceStore: WorkspaceStore, workspaceRef: string) {
  return {
    async readSourceMaterials() {
      return await workspaceStore.readSourceMaterials({
        workspaceRef,
        sourceDirectories: SOURCE_MATERIAL_DIRECTORIES,
      });
    },
    async writeArtifacts(bundle: WorkspaceArtifactBundle) {
      return await workspaceStore.writeArtifactBundle({
        workspaceRef,
        bundle,
      });
    },
  };
}
