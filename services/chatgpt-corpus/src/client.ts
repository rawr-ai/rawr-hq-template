import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";
import type {
  BuildArtifactsResult as BuildArtifactsResultValue,
  MaterializeArtifactsResult as MaterializeArtifactsResultValue,
} from "./service/modules/corpus-artifacts/schemas";
import type { ReadSourceSnapshotResult as ReadSourceSnapshotResultValue } from "./service/modules/source-materials/schemas";
import type {
  InitializeWorkspaceResult as InitializeWorkspaceResultValue,
  WorkspaceTemplateValue as WorkspaceTemplateValueType,
} from "./service/modules/workspace/schemas";
import type {
  WorkspaceArtifactBundle as WorkspaceArtifactBundleValue,
  WorkspaceStore as WorkspaceStoreValue,
} from "./service/shared/workspace-store";

const servicePackage = defineServicePackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateClientOptions = ServicePackageBoundary<typeof router>;
export type WorkspaceStore = WorkspaceStoreValue;
export type WorkspaceArtifactBundle = WorkspaceArtifactBundleValue;
export type WorkspaceTemplate = WorkspaceTemplateValueType;
export type InitializeWorkspaceResult = InitializeWorkspaceResultValue;
export type ReadSourceSnapshotResult = ReadSourceSnapshotResultValue;
export type BuildArtifactsResult = BuildArtifactsResultValue;
export type MaterializeArtifactsResult = MaterializeArtifactsResultValue;

export function createClient(boundary: CreateClientOptions) {
  return servicePackage.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
