import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";
import type { RawrConfig } from "../src/service/modules/config/entities";
import type { Service } from "../src/service/base";
import type { ExecResult, HqOpsResources, SqliteDatabase } from "../src/service/shared/ports/resources";

type ClientOptions = {
  deps?: Partial<Service["Deps"]>;
  repoRoot?: string;
  homeDir?: string;
  resources?: HqOpsResources;
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

export type LogEntry = EmbeddedPlaceholderLogEntry;
export type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

export async function writeRawrConfig(repoRoot: string, config: RawrConfig): Promise<void> {
  await fs.writeFile(path.join(repoRoot, "rawr.config.ts"), `export default ${JSON.stringify(config, null, 2)};\n`, "utf8");
}

export async function writeGlobalRawrConfig(homeDir: string, config: RawrConfig): Promise<void> {
  const configPath = path.join(homeDir, ".rawr", "config.json");
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function openSqliteDatabase(dbPath: string): Promise<SqliteDatabase> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    const mod = await import("bun:sqlite");
    const Database = (mod as { Database: new (dbPath: string) => SqliteDatabase }).Database;
    return new Database(dbPath);
  } catch {
    const mod = await import("node:sqlite");
    const DatabaseSync = (mod as {
      DatabaseSync: new (dbPath: string) => {
        exec(sql: string): unknown;
        prepare(sql: string): {
          get(...params: unknown[]): unknown;
          run(...params: unknown[]): unknown;
          all(...params: unknown[]): unknown[];
        };
        close(): void;
      };
    }).DatabaseSync;
    const db = new DatabaseSync(dbPath);
    return {
      exec(sql: string) {
        return db.exec(sql);
      },
      prepare(sql: string) {
        const statement = db.prepare(sql);
        return {
          get(...params: unknown[]) {
            return statement.get(...params);
          },
          run(...params: unknown[]) {
            return statement.run(...params);
          },
          all(...params: unknown[]) {
            return statement.all(...params);
          },
        };
      },
      close() {
        db.close();
      },
    };
  }
}

function emptyExecResult(): ExecResult {
  return {
    exitCode: 0,
    signal: null,
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    durationMs: 0,
  };
}

export function createTestHqOpsResources(input: {
  homeDir?: string;
  exec?: HqOpsResources["process"]["exec"];
} = {}): HqOpsResources {
  const homeDir = input.homeDir ?? os.tmpdir();

  return {
    fs: {
      async stat(filePath) {
        try {
          const st = await fs.stat(filePath);
          return { isFile: st.isFile(), mtimeMs: st.mtimeMs };
        } catch {
          return null;
        }
      },
      async readDir(dirPath) {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
        } catch {
          return null;
        }
      },
      async readText(filePath) {
        try {
          return await fs.readFile(filePath, "utf8");
        } catch {
          return null;
        }
      },
      async writeText(filePath, contents) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, contents, "utf8");
      },
      async mkdir(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
      },
      async rename(fromPath, toPath) {
        await fs.rename(fromPath, toPath);
      },
      async rm(filePath) {
        await fs.rm(filePath, { force: true });
      },
      async openExclusive(filePath) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const handle = await fs.open(filePath, "wx");
        return {
          async writeText(contents) {
            await handle.writeFile(contents, "utf8");
          },
          async close() {
            await handle.close();
          },
        };
      },
    },
    path: {
      join: path.join,
      dirname: path.dirname,
      resolve: path.resolve,
      async realpath(filePath) {
        try {
          return await fs.realpath(filePath);
        } catch {
          return null;
        }
      },
      toFileHref(filePath) {
        return pathToFileURL(filePath).href;
      },
      homeDir() {
        return homeDir;
      },
    },
    process: {
      pid: () => process.pid,
      isAlive(pid) {
        if (!Number.isInteger(pid) || pid <= 0) return false;
        if (pid === process.pid) return true;
        try {
          process.kill(pid, 0);
          return true;
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code === "ESRCH") return false;
          if (err.code === "EPERM") return true;
          return true;
        }
      },
      async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
      },
      exec: input.exec ?? (async () => emptyExecResult()),
    },
    sqlite: {
      open: openSqliteDatabase,
    },
    embeddings: {
      getConfig() {
        return { provider: "openai", model: "test-embeddings" };
      },
      async embedText({ text }) {
        const vec = new Float32Array(4);
        for (let i = 0; i < text.length; i += 1) vec[i % vec.length] += text.charCodeAt(i) / 1000;
        return vec;
      },
    },
  };
}

export function createDeps(options: ClientOptions = {}): Service["Deps"] {
  return {
    logger: createEmbeddedPlaceholderLoggerAdapter({ sink: options.logs }),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: options.analytics }),
    resources: options.resources ?? createTestHqOpsResources({ homeDir: options.homeDir }),
    ...options.deps,
  };
}

export function createClientOptions(options: ClientOptions = {}): CreateClientOptions {
  return {
    deps: createDeps(options),
    scope: {
      repoRoot: options.repoRoot ?? "/tmp/workspace",
    },
    config: {},
  };
}

export function invocation(traceId = "trace-default") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}
