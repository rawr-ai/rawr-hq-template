import type {
  NativeAgentProviderFailure,
  NativeAgentProviderId,
} from "@rawr/resource-native-agent-provider";
import { describe, expect, it } from "vitest";
import type {
  ClaudeNativeResourceSession,
  CodexNativeResourceSession,
  NativeResourceMarketplaceReadInput,
  NativeResourcePackageEntry,
  NativeResourcePluginReadInput,
  NativeResourceSessionInput,
} from "../../../src/service/model/dependencies/providers";
import { parseProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import { canonicalBytes } from "../../../src/service/modules/providers/model/helpers/canonical";
import {
  createProviderMarketplaceRegistration,
  type ProviderMarketplaceRegistration,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  type AgentProviderProjection,
  renderCompleteProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import type { NativeStandaloneExposureObservation } from "../../../src/service/modules/providers/model/policy/state-machine";
import { CLAUDE_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/claude";
import { CODEX_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/codex";
import {
  claudeCapabilitiesFromCommands,
  createResourceClaudeCanonicalObserver,
  createResourceClaudeProviderAdapter,
} from "../../../src/service/modules/providers/repository/resource-claude";
import {
  codexCapabilitiesFromCommands,
  createResourceCodexCanonicalObserver,
  createResourceCodexProviderAdapter,
} from "../../../src/service/modules/providers/repository/resource-codex";
import { inspectMarketplaceSource } from "../../../src/service/modules/providers/repository/resource-marketplace";
import {
  inspectNativePluginPackage,
  inspectNativePluginVisibility,
} from "../../../src/service/modules/providers/repository/resource-package";
import { createSessionCache } from "../../../src/service/modules/providers/repository/resource-shared";
import {
  type AgentPluginRelease,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import { must, productFixture, releaseInputBody, SOURCE } from "../../shared/release/fixtures";

const EXPECTED_CAPABILITIES = Object.freeze([
  "native-plugin-enable",
  "native-plugin-install",
  "native-plugin-retire",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
]);
const UNUSED_MARKETPLACE_LOCATIONS = Object.freeze({
  locate: async () => {
    throw new Error("unused marketplace location resolver");
  },
});

describe("native provider resource interpretation", () => {
  it("derives service capabilities from raw provider command observations", () => {
    expect(
      codexCapabilitiesFromCommands(["add", "list", "remove"], ["add", "list", "remove"])
    ).toEqual(EXPECTED_CAPABILITIES);
    expect(
      claudeCapabilitiesFromCommands(
        ["disable", "enable", "install", "list", "uninstall"],
        ["add", "list", "remove"]
      )
    ).toEqual(EXPECTED_CAPABILITIES);
    expect(codexCapabilitiesFromCommands(["add", "list"], ["add", "list"])).not.toContain(
      "native-plugin-retire"
    );
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

    const inspected = inspectNativePluginPackage(
      {
        entries: alpha.files.map((file) => ({
          path: file.path,
          mode: file.mode,
          bytes: new Uint8Array(file.bytes),
        })),
      },
      provider
    );
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
    expect(
      inspectMarketplaceSource({
        observation: {
          entries: [{ path: ".rawr/marketplace.json", mode: 0o644, bytes: metadata }],
        },
        provider,
        adapterProtocol: protocol,
      })
    ).toEqual(registration);
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

    expect(inspectNativePluginPackage({ entries }, "codex").memberFingerprint).not.toBe(
      alpha.memberFingerprint
    );
  });

  it("reads normalized hook events from the native package manifest", () => {
    expect(
      inspectNativePluginVisibility({
        entries: [
          {
            path: "hooks/hooks.json",
            mode: 0o644,
            bytes: hookManifestBytes("Stop", "PreToolUse"),
          },
        ],
      }).visibleHooks
    ).toEqual(["pre-tool-use", "stop"]);
  });

  it("treats an empty native hook manifest as no visible events", () => {
    expect(
      inspectNativePluginVisibility({
        entries: [
          {
            path: "hooks/hooks.json",
            mode: 0o644,
            bytes: new TextEncoder().encode(JSON.stringify({ hooks: {} })),
          },
        ],
      }).visibleHooks
    ).toEqual([]);
  });

  it.each([
    { hooks: { Stop: "not-an-array" } },
    { hooks: { Stop: [] } },
    { hooks: { Stop: [{ hooks: [] }] } },
  ])("rejects hook manifests without a complete visible handler declaration", (manifest) => {
    expect(() =>
      inspectNativePluginVisibility({
        entries: [
          {
            path: "hooks/hooks.json",
            mode: 0o644,
            bytes: new TextEncoder().encode(JSON.stringify(manifest)),
          },
        ],
      })
    ).toThrow("supported TypeBox schema");
  });

  it("retries resource acquisition after a failed session instead of caching the failure", async () => {
    let attempts = 0;
    const acquire = createSessionCache("/opt/rawr/bin/codex", async ({ home }) => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient acquisition failure");
      return Object.freeze({ home });
    });

    await expect(acquire("/tmp/rawr-native-provider-home")).rejects.toThrow(
      "transient acquisition failure"
    );
    await expect(acquire("/tmp/rawr-native-provider-home")).resolves.toEqual({
      home: "/tmp/rawr-native-provider-home",
    });
    expect(attempts).toBe(2);
  });

  it("maps the resource-port ownership conflict to the lifecycle collision issue", async () => {
    const result = await inspectCodexCapabilityFailure(
      nativeOwnershipConflict("/tmp/rawr-native-owner-conflict")
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "BLOCKED_COLLISION", path: "target.home" }],
    });
  });

  it("preserves a non-conflict resource failure without classifying it as a collision", async () => {
    const result = await inspectCodexCapabilityFailure(
      Object.freeze({
        ...nativeOwnershipConflict("/tmp/rawr-native-owner-conflict"),
        reason: "CommandFailed",
      })
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: "CAPABILITY_MISMATCH",
          path: "target.capabilities",
          message: "Provider ownership slot is occupied",
        },
      ],
    });
  });

  it("does not classify an ownership reason under a foreign failure tag", async () => {
    const result = await inspectCodexCapabilityFailure(
      Object.freeze({
        ...nativeOwnershipConflict("/tmp/rawr-native-owner-conflict"),
        _tag: "OtherProviderFailure",
      })
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "CAPABILITY_MISMATCH", path: "target.capabilities" }],
    });
  });

  it.each([
    Object.freeze({
      name: "missing provider",
      failure: Object.freeze({
        ...nativeOwnershipConflictFields("/tmp/rawr-native-owner-conflict"),
        operation: "acquire",
      }),
    }),
    Object.freeze({
      name: "mismatched provider",
      failure: nativeOwnershipConflict("/tmp/rawr-native-owner-conflict", "claude"),
    }),
    Object.freeze({
      name: "missing operation",
      failure: Object.freeze({
        ...nativeOwnershipConflictFields("/tmp/rawr-native-owner-conflict"),
        provider: "codex",
      }),
    }),
    Object.freeze({
      name: "unknown operation",
      failure: Object.freeze({
        ...nativeOwnershipConflict("/tmp/rawr-native-owner-conflict"),
        operation: "plugin-repair",
      }),
    }),
  ])("does not classify a resource-shaped failure with $name", async ({
    failure: providerFailure,
  }) => {
    const result = await inspectCodexCapabilityFailure(providerFailure);

    expect(result).toMatchObject({
      ok: false,
      issues: [{ code: "CAPABILITY_MISMATCH", path: "target.capabilities" }],
    });
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
    const verified = await verifyCodexHookVisibility(
      Object.freeze([
        Object.freeze({
          key: "opaque-upstream-key",
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
      ])
    );

    expect(verified.ok).toBe(true);
  });

  it("observes exact selected-owner native state without mutation", async () => {
    const fixture = codexResourceFixture(Object.freeze([]), "valid");
    const observed = await fixture.canonicalObserver.observe(
      fixture.target,
      fixture.projection.artifactAuthority.contentAuthority
    );

    expect(observed).toEqual({
      ok: true,
      value: expect.objectContaining({
        kind: "observed",
        inventory: expect.objectContaining({
          target: fixture.target,
          members: expect.arrayContaining([
            expect.objectContaining({ pluginId: "alpha" }),
            expect.objectContaining({ pluginId: "beta" }),
          ]),
        }),
      }),
    });
  });

  it.each([
    ["missing marketplace metadata", "invalid-marketplace", "managed-marketplace-metadata-invalid"],
    ["invalid selected-member metadata", "invalid-plugin", "managed-plugin-provenance-invalid"],
  ] as const)("classifies %s as selected-owner provenance ambiguity", async (_label, mode, reason) => {
    const observed = await observeCodexProvenance(mode);

    expect(observed).toEqual({
      ok: true,
      value: expect.objectContaining({
        kind: "ambiguous-provenance",
        reason,
      }),
    });
  });

  it("does not relabel a native marketplace read failure as provenance ambiguity", async () => {
    const observed = await observeCodexProvenance("marketplace-read-failure");

    expect(observed.ok).toBe(false);
    if (observed.ok) throw new Error("Expected native marketplace read failure");
    expect(observed.issues[0]).toMatchObject({
      code: "VISIBILITY_FAILED",
      path: "target.inventory",
    });
  });

  it("keeps the existing provider adapter failure surface unchanged", async () => {
    const fixture = codexResourceFixture(Object.freeze([]), "invalid-marketplace");
    const observed = await fixture.adapter.readInventory(fixture.target);

    expect(observed.ok).toBe(false);
    if (observed.ok) throw new Error("Expected legacy provider inventory failure");
    expect(observed.issues[0]).toMatchObject({
      code: "VISIBILITY_FAILED",
      path: "target.inventory",
    });
  });

  it.each([
    ["duplicate managed marketplace", "duplicate-marketplace", "duplicate-managed-marketplace"],
    [
      "mismatched marketplace owner",
      "marketplace-owner-mismatch",
      "managed-marketplace-owner-mismatch",
    ],
    ["mismatched selected member", "member-owner-mismatch", "managed-member-owner-mismatch"],
  ] as const)("classifies Claude %s as provenance ambiguity", async (_label, mode, reason) => {
    const observed = await observeClaudeProvenance(mode);

    expect(observed).toEqual({
      ok: true,
      value: expect.objectContaining({
        kind: "ambiguous-provenance",
        reason,
      }),
    });
  });

  it("does not relabel a Claude native plugin read failure as provenance ambiguity", async () => {
    const observed = await observeClaudeProvenance("plugin-read-failure");

    expect(observed.ok).toBe(false);
    if (observed.ok) throw new Error("Expected native plugin read failure");
    expect(observed.issues[0]).toMatchObject({
      code: "VISIBILITY_FAILED",
      path: "target.inventory",
    });
  });

  it.each([
    "codex",
    "claude",
  ] as const)("retires %s selected-owner config-only residue through the native selector command", async (provider) => {
    const fixture = configuredRetirementFixture(provider, "stable");

    const result = await fixture.adapter.applyCanonical(fixture.action);

    expect(result).toEqual({ kind: "applied" });
    expect(fixture.nativeCalls).toEqual([fixture.action.exposure.exposureIdentity]);
    const inventory = await fixture.adapter.readInventory(fixture.action.target);
    expect(inventory.ok && inventory.value.standaloneExposures).toEqual([]);
  });

  it.each([
    "codex",
    "claude",
  ] as const)("refuses %s configured retirement when the exact selector changes before native mutation", async (provider) => {
    const fixture = configuredRetirementFixture(provider, "changed-before-native-call");

    const result = await fixture.adapter.applyCanonical(fixture.action);

    expect(result).toMatchObject({ kind: "uncertain", lastKnown: "bridge-invoked" });
    expect(fixture.nativeCalls).toEqual([]);
  });

  it("preserves uncertainty when the first bridge command reports provider-home ownership collision", async () => {
    const fixture = configuredRetirementFixture("codex", "ownership-conflict-before-native-call");

    const result = await fixture.adapter.applyCanonical(fixture.action);

    expect(result).toMatchObject({
      kind: "uncertain",
      lastKnown: "bridge-invoked",
      issues: [{ code: "BLOCKED_COLLISION", path: "target.home" }],
    });
    expect(fixture.nativeCalls).toEqual([]);
  });

  it("does not erase uncertainty when ownership changes after native mutation", async () => {
    const fixture = configuredRetirementFixture("codex", "ownership-conflict-after-native-call");

    const result = await fixture.adapter.applyCanonical(fixture.action);

    expect(result).toMatchObject({
      kind: "uncertain",
      lastKnown: "bridge-invoked",
      issues: [{ code: "BLOCKED_COLLISION", path: "target.home" }],
    });
    expect(fixture.nativeCalls).toEqual([fixture.action.exposure.exposureIdentity]);
  });
});

