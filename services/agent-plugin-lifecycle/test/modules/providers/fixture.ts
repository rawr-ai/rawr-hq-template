import type {
  ContentTreeEntry,
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
} from "@rawr/resource-content-workspace";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeAgentProviderResources,
  NativeMarketplaceSource,
  NativeProviderCapabilities,
  NativeProviderInventory,
  NativeProviderPluginFiles,
  NativeProviderPluginFilesReadInput,
  NativeProviderPluginObservation,
} from "@rawr/resource-native-agent-provider";
import { Effect } from "effect";

import type { Client } from "../../../src/client";
import type { AgentPluginPayload } from "../../../src/service/model/dto/agent-plugin-payload";
import {
  CURRENT_MAIN_V3_CANONICAL_REF,
  CURRENT_MAIN_V3_RECORD_PATH,
  CURRENT_MAIN_V3_RELEASE_INPUT_PATH,
} from "../../../src/service/model/dto/current-main-record";
import type { CurrentMainSelectionResult } from "../../../src/service/model/dto/current-main-selection";
import { createAgentPluginPayload } from "../../../src/service/model/policy/agent-plugin-payload";
import { createAgentPluginRelease } from "../../../src/service/model/policy/agent-plugin-release";
import { canonicalSerializeCurrentMainRecord } from "../../../src/service/model/policy/current-main-record";
import { createAgentPluginReleaseInput } from "../../../src/service/model/policy/release-input";
import { canonicalSerializeAgentPluginReleaseInput } from "../../../src/service/model/policy/release-input-codec";
import type {
  ProviderStatusRequest,
  ProviderSyncRequest,
  ProviderTarget,
  ProviderTestRequest,
} from "../../../src/service/modules/providers/model/dto/provider-lifecycle";
import type { SelectedContent } from "../../../src/service/modules/providers/model/dto/selected-content";
import type { PluginId } from "../../../src/service/shared/release";
import {
  contentDigest,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseOwnershipIdentity,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";
import { createAgentPluginReleaseSet } from "../../../src/service/shared/release/release-set";
import {
  createLifecycleTestClient,
  testInvocation,
  unavailableContentWorkspace,
} from "../../support/client";

const encoder = new TextEncoder();
const COMMIT = requireParsed(parseGitCommitId("1".repeat(40)));
const TREE = requireParsed(parseGitTreeId("2".repeat(40)));
const HEAD_COMMIT = requireParsed(parseGitCommitId("5".repeat(40)));
const HEAD_TREE = requireParsed(parseGitTreeId("6".repeat(40)));
const REPOSITORY_IDENTITY = requireParsed(
  parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")
);
const CONTENT_AUTHORITY = requireParsed(parseContentAuthority("rawr-hq"));
const RELEASE_INPUT_PATH = requireParsed(parseReleaseRelativePath(".rawr/release-input.json"));
const PLUGIN_ROOT = requireParsed(parseReleaseRelativePath("plugins/agents"));
const REPOSITORY_URL = "https://github.com/rawr-ai/rawr-hq.git";
const SOURCE_REF = "refs/tags/agent-plugins-v1";
const NATIVE_SOURCE_REVISION = COMMIT;
const workspaceFixtures = new WeakMap<SelectedContent, ProviderWorkspaceFixture>();

export const channelRequest: ProviderSyncRequest & ProviderStatusRequest = {
  channel: "current-main",
  locator: {
    workspacePath: "/tmp/personal-content",
    expectedRepositoryIdentity: REPOSITORY_IDENTITY,
  },
  targets: [{ provider: "codex", home: "/tmp/codex-home" }],
};

export const wrongRepositoryChannelRequest: ProviderSyncRequest & ProviderStatusRequest = {
  ...channelRequest,
  locator: {
    ...channelRequest.locator,
    expectedRepositoryIdentity: requireParsed(
      parseRepositoryIdentity("git:github.com/example/other")
    ),
  },
};

export const testRequest: ProviderTestRequest = {
  contentWorkspace: {
    locator: "/tmp/personal-content",
    repositoryIdentity: REPOSITORY_IDENTITY,
    contentAuthority: CONTENT_AUTHORITY,
    remoteName: "origin",
    remoteUrl: REPOSITORY_URL,
    refName: "refs/heads/main",
    sourceCommit: COMMIT,
    sourceTree: TREE,
    releaseInputPath: RELEASE_INPUT_PATH,
    pluginRoot: PLUGIN_ROOT,
  },
  disposableRoot: "/tmp/rawr-provider-test",
  mode: { kind: "complete-set" },
  targets: [{ provider: "codex", home: "/tmp/rawr-provider-test/codex-home" }],
};

export function selectedContent(
  pluginIds: readonly string[] = ["cognition"],
  source: NativeMarketplaceSource = {
    kind: "git",
    repositoryUrl: REPOSITORY_URL,
    revision: NATIVE_SOURCE_REVISION,
    sparsePaths: [".agents/plugins", ".claude-plugin", "plugins/agents"],
  },
  selectionKind: SelectedContent["selectionKind"] = "complete-set"
): SelectedContent {
  return buildSelectedContent(pluginIds, {}, source, selectionKind);
}

export function selectedContentWithAliases(
  pluginIds: readonly string[],
  aliasesByPlugin: Readonly<Record<string, readonly string[]>>,
  source: NativeMarketplaceSource = {
    kind: "git",
    repositoryUrl: REPOSITORY_URL,
    revision: NATIVE_SOURCE_REVISION,
    sparsePaths: [".agents/plugins", ".claude-plugin", "plugins/agents"],
  },
  selectionKind: SelectedContent["selectionKind"] = "complete-set"
): SelectedContent {
  return buildSelectedContent(pluginIds, aliasesByPlugin, source, selectionKind);
}

function buildSelectedContent(
  pluginNames: readonly string[],
  aliasesByPlugin: Readonly<Record<string, readonly string[]>>,
  source: NativeMarketplaceSource,
  selectionKind: SelectedContent["selectionKind"]
): SelectedContent {
  const members = pluginNames.map((pluginName) =>
    member(pluginName, aliasesByPlugin[pluginName] ?? [])
  );
  const payloads = members.map((entry) => {
    const payload = requireParsed(
      createAgentPluginPayload(
        entry.manifest.map((manifestEntry) => ({
          path: manifestEntry.path,
          mode: manifestEntry.mode,
          bytes: expectedBytes(entry.pluginId, manifestEntry.path),
        }))
      )
    );
    return Object.freeze({ pluginId: entry.pluginId, payload });
  });
  const releaseInput = requireParsed(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: CONTENT_AUTHORITY,
      members: payloads.map(({ pluginId, payload }) => ({
        kind: "agent-plugin",
        pluginId,
        skillInventory: [
          {
            identity: `${pluginId}-skill`,
            manifestPath: requireParsed(parseReleaseRelativePath(`skills/${pluginId}/SKILL.md`)),
          },
        ],
        payload: {
          protocolVersion: payload.protocolVersion,
          manifest: payload.manifest,
          payloadDigest: payload.payloadDigest,
        },
        vendor: [],
        curation: [],
      })),
      ownershipClaims: [
        ...payloads.map(({ pluginId }) => ({
          kind: "skill" as const,
          identity: `${pluginId}-skill`,
          ownerPluginId: pluginId,
        })),
        ...members.flatMap((entry) =>
          entry.aliases.map((identity) => ({
            kind: "alias" as const,
            identity,
            ownerPluginId: entry.pluginId,
          }))
        ),
      ],
      locks: [],
      qualityPolicies: [],
    })
  );
  const releases = payloads.map(({ pluginId, payload }) =>
    requireParsed(
      createAgentPluginRelease({
        releaseInput,
        pluginId,
        source: {
          sourceRepository: REPOSITORY_IDENTITY,
          sourceCommit: COMMIT,
          sourceTree: TREE,
        },
        payload,
      })
    )
  );
  const releaseSet = requireParsed(createAgentPluginReleaseSet({ releaseInput, releases }));
  const common = Object.freeze({
    contentAuthority: CONTENT_AUTHORITY,
    repositoryIdentity: REPOSITORY_IDENTITY,
    sourceCommit: COMMIT,
    sourceTree: TREE,
    releaseInputDigest: releaseInput.releaseInputDigest,
    marketplace: Object.freeze({ identity: CONTENT_AUTHORITY, source }),
    members: Object.freeze(
      releases.map((release) =>
        Object.freeze({
          pluginId: release.body.pluginId,
          aliases: release.body.aliases,
          payloadDigest: release.body.payloadDigest,
          releaseDigest: release.releaseDigest,
          manifest: release.body.payloadManifest,
        })
      )
    ),
  });
  const content: SelectedContent =
    selectionKind === "targeted"
      ? Object.freeze({ ...common, selectionKind, releaseSetDigest: null })
      : Object.freeze({
          ...common,
          selectionKind,
          releaseSetDigest: releaseSet.releaseSetDigest,
        });
  workspaceFixtures.set(
    content,
    createProviderWorkspaceFixture(content, releaseInput, payloads, members)
  );
  return content;
}

