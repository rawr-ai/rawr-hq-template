import { module } from "./module";
import {
  detectSessionFormat,
  extractClaudeMessages,
  extractCodexMessages,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  inferProjectFromCwd,
  inferStatusFromPath,
} from "../../shared/normalization";
import { looksLikePath } from "../../shared/path-utils";
import type {
  DiscoveredSessionFile,
  RoleFilter,
  SessionListItem,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "../../shared/entities";
import { discoverSessions } from "../catalog/helpers/discovery";
import { searchSessionsByMetadata } from "./helpers/metadata-search";
import { clearCachedSearchText, readCachedSearchText, writeCachedSearchText } from "./repositories/search-cache-repository";
import { buildSearchText, rolesKey } from "./helpers/text";
import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";

type SearchHit = SessionListItem & {
  matchCount: number;
  matchSnippet: string;
};

type SearchSessionFilters = {
  project?: string;
  cwdContains?: string;
  branch?: string;
  model?: string;
  since?: string;
  until?: string;
};

type SearchSessionSelection = {
  source: SessionSourceFilter;
  filters?: SearchSessionFilters;
  limit: number;
};

function asSearchSource(source: SessionSource | "unknown"): SessionSource {
  return source === "claude" ? "claude" : "codex";
}

function parseDatetimeBestEffort(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function containsFilter(value: string | undefined, needle: string | undefined): boolean {
  return !needle || Boolean(value?.toLowerCase().includes(needle.toLowerCase()));
}

function sessionWithinWindow(modifiedIso: string, since?: string, until?: string): boolean {
  const dt = parseDatetimeBestEffort(modifiedIso);
  if (!dt) return false;
  const sinceDt = since ? parseDatetimeBestEffort(since) : null;
  const untilDt = until ? parseDatetimeBestEffort(until) : null;
  if (sinceDt && dt < sinceDt) return false;
  if (untilDt && dt > untilDt) return false;
  return true;
}

function hasMetadataFilters(filters: SearchSessionFilters): boolean {
  return Boolean(filters.project || filters.cwdContains || filters.branch || filters.model || filters.since || filters.until);
}

function toModifiedIso(candidate: Pick<DiscoveredSessionFile, "modifiedMs">): string {
  return new Date(candidate.modifiedMs).toISOString();
}

function matchesSearchFilters(session: SessionListItem, filters: SearchSessionFilters): boolean {
  if (filters.project) {
    const projectFilter = filters.project.trim();
    if (projectFilter && looksLikePath(projectFilter) && session.source !== "claude") return false;
    if (projectFilter && !looksLikePath(projectFilter) && !containsFilter(session.project, projectFilter)) return false;
  }
  if (!containsFilter(session.cwd, filters.cwdContains)) return false;
  if (!containsFilter(session.gitBranch, filters.branch)) return false;
  if (!containsFilter(session.model, filters.model)) return false;
  if ((filters.since || filters.until) && !sessionWithinWindow(session.modified, filters.since, filters.until)) return false;
  return true;
}

async function loadSearchSessions(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  input: SearchSessionSelection,
): Promise<SessionListItem[]> {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const discovered = await discoverSessions(runtime, indexRuntime, {
    source: input.source,
    limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
    project: filters.project,
  });

  const sessions: SessionListItem[] = [];
  for (const candidate of discovered) {
    if (candidate.source === "claude") {
      const meta = await getClaudeSessionMetadata(runtime, candidate.path);
      sessions.push({
        path: candidate.path,
        sessionId: meta.sessionId,
        source: "claude",
        title: meta.summaries?.at(-1) ?? meta.firstUserMessage,
        project: candidate.project,
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modified: toModifiedIso(candidate),
        started: meta.timestamp,
        sizeKb: Math.floor(candidate.sizeBytes / 1024),
      });
    } else {
      const meta = await getCodexSessionMetadata(runtime, candidate.path);
      sessions.push({
        path: candidate.path,
        sessionId: meta.sessionId,
        source: "codex",
        status: candidate.status as SessionStatus | undefined,
        title: meta.firstUserMessage,
        project: candidate.project ?? inferProjectFromCwd(meta.cwd),
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modelContextWindow: meta.modelContextWindow,
        modified: toModifiedIso(candidate),
        started: meta.timestamp,
        sizeKb: Math.floor(candidate.sizeBytes / 1024),
      });
    }
  }

  sessions.sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0));
  const filtered = sessions.filter((session) => matchesSearchFilters(session, filters));
  return limit ? filtered.slice(0, limit) : filtered;
}