function configuredRetirementFixture(
  provider: "claude" | "codex",
  mode:
    | "changed-before-native-call"
    | "ownership-conflict-after-native-call"
    | "ownership-conflict-before-native-call"
    | "stable"
) {
  const protocol = provider === "codex" ? CODEX_ADAPTER_PROTOCOL : CLAUDE_ADAPTER_PROTOCOL;
  const projection = providerProjection(provider, protocol);
  const registration = marketplaceRegistration(projection);
  const owner = projection.marketplace.identity;
  const home = `/tmp/rawr-native-${provider}-configured-retirement`;
  const targetResult = parseProviderTarget({ provider, home });
  if (!targetResult.ok) throw new Error(targetResult.issues[0].message);
  const exposure: NativeStandaloneExposureObservation & { exposureKind: "configured-only" } =
    Object.freeze({
      exposureKind: "configured-only",
      exposureIdentity: `plugins@${owner}`,
      nativeIdentity: "rawr:plugins",
      providerSourceIdentity: owner,
      enablement: "enabled",
      visibleSkills: Object.freeze([]),
      visibleHooks: Object.freeze([]),
    });
  let configurationReads = 0;
  let configured = true;
  const nativeCalls: string[] = [];
  const nextEnabled = () => {
    configurationReads += 1;
    return mode === "changed-before-native-call" && configurationReads >= 2 ? false : true;
  };
  const marketplaceEntries = Object.freeze([
    Object.freeze({
      path: ".rawr/marketplace.json",
      mode: 0o644,
      bytes: marketplaceMetadata(registration),
    }),
  ]);
  const executablePath = `/opt/rawr/bin/${provider}`;
  const base = {
    executablePath,
    contentAuthority: owner,
    marketplaceSources: {
      read: async () => {
        throw new Error("unused");
      },
    },
    marketplaceLocations: UNUSED_MARKETPLACE_LOCATIONS,
  } as const;

  if (provider === "codex") {
    const session = (input: NativeResourceSessionInput): CodexNativeResourceSession =>
      Object.freeze({
        provider: "codex",
        executablePath: input.executablePath,
        home: input.home,
        probe: async () =>
          Object.freeze({
            provider: "codex",
            executablePath: input.executablePath,
            home: input.home,
            pluginCommands: Object.freeze(["add", "list", "remove"]),
            marketplaceCommands: Object.freeze(["add", "list", "remove"]),
            appServerMethods: Object.freeze(["config/read", "hooks/list", "plugin/list"]),
          }),
        listMarketplaces: async () =>
          Object.freeze({
            stdout: "",
            stderr: "",
            json: { marketplaces: [{ name: owner }] },
          }),
        readMarketplace: async () => Object.freeze({ entries: marketplaceEntries }),
        addMarketplace: async () => {
          throw new Error("unused");
        },
        removeMarketplace: async () => {
          throw new Error("unused");
        },
        listPlugins: async () =>
          Object.freeze({
            stdout: "",
            stderr: "",
            json: { installed: [], available: [] },
          }),
        readPlugin: async () => {
          throw new Error("config-only residue has no package");
        },
        addPlugin: async () => {
          throw new Error("unused");
        },
        removePlugin: async ({
          selector,
        }: Parameters<CodexNativeResourceSession["removePlugin"]>[0]) => {
          if (mode === "ownership-conflict-before-native-call")
            throw nativeOwnershipConflict(home, provider);
          nativeCalls.push(selector);
          configured = false;
        },
        inspectAppServer: async () =>
          Object.freeze({
            plugins: { marketplaces: [] },
            hooks: { data: [{ cwd: home, hooks: [], warnings: [], errors: [] }] },
          }),
        readConfiguration: async () => {
          if (mode === "ownership-conflict-after-native-call" && !configured) {
            throw nativeOwnershipConflict(home, provider);
          }
          return Object.freeze({
            config: {
              plugins: configured
                ? { [exposure.exposureIdentity]: { enabled: nextEnabled() } }
                : {},
            },
          });
        },
        setMarketplaceSource: async () => {
          throw new Error("unused");
        },
      });
    const adapter = createResourceCodexProviderAdapter({
      ...base,
      resource: Object.freeze({
        acquireCodex: async (input: NativeResourceSessionInput) => session(input),
        acquireClaude: async () => {
          throw new Error("unused");
        },
      }),
    });
    return Object.freeze({
      adapter,
      action: Object.freeze({
        kind: "RetireConfiguredExposure" as const,
        target: targetResult.value,
        activeMarketplace: registration,
        exposure,
      }),
      nativeCalls,
    });
  }

  const session = (input: NativeResourceSessionInput): ClaudeNativeResourceSession =>
    Object.freeze({
      provider: "claude",
      executablePath: input.executablePath,
      home: input.home,
      probe: async () =>
        Object.freeze({
          provider: "claude",
          executablePath: input.executablePath,
          home: input.home,
          pluginCommands: Object.freeze(["enable", "install", "list", "uninstall"]),
          marketplaceCommands: Object.freeze(["add", "list", "remove"]),
          appServerMethods: Object.freeze([]),
        }),
      listMarketplaces: async () =>
        Object.freeze({ stdout: "", stderr: "", json: [{ name: owner }] }),
      readMarketplace: async () => Object.freeze({ entries: marketplaceEntries }),
      addMarketplace: async () => {
        throw new Error("unused");
      },
      removeMarketplace: async () => {
        throw new Error("unused");
      },
      listPlugins: async () => Object.freeze({ stdout: "", stderr: "", json: { installed: [] } }),
      readPlugin: async () => {
        throw new Error("config-only residue has no package");
      },
      installPlugin: async () => {
        throw new Error("unused");
      },
      enablePlugin: async () => {
        throw new Error("unused");
      },
      uninstallPlugin: async ({
        selector,
      }: Parameters<ClaudeNativeResourceSession["uninstallPlugin"]>[0]) => {
        if (mode === "ownership-conflict-before-native-call")
          throw nativeOwnershipConflict(home, provider);
        nativeCalls.push(selector);
        configured = false;
      },
      readConfiguration: async () => {
        if (mode === "ownership-conflict-after-native-call" && !configured) {
          throw nativeOwnershipConflict(home, provider);
        }
        return Object.freeze({
          enabledPlugins: configured ? { [exposure.exposureIdentity]: nextEnabled() } : {},
        });
      },
    });
  const adapter = createResourceClaudeProviderAdapter({
    ...base,
    resource: Object.freeze({
      acquireCodex: async () => {
        throw new Error("unused");
      },
      acquireClaude: async (input: NativeResourceSessionInput) => session(input),
    }),
  });
  return Object.freeze({
    adapter,
    action: Object.freeze({
      kind: "RetireConfiguredExposure" as const,
      target: targetResult.value,
      activeMarketplace: registration,
      exposure,
    }),
    nativeCalls,
  });
}

