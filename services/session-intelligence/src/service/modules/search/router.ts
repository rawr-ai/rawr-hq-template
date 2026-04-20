import { module } from "./module";
import type { SessionSource } from "../../shared/schemas";
import { searchSessionsByMetadata } from "./metadata-search";
import type { SearchRepository } from "./repository";
import type { ReindexResult, RoleFilter, SearchHit, SessionListItem } from "./schemas";
import { buildSearchText, rolesKey } from "./text";

function asSearchSource(source: SessionSource | "unknown"): SessionSource {
  return source === "claude" ? "claude" : "codex";
}

async function getSearchTextUncached(repo: SearchRepository, filePath: string, source: SessionSource, roles: RoleFilter[], includeTools: boolean): Promise<string> {
  return buildSearchText(await repo.extractMessages(filePath, source, roles, includeTools));
}

async function getSearchTextCached(input: {
  repo: SearchRepository;
  filePath: string;
  source: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
  indexPath: string;
}): Promise<string> {
  const stat = await input.repo.statFile(input.filePath);
  if (!stat) return "";
  const key = { indexPath: input.indexPath, path: input.filePath, rolesKey: rolesKey(input.roles), includeTools: input.includeTools };
  const cached = await input.repo.readCachedSearchText(key);
  if (cached && cached.modifiedMs === stat.modifiedMs && cached.sizeBytes === stat.sizeBytes) return cached.content;
  const content = await getSearchTextUncached(input.repo, input.filePath, input.source, input.roles, input.includeTools);
  await input.repo.writeCachedSearchText({ ...key, modifiedMs: stat.modifiedMs, sizeBytes: stat.sizeBytes, content });
  return content;
}

async function searchSessionsByContent(input: {
  repo: SearchRepository;
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
    const source = asSearchSource(await input.repo.detectFormat(session.path));
    const text = input.useIndex
      ? await getSearchTextCached({ repo: input.repo, filePath: session.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath })
      : await getSearchTextUncached(input.repo, session.path, source, input.roles, input.includeTools);
    const matches = [...text.matchAll(rx)];
    if (!matches.length) continue;
    const start = Math.max(0, matches[0]!.index! - Math.floor(input.snippetLen / 2));
    hits.push({ ...session, matchCount: matches.length, matchSnippet: text.slice(start, start + input.snippetLen).replaceAll("\n", "\\n") });
  }
  hits.sort((a, b) => (a.matchCount === b.matchCount ? (a.modified < b.modified ? 1 : -1) : b.matchCount - a.matchCount));
  return input.maxMatches > 0 ? hits.slice(0, input.maxMatches) : hits;
}

async function reindexSessions(input: {
  repo: SearchRepository;
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
    const source = session.source ?? asSearchSource(await input.repo.detectFormat(session.path));
    await getSearchTextCached({ repo: input.repo, filePath: session.path, source, roles: input.roles, includeTools: input.includeTools, indexPath: input.indexPath });
    indexed += 1;
  }
  return { indexed, total };
}

const metadata = module.metadata.handler(async ({ context, input }) => {
  return { hits: searchSessionsByMetadata(input.sessions, input.needle, input.limit) };
});

const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    return {
      hits: await searchSessionsByContent({
        repo: context.repo,
        sessions: input.sessions,
        pattern: input.pattern,
        ignoreCase: input.ignoreCase,
        maxMatches: input.maxMatches,
        snippetLen: input.snippetLen,
        roles: input.roles,
        includeTools: input.includeTools,
        useIndex: input.useIndex,
        indexPath: input.indexPath,
      }),
    };
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
  return reindexSessions({
    repo: context.repo,
    sessions: input.sessions,
    roles: input.roles,
    includeTools: input.includeTools,
    indexPath: input.indexPath,
    limit: input.limit,
  });
});

const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  if (input.path) await context.repo.clearCachedSearchText({ indexPath: input.indexPath, path: input.path });
  else await context.repo.removeIndex(input.indexPath);
  return { cleared: true };
});

export const router = module.router({
  metadata,
  content,
  reindex,
  clearIndex,
});