export function member(pluginName: string, aliases: readonly string[] = []) {
  const pluginId = requirePluginId(pluginName);
  const codexManifest = encoder.encode(`{"name":"${pluginId}","provider":"codex"}\n`);
  const claudeManifest = encoder.encode(`{"name":"${pluginId}","provider":"claude"}\n`);
  const skill = encoder.encode(`# ${pluginId}\n`);
  const reference = encoder.encode(`Reference for ${pluginId}\n`);
  const payload = requireParsed(
    createAgentPluginPayload([
      { path: ".claude-plugin/plugin.json", mode: 0o644, bytes: claudeManifest },
      { path: ".codex-plugin/plugin.json", mode: 0o644, bytes: codexManifest },
      { path: `skills/${pluginId}/SKILL.md`, mode: 0o644, bytes: skill },
      {
        path: `skills/${pluginId}/references/guide.md`,
        mode: 0o644,
        bytes: reference,
      },
    ])
  );
  return Object.freeze({
    pluginId,
    aliases: Object.freeze(aliases.map(requireOwnershipIdentity)),
    payloadDigest: payload.payloadDigest,
    releaseDigest: requireParsed(
      parseReleaseDigest(`rd1_${(pluginName === "cognition" ? "b" : "d").repeat(64)}`)
    ),
    manifest: Object.freeze([
      file(".claude-plugin/plugin.json", claudeManifest),
      file(".codex-plugin/plugin.json", codexManifest),
      file(`skills/${pluginId}/SKILL.md`, skill),
      file(`skills/${pluginId}/references/guide.md`, reference),
    ]),
  });
}

