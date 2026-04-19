import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createClient, type CreateClientOptions } from "@rawr/hq-ops";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ProcessView, type RoleView, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";

type HqOpsBoundary = CreateClientOptions;
type HqOpsResources = HqOpsBoundary["deps"]["resources"];
type SqliteDatabase = Awaited<ReturnType<HqOpsResources["sqlite"]["open"]>>;
type HqOpsProcess = ProcessView & {
  processId: "plugin-plugins";
  repoRoot: string;
};
type HqOpsRole = RoleView & {
  roleId: "hq-ops";
  capability: "plugins-hq-ops";
};
type BindingContext = ServiceBindingContext<HqOpsProcess, HqOpsRole>;

async function openSqliteDatabase(dbPath: string): Promise<SqliteDatabase> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const mod = await import("bun:sqlite");
  const Database = (mod as { Database: new (dbPath: string) => SqliteDatabase }).Database;
  return new Database(dbPath);
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
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${input.config.provider} embeddings failed: ${res.status} ${await res.text()}`.trim());
  const json = (await res.json()) as { data?: Array<{ embedding?: unknown }> };
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === "number")) {
    throw new Error(`${input.config.provider} embeddings response missing data[0].embedding`);
  }
  return Float32Array.from(embedding);
}

function createHqOpsResources(): HqOpsResources {
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
          return { provider: "openai", model: (process.env.RAWR_EMBEDDINGS_MODEL ?? "text-embedding-3-small").trim() };
        }
        if (process.env.VOYAGE_API_KEY) {
          return { provider: "voyage", model: (process.env.RAWR_EMBEDDINGS_MODEL ?? "voyage-3-lite").trim() };
        }
        return null;
      },
      embedText,
    },
  };
}

const hqOpsService = bindService(createClient, {
  bindingId: "plugin-plugins/hq-ops",
  deps: () => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    resources: createHqOpsResources(),
  }),
  scope: (context: BindingContext) => ({
    repoRoot: context.process.repoRoot,
  }),
  config: {},
  cacheKey: (context: BindingContext) => `${context.process.processId}:${context.process.repoRoot}:${context.role.roleId}`,
} satisfies ServiceBinding<HqOpsBoundary, HqOpsProcess, HqOpsRole>);

export function createHqOpsClient(repoRoot: string) {
  return hqOpsService.resolve({
    process: {
      processId: "plugin-plugins",
      repoRoot,
    },
    role: {
      roleId: "hq-ops",
      capability: "plugins-hq-ops",
    },
  });
}

type HqOpsCallOptions = NonNullable<Parameters<HqOpsClient["config"]["getWorkspaceConfig"]>[1]>;

export function createHqOpsCallOptions(traceId: string) {
  const options = {
    context: {
      invocation: {
        traceId,
      },
    },
  } satisfies HqOpsCallOptions;

  return options;
}

export type HqOpsClient = ReturnType<typeof createHqOpsClient>;
export type HqOpsConfigLoadResult = Awaited<ReturnType<HqOpsClient["config"]["getWorkspaceConfig"]>>;
export type HqOpsJournalEvent = Parameters<HqOpsClient["journal"]["writeEvent"]>[0];
export type HqOpsJournalSnippet = Parameters<HqOpsClient["journal"]["writeSnippet"]>[0];
