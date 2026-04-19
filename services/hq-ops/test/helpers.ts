import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import { mergeRawrConfigLayers } from "../src/service/modules/config/support";
import type { RawrConfig } from "../src/service/modules/config/model";
import type { JournalSearchRow } from "../src/service/modules/journal/schemas";
import type { JournalEvent, JournalSnippet } from "../src/service/modules/journal/types";
import type { RepoState } from "../src/service/modules/repo-state/model";
import type { SecurityReport } from "../src/service/modules/security/types";
import type { Service } from "../src/service/base";

type ClientOptions = {
  deps?: Partial<Service["Deps"]>;
  repoRoot?: string;
  globalConfig?: RawrConfig | null;
  workspaceConfig?: RawrConfig | null;
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

export type LogEntry = EmbeddedPlaceholderLogEntry;
export type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

function createDefaultConfigStore(options: ClientOptions): NonNullable<Service["Deps"]["configStore"]> {
  const globalConfig = options.globalConfig ?? { version: 1 };
  const workspaceConfig = options.workspaceConfig ?? { version: 1 };
  const globalPath = "/tmp/.rawr/config.json";
  const syncSources = new Set(globalConfig?.sync?.sources?.paths ?? []);

  return {
    async getWorkspaceConfig(repoRoot: string) {
      return {
        config: workspaceConfig,
        path: workspaceConfig ? `${repoRoot}/rawr.config.ts` : null,
        warnings: [],
      };
    },
    async getGlobalConfig() {
      return {
        config: globalConfig,
        path: globalConfig ? globalPath : null,
        warnings: [],
      };
    },
    async getLayeredConfig(repoRoot: string) {
      const global = await this.getGlobalConfig();
      const workspace = await this.getWorkspaceConfig(repoRoot);
      return {
        global,
        workspace,
        merged: mergeRawrConfigLayers({ global: global.config, workspace: workspace.config }),
      };
    },
    async listGlobalSyncSources() {
      return {
        path: globalPath,
        sources: [...syncSources],
      };
    },
    async addGlobalSyncSource(sourcePath: string) {
      syncSources.add(sourcePath);
      return {
        path: globalPath,
        sources: [...syncSources],
      };
    },
    async removeGlobalSyncSource(sourcePath: string) {
      syncSources.delete(sourcePath);
      return {
        path: globalPath,
        sources: [...syncSources],
      };
    },
  };
}

function createDefaultRepoStateStore(): NonNullable<Service["Deps"]["repoStateStore"]> {
  const stateByRepo = new Map<string, RepoState>();

  const getState = (repoRoot: string): RepoState =>
    stateByRepo.get(repoRoot) ?? {
      version: 1,
      plugins: {
        enabled: [],
        lastUpdatedAt: "2026-04-16T00:00:00.000Z",
      },
    };

  const setState = (repoRoot: string, state: RepoState) => {
    stateByRepo.set(repoRoot, state);
    return state;
  };

  return {
    async getStateWithAuthority(repoRoot: string) {
      return {
        state: getState(repoRoot),
        authorityRepoRoot: repoRoot,
      };
    },
    async enablePlugin(repoRoot: string, pluginId: string) {
      const current = getState(repoRoot);
      return setState(repoRoot, {
        ...current,
        plugins: {
          ...current.plugins,
          enabled: [...new Set([...current.plugins.enabled, pluginId])].sort(),
          lastUpdatedAt: "2026-04-16T00:00:01.000Z",
        },
      });
    },
    async disablePlugin(repoRoot: string, pluginId: string) {
      const current = getState(repoRoot);
      return setState(repoRoot, {
        ...current,
        plugins: {
          ...current.plugins,
          enabled: current.plugins.enabled.filter((id) => id !== pluginId),
          lastUpdatedAt: "2026-04-16T00:00:02.000Z",
        },
      });
    },
  };
}

function createDefaultJournalStore(): NonNullable<Service["Deps"]["journalStore"]> {
  const snippetsByRepo = new Map<string, JournalSnippet[]>();
  const eventsByRepo = new Map<string, JournalEvent[]>();

  const listSnippets = (repoRoot: string) => snippetsByRepo.get(repoRoot) ?? [];
  const toSearchRow = (snippet: JournalSnippet, score?: number): JournalSearchRow => ({
    id: snippet.id,
    ts: snippet.ts,
    kind: snippet.kind,
    title: snippet.title,
    preview: snippet.preview,
    tags: snippet.tags,
    ...(snippet.sourceEventId ? { sourceEventId: snippet.sourceEventId } : {}),
    ...(typeof score === "number" ? { score } : {}),
  });

  return {
    async writeEvent(repoRoot: string, event: JournalEvent) {
      eventsByRepo.set(repoRoot, [...(eventsByRepo.get(repoRoot) ?? []), event]);
      return { path: `${repoRoot}/.rawr/journal/events/${event.id}.json` };
    },
    async writeSnippet(repoRoot: string, snippet: JournalSnippet) {
      snippetsByRepo.set(repoRoot, [...listSnippets(repoRoot), snippet]);
      return { path: `${repoRoot}/.rawr/journal/snippets/${snippet.id}.json` };
    },
    async getSnippet(repoRoot: string, id: string) {
      return {
        snippet: listSnippets(repoRoot).find((snippet) => snippet.id === id) ?? null,
      };
    },
    async tailSnippets(repoRoot: string, limit: number) {
      return {
        snippets: listSnippets(repoRoot)
          .slice()
          .sort((a, b) => b.ts.localeCompare(a.ts))
          .slice(0, limit)
          .map((snippet) => toSearchRow(snippet)),
      };
    },
    async searchSnippets(repoRoot: string, query: string, limit: number, mode: "fts" | "semantic") {
      const hits = listSnippets(repoRoot)
        .filter((snippet) => `${snippet.title}\n${snippet.body}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map((snippet, index) => toSearchRow(snippet, mode === "semantic" ? 1 - index * 0.1 : undefined));

      return {
        mode,
        snippets: hits,
      };
    },
  };
}

function createDefaultSecurityRuntime(): NonNullable<Service["Deps"]["securityRuntime"]> {
  const emptyReport = (repoRoot: string, mode: SecurityReport["mode"]): SecurityReport => ({
    ok: true,
    findings: [],
    summary: "vulns=0, untrusted=0, secrets=0",
    timestamp: "2026-04-16T00:00:00.000Z",
    mode,
    meta: { repoRoot },
  });

  return {
    async securityCheck(repoRoot: string, mode) {
      return {
        ...emptyReport(repoRoot, mode),
        reportPath: `${repoRoot}/.rawr/security/latest.json`,
      };
    },
    async gateEnable(repoRoot: string, pluginId: string, _riskTolerance, mode) {
      return {
        allowed: true,
        requiresForce: false,
        report: {
          ...emptyReport(repoRoot, mode),
          meta: {
            pluginId,
            repoRoot,
          },
          reportPath: `${repoRoot}/.rawr/security/latest.json`,
        },
      };
    },
    async getSecurityReport(repoRoot: string) {
      return emptyReport(repoRoot, "repo");
    },
  };
}

export function createDeps(options: ClientOptions = {}): Service["Deps"] {
  return {
    logger: createEmbeddedPlaceholderLoggerAdapter({ sink: options.logs }),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: options.analytics }),
    configStore: createDefaultConfigStore(options),
    repoStateStore: createDefaultRepoStateStore(),
    journalStore: createDefaultJournalStore(),
    securityRuntime: createDefaultSecurityRuntime(),
    ...options.deps,
  };
}

export function createClientOptions(options: ClientOptions = {}): CreateClientOptions {
  return {
    deps: createDeps(options),
    scope: {
      repoRoot: options.repoRoot ?? "/tmp/workspace",
    },
    config: {},
  };
}

export function invocation(traceId = "trace-default") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}
