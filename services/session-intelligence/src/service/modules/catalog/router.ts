/**
 * session-intelligence: catalog module.
 *
 * This router owns "enumerate sessions" as a service capability. The service,
 * not projections, defines discovery policy (sources, refresh strategy, and
 * filtering semantics) so that the CLI/web remain orchestration and rendering.
 */
import { module } from "./module";
import {
  detectSessionFormat,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  inferProjectFromCwd,
  inferStatusFromPath,
} from "../../shared/normalization";
import { looksLikePath, stem } from "../../shared/path-utils";
import type {
  DiscoveredSessionFile,
  SessionListItem,
  SessionStatus,
} from "../../shared/entities";
import { discoverCodexSessionsFromIndexOrNull } from "../../shared/repositories/codex-indexed-discovery-repository";
import {
  hasMetadataFilters,
  matchesListFilters,
  toModifiedIso,
  type SessionFilters,
} from "./helpers/session-filters";

const list = module.list.handler(async ({ context, input }) => {
  const limit = input.limit > 0 ? input.limit : 0;
  const filters: SessionFilters = input.filters ?? {};
  const discovered = await (async () => {
    // Catalog owns discovery policy: merge sources deterministically, with Codex
    // optionally accelerated by a service-owned index.
    if (input.source === "claude") {
      return context.sourceRuntime.discoverSessions({
        source: "claude",
        limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
        project: filters.project,
      });
    }

    const out: DiscoveredSessionFile[] = [];
    if (input.source === "all") {
      out.push(
        ...await context.sourceRuntime.discoverSessions({
          source: "claude",
          limit: limit > 0 && !hasMetadataFilters(filters) ? limit : undefined,
          project: filters.project,
        }),
      );
    }

    const codexLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;
    const indexed = await discoverCodexSessionsFromIndexOrNull(
      context.sourceRuntime,
      context.indexRuntime,
      codexLimit,
    );
    if (indexed) out.push(...indexed);
    else {
      out.push(
        ...await context.sourceRuntime.discoverSessions({
          source: "codex",
          limit: codexLimit || undefined,
        }),
      );
    }

    out.sort((a, b) => b.modifiedMs - a.modifiedMs);
    return limit ? out.slice(0, limit) : out;
  })();

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

  sessions.sort((a, b) =>
    a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0,
  );
  const filtered = sessions.filter((session) => matchesListFilters(session, filters));
  return { sessions: limit ? filtered.slice(0, limit) : filtered };
});

const resolve = module.resolve.handler(async ({ context, input, errors }) => {
  const clean = input.session.trim();
  let resolvedPath: string | null = null;
  let status: SessionStatus | undefined;

  if (looksLikePath(clean)) {
    if (await context.sourceRuntime.statFile({ path: clean })) resolvedPath = clean;
  } else {
    const candidates = await (async (): Promise<DiscoveredSessionFile[]> => {
      if (input.source === "claude") return context.sourceRuntime.discoverSessions({ source: "claude" });

      const out: DiscoveredSessionFile[] = [];
      if (input.source === "all") {
        out.push(...await context.sourceRuntime.discoverSessions({ source: "claude" }));
      }

      const indexed = await discoverCodexSessionsFromIndexOrNull(
        context.sourceRuntime,
        context.indexRuntime,
        0,
      );
      if (indexed) out.push(...indexed);
      else out.push(...await context.sourceRuntime.discoverSessions({ source: "codex" }));

      out.sort((a, b) => b.modifiedMs - a.modifiedMs);
      return out;
    })();

    const claude = candidates.find(
      (candidate) => candidate.source === "claude" && stem(candidate.path) === clean,
    );
    const codex = candidates.find(
      (candidate) =>
        candidate.source === "codex" &&
        stem(candidate.path).toLowerCase().includes(clean.toLowerCase()),
    );
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
      resolved: {
        path: resolvedPath,
        source: "claude" as const,
        modified: new Date(stat.modifiedMs).toISOString(),
        sizeBytes: stat.sizeBytes,
      },
      metadata: await getClaudeSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }
  if (format === "codex") {
    return {
      resolved: {
        path: resolvedPath,
        source: "codex" as const,
        status: status ?? inferStatusFromPath(resolvedPath),
        modified: new Date(stat.modifiedMs).toISOString(),
        sizeBytes: stat.sizeBytes,
      },
      metadata: await getCodexSessionMetadata(context.sourceRuntime, resolvedPath),
    };
  }

  const message = `Unknown session format: ${resolvedPath}`;
  throw errors.UNKNOWN_SESSION_FORMAT({
    message,
    data: { message },
  });
});

export const router = module.router({
  list,
  resolve,
});
