import type { AgentPluginPackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output";
import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import type { CleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/ports/clean-content-workspace";
import { service } from "../../impl";

type Context = {
  readonly source: CleanContentWorkspaceReader;
  readonly packageOutput: AgentPluginPackageOutputAsyncPort;
};

const providePackagingCapabilities = service.packaging.middleware<Context, unknown>(
  async ({ context, next }) =>
    next({
      context: {
        source: createCleanContentWorkspaceReader({
          contentWorkspace: context.deps.contentWorkspace,
        }),
        packageOutput: context.deps.packageOutput,
      },
    })
);

/**
 * Packaging implementer enriched with its ready source and output capabilities.
 *
 * Native oRPC context merging remains additive until the root context boundary
 * can give every module an exact authoring view in one coherent checkpoint.
 */
export const module = service.packaging.use<Context>(providePackagingCapabilities);
