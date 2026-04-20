import { module } from "./module";
import { inferProjectFromCwd, inferStatusFromPath } from "../../shared/normalization";
import { detectSessionFormat, getClaudeSessionMetadata, getCodexSessionMetadata } from "../../shared/normalization";
import { looksLikePath, stem } from "../../shared/path-utils";
import type { DiscoveredSessionFile } from "../../shared/schemas";
import type { ResolveResult, SessionFilters, SessionListItem } from "./schemas";
import { discoverSessions } from "./discovery";

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

function matchesListFilters(session: SessionListItem, filters: SessionFilters): boolean {
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

const list = module.list.handler(async ({ context, input }) => {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const discovered = await discoverSessions(context.sourceRuntime, context.indexRuntime, {
    source: input.source,
    limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
    project: filters.project,
  });

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
  const filtered = sessions.filter((session) => matchesListFilters(session, filters));
  return { sessions: limit ? filtered.slice(0, limit) : filtered };
});

const resolve = module.resolve.handler(async ({ context, input, errors }) => {
  const clean = input.session.trim();
  let resolvedPath: string | null = null;
  let status: ResolveResult["resolved"]["status"] | undefined;

  if (looksLikePath(clean)) {
    if (await context.sourceRuntime.statFile({ path: clean })) resolvedPath = clean;
  } else {
    const candidates = await discoverSessions(context.sourceRuntime, context.indexRuntime, { source: input.source });
    const claude = candidates.find((candidate) => candidate.source === "claude" && stem(candidate.path) === clean);
    const codex = candidates.find((candidate) => candidate.source === "codex" && stem(candidate.path).toLowerCase().includes(clean.toLowerCase()));
    const candidate = claude ?? codex;
    if (candidate) {
      resolvedPath = candidate.path;
      status = candidate.status;
    }
  }

  if (!resolvedPath) {
    const message = `Session not found: ${input.session}`;
    throw errors.SESSION_NOT_FOUND({
      message,
      data: { message },
    });
  }

  const format = await detectSessionFormat(context.sourceRuntime, resolvedPath);
  const stat = await context.sourceRuntime.statFile({ path: resolvedPath });
  if (!stat) {
    const message = `Session not found: ${input.session}`;
    throw errors.SESSION_NOT_FOUND({
      message,
      data: { message },
    });
  }

  if (format === "claude") {
    return {
      resolved: { path: resolvedPath, source: "claude" as const, modified: new Date(stat.modifiedMs).toISOString(), sizeBytes: stat.sizeBytes },
      metadata: await getClaudeSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }
  if (format === "codex") {
    return {
      resolved: { path: resolvedPath, source: "codex" as const, status: status ?? inferStatusFromPath(resolvedPath), modified: new Date(stat.modifiedMs).toISOString(), sizeBytes: stat.sizeBytes },
      metadata: await getCodexSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }

  const message = `Unknown session format: ${resolvedPath}`;
  throw errors.SESSION_NOT_FOUND({
    message,
    data: { message },
  });
});

export const router = module.router({
  list,
  resolve,
});
