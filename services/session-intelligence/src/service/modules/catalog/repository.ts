import { detectSessionFormat, getClaudeSessionMetadata, getCodexSessionMetadata, inferProjectFromCwd, inferStatusFromPath } from "../../shared/normalization";
import { looksLikePath, stem } from "../../shared/path-utils";
import type { SessionIndexRuntime } from "../../shared/ports/session-index-runtime";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { CodexSessionFile, CodexSessionSource, DiscoveredSessionFile, SessionStatus } from "../../shared/schemas";
import type { ResolveResult, SessionFilters, SessionListItem, SessionSourceFilter } from "./schemas";

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

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

function hasServiceOwnedCodexDiscovery(runtime: SessionSourceRuntime): runtime is SessionSourceRuntime & {
  listCodexSources(): Promise<CodexSessionSource[]>;
  discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]>;
} {
  return typeof runtime.listCodexSources === "function" && typeof runtime.discoverCodexSessionFiles === "function";
}

function codexDiscoveryMaxAgeMs(runtime: SessionSourceRuntime, status: SessionStatus): number | Promise<number> {
  if (typeof runtime.codexDiscoveryMaxAgeMs === "function") return runtime.codexDiscoveryMaxAgeMs({ status });
  return status === "live" ? DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS : DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS;
}

function shouldRefreshRoot(
  row: { root_mtime_ms?: unknown; scanned_at_ms?: unknown } | null,
  rootMtimeMs: number,
  nowMs: number,
  maxAgeMs: number,
): boolean {
  if (!row) return true;
  if (Number(row.root_mtime_ms) !== Number(rootMtimeMs)) return true;
  const scannedAtMs = Number(row.scanned_at_ms);
  if (!Number.isFinite(scannedAtMs)) return true;
  return nowMs - scannedAtMs >= maxAgeMs;
}

/**
 * Creates the Codex discovery-cache schema owned by the catalog module.
 *
 * Roots, freshness, and ordering are catalog policy, so the runtime only
 * provides generic SQL execution against the caller's concrete index resource.
 */
async function initializeDiscoveryIndex(indexRuntime: SessionIndexRuntime, indexPath: string): Promise<void> {
  await indexRuntime.execute({
    indexPath,
    sql: `
      CREATE TABLE IF NOT EXISTS codex_file_index (
        file_path TEXT PRIMARY KEY,
        root_dir TEXT NOT NULL,
        status TEXT NOT NULL,
        modified_ms REAL NOT NULL,
        size_bytes INTEGER NOT NULL
      )
    `,
  });
  await indexRuntime.execute({
    indexPath,
    sql: "CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified ON codex_file_index(root_dir, modified_ms DESC)",
  });
  await indexRuntime.execute({
    indexPath,
    sql: `
      CREATE TABLE IF NOT EXISTS codex_root_scan_state (
        root_dir TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        root_mtime_ms REAL NOT NULL,
        scanned_at_ms REAL NOT NULL
      )
    `,
  });
}

/**
 * Refreshes a Codex root as one replace-all cache coherence unit.
 *
 * Root-scoped replacement prunes deleted or renamed session files without
 * requiring per-file tombstones in the service model.
 */
async function refreshCodexRootIndex(input: {
  runtime: SessionSourceRuntime & { discoverCodexSessionFiles(input: CodexSessionSource): Promise<CodexSessionFile[]> };
  indexRuntime: SessionIndexRuntime;
  indexPath: string;
  source: CodexSessionSource;
  rootMtimeMs: number;
  nowMs: number;
}): Promise<void> {
  const rows = await input.runtime.discoverCodexSessionFiles(input.source);
  await input.indexRuntime.transaction({
    indexPath: input.indexPath,
    statements: [
      { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [input.source.dir] },
      ...rows.map((row) => ({
        sql: "INSERT OR REPLACE INTO codex_file_index(file_path, root_dir, status, modified_ms, size_bytes) VALUES (?,?,?,?,?)",
        params: [row.path, input.source.dir, row.status, row.modifiedMs, row.sizeBytes],
      })),
      {
        sql: "INSERT OR REPLACE INTO codex_root_scan_state(root_dir, status, root_mtime_ms, scanned_at_ms) VALUES (?,?,?,?)",
        params: [input.source.dir, input.source.status, input.rootMtimeMs, input.nowMs],
      },
    ],
  });
}

/**
 * Reads candidate Codex rows from the service-owned discovery cache.
 *
 * Bounded queries intentionally over-fetch because stat validation can prune
 * rows whose files disappeared or changed since the last root scan.
 */
async function queryIndexedCodexRows(indexRuntime: SessionIndexRuntime, indexPath: string, sources: CodexSessionSource[], max: number): Promise<CodexSessionFile[]> {
  if (!sources.length) return [];
  const placeholders = sources.map(() => "?").join(",");
  const queryLimit = max > 0 ? max * 8 + 32 : 0;
  const sql =
    queryLimit > 0
      ? `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC LIMIT ?`
      : `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC`;
  const params: unknown[] = sources.map((source) => source.dir);
  if (queryLimit > 0) params.push(queryLimit);
  const rows = await indexRuntime.query<{
    file_path?: unknown;
    status?: unknown;
    modified_ms?: unknown;
    size_bytes?: unknown;
  }>({ indexPath, sql, params });
  return rows.map((row) => ({
    path: String(row.file_path ?? ""),
    status: row.status === "archived" ? "archived" : "live",
    modifiedMs: Number(row.modified_ms ?? 0),
    sizeBytes: Number(row.size_bytes ?? 0),
  }));
}