export function createCurrentMainSelection(
  override?: CurrentMainSelectionResult
): CurrentMainSelectionResult {
  const content = override === undefined ? selectedContent() : undefined;
  const result: CurrentMainSelectionResult =
    override ??
    ({
      kind: "CURRENT_ELIGIBLE",
      selection: {
        schemaVersion: 3,
        channel: "current-main",
        contentAuthority: CONTENT_AUTHORITY,
        sourceRepositoryIdentity: REPOSITORY_IDENTITY,
        sourceRepositoryUrl: REPOSITORY_URL,
        sourceRef: SOURCE_REF,
        contentCommit: COMMIT,
        contentTree: TREE,
        releaseInputDigest: content!.releaseInputDigest,
      },
    } satisfies CurrentMainSelectionResult);
  return Object.freeze(result);
}

export interface ProviderLifecycleClientFixture {
  readonly client: Client;
  readonly resourceCalls: string[];
}

export function createProviderLifecycleClient(
  content: SelectedContent,
  nativeProviders: NativeAgentProviderResources,
  options: Readonly<{
    failSecondCurrentMainOpening?: boolean;
    secondSelectionContent?: SelectedContent;
    transformContentWorkspace?: (
      resource: ContentWorkspaceResource<never>
    ) => ContentWorkspaceResource<never>;
  }> = {}
): ProviderLifecycleClientFixture {
  const fixture = workspaceFixtures.get(content);
  if (fixture === undefined) {
    throw new Error("Provider content was not created by the owner-local fixture");
  }
  const secondFixture =
    options.secondSelectionContent === undefined
      ? undefined
      : workspaceFixtures.get(options.secondSelectionContent);
  if (options.secondSelectionContent !== undefined && secondFixture === undefined) {
    throw new Error("Second Provider content was not created by the owner-local fixture");
  }
  const resourceCalls: string[] = [];
  const baseContentWorkspace = providerContentWorkspace(
    fixture,
    secondFixture,
    resourceCalls,
    options
  );
  const contentWorkspace =
    options.transformContentWorkspace?.(baseContentWorkspace) ?? baseContentWorkspace;
  return {
    client: createLifecycleTestClient({ contentWorkspace, nativeProviders }),
    resourceCalls,
  };
}

interface ProviderWorkspaceFixture {
  readonly recordBytes: Uint8Array;
  readonly releaseInputBytes: Uint8Array;
  readonly treeEntries: readonly ContentTreeEntry[];
  readonly bytesByBlob: ReadonlyMap<string, Uint8Array>;
}

function createProviderWorkspaceFixture(
  content: SelectedContent,
  releaseInput: Parameters<typeof canonicalSerializeAgentPluginReleaseInput>[0],
  payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[],
  members: readonly ReturnType<typeof member>[]
): ProviderWorkspaceFixture {
  const bytesByPath = new Map<string, Uint8Array>();
  const releaseInputBytes = canonicalSerializeAgentPluginReleaseInput(releaseInput);
  bytesByPath.set(CURRENT_MAIN_V3_RELEASE_INPUT_PATH, releaseInputBytes);
  bytesByPath.set(
    ".agents/plugins/marketplace.json",
    encoder.encode(
      `${JSON.stringify(
        {
          name: CONTENT_AUTHORITY,
          plugins: members.map(({ pluginId }) => ({
            name: pluginId,
            source: { source: "local", path: `./plugins/agents/${pluginId}` },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "agent",
          })),
        },
        null,
        2
      )}\n`
    )
  );
  bytesByPath.set(
    ".claude-plugin/marketplace.json",
    encoder.encode(
      `${JSON.stringify(
        {
          $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
          name: CONTENT_AUTHORITY,
          owner: { name: "RAWR HQ" },
          plugins: members.map(({ pluginId }) => ({
            name: pluginId,
            source: `./plugins/agents/${pluginId}`,
            description: `${pluginId} agent plugin`,
          })),
        },
        null,
        2
      )}\n`
    )
  );
  for (const { pluginId, payload } of payloads) {
    for (const entry of payload.manifest) {
      bytesByPath.set(
        `plugins/agents/${pluginId}/${entry.path}`,
        expectedBytes(pluginId, entry.path)
      );
    }
  }
  const bytesByBlob = new Map<string, Uint8Array>();
  const treeEntries = [...bytesByPath.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([path, bytes], index) => {
      const blob = (index + 10).toString(16).padStart(40, "0");
      bytesByBlob.set(blob, bytes);
      return Object.freeze({ path, mode: "100644" as const, blob });
    });
  const selection = createCurrentMainSelection({
    kind: "CURRENT_ELIGIBLE",
    selection: {
      schemaVersion: 3,
      channel: "current-main",
      contentAuthority: content.contentAuthority,
      sourceRepositoryIdentity: content.repositoryIdentity,
      sourceRepositoryUrl: REPOSITORY_URL,
      sourceRef: SOURCE_REF,
      contentCommit: content.sourceCommit,
      contentTree: content.sourceTree,
      releaseInputDigest: content.releaseInputDigest,
    },
  });
  if (selection.kind !== "CURRENT_ELIGIBLE") throw new Error("Invalid current-main fixture");
  return Object.freeze({
    recordBytes: canonicalSerializeCurrentMainRecord(selection.selection),
    releaseInputBytes,
    treeEntries: Object.freeze(treeEntries),
    bytesByBlob,
  });
}

