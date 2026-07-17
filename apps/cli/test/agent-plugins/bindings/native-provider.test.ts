import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CODEX_ADAPTER_PROTOCOL,
  createProviderMarketplaceRegistration,
  parseProviderTarget,
  renderCompleteProjection,
  type ProviderId,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  parseContentAuthority,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-lifecycle/release";
import {
  artifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import type {
  ArtifactObjectAddress,
  ArtifactRepositoryIssue,
  ArtifactTreeLocationObservation,
} from "@rawr/resource-agent-plugin-artifact-repository";
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
  createNodeMarketplaceLocationResolver,
  createNodeNativeProviderAdapter,
  createNodeNativeProviderResource,
} from "../../../src/lib/agent-plugins/bindings/providers";
import { productFixture } from "../service-runtime/providers/product-fixture";

const EXECUTABLES = Object.freeze({
  codex: "/opt/rawr/bin/codex",
  claude: "/opt/rawr/bin/claude",
});
const CONTENT_AUTHORITY = contentAuthority("personal-rawr-hq");
const MARKETPLACE_TREE_LIMITS = Object.freeze({
  maxEntries: 200_000,
  maxBytes: 64 * 1024 * 1024,
});
const FIXTURE_PREFIX = "rawr-native-location-";

interface MarketplaceLocationFailureCase {
  readonly name: string;
  readonly observe: (address: ArtifactObjectAddress) => ArtifactTreeLocationObservation;
  readonly expectedMessage: string;
}

const MARKETPLACE_LOCATION_FAILURES: readonly MarketplaceLocationFailureCase[] = Object.freeze([
  Object.freeze({
    name: "a missing tree",
    observe: (address: ArtifactObjectAddress): ArtifactTreeLocationObservation => Object.freeze({
      kind: "Missing",
      address,
    }),
    expectedMessage: "is not materialized",
  }),
  Object.freeze({
    name: "an admitted-tree mismatch",
    observe: (address: ArtifactObjectAddress): ArtifactTreeLocationObservation => Object.freeze({
      kind: "Mismatch",
      address,
      issues: Object.freeze([Object.freeze({
        code: "IdentityChanged",
        detail: "fixture identity changed during admission",
      })] satisfies [ArtifactRepositoryIssue]),
    }),
    expectedMessage: "failed mechanical admission",
  }),
  Object.freeze({
    name: "a thrown locator failure",
    observe: (_: ArtifactObjectAddress): ArtifactTreeLocationObservation => {
      throw new Error("fixture locator failed");
    },
    expectedMessage: "fixture locator failed",
  }),
]);

