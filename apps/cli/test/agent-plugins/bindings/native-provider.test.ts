import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseProviderTarget,
  type ProviderId,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  parseContentAuthority,
} from "@rawr/agent-plugin-lifecycle/release";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeProviderSessionInput,
} from "@rawr/resource-native-agent-provider";

const provider = vi.hoisted(() => ({
  codexAcquire: vi.fn(),
  claudeAcquire: vi.fn(),
}));

vi.mock("@rawr/resource-native-agent-provider/providers/codex-effect-platform-node", () => ({
  codexEffectPlatformNodeProvider: Object.freeze({ acquire: provider.codexAcquire }),
}));
vi.mock("@rawr/resource-native-agent-provider/providers/claude-effect-platform-node", () => ({
  claudeEffectPlatformNodeProvider: Object.freeze({ acquire: provider.claudeAcquire }),
}));

import {
  createNodeNativeProviderAdapter,
} from "../../../src/lib/agent-plugins/bindings/providers";

const EXECUTABLES = Object.freeze({
  codex: "/opt/rawr/bin/codex",
  claude: "/opt/rawr/bin/claude",
});
const CONTENT_AUTHORITY = contentAuthority("personal-rawr-hq");

describe("native provider resource binding", () => {
  beforeEach(() => {
    provider.codexAcquire.mockReset();
    provider.claudeAcquire.mockReset();
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(codexSession(input)));
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(claudeSession(input)));
  });

  it.each(["codex", "claude"] as const)(
    "selects only the explicit %s Effect provider without interpreting lifecycle state",
    async (providerId) => {
      const home = `/tmp/rawr-native-binding-${providerId}`;
      const target = parseProviderTarget({ provider: providerId, home });
      if (!target.ok) throw new Error(target.issues[0].message);
      const adapter = createNodeNativeProviderAdapter({
        provider: providerId,
        executablePath: EXECUTABLES[providerId],
        marketplaceSourceRoot: "/tmp/rawr-native-binding-marketplaces",
        contentAuthority: CONTENT_AUTHORITY,
        marketplaceSources: {
          read: async () => {
            throw new Error("unused");
          },
        },
        projectionSources: {
          read: async () => {
            throw new Error("unused");
          },
        },
      });

      const observed = await adapter.inspectCapabilities(target.value);

      expect(observed.ok).toBe(true);
      expect(provider.codexAcquire).toHaveBeenCalledTimes(providerId === "codex" ? 1 : 0);
      expect(provider.claudeAcquire).toHaveBeenCalledTimes(providerId === "claude" ? 1 : 0);
      const selected = providerId === "codex" ? provider.codexAcquire : provider.claudeAcquire;
      expect(selected).toHaveBeenCalledWith({ executablePath: EXECUTABLES[providerId], home });
    },
  );
});

function commonSession(input: NativeProviderSessionInput, providerId: ProviderId) {
  return {
    provider: providerId,
    executablePath: input.executablePath,
    home: input.home,
    probe: () => Effect.succeed({
      provider: providerId,
      executablePath: input.executablePath,
      home: input.home,
      pluginCommands: providerId === "codex"
        ? ["add", "list", "remove"]
        : ["disable", "enable", "install", "list", "uninstall"],
      marketplaceCommands: ["add", "list", "remove"],
      appServerMethods: providerId === "codex" ? ["plugin/list"] : [],
    }),
    listMarketplaces: () => Effect.succeed({ stdout: "", stderr: "", json: [] }),
    addMarketplace: () => Effect.succeed({ stdout: "", stderr: "" }),
    removeMarketplace: () => Effect.succeed({ stdout: "", stderr: "" }),
    listPlugins: () => Effect.succeed({ stdout: "", stderr: "", json: { installed: [] } }),
    readPackage: () => Effect.succeed({ root: input.home, entries: [] }),
  };
}

function codexSession(input: NativeProviderSessionInput): CodexNativeAgentProviderSession {
  return Object.freeze({
    ...commonSession(input, "codex"),
    provider: "codex",
    addPlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    removePlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    inspectAppServer: () => Effect.succeed({ plugins: { marketplaces: [] }, hooks: { hooks: [] } }),
    readConfiguration: () => Effect.succeed({ config: {} }),
    setMarketplaceSource: () => Effect.void,
    setPluginEnabled: () => Effect.void,
  });
}

function claudeSession(input: NativeProviderSessionInput): ClaudeNativeAgentProviderSession {
  return Object.freeze({
    ...commonSession(input, "claude"),
    provider: "claude",
    installPlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    enablePlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    disablePlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    uninstallPlugin: () => Effect.succeed({ stdout: "", stderr: "" }),
    readConfiguration: () => Effect.succeed(null),
  });
}

function contentAuthority(value: string) {
  const parsed = parseContentAuthority(value);
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  return parsed.value;
}