function providerContentWorkspace(
  fixture: ProviderWorkspaceFixture,
  secondFixture: ProviderWorkspaceFixture | undefined,
  calls: string[],
  options: Readonly<{ failSecondCurrentMainOpening?: boolean }>
): ContentWorkspaceResource<never> {
  let activeFixture = fixture;
  let mainInspections = 0;
  const workspaceAnchor = Object.freeze({
    root: testRequest.contentWorkspace.locator,
    rootDevice: "provider-fixture-device",
    rootInode: "provider-fixture-inode",
    refName: testRequest.contentWorkspace.refName,
    commit: COMMIT,
    refCommit: COMMIT,
    tree: TREE,
    objectFormat: "sha1" as const,
    remoteUrls: Object.freeze([REPOSITORY_URL]),
  });
  return Object.freeze({
    ...unavailableContentWorkspace(),
    inspectGitWorkspace: () =>
      Effect.sync(() => {
        calls.push("inspect-workspace");
        return workspaceAnchor;
      }),
    inspectGitRef: (input: Parameters<ContentWorkspaceResource<never>["inspectGitRef"]>[0]) =>
      Effect.suspend(() => {
        calls.push(`inspect:${input.refName}`);
        if (input.refName === CURRENT_MAIN_V3_CANONICAL_REF) {
          mainInspections += 1;
          if (options.failSecondCurrentMainOpening === true && mainInspections === 4) {
            return Effect.fail(
              contentWorkspaceFailure(
                "inspect-git-ref",
                "GitFailed",
                "Second current-main selection is unavailable"
              )
            );
          }
          if (mainInspections === 4 && secondFixture !== undefined) {
            activeFixture = secondFixture;
          }
        }
        const isContent = input.refName === SOURCE_REF;
        return Effect.succeed({
          root: channelRequest.locator.workspacePath,
          refName: input.refName,
          commit: isContent ? COMMIT : HEAD_COMMIT,
          tree: isContent ? TREE : HEAD_TREE,
          objectFormat: "sha1" as const,
          remoteUrls: Object.freeze([REPOSITORY_URL]),
        });
      }),
    readGitBlobAtPath: (
      input: Parameters<ContentWorkspaceResource<never>["readGitBlobAtPath"]>[0]
    ) =>
      Effect.sync(() => {
        calls.push(`read-at:${input.path}`);
        const record = input.path === CURRENT_MAIN_V3_RECORD_PATH;
        return {
          refCommit: record ? HEAD_COMMIT : COMMIT,
          commit: record ? HEAD_COMMIT : COMMIT,
          tree: record ? HEAD_TREE : TREE,
          blob: record ? "7".repeat(40) : "8".repeat(40),
          bytes: record ? activeFixture.recordBytes : activeFixture.releaseInputBytes,
        };
      }),
    isLocalGitAncestor: () =>
      Effect.sync(() => {
        calls.push("ancestry");
        return true;
      }),
    readGitTree: (input: Parameters<ContentWorkspaceResource<never>["readGitTree"]>[0]) =>
      Effect.sync(() => {
        calls.push("read-tree");
        return Object.freeze(
          activeFixture.treeEntries.filter((entry) =>
            input.paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))
          )
        );
      }),
    readGitBlob: ({ blob }: Parameters<ContentWorkspaceResource<never>["readGitBlob"]>[0]) =>
      Effect.sync(() => {
        calls.push(`read-blob:${blob}`);
        const bytes = activeFixture.bytesByBlob.get(blob);
        if (bytes === undefined) throw new Error(`Missing provider fixture blob ${blob}`);
        return bytes;
      }),
    readGitBlobs: ({ blobs }: Parameters<ContentWorkspaceResource<never>["readGitBlobs"]>[0]) =>
      Effect.sync(() => {
        calls.push("read-blobs");
        return Object.freeze(
          blobs.map((blob) => {
            const bytes = activeFixture.bytesByBlob.get(blob);
            if (bytes === undefined) throw new Error(`Missing provider fixture blob ${blob}`);
            return Object.freeze({ blob, bytes });
          })
        );
      }),
    captureGitWorkspaceEvidence: (
      input: Parameters<ContentWorkspaceResource<never>["captureGitWorkspaceEvidence"]>[0]
    ) =>
      Effect.sync(() => {
        calls.push("capture-evidence");
        const trackedFlags = Object.freeze(
          input.admittedPaths.map((path) =>
            Object.freeze({
              path,
              status: "Cached" as const,
              assumeUnchanged: false,
            })
          )
        );
        const worktreeObjectIds = Object.freeze(
          input.admittedPaths.map((path) => {
            const entry = activeFixture.treeEntries.find((candidate) => candidate.path === path);
            if (entry === undefined) {
              throw new Error(`Missing provider fixture tree entry ${path}`);
            }
            return Object.freeze({ path, objectId: entry.blob });
          })
        );
        return Object.freeze({
          openingAnchor: workspaceAnchor,
          openingStatus: new Uint8Array(),
          openingTrackedFlags: trackedFlags,
          worktreeObjectIds,
          indexEntries: new Uint8Array(),
          closingAnchor: workspaceAnchor,
          closingStatus: new Uint8Array(),
          closingTrackedFlags: trackedFlags,
        });
      }),
    readFile: (input: Parameters<ContentWorkspaceResource<never>["readFile"]>[0]) =>
      Effect.sync(() => {
        calls.push(`read-file:${input.path}`);
        const entry = activeFixture.treeEntries.find((candidate) => candidate.path === input.path);
        const bytes = entry === undefined ? undefined : activeFixture.bytesByBlob.get(entry.blob);
        if (bytes === undefined) throw new Error(`Missing provider fixture file ${input.path}`);
        return bytes;
      }),
  });
}

