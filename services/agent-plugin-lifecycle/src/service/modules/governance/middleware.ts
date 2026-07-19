import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";

import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";
import { createResourceExactGitReader } from "./repository/content-workspace";

export const repositories = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
  provided: {
    currentMain: CurrentMainSelectionReader;
  };
}>().middleware<{
  git: ReturnType<typeof createResourceExactGitReader>;
}>(async ({ context, next }) => next({
  git: createResourceExactGitReader({
    contentWorkspace: context.deps.contentWorkspace,
  }),
}));

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
    invocation_command_id: context.invocation.commandId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
