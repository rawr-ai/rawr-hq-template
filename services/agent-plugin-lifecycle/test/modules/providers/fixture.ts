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

import type { CurrentMainSelectionReader } from "../../../src/service/model/dependencies/current-main";
import type { CurrentMainSelectionResult } from "../../../src/service/model/dto/current-main-selection";
import type {
  ProviderStatusRequest,
  ProviderSyncRequest,
  ProviderTarget,
  ProviderTestRequest,
} from "../../../src/service/modules/providers/model/dto/provider-lifecycle";
import type {
  SelectedContent,
  SelectedContentResolution,
} from "../../../src/service/modules/providers/model/dto/selected-content";
import type { SelectedContentResolver } from "../../../src/service/modules/providers/model/ports/selected-content";
import type { PluginId } from "../../../src/service/shared/release";
import {
  contentDigest,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseOwnershipIdentity,
  parsePayloadDigest,
  parsePluginId,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseReleaseRelativePath,
  parseReleaseSetDigest,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";

const encoder = new TextEncoder();
const COMMIT = requireParsed(parseGitCommitId("1".repeat(40)));
const TREE = requireParsed(parseGitTreeId("2".repeat(40)));
const REPOSITORY_IDENTITY = requireParsed(parseRepositoryIdentity("github:rawr-ai/rawr-hq"));
const CONTENT_AUTHORITY = requireParsed(parseContentAuthority("rawr-hq"));
const RELEASE_INPUT_PATH = requireParsed(parseReleaseRelativePath("release-input.json"));
const PLUGIN_ROOT = requireParsed(parseReleaseRelativePath("plugins/agents"));
const RELEASE_INPUT_DIGEST = requireParsed(parseReleaseInputDigest(`ri1_${"3".repeat(64)}`));
const RELEASE_SET_DIGEST = requireParsed(parseReleaseSetDigest(`rs1_${"4".repeat(64)}`));
const REPOSITORY_URL = "https://github.com/rawr-ai/rawr-hq.git";
const SOURCE_REF = "refs/tags/agent-plugins-v1";
const NATIVE_SOURCE_REVISION = COMMIT;

export const channelRequest: ProviderSyncRequest & ProviderStatusRequest = {
  channel: "current-main",
  locator: {
    workspacePath: "/tmp/personal-content",
    expectedRepositoryIdentity: REPOSITORY_IDENTITY,
  },
  targets: [{ provider: "codex", home: "/tmp/codex-home" }],
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
    sparsePaths: [".claude-plugin", ".codex-plugin", "plugins/agents"],
  },
  selectionKind: SelectedContent["selectionKind"] = "complete-set"
): SelectedContent {
  const common = Object.freeze({
    contentAuthority: CONTENT_AUTHORITY,
    repositoryIdentity: REPOSITORY_IDENTITY,
    sourceCommit: COMMIT,
    sourceTree: TREE,
    releaseInputDigest: RELEASE_INPUT_DIGEST,
    marketplace: Object.freeze({ identity: "rawr-hq", source }),
    members: Object.freeze(pluginIds.map((pluginId) => member(pluginId))),
  });
  return selectionKind === "targeted"
    ? Object.freeze({ ...common, selectionKind, releaseSetDigest: null })
    : Object.freeze({ ...common, selectionKind, releaseSetDigest: RELEASE_SET_DIGEST });
}

export function selectedContentWithAliases(
  pluginIds: readonly string[],
  aliasesByPlugin: Readonly<Record<string, readonly string[]>>,
  source: NativeMarketplaceSource = {
    kind: "git",
    repositoryUrl: REPOSITORY_URL,
    revision: NATIVE_SOURCE_REVISION,
    sparsePaths: [".claude-plugin", ".codex-plugin", "plugins/agents"],
  },
  selectionKind: SelectedContent["selectionKind"] = "complete-set"
): SelectedContent {
  const selected = selectedContent(pluginIds, source, selectionKind);
  return Object.freeze({
    ...selected,
    members: Object.freeze(
      pluginIds.map((pluginId) => member(pluginId, aliasesByPlugin[pluginId] ?? []))
    ),
  });
}

export function member(pluginName: string, aliases: readonly string[] = []) {
  const pluginId = requirePluginId(pluginName);
  const codexManifest = encoder.encode(`{"name":"${pluginId}","provider":"codex"}\n`);
  const claudeManifest = encoder.encode(`{"name":"${pluginId}","provider":"claude"}\n`);
  const skill = encoder.encode(`# ${pluginId}\n`);
  const reference = encoder.encode(`Reference for ${pluginId}\n`);
  return Object.freeze({
    pluginId,
    aliases: Object.freeze(aliases.map(requireOwnershipIdentity)),
    payloadDigest: requireParsed(
      parsePayloadDigest(`pd1_${(pluginName === "cognition" ? "a" : "c").repeat(64)}`)
    ),
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

export function createCurrentMainReader(
  override?: CurrentMainSelectionResult
): CurrentMainSelectionReader {
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
        releaseInputDigest: RELEASE_INPUT_DIGEST,
      },
    } satisfies CurrentMainSelectionResult);
  return Object.freeze({ resolve: () => Effect.succeed(result) });
}

