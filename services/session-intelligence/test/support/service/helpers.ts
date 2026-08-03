import { createEmbeddedPlaceholderAnalyticsAdapter } from "@habitat-ai/rawr-hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@habitat-ai/rawr-hq-sdk/host-adapters/logger/embedded-placeholder";
import type {
  CodexSessionFile,
  CodexSessionSource,
  CreateClientOptions,
  DiscoverClaudeSessionsInput,
  DiscoveredSessionFile,
  SessionFileStat,
  SessionIndexRuntime,
  SessionIndexStatement,
  SessionSource,
  SessionSourceRuntime,
  SessionStatus,
} from "@habitat-ai/rawr-session-intelligence/client";
import {
  CLAUDE_FIXTURE,
  CLAUDE_FIXTURE_PATH,
  CODEX_FIXTURE,
  CODEX_FIXTURE_PATH,
} from "./fixture-data";

type FixtureSession = {
  path: string;
  contents: string;
  source: SessionSource;
  status?: SessionStatus;
  project?: string;
  modifiedMs: number;
};

function parentDirectory(filePath: string): string {
  const separator = filePath.lastIndexOf("/");
  return separator > 0 ? filePath.slice(0, separator) : ".";
}

/** In-memory SQL capability that exposes index use for service behavior assertions. */
export class MemorySessionIndexRuntime implements SessionIndexRuntime {
  readonly entries = new Map<string, { modifiedMs: number; sizeBytes: number; content: string }>();
  readonly codexFiles = new Map<
    string,
    { rootDir: string; status: SessionStatus; modifiedMs: number; sizeBytes: number }
  >();
  readonly codexRoots = new Map<
    string,
    { status: SessionStatus; rootMtimeMs: number; scannedAtMs: number }
  >();
  readonly observedIndexPaths: string[] = [];
  defaultIndexPathCalls = 0;
  getCalls = 0;
  setCalls = 0;

  constructor(
    private readonly defaultIndexPaths: readonly string[] = ["/tmp/session-index.sqlite"]
  ) {
    if (defaultIndexPaths.length === 0) {
      throw new Error("MemorySessionIndexRuntime requires at least one default index path");
    }
  }

  defaultIndexPath(): string {
    const path = this.defaultIndexPaths[this.defaultIndexPathCalls % this.defaultIndexPaths.length];
    this.defaultIndexPathCalls += 1;
    if (path === undefined) {
      throw new Error("MemorySessionIndexRuntime lost its configured index path");
    }
    return path;
  }

