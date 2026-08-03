import type { RoleFilter, SessionSource } from "../../../../model/dto";
import { extractClaudeMessages, extractCodexMessages } from "../../../../model/policy";
import type { SearchTextStore, SessionSourceRuntime } from "../../../../model/ports";
import { buildSearchText, rolesKey } from "./search-text";

/** Builds searchable transcript text without consulting the service index. */
export async function getSearchTextUncached(
  runtime: SessionSourceRuntime,
  filePath: string,
  source: SessionSource,
  roles: RoleFilter[],
  includeTools: boolean
): Promise<string> {
  const messages =
    source === "claude"
      ? await extractClaudeMessages(runtime, filePath, roles, includeTools)
      : await extractCodexMessages(runtime, filePath, roles, includeTools);
  return buildSearchText(messages);
}

/** Reads fresh indexed search text or rebuilds and persists it on cache miss. */
export async function getSearchTextCached(input: {
  sourceRuntime: SessionSourceRuntime;
  searchTextStore: SearchTextStore;
  filePath: string;
  source: SessionSource;
  roles: RoleFilter[];
  includeTools: boolean;
}): Promise<string> {
  const stat = await input.sourceRuntime.statFile({ path: input.filePath });
  if (!stat) return "";

  const key = {
    path: input.filePath,
    rolesKey: rolesKey(input.roles),
    includeTools: input.includeTools,
  };

  const cached = await input.searchTextStore.read(key);
  if (cached && cached.modifiedMs === stat.modifiedMs && cached.sizeBytes === stat.sizeBytes) {
    return cached.content;
  }

  const content = await getSearchTextUncached(
    input.sourceRuntime,
    input.filePath,
    input.source,
    input.roles,
    input.includeTools
  );

  await input.searchTextStore.write({
    ...key,
    modifiedMs: stat.modifiedMs,
    sizeBytes: stat.sizeBytes,
    content,
  });

  return content;
}