describe("native provider resource binding", () => {
  let fixtureRoot: string | null = null;

  beforeEach(() => {
    provider.codexAcquire.mockReset();
    provider.claudeAcquire.mockReset();
    provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(codexSession(input)));
    provider.claudeAcquire.mockImplementation((input: NativeProviderSessionInput) =>
      Effect.succeed(claudeSession(input)));
  });

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
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
        contentAuthority: CONTENT_AUTHORITY,
        marketplaceSources: {
          read: async () => {
            throw new Error("unused");
          },
        },
        marketplaceLocations: {
          locate: async () => {
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

  it("locates each semantic marketplace source immediately before forwarding its admitted tree", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), FIXTURE_PREFIX)));
    const source = marketplaceSourceFixture();
    const projectionRoot = path.join(fixtureRoot, "requested-projection-repository");
    const address = Object.freeze({
      repositoryRoot: projectionRoot,
      namespace: Object.freeze(["marketplaces"] as const),
      objectId: source.projectionDigest,
    });
    const providerIssuedAddress = Object.freeze({
      repositoryRoot: path.join(fixtureRoot, "provider-issued-repository"),
      namespace: Object.freeze(["admitted", "opaque"] as const),
      objectId: "provider-issued-location",
    });
    const published = await runNodeArtifactRepository(artifactRepositoryResource.publishTree({
      address: providerIssuedAddress,
      entries: Object.freeze([Object.freeze({
        path: "plugin.json",
        mode: 0o444 as const,
        bytes: new TextEncoder().encode("{}\n"),
      })]),
      limits: MARKETPLACE_TREE_LIMITS,
    }));
    if (!published.ok || published.value.kind !== "Published") {
      throw new Error("Marketplace tree fixture was not published");
    }
    const admitted = await runNodeArtifactRepository(artifactRepositoryResource.locateTree({
      address: providerIssuedAddress,
      limits: MARKETPLACE_TREE_LIMITS,
    }));
    if (!admitted.ok || admitted.value.kind !== "Present") {
      throw new Error("Marketplace tree fixture was not admitted");
    }
    const opaqueLocation = admitted.value.location;

    const events: string[] = [];
    const locateTree = vi.fn(async (
      input: Parameters<typeof artifactRepositoryResource.locateTree>[0],
    ): Promise<ArtifactTreeLocationObservation> => {
      events.push("locate");
      return Object.freeze({ kind: "Present", address: input.address, location: opaqueLocation });
    });
    const locations = createNodeMarketplaceLocationResolver(projectionRoot, { locateTree });
    const codexAdd = vi.fn((_: Parameters<CodexNativeAgentProviderSession["addMarketplace"]>[0]) => {
      events.push("codex-add");
      return Effect.succeed({ stdout: "", stderr: "" });
    });
    const codexSet = vi.fn((_: Parameters<CodexNativeAgentProviderSession["setMarketplaceSource"]>[0]) => {
      events.push("codex-set");
      return Effect.void;
    });
    const claudeAdd = vi.fn((_: Parameters<ClaudeNativeAgentProviderSession["addMarketplace"]>[0]) => {
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

    const resource = createNodeNativeProviderResource(locations);
    const codex = await resource.acquireCodex({ executablePath: EXECUTABLES.codex, home: "/tmp/codex" });
    const claude = await resource.acquireClaude({ executablePath: EXECUTABLES.claude, home: "/tmp/claude" });
    await codex.addMarketplace(source);
    await codex.setMarketplaceSource({ identity: CONTENT_AUTHORITY, source });
    await claude.addMarketplace(source);

    const derivableLocation = path.join(projectionRoot, "marketplaces", source.projectionDigest);
    expect(opaqueLocation).not.toBe(derivableLocation);
    expect(events).toEqual(["locate", "codex-add", "locate", "codex-set", "locate", "claude-add"]);
    expect(locateTree).toHaveBeenCalledTimes(3);
    expect(locateTree).toHaveBeenNthCalledWith(1, { address, limits: MARKETPLACE_TREE_LIMITS });
    expect(locateTree).toHaveBeenNthCalledWith(2, { address, limits: MARKETPLACE_TREE_LIMITS });
    expect(locateTree).toHaveBeenNthCalledWith(3, { address, limits: MARKETPLACE_TREE_LIMITS });
    expect(codexAdd).toHaveBeenCalledWith(opaqueLocation);
    expect(codexSet).toHaveBeenCalledWith({ identity: CONTENT_AUTHORITY, source: opaqueLocation });
    expect(claudeAdd).toHaveBeenCalledWith(opaqueLocation);
  });

  it.each(MARKETPLACE_LOCATION_FAILURES)(
    "does not mutate Codex marketplace state when location admission reports $name",
    async ({ observe, expectedMessage }) => {
      const source = marketplaceSourceFixture();
      const locateTree = vi.fn(async (
        input: Parameters<typeof artifactRepositoryResource.locateTree>[0],
      ): Promise<ArtifactTreeLocationObservation> => observe(input.address));
      const codexAdd = vi.fn((_: Parameters<CodexNativeAgentProviderSession["addMarketplace"]>[0]) =>
        Effect.succeed({ stdout: "", stderr: "" }));
      const codexSet = vi.fn((_: Parameters<CodexNativeAgentProviderSession["setMarketplaceSource"]>[0]) =>
        Effect.void);
      provider.codexAcquire.mockImplementation((input: NativeProviderSessionInput) => Effect.succeed(Object.freeze({
        ...codexSession(input),
        addMarketplace: codexAdd,
        setMarketplaceSource: codexSet,
      })));
      const resource = createNodeNativeProviderResource(
        createNodeMarketplaceLocationResolver("/controller/provider-projections", { locateTree }),
      );
      const codex = await resource.acquireCodex({ executablePath: EXECUTABLES.codex, home: "/tmp/codex" });

      await expect(codex.addMarketplace(source)).rejects.toThrow(expectedMessage);
      await expect(codex.setMarketplaceSource({ identity: CONTENT_AUTHORITY, source })).rejects.toThrow(
        expectedMessage,
      );

      expect(locateTree).toHaveBeenCalledTimes(2);
      expect(codexAdd).not.toHaveBeenCalled();
      expect(codexSet).not.toHaveBeenCalled();
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

function contentAuthority(value: string) {
  const parsed = parseContentAuthority(value);
  if (!parsed.ok) throw new Error(parsed.issues[0].message);
  return parsed.value;
}

function marketplaceSourceFixture() {
  const fixture = productFixture();
  const snapshot: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }> = Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: Object.freeze([
      releaseSnapshot(fixture.alphaRelease),
      releaseSnapshot(fixture.betaRelease),
    ]),
  });
  const projection = mustResult(renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, snapshot));
  const registration = createProviderMarketplaceRegistration({
    provider: "codex",
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => Object.freeze({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
  return Object.freeze({
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function releaseSnapshot(
  release: ReturnType<typeof productFixture>["alphaRelease"],
): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  });
}

function mustResult<T>(
  result: Readonly<{ ok: true; value: T } | { ok: false; issues: readonly { message: string }[] }>,
): T {
  if (!result.ok) throw new Error(result.issues[0]?.message ?? "fixture construction failed");
  return result.value;
}

async function removeOwnedFixture(root: string): Promise<void> {
  const canonicalTemporaryRoot = await realpath(tmpdir());
  if (path.dirname(root) !== canonicalTemporaryRoot || !path.basename(root).startsWith(FIXTURE_PREFIX)) {
    throw new Error(`Refusing to remove non-fixture path: ${root}`);
  }
  const status = await lstat(root);
  if (
    !status.isDirectory()
    || status.isSymbolicLink()
    || await realpath(root) !== root
  ) {
    throw new Error(`Refusing to remove non-canonical fixture directory: ${root}`);
  }
  await rm(root, { recursive: true, force: false });
}
