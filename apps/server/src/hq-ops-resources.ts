import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { createClient } from "@rawr/hq-ops";

type HqOpsBoundary = Parameters<typeof createClient>[0];
type HqOpsResources = HqOpsBoundary["deps"]["resources"];
type SqliteDatabase = Awaited<ReturnType<HqOpsResources["sqlite"]["open"]>>;

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

async function embedText(input: { text: string; config: { provider: "openai" | "voyage"; model: string } }): Promise<Float32Array> {
  const apiKey = input.config.provider === "openai" ? process.env.OPENAI_API_KEY : process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error(`Missing ${input.config.provider} embeddings API key`);

  const url = input.config.provider === "openai" ? "https://api.openai.com/v1/embeddings" : "https://api.voyageai.com/v1/embeddings";
  const body = input.config.provider === "openai"
    ? { model: input.config.model, input: input.text }
    : { model: input.config.model, input: [input.text] };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(`${input.config.provider} embeddings failed: ${res.status} ${raw}`.trim());
  }

  const json = (await res.json()) as { data?: Array<{ embedding?: unknown }> };
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === "number")) {
    throw new Error(`${input.config.provider} embeddings response missing data[0].embedding`);
  }
  return Float32Array.from(embedding);
}

export function createHqOpsResources(): HqOpsResources {
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
      homeDir: os.homedir,
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
      async exec(cmd, args, opts = {}) {
        const startedAt = Date.now();
        return await new Promise<Awaited<ReturnType<HqOpsResources["process"]["exec"]>>>((resolve) => {
          const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env as NodeJS.ProcessEnv | undefined });
          const stdoutChunks: Buffer[] = [];
          const stderrChunks: Buffer[] = [];
          child.stdout.on("data", (data) => stdoutChunks.push(Buffer.from(data)));
          child.stderr.on("data", (data) => stderrChunks.push(Buffer.from(data)));
          const timeout = opts.timeoutMs && opts.timeoutMs > 0
            ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs)
            : null;
          child.on("close", (exitCode, signal) => {
            if (timeout) clearTimeout(timeout);
            resolve({
              exitCode,
              signal,
              stdout: Buffer.concat(stdoutChunks),
              stderr: Buffer.concat(stderrChunks),
              durationMs: Date.now() - startedAt,
            });
          });
        });
      },
    },
    sqlite: {
      open: openSqliteDatabase,
    },
    embeddings: {
      getConfig() {
        if (process.env.OPENAI_API_KEY) {
          return {
            provider: "openai",
            model: (process.env.RAWR_EMBEDDINGS_MODEL ?? "text-embedding-3-small").trim(),
          };
        }
        if (process.env.VOYAGE_API_KEY) {
          return {
            provider: "voyage",
            model: (process.env.RAWR_EMBEDDINGS_MODEL ?? "voyage-3-lite").trim(),
          };
        }
        return null;
      },
      embedText,
    },
  };
}