function contentWorkspaceFailure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  detail: string
): ContentWorkspaceFailure {
  return { _tag: "ContentWorkspaceFailure", operation, reason, detail };
}

interface FakeNativeSessionInput {
  readonly target: ProviderTarget;
  readonly content: SelectedContent;
  readonly marketplace?: "exact" | "stale" | "unrelated" | "ambiguous" | "absent";
  readonly installed?: readonly string[];
  readonly disabled?: readonly string[];
  readonly omitted?: readonly string[];
  readonly staleFiles?: readonly string[];
  readonly probeOverride?: () => Effect.Effect<
    NativeProviderCapabilities,
    NativeAgentProviderFailure
  >;
  readonly onMutation?: () => void;
}

class FakeNativeSessionBase<const Provider extends ProviderTarget["provider"]> {
  readonly provider: Provider;
  readonly executablePath: string;
  readonly home: string;
  readonly calls: string[] = [];
  readonly fileReadRequests: NativeProviderPluginFilesReadInput[] = [];
  inventoryFailureCount = 0;
  inventoryFailureAfterInstall = false;
  inventoryFailureAfterMarketplaceRemove = false;
  installFailure: "before" | "after" | null = null;
  marketplaceRemoveFailure: "before" | "after" | null = null;
  malformedCapabilities = false;
  malformedFileBatch = false;
  malformedInventory = false;
  probeFailure = false;
  installBadFiles = false;
  protected inventoryValue: NativeProviderInventory;
  private readonly content: SelectedContent;
  private readonly files = new Map<string, Uint8Array>();
  private readonly probeOverride?: () => Effect.Effect<
    NativeProviderCapabilities,
    NativeAgentProviderFailure
  >;
  protected readonly onMutation?: () => void;

  constructor(provider: Provider, input: FakeNativeSessionInput) {
    if (input.target.provider !== provider) {
      throw new Error(`Fake ${provider} session received a ${input.target.provider} target`);
    }
    this.provider = provider;
    this.home = input.target.home;
    this.executablePath = `/opt/${this.provider}`;
    this.content = input.content;
    this.probeOverride = input.probeOverride;
    this.onMutation = input.onMutation;
    const marketplaces =
      input.marketplace === "absent"
        ? []
        : [marketplace(input.content, input.marketplace ?? "exact", this.provider)];
    const installed = [...(input.installed ?? [])];
    const omitted = [...(input.omitted ?? [])];
    const plugins = [...installed, ...omitted]
      .map((name) => plugin(name, this.provider, !(input.disabled ?? []).includes(name)))
      .sort((left, right) => compareText(left.selector, right.selector));
    this.inventoryValue = {
      provider: this.provider,
      marketplaces,
      plugins,
    };
    for (const name of installed) {
      const selected = input.content.members.find((entry) => entry.pluginId === name);
      if (selected !== undefined)
        this.writeSelectedFiles(selected, (input.staleFiles ?? []).includes(name));
    }
  }

  probe(): Effect.Effect<NativeProviderCapabilities, NativeAgentProviderFailure> {
    this.calls.push("probe");
    if (this.probeOverride !== undefined) return this.probeOverride();
    if (this.probeFailure) {
      return Effect.fail(
        failure(this.provider, "probe", "started", "fixture capability probe failure")
      );
    }
    const capabilities =
      this.provider === "codex"
        ? ({
            provider: "codex",
            executablePath: this.executablePath,
            home: this.home,
            version: "fixture-1",
            capabilities: [
              "marketplace-list",
              "marketplace-add",
              "marketplace-remove",
              "plugin-list",
              "plugin-install",
              "plugin-remove",
            ],
          } satisfies NativeProviderCapabilities)
        : ({
            provider: "claude",
            executablePath: this.executablePath,
            home: this.home,
            version: "fixture-1",
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
          } satisfies NativeProviderCapabilities);
    if (this.malformedCapabilities) {
      Reflect.deleteProperty(capabilities, "home");
    }
    return Effect.succeed(capabilities);
  }

