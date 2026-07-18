import { describe, expect, it } from "vitest";

import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  parseProviderTarget,
  type AgentProviderProjection,
  type NativeMemberObservation,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
  type ProviderMemberFingerprint,
  type ProviderProjectionMember,
} from "../../../src/bindings/providers";
import {
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import {
  CODEX_ADAPTER_PROTOCOL,
  createCodexProviderAdapter,
  type CodexMarketplacePlugin,
} from "../../../src/bindings/providers/codex";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  createClaudeProviderAdapter,
  type ClaudeNativePlugin,
} from "../../../src/bindings/providers/claude";

describe("native provider adapters", () => {
  it("sets one exact target-level marketplace registration before member mutation", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-marketplace");
    const member = projectedMember("alpha", "a");
    const registration = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    let marketplace: ProviderMarketplaceObservation = absentMarketplace();
    let writes = 0;
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => marketplace,
        setMarketplaceRegistration: async ({ registration: next, source }) => {
          writes += 1;
          expect(source).toEqual({
            projectionDigest: registration.projectionDigest,
            sourceDigest: registration.sourceDigest,
          });
          marketplace = next === null ? absentMarketplace() : presentMarketplace(next);
        },
        inventoryMarketplace: async () => [],
        installMarketplacePlugin: async () => {},
        enableMarketplacePlugin: async () => {},
        disableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => {},
      },
      appServer: { inspectVisiblePlugins: async () => [] },
      session: { inspectConfiguredPlugins: async () => [] },
      marketplaceSources: marketplaceSourceReader(),
    });
    const prior = absentMarketplace();
    const applied = await adapter.apply({
      kind: "SetMarketplace",
      role: "final",
      target,
      prior,
      priorRegistration: null,
      registration,
    });
    expect(applied.ok).toBe(true);
    expect(writes).toBe(1);
    const staleRetry = await adapter.apply({
      kind: "SetMarketplace",
      role: "final",
      target,
      prior,
      priorRegistration: null,
      registration,
    });
    expect(staleRetry.ok).toBe(false);
    expect(writes).toBe(1);
  });

  it("orders Codex install, enable, and visible verification while preserving unmanaged inventory", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex");
    const member = projectedMember("alpha", "a");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    const unmanaged = nativePlugin("local", "b");
    const plugins: CodexMarketplacePlugin[] = [unmanaged];
    const enabled = new Set<string>([unmanaged.nativeIdentity]);
    const calls: string[] = [];
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async (request) => {
          expect(Object.keys(request).sort()).toEqual([
            "artifactAuthority",
            "home",
            "marketplaceIdentity",
            "memberFingerprint",
            "nativeIdentity",
            "providerSourceIdentity",
            "targetDigest",
          ]);
          calls.push("install");
          plugins.push({
            pluginId: "alpha" as CodexMarketplacePlugin["pluginId"],
            nativeIdentity: request.nativeIdentity,
            artifactAuthority: request.artifactAuthority,
            providerSourceIdentity: request.providerSourceIdentity,
            marketplaceIdentity: request.marketplaceIdentity,
            memberFingerprint: request.memberFingerprint,
          });
          enabled.add(request.nativeIdentity);
        },
        enableMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push("enable");
          enabled.add(nativeIdentity);
        },
        disableMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push("disable");
          enabled.delete(nativeIdentity);
        },
        uninstallMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push("uninstall");
          const index = plugins.findIndex((plugin) => plugin.nativeIdentity === nativeIdentity);
          if (index >= 0) plugins.splice(index, 1);
          enabled.delete(nativeIdentity);
        },
      },
      appServer: {
        inspectVisiblePlugins: async () => plugins.map((plugin) => ({
          nativeIdentity: plugin.nativeIdentity,
          providerSourceIdentity: plugin.providerSourceIdentity,
          visibleSkills: plugin.nativeIdentity === member.nativeIdentity ? member.visible.skills : [],
          visibleHooks: plugin.nativeIdentity === member.nativeIdentity ? member.visible.hooks : [],
        })),
      },
      session: { inspectConfiguredPlugins: async () => [...enabled].map((nativeIdentity) => ({ nativeIdentity, providerSourceIdentity: member.providerSourceIdentity, enablement: "enabled" as const })) },
      marketplaceSources: marketplaceSourceReader(),
    });

    const installed = await adapter.apply({ kind: "InstallMember", target, priorMarketplace: null, activeMarketplace, projectionDigest: PROJECTION_DIGEST, member });
    expect(installed.ok).toBe(true);
    expect(mustInventoryMember(await adapter.readInventory(target), member.nativeIdentity).enablement).toBe("enabled");
    const verified = await adapter.verifyProjection(target, projection("codex", CODEX_ADAPTER_PROTOCOL, member));
    expect(verified.ok).toBe(true);
    expect(calls).toEqual(["install"]);
    expect((await adapter.readInventory(target)).ok && plugins.some((plugin) => plugin.nativeIdentity === unmanaged.nativeIdentity)).toBe(true);
  });

  it("enables an exact pre-existing disabled native plugin", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-enable");
    const member = projectedMember("alpha", "a");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    const plugins: CodexMarketplacePlugin[] = [nativePlugin("alpha", "a")];
    const enabled = new Set<string>();
    let enableCalls = 0;
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async () => { throw new Error("install must not run"); },
        enableMarketplacePlugin: async ({ nativeIdentity }) => {
          enableCalls += 1;
          enabled.add(nativeIdentity);
        },
        disableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => {},
      },
      appServer: {
        inspectVisiblePlugins: async () => plugins.map((plugin) => ({
          nativeIdentity: plugin.nativeIdentity,
          providerSourceIdentity: plugin.providerSourceIdentity,
          visibleSkills: member.visible.skills,
          visibleHooks: member.visible.hooks,
        })),
      },
      session: { inspectConfiguredPlugins: async () => [...enabled].map((nativeIdentity) => ({ nativeIdentity, providerSourceIdentity: member.providerSourceIdentity, enablement: "enabled" as const })) },
      marketplaceSources: marketplaceSourceReader(),
    });

    const prior = mustInventoryMember(await adapter.readInventory(target), member.nativeIdentity);
    const result = await adapter.apply({
      kind: "EnableMember",
      target,
      priorMarketplace: activeMarketplace,
      activeMarketplace,
      priorProjectionDigest: PROJECTION_DIGEST,
      prior,
      member,
    });
    expect(result.ok).toBe(true);
    expect(enableCalls).toBe(1);
  });

  it("fails a Codex visibility port without mutation or fallback", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-failure");
    let mutations = 0;
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => absentMarketplace(),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => [],
        installMarketplacePlugin: async () => { mutations += 1; },
        enableMarketplacePlugin: async () => { mutations += 1; },
        disableMarketplacePlugin: async () => { mutations += 1; },
        uninstallMarketplacePlugin: async () => { mutations += 1; },
      },
      appServer: { inspectVisiblePlugins: async () => { throw new Error("app server unavailable"); } },
      session: { inspectConfiguredPlugins: async () => [] },
      marketplaceSources: marketplaceSourceReader(),
    });
    const result = await adapter.readInventory(target);
    expect(result.ok).toBe(false);
    expect(mutations).toBe(0);
  });

  it("uses the Claude native selector identity for exact managed uninstall", async () => {
    const target = mustTarget("claude", "/tmp/rawr-c3-adapter-claude");
    const member = projectedMember("alpha", "c");
    const plugins: ClaudeNativePlugin[] = [{
      ...nativePlugin("alpha", "c"),
      enablement: "enabled",
      visibleSkills: member.visible.skills,
      visibleHooks: member.visible.hooks,
    }];
    let removedIdentity = "";
    const adapter = createClaudeProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CLAUDE_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => absentMarketplace(),
        setMarketplaceRegistration: async () => {},
        inventoryNativePlugins: async () => plugins,
        inventoryStandaloneExposures: async () => [],
        installNativePlugin: async () => {},
        enableNativePlugin: async () => {},
        disableNativePlugin: async () => {},
        uninstallNativePlugin: async ({ nativeIdentity }) => {
          removedIdentity = nativeIdentity;
          plugins.splice(0, 1);
        },
      },
      marketplaceSources: marketplaceSourceReader(),
    });
    const prior = mustInventoryMember(await adapter.readInventory(target), member.nativeIdentity);
    const result = await adapter.apply({
      kind: "RetireMember",
      target,
      priorMarketplace: null,
      activeMarketplace: null,
      priorProjectionDigest: PROJECTION_DIGEST,
      prior,
      proof: "receipt",
    });
    expect(result.ok).toBe(true);
    expect(removedIdentity).toBe("rawr:alpha");
  });

  it("restores Codex retired bytes and enablement through its exact native selector", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-inverse");
    const member = projectedMember("alpha", "d");
    const prior = observedMember(member, "enabled");
    const plugins: CodexMarketplacePlugin[] = [];
    const enabled = new Set<string>();
    const calls: string[] = [];
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => absentMarketplace(),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async (request) => {
          calls.push("install");
          plugins.push({
            pluginId: member.pluginId,
            nativeIdentity: request.nativeIdentity,
            artifactAuthority: request.artifactAuthority,
            providerSourceIdentity: request.providerSourceIdentity,
            marketplaceIdentity: request.marketplaceIdentity,
            memberFingerprint: request.memberFingerprint,
          });
        },
        enableMarketplacePlugin: async ({ nativeIdentity }) => { calls.push("enable"); enabled.add(nativeIdentity); },
        disableMarketplacePlugin: async ({ nativeIdentity }) => { calls.push("disable"); enabled.delete(nativeIdentity); },
        uninstallMarketplacePlugin: async () => { calls.push("uninstall"); plugins.splice(0); },
      },
      marketplaceSources: marketplaceSourceReader(),
      appServer: {
        inspectVisiblePlugins: async () => plugins.map((plugin) => ({
          nativeIdentity: plugin.nativeIdentity,
          providerSourceIdentity: plugin.providerSourceIdentity,
          visibleSkills: member.visible.skills,
          visibleHooks: member.visible.hooks,
        })),
      },
      session: {
        inspectConfiguredPlugins: async () => [...enabled].map((nativeIdentity) => ({
          nativeIdentity,
          providerSourceIdentity: member.providerSourceIdentity,
          enablement: "enabled" as const,
        })),
      },
    });

    expect((await adapter.restoreExact({
      target,
      expected: null,
      prior,
    })).ok).toBe(true);
    expect(await adapter.readMember(target, prior.nativeIdentity)).toEqual({ ok: true, value: prior });
    const disabledPrior = Object.freeze({ ...prior, enablement: "disabled" as const });
    expect((await adapter.restoreExact({
      target,
      expected: prior,
      prior: disabledPrior,
    })).ok).toBe(true);
    expect(calls).toEqual(["install", "enable", "disable"]);
  });

  it("restores Claude retired bytes but blocks a substituted marketplace source before uninstall", async () => {
    const target = mustTarget("claude", "/tmp/rawr-c3-adapter-claude-inverse");
    const member = projectedMember("alpha", "e");
    const prior = observedMember(member, "enabled");
    const plugins: ClaudeNativePlugin[] = [];
    const calls: string[] = [];
    const adapter = createClaudeProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CLAUDE_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => absentMarketplace(),
        setMarketplaceRegistration: async () => {},
        inventoryNativePlugins: async () => plugins,
        inventoryStandaloneExposures: async () => [],
        installNativePlugin: async (request) => {
          calls.push("install");
          plugins.push({
            pluginId: member.pluginId,
            nativeIdentity: request.nativeIdentity,
            artifactAuthority: request.artifactAuthority,
            providerSourceIdentity: request.providerSourceIdentity,
            marketplaceIdentity: request.marketplaceIdentity,
            memberFingerprint: request.memberFingerprint,
            enablement: "disabled",
            visibleSkills: member.visible.skills,
            visibleHooks: member.visible.hooks,
          });
        },
        enableNativePlugin: async () => {
          calls.push("enable");
          const plugin = plugins[0];
          if (plugin !== undefined) plugins[0] = Object.freeze({ ...plugin, enablement: "enabled" });
        },
        disableNativePlugin: async () => { calls.push("disable"); },
        uninstallNativePlugin: async ({ nativeIdentity }) => { calls.push(`uninstall:${nativeIdentity}`); plugins.splice(0); },
      },
      marketplaceSources: marketplaceSourceReader(),
    });

    expect((await adapter.restoreExact({
      target,
      expected: null,
      prior,
    })).ok).toBe(true);
    const installed = plugins[0];
    if (installed === undefined) throw new Error("Claude inverse fixture did not install");
    plugins[0] = Object.freeze({ ...installed, marketplaceIdentity: "substituted" });
    expect((await adapter.restoreExact({ target, expected: prior, prior: null })).ok).toBe(false);
    expect(calls.some((call) => call.startsWith("uninstall:"))).toBe(false);
    plugins[0] = installed;
    expect((await adapter.restoreExact({ target, expected: prior, prior: null })).ok).toBe(true);
    expect(calls).toEqual([
      "install",
      "enable",
      "uninstall:rawr:alpha",
    ]);
  });

  it("refreshes a same-ID Codex release through native remove then add", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-refresh");
    const priorMember = projectedMember("alpha", "1");
    const nextMember = projectedMember("alpha", "2");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [nextMember]);
    const plugins: CodexMarketplacePlugin[] = [nativePlugin("alpha", "1")];
    const enabled = new Set([priorMember.nativeIdentity]);
    const calls: string[] = [];
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async (request) => {
          calls.push(`add:${request.nativeIdentity}`);
          plugins.push({
            pluginId: nextMember.pluginId,
            nativeIdentity: request.nativeIdentity,
            artifactAuthority: request.artifactAuthority,
            providerSourceIdentity: request.providerSourceIdentity,
            marketplaceIdentity: request.marketplaceIdentity,
            memberFingerprint: request.memberFingerprint,
          });
          enabled.add(request.nativeIdentity);
        },
        enableMarketplacePlugin: async ({ nativeIdentity }) => { enabled.add(nativeIdentity); },
        disableMarketplacePlugin: async ({ nativeIdentity }) => { enabled.delete(nativeIdentity); },
        uninstallMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push(`remove:${nativeIdentity}`);
          plugins.splice(0);
          enabled.delete(nativeIdentity);
        },
      },
      appServer: {
        inspectVisiblePlugins: async () => plugins.map((plugin) => ({
          nativeIdentity: plugin.nativeIdentity,
          providerSourceIdentity: plugin.providerSourceIdentity,
          visibleSkills: nextMember.visible.skills,
          visibleHooks: nextMember.visible.hooks,
        })),
      },
      session: {
        inspectConfiguredPlugins: async () => [...enabled].map((nativeIdentity) => ({
          nativeIdentity,
          providerSourceIdentity: nextMember.providerSourceIdentity,
          enablement: "enabled" as const,
        })),
      },
      marketplaceSources: marketplaceSourceReader(),
    });
    const prior = observedMember(priorMember, "enabled");

    expect((await adapter.apply({
      kind: "RetireMember",
      target,
      priorMarketplace: null,
      activeMarketplace,
      priorProjectionDigest: PROJECTION_DIGEST,
      prior,
      proof: "receipt",
    })).ok).toBe(true);
    expect((await adapter.apply({
      kind: "InstallMember",
      target,
      priorMarketplace: null,
      activeMarketplace,
      projectionDigest: PROJECTION_DIGEST,
      member: nextMember,
    })).ok).toBe(true);
    expect(calls).toEqual(["remove:rawr:alpha", "add:rawr:alpha"]);
    expect((await adapter.verifyProjection(
      target,
      projection("codex", CODEX_ADAPTER_PROTOCOL, nextMember),
    )).ok).toBe(true);
  });

  it("rejects retirement when native removal leaves enablement residue", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-residue");
    const member = projectedMember("alpha", "3");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    const plugins: CodexMarketplacePlugin[] = [nativePlugin("alpha", "3")];
    const configured = new Set([member.nativeIdentity]);
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async () => {},
        enableMarketplacePlugin: async () => {},
        disableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => { plugins.splice(0); },
      },
      appServer: {
        inspectVisiblePlugins: async () => plugins.map((plugin) => ({
          nativeIdentity: plugin.nativeIdentity,
          providerSourceIdentity: plugin.providerSourceIdentity,
          visibleSkills: member.visible.skills,
          visibleHooks: member.visible.hooks,
        })),
      },
      session: {
        inspectConfiguredPlugins: async () => [...configured].map((nativeIdentity) => ({
          nativeIdentity,
          providerSourceIdentity: member.providerSourceIdentity,
          enablement: "enabled" as const,
        })),
      },
      marketplaceSources: marketplaceSourceReader(),
    });

    const result = await adapter.apply({
      kind: "RetireMember",
      target,
      priorMarketplace: activeMarketplace,
      activeMarketplace,
      priorProjectionDigest: PROJECTION_DIGEST,
      prior: observedMember(member, "enabled"),
      proof: "receipt",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].code).toBe("MUTATION_FAILED");
    const inventory = await adapter.readInventory(target);
    expect(inventory.ok && inventory.value.standaloneExposures).toMatchObject([
      { nativeIdentity: "rawr:alpha", enablement: "enabled" },
    ]);
  });
});

