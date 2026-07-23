import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";
import type { SelectedContentResolver } from "../../model/dependencies/providers";
import { createResourceContentWorkspaceSnapshotReader } from "./repository/content-workspace";
import { createResourceStagedContentWorkspaceObservationReader } from "./repository/staged-content-workspace";

export const repositories = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
  provided: {
    currentMain: CurrentMainSelectionReader;
    selectedContent: SelectedContentResolver;
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
    invocation_trace_id: context.invocation.traceId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
  }),
});