  inventory(): Effect.Effect<NativeProviderInventory, NativeAgentProviderFailure> {
    return Effect.suspend(() => {
      this.calls.push("inventory");
      if (this.inventoryFailureCount > 0) {
        this.inventoryFailureCount -= 1;
        return Effect.fail(
          failure(this.provider, "inventory", "started", "fixture inventory failure")
        );
      }
      if (this.malformedInventory) {
        Reflect.deleteProperty(this.inventoryValue, "provider");
      }
      return Effect.succeed(this.inventoryValue);
    });
  }

  readPluginFiles(
    input: NativeProviderPluginFilesReadInput
  ): Effect.Effect<NativeProviderPluginFiles> {
    return Effect.sync(() => {
      this.fileReadRequests.push(input);
      this.calls.push(
        `read-batch:${input.selector}:${input.files.map((file) => file.relativePath).join(",")}`
      );
      const observed = {
        selector: input.selector,
        files: Object.freeze(
          input.files.map((file) => {
            const bytes = this.files.get(`${input.selector}\u0000${file.relativePath}`);
            return bytes === undefined
              ? Object.freeze({ kind: "Missing", relativePath: file.relativePath })
              : bytes.byteLength > file.maxBytes
                ? Object.freeze({ kind: "TooLarge", relativePath: file.relativePath })
                : Object.freeze({
                    kind: "Read",
                    relativePath: file.relativePath,
                    byteLength: bytes.byteLength,
                    contentBase64: Buffer.from(bytes).toString("base64"),
                  });
          })
        ),
      };
      if (this.malformedFileBatch) {
        Reflect.deleteProperty(observed, "selector");
      }
      return Object.freeze(observed);
    });
  }

  addMarketplace(source: NativeMarketplaceSource) {
    return Effect.sync(() => {
      this.onMutation?.();
      this.calls.push("mutate:marketplace-add");
      this.inventoryValue = {
        ...this.inventoryValue,
        marketplaces: [
          {
            identity: this.content.marketplace.identity,
            source:
              source.kind === "git"
                ? {
                    kind: "git" as const,
                    repositoryUrl: source.repositoryUrl,
                    revision: this.provider === "codex" ? null : source.revision,
                  }
                : { kind: "local" as const, root: source.root },
            installedRoot: `/tmp/${this.provider}-home/marketplaces/${this.content.marketplace.identity}`,
          },
        ],
      };
      return {
        provider: this.provider,
        operation: "marketplace-add" as const,
        commandPhase: "command-returned" as const,
      };
    });
  }

  removeMarketplace() {
    return Effect.suspend(() => {
      this.onMutation?.();
      this.calls.push("mutate:marketplace-remove");
      if (this.marketplaceRemoveFailure === "before") {
        return Effect.fail(
          failure(this.provider, "marketplace-remove", "not-started", "fixture removal refusal")
        );
      }
      this.inventoryValue = { ...this.inventoryValue, marketplaces: [] };
      if (this.inventoryFailureAfterMarketplaceRemove) {
        this.inventoryFailureAfterMarketplaceRemove = false;
        this.inventoryFailureCount += 1;
      }
      if (this.marketplaceRemoveFailure === "after") {
        this.marketplaceRemoveFailure = null;
        return Effect.fail(
          failure(
            this.provider,
            "marketplace-remove",
            "command-returned",
            "fixture removal uncertainty"
          )
        );
      }
      return Effect.succeed({
        provider: this.provider,
        operation: "marketplace-remove" as const,
        commandPhase: "command-returned" as const,
      });
    });
  }

  installPlugin(input: Readonly<{ selector: string }>) {
    return Effect.suspend(() => {
      this.onMutation?.();
      this.calls.push(`mutate:plugin-install:${input.selector}`);
      if (this.installFailure === "before") {
        return Effect.fail(
          failure(this.provider, "plugin-install", "not-started", "fixture install refusal")
        );
      }
      const name = input.selector.slice(0, input.selector.indexOf("@"));
      const selected = this.content.members.find((entry) => entry.pluginId === name);
      if (selected === undefined) return Effect.die(new Error(`Unknown fixture plugin ${name}`));
      this.upsertPlugin(plugin(name, this.provider, this.provider === "codex"));
      this.writeSelectedFiles(selected, this.installBadFiles);
      if (this.inventoryFailureAfterInstall) {
        this.inventoryFailureAfterInstall = false;
        this.inventoryFailureCount += 1;
      }
      if (this.installFailure === "after") {
        this.installFailure = null;
        return Effect.fail(
          failure(
            this.provider,
            "plugin-install",
            "command-returned",
            "fixture install uncertainty"
          )
        );
      }
      return Effect.succeed({
        provider: this.provider,
        operation: "plugin-install" as const,
        commandPhase: "command-returned" as const,
      });
    });
  }

