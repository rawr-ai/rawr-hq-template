import {
  createEmbeddedPlaceholderAnalyticsAdapter,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import type {
  SessionIndexRuntime,
  SessionIndexStatement,
} from "../src/service/shared/ports/session-index-runtime";
import type {
  DiscoverSessionsInput,
  SessionSourceRuntime,
} from "../src/service/shared/ports/session-source-runtime";
import type { DiscoveredSessionFile, SessionFileStat, SessionSource, SessionStatus } from "../src/service/shared/entities";
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

export class MemorySessionIndexRuntime implements SessionIndexRuntime {
  readonly entries = new Map<string, { modifiedMs: number; sizeBytes: number; content: string }>();
  getCalls = 0;
  setCalls = 0;

  defaultIndexPath(): string {
    return "/tmp/session-index.sqlite";
  }

  async execute(input: SessionIndexStatement & { indexPath: string }): Promise<void> {
    const normalized = input.sql.replace(/\s+/g, " ").trim().toUpperCase();
    if (normalized.startsWith("INSERT OR REPLACE INTO SESSION_CACHE")) {
      this.setCalls += 1;
      const [path, rolesKey, includeTools, modifiedMs, sizeBytes, content] = input.params ?? [];
      this.entries.set(this.cacheKey({
        indexPath: input.indexPath,
        path: String(path ?? ""),
        rolesKey: String(rolesKey ?? ""),
        includeTools: Number(includeTools ?? 0) === 1,
      }), {
        modifiedMs: Number(modifiedMs ?? 0),
        sizeBytes: Number(sizeBytes ?? 0),
        content: String(content ?? ""),
      });
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

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(input: SessionIndexStatement & { indexPath: string }): Promise<Row[]> {
    const normalized = input.sql.replace(/\s+/g, " ").trim().toUpperCase();
    if (!normalized.startsWith("SELECT MTIME, SIZE, CONTENT FROM SESSION_CACHE")) return [];
    this.getCalls += 1;
    const [path, rolesKey, includeTools] = input.params ?? [];
    const entry = this.entries.get(this.cacheKey({
      indexPath: input.indexPath,
      path: String(path ?? ""),
      rolesKey: String(rolesKey ?? ""),
      includeTools: Number(includeTools ?? 0) === 1,
    }));
    if (!entry) return [];
    return [{ mtime: entry.modifiedMs, size: entry.sizeBytes, content: entry.content } as unknown as Row];
  }

  async transaction(input: { indexPath: string; statements: SessionIndexStatement[] }): Promise<void> {
    for (const statement of input.statements) {
      await this.execute({ ...statement, indexPath: input.indexPath });
    }
  }

  async removeIndex(input: { indexPath: string }): Promise<void> {
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(`${input.indexPath}\0`)) this.entries.delete(key);
    }
  }

  private cacheKey(input: { indexPath: string; path: string; rolesKey: string; includeTools: boolean }): string {
    return `${input.indexPath}\0${input.path}\0${input.rolesKey}\0${input.includeTools ? "1" : "0"}`;
  }
}

export class MemorySessionSourceRuntime implements SessionSourceRuntime {
  private readonly sessions = new Map<string, FixtureSession>();

  add(session: FixtureSession): void {
    this.sessions.set(session.path, { ...session });
  }

  async statFile(input: { path: string }): Promise<SessionFileStat | null> {
    const session = this.sessions.get(input.path);
    if (!session) return null;
    return {
      modifiedMs: session.modifiedMs,
      sizeBytes: session.contents.length,
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

  async discoverSessions(input: DiscoverSessionsInput): Promise<DiscoveredSessionFile[]> {
    const candidates = [...this.sessions.values()]
      .filter((session) => input.source === "all" || session.source === input.source)
      .filter((session) => !input.project || session.project?.toLowerCase().includes(input.project.toLowerCase()))
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

export function createClientOptions(input: {
  sourceRuntime?: SessionSourceRuntime;
  indexRuntime?: SessionIndexRuntime;
  workspaceRef?: string;
} = {}): CreateClientOptions {
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
