import type { SessionIndexRuntime } from "./ports/session-index-runtime";
import type { SessionSourceRuntime } from "./ports/session-source-runtime";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages } from "./normalization";
import type { MetadataSearchHit, RoleFilter, SearchHit, SessionListItem, SessionMessage, SessionSource } from "./schemas";

function metadataMatchScore(session: SessionListItem, needle: string): number {
  const n = needle.toLowerCase();
  const fields: Array<keyof SessionListItem | "status"> = ["title", "cwd", "project", "gitBranch", "model", "path", "sessionId", "status", "modelProvider"];
  let score = 0;
  for (const f of fields) {
    const raw = session[f as keyof SessionListItem];
    if (raw != null && String(raw).toLowerCase().includes(n)) score += f === "title" || f === "cwd" || f === "path" || f === "sessionId" ? 2 : 1;
  }
  return score;
}

export function searchSessionsByMetadata(sessions: SessionListItem[], needle: string, limit: number): MetadataSearchHit[] {
  const trimmed = needle.trim();
  if (!trimmed) return [];
  const ranked = sessions.map((s) => ({ ...s, matchScore: metadataMatchScore(s, trimmed) })).filter((s) => s.matchScore > 0);
  ranked.sort((a, b) => (a.matchScore === b.matchScore ? (a.modified < b.modified ? 1 : -1) : b.matchScore - a.matchScore));
  return limit > 0 ? ranked.slice(0, limit) : ranked;
}

function buildSearchText(messages: Array<Pick<SessionMessage, "role" | "content">>): string {
  return messages.map((m) => `${m.role === "user" ? "U" : m.role === "assistant" ? "A" : "T"}: ${m.content}`).join("\n\n");
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

export async function searchSessionsByContent(input: {
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
  for (const s of input.sessions) {
    const source = (await detectSessionFormat(input.sourceRuntime, s.path)) as SessionSource;
    const text = input.useIndex
      ? await getSearchTextCached({ sourceRuntime: input.sourceRuntime, indexRuntime: input.indexRuntime, filePath: s.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath })
      : await getSearchTextUncached(input.sourceRuntime, s.path, source, input.roles, input.includeTools);
    const matches = [...text.matchAll(rx)];
    if (!matches.length) continue;
    const start = Math.max(0, matches[0]!.index! - Math.floor(input.snippetLen / 2));
    hits.push({ ...s, matchCount: matches.length, matchSnippet: text.slice(start, start + input.snippetLen).replaceAll("\n", "\\n") });
  }
  hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
  return input.maxMatches > 0 ? hits.slice(0, input.maxMatches) : hits;
}

export async function reindexSessions(input: {
  sourceRuntime: SessionSourceRuntime;
  indexRuntime: SessionIndexRuntime;
  sessions: Array<{ path: string; source?: SessionSource }>;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
  limit: number;
}): Promise<{ indexed: number; total: number }> {
  const total = input.sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  let indexed = 0;
  for (const s of input.sessions.slice(0, limit)) {
    const source = s.source ?? ((await detectSessionFormat(input.sourceRuntime, s.path)) as SessionSource);
    await getSearchTextCached({ sourceRuntime: input.sourceRuntime, indexRuntime: input.indexRuntime, filePath: s.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath });
    indexed += 1;
  }
  return { indexed, total };
}
