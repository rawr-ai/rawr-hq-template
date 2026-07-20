import { describe, expect, it } from "vitest";

import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  parseProviderTarget,
  type AgentProviderProjection,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
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
} from "../../../src/service/modules/providers/repository/codex";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  createClaudeProviderAdapter,
  type ClaudeNativePlugin,
} from "../../../src/service/modules/providers/repository/claude";
import {
  createNativeProviderAdapter,
  type NativeProviderBridge,
} from "../../../src/service/modules/providers/repository/native";

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
        uninstallMarketplacePlugin: async () => {},
        retireConfiguredPlugin: async () => {},
      },
      appServer: { inspectVisiblePlugins: async () => [] },
      session: { inspectConfiguredPlugins: async () => [] },
      marketplaceSources: marketplaceSourceReader(),
    });
    const expected = absentMarketplace();
    const applied = await adapter.apply({
      kind: "SetMarketplace",
      role: "final",
      target,
      expected,
      registration,
    });
    expect(applied).toEqual({ kind: "applied" });
    expect(writes).toBe(1);
    const staleRetry = await adapter.apply({
      kind: "SetMarketplace",
      role: "final",
      target,
      expected,
      registration,
    });
    expect(staleRetry.kind).toBe("not-applied");
    expect(writes).toBe(1);
  });

  it.each([
    ["bridge mutates then throws", "mutate-then-throw", "bridge-invoked", "MUTATION_FAILED"],
    ["bridge returns before the post-read fails", "post-read-fails", "bridge-returned", "VISIBILITY_FAILED"],
    ["bridge returns an invalid post-state", "postcondition-mismatch", "bridge-returned", "MUTATION_FAILED"],
  ] as const)("reports an uncertain attempt when the %s", async (_label, mode, lastKnown, code) => {
    const attempt = await exerciseInstallUncertainty(mode);

    expect(attempt.bridgeCalls).toBe(1);
    expect(attempt.result).toMatchObject({
      kind: "uncertain",
      lastKnown,
      issues: [{ code }],
    });
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
        uninstallMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push("uninstall");
          const index = plugins.findIndex((plugin) => plugin.nativeIdentity === nativeIdentity);
          if (index >= 0) plugins.splice(index, 1);
          enabled.delete(nativeIdentity);
        },
        retireConfiguredPlugin: async () => {},
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

    const installed = await adapter.apply({ kind: "InstallMember", target, activeMarketplace, member });
    expect(installed).toEqual({ kind: "applied" });
    expect(mustInventoryMember(await adapter.readInventory(target), member.nativeIdentity).enablement).toBe("enabled");
    const verified = await adapter.verifyProjection(target, projection("codex", CODEX_ADAPTER_PROTOCOL, member));
    expect(verified.ok).toBe(true);
    expect(calls).toEqual(["install"]);
    expect((await adapter.readInventory(target)).ok && plugins.some((plugin) => plugin.nativeIdentity === unmanaged.nativeIdentity)).toBe(true);
  });

  it("preserves a foreign same-ID Codex selector as a standalone collision", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c3-adapter-codex-foreign-selector");
    const member = projectedMember("alpha", "a");
    const managed = nativePlugin("alpha", "a");
    const foreignSource = "foreign" as ProviderProjectionMember["providerSourceIdentity"];
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(
          marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]),
        ),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => [managed],
        installMarketplacePlugin: async () => {},
        enableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => {},
        retireConfiguredPlugin: async () => {},
      },
      appServer: {
        inspectVisiblePlugins: async () => [
          {
            nativeIdentity: managed.nativeIdentity,
            providerSourceIdentity: managed.providerSourceIdentity,
            visibleSkills: member.visible.skills,
            visibleHooks: member.visible.hooks,
          },
          {
            nativeIdentity: managed.nativeIdentity,
            providerSourceIdentity: foreignSource,
            visibleSkills: ["foreign-skill"],
            visibleHooks: [],
          },
        ],
      },
      session: {
        inspectConfiguredPlugins: async () => [
          {
            nativeIdentity: managed.nativeIdentity,
            providerSourceIdentity: managed.providerSourceIdentity,
            enablement: "enabled" as const,
          },
          {
            nativeIdentity: managed.nativeIdentity,
            providerSourceIdentity: foreignSource,
            enablement: "enabled" as const,
          },
        ],
      },
      marketplaceSources: marketplaceSourceReader(),
    });

    const inventory = await adapter.readInventory(target);

    expect(inventory.ok).toBe(true);
    if (!inventory.ok) throw new Error(inventory.issues[0].message);
    expect(inventory.value.members).toMatchObject([{
      nativeIdentity: managed.nativeIdentity,
      providerSourceIdentity: managed.providerSourceIdentity,
    }]);
    expect(inventory.value.standaloneExposures).toEqual([{
      exposureKind: "installed",
      exposureIdentity: "alpha@foreign",
      nativeIdentity: managed.nativeIdentity,
      providerSourceIdentity: foreignSource,
      enablement: "enabled",
      visibleSkills: ["foreign-skill"],
      visibleHooks: [],
    }]);
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
        uninstallMarketplacePlugin: async () => {},
        retireConfiguredPlugin: async () => {},
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

    const result = await adapter.apply({
      kind: "EnableMember",
      target,
      activeMarketplace,
      member,
    });
    expect(result).toEqual({ kind: "applied" });
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
        uninstallMarketplacePlugin: async () => { mutations += 1; },
        retireConfiguredPlugin: async () => { mutations += 1; },
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
        uninstallNativePlugin: async ({ nativeIdentity }) => {
          removedIdentity = nativeIdentity;
          plugins.splice(0, 1);
        },
        retireConfiguredPlugin: async () => {},
      },
      marketplaceSources: marketplaceSourceReader(),
    });
    const prior = mustInventoryMember(await adapter.readInventory(target), member.nativeIdentity);
    const result = await adapter.apply({
      kind: "RetireMember",
      target,
      activeMarketplace: null,
      member: prior,
    });
    expect(result).toEqual({ kind: "applied" });
    expect(removedIdentity).toBe("rawr:alpha");
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
        uninstallMarketplacePlugin: async ({ nativeIdentity }) => {
          calls.push(`remove:${nativeIdentity}`);
          plugins.splice(0);
          enabled.delete(nativeIdentity);
        },
        retireConfiguredPlugin: async () => {},
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

    expect(await adapter.apply({
      kind: "RetireMember",
      target,
      activeMarketplace,
      member: prior,
    })).toEqual({ kind: "applied" });
    expect(await adapter.apply({
      kind: "InstallMember",
      target,
      activeMarketplace,
      member: nextMember,
    })).toEqual({ kind: "applied" });
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
        uninstallMarketplacePlugin: async () => { plugins.splice(0); },
        retireConfiguredPlugin: async () => {},
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
      activeMarketplace,
      member: observedMember(member, "enabled"),
    });

    expect(result.kind).toBe("uncertain");
    if (result.kind === "uncertain") {
      expect(result.lastKnown).toBe("bridge-returned");
      expect(result.issues[0].code).toBe("MUTATION_FAILED");
    }
    const inventory = await adapter.readInventory(target);
    expect(inventory.ok && inventory.value.standaloneExposures).toMatchObject([
      { nativeIdentity: "rawr:alpha", enablement: "enabled" },
    ]);
  });

  it("retires only an exact selected-owner Codex configured selector", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c6-adapter-codex-configured-retire");
    const member = projectedMember("cognition", "4");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    const configured: NativeStandaloneExposureObservation & { exposureKind: "configured-only" } = {
      exposureKind: "configured-only",
      exposureIdentity: `cognition@${member.providerSourceIdentity}`,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      enablement: "enabled",
      visibleSkills: [],
      visibleHooks: [],
    };
    let configuredLive = true;
    let retireCalls = 0;
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => [],
        installMarketplacePlugin: async () => {},
        enableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => {},
        retireConfiguredPlugin: async ({ expected }) => {
          retireCalls += 1;
          expect(expected).toEqual(configured);
          configuredLive = false;
        },
      },
      appServer: { inspectVisiblePlugins: async () => [] },
      session: {
        inspectConfiguredPlugins: async () => configuredLive
          ? [{
              nativeIdentity: configured.nativeIdentity,
              providerSourceIdentity: configured.providerSourceIdentity,
              enablement: configured.enablement,
            }]
          : [],
      },
      marketplaceSources: marketplaceSourceReader(),
    });

    const result = await adapter.applyCanonical({
      kind: "RetireConfiguredExposure",
      target,
      activeMarketplace,
      exposure: configured,
    });

    expect(result).toEqual({ kind: "applied" });
    expect(retireCalls).toBe(1);
    const inventory = await adapter.readInventory(target);
    expect(inventory.ok && inventory.value.standaloneExposures).toEqual([]);
  });

  it("preserves a foreign same-ID selector after exact managed member retirement", async () => {
    const target = mustTarget("codex", "/tmp/rawr-c6-adapter-codex-exact-retire");
    const member = projectedMember("docs", "5");
    const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
    const plugins: CodexMarketplacePlugin[] = [nativePlugin("docs", "5")];
    const foreign = "foreign" as ProviderProjectionMember["providerSourceIdentity"];
    const adapter = createCodexProviderAdapter({
      process: {
        probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
        inventoryMarketplaceRegistration: async () => presentMarketplace(activeMarketplace),
        setMarketplaceRegistration: async () => {},
        inventoryMarketplace: async () => plugins,
        installMarketplacePlugin: async () => {},
        enableMarketplacePlugin: async () => {},
        uninstallMarketplacePlugin: async () => { plugins.splice(0); },
        retireConfiguredPlugin: async () => {},
      },
      appServer: {
        inspectVisiblePlugins: async () => [
          ...plugins.map(() => ({
            nativeIdentity: member.nativeIdentity,
            providerSourceIdentity: member.providerSourceIdentity,
            visibleSkills: member.visible.skills,
            visibleHooks: member.visible.hooks,
          })),
          {
            nativeIdentity: member.nativeIdentity,
            providerSourceIdentity: foreign,
            visibleSkills: ["foreign-docs"],
            visibleHooks: [],
          },
        ],
      },
      session: { inspectConfiguredPlugins: async () => [] },
      marketplaceSources: marketplaceSourceReader(),
    });

    const result = await adapter.applyCanonical({
      kind: "RetireMember",
      target,
      activeMarketplace,
      member: observedMember(member, "disabled"),
    });

    expect(result).toEqual({ kind: "applied" });
    const inventory = await adapter.readInventory(target);
    expect(inventory.ok && inventory.value.standaloneExposures).toMatchObject([{
      exposureKind: "installed",
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: foreign,
    }]);
  });
});

