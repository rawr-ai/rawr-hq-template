import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectSessionFormat,
  extractClaudeMessages,
  extractCodexMessages,
  getClaudeSessionMetadata,
  getCodexSessionMetadata,
  inferProjectFromCwd,
  inferStatusFromPath,
} from "./parsers";
import { readFirstJsonlObject, readJsonlObjects } from "./jsonl";
import { tryOpenSqliteDb, type SqliteDb } from "./sqlite";
import type {
  CodexSessionFile,
  ExtractOptions,
  ExtractedSession,
  ResolveResult,
  SessionFilters,
  SessionListItem,
  SessionSourceFilter,
  SessionSourceRuntime,
  SessionStatus,
} from "./types";

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

type CodexSource = {
  dir: string;
  status: SessionStatus;
};

type NewestFileCandidate = {
  filePath: string;
  projectName: string;
  modifiedMs: number;
  sizeBytes: number;
};

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export function getClaudeProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function getCodexHomeDirs(): string[] {
  const homes: string[] = [];
  const envHome = process.env.CODEX_HOME;
  if (envHome && envHome.trim()) homes.push(envHome.trim());
  homes.push(path.join(os.homedir(), ".codex"));
  homes.push(path.join(os.homedir(), ".codex-rawr"));
  return [...new Set(homes)];
}

export function defaultSessionIndexPath(): string {
  const override = process.env.RAWR_SESSION_INDEX_PATH;
  if (override && override.trim()) return override.trim();
  return path.join(os.homedir(), ".cache", "rawr-session-index.sqlite");
}

function parsePositiveNumberEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function codexDiscoveryMaxAgeMs(status: SessionStatus): number {
  const shared = parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_MAX_AGE_MS");
  if (shared != null) return shared;
  if (status === "live") {
    return parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS") ?? DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
  }
  return parsePositiveNumberEnv("RAWR_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS") ?? DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS;
}

async function collectCodexSources(): Promise<CodexSource[]> {
  const out: CodexSource[] = [];
  for (const home of getCodexHomeDirs()) {
    const sources: CodexSource[] = [
      { dir: path.join(home, "sessions"), status: "live" },
      { dir: path.join(home, "archived_sessions"), status: "archived" },
    ];
    for (const src of sources) {
      if (await pathExists(src.dir)) out.push(src);
    }
  }
  return out;
}

async function* walkFiles(rootDir: string): AsyncGenerator<string> {
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let dirents: Dirent[];
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of dirents) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(abs);
      else if (ent.isFile()) yield abs;
    }
  }
}

function pushNewestBounded<T extends { modifiedMs: number }>(files: T[], next: T, max: number): void {
  if (files.length < max) {
    files.push(next);
    if (files.length === max) files.sort((a, b) => a.modifiedMs - b.modifiedMs);
    return;
  }
  if (!files.length || next.modifiedMs <= files[0]!.modifiedMs) return;
  files[0] = next;
  files.sort((a, b) => a.modifiedMs - b.modifiedMs);
}

async function listCodexSessionFilesFromFilesystem(sources: CodexSource[], max: number): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    for await (const f of walkFiles(src.dir)) {
      if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
      if (seen.has(f)) continue;
      seen.add(f);
      const stat = await fs.stat(f).catch(() => null);
      if (!stat) continue;
      const next: CodexSessionFile = {
        filePath: f,
        status: src.status,
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
      if (max) pushNewestBounded(out, next, max);
      else out.push(next);
    }
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return out;
}

function initializeDiscoveryDb(db: SqliteDb): void {
  db.query(`
    CREATE TABLE IF NOT EXISTS codex_file_index (
      file_path TEXT PRIMARY KEY,
      root_dir TEXT NOT NULL,
      status TEXT NOT NULL,
      modified_ms REAL NOT NULL,
      size_bytes INTEGER NOT NULL
    )
  `).run();
  db.query("CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified ON codex_file_index(root_dir, modified_ms DESC)").run();
  db.query(`
    CREATE TABLE IF NOT EXISTS codex_root_scan_state (
      root_dir TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      root_mtime_ms REAL NOT NULL,
      scanned_at_ms REAL NOT NULL
    )
  `).run();
}

