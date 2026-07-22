import { createClient, type Client, type CreateClientOptions } from "@rawr/hyperresearch-codex";
import type { HyperresearchCliBackend } from "@rawr/hyperresearch-codex/resources";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  bindService,
  type ProcessView,
  type RoleView,
  type ServiceBinding,
  type ServiceBindingContext,
} from "@rawr/hq-sdk/plugins";
import { FixtureHyperresearchCliBackend } from "./fixture-cli";
import { NodeHyperresearchCliBackend } from "./hyperresearch-codex-resources/cli";
import { createNodeHyperresearchIO } from "./hyperresearch-codex-resources/io";

type HyperresearchProcess = ProcessView & {
  processId: "plugin-hyperresearch";
  repoRoot: string;
  cli?: HyperresearchCliBackend;
};

type HyperresearchRole = RoleView & {
  roleId: "hyperresearch-codex";
  capability: "hyperresearch";
};

type BindingContext = ServiceBindingContext<HyperresearchProcess, HyperresearchRole>;

const hyperresearchCodexService = bindService(createClient, {
  bindingId: "plugin-hyperresearch/hyperresearch-codex",
  deps: (context: BindingContext) => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    io: createNodeHyperresearchIO(),
    cli: context.process.cli ?? new NodeHyperresearchCliBackend(),
  }),
  scope: (context: BindingContext) => ({
    repoRoot: context.process.repoRoot,
  }),
  config: {},
} satisfies ServiceBinding<CreateClientOptions, HyperresearchProcess, HyperresearchRole>);

export function createHyperresearchCodexClient(input: {
  repoRoot: string;
  cli?: HyperresearchCliBackend;
}): Client {
  return hyperresearchCodexService.resolve({
    process: {
      processId: "plugin-hyperresearch",
      repoRoot: input.repoRoot,
      cli: input.cli,
    },
    role: {
      roleId: "hyperresearch-codex",
      capability: "hyperresearch",
    },
  });
}

export function createHyperresearchCodexClientForBackend(input: {
  repoRoot: string;
  backend: "fixture" | "real";
}): Client {
  return createHyperresearchCodexClient({
    repoRoot: input.repoRoot,
    cli:
      input.backend === "fixture"
        ? new FixtureHyperresearchCliBackend()
        : new NodeHyperresearchCliBackend(),
  });
}
