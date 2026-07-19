import { describe, expect, it } from "vitest";

import {
  createProviderMarketplaceRegistration,
  parseProviderTarget,
  renderCompleteProjection,
  type AgentProviderProjection,
  type ProviderMarketplaceRegistration,
} from "../../../src/bindings/providers";
import { canonicalBytes } from "../../../src/service/modules/providers/model/helpers/canonical";
import {
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import {
  SOURCE,
  must,
  productFixture,
  releaseInputBody,
} from "../../shared/release/fixtures";
import {
  CODEX_ADAPTER_PROTOCOL,
} from "../../../src/bindings/providers/codex";
import {
  CLAUDE_ADAPTER_PROTOCOL,
} from "../../../src/bindings/providers/claude";
import {
  claudeCapabilitiesFromCommands,
} from "../../../src/bindings/providers/resource-claude";
import {
  codexCapabilitiesFromCommands,
  createResourceCodexProviderAdapter,
} from "../../../src/bindings/providers/resource-codex";
import type {
  CodexNativeResourceSession,
  NativeResourceMarketplaceReadInput,
  NativeResourcePackageEntry,
  NativeResourcePluginReadInput,
  NativeResourceSessionInput,
} from "../../../src/bindings/providers/resource-port";
import {
  inspectMarketplaceSource,
} from "../../../src/bindings/providers/resource-marketplace";
import {
  inspectNativePluginPackage,
} from "../../../src/bindings/providers/resource-package";
import {
  createSessionCache,
} from "../../../src/bindings/providers/resource-shared";

const EXPECTED_CAPABILITIES = Object.freeze([
  "native-plugin-enable",
  "native-plugin-install",
  "native-plugin-retire",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
]);

describe("native provider resource interpretation", () => {
  it("derives service capabilities from raw provider command observations", () => {
    expect(codexCapabilitiesFromCommands(
      ["add", "list", "remove"],
      ["add", "list", "remove"],
    )).toEqual(EXPECTED_CAPABILITIES);
    expect(claudeCapabilitiesFromCommands(
      ["disable", "enable", "install", "list", "uninstall"],
      ["add", "list", "remove"],
    )).toEqual(EXPECTED_CAPABILITIES);
    expect(codexCapabilitiesFromCommands(
      ["add", "list"],
      ["add", "list"],
    )).not.toContain("native-plugin-retire");
  });

  it.each([
    ["codex", CODEX_ADAPTER_PROTOCOL],
    ["claude", CLAUDE_ADAPTER_PROTOCOL],
  ] as const)("decodes exact %s package and marketplace semantics from raw bytes", (provider, protocol) => {
    const fixture = productFixture();
    const rendered = renderCompleteProjection(provider, protocol, {
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      releaseSet: fixture.releaseSet,
      members: [snapshot(fixture.alphaRelease), snapshot(fixture.betaRelease)],
    });
    if (!rendered.ok) throw new Error(rendered.issues[0].message);
    const registration = marketplaceRegistration(rendered.value);
    const alpha = rendered.value.members[0];
    if (alpha === undefined) throw new Error("Native projection fixture has no alpha member");

    const inspected = inspectNativePluginPackage({
      entries: alpha.files.map((file) => ({
        path: file.path,
        mode: file.mode,
        bytes: new Uint8Array(file.bytes),
      })),
    }, provider);
    expect(inspected).toMatchObject({
      pluginId: alpha.pluginId,
      nativeIdentity: alpha.nativeIdentity,
      artifactAuthority: alpha.artifactAuthority,
      providerSourceIdentity: alpha.providerSourceIdentity,
      memberFingerprint: alpha.memberFingerprint,
      visibleSkills: alpha.visible.skills,
      visibleHooks: alpha.visible.hooks,
    });

    const metadata = canonicalBytes({
      protocol: "agent-provider-marketplace-source@v1",
      provider,
      marketplaceIdentity: registration.marketplaceIdentity,
      projectionDigest: registration.projectionDigest,
      sourceDigest: registration.sourceDigest,
      members: registration.members.map((member) => ({
        pluginId: member.pluginId,
        nativeIdentity: member.nativeIdentity,
        providerSourceIdentity: member.providerSourceIdentity,
        sourceProjectionDigest: member.sourceProjectionDigest,
        memberFingerprint: member.memberFingerprint,
      })),
    });
    expect(inspectMarketplaceSource({
      observation: {
        entries: [{ path: ".rawr/marketplace.json", mode: 0o644, bytes: metadata }],
      },
      provider,
      adapterProtocol: protocol,
    })).toEqual(registration);
  });

  it("fails closed when raw package bytes no longer bind the projected fingerprint", () => {
    const fixture = productFixture();
    const rendered = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      releaseSet: fixture.releaseSet,
      members: [snapshot(fixture.alphaRelease), snapshot(fixture.betaRelease)],
    });
    if (!rendered.ok) throw new Error(rendered.issues[0].message);
    const alpha = rendered.value.members[0];
    if (alpha === undefined) throw new Error("Native projection fixture has no alpha member");
    const entries = alpha.files.map((file) => ({
      path: file.path,
      mode: file.mode,
      bytes: file.path.endsWith("SKILL.md")
        ? new TextEncoder().encode("substituted\n")
        : new Uint8Array(file.bytes),
    }));

    expect(inspectNativePluginPackage({ entries }, "codex")
      .memberFingerprint).not.toBe(alpha.memberFingerprint);
  });

  it("retries resource acquisition after a failed session instead of caching the failure", async () => {
    let attempts = 0;
    const acquire = createSessionCache("/opt/rawr/bin/codex", async ({ home }) => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient acquisition failure");
      return Object.freeze({ home });
    });

    await expect(acquire("/tmp/rawr-native-provider-home")).rejects.toThrow("transient acquisition failure");
    await expect(acquire("/tmp/rawr-native-provider-home")).resolves.toEqual({
      home: "/tmp/rawr-native-provider-home",
    });
    expect(attempts).toBe(2);
  });

  it("does not claim a packaged hook when Codex hooks/list omits it", async () => {
    const verified = await verifyCodexHookVisibility(Object.freeze([]));

    expect(verified.ok).toBe(false);
    if (verified.ok) throw new Error("Expected omitted provider hook visibility to fail");
    expect(verified.issues[0]).toMatchObject({
      code: "VISIBILITY_FAILED",
      path: "target.members.alpha",
    });
  });

  it("maps an enabled Codex plugin hook to its exact managed native identity", async () => {
    const verified = await verifyCodexHookVisibility(Object.freeze([
      Object.freeze({
        key: "alpha-session-start",
        eventName: "sessionStart",
        handlerType: "command",
        matcher: null,
        command: "node hooks/session-start/handler.ts",
        timeoutSec: 10,
        statusMessage: null,
        source: "plugin",
        pluginId: "alpha@personal-rawr-hq",
        displayOrder: 0,
        enabled: true,
        isManaged: false,
        currentHash: "fixture",
        trustStatus: "trusted",
      }),
    ]));

    expect(verified.ok).toBe(true);
  });
});

