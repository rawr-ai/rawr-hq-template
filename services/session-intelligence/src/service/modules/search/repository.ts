import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages } from "../../shared/normalization";
import type { SessionMessage, SessionSource } from "../../shared/schemas";
import type { MetadataSearchHit, ReindexResult, RoleFilter, SearchHit, SessionListItem } from "./schemas";

function metadataMatchScore(session: SessionListItem, needle: string): number {
  const normalizedNeedle = needle.toLowerCase();
  const fields: Array<keyof SessionListItem | "status"> = ["title", "cwd", "project", "gitBranch", "model", "path", "sessionId", "status", "modelProvider"];
  let score = 0;
  for (const field of fields) {
    const raw = session[field as keyof SessionListItem];
    if (raw != null && String(raw).toLowerCase().includes(normalizedNeedle)) {
      score += field === "title" || field === "cwd" || field === "path" || field === "sessionId" ? 2 : 1;
    }
  }
  return score;
}

function searchSessionsByMetadata(sessions: SessionListItem[], needle: string, limit: number): MetadataSearchHit[] {
  const trimmed = needle.trim();
  if (!trimmed) return [];
  const ranked = sessions
    .map((session) => ({ ...session, matchScore: metadataMatchScore(session, trimmed) }))
    .filter((session) => session.matchScore > 0);
  ranked.sort((a, b) => (a.matchScore === b.matchScore ? (a.modified < b.modified ? 1 : -1) : b.matchScore - a.matchScore));
  return limit > 0 ? ranked.slice(0, limit) : ranked;
}

function buildSearchText(messages: Array<Pick<SessionMessage, "role" | "content">>): string {
  return messages.map((message) => `${message.role === "user" ? "U" : message.role === "assistant" ? "A" : "T"}: ${message.content}`).join("\n\n");
}

async function getSearchTextUncached(runtime: SessionSourceRuntime, filePath: string, source: SessionSource, roles: RoleFilter[], includeTools: boolean): Promise<string> {
  const messages = source === "claude" ? await extractClaudeMessages(runtime, filePath, roles, includeTools) : await extractCodexMessages(runtime, filePath, roles, includeTools);
  return buildSearchText(messages);
}

function rolesKey(roles: RoleFilter[]): string {
  return [...new Set(roles)].sort().join(",");
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
  const cached = await input.indexRuntime.getSearchText(key);
  if (cached && cached.modifiedMs === stat.modifiedMs && cached.sizeBytes === stat.sizeBytes) return cached.content;
  const content = await getSearchTextUncached(input.sourceRuntime, input.filePath, input.source, input.roles, input.includeTools);
  await input.indexRuntime.setSearchText({ ...key, modifiedMs: stat.modifiedMs, sizeBytes: stat.sizeBytes, content });
  return content;
}

async function searchSessionsByContent(input: {
  sourceRuntime: SessionSourceRuntime;
  indexRuntime: SessionIndexRuntime;
  sessions: SessionListItem[];
  pattern: string;
  ignoreCase: boolean;
  maxMatches: number;
  snippetLen: number;
  roles: RoleFilter[];
  includeTools: boolean;
  useIndex: boolean;
  indexPath: string;
}): Promise<SearchHit[]> {
  const rx = new RegExp(input.pattern, input.ignoreCase ? "gmi" : "gm");
  const hits: SearchHit[] = [];
  for (const session of input.sessions) {
    const source = (await detectSessionFormat(input.sourceRuntime, session.path)) as SessionSource;
    const text = input.useIndex
      ? await getSearchTextCached({ sourceRuntime: input.sourceRuntime, indexRuntime: input.indexRuntime, filePath: session.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath })
      : await getSearchTextUncached(input.sourceRuntime, session.path, source, input.roles, input.includeTools);
    const matches = [...text.matchAll(rx)];
    if (!matches.length) continue;
    const start = Math.max(0, matches[0]!.index! - Math.floor(input.snippetLen / 2));
    hits.push({ ...session, matchCount: matches.length, matchSnippet: text.slice(start, start + input.snippetLen).replaceAll("\n", "\\n") });
  }
  hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
  return input.maxMatches > 0 ? hits.slice(0, input.maxMatches) : hits;
}

async function reindexSessions(input: {
  sourceRuntime: SessionSourceRuntime;
  indexRuntime: SessionIndexRuntime;
  sessions: Array<{ path: string; source?: SessionSource }>;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
  limit: number;
}): Promise<ReindexResult> {
  const total = input.sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  let indexed = 0;
  for (const session of input.sessions.slice(0, limit)) {
    const source = session.source ?? ((await detectSessionFormat(input.sourceRuntime, session.path)) as SessionSource);
    await getSearchTextCached({ sourceRuntime: input.sourceRuntime, indexRuntime: input.indexRuntime, filePath: session.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath });
    indexed += 1;
  }
  return { indexed, total };
}

export function createRepository(sourceRuntime: SessionSourceRuntime, indexRuntime: SessionIndexRuntime) {
  return {
    async metadata(input: { sessions: SessionListItem[]; needle: string; limit: number }) {
      return searchSessionsByMetadata(input.sessions, input.needle, input.limit);
    },
    async content(input: {
      sessions: SessionListItem[];
      pattern: string;
      ignoreCase: boolean;
      maxMatches: number;
      snippetLen: number;
      roles: RoleFilter[];
      includeTools: boolean;
      useIndex: boolean;
      indexPath: string;
    }) {
      return searchSessionsByContent({
        sourceRuntime,
        indexRuntime,
        sessions: input.sessions,
        pattern: input.pattern,
        ignoreCase: input.ignoreCase,
        maxMatches: input.maxMatches,
        snippetLen: input.snippetLen,
        roles: input.roles,
        includeTools: input.includeTools,
        useIndex: input.useIndex,
        indexPath: input.indexPath,
      });
    },
    async reindex(input: {
      sessions: Array<{ path: string; source?: SessionSource }>;
      roles: RoleFilter[];
      includeTools: boolean;
      indexPath: string;
      limit: number;
    }) {
      return reindexSessions({
        sourceRuntime,
        indexRuntime,
        sessions: input.sessions,
        roles: input.roles,
        includeTools: input.includeTools,
        indexPath: input.indexPath,
        limit: input.limit,
      });
    },
    async clearIndex(input: { indexPath: string; path?: string }) {
      await indexRuntime.clearSearchText(input);
    },
  };
}
