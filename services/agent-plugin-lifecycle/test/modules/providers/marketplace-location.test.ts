import { join } from "node:path";

import type {
  ArtifactObjectAddress,
  ArtifactRepositoryAsyncPort,
  ArtifactRepositoryIssue,
  ArtifactTreeLocation,
  ArtifactTreeLocationObservation,
} from "@rawr/resource-agent-plugin-artifact-repository";
import {
  artifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { describe, expect, it, vi } from "vitest";

import type {
  ClaudeNativeResourceSession,
  CodexNativeResourceSession,
  NativeResourceSessionInput,
} from "../../../src/service/model/dependencies/providers";
import { NativeProviderResourceFailure } from "../../../src/service/modules/providers/model/errors/native-resource";
import type { ProviderMarketplaceSource } from "../../../src/service/modules/providers/model/repositories/state";
import {
  createProviderMarketplaceRegistration,
  marketplaceState,
  type ProviderMarketplaceRegistration,
} from "../../../src/service/modules/providers/model/policy/marketplace";
import {
  renderCompleteProjection,
  type AgentProviderProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import { canonicalBytes } from "../../../src/service/modules/providers/model/helpers/canonical";
import { success } from "../../../src/service/modules/providers/model/errors/deployment-result";
import { parseProviderTarget } from "../../../src/service/modules/providers/model/dto/provider-target";
import {
  createResourceClaudeProviderAdapter,
} from "../../../src/service/modules/providers/repository/resource-claude";
import {
  createResourceCodexProviderAdapter,
} from "../../../src/service/modules/providers/repository/resource-codex";
import { CLAUDE_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/claude";
import { CODEX_ADAPTER_PROTOCOL } from "../../../src/service/modules/providers/repository/codex";
import { NATIVE_PACKAGE_READ_LIMITS } from "../../../src/service/modules/providers/repository/resource-package";
import { createResourceMarketplaceLocationResolver } from "../../../src/service/modules/providers/repository/resource-marketplace-location";
import {
  createOwnedFixtureRoot,
  disposeOwnedFixtureRoot,
} from "../../support/owned-fixture-root";
import { desiredStateFixture } from "./canonical-fixture";

interface LocationFailureCase {
  readonly name: string;
  readonly expectedMessage: string;
  readonly observe: (address: ArtifactObjectAddress) => ArtifactTreeLocationObservation;
}

const LOCATION_FAILURES: readonly LocationFailureCase[] = Object.freeze([
  Object.freeze({
    name: "missing",
    expectedMessage: "is not materialized",
    observe: (address: ArtifactObjectAddress): ArtifactTreeLocationObservation => Object.freeze({
      kind: "Missing",
      address,
    }),
  }),
  Object.freeze({
    name: "mismatched",
    expectedMessage: "failed mechanical admission",
    observe: (address: ArtifactObjectAddress): ArtifactTreeLocationObservation => Object.freeze({
      kind: "Mismatch",
      address,
      issues: Object.freeze([Object.freeze({
        code: "IdentityChanged",
        detail: "fixture identity changed during admission",
      })] satisfies [ArtifactRepositoryIssue]),
    }),
  }),
  Object.freeze({
    name: "foreign-address",
    expectedMessage: "foreign marketplace projection address",
    observe: (address: ArtifactObjectAddress): ArtifactTreeLocationObservation => Object.freeze({
      kind: "Missing",
      address: Object.freeze({ ...address, objectId: "foreign-projection" }),
    }),
  }),
]);

describe("provider marketplace location admission", () => {
  it("uses the publication address law and returns only the provider-issued opaque location", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const source = marketplaceSource();
      const repositoryRoot = join(fixture.path, "provider-projections");
      const address: ArtifactObjectAddress = Object.freeze({
        repositoryRoot,
        namespace: Object.freeze(["marketplaces"] satisfies [string]),
        objectId: source.projectionDigest,
      });
      const published = await runNodeArtifactRepository(artifactRepositoryResource.publishTree({
        address,
        entries: Object.freeze([Object.freeze({
          path: ".rawr/marketplace.json",
          mode: 0o644,
          bytes: new TextEncoder().encode("{}\n"),
        })]),
        limits: NATIVE_PACKAGE_READ_LIMITS,
      }));
      if (!published.ok || published.value.kind !== "Published") {
        throw new Error("Marketplace location fixture did not publish");
      }
      const locateTree = vi.fn(async (
        input: Parameters<ArtifactRepositoryAsyncPort["locateTree"]>[0],
      ): Promise<ArtifactTreeLocationObservation> => {
        const observed = await runNodeArtifactRepository(artifactRepositoryResource.locateTree(input));
        if (!observed.ok) throw new Error(observed.failure.detail);
        return observed.value;
      });
      const resolver = createResourceMarketplaceLocationResolver({
        repository: { locateTree },
        projectionRepositoryRoot: repositoryRoot,
      });

      const location = await resolver.locate(source);

      expect(locateTree).toHaveBeenCalledOnce();
      expect(locateTree).toHaveBeenCalledWith({ address, limits: NATIVE_PACKAGE_READ_LIMITS });
      expect(location).toBe(join(repositoryRoot, "marketplaces", source.projectionDigest));
    } finally {
      await disposeOwnedFixtureRoot(fixture);
    }
  });

  it.each(LOCATION_FAILURES)("fails closed for a $name observation", async ({ observe, expectedMessage }) => {
    const source = marketplaceSource();
    const repositoryRoot = "/controller/provider-projections";
    const locateTree = vi.fn(async (
      input: Parameters<ArtifactRepositoryAsyncPort["locateTree"]>[0],
    ): Promise<ArtifactTreeLocationObservation> => observe(input.address));
    const resolver = createResourceMarketplaceLocationResolver({
      repository: { locateTree },
      projectionRepositoryRoot: repositoryRoot,
    });

    const located = resolver.locate(source);

    await expect(located).rejects.toBeInstanceOf(NativeProviderResourceFailure);
    await expect(located).rejects.toMatchObject({
      _tag: "NativeProviderResourceFailure",
      kind: "pre-mutation-refusal",
    });
    await expect(located).rejects.toThrow(expectedMessage);
    expect(locateTree).toHaveBeenCalledWith({
      address: Object.freeze({
        repositoryRoot,
        namespace: Object.freeze(["marketplaces"] satisfies [string]),
        objectId: source.projectionDigest,
      }),
      limits: NATIVE_PACKAGE_READ_LIMITS,
    });
  });

  it("wraps a thrown repository failure without exposing a location", async () => {
    const locateTree = vi.fn(async (): Promise<ArtifactTreeLocationObservation> => {
      throw new Error("fixture locator failed");
    });
    const resolver = createResourceMarketplaceLocationResolver({
      repository: { locateTree },
      projectionRepositoryRoot: "/controller/provider-projections",
    });

    const located = resolver.locate(marketplaceSource());

    await expect(located).rejects.toBeInstanceOf(NativeProviderResourceFailure);
    await expect(located).rejects.toMatchObject({
      _tag: "NativeProviderResourceFailure",
      kind: "pre-mutation-refusal",
    });
    await expect(located).rejects.toThrow("fixture locator failed");
  });

  it("resolves Codex mutation input before the raw add call", async () => {
    await withOwnedLocation(async (location) => {
      const projection = providerProjection("codex");
      const registration = marketplaceRegistration(projection);
      const source = marketplaceSourceFromRegistration(registration);
      const target = providerTarget("codex", "/tmp/rawr-codex-marketplace-location");
      const events: string[] = [];
      let current: ProviderMarketplaceRegistration | null = null;
      const resource = Object.freeze({
        acquireCodex: async (input: NativeResourceSessionInput): Promise<CodexNativeResourceSession> => Object.freeze({
          ...codexObservationSession(input, () => current),
          addMarketplace: async (observedLocation: ArtifactTreeLocation) => {
            events.push("native-add");
            expect(observedLocation).toBe(location);
            current = registration;
          },
          setMarketplaceSource: async () => { throw new Error("unexpected Codex replace"); },
        }),
        acquireClaude: async (): Promise<ClaudeNativeResourceSession> => {
          throw new Error("unused Claude resource");
        },
      });
      const adapter = createResourceCodexProviderAdapter({
        resource,
        executablePath: "/opt/rawr/bin/codex",
        contentAuthority: projection.artifactAuthority.contentAuthority,
        marketplaceSources: { read: async () => success(source) },
        marketplaceLocations: {
          locate: async (observedSource) => {
            events.push("locate");
            expect(observedSource).toEqual(source);
            return location;
          },
        },
      });

      const result = await adapter.apply(Object.freeze({
        kind: "SetMarketplace",
        role: "final",
        target,
        expected: Object.freeze({ kind: "absent" }),
        registration,
      }));

      expect(result).toEqual({ kind: "applied" });
      expect(events).toEqual(["locate", "native-add"]);
    });
  });

  it("refuses a missing Codex location without a native marketplace call", async () => {
    const projection = providerProjection("codex");
    const registration = marketplaceRegistration(projection);
    const source = marketplaceSourceFromRegistration(registration);
    const target = providerTarget("codex", "/tmp/rawr-codex-missing-marketplace-location");
    const nativeAdd = vi.fn(async (_: ArtifactTreeLocation) => undefined);
    const resource = Object.freeze({
      acquireCodex: async (input: NativeResourceSessionInput): Promise<CodexNativeResourceSession> => Object.freeze({
        ...codexObservationSession(input, () => null),
        addMarketplace: nativeAdd,
        setMarketplaceSource: async () => { throw new Error("unexpected Codex replace"); },
      }),
      acquireClaude: async (): Promise<ClaudeNativeResourceSession> => {
        throw new Error("unused Claude resource");
      },
    });
    const adapter = createResourceCodexProviderAdapter({
      resource,
      executablePath: "/opt/rawr/bin/codex",
      contentAuthority: projection.artifactAuthority.contentAuthority,
      marketplaceSources: { read: async () => success(source) },
      marketplaceLocations: {
        locate: async () => {
          throw new NativeProviderResourceFailure({
            kind: "pre-mutation-refusal",
            detail: "Marketplace projection is not materialized",
            path: undefined,
          });
        },
      },
    });

    const result = await adapter.apply(Object.freeze({
      kind: "SetMarketplace",
      role: "final",
      target,
      expected: Object.freeze({ kind: "absent" }),
      registration,
    }));

    expect(result).toMatchObject({
      kind: "not-applied",
      issues: [{ code: "MUTATION_FAILED", path: "target.mutation.SetMarketplace" }],
    });
    expect(nativeAdd).not.toHaveBeenCalled();
  });

  it("refuses a missing Claude replacement location before remove or add", async () => {
    const projection = providerProjection("claude");
    const registration = marketplaceRegistration(projection);
    const firstMember = registration.members[0];
    if (firstMember === undefined) throw new Error("Marketplace fixture has no first member");
    const previous = createProviderMarketplaceRegistration({
      provider: registration.provider,
      adapterProtocol: registration.adapterProtocol,
      marketplaceIdentity: registration.marketplaceIdentity,
      members: Object.freeze([firstMember]),
    });
    const source = marketplaceSourceFromRegistration(registration);
    const target = providerTarget("claude", "/tmp/rawr-claude-missing-marketplace-location");
    const nativeRemove = vi.fn(async () => undefined);
    const nativeAdd = vi.fn(async (_: ArtifactTreeLocation) => undefined);
    const resource = Object.freeze({
      acquireCodex: async (): Promise<CodexNativeResourceSession> => {
        throw new Error("unused Codex resource");
      },
      acquireClaude: async (input: NativeResourceSessionInput): Promise<ClaudeNativeResourceSession> => Object.freeze({
        ...claudeObservationSession(input, () => previous),
        removeMarketplace: nativeRemove,
        addMarketplace: nativeAdd,
      }),
    });
    const adapter = createResourceClaudeProviderAdapter({
      resource,
      executablePath: "/opt/rawr/bin/claude",
      contentAuthority: projection.artifactAuthority.contentAuthority,
      marketplaceSources: { read: async () => success(source) },
      marketplaceLocations: {
        locate: async () => {
          throw new NativeProviderResourceFailure({
            kind: "pre-mutation-refusal",
            detail: "Marketplace projection is not materialized",
            path: undefined,
          });
        },
      },
    });

    const result = await adapter.apply(Object.freeze({
      kind: "SetMarketplace",
      role: "final",
      target,
      expected: Object.freeze({ kind: "present", state: marketplaceState(previous) }),
      registration,
    }));

    expect(result).toMatchObject({
      kind: "not-applied",
      issues: [{ code: "MUTATION_FAILED", path: "target.mutation.SetMarketplace" }],
    });
    expect(nativeRemove).not.toHaveBeenCalled();
    expect(nativeAdd).not.toHaveBeenCalled();
  });

  it("resolves Claude replacement input before removing the existing marketplace", async () => {
    await withOwnedLocation(async (location) => {
      const projection = providerProjection("claude");
      const registration = marketplaceRegistration(projection);
      const firstMember = registration.members[0];
      if (firstMember === undefined) throw new Error("Marketplace fixture has no first member");
      const previous = createProviderMarketplaceRegistration({
        provider: registration.provider,
        adapterProtocol: registration.adapterProtocol,
        marketplaceIdentity: registration.marketplaceIdentity,
        members: Object.freeze([firstMember]),
      });
      const source = marketplaceSourceFromRegistration(registration);
      const target = providerTarget("claude", "/tmp/rawr-claude-marketplace-location");
      const events: string[] = [];
      let current: ProviderMarketplaceRegistration | null = previous;
      const resource = Object.freeze({
        acquireCodex: async (): Promise<CodexNativeResourceSession> => {
          throw new Error("unused Codex resource");
        },
        acquireClaude: async (input: NativeResourceSessionInput): Promise<ClaudeNativeResourceSession> => Object.freeze({
          ...claudeObservationSession(input, () => current),
          removeMarketplace: async () => {
            events.push("native-remove");
            current = null;
          },
          addMarketplace: async (observedLocation: ArtifactTreeLocation) => {
            events.push("native-add");
            expect(observedLocation).toBe(location);
            current = registration;
          },
        }),
      });
      const adapter = createResourceClaudeProviderAdapter({
        resource,
        executablePath: "/opt/rawr/bin/claude",
        contentAuthority: projection.artifactAuthority.contentAuthority,
        marketplaceSources: { read: async () => success(source) },
        marketplaceLocations: {
          locate: async () => {
            events.push("locate");
            return location;
          },
        },
      });

      const result = await adapter.apply(Object.freeze({
        kind: "SetMarketplace",
        role: "final",
        target,
        expected: Object.freeze({ kind: "present", state: marketplaceState(previous) }),
        registration,
      }));

      expect(result).toEqual({ kind: "applied" });
      expect(events).toEqual(["locate", "native-remove", "native-add"]);
    });
  });
});

function marketplaceSource(): ProviderMarketplaceSource {
  return marketplaceSourceFromRegistration(marketplaceRegistration(providerProjection("codex")));
}

function providerProjection(provider: "claude" | "codex"): AgentProviderProjection {
  const rendered = renderCompleteProjection(
    provider,
    provider === "codex" ? CODEX_ADAPTER_PROTOCOL : CLAUDE_ADAPTER_PROTOCOL,
    desiredStateFixture().snapshot,
  );
  if (!rendered.ok) throw new Error(`Desired-state fixture cannot render ${provider}`);
  return rendered.value;
}

function marketplaceRegistration(projection: AgentProviderProjection): ProviderMarketplaceRegistration {
  return createProviderMarketplaceRegistration({
    provider: projection.provider,
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
}

function marketplaceSourceFromRegistration(
  registration: ProviderMarketplaceRegistration,
): ProviderMarketplaceSource {
  return Object.freeze({
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
  });
}

function providerTarget(provider: "claude" | "codex", home: string) {
  const target = parseProviderTarget({ provider, home });
  if (!target.ok) throw new Error(target.issues[0].message);
  return target.value;
}

function codexObservationSession(
  input: NativeResourceSessionInput,
  current: () => ProviderMarketplaceRegistration | null,
): Omit<CodexNativeResourceSession, "addMarketplace" | "setMarketplaceSource"> {
  return Object.freeze({
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
      json: {
        marketplaces: current() === null ? [] : [{ name: current()?.marketplaceIdentity }],
      },
    }),
    readMarketplace: async () => Object.freeze({ entries: marketplaceEntries(current()) }),
    removeMarketplace: async () => { throw new Error("unexpected Codex remove"); },
    listPlugins: async () => Object.freeze({ stdout: "", stderr: "", json: { installed: [], available: [] } }),
    readPlugin: async () => { throw new Error("unexpected Codex plugin read"); },
    addPlugin: async () => { throw new Error("unexpected Codex plugin add"); },
    removePlugin: async () => { throw new Error("unexpected Codex plugin remove"); },
    inspectAppServer: async () => Object.freeze({
      plugins: { marketplaces: [] },
      hooks: { data: [{ cwd: input.home, hooks: [], warnings: [], errors: [] }] },
    }),
    readConfiguration: async () => Object.freeze({ config: { plugins: {} } }),
  });
}

function claudeObservationSession(
  input: NativeResourceSessionInput,
  current: () => ProviderMarketplaceRegistration | null,
): Omit<ClaudeNativeResourceSession, "addMarketplace" | "removeMarketplace"> {
  return Object.freeze({
    provider: "claude",
    executablePath: input.executablePath,
    home: input.home,
    probe: async () => Object.freeze({
      provider: "claude",
      executablePath: input.executablePath,
      home: input.home,
      pluginCommands: Object.freeze(["enable", "install", "list", "uninstall"]),
      marketplaceCommands: Object.freeze(["add", "list", "remove"]),
      appServerMethods: Object.freeze([]),
    }),
    listMarketplaces: async () => Object.freeze({
      stdout: "",
      stderr: "",
      json: current() === null ? [] : [{ name: current()?.marketplaceIdentity }],
    }),
    readMarketplace: async () => Object.freeze({ entries: marketplaceEntries(current()) }),
    listPlugins: async () => Object.freeze({ stdout: "", stderr: "", json: { installed: [] } }),
    readPlugin: async () => { throw new Error("unexpected Claude plugin read"); },
    installPlugin: async () => { throw new Error("unexpected Claude plugin install"); },
    enablePlugin: async () => { throw new Error("unexpected Claude plugin enable"); },
    uninstallPlugin: async () => { throw new Error("unexpected Claude plugin uninstall"); },
    readConfiguration: async () => Object.freeze({ enabledPlugins: {} }),
  });
}

function marketplaceEntries(registration: ProviderMarketplaceRegistration | null) {
  if (registration === null) throw new Error("Marketplace observation is absent");
  return Object.freeze([Object.freeze({
    path: ".rawr/marketplace.json",
    mode: 0o644,
    bytes: canonicalBytes({
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
    }),
  })]);
}

async function withOwnedLocation(
  run: (location: ArtifactTreeLocation) => Promise<void>,
): Promise<void> {
  const fixture = await createOwnedFixtureRoot();
  try {
    const address: ArtifactObjectAddress = Object.freeze({
      repositoryRoot: join(fixture.path, "opaque-artifacts"),
      namespace: Object.freeze(["provider-input"] satisfies [string]),
      objectId: "marketplace-location",
    });
    const published = await runNodeArtifactRepository(artifactRepositoryResource.publishTree({
      address,
      entries: Object.freeze([Object.freeze({
        path: ".rawr/marketplace.json",
        mode: 0o644,
        bytes: new TextEncoder().encode("{}\n"),
      })]),
      limits: NATIVE_PACKAGE_READ_LIMITS,
    }));
    if (!published.ok || published.value.kind !== "Published") {
      throw new Error("Opaque location fixture did not publish");
    }
    const located = await runNodeArtifactRepository(artifactRepositoryResource.locateTree({
      address,
      limits: NATIVE_PACKAGE_READ_LIMITS,
    }));
    if (!located.ok || located.value.kind !== "Present") {
      throw new Error("Opaque location fixture did not admit");
    }
    await run(located.value.location);
  } finally {
    await disposeOwnedFixtureRoot(fixture);
  }
}