function shouldRefreshRoot(
  row: { root_mtime_ms?: number; scanned_at_ms?: number } | null,
  rootMtimeMs: number,
  nowMs: number,
  status: SessionStatus,
): boolean {
  if (!row) return true;
  if (Number(row.root_mtime_ms) !== Number(rootMtimeMs)) return true;
  const scannedAtMs = Number(row.scanned_at_ms);
  if (!Number.isFinite(scannedAtMs)) return true;
  return nowMs - scannedAtMs >= codexDiscoveryMaxAgeMs(status);
}

async function refreshRootIndex(db: SqliteDb, src: CodexSource, rootMtimeMs: number, nowMs: number): Promise<void> {
  const rows: CodexSessionFile[] = [];
  for await (const f of walkFiles(src.dir)) {
    if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
    const stat = await fs.stat(f).catch(() => null);
    if (!stat) continue;
    rows.push({
      filePath: f,
      status: src.status,
      modifiedMs: stat.mtimeMs,
      sizeBytes: stat.size,
    });
  }

  db.query("BEGIN IMMEDIATE").run();
  try {
    db.query("DELETE FROM codex_file_index WHERE root_dir=?").run([src.dir]);
    const insertRow = db.query(
      "INSERT OR REPLACE INTO codex_file_index(file_path, root_dir, status, modified_ms, size_bytes) VALUES (?,?,?,?,?)",
    );
    for (const row of rows) {
      insertRow.run([row.filePath, src.dir, row.status, row.modifiedMs, row.sizeBytes]);
    }
    db.query("INSERT OR REPLACE INTO codex_root_scan_state(root_dir, status, root_mtime_ms, scanned_at_ms) VALUES (?,?,?,?)").run([
      src.dir,
      src.status,
      rootMtimeMs,
      nowMs,
    ]);
    db.query("COMMIT").run();
  } catch (err) {
    db.query("ROLLBACK").run();
    throw err;
  }
}

function queryIndexedRows(db: SqliteDb, sources: CodexSource[], max: number): CodexSessionFile[] {
  if (!sources.length) return [];
  const placeholders = sources.map(() => "?").join(",");
  const queryLimit = max > 0 ? max * 8 + 32 : 0;
  const sql =
    queryLimit > 0
      ? `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC LIMIT ?`
      : `SELECT file_path, status, modified_ms, size_bytes FROM codex_file_index WHERE root_dir IN (${placeholders}) ORDER BY modified_ms DESC`;
  const params: unknown[] = sources.map((src) => src.dir);
  if (queryLimit > 0) params.push(queryLimit);
  const rows = db.query(sql).all?.(params) ?? [];
  return rows.map((row: any) => ({
    filePath: String(row.file_path ?? ""),
    status: row.status === "archived" ? "archived" : "live",
    modifiedMs: Number(row.modified_ms ?? 0),
    sizeBytes: Number(row.size_bytes ?? 0),
  }));
}

async function validateIndexedRows(db: SqliteDb, rows: CodexSessionFile[], max: number): Promise<CodexSessionFile[]> {
  const out: CodexSessionFile[] = [];
  for (const row of rows) {
    const stat = await fs.stat(row.filePath).catch(() => null);
    if (!stat) {
      db.query("DELETE FROM codex_file_index WHERE file_path=?").run([row.filePath]);
      continue;
    }
    if (Number(stat.mtimeMs) !== Number(row.modifiedMs) || Number(stat.size) !== Number(row.sizeBytes)) {
      row.modifiedMs = stat.mtimeMs;
      row.sizeBytes = stat.size;
      db.query("UPDATE codex_file_index SET modified_ms=?, size_bytes=? WHERE file_path=?").run([row.modifiedMs, row.sizeBytes, row.filePath]);
    }
    out.push(row);
  }
  out.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return max > 0 ? out.slice(0, max) : out;
}

