import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";
import type { ArtifactStore } from "../../model/dependencies/releases";
import type { MechanicalEvidenceStore } from "../../shared/release";
import { createResourceContentWorkspaceSnapshotReader } from "./repository/content-workspace";
import { createResourceStagedContentWorkspaceObservationReader } from "./repository/staged-content-workspace";

export const repositories = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
  provided: {
    artifactStore: ArtifactStore;
    currentMain: CurrentMainSelectionReader;
    mechanicalEvidenceStore: MechanicalEvidenceStore;
  };
}>().middleware<{
  releaseSource: ReturnType<typeof createResourceContentWorkspaceSnapshotReader>;
  stagedReleaseSource: ReturnType<typeof createResourceStagedContentWorkspaceObservationReader>;
}>(async ({ context, next }) =>
  next({
    releaseSource: createResourceContentWorkspaceSnapshotReader({
      contentWorkspace: context.deps.contentWorkspace,
    }),
    stagedReleaseSource: createResourceStagedContentWorkspaceObservationReader({
      contentWorkspace: context.deps.contentWorkspace,
    }),
  })
);

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    controller_identity: context.scope.controllerIdentity,
    invocation_trace_id: context.invocation.traceId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_controller_identity: context.scope.controllerIdentity,
  }),
});
