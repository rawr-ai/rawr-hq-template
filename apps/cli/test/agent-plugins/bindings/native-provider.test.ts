import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeProviderCapabilities,
  NativeProviderSessionInput,
} from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { createNodeNativeProviderSessionResolver } from "../../../src/lib/agent-plugins/bindings/providers";

const EXECUTABLES = Object.freeze({
  codex: "/opt/rawr/bin/codex",
  claude: "/opt/rawr/bin/claude",
});

describe("native provider session binding", () => {
  beforeEach(() => {
    provider.codexAcquire.mockReset();
    provider.claudeAcquire.mockReset();
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(codexSession(input))
    );
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(claudeSession(input))
    );
  });

  it.each([
    "codex",
    "claude",
  ] as const)("selects only the explicitly bound %s Effect resource", async (providerId) => {
    const home = `/tmp/rawr-native-binding-${providerId}`;
    const resolver = createNodeNativeProviderSessionResolver(EXECUTABLES);
    const session = await resolver.acquire({ provider: providerId, home });

    expect(await session.probe()).toMatchObject({ provider: providerId, home });
    expect(provider.codexAcquire).toHaveBeenCalledTimes(providerId === "codex" ? 1 : 0);
    expect(provider.claudeAcquire).toHaveBeenCalledTimes(providerId === "claude" ? 1 : 0);
    const selected = providerId === "codex" ? provider.codexAcquire : provider.claudeAcquire;
    expect(selected).toHaveBeenCalledWith({ executablePath: EXECUTABLES[providerId], home });
  });

  it("preserves the provider-discriminated Promise surface", async () => {
    const resolver = createNodeNativeProviderSessionResolver(EXECUTABLES);
    const codex = await resolver.acquire({ provider: "codex", home: "/tmp/codex" });
    const claude = await resolver.acquire({ provider: "claude", home: "/tmp/claude" });

    expect("enablePlugin" in codex).toBe(false);
    expect("enablePlugin" in claude).toBe(true);
    if (claude.provider !== "claude") throw new Error("Expected a Claude session");
    await expect(claude.enablePlugin({ selector: "cognition@rawr-hq" })).resolves.toMatchObject({
      provider: "claude",
      operation: "plugin-enable",
    });
  });

  it("preserves resource-owned failures across the Effect runtime edge", async () => {
    const failure: NativeAgentProviderFailure = Object.freeze({
      _tag: "NativeAgentProviderFailure",
      provider: "codex",
      operation: "acquire",
      reason: "Missing",
      commandPhase: "not-started",
      detail: "Codex executable is missing",
    });
    provider.codexAcquire.mockReturnValue(Effect.fail(failure));
    const resolver = createNodeNativeProviderSessionResolver(EXECUTABLES);

    await expect(resolver.acquire({ provider: "codex", home: "/tmp/codex" })).rejects.toBe(failure);
  });

  it("fails closed when the selected provider executable is not bound", async () => {
    const resolver = createNodeNativeProviderSessionResolver({ codex: EXECUTABLES.codex });
    await expect(resolver.acquire({ provider: "claude", home: "/tmp/claude" })).rejects.toThrow(
      "Native claude executable is not bound"
    );
    expect(provider.claudeAcquire).not.toHaveBeenCalled();
  });
});

function codexSession(input: NativeProviderSessionInput): CodexNativeAgentProviderSession {
  const capabilities: NativeProviderCapabilities = {
    provider: "codex",
    executablePath: input.executablePath,
    home: input.home,
    version: "1.0.0",
    capabilities: [
      "marketplace-list",
      "marketplace-add",
      "marketplace-remove",
      "plugin-list",
      "plugin-install",
      "plugin-remove",
    ],
  };
  return Object.freeze({
    ...commonSession(input, "codex"),
    provider: "codex",
    probe: () => Effect.succeed(capabilities),
  });
}

function claudeSession(input: NativeProviderSessionInput): ClaudeNativeAgentProviderSession {
  const capabilities: NativeProviderCapabilities = {
    provider: "claude",
    executablePath: input.executablePath,
    home: input.home,
    version: "1.0.0",
    capabilities: [
      "marketplace-list",
      "marketplace-add",
      "marketplace-remove",
      "marketplace-update",
      "plugin-list",
      "plugin-install",
      "plugin-enable",
      "plugin-disable",
      "plugin-remove",
      "plugin-update",
    ],
  };
  return Object.freeze({
    ...commonSession(input, "claude"),
    provider: "claude",
    probe: () => Effect.succeed(capabilities),
    enablePlugin: () => mutation("claude", "plugin-enable"),
  });
}

function commonSession(input: NativeProviderSessionInput, providerId: "claude" | "codex") {
  return {
    provider: providerId,
    executablePath: input.executablePath,
    home: input.home,
    inventory: () => Effect.succeed({ provider: providerId, marketplaces: [], plugins: [] }),
    readPluginFiles: (request: Readonly<{ selector: string; files: readonly unknown[] }>) =>
      Effect.succeed({ selector: request.selector, files: [] }),
    addMarketplace: () => mutation(providerId, "marketplace-add"),
    removeMarketplace: () => mutation(providerId, "marketplace-remove"),
    installPlugin: () => mutation(providerId, "plugin-install"),
    removePlugin: () => mutation(providerId, "plugin-remove"),
  };
}

function mutation(
  providerId: "claude" | "codex",
  operation:
    | "marketplace-add"
    | "marketplace-remove"
    | "plugin-install"
    | "plugin-enable"
    | "plugin-remove"
) {
  return Effect.succeed({
    provider: providerId,
    operation,
    commandPhase: "command-returned" as const,
  });
}
