import { module } from "./module";
import { detectSessionFormat, extractClaudeMessages, extractCodexMessages } from "../../shared/normalization";
import type { SessionSource } from "../../shared/schemas";
import { searchSessionsByMetadata } from "./metadata-search";
import type { RoleFilter, SearchHit } from "./schemas";
import { clearCachedSearchText, readCachedSearchText, writeCachedSearchText } from "./cache";
import { buildSearchText, rolesKey } from "./text";
import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";

function asSearchSource(source: SessionSource | "unknown"): SessionSource {
  return source === "claude" ? "claude" : "codex";
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
  return { hits: searchSessionsByMetadata(input.sessions, input.needle, input.limit) };
});

const content = module.content.handler(async ({ context, input, errors }) => {
  try {
    const rx = new RegExp(input.pattern, input.ignoreCase ? "gmi" : "gm");
    const hits: SearchHit[] = [];
    for (const session of input.sessions) {
      const source = asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
      const text = input.useIndex
        ? await getSearchTextCached({
            sourceRuntime: context.sourceRuntime,
            indexRuntime: context.indexRuntime,
            filePath: session.path,
            source,
            roles: input.roles,
            includeTools: input.includeTools,
            indexPath: input.indexPath,
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
  const total = input.sessions.length;
  const limit = input.limit > 0 ? Math.min(input.limit, total) : total;
  let indexed = 0;
  for (const session of input.sessions.slice(0, limit)) {
    const source = session.source ?? asSearchSource(await detectSessionFormat(context.sourceRuntime, session.path));
    await getSearchTextCached({
      sourceRuntime: context.sourceRuntime,
      indexRuntime: context.indexRuntime,
      filePath: session.path,
      source,
      roles: input.roles,
      includeTools: input.includeTools,
      indexPath: input.indexPath,
    });
    indexed += 1;
  }
  return { indexed, total };
});

const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  if (input.path) await clearCachedSearchText(context.indexRuntime, { indexPath: input.indexPath, path: input.path });
  else await context.indexRuntime.removeIndex({ indexPath: input.indexPath });
  return { cleared: true };
});

export const router = module.router({
  metadata,
  content,
  reindex,
  clearIndex,
});