const ALL_CAPABILITIES = [
  "managed-retire",
  "native-plugin-enable",
  "native-plugin-install",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
] as const;

const PROJECTION_DIGEST = `ap1_${"9".repeat(64)}` as AgentProviderProjection["projectionDigest"];

function marketplaceRegistration(
  provider: "claude" | "codex",
  adapterProtocol: AgentProviderProjection["adapterProtocol"],
  members: readonly ProviderProjectionMember[],
): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider,
    adapterProtocol,
    marketplaceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    members: members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: PROJECTION_DIGEST,
      memberFingerprint: member.memberFingerprint,
    })),
  });
}

function presentMarketplace(registration: ProviderMarketplaceRegistration): ProviderMarketplaceObservation {
  return Object.freeze({ kind: "present", state: marketplaceState(registration) });
}

function absentMarketplace(): ProviderMarketplaceObservation {
  return Object.freeze({ kind: "absent" });
}

function marketplaceSourceReader() {
  return {
    read: async (_target: unknown, registration: ProviderMarketplaceRegistration) => success({
      projectionDigest: registration.projectionDigest,
      sourceDigest: registration.sourceDigest,
    }),
  };
}

function mustTarget(provider: "claude" | "codex", home: string) {
  const parsed = parseProviderTarget({ provider, home });
  if (!parsed.ok) throw new Error("invalid target fixture");
  return parsed.value;
}

