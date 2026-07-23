import { describe, expect, it } from "bun:test";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import {
  type ClaudeNativeAgentProviderSession,
  type CodexNativeAgentProviderSession,
  isNativeAgentProviderFailure,
  type NativeAgentProviderFailure,
  NativeAgentProviderFailureSchema,
  NativeMarketplaceSourceSchema,
  NativeProviderCapabilitiesSchema,
  NativeProviderInventorySchema,
  NativeProviderMarketplaceIdentityInputSchema,
  NativeProviderPluginFilesReadInputSchema,
  NativeProviderPluginSelectorInputSchema,
  NativeProviderSessionInputSchema,
} from "../contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

export type NativeProviderFailureComesFromTypeBox = Expect<
  Equal<NativeAgentProviderFailure, Static<typeof NativeAgentProviderFailureSchema>>
>;

const commandFailure: NativeAgentProviderFailure = Object.freeze({
  _tag: "NativeAgentProviderFailure",
  provider: "codex",
  operation: "plugin-install",
  reason: "CommandFailed",
  commandPhase: "command-returned",
  detail: "Provider command exited 1",
});

describe("native agent provider contract", () => {
  it("derives the complete failure shape from TypeBox", () => {
    expect(isNativeAgentProviderFailure(commandFailure)).toBe(true);
    for (const candidate of [
      { ...commandFailure, provider: "other" },
      { ...commandFailure, operation: "config-write" },
      { ...commandFailure, reason: "Unknown" },
      { ...commandFailure, commandPhase: "maybe-started" },
      { ...commandFailure, retryable: true },
    ]) {
      expect(isNativeAgentProviderFailure(candidate)).toBe(false);
    }
  });

  it("admits only exact Git or local marketplace sources", () => {
    expect(
      Value.Check(NativeMarketplaceSourceSchema, {
        kind: "git",
        repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
        revision: "0123456789abcdef",
        sparsePaths: [".codex-plugin", "plugins/agents"],
      })
    ).toBe(true);
    expect(
      Value.Check(NativeMarketplaceSourceSchema, {
        kind: "local",
        root: "/tmp/provider-marketplace",
      })
    ).toBe(true);
    expect(
      Value.Check(NativeMarketplaceSourceSchema, {
        kind: "git",
        repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
        revision: "0123456789abcdef",
        sparsePaths: ["plugins/agents", ".codex-plugin"],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeMarketplaceSourceSchema, {
        kind: "git",
        repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
        revision: "main",
        sparsePaths: [],
        fallbackRoot: "/tmp/marketplace",
      })
    ).toBe(false);
    expect(
      Value.Check(NativeMarketplaceSourceSchema, {
        kind: "git",
        repositoryUrl: "ssh://git@github.com/rawr-ai/rawr-hq.git",
        revision: "v2026.2.8",
        sparsePaths: [],
      })
    ).toBe(false);
  });

  it("owns session coordinates and provider capability discrimination in TypeBox", () => {
    expect(
      Value.Check(NativeProviderSessionInputSchema, {
        executablePath: "/opt/rawr/bin/codex",
        home: "/tmp/codex-home",
      })
    ).toBe(true);
    for (const input of [
      { executablePath: "codex", home: "/tmp/codex-home" },
      { executablePath: "/opt/rawr/bin/codex", home: "." },
      { executablePath: "/opt/rawr/bin/codex", home: "/" },
      { executablePath: "/opt/rawr/../bin/codex", home: "/tmp/codex-home" },
    ]) {
      expect(Value.Check(NativeProviderSessionInputSchema, input)).toBe(false);
    }

    expect(
      Value.Check(NativeProviderCapabilitiesSchema, {
        provider: "codex",
        executablePath: "/opt/rawr/bin/codex",
        home: "/tmp/codex-home",
        version: "1.0.0",
        capabilities: ["marketplace-list", "plugin-enable"],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderCapabilitiesSchema, {
        provider: "claude",
        executablePath: "/opt/rawr/bin/claude",
        home: "/tmp/claude-home",
        version: "1.0.0",
        capabilities: ["marketplace-list", "plugin-list"],
      })
    ).toBe(false);
  });

  it("keeps normalized inventory free of raw provider JSON", () => {
    const inventory = {
      provider: "claude",
      marketplaces: [
        {
          identity: "rawr-hq",
          source: {
            kind: "git",
            repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
            revision: "agent-plugins-current-main",
          },
          installedRoot: "/tmp/native-marketplace",
        },
      ],
      plugins: [
        {
          selector: "cognition@rawr-hq",
          marketplaceIdentity: "rawr-hq",
          name: "cognition",
          installed: true,
          enabled: true,
          version: "1.0.0",
          root: "/tmp/native-plugin",
        },
      ],
    };
    expect(Value.Check(NativeProviderInventorySchema, inventory)).toBe(true);
    expect(
      Value.Check(NativeProviderInventorySchema, {
        ...inventory,
        raw: { providerPayload: true },
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderInventorySchema, {
        ...inventory,
        marketplaces: [inventory.marketplaces[0], inventory.marketplaces[0]],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderInventorySchema, {
        ...inventory,
        plugins: [inventory.plugins[0], inventory.plugins[0]],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderInventorySchema, {
        ...inventory,
        marketplaces: [
          { ...inventory.marketplaces[0], identity: "z-marketplace" },
          inventory.marketplaces[0],
        ],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderInventorySchema, {
        ...inventory,
        plugins: [
          { ...inventory.plugins[0], selector: "docs@rawr-hq", name: "docs" },
          inventory.plugins[0],
        ],
      })
    ).toBe(false);
  });

  it("bounds one canonical point-addressed plugin file batch", () => {
    expect(
      Value.Check(NativeProviderPluginFilesReadInputSchema, {
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: ".codex-plugin/plugin.json", maxBytes: 0 },
          { relativePath: "skills/state-machine-design/SKILL.md", maxBytes: 1_024 },
        ],
      })
    ).toBe(true);
    expect(
      Value.Check(NativeProviderPluginFilesReadInputSchema, {
        selector: "cognition@rawr-hq",
        files: [{ relativePath: "../settings.json", maxBytes: 1 }],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderPluginFilesReadInputSchema, {
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: "a", maxBytes: 0 },
          { relativePath: "b", maxBytes: 32 * 1_024 * 1_024 },
          { relativePath: "c", maxBytes: 32 * 1_024 * 1_024 },
        ],
      })
    ).toBe(true);
    expect(
      Value.Check(NativeProviderPluginFilesReadInputSchema, {
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: "skills/a/SKILL.md", maxBytes: 1 },
          { relativePath: "skills/a/SKILL.md", maxBytes: 1 },
        ],
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderPluginFilesReadInputSchema, {
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: "a", maxBytes: 32 * 1_024 * 1_024 },
          { relativePath: "b", maxBytes: 32 * 1_024 * 1_024 },
          { relativePath: "c", maxBytes: 1 },
        ],
      })
    ).toBe(false);
  });

  it("closes native mutation inputs before command construction", () => {
    expect(
      Value.Check(NativeProviderMarketplaceIdentityInputSchema, {
        identity: "rawr-hq",
        force: true,
      })
    ).toBe(false);
    expect(
      Value.Check(NativeProviderPluginSelectorInputSchema, {
        selector: "cognition@rawr-hq",
        scope: "project",
      })
    ).toBe(false);
  });

  it("exposes no app-server, configuration, or generic command methods", () => {
    const forbidden = new Set([
      "inspectAppServer",
      "readConfiguration",
      "setMarketplaceSource",
      "setPluginEnabled",
      "run",
    ]);
    const codexMethods: Readonly<Record<keyof CodexNativeAgentProviderSession, true>> = {
      provider: true,
      executablePath: true,
      home: true,
      probe: true,
      inventory: true,
      readPluginFiles: true,
      addMarketplace: true,
      removeMarketplace: true,
      installPlugin: true,
      removePlugin: true,
    };
    const claudeMethods: Readonly<Record<keyof ClaudeNativeAgentProviderSession, true>> = {
      ...codexMethods,
      enablePlugin: true,
    };
    expect([...forbidden].some((name) => name in codexMethods)).toBe(false);
    expect([...forbidden].some((name) => name in claudeMethods)).toBe(false);
  });
});
