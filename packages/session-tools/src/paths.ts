import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

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

export type CodexSessionFile = {
  filePath: string;
  status: "live" | "archived";
  modifiedMs: number;
  sizeBytes: number;
};

type CodexSource = {
  dir: string;
  status: "live" | "archived";
};

type SqliteQuery = {
  get: (params?: unknown[]) => any;
  run: (params?: unknown[]) => any;
  all?: (params?: unknown[]) => any[];
};

type SqliteDb = {
  query: (sql: string) => SqliteQuery;
  close: () => void;
};

const DEFAULT_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = 15_000;
const DEFAULT_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS = 5 * 60_000;

function parsePositiveNumberEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function codexDiscoveryMaxAgeMs(status: "live" | "archived"): number {
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
    const live = path.join(home, "sessions");
    const archived = path.join(home, "archived_sessions");
    const sources: CodexSource[] = [
      { dir: live, status: "live" },
      { dir: archived, status: "archived" },
    ];
    for (const src of sources) {
      if (await pathExists(src.dir)) out.push(src);
    }
  }
  return out;
}

async function* walkFiles(rootDir: string): AsyncGenerator<string> {
  const stack: string[] = [rootDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let dirents: Array<import("node:fs").Dirent>;
    try {
      dirents = (await fs.readdir(dir, { withFileTypes: true })) as unknown as Array<import("node:fs").Dirent>;
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

function pushNewestBounded(files: CodexSessionFile[], next: CodexSessionFile, max: number): void {
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
      let stat: Awaited<ReturnType<typeof fs.stat>>;
      try {
        stat = await fs.stat(f);
      } catch {
        continue;
      }
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

async function openDiscoveryDb(indexPath: string): Promise<SqliteDb | null> {
  let db: SqliteDb | null = null;
  try {
    const mod = await import("bun:sqlite");
    const Database = (mod as any).Database;
    await fs.mkdir(path.dirname(indexPath), { recursive: true }).catch(() => undefined);
    const bunDb = new Database(indexPath);
    db = bunDb as SqliteDb;
  } catch {
    try {
      const mod = await import("node:sqlite");
      const DatabaseSync = (mod as any).DatabaseSync;
      await fs.mkdir(path.dirname(indexPath), { recursive: true }).catch(() => undefined);
      const nodeDb = new DatabaseSync(indexPath);
      db = {
        query: (sql: string): SqliteQuery => {
          const stmt = nodeDb.prepare(sql);
          return {
            get: (params?: unknown[]) => (Array.isArray(params) ? stmt.get(...params) : stmt.get()),
            run: (params?: unknown[]) => (Array.isArray(params) ? stmt.run(...params) : stmt.run()),
            all: (params?: unknown[]) => (Array.isArray(params) ? stmt.all(...params) : stmt.all()),
          };
        },
        close: () => nodeDb.close(),
      };
    } catch {
      return null;
    }
  }
  if (!db) return null;
  db.query(`
    CREATE TABLE IF NOT EXISTS codex_file_index (
      file_path TEXT PRIMARY KEY,
      root_dir TEXT NOT NULL,
      status TEXT NOT NULL,
      modified_ms REAL NOT NULL,
      size_bytes INTEGER NOT NULL
    )
  `).run();
  db.query(`CREATE INDEX IF NOT EXISTS idx_codex_file_index_root_modified ON codex_file_index(root_dir, modified_ms DESC)`).run();
  db.query(`
    CREATE TABLE IF NOT EXISTS codex_root_scan_state (
      root_dir TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      root_mtime_ms REAL NOT NULL,
      scanned_at_ms REAL NOT NULL
    )
  `).run();
  return db as SqliteDb;
}

function shouldRefreshRoot(
  row: { root_mtime_ms?: number; scanned_at_ms?: number } | null,
  rootMtimeMs: number,
  nowMs: number,
  status: "live" | "archived",
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
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(f);
    } catch {
      continue;
    }
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
  const stmt = db.query(sql);
  const rows = typeof stmt.all === "function" ? stmt.all(params) : [];
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
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(row.filePath);
    } catch {
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
  const db = await openDiscoveryDb(defaultSessionIndexPath());
  if (!db) return null;

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
        if (!rootStat) continue;
        await refreshRootIndex(db, src, rootStat.mtimeMs, Date.now());
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