function nativeOwnershipConflictFields(home: string) {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure" as const,
    reason: "OwnershipConflict" as const,
    path: `${home}/.rawr-agent-plugin-owner.json`,
    detail: "Provider ownership slot is occupied",
  });
}

function nativeOwnershipConflict(
  home: string,
  provider: NativeAgentProviderId = "codex"
): NativeAgentProviderFailure {
  return Object.freeze({
    ...nativeOwnershipConflictFields(home),
    provider,
    operation: "acquire" as const,
  });
}

async function inspectCodexCapabilityFailure(providerFailure: unknown) {
  const projection = hookedCodexProjection();
  const targetResult = parseProviderTarget({
    provider: "codex",
    home: "/tmp/rawr-native-owner-conflict",
  });
  if (!targetResult.ok) throw new Error(targetResult.issues[0].message);
  const adapter = createResourceCodexProviderAdapter({
    resource: Object.freeze({
      acquireCodex: async () => {
        throw providerFailure;
      },
      acquireClaude: async () => {
        throw new Error("unused");
      },
    }),
    executablePath: "/opt/rawr/bin/codex",
    contentAuthority: projection.artifactAuthority.contentAuthority,
    marketplaceSources: {
      read: async () => {
        throw new Error("unused");
      },
    },
    marketplaceLocations: UNUSED_MARKETPLACE_LOCATIONS,
  });
  return await adapter.inspectCapabilities(targetResult.value);
}