async function listCodexSessionFilesFromIndex(sources: CodexSource[], max: number): Promise<CodexSessionFile[] | null> {
  const db = await tryOpenSqliteDb(defaultSessionIndexPath());
  if (!db) return null;
  initializeDiscoveryDb(db);

  const nowMs = Date.now();
  let fullRefreshDone = false;

  try {
    for (const src of sources) {
      const rootStat = await fs.stat(src.dir).catch(() => null);
      if (!rootStat) {
        db.query("DELETE FROM codex_file_index WHERE root_dir=?").run([src.dir]);
        db.query("DELETE FROM codex_root_scan_state WHERE root_dir=?").run([src.dir]);
        continue;
      }
      if (!max) {
        await refreshRootIndex(db, src, rootStat.mtimeMs, nowMs);
        fullRefreshDone = true;
        continue;
      }
      const rootRow = db
        .query("SELECT root_mtime_ms, scanned_at_ms FROM codex_root_scan_state WHERE root_dir=?")
        .get([src.dir]) as { root_mtime_ms?: number; scanned_at_ms?: number } | null;
      if (shouldRefreshRoot(rootRow, rootStat.mtimeMs, nowMs, src.status)) {
        await refreshRootIndex(db, src, rootStat.mtimeMs, nowMs);
      }
    }

    let rows = queryIndexedRows(db, sources, max);
    let validated = await validateIndexedRows(db, rows, max);
    if (max > 0 && validated.length < max && !fullRefreshDone) {
      for (const src of sources) {
        const rootStat = await fs.stat(src.dir).catch(() => null);
        if (rootStat) await refreshRootIndex(db, src, rootStat.mtimeMs, Date.now());
      }
      rows = queryIndexedRows(db, sources, max);
      validated = await validateIndexedRows(db, rows, max);
    }
    return validated;
  } finally {
    db.close();
  }
}

export async function listCodexSessionFiles(limit?: number): Promise<CodexSessionFile[]> {
  const max = typeof limit === "number" && limit > 0 ? limit : 0;
  const sources = await collectCodexSources();
  if (!sources.length) return [];
  const indexed = await listCodexSessionFilesFromIndex(sources, max);
  if (indexed) return indexed;
  return listCodexSessionFilesFromFilesystem(sources, max);
}

