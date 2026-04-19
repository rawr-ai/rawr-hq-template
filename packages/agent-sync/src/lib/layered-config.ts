import { createClient } from "@rawr/hq-ops";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

import { findWorkspaceRoot } from "./workspace";

export type LayeredRawrConfig = {
  config: HqOpsLayeredConfig;
  globalPath: string | null;
  workspacePath: string | null;
};

function createHqOpsClient(repoRoot: string) {
  return createClient({
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      repoRoot,
    },
    config: {},
  });
}

type HqOpsLayeredConfig = Awaited<
  ReturnType<ReturnType<typeof createHqOpsClient>["config"]["getLayeredConfig"]>
>["merged"];

function invocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export async function loadLayeredRawrConfigForCwd(cwd: string): Promise<LayeredRawrConfig> {
  const client = createHqOpsClient(cwd);
  const global = await client.config.getGlobalConfig({}, invocation("agent-sync.config.global"));
  if (global.error) {
    throw new Error(
      `${global.error.message}${global.error.cause ? `\n${global.error.cause}` : ""}`,
    );
  }

  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    return { config: global.config, globalPath: global.path, workspacePath: null };
  }

  const layered = await createHqOpsClient(workspaceRoot).config.getLayeredConfig(
    {},
    invocation("agent-sync.config.layered"),
  );

  if (layered.workspace.error) {
    throw new Error(
      `${layered.workspace.error.message}${layered.workspace.error.cause ? `\n${layered.workspace.error.cause}` : ""}`,
    );
  }

  return { config: layered.merged, globalPath: layered.global.path, workspacePath: layered.workspace.path };
}