async function getSearchTextUncached(runtime: SessionSourceRuntime, filePath: string, source: SessionSource, roles: RoleFilter[], includeTools: boolean): Promise<string> {
  const messages = source === "claude"
    ? await extractClaudeMessages(runtime, filePath, roles, includeTools)
    : await extractCodexMessages(runtime, filePath, roles, includeTools);
  return buildSearchText(messages);
}

async function getSearchTextCached(input: {
  sourceRuntime: SessionSourceRuntime;
  indexRuntime: SessionIndexRuntime;
  filePath: string;
  source: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
}): Promise<string> {
  const stat = await input.sourceRuntime.statFile({ path: input.filePath });
  if (!stat) return "";
  const key = { indexPath: input.indexPath, path: input.filePath, rolesKey: rolesKey(input.roles), includeTools: input.includeTools };
  const cached = await readCachedSearchText(input.indexRuntime, key);
  if (cached && cached.modifiedMs === stat.modifiedMs && cached.sizeBytes === stat.sizeBytes) return cached.content;
  const content = await getSearchTextUncached(input.sourceRuntime, input.filePath, input.source, input.roles, input.includeTools);
  await writeCachedSearchText(input.indexRuntime, { ...key, modifiedMs: stat.modifiedMs, sizeBytes: stat.sizeBytes, content });
  return content;
}

const metadata = module.metadata.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, input);
  return { hits: searchSessionsByMetadata(sessions, input.needle, input.limit) };
});

const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    const rx = new RegExp(input.pattern, input.ignoreCase ? "gmi" : "gm");
    const hits: SearchHit[] = [];
    const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, input);
    const indexPath = context.indexRuntime.defaultIndexPath();
    for (const session of sessions) {
      const source = asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
      const text = input.useIndex
        ? await getSearchTextCached({
            sourceRuntime: context.sourceRuntime,
            indexRuntime: context.indexRuntime,
            filePath: session.path,
            source,
            roles: input.roles,
            includeTools: input.includeTools,
            indexPath,
          })
        : await getSearchTextUncached(context.sourceRuntime, session.path, source, input.roles, input.includeTools);
      const matches = [...text.matchAll(rx)];
      if (!matches.length) continue;
      const start = Math.max(0, matches[0]!.index! - Math.floor(input.snippetLen / 2));
      hits.push({
        ...session,
        matchCount: matches.length,
        matchSnippet: text.slice(start, start + input.snippetLen).replaceAll("\n", "\\n"),
      });
    }
    hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
    return { hits: input.maxMatches > 0 ? hits.slice(0, input.maxMatches) : hits };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw errors.INVALID_REGEX({
        message: err.message,
        data: { message: err.message },
      });
    }
    throw err;
  }
});

const reindex = module.reindex.handler(async ({ context, input }) => {
  const sessions = await loadSearchSessions(context.sourceRuntime, context.indexRuntime, input);
  const total = sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  const indexPath = context.indexRuntime.defaultIndexPath();
  let indexed = 0;
  for (const session of sessions.slice(0, limit)) {
    const source = session.source ?? asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
    await getSearchTextCached({
      sourceRuntime: context.sourceRuntime,
      indexRuntime: context.indexRuntime,
      filePath: session.path,
      source,
      roles: input.roles,
      includeTools: input.includeTools,
      indexPath,
    });
    indexed += 1;
  }
  return { indexed, total };
});

const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  const indexPath = context.indexRuntime.defaultIndexPath();
  if (input.path) await clearCachedSearchText(context.indexRuntime, { indexPath, path: input.path });
  else await context.indexRuntime.removeIndex({ indexPath });
  return { cleared: true };
});

export const router = module.router({
  metadata,
  content,
  reindex,
  clearIndex,
});
