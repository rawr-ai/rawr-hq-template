import { detectSessionFormat, getClaudeSessionMetadata, getCodexSessionMetadata, inferProjectFromCwd, inferStatusFromPath } from "../../shared/normalization";
import { looksLikePath, stem } from "../../shared/path-utils";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { DiscoveredSessionFile } from "../../shared/schemas";
import type { ResolveResult, SessionFilters, SessionListItem, SessionSourceFilter } from "./schemas";

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

function hasMetadataFilters(filters: SessionFilters): boolean {
  return Boolean(filters.project || filters.cwdContains || filters.branch || filters.model || filters.since || filters.until);
}

function toModifiedIso(candidate: Pick<DiscoveredSessionFile, "modifiedMs">): string {
  return new Date(candidate.modifiedMs).toISOString();
}

export function createRepository(runtime: SessionSourceRuntime) {
  return {
    async list(input: { source: SessionSourceFilter; limit: number; filters?: SessionFilters }): Promise<SessionListItem[]> {
      const limit = input.limit > 0 ? input.limit : 0;
      const filters = input.filters ?? {};
      const discovered = await runtime.discoverSessions({
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
      const filtered = sessions.filter((session) => {
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
      });
      return limit ? filtered.slice(0, limit) : filtered;
    },
    async resolve(input: { session: string; source: SessionSourceFilter }): Promise<ResolveResult | { error: string }> {
      const clean = input.session.trim();
      let resolvedPath: string | null = null;
      let status: ResolveResult["resolved"]["status"] | undefined;

      if (looksLikePath(clean)) {
        if (await runtime.statFile({ path: clean })) resolvedPath = clean;
      } else {
        const candidates = await runtime.discoverSessions({ source: input.source });
        const claude = candidates.find((candidate) => candidate.source === "claude" && stem(candidate.path) === clean);
        const codex = candidates.find((candidate) => candidate.source === "codex" && stem(candidate.path).toLowerCase().includes(clean.toLowerCase()));
        const candidate = claude ?? codex;
        if (candidate) {
          resolvedPath = candidate.path;
          status = candidate.status;
        }
      }

      if (!resolvedPath) return { error: `Session not found: ${input.session}` };
      const format = await detectSessionFormat(runtime, resolvedPath);
      const stat = await runtime.statFile({ path: resolvedPath });
      if (!stat) return { error: `Session not found: ${input.session}` };

      if (format === "claude") {
        return {
          resolved: { path: resolvedPath, source: "claude" as const, modified: new Date(stat.modifiedMs).toISOString(), sizeBytes: stat.sizeBytes },
          metadata: await getClaudeSessionMetadata(runtime, resolvedPath),
        };
      }
      if (format === "codex") {
        return {
          resolved: { path: resolvedPath, source: "codex" as const, status: status ?? inferStatusFromPath(resolvedPath), modified: new Date(stat.modifiedMs).toISOString(), sizeBytes: stat.sizeBytes },
          metadata: await getCodexSessionMetadata(runtime, resolvedPath),
        };
      }
      return { error: `Unknown session format: ${resolvedPath}` };
    },
  };
}
