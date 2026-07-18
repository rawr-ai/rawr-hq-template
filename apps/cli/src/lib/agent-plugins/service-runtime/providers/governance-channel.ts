import {
  createCanonicalChannelReader,
  type CurrentMainChannelResolver,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import {
  createClient,
  type CreateClientOptions,
} from "@rawr/agent-plugin-lifecycle/client";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

import type {
  LifecycleOperation,
} from "../../commands/binding";

type LifecycleDeps = CreateClientOptions["deps"];

export function createGovernanceCanonicalChannelReader(input: Readonly<{
  governance: LifecycleDeps["governance"];
  operation: LifecycleOperation;
  scope: CreateClientOptions["scope"];
}>) {
  const client = createClient({
    deps: governanceOnlyDeps(input.governance),
    scope: input.scope,
    config: {},
  });
  const resolver: CurrentMainChannelResolver = Object.freeze({
    resolve: ({
      workspacePath,
      expectedRepositoryIdentity,
    }: Parameters<CurrentMainChannelResolver["resolve"]>[0]) => client.governance.resolveCurrentMain({
      locator: { workspacePath, expectedRepositoryIdentity },
    }, {
      context: {
        invocation: {
          traceId: `${input.operation}:canonical-channel`,
          commandId: `${input.operation}:canonical-channel`,
        },
      },
    }),
  });
  return createCanonicalChannelReader(resolver);
}

function governanceOnlyDeps(governance: LifecycleDeps["governance"]): LifecycleDeps {
  return Object.freeze({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    get releases(): never { return unavailableDependency("releases"); },
    get vendors(): never { return unavailableDependency("vendors"); },
    get packaging(): never { return unavailableDependency("packaging"); },
    get exports(): never { return unavailableDependency("exports"); },
    get providers(): never { return unavailableDependency("providers"); },
    governance,
  });
}

function unavailableDependency(owner: string): never {
  throw new Error(`Lifecycle ${owner} dependency is unavailable for canonical channel resolution`);
}