export class FakeSelectedContentResolver implements SelectedContentResolver {
  readonly channelCalls: SelectedContent[] = [];
  readonly workspaceCalls: SelectedContent[] = [];
  private readonly channelResults: SelectedContent[];
  private readonly workspaceResults: SelectedContent[];

  constructor(
    input: Readonly<{
      channel?: readonly SelectedContent[];
      workspace?: readonly SelectedContent[];
    }>
  ) {
    this.channelResults = [...(input.channel ?? [])];
    this.workspaceResults = [...(input.workspace ?? input.channel ?? [])];
  }

  resolveChannel(): Effect.Effect<SelectedContentResolution> {
    return Effect.sync(() => {
      const content = this.next(this.channelResults, this.channelCalls);
      return { kind: "Selected", content };
    });
  }

  resolveWorkspace(): Effect.Effect<SelectedContentResolution> {
    return Effect.sync(() => {
      const content = this.next(this.workspaceResults, this.workspaceCalls);
      return { kind: "Selected", content };
    });
  }

  private next(queue: SelectedContent[], calls: SelectedContent[]): SelectedContent {
    const content = queue.length > 1 ? queue.shift()! : queue[0];
    if (content === undefined) throw new Error("No selected-content fixture remains");
    calls.push(content);
    return content;
  }
}

interface FakeNativeSessionInput {
  readonly target: ProviderTarget;
  readonly content: SelectedContent;
  readonly marketplace?: "exact" | "stale" | "unrelated" | "ambiguous" | "absent";
  readonly installed?: readonly string[];
  readonly disabled?: readonly string[];
  readonly omitted?: readonly string[];
  readonly staleFiles?: readonly string[];
  readonly probeOverride?: () => Effect.Effect<NativeProviderCapabilities>;
}

class FakeNativeSessionBase<const Provider extends ProviderTarget["provider"]> {
  readonly provider: Provider;
  readonly executablePath: string;
  readonly home: string;
  readonly calls: string[] = [];
  readonly fileReadRequests: NativeProviderPluginFilesReadInput[] = [];
  inventoryFailureCount = 0;
  installFailure: "before" | "after" | null = null;
  marketplaceRemoveFailure: "before" | "after" | null = null;
  installBadFiles = false;
  protected inventoryValue: NativeProviderInventory;
  private readonly content: SelectedContent;
  private readonly files = new Map<string, Uint8Array>();
  private readonly probeOverride?: () => Effect.Effect<NativeProviderCapabilities>;

  constructor(provider: Provider, input: FakeNativeSessionInput) {
    if (input.target.provider !== provider) {
      throw new Error(`Fake ${provider} session received a ${input.target.provider} target`);
    }
    this.provider = provider;
    this.home = input.target.home;
    this.executablePath = `/opt/${this.provider}`;
    this.content = input.content;
    this.probeOverride = input.probeOverride;
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

  probe(): Effect.Effect<NativeProviderCapabilities> {
    if (this.probeOverride !== undefined) return this.probeOverride();
    return Effect.succeed(
      this.provider === "codex"
        ? {
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
          }
        : {
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
          }
    );
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
      return Object.freeze({
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
      });
    });
  }

  addMarketplace(source: NativeMarketplaceSource) {
    return Effect.sync(() => {
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
      this.calls.push("mutate:marketplace-remove");
      if (this.marketplaceRemoveFailure === "before") {
        return Effect.fail(
          failure(this.provider, "marketplace-remove", "not-started", "fixture removal refusal")
        );
      }
      this.inventoryValue = { ...this.inventoryValue, marketplaces: [] };
      if (this.marketplaceRemoveFailure === "after") {
        this.marketplaceRemoveFailure = null;
        this.inventoryFailureCount = 1;
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
      if (this.installFailure === "after") {
        this.installFailure = null;
        this.inventoryFailureCount = 1;
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

  constructor(sessions: readonly FakeNativeSession[]) {
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
        acquireFakeSession("codex", codexSessions, home),
    });
    this.claude = Object.freeze({
      acquire: ({ home }: Readonly<{ home: string }>) =>
        acquireFakeSession("claude", claudeSessions, home),
    });
  }
}

function acquireFakeSession<Session extends Readonly<{ home: string }>>(
  provider: ProviderTarget["provider"],
  sessions: readonly Session[],
  home: string
): Effect.Effect<Session, NativeAgentProviderFailure> {
  const session = sessions.find((candidate) => candidate.home === home);
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
