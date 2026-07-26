import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";
import type { SelectedContentResolver } from "../../model/dependencies/providers";
import { createStagedContentWorkspaceObservationReader } from "./model/helpers/staged-content-workspace";

export const repositories = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
  provided: {
    currentMain: CurrentMainSelectionReader;
    selectedContent: SelectedContentResolver;
  };
}>().middleware<{
  releaseSource: ReturnType<typeof createCleanContentWorkspaceReader>;
  stagedReleaseSource: ReturnType<typeof createStagedContentWorkspaceObservationReader>;
}>(async ({ context, next }) =>
  next({
    releaseSource: createCleanContentWorkspaceReader({
      contentWorkspace: context.deps.contentWorkspace,
    }),
    stagedReleaseSource: createStagedContentWorkspaceObservationReader({
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