function parseDatetimeBestEffort(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function sessionWithinWindow(modifiedIso: string, since?: string, until?: string): boolean {
  if (!since && !until) return true;
  const dt = parseDatetimeBestEffort(modifiedIso);
  if (!dt) return false;
  const sinceDt = since ? parseDatetimeBestEffort(since) : null;
  const untilDt = until ? parseDatetimeBestEffort(until) : null;
  if (sinceDt && dt < sinceDt) return false;
  if (untilDt && dt > untilDt) return false;
  return true;
}

function containsFilter(value: string | undefined, needle: string | undefined): boolean {
  if (!needle) return true;
  if (!value) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\") || input.startsWith("~");
}

function modelMatches(model: string | undefined, filter: string | undefined): boolean {
  if (!filter) return true;
  if (!model) return false;
  return model.toLowerCase().includes(filter.toLowerCase());
}

function guessClaudeProjectName(dirName: string): string {
  if (dirName.startsWith("-Users-")) {
    const parts = dirName.split("-");
    if (parts.length > 3) return parts.at(-1) || parts.at(-2) || dirName;
  }
  return dirName;
}

function hasMetadataFilters(filters: SessionFilters): boolean {
  return Boolean(filters.project || filters.cwdContains || filters.branch || filters.model || filters.since || filters.until);
}

export async function listSessions(input: {
  source: SessionSourceFilter;
  limit?: number;
  filters?: SessionFilters;
}): Promise<SessionListItem[]> {
  const limit = input.limit && input.limit > 0 ? input.limit : 0;
  const filters = input.filters ?? {};
  const sourceLimit = limit > 0 && !hasMetadataFilters(filters) ? limit : 0;
  const sessions: SessionListItem[] = [];

  if (input.source === "claude" || input.source === "all") {
    const candidates: NewestFileCandidate[] = [];
    const projectsDir = getClaudeProjectsDir();
    if (await pathExists(projectsDir)) {
      const projectFilter = filters.project ? String(filters.project).trim() : "";
      const absoluteProjectDir =
        projectFilter && looksLikePath(projectFilter) ? path.resolve(projectFilter.replace(/^~\//, `${process.env.HOME ?? ""}/`)) : null;
      const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory() || d.name.startsWith(".")) continue;
        const projectDir = absoluteProjectDir ?? path.join(projectsDir, d.name);
        if (!absoluteProjectDir && projectFilter) {
          const guessed = guessClaudeProjectName(d.name);
          if (!containsFilter(d.name, projectFilter) && !containsFilter(guessed, projectFilter)) continue;
        }
        if (absoluteProjectDir && projectDir !== absoluteProjectDir) continue;
        const files = await fs.readdir(projectDir).catch(() => []);
        for (const f of files) {
          if (!f.endsWith(".jsonl") || f.startsWith("agent-")) continue;
          const abs = path.join(projectDir, f);
          const stat = await fs.stat(abs).catch(() => null);
          if (!stat) continue;
          const next = { filePath: abs, projectName: guessClaudeProjectName(d.name), modifiedMs: stat.mtimeMs, sizeBytes: stat.size };
          if (sourceLimit) pushNewestBounded(candidates, next, sourceLimit);
          else candidates.push(next);
        }
        if (absoluteProjectDir) break;
      }
      candidates.sort((a, b) => b.modifiedMs - a.modifiedMs);
      for (const candidate of candidates) {
        const meta = await getClaudeSessionMetadata(candidate.filePath);
        sessions.push({
          path: candidate.filePath,
          sessionId: meta.sessionId,
          source: "claude",
          title: meta.summaries?.length ? meta.summaries.at(-1) : meta.firstUserMessage,
          project: candidate.projectName,
          cwd: meta.cwd,
          gitBranch: meta.gitBranch,
          model: meta.model,
          modelProvider: meta.modelProvider,
          modified: new Date(candidate.modifiedMs).toISOString(),
          started: meta.timestamp,
          sizeKb: Math.floor(candidate.sizeBytes / 1024),
        });
      }
    }
  }

  if (input.source === "codex" || input.source === "all") {
    for (const f of await listCodexSessionFiles(sourceLimit || undefined)) {
      const meta = await getCodexSessionMetadata(f.filePath);
      sessions.push({
        path: f.filePath,
        sessionId: meta.sessionId,
        source: "codex",
        status: f.status,
        title: meta.firstUserMessage,
        project: inferProjectFromCwd(meta.cwd),
        cwd: meta.cwd,
        gitBranch: meta.gitBranch,
        model: meta.model,
        modelProvider: meta.modelProvider,
        modelContextWindow: meta.modelContextWindow,
        modified: new Date(f.modifiedMs).toISOString(),
        started: meta.timestamp,
        sizeKb: Math.floor(f.sizeBytes / 1024),
      });
    }
  }

  sessions.sort((a, b) => (a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0));
  const filtered = sessions.filter((s) => {
    if (filters.project) {
      const projectFilter = String(filters.project).trim();
      if (projectFilter) {
        if (looksLikePath(projectFilter)) {
          if (s.source !== "claude") return false;
        } else if (!containsFilter(s.project, projectFilter)) return false;
      }
    }
    if (!containsFilter(s.cwd, filters.cwdContains)) return false;
    if (!containsFilter(s.gitBranch, filters.branch)) return false;
    if (!modelMatches(s.model, filters.model)) return false;
    if (!sessionWithinWindow(s.modified, filters.since, filters.until)) return false;
    return true;
  });

  return limit ? filtered.slice(0, limit) : filtered;
}

export async function resolveSession(input: {
  session: string;
  source?: SessionSourceFilter;
}): Promise<ResolveResult | { error: string }> {
  const source = input.source ?? "all";
  const clean = input.session.trim();
  let resolvedPath: string | null = null;
  let status: ResolveResult["resolved"]["status"] | undefined;

  if (looksLikePath(clean) || clean.endsWith(".jsonl") || clean.endsWith(".json")) {
    const p = path.resolve(clean);
    if (await pathExists(p)) resolvedPath = p;
    else return { error: `Session not found: ${input.session}` };
  } else {
    if (source === "claude" || source === "all") {
      const projectsDir = getClaudeProjectsDir();
      if (await pathExists(projectsDir)) {
        const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (!d.isDirectory()) continue;
          const candidate = path.join(projectsDir, d.name, `${clean}.jsonl`);
          if (await pathExists(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }
      }
    }
    if (!resolvedPath && (source === "codex" || source === "all")) {
      const needle = clean.toLowerCase();
      for (const f of await listCodexSessionFiles()) {
        if (path.basename(f.filePath).toLowerCase().includes(needle)) {
          resolvedPath = f.filePath;
          status = f.status;
          break;
        }
      }
    }
  }

  if (!resolvedPath) return { error: `Session not found: ${input.session}` };
  const fmt = await detectSessionFormat(resolvedPath);
  const stat = await fs.stat(resolvedPath);
  if (fmt === "claude") {
    return {
      resolved: { path: resolvedPath, source: "claude", modified: new Date(stat.mtimeMs).toISOString(), sizeBytes: stat.size },
      metadata: await getClaudeSessionMetadata(resolvedPath),
    };
  }
  return {
    resolved: {
      path: resolvedPath,
      source: "codex",
      status: status ?? inferStatusFromPath(resolvedPath),
      modified: new Date(stat.mtimeMs).toISOString(),
      sizeBytes: stat.size,
    },
    metadata: await getCodexSessionMetadata(resolvedPath),
  };
}

export async function extractSession(input: {
  filePath: string;
  options: ExtractOptions;
}): Promise<ExtractedSession | { error: string }> {
  const fmt = await detectSessionFormat(input.filePath);
  if (fmt !== "claude" && fmt !== "codex") return { error: `Unknown session format: ${input.filePath}` };

  const messagesRaw =
    fmt === "claude"
      ? await extractClaudeMessages(input.filePath, input.options.roles, input.options.includeTools)
      : await extractCodexMessages(input.filePath, input.options.roles, input.options.includeTools);

  let messages = messagesRaw;
  if (input.options.dedupe) {
    const seen = new Set<string>();
    messages = messages.filter((message) => {
      const key = `${message.role}:${message.content.slice(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (input.options.offset > 0) messages = messages.slice(input.options.offset);
  if (input.options.maxMessages > 0) messages = messages.slice(0, input.options.maxMessages);

  if (fmt === "claude") {
    const meta = await getClaudeSessionMetadata(input.filePath);
    return {
      source: "claude",
      sessionId: meta.sessionId,
      file: input.filePath,
      cwd: meta.cwd,
      gitBranch: meta.gitBranch,
      model: meta.model,
      modelProvider: meta.modelProvider,
      started: meta.timestamp,
      messageCount: messages.length,
      messages,
    };
  }

  const meta = await getCodexSessionMetadata(input.filePath);
  return {
    source: "codex",
    sessionId: meta.sessionId,
    file: input.filePath,
    cwd: meta.cwd,
    gitBranch: meta.gitBranch,
    model: meta.model,
    modelProvider: meta.modelProvider,
    modelContextWindow: meta.modelContextWindow,
    sessionMetaCount: meta.sessionMetaCount,
    cwdFirst: meta.cwdFirst,
    gitBranchFirst: meta.gitBranchFirst,
    started: meta.timestamp,
    messageCount: messages.length,
    messages,
  };
}

export function createNodeSessionSourceRuntime(): SessionSourceRuntime {
  return {
    async discoverSessions(input) {
      const out: Array<{
        path: string;
        source: "claude" | "codex";
        status?: SessionStatus;
        project?: string;
        modifiedMs: number;
        sizeBytes: number;
      }> = [];
      if (input.source === "claude" || input.source === "all") {
        for (const candidate of await this.listClaudeSessionCandidates({ project: input.project, limit: input.limit })) {
          out.push({
            path: candidate.filePath,
            source: "claude",
            project: candidate.projectName,
            modifiedMs: candidate.modifiedMs,
            sizeBytes: candidate.sizeBytes,
          });
        }
      }
      if (input.source === "codex" || input.source === "all") {
        for (const candidate of await this.listCodexSessionCandidates({ limit: input.limit })) {
          out.push({
            path: candidate.filePath,
            source: "codex",
            status: candidate.status,
            modifiedMs: candidate.modifiedMs,
            sizeBytes: candidate.sizeBytes,
          });
        }
      }
      out.sort((a, b) => b.modifiedMs - a.modifiedMs);
      return input.limit && input.limit > 0 ? out.slice(0, input.limit) : out;
    },
    async resolveExistingPath(input) {
      const expanded = input.startsWith("~/") ? path.join(os.homedir(), input.slice(2)) : input;
      const resolved = path.resolve(expanded);
      return (await pathExists(resolved)) ? resolved : null;
    },
    async statFile(input) {
      const filePath = typeof input === "string" ? input : input.path;
      const stat = await fs.stat(filePath);
      return {
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
    },
    readJsonlObjects: (input) => readJsonlObjects(typeof input === "string" ? input : input.path),
    readFirstJsonlObject: (input) => readFirstJsonlObject(typeof input === "string" ? input : input.path),
    async listClaudeSessionCandidates(input) {
      const candidates: NewestFileCandidate[] = [];
      const projectsDir = getClaudeProjectsDir();
      if (!(await pathExists(projectsDir))) return [];
      const projectFilter = input.project ? String(input.project).trim() : "";
      const absoluteProjectDir =
        projectFilter && looksLikePath(projectFilter) ? path.resolve(projectFilter.replace(/^~\//, `${process.env.HOME ?? ""}/`)) : null;
      const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory() || d.name.startsWith(".")) continue;
        const projectDir = absoluteProjectDir ?? path.join(projectsDir, d.name);
        if (!absoluteProjectDir && projectFilter) {
          const guessed = guessClaudeProjectName(d.name);
          if (!containsFilter(d.name, projectFilter) && !containsFilter(guessed, projectFilter)) continue;
        }
        if (absoluteProjectDir && projectDir !== absoluteProjectDir) continue;
        const files = await fs.readdir(projectDir).catch(() => []);
        for (const f of files) {
          if (!f.endsWith(".jsonl") || f.startsWith("agent-")) continue;
          const abs = path.join(projectDir, f);
          const stat = await fs.stat(abs).catch(() => null);
          if (!stat) continue;
          const next = {
            filePath: abs,
            projectName: guessClaudeProjectName(d.name),
            modifiedMs: stat.mtimeMs,
            sizeBytes: stat.size,
          };
          if (input.limit) pushNewestBounded(candidates, next, input.limit);
          else candidates.push(next);
        }
        if (absoluteProjectDir) break;
      }
      return candidates.sort((a, b) => b.modifiedMs - a.modifiedMs);
    },
    async listCodexSessionCandidates(input) {
      return listCodexSessionFiles(input.limit);
    },
    async findClaudeSessionPathById(sessionId) {
      const projectsDir = getClaudeProjectsDir();
      if (!(await pathExists(projectsDir))) return null;
      const dirs = await fs.readdir(projectsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        const candidate = path.join(projectsDir, d.name, `${sessionId}.jsonl`);
        if (await pathExists(candidate)) return candidate;
      }
      return null;
    },
    async findCodexSessionCandidateByNeedle(needle) {
      const normalizedNeedle = needle.toLowerCase();
      for (const f of await listCodexSessionFiles()) {
        if (path.basename(f.filePath).toLowerCase().includes(normalizedNeedle)) return f;
      }
      return null;
    },
    detectSessionFormat: ({ filePath }) => detectSessionFormat(filePath),
    listSessions,
    resolveSession,
    extractSession,
    listCodexSessionFiles: (input) => listCodexSessionFiles(input?.limit),
  };
}
