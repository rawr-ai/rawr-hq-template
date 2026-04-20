import type { RoleFilter, SessionSource } from "../../../shared/entities";
import type { SessionIndexRuntime } from "../../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../../shared/ports/session-source-runtime";
import { extractClaudeMessages, extractCodexMessages } from "../../../shared/normalization";
import { buildSearchText, rolesKey } from "./search-text";
import { readCachedSearchText, writeCachedSearchText } from "../repositories/search-cache-repository";

export async function getSearchTextUncached(
  runtime: SessionSourceRuntime,
  filePath: string,
  source: SessionSource,
  roles: RoleFilter[],
  includeTools: boolean,
): Promise<string> {
  const messages =
    source === "claude"
      ? await extractClaudeMessages(runtime, filePath, roles, includeTools)
      : await extractCodexMessages(runtime, filePath, roles, includeTools);
  return buildSearchText(messages);
}

export async function getSearchTextCached(input: {
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

  const key = {
    indexPath: input.indexPath,
    path: input.filePath,
    rolesKey: rolesKey(input.roles),
    includeTools: input.includeTools,
  };

  const cached = await readCachedSearchText(input.indexRuntime, key);
  if (cached && cached.modifiedMs === stat.modifiedMs && cached.sizeBytes === stat.sizeBytes) {
    return cached.content;
  }

  const content = await getSearchTextUncached(
    input.sourceRuntime,
    input.filePath,
    input.source,
    input.roles,
    input.includeTools,
  );

  await writeCachedSearchText(input.indexRuntime, {
    ...key,
    modifiedMs: stat.modifiedMs,
    sizeBytes: stat.sizeBytes,
    content,
  });

  return content;
}