async function verifyCodexHookVisibility(hooks: readonly Record<string, unknown>[]) {
  const projection = hookedCodexProjection();
  const home = "/tmp/rawr-native-hook-provider";
  const executablePath = "/opt/rawr/bin/codex";
  const registration = marketplaceRegistration(projection);
  const marketplaceEntries = Object.freeze([Object.freeze({
    path: ".rawr/marketplace.json",
    mode: 0o644,
    bytes: marketplaceMetadata(registration),
  })]);
  const packageEntries = new Map<string, readonly NativeResourcePackageEntry[]>();
  const pluginRows = projection.members.map((member) => {
    const version = `0.0.0-rawr.${member.artifactAuthority.sourceCommit.slice(0, 12)}`;
    packageEntries.set(
      `${member.pluginId}@${member.providerSourceIdentity}`,
      member.files.map((file) => Object.freeze({
        path: file.path,
        mode: file.mode,
        bytes: new Uint8Array(file.bytes),
      })),
    );
    return Object.freeze({
      name: member.pluginId,
      marketplaceName: member.providerSourceIdentity,
      version,
      installed: true,
      enabled: true,
    });
  });
  const session = (input: NativeResourceSessionInput): CodexNativeResourceSession => Object.freeze({
    provider: "codex",
    executablePath: input.executablePath,
    home: input.home,
    probe: async () => Object.freeze({
      provider: "codex",
      executablePath: input.executablePath,
      home: input.home,
      pluginCommands: Object.freeze(["add", "list", "remove"]),
      marketplaceCommands: Object.freeze(["add", "list", "remove"]),
      appServerMethods: Object.freeze(["hooks/list", "plugin/list"]),
    }),
    listMarketplaces: async () => Object.freeze({
      stdout: "",
      stderr: "",
      json: { marketplaces: [{ name: registration.marketplaceIdentity }] },
    }),
    readMarketplace: async ({ identity }: NativeResourceMarketplaceReadInput) => {
      if (identity !== registration.marketplaceIdentity) throw new Error(`Unexpected marketplace: ${identity}`);
      return Object.freeze({ entries: marketplaceEntries });
    },
    addMarketplace: async () => undefined,
    removeMarketplace: async () => undefined,
    listPlugins: async () => Object.freeze({
      stdout: "",
      stderr: "",
      json: { installed: pluginRows, available: [] },
    }),
    readPlugin: async ({ selector }: NativeResourcePluginReadInput) => {
      const entries = packageEntries.get(selector);
      if (entries === undefined) throw new Error(`Unexpected package selector: ${selector}`);
      return Object.freeze({ entries });
    },
    addPlugin: async () => undefined,
    removePlugin: async () => undefined,
    inspectAppServer: async () => Object.freeze({
      plugins: {
        marketplaces: [{
          name: registration.marketplaceIdentity,
          plugins: pluginRows,
        }],
      },
      hooks: {
        data: [{ cwd: home, hooks, warnings: [], errors: [] }],
      },
    }),
    readConfiguration: async () => Object.freeze({
      config: {
        plugins: Object.fromEntries(pluginRows.map((plugin) => [
          `${plugin.name}@${plugin.marketplaceName}`,
          { enabled: true },
        ])),
      },
    }),
    setMarketplaceSource: async () => undefined,
  });
  const adapter = createResourceCodexProviderAdapter({
    resource: Object.freeze({
      acquireCodex: async (input: NativeResourceSessionInput) => session(input),
      acquireClaude: async () => {
        throw new Error("unused");
      },
    }),
    executablePath,
    contentAuthority: projection.artifactAuthority.contentAuthority,
    marketplaceSources: {
      read: async () => {
        throw new Error("unused");
      },
    },
  });
  const target = parseProviderTarget({ provider: "codex", home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return await adapter.verifyProjection(target.value, projection);
}

function hookedCodexProjection(): AgentProviderProjection {
  const fixture = productFixture();
  const alphaPayload = must(createAgentPluginPayload([
    { path: "skills/alpha/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("alpha\n") },
    { path: "agents/alpha.md", mode: 0o644, bytes: new TextEncoder().encode("agent alpha\n") },
    { path: "hooks/session-start/handler.ts", mode: 0o644, bytes: new TextEncoder().encode("export {};\n") },
  ]));
  const releaseInput = must(createAgentPluginReleaseInput(releaseInputBody(alphaPayload, fixture.betaPayload)));
  const alphaRelease = must(createAgentPluginRelease({
    releaseInput,
    pluginId: "alpha",
    source: SOURCE,
    payload: alphaPayload,
  }));
  const betaRelease = must(createAgentPluginRelease({
    releaseInput,
    pluginId: "beta",
    source: SOURCE,
    payload: fixture.betaPayload,
  }));
  const releaseSet = must(createAgentPluginReleaseSet({
    releaseInput,
    releases: [alphaRelease, betaRelease],
  }));
  const rendered = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(releaseSet.releaseSetDigest),
    releaseSet,
    members: [snapshot(alphaRelease), snapshot(betaRelease)],
  });
  if (!rendered.ok) throw new Error(rendered.issues[0].message);
  return rendered.value;
}

function marketplaceMetadata(registration: ProviderMarketplaceRegistration): Uint8Array {
  return canonicalBytes({
    protocol: "agent-provider-marketplace-source@v1",
    provider: registration.provider,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
    members: registration.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function marketplaceRegistration(
  projection: Extract<ReturnType<typeof renderCompleteProjection>, { readonly ok: true }>["value"],
): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: projection.provider,
    adapterProtocol: projection.adapterProtocol,
    marketplaceIdentity: projection.marketplace.identity,
    members: projection.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: projection.projectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function snapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}