function projectedMember(pluginId: string, fill: string): ProviderProjectionMember {
  return {
    pluginId: pluginId as CodexMarketplacePlugin["pluginId"],
    releaseRef: {},
    artifactAuthority: ARTIFACT_AUTHORITY,
    providerSourceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    nativeIdentity: `rawr:${pluginId}`,
    files: [],
    visible: { pluginIdentity: `rawr:${pluginId}`, skills: ["research"], hooks: ["session-start"] },
    memberFingerprint: `pm1_${fill.repeat(64)}`,
  } as unknown as ProviderProjectionMember;
}

function projection(provider: "claude" | "codex", adapterProtocol: AgentProviderProjection["adapterProtocol"], member: ProviderProjectionMember): AgentProviderProjection {
  return {
    provider,
    adapterProtocol,
    members: [member],
  } as unknown as AgentProviderProjection;
}

function nativePlugin(pluginId: string, fill: string): CodexMarketplacePlugin {
  return {
    pluginId: pluginId as CodexMarketplacePlugin["pluginId"],
    nativeIdentity: `rawr:${pluginId}`,
    artifactAuthority: ARTIFACT_AUTHORITY,
    providerSourceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    marketplaceIdentity: ARTIFACT_AUTHORITY.contentAuthority,
    memberFingerprint: `pm1_${fill.repeat(64)}` as ProviderMemberFingerprint,
  };
}

function observedMember(
  member: ProviderProjectionMember,
  enablement: NativeMemberObservation["enablement"],
): NativeMemberObservation {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement,
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  });
}

const ARTIFACT_AUTHORITY = Object.freeze({
  protocol: "agent-plugin-artifact-authority@v1" as const,
  contentAuthority: "personal-rawr-hq" as ProviderProjectionMember["providerSourceIdentity"],
  sourceCommit: "a".repeat(40) as ProviderProjectionMember["artifactAuthority"]["sourceCommit"],
});

function mustInventoryMember(
  result: Awaited<ReturnType<ReturnType<typeof createCodexProviderAdapter>["readInventory"]>>,
  nativeIdentity: string,
): NativeMemberObservation {
  if (!result.ok) throw new Error(result.issues[0].message);
  const member = result.value.members.find((candidate) => candidate.nativeIdentity === nativeIdentity);
  if (member === undefined) throw new Error("inventory fixture member missing");
  return member;
}