async function validateIndexedCodexRows(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  indexPath: string,
  rows: CodexSessionFile[],
  max: number,
): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  for (const row of rows) {
    const stat = await runtime.statFile({ path: row.path });
    if (!stat) {
      await indexRuntime.execute({
        indexPath,
        sql: "DELETE FROM codex_file_index WHERE file_path=?",
        params: [row.path],
      });
      continue;
    }
    if (Number(stat.modifiedMs) !== Number(row.modifiedMs) || Number(stat.sizeBytes) !== Number(row.sizeBytes)) {
      row.modifiedMs = stat.modifiedMs;
      row.sizeBytes = stat.sizeBytes;
      await indexRuntime.execute({
        indexPath,
        sql: "UPDATE codex_file_index SET modified_ms=?, size_bytes=? WHERE file_path=?",
        params: [row.modifiedMs, row.sizeBytes, row.path],
      });
    }
    out.push(row);
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return max > 0 ? out.slice(0, max) : out;
}

/**
 * Discovers Codex sessions through the service-owned discovery index when the
 * concrete source runtime exposes low-level roots and per-root file scans.
 *
 * Simpler runtimes can still fall back to their monolithic discoverSessions
 * implementation without inheriting the catalog cache policy.
 */
async function discoverCodexFromIndex(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  max: number,
): Promise<CodexSessionFile[] | null> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return null;

  const sources = await runtime.listCodexSources();
  if (!sources.length) return [];

  const indexPath = indexRuntime.defaultIndexPath();
  await initializeDiscoveryIndex(indexRuntime, indexPath);

  const nowMs = Date.now();
  let fullRefreshDone = false;
  for (const source of sources) {
    const rootStat = await runtime.statFile({ path: source.dir });
    if (!rootStat) {
      // Missing roots evict file rows and freshness state so removed Codex homes do not leak stale sessions.
      await indexRuntime.transaction({
        indexPath,
        statements: [
          { sql: "DELETE FROM codex_file_index WHERE root_dir=?", params: [source.dir] },
          { sql: "DELETE FROM codex_root_scan_state WHERE root_dir=?", params: [source.dir] },
        ],
      });
      continue;
    }

    if (!max) {
      await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs });
      fullRefreshDone = true;
      continue;
    }

    const rootRows = await indexRuntime.query<{ root_mtime_ms?: unknown; scanned_at_ms?: unknown }>({
      indexPath,
      sql: "SELECT root_mtime_ms, scanned_at_ms FROM codex_root_scan_state WHERE root_dir=?",
      params: [source.dir],
    });
    const maxAgeMs = await codexDiscoveryMaxAgeMs(runtime, source.status);
    if (shouldRefreshRoot(rootRows[0] ?? null, rootStat.modifiedMs, nowMs, maxAgeMs)) {
      await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs });
    }
  }

  let rows = await queryIndexedCodexRows(indexRuntime, indexPath, sources, max);
  let validated = await validateIndexedCodexRows(runtime, indexRuntime, indexPath, rows, max);
  if (max > 0 && validated.length < max && !fullRefreshDone) {
    // Retry from a coherent index when stale rows exhaust the bounded over-fetch window.
    for (const source of sources) {
      const rootStat = await runtime.statFile({ path: source.dir });
      if (rootStat) {
        await refreshCodexRootIndex({ runtime, indexRuntime, indexPath, source, rootMtimeMs: rootStat.modifiedMs, nowMs: Date.now() });
      }
    }
    rows = await queryIndexedCodexRows(indexRuntime, indexPath, sources, max);
    validated = await validateIndexedCodexRows(runtime, indexRuntime, indexPath, rows, max);
  }
  return validated;
}

function codexFileToDiscovered(file: CodexSessionFile): DiscoveredSessionFile {
  return {
    path: file.path,
    source: "codex",
    status: file.status,
    modifiedMs: file.modifiedMs,
    sizeBytes: file.sizeBytes,
  };
}

async function discoverSessions(
  runtime: SessionSourceRuntime,
  indexRuntime: SessionIndexRuntime,
  input: { source: SessionSourceFilter; limit?: number; project?: string },
): Promise<DiscoveredSessionFile[]> {
  if (!hasServiceOwnedCodexDiscovery(runtime)) return runtime.discoverSessions(input);

  const out: DiscoveredSessionFile[] = [];
  if (input.source === "claude" || input.source === "all") {
    out.push(...await runtime.discoverSessions({ source: "claude", limit: input.limit, project: input.project }));
  }
  if (input.source === "codex" || input.source === "all") {
    const indexed = await discoverCodexFromIndex(runtime, indexRuntime, typeof input.limit === "number" && input.limit > 0 ? input.limit : 0);
    if (indexed) out.push(...indexed.map(codexFileToDiscovered));
    else out.push(...await runtime.discoverSessions({ source: "codex", limit: input.limit }));
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return input.limit && input.limit > 0 ? out.slice(0, input.limit) : out;
}

export function createRepository(runtime: SessionSourceRuntime, indexRuntime: SessionIndexRuntime) {
  return {
    async list(input: { source: SessionSourceFilter; limit: number; filters?: SessionFilters }): Promise<SessionListItem[]> {
      const limit = input.limit > 0 ? input.limit : 0;
      const filters = input.filters ?? {};
      const discovered = await discoverSessions(runtime, indexRuntime, {
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
        const candidates = await discoverSessions(runtime, indexRuntime, { source: input.source });
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