type CodexObservationMode =
  | "invalid-marketplace"
  | "invalid-plugin"
  | "marketplace-read-failure"
  | "valid";

async function verifyCodexHookVisibility(
  hooks: readonly Record<string, unknown>[],
  mode: CodexObservationMode = "valid"
) {
  const fixture = codexResourceFixture(hooks, mode);
  return await fixture.adapter.verifyProjection(fixture.target, fixture.projection);
}

async function observeCodexProvenance(mode: Exclude<CodexObservationMode, "valid">) {
  const fixture = codexResourceFixture(Object.freeze([]), mode);
  return await fixture.canonicalObserver.observe(
    fixture.target,
    fixture.projection.artifactAuthority.contentAuthority
  );
}

function codexResourceFixture(
  hooks: readonly Record<string, unknown>[],
  mode: CodexObservationMode
) {
  const projection = hookedCodexProjection();
  const home = "/tmp/rawr-native-hook-provider";
  const executablePath = "/opt/rawr/bin/codex";
  const registration = marketplaceRegistration(projection);
  const marketplaceEntries =
    mode === "invalid-marketplace"
      ? Object.freeze([])
      : Object.freeze([
          Object.freeze({
            path: ".rawr/marketplace.json",
            mode: 0o644,
            bytes: marketplaceMetadata(registration),
          }),
        ]);
  const packageEntries = new Map<string, readonly NativeResourcePackageEntry[]>();
  const pluginRows = projection.members.map((member) => {
    const version = `0.0.0-rawr.${member.artifactAuthority.sourceCommit.slice(0, 12)}`;
    packageEntries.set(
      `${member.pluginId}@${member.providerSourceIdentity}`,
      member.files
        .filter((file) => mode !== "invalid-plugin" || file.path !== ".codex-plugin/plugin.json")
        .map((file) =>
          Object.freeze({
            path: file.path,
            mode: file.mode,
            bytes: new Uint8Array(file.bytes),
          })
        )
    );
    return Object.freeze({
      name: member.pluginId,
      marketplaceName: member.providerSourceIdentity,
      version,
      installed: true,
      enabled: true,
    });
  });
  const session = (input: NativeResourceSessionInput): CodexNativeResourceSession =>
    Object.freeze({
      provider: "codex",
      executablePath: input.executablePath,
      home: input.home,
      probe: async () =>
        Object.freeze({
          provider: "codex",
          executablePath: input.executablePath,
          home: input.home,
          pluginCommands: Object.freeze(["add", "list", "remove"]),
          marketplaceCommands: Object.freeze(["add", "list", "remove"]),
          appServerMethods: Object.freeze(["hooks/list", "plugin/list"]),
        }),
      listMarketplaces: async () =>
        Object.freeze({
          stdout: "",
          stderr: "",
          json: { marketplaces: [{ name: registration.marketplaceIdentity }] },
        }),
      readMarketplace: async ({ identity }: NativeResourceMarketplaceReadInput) => {
        if (identity !== registration.marketplaceIdentity)
          throw new Error(`Unexpected marketplace: ${identity}`);
        if (mode === "marketplace-read-failure") throw new Error("native marketplace unavailable");
        return Object.freeze({ entries: marketplaceEntries });
      },
      addMarketplace: async () => {
        throw new Error("mutation must remain cold");
      },
      removeMarketplace: async () => {
        throw new Error("mutation must remain cold");
      },
      listPlugins: async () =>
        Object.freeze({
          stdout: "",
          stderr: "",
          json: { installed: pluginRows, available: [] },
        }),
      readPlugin: async ({ selector }: NativeResourcePluginReadInput) => {
        const entries = packageEntries.get(selector);
        if (entries === undefined) throw new Error(`Unexpected package selector: ${selector}`);
        return Object.freeze({ entries });
      },
      addPlugin: async () => {
        throw new Error("mutation must remain cold");
      },
      removePlugin: async () => {
        throw new Error("mutation must remain cold");
      },
      inspectAppServer: async () =>
        Object.freeze({
          plugins: {
            marketplaces: [
              {
                name: registration.marketplaceIdentity,
                plugins: pluginRows,
              },
            ],
          },
          hooks: {
            data: [{ cwd: home, hooks, warnings: [], errors: [] }],
          },
        }),
      readConfiguration: async () =>
        Object.freeze({
          config: {
            plugins: Object.fromEntries(
              pluginRows.map((plugin) => [
                `${plugin.name}@${plugin.marketplaceName}`,
                { enabled: true },
              ])
            ),
          },
        }),
      setMarketplaceSource: async () => {
        throw new Error("mutation must remain cold");
      },
    });
  const resource = Object.freeze({
    acquireCodex: async (input: NativeResourceSessionInput) => session(input),
    acquireClaude: async () => {
      throw new Error("unused");
    },
  });
  const adapter = createResourceCodexProviderAdapter({
    resource,
    executablePath,
    contentAuthority: projection.artifactAuthority.contentAuthority,
    marketplaceSources: {
      read: async () => {
        throw new Error("unused");
      },
    },
    marketplaceLocations: UNUSED_MARKETPLACE_LOCATIONS,
  });
  const canonicalObserver = createResourceCodexCanonicalObserver({
    resource,
    executablePath,
    contentAuthority: projection.artifactAuthority.contentAuthority,
  });
  const target = parseProviderTarget({ provider: "codex", home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return Object.freeze({ adapter, canonicalObserver, projection, target: target.value });
}

type ClaudeObservationMode =
  | "duplicate-marketplace"
  | "marketplace-owner-mismatch"
  | "member-owner-mismatch"
  | "plugin-read-failure";

async function observeClaudeProvenance(mode: ClaudeObservationMode) {
  const projection = providerProjection("claude", CLAUDE_ADAPTER_PROTOCOL);
  const home = "/tmp/rawr-native-claude-provenance";
  const executablePath = "/opt/rawr/bin/claude";
  const registration = marketplaceRegistration(projection);
  const marketplaceRegistrationForBytes =
    mode === "marketplace-owner-mismatch"
      ? marketplaceRegistrationWithIdentity(registration, "foreign-rawr-hq")
      : registration;
  const marketplaceEntries = Object.freeze([
    Object.freeze({
      path: ".rawr/marketplace.json",
      mode: 0o644,
      bytes: marketplaceMetadata(marketplaceRegistrationForBytes),
    }),
  ]);
  const packageEntries = new Map<string, readonly NativeResourcePackageEntry[]>();
  const pluginRows = projection.members.map((member, index) => {
    const name = mode === "member-owner-mismatch" && index === 0 ? "gamma" : member.pluginId;
    const selector = `${name}@${member.providerSourceIdentity}`;
    packageEntries.set(
      selector,
      member.files.map((file) =>
        Object.freeze({
          path: file.path,
          mode: file.mode,
          bytes: new Uint8Array(file.bytes),
        })
      )
    );
    return Object.freeze({
      id: selector,
      enabled: true,
      scope: "user",
    });
  });
  const session = (input: NativeResourceSessionInput): ClaudeNativeResourceSession =>
    Object.freeze({
      provider: "claude",
      executablePath: input.executablePath,
      home: input.home,
      probe: async () =>
        Object.freeze({
          provider: "claude",
          executablePath: input.executablePath,
          home: input.home,
          pluginCommands: Object.freeze(["enable", "install", "list", "uninstall"]),
          marketplaceCommands: Object.freeze(["add", "list", "remove"]),
          appServerMethods: Object.freeze([]),
        }),
      listMarketplaces: async () =>
        Object.freeze({
          stdout: "",
          stderr: "",
          json:
            mode === "duplicate-marketplace"
              ? [
                  { name: registration.marketplaceIdentity },
                  { name: registration.marketplaceIdentity },
                ]
              : [{ name: registration.marketplaceIdentity }],
        }),
      readMarketplace: async () => Object.freeze({ entries: marketplaceEntries }),
      addMarketplace: async () => {
        throw new Error("mutation must remain cold");
      },
      removeMarketplace: async () => {
        throw new Error("mutation must remain cold");
      },
      listPlugins: async () =>
        Object.freeze({
          stdout: "",
          stderr: "",
          json: { installed: pluginRows },
        }),
      readPlugin: async ({ selector }: NativeResourcePluginReadInput) => {
        if (mode === "plugin-read-failure") throw new Error("native plugin unavailable");
        const entries = packageEntries.get(selector);
        if (entries === undefined) throw new Error(`Unexpected package selector: ${selector}`);
        return Object.freeze({ entries });
      },
      installPlugin: async () => {
        throw new Error("mutation must remain cold");
      },
      enablePlugin: async () => {
        throw new Error("mutation must remain cold");
      },
      uninstallPlugin: async () => {
        throw new Error("mutation must remain cold");
      },
      readConfiguration: async () =>
        Object.freeze({
          enabledPlugins: Object.fromEntries(pluginRows.map((plugin) => [plugin.id, true])),
        }),
    });
  const observer = createResourceClaudeCanonicalObserver({
    resource: Object.freeze({
      acquireCodex: async () => {
        throw new Error("unused");
      },
      acquireClaude: async (input: NativeResourceSessionInput) => session(input),
    }),
    executablePath,
    contentAuthority: projection.artifactAuthority.contentAuthority,
  });
  const target = parseProviderTarget({ provider: "claude", home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return await observer.observe(target.value, projection.artifactAuthority.contentAuthority);
}

function hookedCodexProjection(): AgentProviderProjection {
  const fixture = productFixture();
  const alphaPayload = must(
    createAgentPluginPayload([
      { path: "skills/alpha/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("alpha\n") },
      { path: "agents/alpha.md", mode: 0o644, bytes: new TextEncoder().encode("agent alpha\n") },
      { path: "hooks/hooks.json", mode: 0o644, bytes: hookManifestBytes("SessionStart") },
    ])
  );
  const releaseInput = must(
    createAgentPluginReleaseInput(releaseInputBody(alphaPayload, fixture.betaPayload))
  );
  const alphaRelease = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: alphaPayload,
    })
  );
  const betaRelease = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "beta",
      source: SOURCE,
      payload: fixture.betaPayload,
    })
  );
  const releaseSet = must(
    createAgentPluginReleaseSet({
      releaseInput,
      releases: [alphaRelease, betaRelease],
    })
  );
  const rendered = renderCompleteProjection("codex", CODEX_ADAPTER_PROTOCOL, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(releaseSet.releaseSetDigest),
    releaseSet,
    members: [snapshot(alphaRelease), snapshot(betaRelease)],
  });
  if (!rendered.ok) throw new Error(rendered.issues[0].message);
  return rendered.value;
}