  async execute(input: SessionIndexStatement & { indexPath: string }): Promise<void> {
    this.observedIndexPaths.push(input.indexPath);
    const normalized = input.sql.replace(/\s+/g, " ").trim().toUpperCase();
    if (normalized.startsWith("INSERT OR REPLACE INTO CODEX_FILE_INDEX")) {
      const [filePath, rootDir, status, modifiedMs, sizeBytes] = input.params ?? [];
      this.codexFiles.set(String(filePath), {
        rootDir: String(rootDir),
        status: status === "archived" ? "archived" : "live",
        modifiedMs: Number(modifiedMs),
        sizeBytes: Number(sizeBytes),
      });
      return;
    }
    if (normalized.startsWith("INSERT OR REPLACE INTO CODEX_ROOT_SCAN_STATE")) {
      const [rootDir, status, rootMtimeMs, scannedAtMs] = input.params ?? [];
      this.codexRoots.set(String(rootDir), {
        status: status === "archived" ? "archived" : "live",
        rootMtimeMs: Number(rootMtimeMs),
        scannedAtMs: Number(scannedAtMs),
      });
      return;
    }
    if (normalized.startsWith("DELETE FROM CODEX_FILE_INDEX WHERE ROOT_DIR=")) {
      const [rootDir] = input.params ?? [];
      for (const [filePath, row] of this.codexFiles) {
        if (row.rootDir === rootDir) this.codexFiles.delete(filePath);
      }
      return;
    }
    if (normalized.startsWith("DELETE FROM CODEX_ROOT_SCAN_STATE WHERE ROOT_DIR=")) {
      const [rootDir] = input.params ?? [];
      this.codexRoots.delete(String(rootDir));
      return;
    }
    if (normalized.startsWith("DELETE FROM CODEX_FILE_INDEX WHERE FILE_PATH=")) {
      const [filePath] = input.params ?? [];
      this.codexFiles.delete(String(filePath));
      return;
    }
    if (normalized.startsWith("UPDATE CODEX_FILE_INDEX SET MODIFIED_MS=")) {
      const [modifiedMs, sizeBytes, filePath] = input.params ?? [];
      const current = this.codexFiles.get(String(filePath));
      if (current) {
        this.codexFiles.set(String(filePath), {
          ...current,
          modifiedMs: Number(modifiedMs),
          sizeBytes: Number(sizeBytes),
        });
      }
      return;
    }
    if (normalized.startsWith("INSERT OR REPLACE INTO SESSION_CACHE")) {
      this.setCalls += 1;
      const [path, rolesKey, includeTools, modifiedMs, sizeBytes, content] = input.params ?? [];
      this.entries.set(
        this.cacheKey({
          indexPath: input.indexPath,
          path: String(path ?? ""),
          rolesKey: String(rolesKey ?? ""),
          includeTools: Number(includeTools ?? 0) === 1,
        }),
        {
          modifiedMs: Number(modifiedMs ?? 0),
          sizeBytes: Number(sizeBytes ?? 0),
          content: String(content ?? ""),
        }
      );
      return;
    }

    if (normalized.startsWith("DELETE FROM SESSION_CACHE WHERE PATH=")) {
      const [path] = input.params ?? [];
      for (const key of [...this.entries.keys()]) {
        const [indexPath, entryPath] = key.split("\0");
        if (indexPath === input.indexPath && entryPath === path) this.entries.delete(key);
      }
    }
  }

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    input: SessionIndexStatement & { indexPath: string }
  ): Promise<Row[]> {
    this.observedIndexPaths.push(input.indexPath);
    const normalized = input.sql.replace(/\s+/g, " ").trim().toUpperCase();
    if (normalized.startsWith("SELECT ROOT_MTIME_MS, SCANNED_AT_MS FROM CODEX_ROOT_SCAN_STATE")) {
      const [rootDir] = input.params ?? [];
      const row = this.codexRoots.get(String(rootDir));
      return row
        ? ([
            { root_mtime_ms: row.rootMtimeMs, scanned_at_ms: row.scannedAtMs } as unknown as Row,
          ] satisfies Row[])
        : [];
    }
    if (
      normalized.startsWith(
        "SELECT FILE_PATH, STATUS, MODIFIED_MS, SIZE_BYTES FROM CODEX_FILE_INDEX"
      )
    ) {
      const params = input.params ?? [];
      const hasLimit = normalized.includes(" LIMIT ?");
      const roots = (hasLimit ? params.slice(0, -1) : params).map(String);
      const limit = hasLimit ? Number(params.at(-1)) : 0;
      const rows = [...this.codexFiles.entries()]
        .filter(([, row]) => roots.includes(row.rootDir))
        .sort((left, right) => right[1].modifiedMs - left[1].modifiedMs)
        .map(
          ([filePath, row]) =>
            ({
              file_path: filePath,
              status: row.status,
              modified_ms: row.modifiedMs,
              size_bytes: row.sizeBytes,
            }) as unknown as Row
        );
      return limit > 0 ? rows.slice(0, limit) : rows;
    }
    if (!normalized.startsWith("SELECT MTIME, SIZE, CONTENT FROM SESSION_CACHE")) return [];
    this.getCalls += 1;
    const [path, rolesKey, includeTools] = input.params ?? [];
    const entry = this.entries.get(
      this.cacheKey({
        indexPath: input.indexPath,
        path: String(path ?? ""),
        rolesKey: String(rolesKey ?? ""),
        includeTools: Number(includeTools ?? 0) === 1,
      })
    );
    if (!entry) return [];
    return [
      { mtime: entry.modifiedMs, size: entry.sizeBytes, content: entry.content } as unknown as Row,
    ];
  }

  async transaction(input: {
    indexPath: string;
    statements: SessionIndexStatement[];
  }): Promise<void> {
    this.observedIndexPaths.push(input.indexPath);
    for (const statement of input.statements) {
      await this.execute({ ...statement, indexPath: input.indexPath });
    }
  }

  async removeIndex(input: { indexPath: string }): Promise<void> {
    this.observedIndexPaths.push(input.indexPath);
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(`${input.indexPath}\0`)) this.entries.delete(key);
    }
  }

  private cacheKey(input: {
    indexPath: string;
    path: string;
    rolesKey: string;
    includeTools: boolean;
  }): string {
    return `${input.indexPath}\0${input.path}\0${input.rolesKey}\0${input.includeTools ? "1" : "0"}`;
  }
}

