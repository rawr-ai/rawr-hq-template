import type { SessionListItem } from "../../../model/dto";
import {
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  hasMetadataFilters,
  inferProjectFromCwd,
  matchesSessionFilters,
  type SessionFilters,
  toModifiedIso,
} from "../../../model/policy";
import { discoverCatalogSessions } from "../model/policy";
import { module } from "../module";

/** Lists normalized sessions through catalog-owned discovery and filtering policy. */
export const list = module.list.handler(async ({ context, input }) => {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters: SessionFilters = input.filters ?? {};
  const discoveryLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;
  const discovered = await discoverCatalogSessions(
    context.sourceRuntime,
    context.codexDiscoveryStore,
    {
      source: input.source,
      limit: discoveryLimit,
      project: filters.project,
    }
  );

  const sessions: SessionListItem[] = [];
  for (const candidate of discovered) {
    if (candidate.source === "claude") {
      const meta = await getClaudeSessionMetadata(context.sourceRuntime, candidate.path);
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
      const meta = await getCodexSessionMetadata(context.sourceRuntime, candidate.path);
      sessions.push({
        path: candidate.path,
        sessionId: meta.sessionId,
        source: "codex",
        status: candidate.status,
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
  const filtered = sessions.filter((session) => matchesSessionFilters(session, filters));
  return { sessions: limit ? filtered.slice(0, limit) : filtered };
});