  removePlugin(input: Readonly<{ selector: string }>) {
    return Effect.sync(() => {
      this.onMutation?.();
      this.calls.push(`mutate:plugin-remove:${input.selector}`);
      this.inventoryValue = {
        ...this.inventoryValue,
        plugins: this.inventoryValue.plugins.filter((entry) => entry.selector !== input.selector),
      };
      for (const key of [...this.files.keys()]) {
        if (key.startsWith(`${input.selector}\u0000`)) this.files.delete(key);
      }
      return {
        provider: this.provider,
        operation: "plugin-remove" as const,
        commandPhase: "command-returned" as const,
      };
    });
  }

  mutationCalls(): readonly string[] {
    return this.calls.filter((call) => call.startsWith("mutate:"));
  }

  hasPlugin(name: string): boolean {
    return this.inventoryValue.plugins.some((entry) => entry.name === name && entry.installed);
  }

  hasPluginObservation(name: string): boolean {
    return this.inventoryValue.plugins.some((entry) => entry.name === name);
  }

  setPluginEnabled(name: string, enabled: boolean | null): void {
    const live = this.inventoryValue.plugins.find((entry) => entry.name === name);
    if (live === undefined)
      throw new Error(`Cannot set enablement for absent fixture plugin ${name}`);
    this.upsertPlugin({ ...live, enabled });
  }

  setPluginInstalled(name: string, installed: boolean): void {
    const live = this.inventoryValue.plugins.find((entry) => entry.name === name);
    if (live === undefined)
      throw new Error(`Cannot set installation for absent fixture plugin ${name}`);
    this.upsertPlugin({ ...live, installed });
  }

  setForeignPlugin(name: string, marketplaceIdentity: string, installed: boolean): void {
    this.upsertPlugin({
      selector: `${name}@${marketplaceIdentity}`,
      marketplaceIdentity,
      name,
      installed,
      enabled: null,
      version: null,
      root: null,
    });
  }

  setPluginFile(name: string, relativePath: string, bytes: Uint8Array): void {
    this.files.set(`${name}@rawr-hq\u0000${relativePath}`, bytes);
  }

  protected upsertPlugin(next: NativeProviderPluginObservation): void {
    this.inventoryValue = {
      ...this.inventoryValue,
      plugins: [
        ...this.inventoryValue.plugins.filter((entry) => entry.selector !== next.selector),
        next,
      ].sort((left, right) => compareText(left.selector, right.selector)),
    };
  }

  private writeSelectedFiles(selected: SelectedContent["members"][number], stale: boolean): void {
    const selector = `${selected.pluginId}@rawr-hq`;
    for (const entry of selected.manifest) {
      const bytes = stale
        ? encoder.encode("stale\n")
        : expectedBytes(selected.pluginId, entry.path);
      this.files.set(`${selector}\u0000${entry.path}`, bytes);
    }
  }
}

class FakeCodexNativeSession
  extends FakeNativeSessionBase<"codex">
  implements CodexNativeAgentProviderSession
{
  constructor(input: FakeNativeSessionInput) {
    super("codex", input);
  }
}

class FakeClaudeNativeSession
  extends FakeNativeSessionBase<"claude">
  implements ClaudeNativeAgentProviderSession
{
  constructor(input: FakeNativeSessionInput) {
    super("claude", input);
  }

  enablePlugin(input: Readonly<{ selector: string }>) {
    return Effect.suspend(() => {
      this.onMutation?.();
      this.calls.push(`mutate:plugin-enable:${input.selector}`);
      const live = this.inventoryValue.plugins.find((entry) => entry.selector === input.selector);
      if (live === undefined) {
        return Effect.die(new Error("Cannot enable an absent fixture plugin"));
      }
      this.upsertPlugin({ ...live, enabled: true });
      return Effect.succeed({
        provider: this.provider,
        operation: "plugin-enable" as const,
        commandPhase: "command-returned" as const,
      });
    });
  }
}

type FakeNativeSession = FakeCodexNativeSession | FakeClaudeNativeSession;