const ALL_CAPABILITIES = [
  "native-plugin-enable",
  "native-plugin-install",
  "native-plugin-retire",
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

async function exerciseInstallUncertainty(
  mode: "mutate-then-throw" | "post-read-fails" | "postcondition-mismatch",
) {
  const target = mustTarget("codex", `/tmp/rawr-c3-adapter-${mode}`);
  const member = projectedMember("alpha", "7");
  const activeMarketplace = marketplaceRegistration("codex", CODEX_ADAPTER_PROTOCOL, [member]);
  let bridgeCalls = 0;
  let inventoryReads = 0;
  let installed = false;
  const bridge: NativeProviderBridge = {
    probe: async () => ({ adapterProtocol: CODEX_ADAPTER_PROTOCOL, available: ALL_CAPABILITIES }),
    inventory: async () => {
      inventoryReads += 1;
      if (mode === "post-read-fails" && inventoryReads === 2) {
        throw new Error("injected post-read failure");
      }
      return {
        marketplace: presentMarketplace(activeMarketplace),
        members: installed ? [nativeProcessMember(member)] : [],
        standaloneExposures: [],
      };
    },
    setMarketplace: async () => {},
    install: async () => {
      bridgeCalls += 1;
      if (mode !== "postcondition-mismatch") installed = true;
      if (mode === "mutate-then-throw") throw new Error("injected bridge rejection");
    },
    enable: async () => {},
    uninstall: async () => {},
    retireConfiguredExposure: async () => {},
  };
  const adapter = createNativeProviderAdapter({
    provider: "codex",
    adapterProtocol: CODEX_ADAPTER_PROTOCOL,
    bridge,
    marketplaceSources: marketplaceSourceReader(),
  });
  const result = await adapter.apply({ kind: "InstallMember", target, activeMarketplace, member });
  return { result, bridgeCalls };
}

function nativeProcessMember(member: ProviderProjectionMember) {
  return Object.freeze({
    pluginId: member.pluginId,
    nativeIdentity: member.nativeIdentity,
    artifactAuthority: member.artifactAuthority,
    providerSourceIdentity: member.providerSourceIdentity,
    marketplaceIdentity: member.providerSourceIdentity,
    memberFingerprint: member.memberFingerprint,
    enablement: "enabled" as const,
    visibleSkills: member.visible.skills,
    visibleHooks: member.visible.hooks,
  });
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
