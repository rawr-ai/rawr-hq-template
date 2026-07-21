import path from "node:path";

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ArtifactObjectAddress,
  ArtifactTreeLocation,
} from "@rawr/resource-agent-plugin-artifact-repository";
import {
  artifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeProviderCapabilityProbe,
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

import { createNodeNativeProviderResource } from "../../../src/lib/agent-plugins/bindings/providers";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "../service-runtime/releases/owned-fixture-root";

const EXECUTABLES = Object.freeze({
  codex: "/opt/rawr/bin/codex",
  claude: "/opt/rawr/bin/claude",
});
type ProviderId = NativeProviderCapabilityProbe["provider"];
const PROVIDER_IDS = Object.freeze([
  "codex",
  "claude",
] satisfies readonly NativeProviderCapabilityProbe["provider"][]);
const MARKETPLACE_TREE_LIMITS = Object.freeze({ maxEntries: 4, maxBytes: 1024 });

describe("native provider resource binding", () => {
  let fixture: OwnedFixtureRoot | undefined;

  beforeEach(() => {
    provider.codexAcquire.mockReset();
    provider.claudeAcquire.mockReset();
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(codexSession(input)));
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(claudeSession(input)));
  });

  afterEach(async () => {
    if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
    fixture = undefined;
  });

  it.each(PROVIDER_IDS)(
    "selects only the explicit %s Effect provider",
    async (providerId) => {
      const home = `/tmp/rawr-native-binding-${providerId}`;
      const resource = createNodeNativeProviderResource();
      const session = providerId === "codex"
        ? await resource.acquireCodex({ executablePath: EXECUTABLES[providerId], home })
        : await resource.acquireClaude({ executablePath: EXECUTABLES[providerId], home });

      const observed = await session.probe();

      expect(observed.provider).toBe(providerId);
      expect(provider.codexAcquire).toHaveBeenCalledTimes(providerId === "codex" ? 1 : 0);
      expect(provider.claudeAcquire).toHaveBeenCalledTimes(providerId === "claude" ? 1 : 0);
      const selected = providerId === "codex" ? provider.codexAcquire : provider.claudeAcquire;
      expect(selected).toHaveBeenCalledWith({ executablePath: EXECUTABLES[providerId], home });
    },
  );

  it("preserves the resource-owned provider failure across the Effect runtime edge", async () => {
    const conflict: NativeAgentProviderFailure = Object.freeze({
      _tag: "NativeAgentProviderFailure",
      provider: "codex",
      operation: "acquire",
      reason: "OwnershipConflict",
      path: "/tmp/codex/.rawr-agent-plugin-owner.json",
      detail: "Provider ownership slot is occupied",
    });
    provider.codexAcquire.mockReturnValue(Effect.fail(conflict));
    const resource = createNodeNativeProviderResource();

    const acquired = resource.acquireCodex({
      executablePath: EXECUTABLES.codex,
      home: "/tmp/codex",
    });
    await expect(acquired).rejects.toBe(conflict);
  });

  it("passes provider-issued marketplace locations through unchanged", async () => {
    fixture = await createOwnedFixtureRoot();
    const location = await publishMarketplace(fixture.path);
    const events: string[] = [];
    const codexAdd = vi.fn((_: ArtifactTreeLocation) => {
      events.push("codex-add");
      return Effect.succeed({ stdout: "", stderr: "" });
    });
    const codexSet = vi.fn((_: Readonly<{ identity: string; source: ArtifactTreeLocation }>) => {
      events.push("codex-set");
      return Effect.void;
    });
    const claudeAdd = vi.fn((_: ArtifactTreeLocation) => {
      events.push("claude-add");
      return Effect.succeed({ stdout: "", stderr: "" });
    });
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) => Effect.succeed(Object.freeze({
      ...codexSession(input),
      addMarketplace: codexAdd,
      setMarketplaceSource: codexSet,
    })));
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) => Effect.succeed(Object.freeze({
      ...claudeSession(input),
      addMarketplace: claudeAdd,
    })));

    const resource = createNodeNativeProviderResource();
    const codex = await resource.acquireCodex({ executablePath: EXECUTABLES.codex, home: "/tmp/codex" });
    const claude = await resource.acquireClaude({ executablePath: EXECUTABLES.claude, home: "/tmp/claude" });
    await codex.addMarketplace(location);
    await codex.setMarketplaceSource({ identity: "rawr-hq", source: location });
    await claude.addMarketplace(location);

    expect(events).toEqual(["codex-add", "codex-set", "claude-add"]);
    expect(codexAdd).toHaveBeenCalledWith(location);
    expect(codexSet).toHaveBeenCalledWith({ identity: "rawr-hq", source: location });
    expect(claudeAdd).toHaveBeenCalledWith(location);
  });
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
    readMarketplace: () => Effect.succeed({ entries: [] }),
    removeMarketplace: () => Effect.succeed({ stdout: "", stderr: "" }),
    listPlugins: () => Effect.succeed({ stdout: "", stderr: "", json: { installed: [] } }),
    readPlugin: () => Effect.succeed({ entries: [] }),
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

async function publishMarketplace(root: string): Promise<ArtifactTreeLocation> {
  const address: ArtifactObjectAddress = Object.freeze({
    repositoryRoot: path.join(root, "artifacts"),
    namespace: Object.freeze(["marketplaces"] satisfies [string]),
    objectId: "provider-issued-location",
  });
  const published = await runNodeArtifactRepository(artifactRepositoryResource.publishTree({
    address,
    entries: Object.freeze([Object.freeze({
      path: "plugin.json",
      mode: 0o444,
      bytes: new TextEncoder().encode("{}\n"),
    })]),
    limits: MARKETPLACE_TREE_LIMITS,
  }));
  if (!published.ok || published.value.kind !== "Published") {
    throw new Error("Marketplace tree fixture was not published");
  }
  const located = await runNodeArtifactRepository(artifactRepositoryResource.locateTree({
    address,
    limits: MARKETPLACE_TREE_LIMITS,
  }));
  if (!located.ok || located.value.kind !== "Present") {
    throw new Error("Marketplace tree fixture was not admitted");
  }
  return located.value.location;
}