/** Selects a provider-discriminated fake whose method surface matches the native contract. */
export function fakeNativeSession(input: FakeNativeSessionInput): FakeNativeSession {
  switch (input.target.provider) {
    case "codex":
      return new FakeCodexNativeSession(input);
    case "claude":
      return new FakeClaudeNativeSession(input);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export class FakeNativeProviders implements NativeAgentProviderResources {
  readonly codex;
  readonly claude;
  readonly acquisitionCalls: string[] = [];

  constructor(
    sessions: readonly FakeNativeSession[],
    onAcquire?: (target: ProviderTarget) => void
  ) {
    const codexSessions: FakeCodexNativeSession[] = [];
    const claudeSessions: FakeClaudeNativeSession[] = [];
    for (const session of sessions) {
      switch (session.provider) {
        case "codex":
          codexSessions.push(session);
          break;
        case "claude":
          claudeSessions.push(session);
          break;
      }
    }
    this.codex = Object.freeze({
      acquire: ({ home }: Readonly<{ home: string }>) =>
        Effect.suspend(() => {
          const key = `codex:${home}`;
          this.acquisitionCalls.push(key);
          onAcquire?.({ provider: "codex", home });
          return acquireFakeSession(
            "codex",
            codexSessions,
            home,
            this.acquisitionCalls.filter((call) => call === key).length - 1
          );
        }),
    });
    this.claude = Object.freeze({
      acquire: ({ home }: Readonly<{ home: string }>) =>
        Effect.suspend(() => {
          const key = `claude:${home}`;
          this.acquisitionCalls.push(key);
          onAcquire?.({ provider: "claude", home });
          return acquireFakeSession(
            "claude",
            claudeSessions,
            home,
            this.acquisitionCalls.filter((call) => call === key).length - 1
          );
        }),
    });
  }
}

function acquireFakeSession<Session extends Readonly<{ home: string }>>(
  provider: ProviderTarget["provider"],
  sessions: readonly Session[],
  home: string,
  acquisitionIndex: number
): Effect.Effect<Session, NativeAgentProviderFailure> {
  const matches = sessions.filter((candidate) => candidate.home === home);
  const session = matches[Math.min(acquisitionIndex, matches.length - 1)];
  return session === undefined
    ? Effect.fail(failure(provider, "acquire", "not-started", "Fixture target is absent"))
    : Effect.succeed(session);
}

function marketplace(
  content: SelectedContent,
  kind: "exact" | "stale" | "unrelated" | "ambiguous",
  provider: ProviderTarget["provider"]
) {
  if (kind === "ambiguous") {
    return {
      identity: "rawr-hq",
      source: null,
      installedRoot: "/tmp/provider-home/marketplaces/rawr-hq",
    };
  }
  const source = content.marketplace.source;
  if (kind === "unrelated") {
    return {
      identity: "rawr-hq",
      source: {
        kind: "git" as const,
        repositoryUrl: "https://example.com/other.git",
        revision: "v1",
      },
      installedRoot: "/tmp/provider-home/marketplaces/rawr-hq",
    };
  }
  if (source.kind === "local") {
    return {
      identity: "rawr-hq",
      source: { kind: "local" as const, root: source.root },
      installedRoot: source.root,
    };
  }
  return {
    identity: "rawr-hq",
    source: {
      kind: "git" as const,
      repositoryUrl: source.repositoryUrl,
      revision:
        kind === "exact" ? (provider === "codex" ? null : source.revision) : "agent-plugins-old",
    },
    installedRoot: "/tmp/provider-home/marketplaces/rawr-hq",
  };
}

function plugin(name: string, provider: ProviderTarget["provider"], enabled: boolean) {
  return Object.freeze({
    selector: `${name}@rawr-hq`,
    marketplaceIdentity: "rawr-hq",
    name,
    installed: true,
    enabled: provider === "codex" ? null : enabled,
    version: "fixture",
    root: `/tmp/${provider}-home/plugins/${name}`,
  });
}

function file(path: string, bytes: Uint8Array) {
  const relativePath = requireParsed(parseReleaseRelativePath(path));
  return Object.freeze({
    path: relativePath,
    mode: 0o644,
    contentDigest: contentDigest(bytes),
    byteLength: bytes.byteLength,
  });
}

function expectedBytes(pluginId: PluginId, path: string): Uint8Array {
  if (path === ".codex-plugin/plugin.json") {
    return encoder.encode(`{"name":"${pluginId}","provider":"codex"}\n`);
  }
  if (path === ".claude-plugin/plugin.json") {
    return encoder.encode(`{"name":"${pluginId}","provider":"claude"}\n`);
  }
  if (path === `skills/${pluginId}/references/guide.md`) {
    return encoder.encode(`Reference for ${pluginId}\n`);
  }
  return encoder.encode(`# ${pluginId}\n`);
}

function requirePluginId(input: string): PluginId {
  const parsed = parsePluginId(input);
  if (!parsed.ok) throw new Error(`Invalid fixture plugin ID: ${input}`);
  return parsed.value;
}

function requireOwnershipIdentity(input: string) {
  const parsed = parseOwnershipIdentity(input);
  if (!parsed.ok) throw new Error(`Invalid fixture ownership identity: ${input}`);
  return parsed.value;
}

function requireParsed<Value>(
  result: Readonly<{ ok: true; value: Value }> | Readonly<{ ok: false }>
): Value {
  if (!result.ok) throw new Error("Invalid provider fixture identity");
  return result.value;
}

function failure(
  provider: ProviderTarget["provider"],
  operation: NativeAgentProviderFailure["operation"],
  commandPhase: NativeAgentProviderFailure["commandPhase"],
  detail: string,
  reason: NativeAgentProviderFailure["reason"] = "CommandFailed"
): NativeAgentProviderFailure {
  return {
    _tag: "NativeAgentProviderFailure",
    provider,
    operation,
    reason,
    commandPhase,
    detail,
  };
}
