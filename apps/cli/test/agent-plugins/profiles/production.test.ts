import { describe, expect, it, vi } from "vitest";

const selected = vi.hoisted(() => ({
  logger: vi.fn(),
  analytics: vi.fn(),
  contentWorkspace: vi.fn(),
  packageOutput: vi.fn(),
  codex: vi.fn(),
  claude: vi.fn(),
  versionedContent: vi.fn(),
}));

vi.mock("@habitat-ai/rawr-hq-sdk/host-adapters/logger/embedded-placeholder", () => ({
  createEmbeddedPlaceholderLoggerAdapter: selected.logger,
}));
vi.mock("@habitat-ai/rawr-hq-sdk/host-adapters/analytics/embedded-placeholder", () => ({
  createEmbeddedPlaceholderAnalyticsAdapter: selected.analytics,
}));
vi.mock("@habitat-ai/rawr-resource-content-workspace/providers/git-effect-platform-node", () => ({
  makeNodeContentWorkspaceResource: selected.contentWorkspace,
}));
vi.mock(
  "@habitat-ai/rawr-resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node",
  () => ({
    makeNodeAgentPluginPackageOutputResource: selected.packageOutput,
  })
);
vi.mock(
  "@habitat-ai/rawr-resource-native-agent-provider/providers/codex-effect-platform-node",
  () => ({
    makeNodeCodexNativeAgentProviderResource: selected.codex,
  })
);
vi.mock(
  "@habitat-ai/rawr-resource-native-agent-provider/providers/claude-effect-platform-node",
  () => ({
    makeNodeClaudeNativeAgentProviderResource: selected.claude,
  })
);
vi.mock("@habitat-ai/rawr-resource-versioned-content/providers/git-effect-platform-node", () => ({
  makeNodeVersionedContentResource: selected.versionedContent,
}));

import { productionLifecycleProfile } from "../../../src/lib/agent-plugins/profiles/production";
import { bindProductionLifecycleService } from "../../../src/lib/agent-plugins/service-runtime/client";

describe.sequential("production lifecycle profile", () => {
  it("imports as cold factory references", () => {
    expect(Object.isFrozen(productionLifecycleProfile)).toBe(true);
    expect(Object.isFrozen(productionLifecycleProfile.nativeProviders)).toBe(true);
    for (const factory of Object.values(selected)) expect(factory).not.toHaveBeenCalled();
  });

  it("materializes every selected provider once for one local service binding", () => {
    const createClock = vi.fn(() => Object.freeze({ now: () => new Date() }));
    const values = {
      logger: Object.freeze({ log: vi.fn() }),
      analytics: Object.freeze({ capture: vi.fn() }),
      contentWorkspace: Object.freeze({}),
      packageOutput: Object.freeze({}),
      codex: Object.freeze({}),
      claude: Object.freeze({}),
      versionedContent: Object.freeze({}),
    };
    for (const [name, factory] of Object.entries(selected)) {
      factory.mockReturnValue(values[name as keyof typeof values]);
    }

    const client = bindProductionLifecycleService(
      Object.freeze({ ...productionLifecycleProfile, createClock })
    );
    const releaseClient = client("releases.check");
    const providerClient = client("providers.status");

    expect(Reflect.ownKeys(releaseClient)).toEqual(["releases"]);
    expect(Reflect.ownKeys(providerClient)).toEqual(["providers"]);
    for (const factory of Object.values(selected)) expect(factory).toHaveBeenCalledTimes(1);
    expect(createClock).toHaveBeenCalledOnce();
  });
});