/** Mutable source capability used to arrange service-owned session behavior. */
export class MemorySessionSourceRuntime implements SessionSourceRuntime {
  private readonly sessions = new Map<string, FixtureSession>();

  add(session: FixtureSession): void {
    this.sessions.set(session.path, { ...session });
  }

  async statFile(input: { path: string }): Promise<SessionFileStat | null> {
    const session = this.sessions.get(input.path);
    if (session) {
      return {
        modifiedMs: session.modifiedMs,
        sizeBytes: session.contents.length,
      };
    }

    const children = [...this.sessions.values()].filter(
      (candidate) => parentDirectory(candidate.path) === input.path
    );
    if (children.length === 0) return null;
    return {
      modifiedMs: Math.max(...children.map((candidate) => candidate.modifiedMs)),
      sizeBytes: children.reduce((total, candidate) => total + candidate.contents.length, 0),
    };
  }

  async *readJsonlObjects(input: { path: string }): AsyncIterable<unknown> {
    const session = this.sessions.get(input.path);
    if (!session) return;
    for (const line of session.contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as unknown;
      } catch {
        // Keep fixture runtime lenient like production JSONL reading.
      }
    }
  }

  async discoverClaudeSessions(
    input: DiscoverClaudeSessionsInput
  ): Promise<DiscoveredSessionFile[]> {
    const candidates = [...this.sessions.values()]
      .filter((session) => session.source === "claude")
      .filter(
        (session) =>
          !input.project || session.project?.toLowerCase().includes(input.project.toLowerCase())
      )
      .map((session) => ({
        path: session.path,
        source: session.source,
        status: session.status,
        project: session.project,
        modifiedMs: session.modifiedMs,
        sizeBytes: session.contents.length,
      }))
      .sort((a, b) => b.modifiedMs - a.modifiedMs);
    return input.limit && input.limit > 0 ? candidates.slice(0, input.limit) : candidates;
  }

  async listCodexSources(): Promise<CodexSessionSource[]> {
    const sources = new Map<string, CodexSessionSource>();
    for (const session of this.sessions.values()) {
      if (session.source !== "codex") continue;
      const source = {
        dir: parentDirectory(session.path),
        status: session.status ?? "live",
      } satisfies CodexSessionSource;
      sources.set(`${source.status}\0${source.dir}`, source);
    }
    return [...sources.values()].sort((left, right) => left.dir.localeCompare(right.dir));
  }

  async discoverCodexSessionFiles(source: CodexSessionSource): Promise<CodexSessionFile[]> {
    return [...this.sessions.values()]
      .filter(
        (session) =>
          session.source === "codex" &&
          (session.status ?? "live") === source.status &&
          parentDirectory(session.path) === source.dir
      )
      .map((session) => ({
        path: session.path,
        status: session.status ?? "live",
        modifiedMs: session.modifiedMs,
        sizeBytes: session.contents.length,
      }))
      .sort((left, right) => right.modifiedMs - left.modifiedMs);
  }
}

export function createFixtureSourceRuntime(): MemorySessionSourceRuntime {
  const runtime = new MemorySessionSourceRuntime();
  runtime.add({
    path: CLAUDE_FIXTURE_PATH,
    contents: CLAUDE_FIXTURE,
    source: "claude",
    project: "fixture-claude-project",
    modifiedMs: Date.parse("2026-02-05T00:00:01.000Z"),
  });
  runtime.add({
    path: CODEX_FIXTURE_PATH,
    contents: CODEX_FIXTURE,
    source: "codex",
    status: "live",
    project: "rawr-fixture-codex",
    modifiedMs: Date.parse("2026-02-05T00:00:02.000Z"),
  });
  return runtime;
}

export function createClientOptions(
  input: {
    sourceRuntime?: SessionSourceRuntime;
    indexRuntime?: SessionIndexRuntime;
    workspaceRef?: string;
  } = {}
): CreateClientOptions {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      sessionSourceRuntime: input.sourceRuntime ?? createFixtureSourceRuntime(),
      sessionIndexRuntime: input.indexRuntime ?? new MemorySessionIndexRuntime(),
    },
    scope: {
      workspaceRef: input.workspaceRef ?? "workspace://session-intelligence-test",
    },
    config: {},
  };
}

export function createInvocation(traceId = "trace-session-intelligence") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}
