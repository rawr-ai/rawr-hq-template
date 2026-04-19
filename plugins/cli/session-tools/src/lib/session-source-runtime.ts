import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { DiscoverSessionsInput, SessionSourceRuntime } from "@rawr/session-intelligence/ports/session-source-runtime";
import type { DiscoveredSessionFile, SessionSource, SessionStatus } from "@rawr/session-intelligence/schemas";
import { readJsonlObjects } from "./jsonl";
import {
  codexDiscoveryMaxAgeMs,
  defaultSessionIndexPathSync,
  expandHomePath,
  getClaudeProjectsDir,
  getCodexHomeDirs,
  pathExists,
} from "./session-paths";
import { tryOpenSqliteDb, type SqliteDb } from "./sqlite";

type CodexSource = {
  dir: string;
  status: SessionStatus;
};

type SessionFileCandidate = {
  filePath: string;
  source: SessionSource;
  status?: SessionStatus;
  projectName?: string;
  modifiedMs: number;
  sizeBytes: number;
};

function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, "/");
}

function basename(value: string): string {
  const normalized = normalizePathSeparators(value).replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? normalized;
}

function looksLikePath(input: string): boolean {
  return input.includes("/") || input.includes("\\") || input.endsWith(".jsonl") || input.endsWith(".json") || input.startsWith("~");
}

function guessClaudeProjectName(dirName: string): string {
  if (dirName.startsWith("-Users-")) {
    const parts = dirName.split("-");
    if (parts.length > 3) return parts.at(-1) || parts.at(-2) || dirName;
  }
  return dirName;
}

function containsFilter(value: string | undefined, needle: string | undefined): boolean {
  return !needle || Boolean(value?.toLowerCase().includes(needle.toLowerCase()));
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

async function discoverCodexFromFilesystem(sources: CodexSource[], max: number): Promise<SessionFileCandidate[]> {
  const out: SessionFileCandidate[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    for await (const f of walkFiles(src.dir)) {
      if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
      if (seen.has(f)) continue;
      seen.add(f);
      const stat = await fs.stat(f).catch(() => null);
      if (!stat) continue;
      const next: SessionFileCandidate = {
        filePath: f,
        source: "codex",
        status: src.status,
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
      if (max) pushNewestBounded(out, next, max);
      else out.push(next);
    }
  }
  return out.sort((a, b) => b.modifiedMs - a.modifiedMs);
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
  const rows: SessionFileCandidate[] = [];
  for await (const f of walkFiles(src.dir)) {
    if (!f.endsWith(".jsonl") && !f.endsWith(".json")) continue;
    const stat = await fs.stat(f).catch(() => null);
    if (!stat) continue;
    rows.push({
      filePath: f,
      source: "codex",
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

function queryIndexedRows(db: SqliteDb, sources: CodexSource[], max: number): SessionFileCandidate[] {
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
    source: "codex",
    status: row.status === "archived" ? "archived" : "live",
    modifiedMs: Number(row.modified_ms ?? 0),
    sizeBytes: Number(row.size_bytes ?? 0),
  }));
}

async function validateIndexedRows(db: SqliteDb, rows: SessionFileCandidate[], max: number): Promise<SessionFileCandidate[]> {
  const out: SessionFileCandidate[] = [];
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

async function discoverCodexFromIndex(sources: CodexSource[], max: number): Promise<SessionFileCandidate[] | null> {
  const db = await tryOpenSqliteDb(defaultSessionIndexPathSync());
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

async function discoverCodexCandidates(limit?: number): Promise<SessionFileCandidate[]> {
  const max = typeof limit === "number" && limit > 0 ? limit : 0;
  const sources = await collectCodexSources();
  if (!sources.length) return [];
  const indexed = await discoverCodexFromIndex(sources, max);
  if (indexed) return indexed;
  return discoverCodexFromFilesystem(sources, max);
}

async function discoverClaudeCandidates(input: { project?: string; limit?: number }): Promise<SessionFileCandidate[]> {
  const candidates: SessionFileCandidate[] = [];
  const projectsDir = getClaudeProjectsDir();
  if (!(await pathExists(projectsDir))) return [];
  const projectFilter = input.project ? String(input.project).trim() : "";
  const absoluteProjectDir =
    projectFilter && looksLikePath(projectFilter) ? path.resolve(expandHomePath(projectFilter)) : null;
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
      const next: SessionFileCandidate = {
        filePath: abs,
        source: "claude",
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
}

function candidateToDiscovered(candidate: SessionFileCandidate): DiscoveredSessionFile {
  return {
    path: candidate.filePath,
    source: candidate.source,
    status: candidate.status,
    project: candidate.projectName,
    modifiedMs: candidate.modifiedMs,
    sizeBytes: candidate.sizeBytes,
  };
}

export function createSessionSourceRuntime(): SessionSourceRuntime {
  return {
    async discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]> {
      const out: DiscoveredSessionFile[] = [];
      if (input.source === "claude" || input.source === "all") {
        const candidates = await discoverClaudeCandidates({ project: input.project, limit: input.limit });
        out.push(...candidates.map(candidateToDiscovered));
      }
      if (input.source === "codex" || input.source === "all") {
        const candidates = await discoverCodexCandidates(input.limit);
        out.push(...candidates.map(candidateToDiscovered));
      }
      out.sort((a, b) => b.modifiedMs - a.modifiedMs);
      return input.limit && input.limit > 0 ? out.slice(0, input.limit) : out;
    },

    async statFile(input: { path: string }) {
      const resolved = path.resolve(expandHomePath(input.path));
      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat) return null;
      return {
        modifiedMs: stat.mtimeMs,
        sizeBytes: stat.size,
      };
    },

    readJsonlObjects(input: { path: string }) {
      return readJsonlObjects(path.resolve(expandHomePath(input.path)));
    },
  };
}