function hookManifestBytes(...eventNames: readonly string[]): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      description: "Fixture hooks",
      hooks: Object.fromEntries(
        eventNames.map((eventName) => [
          eventName,
          [
            {
              hooks: [{ type: "command", command: "printf hook" }],
            },
          ],
        ])
      ),
    })
  );
}

function providerProjection(
  provider: "claude" | "codex",
  adapterProtocol: AgentProviderProjection["adapterProtocol"]
): AgentProviderProjection {
  const fixture = productFixture();
  const rendered = renderCompleteProjection(provider, adapterProtocol, {
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
    releaseSet: fixture.releaseSet,
    members: [snapshot(fixture.alphaRelease), snapshot(fixture.betaRelease)],
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
  projection: Extract<ReturnType<typeof renderCompleteProjection>, { readonly ok: true }>["value"]
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

function marketplaceRegistrationWithIdentity(
  registration: ProviderMarketplaceRegistration,
  marketplaceIdentity: string
): ProviderMarketplaceRegistration {
  const identity = marketplaceIdentity as ProviderMarketplaceRegistration["marketplaceIdentity"];
  return createProviderMarketplaceRegistration({
    provider: registration.provider,
    adapterProtocol: registration.adapterProtocol,
    marketplaceIdentity: identity,
    members: registration.members.map((member) => ({
      ...member,
      providerSourceIdentity: identity,
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
