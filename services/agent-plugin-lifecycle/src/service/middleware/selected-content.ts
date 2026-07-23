import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";

import { createServiceProvider } from "../base";
import type { CurrentMainSelectionReader } from "../model/dependencies/current-main";
import type { SelectedContentResolver } from "../model/dependencies/providers";
import { createResourceSelectedContentResolver } from "../modules/releases/repository/selected-content";

/** Composes the release-owned exact-content reader for provider procedures. */
export const selectedContent = createServiceProvider<{
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
  };
  provided: {
    currentMain: CurrentMainSelectionReader;
  };
}>().middleware<{
  selectedContent: SelectedContentResolver;
}>(async ({ context, next }) =>
  next({
    selectedContent: createResourceSelectedContentResolver({
      contentWorkspace: context.deps.contentWorkspace,
    }),
  })
);
